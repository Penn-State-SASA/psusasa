import { Resend } from "resend";
import { REPLY_TO, TICKETS_FROM } from "@/lib/emailSender";
import { ticketQrPng } from "@/lib/ticketQr";

interface TicketQrIds {
  /** Airtable record id of the order — with eventId, adds the door QR code. */
  recordId?: string | null;
  eventId?: string;
}

interface TicketConfirmationDetails extends TicketQrIds {
  contactEmail: string;
  firstName: string;
  eventName: string;
  ticketTypeName: string;
  quantity: number;
  amountPaidCents: number;
}

interface CashOrderConfirmationDetails extends TicketQrIds {
  contactEmail: string;
  firstName: string;
  eventName: string;
  ticketTypeName: string;
  quantity: number;
  amountDueCents: number;
}

const QR_CONTENT_ID = "ticket-qr";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function greetingFor(firstName: string): string {
  return firstName.trim() ? `Hi ${firstName.trim()},` : "Hi,";
}

// The door QR code, as an inline attachment the html body shows via cid:.
// Best-effort: an order still gets its confirmation without a QR code (the
// door can always find them by name), never no email because of one.
async function qrAttachment(ids: TicketQrIds) {
  if (!ids.recordId || !ids.eventId) return null;
  try {
    return {
      filename: "ticket-qr.png",
      content: await ticketQrPng(ids.recordId, ids.eventId),
      contentId: QR_CONTENT_ID,
    };
  } catch (err) {
    console.error(`Ticket QR code failed for ${ids.recordId} — sending without it:`, err);
    return null;
  }
}

// Plain-text lines become the html body too, with the QR code on top.
function htmlBody(lines: string[], withQr: boolean): string {
  const qr = withQr
    ? `<p><img src="cid:${QR_CONTENT_ID}" alt="Your ticket QR code" width="240" height="240" style="display:block" /></p>`
    : "";
  const body = lines.map((l) => (l ? escapeHtml(l) : "")).join("<br>\n");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">${qr}<p>${body}</p></div>`;
}

// Only point at a QR code the email actually has — if it couldn't be made,
// fall back to the name-at-the-door wording the emails used before QR codes.
function doorLine(hasQr: boolean): string {
  return hasQr
    ? "Show the QR code in this email at the door."
    : "No need to bring anything printed — just give your name at the door and we'll check you in.";
}

async function sendTicketEmail(
  kind: string,
  to: string,
  subject: string,
  buildLines: (hasQr: boolean) => string[],
  ids: TicketQrIds
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`Cannot send ${kind} email — RESEND_API_KEY not set.`);
    return false;
  }
  if (!to) {
    console.error(`Cannot send ${kind} email — no contact email on order.`);
    return false;
  }

  const resend = new Resend(apiKey);
  const qr = await qrAttachment(ids);
  const lines = buildLines(qr !== null);

  try {
    // The SDK resolves with { data: null, error } on an API error rather
    // than throwing, so the catch below only ever sees network/transport
    // failures — `error` has to be inspected explicitly or every rejected
    // send reads as a success.
    const { data, error } = await resend.emails.send({
      from: TICKETS_FROM,
      replyTo: REPLY_TO,
      to,
      subject,
      text: lines.join("\n"),
      html: htmlBody(lines, qr !== null),
      ...(qr ? { attachments: [qr] } : {}),
    });

    if (error) {
      console.error(`${kind} FAILED for ${to} — ${error.name}: ${error.message}`);
      return false;
    }

    console.log(`${kind} email sent to ${to} (id ${data?.id})`);
    return true;
  } catch (err) {
    console.error(`${kind} FAILED for ${to} — threw:`, err);
    return false;
  }
}

// Card ticket purchases and $0 orders. Best-effort: a failure here is
// logged, not thrown — it must never block fulfillment, which is already
// recorded in Airtable by the time this is called. Returns whether the send
// actually succeeded, so a caller that cares can report real results
// instead of assuming. No caller checks it today; it stays because
// "assumed sent" is precisely what hid the 403 outage.
export async function sendTicketConfirmationEmail(
  details: TicketConfirmationDetails
): Promise<boolean> {
  return sendTicketEmail(
    "Ticket confirmation",
    details.contactEmail,
    `Your ticket to ${details.eventName} is confirmed!`,
    (hasQr) => [
      greetingFor(details.firstName),
      "",
      "Your ticket purchase is confirmed:",
      "",
      `Event: ${details.eventName}`,
      `Ticket: ${details.quantity}x ${details.ticketTypeName}`,
      `Amount paid: ${formatPrice(details.amountPaidCents)}`,
      "",
      doorLine(hasQr),
      "",
      "See you there!",
      "SASA",
    ],
    details
  );
}

// Unpaid cash orders — they're on the list, but still owe at the door. Sent
// so they have their QR code and the amount to bring; same best-effort
// contract as the card confirmation above.
export async function sendCashOrderConfirmationEmail(
  details: CashOrderConfirmationDetails
): Promise<boolean> {
  return sendTicketEmail(
    "Cash order confirmation",
    details.contactEmail,
    `You're on the list for ${details.eventName}`,
    (hasQr) => [
      greetingFor(details.firstName),
      "",
      "You're on the list:",
      "",
      `Event: ${details.eventName}`,
      `Ticket: ${details.quantity}x ${details.ticketTypeName}`,
      `Bring ${formatPrice(details.amountDueCents)} in cash to the door.`,
      "",
      doorLine(hasQr),
      "",
      "No cash, no entry — you will not be admitted without payment. Exact",
      "change is recommended; we can't guarantee change will be available at",
      "the door. If the event reaches capacity before you arrive, entry is not",
      "guaranteed for cash orders — card purchases are confirmed in advance.",
      "",
      "See you there!",
      "SASA",
    ],
    details
  );
}
