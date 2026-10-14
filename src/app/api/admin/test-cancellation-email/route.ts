import { NextRequest, NextResponse } from "next/server";
import { sendTicketCancellationEmail } from "@/lib/ticketEmail";

// One-time preview tool: sends both variants of the cancellation email
// (refunded / not refunded) to the exec inbox, so you can see exactly what
// buyers will get before running the real cancel-event-refunds tool. Touches
// no real ticket data and no Stripe data. Delete this route once you've seen it.
const PREVIEW_TO = "exec.psusasa@gmail.com";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.CHECKIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const sentRefunded = await sendTicketCancellationEmail({
    contactEmail: PREVIEW_TO,
    firstName: "Test",
    eventName: "Wednesday Social",
    refundedCents: 1500,
  });

  const sentNotRefunded = await sendTicketCancellationEmail({
    contactEmail: PREVIEW_TO,
    firstName: "Test",
    eventName: "Wednesday Social",
    refundedCents: 0,
  });

  return NextResponse.json({ to: PREVIEW_TO, sentRefunded, sentNotRefunded });
}
