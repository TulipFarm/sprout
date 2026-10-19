import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

/** Sets the docs color mode explicitly; the page starts with no class when it follows the system. */
async function colorMode(
  page: import("@playwright/test").Page,
  mode: "light" | "dark",
) {
  const toggle = page.getByRole("button", { name: "Dark mode", exact: true });
  const html = page.locator("html");
  for (let attempt = 0; attempt < 2; attempt++) {
    if (await html.evaluate((el, value) => el.classList.contains(value), mode))
      break;
    await toggle.click();
  }
  await expect(html).toHaveClass(new RegExp(`\\b${mode}\\b`));
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

for (const [route, count] of [
  ["/components/badge/", 2],
  ["/components/button/", 4],
  ["/components/sidebar/", 2],
  ["/installation/", 3],
  ["/theming/", 2],
] as const) {
  test(`highlighted code is readable in both themes and on mobile: ${route}`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
    const blocks = page.locator("sprout-code-block");
    // Other component pages add examples over time, so these are minimums.
    expect(await blocks.count()).toBeGreaterThanOrEqual(count);
    await expect(blocks.locator("button")).toHaveCount(await blocks.count());
    const token = blocks.first().locator("pre span[style]").first();
    let lightColor = "";
    for (const mode of ["light", "dark"]) {
      await colorMode(page, mode as "light" | "dark");
      const color = await token.evaluate(
        (node) => getComputedStyle(node).color,
      );
      if (mode === "light") lightColor = color;
      else expect(color).not.toBe(lightColor);
      const results = await new AxeBuilder({ page })
        .include("sprout-code-block")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(blocks.first().locator("button")).toHaveCSS(
      "min-height",
      "44px",
    );
    await expect(blocks.first().locator("pre")).toHaveCSS("overflow-x", "auto");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(blocks.first().locator("button")).toHaveCSS(
      "transition-duration",
      "0s",
    );
  });
}

test("copy writes the exact source, works with the keyboard, and resets", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/components/sidebar/");
  const block = page.getByRole("group", { name: "Sidebar usage", exact: true });
  const button = block.getByRole("button", { name: "Copy Sidebar usage code" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveText("Copied");
  await expect(block.getByRole("status")).toHaveText(
    "Code copied to clipboard.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await block.getAttribute("data-code"),
  );
  await expect(block.locator(".copied-icon")).toBeVisible();
  await expect(block.locator(".copy-icon")).not.toBeVisible();
  await expect(button).toHaveText("Copy");
  await button.click();
  await expect(button).toHaveText("Copied");
});

for (const failure of ["denied", "unavailable"]) {
  test(`clipboard ${failure} shows an error and allows retry`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value:
          mode === "unavailable"
            ? undefined
            : {
                writeText: () =>
                  Promise.reject(
                    new DOMException("Permission denied", "NotAllowedError"),
                  ),
              },
      });
    }, failure);
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/installation/");
    const block = page.locator("sprout-code-block").first();
    const button = block.getByRole("button");
    await button.click();
    await expect(button).toHaveText("Try again");
    await expect(block.getByRole("status")).toHaveText(
      "Copy failed. Select the code and copy it manually.",
    );
    expect(
      errors.some((message) =>
        message.includes("Could not copy the code example."),
      ),
    ).toBe(true);
    await expect(
      page.locator("sprout-code-block").nth(1).getByRole("status"),
    ).toBeEmpty();
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async () => {} },
      });
    });
    await button.click();
    await expect(button).toHaveText("Copied");
  });
}

test("highlighting is static and source remains readable without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto("/installation/");
    await expect(page.locator("sprout-code-block")).toHaveCount(3);
    await expect(page.locator("pre").first()).toContainText(
      "pnpm add @tulipfarm/sprout",
    );
    expect(await page.locator("pre span[style]").count()).toBeGreaterThan(10);
    await expect(page.locator(".code-copy").first()).not.toBeVisible();
  } finally {
    await context.close();
  }
});

/* Sprout CodeBlock component (/components/code-block/) ---------------------- */

const componentRoute = "/components/code-block/";
const recipeIds = [
  "playground",
  "variant-inline",
  "variant-file",
  "chat-response",
  "canvas-code",
  "workflow-step",
  "plain-text",
  "file-explorer",
  "webhook",
];

