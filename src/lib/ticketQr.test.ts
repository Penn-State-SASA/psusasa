import { describe, it, expect } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { ticketQrDataUrl, ticketQrDataUrlOrNull, ticketQrPng } from "@/lib/ticketQr";
import { parseTicketQr, ticketQrPayload } from "@/lib/ticketQrPayload";
import { muteConsole } from "@/test/console";

const RECORD = "recAbC123dEf456gH";

/** Draws a QR code's modules as RGBA pixels, the way a camera frame reaches jsQR. */
function rasterize(text: string, scale = 4, margin = 4) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = (modules.size + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) {
      if (!modules.get(y, x)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + margin) * scale + dy) * size + (x + margin) * scale + dx) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
      }
    }
  }
  return { pixels, size };
}

describe("ticket QR codes", () => {
  it("decode, with the board's scanner library, back to the same order", () => {
    // Same encoder settings and scanner as production — catches the two
    // libraries ever disagreeing on the payload.
    const { pixels, size } = rasterize(ticketQrPayload(RECORD, "event-1"));
    const decoded = jsQR(pixels, size, size);
    expect(decoded).not.toBeNull();
    expect(parseTicketQr(decoded!.data)).toEqual({ recordId: RECORD, eventId: "event-1" });
  });

  it("render as a PNG for email and a PNG data URL for pages", async () => {
    const png = await ticketQrPng(RECORD, "event-1");
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(await ticketQrDataUrl(RECORD, "event-1")).toMatch(/^data:image\/png;base64,/);
  });

  it("aren't made without both a record id and an event id", async () => {
    muteConsole();
    expect(await ticketQrDataUrlOrNull(null, "event-1")).toBeNull();
    expect(await ticketQrDataUrlOrNull(RECORD, "")).toBeNull();
    expect(await ticketQrDataUrlOrNull(RECORD, "event-1")).toMatch(/^data:image\/png/);
  });
});
