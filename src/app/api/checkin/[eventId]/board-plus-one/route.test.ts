import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { sanityFetchSingle } from "../../../../../../sanity/lib/client";
import { boardMembersAuthQuery, eventByIdQuery } from "../../../../../../sanity/lib/queries";
import { appendTicketToAirtable, listTicketsForEvent } from "@/lib/airtable";
import { BOARD_PLUS_ONE_TICKET_TYPE_KEY } from "@/lib/boardPlusOne";
import type { SanityEvent } from "@/lib/types";
import { makeEvent, makeTicketRecord } from "@/test/factories";
import { jsonRequest } from "@/test/request";
import { muteConsole } from "@/test/console";

vi.mock("../../../../../../sanity/lib/client", () => ({
  sanityFetchSingle: vi.fn(),
  sanityFetch: vi.fn(),
}));
vi.mock("@/lib/airtable", () => ({
  appendTicketToAirtable: vi.fn(),
  listTicketsForEvent: vi.fn(),
}));

const roster = {
  members: [
    { _key: "bm1", firstName: "Ravi", lastName: "Shah", psuEmail: "rs1@psu.edu" },
    { _key: "bm2", firstName: "Meera", lastName: "Iyer", psuEmail: "mi2@psu.edu" },
  ],
};

function sanityReturns(event: SanityEvent | null) {
  vi.mocked(sanityFetchSingle).mockImplementation((async (query: string) => {
    if (query === eventByIdQuery) return event;
    if (query === boardMembersAuthQuery) return roster;
    return null;
  }) as unknown as typeof sanityFetchSingle);
}

function addGuest(body: Record<string, unknown>) {
  return POST(jsonRequest("/api/checkin/event-1/board-plus-one", body), {
    params: { eventId: "event-1" },
  });
}

const guest = { boardMemberKey: "bm1", guestFirstName: " Dev ", guestLastName: "Rao" };

beforeEach(() => {
  vi.resetAllMocks();
  sanityReturns(makeEvent({ boardPlusOneEnabled: true }));
  vi.mocked(listTicketsForEvent).mockResolvedValue([]);
  vi.mocked(appendTicketToAirtable).mockResolvedValue({ inserted: true });
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/checkin/[eventId]/board-plus-one", () => {
  it("adds a free, paid-up guest under the board member's name", async () => {
    const res = await addGuest(guest);
    expect(res.status).toBe(200);
    expect(appendTicketToAirtable).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Dev",
        lastName: "Rao",
        eventId: "event-1",
        ticketTypeKey: BOARD_PLUS_ONE_TICKET_TYPE_KEY,
        ticketTypeName: "Guest of Ravi Shah",
        boardMemberName: "Ravi Shah",
        quantity: 1,
        amountPaidCents: 0,
        paid: true,
      }),
      null
    );
  });

  it("allows only one +1 per board member per event", async () => {
    // The picker disables used names, but that's only a UI hint.
    vi.mocked(listTicketsForEvent).mockResolvedValue([
      makeTicketRecord({
        ticketTypeKey: BOARD_PLUS_ONE_TICKET_TYPE_KEY,
        boardMemberName: "Ravi Shah",
      }),
    ]);
    const res = await addGuest(guest);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Ravi Shah has already registered their +1 for this event.",
    });
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
  });

  it("lets a different board member add their own +1", async () => {
    vi.mocked(listTicketsForEvent).mockResolvedValue([
      makeTicketRecord({
        ticketTypeKey: BOARD_PLUS_ONE_TICKET_TYPE_KEY,
        boardMemberName: "Ravi Shah",
      }),
    ]);
    const res = await addGuest({ ...guest, boardMemberKey: "bm2" });
    expect(res.status).toBe(200);
  });

  it("rejects someone who isn't on the board roster", async () => {
    const res = await addGuest({ ...guest, boardMemberKey: "not-on-board" });
    expect(res.status).toBe(400);
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
  });

  it.each([
    ["board +1 is off for the event", makeEvent({ boardPlusOneEnabled: false })],
    ["ticketing is off for the event", makeEvent({ boardPlusOneEnabled: true, ticketingEnabled: false })],
  ])("refuses when %s", async (_why, event) => {
    sanityReturns(event);
    const res = await addGuest(guest);
    expect(res.status).toBe(400);
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
  });

  it("404s an unknown event", async () => {
    sanityReturns(null);
    const res = await addGuest(guest);
    expect(res.status).toBe(404);
  });

  it.each([
    [{ ...guest, boardMemberKey: "" }],
    [{ ...guest, guestFirstName: "  " }],
    [{ ...guest, guestLastName: undefined }],
  ])("rejects an incomplete request %o", async (body) => {
    const res = await addGuest(body);
    expect(res.status).toBe(400);
    expect(sanityFetchSingle).not.toHaveBeenCalled();
  });
});
