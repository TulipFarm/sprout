import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/progress/";

async function openProgress(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#progress-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function fill(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((node) => {
    const track = node.querySelector('[data-slot="progress-track"]')!;
    const indicator = node.querySelector('[data-slot="progress-indicator"]')!;
    return (
      indicator.getBoundingClientRect().width /
      track.getBoundingClientRect().width
    );
  });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`progress ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        // Reduced motion stops the endless slide so animations can settle.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openProgress(page);
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
        for (const body of await demo.locator(".progress-demo-card-body").all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        for (const row of await demo.locator(".progress-demo-uploads li").all())
          expect(
            await row.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        await expect(demo.locator(".progress-demo-file-name").nth(1)).toHaveCSS(
          "text-overflow",
          "ellipsis",
        );
        const indicator = demo
          .getByTestId("state-complete")
          .locator('[data-slot="progress-indicator"]');
        const colors = await indicator.evaluate((node) => {
          const probe = document.createElement("span");
          probe.style.color = "var(--sprout-primary)";
          document.body.append(probe);
          const primary = getComputedStyle(probe).color;
          probe.remove();
          return { own: getComputedStyle(node).backgroundColor, primary };
        });
        expect(colors.own).toBe(colors.primary);
        const results = await new AxeBuilder({ page })
          .include("#progress-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `progress-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`progress-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("states show empty, partial, complete, and waiting", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openProgress(page);
  const card = example(page, "States");
  const bars = card.getByRole("progressbar");
  await expect(bars).toHaveCount(4);
  await expect(card.getByRole("progressbar", { name: "Progress" })).toHaveCount(
    2,
  );
  await expect(
    card.getByRole("progressbar", { name: "Complete" }),
  ).toHaveAttribute("aria-valuenow", "100");
  const waiting = card.getByRole("progressbar", { name: "Waiting" });
  await expect(waiting).not.toHaveAttribute("aria-valuenow", /.*/);
  await expect(waiting).toHaveAttribute("data-indeterminate", "");
  await expect(
    page.getByTestId("state-empty").locator('[data-slot="progress-value"]'),
  ).toHaveText("0%");
  await expect(
    page.getByTestId("state-partial").locator('[data-slot="progress-value"]'),
  ).toHaveText("40%");
  await expect(
    page.getByTestId("state-waiting").locator('[data-slot="progress-value"]'),
  ).toHaveText("");
  expect(await fill(page, "state-empty")).toBe(0);
  expect(await fill(page, "state-complete")).toBeCloseTo(1, 2);

  // Label and value share the first row; the 4px track sits 8px below.
  const label = await page
    .getByTestId("state-partial")
    .locator('[data-slot="progress-label"]')
    .boundingBox();
  const value = await page
    .getByTestId("state-partial")
    .locator('[data-slot="progress-value"]')
    .boundingBox();
  const track = await page
    .getByTestId("state-partial")
    .locator('[data-slot="progress-track"]')
    .boundingBox();
  expect(Math.round(label!.y)).toBe(Math.round(value!.y));
  expect(Math.round(value!.x + value!.width)).toBe(
    Math.round(track!.x + track!.width),
  );
  expect(Math.round(track!.height)).toBe(4);
  expect(Math.round(track!.y - (label!.y + label!.height))).toBe(8);

  const advance = card.getByRole("button", { name: "Advance example" });
  await advance.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByTestId("state-partial").getByRole("progressbar"),
  ).toHaveAttribute("aria-valuenow", "60");
  expect(await fill(page, "state-partial")).toBeCloseTo(0.6, 2);
  await page.keyboard.press("Space");
  await page.keyboard.press("Enter");
  await expect(
    page.getByTestId("state-partial").getByRole("progressbar"),
  ).toHaveAttribute("aria-valuenow", "100");
  await page.keyboard.press("Enter");
  await expect(
    page.getByTestId("state-partial").getByRole("progressbar"),
  ).toHaveAttribute("aria-valuenow", "0");
  const path = testInfo.outputPath("progress-states.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("progress-states", { path, contentType: "image/png" });
});

test("storage use moves between ready, over quota, loading, and unavailable", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await openProgress(page);
  const card = example(page, "Storage use");
  const storage = page.getByTestId("storage");
  const capture = async (name: string) => {
    const path = testInfo.outputPath(`progress-storage-${name}.png`);
    await card.screenshot({ animations: "disabled", path });
    await testInfo.attach(`progress-storage-${name}`, {
      path,
      contentType: "image/png",
    });
  };
  const bar = storage.getByRole("progressbar", {
    name: "Workspace storage used",
  });
  await expect(bar).toHaveAttribute("aria-valuenow", "32");
  await expect(bar).toHaveAttribute("aria-valuetext", "32%");
  await expect(storage).toContainText("3.2 GB of 10 GB used, including Trash.");
  await expect(storage).toContainText("Up to 5 GB per file.");
  await expect(storage.locator('[data-slot="progress-value"]')).toHaveCount(0);
  expect(await fill(page, "storage")).toBeCloseTo(0.32, 2);
  await capture("ready");

  const ready = card.getByRole("button", { name: "Ready", exact: true });
  await ready.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(bar).toHaveAttribute("aria-valuenow", "100");
  await expect(storage).toContainText("10.4 GB of 10 GB used");
  expect(await fill(page, "storage")).toBeCloseTo(1, 2);
  await capture("full");

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(
    storage.getByRole("status", { name: "Loading storage use" }),
  ).toBeVisible();
  await expect(storage.getByRole("progressbar")).toHaveCount(0);
  await capture("loading");

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(storage).toContainText("Storage use unavailable.");
  await capture("unavailable");
  const retry = storage.getByRole("button", { name: "Check storage again" });
  await retry.focus();
  await expect(retry).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(bar).toHaveAttribute("aria-valuenow", "32");
});

test("upload rows read sizes and follow sending by keyboard", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 900 });
  await openProgress(page);
  const card = example(page, "Upload list");
  const uploads = card.getByRole("region", { name: "Uploads" });
  await expect(uploads.getByRole("status")).toHaveText("Uploading 2 of 4…");
  await expect(uploads.getByRole("progressbar")).toHaveCount(2);
  const deck = uploads.getByRole("progressbar", {
    name: "Uploading Q3 board deck.pdf",
  });
  await expect(deck).toHaveAttribute("aria-valuenow", "36");
  await expect(deck).toHaveAttribute(
    "aria-valuetext",
    "Uploading 3.1 MB of 8.4 MB",
  );
  await expect(page.getByTestId("upload-deck")).toContainText(
    "Uploading 3.1 MB of 8.4 MB · Reports",
  );
  const photos = uploads.getByRole("progressbar", {
    name: "Uploading Team offsite photos – Lisbon 2026 – final selects.zip",
  });
  await expect(photos).toHaveAttribute("aria-valuenow", "100");
  await expect(photos).toHaveAttribute("aria-valuetext", "Saving…");

  // The bar starts 6px under the file meta line and spans the text column.
  const meta = await page
    .getByTestId("upload-deck")
    .locator(".progress-demo-file-meta")
    .boundingBox();
  const track = await page
    .getByTestId("upload-deck")
    .locator('[data-slot="progress-track"]')
    .boundingBox();
  expect(Math.round(track!.y - (meta!.y + meta!.height))).toBe(6);
  expect(Math.round(track!.width)).toBe(Math.round(meta!.width));
  const path = testInfo.outputPath("progress-uploads.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("progress-uploads", { path, contentType: "image/png" });

  const send = card.getByRole("button", { name: "Send next chunk" });
  await send.focus();
  await page.keyboard.press("Enter");
  await expect(deck).toHaveAttribute("aria-valuenow", "58");
  await expect(deck).toHaveAttribute(
    "aria-valuetext",
    "Uploading 4.9 MB of 8.4 MB",
  );
  await expect(
    uploads.getByRole("progressbar", {
      name: "Uploading Interview notes.docx",
    }),
  ).toHaveAttribute("aria-valuetext", "Saving…");
  await page.keyboard.press("Space");
  await page.keyboard.press("Enter");
  await expect(deck).toHaveAttribute("aria-valuetext", "Saving…");

  const cancel = uploads.getByRole("button", {
    name: "Cancel uploading Q3 board deck.pdf",
  });
  await cancel.focus();
  await page.keyboard.press("Enter");
  await expect(deck).toHaveCount(0);
  await expect(page.getByTestId("upload-deck")).toContainText(
    "Cancelled · Reports",
  );
  const retry = uploads.getByRole("button", {
    name: "Retry uploading Q3 board deck.pdf",
  });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("upload-deck")).toContainText(
    "Waiting · Reports",
  );
  await send.focus();
  await page.keyboard.press("Enter");
  await expect(deck).toHaveAttribute("aria-valuenow", "21");
  await expect(deck).toHaveAttribute(
    "aria-valuetext",
    "Uploading 1.8 MB of 8.4 MB",
  );
  const shot = testInfo.outputPath("progress-uploads-sending.png");
  await card.screenshot({ animations: "disabled", path: shot });
  await testInfo.attach("progress-uploads-sending", {
    path: shot,
    contentType: "image/png",
  });
});

test("the width eases and the waiting bar slides, unless motion is reduced", async ({
  page,
}) => {
  await openProgress(page);
  const partial = page
    .getByTestId("state-partial")
    .locator('[data-slot="progress-indicator"]');
  await expect(partial).toHaveCSS("transition-property", "width");
  await expect(partial).toHaveCSS("transition-duration", "0.18s");
  const waiting = page
    .getByTestId("state-waiting")
    .locator('[data-slot="progress-indicator"]');
  await expect(waiting).toHaveCSS("animation-name", "sprout-progress-slide");
  await expect(waiting).toHaveCSS("animation-iteration-count", "infinite");
  expect(await fill(page, "state-waiting")).toBeCloseTo(0.4, 2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(waiting).toHaveCSS("animation-name", "none");
  await expect(waiting).toHaveCSS("opacity", "0.4");
  expect(await fill(page, "state-waiting")).toBeCloseTo(1, 2);
  await expect(partial).toHaveCSS("transition-duration", "0s");
});

test("the docs navigation links to Progress", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openProgress(page);
  const link = page.getByRole("link", { name: "Progress", exact: true });
  await expect(link.first()).toHaveAttribute("href", "/components/progress/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Progress");
});
