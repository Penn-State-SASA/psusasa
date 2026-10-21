import { sanityFetchSingle } from "../../sanity/lib/client";
import { eventByIdQuery } from "../../sanity/lib/queries";
import type { SanityEvent, TicketType } from "@/lib/types";
import { PSU_MEMBER_EMAIL_RE } from "@/lib/email";
import {
  hasUsedMemberPricing,
  lookupCurrentMember,
  sumCapacityUsed,
} from "@/lib/airtable";

export const MAX_TICKETS_PER_ORDER = 10;

export class TicketOrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface TicketOrderInput {
  eventId: unknown;
  ticketTypeKey: unknown;
  quantity: unknown;
  psuEmail?: unknown;
  /** False only when the buyer explicitly said they're not a Penn State student — anything else (including omitted, for callers that predate this field) is treated as "is a student." */
  isPsuStudent?: unknown;
  /** Compared against the Members-table name on file for the PSU email, so a buyer can't claim member pricing using someone else's email. */
  firstName?: unknown;
  lastName?: unknown;
}

export function normalizedName(firstName: unknown, lastName: unknown): string {
  return `${typeof firstName === "string" ? firstName : ""} ${typeof lastName === "string" ? lastName : ""}`
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export interface ResolvedTicketOrder {
  event: SanityEvent;
  ticketType: TicketType;
  quantity: number;
  /** Raw membership-verification result (PSU email found in the Members table AND the buyer's name matches the name on file) — independent of discount eligibility. */
  isCurrentMember: boolean;
  /** True if this order's buyer-unit was priced at the member rate. */
  isMember: boolean;
  /** The buyer's Members-table "Year", when isMember is true — otherwise null. */
  memberYear: string | null;
  /** Always 0 or 1 — at most one seat per order/person ever gets member pricing. */
  memberUnits: number;
  nonMemberUnits: number;
  subtotalCents: number;
  /** False only when the buyer said they're not a Penn State student. */
  isPsuStudent: boolean;
}

// Shared by both the card and cash purchase routes: validates the request,
// re-fetches the event fresh from Sanity (never trust client-supplied
// prices), verifies membership, and enforces capacity. Keeping this in one
// place means the two payment paths can't silently drift out of sync.
export async function resolveTicketOrder({
  eventId,
  ticketTypeKey,
  quantity,
  psuEmail,
  isPsuStudent: isPsuStudentInput,
  firstName,
  lastName,
}: TicketOrderInput): Promise<ResolvedTicketOrder> {
  const isPsuStudent = isPsuStudentInput !== false;
  if (typeof eventId !== "string" || !eventId) {
    throw new TicketOrderError("Missing event.");
  }
  if (typeof ticketTypeKey !== "string" || !ticketTypeKey) {
    throw new TicketOrderError("Missing ticket type.");
  }

  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty < 1 || qty > MAX_TICKETS_PER_ORDER) {
    throw new TicketOrderError(
      `Quantity must be between 1 and ${MAX_TICKETS_PER_ORDER}.`
    );
  }

  const event = await sanityFetchSingle<SanityEvent>(eventByIdQuery, {
    id: eventId,
  });
  if (!event) throw new TicketOrderError("Event not found.", 404);
  if (!event.ticketingEnabled) {
    throw new TicketOrderError("Ticket sales are not open for this event.");
  }

  const ticketType = event.ticketTypes?.find((t) => t._key === ticketTypeKey);
  if (!ticketType) throw new TicketOrderError("Ticket type not found.", 404);
  if (ticketType.salesOpen === false) {
    throw new TicketOrderError("This ticket type is no longer on sale.");
  }

  const emailInput = typeof psuEmail === "string" ? psuEmail.trim() : "";

  // Mandatory and format-checked server-side, not just client-side — a
  // buyer claiming to be a Penn State student can't bypass this by simply
  // leaving the PSU email field blank.
  if (isPsuStudent && !PSU_MEMBER_EMAIL_RE.test(emailInput)) {
    throw new TicketOrderError(
      "A valid Penn State email (ending in @psu.edu) is required for Penn State students."
    );
  }

  const memberRecord = isPsuStudent
    ? await lookupCurrentMember(emailInput)
    : { isMember: false, year: null, firstName: null, lastName: null };

  // A buyer only gets member pricing if the name they typed matches the
  // name on file for that PSU email — otherwise anyone who knows (or
  // guesses) a real member's email could claim their discount under a
  // different name.
  const isCurrentMember =
    memberRecord.isMember &&
    normalizedName(firstName, lastName) ===
      normalizedName(memberRecord.firstName, memberRecord.lastName);
  const currentMemberYear = memberRecord.year;

  // At most 1 ticket per person, ever, gets the member price for a given
  // event — the buyer's own seat, and only if they haven't already used
  // that allowance in an earlier order. Any additional tickets in this
  // order (for friends/guests) are charged at the non-member rate
  // regardless of quantity — buying in bulk can't stack the discount.
  const alreadyUsedMemberPricing = isCurrentMember
    ? await hasUsedMemberPricing(event._id, emailInput)
    : false;
  const memberUnits = isCurrentMember && !alreadyUsedMemberPricing ? 1 : 0;
  const nonMemberUnits = qty - memberUnits;
  // Non-students skip the member/non-member distinction entirely — every
  // unit they buy is priced the same, falling back to the non-member price
  // for any event where staff haven't set a non-student price yet.
  const nonMemberUnitPriceCents = isPsuStudent
    ? ticketType.nonMemberPriceCents
    : (ticketType.nonStudentPriceCents ?? ticketType.nonMemberPriceCents);
  const subtotalCents =
    memberUnits * ticketType.memberPriceCents +
    nonMemberUnits * nonMemberUnitPriceCents;

  if (typeof event.capacity === "number") {
    const used = await sumCapacityUsed(event._id);
    const remaining = event.capacity - used;
    if (qty > remaining) {
      throw new TicketOrderError(
        remaining > 0
          ? `Only ${remaining} ticket(s) left.`
          : "This event is sold out."
      );
    }
  }

  return {
    event,
    ticketType,
    quantity: qty,
    isCurrentMember,
    isMember: memberUnits > 0,
    memberYear: memberUnits > 0 ? currentMemberYear : null,
    memberUnits,
    nonMemberUnits,
    subtotalCents,
    isPsuStudent,
  };
}
