import { NextRequest, NextResponse } from "next/server";
import { sanityFetch } from "../../../../../sanity/lib/client";
import { reminderEnabledEventsQuery } from "../../../../../sanity/lib/queries";
import { listTicketsForEvent, markReminderSent } from "@/lib/airtable";
import { sendTicketReminderEmail } from "@/lib/ticketEmail";

// Vercel Cron hits this on a schedule (see vercel.json) with
// Authorization: Bearer <CRON_SECRET> — the standard way Vercel secures a
// cron-triggered route so it can't be invoked by anyone who finds the URL.
//
// On the Hobby plan, Vercel Cron only runs once a day (and not at an exact
// minute), so eligibility is a time *range* — "has the reminder window
// opened, and has the event not happened yet" — rather than an exact-moment
// check. That's what makes a once-daily check safe: whichever day's run
// first lands inside the window sends it, and the "already sent" flag
// (per ticket row, in Airtable) stops every later run from re-sending.
export const dynamic = "force-dynamic";

const TIME_ZONE = "America/New_York";

interface ReminderEvent {
  _id: string;
  title: string;
  date: string;
  location?: string;
  hideLocation?: boolean;
  reminderHoursBefore: number;
}

function isSameDayInTz(a: Date, b: Date, timeZone: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(a) === fmt.format(b);
}

function formatEventDateTime(dateIso: string): string {
  const d = new Date(dateIso);
  const date = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: TIME_ZONE,
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
  return `${date} at ${time}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await sanityFetch<ReminderEvent>(reminderEnabledEventsQuery);
  const now = Date.now();

  const eventResults: Array<{
    eventId: string;
    eventTitle: string;
    eligible: boolean;
    sent: number;
    alreadySent: number;
    skippedNoEmail: number;
    emailFailed: number;
  }> = [];

  for (const event of events) {
    const eventTime = new Date(event.date).getTime();
    const reminderOpensAt = eventTime - event.reminderHoursBefore * 60 * 60 * 1000;
    const eligible = now >= reminderOpensAt && now < eventTime;

    if (!eligible) {
      eventResults.push({
        eventId: event._id,
        eventTitle: event.title,
        eligible: false,
        sent: 0,
        alreadySent: 0,
        skippedNoEmail: 0,
        emailFailed: 0,
      });
      continue;
    }

    const tickets = await listTicketsForEvent(event._id);
    const eventDateTime = formatEventDateTime(event.date);
    const eventLocation =
      event.location && !event.hideLocation ? event.location : null;
    const isToday = isSameDayInTz(new Date(event.date), new Date(now), TIME_ZONE);

    let sent = 0;
    let alreadySent = 0;
    let skippedNoEmail = 0;
    let emailFailed = 0;

    for (const t of tickets) {
      if (t.reminderSent) {
        alreadySent++;
        continue;
      }
      if (!t.contactEmail) {
        skippedNoEmail++;
        continue;
      }

      const emailed = await sendTicketReminderEmail({
        contactEmail: t.contactEmail,
        firstName: t.firstName,
        eventName: event.title,
        eventDateTime,
        eventLocation,
        isToday,
        recordId: t.id,
        eventId: event._id,
      });

      if (emailed) {
        await markReminderSent(t.id);
        sent++;
      } else {
        emailFailed++;
      }
    }

    eventResults.push({
      eventId: event._id,
      eventTitle: event.title,
      eligible: true,
      sent,
      alreadySent,
      skippedNoEmail,
      emailFailed,
    });
  }

  return NextResponse.json({ checked: events.length, events: eventResults });
}
