import { NextRequest, NextResponse } from "next/server";
import { sanityFetchSingle } from "../../../../../../sanity/lib/client";
import { eventByIdQuery } from "../../../../../../sanity/lib/queries";
import type { SanityEvent } from "@/lib/types";
import { upsertFormerBoardCheckin } from "@/lib/airtable";
import {
  FORMER_BOARD_TICKET_TYPE_KEY,
  FORMER_BOARD_TICKET_TYPE_NAME,
  freeFormerBoardMembers,
} from "@/lib/formerBoard";
import { loadFormerBoardRoster } from "@/lib/formerBoardRoster";

// Checks in a former board member from their placeholder row on the door
// list, creating their comped Airtable row on the spot. Un-checking them
// afterwards goes through the regular mark route, since by then they have
// a real row.
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { rosterKey } = await req.json();

    if (typeof rosterKey !== "string" || !rosterKey) {
      return NextResponse.json(
        { error: "Missing former board member." },
        { status: 400 }
      );
    }

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

    const roster = await loadFormerBoardRoster();
    const member = roster.find((m) => m._key === rosterKey);
    if (!member) {
      return NextResponse.json(
        { error: "Not a recognized former board member." },
        { status: 400 }
      );
    }
    // Re-checked here since the event's list can change in Studio while a
    // door device is still showing the old one.
    const isFree = freeFormerBoardMembers([member], event.formerBoardExcludedKeys).length > 0;
    if (!isFree) {
      return NextResponse.json(
        {
          error: `${member.firstName} ${member.lastName} isn't on the free list for this event.`,
        },
        { status: 400 }
      );
    }

    await upsertFormerBoardCheckin({
      eventId: event._id,
      eventName: event.title.slice(0, 500),
      rosterKey: member._key,
      firstName: member.firstName.trim().slice(0, 500),
      lastName: member.lastName.trim().slice(0, 500),
      ticketTypeKey: FORMER_BOARD_TICKET_TYPE_KEY,
      ticketTypeName: FORMER_BOARD_TICKET_TYPE_NAME,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Former board check-in error:", err);
    return NextResponse.json({ error: "Failed to check in." }, { status: 500 });
  }
}
