import { NextRequest, NextResponse } from "next/server";
import { sanityFetchSingle } from "../../../../../../sanity/lib/client";
import { eventByIdQuery } from "../../../../../../sanity/lib/queries";
import type { SanityEvent } from "@/lib/types";
import {
  appendAtDoorSales,
  deleteLatestAtDoorSales,
  sumCapacityUsed,
} from "@/lib/airtable";
import { AT_DOOR_BATCH_MAX } from "@/lib/atDoor";

// How many sales the request adds or undoes: `{ count }` in the body, 1 when
// there's no body. The board batches quick taps into one request. Returns
// null when the count isn't a whole number from 1 to AT_DOOR_BATCH_MAX.
async function readCount(req: NextRequest): Promise<number | null> {
  const text = await req.text();
  if (!text.trim()) return 1;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  const count = (body as { count?: unknown } | null)?.count ?? 1;
  if (typeof count !== "number" || !Number.isInteger(count)) return null;
  return count >= 1 && count <= AT_DOOR_BATCH_MAX ? count : null;
}

function invalidCount() {
  return NextResponse.json(
    { error: `Count must be a whole number from 1 to ${AT_DOOR_BATCH_MAX}.` },
    { status: 400 }
  );
}

// Records walk-up sales from the check-in board: nameless rows that are
// already paid and checked in, at the event's At-Door Price ($0 if unset).
// Refused as a whole if it would go over capacity — the board disables its
// button too, but that's only a UI hint from a possibly stale poll.
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const count = await readCount(req);
    if (count === null) return invalidCount();

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
      if (used + count > event.capacity) {
        return NextResponse.json(
          { error: "Event is at capacity." },
          { status: 400 }
        );
      }
    }

    await appendAtDoorSales(
      {
        eventId: event._id,
        eventName: event.title.slice(0, 500),
        amountCents: event.atDoorPriceCents ?? 0,
      },
      count
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("At-door sale error:", err);
    return NextResponse.json({ error: "Failed to add sale." }, { status: 500 });
  }
}

// Undoes mis-tapped sales by deleting the event's most recent ones.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const count = await readCount(req);
    if (count === null) return invalidCount();

    const deleted = await deleteLatestAtDoorSales(params.eventId, count);
    if (deleted === 0) {
      return NextResponse.json(
        { error: "No at-door sales to undo." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error("At-door sale undo error:", err);
    return NextResponse.json({ error: "Failed to undo sale." }, { status: 500 });
  }
}
