import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { appendMemberToAirtable, appendTicketToAirtable } from "@/lib/airtable";
import { addMemberToGroupMe } from "@/lib/groupme";
import { sendTicketConfirmationEmail } from "@/lib/ticketEmail";
import { sendAdminAlert } from "@/lib/adminAlert";
import { muteConsole } from "@/test/console";

// Stripe itself is NOT mocked here: signature verification is a local HMAC,
// so every request below is signed and checked for real.
vi.mock("@/lib/airtable", () => ({
  appendMemberToAirtable: vi.fn(),
  appendTicketToAirtable: vi.fn(),
}));
vi.mock("@/lib/groupme", () => ({ addMemberToGroupMe: vi.fn() }));
vi.mock("@/lib/ticketEmail", () => ({ sendTicketConfirmationEmail: vi.fn() }));
vi.mock("@/lib/adminAlert", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/adminAlert")>()),
  sendAdminAlert: vi.fn(),
}));

const stripe = new Stripe("sk_test_unit_tests_only");

function paymentSucceeded(metadata: Record<string, string>, amount = 2573) {
  return {
    id: "evt_1",
    object: "event",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_123",
        object: "payment_intent",
        amount,
        created: 1767225600,
        description: null,
        receipt_email: null,
        metadata,
      },
    },
  };
}

function webhookRequest(payload: string, signature: string | null): NextRequest {
  return new NextRequest("http://localhost/api/stripe-webhook", {
    method: "POST",
    body: payload,
    headers: signature ? { "stripe-signature": signature } : {},
  });
}

function signed(event: unknown): NextRequest {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  return webhookRequest(payload, signature);
}

const ticketMetadata = {
  purchaseType: "ticket",
  eventId: "event-1",
  eventName: "Diwali Night",
  ticketTypeKey: "ga",
  ticketTypeName: "General Admission",
  quantity: "2",
  firstName: "Asha",
  lastName: "Patel",
  contactEmail: "asha@example.com",
  psuEmail: "abc123@psu.edu",
  isMember: "true",
  memberYear: "Junior",
};

const membershipMetadata = {
  purchaseType: "membership",
  firstName: "Asha",
  lastName: "Patel",
  psuEmail: "abc123@psu.edu",
  phone: "+18145551234",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(appendTicketToAirtable).mockResolvedValue({ inserted: true });
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/stripe-webhook — signature", () => {
  it("rejects a request with no signature header", async () => {
    const res = await POST(webhookRequest("{}", null));
    expect(res.status).toBe(400);
  });

  it("rejects a forged signature without acting on the payload", async () => {
    const payload = JSON.stringify(paymentSucceeded(ticketMetadata));
    const res = await POST(webhookRequest(payload, "t=1767225600,v1=deadbeef"));
    expect(res.status).toBe(400);
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
  });

  it("rejects a payload altered after signing", async () => {
    const good = JSON.stringify(paymentSucceeded(ticketMetadata, 100));
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: good,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });
    const tampered = good.replace('"amount":100', '"amount":1');
    const res = await POST(webhookRequest(tampered, signature));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/stripe-webhook — ticket payments", () => {
  it("records the order with what Stripe actually charged, then emails the buyer", async () => {
    const res = await POST(signed(paymentSucceeded(ticketMetadata, 2573)));

    expect(res.status).toBe(200);
    expect(appendTicketToAirtable).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "event-1",
        quantity: 2,
        isMember: true,
        memberYear: "Junior",
        amountPaidCents: 2573,
        paymentMethod: "Card",
        paid: true,
        boardMemberName: null,
      }),
      "pi_123"
    );
    expect(sendTicketConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ contactEmail: "asha@example.com", amountPaidCents: 2573 })
    );
  });

  it("doesn't email again when the /return page already recorded the order", async () => {
    // The webhook and the return page race to write the same card order.
    // Only the one whose upsert actually inserts sends the confirmation.
    vi.mocked(appendTicketToAirtable).mockResolvedValue({ inserted: false });
    const res = await POST(signed(paymentSucceeded(ticketMetadata)));
    expect(res.status).toBe(200);
    expect(sendTicketConfirmationEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when the Airtable write fails, so Stripe retries the delivery", async () => {
    vi.mocked(appendTicketToAirtable).mockRejectedValue(new Error("Airtable error: 503"));
    const res = await POST(signed(paymentSucceeded(ticketMetadata)));
    expect(res.status).toBe(500);
    expect(sendTicketConfirmationEmail).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe-webhook — membership payments", () => {
  it("records the member and adds them to GroupMe", async () => {
    const res = await POST(signed(paymentSucceeded(membershipMetadata)));
    expect(res.status).toBe(200);
    expect(appendMemberToAirtable).toHaveBeenCalledWith(membershipMetadata, "pi_123");
    expect(addMemberToGroupMe).toHaveBeenCalledWith(membershipMetadata, "pi_123");
  });

  it("still acknowledges the payment when GroupMe blows up", async () => {
    vi.mocked(addMemberToGroupMe).mockRejectedValue(new Error("unexpected"));
    const res = await POST(signed(paymentSucceeded(membershipMetadata)));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/stripe-webhook — payments the site didn't create", () => {
  it("records nothing and alerts the board about an untagged payment", async () => {
    // Guards the #50 fix: a Tap to Pay or dashboard charge (metadata {})
    // used to be filed as a blank membership and trigger a GroupMe add.
    const res = await POST(signed(paymentSucceeded({}, 1500)));

    expect(res.status).toBe(200);
    expect(appendMemberToAirtable).not.toHaveBeenCalled();
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
    expect(addMemberToGroupMe).not.toHaveBeenCalled();
    expect(sendAdminAlert).toHaveBeenCalledWith(
      "Payment received outside the site: $15.00",
      expect.arrayContaining(["Stripe Payment Intent: pi_123"])
    );
  });

  it("treats an unknown purchaseType the same as an untagged one", async () => {
    const res = await POST(signed(paymentSucceeded({ purchaseType: "donation" })));
    expect(res.status).toBe(200);
    expect(appendMemberToAirtable).not.toHaveBeenCalled();
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
    expect(sendAdminAlert).toHaveBeenCalledTimes(1);
  });

  it("acknowledges other event types without doing anything", async () => {
    const event = { ...paymentSucceeded(ticketMetadata), type: "payment_intent.created" };
    const res = await POST(signed(event));
    expect(res.status).toBe(200);
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
    expect(sendAdminAlert).not.toHaveBeenCalled();
  });
});
