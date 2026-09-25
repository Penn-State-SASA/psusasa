import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "./route";
import { sanityFetchSingle } from "../../../../../../sanity/lib/client";
import {
  appendAtDoorSale,
  deleteLatestAtDoorSale,
  sumCapacityUsed,
} from "@/lib/airtable";
import { makeEvent } from "@/test/factories";
import { muteConsole } from "@/test/console";

vi.mock("../../../../../../sanity/lib/client", () => ({
  sanityFetchSingle: vi.fn(),
  sanityFetch: vi.fn(),
}));
vi.mock("@/lib/airtable", () => ({
  appendAtDoorSale: vi.fn(),
  deleteLatestAtDoorSale: vi.fn(),
  sumCapacityUsed: vi.fn(),
}));

const ctx = { params: { eventId: "event-1" } };

function request(method: "POST" | "DELETE") {
  return new NextRequest(new URL("/api/checkin/event-1/at-door", "http://localhost"), {
    method,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sanityFetchSingle).mockResolvedValue(makeEvent());
  vi.mocked(appendAtDoorSale).mockResolvedValue();
  vi.mocked(sumCapacityUsed).mockResolvedValue(0);
  vi.mocked(deleteLatestAtDoorSale).mockResolvedValue(true);
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/checkin/[eventId]/at-door", () => {
  it("records a sale at the event's at-door price", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(makeEvent({ atDoorPriceCents: 1500 }));
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(appendAtDoorSale).toHaveBeenCalledWith({
      eventId: "event-1",
      eventName: "Diwali Night",
      amountCents: 1500,
    });
  });

  it("records $0 when no at-door price is set", async () => {
    await POST(request("POST"), ctx);
    expect(appendAtDoorSale).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 0 }));
  });

  it("doesn't count sales for an event with no capacity", async () => {
    expect((await POST(request("POST"), ctx)).status).toBe(200);
    expect(sumCapacityUsed).not.toHaveBeenCalled();
  });

  it("allows the sale that fills the last seat", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(makeEvent({ capacity: 100 }));
    vi.mocked(sumCapacityUsed).mockResolvedValue(99);
    expect((await POST(request("POST"), ctx)).status).toBe(200);
    expect(sumCapacityUsed).toHaveBeenCalledWith("event-1");
  });

  it("refuses once the event is at capacity", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(makeEvent({ capacity: 100 }));
    vi.mocked(sumCapacityUsed).mockResolvedValue(100);
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Event is at capacity." });
    expect(appendAtDoorSale).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown event", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(null);
    expect((await POST(request("POST"), ctx)).status).toBe(404);
  });

  it("refuses when the event has no ticketing", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(makeEvent({ ticketingEnabled: false }));
    expect((await POST(request("POST"), ctx)).status).toBe(400);
    expect(appendAtDoorSale).not.toHaveBeenCalled();
  });

  it("returns 500 when Airtable fails", async () => {
    vi.mocked(appendAtDoorSale).mockRejectedValue(new Error("Airtable error: 500"));
    const res = await POST(request("POST"), ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to add sale." });
  });
});

describe("DELETE /api/checkin/[eventId]/at-door", () => {
  it("deletes the event's most recent at-door sale", async () => {
    const res = await DELETE(request("DELETE"), ctx);
    expect(res.status).toBe(200);
    expect(deleteLatestAtDoorSale).toHaveBeenCalledWith("event-1");
  });

  it("returns 404 when there's nothing to undo", async () => {
    vi.mocked(deleteLatestAtDoorSale).mockResolvedValue(false);
    const res = await DELETE(request("DELETE"), ctx);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No at-door sales to undo." });
  });

  it("returns 500 when Airtable fails", async () => {
    vi.mocked(deleteLatestAtDoorSale).mockRejectedValue(new Error("Airtable error: 500"));
    expect((await DELETE(request("DELETE"), ctx)).status).toBe(500);
  });
});
