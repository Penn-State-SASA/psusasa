import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendMembershipConfirmationEmail } from "@/lib/membershipEmail";
import { MEMBERSHIP_FROM, REPLY_TO } from "@/lib/emailSender";
import { sendAdminAlert } from "@/lib/adminAlert";
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
vi.mock("@/lib/adminAlert", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/adminAlert")>()),
  sendAdminAlert: vi.fn(),
}));

const details = {
  psuEmail: "abc123@psu.edu",
  firstName: "Asha",
  amountPaidCents: 3635,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  muteConsole();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendMembershipConfirmationEmail", () => {
  it("sends the welcome email to the PSU address and reports success", async () => {
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    expect(await sendMembershipConfirmationEmail(details)).toBe(true);

    const msg = send.mock.calls[0][0];
    expect(msg).toMatchObject({
      from: MEMBERSHIP_FROM,
      replyTo: REPLY_TO,
      to: "abc123@psu.edu",
      subject: "Welcome to SASA — your membership is confirmed!",
    });
    expect(msg.text).toContain("Hi Asha,");
    expect(msg.text).toContain("Amount paid: $36.35");
    expect(sendAdminAlert).not.toHaveBeenCalled();
  });

  it("reports failure and alerts the board when Resend answers with an error", async () => {
    // The SDK resolves { data: null, error } rather than throwing.
    send.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "The psusasa.com domain is not verified" },
    });
    expect(await sendMembershipConfirmationEmail(details)).toBe(false);
    expect(sendAdminAlert).toHaveBeenCalledWith(
      "Welcome email not sent to new member abc123@psu.edu",
      expect.arrayContaining([
        "Reason: Resend rejected it (validation_error: The psusasa.com domain is not verified)",
        "PSU email: abc123@psu.edu",
        "Amount paid: $36.35",
      ])
    );
  });

  it("reports failure and alerts the board, without throwing, when the send throws", async () => {
    send.mockRejectedValue(new Error("socket hang up"));
    expect(await sendMembershipConfirmationEmail(details)).toBe(false);
    expect(sendAdminAlert).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["Reason: the send threw (socket hang up)"])
    );
  });

  it("alerts the board instead of sending when the signup has no PSU email", async () => {
    expect(await sendMembershipConfirmationEmail({ ...details, psuEmail: "" })).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(sendAdminAlert).toHaveBeenCalledWith(
      "Welcome email not sent to new member (no PSU email)",
      expect.arrayContaining(["Reason: the signup has no PSU email"])
    );
  });

  it("doesn't try to send, or alert, without an API key", async () => {
    // The alert would go through the same unconfigured Resend account.
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendMembershipConfirmationEmail(details)).toBe(false);
    expect(constructed).not.toHaveBeenCalled();
    expect(sendAdminAlert).not.toHaveBeenCalled();
  });

  it("greets without a name when none was given", async () => {
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    await sendMembershipConfirmationEmail({ ...details, firstName: "  " });
    expect(send.mock.calls[0][0].text).toMatch(/^Hi,\n/);
  });
});
