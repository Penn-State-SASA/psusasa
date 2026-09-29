import { describe, it, expect } from "vitest";
import { parseTicketQr, ticketQrPayload } from "@/lib/ticketQrPayload";

const RECORD = "recAbC123dEf456gH";

describe("ticketQrPayload / parseTicketQr", () => {
  it("round-trips a record and event id", () => {
    const text = ticketQrPayload(RECORD, "event-1");
    expect(text).toBe(`SASA1:${RECORD}:event-1`);
    expect(parseTicketQr(text)).toEqual({ recordId: RECORD, eventId: "event-1" });
  });

  it("keeps an event id that has its own colons or dots intact", () => {
    expect(parseTicketQr(`SASA1:${RECORD}:drafts.a:b`)).toEqual({
      recordId: RECORD,
      eventId: "drafts.a:b",
    });
  });

  it("rejects anything that isn't a SASA ticket", () => {
    expect(parseTicketQr("https://example.com")).toBeNull();
    expect(parseTicketQr(`SASA2:${RECORD}:event-1`)).toBeNull();
    expect(parseTicketQr("")).toBeNull();
  });

  it("rejects a malformed record id", () => {
    expect(parseTicketQr("SASA1:rec123:event-1")).toBeNull();
    expect(parseTicketQr("SASA1:xyzAbC123dEf456gH:event-1")).toBeNull();
  });

  it("rejects a missing event id", () => {
    expect(parseTicketQr(`SASA1:${RECORD}:`)).toBeNull();
    expect(parseTicketQr(`SASA1:${RECORD}`)).toBeNull();
  });
});
