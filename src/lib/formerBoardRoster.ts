import type { FormerBoardMember, SanityEvent } from "@/lib/types";
import { freeFormerBoardMembers } from "@/lib/formerBoard";
import { sanityFetchSingle } from "../../sanity/lib/client";
import { formerBoardRosterQuery } from "../../sanity/lib/queries";

export async function loadFormerBoardRoster(): Promise<FormerBoardMember[]> {
  const roster = await sanityFetchSingle<{ members?: FormerBoardMember[] | null }>(
    formerBoardRosterQuery
  );
  return roster?.members ?? [];
}

/** The former board members to list at this event's door — none unless ticketing is on. */
export async function loadFreeFormerBoardMembers(
  event: Pick<SanityEvent, "ticketingEnabled" | "formerBoardExcludedKeys">
): Promise<FormerBoardMember[]> {
  if (!event.ticketingEnabled) return [];
  return freeFormerBoardMembers(await loadFormerBoardRoster(), event.formerBoardExcludedKeys);
}
