import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/separator/";

async function openSeparator(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#separator-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function resolveColor(page: Page, value: string) {
  return page.evaluate((color) => {
    const probe = document.createElement("span");
    probe.style.color = color;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, value);
}

const demoIds = [
  "separator-demo",
  "separator-fade-demo",
  "separator-marker-demo",
];

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`separator ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        await openSeparator(page);
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
        await expect(
          example(page, "Orientations").locator('[role="separator"]').first(),
        ).toHaveCSS(
          "background-color",
          await resolveColor(page, "var(--sprout-line)"),
        );
        const muted = await resolveColor(page, "var(--sprout-muted)");
        await expect(
          example(page, "Fade labels").getByRole("separator").first(),
        ).toHaveCSS("color", muted);
        await expect(
          page.getByTestId("variant-marker").locator('[data-variant="marker"]'),
        ).toHaveCSS("color", muted);
        // No card content may spill past its card.
        for (const card of await page
          .locator(demoIds.map((id) => `.${id}-card-body`).join(", "))
          .all()) {
          expect(
            await card.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        const axe = new AxeBuilder({ page }).withTags([
          "wcag2a",
          "wcag2aa",
          "wcag21aa",
          "wcag22aa",
        ]);
        for (const id of demoIds) axe.include(`#${id}`);
        expect((await axe.analyze()).violations).toEqual([]);
        for (const id of demoIds) {
          const name = `${id}-${theme}-${mode}-${width}`;
          const path = testInfo.outputPath(`${name}.png`);
          const shot = await page
            .locator(`#${id}`)
            .screenshot({ animations: "disabled", path });
          expect(shot.byteLength).toBeGreaterThan(10_000);
          await testInfo.attach(name, { path, contentType: "image/png" });
        }
      });
    }
  }
}

test("horizontal and vertical separators keep 1px geometry", async ({
  page,
}) => {
  await openSeparator(page);
  const card = example(page, "Orientations");
  const horizontal = card.locator('[aria-orientation="horizontal"]');
  await expect(horizontal).toHaveCSS("height", "1px");
  const panel = await card.locator(".separator-demo-panel").boundingBox();
  const hBox = await horizontal.boundingBox();
  // Panel has 16px padding on each side.
  expect(Math.round(hBox!.width)).toBe(Math.round(panel!.width - 34));
  const verticals = card.locator('[aria-orientation="vertical"]');
  await expect(verticals).toHaveCount(2);
  const row = await card.getByTestId("meta-row").boundingBox();
  for (const vertical of await verticals.all()) {
    await expect(vertical).toHaveCSS("width", "1px");
    const box = await vertical.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(16);
    expect(box!.height).toBeLessThanOrEqual(row!.height);
  }
});

test("button group separators use the input tone and span the group", async ({
  page,
}) => {
  await openSeparator(page);
  const card = example(page, "Button groups");
  const row = card.getByRole("group", { name: "Row pages" });
  const column = card.getByRole("group", { name: "Column pages" });
  const rowLine = row.locator('[role="separator"]');
  const columnLine = column.locator('[role="separator"]');
  await expect(rowLine).toHaveAttribute("aria-orientation", "vertical");
  await expect(columnLine).toHaveAttribute("aria-orientation", "horizontal");
  await expect(rowLine).toHaveAttribute("data-tone", "input");
  const input = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--sprout-input)";
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  await expect(rowLine).toHaveCSS("background-color", input);
  const line = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--sprout-line)";
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  expect(input).not.toBe(line);
  const button = await row.getByRole("button", { name: "Next" }).boundingBox();
  const vertical = await rowLine.boundingBox();
  expect(Math.round(vertical!.height)).toBe(Math.round(button!.height));
  const columnButton = await column
    .getByRole("button", { name: "Next" })
    .boundingBox();
  const horizontal = await columnLine.boundingBox();
  expect(Math.round(horizontal!.width)).toBe(Math.round(columnButton!.width));
});

