import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendCashOrderConfirmationEmail, sendTicketConfirmationEmail } from "@/lib/ticketEmail";
import { MEMBERSHIP_FROM, REPLY_TO, TICKETS_FROM } from "@/lib/emailSender";
import { ticketQrPng } from "@/lib/ticketQr";
import { muteConsole } from "@/test/console";

const { send, constructed } = vi.hoisted(() => ({ send: vi.fn(), constructed: vi.fn() }));

vi.mock("@/lib/ticketQr", () => ({ ticketQrPng: vi.fn() }));
const QR_PNG = Buffer.from("fake-png");

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
  vi.mocked(ticketQrPng).mockResolvedValue(QR_PNG);
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

  it("includes the door QR code inline when it knows the order", async () => {
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    await sendTicketConfirmationEmail({ ...details, recordId: "recAAAAAAAAAAAAAA", eventId: "event-1" });

    expect(ticketQrPng).toHaveBeenCalledWith("recAAAAAAAAAAAAAA", "event-1");
    const msg = send.mock.calls[0][0];
    expect(msg.attachments).toEqual([
      { filename: "ticket-qr.png", content: QR_PNG, contentId: "ticket-qr" },
    ]);
    expect(msg.html).toContain('src="cid:ticket-qr"');
    expect(msg.text).toContain("Show the QR code in this email at the door.");
    expect(msg.text).not.toContain("give your name");
  });

  it("sends without a QR code when it doesn't know the order", async () => {
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    await sendTicketConfirmationEmail(details);

    expect(ticketQrPng).not.toHaveBeenCalled();
    const msg = send.mock.calls[0][0];
    expect(msg.attachments).toBeUndefined();
    expect(msg.html).not.toContain("cid:");
    // Never points at a QR code the email doesn't have.
    expect(msg.text).not.toContain("QR code");
    expect(msg.text).toContain("just give your name at the door");
  });

  it("still sends the confirmation when the QR code can't be made", async () => {
    vi.mocked(ticketQrPng).mockRejectedValue(new Error("qr broke"));
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });

    expect(
      await sendTicketConfirmationEmail({ ...details, recordId: "recAAAAAAAAAAAAAA", eventId: "event-1" })
    ).toBe(true);
    expect(send.mock.calls[0][0].attachments).toBeUndefined();
    expect(send.mock.calls[0][0].text).toContain("just give your name at the door");
  });

  it("escapes names in the html body", async () => {
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    await sendTicketConfirmationEmail({ ...details, eventName: "<b>Garba</b> & Dandiya" });
    expect(send.mock.calls[0][0].html).toContain("&lt;b&gt;Garba&lt;/b&gt; &amp; Dandiya");
  });
});

describe("sendCashOrderConfirmationEmail", () => {
  const cash = {
    contactEmail: "dev@example.com",
    firstName: "Dev",
    eventName: "Garba Night",
    ticketTypeName: "General Admission",
    quantity: 3,
    amountDueCents: 4500,
    recordId: "recBBBBBBBBBBBBBB",
    eventId: "event-1",
  };

  it("tells them they're on the list, how much cash to bring, and includes the QR code", async () => {
    send.mockResolvedValue({ data: { id: "email_2" }, error: null });
    expect(await sendCashOrderConfirmationEmail(cash)).toBe(true);

    const msg = send.mock.calls[0][0];
    expect(msg).toMatchObject({
      from: TICKETS_FROM,
      replyTo: REPLY_TO,
      to: "dev@example.com",
      subject: "You're on the list for Garba Night",
    });
    expect(msg.text).toContain("Ticket: 3x General Admission");
    expect(msg.text).toContain("Bring $45.00 in cash to the door.");
    expect(msg.text).toContain("No cash, no entry");
    expect(msg.text).toContain("Show the QR code in this email at the door.");
    expect(msg.text).not.toContain("give your name");
    expect(msg.attachments?.[0]).toMatchObject({ contentId: "ticket-qr" });
  });

  it("reports failure when Resend answers with an error", async () => {
    send.mockResolvedValue({ data: null, error: { name: "validation_error", message: "nope" } });
    expect(await sendCashOrderConfirmationEmail(cash)).toBe(false);
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
