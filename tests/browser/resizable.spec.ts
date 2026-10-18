import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/resizable/";

async function openResizable(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#resizable-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function width(locator: Locator) {
  return (await locator.boundingBox())!.width;
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const viewport of [390, 1440]) {
      test(`resizable ${theme} ${mode} at ${viewport}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width: viewport, height: 1000 });
        const demo = await openResizable(page);
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
          .locator(".resizable-demo-card-body")
          .all()) {
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        const line = await page.evaluate(() => {
          const probe = document.createElement("span");
          probe.style.color = "var(--sprout-line)";
          document.body.append(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        });
        const handle = page.getByRole("separator", {
          name: "Resize horizontal panels",
        });
        await expect(handle).toHaveCSS("background-color", line);
        await expect(handle).toHaveCSS("width", "1px");
        if (viewport === 1440) {
          await expect(
            page.getByRole("separator", { name: "Resize canvas" }),
          ).toBeVisible();
          await expect(
            page.getByRole("separator", { name: "Resize file tree" }),
          ).toBeVisible();
        } else {
          await expect(
            page.getByRole("separator", { name: "Resize canvas" }),
          ).toHaveCount(0);
          await expect(
            page.getByRole("button", { name: "Open canvas" }),
          ).toBeVisible();
          await expect(
            page.getByRole("separator", { name: "Resize file tree" }),
          ).toHaveCount(0);
        }
        const results = await new AxeBuilder({ page })
          .include("#resizable-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `resizable-${theme}-${mode}-${viewport}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`resizable-${theme}-${mode}-${viewport}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("both orientations resize from the keyboard within their limits", async ({
  page,
}) => {
  await openResizable(page);
  const card = example(page, "Orientations");
  for (const [orientation, grow, shrink] of [
    ["horizontal", "ArrowRight", "ArrowLeft"],
    ["vertical", "ArrowDown", "ArrowUp"],
  ] as const) {
    const handle = card.getByRole("separator", {
      name: `Resize ${orientation} panels`,
    });
    const sizes = card.getByTestId(`${orientation}-sizes`);
    await expect(handle).toHaveAttribute(
      "aria-orientation",
      orientation === "horizontal" ? "vertical" : "horizontal",
    );
    await expect(handle).toHaveAttribute("aria-valuenow", "40");
    await expect(handle).toHaveAttribute("aria-valuemin", "20");
    await expect(handle).toHaveAttribute("aria-valuemax", "80");
    const controls = await handle.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    await expect(card.locator(`[id="${controls}"]`)).toContainText(
      orientation === "horizontal" ? "Runs" : "Prompt",
    );
    await expect(sizes).toHaveText("40% · 60%");
    await handle.focus();
    await page.keyboard.press(grow);
    await expect(sizes).toHaveText("45% · 55%");
    await expect(handle).toHaveAttribute("aria-valuenow", "45");
    await page.keyboard.press(shrink);
    await page.keyboard.press(shrink);
    await expect(sizes).toHaveText("35% · 65%");
    await page.keyboard.press("Home");
    await expect(sizes).toHaveText("20% · 80%");
    await page.keyboard.press(shrink);
    await expect(sizes).toHaveText("20% · 80%");
    await page.keyboard.press("End");
    await expect(sizes).toHaveText("80% · 20%");
    await page.keyboard.press(grow);
    await expect(sizes).toHaveText("80% · 20%");
  }
});

test("dragging moves the split, clamps at the minimum, and shows drag state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openResizable(page);
  const card = example(page, "Orientations");
  const frame = card.getByTestId("horizontal-frame");
  const handle = card.getByRole("separator", {
    name: "Resize horizontal panels",
  });
  const sizes = card.getByTestId("horizontal-sizes");
  const box = (await handle.boundingBox())!;
  const span = await width(frame);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + span * 0.1, y, { steps: 4 });
  await expect(handle).toHaveAttribute("data-dragging", "");
  await expect(page.locator("html")).toHaveCSS("cursor", "col-resize");
  await expect(sizes).toHaveText("50% · 50%");
  await page.mouse.move(x - span, y, { steps: 4 });
  await expect(sizes).toHaveText("20% · 80%");
  await page.mouse.up();
  await expect(handle).not.toHaveAttribute("data-dragging", "");
  await expect(page.locator("html")).not.toHaveCSS("cursor", "col-resize");
  await expect(handle).toBeFocused();

  const vertical = card.getByRole("separator", {
    name: "Resize vertical panels",
  });
  const verticalBox = (await vertical.boundingBox())!;
  const height = (await card.getByTestId("vertical-frame").boundingBox())!
    .height;
  const vx = verticalBox.x + verticalBox.width / 2;
  const vy = verticalBox.y + verticalBox.height / 2;
  await page.mouse.move(vx, vy);
  await page.mouse.down();
  await page.mouse.move(vx, vy + height, { steps: 4 });
  await page.mouse.up();
  await expect(card.getByTestId("vertical-sizes")).toHaveText("80% · 20%");
});

test("handles show hover, focus and grip states with short transitions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openResizable(page);
  const handle = page.getByRole("separator", { name: "Resize canvas" });
  const grip = handle.locator('[data-slot="resizable-handle-grip"]');
  await expect(grip).toHaveCSS("width", "6px");
  await expect(grip).toHaveCSS("height", "24px");
  await expect(grip).toHaveAttribute("aria-hidden", "true");
  await expect(handle).toHaveCSS("transition-duration", /0\.12s/);
  const color = (token: string) =>
    page.evaluate((value) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${value})`;
      document.body.append(probe);
      const result = getComputedStyle(probe).color;
      probe.remove();
      return result;
    }, token);
  await handle.hover();
  await expect(handle).toHaveCSS(
    "background-color",
    await color("--sprout-border"),
  );
  await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "Reset saved size" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("separator", { name: "Resize canvas" }),
  ).toBeFocused();
  await expect(handle).toHaveCSS(
    "background-color",
    await color("--sprout-focus"),
  );
  await expect(handle).not.toHaveCSS("box-shadow", "none");
  const tree = page.getByRole("separator", { name: "Resize file tree" });
  await expect(tree.locator('[data-slot="resizable-handle-grip"]')).toHaveCount(
    0,
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(handle).toHaveCSS("transition-duration", "0s");
});

