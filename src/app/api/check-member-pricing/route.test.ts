import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { hasUsedMemberPricing, lookupCurrentMember } from "@/lib/airtable";
import { jsonRequest } from "@/test/request";
import { muteConsole } from "@/test/console";

vi.mock("@/lib/airtable", () => ({
  hasUsedMemberPricing: vi.fn(),
  lookupCurrentMember: vi.fn(),
}));

const buyer = { firstName: "Asha", lastName: "Patel" };

function check(body: Record<string, unknown>) {
  return POST(jsonRequest("/api/check-member-pricing", { ...buyer, ...body }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(lookupCurrentMember).mockResolvedValue({
    isMember: false,
    year: null,
    firstName: null,
    lastName: null,
  });
  vi.mocked(hasUsedMemberPricing).mockResolvedValue(false);
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/check-member-pricing", () => {
  it("requires an event", async () => {
    const res = await check({ psuEmail: "abc123@psu.edu" });
    expect(res.status).toBe(400);
  });

  it("answers not-a-member for a blank email without any lookups", async () => {
    const res = await check({ eventId: "event-1", psuEmail: "  " });
    expect(await res.json()).toEqual({ isMember: false, alreadyUsed: false, nameMismatch: false });
    expect(lookupCurrentMember).not.toHaveBeenCalled();
  });

  it("treats a missing psuEmail the same as blank", async () => {
    const res = await check({ eventId: "event-1" });
    expect(await res.json()).toEqual({ isMember: false, alreadyUsed: false, nameMismatch: false });
    expect(lookupCurrentMember).not.toHaveBeenCalled();
  });

  it("reports a member who still has their discount", async () => {
    vi.mocked(lookupCurrentMember).mockResolvedValue({
      isMember: true,
      year: "Junior",
      firstName: "Asha",
      lastName: "Patel",
    });
    const res = await check({ eventId: "event-1", psuEmail: " abc123@psu.edu " });
    expect(await res.json()).toEqual({
      isMember: true,
      alreadyUsed: false,
      nameMismatch: false,
    });
    expect(hasUsedMemberPricing).toHaveBeenCalledWith("event-1", "abc123@psu.edu");
  });

  it("reports a member who already used their discount at this event", async () => {
    vi.mocked(lookupCurrentMember).mockResolvedValue({
      isMember: true,
      year: "Junior",
      firstName: "Asha",
      lastName: "Patel",
    });
    vi.mocked(hasUsedMemberPricing).mockResolvedValue(true);
    const res = await check({ eventId: "event-1", psuEmail: "abc123@psu.edu" });
    expect(await res.json()).toEqual({ isMember: true, alreadyUsed: true, nameMismatch: false });
  });

  it("doesn't check past orders for a non-member", async () => {
    await check({ eventId: "event-1", psuEmail: "abc123@psu.edu" });
    expect(hasUsedMemberPricing).not.toHaveBeenCalled();
  });

  it("flags a name mismatch distinctly from no membership at all", async () => {
    // So the form can tell the buyer "wrong name" instead of the
    // misleading "no membership under this email" when one actually exists.
    vi.mocked(lookupCurrentMember).mockResolvedValue({
      isMember: true,
      year: "Junior",
      firstName: "Someone",
      lastName: "Else",
    });
    const res = await check({ eventId: "event-1", psuEmail: "abc123@psu.edu" });
    expect(await res.json()).toEqual({
      isMember: false,
      alreadyUsed: false,
      nameMismatch: true,
    });
    expect(hasUsedMemberPricing).not.toHaveBeenCalled();
  });

  it("returns 500 when the past-orders check fails", async () => {
    vi.mocked(lookupCurrentMember).mockResolvedValue({
      isMember: true,
      year: null,
      firstName: "Asha",
      lastName: "Patel",
    });
    vi.mocked(hasUsedMemberPricing).mockRejectedValue(new Error("Airtable list error"));
    const res = await check({ eventId: "event-1", psuEmail: "abc123@psu.edu" });
    expect(res.status).toBe(500);
  });
});
