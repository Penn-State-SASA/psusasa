import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { listTicketsForEvent } from "@/lib/airtable";
import { sanityFetchSingle } from "../../../../../../sanity/lib/client";
import { eventByIdQuery, formerBoardRosterQuery } from "../../../../../../sanity/lib/queries";
import type { SanityEvent } from "@/lib/types";
import { makeEvent, makeFormerBoardMember, makeTicketRecord } from "@/test/factories";
import { muteConsole } from "@/test/console";

vi.mock("@/lib/airtable", () => ({ listTicketsForEvent: vi.fn() }));
vi.mock("../../../../../../sanity/lib/client", () => ({
  sanityFetchSingle: vi.fn(),
  sanityFetch: vi.fn(),
}));

const om = makeFormerBoardMember();

function sanityReturns(event: SanityEvent | null) {
  vi.mocked(sanityFetchSingle).mockImplementation((async (query: string) => {
    if (query === eventByIdQuery) return event;
    if (query === formerBoardRosterQuery) return { members: [om] };
    return null;
  }) as unknown as typeof sanityFetchSingle);
}

function list(eventId = "event-1") {
  return GET(new NextRequest(`http://localhost/api/checkin/${eventId}/tickets`), {
    params: { eventId },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  sanityReturns(makeEvent());
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/checkin/[eventId]/tickets", () => {
  it("lists the event's orders plus its comped former board members", async () => {
    const tickets = [makeTicketRecord()];
    vi.mocked(listTicketsForEvent).mockResolvedValue(tickets);
    const res = await list("event-1");
    expect(listTicketsForEvent).toHaveBeenCalledWith("event-1");
    expect(sanityFetchSingle).toHaveBeenCalledWith(eventByIdQuery, { id: "event-1" });
    const body = await res.json();
    expect(body.tickets).toHaveLength(2);
    expect(body.tickets[0]).toEqual(tickets[0]);
    expect(body.tickets[1]).toMatchObject({
      id: "former-board:om-makwana",
      firstName: "Om",
      lastName: "Makwana",
      ticketTypeKey: "former-board",
    });
  });

  it("lists just the orders when the event isn't found in Sanity", async () => {
    const tickets = [makeTicketRecord()];
    vi.mocked(listTicketsForEvent).mockResolvedValue(tickets);
    sanityReturns(null);
    expect(await (await list()).json()).toEqual({ tickets });
  });

  it("still serves every order when Sanity is down", async () => {
    // The door can't lose the paid list over the comp list.
    const tickets = [makeTicketRecord()];
    vi.mocked(listTicketsForEvent).mockResolvedValue(tickets);
    vi.mocked(sanityFetchSingle).mockRejectedValue(new Error("Sanity 503"));
    const res = await list();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tickets });
  });

  it("returns 500 when Airtable fails", async () => {
    vi.mocked(listTicketsForEvent).mockRejectedValue(new Error("Airtable list error"));
    expect((await list()).status).toBe(500);
  });
});
