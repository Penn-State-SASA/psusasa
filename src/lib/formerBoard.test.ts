import { describe, it, expect } from "vitest";
import {
  FORMER_BOARD_TICKET_TYPE_KEY,
  formerBoardVirtualId,
  freeFormerBoardMembers,
  isFormerBoardTicket,
  isFormerBoardVirtualId,
  mergeFormerBoardGuests,
  rosterKeyFromVirtualId,
  toggleExcludedKey,
} from "@/lib/formerBoard";
import { makeFormerBoardMember, makeTicketRecord } from "@/test/factories";

const om = makeFormerBoardMember();
const vibha = makeFormerBoardMember({ _key: "vibha-iyer", firstName: "Vibha", lastName: "Iyer" });
const jay = makeFormerBoardMember({ _key: "jay-patel", firstName: "Jay", lastName: "Patel" });

describe("virtual ids", () => {
  it("round-trips a roster key and never looks like an Airtable id", () => {
    const id = formerBoardVirtualId("om-makwana");
    expect(isFormerBoardVirtualId(id)).toBe(true);
    expect(rosterKeyFromVirtualId(id)).toBe("om-makwana");
    expect(isFormerBoardVirtualId("rec123")).toBe(false);
  });
});

describe("freeFormerBoardMembers", () => {
  it("frees everyone when the event hasn't unticked anyone", () => {
    expect(freeFormerBoardMembers([om, vibha], undefined)).toEqual([om, vibha]);
    expect(freeFormerBoardMembers([om, vibha], [])).toEqual([om, vibha]);
  });

  it("leaves out whoever the event unticked", () => {
    expect(freeFormerBoardMembers([om, vibha, jay], ["vibha-iyer"])).toEqual([om, jay]);
  });

  it("is empty with no roster published yet", () => {
    expect(freeFormerBoardMembers(null, [])).toEqual([]);
    expect(freeFormerBoardMembers(undefined, undefined)).toEqual([]);
  });

  it("skips half-filled roster entries rather than listing a blank name", () => {
    expect(freeFormerBoardMembers([om, { ...vibha, lastName: "" }], [])).toEqual([om]);
  });
});

describe("mergeFormerBoardGuests", () => {
  const paid = makeTicketRecord({ id: "rec-asha" });

  it("adds a free, paid-up, not-yet-checked-in row per former board member", () => {
    const merged = mergeFormerBoardGuests([paid], [om]);
    expect(merged).toEqual([
      paid,
      {
        id: "former-board:om-makwana",
        firstName: "Om",
        lastName: "Makwana",
        contactEmail: "",
        psuEmail: "",
        isMember: false,
        memberYear: null,
        ticketTypeKey: FORMER_BOARD_TICKET_TYPE_KEY,
        ticketTypeName: "Former Board",
        quantity: 1,
        amountPaidCents: 0,
        paymentMethod: "Card",
        paid: true,
        checkedInCount: 0,
        checkedInAt: null,
        boardMemberName: null,
      },
    ]);
    expect(isFormerBoardTicket(merged[1])).toBe(true);
    expect(isFormerBoardTicket(paid)).toBe(false);
  });

  it("drops the placeholder once they have a real row, matching names loosely", () => {
    const checkedIn = makeTicketRecord({
      id: "rec-om",
      firstName: " om ",
      lastName: "MAKWANA",
      ticketTypeKey: FORMER_BOARD_TICKET_TYPE_KEY,
      checkedInCount: 1,
    });
    const merged = mergeFormerBoardGuests([paid, checkedIn], [om, vibha]);
    expect(merged.map((t) => t.id)).toEqual(["rec-asha", "rec-om", "former-board:vibha-iyer"]);
  });

  it("still lists a former board member who also bought a regular ticket", () => {
    // Their paid order isn't a comp, so it doesn't stand in for the free entry.
    const bought = makeTicketRecord({ id: "rec-om-paid", firstName: "Om", lastName: "Makwana" });
    const merged = mergeFormerBoardGuests([bought], [om]);
    expect(merged.map((t) => t.id)).toEqual(["rec-om-paid", "former-board:om-makwana"]);
  });

  it("leaves the orders untouched when no one is comped", () => {
    expect(mergeFormerBoardGuests([paid], [])).toEqual([paid]);
  });
});

describe("toggleExcludedKey", () => {
  it("unticking adds the person to the not-free list once", () => {
    expect(toggleExcludedKey(undefined, "om-makwana", false)).toEqual(["om-makwana"]);
    expect(toggleExcludedKey(["om-makwana"], "om-makwana", false)).toEqual(["om-makwana"]);
  });

  it("ticking takes them back off it, keeping everyone else", () => {
    expect(toggleExcludedKey(["om-makwana", "jay-patel"], "om-makwana", true)).toEqual([
      "jay-patel",
    ]);
    expect(toggleExcludedKey(null, "om-makwana", true)).toEqual([]);
  });
});
