import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/file-viewer/";
const axeTags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

async function stubGoogle(page: Page) {
  await page.route("https://docs.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Google sample</title><p>Google document sample</p>",
    }),
  );
}

async function openPage(page: Page) {
  await stubGoogle(page);
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#file-viewer-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function openFile(page: Page, name: string) {
  await page
    .getByRole("button", { name: `Inspect ${name}`, exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function closeFile(page: Page, name: string) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: `Inspect ${name}`, exact: true }),
  ).toBeFocused();
}

async function screenshot(
  page: Page,
  testInfo: import("@playwright/test").TestInfo,
  name: string,
) {
  const path = testInfo.outputPath(`${name}.png`);
  const shot = await page.screenshot({ animations: "disabled", path });
  expect(shot.byteLength).toBeGreaterThan(10_000);
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`file viewer ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openPage(page);
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
        await expect(
          demo
            .locator('[data-sample="office"], .file-viewer-demo-pages')
            .first(),
        ).toBeVisible();
        await expect
          .poll(() =>
            demo.evaluate(
              (node) =>
                [
                  ...node.querySelectorAll('[data-file-state="loading"]'),
                ].filter((item) => !item.closest(".sprout-file-embed-loading"))
                  .length,
            ),
          )
          .toBe(0);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        for (const body of await demo
          .locator(".file-viewer-demo-card-body")
          .all())
          expect(
            await body.evaluate(
              (node) => node.scrollWidth <= node.clientWidth + 1,
            ),
          ).toBe(true);
        const results = await new AxeBuilder({ page })
          .include("#file-viewer-demo")
          .withTags(axeTags)
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `file-viewer-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`file-viewer-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });

        const dialog = await openFile(page, "Supplier price list.csv");
        await expect(
          dialog.getByRole("region", { name: "Prices worksheet" }),
        ).toBeVisible();
        const dialogResults = await new AxeBuilder({ page })
          .include('[data-file-viewer=""]')
          .withTags(axeTags)
          .analyze();
        expect(dialogResults.violations).toEqual([]);
        expect(
          await dialog.evaluate((node) => {
            const rect = node.getBoundingClientRect();
            return (
              rect.left >= 0 &&
              rect.right <= innerWidth + 1 &&
              rect.bottom <= innerHeight + 1
            );
          }),
        ).toBe(true);
        await screenshot(
          page,
          testInfo,
          `file-viewer-dialog-${theme}-${mode}-${width}`,
        );
        await closeFile(page, "Supplier price list.csv");
      });
    }
  }
}

test("the dialog shows local text with reload, download, and keyboard close", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const trigger = page.getByRole("button", {
    name: "Inspect Harvest notes.txt",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Harvest notes.txt" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Local file · Not uploaded");
  await expect(dialog.locator(".sprout-code-block-pre")).toContainText(
    "Bed 2 tomatoes are ready on Friday.",
  );
  const download = dialog.getByRole("link", { name: "Download" });
  await expect(download).toHaveAttribute("download", "Harvest notes.txt");
  await expect(download).toHaveAttribute("href", /^blob:/);
  await dialog.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Reload file" }).click();
  await expect(dialog.locator(".sprout-code-block-pre")).toContainText(
    "Bed 2 tomatoes",
  );
  const close = dialog.getByRole("button", { name: "Close file viewer" });
  for (
    let step = 0;
    step < 8 &&
    !(await close.evaluate((node) => node === document.activeElement));
    step++
  )
    await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("every sample format opens in the dialog", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);

  let dialog = await openFile(page, "Spring planting plan.md");
  await expect(
    dialog.getByRole("heading", { name: "Spring planting plan", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Show source" }).click();
  await expect(
    dialog.getByRole("region", { name: "Markdown code" }),
  ).toContainText("# Spring planting plan");
  await expect(
    dialog.getByRole("button", { name: "Show formatted" }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Show formatted" }).click();
  await expect(
    dialog.locator("strong", { hasText: "sweet peas" }),
  ).toBeVisible();
  await closeFile(page, "Spring planting plan.md");

  dialog = await openFile(page, "Supplier price list.csv");
  await expect(
    dialog.getByRole("cell", { name: "Peat-free compost" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Notes" }).click();
  await expect(dialog.getByRole("button", { name: "Notes" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(dialog).toContainText("This worksheet is empty.");
  await closeFile(page, "Supplier price list.csv");

  dialog = await openFile(page, "Order SO-1042.json");
  await expect(dialog.locator(".sprout-code-block-pre")).toContainText(
    '"customer": "Meadow Café"',
  );
  await closeFile(page, "Order SO-1042.json");

  dialog = await openFile(page, "Greenhouse layout.png");
  await expect(dialog).toContainText("Linked file");
  const image = dialog.getByRole("img", { name: "Greenhouse layout.png" });
  await expect(image).toHaveAttribute("data-state", "ready");
  const fit = await image.boundingBox();
  const zoom = dialog.getByRole("button", { name: "Actual size" });
  await zoom.click();
  await expect(
    dialog.getByRole("button", { name: "Fit image" }),
  ).toHaveAttribute("aria-pressed", "true");
  const stage = dialog.getByRole("region", {
    name: "Greenhouse layout.png at actual size",
  });
  await expect(stage).toHaveAttribute("tabindex", "0");
  expect((await image.boundingBox())!.width).toBe(960);
  expect(fit!.width).toBeLessThanOrEqual(960);
  await screenshot(page, testInfo, "file-viewer-image");
  await closeFile(page, "Greenhouse layout.png");

  dialog = await openFile(page, "Returns policy.pdf");
  await expect(
    dialog.locator('iframe[title="Returns policy.pdf"]'),
  ).toHaveAttribute("src", /^blob:/);
  await closeFile(page, "Returns policy.pdf");

  dialog = await openFile(page, "Store floor plan.docx");
  await expect(
    dialog.getByRole("heading", { name: "Store floor plan", exact: true }),
  ).toBeVisible();
  await closeFile(page, "Store floor plan.docx");

  dialog = await openFile(page, "Q3 launch deck.pptx");
  await expect(dialog).toContainText("Slide 1 of 3");
  await screenshot(page, testInfo, "file-viewer-slides");
  await closeFile(page, "Q3 launch deck.pptx");

  dialog = await openFile(page, "Planting calendar.gsheet");
  await expect(
    dialog.getByRole("link", { name: "Open in Google" }),
  ).toHaveAttribute(
    "href",
    "https://docs.google.com/spreadsheets/d/1PlantingCalendarSample/edit",
  );
  await expect(dialog.locator("iframe")).toHaveAttribute(
    "src",
    "https://docs.google.com/spreadsheets/d/1PlantingCalendarSample/preview?widget=true&headers=false",
  );
  await expect(dialog.locator('[data-slot="file-embed"]')).toHaveAttribute(
    "data-state",
    "loaded",
  );
  await closeFile(page, "Planting calendar.gsheet");

  dialog = await openFile(page, "Supplier contract");
  await expect(dialog).toContainText("Google document");
  await expect(dialog).toContainText(
    "Google controls access to this document.",
  );
  await expect(
    dialog.getByRole("link", { name: "Open in Google" }),
  ).toHaveAttribute(
    "href",
    "https://docs.google.com/document/d/1SupplierContractSample/edit",
  );
  await expect(dialog.getByRole("link", { name: "Download" })).toHaveCount(0);
  await screenshot(page, testInfo, "file-viewer-google");
  await closeFile(page, "Supplier contract");

  dialog = await openFile(page, "Harvest log.txt");
  await expect(dialog).toContainText("Linked file");
  await expect(dialog.locator(".sprout-code-block-pre")).not.toBeEmpty();
  await closeFile(page, "Harvest log.txt");
});

test("edge cases explain what went wrong", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);
  const cases: [string, string][] = [
    ["Empty notes.txt", "This file is empty"],
    ["Legacy export.txt", "This file is not valid UTF-8 text."],
    [
      "Order SO-1043.json",
      "This file contains invalid JSON. The original text is shown below.",
    ],
    ["Brand mark.svg", "Your browser could not decode this image."],
    ["Damaged price list.xlsx", "The spreadsheet could not be read."],
    ["Encrypted proposal.docx", "This Office file could not be rendered."],
    ["2019 board deck.ppt", "Save this older PowerPoint file as .pptx"],
    [
      "Archive shortcut.gdoc",
      "This shortcut does not contain a supported Google Docs, Sheets, or Slides link.",
    ],
    ["Firmware backup.bin", "This format cannot be displayed locally"],
    [
      "Moved supplier list.txt",
      "The file could not be loaded. Check the link and try again.",
    ],
  ];
  for (const [name, message] of cases) {
    const dialog = await openFile(page, name);
    await expect(dialog).toContainText(message);
    if (name === "Moved supplier list.txt") {
      await screenshot(page, testInfo, "file-viewer-error");
      await dialog.getByRole("button", { name: "Try again" }).click();
      await expect(dialog).toContainText(message);
    }
    await closeFile(page, name);
  }
  const large = page.getByRole("button", { name: "Open a 50 MB survey image" });
  await large.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Drone survey.tif" });
  await expect(dialog).toContainText(
    "This file is larger than the 50 MB local viewing limit.",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("remote files time out and slow embeds offer a reload", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/file-viewer-samples/harvest-log.txt", () => {});
  await page.route("https://docs.google.com/document/**", () => {});
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);

  let dialog = await openFile(page, "Harvest log.txt");
  await expect(dialog.getByRole("status")).toContainText("Opening file");
  await page.clock.runFor(15_100);
  await expect(dialog).toContainText(
    "The file took too long to load. Try again.",
  );
  await closeFile(page, "Harvest log.txt");

  dialog = await openFile(page, "Supplier contract");
  await expect(dialog.locator('[data-slot="file-embed"]')).toHaveAttribute(
    "data-state",
    "loading",
  );
  await page.clock.runFor(12_100);
  await expect(
    dialog.getByText("The embedded viewer is taking longer than expected."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Reload viewer" }).click();
  await expect(dialog.locator('[data-slot="file-embed"]')).toHaveAttribute(
    "data-state",
    "loading",
  );
  await closeFile(page, "Supplier contract");
});

test("inline, self-loaded, canvas, and proposal compositions", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPage(page);

  const inline = example(page, "Inline in a panel");
  await expect(inline.locator("pre").first()).toContainText("Harvest notes");
  const textRegion = inline.getByRole("region", { name: "Plain text code" });
  await textRegion.focus();
  await expect(textRegion).toBeFocused();
  await expect(textRegion).toHaveAttribute("tabindex", "0");
  await expect(
    inline
      .getByTestId("inline-markdown")
      .getByRole("heading", { name: "Spring planting plan", exact: true }),
  ).toBeVisible();

  const workspace = example(page, "Files you load yourself");
  const frame = workspace.getByRole("region", { name: "File content" });
  await expect(
    frame.locator('iframe[title="Returns policy.pdf"]'),
  ).toBeVisible();
  for (const [option, check] of [
    [
      "Sheet",
      () =>
        expect(frame.getByRole("cell", { name: "Frost cloth" })).toBeVisible(),
    ],
    [
      "Markdown",
      () =>
        expect(
          frame.getByRole("heading", {
            name: "Spring planting plan",
            exact: true,
          }),
        ).toBeVisible(),
    ],
    [
      "Image",
      () =>
        expect(
          frame.getByRole("img", { name: "Greenhouse layout.png" }),
        ).toHaveAttribute("data-state", "ready"),
    ],
    [
      "JSON",
      () =>
        expect(frame.locator(".sprout-code-block-pre")).toContainText(
          '"status": "Ready to ship"',
        ),
    ],
  ] as const) {
    await workspace
      .getByRole("group", { name: "Sample file" })
      .getByRole("button", { name: option })
      .click();
    await check();
  }
  const states = workspace.getByRole("group", { name: "Content state" });
  await states.getByRole("button", { name: "Loading" }).click();
  await expect(frame.getByRole("status")).toContainText("Opening file");
  await states.getByRole("button", { name: "Failed" }).click();
  await expect(frame.getByRole("alert")).toContainText(
    "The file content couldn’t be loaded. Your file is unchanged.",
  );
  await frame.getByRole("button", { name: "Try again" }).press("Enter");
  await expect(frame.locator(".sprout-code-block-pre")).toContainText(
    "Ready to ship",
  );
  await expect(
    frame.getByRole("link", { name: "Open in Files" }),
  ).toBeVisible();

  const canvas = example(page, "Google file in a canvas");
  await expect(
    canvas.getByRole("heading", { name: "Opening hours", level: 2 }),
  ).toBeVisible();
  await canvas.getByRole("button", { name: "Refresh Google file" }).click();
  await expect(
    canvas.getByRole("heading", { name: "Opening hours", level: 2 }),
  ).toBeVisible();
  await expect(
    canvas.getByRole("link", { name: "Open in Google" }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    canvas.getByRole("link", { name: "Open Google file page" }),
  ).toBeVisible();

  const proposal = example(page, "Proposed upload");
  await expect(
    proposal.getByRole("cell", { name: "Seed trays" }),
  ).toBeVisible();
  await expect(
    proposal.getByRole("link", { name: "Download exact file" }),
  ).toHaveAttribute("download", "Autumn order.csv");
  await proposal.getByRole("button", { name: "Can’t decode" }).click();
  await expect(proposal.getByRole("alert")).toContainText(
    "The proposed file could not be decoded.",
  );
  await expect(
    proposal.getByRole("link", { name: "Download exact file" }),
  ).toHaveCount(0);
  await proposal.getByRole("button", { name: "Try again" }).press("Enter");
  await expect(
    proposal.getByRole("cell", { name: "Seed trays" }),
  ).toBeVisible();

  const fallback = example(page, "Without renderers");
  await expect(fallback).toContainText(
    "This format cannot be displayed locally",
  );

  const slides = example(page, "Slides in a canvas tab");
  await expect(slides).toContainText("Slide 3 of 3");
  await screenshot(page, testInfo, "file-viewer-compositions");
});

test("the dialog fits a phone screen", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page);
  const dialog = await openFile(page, "Greenhouse layout.png");
  await expect(
    dialog.getByRole("img", { name: "Greenhouse layout.png" }),
  ).toHaveAttribute("data-state", "ready");
  const header = dialog.locator('[data-slot="file-viewer-header"]');
  expect(
    await header.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  await screenshot(page, testInfo, "file-viewer-mobile-image");
  await closeFile(page, "Greenhouse layout.png");
  const google = await openFile(page, "Supplier contract");
  await expect(
    google.getByRole("link", { name: "Open in Google" }),
  ).toBeVisible();
  expect(
    await google
      .locator('[data-slot="file-viewer-header"]')
      .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  await screenshot(page, testInfo, "file-viewer-mobile-google");
  await closeFile(page, "Supplier contract");
});
