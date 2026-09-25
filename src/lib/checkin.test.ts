import { describe, it, expect } from "vitest";
import { amountOwedCents, checkinUpdates, matchesSearch, psuIdOf } from "@/lib/checkin";
import { makeTicketRecord } from "@/test/factories";

describe("amountOwedCents", () => {
  it("is zero for card orders, which were paid at checkout", () => {
    const t = makeTicketRecord({ paymentMethod: "Card", amountPaidCents: 3000, quantity: 2 });
    expect(amountOwedCents(t)).toBe(0);
  });

  it("is the full amount for a cash order nobody has checked in yet", () => {
    const t = makeTicketRecord({ paymentMethod: "Cash", amountPaidCents: 4500, quantity: 3 });
    expect(amountOwedCents(t)).toBe(4500);
  });

  it("drops proportionally as a cash party checks in", () => {
    const t = makeTicketRecord({ paymentMethod: "Cash", amountPaidCents: 4500, quantity: 3 });
    expect(amountOwedCents({ ...t, checkedInCount: 1 })).toBe(3000);
    expect(amountOwedCents({ ...t, checkedInCount: 2 })).toBe(1500);
  });

  it("is zero once the whole cash party is in", () => {
    const t = makeTicketRecord({ paymentMethod: "Cash", amountPaidCents: 4500, quantity: 3 });
    expect(amountOwedCents({ ...t, checkedInCount: 3 })).toBe(0);
  });

  it("rounds a split that doesn't divide evenly to whole cents", () => {
    // $10 across 3 seats: one seat in leaves 2/3 of $10 owed.
    const t = makeTicketRecord({
      paymentMethod: "Cash",
      amountPaidCents: 1000,
      quantity: 3,
      checkedInCount: 1,
    });
    expect(amountOwedCents(t)).toBe(667);
  });

  it("owes nothing on a malformed zero-quantity row rather than dividing by zero", () => {
    const t = makeTicketRecord({ paymentMethod: "Cash", amountPaidCents: 1500, quantity: 0 });
    expect(amountOwedCents(t)).toBe(0);
  });
});

describe("checkinUpdates", () => {
  it("sends only the count for a card order", () => {
    const t = makeTicketRecord({ paymentMethod: "Card", quantity: 2 });
    expect(checkinUpdates(t, 1)).toEqual({ checkedInCount: 1 });
  });

  it("marks a cash order paid only once every seat is checked in", () => {
    const t = makeTicketRecord({ paymentMethod: "Cash", quantity: 3, paid: false });
    expect(checkinUpdates(t, 1)).toEqual({ checkedInCount: 1, paid: false });
    expect(checkinUpdates(t, 2)).toEqual({ checkedInCount: 2, paid: false });
    expect(checkinUpdates(t, 3)).toEqual({ checkedInCount: 3, paid: true });
  });

  it("flips a cash order back to unpaid when a check-in is undone", () => {
    const t = makeTicketRecord({
      paymentMethod: "Cash",
      quantity: 1,
      checkedInCount: 1,
      paid: true,
    });
    expect(checkinUpdates(t, 0)).toEqual({ checkedInCount: 0, paid: false });
  });
});

describe("matchesSearch", () => {
  const dev = makeTicketRecord({
    firstName: "Dev",
    lastName: "Rao-Menon",
    contactEmail: "dev.rao@example.com",
    psuEmail: "dxr5123@psu.edu",
  });

  it("matches everyone on an empty or blank query", () => {
    expect(matchesSearch(dev, "")).toBe(true);
    expect(matchesSearch(dev, "   ")).toBe(true);
  });

  it("matches the start of name words, in any order and any case", () => {
    expect(matchesSearch(dev, "de ra")).toBe(true);
    expect(matchesSearch(dev, "RAO dev")).toBe(true);
  });

  it("treats each half of a hyphenated name as its own word", () => {
    expect(matchesSearch(dev, "menon")).toBe(true);
  });

  it("requires every typed word to match", () => {
    expect(matchesSearch(dev, "dev patel")).toBe(false);
  });

  it("doesn't match text from the middle of a name", () => {
    expect(matchesSearch(dev, "enon")).toBe(false);
  });

  it("matches anywhere in either email, including a PSU ID", () => {
    expect(matchesSearch(dev, "example.com")).toBe(true);
    expect(matchesSearch(dev, "dxr5")).toBe(true);
  });
});

describe("psuIdOf", () => {
  it("is the part of the PSU email before the @", () => {
    expect(psuIdOf(makeTicketRecord({ psuEmail: "abc1234@psu.edu" }))).toBe("abc1234");
  });

  it("is empty when there's no PSU email", () => {
    expect(psuIdOf(makeTicketRecord({ psuEmail: "" }))).toBe("");
  });
});
