import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendTicketConfirmationEmail } from "@/lib/ticketEmail";
import { MEMBERSHIP_FROM, REPLY_TO, TICKETS_FROM } from "@/lib/emailSender";
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

const details = {
  contactEmail: "asha@example.com",
  firstName: "Asha",
  eventName: "Diwali Night",
  ticketTypeName: "General Admission",
  quantity: 2,
  amountPaidCents: 2573,
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

describe("sendTicketConfirmationEmail", () => {
  it("sends the confirmation and reports success", async () => {
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    expect(await sendTicketConfirmationEmail(details)).toBe(true);

    const msg = send.mock.calls[0][0];
    expect(msg).toMatchObject({
      from: TICKETS_FROM,
      replyTo: REPLY_TO,
      to: "asha@example.com",
      subject: "Your ticket to Diwali Night is confirmed!",
    });
    expect(msg.text).toContain("Hi Asha,");
    expect(msg.text).toContain("Ticket: 2x General Admission");
    expect(msg.text).toContain("Amount paid: $25.73");
  });

  it("reports failure when Resend answers with an error instead of throwing", async () => {
    // The SDK resolves { data: null, error } on a 403 — this is how every
    // confirmation failed silently for weeks while the code assumed success.
    send.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "The psusasa.com domain is not verified" },
    });
    expect(await sendTicketConfirmationEmail(details)).toBe(false);
  });

  it("reports failure, without throwing, when the send throws", async () => {
    send.mockRejectedValue(new Error("socket hang up"));
    expect(await sendTicketConfirmationEmail(details)).toBe(false);
  });

  it("doesn't try to send without an API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendTicketConfirmationEmail(details)).toBe(false);
    expect(constructed).not.toHaveBeenCalled();
  });

  it("doesn't try to send an order with no contact email", async () => {
    expect(await sendTicketConfirmationEmail({ ...details, contactEmail: "" })).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("greets without a name when none was given", async () => {
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    await sendTicketConfirmationEmail({ ...details, firstName: "  " });
    expect(send.mock.calls[0][0].text).toMatch(/^Hi,\n/);
  });
});

describe("sender addresses", () => {
  it("both send from the Resend-verified psusasa.com domain", () => {
    // Any other domain (including onboarding@resend.dev) 403s for every
    // recipient except the Resend account owner.
    expect(TICKETS_FROM).toMatch(/@psusasa\.com>$/);
    expect(MEMBERSHIP_FROM).toMatch(/@psusasa\.com>$/);
  });
});