test("keyboard moves across separators, which never take focus", async ({
  page,
}) => {
  await openSeparator(page);
  const row = example(page, "Button groups").getByRole("group", {
    name: "Row pages",
  });
  const next = row.getByRole("button", { name: "Next" });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(
    example(page, "Button groups").getByRole("status").first(),
  ).toHaveText("Page 2 of 3");
  const previous = row.getByRole("button", { name: "Previous" });
  await previous.focus();
  await page.keyboard.press("Tab");
  await expect(next).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(previous).toBeFocused();
  const focusable = await page
    .locator('#separator-demo [role="separator"]')
    .evaluateAll(
      (nodes) =>
        nodes.filter((node) => (node as HTMLElement).tabIndex >= 0).length,
    );
  expect(focusable).toBe(0);
});

test("labeled separators center text, keep spacing, and truncate long text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openSeparator(page);
  const card = example(page, "Form sections");
  const or = card.locator('[data-variant="label"]').filter({ hasText: /^or$/ });
  await expect(or).toHaveAttribute("data-content", "true");
  await expect(or.locator('[role="separator"]')).toHaveCount(1);
  const wrap = await or.boundingBox();
  const label = await or
    .locator('[data-slot="separator-label-content"]')
    .boundingBox();
  const center = label!.x + label!.width / 2;
  expect(Math.abs(center - (wrap!.x + wrap!.width / 2))).toBeLessThan(2);
  await expect(or).toHaveCSS("height", "20px");
  const plain = card.getByTestId("plain-labeled");
  await expect(plain).toHaveAttribute("data-content", "false");
  await expect(plain).toHaveCSS("height", "20px");
  const long = card
    .locator('[data-slot="separator-label-content"]')
    .filter({ hasText: "Notification preferences" });
  await expect(long).toHaveCSS("text-overflow", "ellipsis");
  const longBox = await long.boundingBox();
  const formBox = await card
    .getByRole("form", { name: "Profile" })
    .boundingBox();
  expect(longBox!.x + longBox!.width).toBeLessThanOrEqual(
    formBox!.x + formBox!.width,
  );
  await card
    .getByRole("button", { name: "Continue with single sign-on" })
    .click();
  await expect(card.getByRole("status")).toHaveText("Chosen: Single sign-on");
});

test("list states never leave a stray separator", async ({ page }) => {
  await openSeparator(page);
  const card = example(page, "Item lists");
  const list = card.getByRole("list", { name: "Files" });
  await expect(list.locator('[role="separator"]')).toHaveCount(2);
  await expect(list.locator('[role="separator"]').first()).toHaveCSS(
    "margin-top",
    "8px",
  );
  await chooseOption(page, "List state", "Loading");
  await expect(list.locator('[aria-busy="true"]')).toBeVisible();
  await expect(list.locator('[role="separator"]')).toHaveCount(2);
  await chooseOption(page, "List state", "Empty");
  await expect(list).toContainText("No files yet");
  await expect(list.locator('[role="separator"]')).toHaveCount(0);
  await chooseOption(page, "List state", "Ready");
  await expect(list.getByRole("listitem")).toHaveCount(3);
});

test("sidebar separators inset 8px between groups", async ({
  page,
}, testInfo) => {
  await openSeparator(page);
  const card = example(page, "Sidebar");
  const panel = card.getByRole("complementary", {
    name: "Settings navigation",
  });
  const separators = panel.locator('[data-sidebar="separator"]');
  await expect(separators).toHaveCount(2);
  const panelBox = await panel.boundingBox();
  for (const separator of await separators.all()) {
    await expect(separator).toHaveAttribute("role", "separator");
    await expect(separator).toHaveCSS("height", "1px");
    const box = await separator.boundingBox();
    expect(Math.round(box!.x - panelBox!.x)).toBe(8);
  }
  await panel.getByRole("button", { name: "Notifications" }).click();
  await expect(card.locator(".separator-demo-sidebar-main")).toContainText(
    "Notifications",
  );
  const path = testInfo.outputPath("separator-sidebar.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("separator-sidebar", {
    path,
    contentType: "image/png",
  });
});

