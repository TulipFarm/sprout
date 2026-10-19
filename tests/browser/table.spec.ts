import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const route = "/components/table/";

async function openTable(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#table-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

// dnd-kit adds its keydown listener in a setTimeout after pickup, so wait one task before moving.
async function keyboardDrag(
  page: Page,
  id: string,
  key: string,
  overId: string,
) {
  await page.keyboard.press("Space");
  await expect(
    page.getByText(`item ${id} was moved over droppable area ${id}.`),
  ).toBeAttached();
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));
  await page.keyboard.press(key);
  await expect(
    page.getByText(`moved over droppable area ${overId}.`),
  ).toBeAttached();
  await page.keyboard.press("Space");
}

async function tokenColor(page: Page, token: string) {
  return page.evaluate((value) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = `var(${value})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  }, token);
}

async function setMode(page: Page, mode: "light" | "dark") {
  const toggle = page.getByRole("button", { name: "Dark mode", exact: true });
  const dark = String(mode === "dark");
  if ((await toggle.getAttribute("aria-pressed")) !== dark)
    await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", dark);
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`table ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openTable(page);
        await page.evaluate(
          (value) =>
            document.documentElement.setAttribute("data-sprout-theme", value),
          theme,
        );
        await setMode(page, mode);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(demo.locator(".table-demo-card")).toHaveCount(11);
        const grid = example(page, "Grid").locator(
          '[data-slot="table-container"]',
        );
        await expect(grid).toHaveCSS(
          "border-top-color",
          await tokenColor(page, "--sprout-input"),
        );
        const results = await new AxeBuilder({ page })
          .include("#table-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(`table-${theme}-${mode}-${width}.png`);
        await demo.screenshot({ animations: "disabled", path });
        await testInfo.attach(`table-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("plain list sorts from the heading", async ({ page }) => {
  await openTable(page);
  const table = example(page, "Plain").getByRole("table", { name: "Tables" });
  const head = table.getByRole("columnheader", { name: /Records/ });
  await head.getByRole("button").click();
  await expect(head).toHaveAttribute("aria-sort", "ascending");
  await expect(table.getByRole("row").nth(1)).toContainText("Wholesale orders");
  await head.getByRole("button").click();
  await expect(head).toHaveAttribute("aria-sort", "descending");
  await expect(table.getByRole("row").nth(1)).toContainText("Invoices");
  await expect(table.getByRole("link", { name: "Customers" })).toHaveAttribute(
    "href",
    "#customers",
  );
});

test("grid selects rows and saves a row edit", async ({ page }) => {
  await openTable(page);
  const card = example(page, "Grid");
  await card.getByRole("checkbox", { name: "Select Lisse Bulb Co." }).click();
  await expect(card.locator('tr[data-state="selected"]')).toHaveCount(1);
  await expect(card.locator('tr[data-state="selected"]')).toHaveCSS(
    "background-color",
    await tokenColor(page, "--sprout-primary-subtle"),
  );
  await expect(card.getByText("1 selected")).toBeVisible();

  await card.getByRole("button", { name: "Edit Lisse Bulb Co." }).click();
  await card
    .getByRole("spinbutton", { name: "Seats for Lisse Bulb Co." })
    .fill("20");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(
    card.getByRole("row", { name: /Lisse Bulb Co\./ }),
  ).toContainText("20");
});

test("filters and groups show chips, group rows, and totals", async ({
  page,
}) => {
  await openTable(page);
  const card = example(page, "Filters and groups");
  const tulip = card.getByRole("button", { name: /Crop: Tulip/ });
  await expect(tulip).toHaveAttribute("aria-expanded", "true");
  await expect(tulip.locator("..").locator("..")).toContainText("€3,572");
  await tulip.click();
  await expect(tulip).toHaveAttribute("aria-expanded", "false");

  await card.getByRole("searchbox").fill("hillegom");
  await expect(
    card.getByRole("cell", { name: "Keukenhof Growers" }),
  ).toHaveCount(0);
  await expect(
    card.getByRole("cell", { name: "Hillegom Seeds" }).first(),
  ).toBeVisible();
});

test("columns menu hides a column", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(route);
  await page.evaluate(() =>
    localStorage.removeItem("sprout-table:docs-orders-layout"),
  );
  await openTable(page);
  const card = example(page, "Column layout");
  await expect(
    card.getByRole("columnheader", { name: /Region/ }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Columns" }).click();
  await page.getByRole("menuitem", { name: "Region" }).hover();
  await page.getByRole("menuitemcheckbox", { name: "Show" }).click();
  await page.keyboard.press("Escape");
  await expect(card.getByRole("columnheader", { name: /Region/ })).toHaveCount(
    0,
  );
  await expect(
    card.getByRole("button", { name: "Resize Customer column" }),
  ).toHaveCount(0);
  await expect(
    card.getByRole("separator", { name: "Resize Customer column" }),
  ).toBeAttached();
});

test("virtual rows draw only part of 300 rows", async ({ page }) => {
  await openTable(page);
  const table = example(page, "Virtual rows").getByRole("table");
  await expect(table).toHaveAttribute("aria-rowcount", "301");
  expect(await table.locator("tbody tr").count()).toBeLessThan(100);
});

test("stack layout turns rows into cards at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openTable(page);
  const card = example(page, "Stack on narrow screens");
  await expect(card.locator("tbody")).toHaveCSS("display", "block");
  await expect(card.locator("thead")).toHaveCSS("position", "absolute");
  await expect(card.getByRole("row", { name: /Field photos/ })).toBeVisible();
  await expect(card.locator('[data-label="Owner"]').first()).toBeVisible();
});

const bodyText = (scope: ReturnType<typeof example>) =>
  scope
    .locator("tbody tr")
    .allInnerTexts()
    .then((rows) => rows.map((r) => r.replace(/\s+/g, " ").trim()));

test("+ Filter adds select and number chips, and × removes them", async ({
  page,
}) => {
  await openTable(page);
  const card = example(page, "Filters and groups");
  await card.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("menuitem", { name: "Region" }).click();
  await page.getByRole("checkbox", { name: "West" }).click();
  await page.keyboard.press("Escape");
  await expect(
    card.getByRole("button", { name: "Region: West" }),
  ).toBeVisible();
  for (const row of await bodyText(card))
    if (!row.startsWith("Crop:")) expect(row).toContain("West");

  await card.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("menuitem", { name: "Boxes" }).click();
  await page.getByRole("spinbutton", { name: "Boxes from" }).fill("10");
  await page.keyboard.press("Escape");
  await expect(card.getByRole("button", { name: "Boxes: ≥ 10" })).toBeVisible();
  await expect(card.getByRole("cell", { name: "Hillegom Seeds" })).toHaveCount(
    1,
  );

  await card.getByRole("button", { name: "Remove Region filter" }).click();
  await card.getByRole("button", { name: "Remove Boxes filter" }).click();
  await expect(
    card.getByRole("button", { name: /Region:|Boxes:/ }),
  ).toHaveCount(0);
  await expect(
    card.getByRole("cell", { name: "Lisse Bulb Co." }).first(),
  ).toBeVisible();
});

test("Group menu changes grouping, and pages move with Next and Previous", async ({
  page,
}) => {
  await openTable(page);
  const card = example(page, "Filters and groups");
  const pages = card.getByRole("navigation", { name: "Orders pages" });
  await expect(pages).toContainText("Page 1 of 2");
  await pages.getByRole("button", { name: "Next" }).click();
  await expect(pages).toContainText("Page 2 of 2");
  await expect(
    card.getByRole("cell", { name: "Keukenhof Growers" }),
  ).toHaveCount(1);
  await pages.getByRole("button", { name: "Previous" }).click();
  await expect(pages).toContainText("Page 1 of 2");

  await card.getByRole("button", { name: "Group: 1" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Crop" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Region" }).click();
  await page.keyboard.press("Escape");
  await expect(
    card.getByRole("button", { name: /^Region: North/ }),
  ).toBeVisible();
  await expect(card.getByRole("button", { name: /^Crop:/ })).toHaveCount(0);
});

test("columns resize by keyboard, reorder by keyboard, and pin from the menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(route);
  await page.evaluate(() =>
    localStorage.removeItem("sprout-table:docs-orders-layout"),
  );
  await openTable(page);
  const card = example(page, "Column layout");
  const headers = () =>
    card
      .locator("thead th:not([data-selection])")
      .allInnerTexts()
      .then((t) => t.map((x) => x.trim()));

  const resizer = card.getByRole("separator", { name: "Resize Crop column" });
  await expect(resizer).toHaveAttribute("aria-valuenow", "130");
  await resizer.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(resizer).toHaveAttribute("aria-valuenow", "180");
  expect(
    await card
      .locator("thead th", { hasText: "Crop" })
      .evaluate((n) => n.getBoundingClientRect().width),
  ).toBeCloseTo(180, 0);

  expect((await headers()).slice(0, 3)).toEqual(["Customer", "Crop", "Region"]);
  await card.getByRole("button", { name: "Move Crop column" }).focus();
  await keyboardDrag(page, "crop", "ArrowRight", "region");
  await expect
    .poll(async () => (await headers()).slice(0, 3))
    .toEqual(["Customer", "Region", "Crop"]);

  await card.getByRole("button", { name: "Columns" }).click();
  await page.getByRole("menuitem", { name: "Boxes" }).hover();
  await page.getByRole("menuitemradio", { name: "Pin to end" }).click();
  await page.keyboard.press("Escape");
  const boxes = card.locator("thead th", { hasText: "Boxes" });
  await expect(boxes).toHaveAttribute("data-pinned", "end");
  await expect(boxes).toHaveCSS("position", "sticky");
  expect((await headers()).at(-1)).toBe("Boxes");

  await page.reload();
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await expect(
    card.getByRole("separator", { name: "Resize Crop column" }),
  ).toHaveAttribute("aria-valuenow", "180");
  await expect(card.locator("thead th", { hasText: "Boxes" })).toHaveAttribute(
    "data-pinned",
    "end",
  );
  expect((await headers()).slice(0, 3)).toEqual(["Customer", "Region", "Crop"]);

  await card.getByRole("button", { name: "Columns" }).click();
  await page.getByRole("menuitem", { name: "Reset columns" }).click();
  await expect(
    card.locator("thead th", { hasText: "Boxes" }),
  ).not.toHaveAttribute("data-pinned", "end");
  expect((await headers()).slice(0, 3)).toEqual(["Customer", "Crop", "Region"]);
});

test("rows reorder by keyboard drag", async ({ page }) => {
  await openTable(page);
  const card = example(page, "Virtual rows");
  await expect(card.locator("tbody tr").first()).toContainText("Bed 1");
  await card.getByRole("button", { name: "Move Bed 1", exact: true }).focus();
  await keyboardDrag(page, "bed-1", "ArrowDown", "bed-2");
  await expect
    .poll(() => bodyText(card).then((r) => r.slice(0, 2)))
    .toEqual([
      expect.stringContaining("Bed 2"),
      expect.stringContaining("Bed 1"),
    ]);
});

test("Shift+click selects and clears a range of rows", async ({ page }) => {
  await openTable(page);
  const card = example(page, "Grid");
  const boxes = card.locator("tbody").getByRole("checkbox");
  await boxes.nth(0).click();
  await boxes.nth(2).click({ modifiers: ["Shift"] });
  await expect(card.getByText("3 selected")).toBeVisible();
  for (const i of [0, 1, 2]) await expect(boxes.nth(i)).toBeChecked();
  await boxes.nth(1).click({ modifiers: ["Shift"] });
  await expect(card.getByText("1 selected")).toBeVisible();
  await expect(boxes.nth(0)).toBeChecked();
  await expect(boxes.nth(1)).not.toBeChecked();
  await expect(boxes.nth(2)).not.toBeChecked();
});

test("pinned columns stick next to the checkbox and actions columns", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openTable(page);
  const box = (cell: { evaluate: Locator["evaluate"] }) =>
    cell.evaluate((n) => n.getBoundingClientRect());
  const gap = async (a: Locator, b: Locator) =>
    Math.round((await box(b)).left - (await box(a)).right);

  const grid = example(page, "Grid").locator("tbody tr").first();
  await expect
    .poll(() =>
      gap(
        grid.locator('td[data-label="Seats"]'),
        grid.locator("td[data-sticky-end]"),
      ),
    )
    .toBe(0);

  await page.evaluate(() =>
    localStorage.removeItem("sprout-table:docs-orders-layout"),
  );
  const card = example(page, "Column layout");
  const row = card.locator("tbody tr").first();
  const viewport = card.locator("[data-slot=scroll-area-viewport]");
  await viewport.evaluate((n) => n.scrollTo({ left: n.scrollWidth }));
  expect(await viewport.evaluate((n) => n.scrollLeft)).toBeGreaterThan(0);
  await expect(row.locator("td[data-selection]")).toHaveCSS(
    "position",
    "sticky",
  );
  await expect
    .poll(async () =>
      Math.round(
        (await box(row.locator("td[data-selection]"))).left -
          (await box(viewport)).left,
      ),
    )
    .toBe(0);
  await expect
    .poll(() =>
      gap(
        row.locator("td[data-selection]"),
        row.locator('td[data-label="Customer"]'),
      ),
    )
    .toBe(0);
});

test("row edit keeps the row open and shows the error when save fails", async ({
  page,
}) => {
  await openTable(page);
  const card = example(page, "Grid");
  await card.getByRole("button", { name: "Edit Keukenhof Growers" }).click();
  await card
    .getByRole("textbox", { name: "Name for Keukenhof Growers" })
    .fill("");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByRole("alert")).toHaveText("Name is required.");
  await expect(
    card.getByRole("textbox", { name: "Name for Keukenhof Growers" }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Cancel" }).click();
  await expect(card.getByRole("alert")).toHaveCount(0);
  await expect(
    card.getByRole("cell", { name: "Keukenhof Growers", exact: true }),
  ).toBeVisible();
});

test("row click and file drop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openTable(page);
  const card = example(page, "Stack on narrow screens");
  await card.getByRole("button", { name: "Field photos" }).click();
  await expect(card.getByText("Opened Field photos")).toBeVisible();

  const row = card.getByRole("row", { name: /Supplier contracts/ });
  await expect(row).toContainText("3");
  await row.evaluate((node) => {
    const data = new DataTransfer();
    data.items.add(new File(["a"], "a.pdf"));
    data.items.add(new File(["b"], "b.pdf"));
    node.dispatchEvent(
      new DragEvent("dragover", {
        dataTransfer: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(row).toHaveAttribute("data-drop-target", "true");
  await row.evaluate((node) => {
    const data = new DataTransfer();
    data.items.add(new File(["a"], "a.pdf"));
    data.items.add(new File(["b"], "b.pdf"));
    node.dispatchEvent(
      new DragEvent("drop", {
        dataTransfer: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(row).not.toHaveAttribute("data-drop-target", "true");
  await expect(row.locator('[data-label="Files"]')).toHaveText("5");
});

test("sub-rows close and open", async ({ page }) => {
  await openTable(page);
  const card = example(page, "Sub-rows");
  const toggle = card.getByRole("button", { name: "Collapse North" });
  await expect(card.getByText("Amsterdam Florals")).toBeVisible();
  await toggle.click();
  await expect(card.getByText("Amsterdam Florals")).toHaveCount(0);
  await card.getByRole("button", { name: "Expand North" }).click();
  await expect(card.getByText("Amsterdam Florals")).toBeVisible();
  await expect(card.getByText("Lisse Bulb Co.")).toBeVisible();
});

test("manual mode hands sort, search, and pages to the server", async ({
  page,
}) => {
  await openTable(page);
  const card = example(page, "Server data");
  const pages = card.getByRole("navigation", { name: "Server orders pages" });
  await expect(pages).toContainText("Page 1 of 3");
  expect(await card.locator("tbody tr").count()).toBe(3);
  await card.getByRole("button", { name: "Sort by Boxes" }).click();
  await expect(card.locator("tbody tr").first()).toContainText(
    "Amsterdam Florals",
  );
  await pages.getByRole("button", { name: "Next" }).click();
  await expect(pages).toContainText("Page 2 of 3");
  await expect(card.locator("tbody tr").first()).toContainText(
    "Keukenhof Growers",
  );
  await card.getByRole("searchbox").fill("lisse");
  await expect(card.locator("tbody tr")).toHaveCount(2);
  await expect(pages).toHaveCount(0);
});

test("URL state survives a reload and a shared link", async ({ page }) => {
  await openTable(page);
  const card = example(page, "URL state");
  await card.getByRole("button", { name: "Sort by Customer" }).click();
  await expect(page).toHaveURL(/orders-sort=customer\.asc/);
  await card.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("menuitem", { name: "Crop" }).click();
  await page.getByRole("checkbox", { name: "Tulip" }).click();
  await page.getByRole("checkbox", { name: "Daffodil" }).click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/orders-filters=/);
  await card
    .getByRole("navigation", { name: "Shared orders pages" })
    .getByRole("button", { name: "Next" })
    .click();
  await expect(page).toHaveURL(/orders-page=2/);
  const shared = page.url();

  await page.goto(route);
  await expect(page).not.toHaveURL(/orders-/);
  await page.goto(shared);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await expect(
    card.getByRole("columnheader", { name: /Customer/ }),
  ).toHaveAttribute("aria-sort", "ascending");
  await expect(
    card.getByRole("button", { name: "Crop: Tulip, Daffodil" }),
  ).toBeVisible();
  await expect(
    card.getByRole("navigation", { name: "Shared orders pages" }),
  ).toContainText("Page 2 of 2");
  expect(await bodyText(card)).toEqual([
    expect.stringMatching(/^Lisse Bulb Co\./),
    expect.stringMatching(/^Lisse Bulb Co\./),
  ]);
});
