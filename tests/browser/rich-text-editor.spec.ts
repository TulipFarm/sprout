import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/rich-text-editor/";

async function open(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  const demo = page.locator("#rich-text-editor-demo");
  // Tiptap mounts after hydration; wait for every editor before measuring.
  await expect(
    demo.locator("[data-slot='rich-text-editor'] .tiptap"),
  ).toHaveCount(8);
  return demo;
}

async function caretToEnd(editor: Locator) {
  await editor.click();
  await editor.evaluate(async (node) => {
    const range = document.createRange();
    range.selectNodeContents(node.querySelector("p:last-of-type") ?? node);
    range.collapse(false);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
    // ProseMirror adopts DOM selection changes on the async selectionchange event.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
}

const wrapperOf = (control: Locator) =>
  control.locator("xpath=ancestor::*[@data-slot='rich-text-editor'][1]");

async function height(locator: Locator) {
  return (await locator.boundingBox())!.height;
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`rich text editor ${theme} ${mode} at ${width}px`, async ({
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
        const spills = await demo.evaluate(
          (root, viewport) =>
            [
              ...root.querySelectorAll<HTMLElement>(
                "[data-slot='rich-text-editor'], [data-slot='input-group']",
              ),
            ]
              .filter((node) => {
                const box = node.getBoundingClientRect();
                return (
                  box.left < 0 ||
                  box.right > viewport ||
                  node.scrollWidth > node.clientWidth + 1
                );
              })
              .map(
                (node) =>
                  `${node.closest("[data-testid]")?.getAttribute("data-testid")} ${node.scrollWidth}/${node.clientWidth}`,
              ),
          width,
        );
        expect(spills).toEqual([]);
        for (const body of await demo.locator(".rte-demo-card-body").all()) {
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .include("#rich-text-editor-demo")
          // WCAG 1.4.3 exempts inactive controls; the read-only placeholder is inactive text.
          .exclude("[data-testid='read-only'] .tiptap")
          .exclude("[data-testid='disabled'] .tiptap")
          .exclude("[data-base-ui-focus-guard]")
          // Code blocks scroll sideways like Cloud's; the editing caret scrolls them, so they need no tab stop.
          .exclude(".sprout-rich-text-editor-content pre")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `rich-text-editor-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`rich-text-editor-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("sizes render at Cloud dimensions with labelled textboxes", async ({
  page,
}) => {
  await open(page);
  const full = page.getByRole("textbox", { name: "Local draft" });
  const compact = page.getByRole("textbox", { name: "Quick note" });
  await expect(full).toHaveAttribute("aria-multiline", "true");
  await expect(full).toHaveAttribute("aria-autocomplete", "list");
  await expect(full).toHaveCSS("font-size", "16px");
  await expect(compact).toHaveCSS("font-size", "14px");
  expect(await height(full)).toBeGreaterThanOrEqual(80);
  expect(await height(compact)).toBeGreaterThanOrEqual(40);
  expect(await height(compact)).toBeLessThan(80);
  await expect(wrapperOf(full)).toHaveAttribute("data-size", "default");
  await expect(wrapperOf(compact)).toHaveAttribute("data-size", "compact");
  await expect(
    wrapperOf(compact).locator("[data-slot='rich-text-editor-toolbar']"),
  ).toHaveCount(0);

  // Past the maximum height, the editor scrolls instead of growing.
  await caretToEnd(compact);
  for (let line = 0; line < 10; line += 1)
    await page.keyboard.press("Shift+Enter");
  expect(await height(compact)).toBeLessThanOrEqual(128);
  await expect(compact).toHaveCSS("overflow-y", "auto");
});

test("Enter sends, Shift+Enter breaks, and lists keep Enter", async ({
  page,
}) => {
  await open(page);
  const editor = page.getByRole("textbox", { name: "Local draft" });
  const status = page.getByTestId("size-default").getByRole("status");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("- first");
  await page.keyboard.press("Enter");
  await page.keyboard.type("second");
  await expect(editor.locator("ul > li")).toHaveCount(2);
  await expect(status).not.toContainText("sent locally");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("after");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("more");
  await expect(
    editor.locator("p br:not(.ProseMirror-trailingBreak)"),
  ).toHaveCount(1);
  await expect(status).not.toContainText("sent locally");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Draft example sent locally.");

  const note = page.getByRole("textbox", { name: "Quick note" });
  await note.click();
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByTestId("size-compact").getByRole("status")).toHaveText(
    "Note sent locally.",
  );
});

test("toolbar buttons format and report pressed state", async ({ page }) => {
  await open(page);
  const editor = page.getByRole("textbox", { name: "Local draft" });
  const bold = page
    .getByTestId("size-default")
    .getByRole("button", { name: "Bold" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await expect(bold).toHaveAttribute("aria-pressed", "false");
  await bold.click();
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("Bold words");
  await expect(editor.locator("strong")).toHaveText("Bold words");
  await page
    .getByTestId("size-default")
    .getByRole("button", { name: "Bulleted list" })
    .click();
  await expect(editor.locator("ul")).toHaveCount(1);
  await expect(
    page
      .getByTestId("size-default")
      .getByRole("button", { name: "Bulleted list" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("markdown shortcuts make headings and fenced code blocks", async ({
  page,
}) => {
  await open(page);
  const editor = page.getByRole("textbox", { name: "Local draft" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.type("## Weekly numbers");
  await expect(editor.locator("h2")).toHaveText("Weekly numbers");
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.type("```sql ");
  await expect(editor.locator("pre code")).toHaveCount(1);
  await page.keyboard.type("select 1");
  await page.keyboard.press("Enter");
  await expect(editor.locator("pre code")).toHaveText("select 1\n");

  // A fence typed after a Shift+Enter line break still starts a code block.
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.type("Run this:");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("```js ");
  await expect(editor.locator("p").first()).toHaveText("Run this:");
  await expect(editor.locator("pre code")).toHaveCount(1);
  await expect(
    page.getByTestId("size-default").getByRole("status"),
  ).not.toContainText("sent locally");
});

test("formatted content and disabled editors", async ({ page }) => {
  await open(page);
  const formatted = page.getByRole("textbox", { name: "Renewal plan draft" });
  for (const selector of [
    "h2",
    "strong",
    "a",
    "ul",
    "ol",
    "blockquote",
    "code",
    "pre",
  ]) {
    await expect(formatted.locator(selector).first()).toBeVisible();
  }
  await expect(formatted.locator("a").first()).toHaveAttribute(
    "href",
    "https://example.com/northwind",
  );

  const disabled = page.getByRole("textbox", { name: "Archived chat message" });
  await expect(disabled).toHaveAttribute("contenteditable", "false");
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await expect(wrapperOf(disabled)).toHaveAttribute("data-disabled", "true");
  for (const button of await page
    .getByTestId("disabled")
    .getByRole("button")
    .all()) {
    await expect(button).toBeDisabled();
  }
});

test("chat composer suggestions are keyboard driven and announced", async ({
  page,
}) => {
  await open(page);
  const composer = page.getByTestId("composer");
  const editor = composer.getByRole("textbox", { name: "Message" });
  await editor.click();
  await page.keyboard.type("Compare @");
  await expect(editor).not.toHaveAttribute("aria-expanded", /.*/);
  await expect(editor).toHaveAttribute("aria-controls", "file-suggestions");
  await expect(editor).toHaveAttribute(
    "aria-activedescendant",
    "file-option-0",
  );
  const listbox = composer.getByRole("listbox", { name: "Saved files" });
  await expect(listbox.getByRole("option")).toHaveCount(4);
  await page.keyboard.press("ArrowDown");
  await expect(editor).toHaveAttribute(
    "aria-activedescendant",
    "file-option-1",
  );
  await expect(listbox.getByRole("option").nth(1)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Enter");
  await expect(editor.locator("[data-reference='file']")).toHaveText(
    "northwind-contract.docx",
  );
  await expect(composer.getByRole("listbox")).toHaveCount(0);
  await expect(editor).not.toHaveAttribute("aria-controls", /.+/);
  await expect(composer.getByRole("status").last()).toHaveText(
    "Nothing has been sent.",
  );

  await page.keyboard.type("@zzz");
  await expect(composer.getByText("No saved files match.")).toBeVisible();
  await expect(editor).not.toHaveAttribute("aria-activedescendant", /.+/);
  await page.keyboard.press("Escape");
  await expect(composer.getByRole("listbox")).toHaveCount(0);

  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await composer.getByRole("button", { name: "Use a skill" }).click();
  await expect(composer.getByRole("listbox", { name: "Skills" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(editor.locator("[data-reference='skill']")).toHaveText(
    "/Weekly metrics digest",
  );
});

test("chat composer validates, sends, and stops", async ({ page }) => {
  await open(page);
  const composer = page.getByTestId("composer");
  const editor = composer.getByRole("textbox", { name: "Message" });
  const send = composer.getByRole("button", { name: "Send message" });
  await expect(send).toBeDisabled();
  await editor.click();
  await page.keyboard.insertText("x".repeat(401));
  const alert = composer.getByRole("alert");
  await expect(alert).toContainText("Shorten your message");
  await expect(editor).toHaveAttribute("aria-invalid", "true");
  await expect(editor).toHaveAttribute(
    "aria-describedby",
    (await alert.getAttribute("id"))!,
  );
  await expect(send).toBeDisabled();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Draft the Northwind renewal summary");
  await expect(editor).toHaveAttribute("aria-invalid", "false");
  await expect(editor).not.toHaveAttribute("aria-describedby", /.+/);
  await expect(send).toBeEnabled();
  await page.keyboard.press("Enter");
  await expect(editor).toHaveAttribute("contenteditable", "false");
  await expect(send).toHaveAttribute("aria-busy", "true");
  const stop = composer.getByRole("button", { name: "Stop reply" });
  await expect(stop).toBeVisible();
  await expect(composer.locator(".rte-demo-chip")).toHaveCount(0);
  await expect(editor).toHaveAttribute("contenteditable", "true");
  await stop.click();
  await expect(composer.getByText("Reply stopped.")).toBeVisible();
});

test("persona changes the placeholder and model picker toggles effort", async ({
  page,
}) => {
  await open(page);
  const composer = page.getByTestId("composer");
  const editor = composer.getByRole("textbox", { name: "Message" });
  await expect(editor.locator("p").first()).toHaveAttribute(
    "data-placeholder",
    "Ask anything…",
  );
  await composer.getByRole("button", { name: /^Mode or agent/ }).click();
  await page.getByRole("option", { name: /Renewal desk/ }).click();
  await expect(editor.locator("p").first()).toHaveAttribute(
    "data-placeholder",
    "Ask Renewal desk anything…",
  );
  await composer.getByRole("button", { name: /^Model:/ }).click();
  await expect(
    page.getByRole("option", { name: /Legacy reasoning model/ }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
});

test("compact composer keeps chips but has no suggestions", async ({
  page,
}) => {
  await open(page);
  const composer = page.getByTestId("compact-composer");
  const editor = composer.getByRole("textbox", { name: "Message" });
  await expect(wrapperOf(editor)).toHaveAttribute("data-size", "compact");
  await expect(editor.locator("[data-reference='file']")).toHaveText(
    "Q3-forecast.xlsx",
  );
  await expect(
    composer.getByRole("button", { name: "Use a skill" }),
  ).toHaveCount(0);
  await expect(
    composer.getByRole("button", { name: "Send message" }),
  ).toBeVisible();
  await caretToEnd(editor);
  await page.keyboard.type(" @");
  await expect(editor).toContainText("last quarter @");
  await expect(composer.getByRole("listbox")).toHaveCount(0);
  await expect(editor).not.toHaveAttribute("aria-controls", /.+/);
});

test("question composer condenses until focused and read-only disables everything", async ({
  page,
}) => {
  await open(page);
  const composer = page.getByTestId("question-composer");
  const editor = composer.getByRole("textbox", { name: "Message" });
  await expect(composer.locator("[data-slot='input-group']")).toHaveAttribute(
    "data-variant",
    "question-composer",
  );
  await expect(wrapperOf(editor)).toHaveAttribute("data-condensed", "true");
  await expect(editor.locator("p").first()).toHaveAttribute(
    "data-placeholder",
    "Send a separate message…",
  );
  await expect(
    composer.getByRole("button", { name: "Use a skill" }),
  ).toHaveCount(0);
  await editor.focus();
  await expect(wrapperOf(editor)).not.toHaveAttribute("data-condensed", /.*/);
  await expect(
    composer.getByRole("button", { name: "Use a skill" }),
  ).toBeVisible();
  await composer.getByRole("switch", { name: "Question waiting" }).click();
  await expect(composer.locator("[data-slot='input-group']")).toHaveAttribute(
    "data-variant",
    "composer",
  );

  const readOnly = page.getByTestId("read-only");
  const locked = readOnly.getByRole("textbox", { name: "Message" });
  await expect(locked).toHaveAttribute("contenteditable", "false");
  await expect(locked).toHaveAttribute("aria-disabled", "true");
  for (const button of await readOnly.getByRole("button").all()) {
    await expect(button).toBeDisabled();
  }
});