test("reduced motion removes the color transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSeparator(page);
  const line = example(page, "Orientations")
    .locator('[role="separator"]')
    .first();
  await expect(line).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(line).toHaveCSS("transition-duration", "0.12s");
});

test("fade labels name full-width separators with faded lines", async ({
  page,
}) => {
  await openSeparator(page);
  const card = example(page, "Fade labels");
  const auto = card.getByRole("separator", { name: "Auto compacted" });
  const manual = card.getByRole("separator", {
    name: "Compacted",
    exact: true,
  });
  await expect(auto).toHaveAttribute("aria-orientation", "horizontal");
  await expect(auto).toHaveAttribute("data-variant", "fade");
  await expect(manual).toBeVisible();
  const container = await card
    .locator(".separator-fade-demo-labels")
    .boundingBox();
  const box = await auto.boundingBox();
  expect(Math.round(box!.width)).toBe(Math.round(container!.width));
  // Label sits in the middle with lines either side.
  const label = await auto
    .locator(":scope > .sprout-separator-fade-label")
    .boundingBox();
  const center = box!.x + box!.width / 2;
  expect(Math.abs(label!.x + label!.width / 2 - center)).toBeLessThan(2);
  const line = await resolveColor(page, "var(--sprout-line)");
  const before = await auto.evaluate((node) => {
    const style = getComputedStyle(node, "::before");
    return { image: style.backgroundImage, height: style.height };
  });
  expect(before.height).toBe("1px");
  expect(before.image).toContain("linear-gradient");
  expect(before.image).toContain(line);
  const shine = auto.locator(".sprout-separator-fade-shine");
  await expect(shine).toHaveAttribute("aria-hidden", "true");
  await expect(shine).toHaveCSS("opacity", "0");
});

