"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export interface ScanStatus {
  tone: "ok" | "warn" | "error";
  message: string;
}

interface QrScannerProps {
  onDetect: (text: string) => void;
  onClose: () => void;
  /** Result of the last scan, shown over the camera. */
  status: ScanStatus | null;
}

// Decoding every frame is wasted battery on a phone held at the door all
// night; a few times a second still feels instant.
const SCAN_INTERVAL_MS = 150;
// The camera keeps seeing a code after it's handled, so the same code only
// fires again once it's been out of view this long.
const REPEAT_WINDOW_MS = 3000;
// Frames are shrunk to this width before decoding — plenty for a phone
// screen held up to the camera, and much faster than full resolution.
const DECODE_WIDTH = 640;

const TONE_CLASSES: Record<ScanStatus["tone"], string> = {
  ok: "bg-green-600 text-white",
  warn: "bg-amber-400 text-sasa-red-900",
  error: "bg-red-600 text-white",
};

// Full-screen camera view for the door check-in board. Uses jsQR rather
// than the browser's BarcodeDetector, which iOS Safari doesn't have.
export default function QrScanner({ onDetect, onClose, status }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // The scan loop starts once; this keeps it calling the board's latest
  // handler, which closes over the latest ticket list.
  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let cancelled = false;
    let lastDecodeAt = 0;
    let lastText = "";
    let lastSeenAt = 0;

    function scan(now: number) {
      frame = requestAnimationFrame(scan);
      if (now - lastDecodeAt < SCAN_INTERVAL_MS) return;
      lastDecodeAt = now;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return;
      const width = Math.min(video.videoWidth, DECODE_WIDTH);
      const height = Math.round((video.videoHeight * width) / video.videoWidth);
      if (!width || !height) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, width, height);
      const code = jsQR(ctx.getImageData(0, 0, width, height).data, width, height, {
        inversionAttempts: "dontInvert",
      });
      if (!code?.data) return;

      const seenAt = Date.now();
      const repeat = code.data === lastText && seenAt - lastSeenAt < REPEAT_WINDOW_MS;
      lastText = code.data;
      lastSeenAt = seenAt;
      if (!repeat) onDetectRef.current(code.data);
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser can't open the camera here. Use search instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch {
        setCameraError("Camera blocked. Allow camera access for this site, or use search.");
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => {
        // Autoplay of a muted inline video is allowed everywhere we care
        // about; if it's refused, the frames just never arrive.
      });
      frame = requestAnimationFrame(scan);
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-label="Scan tickets">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-white">Scan tickets</h2>
        <button
          onClick={onClose}
          className="rounded border-2 border-white/70 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
        >
          Close
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {cameraError ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-base text-white">
            {cameraError}
          </p>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {/* Where to hold the code — decoding isn't limited to this box. */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-xl border-4 border-white/80" />
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="min-h-[4.5rem] px-4 pb-6 pt-3" role="status" aria-live="polite">
        {status ? (
          <p
            className={`rounded-lg px-4 py-3 text-center text-base font-semibold ${TONE_CLASSES[status.tone]}`}
          >
            {status.message}
          </p>
        ) : (
          !cameraError && (
            <p className="text-center text-sm text-white/70">
              Point the camera at the ticket&apos;s QR code.
            </p>
          )
        )}
      </div>
    </div>
  );
}
