// What a ticket's QR code says: which Airtable order it is and which event
// it's for. Deliberately unsigned — record ids are 14 random characters, so
// they can't be guessed, and a scan only ever finds a row that's already on
// that event's check-in board. Pure string handling only, so the board can
// import it in the browser; rendering the image lives in ticketQr.ts.

const PREFIX = "SASA1:";
const RECORD_ID_RE = /^rec[A-Za-z0-9]{14}$/;

export function ticketQrPayload(recordId: string, eventId: string): string {
  return `${PREFIX}${recordId}:${eventId}`;
}

export function parseTicketQr(text: string): { recordId: string; eventId: string } | null {
  if (!text.startsWith(PREFIX)) return null;
  const rest = text.slice(PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep === -1) return null;
  const recordId = rest.slice(0, sep);
  const eventId = rest.slice(sep + 1);
  if (!RECORD_ID_RE.test(recordId) || !eventId) return null;
  return { recordId, eventId };
}
