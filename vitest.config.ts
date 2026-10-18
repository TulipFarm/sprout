import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    maxWorkers: 1,
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/sprout/src/**"],
      reporter: ["text-summary", "html", "json-summary"],
      reportsDirectory: ".vitest/coverage",
      reportOnFailure: true,
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
});
