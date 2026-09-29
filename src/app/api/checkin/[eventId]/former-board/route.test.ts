import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { sanityFetchSingle } from "../../../../../../sanity/lib/client";
import { eventByIdQuery, formerBoardRosterQuery } from "../../../../../../sanity/lib/queries";
import { upsertFormerBoardCheckin } from "@/lib/airtable";
import type { SanityEvent } from "@/lib/types";
import { makeEvent, makeFormerBoardMember } from "@/test/factories";
import { jsonRequest } from "@/test/request";
import { muteConsole } from "@/test/console";

vi.mock("../../../../../../sanity/lib/client", () => ({
  sanityFetchSingle: vi.fn(),
  sanityFetch: vi.fn(),
}));
vi.mock("@/lib/airtable", () => ({ upsertFormerBoardCheckin: vi.fn() }));

const roster = {
  members: [
    makeFormerBoardMember(),
    makeFormerBoardMember({ _key: "jay-patel", firstName: "Jay", lastName: "Patel" }),
  ],
};

function sanityReturns(event: SanityEvent | null) {
  vi.mocked(sanityFetchSingle).mockImplementation((async (query: string) => {
    if (query === eventByIdQuery) return event;
    if (query === formerBoardRosterQuery) return roster;
    return null;
  }) as unknown as typeof sanityFetchSingle);
}

function checkIn(body: Record<string, unknown>) {
  return POST(jsonRequest("/api/checkin/event-1/former-board", body), {
    params: { eventId: "event-1" },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  sanityReturns(makeEvent());
  vi.mocked(upsertFormerBoardCheckin).mockResolvedValue();
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/checkin/[eventId]/former-board", () => {
  it("checks in a former board member as a comped Former Board guest", async () => {
    const res = await checkIn({ rosterKey: "om-makwana" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(upsertFormerBoardCheckin).toHaveBeenCalledWith({
      eventId: "event-1",
      eventName: "Diwali Night",
      rosterKey: "om-makwana",
      firstName: "Om",
      lastName: "Makwana",
      ticketTypeKey: "former-board",
      ticketTypeName: "Former Board",
    });
  });

  it("frees everyone by default — no Studio setup needed on the event", async () => {
    sanityReturns(makeEvent({ formerBoardExcludedKeys: undefined }));
    expect((await checkIn({ rosterKey: "jay-patel" })).status).toBe(200);
  });

  it.each([{}, { rosterKey: "" }, { rosterKey: 42 }])("rejects a missing key: %j", async (body) => {
    expect((await checkIn(body)).status).toBe(400);
    expect(upsertFormerBoardCheckin).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown event", async () => {
    sanityReturns(null);
    expect((await checkIn({ rosterKey: "om-makwana" })).status).toBe(404);
  });

  it("refuses when the event has no ticketing", async () => {
    sanityReturns(makeEvent({ ticketingEnabled: false }));
    expect((await checkIn({ rosterKey: "om-makwana" })).status).toBe(400);
    expect(upsertFormerBoardCheckin).not.toHaveBeenCalled();
  });

  it("refuses someone who isn't on the roster", async () => {
    const res = await checkIn({ rosterKey: "someone-else" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Not a recognized former board member." });
    expect(upsertFormerBoardCheckin).not.toHaveBeenCalled();
  });

  it("refuses someone the event unticked in Studio", async () => {
    sanityReturns(makeEvent({ formerBoardExcludedKeys: ["jay-patel"] }));
    const res = await checkIn({ rosterKey: "jay-patel" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Jay Patel isn't on the free list for this event.",
    });
    expect(upsertFormerBoardCheckin).not.toHaveBeenCalled();
  });

  it("returns 500 when Airtable fails", async () => {
    vi.mocked(upsertFormerBoardCheckin).mockRejectedValue(new Error("Airtable error: 500"));
    const res = await checkIn({ rosterKey: "om-makwana" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to check in." });
  });
});
