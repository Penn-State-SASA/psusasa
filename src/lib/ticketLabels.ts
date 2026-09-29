// Deliberately text-only (not computed dollar amounts) — the authoritative
// total always comes from the server response, so this can't ever be shown
// alongside a breakdown that doesn't sum to it.
export function breakdownLabel(
  memberUnits: number,
  nonMemberUnits: number
): string {
  const parts: string[] = [];
  if (memberUnits > 0) {
    parts.push(`${memberUnits} ticket${memberUnits === 1 ? "" : "s"} at member price`);
  }
  if (nonMemberUnits > 0) {
    parts.push(`${nonMemberUnits} ticket${nonMemberUnits === 1 ? "" : "s"} at non-member price`);
  }
  return parts.join(" + ");
}

// Reads the member/non-member seat split back off a ticket PaymentIntent's
// metadata. "0" is falsy, so presence has to be tested before defaulting —
// a member buying a single ticket sends nonMemberUnits="0", which must not
// fall back to `quantity` and claim a non-member ticket that was never
// charged. Metadata from before the split was recorded has neither field;
// every seat in those orders was non-member priced.
export function splitFromMetadata(
  m: Record<string, string>,
  quantity: number
): { memberUnits: number; nonMemberUnits: number } {
  const hasSplit = m.memberUnits !== undefined || m.nonMemberUnits !== undefined;
  return {
    memberUnits: hasSplit ? Number(m.memberUnits) || 0 : 0,
    nonMemberUnits: hasSplit ? Number(m.nonMemberUnits) || 0 : quantity,
  };
}
