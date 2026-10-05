// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QrScanner from "@/components/checkin/QrScanner";

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
});
