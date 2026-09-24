import type { TicketRecord } from "@/lib/airtable";

// A cash order's price isn't split per-ticket in Airtable (member/non-member
// units can differ), so this is a proportional estimate of what's still
// owed as a party partially checks in — not penny-exact, but good enough
// for staff to know roughly what to ask for. Purely derived from check-in
// progress: there's no separate "paid" toggle, checking someone in is the
// only action, and un-checking them raises the owed amount right back up.
export function amountOwedCents(t: TicketRecord): number {
  if (t.paymentMethod !== "Cash" || t.quantity <= 0) return 0;
  return Math.round((t.amountPaidCents * (t.quantity - t.checkedInCount)) / t.quantity);
}

// Paid is fully derived from check-in progress on cash orders — no
// separate manual toggle. Written alongside checkedInCount on every
// change (either direction) purely so raw Airtable views/reports have a
// simple boolean to filter/sum by; the board itself only ever reads
// amountOwedCents, computed straight from the count.
export function checkinUpdates(
  ticket: TicketRecord,
  nextCount: number
): { checkedInCount: number; paid?: boolean } {
  const updates: { checkedInCount: number; paid?: boolean } = {
    checkedInCount: nextCount,
  };
  if (ticket.paymentMethod === "Cash") {
    updates.paid = nextCount >= ticket.quantity;
  }
  return updates;
}
