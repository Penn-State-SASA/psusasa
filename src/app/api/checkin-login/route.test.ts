import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { sanityFetchSingle } from "../../../../sanity/lib/client";
import { CHECKIN_COOKIE_NAME, createSessionToken, verifySessionToken } from "@/lib/checkinAuth";
import { jsonRequest } from "@/test/request";
import { muteConsole } from "@/test/console";

vi.mock("../../../../sanity/lib/client", () => ({ sanityFetchSingle: vi.fn(), sanityFetch: vi.fn() }));

/**
 * Awaits a response that sits behind the route's brute-force delay,
 * fast-forwarding fake time until it settles.
 */
async function settle<T>(pending: Promise<T>): Promise<T> {
  let settled = false;
  pending.then(
    () => (settled = true),
    () => (settled = true)
  );
  while (!settled) {
    await vi.advanceTimersByTimeAsync(250);
    // A real macrotask turn, so request-body streaming can make progress.
    await new Promise((resolve) => setImmediate(resolve));
  }
  return pending;
}

function login(body: Record<string, unknown>, cookie?: string) {
  return POST(jsonRequest("/api/checkin-login", body, { cookie }));
}

function eventWithPassword(checkinPassword?: string) {
  vi.mocked(sanityFetchSingle).mockResolvedValue({ _id: "event-a", checkinPassword });
}

async function eventsInCookie(res: Response): Promise<string[]> {
  const header = res.headers.get("set-cookie") ?? "";
  const token = header.match(new RegExp(`${CHECKIN_COOKIE_NAME}=([^;]*)`))?.[1];
  return verifySessionToken(token);
}

beforeEach(() => {
  vi.resetAllMocks();
  // Only setTimeout and Date: the route's delay is a setTimeout, and faking
  // setImmediate would stall reading the request body.
  vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
  muteConsole();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/checkin-login", () => {
  it.each([
    [{ password: "door" }],
    [{ eventId: "event-a" }],
    [{ eventId: "event-a", password: "" }],
    [{ eventId: 7, password: "door" }],
  ])("rejects %o as incomplete", async (body) => {
    const res = await login(body);
    expect(res.status).toBe(400);
  });

  it("logs in with the event's password and sets an httpOnly session for that event", async () => {
    eventWithPassword("door-pass");
    const res = await login({ eventId: "event-a", password: "door-pass" });

    expect(res.status).toBe(200);
    const header = res.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=lax/i);
    expect(header).toMatch(/Path=\//);
    expect(await eventsInCookie(res)).toEqual(["event-a"]);
  });

  it("rejects a wrong password, sets no session, and answers only after a delay", async () => {
    eventWithPassword("door-pass");
    const started = Date.now();
    const res = await settle(login({ eventId: "event-a", password: "guess" }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Incorrect password." });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(Date.now() - started).toBeGreaterThanOrEqual(1000);
  });

  it("never logs in to an event that has no password set", async () => {
    // Studio only warns when a ticketed event has no password. An empty
    // password must lock the board, not open it to any input.
    eventWithPassword(undefined);
    const res = await settle(login({ eventId: "event-a", password: "anything" }));
    expect(res.status).toBe(401);
  });

  it("rejects an unknown event the same way as a wrong password", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(null);
    const res = await settle(login({ eventId: "nope", password: "door-pass" }));
    expect(res.status).toBe(401);
  });

  it("keeps events already unlocked on this device when unlocking another", async () => {
    // One staffer can run the door for two events on the same phone.
    eventWithPassword("door-pass");
    const existing = `${CHECKIN_COOKIE_NAME}=${await createSessionToken(["event-b"])}`;
    const res = await login({ eventId: "event-a", password: "door-pass" }, existing);
    expect(await eventsInCookie(res)).toEqual(["event-b", "event-a"]);
  });

  it("doesn't carry over events from a forged existing cookie", async () => {
    eventWithPassword("door-pass");
    const res = await login(
      { eventId: "event-a", password: "door-pass" },
      `${CHECKIN_COOKIE_NAME}=forged.token`
    );
    expect(await eventsInCookie(res)).toEqual(["event-a"]);
  });
});
