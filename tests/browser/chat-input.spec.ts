import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setColorMode } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openPage(page: Page) {
  await page.goto("/components/chat-input/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const composer = (page: Page) =>
  page.getByRole("region", { name: "Chat input" }).getByRole("form");
const editor = (page: Page) => composer(page).getByRole("textbox");

for (const mode of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`chat input ${mode} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await openPage(page);
      await page.emulateMedia({ colorScheme: mode });
      await setColorMode(page, mode === "dark" ? "Dark" : "Light");
      await expect(page.locator('[data-slot="chat-input"]')).toHaveCount(3);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
      const results = await new AxeBuilder({ page })
        .exclude(".docs-search-trigger")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test("triggers insert agent, skill, and file references", async ({ page }) => {
  await openPage(page);
  const box = editor(page);
  await box.click();
  await box.pressSequentially("Ask @res");
  await expect(page.getByRole("listbox", { name: "Agents" })).toBeVisible();
  await expect(box).toHaveAttribute(
    "aria-controls",
    (await page.getByRole("listbox", { name: "Agents" }).getAttribute("id"))!,
  );
  await page.keyboard.press("Enter");
  await box.pressSequentially("to run /pr");
  await page.keyboard.press("Enter");
  await box.pressSequentially("on #fin");
  await page.keyboard.press("Tab");
  await expect(box.locator("[data-chat-reference]")).toHaveText([
    "@Researcher",
    "/prd",
    "#financial-dashboard.png",
  ]);
  await expect(box.locator("[data-chat-reference][id]")).toHaveCount(0);
  await box.pressSequentially("@");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("formats markdown and links emails", async ({ page }) => {
  await openPage(page);
  const box = editor(page);
  await box.click();
  await box.pressSequentially("**bold** mail bob@example.com ");
  await expect(box.locator("strong")).toHaveText("bold");
  await expect(box.locator('a[href="mailto:bob@example.com"]')).toHaveCount(1);
});

test("sends, streams, and stops", async ({ page }) => {
  await openPage(page);
  const form = composer(page);
  const send = form.getByRole("button", { name: "Send message" });
  await expect(send).toBeDisabled();
  await page.getByRole("button", { name: "Clarify user problem" }).click();
  await expect(editor(page)).toContainText("clarify the user problem");
  await expect(send).toBeEnabled();
  await page.keyboard.press("Enter");
  await expect(form.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect(
    page.locator('[data-slot="chat-input"]').first(),
  ).toHaveAttribute("data-status", "streaming");
  await form.getByRole("button", { name: "Stop" }).click();
  await expect(send).toBeVisible();
});

test("model, mode, and attach menus", async ({ page }) => {
  await openPage(page);
  const form = composer(page);
  await form.getByRole("button", { name: "Model: Claude Opus 5.5" }).click();
  await page.getByRole("option", { name: /GPT-5\.5/ }).click();
  await expect(
    form.getByRole("button", { name: "Model: GPT-5.5" }),
  ).toBeVisible();
  await form.getByRole("button", { name: "Mode: Default" }).click();
  await page.getByRole("menuitemradio", { name: /Deep research/ }).click();
  await form.getByRole("button", { name: "Turn off Deep research" }).click();
  await expect(
    form.getByRole("button", { name: "Mode: Default" }),
  ).toBeVisible();
  await form.getByRole("button", { name: "Add files and more" }).click();
  await page.getByRole("menuitem", { name: /Add a web page/ }).click();
  await expect(form.getByText("sprout.dev")).toBeVisible();
});