async function openComponentPage(page: import("@playwright/test").Page) {
  await page.goto(componentRoute);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const recipe = (page: import("@playwright/test").Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`code block component ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await openComponentPage(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await colorMode(page, mode as "light" | "dark");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const blocks = page.locator('[data-slot="code-block"]');
        expect(await blocks.count()).toBeGreaterThanOrEqual(12);
        for (const block of await blocks.all()) {
          expect(
            await block.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
          expect(
            await block.evaluate((el) => {
              const frame = el
                .closest("[data-recipe]")!
                .getBoundingClientRect();
              const own = el.getBoundingClientRect();
              return own.left >= frame.left - 1 && own.right <= frame.right + 1;
            }),
          ).toBe(true);
          const header = block.locator(".sprout-code-block-header");
          expect(
            await header.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .include("main")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await testInfo.attach(`code-block-${theme}-${mode}-${width}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: "image/png",
        });
        for (const id of recipeIds) {
          await testInfo.attach(`code-block-${id}-${theme}-${mode}-${width}`, {
            body: await recipe(page, id).screenshot(),
            contentType: "image/png",
          });
        }
      });
    }
  }
}

test("code block syntax colors follow the theme tokens", async ({ page }) => {
  await openComponentPage(page);
  const keyword = recipe(page, "workflow-step")
    .locator(".sprout-syntax-keyword")
    .first();
  const colors: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    await colorMode(page, mode);
    colors.push(await keyword.evaluate((node) => getComputedStyle(node).color));
  }
  expect(colors[0]).not.toBe(colors[1]);
  const plain = recipe(page, "plain-text").locator("pre code");
  await expect(plain.locator("span")).toHaveCount(0);
  await expect(
    recipe(page, "plain-text").locator(".sprout-code-block-gutter"),
  ).toHaveCount(0);
});

test("code block copy works from the keyboard, announces, and resets", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openComponentPage(page);
  const step = recipe(page, "workflow-step");
  const button = step.getByRole("button", {
    name: "Copy score_lead.py",
    exact: true,
  });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveText("Copied");
  await expect(button).toBeFocused();
  const block = step.locator('[data-slot="code-block"]').nth(1);
  await expect(block.getByRole("status")).toHaveText(
    "Code copied to clipboard.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'score = 0\nif lead["replied"]:\n    score += 40\nscore += min(lead["seats"], 50)\nreturn {"score": score}',
  );
  await expect(button).toHaveText("Copy", { timeout: 4000 });
  await expect(block.getByRole("status")).toBeEmpty();
});

test("code block shows an alert when the clipboard is blocked and retries", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openComponentPage(page);
  const playground = recipe(page, "playground");
  await chooseOption(page, "Clipboard", "Clipboard blocked");
  const button = playground.getByRole("button", { name: "Copy lead-score.ts" });
  await button.click();
  const alert = playground.getByRole("alert");
  await expect(alert).toHaveText(
    "Clipboard unavailable. Select the code to copy it, or try Copy again.",
  );
  await expect(button).toHaveText("Copy");
  await expect(button).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(alert).toHaveCSS("animation-name", "none");
});

test("code block reports a missing clipboard API", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  });
  await openComponentPage(page);
  const webhook = recipe(page, "webhook");
  await webhook.getByRole("button", { name: "Copy curl example" }).click();
  await expect(webhook.getByRole("alert")).toBeVisible();
});

test("code block playground covers every variant, language, and toggle", async ({
  page,
}) => {
  await openComponentPage(page);
  const playground = recipe(page, "playground");
  const block = playground.locator('[data-slot="code-block"]');
  await expect(block).toHaveAttribute("data-variant", "inline");
  await chooseOption(page, "Variant", "File");
  await expect(block).toHaveAttribute("data-variant", "file");
  const stage = playground.locator(".code-demo-stage");
  expect(
    await block.evaluate(
      (el) =>
        Math.abs(
          el.getBoundingClientRect().height - el.parentElement!.clientHeight,
        ) <= 1,
    ),
  ).toBe(true);
  for (const [label, language, filename] of [
    ["JSON", "json", "fictional-garden.json"],
    ["JavaScript", "javascript", "calculate.js"],
    ["Python", "python", "summarize.py"],
    ["SQL", "sql", "weekly-signups.sql"],
    ["TypeScript", "typescript", "lead-score.ts"],
  ] as const) {
    await chooseOption(page, "Language", label);
    await expect(block).toHaveAttribute("data-language", language);
    await expect(block.locator(".sprout-code-block-label")).toHaveText(
      filename,
    );
    expect(
      await block.locator(".sprout-code-block-syntax span").count(),
    ).toBeGreaterThan(2);
  }
  for (const [label, language, filename] of [
    ["Rust", "rust", "src/main.rs"],
    ["Markdown", "markdown", "README.md"],
    ["Dockerfile", "docker", "Dockerfile"],
  ] as const) {
    await chooseOption(page, "Language", label);
    await expect(block).toHaveAttribute("data-language", language);
    await expect(block.locator(".sprout-code-block-label")).toHaveText(
      filename,
    );
    await expect(
      block
        .locator(".sprout-code-block-syntax [class^='sprout-syntax-']")
        .first(),
    ).toBeVisible();
  }
  await chooseOption(page, "Variant", "Preview");
  await expect(block).toHaveAttribute("data-variant", "preview");
  await expect(block.getByRole("button", { name: /^Copy/ })).toHaveCount(0);
  await chooseOption(page, "Variant", "Inline");
  await chooseOption(page, "Language", "Plain text");
  await expect(block.locator(".sprout-code-block-syntax")).toHaveCount(0);
  await playground.getByRole("switch", { name: "Line numbers" }).click();
  await expect(block.locator(".sprout-code-block-gutter")).toHaveCount(0);
  await playground.getByRole("switch", { name: "Filename" }).click();
  await expect(block.locator(".sprout-code-block-label")).toHaveText(
    "Plain text",
  );
  await expect(block.getByRole("button", { name: "Copy code" })).toBeVisible();
  await expect(
    block.getByRole("region", { name: "Plain text code" }),
  ).toBeVisible();
  await expect(stage).toBeVisible();
});

