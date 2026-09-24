import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";
import { POST } from "./route";
import { jsonRequest } from "@/test/request";

// revalidatePath needs Next's request context, which a unit test doesn't have.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/revalidate", () => {
  it("refreshes every CMS-driven page when Sanity sends the right secret", async () => {
    const res = await POST(
      jsonRequest("/api/revalidate", { secret: process.env.SANITY_REVALIDATE_SECRET })
    );
    expect(res.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/events", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/eboard", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/gallery", "page");
  });

  it.each([[{ secret: "wrong" }], [{}]])("rejects %o without revalidating", async (body) => {
    const res = await POST(jsonRequest("/api/revalidate", body));
    expect(res.status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
