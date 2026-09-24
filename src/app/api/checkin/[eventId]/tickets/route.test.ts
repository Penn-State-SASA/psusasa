import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { listTicketsForEvent } from "@/lib/airtable";
import { makeTicketRecord } from "@/test/factories";
import { muteConsole } from "@/test/console";

vi.mock("@/lib/airtable", () => ({ listTicketsForEvent: vi.fn() }));

function list(eventId = "event-1") {
  return GET(new NextRequest(`http://localhost/api/checkin/${eventId}/tickets`), {
    params: { eventId },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/checkin/[eventId]/tickets", () => {
  it("lists the orders for the event in the URL", async () => {
    const tickets = [makeTicketRecord()];
    vi.mocked(listTicketsForEvent).mockResolvedValue(tickets);
    const res = await list("event-1");
    expect(listTicketsForEvent).toHaveBeenCalledWith("event-1");
    expect(await res.json()).toEqual({ tickets });
  });

  it("returns 500 when Airtable fails", async () => {
    vi.mocked(listTicketsForEvent).mockRejectedValue(new Error("Airtable list error"));
    expect((await list()).status).toBe(500);
  });
});
