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
        status={{ tone: "ok", message: "✓ Priya Shah checked in" }}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("✓ Priya Shah checked in");
    await userEvent.setup().click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
