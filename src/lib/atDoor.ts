import type { TicketRecord } from "@/lib/airtable";

// Synthetic ticket-type key for a walk-up sale tapped in at the door — like
// BOARD_PLUS_ONE_TICKET_TYPE_KEY, it never matches a real Sanity ticket
// type's _key. Each sale is its own nameless, already-checked-in row, so it
// counts toward the event's capacity but is only shown on the check-in
// board as a counter, never in the guest list. Pure constants only — shared
// by the at-door API route and CheckinBoard.tsx.
export const AT_DOOR_TICKET_TYPE_KEY = "at-door";
export const AT_DOOR_TICKET_TYPE_NAME = "At-Door Sale";

export function isAtDoorTicket(t: Pick<TicketRecord, "ticketTypeKey">): boolean {
  return t.ticketTypeKey === AT_DOOR_TICKET_TYPE_KEY;
}
