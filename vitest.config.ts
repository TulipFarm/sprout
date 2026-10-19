import { resolve } from "node:path";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Set by `pnpm test:visual` so screenshots come from the same Linux browser CI uses.
const wsEndpoint = process.env.SPROUT_BROWSER_WS;

const provider = (contextOptions = {}) =>
  playwright({
    ...(wsEndpoint && {
      connectOptions: { wsEndpoint, exposeNetwork: "<loopback>" },
    }),
    contextOptions,
  });

const browser = (contextOptions = {}) => ({
  enabled: true,
  headless: true,
  viewport: { width: 1280, height: 720 },
  provider: provider(contextOptions),
  instances: [{ browser: "chromium" as const }],
});

export default defineConfig({
  test: {
    maxWorkers: 1,
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
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
          exclude: ["tests/browser/**"],
          setupFiles: ["tests/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["tests/browser/**/*.browser.test.tsx"],
          exclude: [
            "tests/browser/**/*.visual.browser.test.tsx",
            "tests/browser/**/*.touch.browser.test.tsx",
          ],
          setupFiles: ["tests/browser/setup.ts"],
          browser: browser(),
        },
      },
      {
        extends: true,
        test: {
          name: "touch",
          include: ["tests/browser/**/*.touch.browser.test.tsx"],
          setupFiles: ["tests/browser/setup.ts"],
          browser: browser({ hasTouch: true }),
        },
      },
      {
        extends: true,
        test: {
          name: "visual",
          include: ["tests/browser/**/*.visual.browser.test.tsx"],
          setupFiles: ["tests/browser/setup.ts"],
          browser: {
            ...browser({ reducedMotion: "reduce" }),
            expect: {
              toMatchScreenshot: {
                comparatorName: "pixelmatch",
                comparatorOptions: { allowedMismatchedPixelRatio: 0.002 },
                // One Linux baseline per shot: drop the host platform from the name.
                resolveScreenshotPath: ({
                  arg,
                  ext,
                  root,
                  screenshotDirectory,
                  testFileDirectory,
                  testFileName,
                  browserName,
                }) =>
                  resolve(
                    root,
                    testFileDirectory,
                    screenshotDirectory,
                    testFileName,
                    `${arg}-${browserName}${ext}`,
                  ),
              },
            },
          },
        },
      },
    ],
  },
});
