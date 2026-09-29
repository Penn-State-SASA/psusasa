import { describe, it, expect } from "vitest";
import { middleware } from "@/middleware";
import { CHECKIN_COOKIE_NAME, createSessionToken } from "@/lib/checkinAuth";
import { getRequest } from "@/test/request";

// NextResponse.next() is how middleware lets a request through.
function passedThrough(res: Response): boolean {
  return res.headers.get("x-middleware-next") === "1";
}

async function sessionCookie(events: string[]): Promise<string> {
  return `${CHECKIN_COOKIE_NAME}=${await createSessionToken(events)}`;
}

describe("check-in middleware", () => {
  it("sends a signed-out visitor on a board page to that event's login", async () => {
    const res = await middleware(getRequest("/checkin/event-a"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/checkin/event-a/login");
  });

  it("answers a signed-out API call with 401 JSON rather than a redirect", async () => {
    const res = await middleware(getRequest("/api/checkin/event-a/tickets"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Not authorized" });
  });

  it("lets a session for an event through to that event's board and API", async () => {
    const cookie = await sessionCookie(["event-a"]);
    expect(passedThrough(await middleware(getRequest("/checkin/event-a", { cookie })))).toBe(true);
    expect(
      passedThrough(await middleware(getRequest("/api/checkin/event-a/mark", { cookie })))
    ).toBe(true);
  });

  it("does not let one event's session into another event", async () => {
    // Each event has its own door password; knowing one must not unlock others.
    const cookie = await sessionCookie(["event-a"]);
    const page = await middleware(getRequest("/checkin/event-b", { cookie }));
    expect(page.status).toBe(307);
    const api = await middleware(getRequest("/api/checkin/event-b/tickets", { cookie }));
    expect(api.status).toBe(401);
  });

  it("rejects a tampered session cookie", async () => {
    const token = await createSessionToken(["event-a"]);
    const cookie = `${CHECKIN_COOKIE_NAME}=${token.slice(0, -2)}xx`;
    const res = await middleware(getRequest("/checkin/event-a", { cookie }));
    expect(res.status).toBe(307);
  });

  it("never gates the login page, which would be a redirect loop", async () => {
    expect(passedThrough(await middleware(getRequest("/checkin/event-a/login")))).toBe(true);
    expect(passedThrough(await middleware(getRequest("/checkin/event-a/login/")))).toBe(true);
  });

  it("leaves the public event picker open", async () => {
    expect(passedThrough(await middleware(getRequest("/checkin")))).toBe(true);
  });

  it("treats a trailing slash on a board URL the same as without", async () => {
    const res = await middleware(getRequest("/checkin/event-a/"));
    expect(res.status).toBe(307);
  });
});
