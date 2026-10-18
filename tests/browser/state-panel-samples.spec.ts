import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

test.use({ reducedMotion: "reduce" });

async function open(page: Page) {
  // Agent artwork comes from TulipFarm's avatar host; keep screenshots
  // deterministic with the initial fallback.
  await page.route("https://avatars.tulipfarm.ai/**", (route) => route.abort());
  await page.goto("/components/state-panel/");
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
  page.getByRole("region", { name: "Sample presets playground" });

const scenes = [
  ["chats", "ChatsSample", "pages/workspace-chats.tsx"],
  ["files", "FilesSample", "pages/files.tsx"],
  ["agents", "AgentsSample", "pages/agents.tsx"],
  ["projects", "ProjectsSample", "pages/projects.tsx"],
  ["tasks", "AgentTasksSample", "pages/agent-tasks.tsx"],
  ["skills", "SkillsSample", "pages/skills.tsx"],
  ["workflows", "WorkflowsSample", "pages/workflows.tsx"],
  ["tables", "TablesSample", "features/tables/tables.tsx"],
  ["records", "RecordsSample", "features/tables/tables.tsx"],
  ["create", "CreateInChatSample", "pages/tables.tsx"],
  ["integrations", "IntegrationsSample", "pages/integrations.tsx"],
  ["models", "ModelsSample", "pages/models.tsx"],
  ["members", "MembersSample", "pages/member-administration.tsx"],
  ["teams", "TeamsSample", "pages/team-administration.tsx"],
  ["invitations", "InvitationsSample", "pages/invitation-list.tsx"],
  ["grants", "GrantsSample", "pages/governance.tsx"],
] as const;

// Every importer's empty panel: page label, state, heading level, title,
// actions, and whether it shows a sample.
const panels = [
  ["Chats", null, "h2", "No chats yet", ["Start a chat"], true],
  ["Files", null, "h2", "No files yet", ["Upload", "New folder"], true],
  ["Agents", null, "h2", "No agents yet", ["Create in chat"], true],
  ["Projects", null, "h2", "No projects yet", ["New project"], true],
  ["Agent tasks", null, "h2", "No agent tasks yet", ["Choose an agent"], true],
  ["Skills", null, "h3", "No workspace skills yet", ["Import skill"], true],
  ["Workflows", "Current", "h2", "No workflows yet", ["New workflow"], true],
  [
    "Workflows",
    "Archived",
    "h2",
    "No archived workflows",
    ["Show current workflows"],
    false,
  ],
  ["Tables", null, "h2", "No tables yet", ["Create table in chat"], true],
  [
    "Rows",
    "Can add rows",
    "h3",
    "No rows yet",
    ["Add row", "Add rows in chat"],
    true,
  ],
  ["Rows", "Chat only", "h3", "No rows yet", ["Add rows in chat"], true],
  [
    "Create in chat",
    "Create table",
    "h2",
    "Build tables in chat",
    ["Create table in chat"],
    true,
  ],
  [
    "Create in chat",
    "Change fields",
    "h2",
    "Build tables in chat",
    ["Change fields in chat"],
    true,
  ],
  ["Integrations", null, "h3", "Nothing connected yet", ["Browse apps"], true],
  ["Models", null, "h2", "No models configured yet", [], true],
  ["Members", null, "h2", "No members yet", [], true],
  ["Teams", null, "h2", "No teams yet", ["Create a team"], true],
  [
    "Invitations",
    "Admin",
    "h3",
    "No invitations yet",
    ["Invite members"],
    true,
  ],
  ["Invitations", "Read only", "h3", "No invitations yet", [], true],
  ["Team grants", null, "h3", "No team grants yet", ["Go to Teams"], true],
] as const;

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`empty samples ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await open(page);
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
        for (const [name] of scenes) {
          const window = page.locator(
            `[data-scene="${name}"] [data-slot="state-sample"]`,
          );
          expect(
            await window.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          ).toBe(true);
        }
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`state-panel-samples-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
        await testInfo.attach(
          `state-panel-samples-playground-${theme}-${mode}-${width}`,
          {
            body: await playground(page).screenshot(),
            contentType: "image/png",
          },
        );
        for (const [name] of scenes) {
          await testInfo.attach(
            `state-panel-samples-${name}-${theme}-${mode}-${width}`,
            {
              body: await page.locator(`[data-scene="${name}"]`).screenshot(),
              contentType: "image/png",
            },
          );
        }
      });
    }
  }
}

