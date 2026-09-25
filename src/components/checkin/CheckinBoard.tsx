"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { TicketRecord } from "@/lib/airtable";
import type { BoardMemberPickerEntry } from "@/lib/types";
import { BOARD_PLUS_ONE_TICKET_TYPE_KEY } from "@/lib/boardPlusOne";
import {
  AT_DOOR_TICKET_TYPE_KEY,
  AT_DOOR_TICKET_TYPE_NAME,
  isAtDoorTicket,
} from "@/lib/atDoor";
import {
  isFormerBoardTicket,
  isFormerBoardVirtualId,
  rosterKeyFromVirtualId,
} from "@/lib/formerBoard";
import { amountOwedCents, checkinUpdates, matchesSearch, psuIdOf } from "@/lib/checkin";

const POLL_INTERVAL_MS = 3000;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatProgress(p: { checkedIn: number; expected: number }): string {
  return `${p.checkedIn} / ${p.expected}`;
}

// Stand-in for an at-door sale while its request is in flight — the next
// refetch swaps it for the real Airtable row.
function pendingAtDoorSale(): TicketRecord {
  return {
    id: `at-door-pending:${Date.now()}`,
    firstName: AT_DOOR_TICKET_TYPE_NAME,
    lastName: "",
    contactEmail: "",
    psuEmail: "",
    isMember: false,
    memberYear: null,
    ticketTypeKey: AT_DOOR_TICKET_TYPE_KEY,
    ticketTypeName: AT_DOOR_TICKET_TYPE_NAME,
    quantity: 1,
    amountPaidCents: 0,
    paymentMethod: "At Door",
    paid: true,
    checkedInCount: 1,
    checkedInAt: null,
    boardMemberName: null,
  };
}

interface CheckinBoardProps {
  eventId: string;
  eventTitle: string;
  initialTickets: TicketRecord[];
  boardPlusOneEnabled: boolean;
  boardMembers: BoardMemberPickerEntry[];
  /** The event-wide capacity, or null when there's no limit. */
  capacity: number | null;
}

