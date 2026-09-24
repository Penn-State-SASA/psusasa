import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveTicketOrder, TicketOrderError, MAX_TICKETS_PER_ORDER } from "@/lib/ticketing";
import { sanityFetchSingle } from "../../sanity/lib/client";
import { hasUsedMemberPricing, lookupCurrentMember, sumSoldTicketQuantity } from "@/lib/airtable";
import { makeEvent, makeTicketType } from "@/test/factories";

// An explicit factory: automocking would still load next-sanity to learn
// the module's shape, which costs seconds for nothing.
vi.mock("../../sanity/lib/client", () => ({ sanityFetchSingle: vi.fn(), sanityFetch: vi.fn() }));
vi.mock("@/lib/airtable");

const ga = makeTicketType({ _key: "ga", memberPriceCents: 1000, nonMemberPriceCents: 1500 });

function order(overrides: Record<string, unknown> = {}) {
  return resolveTicketOrder({
    eventId: "event-1",
    ticketTypeKey: "ga",
    quantity: 1,
    psuEmail: "",
    ...overrides,
  });
}

async function rejection(p: Promise<unknown>): Promise<TicketOrderError> {
  const err = await p.then(
    () => {
      throw new Error("expected the order to be rejected");
    },
    (e: unknown) => e
  );
  expect(err).toBeInstanceOf(TicketOrderError);
  return err as TicketOrderError;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sanityFetchSingle).mockResolvedValue(makeEvent({ ticketTypes: [ga] }));
  vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: false, year: null });
  vi.mocked(hasUsedMemberPricing).mockResolvedValue(false);
  vi.mocked(sumSoldTicketQuantity).mockResolvedValue(0);
});

describe("resolveTicketOrder — input validation", () => {
  it.each([
    [{ eventId: "" }, "Missing event."],
    [{ eventId: 42 }, "Missing event."],
    [{ ticketTypeKey: "" }, "Missing ticket type."],
  ])("rejects %o with 400", async (overrides, message) => {
    const err = await rejection(order(overrides));
    expect(err.status).toBe(400);
    expect(err.message).toBe(message);
  });

  it.each([0, -1, MAX_TICKETS_PER_ORDER + 1, "abc", NaN])(
    "rejects quantity %s",
    async (quantity) => {
      const err = await rejection(order({ quantity }));
      expect(err.status).toBe(400);
      expect(err.message).toMatch(/Quantity must be between 1 and/);
    }
  );

  it("floors a fractional quantity", async () => {
    expect((await order({ quantity: 2.9 })).quantity).toBe(2);
  });

  it("never fetches the event when the input is already invalid", async () => {
    await rejection(order({ quantity: 0 }));
    expect(sanityFetchSingle).not.toHaveBeenCalled();
  });
});

describe("resolveTicketOrder — event and ticket type", () => {
  it("404s an unknown event", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(null);
    expect((await rejection(order())).status).toBe(404);
  });

  it("rejects an event with ticketing turned off", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(makeEvent({ ticketingEnabled: false }));
    const err = await rejection(order());
    expect(err.status).toBe(400);
    expect(err.message).toBe("Ticket sales are not open for this event.");
  });

  it("404s a ticket type the event doesn't have", async () => {
    expect((await rejection(order({ ticketTypeKey: "vip" }))).status).toBe(404);
  });

  it("rejects a ticket type whose sales are closed", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(
      makeEvent({ ticketTypes: [{ ...ga, salesOpen: false }] })
    );
    expect((await rejection(order())).message).toBe("This ticket type is no longer on sale.");
  });
});

describe("resolveTicketOrder — member pricing", () => {
  it("charges a non-member the non-member price for every seat", async () => {
    const r = await order({ quantity: 3, psuEmail: "abc123@psu.edu" });
    expect(r).toMatchObject({ memberUnits: 0, nonMemberUnits: 3, subtotalCents: 4500 });
    expect(r.isMember).toBe(false);
    expect(r.memberYear).toBeNull();
  });

  it("gives a member exactly one member-priced seat, however many they buy", async () => {
    // Buying in bulk must not stack the discount: 1 member seat + 3 guests.
    vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: true, year: "Junior" });
    const r = await order({ quantity: 4, psuEmail: "abc123@psu.edu" });
    expect(r).toMatchObject({
      isCurrentMember: true,
      isMember: true,
      memberYear: "Junior",
      memberUnits: 1,
      nonMemberUnits: 3,
      subtotalCents: 1000 + 3 * 1500,
    });
  });

  it("gives no member seat to a member who already used it on an earlier order", async () => {
    vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: true, year: "Junior" });
    vi.mocked(hasUsedMemberPricing).mockResolvedValue(true);
    const r = await order({ quantity: 2, psuEmail: "abc123@psu.edu" });
    expect(r).toMatchObject({
      isCurrentMember: true,
      isMember: false,
      memberYear: null,
      memberUnits: 0,
      nonMemberUnits: 2,
      subtotalCents: 3000,
    });
    expect(hasUsedMemberPricing).toHaveBeenCalledWith("event-1", "abc123@psu.edu");
  });

  it("skips the membership lookup entirely when no PSU email is given", async () => {
    await order({ psuEmail: "   " });
    expect(lookupCurrentMember).not.toHaveBeenCalled();
    expect(hasUsedMemberPricing).not.toHaveBeenCalled();
  });

  it("only checks past orders for people who are members", async () => {
    await order({ psuEmail: "abc123@psu.edu" });
    expect(hasUsedMemberPricing).not.toHaveBeenCalled();
  });

  it("allows a free member ticket", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(
      makeEvent({ ticketTypes: [{ ...ga, memberPriceCents: 0 }] })
    );
    vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: true, year: null });
    const r = await order({ psuEmail: "abc123@psu.edu" });
    expect(r.subtotalCents).toBe(0);
  });
});

describe("resolveTicketOrder — capacity", () => {
  const capped = makeEvent({ ticketTypes: [{ ...ga, capacity: 100 }] });

  it("doesn't count sales for a ticket type with no capacity", async () => {
    await order();
    expect(sumSoldTicketQuantity).not.toHaveBeenCalled();
  });

  it("accepts an order that exactly fills the remaining seats", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(capped);
    vi.mocked(sumSoldTicketQuantity).mockResolvedValue(97);
    expect((await order({ quantity: 3 })).quantity).toBe(3);
    expect(sumSoldTicketQuantity).toHaveBeenCalledWith("event-1", "ga");
  });

  it("says how many are left when an order is too big", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(capped);
    vi.mocked(sumSoldTicketQuantity).mockResolvedValue(98);
    const err = await rejection(order({ quantity: 3 }));
    expect(err.message).toBe("Only 2 ticket(s) left for General Admission.");
  });

  it("says sold out when nothing is left", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(capped);
    vi.mocked(sumSoldTicketQuantity).mockResolvedValue(100);
    const err = await rejection(order());
    expect(err.message).toBe("General Admission is sold out.");
  });
});
