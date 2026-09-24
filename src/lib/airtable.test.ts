import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  appendMemberToAirtable,
  appendTicketToAirtable,
  getTicketRecordInfo,
  hasUsedMemberPricing,
  listTicketsForEvent,
  lookupCurrentMember,
  sumSoldTicketQuantity,
  updateTicketCheckinState,
  type TicketOrderMetadata,
} from "@/lib/airtable";
import { muteConsole } from "@/test/console";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** The filterByFormula Airtable was asked for on the nth fetch call. */
function formulaOfCall(n = 0): string {
  const url = new URL(String(fetchMock.mock.calls[n][0]));
  return url.searchParams.get("filterByFormula") ?? "";
}

function bodyOfCall(n = 0): Record<string, unknown> {
  return JSON.parse(String(fetchMock.mock.calls[n][1]?.body));
}

const order: TicketOrderMetadata = {
  firstName: "Asha",
  lastName: "Patel",
  contactEmail: "asha@example.com",
  psuEmail: "abc123@psu.edu",
  isMember: true,
  memberYear: "Junior",
  eventId: "event-1",
  eventName: "Diwali Night",
  ticketTypeKey: "ga",
  ticketTypeName: "General Admission",
  quantity: 2,
  amountPaidCents: 2573,
  paymentMethod: "Card",
  paid: true,
  boardMemberName: null,
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  muteConsole();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("lookupCurrentMember", () => {
  it("finds a member by case- and space-insensitive PSU email and returns their year", async () => {
    fetchMock.mockResolvedValue(json({ records: [{ fields: { Year: "Senior" } }] }));
    expect(await lookupCurrentMember("  ABC123@PSU.EDU ")).toEqual({
      isMember: true,
      year: "Senior",
    });
    expect(formulaOfCall()).toBe("LOWER(TRIM({PSU Email})) = 'abc123@psu.edu'");
    expect(String(fetchMock.mock.calls[0][0])).toContain("maxRecords=1");
  });

  it("escapes quotes so an email can't rewrite the formula", async () => {
    // Without escaping, this would close the string and OR in TRUE(),
    // matching the first row in Members: a free member discount.
    fetchMock.mockResolvedValue(json({ records: [] }));
    await lookupCurrentMember("x' OR TRUE() OR '");
    expect(formulaOfCall()).toBe("LOWER(TRIM({PSU Email})) = 'x\\' or true() or \\''");
  });

  it("escapes backslashes before quotes, so a trailing backslash can't unescape one", async () => {
    fetchMock.mockResolvedValue(json({ records: [] }));
    await lookupCurrentMember("a\\");
    expect(formulaOfCall()).toBe("LOWER(TRIM({PSU Email})) = 'a\\\\'");
  });

  it("returns non-member when nobody matches", async () => {
    fetchMock.mockResolvedValue(json({ records: [] }));
    expect(await lookupCurrentMember("nobody@psu.edu")).toEqual({ isMember: false, year: null });
  });

  it("returns a null year for a member row without one", async () => {
    fetchMock.mockResolvedValue(json({ records: [{ fields: {} }] }));
    expect(await lookupCurrentMember("abc123@psu.edu")).toEqual({ isMember: true, year: null });
  });

  // This decides a charge. When Airtable can't answer, the buyer pays the
  // non-member price rather than getting a discount by accident.
  it("falls back to non-member when Airtable returns an error", async () => {
    fetchMock.mockResolvedValue(json({ error: "RATE_LIMITED" }, 429));
    expect(await lookupCurrentMember("abc123@psu.edu")).toEqual({ isMember: false, year: null });
  });

  it("falls back to non-member when the request fails outright", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await lookupCurrentMember("abc123@psu.edu")).toEqual({ isMember: false, year: null });
  });

  it("doesn't call Airtable for a blank email", async () => {
    expect(await lookupCurrentMember("   ")).toEqual({ isMember: false, year: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("sumSoldTicketQuantity", () => {
  it("follows Airtable's offset cursor past the 100-record page limit", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ records: [{ id: "a", fields: { Quantity: 2 } }], offset: "page2" })
      )
      .mockResolvedValueOnce(
        json({ records: [{ id: "b", fields: { Quantity: 3 } }], offset: "page3" })
      )
      .mockResolvedValueOnce(json({ records: [{ id: "c", fields: { Quantity: 1 } }] }));

    expect(await sumSoldTicketQuantity("event-1", "ga")).toBe(6);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("offset")).toBe("page2");
    expect(new URL(String(fetchMock.mock.calls[2][0])).searchParams.get("offset")).toBe("page3");
  });

  it("filters by both event and ticket type", async () => {
    fetchMock.mockResolvedValue(json({ records: [] }));
    await sumSoldTicketQuantity("event-1", "ga");
    expect(formulaOfCall()).toBe("AND({Event ID} = 'event-1', {Ticket Type Key} = 'ga')");
  });

  it("ignores rows with a missing or non-numeric quantity", async () => {
    fetchMock.mockResolvedValue(
      json({
        records: [
          { id: "a", fields: { Quantity: 2 } },
          { id: "b", fields: {} },
          { id: "c", fields: { Quantity: "lots" } },
        ],
      })
    );
    expect(await sumSoldTicketQuantity("event-1", "ga")).toBe(2);
  });

  it("throws rather than under-counting when Airtable errors", async () => {
    // Capacity checks must fail closed; returning 0 would oversell.
    fetchMock.mockResolvedValue(json({ error: "SERVER_ERROR" }, 500));
    await expect(sumSoldTicketQuantity("event-1", "ga")).rejects.toThrow(/Airtable list error: 500/);
  });
});

