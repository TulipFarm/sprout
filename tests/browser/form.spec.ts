import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption, setColorMode } from "./choose-option";

async function openForm(page: Page) {
  await page.goto("/components/form/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

const example = (page: Page, name: string) =>
  page.locator(`[data-example="${name}"]`);
const frame = (page: Page, title: string) =>
  page.locator("section.form-demo-frame", {
    has: page.locator(".form-demo-frame-bar", { hasText: title }),
  });

async function colorMode(page: Page, mode: "Light" | "Dark") {
  await setColorMode(page, mode);
  await page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const node of await page
    .locator('[data-slot="form-footer"], [data-slot="form-section"]')
    .all()) {
    if (!(await node.isVisible())) continue;
    expect(
      await node.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
  }
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`form ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openForm(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await colorMode(page, mode === "light" ? "Light" : "Dark");
        await noOverflow(page);
        await axe(page);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`form-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
      });
    }
  }
}

test("playground covers every layout and submit state", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openForm(page);
  const playground = example(page, "playground");
  const footer = playground.locator('[data-slot="form-footer"]');
  for (const layout of ["Bar", "Stack", "Compact"]) {
    await chooseOption(page, "Footer layout", layout);
    await expect(footer).toHaveAttribute("data-layout", layout.toLowerCase());
    for (const state of [
      "Ready",
      "Busy",
      "Blocked",
      "Blocked, jump fix",
      "Blocked, action fix",
      "Blocked, link fix",
    ]) {
      await chooseOption(page, "Submit state", state);
      const submit = footer.locator('button[type="submit"]').last();
      if (state === "Busy")
        await expect(submit).toHaveAttribute("aria-busy", "true");
      if (state.startsWith("Blocked")) {
        await expect(
          footer.locator('[data-slot="action-reason"]'),
        ).toBeVisible();
        const reasonId = await submit.getAttribute("aria-describedby");
        expect(reasonId).toBeTruthy();
      }
      await noOverflow(page);
    }
    const shot = await playground.screenshot();
    await testInfo.attach(`form-playground-${layout.toLowerCase()}`, {
      body: shot,
      contentType: "image/png",
    });
  }
  await chooseOption(page, "Footer layout", "Stack");
  await chooseOption(page, "Submit state", "Ready");
  const widths = await footer
    .locator(".sprout-form-footer-stack > *")
    .evaluateAll((nodes) =>
      nodes.map((node) => Math.round(node.getBoundingClientRect().width)),
    );
  expect(new Set(widths).size).toBe(1);
  for (const toggle of ["Secondary submit", "Note", "Error", "Form disabled"]) {
    await playground.getByRole("button", { name: toggle, exact: true }).click();
  }
  await expect(footer.getByRole("alert")).toBeVisible();
  await expect(playground.getByLabel("Email", { exact: true })).toBeDisabled();
});

test("invalid submit focuses the first invalid field and Discard changes recovers", async ({
  page,
}) => {
  await openForm(page);
  const form = example(page, "validation");
  const threshold = form.getByLabel("Start compacting at");
  await expect(
    form.getByRole("button", { name: "Discard changes" }),
  ).toHaveCount(0);
  await threshold.fill("");
  await expect(form.getByText("Unsaved changes")).toBeVisible();
  await form.getByLabel("Recent messages to keep").fill("90");
  await form.getByRole("button", { name: "Save compaction settings" }).click();
  await expect(threshold).toBeFocused();
  await expect(threshold).toHaveAttribute("aria-invalid", "true");
  await expect(
    form.getByRole("alert").filter({ hasText: "Fix 2 fields" }),
  ).toBeVisible();
  await form.getByRole("button", { name: "Discard changes" }).click();
  await expect(threshold).toHaveValue("80");
  await expect(form.getByText("Unsaved changes")).toHaveCount(0);

  await threshold.fill("75");
  await threshold.press("Enter");
  const busy = form.getByRole("button", {
    name: "Saving compaction settings…",
  });
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(threshold).toBeDisabled();
  await expect(
    form.getByRole("button", { name: "Discard changes" }),
  ).toHaveCount(0);
  await expect(
    form.getByRole("status").filter({ hasText: "Compaction settings saved." }),
  ).toBeVisible();
  await expect(threshold).toBeEnabled();
});

