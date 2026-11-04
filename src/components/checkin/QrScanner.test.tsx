// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QrScanner from "@/components/checkin/QrScanner";

// What the camera is pointed at right now; the decoder just reports it.
const camera = vi.hoisted(() => ({ code: null as string | null }));
vi.mock("jsqr", () => ({
  default: () => (camera.code ? { data: camera.code } : null),
}));

function stubMediaDevices(value: unknown) {
  Object.defineProperty(navigator, "mediaDevices", { value, configurable: true });
}

afterEach(() => {
  stubMediaDevices(undefined);
});

describe("QrScanner", () => {
  it("tells staff to use search when camera access is refused", async () => {
    stubMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")),
    });
    render(<QrScanner onDetect={vi.fn()} onClose={vi.fn()} status={null} />);

    expect(
      await screen.findByText("Camera blocked. Allow camera access for this site, or use search.")
    ).toBeInTheDocument();
  });

  it("explains when the browser can't open a camera at all", async () => {
    // e.g. the board opened over plain http, where browsers hide the camera.
    stubMediaDevices(undefined);
    render(<QrScanner onDetect={vi.fn()} onClose={vi.fn()} status={null} />);

    expect(
      await screen.findByText("This browser can't open the camera here. Use search instead.")
    ).toBeInTheDocument();
  });

  it("shows the last scan's result and closes on request", async () => {
    stubMediaDevices({ getUserMedia: vi.fn(() => new Promise(() => {})) });
    const onClose = vi.fn();
    render(
      <QrScanner
        onDetect={vi.fn()}
        onClose={onClose}
        status={{ id: 1, tone: "ok", message: "✓ Priya Shah checked in" }}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("✓ Priya Shah checked in");
    await userEvent.setup().click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("flashes the screen in the result's colour, again for each new scan", () => {
    stubMediaDevices({ getUserMedia: vi.fn(() => new Promise(() => {})) });
    const props = { onDetect: vi.fn(), onClose: vi.fn() };
    const { rerender } = render(
      <QrScanner {...props} status={{ id: 1, tone: "ok", message: "✓ Priya Shah checked in" }} />
    );

    const first = screen.getByTestId("scan-flash");
    expect(first).toHaveClass("bg-green-500");
    expect(screen.getByTestId("scan-guide")).toHaveClass("border-green-500");

    // Same result twice in a row still replays the flash (a fresh element).
    rerender(
      <QrScanner {...props} status={{ id: 2, tone: "warn", message: "Already checked in: Priya Shah" }} />
    );
    const second = screen.getByTestId("scan-flash");
    expect(second).not.toBe(first);
    expect(second).toHaveClass("bg-amber-400");

    rerender(<QrScanner {...props} status={{ id: 3, tone: "error", message: "Not a SASA ticket" }} />);
    expect(screen.getByTestId("scan-flash")).toHaveClass("bg-red-600");
  });

  it("doesn't flash before anything is scanned", () => {
    stubMediaDevices({ getUserMedia: vi.fn(() => new Promise(() => {})) });
    render(<QrScanner onDetect={vi.fn()} onClose={vi.fn()} status={null} />);

    expect(screen.queryByTestId("scan-flash")).not.toBeInTheDocument();
  });

  it("shows a staff prompt in place of the status line", () => {
    stubMediaDevices({ getUserMedia: vi.fn(() => new Promise(() => {})) });
    render(
      <QrScanner
        onDetect={vi.fn()}
        onClose={vi.fn()}
        status={{ id: 1, tone: "ok", message: "✓ Priya Shah checked in" }}
      >
        <p>How many are here now?</p>
      </QrScanner>
    );

    expect(screen.getByText("How many are here now?")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  describe("scan loop", () => {
    const FRAME_MS = 200;
    let nextFrame: FrameRequestCallback | null;
    let clock: number;

    // Runs the camera for this long with `code` in view (null: nothing).
    function point(code: string | null, forMs = FRAME_MS) {
      camera.code = code;
      for (let elapsed = 0; elapsed < forMs; elapsed += FRAME_MS) {
        clock += FRAME_MS;
        const run = nextFrame!;
        nextFrame = null;
        run(clock);
      }
    }

    beforeEach(() => {
      camera.code = null;
      clock = 1_000_000;
      nextFrame = null;
      vi.spyOn(Date, "now").mockImplementation(() => clock);
      vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => {
        nextFrame = run;
        return 1;
      });
      vi.stubGlobal("cancelAnimationFrame", vi.fn());
      stubMediaDevices({ getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) });
      vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
      vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(4);
      vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(640);
      vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(480);
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      } as never);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    async function startScanner() {
      const onDetect = vi.fn();
      const view = (prompt?: string) => (
        <QrScanner onDetect={onDetect} onClose={vi.fn()} status={null}>
          {prompt ? <p>{prompt}</p> : null}
        </QrScanner>
      );
      const { rerender } = render(view());
      await waitFor(() => expect(nextFrame).not.toBeNull());
      return {
        onDetect,
        openPrompt: () => rerender(view("How many are here now?")),
        closePrompt: () => rerender(view()),
      };
    }

    it("fires once for a code held in view, and again once it's been away", async () => {
      const { onDetect } = await startScanner();

      point("guest-a", 5000);
      expect(onDetect.mock.calls).toEqual([["guest-a"]]);

      point(null, 3200);
      point("guest-a");
      expect(onDetect.mock.calls).toEqual([["guest-a"], ["guest-a"]]);
    });

    it("scans the next guest's code as soon as a prompt closes", async () => {
      const { onDetect, openPrompt, closePrompt } = await startScanner();
      point("guest-a");
      openPrompt();

      point("guest-b", 1000);
      expect(onDetect.mock.calls).toEqual([["guest-a"]]);

      closePrompt();
      point("guest-b", 1000);
      expect(onDetect.mock.calls).toEqual([["guest-a"], ["guest-b"]]);
    });

    it("doesn't re-fire the prompt's own code, however long staff took", async () => {
      const { onDetect, openPrompt, closePrompt } = await startScanner();
      point("guest-a");
      openPrompt();

      point("guest-a", 10_000);
      closePrompt();
      point("guest-a", 1000);

      expect(onDetect.mock.calls).toEqual([["guest-a"]]);
    });
  });
});
