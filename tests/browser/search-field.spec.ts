import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/search-field/";

async function open(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#search-field-demo");
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

const group = (page: Page, label: string) =>
  page
    .getByRole("searchbox", { name: label, exact: true })
    .locator("xpath=ancestor::*[@data-slot='search-field'][1]");

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`search field ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await open(page);
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
        const filled = group(page, "Search Google Drive").first();
        await expect(filled).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-surface)"),
        );
        await expect(filled).toHaveCSS(
          "border-top-color",
          await cssColor(page, "var(--sprout-input)"),
        );
        await expect(
          page.getByRole("searchbox", { name: "Search models" }),
        ).toHaveCSS("color", await cssColor(page, "var(--sprout-text)"));
        for (const body of await demo
          .locator(".search-field-demo-card-body")
          .all()) {
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        for (const field of await demo
          .locator("[data-slot=search-field]:visible")
          .all()) {
          const box = await field.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width);
          expect(box!.height).toBe(32);
        }
        const results = await new AxeBuilder({ page })
          .include("#search-field-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `search-field-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`search-field-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("matches Cloud dimensions, placeholders, and limits", async ({
  page,
}, testInfo) => {
  await open(page);
  const models = page.getByRole("searchbox", { name: "Search models" });
  await expect(models).toHaveAttribute("type", "search");
  await expect(models).toHaveAttribute("placeholder", "Search models");
  await expect(models).not.toHaveAttribute("maxlength", /.*/);
  await expect(models).toHaveCSS("font-size", "14px");
  const wrapper = page
    .getByTestId("state-label-placeholder")
    .locator("[data-slot=search-field]");
  await expect(wrapper).toHaveCSS("max-width", "384px");
  await expect(
    page
      .getByTestId("state-label-placeholder")
      .locator("[data-slot=input-group-addon] svg")
      .first(),
  ).toHaveCSS("width", "16px");
  const limits: [string, string | null, string][] = [
    ["Find agents", "Search agents", "120"],
    ["Search Google Drive", null, "500"],
    ["Search chats", null, "640"],
    ["Search invitations", "Search email, validity, or delivery", "254"],
  ];
  for (const [label, placeholder, max] of limits) {
    const input = page
      .getByRole("searchbox", { name: label, exact: true })
      .first();
    await expect(input).toHaveAttribute("maxlength", max);
    await expect(input).toHaveAttribute("placeholder", placeholder ?? label);
  }
  await expect(page.locator("#state-agent-search")).toHaveAttribute(
    "aria-label",
    "Find agents",
  );
  const agents = page.getByRole("searchbox", { name: "Find agents" }).first();
  await agents.fill("x".repeat(200));
  await expect(agents).toHaveValue("x".repeat(120));
  const clear = page
    .getByTestId("state-filled")
    .getByRole("button", { name: "Clear search" });
  await expect(clear).toHaveCSS("width", "24px");
  await expect(clear).toHaveCSS("height", "24px");
  const long = page.getByTestId("state-long");
  const chats = long.getByRole("searchbox", { name: "Search chats" });
  expect(
    await chats.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  const box = await long.locator("[data-slot=search-field]").boundingBox();
  const parent = await long.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(
    parent!.x + parent!.width + 0.5,
  );
  await expect(
    long.getByRole("button", { name: "Clear search" }),
  ).toBeVisible();
  const path = testInfo.outputPath("search-field-states.png");
  await example(page, "States").screenshot({ animations: "disabled", path });
  await testInfo.attach("search-field-states", {
    path,
    contentType: "image/png",
  });
});

test("keyboard: type, clear with button and Escape, focus ring", async ({
  page,
}) => {
  await open(page);
  const input = page.getByRole("searchbox", { name: "Search models" });
  const ring = group(page, "Search models");
  await input.focus();
  await page.keyboard.type("gpt");
  await expect(input).toHaveValue("gpt");
  await expect(ring).toHaveCSS("outline-style", "solid");
  await expect(ring).toHaveCSS("outline-width", "2px");
  await expect(ring).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-focus)"),
  );
  const clear = page
    .getByTestId("state-label-placeholder")
    .getByRole("button", { name: "Clear search" });
  await expect(clear).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(clear).toBeFocused();
  await expect(ring).toHaveCSS("outline-width", "0px");
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(clear).toHaveCount(0);
  await page.keyboard.type("claude");
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await page.keyboard.type("x");
  await clear.click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await input.blur();
  await page
    .getByTestId("state-label-placeholder")
    .locator("[data-slot=input-group-addon] svg")
    .first()
    .click({ force: true });
  await expect(input).toBeFocused();
});

test("disabled fieldset disables the input and clear button", async ({
  page,
}) => {
  await open(page);
  const sample = page.getByTestId("state-disabled");
  const input = sample.getByRole("searchbox", { name: "Search apps" });
  await expect(input).toBeDisabled();
  await expect(input).toHaveValue("Slack");
  await expect(
    sample.getByRole("button", { name: "Clear search" }),
  ).toBeDisabled();
  await expect(sample.locator("[data-slot=search-field]")).toHaveCSS(
    "opacity",
    "0.5",
  );
  await expect(sample.locator("[data-slot=search-field]")).toHaveCSS(
    "background-color",
    await cssColor(page, "var(--sprout-hover)"),
  );
});

test("filters a page list with counts and an empty state", async ({
  page,
}, testInfo) => {
  await open(page);
  const list = page.getByTestId("list-filter");
  const input = list.getByRole("searchbox", { name: "Find agents" });
  await expect(input).toHaveAttribute("id", "agent-search");
  await input.fill("renewal");
  await expect(list.getByRole("status")).toHaveText("1 matching agent");
  await input.fill("payroll");
  await expect(
    list.getByRole("heading", { name: "No agents match “payroll”" }),
  ).toBeVisible();
  const path = testInfo.outputPath("search-field-empty.png");
  await example(page, "Filter a page list").screenshot({
    animations: "disabled",
    path,
  });
  await testInfo.attach("search-field-empty", {
    path,
    contentType: "image/png",
  });
  await list
    .getByRole("button", { name: "Clear search", exact: true })
    .last()
    .click();
  await expect(input).toHaveValue("");
  await expect(
    list.getByRole("list", { name: "Agents" }).getByRole("listitem"),
  ).toHaveCount(4);
});

test("shelf placeholders and conditional workflow search", async ({ page }) => {
  await open(page);
  const projects = page.getByTestId("projects");
  const input = projects.getByRole("searchbox", { name: "Search projects" });
  await expect(input).toHaveAttribute("placeholder", "Search active projects");
  await input.fill("launch");
  await expect(projects.getByRole("status")).toHaveText(
    "1 project matches “launch”.",
  );
  await projects.getByRole("button", { name: "Archived" }).click();
  await expect(input).toHaveAttribute(
    "placeholder",
    "Search archived projects",
  );
  await expect(projects.getByRole("list", { name: "Projects" })).toHaveText(
    "Q2 launch plan",
  );
  const flows = page.getByTestId("workflows");
  await expect(
    flows.getByRole("searchbox", { name: "Find workflows" }),
  ).toHaveAttribute("placeholder", "Search current workflows");
  await flows.getByRole("button", { name: "Archived workflows" }).click();
  await expect(flows.getByRole("searchbox")).toHaveCount(0);
});

test("actions: import button, submit-on-Enter catalog, owner filter", async ({
  page,
}) => {
  await open(page);
  const picker = page.getByTestId("skill-picker");
  await expect(
    picker.getByRole("searchbox", { name: "Find skills" }),
  ).toHaveAttribute("maxlength", "120");
  await picker.getByRole("button", { name: "Import skill" }).click();
  await expect(picker.getByRole("status")).toHaveText("Import opens here.");
  const catalog = page.getByTestId("mcp-catalog");
  const results = page.getByRole("list", { name: "MCP catalog results" });
  const query = catalog.getByRole("searchbox", { name: "Search MCP Registry" });
  await expect(query).toHaveAttribute(
    "placeholder",
    "Search remote MCP servers",
  );
  await query.fill("lin");
  await expect(results.getByRole("listitem")).toHaveCount(3);
  await query.press("Enter");
  await expect(results.getByRole("listitem")).toHaveCount(1);
  await catalog.getByRole("button", { name: "Clear search" }).click();
  await expect(results.getByRole("listitem")).toHaveCount(3);
  const repos = page.getByTestId("github-repos");
  await repos
    .getByRole("searchbox", { name: "Find repositories" })
    .fill("pricing");
  await expect(page.getByRole("list", { name: "Repositories" })).toHaveText(
    "northwind/pricing-api",
  );
  await chooseOption(page, "Repository owner", "tulipfarm");
  await expect(page.getByRole("list", { name: "Repositories" })).toHaveText(
    "No repositories match.",
  );
});

test("breadcrumb headers wrap on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await open(page);
  const header = page.getByTestId("files-header");
  const input = header.getByRole("searchbox", { name: "Search My files" });
  await input.fill("deck");
  await expect(header.getByText("Search results")).toBeVisible();
  await expect(header.getByRole("list", { name: "My files" })).toHaveText(
    "Board deck Q3.pdf",
  );
  const crumbs = await header
    .getByRole("navigation", { name: "Folder path" })
    .boundingBox();
  const field = await header.locator("[data-slot=search-field]").boundingBox();
  expect(field!.y).toBeGreaterThan(crumbs!.y);
  await expect(
    page.getByRole("searchbox", { name: "Search Google Drive" }).last(),
  ).toHaveAttribute("maxlength", "500");
  const path = testInfo.outputPath("search-field-headers-mobile.png");
  await example(page, "Beside breadcrumbs").screenshot({
    animations: "disabled",
    path,
  });
  await testInfo.attach("search-field-headers-mobile", {
    path,
    contentType: "image/png",
  });
});

test("popover picker: loading, error, empty, and Escape order", async ({
  page,
}, testInfo) => {
  await open(page);
  const card = example(page, "In a popover and a query bar");
  await card.getByRole("button", { name: "Globex" }).click();
  const input = page.getByRole("searchbox", { name: "Search Customer" });
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS("outline-style", "none");
  await expect(group(page, "Search Customer")).toHaveCSS(
    "outline-width",
    "2px",
  );
  await expect(
    page.getByRole("list", { name: "Customers" }).getByRole("listitem"),
  ).toHaveCount(5);
  await input.fill("north");
  await expect(page.getByRole("list", { name: "Customers" })).toHaveText(
    "Northwind Traders",
  );
  const path = testInfo.outputPath("search-field-popover.png");
  await page.screenshot({ animations: "disabled", path });
  await testInfo.attach("search-field-popover", {
    path,
    contentType: "image/png",
  });
  await input.fill("zzz");
  await expect(page.getByText("No rows match.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("");
  await expect(input).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(input).toHaveCount(0);
  for (const [state, text] of [
    ["Loading", "Loading rows…"],
    ["Error", "Couldn’t load linked rows. Try another search."],
  ]) {
    await card.getByRole("button", { name: state, exact: true }).click();
    await card.getByRole("button", { name: "Globex" }).click();
    await expect(page.getByText(text)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("searchbox", { name: "Search Customer" }),
    ).toHaveCount(0);
  }
  const rows = page
    .getByTestId("rows-search")
    .getByRole("searchbox", { name: "Search rows" });
  await expect(rows).toHaveAttribute("placeholder", "Search text fields");
  await expect(rows).toHaveAttribute("maxlength", "255");
});

test("form pickers: file search states and reader search", async ({ page }) => {
  await open(page);
  const files = page.getByTestId("file-picker");
  const input = files.getByRole("searchbox", {
    name: "Search files for Contract",
  });
  await expect(input).toHaveAttribute("placeholder", "Search your files");
  await input.fill("pricing");
  await expect(files.getByRole("status")).toHaveText("Searching files…");
  await expect(files.getByRole("list", { name: "Matching files" })).toHaveText(
    "Pricing 2026.xlsx",
  );
  await files.getByRole("button", { name: "Error" }).click();
  await expect(files.getByRole("alert")).toContainText(
    "Couldn’t search files.",
  );
  await files.getByRole("button", { name: "Retry file search" }).click();
  await expect(
    files.getByRole("list", { name: "Matching files" }),
  ).toBeVisible();
  const readers = page.getByTestId("reader-picker");
  const search = readers.getByRole("searchbox", {
    name: "Find source readers",
  });
  await expect(search).toHaveAttribute("placeholder", "Find source readers");
  await search.fill("grace");
  await readers.getByRole("button", { name: /Grace Hopper/ }).click();
  await expect(
    readers.getByText("1 readers selected, plus you."),
  ).toBeVisible();
  await search.fill("nobody");
  await expect(
    readers.getByRole("heading", { name: "No members match" }),
  ).toBeVisible();
  await readers.getByRole("button", { name: "Clear member search" }).click();
  await expect(search).toHaveValue("");
});

test("transitions run only without reduced motion", async ({ page }) => {
  await open(page);
  const ring = group(page, "Search models");
  expect(
    await ring.evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toContain("0.12s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await ring.evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toBe("0s");
});
