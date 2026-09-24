import { describe, it, expect } from "vitest";
import { POST } from "./route";
import { CHECKIN_COOKIE_NAME } from "@/lib/checkinAuth";

describe("POST /api/checkin-logout", () => {
  it("expires the check-in session cookie", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const header = res.headers.get("set-cookie") ?? "";
    expect(header).toContain(`${CHECKIN_COOKIE_NAME}=;`);
    expect(header).toMatch(/Max-Age=0/i);
  });
});
