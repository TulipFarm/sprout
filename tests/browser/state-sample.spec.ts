import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function openStateSample(page: Page) {
  // Agent artwork comes from TulipFarm's avatar host; keep screenshots
  // deterministic with the initial fallback.
  await page.route("https://avatars.tulipfarm.ai/**", (route) => route.abort());
  await page.goto("/components/state-sample/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished),
    );
  });
}

const playground = (page: Page) =>
  page.getByRole("region", { name: "State sample playground" });

const sceneNames = [
  "chats",
  "files",
  "agents",
  "projects",
  "tasks",
  "skills",
  "workflows",
  "tables",
  "records",
  "create",
  "integrations",
  "models",
  "members",
  "teams",
  "invitations",
  "grants",
  "records-empty",
];

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`state sample ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openStateSample(page);
        await page.evaluate(
          (value) => (document.documentElement.dataset.sproutTheme = value),
          theme,
        );
        await chooseOption(
          page,
          "Color mode",
          mode === "light" ? "Light" : "Dark",
        );
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`state-sample-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        await testInfo.attach(
          `state-sample-playground-${theme}-${mode}-${width}`,
          {
            body: await playground(page).screenshot(),
            contentType: "image/png",
          },
        );
        for (const scene of ["workflows", "create", "invitations"]) {
          await testInfo.attach(
            `state-sample-${scene}-${theme}-${mode}-${width}`,
            {
              body: await page.locator(`[data-scene="${scene}"]`).screenshot(),
              contentType: "image/png",
            },
          );
        }
      });
    }
  }
}

test("gallery shows every Cloud sample with its parts", async ({ page }) => {
  await openStateSample(page);
  const scenes = page.locator("[data-scene]");
  await expect(scenes).toHaveCount(sceneNames.length);
  for (const name of sceneNames)
    await expect(page.locator(`[data-scene="${name}"]`)).toHaveCount(1);

  const scene = (name: string) => page.locator(`[data-scene="${name}"]`);
  await expect(scene("chats").locator(".sprout-state-sample-tab")).toHaveCount(
    2,
  );
  await expect(scene("grants").locator(".sprout-state-sample-tab")).toHaveCount(
    3,
  );
  await expect(scene("files").locator(".sprout-state-sample-tab")).toHaveCount(
    0,
  );
  await expect(
    scene("invitations").locator(".sprout-state-sample-crumb"),
  ).toHaveCount(3);
  await expect(
    scene("invitations").locator(".sprout-state-sample-crumb[data-current]"),
  ).toHaveText("Invitations");
  await expect(
    scene("workflows").locator(".sprout-state-sample-head [data-size]"),
  ).toHaveText(["Workflow", "Trigger", "Status"]);
  await expect(
    scene("records-empty").locator(".sprout-state-sample-head [data-size]"),
  ).toHaveText(["Row"]);
  await expect(
    scene("records").locator(".sprout-state-sample-head [data-size]"),
  ).toHaveText(["Name", "Contact email", "Payment terms"]);
  await expect(
    scene("records").locator('[data-slot="state-sample-bar"]'),
  ).toHaveCount(18);
  await expect(scene("teams").locator('[data-size="md"]')).toHaveCount(4);
  await expect(
    scene("teams").locator(".sprout-state-sample-trailing"),
  ).toHaveCount(0);
  await expect(
    scene("projects").locator(".sprout-state-sample-leading"),
  ).toHaveCount(0);
  await expect(
    scene("projects").locator('[data-slot="state-sample-list"]'),
  ).toHaveCount(2);
  await expect(
    scene("create").locator('[data-slot="state-sample-table"]'),
  ).toHaveCount(1);
  await expect(
    scene("integrations").locator(".sprout-brand-tile, [data-brand]").first(),
  ).toBeVisible();
  await expect(scene("agents").locator("[data-agent-avatar]")).toHaveCount(5);
  await expect(scene("invitations").locator('[data-tone="link"]')).toHaveCount(
    4,
  );
});

