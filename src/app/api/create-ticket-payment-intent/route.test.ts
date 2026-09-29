import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { sanityFetchSingle } from "../../../../sanity/lib/client";
import {
  appendTicketToAirtable,
  hasUsedMemberPricing,
  lookupCurrentMember,
} from "@/lib/airtable";
import { sendTicketConfirmationEmail } from "@/lib/ticketEmail";
import { computeCardFee } from "@/lib/fees";
import { PSU_CONTACT_EMAIL_ERROR } from "@/lib/email";
import { paymentIntentsCreate } from "@/test/stripeMock";
import { makeEvent, makeTicketType } from "@/test/factories";
import { jsonRequest } from "@/test/request";
import { muteConsole } from "@/test/console";

// The real ticketing, fee, and email-rule code runs; only the services
// behind it are mocked.
vi.mock("stripe", async () => (await import("@/test/stripeMock")).stripeWithSpiedPaymentIntents());
vi.mock("../../../../sanity/lib/client", () => ({ sanityFetchSingle: vi.fn(), sanityFetch: vi.fn() }));
vi.mock("@/lib/airtable");
vi.mock("@/lib/ticketEmail", () => ({ sendTicketConfirmationEmail: vi.fn() }));

const ga = makeTicketType({ _key: "ga", memberPriceCents: 1000, nonMemberPriceCents: 1500 });

const buyer = {
  eventId: "event-1",
  ticketTypeKey: "ga",
  quantity: 1,
  firstName: "Asha",
  lastName: "Patel",
  contactEmail: "asha@example.com",
  psuEmail: "",
};

function buy(overrides: Record<string, unknown> = {}) {
  return POST(jsonRequest("/api/create-ticket-payment-intent", { ...buyer, ...overrides }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sanityFetchSingle).mockResolvedValue(makeEvent({ ticketTypes: [ga] }));
  vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: false, year: null });
  vi.mocked(hasUsedMemberPricing).mockResolvedValue(false);
  vi.mocked(appendTicketToAirtable).mockResolvedValue({ inserted: true });
  paymentIntentsCreate.mockResolvedValue({ client_secret: "pi_123_secret_abc" });
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/create-ticket-payment-intent — buyer details", () => {
  it.each([
    [{ firstName: "  " }, "Please enter your first and last name."],
    [{ lastName: undefined }, "Please enter your first and last name."],
    [{ contactEmail: "not-an-email" }, "Please enter a valid contact email."],
    [{ contactEmail: "abc123@psu.edu" }, PSU_CONTACT_EMAIL_ERROR],
  ])("rejects %o before touching Stripe", async (overrides, error) => {
    const res = await buy(overrides);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error });
    expect(sanityFetchSingle).not.toHaveBeenCalled();
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it("accepts a psu.edu subdomain address as the contact email", async () => {
    const res = await buy({ contactEmail: "abc123@ems.psu.edu" });
    expect(res.status).toBe(200);
  });

  it("passes through the order validator's status and message", async () => {
    const res = await buy({ ticketTypeKey: "does-not-exist" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Ticket type not found." });
  });
});

describe("POST /api/create-ticket-payment-intent — paid orders", () => {
  it("charges the subtotal plus one card fee for the whole order", async () => {
    // 3 non-member seats at $15. The fee is grossed up once on $45, not
    // added per ticket — per-ticket would stack Stripe's fixed 30c three times.
    const res = await buy({ quantity: 3 });
    const { totalCents, feeCents } = computeCardFee(4500);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      clientSecret: "pi_123_secret_abc",
      isMember: false,
      memberUnits: 0,
      nonMemberUnits: 3,
      subtotalCents: 4500,
      feeCents,
      totalCents,
    });
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
    expect(paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: totalCents,
        currency: "usd",
        receipt_email: "asha@example.com",
        automatic_payment_methods: { enabled: true },
      })
    );
  });

  it("tags the PaymentIntent so the webhook and return page can record it", async () => {
    vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: true, year: "Junior" });
    await buy({ quantity: 2, psuEmail: "abc123@psu.edu" });

    const { metadata } = paymentIntentsCreate.mock.calls[0][0];
    expect(metadata).toMatchObject({
      purchaseType: "ticket",
      eventId: "event-1",
      ticketTypeKey: "ga",
      quantity: "2",
      contactEmail: "asha@example.com",
      psuEmail: "abc123@psu.edu",
      isMember: "true",
      memberYear: "Junior",
      memberUnits: "1",
      nonMemberUnits: "1",
      subtotalCents: "2500",
    });
    // Every metadata value must be a string for Stripe.
    for (const value of Object.values(metadata)) expect(typeof value).toBe("string");
  });

  it("truncates long buyer fields to Stripe's 500-character metadata limit", async () => {
    await buy({ firstName: "A".repeat(700) });
    const { metadata } = paymentIntentsCreate.mock.calls[0][0];
    expect(metadata.firstName).toHaveLength(500);
  });

  it("doesn't write to Airtable or email yet — that waits for payment", async () => {
    await buy();
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
    expect(sendTicketConfirmationEmail).not.toHaveBeenCalled();
  });

  it("returns a generic 500 when Stripe fails", async () => {
    paymentIntentsCreate.mockRejectedValue(new Error("Stripe is down"));
    const res = await buy();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to initialize payment" });
  });
});

describe("POST /api/create-ticket-payment-intent — free orders", () => {
  beforeEach(() => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(
      makeEvent({ ticketTypes: [{ ...ga, memberPriceCents: 0 }] })
    );
    vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: true, year: "Senior" });
  });

  it("skips Stripe, records the order as paid, and confirms by email", async () => {
    const res = await buy({ psuEmail: "abc123@psu.edu" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ free: true, totalCents: 0, feeCents: 0 });
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
    expect(appendTicketToAirtable).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaidCents: 0, paid: true, isMember: true }),
      null
    );
    expect(sendTicketConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ contactEmail: "asha@example.com", amountPaidCents: 0 })
    );
  });

  it("still charges when guests push a member's free ticket above $0", async () => {
    const res = await buy({ psuEmail: "abc123@psu.edu", quantity: 2 });
    expect((await res.json()).subtotalCents).toBe(1500);
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
  });
});
