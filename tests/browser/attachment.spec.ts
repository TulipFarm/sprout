import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/attachment/";

async function openAttachment(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#attachment-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function box(page: Page, selector: string) {
  const rect = await page.locator(selector).first().boundingBox();
  expect(rect).not.toBeNull();
  return { width: Math.round(rect!.width), height: Math.round(rect!.height) };
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`attachment ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openAttachment(page);
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
        for (const body of await demo
          .locator(".attachment-demo-card-body, .attachment-demo-pane")
          .all())
          expect(
            await body.evaluate(
              (node) => node.scrollWidth <= node.clientWidth + 1,
            ),
          ).toBe(true);
        for (const item of await demo
          .locator('[data-slot="file-attachment"], [data-slot="attachment"]')
          .all()) {
          const fits = await item.evaluate((node) => {
            const own = node.getBoundingClientRect();
            const pane = node.closest(
              ".attachment-demo-pane, .attachment-demo-card-body",
            )!;
            const scroller = node.closest(
              ".sprout-attachment-carousel-viewport",
            );
            if (scroller) return true;
            const outer = pane.getBoundingClientRect();
            return own.left >= outer.left - 1 && own.right <= outer.right + 1;
          });
          expect(fits).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .include("#attachment-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `attachment-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`attachment-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("sizes keep the Cloud footprint", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openAttachment(page);
  for (const [size, px] of [
    ["default", 40],
    ["sm", 32],
    ["xs", 28],
  ] as const)
    expect(
      await box(
        page,
        `[data-testid="attachment-${size}-horizontal"] [data-slot="attachment-media"]`,
      ),
    ).toEqual({ width: px, height: px });
  const vertical = await box(
    page,
    '[data-testid="attachment-default-vertical"]',
  );
  const horizontal = await box(
    page,
    '[data-testid="attachment-default-horizontal"]',
  );
  expect(vertical.height).toBeGreaterThan(horizontal.height);
  expect(
    (await box(page, '[data-testid="file-chip"] [data-slot="file-attachment"]'))
      .height,
  ).toBe(36);
  expect(
    await box(
      page,
      '[data-testid="file-type-icons"] .sprout-file-type-icon-size-sm',
    ),
  ).toEqual({ width: 20, height: 24 });
  expect(
    await box(
      page,
      '[data-testid="file-type-icons"] .sprout-file-type-icon-size-lg',
    ),
  ).toEqual({ width: 30, height: 36 });
  for (const kind of [
    "pdf",
    "sheet",
    "document",
    "slides",
    "image",
    "google",
    "unsupported",
  ])
    await expect(
      page
        .locator(`[data-testid="file-type-icons"] [data-kind="${kind}"]`)
        .first(),
    ).toBeVisible();
  const error = page.locator(
    '[data-testid="attachment-states"] [data-state="error"]',
  );
  const danger = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--sprout-danger)";
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  await expect(error.locator('[data-slot="attachment-description"]')).toHaveCSS(
    "color",
    danger,
  );
  await expect(
    page.locator('[data-testid="attachment-states"] [data-state="idle"]'),
  ).toHaveCSS("border-top-style", "dashed");
});

test("file attachments open, retry, and remove from the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openAttachment(page);
  const variants = example(page, "File attachment variants");
  const status = page.getByTestId("variant-status");
  const list = page.getByTestId("file-list");
  await list
    .getByRole("button", { name: "Inspect Returns policy.pdf" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Opened Returns policy.pdf from list");
  await page.keyboard.press("Tab");
  await expect(
    list.getByRole("button", { name: "Remove Returns policy.pdf" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Removed Returns policy.pdf from list");
  await expect(
    list.getByRole("button", { name: "Inspect Price list 2026.xlsx" }),
  ).toBeDisabled();
  await expect(list.getByText("Uploading…")).toBeVisible();
  await expect(list.getByText("Processing…")).toBeVisible();
  await expect(list.getByText("Upload failed")).toBeVisible();
  await expect(
    page.getByTestId("file-inline").getByText("Failed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("file-chip").getByRole("status", { name: "Uploading…" }),
  ).toBeVisible();
  await expect(page.getByTestId("file-list").locator("img")).toHaveAttribute(
    "alt",
    "Storefront.png",
  );
  await expect(
    page
      .getByTestId("file-grid")
      .locator(".sprout-file-attachment-preview")
      .first(),
  ).toHaveAttribute("tabindex", "-1");
  await list
    .getByRole("button", {
      name: "Retry Supplier notes from the March visit.docx",
    })
    .click();
  await expect(status).toHaveText(
    "Retrying Supplier notes from the March visit.docx",
  );
  await expect(variants.getByText("Upload failed")).toHaveCount(0);
  await expect(
    list.getByRole("button", {
      name: "Inspect Supplier notes from the March visit.docx",
    }),
  ).toBeEnabled({ timeout: 5000 });
});

test("composer carousel scrolls, previews, retries, and removes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openAttachment(page);
  const composer = page.getByTestId("composer");
  const carousel = composer.getByRole("region", { name: "Attached files" });
  await expect(carousel).toHaveAttribute("aria-roledescription", "carousel");
  const viewport = carousel.locator(".sprout-attachment-carousel-viewport");
  const scrollLeft = () => viewport.evaluate((node) => node.scrollLeft);
  await expect(
    carousel.getByRole("button", { name: "Previous attachments" }),
  ).toHaveCount(0);
  const next = carousel.getByRole("button", { name: "Next attachments" });
  await expect(next).toBeVisible();
  await next.click();
  await expect.poll(scrollLeft).toBeGreaterThan(0);
  await expect(
    carousel.getByRole("button", { name: "Previous attachments" }),
  ).toBeVisible();

  await viewport.evaluate((node) => node.scrollTo({ left: 0 }));
  await expect.poll(scrollLeft).toBe(0);
  const first = carousel.getByRole("button", {
    name: "Inspect Price list 2026.xlsx",
  });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(scrollLeft).toBeGreaterThan(0);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(scrollLeft).toBe(0);

  const last = carousel.getByRole("button", {
    name: "Inspect Q3 launch deck.pptx",
  });
  await last.focus();
  await expect
    .poll(async () =>
      last.evaluate((node) => {
        const own = node.getBoundingClientRect();
        const outer = node
          .closest(".sprout-attachment-carousel-viewport")!
          .getBoundingClientRect();
        return own.right <= outer.right + 1 && own.left >= outer.left - 1;
      }),
    )
    .toBe(true);

  await first.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Price list 2026.xlsx" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Local file · Not uploaded");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(first).toBeFocused();

  await carousel
    .getByRole("button", { name: "Retry garden-notes.txt" })
    .click();
  await expect(
    composer.getByText("garden-notes.txt: Ready to send"),
  ).toBeVisible();
  await carousel.getByRole("button", { name: "Remove inventory.json" }).click();
  await expect(carousel.getByText("inventory.json")).toHaveCount(0);
  await composer.getByRole("button", { name: "Sending… (lock files)" }).click();
  await expect(carousel.getByRole("button", { name: /^Remove / })).toHaveCount(
    0,
  );
});

test("sent references open, load, and download", async ({ page }) => {
  await openAttachment(page);
  const refs = page.getByTestId("references");
  const status = page.getByTestId("reference-status");
  await refs
    .getByRole("button", { name: "Inspect Supplier price sheet" })
    .click();
  await expect(status).toHaveText(
    "Opened Supplier price sheet from Google Drive",
  );
  await expect(
    refs.getByRole("button", { name: "Inspect Supplier price sheet" }),
  ).toHaveAttribute("title", "Supplier price sheet · Google Drive");
  await expect(
    refs.getByRole("button", { name: "Inspect Loading file…" }),
  ).toBeDisabled();
  await expect(
    refs.getByRole("button", { name: "Inspect Price changes.csv" }),
  ).toHaveAttribute("title", "Price changes.csv · Saved in Files");
  const download = refs.getByRole("button", {
    name: "Download Price comparison.xlsx",
  });
  await download.click();
  await expect(download).toBeDisabled();
  await expect(status).toHaveText("Downloaded Price comparison.xlsx", {
    timeout: 5000,
  });
  await expect(download).toBeEnabled();
});

test("groups, icons in context, and parts render every Cloud layout", async ({
  page,
}) => {
  await openAttachment(page);
  for (const variant of ["carousel", "grid", "inline", "list"])
    await expect(
      page
        .getByTestId(`group-${variant}`)
        .locator(`[data-slot="attachment-group"][data-variant="${variant}"]`),
    ).toHaveCount(1);
  await page
    .getByTestId("group-list")
    .getByRole("button", { name: "Inspect Returns policy.pdf" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Returns policy.pdf" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next file" }).click();
  await expect(
    page.getByRole("dialog", { name: "Greenhouse layout.png" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByTestId("group-list")
      .getByRole("button", { name: "Inspect Greenhouse layout.png" }),
  ).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(
    page.getByTestId("icon-files-table").locator("svg").first(),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("icon-mention")
      .locator('[data-slot="file-type-icon"] text'),
  ).toHaveCount(1);
  const field = page.getByTestId("icon-field");
  await field.getByRole("button", { name: "Attach file" }).click();
  await expect(field.getByText("Receipt 3.pdf")).toBeVisible();
  await field.getByRole("button", { name: "Remove Signed lease.pdf" }).click();
  await expect(field.getByText("Signed lease.pdf")).toHaveCount(0);
  await expect(
    page.getByTestId("icon-task").getByText("Google Drive"),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("icon-dialog")
      .locator('[data-slot="brand-icon"], svg')
      .first(),
  ).toBeVisible();

  const trigger = page.getByTestId("attachment-trigger");
  await trigger
    .getByRole("button", { name: "Open Q3 launch deck.pptx" })
    .focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(
    trigger.getByRole("button", { name: "Open Q3 launch deck.pptx" }),
  ).toBeFocused();
  await expect(trigger.locator('[data-slot="attachment"]')).toHaveCSS(
    "outline-style",
    "solid",
  );
  await page.keyboard.press("Enter");
  await expect(trigger.getByRole("status")).toHaveText(
    "Opened Q3 launch deck.pptx",
  );
  await page.keyboard.press("Tab");
  await expect(
    trigger.getByRole("button", { name: "Download Q3 launch deck.pptx" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger.getByRole("status")).toHaveText(
    "Downloaded Q3 launch deck.pptx",
  );

  const states = page.getByTestId("attachment-states");
  await states
    .getByRole("button", { name: "Remove Returns policy.pdf" })
    .click();
  await expect(states.getByText("Returns policy.pdf")).toHaveCount(0);
  await states.getByRole("button", { name: "Restore removed" }).click();
  await expect(states.getByText("Returns policy.pdf")).toBeVisible();
});

test("drop zones pick local files and respect disabled", async ({ page }) => {
  await openAttachment(page);
  const zone = page.getByTestId("dropzone-default");
  await expect(zone.locator('input[type="file"]')).toHaveAttribute(
    "accept",
    /image\/\*/,
  );
  await zone.locator('input[type="file"]').setInputFiles([
    {
      name: "garden-notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Plant bulbs"),
    },
    {
      name: "Storefront.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="green"/></svg>',
      ),
    },
  ]);
  const chosen = zone.getByRole("group", { name: "Chosen files" });
  await expect(chosen.getByText("garden-notes.txt")).toBeVisible();
  await expect(chosen.locator('img[alt="Storefront.svg"]')).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await chosen
    .getByRole("button", { name: "Inspect garden-notes.txt" })
    .click();
  const dialog = page.getByRole("dialog", { name: "garden-notes.txt" });
  await expect(
    dialog.getByRole("region", { name: "Plain text code" }),
  ).toContainText("Plant bulbs");
  await page.keyboard.press("Escape");
  await chosen.getByRole("button", { name: "Remove garden-notes.txt" }).click();
  await expect(chosen.getByText("garden-notes.txt")).toHaveCount(0);

  await zone.locator('[data-slot="attachment-dropzone"]').evaluate((node) => {
    const data = new DataTransfer();
    data.items.add(
      new File(["Returns"], "Returns policy.pdf", { type: "application/pdf" }),
    );
    node.dispatchEvent(
      new DragEvent("dragenter", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      }),
    );
  });
  await expect(
    zone.locator('[data-slot="attachment-dropzone"]'),
  ).toHaveAttribute("data-dragging", "");
  await zone.locator('[data-slot="attachment-dropzone"]').evaluate((node) => {
    const data = new DataTransfer();
    data.items.add(
      new File(["Returns"], "Returns policy.pdf", { type: "application/pdf" }),
    );
    node.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      }),
    );
  });
  await expect(
    zone.locator('[data-slot="attachment-dropzone"]'),
  ).not.toHaveAttribute("data-dragging", "");
  await expect(zone.getByText("Returns policy.pdf")).toBeVisible();

  const knowledge = page.getByTestId("dropzone-knowledge");
  await expect(knowledge.locator('input[type="file"]')).toHaveAttribute(
    "accept",
    /\.jsonl/,
  );
  await knowledge.locator('input[type="file"]').setInputFiles({
    name: "faq.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# FAQ"),
  });
  await expect(knowledge.getByText("faq.md")).toBeVisible();

  const disabled = page.getByTestId("dropzone-disabled");
  await expect(
    disabled.locator('[data-slot="attachment-dropzone"]'),
  ).toHaveAttribute("data-disabled", "");
  await expect(
    disabled.getByRole("button", { name: "Choose files" }),
  ).toBeDisabled();
});

test("reduced motion stops the title shimmer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAttachment(page);
  const title = page.locator(
    '[data-testid="attachment-states"] [data-state="uploading"] [data-slot="attachment-title"]',
  );
  await expect(title).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(title).not.toHaveCSS("animation-name", "none");
});

test("a group previews on hover and steps through its files in one viewer", async ({
  page,
}) => {
  await openAttachment(page);
  const list = page.getByRole("group", { name: "list previews" });
  const python = list.getByRole("button", { name: "Inspect score_lead.py" });

  await python.hover();
  const peek = page.locator(".sprout-file-attachment-peek");
  await expect(peek.locator('[data-language="python"]')).toBeVisible();
  await expect(peek.locator(".sprout-syntax-keyword").first()).toHaveText(
    "from",
  );

  await python.click();
  const viewer = page.getByRole("dialog", { name: "score_lead.py" });
  await expect(viewer.getByText("1 of 6", { exact: true })).toBeVisible();
  await expect(
    viewer.getByRole("button", { name: "Previous file" }),
  ).toBeDisabled();
  await expect(
    viewer.getByRole("region", { name: "Python code" }),
  ).toBeVisible();

  await viewer.getByRole("button", { name: "Next file" }).click();
  await expect(page.getByRole("dialog", { name: "README.md" })).toBeVisible();
  await expect(
    page
      .locator("[aria-live=polite]")
      .filter({ hasText: "README.md, file 2 of 6" }),
  ).toBeAttached();
  await expect(
    page
      .getByRole("dialog", { name: "README.md" })
      .getByRole("button", { name: "Next file" }),
  ).toBeFocused();

  await page.keyboard.press("ArrowRight");
  const json = page.getByRole("dialog", { name: "planting.json" });
  await expect(json.getByRole("region", { name: "JSON code" })).toBeVisible();
  await json.getByRole("region", { name: "JSON code" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(json).toBeVisible();

  await json.getByRole("button", { name: "Next file" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "main.rs" })
      .getByRole("button", { name: "Next file" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  const last = page.getByRole("dialog", { name: "Storefront.svg" });
  await expect(last.getByText("6 of 6", { exact: true })).toBeVisible();
  await expect(last.getByRole("button", { name: "Next file" })).toBeDisabled();
  await expect(
    last.getByRole("button", { name: "Previous file" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    list.getByRole("button", { name: "Inspect Storefront.svg" }),
  ).toBeFocused();
});