test("gallery shows every Cloud sample with its importer", async ({ page }) => {
  await open(page);
  await expect(page.locator("[data-scene]")).toHaveCount(scenes.length);
  for (const [name, sample, source] of scenes) {
    const card = page.locator(`[data-scene="${name}"]`);
    await expect(card.locator("figcaption code")).toHaveText(sample);
    await expect(card.locator("figcaption span")).toContainText(source);
    await expect(card.locator('[data-slot="state-sample"]')).toHaveCount(1);
  }
  const scene = (name: string) => page.locator(`[data-scene="${name}"]`);
  await expect(scene("chats").locator(".sprout-state-sample-tab")).toHaveText([
    "Active",
    "Archived",
  ]);
  await expect(
    scene("files").locator('[data-slot="file-type-icon"]'),
  ).toHaveCount(3);
  await expect(scene("agents").locator("[data-agent-avatar]")).toHaveCount(5);
  await expect(scene("tasks").locator("[data-agent-avatar]")).toHaveCount(4);
  await expect(
    scene("projects").locator(".sprout-state-panel-samples-group"),
  ).toHaveText(["Active projects", "Archived projects"]);
  await expect(scene("integrations").locator("[data-brand]")).toHaveCount(5);
  await expect(scene("models").locator("[data-brand]")).toHaveCount(4);
  await expect(
    scene("teams").locator('[data-slot="state-sample-mark"][data-size="md"]'),
  ).toHaveCount(4);
  await expect(scene("invitations").locator('[data-tone="link"]')).toHaveCount(
    4,
  );
  await expect(scene("grants").locator(".sprout-state-sample-tab")).toHaveCount(
    3,
  );
  await expect(
    scene("records").locator(".sprout-state-sample-head [data-size]"),
  ).toHaveText(["Name", "Contact email", "Payment terms"]);
  await expect(
    scene("create").locator(".sprout-state-panel-samples-bubble"),
  ).toBeVisible();
  for (const variant of ["success", "secondary", "warning", "info"])
    await expect(
      page.locator(`[data-scene] .sprout-badge-${variant}`).first(),
    ).toBeVisible();
});

test("rows sample follows the table's fields", async ({ page }) => {
  await open(page);
  const head = (name: string) =>
    page.locator(
      `[data-records="${name}"] .sprout-state-sample-head [data-size]`,
    );
  await expect(head("four")).toHaveText([
    "Name",
    "Contact email",
    "Payment terms",
  ]);
  await expect(head("two")).toHaveText(["Subject", "Priority"]);
  await expect(head("one")).toHaveText(["Region"]);
  await expect(head("none")).toHaveText(["Row"]);
  await expect(head("none")).toHaveAttribute("data-size", "wide");
  await expect(
    page.locator(
      '[data-records="two"] .sprout-state-sample-crumb[data-current]',
    ),
  ).toHaveText("Support tickets");
  await expect(
    page.locator('[data-records="four"] [data-slot="state-sample-bar"]'),
  ).toHaveCount(18);
});

