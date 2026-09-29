import QRCode from "qrcode";
import { ticketQrPayload } from "@/lib/ticketQrPayload";

// Server-side QR images for a ticket: a PNG for the confirmation email and a
// data URL for the confirmation pages. Medium error correction and a quiet
// zone keep it scannable off a cracked or dimmed phone screen.
const OPTIONS = { errorCorrectionLevel: "M", margin: 2, width: 320 } as const;

export function ticketQrPng(recordId: string, eventId: string): Promise<Buffer> {
  return QRCode.toBuffer(ticketQrPayload(recordId, eventId), OPTIONS);
}

export function ticketQrDataUrl(recordId: string, eventId: string): Promise<string> {
  return QRCode.toDataURL(ticketQrPayload(recordId, eventId), OPTIONS);
}

// For confirmation pages and responses: the QR code is a convenience on top
// of an order that's already recorded, so a missing id or a failed render
// means "no QR shown" (they can still give their name), never an error.
export async function ticketQrDataUrlOrNull(
  recordId: string | null | undefined,
  eventId: string | null | undefined
): Promise<string | null> {
  if (!recordId || !eventId) return null;
  try {
    return await ticketQrDataUrl(recordId, eventId);
  } catch (err) {
    console.error(`Ticket QR code failed for ${recordId}:`, err);
    return null;
  }
}
