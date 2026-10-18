import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/typed-text/";

async function openTypedText(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#typed-text-demo");
}

function example(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

/** Records every visible string a TypedText shows until it settles. */
async function recordFrames(page: Page, testId: string) {
  await page.evaluate((id) => {
    const root = document.querySelector(
      `[data-testid="${id}"] [data-slot="typed-text"]`,
    )!;
    const visible = root.querySelector('[aria-hidden="true"]')!;
    const frames: string[] = [];
    (window as unknown as { frames_: string[] }).frames_ = frames;
    new MutationObserver(() => frames.push(visible.textContent ?? "")).observe(
      visible,
      {
        characterData: true,
        childList: true,
        subtree: true,
      },
    );
  }, testId);
}

async function frames(page: Page) {
  return page.evaluate(
    () => (window as unknown as { frames_: string[] }).frames_,
  );
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`typed text ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openTypedText(page);
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
        // Show the long agent title so truncation is in the screenshot.
        const chat = example(page, "Chat title");
        await chat.getByRole("button", { name: "Agent renames" }).click();
        await chat.getByRole("button", { name: "Agent renames" }).click();
        await expect(chat.locator('[data-slot="typed-text"]')).toHaveAttribute(
          "data-state",
          "idle",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        for (const body of await demo
          .locator(".typed-text-demo-card-body")
          .all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        for (const text of await demo
          .locator('[data-slot="typed-text"]')
          .all()) {
          const color = await text.evaluate((node) => ({
            own: getComputedStyle(node).color,
            parent: getComputedStyle(node.parentElement!).color,
          }));
          expect(color.own).toBe(color.parent);
        }
        const results = await new AxeBuilder({ page })
          .include("#typed-text-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `typed-text-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`typed-text-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("chat title animates only agent renames after the first", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openTypedText(page);
  const chat = example(page, "Chat title");
  const heading = chat.getByRole("heading", { level: 4 });
  const root = heading.locator('[data-slot="typed-text"]');
  const meta = chat.getByTestId("chat-meta");
  await expect(heading).toHaveAccessibleName("New chat");
  await expect(root).toHaveAttribute("data-state", "idle");
  await expect(meta).toContainText("Revision0");

  // Revision 1: the first agent title appears at once.
  await recordFrames(page, "chat-header");
  await chat.getByRole("button", { name: "Agent renames" }).click();
  await expect(heading).toHaveAccessibleName("Prepare our investor pitch");
  await expect(heading).toHaveAttribute("title", "Prepare our investor pitch");
  await expect(root).toHaveAttribute("data-state", "idle");
  expect(await frames(page)).toEqual(["Prepare our investor pitch"]);
  await expect(meta).toContainText("AnimatedNo");

  // Revision 2: an agent rename types in, capped at 800ms.
  const long =
    "Compare Q3 vendor contracts for the Lisbon and Porto warehouse expansion";
  await recordFrames(page, "chat-header");
  const started = Date.now();
  await chat.getByRole("button", { name: "Agent renames" }).click();
  await expect(root).toHaveAttribute("data-state", "typing");
  // Screen readers get the whole title while it types.
  await expect(root.locator(".sprout-typed-text-sr-only")).toHaveText(long);
  await expect(heading).toHaveAccessibleName(long);
  await expect(root).toHaveAttribute("data-state", "idle");
  await expect(meta).toContainText("AnimatedYes");
  expect(Date.now() - started).toBeLessThan(2000);
  const typed = await frames(page);
  expect(typed.length).toBeGreaterThan(3);
  expect(typed[0]).toBe("C");
  expect(typed.at(-1)).toBe(long);
  for (const [index, frame] of typed.entries()) {
    expect(long.startsWith(frame)).toBe(true);
    if (index)
      expect(frame.length).toBeGreaterThanOrEqual(typed[index - 1]!.length);
  }
  // On a phone the long title ellipsizes inside the heading.
  await page.setViewportSize({ width: 390, height: 1000 });
  expect(
    await heading.evaluate(
      (node) =>
        node.scrollWidth > node.clientWidth &&
        getComputedStyle(node).textOverflow === "ellipsis",
    ),
  ).toBe(true);

  // A manual rename appears at once.
  await recordFrames(page, "chat-header");
  await chat.getByRole("button", { name: "Edit title" }).click();
  await expect(heading).toHaveAccessibleName("Board deck — final review");
  expect(await frames(page)).toEqual(["Board deck — final review"]);
  await expect(meta).toContainText("Named byPerson");
  await expect(meta).toContainText("AnimatedNo");

  // Reset returns to a fresh chat, which appears at once.
  await chat.getByRole("button", { name: "Reset" }).click();
  await expect(heading).toHaveAccessibleName("New chat");
  await expect(root).toHaveAttribute("data-state", "idle");
});

test("heading takes programmatic focus with a visible ring", async ({
  page,
}) => {
  await openTypedText(page);
  const heading = example(page, "Chat title").getByRole("heading", {
    level: 4,
  });
  await page.keyboard.press("Tab");
  await heading.focus();
  await expect(heading).toBeFocused();
  const outline = await heading.evaluate(
    (node) => getComputedStyle(node).outlineStyle,
  );
  expect(outline).toBe("solid");
});

test("keyboard changes the sentence and it types in", async ({ page }) => {
  await openTypedText(page);
  const sentence = example(page, "Animated changes");
  const button = sentence.getByRole("button", { name: "Change sentence" });
  const root = sentence.locator('[data-slot="typed-text"]');
  await expect(sentence.getByTestId("sentence")).toHaveText(
    /Let’s make a garden plan\./,
  );
  await button.focus();
  await recordFrames(page, "sentence");
  await page.keyboard.press("Enter");
  await expect(root.locator(".sprout-typed-text-sr-only")).toHaveText(
    "Your fictional garden plan is ready.",
  );
  await expect(root).toHaveAttribute("data-state", "idle");
  expect((await frames(page)).length).toBeGreaterThan(3);
  await recordFrames(page, "sentence");
  await page.keyboard.press("Space");
  await expect(root.locator('[aria-hidden="true"]')).toHaveText(
    "Let’s make a garden plan.",
  );
  expect((await frames(page))[0]).toBe("L");
});

test("typing never splits emoji or accented letters", async ({ page }) => {
  await openTypedText(page);
  const card = example(page, "Emoji and accents");
  await recordFrames(page, "graphemes");
  await card.getByRole("button", { name: "Change status" }).click();
  const target = "👩‍🌾 Crew booked for Café Søndergård 🌷";
  await expect(card.locator('[data-slot="typed-text"]')).toHaveAttribute(
    "data-state",
    "idle",
  );
  const typed = await frames(page);
  expect(typed.at(-1)).toBe(target);
  const whole = await page.evaluate(
    ({ typed, target }) => {
      const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });
      const parts = Array.from(
        segmenter.segment(target),
        (item) => item.segment,
      );
      const prefixes = new Set(
        parts.map((_, index) => parts.slice(0, index + 1).join("")),
      );
      return typed.every((frame) => prefixes.has(frame));
    },
    { typed, target },
  );
  expect(whole).toBe(true);
  expect(typed[0]).toBe("👩‍🌾");
});

test("animate={false} shows text at once", async ({ page }) => {
  await openTypedText(page);
  const card = example(page, "Without animation");
  await expect(card.locator('[aria-hidden="true"]')).toHaveText(
    "This sentence appears immediately.",
  );
  await expect(card.locator('[data-slot="typed-text"]')).toHaveAttribute(
    "data-state",
    "idle",
  );
});

test("reduced motion shows changes at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTypedText(page);
  const card = example(page, "Animated changes");
  await recordFrames(page, "sentence");
  await card.getByRole("button", { name: "Change sentence" }).click();
  await expect(card.locator('[aria-hidden="true"]')).toHaveText(
    "Your fictional garden plan is ready.",
  );
  expect(await frames(page)).toEqual(["Your fictional garden plan is ready."]);
});

test("turning on reduced motion mid-change finishes the text", async ({
  page,
}) => {
  await openTypedText(page);
  const card = example(page, "Chat title");
  const root = card.locator('[data-slot="typed-text"]');
  await card.getByRole("button", { name: "Agent renames" }).click();
  // Pause frames so the change is still typing when the setting flips.
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  await card.getByRole("button", { name: "Agent renames" }).click();
  await expect(root).toHaveAttribute("data-state", "typing");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(root).toHaveAttribute("data-state", "idle");
  await expect(root.locator('[aria-hidden="true"]')).toHaveText(
    "Compare Q3 vendor contracts for the Lisbon and Porto warehouse expansion",
  );
});
