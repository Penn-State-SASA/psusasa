import { NextRequest, NextResponse } from "next/server";
import { resolveTicketOrder, TicketOrderError } from "@/lib/ticketing";
import { appendTicketToAirtable } from "@/lib/airtable";
import {
  sendCashOrderConfirmationEmail,
  sendTicketConfirmationEmail,
} from "@/lib/ticketEmail";
import { ticketQrDataUrlOrNull } from "@/lib/ticketQr";
import { EMAIL_RE, isPsuEmail, PSU_CONTACT_EMAIL_ERROR } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      ticketTypeKey,
      quantity,
      firstName,
      lastName,
      contactEmail,
      psuEmail,
    } = body;

    const trimmedFirst = String(firstName ?? "").trim();
    const trimmedLast = String(lastName ?? "").trim();
    const trimmedEmail = String(contactEmail ?? "").trim();

    if (!trimmedFirst || !trimmedLast) {
      return NextResponse.json(
        { error: "Please enter your first and last name." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid contact email." },
        { status: 400 }
      );
    }
    if (isPsuEmail(trimmedEmail)) {
      return NextResponse.json(
        { error: PSU_CONTACT_EMAIL_ERROR },
        { status: 400 }
      );
    }

    let order;
    try {
      order = await resolveTicketOrder({
        eventId,
        ticketTypeKey,
        quantity,
        psuEmail,
      });
    } catch (err) {
      if (err instanceof TicketOrderError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    if (order.event.cashPaymentEnabled === false) {
      return NextResponse.json(
        { error: "Cash payment is not available for this event." },
        { status: 400 }
      );
    }

    // A $0 order has nothing to collect at the door — "pay cash at the
    // door" doesn't apply, so treat it the same as the free path on the
    // card route: settled immediately, with the regular confirmation email
    // (a real cash order gets the "bring cash" version below instead).
    if (order.subtotalCents === 0) {
      const { recordId } = await appendTicketToAirtable(
        {
          firstName: trimmedFirst.slice(0, 500),
          lastName: trimmedLast.slice(0, 500),
          contactEmail: trimmedEmail.slice(0, 500),
          psuEmail: String(psuEmail ?? "").trim().slice(0, 500),
          isMember: order.isMember,
          memberYear: order.memberYear,
          eventId: order.event._id,
          eventName: order.event.title.slice(0, 500),
          ticketTypeKey: order.ticketType._key,
          ticketTypeName: order.ticketType.name.slice(0, 500),
          quantity: order.quantity,
          amountPaidCents: 0,
          paymentMethod: "Card",
          paid: true,
          boardMemberName: null,
        },
        null
      );

      await sendTicketConfirmationEmail({
        contactEmail: trimmedEmail,
        firstName: trimmedFirst,
        eventName: order.event.title,
        ticketTypeName: order.ticketType.name,
        quantity: order.quantity,
        amountPaidCents: 0,
        recordId,
        eventId: order.event._id,
      });

      return NextResponse.json({
        free: true,
        ticketQr: await ticketQrDataUrlOrNull(recordId, order.event._id),
        memberUnits: order.memberUnits,
        nonMemberUnits: order.nonMemberUnits,
      });
    }

    // No Stripe involved and no card fee — cash buyers pay exactly the
    // member/non-member ticket price. Writes straight to Airtable since
    // there's no PaymentIntent/webhook to hand off to.
    const { recordId } = await appendTicketToAirtable(
      {
        firstName: trimmedFirst.slice(0, 500),
        lastName: trimmedLast.slice(0, 500),
        contactEmail: trimmedEmail.slice(0, 500),
        psuEmail: String(psuEmail ?? "").trim().slice(0, 500),
        isMember: order.isMember,
        memberYear: order.memberYear,
        eventId: order.event._id,
        eventName: order.event.title.slice(0, 500),
        ticketTypeKey: order.ticketType._key,
        ticketTypeName: order.ticketType.name.slice(0, 500),
        quantity: order.quantity,
        amountPaidCents: order.subtotalCents,
        paymentMethod: "Cash",
        paid: false,
        boardMemberName: null,
      },
      null
    );

    // Best-effort, like every ticket email: the order is already recorded,
    // so a failed send is logged, never a failed checkout.
    await sendCashOrderConfirmationEmail({
      contactEmail: trimmedEmail,
      firstName: trimmedFirst,
      eventName: order.event.title,
      ticketTypeName: order.ticketType.name,
      quantity: order.quantity,
      amountDueCents: order.subtotalCents,
      recordId,
      eventId: order.event._id,
    });

    return NextResponse.json({
      ticketQr: await ticketQrDataUrlOrNull(recordId, order.event._id),
      eventName: order.event.title,
      ticketTypeName: order.ticketType.name,
      quantity: order.quantity,
      memberUnits: order.memberUnits,
      nonMemberUnits: order.nonMemberUnits,
      amountDueCents: order.subtotalCents,
    });
  } catch (err) {
    console.error("Cash ticket order error:", err);
    return NextResponse.json(
      { error: "Failed to record your order" },
      { status: 500 }
    );
  }
}
