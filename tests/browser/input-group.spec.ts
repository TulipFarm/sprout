import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/input-group/";

async function open(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#input-group-demo");
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

const groupOf = (control: Locator) =>
  control.locator("xpath=ancestor::*[@data-slot='input-group'][1]");

async function height(locator: Locator) {
  return (await locator.boundingBox())!.height;
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`input group ${theme} ${mode} at ${width}px`, async ({
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
        const search = groupOf(
          page.getByLabel("Search chats", { exact: true }),
        );
        await expect(search).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-surface)"),
        );
        await expect(search).toHaveCSS(
          "border-top-color",
          await cssColor(page, "var(--sprout-input)"),
        );
        // No group leaves the viewport, and nothing spills sideways out of a border.
        const spills = await demo.evaluate(
          (root, viewport) =>
            [...root.querySelectorAll<HTMLElement>("[data-slot='input-group']")]
              .filter((group) => group.offsetParent)
              .filter((group) => {
                const box = group.getBoundingClientRect();
                return (
                  box.left < 0 ||
                  box.right > viewport ||
                  group.scrollWidth > group.clientWidth + 1
                );
              })
              .map(
                (group) =>
                  `${group.closest("[data-testid]")?.getAttribute("data-testid")} ${group.scrollWidth}/${group.clientWidth}`,
              ),
          width,
        );
        expect(spills).toEqual([]);
        for (const body of await demo
          .locator(".input-group-demo-card-body")
          .all()) {
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .include("#input-group-demo")
          // WCAG 1.4.3 exempts inactive controls; axe only skips the disabled input itself.
          .exclude(
            "[data-testid='workspace-url-disabled'] [data-slot='input-group-text']",
          )
          .exclude("[data-base-ui-focus-guard]")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        await page.mouse.move(0, 0);
        const path = testInfo.outputPath(
          `input-group-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`input-group-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("sizes, additions, and buttons render at Cloud dimensions", async ({
  page,
}) => {
  await open(page);
  const small = page.getByLabel("Search chats", { exact: true });
  const large = page.getByLabel("Search the workspace", { exact: true });
  expect(await height(groupOf(small))).toBe(32);
  expect(await height(groupOf(large))).toBe(44);
  await expect(small).toHaveCSS("font-size", "14px");
  await expect(large).toHaveCSS("font-size", "16px");
  await expect(groupOf(small)).toHaveAttribute("role", "group");
  await expect(groupOf(large)).toHaveAttribute("data-size", "lg");
  // Inline additions trim the input's padding on their side.
  await expect(small).toHaveCSS("padding-left", "6px");
  await expect(small).toHaveCSS("padding-right", "6px");
  await expect(small).toHaveCSS("border-top-width", "0px");
  const shortcut = page.getByTestId("size-default").getByText("⌘ K");
  await expect(shortcut).toHaveCSS(
    "color",
    await cssColor(page, "var(--sprout-muted)"),
  );

  const sizes: Record<string, [number, number]> = {
    "button-xs": [24, 0],
    "button-sm": [28, 0],
    "button-icon-xs": [24, 24],
    "button-icon-sm": [28, 28],
  };
  for (const [id, [h, w]] of Object.entries(sizes)) {
    const button = page.getByTestId(id).getByRole("button");
    const box = (await button.boundingBox())!;
    expect(box.height).toBe(h);
    if (w) expect(box.width).toBe(w);
    await expect(button).toHaveAttribute("type", "button");
    await expect(button).toHaveCSS("box-shadow", "none");
  }
  await expect(
    page.getByTestId("button-xs").getByRole("button"),
  ).toHaveAttribute("data-variant", "ghost");
  await expect(
    page.getByTestId("button-sm").getByRole("button"),
  ).toHaveAttribute("data-variant", "secondary");
  await page
    .getByTestId("button-xs")
    .getByRole("button", { name: "Copy" })
    .click();
  await expect(example(page, "Button sizes").getByRole("status")).toContainText(
    "invite link",
  );
});

test("keyboard focus rings the group and the clear button refocuses", async ({
  page,
}) => {
  await open(page);
  const input = page.getByLabel("Search chat titles", { exact: true });
  const group = groupOf(input);
  await expect(group).toHaveCSS("outline-width", "0px");
  await input.focus();
  await expect(group).toHaveCSS("outline-width", "2px");
  await expect(group).toHaveCSS(
    "outline-color",
    await cssColor(page, "var(--sprout-focus)"),
  );
  await expect(group).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-focus)"),
  );
  await expect(
    page.getByTestId("search-chats").getByRole("button"),
  ).toHaveCount(0);
  await page.keyboard.type("renewal");
  await expect(
    page.getByTestId("search-chats").getByRole("listitem"),
  ).toHaveText(["Northwind renewal terms"]);
  await page.keyboard.press("Tab");
  const clear = page
    .getByTestId("search-chats")
    .getByRole("button", { name: "Clear search" });
  await expect(clear).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(clear).toHaveCount(0);

  await page.keyboard.type("zzz");
  await expect(page.getByTestId("search-chats").getByRole("status")).toHaveText(
    "No chats match “zzz”.",
  );

  // Clicking the magnifier focuses the input, like a label.
  await page.getByLabel("Search the workspace", { exact: true }).blur();
  await page
    .getByTestId("size-lg")
    .locator("[data-align='inline-start']")
    .click();
  await expect(
    page.getByLabel("Search the workspace", { exact: true }),
  ).toBeFocused();
});

test("invalid and disabled states come from the control", async ({ page }) => {
  await open(page);
  const danger = await cssColor(page, "var(--sprout-danger)");
  const invalid = page.getByLabel("Workspace URL with an error", {
    exact: true,
  });
  await expect(groupOf(invalid)).toHaveCSS("border-top-color", danger);
  const disabled = page.getByLabel("Workspace URL while saving", {
    exact: true,
  });
  await expect(disabled).toBeDisabled();
  await expect(groupOf(disabled)).toHaveCSS("opacity", "0.5");
  await expect(disabled).toHaveCSS("opacity", "1");

  const slug = page.getByRole("textbox", {
    name: "Workspace URL",
    exact: true,
  });
  await expect(slug).toHaveAttribute("required", "");
  await expect(slug).toHaveAttribute("maxlength", "48");
  await slug.fill("Acme Corp");
  await slug.blur();
  await expect(slug).toHaveAttribute("aria-invalid", "true");
  await expect(groupOf(slug)).toHaveCSS("border-top-color", danger);
  await expect(page.locator("#workspace-slug-hint")).toHaveText(
    "Use 3 to 48 lowercase letters, numbers, or hyphens.",
  );
  await slug.fill("acme-corp");
  await expect(slug).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(slug).toBeDisabled();
  await expect(page.locator("#workspace-slug-hint")).toHaveText(
    "Creating workspace…",
  );
  await expect(slug).toBeEnabled({ timeout: 4000 });
});

test("combobox renders its input and buttons through the group", async ({
  page,
}) => {
  await open(page);
  const input = page.getByRole("combobox", {
    name: "Choose a fruit",
    exact: true,
  });
  await expect(input).toHaveAttribute("data-slot", "input-group-control");
  const trigger = page
    .getByTestId("combobox-trigger")
    .getByRole("button", { name: "Show fruits" });
  expect((await trigger.boundingBox())!.width).toBe(24);
  await input.focus();
  await expect(groupOf(input)).toHaveCSS("outline-width", "2px");
  await page.keyboard.type("man");
  await expect(page.getByRole("option", { name: "Mango" })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("Mango");
  await expect(page.getByRole("listbox")).toHaveCount(0);

  await trigger.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);

  const chosen = page.getByTestId("combobox-clear");
  await expect(chosen.getByRole("combobox")).toHaveValue("Mango");
  await expect(
    chosen.getByRole("button", { name: "Show fruits" }),
  ).toBeHidden();
  await chosen.getByRole("button", { name: "Clear selection" }).click();
  await expect(chosen.getByRole("combobox")).toHaveValue("");
  await expect(
    chosen.getByRole("button", { name: "Show fruits" }),
  ).toBeVisible();

  const off = page.getByTestId("combobox-disabled");
  await expect(off.getByRole("combobox")).toBeDisabled();
  await expect(groupOf(off.getByRole("combobox"))).toHaveCSS("opacity", "0.5");
});

test("command search keeps a custom input and a leading icon after it", async ({
  page,
}) => {
  await open(page);
  const panel = page.getByTestId("command-search");
  const input = panel.getByLabel("Search modes and agents", { exact: true });
  const addon = panel.locator("[data-slot='input-group-addon']");
  expect((await addon.boundingBox())!.x).toBeLessThan(
    (await input.boundingBox())!.x,
  );
  expect(await height(groupOf(input))).toBe(32);
  await addon.click();
  await expect(input).toBeFocused();
  await page.keyboard.type("renewal");
  await expect(panel.getByRole("listitem")).toHaveCount(1);
  await page.keyboard.type("xyz");
  await expect(panel.getByRole("status")).toHaveText(
    "No modes or agents found.",
  );
});

test("composer sends, stops, validates, and opens toolbar menus", async ({
  page,
}) => {
  await open(page);
  const composer = page.getByTestId("composer");
  const group = composer.locator("[data-slot='input-group']");
  await expect(group).toHaveAttribute("data-variant", "composer");
  await expect(group).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-border)"),
  );
  await expect(composer.getByText("Q3-forecast.xlsx")).toBeVisible();

  const send = composer.getByRole("button", { name: "Send message" });
  await expect(send).toBeDisabled();
  await expect(send).toHaveAttribute("data-variant", "secondary");
  await expect(send).toHaveAttribute("type", "submit");
  expect((await send.boundingBox())!.width).toBe(28);

  const message = composer.getByLabel("Message", { exact: true });
  await message.focus();
  await expect(group).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-focus)"),
  );
  await page.keyboard.type("Summarize the Q3 forecast for the board.");
  await expect(send).toBeEnabled();
  await expect(send).toHaveAttribute("data-variant", "default");

  // Toolbar triggers render through InputGroupButton.
  await composer.getByRole("button", { name: "Add a file" }).click();
  await page.getByRole("menuitem", { name: /Add to knowledge/ }).click();
  await expect(composer.getByText("brand-guide.pdf")).toBeVisible();
  await composer.getByRole("button", { name: "Mode or agent: Mode" }).click();
  await page
    .getByRole("button", { name: /^Writer/ })
    .last()
    .click();
  await expect(
    composer.getByRole("button", { name: "Mode or agent: Writer" }),
  ).toBeVisible();
  await chooseOption(page, "Chat mode", "Plan only");
  await expect(
    composer.getByRole("combobox", { name: "Chat mode" }),
  ).toHaveText(/Plan/);

  await message.focus();
  await page.keyboard.press("Enter");
  await expect(composer.getByRole("status")).toHaveText("Sending…");
  await expect(message).toBeDisabled();
  const stop = composer.getByRole("button", { name: "Stop reply" });
  await expect(stop).toBeVisible();
  await expect(stop).toHaveAttribute("data-variant", "default");
  await stop.click();
  await expect(composer.getByRole("status")).toHaveText("Reply stopped.");
  await expect(message).toHaveValue("");

  await message.fill("x".repeat(401));
  await expect(message).toHaveAttribute("aria-invalid", "true");
  await expect(composer.getByRole("alert")).toContainText("400 characters");
  await expect(group).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-danger)"),
  );
  await expect(send).toBeDisabled();
});