test("chat and canvas keep minimums, save chosen sizes, and drop the canvas when closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openResizable(page);
  const card = example(page, "Chat and canvas");
  const frame = card.getByTestId("chat-frame");
  const handle = card.getByRole("separator", { name: "Resize canvas" });
  const chat = card.locator('[data-panel-id="docs-chat"]');
  const canvas = card.locator('[data-panel-id="docs-canvas"]');
  await expect(handle).toHaveAttribute("aria-valuenow", "55");
  await expect(handle).toHaveAttribute("aria-controls", "docs-chat");
  await expect(handle).toHaveAttribute("aria-valuemin", "40");
  const span = await width(frame);
  const max = Math.round(100 - (320 / (span - 3)) * 100);
  await expect(handle).toHaveAttribute("aria-valuemax", String(max));
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.includes("chat-canvas")),
    ),
  ).toEqual([]);

  await handle.focus();
  await page.keyboard.press("End");
  expect(Math.round(await width(canvas))).toBeGreaterThanOrEqual(319);
  expect(Math.round(await width(canvas))).toBeLessThanOrEqual(321);
  await page.keyboard.press("Home");
  await expect(handle).toHaveAttribute("aria-valuenow", "40");
  await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "45");

  await page.reload();
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await expect(handle).toHaveAttribute("aria-valuenow", "45");

  await card.getByRole("button", { name: "Close canvas" }).click();
  await expect(handle).toHaveCount(0);
  await expect(canvas).toHaveCount(0);
  await expect(chat).toHaveCSS("flex-grow", "100");
  expect(Math.abs((await width(chat)) - (span - 2))).toBeLessThan(2);
  await expect(card.getByText("Canvas is closed.")).toBeVisible();

  await card.getByRole("button", { name: "Open canvas" }).click();
  await expect(handle).toHaveAttribute("aria-valuenow", "45");
  await card.getByRole("button", { name: "Reset saved size" }).click();
  await expect(handle).toHaveAttribute("aria-valuenow", "55");
  await page.reload();
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await expect(handle).toHaveAttribute("aria-valuenow", "55");
});

