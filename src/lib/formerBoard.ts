import type { TicketRecord } from "@/lib/airtable";
import type { FormerBoardMember } from "@/lib/types";

// Pure helpers only — imported by the browser check-in board and the Studio
// input, so nothing here may pull in the Sanity client or Airtable. The
// server-side loaders live in formerBoardRoster.ts.

// Synthetic ticket-type key for a former board member's comped entry — like
// BOARD_PLUS_ONE_TICKET_TYPE_KEY, it never matches a real Sanity ticket
// type's _key, so these rows never count toward a ticket type's capacity.
export const FORMER_BOARD_TICKET_TYPE_KEY = "former-board";
export const FORMER_BOARD_TICKET_TYPE_NAME = "Former Board";

// Former board guests aren't written to Airtable ahead of time — the door
// list shows a placeholder row per comped roster member, and only checking
// one in creates their real Airtable row. The placeholder's id carries the
// roster _key so the board can send it to the former-board route. Real
// Airtable ids always start with "rec", so the two never collide.
const VIRTUAL_ID_PREFIX = "former-board:";

export function formerBoardVirtualId(rosterKey: string): string {
  return `${VIRTUAL_ID_PREFIX}${rosterKey}`;
}

export function isFormerBoardVirtualId(id: string): boolean {
  return id.startsWith(VIRTUAL_ID_PREFIX);
}

export function rosterKeyFromVirtualId(id: string): string {
  return id.slice(VIRTUAL_ID_PREFIX.length);
}

export function isFormerBoardTicket(t: Pick<TicketRecord, "ticketTypeKey">): boolean {
  return t.ticketTypeKey === FORMER_BOARD_TICKET_TYPE_KEY;
}

/** Roster members who get in free for this event — everyone unless the event unticked them. */
export function freeFormerBoardMembers(
  roster: FormerBoardMember[] | null | undefined,
  excludedKeys: string[] | null | undefined
): FormerBoardMember[] {
  const excluded = new Set(excludedKeys ?? []);
  return (roster ?? []).filter(
    (m) => m._key && m.firstName && m.lastName && !excluded.has(m._key)
  );
}

function nameKey(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim().replace(/\s+/g, " ").toLowerCase();
}

// Adds a placeholder row for each comped former board member who doesn't
// already have a real former-board row (i.e. hasn't been checked in yet).
// Matched by name, since that's all the Airtable row keeps of them.
export function mergeFormerBoardGuests(
  tickets: TicketRecord[],
  freeMembers: FormerBoardMember[]
): TicketRecord[] {
  const alreadyListed = new Set(
    tickets.filter(isFormerBoardTicket).map((t) => nameKey(t.firstName, t.lastName))
  );

  const placeholders = freeMembers
    .filter((m) => !alreadyListed.has(nameKey(m.firstName, m.lastName)))
    .map(
      (m): TicketRecord => ({
        id: formerBoardVirtualId(m._key),
        firstName: m.firstName.trim(),
        lastName: m.lastName.trim(),
        contactEmail: "",
        psuEmail: "",
        isMember: false,
        memberYear: null,
        ticketTypeKey: FORMER_BOARD_TICKET_TYPE_KEY,
        ticketTypeName: FORMER_BOARD_TICKET_TYPE_NAME,
        quantity: 1,
        amountPaidCents: 0,
        paymentMethod: "Card",
        paid: true,
        checkedInCount: 0,
        checkedInAt: null,
        boardMemberName: null,
      })
    );

  return [...tickets, ...placeholders];
}

/** The Studio checkbox's new "not free" list after ticking (free) or unticking (not free) one person. */
export function toggleExcludedKey(
  excludedKeys: string[] | null | undefined,
  rosterKey: string,
  free: boolean
): string[] {
  const rest = (excludedKeys ?? []).filter((k) => k !== rosterKey);
  return free ? rest : [...rest, rosterKey];
}