test("question composer and custom controls drive the group", async ({
  page,
}) => {
  await open(page);
  const sample = page.getByTestId("question-composer");
  const group = sample.locator("[data-slot='input-group']");
  await expect(group).toHaveAttribute("data-variant", "question-composer");
  await expect(group).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-input)"),
  );
  const editor = sample.getByRole("textbox", { name: "Message" });
  await editor.focus();
  await expect(group).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-focus)"),
  );
  await page.keyboard.type("The EMEA region, please.");
  await sample.getByRole("button", { name: "Send message" }).click();
  await expect(sample.getByRole("status")).toHaveText("Message sent locally.");

  const disabled = page.getByTestId("composer-disabled");
  await expect(disabled.getByRole("textbox")).toBeDisabled();
  await expect(disabled.locator("[data-slot='input-group']")).toHaveCSS(
    "opacity",
    "0.5",
  );

  const draft = page.getByTestId("draft");
  await expect(draft.getByText("Draft message", { exact: true })).toBeVisible();
  const draftSend = draft.getByRole("button", { name: "Send", exact: true });
  await expect(draftSend).toBeDisabled();
  await draft.getByLabel("Draft message").fill("Hello team");
  await draftSend.click();
  await expect(draft.getByRole("status")).toHaveText(
    "Draft example sent locally.",
  );
  expect(
    (await draft.getByRole("button", { name: "Add attachment" }).boundingBox())!
      .width,
  ).toBe(24);
});

test("mobile composer keeps icon buttons named and grows touch targets", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await open(page);
    const composer = page.getByTestId("composer");
    await expect(composer.getByText("Files", { exact: true })).toBeHidden();
    const files = composer.getByRole("button", { name: "Add a file" });
    await expect(files).toBeVisible();
    const box = (await files.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});

test("transitions run only without reduced motion", async ({ page }) => {
  await open(page);
  const group = groupOf(page.getByLabel("Search chats", { exact: true }));
  expect(
    await group.evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toContain("0.12s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await group.evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toBe("0s");
});
