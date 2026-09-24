import { vi } from "vitest";

// The routes log every failure path, which is right in production and just
// noise in a test run that exercises those paths on purpose.
export function muteConsole() {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
}
