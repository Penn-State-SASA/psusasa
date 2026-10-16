import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";
import { sanityFetch } from "../../../../../sanity/lib/client";
import { listTicketsForEvent, markReminderSent } from "@/lib/airtable";
import { sendTicketReminderEmail } from "@/lib/ticketEmail";
import { getRequest } from "@/test/request";
import { makeTicketRecord } from "@/test/factories";
import { muteConsole } from "@/test/console";

vi.mock("../../../../../sanity/lib/client", () => ({ sanityFetch: vi.fn() }));
vi.mock("@/lib/airtable", () => ({
  listTicketsForEvent: vi.fn(),
  markReminderSent: vi.fn(),
}));
vi.mock("@/lib/ticketEmail", () => ({ sendTicketReminderEmail: vi.fn() }));

const HOUR = 60 * 60 * 1000;

function cronRequest(headers: Record<string, string> = { authorization: "Bearer cron-secret-for-unit-tests-only" }) {
  return getRequest("/api/cron/send-event-reminders", { headers });
}

function reminderEvent(overrides: Record<string, unknown> = {}) {
  return {
    _id: "event-1",
    title: "Diwali Night",
    date: new Date(Date.now() + 20 * HOUR).toISOString(),
    location: "HUB Flex Theatre",
    hideLocation: false,
    reminderHoursBefore: 24,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listTicketsForEvent).mockResolvedValue([]);
  vi.mocked(sendTicketReminderEmail).mockResolvedValue(true);
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/cron/send-event-reminders", () => {
  it("rejects a request without the cron secret", async () => {
    vi.mocked(sanityFetch).mockResolvedValue([]);
    const res = await GET(cronRequest({}));
    expect(res.status).toBe(401);
    expect(sanityFetch).not.toHaveBeenCalled();
  });

  it("rejects the wrong secret", async () => {
    const res = await GET(cronRequest({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("reports an event outside its reminder window as ineligible, untouched", async () => {
    // 20 hours away, but the window only opens 24h before — not yet.
    vi.mocked(sanityFetch).mockResolvedValue([reminderEvent({ reminderHoursBefore: 1 })]);
    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.events[0]).toMatchObject({ eligible: false, sent: 0 });
    expect(listTicketsForEvent).not.toHaveBeenCalled();
  });

  it("treats an event that already started as outside the window", async () => {
    vi.mocked(sanityFetch).mockResolvedValue([
      reminderEvent({ date: new Date(Date.now() - HOUR).toISOString() }),
    ]);
    const res = await GET(cronRequest());
    const body = await res.json();
    expect(body.events[0].eligible).toBe(false);
  });

  it("emails everyone with a ticket and marks each one sent", async () => {
    vi.mocked(sanityFetch).mockResolvedValue([reminderEvent()]);
    vi.mocked(listTicketsForEvent).mockResolvedValue([
      makeTicketRecord({ id: "rec1", contactEmail: "a@example.com" }),
      makeTicketRecord({ id: "rec2", contactEmail: "b@example.com" }),
    ]);

    const res = await GET(cronRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.events[0]).toMatchObject({ eligible: true, sent: 2, emailFailed: 0 });
    expect(sendTicketReminderEmail).toHaveBeenCalledTimes(2);
    expect(markReminderSent).toHaveBeenCalledWith("rec1");
    expect(markReminderSent).toHaveBeenCalledWith("rec2");

    const call = vi.mocked(sendTicketReminderEmail).mock.calls[0][0];
    expect(call).toMatchObject({
      contactEmail: "a@example.com",
      eventName: "Diwali Night",
      eventLocation: "HUB Flex Theatre",
      recordId: "rec1",
      eventId: "event-1",
    });
    expect(call.eventDateTime).toEqual(expect.any(String));
  });

  it("omits the location when the event hides it", async () => {
    vi.mocked(sanityFetch).mockResolvedValue([reminderEvent({ hideLocation: true })]);
    vi.mocked(listTicketsForEvent).mockResolvedValue([makeTicketRecord()]);

    await GET(cronRequest());

    expect(vi.mocked(sendTicketReminderEmail).mock.calls[0][0]).toMatchObject({
      eventLocation: null,
    });
  });

  it("skips a ticket that was already reminded, without emailing again", async () => {
    vi.mocked(sanityFetch).mockResolvedValue([reminderEvent()]);
    vi.mocked(listTicketsForEvent).mockResolvedValue([
      makeTicketRecord({ id: "rec1", reminderSent: true }),
    ]);

    const res = await GET(cronRequest());
    const body = await res.json();

    expect(body.events[0]).toMatchObject({ sent: 0, alreadySent: 1 });
    expect(sendTicketReminderEmail).not.toHaveBeenCalled();
    expect(markReminderSent).not.toHaveBeenCalled();
  });

  it("skips a ticket with no email on file", async () => {
    vi.mocked(sanityFetch).mockResolvedValue([reminderEvent()]);
    vi.mocked(listTicketsForEvent).mockResolvedValue([
      makeTicketRecord({ id: "rec1", contactEmail: "" }),
    ]);

    const res = await GET(cronRequest());
    const body = await res.json();

    expect(body.events[0]).toMatchObject({ sent: 0, skippedNoEmail: 1 });
    expect(sendTicketReminderEmail).not.toHaveBeenCalled();
  });

  it("doesn't mark a row sent when the email send fails", async () => {
    vi.mocked(sanityFetch).mockResolvedValue([reminderEvent()]);
    vi.mocked(listTicketsForEvent).mockResolvedValue([makeTicketRecord({ id: "rec1" })]);
    vi.mocked(sendTicketReminderEmail).mockResolvedValue(false);

    const res = await GET(cronRequest());
    const body = await res.json();

    expect(body.events[0]).toMatchObject({ sent: 0, emailFailed: 1 });
    expect(markReminderSent).not.toHaveBeenCalled();
  });

  describe("isToday", () => {
    beforeEach(() => {
      // 11am Eastern, June 15 — fixed so "same calendar day" comparisons
      // (which are timezone-sensitive) aren't at the mercy of when CI runs.
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T15:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("is true when the event is later the same Eastern calendar day", async () => {
      vi.mocked(sanityFetch).mockResolvedValue([
        reminderEvent({ date: "2026-06-15T23:00:00.000Z", reminderHoursBefore: 24 }),
      ]);
      vi.mocked(listTicketsForEvent).mockResolvedValue([makeTicketRecord({ id: "rec1" })]);

      await GET(cronRequest());

      expect(vi.mocked(sendTicketReminderEmail).mock.calls[0][0]).toMatchObject({
        isToday: true,
      });
    });

    it("is false when the event is on a later Eastern calendar day", async () => {
      vi.mocked(sanityFetch).mockResolvedValue([
        reminderEvent({ date: "2026-06-16T15:00:00.000Z", reminderHoursBefore: 24 }),
      ]);
      vi.mocked(listTicketsForEvent).mockResolvedValue([makeTicketRecord({ id: "rec1" })]);

      await GET(cronRequest());

      expect(vi.mocked(sendTicketReminderEmail).mock.calls[0][0]).toMatchObject({
        isToday: false,
      });
    });
  });

  it("checks multiple reminder-enabled events independently", async () => {
    vi.mocked(sanityFetch).mockResolvedValue([
      reminderEvent({ _id: "event-1", title: "Diwali Night" }),
      reminderEvent({ _id: "event-2", title: "Holi Bash", reminderHoursBefore: 1 }),
    ]);
    vi.mocked(listTicketsForEvent).mockImplementation(async (eventId: string) =>
      eventId === "event-1" ? [makeTicketRecord({ id: "rec1" })] : []
    );

    const res = await GET(cronRequest());
    const body = await res.json();

    expect(body.checked).toBe(2);
    expect(body.events.find((e: { eventId: string }) => e.eventId === "event-1")).toMatchObject({
      eligible: true,
      sent: 1,
    });
    expect(body.events.find((e: { eventId: string }) => e.eventId === "event-2")).toMatchObject({
      eligible: false,
    });
  });
});
