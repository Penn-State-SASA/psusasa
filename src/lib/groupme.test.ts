import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addMemberToGroupMe } from "@/lib/groupme";
import { sendAdminAlert } from "@/lib/adminAlert";
import { muteConsole } from "@/test/console";

vi.mock("@/lib/adminAlert");

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const member = {
  firstName: "Asha",
  lastName: "Patel",
  psuEmail: "abc123@psu.edu",
  phone: "+18145551234",
};

/** Runs an add to completion, fast-forwarding through the result polling. */
async function add(metadata: Record<string, string> = member) {
  const done = addMemberToGroupMe(metadata, "pi_123");
  await vi.runAllTimersAsync();
  await done;
}

/** The reason line of the (single) admin alert that was sent. */
function alertReason(): string {
  expect(sendAdminAlert).toHaveBeenCalledTimes(1);
  const [, lines] = vi.mocked(sendAdminAlert).mock.calls[0];
  return lines.find((l) => l.startsWith("Reason: ")) ?? "";
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GROUPME_ACCESS_TOKEN", "gm_token");
  vi.stubEnv("GROUPME_GROUP_ID", "12345");
  muteConsole();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("addMemberToGroupMe", () => {
  it("adds by phone and sends no alert when GroupMe confirms the add", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ response: { results_id: "r1" } }))
      .mockResolvedValueOnce(json({ response: { members: [{ user_id: "u1" }] } }));

    await add();

    const [addUrl, init] = fetchMock.mock.calls[0];
    expect(String(addUrl)).toContain("/groups/12345/members/add");
    expect(JSON.parse(String(init?.body))).toEqual({
      members: [{ nickname: "Asha Patel", phone_number: "+18145551234" }],
    });
    expect(String(fetchMock.mock.calls[1][0])).toContain("/members/results/r1");
    expect(sendAdminAlert).not.toHaveBeenCalled();
  });

  it("falls back to email when there is no phone", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ response: { results_id: "r1" } }))
      .mockResolvedValueOnce(json({ response: { members: [{ user_id: "u1" }] } }));

    await add({ ...member, phone: "" });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.members[0]).toEqual({ nickname: "Asha Patel", email: "abc123@psu.edu" });
  });

  it("keeps polling while GroupMe says the add is still processing", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ response: { results_id: "r1" } }))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ response: { members: [{ user_id: "u1" }] } }));

    await add();

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(sendAdminAlert).not.toHaveBeenCalled();
  });

  it("asks the board for a manual invite when the person has no GroupMe account", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ response: { results_id: "r1" } }))
      .mockResolvedValueOnce(json({ response: { members: [] } }));

    await add();

    expect(alertReason()).toMatch(/likely don't have a GroupMe account/);
    expect(vi.mocked(sendAdminAlert).mock.calls[0][0]).toBe(
      "Manual GroupMe invite needed: Asha Patel"
    );
  });

  it("gives up and alerts after five still-processing polls", async () => {
    fetchMock.mockResolvedValueOnce(json({ response: { results_id: "r1" } }));
    fetchMock.mockResolvedValue(json({}, 503));

    await add();

    expect(fetchMock).toHaveBeenCalledTimes(1 + 5);
    expect(alertReason()).toMatch(/did not attach the user/);
  });

  it("alerts when GroupMe rejects the add", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));
    await add();
    expect(alertReason()).toBe("Reason: GroupMe add returned 401: Unauthorized");
  });

  it("alerts when the add succeeds but returns nothing to poll", async () => {
    fetchMock.mockResolvedValueOnce(json({ response: {} }));
    await add();
    expect(alertReason()).toMatch(/no results_id/);
  });

  it("alerts on a network failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await add();
    expect(alertReason()).toBe("Reason: Network error calling GroupMe: fetch failed");
  });

  it("alerts, without calling GroupMe, when the person has neither phone nor email", async () => {
    await add({ firstName: "Asha", lastName: "Patel", phone: "", psuEmail: "" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(alertReason()).toMatch(/no phone or email/);
  });

  it("alerts, without calling GroupMe, when the server isn't configured", async () => {
    vi.stubEnv("GROUPME_GROUP_ID", "");
    await add();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(alertReason()).toMatch(/Server misconfigured/);
  });
});