describe("hasUsedMemberPricing", () => {
  it("looks for any member-priced row for this person at this event", async () => {
    fetchMock.mockResolvedValue(json({ records: [{ id: "a", fields: {} }] }));
    expect(await hasUsedMemberPricing("event-1", " ABC123@psu.edu ")).toBe(true);
    expect(formulaOfCall()).toBe(
      "AND({Event ID} = 'event-1', LOWER(TRIM({PSU Email})) = 'abc123@psu.edu', {Is Member} = TRUE())"
    );
  });

  it("is false when there are no such rows", async () => {
    fetchMock.mockResolvedValue(json({ records: [] }));
    expect(await hasUsedMemberPricing("event-1", "abc123@psu.edu")).toBe(false);
  });

  it("doesn't call Airtable for a blank email", async () => {
    expect(await hasUsedMemberPricing("event-1", "  ")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("appendTicketToAirtable", () => {
  it("upserts a card order on its PaymentIntent id and reports a fresh insert", async () => {
    fetchMock.mockResolvedValue(json({ createdRecords: ["rec1"], records: [] }));
    expect(await appendTicketToAirtable(order, "pi_123")).toEqual({ inserted: true });

    const init = fetchMock.mock.calls[0][1];
    expect(init?.method).toBe("PATCH");
    const body = bodyOfCall() as {
      performUpsert: unknown;
      records: Array<{ fields: Record<string, unknown> }>;
    };
    expect(body.performUpsert).toEqual({ fieldsToMergeOn: ["Stripe Payment Intent ID"] });
    expect(body.records[0].fields).toMatchObject({
      "Stripe Payment Intent ID": "pi_123",
      "Amount Paid": 25.73,
      "Is Member": true,
      "Member Year": "Junior",
      Quantity: 2,
      Paid: true,
      "Checked In Count": 0,
    });
  });

  it("reports no insert when the upsert merged into an existing row", async () => {
    // The webhook and the /return page both write every card order; only
    // whichever call actually inserts is allowed to send the email.
    fetchMock.mockResolvedValue(json({ createdRecords: [], updatedRecords: ["rec1"] }));
    expect(await appendTicketToAirtable(order, "pi_123")).toEqual({ inserted: false });
  });

  it("plainly inserts an order with no PaymentIntent (cash, free, board +1)", async () => {
    fetchMock.mockResolvedValue(json({ id: "rec1", fields: {} }));
    expect(
      await appendTicketToAirtable(
        { ...order, paymentMethod: "Cash", paid: false, memberYear: null },
        null
      )
    ).toEqual({ inserted: true });

    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    const body = bodyOfCall() as { fields: Record<string, unknown> };
    expect(body.fields).toMatchObject({
      "Payment Method": "Cash",
      Paid: false,
      "Stripe Payment Intent ID": "",
      "Member Year": "",
    });
  });

  it("throws when Airtable rejects the write", async () => {
    fetchMock.mockResolvedValue(json({ error: "INVALID_VALUE" }, 422));
    await expect(appendTicketToAirtable(order, "pi_123")).rejects.toThrow(/Airtable error: 422/);
  });
});

describe("listTicketsForEvent", () => {
  it("maps Airtable rows to ticket records, converting dollars to cents", async () => {
    fetchMock.mockResolvedValue(
      json({
        records: [
          {
            id: "rec1",
            fields: {
              "First Name": "Asha",
              "Last Name": "Patel",
              "Amount Paid": 12.34,
              Quantity: 2,
              "Payment Method": "Cash",
              Paid: false,
              "Checked In Count": 1,
              "Board Member": "Ravi Shah",
            },
          },
        ],
      })
    );
    const [t] = await listTicketsForEvent("event-1");
    expect(t).toMatchObject({
      id: "rec1",
      firstName: "Asha",
      amountPaidCents: 1234,
      quantity: 2,
      paymentMethod: "Cash",
      paid: false,
      checkedInCount: 1,
      checkedInAt: null,
      memberYear: null,
      boardMemberName: "Ravi Shah",
    });
  });

  it("fills sensible defaults for a sparse row", async () => {
    fetchMock.mockResolvedValue(json({ records: [{ id: "rec2", fields: {} }] }));
    const [t] = await listTicketsForEvent("event-1");
    expect(t).toMatchObject({
      firstName: "",
      paymentMethod: "Card",
      quantity: 0,
      amountPaidCents: 0,
      checkedInCount: 0,
      boardMemberName: null,
    });
  });
});

describe("updateTicketCheckinState", () => {
  it("stamps Checked In At when checking someone in", async () => {
    fetchMock.mockResolvedValue(json({}));
    await updateTicketCheckinState("rec1", { checkedInCount: 1 });
    const { fields } = bodyOfCall() as { fields: Record<string, unknown> };
    expect(fields["Checked In Count"]).toBe(1);
    expect(typeof fields["Checked In At"]).toBe("string");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/rec1$/);
  });

  it("clears Checked In At when a check-in is fully undone", async () => {
    fetchMock.mockResolvedValue(json({}));
    await updateTicketCheckinState("rec1", { checkedInCount: 0 });
    const { fields } = bodyOfCall() as { fields: Record<string, unknown> };
    expect(fields).toEqual({ "Checked In Count": 0, "Checked In At": null });
  });

  it("writes paid and count together in one request", async () => {
    fetchMock.mockResolvedValue(json({}));
    await updateTicketCheckinState("rec1", { checkedInCount: 2, paid: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { fields } = bodyOfCall() as { fields: Record<string, unknown> };
    expect(fields).toMatchObject({ "Checked In Count": 2, Paid: true });
  });

  it("throws when Airtable rejects the update", async () => {
    fetchMock.mockResolvedValue(json({ error: "NOT_FOUND" }, 404));
    await expect(updateTicketCheckinState("rec1", { paid: true })).rejects.toThrow(
      /Airtable update error: 404/
    );
  });
});

describe("appendMemberToAirtable", () => {
  const metadata = {
    firstName: "Asha",
    lastName: "Patel",
    psuEmail: "abc123@psu.edu",
    phone: "+18145551234",
    year: "Junior",
    membershipTier: "Regular",
    amountPaidCents: "3635",
  };

  it("upserts the member on their PaymentIntent id, so the webhook and return page can't double-add", async () => {
    fetchMock.mockResolvedValue(json({ records: [] }));
    await appendMemberToAirtable(metadata, "pi_123");

    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
    const body = bodyOfCall() as {
      performUpsert: unknown;
      records: Array<{ fields: Record<string, unknown> }>;
    };
    expect(body.performUpsert).toEqual({ fieldsToMergeOn: ["Stripe Payment Intent ID"] });
    expect(body.records[0].fields).toMatchObject({
      "First Name": "Asha",
      "PSU Email": "abc123@psu.edu",
      Year: "Junior",
      "Membership Type": "Regular",
      "Amount Paid": 36.35,
      "Stripe Payment Intent ID": "pi_123",
    });
  });

  it("leaves Amount Paid empty rather than writing NaN", async () => {
    fetchMock.mockResolvedValue(json({ records: [] }));
    await appendMemberToAirtable({ ...metadata, amountPaidCents: "n/a" }, "pi_123");
    const body = bodyOfCall() as { records: Array<{ fields: Record<string, unknown> }> };
    expect(body.records[0].fields["Amount Paid"]).toBeNull();
  });

  it("throws when Airtable rejects the write, so the webhook returns 500 and Stripe retries", async () => {
    fetchMock.mockResolvedValue(json({ error: "INVALID_VALUE" }, 422));
    await expect(appendMemberToAirtable(metadata, "pi_123")).rejects.toThrow(/Airtable error: 422/);
  });
});

describe("getTicketRecordInfo", () => {
  it("returns the record's event and quantity", async () => {
    fetchMock.mockResolvedValue(json({ id: "rec1", fields: { "Event ID": "event-1", Quantity: 3 } }));
    expect(await getTicketRecordInfo("rec1")).toEqual({ eventId: "event-1", quantity: 3 });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/Tickets\/rec1$/);
  });

  it("returns null for a record Airtable can't find", async () => {
    fetchMock.mockResolvedValue(json({ error: "NOT_FOUND" }, 404));
    expect(await getTicketRecordInfo("recMissing")).toBeNull();
  });

  it("returns null for a record with no event, so it can't pass the ownership check", async () => {
    fetchMock.mockResolvedValue(json({ id: "rec1", fields: { Quantity: 1 } }));
    expect(await getTicketRecordInfo("rec1")).toBeNull();
  });

  it("treats an unreadable quantity as zero, so no check-in count is valid", async () => {
    fetchMock.mockResolvedValue(json({ id: "rec1", fields: { "Event ID": "event-1" } }));
    expect(await getTicketRecordInfo("rec1")).toEqual({ eventId: "event-1", quantity: 0 });
  });
});
