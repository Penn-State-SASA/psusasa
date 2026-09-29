import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { getTicketRecordInfo, updateTicketCheckinState } from "@/lib/airtable";
import { jsonRequest } from "@/test/request";
import { muteConsole } from "@/test/console";

vi.mock("@/lib/airtable", () => ({
  getTicketRecordInfo: vi.fn(),
  updateTicketCheckinState: vi.fn(),
}));

// The middleware has already confirmed this caller may act on event-1.
function mark(body: Record<string, unknown>, eventId = "event-1") {
  return POST(jsonRequest(`/api/checkin/${eventId}/mark`, body), { params: { eventId } });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getTicketRecordInfo).mockResolvedValue({ eventId: "event-1", quantity: 3 });
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/checkin/[eventId]/mark", () => {
  it("updates the check-in count", async () => {
    const res = await mark({ recordId: "rec1", checkedInCount: 2 });
    expect(res.status).toBe(200);
    expect(updateTicketCheckinState).toHaveBeenCalledWith("rec1", { checkedInCount: 2 });
  });

  it("records cash collected and the check-in in one update", async () => {
    await mark({ recordId: "rec1", checkedInCount: 3, paid: true });
    expect(updateTicketCheckinState).toHaveBeenCalledWith("rec1", {
      checkedInCount: 3,
      paid: true,
    });
  });

  it("refuses to touch a ticket from a different event", async () => {
    // A session unlocked for event-1 must not be able to check people into,
    // or mark cash paid on, another event's orders.
    vi.mocked(getTicketRecordInfo).mockResolvedValue({ eventId: "event-2", quantity: 1 });
    const res = await mark({ recordId: "rec-other", checkedInCount: 1 });
    expect(res.status).toBe(403);
    expect(updateTicketCheckinState).not.toHaveBeenCalled();
  });

  it("refuses a record that doesn't exist", async () => {
    vi.mocked(getTicketRecordInfo).mockResolvedValue(null);
    const res = await mark({ recordId: "recMissing", checkedInCount: 1 });
    expect(res.status).toBe(403);
    expect(updateTicketCheckinState).not.toHaveBeenCalled();
  });

  it.each([-1, 4, "many"])("rejects a check-in count of %s for a 3-ticket order", async (count) => {
    const res = await mark({ recordId: "rec1", checkedInCount: count });
    expect(res.status).toBe(400);
    expect(updateTicketCheckinState).not.toHaveBeenCalled();
  });

  it("rejects a request with nothing to update", async () => {
    const res = await mark({ recordId: "rec1", paid: "yes" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Nothing to update." });
  });

  it("rejects a missing record id without looking anything up", async () => {
    const res = await mark({ checkedInCount: 1 });
    expect(res.status).toBe(400);
    expect(getTicketRecordInfo).not.toHaveBeenCalled();
  });

  it("returns 500 when Airtable fails the update", async () => {
    vi.mocked(updateTicketCheckinState).mockRejectedValue(new Error("Airtable update error"));
    const res = await mark({ recordId: "rec1", checkedInCount: 1 });
    expect(res.status).toBe(500);
  });
});
