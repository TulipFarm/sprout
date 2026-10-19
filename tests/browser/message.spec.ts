import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setColorMode } from "./choose-option";

const route = "/components/message/";

async function openMessage(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#message-demo");
}

async function setMode(page: Page, mode: "light" | "dark") {
  await page.emulateMedia({ colorScheme: mode });
  if (mode === "dark") await setColorMode(page, "Dark");
  else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

function color(page: Page, value: string) {
  return page.evaluate((input) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = input;
    document.body.append(probe);
    const result = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return result;
  }, value);
}

function bubble(locator: Locator) {
  return locator.locator('[data-slot="message-bubble"]').first();
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value!;
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`message ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openMessage(page);
        await page.evaluate(
          (value) =>
            document.documentElement.setAttribute("data-sprout-theme", value),
          theme,
        );
        await setMode(page, mode as "light" | "dark");
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        for (const body of await demo.locator(".message-demo-card-body").all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        for (const message of await demo.locator('[data-slot="message"]').all())
          expect(
            await message.evaluate(
              (node) => node.scrollWidth <= node.clientWidth + 1,
            ),
          ).toBe(true);
        for (const node of await demo
          .locator('[data-slot="message-bubble"]:visible')
          .all())
          expect(
            await node.evaluate(
              (element) => element.scrollWidth <= element.clientWidth + 1,
            ),
          ).toBe(true);

        const fills: Record<string, string> = {
          default: await color(page, "var(--sprout-primary)"),
          secondary: await color(page, "var(--sprout-secondary)"),
          outline: await color(page, "var(--sprout-surface)"),
          destructive: await color(page, "var(--sprout-danger-subtle)"),
          ghost: "rgba(0, 0, 0, 0)",
        };
        for (const [variant, fill] of Object.entries(fills))
          await expect(
            bubble(page.getByTestId(`variant-${variant}`)),
          ).toHaveCSS("background-color", fill);
        for (const variant of ["muted", "tinted"]) {
          const fill = await bubble(
            page.getByTestId(`variant-${variant}`),
          ).evaluate((node) => getComputedStyle(node).backgroundColor);
          expect(fill).not.toBe(fills.outline);
          expect(fill).not.toBe(fills.secondary);
        }
        await expect(bubble(page.getByTestId("variant-outline"))).toHaveCSS(
          "border-top-color",
          await color(page, "var(--sprout-line)"),
        );

        const muted = await page.evaluate(() => {
          const probe = document.createElement("span");
          probe.style.color = "var(--sprout-muted)";
          document.body.append(probe);
          const result = getComputedStyle(probe).color;
          probe.remove();
          return result;
        });
        await expect(
          demo.locator('[data-slot="message-header"]').first(),
        ).toHaveCSS("color", muted);
        const results = await new AxeBuilder({ page })
          .include("#message-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `message-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`message-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("aligns start and end messages, avatar, header, and footer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await openMessage(page);
  const start = page.getByTestId("message-start");
  const end = page.getByTestId("message-end");
  await expect(start).toHaveAttribute("data-align", "start");
  await expect(end).toHaveAttribute("data-align", "end");
  await expect(end).toHaveCSS("flex-direction", "row-reverse");
  await expect(start.locator('[data-slot="message-header"]')).toHaveCSS(
    "padding-left",
    "12px",
  );
  await expect(end.locator('[data-slot="message-footer"]')).toHaveCSS(
    "justify-content",
    "flex-end",
  );

  const endContent = await end
    .locator('[data-slot="message-content"]')
    .boundingBox();
  const endBubbles = end.locator('[data-slot="message-bubble"]');
  await expect(endBubbles).toHaveCount(2);
  const endBubble = await endBubbles.first().boundingBox();
  const nextBubble = await endBubbles.nth(1).boundingBox();
  const endHeader = await end
    .locator('[data-slot="message-header"]')
    .boundingBox();
  expect(
    Math.abs(
      endBubble!.x + endBubble!.width - (endContent!.x + endContent!.width),
    ),
  ).toBeLessThan(1);
  expect(
    Math.abs(
      nextBubble!.x + nextBubble!.width - (endContent!.x + endContent!.width),
    ),
  ).toBeLessThan(1);
  expect(
    Math.abs(
      endHeader!.x + endHeader!.width - (endContent!.x + endContent!.width),
    ),
  ).toBeLessThan(1);
  expect(Math.round(nextBubble!.y - (endBubble!.y + endBubble!.height))).toBe(
    10,
  );

  const avatar = await start
    .locator('[data-slot="message-avatar"]')
    .boundingBox();
  const startBubble = await start
    .locator('[data-slot="message-bubble"]')
    .boundingBox();
  expect(avatar!.width).toBeGreaterThanOrEqual(32);
  expect(
    Math.abs(
      avatar!.y + avatar!.height - (startBubble!.y + startBubble!.height),
    ),
  ).toBeLessThan(1.5);
  const startContent = await start
    .locator('[data-slot="message-content"]')
    .boundingBox();
  expect(startContent!.x - (avatar!.x + avatar!.width)).toBeCloseTo(8, 0);
});

test("keeps unslotted content full width and drops the inset for ghost bubbles", async ({
  page,
}) => {
  await openMessage(page);
  const onboarding = page.getByTestId("onboarding");
  const user = onboarding.locator('[data-align="end"]').first();
  const content = await user
    .locator('[data-slot="message-content"]')
    .boundingBox();
  const plain = await user
    .locator(".message-demo-onboarding-user")
    .boundingBox();
  expect(Math.abs(plain!.width - content!.width)).toBeLessThan(1);
  await expect(user.locator('[data-slot="message-header"]')).toHaveCSS(
    "align-self",
    "flex-end",
  );

  const ghost = page.getByTestId("ghost-message");
  const filled = page.getByTestId("filled-message");
  await expect(ghost.locator('[data-slot="message-header"]')).toHaveCSS(
    "padding-left",
    "0px",
  );
  await expect(ghost.locator('[data-slot="message-footer"]')).toHaveCSS(
    "padding-left",
    "0px",
  );
  await expect(filled.locator('[data-slot="message-header"]')).toHaveCSS(
    "padding-left",
    "12px",
  );
  const ghostHeader = await ghost
    .locator('[data-slot="message-header"]')
    .boundingBox();
  const ghostText = await ghost
    .locator('[data-slot="message-bubble"]')
    .boundingBox();
  expect(Math.abs(ghostHeader!.x - ghostText!.x)).toBeLessThan(1);
});

test("a ghost button in the footer does not remove the inset", async ({
  page,
}) => {
  await openMessage(page);
  const inset = await page.evaluate(() => {
    const message = document.querySelector('[data-testid="filled-message"]')!;
    const footer = message.querySelector('[data-slot="message-footer"]')!;
    const button = document.createElement("button");
    button.dataset.variant = "ghost";
    button.textContent = "Copy";
    footer.append(button);
    const header = message.querySelector('[data-slot="message-header"]')!;
    const result = getComputedStyle(header).paddingLeft;
    button.remove();
    return result;
  });
  expect(inset).toBe("12px");
});

test("keeps long content inside", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openMessage(page);
  const long = page.getByTestId("long-content");
  for (const node of await long.locator('[data-slot="message-bubble"]').all())
    expect(
      await node.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
  const header = long.locator(".message-demo-truncate");
  expect(
    await header.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await expect(header).toHaveCSS("text-overflow", "ellipsis");
});

test("reply status covers failed, retry, busy, and queued states by keyboard", async ({
  page,
}) => {
  await openMessage(page);
  const region = example(page, "Reply status");
  const status = region.getByTestId("reply-status");
  await expect(status.locator('p[role="status"]')).toHaveText(
    "The reply didn’t finish.",
  );
  await expect(status.getByRole("alert")).toContainText(
    "Retry uses the original model.",
  );
  await expect(status.locator('[data-slot="message-footer"]')).toHaveCSS(
    "justify-content",
    "flex-end",
  );

  const retry = status.getByRole("button", { name: "Retry reply" });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(status.getByTestId("busy-message")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(status.locator('p[role="status"]')).toHaveText(
    "Writing a reply…",
  );
  await expect(region.getByText("Retry requested.")).toBeVisible();

  const working = region.getByRole("button", { name: "Working" });
  await working.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(region.getByRole("button", { name: "Queued" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(status.locator('p[role="status"]')).toHaveText("Queued");
  await expect(status.getByTestId("busy-message")).toHaveCount(0);
  await expect(status.getByRole("button", { name: "Retry reply" })).toHaveCount(
    0,
  );
});

test("scrollable history is focusable and follows the newest message", async ({
  page,
}) => {
  await openMessage(page);
  const region = example(page, "Scrollable history");
  const history = region.getByRole("region", { name: "Message history" });
  await history.focus();
  await expect(history).toBeFocused();
  await expect(history).toHaveCSS("outline-style", "solid");
  await expect(history.locator('[data-slot="message-bubble"]')).toHaveCount(6);
  await region.getByRole("button", { name: "Add message" }).click();
  await expect(history.locator('[data-slot="message"]')).toHaveCount(7);
  await expect(region.getByText("7 messages")).toBeVisible();
  await expect(
    history.getByText("Bed 7 gets six hours of sun."),
  ).toBeInViewport();
  expect(
    await history.evaluate(
      (node) => node.scrollHeight - node.scrollTop - node.clientHeight < 2,
    ),
  ).toBe(true);
  const variants = await history
    .locator('[data-slot="message-bubble"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-variant")),
    );
  expect(variants.slice(0, 4)).toEqual([
    "secondary",
    "default",
    "secondary",
    "default",
  ]);
  await history.focus();
  await page.keyboard.press("Home");
  await expect.poll(() => history.evaluate((node) => node.scrollTop)).toBe(0);
});

test("stops color transitions when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openMessage(page);
  const header = page.locator('[data-slot="message-header"]').first();
  await expect(header).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(header).toHaveCSS("transition-duration", /0\.12s/);
});

test("end messages flip in right-to-left text", async ({ page }) => {
  await openMessage(page);
  await page.evaluate(() => {
    document
      .querySelector('[data-testid="incoming-outgoing"]')!
      .setAttribute("dir", "rtl");
  });
  const end = page.getByTestId("message-end");
  const group = await page.getByTestId("incoming-outgoing").boundingBox();
  const first = await end
    .locator('[data-slot="message-bubble"]')
    .first()
    .boundingBox();
  expect(Math.abs(first!.x - group!.x)).toBeLessThan(1);
});

test("bubbles keep compact geometry and follow their message side", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openMessage(page);
  const secondary = page.getByTestId("variant-secondary");
  const body = bubble(secondary);
  await expect(body).toHaveCSS("padding", "8px 12px");
  await expect(body).toHaveCSS("font-size", "14px");
  await expect(body).toHaveCSS("border-top-left-radius", "12px");
  await expect(bubble(page.getByTestId("variant-ghost"))).toHaveCSS(
    "padding",
    "0px",
  );

  const thread = await box(secondary.locator(".message-demo-thread"));
  const end = await box(body);
  expect(Math.abs(end.x + end.width - (thread.x + thread.width))).toBeLessThan(
    1,
  );
  expect(end.width).toBeLessThanOrEqual(thread.width * 0.8 + 1);
  const muted = page.getByTestId("variant-muted");
  const startThread = await box(muted.locator(".message-demo-thread"));
  const start = await box(bubble(muted));
  expect(Math.abs(start.x - startThread.x)).toBeLessThan(1);

  const prompts = page
    .getByRole("region", { name: "Conversation", exact: true })
    .locator(
      '[data-slot="message"][data-align="end"] [data-slot="message-bubble"]',
    );
  await expect(prompts.first()).toHaveAttribute("data-variant", "secondary");
});

test("reactions sit on each edge and corner", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openMessage(page);
  for (const [side, align] of [
    ["bottom", "start"],
    ["top", "end"],
    ["top", "start"],
    ["bottom", "end"],
  ] as const) {
    const item = page.getByTestId(`reaction-${side}-${align}`);
    await expect(
      item.locator('[data-slot="message-bubble-frame"]'),
    ).toHaveCount(1);
    const target = await box(bubble(item));
    const pill = await box(item.locator('[data-slot="message-reactions"]'));
    if (align === "start") expect(Math.round(pill.x - target.x)).toBe(12);
    else
      expect(Math.round(target.x + target.width - (pill.x + pill.width))).toBe(
        12,
      );
    if (side === "top") {
      expect(pill.y).toBeLessThan(target.y);
      expect(pill.y + pill.height).toBeGreaterThan(target.y);
    } else {
      expect(pill.y + pill.height).toBeGreaterThan(target.y + target.height);
      expect(pill.y).toBeLessThan(target.y + target.height);
    }
  }
  const ring = await page
    .getByTestId("reaction-bottom-start")
    .locator('[data-slot="message-reactions"]')
    .evaluate((node) => getComputedStyle(node).boxShadow);
  expect(ring).toContain(await color(page, "var(--sprout-canvas)"));
});

test("reaction toggles and interactive bubbles work from the keyboard", async ({
  page,
}) => {
  await openMessage(page);
  const thumbs = page.getByRole("button", { name: "Thumbs up, 3" });
  await thumbs.focus();
  await expect(thumbs).toHaveAttribute("aria-pressed", "true");
  await expect(thumbs).toHaveCSS("outline-style", "solid");
  expect(Math.round((await box(thumbs)).height)).toBe(24);
  await page.keyboard.press("Space");
  const off = page.getByRole("button", { name: "Thumbs up, 2" });
  await expect(off).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Tab");
  const party = page.getByRole("button", { name: "Party, 1" });
  await expect(party).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Party, 2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const interactive = example(page, "Links and buttons");
  const link = interactive.getByRole("link", {
    name: "Open result · Investor update draft",
  });
  await link.focus();
  await expect(link).toHaveCSS("outline-style", "solid");
  await expect(link).toHaveAttribute("data-slot", "message-bubble");
  await page.keyboard.press("Tab");
  const suggestion = interactive.getByRole("button", {
    name: "Suggested: show overdue tasks",
  });
  await expect(suggestion).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    interactive.getByRole("button", { name: "✓ Showing overdue tasks" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  const retry = interactive.getByRole("button", { name: /Couldn't send/ });
  await expect(retry).toBeFocused();
  await expect(retry).toHaveCSS(
    "outline-color",
    await color(page, "var(--sprout-danger)"),
  );
  const row = await box(
    interactive.locator('[data-slot="message"][data-align="end"]'),
  );
  const retryBox = await box(retry);
  expect(
    Math.abs(retryBox.x + retryBox.width - (row.x + row.width)),
  ).toBeLessThan(1);
  await page.keyboard.press("Enter");
  await expect(retry).toHaveCount(0);
  await expect(
    interactive.getByText(
      "Notify #engineering whenever a pull request is opened.",
    ),
  ).toBeVisible();
});

test("interactive bubbles darken on hover and animate only without reduced motion", async ({
  page,
}) => {
  await openMessage(page);
  const link = example(page, "Links and buttons").getByRole("link");
  await expect(link).toHaveCSS("transition-duration", /0\.12s/);
  await link.hover();
  await settle(page);
  await expect(link).toHaveCSS(
    "background-color",
    await color(page, "var(--sprout-hover)"),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(link).toHaveCSS("transition-duration", "0s");
});

test("conversation sends with the keyboard, shows pending, and empties", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openMessage(page);
  const card = example(page, "Conversation");
  const timeline = card.getByRole("region", { name: "Conversation" });
  const input = card.getByRole("textbox", { name: "Message" });
  const send = card.getByRole("button", { name: "Send message" });
  const prompts = timeline.locator(
    '[data-slot="message"][data-align="end"] [data-slot="message-bubble"][data-variant="secondary"]',
  );
  await expect(send).toBeDisabled();
  await expect(prompts).toHaveCount(1);
  await expect(timeline.getByText("TulipFarm said")).toHaveCount(1);

  await input.fill("Add a Churned status");
  await input.press("Shift+Enter");
  await input.pressSequentially("and make Name required.");
  await expect(send).toBeEnabled();
  await input.press("Enter");
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  const pending = timeline.locator('[aria-busy="true"]');
  await expect(pending).toBeVisible();
  await expect(pending.getByRole("status")).toHaveText("Thinking…");
  await expect(send).toBeDisabled();
  await expect(pending).toHaveCount(0);
  const prompt = prompts.nth(1);
  expect(await prompt.evaluate((node) => node.textContent)).toBe(
    "Add a Churned status\nand make Name required.",
  );
  expect(
    await prompt.evaluate((node) => node.getBoundingClientRect().height),
  ).toBeGreaterThan(40);
  expect(
    await prompt.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  await expect(timeline.getByText("TulipFarm said")).toHaveCount(2);
  expect(
    await timeline.evaluate(
      (node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 2,
    ),
  ).toBe(true);

  await card.getByRole("button", { name: "Clear" }).click();
  await expect(
    timeline.getByText(
      "No messages yet. Ask about a table, a file, or a workflow.",
    ),
  ).toBeVisible();
  await expect(card.getByRole("button", { name: "Clear" })).toBeDisabled();
});

test("rich messages wrap long text and copy every bubble", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 900 });
  await openMessage(page);
  const card = example(page, "Rich messages");
  const prompt = card.locator(
    '[data-slot="message-bubble"][data-variant="secondary"]',
  );
  expect(
    await prompt.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  await expect(
    prompt.getByRole("link", { name: "Q3 pipeline.xlsx" }),
  ).toBeVisible();
  const answer = await box(
    card.locator('[data-slot="message-bubble"][data-variant="ghost"]'),
  );
  const entry = await box(card.getByTestId("rich-answer"));
  expect(answer.width).toBeGreaterThan(entry.width * 0.8);

  await card.getByRole("button", { name: "Copy message" }).click();
  await expect(card.getByRole("status")).toHaveText("Copied");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Q3 pipeline closed at $1.2M");
  expect(copied).toContain("Want me to post this to #sales?");
});
