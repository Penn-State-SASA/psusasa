import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors the "@/*" path in tsconfig.json so tests import modules by the
    // same specifier the app does. Done by hand rather than with
    // vite-tsconfig-paths: that package is ESM-only, this config is loaded as
    // CJS (no "type": "module" in package.json), and one alias isn't worth a
    // dependency. If tsconfig gains more paths, they need adding here too.
    alias: { "@": path.resolve(__dirname, "src") },
  },
  // tsconfig.json has "jsx": "preserve" because Next.js does its own JSX
  // transform. Vite would inherit that and hand untransformed JSX to Node, so
  // component and page tests need the React 17+ automatic runtime set here.
  esbuild: { jsx: "automatic" },
  test: {
    // Node by default: route handlers, middleware, and Web Crypto all run
    // there. Component tests opt into jsdom per file with a
    // `// @vitest-environment jsdom` docblock.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    env: {
      // None of these are real secrets — they only need to be present.
      // checkinAuth throws without CHECKIN_SESSION_SECRET, and a fixed value
      // keeps signatures deterministic.
      CHECKIN_SESSION_SECRET: "test-secret-for-unit-tests-only",
      // Several routes run `new Stripe(process.env.STRIPE_SECRET_KEY!)` at
      // module load. Nothing in the suite reaches the Stripe API.
      STRIPE_SECRET_KEY: "sk_test_unit_tests_only",
      STRIPE_WEBHOOK_SECRET: "whsec_unit_tests_only",
      SANITY_REVALIDATE_SECRET: "revalidate-secret-for-unit-tests-only",
      AIRTABLE_BASE_ID: "appUnitTests",
      AIRTABLE_API_KEY: "patUnitTests",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        // Declarations only — nothing to execute, but v8 counts them as uncovered.
        "src/**/types.ts",
      ],
      // Floors for the code that moves money or grants door access, set just
      // under what the suite reached when they were introduced. Raise them
      // as coverage improves; don't lower them to get a PR through.
      thresholds: {
        "src/lib/**": { lines: 97, statements: 97, functions: 100, branches: 88 },
        "src/app/api/**": { lines: 95, statements: 95, functions: 100, branches: 72 },
        "src/middleware.ts": { lines: 100, statements: 100, functions: 100, branches: 100 },
        "src/components/checkin/CheckinBoard.tsx": {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 85,
        },
      },
    },
  },
});