test("blocked fixes jump to the field, retry, and keep the submit focusable", async ({
  page,
}) => {
  await openForm(page);
  const jump = frame(page, "Blocked, jump to the field");
  const add = jump.getByRole("button", { name: "Add Slack destination" });
  await add.focus();
  await expect(add).toBeFocused();
  await expect(add).toHaveAccessibleDescription(
    "Choose a destination team below first.",
  );
  await jump.getByRole("button", { name: "Choose a team" }).click();
  await expect(jump.getByRole("combobox")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: "Finance" }).click();
  await expect(jump.locator('[data-slot="action-reason"]')).toHaveCount(0);
  await add.click();
  await expect(
    jump.getByRole("status").filter({ hasText: "Slack destination added." }),
  ).toBeVisible();

  const retry = frame(page, "Blocked, retry action");
  await retry.getByRole("button", { name: "Try again" }).click();
  await expect(
    retry.getByRole("button", { name: "Create schedule" }),
  ).toBeEnabled();
  await expect(retry.locator('[data-slot="action-reason"]')).toHaveCount(0);
});

test("compositions: outside footer, compact skip, secondary submit, dialog", async ({
  page,
}) => {
  await openForm(page);
  const knowledge = example(page, "knowledge");
  await knowledge.getByRole("button", { name: "Add to Knowledge" }).click();
  await expect(knowledge.getByRole("alert")).toBeVisible();
  await expect(
    knowledge.locator('[aria-invalid="true"]').first(),
  ).toBeFocused();
  await knowledge.getByRole("checkbox").first().check();
  await expect(knowledge.getByRole("status").first()).toHaveText(
    "1 / 20 selected",
  );
  await knowledge.getByRole("button", { name: "Add to Knowledge" }).click();
  await expect(
    knowledge.getByText("1 repositories added to Knowledge."),
  ).toBeVisible();

  const builder = example(page, "builder");
  await expect(
    builder.getByRole("button", { name: "Save draft" }),
  ).toBeVisible();

  const compact = example(page, "layouts").locator('[data-layout="compact"]');
  const actions = compact.locator(".sprout-form-footer-actions > *");
  await expect(actions.first()).toHaveText("Skip");

  const invite = example(page, "invite");
  await invite.getByRole("button", { name: "Invite members" }).click();
  const dialog = page.getByRole("dialog", { name: "Invite members" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Send invitations" }).click();
  await expect(dialog.getByLabel("Email 1", { exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Not now" }).click();
  await expect(dialog).toHaveCount(0);
  await invite.getByRole("button", { name: "Invite members" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("mobile stack footer uses full-width buttons and nothing overflows", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openForm(page);
  const stack = example(page, "layouts").locator('[data-layout="stack"]');
  const button = stack.getByRole("button", { name: "Email me a sign-in link" });
  const [buttonBox, footerBox] = await Promise.all([
    button.boundingBox(),
    stack.boundingBox(),
  ]);
  expect(Math.round(buttonBox!.width)).toBe(Math.round(footerBox!.width));
  await noOverflow(page);
  for (const name of ["layouts", "states", "sections", "compositions"]) {
    const shot = await example(page, name).screenshot();
    await testInfo.attach(`form-mobile-${name}`, {
      body: shot,
      contentType: "image/png",
    });
  }
});

test("reduced motion removes the status fade", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openForm(page);
  const form = example(page, "validation");
  await form.getByLabel("Start compacting at").fill("70");
  const dirty = form.locator(".sprout-form-footer-dirty");
  await expect(dirty).toBeVisible();
  expect(
    await dirty.evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});
