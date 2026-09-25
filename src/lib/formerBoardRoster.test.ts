import { describe, it, expect, vi, beforeEach } from "vitest";
import { sanityFetchSingle } from "../../sanity/lib/client";
import { formerBoardRosterQuery } from "../../sanity/lib/queries";
import { loadFormerBoardRoster, loadFreeFormerBoardMembers } from "@/lib/formerBoardRoster";
import { makeEvent, makeFormerBoardMember } from "@/test/factories";

vi.mock("../../sanity/lib/client", () => ({ sanityFetchSingle: vi.fn(), sanityFetch: vi.fn() }));

const om = makeFormerBoardMember();
const jay = makeFormerBoardMember({ _key: "jay-patel", firstName: "Jay", lastName: "Patel" });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sanityFetchSingle).mockResolvedValue({ members: [om, jay] });
});

describe("loadFormerBoardRoster", () => {
  it("reads the published roster", async () => {
    expect(await loadFormerBoardRoster()).toEqual([om, jay]);
    expect(sanityFetchSingle).toHaveBeenCalledWith(formerBoardRosterQuery);
  });

  it("is empty before the roster is ever published", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(null);
    expect(await loadFormerBoardRoster()).toEqual([]);
    vi.mocked(sanityFetchSingle).mockResolvedValue({ members: null });
    expect(await loadFormerBoardRoster()).toEqual([]);
  });
});

describe("loadFreeFormerBoardMembers", () => {
  it("lists everyone the event hasn't unticked", async () => {
    const event = makeEvent({ formerBoardExcludedKeys: ["jay-patel"] });
    expect(await loadFreeFormerBoardMembers(event)).toEqual([om]);
  });

  it("lists no one, without asking Sanity, when the event has no ticketing", async () => {
    expect(await loadFreeFormerBoardMembers(makeEvent({ ticketingEnabled: false }))).toEqual([]);
    expect(sanityFetchSingle).not.toHaveBeenCalled();
  });
});
