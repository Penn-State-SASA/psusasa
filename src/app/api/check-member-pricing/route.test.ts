import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { hasUsedMemberPricing, lookupCurrentMember } from "@/lib/airtable";
import { jsonRequest } from "@/test/request";
import { muteConsole } from "@/test/console";

vi.mock("@/lib/airtable", () => ({
  hasUsedMemberPricing: vi.fn(),
  lookupCurrentMember: vi.fn(),
}));

function check(body: Record<string, unknown>) {
  return POST(jsonRequest("/api/check-member-pricing", body));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: false, year: null });
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
    expect(await res.json()).toEqual({ isMember: false, alreadyUsed: false });
    expect(lookupCurrentMember).not.toHaveBeenCalled();
  });

  it("reports a member who still has their discount", async () => {
    vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: true, year: "Junior" });
    const res = await check({ eventId: "event-1", psuEmail: " abc123@psu.edu " });
    expect(await res.json()).toEqual({ isMember: true, alreadyUsed: false });
    expect(hasUsedMemberPricing).toHaveBeenCalledWith("event-1", "abc123@psu.edu");
  });

  it("reports a member who already used their discount at this event", async () => {
    vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: true, year: "Junior" });
    vi.mocked(hasUsedMemberPricing).mockResolvedValue(true);
    const res = await check({ eventId: "event-1", psuEmail: "abc123@psu.edu" });
    expect(await res.json()).toEqual({ isMember: true, alreadyUsed: true });
  });

  it("doesn't check past orders for a non-member", async () => {
    await check({ eventId: "event-1", psuEmail: "abc123@psu.edu" });
    expect(hasUsedMemberPricing).not.toHaveBeenCalled();
  });

  it("returns 500 when the past-orders check fails", async () => {
    vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: true, year: null });
    vi.mocked(hasUsedMemberPricing).mockRejectedValue(new Error("Airtable list error"));
    const res = await check({ eventId: "event-1", psuEmail: "abc123@psu.edu" });
    expect(res.status).toBe(500);
  });
});
