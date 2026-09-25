// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckinBoard from "@/components/checkin/CheckinBoard";
import type { TicketRecord } from "@/lib/airtable";
import type { BoardMemberPickerEntry } from "@/lib/types";
import { BOARD_PLUS_ONE_TICKET_TYPE_KEY } from "@/lib/boardPlusOne";
import { FORMER_BOARD_TICKET_TYPE_KEY, mergeFormerBoardGuests } from "@/lib/formerBoard";
import { makeFormerBoardMember, makeTicketRecord } from "@/test/factories";

const fetchMock = vi.fn<typeof fetch>();

/** What GET /api/checkin/[eventId]/tickets returns — the "real" Airtable state. */
let serverTickets: TicketRecord[] = [];

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Bodies of every request the board sent to the given API path suffix. */
function sent(pathSuffix: string): Array<Record<string, unknown>> {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).endsWith(pathSuffix))
    .map(([, init]) => JSON.parse(String(init?.body)));
}

const asha = makeTicketRecord({
  id: "rec-asha",
  firstName: "Asha",
  lastName: "Patel",
  contactEmail: "asha@example.com",
});
const dev = makeTicketRecord({
  id: "rec-dev",
  firstName: "Dev",
  lastName: "Rao",
  contactEmail: "dev.rao@example.com",
  paymentMethod: "Cash",
  paid: false,
  amountPaidCents: 1500,
});
const party = makeTicketRecord({
  id: "rec-party",
  firstName: "Meera",
  lastName: "Iyer",
  contactEmail: "meera@example.com",
  quantity: 3,
  amountPaidCents: 4500,
});

const boardMembers: BoardMemberPickerEntry[] = [
  { _key: "bm1", firstName: "Ravi", lastName: "Shah" },
  { _key: "bm2", firstName: "Kavya", lastName: "Nair" },
];

function renderBoard(
  tickets: TicketRecord[],
  extra: { boardPlusOneEnabled?: boolean } = {}
) {
  serverTickets = tickets;
  return render(
    <CheckinBoard
      eventId="event-1"
      eventTitle="Diwali Night"
      initialTickets={tickets}
      boardPlusOneEnabled={extra.boardPlusOneEnabled ?? false}
      boardMembers={boardMembers}
    />
  );
}

/** The tappable row for a single-ticket order. */
function row(name: RegExp) {
  return screen.getByRole("button", { name });
}

