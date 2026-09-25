import { NextRequest, NextResponse } from "next/server";
import { listTicketsForEvent } from "@/lib/airtable";
import { sanityFetchSingle } from "../../../../../../sanity/lib/client";
import { eventByIdQuery } from "../../../../../../sanity/lib/queries";
import type { FormerBoardMember, SanityEvent } from "@/lib/types";
import { mergeFormerBoardGuests } from "@/lib/formerBoard";
import { loadFreeFormerBoardMembers } from "@/lib/formerBoardRoster";

// The comped former board list is a nice-to-have on top of the real orders —
// if Sanity hiccups, the door still gets every paid order rather than an error.
async function freeFormerBoardFor(eventId: string): Promise<FormerBoardMember[]> {
  try {
    const event = await sanityFetchSingle<SanityEvent>(eventByIdQuery, { id: eventId });
    return event ? await loadFreeFormerBoardMembers(event) : [];
  } catch (err) {
    console.error("Former board list fetch error:", err);
    return [];
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const [tickets, formerBoard] = await Promise.all([
      listTicketsForEvent(params.eventId),
      freeFormerBoardFor(params.eventId),
    ]);
    return NextResponse.json({ tickets: mergeFormerBoardGuests(tickets, formerBoard) });
  } catch (err) {
    console.error("Check-in tickets fetch error:", err);
    return NextResponse.json(
      { error: "Failed to load tickets." },
      { status: 500 }
    );
  }
}
