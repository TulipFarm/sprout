import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setColorMode } from "./choose-option";

const route = "/components/message-actions/";
const axeTags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const recipeIds = [
  "playground",
  "conversation",
  "times",
  "versions",
  "handoff",
  "states",
] as const;

async function openPage(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await expect(recipe(page, "states")).toBeVisible();
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
  expect(shot.byteLength).toBeGreaterThan(3_000);
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function allowClipboard(page: Page) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
}

const opacity = (locator: Locator) =>
  locator.evaluate((el) => getComputedStyle(el).opacity);

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`message actions ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openPage(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        if (mode === "dark") await setColorMode(page, "Dark");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const rows = page.locator('[data-slot="message-actions"]');
        expect(await rows.count()).toBeGreaterThanOrEqual(10);
        for (const row of await rows.all()) {
          expect(
            await row.evaluate((el) => {
              const frame = el
                .closest("[data-recipe]")!
                .getBoundingClientRect();
              const own = el.getBoundingClientRect();
              return own.left >= frame.left - 1 && own.right <= frame.right + 1;
            }),
          ).toBe(true);
          for (const button of await row.locator("button").all()) {
            const box = (await button.boundingBox())!;
            expect(box.height).toBeGreaterThanOrEqual(24);
          }
        }
        const results = await new AxeBuilder({ page })
          .include("main")
          .withTags(axeTags)
          .analyze();
        expect(results.violations).toEqual([]);
        await attach(
          testInfo,
          `message-actions-${theme}-${mode}-${width}`,
          page,
        );
        for (const id of recipeIds)
          await attach(
            testInfo,
            `message-actions-${id}-${theme}-${mode}-${width}`,
            recipe(page, id),
          );
      });
    }
  }
}

test("copies plain text from Markdown and announces it, by keyboard", async ({
  page,
}) => {
  await allowClipboard(page);
  await openPage(page);
  const actions = page
    .getByTestId("playground")
    .getByRole("group", { name: "Response actions" });
  const copy = actions.getByRole("button", { name: "Copy response" });
  await copy.focus();
  await expect(copy).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    actions.getByRole("button", { name: "Response copied" }),
  ).toBeFocused();
  await expect(
    page.getByTestId("playground").getByRole("status").first(),
  ).toHaveText("Response copied to clipboard.");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(
    "the reconciliation sheet (https://example.com/sheets/march-recon)",
  );
  expect(copied).toContain("**1,284**");
});

test("rates and clears feedback, regenerates, and tabs through in order", async ({
  page,
}) => {
  await openPage(page);
  const playground = page.getByTestId("playground");
  const actions = playground.getByRole("group", { name: "Response actions" });
  const helpful = actions.getByRole("button", {
    name: "Helpful response",
    exact: true,
  });
  const unhelpful = actions.getByRole("button", {
    name: "Unhelpful response",
    exact: true,
  });
  const status = page.getByTestId("playground-status");
  await expect(actions.locator("time")).toHaveAttribute("datetime", /T/);
  await helpful.click();
  await expect(helpful).toHaveAttribute("aria-pressed", "true");
  await expect(helpful).toHaveAttribute("data-variant", "secondary");
  await expect(status).toHaveText("Rated helpful.");
  await helpful.focus();
  await page.keyboard.press("Tab");
  await expect(unhelpful).toBeFocused();
  await page.keyboard.press("Space");
  await expect(unhelpful).toHaveAttribute("aria-pressed", "true");
  await expect(helpful).toHaveAttribute("aria-pressed", "false");
  await expect(status).toHaveText("Rated unhelpful.");
  await page.keyboard.press("Space");
  await expect(unhelpful).toHaveAttribute("aria-pressed", "false");
  await expect(status).toHaveText("No rating yet.");
  await page.keyboard.press("Tab");
  const regenerate = actions.getByRole("button", { name: "Regenerate" });
  await expect(regenerate).toBeFocused();
  await expect(regenerate).toHaveAttribute("data-size", "sm");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Regenerate requested.");
});

test("playground props add and remove each part", async ({ page }) => {
  await openPage(page);
  const frame = recipe(page, "playground");
  const playground = page.getByTestId("playground");
  await frame.getByRole("switch", { name: "Time" }).click();
  await expect(playground.locator("time")).toHaveCount(0);
  await frame.getByRole("switch", { name: "Feedback" }).click();
  await expect(
    playground.getByRole("button", { name: /helpful/i }),
  ).toHaveCount(0);
  await frame.getByRole("switch", { name: "Regenerate" }).click();
  await expect(
    playground.getByRole("button", { name: "Regenerate" }),
  ).toHaveCount(0);
  await frame.getByRole("switch", { name: "Disabled" }).click();
  await expect(
    playground.getByRole("button", { name: "Copy response" }),
  ).toBeDisabled();
  await frame.getByRole("switch", { name: "Disabled" }).click();
  await frame
    .getByRole("radio", { name: "Human" })
    .or(frame.getByRole("button", { name: "Human" }))
    .click();
  const human = playground.getByRole("group", { name: "Message actions" });
  await expect(
    human.getByRole("button", { name: "Copy message" }),
  ).toBeVisible();
  await expect(frame.getByRole("switch", { name: "Feedback" })).toHaveCount(0);
  await expect(
    page.locator('[data-testid="playground"] [data-slot="message"]'),
  ).toHaveAttribute("data-align", "end");
  await frame.getByRole("switch", { name: "Reveal on hover" }).click();
  await page.mouse.move(0, 0);
  await expect.poll(() => opacity(human)).toBe("0");
});

test("hover rows reveal on hover and on keyboard focus", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const conversation = page.getByTestId("conversation");
  const messages = conversation.locator('[data-slot="message"]');
  const human = conversation.getByRole("group", { name: "Message actions" });
  const assistant = conversation.getByRole("group", {
    name: "Response actions",
  });
  await page.mouse.move(0, 0);
  await expect.poll(() => opacity(human)).toBe("0");
  await expect.poll(() => opacity(assistant)).toBe("0");
  await messages.nth(1).hover();
  await expect.poll(() => opacity(assistant)).toBe("1");
  await expect.poll(() => opacity(human)).toBe("0");
  await attach(
    testInfo,
    "message-actions-conversation-hover",
    recipe(page, "conversation"),
  );
  await page.mouse.move(0, 0);
  await human.getByRole("button", { name: "Copy message" }).focus();
  await expect.poll(() => opacity(human)).toBe("1");
  await page.keyboard.press("Tab");
  await expect(
    conversation.getByRole("link", { name: "the reconciliation sheet" }),
  ).toBeFocused();
  await expect.poll(() => opacity(assistant)).toBe("1");
  await page.keyboard.press("Tab");
  await expect(
    assistant.getByRole("button", { name: "Copy response" }),
  ).toBeFocused();
  await expect.poll(() => opacity(human)).toBe("0");
  await attach(
    testInfo,
    "message-actions-conversation-focus",
    recipe(page, "conversation"),
  );
});

test("copies formatted HTML beside plain text when html is given", async ({
  page,
}) => {
  await allowClipboard(page);
  await openPage(page);
  const conversation = page.getByTestId("conversation");
  await conversation.locator('[data-slot="message"]').nth(1).hover();
  await conversation.getByRole("button", { name: "Copy response" }).click();
  await expect(
    conversation.getByRole("button", { name: "Response copied" }),
  ).toBeVisible();
  const clip = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return {
      types: item!.types,
      html: await (await item!.getType("text/html")).text(),
      plain: await (await item!.getType("text/plain")).text(),
    };
  });
  expect(clip.types).toEqual(
    expect.arrayContaining(["text/html", "text/plain"]),
  );
  expect(clip.html).toContain("<strong>1,284</strong>");
  expect(clip.plain).toContain(
    "the reconciliation sheet (https://example.com/sheets/march-recon)",
  );
});

test("touch screens always show hover rows", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
    const conversation = page.getByTestId("conversation");
    expect(await page.evaluate(() => matchMedia("(hover: none)").matches)).toBe(
      true,
    );
    await expect
      .poll(() =>
        opacity(conversation.getByRole("group", { name: "Message actions" })),
      )
      .toBe("1");
    await expect
      .poll(() =>
        opacity(conversation.getByRole("group", { name: "Response actions" })),
      )
      .toBe("1");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await attach(
      testInfo,
      "message-actions-touch-390",
      recipe(page, "conversation"),
    );
  } finally {
    await context.close();
  }
});

test("send times read today, yesterday, then dates", async ({ page }) => {
  await openPage(page);
  const times = page.getByTestId("times").locator("time");
  await expect(times).toHaveCount(4);
  await expect(times.nth(0)).not.toContainText(/Yesterday|,/);
  await expect(times.nth(1)).toContainText(/^Yesterday /);
  await expect(times.nth(2)).toContainText("Jan 3,");
  const lastYear = String(new Date().getFullYear() - 1);
  await expect(times.nth(3)).toContainText(lastYear);
  for (const time of await times.all())
    await expect(time).toHaveAttribute("title", /\d/);
});

test("steps between versions and regenerates a new one", async ({
  page,
}, testInfo) => {
  await openPage(page);
  const versions = page.getByTestId("versions");
  const branch = versions.getByRole("group", { name: "Response versions" });
  const previous = branch.getByRole("button", { name: "Previous response" });
  const next = branch.getByRole("button", { name: "Next response" });
  const helpful = versions.getByRole("button", {
    name: "Helpful response",
    exact: true,
  });
  await expect(branch).toContainText("2 / 2");
  await expect(next).toBeDisabled();
  await expect(helpful).toHaveAttribute("aria-pressed", "true");
  await previous.focus();
  await page.keyboard.press("Enter");
  await expect(branch).toContainText("1 / 2");
  await expect(previous).toBeDisabled();
  await expect(helpful).toHaveAttribute("aria-pressed", "false");
  await expect(versions).toContainText("Alder & Co");
  await next.click();
  await versions.getByRole("button", { name: "Regenerate" }).click();
  await expect(versions).toContainText("Writing another version…");
  await expect(
    versions.getByRole("button", { name: "Copy response" }),
  ).toBeDisabled();
  await attach(
    testInfo,
    "message-actions-versions-pending",
    recipe(page, "versions"),
  );
  await expect(branch).toContainText("3 / 3");
  await expect(versions).toContainText("Short answer");
  await expect(
    versions.getByRole("button", { name: "Regenerate" }),
  ).toHaveCount(0);
  await attach(
    testInfo,
    "message-actions-versions-last",
    recipe(page, "versions"),
  );
});

test("copy-only actions work inside the handoff dialog", async ({
  page,
}, testInfo) => {
  await allowClipboard(page);
  await openPage(page);
  const inline = page
    .getByTestId("handoff")
    .getByRole("group", { name: "Response actions" });
  await expect(inline.getByRole("button")).toHaveCount(1);
  await expect(inline.locator("time")).toHaveCount(0);
  await recipe(page, "handoff")
    .getByRole("button", { name: "Open handoff" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Conversation handoff" });
  await expect(dialog).toBeVisible();
  const copy = dialog.getByRole("button", { name: "Copy response" });
  await copy.focus();
  await page.keyboard.press("Enter");
  await expect(
    dialog.getByRole("button", { name: "Response copied" }),
  ).toBeFocused();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Notes are in the reconciliation sheet (https://",
  );
  await attach(testInfo, "message-actions-handoff-dialog", dialog);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("shows disabled actions and a copy failure", async ({
  page,
}, testInfo) => {
  await allowClipboard(page);
  await openPage(page);
  const running = page.getByTestId("state-disabled");
  for (const button of await running.getByRole("button").all())
    await expect(button).toBeDisabled();
  await expect(running.getByRole("button")).toHaveCount(4);
  await expect(
    running.getByRole("button", { name: "Helpful response", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByTestId("state-disabled-copy").getByRole("button"),
  ).toHaveCount(1);
  await expect(
    page.getByTestId("state-disabled-copy").getByRole("button"),
  ).toBeDisabled();

  const states = recipe(page, "states");
  const copyState = page.getByTestId("state-copy");
  await states
    .getByRole("radio", { name: "Blocked" })
    .or(states.getByRole("button", { name: "Blocked" }))
    .click();
  await copyState.getByRole("button", { name: "Copy response" }).click();
  await expect(copyState.getByRole("alert")).toHaveText(
    "Couldn't copy. Select the response text or try again.",
  );
  await expect(
    copyState.getByRole("button", { name: "Copy response" }),
  ).toBeVisible();
  await attach(testInfo, "message-actions-copy-error", states);
  for (const m of ["dark"] as const) {
    await setColorMode(page, m);
    await attach(testInfo, `message-actions-copy-error-${m}`, states);
  }

  await states
    .getByRole("radio", { name: "Allowed" })
    .or(states.getByRole("button", { name: "Allowed" }))
    .click();
  await expect(copyState.getByRole("alert")).toHaveCount(0);
  await copyState.getByRole("button", { name: "Copy response" }).click();
  await expect(
    copyState.getByRole("button", { name: "Response copied" }),
  ).toBeVisible();
  await attach(testInfo, "message-actions-copied", states);
});
