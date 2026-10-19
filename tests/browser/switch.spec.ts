import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/switch/";

async function openSwitch(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#switch-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

function sample(page: Page, size: string, state: string) {
  return page.getByTestId(`sample-${size}-${state}`).getByRole("switch");
}

async function cssColor(page: Page, value: string) {
  return page.evaluate((color) => {
    const probe = document.createElement("span");
    probe.style.color = color;
    document.body.append(probe);
    const result = getComputedStyle(probe).color;
    probe.remove();
    return result;
  }, value);
}

async function thumbOffset(page: Page, size: string, state: string) {
  const track = await sample(page, size, state).boundingBox();
  const thumb = await sample(page, size, state)
    .locator('[data-slot="switch-thumb"]')
    .boundingBox();
  return thumb!.x - track!.x;
}

// The motion example breathes forever unless reduced motion is requested.
test.use({ reducedMotion: "reduce" });

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`switch ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openSwitch(page);
        await page.evaluate(
          (value) =>
            document.documentElement.setAttribute("data-sprout-theme", value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        for (const size of ["default", "sm"]) {
          await expect(sample(page, size, "on")).toHaveCSS(
            "background-color",
            await cssColor(page, "var(--sprout-primary)"),
          );
          await expect(sample(page, size, "off")).toHaveCSS(
            "background-color",
            await cssColor(page, "var(--sprout-muted)"),
          );
          await expect(
            sample(page, size, "on").locator('[data-slot="switch-thumb"]'),
          ).toHaveCSS(
            "background-color",
            await cssColor(page, "var(--sprout-on-primary)"),
          );
          await expect(
            sample(page, size, "off").locator('[data-slot="switch-thumb"]'),
          ).toHaveCSS(
            "background-color",
            await cssColor(
              page,
              mode === "dark" ? "var(--sprout-text)" : "var(--sprout-surface)",
            ),
          );
        }
        const overflowing = await demo
          .locator(
            ".switch-demo-card-body, .switch-demo-model, .switch-demo-matrix-cell",
          )
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => node.scrollWidth > node.clientWidth)
              .map(
                (node) =>
                  `${node.className}: ${node.scrollWidth}/${node.clientWidth}`,
              ),
          );
        expect(overflowing).toEqual([]);
        for (const control of await demo.getByRole("switch").all()) {
          const rect = await control.boundingBox();
          const size = await control.getAttribute("data-size");
          expect(rect!.width).toBeCloseTo(size === "sm" ? 24 : 32, 0);
          expect(rect!.height).toBeCloseTo(size === "sm" ? 14 : 18, 0);
          expect(rect!.x).toBeGreaterThanOrEqual(0);
          expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
        }
        const clipped = await demo
          .locator(".sprout-label")
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => node.scrollWidth > node.clientWidth)
              .map((node) => (node as HTMLElement).innerText.trim()),
          );
        expect(clipped).toEqual([]);
        const results = await new AxeBuilder({ page })
          .include("#switch-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `switch-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`switch-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("sizes and states render Cloud's look", async ({ page }, testInfo) => {
  await openSwitch(page);
  for (const [size, travel] of [
    ["default", 14],
    ["sm", 10],
  ] as const) {
    await expect(sample(page, size, "off")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(sample(page, size, "on")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(sample(page, size, "off")).toHaveCSS("border-radius", "999px");
    expect(await thumbOffset(page, size, "off")).toBeCloseTo(1, 0);
    expect(await thumbOffset(page, size, "on")).toBeCloseTo(1 + travel, 0);
    const thumb = await sample(page, size, "on")
      .locator('[data-slot="switch-thumb"]')
      .boundingBox();
    expect(thumb!.width).toBeCloseTo(size === "sm" ? 12 : 16, 0);
    for (const state of ["disabled", "disabled-on"]) {
      await expect(sample(page, size, state)).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      await expect(sample(page, size, state)).toHaveCSS("opacity", "0.5");
      await expect(sample(page, size, state)).toHaveCSS(
        "cursor",
        "not-allowed",
      );
    }
    const invalid = sample(page, size, "invalid");
    await expect(invalid).toHaveAttribute("aria-invalid", "true");
    await expect(invalid).toHaveCSS(
      "border-top-color",
      await cssColor(page, "var(--sprout-danger)"),
    );
  }
  const disabled = sample(page, "default", "disabled");
  await disabled.click({ force: true });
  await expect(disabled).toHaveAttribute("aria-checked", "false");
  const shot = await example(page, "Sizes and states").screenshot({
    animations: "disabled",
  });
  await testInfo.attach("switch-sizes", {
    body: shot,
    contentType: "image/png",
  });
});

test("the thumb slides the other way in right-to-left text", async ({
  page,
}) => {
  await openSwitch(page);
  await page
    .getByTestId("sample-default-on")
    .evaluate((node) => node.setAttribute("dir", "rtl"));
  const track = await sample(page, "default", "on").boundingBox();
  const thumb = await sample(page, "default", "on")
    .locator('[data-slot="switch-thumb"]')
    .boundingBox();
  // RTL starts the thumb on the right, so on slides it to the left edge.
  expect(thumb!.x - track!.x).toBeCloseTo(1, 0);
});

test("a wrapping label toggles a controlled switch", async ({ page }) => {
  await openSwitch(page);
  const motion = example(page, "Controlled with a label");
  const pause = motion.getByRole("switch", { name: "Pause motion" });
  await expect(pause).toHaveAttribute("aria-checked", "false");
  await motion.getByText("Pause motion").click();
  await expect(pause).toHaveAttribute("aria-checked", "true");
  await expect(motion.getByRole("status")).toHaveText("Motion paused.");
  await pause.click();
  await expect(motion.getByRole("status")).toHaveText("Bud is idling.");
  const sizes = example(page, "Sizes and states");
  await sizes.getByText("Quiet hours").click();
  await expect(sample(page, "default", "off")).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("settings rows name and toggle their switch through htmlFor", async ({
  page,
}) => {
  await openSwitch(page);
  const settings = example(page, "In settings rows");
  const summary = settings.getByRole("switch", { name: "Email summaries" });
  const quiet = settings.getByRole("switch", { name: "Quiet hours" });
  await expect(summary).toHaveAttribute("aria-checked", "true");
  await expect(quiet).toHaveAttribute("aria-checked", "false");
  await settings.getByText("Quiet hours", { exact: true }).click();
  await expect(quiet).toHaveAttribute("aria-checked", "true");
  await expect(settings.getByText("Meadow")).toBeVisible();
});

test("the hit area extends past the track", async ({ page }) => {
  await openSwitch(page);
  const quiet = example(page, "In settings rows").getByRole("switch", {
    name: "Quiet hours",
  });
  await quiet.scrollIntoViewIfNeeded();
  const rect = await quiet.boundingBox();
  await page.mouse.click(rect!.x + rect!.width + 8, rect!.y + rect!.height / 2);
  await expect(quiet).toHaveAttribute("aria-checked", "true");
});

test("keyboard focus, Space, and Enter toggle with a visible ring", async ({
  page,
}) => {
  await openSwitch(page);
  const settings = example(page, "In settings rows");
  const summary = settings.getByRole("switch", { name: "Email summaries" });
  await summary.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(summary).toBeFocused();
  await expect(summary).toHaveCSS("outline-style", "solid");
  await expect(summary).toHaveCSS("outline-width", "1px");
  await expect(summary).toHaveCSS(
    "outline-color",
    await cssColor(page, "var(--sprout-focus-ring)"),
  );
  await page.keyboard.press("Space");
  await expect(summary).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Tab");
  const quiet = settings.getByRole("switch", { name: "Quiet hours" });
  await expect(quiet).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(quiet).toHaveAttribute("aria-checked", "true");
  // Disabled switches are skipped.
  const sizes = example(page, "Sizes and states");
  await sizes.getByRole("switch", { name: "Auto compacted" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    sizes.getByRole("switch", { name: "Allow DeepSeek V3.2 as a fallback" }),
  ).toBeFocused();
});

test("model access saves, locks while pending, and shows read-only text", async ({
  page,
}, testInfo) => {
  await openSwitch(page);
  const access = example(page, "Model access");
  const deepseek = access.getByRole("switch", { name: "Allow DeepSeek V3.2" });
  const gpt = access.getByRole("switch", { name: "Allow GPT-5" });
  await expect(deepseek).toHaveAttribute("aria-checked", "false");
  await deepseek.click();
  await expect(deepseek).toHaveAttribute("aria-busy", "true");
  await expect(access.getByText("Saving…", { exact: true })).toBeVisible();
  await expect(gpt).toHaveAttribute("aria-disabled", "true");
  await expect(deepseek).toHaveCSS("cursor", "progress");
  await expect(gpt).toHaveCSS("cursor", "not-allowed");
  await expect(access.getByRole("status")).toHaveText("Model access saved.");
  await expect(deepseek).toHaveAttribute("aria-checked", "true");
  await expect(deepseek).not.toHaveAttribute("aria-busy", "true");
  await expect(gpt).not.toHaveAttribute("aria-disabled", "true");
  await expect(access.getByText("Saving…", { exact: true })).toHaveCount(0);
  const long = access.getByRole("switch", {
    name: "Allow Kimi K2 Thinking with extended reasoning",
  });
  await expect(long).toBeVisible();

  await access.getByRole("button", { name: "Member" }).click();
  await expect(access.getByRole("switch")).toHaveCount(0);
  await expect(
    access.getByRole("listitem").filter({ hasText: "GPT-5" }),
  ).toContainText("On");
  await expect(
    access.getByRole("listitem").filter({ hasText: "Grok 4" }),
  ).toContainText("On");
  const shot = await access.screenshot({ animations: "disabled" });
  await testInfo.attach("switch-model-access-member", {
    body: shot,
    contentType: "image/png",
  });
});

test("model access keeps a conflicting change until it is reapplied", async ({
  page,
}, testInfo) => {
  await openSwitch(page);
  const access = example(page, "Model access");
  await access.getByText("Next save conflicts with another admin").click();
  const grok = access.getByRole("switch", { name: "Allow Grok 4" });
  await grok.click();
  const alert = access.getByRole("alert");
  await expect(alert).toContainText("Another admin changed model access.");
  await expect(
    access.getByText("Requested change: disable Grok 4."),
  ).toBeVisible();
  await expect(grok).toHaveAttribute("aria-checked", "true");
  for (const control of await access.getByRole("switch").all()) {
    await expect(control).toHaveAttribute("aria-disabled", "true");
  }
  const apply = access.getByRole("button", { name: "Apply retained change" });
  await expect(apply).toBeDisabled();
  const shot = await access.screenshot({ animations: "disabled" });
  await testInfo.attach("switch-model-access-conflict", {
    body: shot,
    contentType: "image/png",
  });
  await access.getByRole("button", { name: "Reload model access" }).click();
  await expect(access.getByRole("status")).toHaveText(
    "Reloading model access…",
  );
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(access.getByRole("status")).toHaveText("Model access saved.");
  await expect(grok).toHaveAttribute("aria-checked", "false");
  await expect(alert).toHaveCount(0);

  await access.getByText("Next save conflicts with another admin").click();
  await access.getByRole("switch", { name: "Allow GPT-5" }).click();
  await access.getByRole("button", { name: "Discard change" }).click();
  await expect(access.getByRole("alert")).toHaveCount(0);
  await expect(
    access.getByRole("switch", { name: "Allow GPT-5" }),
  ).not.toHaveAttribute("aria-disabled", "true");
});

test("turning every model off shows the empty access alert", async ({
  page,
}) => {
  await openSwitch(page);
  const access = example(page, "Model access");
  for (const name of [
    "Claude Sonnet 4.5",
    "GPT-5",
    "Kimi K2 Thinking with extended reasoning",
    "Grok 4",
  ]) {
    const control = access.getByRole("switch", { name: `Allow ${name}` });
    await control.click();
    await expect(control).toHaveAttribute("aria-checked", "false");
    await expect(access.getByRole("status")).toHaveText("Model access saved.");
  }
  await expect(
    access.getByText(/All model families are disabled/),
  ).toBeVisible();
});

test("motion takes 120ms and 180ms and stops for reduced motion", async ({
  browser,
}) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();
    try {
      await openSwitch(page);
      const control = sample(page, "default", "off");
      await expect(control).toHaveCSS(
        "transition-duration",
        reducedMotion === "reduce" ? "0s" : /^0\.12s/,
      );
      await expect(control.locator('[data-slot="switch-thumb"]')).toHaveCSS(
        "transition-duration",
        reducedMotion === "reduce" ? "0s" : /^0\.18s/,
      );
    } finally {
      await context.close();
    }
  }
});
