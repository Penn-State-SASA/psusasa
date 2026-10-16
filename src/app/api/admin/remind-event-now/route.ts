import { NextRequest, NextResponse } from "next/server";
import { sanityFetchSingle } from "../../../../../sanity/lib/client";
import { listTicketsForEvent, markReminderSent } from "@/lib/airtable";
import { sendTicketReminderEmail } from "@/lib/ticketEmail";

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/New_York";

interface EventDoc {
  _id: string;
  title: string;
  date: string;
  location?: string;
  hideLocation?: boolean;
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

function isSameDayInTz(a: Date, b: Date, timeZone: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(a) === fmt.format(b);
}

// One-time manual trigger: sends the reminder email right now for a single
// event, found by (partial, case-insensitive) title match — independent of
// the Sanity "Send Reminder Email" toggle and the daily cron, for when an
// event is happening soon and the normal schedule can't be trusted to catch
// it in time. Dry run by default; pass &confirm=true to actually send.
// Reuses the same "Reminder Sent" Airtable flag as the real cron job, so
// this and the cron never double-email the same person. Delete this route
// once it's been used.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.CHECKIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const title = req.nextUrl.searchParams.get("title");
  if (!title) {
    return NextResponse.json(
      { error: "Pass ?title=<event title or part of it>" },
      { status: 400 }
    );
  }
  const confirm = req.nextUrl.searchParams.get("confirm") === "true";

  const event = await sanityFetchSingle<EventDoc>(
    `*[_type == "event" && title match $title][0]{ _id, title, date, location, hideLocation }`,
    { title: `*${title}*` }
  );
  if (!event) {
    return NextResponse.json(
      { error: `No event found matching "${title}"` },
      { status: 404 }
    );
  }

  const tickets = await listTicketsForEvent(event._id);
  const eventDateTime = formatEventDateTime(event.date);
  const eventLocation = event.location && !event.hideLocation ? event.location : null;
  const isToday = isSameDayInTz(new Date(event.date), new Date(), TIME_ZONE);

  const recipients = tickets.filter((t) => !t.reminderSent && t.contactEmail);
  const skipped = tickets.length - recipients.length;

  if (!confirm) {
    return NextResponse.json({
      dryRun: true,
      event: { id: event._id, title: event.title, eventDateTime, eventLocation, isToday },
      wouldEmail: recipients.map((t) => ({
        name: `${t.firstName} ${t.lastName}`.trim(),
        email: t.contactEmail,
      })),
      alreadyRemindedOrNoEmail: skipped,
      note: "Add &confirm=true to actually send these emails.",
    });
  }

  let sent = 0;
  let failed = 0;
  for (const t of recipients) {
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
      failed++;
    }
  }

  return NextResponse.json({
    dryRun: false,
    event: { id: event._id, title: event.title },
    sent,
    failed,
    alreadyRemindedOrNoEmail: skipped,
  });
}
