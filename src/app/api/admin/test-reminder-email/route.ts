import { NextRequest, NextResponse } from "next/server";
import { sendTicketReminderEmail } from "@/lib/ticketEmail";

// One-time preview tool: sends every variant of the reminder email (with vs.
// without a location, and sent-in-advance vs. sent-same-day) to the exec
// inbox, so you can see exactly what buyers will get before relying on the
// real cron job. Touches no real event/ticket data. Delete this route once
// you've seen it.
const PREVIEW_TO = "exec.psusasa@gmail.com";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.CHECKIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const sentWithLocation = await sendTicketReminderEmail({
    contactEmail: PREVIEW_TO,
    firstName: "Test",
    eventName: "Diwali Night",
    eventDateTime: "Saturday, October 18 at 7:00 PM",
    eventLocation: "HUB Flex Theatre",
    isToday: false,
  });

  const sentWithoutLocation = await sendTicketReminderEmail({
    contactEmail: PREVIEW_TO,
    firstName: "Test",
    eventName: "Diwali Night",
    eventDateTime: "Saturday, October 18 at 7:00 PM",
    eventLocation: null,
    isToday: false,
  });

  const sentSameDay = await sendTicketReminderEmail({
    contactEmail: PREVIEW_TO,
    firstName: "Test",
    eventName: "Diwali Night",
    eventDateTime: "Saturday, October 18 at 7:00 PM",
    eventLocation: "HUB Flex Theatre",
    isToday: true,
  });

  return NextResponse.json({
    to: PREVIEW_TO,
    sentWithLocation,
    sentWithoutLocation,
    sentSameDay,
  });
}
