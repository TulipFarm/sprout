import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption, setColorMode } from "./choose-option";

const route = "/components/message-response/";
const axeTags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const recipeIds = [
  "playground",
  "markdown",
  "streaming",
  "bounded",
  "unbounded",
  "links",
  "task",
  "file",
  "handoff",
] as const;

async function openPage(page: Page, { reduce = true } = {}) {
  // The streaming caret pulses forever, so animation-waiting helpers need reduced motion.
  if (reduce) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const recipe = (page: Page, id: string) =>
  page.locator(`[data-recipe="${id}"]`);

async function attach(
  testInfo: TestInfo,
  name: string,
  target: Page | Locator,
) {
  const path = testInfo.outputPath(`${name}.png`);
  const shot =
    "goto" in target
      ? await target.screenshot({
          animations: "disabled",
          fullPage: true,
          path,
        })
      : await target.screenshot({ animations: "disabled", path });
  expect(shot.byteLength).toBeGreaterThan(5_000);
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`message response ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openPage(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        if (mode === "dark") await setColorMode(page, "Dark");
        await expect(recipe(page, "file").locator("table")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const responses = page.locator('[data-slot="message-response"]');
        expect(await responses.count()).toBeGreaterThanOrEqual(10);
        for (const response of await responses.all()) {
          expect(
            await response.evaluate(
              (el) => el.scrollWidth <= el.clientWidth + 1,
            ),
          ).toBe(true);
          expect(
            await response.evaluate((el) => {
              const frame = el
                .closest("[data-recipe]")!
                .getBoundingClientRect();
              const own = el.getBoundingClientRect();
              return own.left >= frame.left - 1 && own.right <= frame.right + 1;
            }),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .include("main")
          .withTags(axeTags)
          .analyze();
        expect(results.violations).toEqual([]);
        await attach(
          testInfo,
          `message-response-${theme}-${mode}-${width}`,
          page,
        );
        for (const id of recipeIds)
          await attach(
            testInfo,
            `message-response-${id}-${theme}-${mode}-${width}`,
            recipe(page, id),
          );
      });
    }
  }
}

test("renders every Markdown feature and drops HTML and images", async ({
  page,
}) => {
  await openPage(page);
  const reply = page
    .getByTestId("markdown-response")
    .locator('[data-slot="message-response"]');
  for (const level of [1, 2, 3, 4])
    await expect(reply.getByRole("heading", { level })).toHaveCount(1);
  await expect(reply.locator("del")).toHaveText("skip the old banner");
  await expect(reply.locator("ul ul li")).toHaveCount(2);
  await expect(reply.locator("ol > li")).toHaveCount(3);
  await expect(reply.getByRole("checkbox", { name: "Task" })).toHaveCount(2);
  await expect(reply.getByRole("checkbox").first()).toBeChecked();
  await expect(reply.getByRole("checkbox").first()).toBeDisabled();
  await expect(reply.locator("blockquote")).toContainText("Check them twice.");
  await expect(reply.locator("hr")).toHaveCount(1);
  await expect(reply.locator("td").filter({ hasText: "$14.00" })).toHaveCSS(
    "text-align",
    "right",
  );
  await expect(reply.locator("th").filter({ hasText: "Status" })).toHaveCSS(
    "text-align",
    "center",
  );
  const blocks = reply.locator('[data-slot="code-block"]');
  await expect(blocks).toHaveCount(2);
  await expect(blocks.nth(0)).toHaveAttribute(
    "data-language",
    /^(ts|typescript)$/,
  );
  await expect(blocks.nth(1)).toHaveAttribute("data-language", "text");
  await expect(
    blocks.nth(0).locator('.hljs-keyword, [class*="sprout-syntax-"]').first(),
  ).toBeVisible();
  await expect(
    reply.getByRole("link", { name: "https://example.com/spring-launch" }),
  ).toHaveAttribute("target", "_blank");
  await expect(reply.getByRole("link", { name: "the brief" })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await expect(reply.locator("img, b, script")).toHaveCount(0);
  await expect(reply).toContainText("HTML tags are dropped; their words stay.");
  await expect(reply).not.toContainText("Images are not shown");
  const inline = reply.locator("p code").first();
  await expect(inline).toHaveText("@robin");
  expect(
    await inline.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
});

test("table regions take focus and scroll with the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPage(page);
  const open = page
    .getByTestId("unbounded-response")
    .getByRole("region", { name: "Response table" });
  expect(await open.evaluate((el) => getComputedStyle(el).overflowX)).toBe(
    "auto",
  );
  expect(
    await open.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  const region = page
    .getByTestId("bounded-response")
    .getByRole("region", { name: "Response table" });
  await region.focus();
  await expect(region).toBeFocused();
  expect(await region.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "solid",
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect
    .poll(() => region.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
});

test("bounded viewports cap tables at 12rem with a sticky header", async ({
  page,
}) => {
  await openPage(page);
  const bounded = page
    .getByTestId("bounded-response")
    .getByRole("region", { name: "Response table" });
  await expect(bounded).toHaveAttribute("data-bounded", "");
  const box = await bounded.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(192.5);
  expect(
    await bounded.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  await bounded.focus();
  await page.keyboard.press("End");
  await expect
    .poll(() => bounded.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  const header = bounded.locator("th").first();
  expect(
    await header.evaluate(
      (el) =>
        el.getBoundingClientRect().top -
        el.closest("[role=region]")!.getBoundingClientRect().top,
    ),
  ).toBeLessThan(1);
  const open = page
    .getByTestId("unbounded-response")
    .getByRole("region", { name: "Response table" });
  await expect(open).not.toHaveAttribute("data-bounded");
  expect(
    await open.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
  ).toBe(true);
});

test("playground toggles streaming, bounded tables, and replies", async ({
  page,
}) => {
  await openPage(page);
  const frame = recipe(page, "playground");
  const reply = frame.locator('[data-slot="message-response"]');
  await expect(reply).toHaveAttribute("aria-busy", "false");
  await expect(reply.locator(".sprout-message-response-caret")).toHaveCount(0);
  await frame.getByRole("switch", { name: "Streaming" }).click();
  await expect(reply).toHaveAttribute("aria-busy", "true");
  await expect(reply.locator(".sprout-message-response-caret")).toBeVisible();
  await expect(reply.locator(".sprout-message-response-caret")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  const table = reply.getByRole("region", { name: "Response table" });
  await expect(table).not.toHaveAttribute("data-bounded");
  await frame.getByRole("switch", { name: "Bounded tables" }).focus();
  await page.keyboard.press("Space");
  await expect(table).toHaveAttribute("data-bounded", "");
  await chooseOption(page, "Reply", "SQL answer");
  await expect(reply.locator('[data-slot="code-block"]')).toHaveAttribute(
    "data-language",
    "sql",
  );
  await chooseOption(page, "Reply", "Garden plan");
  await expect(
    reply.getByRole("heading", { level: 3, name: "Garden plan" }),
  ).toBeVisible();
  await expect(
    reply.getByRole("link", { name: "the sample notes" }),
  ).toHaveAttribute("href", "#sample-notes");
});

test("streaming shows waiting, partial, and finished replies", async ({
  page,
}) => {
  await openPage(page);
  const frame = recipe(page, "streaming");
  const reply = frame.locator('[data-slot="message-response"]');
  const caret = reply.locator(".sprout-message-response-caret");
  await expect(reply).toHaveAttribute("aria-busy", "true");
  await expect(reply.locator("tbody tr")).toHaveCount(1);
  await frame.getByRole("button", { name: "Waiting" }).click();
  await expect(caret).toBeVisible();
  await expect(reply).toHaveText("");
  await frame.getByRole("button", { name: "Done" }).click();
  await expect(reply).toHaveAttribute("aria-busy", "false");
  await expect(caret).toHaveCount(0);
  await expect(reply.locator("tbody tr")).toHaveCount(2);
  await frame.getByRole("button", { name: "Replay" }).click();
  await expect(reply).toHaveAttribute("aria-busy", "true");
  await expect(reply).toHaveAttribute("aria-busy", "false", {
    timeout: 10_000,
  });
  await expect(reply).toContainText("Water within an hour of planting.");
});

test("the caret pulses only without reduced motion", async ({ page }) => {
  await openPage(page, { reduce: false });
  const caret = recipe(page, "streaming").locator(
    ".sprout-message-response-caret",
  );
  await expect(caret).toHaveCSS(
    "animation-name",
    "sprout-message-response-pulse",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(caret).toHaveCSS("animation-name", "none");
});

test("renderLink adapters open citations and download files", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const reply = page.getByTestId("links-response");

  const ready = reply.getByRole("button", { name: "the returns policy" });
  await ready.focus();
  await page.keyboard.press("Enter");
  const popup = page.locator('[data-slot="popover-content"]');
  await expect(popup.getByText("Checking access")).toBeVisible();
  await expect(popup).toContainText("Customers can return unopened bulbs");
  await expect(popup).toContainText("Note · Refund window");
  await attach(testInfo, "message-response-citation", page);
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(ready).toBeFocused();

  await reply.getByRole("button", { name: "an old pricing note" }).click();
  await expect(popup).toContainText("Its passage is hidden.");
  await page.keyboard.press("Escape");

  await reply.getByRole("button", { name: "the warehouse FAQ" }).click();
  await expect(popup.getByRole("alert")).toContainText(
    "We couldn’t check access",
  );
  await expect(popup.getByRole("button", { name: "Retry" })).toBeVisible();
  await page.keyboard.press("Escape");

  const downloadEvent = page.waitForEvent("download");
  await reply.getByRole("button", { name: "orders-export.csv" }).click();
  await expect(
    reply.getByRole("status").filter({ hasText: "Checking access" }),
  ).toBeVisible();
  expect((await downloadEvent).suggestedFilename()).toBe("orders-export.txt");
  await expect(
    reply.getByRole("status").filter({ hasText: "Download sent" }),
  ).toBeVisible();

  await reply.getByRole("button", { name: "orders-2025.csv" }).click();
  await expect(reply.getByRole("alert")).toContainText("Download unavailable.");
  await attach(
    testInfo,
    "message-response-links-states",
    recipe(page, "links"),
  );

  await expect(reply.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "target",
    "_blank",
  );

  await recipe(page, "links")
    .getByRole("button", { name: "Agent task" })
    .click();
  const taskDownload = page.waitForEvent("download");
  await reply.getByRole("button", { name: "orders-export.csv" }).click();
  await taskDownload;
});

test("agent task history routes task downloads", async ({ page }) => {
  await openPage(page);
  const frame = recipe(page, "task");
  await expect(
    frame.getByRole("region", { name: "Latest task update" }),
  ).toBeVisible();
  await expect(
    frame
      .getByRole("list", { name: "Request and history" })
      .getByRole("listitem"),
  ).toHaveCount(2);
  await expect(
    frame.getByRole("button", { name: "orders-export.csv" }),
  ).toHaveCount(2);
  await expect(frame).toContainText("2 explicit source references.");
});

test("file viewer formats Markdown and switches to plain text", async ({
  page,
}) => {
  await openPage(page);
  const frame = recipe(page, "file");
  const reply = frame.locator('[data-slot="message-response"]');
  await expect(
    reply.getByRole("heading", { level: 1, name: "Spring planting plan" }),
  ).toBeVisible();
  await expect(reply.locator("tbody tr")).toHaveCount(4);
  const toggle = frame.getByRole("button", { name: "Show source" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(reply).toHaveCount(0);
  await expect(frame.locator("pre")).toContainText("| Bed | Variety | Bulbs |");
  await frame.getByRole("button", { name: "Show formatted" }).click();
  await expect(reply).toBeVisible();
});

test("handoff panel shows written, hidden, and failed states", async ({
  page,
}) => {
  await openPage(page);
  const frame = recipe(page, "handoff");
  const handoff = page.getByTestId("handoff");
  await expect(
    handoff.locator(".mr-demo-panel [data-slot='message-response']"),
  ).toContainText("SO-1042");
  await expect(
    handoff.getByRole("button", { name: "Copy handoff" }),
  ).toBeVisible();
  await frame.getByRole("button", { name: "Hidden" }).click();
  await expect(handoff).toContainText("This handoff is hidden");
  await expect(handoff.locator("[data-slot='message-response']")).toHaveCount(
    0,
  );
  await frame.getByRole("button", { name: "Failed" }).click();
  await expect(handoff.getByRole("alert")).toContainText(
    "The handoff could not be written.",
  );
  await expect(handoff).toContainText("Instructions:");
});

test("docs navigation lists Message Response", async ({ page }) => {
  await page.goto("/components/sidebar/");
  const nav = page.getByRole("navigation", { name: "Documentation" });
  await expect(
    nav.getByRole("link", { name: "Message Response", exact: true }),
  ).toHaveAttribute("href", route);
  await expect(
    nav.getByRole("link", { name: "Sidebar", exact: true }),
  ).toHaveAttribute("href", "/components/sidebar/");
});
