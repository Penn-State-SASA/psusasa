import { afterEach, beforeAll } from "vitest";

// Only component tests (jsdom) need Testing Library. Loading it, and
// react-dom with it, into every Node-environment test file costs seconds
// per file for nothing — so it's imported lazily, per file, only under jsdom.
let cleanup: (() => void) | undefined;

beforeAll(async () => {
  if (typeof window === "undefined") return;
  await import("@testing-library/jest-dom/vitest");
  ({ cleanup } = await import("@testing-library/react"));
});

// Testing Library only auto-unmounts between tests when the runner exposes
// a global afterEach, and this config leaves Vitest's globals off.
afterEach(() => {
  cleanup?.();
});