test("geometry matches Cloud", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  const box = async (selector: string) =>
    (await page.locator(selector).first().boundingBox())!;
  expect(
    (await box('[data-scene="tables"] .sprout-state-sample-bar')).height,
  ).toBe(40);
  expect(
    (await box('[data-scene="tables"] .sprout-state-sample-row')).height,
  ).toBe(40);
  expect(
    (await box('[data-scene="chats"] .sprout-state-sample-item')).height,
  ).toBeGreaterThanOrEqual(56);
  expect(
    (await box('[data-scene="teams"] [data-slot="state-sample-mark"]')).width,
  ).toBe(28);
  const avatar = await box('[data-scene="agents"] [data-agent-avatar]');
  expect(avatar.width).toBe(avatar.height);
  const bubble = page.locator(
    '[data-scene="create"] .sprout-state-panel-samples-bubble',
  );
  const chat = await box(
    '[data-scene="create"] .sprout-state-panel-samples-chat',
  );
  const b = (await bubble.boundingBox())!;
  expect(Math.round(chat.x + chat.width - 16 - (b.x + b.width))).toBe(0);
  expect(b.width).toBeLessThanOrEqual(288);
  await expect(bubble).toHaveCSS("border-top-left-radius", "12px");
  expect(
    (await box('[data-scene="create"] .sprout-state-panel-samples-schema'))
      .width,
  ).toBeLessThanOrEqual(320);
  await expect(
    page
      .locator('[data-scene="projects"] .sprout-state-panel-samples-group')
      .first(),
  ).toHaveCSS("font-weight", "500");
});

test("every importer's empty panel renders with its state and actions", async ({
  page,
}) => {
  await open(page);
  const region = playground(page);
  for (const [label, state, heading, title, actions, hasSample] of panels) {
    await chooseOption(page, "Page", label);
    if (state)
      await region.getByRole("button", { name: state, exact: true }).click();
    await expect(
      region.locator(`${heading}`, { hasText: title }),
    ).toBeVisible();
    await expect(
      region.locator('[data-slot="state-panel-actions"] button'),
    ).toHaveText([...actions]);
    await expect(
      region.locator('[data-slot="state-panel-sample"]'),
    ).toHaveCount(hasSample ? 1 : 0);
  }
});

test("playground is keyboard operable and keeps samples inert", async ({
  page,
}) => {
  await open(page);
  const region = playground(page);
  const sample = region.locator('[data-slot="state-panel-sample"]');
  await expect(sample).toHaveAttribute("aria-hidden", "true");
  await expect(sample).toHaveAttribute("inert", "");
  await expect(
    region.getByRole("heading", { name: "No files yet" }),
  ).toBeVisible();

  const trigger = region.getByRole("combobox", { name: "Page" });
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

  await page.keyboard.press("Tab");
  const current = region.getByRole("button", { name: "Current" });
  await expect(current).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const archived = region.getByRole("button", { name: "Archived" });
  await expect(archived).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(archived).toHaveAttribute("aria-pressed", "true");
  await expect(
    region.getByRole("heading", { name: "No archived workflows" }),
  ).toBeVisible();
  expect(
    await archived.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");

  await page.keyboard.press("Tab");
  const windowOnly = region.getByRole("button", { name: "Window only" });
  await page.keyboard.press("ArrowRight");
  await expect(windowOnly).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(region.getByText("This state has no sample.")).toBeVisible();

  await region.getByRole("button", { name: "Current" }).click();
  await expect(region.locator('[data-slot="state-sample"]')).toBeVisible();
  await expect(region.locator('[data-slot="state-panel"]')).toHaveCount(0);
  await expect(
    page.locator(
      '[data-slot="state-sample"] a, [data-slot="state-sample"] button, [data-slot="state-sample"] [tabindex]',
    ),
  ).toHaveCount(0);
});

test("long content truncates and labels pass through", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await open(page);
  const narrow = page.locator(
    '[data-props="narrow"] .state-panel-samples-demo-narrow',
  );
  const crumb = narrow.locator(".sprout-state-sample-crumb[data-current]");
  await expect(crumb).toHaveCSS("text-overflow", "ellipsis");
  expect(await crumb.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  expect(
    await narrow.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await expect(
    page.locator('[data-props="label"] .sprout-state-sample-label'),
  ).toHaveText("Preview");
});

test.describe("motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("stage changes fade in briefly unless motion is reduced", async ({
    page,
  }) => {
    await open(page);
    const stage = page.locator(".state-panel-samples-demo-stage > *");
    const duration = await stage.evaluate(
      (el) => getComputedStyle(el).animationDuration,
    );
    expect(duration).toBe("0.18s");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(stage).toHaveCSS("animation-name", "none");
  });
});
