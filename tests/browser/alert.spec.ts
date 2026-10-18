import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/alert/";

async function openAlert(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const example = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });

const pair = (page: Page, name: string) =>
  example(page, "Variants").getByRole("group", { name, exact: true });

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(document.getAnimations().map((a) => a.finished));
  });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`alert ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        await openAlert(page);
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
        await page.getByRole("button", { name: "Save record" }).click();
        await expect(
          example(page, "Live states").locator(
            '[data-slot="alert"][role="status"]',
          ),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const overflowing = await page
          .locator('main [data-slot="alert"]')
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => node.scrollWidth > node.clientWidth + 1)
              .map((node) => node.textContent?.slice(0, 40)),
          );
        expect(overflowing).toEqual([]);
        const results = await new AxeBuilder({ page })
          .include("main")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        for (const name of [
          "Variants",
          "Actions",
          "Rich content",
          "Live states",
        ]) {
          const slug = name.toLowerCase().replaceAll(" ", "-");
          const path = testInfo.outputPath(
            `alert-${slug}-${theme}-${mode}-${width}.png`,
          );
          const shot = await example(page, name).screenshot({
            animations: "disabled",
            path,
          });
          expect(shot.byteLength).toBeGreaterThan(8_000);
          await testInfo.attach(`alert-${slug}-${theme}-${mode}-${width}`, {
            path,
            contentType: "image/png",
          });
        }
      });
    }
  }
}

test("variants pair every part combination with distinct tones", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAlert(page);
  await chooseOption(page, "Color mode", "Light");
  for (const name of ["Description", "Title", "Icon", "Icon only", "Action"]) {
    const group = pair(page, name);
    await expect(group.locator('[data-variant="default"]')).toHaveCount(1);
    await expect(group.locator('[data-variant="destructive"]')).toHaveCount(1);
  }
  const danger = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--sprout-danger)";
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  const title = pair(page, "Title");
  await expect(title.locator('[data-variant="destructive"]')).toHaveCSS(
    "color",
    danger,
  );
  await expect(
    title.locator('[data-variant="default"] [data-slot="alert-title"]'),
  ).toHaveCSS("font-weight", "500");
  const muted = await title
    .locator('[data-variant="default"] [data-slot="alert-description"]')
    .evaluate((node) => getComputedStyle(node).color);
  const destructive = await title
    .locator('[data-variant="destructive"] [data-slot="alert-description"]')
    .evaluate((node) => getComputedStyle(node).color);
  expect(muted).not.toBe(destructive);

  await expect(pair(page, "Description").locator('[role="note"]')).toHaveCount(
    1,
  );
  await expect(pair(page, "Description").locator('[role="alert"]')).toHaveCount(
    1,
  );
  await expect(pair(page, "Icon only").locator('[role="status"]')).toHaveCount(
    1,
  );

  const lightBg = await title
    .locator('[data-variant="default"]')
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  await chooseOption(page, "Color mode", "Dark");
  const darkBg = await title
    .locator('[data-variant="default"]')
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(darkBg).not.toBe(lightBg);
});

test("icons, actions, and buttons keep their geometry", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openAlert(page);
  await settle(page);

  const iconAlert = pair(page, "Icon").locator('[data-variant="default"]');
  const icon = iconAlert.locator(":scope > svg");
  await expect(icon).toHaveCSS("width", "16px");
  await expect(icon).toHaveCSS("height", "16px");
  const iconBox = (await icon.boundingBox())!;
  const titleBox = (await iconAlert
    .locator('[data-slot="alert-title"]')
    .boundingBox())!;
  const descBox = (await iconAlert
    .locator('[data-slot="alert-description"]')
    .boundingBox())!;
  expect(titleBox.x).toBeGreaterThan(iconBox.x + iconBox.width);
  expect(Math.abs(descBox.x - titleBox.x)).toBeLessThan(1);

  const actionAlert = pair(page, "Action").locator('[data-variant="default"]');
  await expect(actionAlert).toHaveCSS("padding-right", "72px");
  const alertBox = (await actionAlert.boundingBox())!;
  const actionBox = (await actionAlert
    .locator('[data-slot="alert-action"]')
    .boundingBox())!;
  expect(
    alertBox.x + alertBox.width - (actionBox.x + actionBox.width),
  ).toBeCloseTo(9, 0);
  expect(actionBox.y - alertBox.y).toBeCloseTo(9, 0);

  const actions = example(page, "Actions");
  const plans = actions.locator('[data-slot="alert"]', {
    hasText: "Couldn’t load plans",
  });
  const direct = plans.getByRole("button", { name: "Load plans again" });
  expect((await direct.boundingBox())!.width).toBeLessThan(
    (await plans.boundingBox())!.width / 2,
  );
  const inline = actions.getByRole("button", { name: "Use current selection" });
  await expect(inline).toHaveCSS("display", "flex");
  await expect(inline).toHaveCSS("margin-top", "8px");
  const link = actions.getByRole("link", { name: "Email support" });
  await expect(link).toHaveAttribute("href", /^mailto:/);
  await expect(link).toHaveCSS("display", "inline-flex");

  const pre = example(page, "Rich content").locator("pre");
  await expect(pre).toHaveCSS("margin-top", "12px");
  const longName = example(page, "Rich content").locator("li", {
    hasText: "approved-by-legal",
  });
  expect(await longName.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(
    true,
  );
});

test("live states load, switch variant, undo, and dismiss by keyboard", async ({
  page,
}) => {
  await openAlert(page);
  const live = example(page, "Live states");
  await expect(
    live.getByText("No messages. Save to see the result."),
  ).toBeVisible();

  await chooseOption(page, "Save outcome", "Uncertain");
  const save = live.getByRole("button", { name: "Save record" });
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(live.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(live.locator('[aria-busy="true"]')).toHaveCount(1);
  const result = live.locator('[data-slot="alert"][role="status"]');
  await expect(result).toHaveAttribute("data-variant", "destructive");
  await expect(result).toContainText("couldn’t confirm the save");

  await chooseOption(page, "Save outcome", "Saved");
  await expect(result).toHaveCount(0);
  await live.getByRole("button", { name: "Save record" }).click();
  await expect(result).toHaveAttribute("data-variant", "default");
  await expect(result).toHaveText("Record saved.");

  await live.getByRole("button", { name: /^Archive/ }).click();
  const archived = live.locator('[data-slot="alert"]', {
    hasText: "Archived “Weekly",
  });
  await expect(archived).toHaveAttribute("data-variant", "default");
  await archived.getByRole("button", { name: "Undo" }).click();
  await expect(archived).toHaveCount(0);
  await live.getByRole("button", { name: "Simulate failure" }).click();
  await expect(
    live.locator('[data-slot="alert"]', { hasText: "Couldn’t archive" }),
  ).toHaveAttribute("data-variant", "destructive");
  await live.getByRole("button", { name: "Dismiss", exact: true }).click();

  const uploads = live.getByRole("group", { name: "Upload problems" });
  await expect(uploads.locator('[data-slot="alert"]')).toHaveCount(2);
  const dismiss = uploads.getByRole("button", {
    name: "Dismiss supplier-prices.xlsx",
  });
  await dismiss.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(dismiss).toBeFocused();
  expect(
    await dismiss.evaluate(
      (node) =>
        getComputedStyle(node).outlineStyle !== "none" ||
        getComputedStyle(node).boxShadow !== "none",
    ),
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expect(uploads.locator('[data-slot="alert"]')).toHaveCount(1);
  await expect(
    uploads.getByRole("button", { name: "Dismiss Team photo.heic" }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(uploads.getByText("All uploads finished.")).toBeVisible();
  await expect(uploads.getByRole("button", { name: "Reset" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(uploads.locator('[data-slot="alert"]')).toHaveCount(2);
});

test("keyboard reaches controls inside alerts in reading order", async ({
  page,
}) => {
  await openAlert(page);
  const undo = pair(page, "Action").getByRole("button", { name: "Undo" });
  const retry = pair(page, "Action").getByRole("button", { name: "Retry" });
  await undo.focus();
  await page.keyboard.press("Tab");
  await expect(retry).toBeFocused();
  const link = example(page, "Rich content").getByRole("link", {
    name: "See what changes",
  });
  await link.focus();
  await expect(link).toHaveCSS("outline-style", "solid");
  await expect(link).toHaveCSS("text-decoration-line", "underline");
});

test("alerts fade in and respect reduced motion", async ({ page }) => {
  await openAlert(page);
  const first = pair(page, "Title").locator('[data-slot="alert"]').first();
  await expect(first).toHaveCSS("animation-name", "sprout-alert-in");
  await expect(first).toHaveCSS("animation-duration", "0.18s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(first).toHaveCSS("animation-name", "none");
});
