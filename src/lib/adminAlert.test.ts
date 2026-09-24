import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatPrice, sendAdminAlert } from "@/lib/adminAlert";
import { MEMBERSHIP_FROM, REPLY_TO } from "@/lib/emailSender";
import { muteConsole } from "@/test/console";

const { send, constructed } = vi.hoisted(() => ({ send: vi.fn(), constructed: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
    constructor(apiKey: string) {
      constructed(apiKey);
    }
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("ADMIN_NOTIFICATION_EMAIL", "board@example.com");
  muteConsole();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendAdminAlert", () => {
  it("emails the board's inbox, one line per entry", async () => {
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    expect(await sendAdminAlert("Subject", ["line one", "", "line two"])).toBe(true);
    expect(send).toHaveBeenCalledWith({
      from: MEMBERSHIP_FROM,
      replyTo: REPLY_TO,
      to: "board@example.com",
      subject: "Subject",
      text: "line one\n\nline two",
    });
  });

  it("reports failure when Resend answers with an error instead of throwing", async () => {
    send.mockResolvedValue({ data: null, error: { name: "forbidden", message: "403" } });
    expect(await sendAdminAlert("Subject", ["body"])).toBe(false);
  });

  it("reports failure, without throwing, when the send throws", async () => {
    // Callers are fulfilling a payment; an alert failure must not fail it.
    send.mockRejectedValue(new Error("network down"));
    expect(await sendAdminAlert("Subject", ["body"])).toBe(false);
  });

  it.each([
    ["RESEND_API_KEY"],
    ["ADMIN_NOTIFICATION_EMAIL"],
  ])("doesn't try to send when %s is unset", async (name) => {
    vi.stubEnv(name, "");
    expect(await sendAdminAlert("Subject", ["body"])).toBe(false);
    expect(constructed).not.toHaveBeenCalled();
  });
});

describe("formatPrice", () => {
  it("formats cents as dollars with two decimals", () => {
    expect(formatPrice(3500)).toBe("$35.00");
    expect(formatPrice(2573)).toBe("$25.73");
    expect(formatPrice(0)).toBe("$0.00");
  });
});
