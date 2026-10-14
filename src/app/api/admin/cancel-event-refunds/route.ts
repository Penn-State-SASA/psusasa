import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sanityFetchSingle } from "../../../../../sanity/lib/client";
import { eventByIdQuery } from "../../../../../sanity/lib/queries";
import type { SanityEvent } from "@/lib/types";
import { listTicketsForEvent, type TicketRecord } from "@/lib/airtable";
import { sendTicketCancellationEmail } from "@/lib/ticketEmail";

// One-time event-cancellation tool: refunds every real Stripe charge for
// this event in full and emails every buyer that it's cancelled. Gated
// behind CHECKIN_SESSION_SECRET (the existing check-in secret, reused
// rather than adding a new env var). Delete this route once it's been run.
//
// Default (no ?confirm=true) is a dry run — classifies every order and
// returns what *would* happen, without calling Stripe or sending anything.
// Only ?confirm=true actually issues refunds and sends email. Re-running
// with ?confirm=true is not harmful to already-refunded rows (Stripe
// rejects a second refund on the same PaymentIntent and that row is just
// reported as failed), but it WILL re-send cancellation emails to anyone
// already notified — review the dry run before confirming, and only
// confirm once.
const EVENT_ID = "d8828d63-d978-48c6-8d8f-d563a54523aa"; // Wednesday Social

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface RowOutcome {
  id: string;
  name: string;
  email: string;
  amountPaidCents: number;
  action: "refund" | "notify-only" | "manual-refund-needed" | "skip-no-email";
}

function classify(t: TicketRecord): RowOutcome["action"] {
  if (!t.contactEmail) return "skip-no-email";
  if (t.amountPaidCents <= 0) return "notify-only";
  if (t.paymentMethod === "Card" && t.stripePaymentIntentId) return "refund";
  // Paid something, but not through a real Stripe PaymentIntent (e.g. cash
  // collected in person) — can't be auto-refunded, needs a human to handle.
  return "manual-refund-needed";
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.CHECKIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const confirm = req.nextUrl.searchParams.get("confirm") === "true";

  const event = await sanityFetchSingle<SanityEvent>(eventByIdQuery, {
    id: EVENT_ID,
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const tickets = await listTicketsForEvent(EVENT_ID);

  const rows: Array<{ t: TicketRecord; action: RowOutcome["action"] }> =
    tickets.map((t) => ({ t, action: classify(t) }));

  if (!confirm) {
    const results: RowOutcome[] = rows.map(({ t, action }) => ({
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      email: t.contactEmail,
      amountPaidCents: t.amountPaidCents,
      action,
    }));
    return NextResponse.json({
      mode: "preview",
      eventName: event.title,
      scanned: tickets.length,
      toRefund: results.filter((r) => r.action === "refund").length,
      toNotifyOnly: results.filter((r) => r.action === "notify-only").length,
      needsManualRefund: results.filter(
        (r) => r.action === "manual-refund-needed"
      ).length,
      skippedNoEmail: results.filter((r) => r.action === "skip-no-email")
        .length,
      results,
    });
  }

  let refunded = 0;
  let refundFailed = 0;
  let notified = 0;
  let emailFailed = 0;
  const manualRefundNeeded: RowOutcome[] = [];
  const details: Array<RowOutcome & { refunded?: boolean; emailed?: boolean; error?: string }> = [];

  for (const { t, action } of rows) {
    const base = {
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      email: t.contactEmail,
      amountPaidCents: t.amountPaidCents,
      action,
    };

    if (action === "skip-no-email") {
      details.push(base);
      continue;
    }

    if (action === "manual-refund-needed") {
      manualRefundNeeded.push(base);
      details.push(base);
      continue;
    }

    if (action === "refund") {
      try {
        await stripe.refunds.create({
          payment_intent: t.stripePaymentIntentId!,
        });
        refunded++;
        const emailed = await sendTicketCancellationEmail({
          contactEmail: t.contactEmail,
          firstName: t.firstName,
          eventName: event.title,
          refundedCents: t.amountPaidCents,
        });
        if (emailed) notified++;
        else emailFailed++;
        details.push({ ...base, refunded: true, emailed });
      } catch (err) {
        refundFailed++;
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Refund failed for ${t.id} (${t.contactEmail}):`, err);
        details.push({ ...base, refunded: false, error: message });
      }
      continue;
    }

    // notify-only
    const emailed = await sendTicketCancellationEmail({
      contactEmail: t.contactEmail,
      firstName: t.firstName,
      eventName: event.title,
      refundedCents: 0,
    });
    if (emailed) notified++;
    else emailFailed++;
    details.push({ ...base, emailed });
  }

  return NextResponse.json({
    mode: "executed",
    eventName: event.title,
    scanned: tickets.length,
    refunded,
    refundFailed,
    notified,
    emailFailed,
    needsManualRefund: manualRefundNeeded.length,
    manualRefundNeeded,
    details,
  });
}