beforeEach(() => {
  // Only the 3s poll is faked, so it never fires mid-test; user-event's
  // own setTimeout-based pacing stays real.
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input) =>
    String(input).endsWith("/tickets") ? respond({ tickets: serverTickets }) : respond({ ok: true })
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("CheckinBoard — finding people", () => {
  it("lists every order, sorted by last name", () => {
    renderBoard([asha, dev, party]);
    const names = screen
      .getAllByText(/^(Asha Patel|Dev Rao|Meera Iyer)$/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Meera Iyer", "Asha Patel", "Dev Rao"]);
  });

  it("filters by name or email as staff type", async () => {
    const user = userEvent.setup();
    renderBoard([asha, dev, party]);
    const search = screen.getByPlaceholderText("Search by name or email...");

    await user.type(search, "patel");
    expect(screen.getByText("Asha Patel")).toBeInTheDocument();
    expect(screen.queryByText("Dev Rao")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "dev.rao@");
    expect(screen.getByText("Dev Rao")).toBeInTheDocument();
    expect(screen.queryByText("Asha Patel")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "nobody");
    expect(screen.getByText("No matching orders.")).toBeInTheDocument();
  });
});

describe("CheckinBoard — single-ticket orders", () => {
  it("checks in a card order with one tap, before the server confirms", async () => {
    let confirm!: (res: Response) => void;
    fetchMock.mockImplementation((input) =>
      String(input).endsWith("/mark")
        ? new Promise<Response>((resolve) => (confirm = resolve))
        : Promise.resolve(respond({ tickets: serverTickets }))
    );
    const user = userEvent.setup();
    renderBoard([asha]);

    await user.click(row(/Asha Patel/));

    // Optimistic: shown as checked in while the request is still in flight.
    expect(within(row(/Asha Patel/)).getByText("Checked In ✓")).toBeInTheDocument();
    expect(sent("/mark")).toEqual([{ recordId: "rec-asha", checkedInCount: 1 }]);

    confirm(respond({ ok: true }));
    await waitFor(() => expect(row(/Asha Patel/)).not.toHaveClass("opacity-50"));
  });

  it("undoes a check-in when the row is tapped again", async () => {
    const user = userEvent.setup();
    renderBoard([{ ...asha, checkedInCount: 1 }]);

    await user.click(row(/Asha Patel/));

    expect(sent("/mark")).toEqual([{ recordId: "rec-asha", checkedInCount: 0 }]);
    expect(within(row(/Asha Patel/)).getByText("Check In")).toBeInTheDocument();
  });

  it("asks staff to collect cash, showing the amount, before checking in a cash order", async () => {
    const user = userEvent.setup();
    renderBoard([dev]);

    await user.click(row(/Dev Rao/));

    expect(screen.getByRole("heading", { name: "Collect cash" })).toBeInTheDocument();
    expect(screen.getByText(/Dev Rao owes/)).toHaveTextContent("Dev Rao owes $15.00.");
    expect(sent("/mark")).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Collected — Check In" }));

    // Paid and checked-in land together, so the sheet can't show one without the other.
    expect(sent("/mark")).toEqual([{ recordId: "rec-dev", checkedInCount: 1, paid: true }]);
    expect(screen.queryByRole("heading", { name: "Collect cash" })).not.toBeInTheDocument();
  });

  it("changes nothing when the cash prompt is cancelled", async () => {
    const user = userEvent.setup();
    renderBoard([dev]);

    await user.click(row(/Dev Rao/));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(sent("/mark")).toEqual([]);
    expect(within(row(/Dev Rao/)).getByText("Check In")).toBeInTheDocument();
  });

  it("shows the error and reloads the real state when a check-in fails", async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith("/mark")
        ? respond({ error: "Ticket does not belong to this event." }, 403)
        : respond({ tickets: serverTickets })
    );
    const user = userEvent.setup();
    renderBoard([asha]);

    await user.click(row(/Asha Patel/));

    expect(await screen.findByText("Ticket does not belong to this event.")).toBeInTheDocument();
    // The optimistic check-in is rolled back from the server's copy.
    await waitFor(() =>
      expect(within(row(/Asha Patel/)).getByText("Check In")).toBeInTheDocument()
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/tickets"))).toBe(true);
  });
});

describe("CheckinBoard — multi-ticket orders", () => {
  it("steps the count with + and −, within 0 and the order's quantity", async () => {
    const user = userEvent.setup();
    renderBoard([party]);
    const minus = screen.getByRole("button", { name: "Decrease checked-in count" });
    const plus = screen.getByRole("button", { name: "Increase checked-in count" });

    expect(minus).toBeDisabled();
    await user.click(plus);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    await waitFor(() => expect(minus).toBeEnabled());
    await user.click(minus);
    expect(screen.getByText("0 / 3")).toBeInTheDocument();

    expect(sent("/mark")).toEqual([
      { recordId: "rec-party", checkedInCount: 1 },
      { recordId: "rec-party", checkedInCount: 0 },
    ]);
  });

  it("can't go past the order's quantity", () => {
    renderBoard([{ ...party, checkedInCount: 3 }]);
    expect(screen.getByRole("button", { name: "Increase checked-in count" })).toBeDisabled();
  });

  it("collects each cash seat's share as the party arrives, marking paid on the last", async () => {
    const user = userEvent.setup();
    renderBoard([{ ...party, paymentMethod: "Cash", paid: false, checkedInCount: 2 }]);

    await user.click(screen.getByRole("button", { name: "Increase checked-in count" }));

    // 2 of 3 in on a $45 order: $15 left to collect.
    expect(screen.getByText(/Meera Iyer owes/)).toHaveTextContent("Meera Iyer owes $15.00.");
    await user.click(screen.getByRole("button", { name: "Collected — Check In" }));
    expect(sent("/mark")).toEqual([{ recordId: "rec-party", checkedInCount: 3, paid: true }]);
  });
});

describe("CheckinBoard — board +1 guests", () => {
  const ravisGuest = makeTicketRecord({
    id: "rec-guest",
    firstName: "Guest",
    lastName: "One",
    ticketTypeKey: BOARD_PLUS_ONE_TICKET_TYPE_KEY,
    boardMemberName: "Ravi Shah",
    amountPaidCents: 0,
  });

  it("disables board members who already added their +1", async () => {
    const user = userEvent.setup();
    renderBoard([asha, ravisGuest], { boardPlusOneEnabled: true });

    await user.click(screen.getByRole("button", { name: "+ Add +1" }));

    expect(screen.getByRole("option", { name: "Ravi Shah (already added)" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Kavya Nair" })).toBeEnabled();
  });

  it("adds a guest and refreshes the list", async () => {
    const user = userEvent.setup();
    renderBoard([asha], { boardPlusOneEnabled: true });

    await user.click(screen.getByRole("button", { name: "+ Add +1" }));
    await user.selectOptions(screen.getByRole("combobox"), "bm2");
    await user.type(screen.getByPlaceholderText("First name"), " Ishaan ");
    await user.type(screen.getByPlaceholderText("Last name"), "Menon");
    serverTickets = [asha, { ...ravisGuest, firstName: "Ishaan", lastName: "Menon" }];
    await user.click(screen.getByRole("button", { name: "Add Guest" }));

    expect(sent("/board-plus-one")).toEqual([
      { boardMemberKey: "bm2", guestFirstName: "Ishaan", guestLastName: "Menon" },
    ]);
    expect(await screen.findByText("Ishaan Menon")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add board +1" })).not.toBeInTheDocument();
  });

  it("requires a board member and the guest's name before sending", async () => {
    const user = userEvent.setup();
    renderBoard([asha], { boardPlusOneEnabled: true });

    await user.click(screen.getByRole("button", { name: "+ Add +1" }));
    await user.click(screen.getByRole("button", { name: "Add Guest" }));

    expect(
      screen.getByText("Select a board member and enter the guest's name.")
    ).toBeInTheDocument();
    expect(sent("/board-plus-one")).toEqual([]);
  });

  it("keeps the form open with the server's reason when the add is refused", async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith("/board-plus-one")
        ? respond({ error: "Kavya Nair has already registered their +1 for this event." }, 400)
        : respond({ tickets: serverTickets })
    );
    const user = userEvent.setup();
    renderBoard([asha], { boardPlusOneEnabled: true });

    await user.click(screen.getByRole("button", { name: "+ Add +1" }));
    await user.selectOptions(screen.getByRole("combobox"), "bm2");
    await user.type(screen.getByPlaceholderText("First name"), "Ishaan");
    await user.type(screen.getByPlaceholderText("Last name"), "Menon");
    await user.click(screen.getByRole("button", { name: "Add Guest" }));

    expect(
      await screen.findByText("Kavya Nair has already registered their +1 for this event.")
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add board +1" })).toBeInTheDocument();
  });

  it("hides the +1 button when the event doesn't allow it", () => {
    renderBoard([asha], { boardPlusOneEnabled: false });
    expect(screen.queryByRole("button", { name: "+ Add +1" })).not.toBeInTheDocument();
  });
});

describe("CheckinBoard — header stats", () => {
  it("totals seats, check-ins, and cash still to collect", () => {
    renderBoard([
      { ...asha, isMember: true, checkedInCount: 1 },
      dev,
      { ...party, paymentMethod: "Cash", paid: false, checkedInCount: 1 },
    ]);
    const stat = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

    expect(stat("Tickets Sold")).toBe("5");
    expect(stat("Checked In")).toBe("2");
    expect(stat("Members")).toBe("1");
    expect(stat("Non-Members")).toBe("4");
    // Dev owes $15, Meera's party owes 2/3 of $45.
    expect(stat("Cash Outstanding")).toBe("$45.00");
  });
});

describe("CheckinBoard — former board", () => {
  const omPlaceholder = mergeFormerBoardGuests([], [makeFormerBoardMember()])[0];
  const omCheckedIn = makeTicketRecord({
    id: "rec-om",
    firstName: "Om",
    lastName: "Makwana",
    contactEmail: "",
    ticketTypeKey: FORMER_BOARD_TICKET_TYPE_KEY,
    ticketTypeName: "Former Board",
    amountPaidCents: 0,
    checkedInCount: 1,
  });

  it("tags them Former Board instead of Member or Non-Member", () => {
    renderBoard([omPlaceholder]);
    const omRow = row(/Om Makwana/);
    expect(within(omRow).getByText("Former Board")).toBeInTheDocument();
    expect(within(omRow).getByText("Free entry")).toBeInTheDocument();
    expect(within(omRow).queryByText("Non-Member")).not.toBeInTheDocument();
  });

  it("checks in their placeholder through the former-board route, then shows the real row", async () => {
    const user = userEvent.setup();
    renderBoard([asha, omPlaceholder]);
    serverTickets = [asha, omCheckedIn];

    await user.click(row(/Om Makwana/));

    expect(sent("/former-board")).toEqual([{ rosterKey: "om-makwana" }]);
    expect(sent("/mark")).toEqual([]);
    // No cash prompt — it's a comp.
    expect(screen.queryByRole("heading", { name: "Collect cash" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(within(row(/Om Makwana/)).getByText("Checked In ✓")).toBeInTheDocument()
    );
    await waitFor(() => expect(row(/Om Makwana/)).not.toHaveClass("opacity-50"));
  });

  it("undoes a former board check-in through the regular mark route", async () => {
    const user = userEvent.setup();
    renderBoard([omCheckedIn]);

    await user.click(row(/Om Makwana/));

    expect(sent("/mark")).toEqual([{ recordId: "rec-om", checkedInCount: 0 }]);
    expect(sent("/former-board")).toEqual([]);
  });

  it("shows the error and rolls back when the check-in is refused", async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith("/former-board")
        ? respond({ error: "Om Makwana isn't on the free list for this event." }, 400)
        : respond({ tickets: serverTickets })
    );
    const user = userEvent.setup();
    renderBoard([omPlaceholder]);

    await user.click(row(/Om Makwana/));

    expect(
      await screen.findByText("Om Makwana isn't on the free list for this event.")
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(within(row(/Om Makwana/)).getByText("Check In")).toBeInTheDocument()
    );
  });

  it("falls back to a generic error when the server gives no reason", async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith("/former-board")
        ? new Response("oops", { status: 500 })
        : respond({ tickets: serverTickets })
    );
    const user = userEvent.setup();
    renderBoard([omPlaceholder]);

    await user.click(row(/Om Makwana/));

    expect(await screen.findByText("Failed to update.")).toBeInTheDocument();
  });

  it("keeps comps out of the sales numbers but counts them through the door", () => {
    renderBoard([
      { ...asha, isMember: true, checkedInCount: 1 },
      dev,
      omCheckedIn,
      mergeFormerBoardGuests(
        [],
        [makeFormerBoardMember({ _key: "jay-patel", firstName: "Jay", lastName: "Patel" })]
      )[0],
    ]);
    // "Former Board" is also every comp's badge — the stat label is the <p>.
    const stat = (label: string) =>
      screen.getAllByText(label).find((el) => el.tagName === "P")?.nextElementSibling
        ?.textContent;

    expect(stat("Tickets Sold")).toBe("2");
    expect(stat("Members")).toBe("1");
    expect(stat("Non-Members")).toBe("1");
    expect(stat("Checked In")).toBe("2");
    expect(stat("Former Board")).toBe("1 / 2");
  });

  it("has no Former Board stat when no one is comped", () => {
    renderBoard([asha]);
    expect(screen.queryByText("Former Board")).not.toBeInTheDocument();
  });
});
