import { NextRequest, NextResponse } from "next/server";
import { sanityFetchSingle } from "../../../../../../sanity/lib/client";
import { eventByIdQuery } from "../../../../../../sanity/lib/queries";
import type { SanityEvent } from "@/lib/types";
import {
  appendAtDoorSale,
  deleteLatestAtDoorSale,
  sumCapacityUsed,
} from "@/lib/airtable";

// Records one walk-up sale from the check-in board: a nameless row that's
// already paid and checked in, at the event's At-Door Price ($0 if unset).
// Refused once the event is at capacity — the board disables its button
// too, but that's only a UI hint from a possibly stale poll.
export async function POST(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = await sanityFetchSingle<SanityEvent>(eventByIdQuery, {
      id: params.eventId,
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    if (!event.ticketingEnabled) {
      return NextResponse.json(
        { error: "Check-in is not enabled for this event." },
        { status: 400 }
      );
    }

    if (typeof event.capacity === "number") {
      const used = await sumCapacityUsed(event._id);
      if (used >= event.capacity) {
        return NextResponse.json(
          { error: "Event is at capacity." },
          { status: 400 }
        );
      }
    }

    await appendAtDoorSale({
      eventId: event._id,
      eventName: event.title.slice(0, 500),
      amountCents: event.atDoorPriceCents ?? 0,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("At-door sale error:", err);
    return NextResponse.json({ error: "Failed to add sale." }, { status: 500 });
  }
}

// Undoes a mis-tapped sale by deleting the event's most recent one.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const deleted = await deleteLatestAtDoorSale(params.eventId);
    if (!deleted) {
      return NextResponse.json(
        { error: "No at-door sales to undo." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("At-door sale undo error:", err);
    return NextResponse.json({ error: "Failed to undo sale." }, { status: 500 });
  }
}