export default function CheckinBoard({
  eventId,
  eventTitle,
  initialTickets,
  boardPlusOneEnabled,
  boardMembers,
  capacity,
}: CheckinBoardProps) {
  const [tickets, setTickets] = useState<TicketRecord[]>(initialTickets);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCash, setConfirmCash] = useState<TicketRecord | null>(null);
  const [atDoorPending, setAtDoorPending] = useState(false);

  const [showAddPlusOne, setShowAddPlusOne] = useState(false);
  const [plusOneBoardMemberKey, setPlusOneBoardMemberKey] = useState("");
  const [plusOneFirstName, setPlusOneFirstName] = useState("");
  const [plusOneLastName, setPlusOneLastName] = useState("");
  const [plusOneSubmitting, setPlusOneSubmitting] = useState(false);
  const [plusOneError, setPlusOneError] = useState<string | null>(null);

  async function refetch() {
    try {
      const res = await fetch(`/api/checkin/${eventId}/tickets`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.tickets)) setTickets(data.tickets);
    } catch {
      // next poll will retry
    }
  }

  // Multiple staff devices are likely at the door at once — poll so
  // check-ins from other devices show up without a manual refresh.
  useEffect(() => {
    const id = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function sendMark(
    recordId: string,
    updates: { checkedInCount?: number; paid?: boolean }
  ) {
    setPendingId(recordId);
    setError(null);
    setTickets((prev) =>
      prev.map((t): TicketRecord =>
        t.id === recordId
          ? {
              ...t,
              checkedInCount: updates.checkedInCount ?? t.checkedInCount,
              paid: updates.paid ?? t.paid,
            }
          : t
      )
    );
    try {
      const res = await fetch(`/api/checkin/${eventId}/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, ...updates }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update.");
      refetch(); // revert any optimistic update that didn't actually land
    } finally {
      setPendingId(null);
    }
  }

  // A former board member's placeholder row has no Airtable record yet —
  // checking them in creates it (already checked in) via its own route.
  async function checkInFormerBoard(ticket: TicketRecord) {
    setPendingId(ticket.id);
    setError(null);
    setTickets((prev) =>
      prev.map((t): TicketRecord => (t.id === ticket.id ? { ...t, checkedInCount: 1 } : t))
    );
    try {
      const res = await fetch(`/api/checkin/${eventId}/former-board`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterKey: rosterKeyFromVirtualId(ticket.id) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update.");
    } finally {
      // Swap the placeholder for the real row (or roll back on failure).
      await refetch();
      setPendingId(null);
    }
  }

  // At-door sales are nameless one-person rows, shown only as a counter:
  // + records a new one, − deletes the most recent (from any device).
  async function changeAtDoorSales(method: "POST" | "DELETE") {
    setAtDoorPending(true);
    setError(null);
    setTickets((prev) => {
      if (method === "POST") return [...prev, pendingAtDoorSale()];
      const i = prev.findLastIndex(isAtDoorTicket);
      return i === -1 ? prev : [...prev.slice(0, i), ...prev.slice(i + 1)];
    });
    try {
      const res = await fetch(`/api/checkin/${eventId}/at-door`, { method });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update at-door sales.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update at-door sales.");
    } finally {
      await refetch();
      setAtDoorPending(false);
    }
  }

  // Once an order is fully in, the door moves on to the next guest: clear
  // the box and keep the keyboard up. Must run synchronously inside the
  // tap/keypress, or iOS won't reopen the keyboard on focus().
  function resetSearch() {
    setSearch("");
    searchRef.current?.focus();
  }

  // Single-ticket orders keep the simple whole-row tap-to-toggle. Checking
  // in (not un-checking) a cash order that still owes something routes
  // through the collect-cash confirmation first, so staff always see the
  // amount before it counts as checked in.
  function handleTap(ticket: TicketRecord) {
    if (isFormerBoardVirtualId(ticket.id)) {
      // Only ever shown un-checked-in — once checked in it's a real row.
      if (ticket.checkedInCount === 0) {
        resetSearch();
        checkInFormerBoard(ticket);
      }
      return;
    }
    if (ticket.checkedInCount > 0) {
      sendMark(ticket.id, checkinUpdates(ticket, 0));
      return;
    }
    if (ticket.paymentMethod === "Cash") {
      setConfirmCash(ticket);
      return;
    }
    resetSearch();
    sendMark(ticket.id, checkinUpdates(ticket, 1));
  }

  // Multi-ticket orders use +/- instead of a whole-row tap, since check-in
  // isn't all-or-nothing when a party can arrive (and pay) in stages. Every
  // increment on a cash order still owing money confirms collection first.
  function incrementCheckedIn(ticket: TicketRecord) {
    if (ticket.checkedInCount >= ticket.quantity) return;
    if (ticket.paymentMethod === "Cash") {
      setConfirmCash(ticket);
      return;
    }
    const next = ticket.checkedInCount + 1;
    if (next >= ticket.quantity) resetSearch();
    sendMark(ticket.id, checkinUpdates(ticket, next));
  }

  function decrementCheckedIn(ticket: TicketRecord) {
    if (ticket.checkedInCount <= 0) return;
    sendMark(ticket.id, checkinUpdates(ticket, ticket.checkedInCount - 1));
  }

  function confirmCollectCash() {
    if (!confirmCash) return;
    const next = confirmCash.checkedInCount + 1;
    if (next >= confirmCash.quantity) resetSearch();
    sendMark(confirmCash.id, checkinUpdates(confirmCash, next));
    setConfirmCash(null);
  }

  // Board members who already have a +1 registered for this event, derived
  // from the same ticket list already in state — no extra request needed.
  // Disabling these in the picker is a UI nudge only; the server re-checks
  // the real cap regardless.
  const usedBoardMemberNames = useMemo(() => {
    const names = new Set<string>();
    for (const t of tickets) {
      if (t.ticketTypeKey === BOARD_PLUS_ONE_TICKET_TYPE_KEY && t.boardMemberName) {
        names.add(t.boardMemberName);
      }
    }
    return names;
  }, [tickets]);

  function closeAddPlusOne() {
    setShowAddPlusOne(false);
    setPlusOneBoardMemberKey("");
    setPlusOneFirstName("");
    setPlusOneLastName("");
    setPlusOneError(null);
  }

  async function submitAddPlusOne() {
    if (!plusOneBoardMemberKey || !plusOneFirstName.trim() || !plusOneLastName.trim()) {
      setPlusOneError("Select a board member and enter the guest's name.");
      return;
    }
    setPlusOneSubmitting(true);
    setPlusOneError(null);
    try {
      const res = await fetch(`/api/checkin/${eventId}/board-plus-one`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardMemberKey: plusOneBoardMemberKey,
          guestFirstName: plusOneFirstName.trim(),
          guestLastName: plusOneLastName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to add guest.");
      }
      await refetch();
      closeAddPlusOne();
    } catch (err) {
      setPlusOneError(err instanceof Error ? err.message : "Failed to add guest.");
    } finally {
      setPlusOneSubmitting(false);
    }
  }

  const filtered = useMemo(
    () => tickets.filter((t) => !isAtDoorTicket(t) && matchesSearch(t, search)),
    [tickets, search]
  );

  // Everyone still to arrive first (partial parties included — they still
  // have seats left), then alphabetical by last name.
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const aDone = a.checkedInCount >= a.quantity ? 1 : 0;
        const bDone = b.checkedInCount >= b.quantity ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      }),
    [filtered]
  );

  // Enter/Go checks in the only match, but never undoes a check-in and
  // never guesses between several people.
  const enterTarget =
    search.trim() && sorted.length === 1 && sorted[0].checkedInCount < sorted[0].quantity
      ? sorted[0]
      : null;

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!enterTarget || pendingId === enterTarget.id) return;
    if (enterTarget.quantity === 1) handleTap(enterTarget);
    else incrementCheckedIn(enterTarget);
  }

  const stats = useMemo(() => {
    let totalSold = 0;
    let totalCheckedIn = 0;
    let capacityUsed = 0;
    let cashOutstandingCents = 0;
    let atDoorSales = 0;
    const members = { checkedIn: 0, expected: 0 };
    const nonMembers = { checkedIn: 0, expected: 0 };
    const boardPlusOne = { checkedIn: 0, expected: 0 };
    const formerBoard = { checkedIn: 0, expected: 0 };
    const byType = new Map<string, { sold: number; checkedIn: number }>();

    for (const t of tickets) {
      // Checked In is the headcount through the door, comps included.
      totalCheckedIn += t.checkedInCount;
      // Former board are comped guests, not sales — tallied on their own,
      // and never count toward capacity.
      if (isFormerBoardTicket(t)) {
        formerBoard.expected += t.quantity;
        formerBoard.checkedIn += t.checkedInCount;
        continue;
      }
      totalSold += t.quantity;
      // Same rule the server enforces (sumCapacityUsed): every paid row
      // except former board, so unpaid cash orders don't hold a seat yet.
      if (t.paid) capacityUsed += t.quantity;
      if (isAtDoorTicket(t)) {
        atDoorSales += t.quantity;
        continue;
      }
      cashOutstandingCents += amountOwedCents(t);

      if (t.ticketTypeKey === BOARD_PLUS_ONE_TICKET_TYPE_KEY) {
        boardPlusOne.expected += t.quantity;
        boardPlusOne.checkedIn += t.checkedInCount;
      } else if (t.isMember) {
        // Only the buyer's own seat is member-priced; the rest of their
        // party are non-members. The buyer counts as the first one in.
        members.expected += 1;
        members.checkedIn += Math.min(t.checkedInCount, 1);
        nonMembers.expected += t.quantity - 1;
        nonMembers.checkedIn += Math.max(0, t.checkedInCount - 1);
      } else {
        nonMembers.expected += t.quantity;
        nonMembers.checkedIn += t.checkedInCount;
      }

      const entry = byType.get(t.ticketTypeName) ?? { sold: 0, checkedIn: 0 };
      entry.sold += t.quantity;
      entry.checkedIn += t.checkedInCount;
      byType.set(t.ticketTypeName, entry);
    }

    return {
      totalSold,
      totalCheckedIn,
      capacityUsed,
      cashOutstandingCents,
      atDoorSales,
      members,
      nonMembers,
      boardPlusOne,
      formerBoard,
      byType: Array.from(byType.entries()),
    };
  }, [tickets]);

  const atCapacity = capacity !== null && stats.capacityUsed >= capacity;

  return (
    <div>
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <h1 className="font-heading text-lg font-semibold text-sasa-red-900">
          {eventTitle}
        </h1>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Tickets Sold" value={String(stats.totalSold)} />
          <Stat label="Checked In" value={String(stats.totalCheckedIn)} />
          {capacity !== null && (
            <Stat
              label="Capacity"
              value={`${stats.capacityUsed} / ${capacity}`}
              warn={atCapacity}
            />
          )}
          <Stat
            label="Cash Outstanding"
            value={formatPrice(stats.cashOutstandingCents)}
            warn={stats.cashOutstandingCents > 0}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-sm sm:grid-cols-4">
          <Stat label="Members" value={formatProgress(stats.members)} />
          <Stat label="Non-Members" value={formatProgress(stats.nonMembers)} />
          {(boardPlusOneEnabled || stats.boardPlusOne.expected > 0) && (
            <Stat label="Board +1" value={formatProgress(stats.boardPlusOne)} />
          )}
          {stats.formerBoard.expected > 0 && (
            <Stat label="Former Board" value={formatProgress(stats.formerBoard)} />
          )}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-sasa-neutral-400">At-Door Sales</p>
          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={() => changeAtDoorSales("DELETE")}
              disabled={atDoorPending || stats.atDoorSales <= 0}
              aria-label="Undo at-door sale"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-lg font-semibold text-sasa-red-900 hover:bg-gray-50 disabled:opacity-40"
            >
              −
            </button>
            <span
              data-testid="at-door-count"
              className="min-w-[2.5rem] text-center text-lg font-semibold text-sasa-red-900"
            >
              {stats.atDoorSales}
            </span>
            <button
              onClick={() => changeAtDoorSales("POST")}
              disabled={atDoorPending || atCapacity}
              aria-label="Add at-door sale"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-lg font-semibold text-sasa-red-900 hover:bg-gray-50 disabled:opacity-40"
            >
              +
            </button>
            {atCapacity && (
              <span className="text-xs font-medium text-amber-600">At capacity</span>
            )}
          </div>
        </div>
        {stats.byType.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sasa-neutral-500">
            {stats.byType.map(([name, s]) => (
              <span key={name}>
                {name}: {s.checkedIn}/{s.sold}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search by name, email, or PSU ID..."
          autoFocus
          enterKeyHint="go"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full rounded border border-gray-300 px-4 py-3 text-base focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
        />
        {boardPlusOneEnabled && boardMembers.length > 0 && (
          <button
            onClick={() => setShowAddPlusOne(true)}
            className="shrink-0 rounded border-2 border-sasa-gold-400 px-4 py-2 text-sm font-semibold text-sasa-gold-400 hover:bg-sasa-gold-400/10 transition-colors"
          >
            + Add +1
          </button>
        )}
      </div>

      {enterTarget && (
        <p className="-mt-2 mb-4 text-xs text-sasa-neutral-500">
          Press Enter / Go to check in {enterTarget.firstName} {enterTarget.lastName}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {sorted.length === 0 && (
          <p className="py-8 text-center text-sm text-sasa-neutral-400">
            No matching orders.
          </p>
        )}
        {sorted.map((t) => {
          const owedCents = amountOwedCents(t);
          const isPending = pendingId === t.id;
          const isSingle = t.quantity === 1;
          const fullyCheckedIn = t.checkedInCount >= t.quantity;
          const partiallyCheckedIn = t.checkedInCount > 0 && !fullyCheckedIn;
          const formerBoard = isFormerBoardTicket(t);
          const psuId = psuIdOf(t);

          return (
            <div
              key={t.id}
              role={isSingle ? "button" : undefined}
              tabIndex={isSingle ? 0 : undefined}
              onClick={isSingle ? () => !isPending && handleTap(t) : undefined}
              onKeyDown={
                isSingle
                  ? (e) => {
                      if ((e.key === "Enter" || e.key === " ") && !isPending) {
                        e.preventDefault();
                        handleTap(t);
                      }
                    }
                  : undefined
              }
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                isSingle ? "cursor-pointer" : ""
              } ${
                fullyCheckedIn
                  ? "border-sasa-gold-600/40 bg-sasa-gold-400/10"
                  : partiallyCheckedIn
                    ? "border-sasa-gold-600/20 bg-sasa-gold-400/5"
                    : "border-gray-200 bg-white hover:border-sasa-red-900/30"
              } ${isPending ? "opacity-50" : ""}`}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sasa-red-900">
                    {t.firstName} {t.lastName}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      formerBoard
                        ? "bg-sasa-gold-400/20 text-sasa-red-900"
                        : t.isMember
                          ? "bg-sasa-forest/10 text-sasa-forest"
                          : "bg-gray-100 text-sasa-neutral-500"
                    }`}
                  >
                    {formerBoard
                      ? "Former Board"
                      : t.isMember
                        ? t.memberYear
                          ? `Member · ${t.memberYear}`
                          : "Member"
                        : "Non-Member"}
                  </span>
                  {owedCents > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Owes {formatPrice(owedCents)}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-sasa-neutral-500">
                  {formerBoard ? "Free entry" : `${t.quantity}x ${t.ticketTypeName}`}
                  {t.contactEmail ? ` · ${t.contactEmail}` : ""}
                  {psuId ? ` · ${psuId}` : ""}
                </div>
              </div>

              {isSingle ? (
                <span
                  className={`shrink-0 rounded px-4 py-2 text-sm font-semibold ${
                    fullyCheckedIn
                      ? "bg-sasa-gold-600 text-sasa-red-900"
                      : "bg-sasa-red-900 text-white"
                  }`}
                >
                  {fullyCheckedIn ? "Checked In ✓" : "Check In"}
                </span>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => decrementCheckedIn(t)}
                    disabled={isPending || t.checkedInCount <= 0}
                    aria-label="Decrease checked-in count"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-lg font-semibold text-sasa-red-900 hover:bg-gray-50 disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="min-w-[3.5rem] text-center text-sm font-semibold text-sasa-red-900">
                    {t.checkedInCount} / {t.quantity}
                  </span>
                  <button
                    onClick={() => incrementCheckedIn(t)}
                    disabled={isPending || t.checkedInCount >= t.quantity}
                    aria-label="Increase checked-in count"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-lg font-semibold text-sasa-red-900 hover:bg-gray-50 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {confirmCash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-2 font-heading text-lg font-semibold text-sasa-red-900">
              Collect cash
            </h2>
            <p className="mb-6 text-sm text-sasa-neutral-500">
              {confirmCash.firstName} {confirmCash.lastName} owes{" "}
              <span className="font-semibold text-sasa-red-900">
                {formatPrice(amountOwedCents(confirmCash))}
              </span>
              . Confirm you&apos;ve collected payment before checking them in.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmCash(null)}
                className="rounded border-2 border-sasa-gold-400 px-4 py-2 text-sm font-semibold text-sasa-gold-400 hover:bg-sasa-gold-400/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmCollectCash}
                className="rounded bg-sasa-red-900 px-4 py-2 text-sm font-semibold text-white hover:bg-sasa-red-700"
              >
                Collected — Check In
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddPlusOne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 font-heading text-lg font-semibold text-sasa-red-900">
              Add board +1
            </h2>

            <label className="mb-1 block text-sm font-medium text-sasa-red-900">
              Board member
            </label>
            <select
              value={plusOneBoardMemberKey}
              onChange={(e) => setPlusOneBoardMemberKey(e.target.value)}
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
            >
              <option value="">Select a board member...</option>
              {boardMembers.map((m) => {
                const name = `${m.firstName} ${m.lastName}`;
                const used = usedBoardMemberNames.has(name);
                return (
                  <option key={m._key} value={m._key} disabled={used}>
                    {name}
                    {used ? " (already added)" : ""}
                  </option>
                );
              })}
            </select>

            <label className="mb-1 block text-sm font-medium text-sasa-red-900">
              Guest&apos;s name
            </label>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <input
                type="text"
                value={plusOneFirstName}
                onChange={(e) => setPlusOneFirstName(e.target.value)}
                placeholder="First name"
                className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
              />
              <input
                type="text"
                value={plusOneLastName}
                onChange={(e) => setPlusOneLastName(e.target.value)}
                placeholder="Last name"
                className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-sasa-red-900 focus:outline-none focus:ring-1 focus:ring-sasa-red-900"
              />
            </div>

            {plusOneError && (
              <p className="mb-3 text-sm text-red-600">{plusOneError}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeAddPlusOne}
                disabled={plusOneSubmitting}
                className="rounded border-2 border-sasa-gold-400 px-4 py-2 text-sm font-semibold text-sasa-gold-400 hover:bg-sasa-gold-400/10 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitAddPlusOne}
                disabled={plusOneSubmitting}
                className="rounded bg-sasa-red-900 px-4 py-2 text-sm font-semibold text-white hover:bg-sasa-red-700 disabled:opacity-60"
              >
                {plusOneSubmitting ? "Adding..." : "Add Guest"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-sasa-neutral-400">{label}</p>
      <p className={`text-lg font-semibold ${warn ? "text-amber-600" : "text-sasa-red-900"}`}>
        {value}
      </p>
    </div>
  );
}
