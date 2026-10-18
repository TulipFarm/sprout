import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/checkbox/";

async function openCheckbox(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#checkbox-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
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

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`checkbox ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openCheckbox(page);
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
        const checked = page
          .getByTestId("sample-default-checked")
          .getByRole("checkbox");
        await expect(checked).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-primary)"),
        );
        const neutral = page
          .getByTestId("sample-neutral-checked")
          .getByRole("checkbox");
        await expect(neutral).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-text)"),
        );
        const overflowing = await demo
          .locator(".checkbox-demo-card-body")
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => node.scrollWidth > node.clientWidth)
              .map(
                (node) =>
                  `${node.closest("section")?.getAttribute("aria-label")}: ${node.scrollWidth}/${node.clientWidth}`,
              ),
          );
        expect(overflowing).toEqual([]);
        // Every box stays a 16px square inside the viewport.
        for (const box of await demo.getByRole("checkbox").all()) {
          const rect = await box.boundingBox();
          expect(rect!.width).toBeCloseTo(16, 0);
          expect(rect!.height).toBeCloseTo(16, 0);
          expect(rect!.x).toBeGreaterThanOrEqual(0);
          expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
        }
        // Visible label text is not clipped. The box hit area may extend past
        // a label that only holds a box and sr-only text.
        const clipped = await demo
          .locator(".sprout-label")
          .evaluateAll((nodes) =>
            nodes
              .filter((node) => !node.querySelector(".checkbox-demo-sr-only"))
              .filter((node) => node.scrollWidth > node.clientWidth)
              .map((node) => (node as HTMLElement).innerText.trim()),
          );
        expect(clipped).toEqual([]);
        const results = await new AxeBuilder({ page })
          .include("#checkbox-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `checkbox-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`checkbox-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("variants and states render Cloud's look", async ({ page }, testInfo) => {
  await openCheckbox(page);
  const box = (variant: string, state: string) =>
    page.getByTestId(`sample-${variant}-${state}`).getByRole("checkbox");
  for (const variant of ["default", "neutral"]) {
    const off = box(variant, "unchecked");
    await expect(off).toHaveAttribute("data-variant", variant);
    await expect(off).toHaveAttribute("aria-checked", "false");
    await expect(off).toHaveCSS(
      "border-top-color",
      await cssColor(page, "var(--sprout-border)"),
    );
    await expect(off).toHaveCSS("border-radius", "4px");
    await expect(box(variant, "checked")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(box(variant, "checked").locator("svg")).toHaveCSS(
      "width",
      "14px",
    );
    const mixed = box(variant, "mixed");
    await expect(mixed).toHaveAttribute("aria-checked", "mixed");
    await expect(mixed).toHaveCSS(
      "background-color",
      await cssColor(
        page,
        variant === "neutral" ? "var(--sprout-text)" : "var(--sprout-primary)",
      ),
    );
    for (const state of ["disabled", "disabled-checked"]) {
      await expect(box(variant, state)).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      await expect(box(variant, state)).toHaveCSS("opacity", "0.5");
      await expect(box(variant, state)).toHaveCSS("cursor", "not-allowed");
    }
    const invalid = box(variant, "invalid");
    await expect(invalid).toHaveAttribute("aria-invalid", "true");
    await expect(invalid).toHaveCSS(
      "border-top-color",
      await cssColor(page, "var(--sprout-danger)"),
    );
  }
  const mixed = box("default", "mixed");
  await mixed.click();
  await expect(mixed).toHaveAttribute("aria-checked", "true");
  await mixed.click();
  await expect(mixed).toHaveAttribute("aria-checked", "false");
  // Disabled boxes ignore clicks.
  const disabled = box("default", "disabled");
  await disabled.click({ force: true });
  await expect(disabled).toHaveAttribute("aria-checked", "false");
  const shot = await example(page, "Variants and states").screenshot({
    animations: "disabled",
  });
  await testInfo.attach("checkbox-variants", {
    body: shot,
    contentType: "image/png",
  });
});

test("labels toggle the box and name it", async ({ page }) => {
  await openCheckbox(page);
  const naming = example(page, "Naming");
  const business = naming.getByRole("checkbox", {
    name: "Shared business account",
  });
  await naming.getByText("Shared business account").click();
  await expect(business).toHaveAttribute("aria-checked", "true");
  const share = naming.getByRole("checkbox", {
    name: "Share with selected workspace members",
  });
  await expect(share).toHaveAttribute("aria-checked", "true");
  await naming.getByText("Share with selected workspace members").click();
  await expect(share).toHaveAttribute("aria-checked", "false");
  const move = naming.getByRole("checkbox", {
    name: /I understand that every/,
  });
  const moveBox = await move.boundingBox();
  const moveLabel = await naming
    .getByText(/I understand that every/)
    .boundingBox();
  // Aligned with the first 20px line of the wrapping label.
  expect(Math.abs(moveBox!.y + 8 - (moveLabel!.y + 10))).toBeLessThanOrEqual(1);
  await expect(
    naming.getByRole("checkbox", { name: "Use Priya Raman" }),
  ).toHaveAttribute("aria-checked", "true");
  const settings = example(page, "In settings rows");
  const schema = settings.getByRole("checkbox", { name: "Manage schema" });
  await settings.getByText("Manage schema", { exact: true }).click();
  await expect(schema).toHaveAttribute("aria-checked", "true");
});

test("the hit area extends past the 16px box", async ({ page }) => {
  await openCheckbox(page);
  const row = example(page, "Row selection").getByRole("checkbox", {
    name: "Select row 4f0c2a91",
  });
  await row.scrollIntoViewIfNeeded();
  const rect = await row.boundingBox();
  await page.mouse.click(rect!.x + rect!.width + 8, rect!.y + rect!.height / 2);
  await expect(row).toHaveAttribute("aria-checked", "true");
});

test("keyboard focus and Space toggle with a visible ring", async ({
  page,
}) => {
  await openCheckbox(page);
  const naming = example(page, "Naming");
  const business = naming.getByRole("checkbox", {
    name: "Shared business account",
  });
  await business.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(business).toBeFocused();
  await expect(business).toHaveCSS("outline-style", "solid");
  await expect(business).toHaveCSS("outline-width", "2px");
  await expect(business).toHaveCSS(
    "outline-color",
    await cssColor(page, "var(--sprout-focus)"),
  );
  await page.keyboard.press("Space");
  await expect(business).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Tab");
  await expect(
    naming.getByRole("checkbox", {
      name: "Share with selected workspace members",
    }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(
    naming.getByRole("checkbox", {
      name: "Share with selected workspace members",
    }),
  ).toHaveAttribute("aria-checked", "false");
});

test("confirm gating unlocks the action and locks while it runs", async ({
  page,
}) => {
  await openCheckbox(page);
  const confirm = example(page, "Confirm before acting");
  const box = confirm.getByRole("checkbox", {
    name: /I reviewed the file/,
  });
  const approve = confirm.getByRole("button", { name: "Approve" });
  await expect(approve).toBeDisabled();
  await box.click();
  await expect(approve).toBeEnabled();
  await approve.click();
  await expect(box).toHaveAttribute("aria-disabled", "true");
  await expect(confirm.getByRole("status")).toHaveText(
    "Approved. The sample is locked.",
  );
  await expect(box).toHaveAttribute("aria-checked", "true");
});

test("a disabled fieldset locks every box", async ({ page }) => {
  await openCheckbox(page);
  const grants = example(page, "Permission grid");
  const read = grants.getByRole("checkbox", { name: "Read metadata" }).nth(1);
  await expect(grants.getByRole("alert")).toContainText("Read metadata");
  await expect(read).toHaveAttribute("aria-invalid", "true");
  await grants.getByText("Simulate a save in progress").click();
  await expect(read).toHaveCSS("opacity", "0.5");
  await expect(read).toHaveAttribute("aria-disabled", "true");
  await expect(read).toHaveAttribute("tabindex", "-1");
  await read.click({ force: true });
  await expect(read).toHaveAttribute("aria-checked", "false");
  await read.focus();
  await page.keyboard.press("Space");
  await expect(read).toHaveAttribute("aria-checked", "false");
  await grants.getByText("Simulate a save in progress").click();
  await read.click();
  await expect(read).toHaveAttribute("aria-checked", "true");
  await expect(grants.getByRole("alert")).toHaveCount(0);
});

test("a selection limit disables only unchecked boxes", async ({ page }) => {
  await openCheckbox(page);
  const limit = example(page, "Selection limit");
  await limit.getByText("Support playbooks (SUP)").click();
  await expect(limit.getByRole("status")).toHaveText("3 items selected.");
  const finance = limit.getByRole("checkbox", { name: /Finance policies/ });
  await expect(finance).toHaveAttribute("aria-disabled", "true");
  const eng = limit.getByRole("checkbox", { name: /Engineering handbook/ });
  await expect(eng).not.toHaveAttribute("aria-disabled", "true");
  await eng.click();
  await expect(finance).not.toHaveAttribute("aria-disabled", "true");
  await expect(limit.getByRole("status")).toHaveText("2 items selected.");
});

test("select all shows mixed and selects every row", async ({ page }) => {
  await openCheckbox(page);
  const table = example(page, "Row selection");
  const all = table.getByRole("checkbox", {
    name: "Select all rows on this page",
  });
  await expect(all).toHaveAttribute("aria-checked", "mixed");
  await expect(all.locator("svg")).toBeVisible();
  await all.click();
  await expect(all).toHaveAttribute("aria-checked", "true");
  for (const row of await table
    .getByRole("checkbox", { name: /Select row/ })
    .all()) {
    await expect(row).toHaveAttribute("aria-checked", "true");
  }
  await all.click();
  await expect(all).toHaveAttribute("aria-checked", "false");
  await table.getByRole("button", { name: "Edit a cell" }).click();
  await expect(all).toHaveAttribute("aria-disabled", "true");
});

test("long file names wrap beside a fixed box", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openCheckbox(page);
  const files = example(page, "File list");
  const box = files.getByRole("checkbox", { name: /customer interview/ });
  const rect = await box.boundingBox();
  const name = await files.getByText(/customer interview/).boundingBox();
  expect(name!.height).toBeGreaterThan(20);
  expect(rect!.width).toBeCloseTo(16, 0);
  await box.click();
  await expect(box).toHaveAttribute("aria-checked", "true");
});

test("optional input and Field wrappers follow the box", async ({ page }) => {
  await openCheckbox(page);
  const optional = example(page, "Turn on more input");
  const input = optional.getByRole("textbox", { name: "Description" });
  await expect(input).toBeDisabled();
  await optional.getByText("Include description").click();
  await expect(input).toBeEnabled();
  await optional.getByText("Use the provider payload").click();
  await expect(optional.getByText(/payload hash/)).toHaveCount(0);
  const fields = example(page, "In fields");
  const confirm = fields.getByRole("checkbox", {
    name: "Confirm the sample details",
  });
  await expect(confirm).toHaveAttribute("aria-invalid", "true");
  await confirm.click();
  await expect(confirm).not.toHaveAttribute("aria-invalid", "true");
  await expect(
    fields.getByRole("checkbox", { name: "Show only sources I own" }),
  ).toHaveAttribute("data-variant", "neutral");
});

test("motion is 120ms and stops for reduced motion", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();
    try {
      await openCheckbox(page);
      const box = page
        .getByTestId("sample-default-unchecked")
        .getByRole("checkbox");
      await expect(box).toHaveCSS(
        "transition-duration",
        reducedMotion === "reduce" ? "0s" : /^0\.12s/,
      );
    } finally {
      await context.close();
    }
  }
});
