import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TicketsReturnPage from "./page";
import { appendTicketToAirtable } from "@/lib/airtable";
import { sendTicketConfirmationEmail } from "@/lib/ticketEmail";
import { paymentIntentsRetrieve } from "@/test/stripeMock";
import { muteConsole } from "@/test/console";

vi.mock("stripe", async () => (await import("@/test/stripeMock")).stripeWithSpiedPaymentIntents());
vi.mock("@/lib/airtable", () => ({ appendTicketToAirtable: vi.fn() }));
vi.mock("@/lib/ticketEmail", () => ({ sendTicketConfirmationEmail: vi.fn() }));

const ticketMetadata = {
  purchaseType: "ticket",
  eventId: "event-1",
  eventName: "Diwali Night",
  ticketTypeKey: "ga",
  ticketTypeName: "General Admission",
  quantity: "1",
  firstName: "Asha",
  lastName: "Patel",
  contactEmail: "asha@example.com",
  psuEmail: "abc123@psu.edu",
  isMember: "true",
  memberYear: "Junior",
  memberUnits: "1",
  nonMemberUnits: "0",
};

function paymentIntent(overrides: Record<string, unknown> = {}) {
  return {
    id: "pi_123",
    status: "succeeded",
    amount: 1061,
    metadata: ticketMetadata,
    ...overrides,
  };
}

/** Runs the server component, as Next would for /events/diwali-night/tickets/return. */
async function visit(searchParams: { payment_intent?: string } = { payment_intent: "pi_123" }) {
  const page = await TicketsReturnPage({ params: { slug: "diwali-night" }, searchParams });
  return renderToStaticMarkup(page);
}

beforeEach(() => {
  vi.resetAllMocks();
  paymentIntentsRetrieve.mockResolvedValue(paymentIntent());
  vi.mocked(appendTicketToAirtable).mockResolvedValue({ inserted: true });
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tickets return page", () => {
  it("records a paid ticket order and emails the buyer", async () => {
    const html = await visit();

    expect(paymentIntentsRetrieve).toHaveBeenCalledWith("pi_123");
    expect(appendTicketToAirtable).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "event-1", amountPaidCents: 1061, paid: true }),
      "pi_123"
    );
    expect(sendTicketConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(html).toContain("You&#x27;re going!");
  });

  it("shows what Stripe actually charged, with the member split as recorded", async () => {
    // A member's single ticket: nonMemberUnits "0" must not read as a
    // non-member seat (#51).
    const html = await visit();
    expect(html).toContain("You paid $10.61 (1 ticket at member price)");
    expect(html).not.toContain("non-member");
  });

  it("doesn't email again when the webhook already recorded the order", async () => {
    vi.mocked(appendTicketToAirtable).mockResolvedValue({ inserted: false });
    await visit();
    expect(sendTicketConfirmationEmail).not.toHaveBeenCalled();
  });

  it("records nothing for a membership payment pasted into the URL", async () => {
    // The id comes from the query string. Only ticket-tagged payments count.
    paymentIntentsRetrieve.mockResolvedValue(
      paymentIntent({ metadata: { purchaseType: "membership", firstName: "Asha" } })
    );
    await visit();
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
  });

  it.each(["processing", "requires_payment_method", "canceled"])(
    "records nothing and offers a retry while the payment is %s",
    async (status) => {
      paymentIntentsRetrieve.mockResolvedValue(paymentIntent({ status }));
      const html = await visit();
      expect(appendTicketToAirtable).not.toHaveBeenCalled();
      expect(html).toContain("still processing or was not completed");
      expect(html).toContain('href="/events/diwali-night/tickets"');
    }
  );

  it("shows the error state, without calling Stripe, when there's no payment in the URL", async () => {
    const html = await visit({});
    expect(paymentIntentsRetrieve).not.toHaveBeenCalled();
    expect(html).toContain("Something went wrong");
  });

  it("shows the pending state when Stripe can't find the payment", async () => {
    paymentIntentsRetrieve.mockRejectedValue(new Error("No such payment_intent"));
    const html = await visit();
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
    expect(html).toContain("still processing or was not completed");
  });

  it("still shows the buyer their confirmation when the Airtable write fails", async () => {
    // The webhook will retry the write; the buyer shouldn't see an error.
    vi.mocked(appendTicketToAirtable).mockRejectedValue(new Error("Airtable error: 503"));
    const html = await visit();
    expect(html).toContain("You&#x27;re going!");
  });
});
