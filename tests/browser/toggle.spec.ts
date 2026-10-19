import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/toggle/";

async function openToggle(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#toggle-demo");
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
      test(`toggle ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openToggle(page);
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
        const pressed = page
          .getByTestId("states-outline")
          .getByRole("button", { name: "outline bold on" });
        await expect(pressed).toHaveAttribute("aria-pressed", "true");
        await expect(pressed).toHaveCSS(
          "color",
          await cssColor(page, "var(--sprout-primary)"),
        );
        await expect(pressed).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-primary-subtle)"),
        );
        for (const body of await demo.locator(".toggle-demo-card-body").all()) {
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        // Every toggle stays inside the viewport and its label is not clipped.
        for (const button of await demo.getByRole("button").all()) {
          const box = await button.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width);
          expect(
            await button.evaluate(
              (node) => node.scrollWidth <= node.clientWidth,
            ),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .include("#toggle-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `toggle-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`toggle-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("sizes and variants render at Cloud dimensions", async ({ page }) => {
  await openToggle(page);
  const sizes = {
    sm: { height: "28px", font: "12px", icon: "14px", start: "6px" },
    default: { height: "32px", font: "14px", icon: "16px", start: "8px" },
    lg: { height: "36px", font: "14px", icon: "16px", start: "8px" },
  };
  for (const variant of ["default", "outline"]) {
    for (const [size, spec] of Object.entries(sizes)) {
      const sample = page.getByTestId(`sample-${variant}-${size}`);
      const [labeled, iconOnly] = await sample.getByRole("button").all();
      for (const button of [labeled, iconOnly]) {
        await expect(button).toHaveAttribute("data-variant", variant);
        await expect(button).toHaveAttribute("data-size", size);
        await expect(button).toHaveCSS("height", spec.height);
        await expect(button).toHaveCSS("font-size", spec.font);
        await expect(button).toHaveCSS("padding-inline-end", "10px");
        await expect(button).toHaveCSS(
          "border-top-color",
          variant === "outline"
            ? await cssColor(page, "var(--sprout-input)")
            : "rgba(0, 0, 0, 0)",
        );
      }
      await expect(labeled).toHaveAttribute("aria-pressed", "true");
      await expect(labeled).toHaveCSS("padding-inline-start", spec.start);
      await expect(labeled).toHaveCSS("column-gap", "4px");
      await expect(labeled.locator("svg")).toHaveCSS("width", spec.icon);
      await expect(iconOnly).toHaveAttribute("aria-pressed", "false");
      await expect(iconOnly.locator("svg")).toHaveCSS("width", spec.icon);
      const box = await iconOnly.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(box!.height);
    }
  }
  const icons = example(page, "Icon placement");
  await expect(icons.getByRole("button", { name: "Group by owner" })).toHaveCSS(
    "padding-inline-end",
    "8px",
  );
  await expect(icons.getByRole("button", { name: "Group by owner" })).toHaveCSS(
    "padding-inline-start",
    "10px",
  );
  await expect(icons.getByRole("button", { name: "Open only" })).toHaveCSS(
    "padding-inline-start",
    "6px",
  );
});

test("disabled toggles keep their state and ignore presses", async ({
  page,
}) => {
  await openToggle(page);
  for (const variant of ["default", "outline"]) {
    const states = page.getByTestId(`states-${variant}`);
    const off = states.getByRole("button", {
      name: `${variant} italic disabled`,
      exact: true,
    });
    const on = states.getByRole("button", {
      name: `${variant} italic disabled on`,
    });
    await expect(off).toBeDisabled();
    await expect(on).toBeDisabled();
    await expect(on).toHaveAttribute("aria-pressed", "true");
    await expect(on).toHaveCSS("opacity", "0.5");
    await on.click({ force: true });
    await expect(on).toHaveAttribute("aria-pressed", "true");
    await expect(off).toHaveAttribute("aria-pressed", "false");
  }
});

test("keyboard focuses and presses toggles with Space and Enter", async ({
  page,
}) => {
  await openToggle(page);
  const toolbar = example(page, "Formatting toolbar");
  const bold = toolbar.getByRole("button", { name: "Bold" });
  const italic = toolbar.getByRole("button", { name: "Italic" });
  const status = toolbar.getByRole("status");
  await expect(status).toHaveText("Applied: Bold");
  await bold.focus();
  await expect(bold).toHaveCSS("outline-style", "solid");
  await expect(bold).toHaveCSS("outline-width", "1px");
  await page.keyboard.press("Space");
  await expect(bold).toHaveAttribute("aria-pressed", "false");
  await expect(status).toHaveText("No formatting");
  await page.keyboard.press("Tab");
  await expect(italic).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(italic).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    toolbar.getByRole("button", { name: "Inline code" }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(status).toHaveText("Applied: Italic, Inline code");
  await page.keyboard.press("Shift+Tab");
  await expect(
    toolbar.getByRole("button", { name: "Underline" }),
  ).toBeFocused();
  await toolbar.getByRole("button", { name: "Bold" }).click();
  await expect(status).toHaveText("Applied: Bold, Italic, Inline code");
});

test("hover tints an unpressed toggle", async ({ page }) => {
  await openToggle(page);
  const off = page
    .getByTestId("states-default")
    .getByRole("button", { name: "default bold off" });
  await off.hover();
  await expect(off).toHaveCSS(
    "background-color",
    await cssColor(page, "var(--sprout-hover)"),
  );
  await expect(off).toHaveCSS(
    "color",
    await cssColor(page, "var(--sprout-text)"),
  );
});

test("saving shows a busy state and errors mark the toggle invalid", async ({
  page,
}, testInfo) => {
  await openToggle(page);
  const saving = example(page, "Saving and errors");
  const follow = saving.getByRole("button", { name: "Follow table" });
  await follow.click();
  await expect(follow).toHaveAttribute("aria-busy", "true");
  await expect(follow).toBeDisabled();
  await expect(follow).toHaveCSS("cursor", "progress");
  await expect(saving.getByRole("status")).toHaveText("Saving…");
  await expect(follow).toBeEnabled();
  await expect(follow).not.toHaveAttribute("aria-busy");
  await expect(follow).toHaveAttribute("aria-pressed", "true");
  await expect(saving.getByRole("status")).toHaveText("You get updates.");

  const pin = saving.getByRole("button", { name: "Pin to sidebar" });
  await expect(pin).not.toHaveAttribute("aria-invalid");
  await pin.focus();
  await page.keyboard.press("Space");
  await expect(pin).toHaveAttribute("aria-invalid", "true");
  await expect(pin).toHaveAccessibleDescription(
    "The sidebar holds 8 pins. Unpin one first.",
  );
  await expect(pin).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-danger)"),
  );
  const path = testInfo.outputPath("toggle-saving-error.png");
  await saving.screenshot({ animations: "disabled", path });
  await testInfo.attach("toggle-saving-error", {
    path,
    contentType: "image/png",
  });
  await page.keyboard.press("Space");
  await expect(pin).not.toHaveAttribute("aria-invalid");
});

test("toggleVariants styles Base UI toggles in a group with arrow-key focus", async ({
  page,
}) => {
  await openToggle(page);
  const card = example(page, "toggleVariants");
  for (const variant of ["default", "outline"]) {
    const group = card.getByRole("group", { name: `${variant} time range` });
    const items = group.getByRole("button");
    await expect(items).toHaveText(["7d", "30d", "90d"]);
    for (const item of await items.all()) {
      await expect(item).toHaveClass(
        new RegExp(`sprout-toggle-variant-${variant} sprout-toggle-size-sm`),
      );
      await expect(item).toHaveCSS("height", "28px");
    }
  }
  const group = card.getByRole("group", { name: "outline time range" });
  const thirty = group.getByRole("button", { name: "30d" });
  await expect(thirty).toHaveAttribute("aria-pressed", "true");
  await thirty.focus();
  await page.keyboard.press("ArrowRight");
  const ninety = group.getByRole("button", { name: "90d" });
  await expect(ninety).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(ninety).toHaveAttribute("aria-pressed", "true");
  await expect(thirty).toHaveAttribute("aria-pressed", "false");
  // Both groups share one value.
  await expect(
    card
      .getByRole("group", { name: "default time range" })
      .getByRole("button", { name: "90d" }),
  ).toHaveAttribute("aria-pressed", "true");
  // Pressing the active item again keeps one choice.
  await page.keyboard.press("Enter");
  await expect(ninety).toHaveAttribute("aria-pressed", "true");
});

test("reduced motion removes the color transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openToggle(page);
  const toggle = page
    .getByTestId("states-default")
    .getByRole("button", { name: "default bold off" });
  await expect(toggle).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(toggle).toHaveCSS("transition-duration", /^0\.12s/);
});