test("on narrow screens the canvas opens in a sheet instead of a split", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openResizable(page);
  const card = example(page, "Chat and canvas");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await card.getByRole("button", { name: "Open canvas" }).click();
  const sheet = page.getByRole("dialog", { name: "Canvas" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("table")).toContainText("Northwind Ltd");
  await expect(card.getByRole("separator")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(card.getByRole("button", { name: "Open canvas" })).toBeVisible();
});

test("file explorer keeps a 220px tree and shows empty, file, loading and error states", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openResizable(page);
  const card = example(page, "File explorer");
  const handle = card.getByRole("separator", { name: "Resize file tree" });
  const body = card.getByTestId("explorer-body");
  const tree = card.locator('[data-slot="resizable-panel"]').first();
  const file = card.locator('[data-slot="resizable-panel"]').last();
  await expect(handle).toHaveAttribute("aria-valuenow", "28");
  await expect(
    file.getByRole("heading", { name: "Select a file" }),
  ).toBeVisible();

  await handle.focus();
  await page.keyboard.press("Home");
  expect(Math.round(await width(tree))).toBe(220);
  await page.keyboard.press("End");
  await expect(handle).toHaveAttribute("aria-valuenow", "65");
  const span = await width(body);
  expect((await width(file)) / span).toBeGreaterThan(0.34);
  for (const panel of await card.locator(".resizable-demo-scroll").all())
    expect(
      await panel.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);

  await card.getByRole("button", { name: "soul/tone.md" }).click();
  await expect(file).toContainText("One idea per sentence");
  await expect(
    card.getByRole("button", { name: "soul/tone.md" }),
  ).toHaveAttribute("aria-current", "true");

  await card.getByRole("button", { name: "Loading", exact: true }).click();
  await expect(card.getByRole("status")).toContainText("Loading Soul");
  await expect(handle).toHaveCount(0);
  await card.getByRole("button", { name: "Error", exact: true }).click();
  await expect(card.getByRole("alert")).toContainText("Soul could not be read");
  await card.getByRole("button", { name: "Try again" }).click();
  await expect(handle).toBeVisible();

  // A narrower group turns the 220px minimum into a larger percent.
  await page.keyboard.press("Home");
  await page.setViewportSize({ width: 1000, height: 1000 });
  await expect(handle).toBeVisible();
  await expect(async () => {
    expect(await width(body)).toBeLessThan(800);
    expect(Math.round(await width(tree))).toBe(220);
  }).toPass();
});

test("on narrow screens the explorer shows one pane with a back button", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openResizable(page);
  const card = example(page, "File explorer");
  await expect(card.getByRole("separator")).toHaveCount(0);
  await card.getByRole("button", { name: "soul/identity.md" }).click();
  await expect(card.getByText("Tulip helps the Growth team")).toBeVisible();
  await card.getByRole("button", { name: "Back" }).click();
  await expect(
    card.getByRole("button", { name: "soul/identity.md" }),
  ).toBeVisible();
});

test("docs navigation lists Resizable", async ({ page }) => {
  await openResizable(page);
  await expect(
    page.getByRole("link", { name: "Resizable", exact: true }).first(),
  ).toHaveAttribute("href", "/components/resizable/");
});