test("code block regions scroll with the keyboard and cap inline height", async ({
  page,
}) => {
  await openComponentPage(page);
  const canvas = recipe(page, "canvas-code");
  const region = canvas.getByRole("region", { name: "Funnel stages" });
  await expect(region).toHaveCSS("max-height", "384px");
  await region.focus();
  await expect(region).toBeFocused();
  await expect(region).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => region.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  const gutter = region.locator(".sprout-code-block-gutter");
  await expect(gutter).toHaveAttribute("aria-hidden", "true");
  await expect(gutter).toContainText("31");

  await page.setViewportSize({ width: 390, height: 844 });
  const webhook = recipe(page, "webhook");
  const curl = webhook.getByRole("region", { name: "curl example" });
  expect(await curl.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  await curl.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => curl.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await expect(curl.locator(".sprout-code-block-gutter")).toHaveCount(0);
  await webhook.getByRole("button", { name: "Bearer token" }).click();
  await expect(curl).toContainText(
    "Authorization: Bearer $TULIPFARM_WEBHOOK_KEY",
  );
});

test("code block file pane remounts per file, truncates paths, and shows the empty note", async ({
  page,
}) => {
  await openComponentPage(page);
  const explorer = recipe(page, "file-explorer");
  const long =
    "memory/customers/enterprise/renewal-playbooks/northwind-traders-q4.md";
  await explorer.getByRole("button", { name: long, exact: true }).click();
  const block = explorer.locator('[data-slot="code-block"]');
  await expect(block).toHaveAttribute("data-variant", "file");
  const label = block.locator(".sprout-code-block-label");
  await expect(label).toHaveText(long);
  expect(await label.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  const fileButton = explorer.getByRole("button", { name: long, exact: true });
  await expect(fileButton.locator(".code-demo-file-name")).toHaveCSS(
    "text-overflow",
    "ellipsis",
  );
  expect(
    await fileButton.evaluate(
      (el) =>
        el.getBoundingClientRect().right <=
        el.closest("ul")!.getBoundingClientRect().right + 1,
    ),
  ).toBe(true);
  await expect(
    block.getByRole("button", { name: `Copy ${long}` }),
  ).toBeVisible();
  await expect(block.getByRole("region", { name: long })).toContainText(
    "Renewal owner: Priya",
  );
  await expect(explorer.getByText("This file is empty.")).toHaveCount(0);
  await explorer.getByRole("button", { name: "notes/scratch.md" }).click();
  await expect(explorer.getByText("This file is empty.")).toBeVisible();
  await expect(block.locator(".sprout-code-block-gutter")).toHaveText("1");
});

test("code block chat reply uses fence languages without filenames", async ({
  page,
}) => {
  await openComponentPage(page);
  const reply = recipe(page, "chat-response");
  const blocks = reply.locator('[data-slot="code-block"]');
  await expect(blocks).toHaveCount(3);
  await expect(blocks.nth(0).locator(".sprout-code-block-label")).toHaveText(
    "SQL",
  );
  await expect(blocks.nth(1).locator(".sprout-code-block-label")).toHaveText(
    "TypeScript",
  );
  await expect(
    blocks.nth(1).locator(".sprout-syntax-keyword").first(),
  ).toHaveText("const");
  await expect(blocks.nth(2).locator(".sprout-code-block-label")).toHaveText(
    "Plain text",
  );
  await expect(blocks.nth(2).locator(".sprout-code-block-syntax")).toHaveCount(
    0,
  );
  await expect(reply.getByRole("button", { name: "Copy code" })).toHaveCount(3);
});

test("code block copy button is a 44px target on touch screens", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await openComponentPage(page);
    await expect(
      recipe(page, "webhook").getByRole("button", {
        name: "Copy curl example",
      }),
    ).toHaveCSS("min-height", "44px");
  } finally {
    await context.close();
  }
});