test("fade chat compaction switches labels and the pending status row by keyboard", async ({
  page,
}, testInfo) => {
  await openSeparator(page);
  const card = example(page, "Chat compaction");
  const log = card.getByRole("log", { name: "Sample chat" });
  await expect(
    log.getByRole("separator", { name: "Compacted", exact: true }),
  ).toBeVisible();

  const automatic = card.getByRole("button", { name: "Automatic" });
  await card.getByRole("button", { name: "Manual" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(automatic).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(automatic).toHaveAttribute("aria-pressed", "true");
  await expect(
    log.getByRole("separator", { name: "Auto compacted" }),
  ).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(
    card.getByRole("button", { name: "Inactivity recap" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    log.getByRole("separator", { name: "Auto compacted" }),
  ).toBeVisible();

  await card.getByRole("button", { name: "Writing handoff" }).click();
  await expect(log.getByRole("separator")).toHaveCount(0);
  await expect(log.getByRole("status")).toHaveText(
    "Writing the handoff for this chat…",
  );
  await card.getByRole("button", { name: "Completed" }).click();
  await expect(
    log.getByRole("separator", { name: "Auto compacted" }),
  ).toBeVisible();

  const focusable = await page
    .locator('#separator-fade-demo [data-variant="fade"]')
    .evaluateAll(
      (nodes) =>
        nodes.filter((node) => (node as HTMLElement).tabIndex >= 0).length,
    );
  expect(focusable).toBe(0);
  await card.getByRole("button", { name: "Completed" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).not.toHaveAttribute(
    "data-variant",
    "fade",
  );

  const path = testInfo.outputPath("separator-fade-chat-compaction.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("separator-fade-chat-compaction", {
    path,
    contentType: "image/png",
  });
});

test("fade narrow columns truncate the label without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openSeparator(page);
  const columns = example(page, "Narrow columns").getByTestId("narrow-column");
  await expect(columns).toHaveCount(2);
  for (const column of await columns.all()) {
    const fade = column.getByRole("separator");
    expect(
      await column.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    const label = fade.locator(":scope > .sprout-separator-fade-label");
    await expect(label).toHaveCSS("text-overflow", "ellipsis");
    await expect(label).toHaveCSS("white-space", "nowrap");
    const lines = await fade.evaluate((node) =>
      ["::before", "::after"].map((pseudo) =>
        parseFloat(getComputedStyle(node, pseudo).width),
      ),
    );
    for (const width of lines) expect(width).toBeGreaterThanOrEqual(12);
  }
  const auto = columns
    .first()
    .locator('[role="separator"] > .sprout-separator-fade-label');
  expect(
    await auto.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
});

test("fade hover sweeps the shine once and reduced motion disables it", async ({
  page,
}) => {
  await openSeparator(page);
  const fade = example(page, "Fade labels").getByRole("separator").first();
  const shine = fade.locator(".sprout-separator-fade-shine");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await fade.hover();
  await expect(shine).toHaveCSS(
    "animation-name",
    "sprout-separator-fade-shine",
  );
  await expect(shine).toHaveCSS("animation-duration", "0.65s");
  await page.mouse.move(0, 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fade.hover();
  await expect(shine).toHaveCSS("animation-name", "none");
  await expect(shine).toHaveCSS("opacity", "0");
});

test("marker variants render their lines, spacing, and icon size", async ({
  page,
}) => {
  await openSeparator(page);
  const line = await resolveColor(page, "var(--sprout-line)");

  const plain = page
    .getByTestId("variant-marker")
    .locator('[data-variant="marker"]');
  await expect(plain).toHaveAttribute("data-slot", "separator");
  await expect(plain).toHaveCSS("font-size", "14px");
  await expect(plain).toHaveCSS("column-gap", "8px");
  await expect(plain).toHaveCSS("border-bottom-width", "0px");
  const icon = plain.locator('[data-slot="separator-icon"]');
  await expect(icon).toHaveAttribute("aria-hidden", "true");
  const svg = await icon.locator("svg").boundingBox();
  expect(Math.round(svg!.width)).toBe(16);
  expect(Math.round(svg!.height)).toBe(16);

  // A day break is a labeled Separator with an icon between two lines.
  const label = page
    .getByTestId("variant-label")
    .locator('[data-variant="label"]');
  await expect(label).toHaveAttribute("data-slot", "separator");
  const sides = label.locator(".sprout-separator-label-line");
  await expect(sides).toHaveCount(2);
  const widths: number[] = [];
  for (const side of await sides.all()) {
    await expect(side).toHaveCSS("height", "1px");
    await expect(side).toHaveCSS("background-color", line);
    const box = await side.boundingBox();
    expect(box!.width).toBeGreaterThan(20);
    widths.push(box!.width);
  }
  // Lines grow equally, so the label sits in the middle.
  expect(Math.abs(widths[0]! - widths[1]!)).toBeLessThan(2);
  const content = label.locator('[data-slot="separator-label-content"]');
  await expect(content).toHaveCSS("text-align", "center");
  await expect(content).toHaveText("Today");
  const labelSvg = await content
    .locator('[data-slot="separator-icon"] svg')
    .boundingBox();
  expect(Math.round(labelSvg!.width)).toBe(16);

  const border = page
    .getByTestId("variant-marker-border")
    .locator('[data-variant="marker-border"]');
  await expect(border).toHaveCSS("border-bottom-width", "1px");
  await expect(border).toHaveCSS("border-bottom-color", line);
  await expect(border).toHaveCSS("padding-bottom", "8px");
});

test("marker playground shows all three rows with check icons", async ({
  page,
}, testInfo) => {
  await openSeparator(page);
  const card = example(page, "Timeline marker variants");
  const rows = card.locator(".separator-marker-demo-preview > *");
  await expect(rows).toHaveCount(3);
  for (const [index, variant] of [
    "marker",
    "label",
    "marker-border",
  ].entries()) {
    await expect(rows.nth(index)).toHaveAttribute("data-variant", variant);
    await expect(rows.nth(index)).toHaveText(`${variant} · Today`);
    await expect(rows.nth(index).locator("svg")).toHaveCount(1);
  }
  const path = testInfo.outputPath("separator-marker-playground.png");
  await card.screenshot({ animations: "disabled", path });
  await testInfo.attach("separator-marker-playground", {
    path,
    contentType: "image/png",
  });
});

test("marker chat skill use reads as plain text and never takes focus", async ({
  page,
}, testInfo) => {
  await openSeparator(page);
  const log = example(page, "Chat skill use").getByRole("log", {
    name: "Sample chat",
  });
  await expect(
    log.getByText("Used skill Weekly report · 3f9a2c1b"),
  ).toBeVisible();
  await expect(
    log.getByText("Used skill Plain language · a71e09c4"),
  ).toBeVisible();
  await expect(log.locator('[data-variant="marker"]')).toHaveCount(2);
  await expect(log.locator('[data-variant="label"]')).toHaveText("Today");
  const tabbable = await page
    .locator('#separator-marker-demo div[data-slot="separator"]')
    .evaluateAll(
      (nodes) =>
        nodes.filter((node) => (node as HTMLElement).tabIndex >= 0).length,
    );
  expect(tabbable).toBe(0);
  const path = testInfo.outputPath("separator-marker-chat.png");
  await log.screenshot({ animations: "disabled", path });
  await testInfo.attach("separator-marker-chat", {
    path,
    contentType: "image/png",
  });
});

test("marker links underline, focus by keyboard, and darken", async ({
  page,
}) => {
  await openSeparator(page);
  const card = example(page, "Links");
  const text = await resolveColor(page, "var(--sprout-text)");
  const muted = await resolveColor(page, "var(--sprout-muted)");

  const inline = card.getByRole("link", { name: "View changes" });
  const whole = card.getByRole("link", {
    name: "Open skill Weekly report · 3f9a2c1b",
  });
  await expect(whole).toHaveAttribute("data-slot", "separator");
  await expect(whole).toHaveAttribute("data-variant", "marker");
  for (const link of [inline, whole]) {
    await expect(link).toHaveCSS("text-decoration-line", "underline");
    await expect(link).toHaveCSS("color", muted);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await inline.focus();
  await expect(inline).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(whole).toBeFocused();
  await expect(whole).toHaveCSS("color", text);
  await expect(whole).toHaveCSS("outline-style", "solid");
  await expect(whole).toHaveCSS("transition-duration", "0s");
  await page.keyboard.press("Shift+Tab");
  await expect(inline).toBeFocused();
  await expect(inline).toHaveCSS("color", text);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(whole).toHaveCSS("transition-duration", "0.12s");
});

test("marker narrow columns wrap marker text and truncate labeled rows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openSeparator(page);
  const card = example(page, "Long content");
  for (const variant of ["marker", "marker-border"]) {
    const column = card.getByTestId(`narrow-${variant}`);
    expect(
      await column.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    const marker = column.locator(`[data-variant="${variant}"]`);
    const content = marker.locator('[data-slot="separator-content"]');
    const box = await content.boundingBox();
    expect(box!.height).toBeGreaterThan(24);
    const markerBox = await marker.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(
      markerBox!.x + markerBox!.width + 0.5,
    );
  }
  const column = card.getByTestId("narrow-label");
  expect(
    await column.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  const content = column.locator('[data-slot="separator-label-content"]');
  await expect(content).toHaveCSS("text-overflow", "ellipsis");
  await expect(content).toHaveCSS("white-space", "nowrap");
  expect(
    await content.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  const box = await content.boundingBox();
  const columnBox = await column.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(
    columnBox!.x + columnBox!.width,
  );
});