test("geometry matches Cloud", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openStateSample(page);
  const box = async (selector: string) =>
    (await page.locator(selector).first().boundingBox())!;
  const workflows = '[data-scene="workflows"]';
  expect((await box(`${workflows} .sprout-state-sample-bar`)).height).toBe(40);
  expect((await box(`${workflows} .sprout-state-sample-head`)).height).toBe(36);
  expect((await box(`${workflows} .sprout-state-sample-row`)).height).toBe(40);
  expect(
    (await box(`${workflows} .sprout-state-sample-row [data-size="narrow"]`))
      .width,
  ).toBe(96);
  const wide = await box(
    `${workflows} .sprout-state-sample-row [data-size="wide"]`,
  );
  const normal = await box(
    `${workflows} .sprout-state-sample-row [data-size="default"]`,
  );
  expect(wide.width / normal.width).toBeCloseTo(1.6, 1);
  expect((await box('[data-mark-sample="red-sm"]')).width).toBe(14);
  expect((await box('[data-mark-sample="red-md"]')).width).toBe(28);
  expect(
    (await box('[data-scene="chats"] [data-slot="state-sample-icon-tile"]'))
      .width,
  ).toBe(28);
  expect(
    (await box('[data-scene="chats"] .sprout-state-sample-item')).height,
  ).toBeGreaterThanOrEqual(56);
  const track = await box('[data-bar-sample="lg"] .state-sample-demo-track');
  for (const [width, ratio] of [
    ["sm", 1 / 3],
    ["md", 1 / 2],
    ["lg", 3 / 4],
  ] as const) {
    const bar = await box(
      `[data-bar-sample="${width}"] [data-slot="state-sample-bar"]`,
    );
    expect(bar.height).toBe(8);
    expect(bar.width / track.width).toBeCloseTo(ratio, 2);
  }
});

test("tones and dark mark colors resolve", async ({ page }) => {
  await openStateSample(page);
  const info = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--sprout-info")
      .trim(),
  );
  const link = page.locator(
    '[data-tone-sample="link"] [data-slot="state-sample-text"]',
  );
  const [r, g, b] = info
    .slice(1)
    .match(/../g)!
    .map((h) => parseInt(h, 16));
  await expect(link).toHaveCSS("color", `rgb(${r}, ${g}, ${b})`);
  await expect(
    page.locator('[data-tone-sample="strong"] [data-slot="state-sample-text"]'),
  ).toHaveCSS("font-weight", "500");
  await expect(
    page.locator('[data-tone-sample="mono"] [data-slot="state-sample-text"]'),
  ).toHaveCSS("font-family", /mono/i);
  const teal = page.locator('[data-mark-sample="teal-sm"]');
  const light = await teal.evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  );
  await chooseOption(page, "Color mode", "Dark");
  const dark = await teal.evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  );
  expect(light).toContain("linear-gradient");
  expect(dark).not.toBe(light);
});

test("long content truncates without widening the window", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openStateSample(page);
  const narrow = page.locator(".state-sample-demo-narrow");
  const title = narrow.locator(".sprout-state-sample-title");
  await expect(title).toHaveCSS("text-overflow", "ellipsis");
  expect(await title.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  expect(
    await narrow.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  const crumb = narrow.locator(".sprout-state-sample-crumb[data-current]");
  expect(await crumb.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
});

test("playground is keyboard operable and keeps samples inert in a panel", async ({
  page,
}) => {
  await openStateSample(page);
  const region = playground(page);
  const sample = region.locator('[data-slot="state-panel-sample"]');
  await expect(sample).toHaveAttribute("aria-hidden", "true");
  await expect(sample).toHaveAttribute("inert", "");
  await expect(
    region.getByRole("heading", { name: "No files yet" }),
  ).toBeVisible();

  const trigger = region.getByRole("combobox", { name: "Sample" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.getByRole("option", { name: "Workflows", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(
    region.getByRole("heading", { name: "No workflows yet" }),
  ).toBeVisible();
  await expect(sample.locator('[data-slot="state-sample-table"]')).toHaveCount(
    1,
  );

  await page.keyboard.press("Tab");
  const panelToggle = region.getByRole("button", { name: "In a state panel" });
  await expect(panelToggle).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const windowToggle = region.getByRole("button", { name: "Window only" });
  await expect(windowToggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(windowToggle).toHaveAttribute("aria-pressed", "true");
  await expect(region.locator('[data-slot="state-panel"]')).toHaveCount(0);
  await expect(region.locator('[data-slot="state-sample"]')).toBeVisible();
  await expect(
    region.locator(
      '[data-slot="state-sample"] :focus-visible, [data-slot="state-sample"] [tabindex]',
    ),
  ).toHaveCount(0);

  const ring = await windowToggle.evaluate(
    (el) => getComputedStyle(el).outlineStyle,
  );
  expect(ring).not.toBe("none");
});

test("models and members panels render without an action", async ({ page }) => {
  await openStateSample(page);
  for (const label of ["Models", "Members"]) {
    await chooseOption(page, "Sample", label);
    const region = playground(page);
    await expect(
      region.locator('[data-slot="state-panel-actions"]'),
    ).toHaveCount(0);
    await expect(
      region.locator('[data-slot="state-panel-sample"]'),
    ).toHaveCount(1);
  }
});
