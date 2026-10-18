import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

async function openDemo(page: Page) {
  await page.goto("/components/sidebar/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`${theme} ${mode} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await openDemo(page);
        await chooseOption(
          page,
          "Site theme",
          theme === "neutral" ? "Neutral" : "TulipFarm",
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
        if (width < 768)
          await page.getByRole("button", { name: "Toggle sidebar" }).click();
        const panel = page.getByRole("complementary", {
          name: "Workspace navigation",
        });
        await expect(panel).toBeVisible();
        await expect(
          panel.getByRole("link", { name: "Overview", exact: true }),
        ).toHaveAttribute("aria-current", "page");
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
}

test("sections disclose independently from their links and preserve state across collapse", async ({
  page,
}) => {
  await openDemo(page);
  const panel = page.getByRole("complementary", {
    name: "Workspace navigation",
  });
  const project = panel.getByRole("link", {
    name: "Website refresh",
    exact: true,
  });
  await panel.getByRole("link", { name: "Projects", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Selected page" }).getByRole("heading"),
  ).toHaveText("Projects");
  await expect(project).toBeVisible();
  const chevron = panel.locator("svg.sprout-sidebar-chevron");
  await expect(chevron).toBeVisible();
  await expect(chevron).toHaveAttribute("aria-hidden", "true");
  await expect(chevron).toHaveCSS("transform", "matrix(0, 1, -1, 0, 0, 0)");
  await panel.getByRole("button", { name: "Collapse Projects" }).click();
  await expect(project).not.toBeVisible();
  await expect(chevron).toHaveCSS("transform", "none");
  await panel.getByRole("button", { name: "Expand Projects" }).click();
  await project.click();
  await expect(project).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(panel).toHaveAttribute("data-state", "collapsed");
  await expect(project).not.toBeVisible();
  await panel.getByRole("link", { name: "Files", exact: true }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Files");
  await expect(
    panel.getByRole("link", { name: "Files", exact: true }),
  ).toHaveAccessibleDescription("Files");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(project).toBeVisible();
});

test("navigation links keep native Enter and Space behavior", async ({
  page,
}) => {
  await openDemo(page);
  const files = page.getByRole("link", { name: "Files", exact: true });
  await files.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("region", { name: "Selected page" }).getByRole("heading"),
  ).toHaveText("Overview");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Selected page" }).getByRole("heading"),
  ).toHaveText("Files");
});

test("micro transitions interpolate layout and support interruption", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openDemo(page);
  const panel = page.locator("[data-sprout-sidebar]");
  const trigger = page.getByRole("button", { name: "Toggle sidebar" });
  const section = panel.locator(".sprout-sidebar-section-content");
  const project = panel.getByRole("link", {
    name: "Website refresh",
    exact: true,
  });
  await expect(panel).toHaveCSS("transition-duration", "0.18s, 0.12s, 0s");
  await expect(
    panel.getByRole("link", { name: "Overview", exact: true }),
  ).toHaveCSS("box-shadow", "none");

  await trigger.click();
  const widthSample = await panel.evaluate(async (element) => {
    await new Promise(requestAnimationFrame);
    const animation = element
      .getAnimations()
      .find(
        (entry) =>
          entry instanceof CSSTransition &&
          entry.transitionProperty === "width",
      );
    if (!animation) throw new Error("Sidebar width did not animate");
    animation.pause();
    animation.currentTime = 90;
    const width = element.getBoundingClientRect().width;
    animation.play();
    return width;
  });
  expect(widthSample).toBeGreaterThan(56);
  expect(widthSample).toBeLessThan(244);
  await expect(panel).toHaveCSS("width", "56px");
  await trigger.click();
  await expect(panel).toHaveCSS("width", "244px");
  await expect(project).toBeVisible();

  await panel.getByRole("button", { name: "Collapse Projects" }).click();
  await expect(project).not.toBeVisible();
  await panel.getByRole("button", { name: "Expand Projects" }).click();
  const revealSample = await section.evaluate(async (element) => {
    let animation: Animation | undefined;
    for (let frame = 0; frame < 10 && !animation; frame++) {
      await new Promise(requestAnimationFrame);
      animation = element
        .getAnimations()
        .find(
          (entry) =>
            entry instanceof CSSTransition &&
            entry.transitionProperty === "height",
        );
    }
    if (!animation) throw new Error("Nested item height did not animate");
    animation.pause();
    animation.currentTime = 90;
    const result = {
      height: element.getBoundingClientRect().height,
      expandedHeight: parseFloat(
        getComputedStyle(element).getPropertyValue(
          "--collapsible-panel-height",
        ),
      ),
    };
    animation.play();
    return result;
  });
  expect(revealSample.height).toBeGreaterThan(0);
  expect(revealSample.height).toBeLessThan(revealSample.expandedHeight);

  // Reverse before the exit finishes, as a quick second click would.
  await page.evaluate(async () => {
    const toggle = document.querySelector<HTMLButtonElement>(
      ".sprout-sidebar-section-heading .sprout-sidebar-menu-action",
    )!;
    toggle.click();
    await new Promise(requestAnimationFrame);
    toggle.click();
  });
  await expect(project).toBeVisible();
  await expect(section).not.toHaveAttribute("inert");
  await expect(
    panel.getByRole("button", { name: "Collapse Projects" }),
  ).toBeVisible();
});

test("loading, empty, error recovery, long labels and disabled items", async ({
  page,
}) => {
  await openDemo(page);
  await chooseOption(page, "Example state", "Loading");
  await expect(
    page.getByRole("status", { name: "Loading recent projects" }),
  ).toBeVisible();
  await chooseOption(page, "Example state", "Empty");
  await expect(
    page.getByText("No projects yet. Open Projects to get started."),
  ).toBeVisible();
  await chooseOption(page, "Example state", "Error");
  await expect(page.getByRole("alert")).toHaveText("Could not load projects.");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("link", { name: "Website refresh", exact: true }),
  ).toBeVisible();
  await chooseOption(page, "Example state", "Long names");
  const long = page.getByRole("link", {
    name: "Website refresh and the complete design system documentation",
  });
  await expect(long).toHaveAttribute(
    "title",
    "Website refresh and the complete design system documentation",
  );
  expect(
    await long
      .locator(".sprout-sidebar-label")
      .evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await expect(
    page.getByRole("link", { name: "Integrations", exact: true }),
  ).toBeDisabled();
});

test("filtering, workspace switching, and settings navigation", async ({
  page,
}) => {
  await openDemo(page);
  const filter = page.getByRole("textbox", { name: "Filter navigation" });
  await filter.fill("missing");
  await expect(page.getByText("No matching pages.")).toBeVisible();
  await filter.fill("Files");
  await expect(
    page.getByRole("link", { name: "Files", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Inbox", exact: true }),
  ).not.toBeVisible();
  await filter.clear();
  await page
    .getByRole("button", { name: "Switch workspace", exact: true })
    .click();
  await page
    .getByRole("menuitemradio", { name: "Personal workspace", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Selected page" }),
  ).toContainText("Personal workspace");
  const panel = page.getByRole("complementary", {
    name: "Workspace navigation",
  });
  await panel.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Settings navigation" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Selected page" }).getByRole("heading"),
  ).toHaveText("Profile");
  await page.getByRole("button", { name: "Back to workspace" }).click();
  await expect(
    page.getByRole("navigation", { name: "Workspace pages" }),
  ).toBeVisible();
});

test("mobile drawer traps focus, closes on navigation and restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  const trigger = page.getByRole("button", { name: "Toggle sidebar" });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(drawer).toBeVisible();
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    await expect(drawer.locator(":focus")).toHaveCount(1);
  }
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await drawer.getByRole("link", { name: "Files", exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Selected page" }).getByRole("heading"),
  ).toHaveText("Files");
  await trigger.click();
  await drawer.getByRole("button", { name: "Close", exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("keyboard toggle avoids editing fields and demo persists its preference", async ({
  page,
}) => {
  await openDemo(page);
  const panel = page.getByRole("complementary", {
    name: "Workspace navigation",
  });
  await page.getByRole("textbox", { name: "Filter navigation" }).focus();
  await page.keyboard.press("Control+b");
  await expect(panel).toHaveAttribute("data-state", "expanded");
  await page
    .getByRole("button", { name: "Switch workspace", exact: true })
    .focus();
  await page.keyboard.press("Control+b");
  await expect(panel).toHaveAttribute("data-state", "expanded");
  await page.getByRole("button", { name: "Toggle sidebar" }).focus();
  await page.keyboard.press("Control+b");
  await expect(panel).toHaveAttribute("data-state", "collapsed");
  await page.reload();
  await expect(panel).toHaveAttribute("data-state", "collapsed");
  await page.keyboard.press("Meta+b");
  await expect(panel).toHaveAttribute("data-state", "expanded");
});

test("left, right, offcanvas, fixed and mobile modes", async ({ page }) => {
  await openDemo(page);
  const panel = page.getByRole("complementary", {
    name: "Workspace navigation",
  });
  await chooseOption(page, "Sidebar side", "Right");
  await expect(panel).toHaveAttribute("data-side", "right");
  const positions = await page.evaluate(() => ({
    panel: document
      .querySelector("[data-sprout-sidebar]")!
      .getBoundingClientRect().left,
    content: document
      .querySelector(".sidebar-demo-main")!
      .getBoundingClientRect().left,
  }));
  expect(positions.panel).toBeGreaterThan(positions.content);
  await chooseOption(page, "Collapse behavior", "Hidden");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(panel).not.toBeVisible();
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(panel).toBeVisible();
  await chooseOption(page, "Collapse behavior", "Never");
  await expect(
    page.getByRole("button", { name: "Toggle sidebar" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await chooseOption(page, "Collapse behavior", "Icons");
  await expect(panel).not.toBeVisible();
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(page.getByRole("dialog")).toHaveAttribute("data-side", "right");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(panel).toBeVisible();
});

test("neutral defaults, CSS overrides, reduced motion and sticky regions", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await openDemo(page);
  await expect(page.getByRole("button", { name: /^Site theme/ })).toHaveText(
    "Neutral",
  );
  const panel = page.getByRole("complementary", {
    name: "Workspace navigation",
  });
  await expect(panel).toHaveCSS("background-color", "rgb(21, 21, 21)");
  await expect(panel).toHaveCSS("transition-duration", "0s");
  await expect(panel.locator(".sprout-sidebar-chevron")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await expect(panel.locator(".sprout-sidebar-section-content")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await page.addStyleTag({
    content:
      ":root { --sprout-sidebar-width: 280px; --sprout-sidebar-mobile-width: 260px; --sprout-radius-control: 12px; } .sidebar-demo-frame { height: 320px; }",
  });
  await expect(panel).toHaveCSS("width", "280px");
  await expect(
    panel.getByRole("link", { name: "Overview", exact: true }),
  ).toHaveCSS("border-radius", "12px");
  const footer = panel.locator(".sprout-sidebar-footer");
  const before = await footer.boundingBox();
  await panel.locator(".sprout-sidebar-content").evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  expect((await footer.boundingBox())?.y).toBe(before?.y);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(page.getByRole("dialog")).toHaveCSS("width", "260px");
  await expect(page.getByRole("dialog")).toHaveCSS("transition-duration", "0s");
});

test("only Alert, Avatar, Badge, Button, Dialog, Page Header, Sidebar, State Panel, and Tabs are documented and old routes are gone", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of [
    "/",
    "/installation/",
    "/theming/",
    "/components/alert/",
    "/components/avatar/",
    "/components/badge/",
    "/components/button/",
    "/components/combobox/",
    "/components/command/",
    "/components/context-menu/",
    "/components/dialog/",
    "/components/dropdown-menu/",
    "/components/field/",
    "/components/file-viewer/",
    "/components/form/",
    "/components/page-header/",
    "/components/popover/",
    "/components/progress/",
    "/components/scroll-area/",
    "/components/search-dialog/",
    "/components/select/",
    "/components/settings-list/",
    "/components/sidebar/",
    "/components/slider/",
    "/components/spinner/",
    "/components/state-panel/",
    "/components/switch/",
    "/components/table/",
    "/components/tabs/",
    "/components/toggle/",
    "/components/toggle-group/",
  ]) {
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await expect(
    page.getByRole("navigation", { name: "Documentation" }).getByRole("link"),
  ).toHaveText([
    "Overview",
    "Installation",
    "Theming",
    "Alert",
    "Avatar",
    "Badge",
    "Button",
    "Combobox",
    "Command",
    "Context Menu",
    "Dialog",
    "Dropdown Menu",
    "Field",
    "Form",
    "Integrations Slack Knowledge Shared",
    "Page Header",
    "Popover",
    "Scroll Area",
    "Search Dialog",
    "Select",
    "Settings List",
    "Sidebar",
    "State Panel",
    "Switch",
    "Table",
    "Tabs",
    "Toggle",
    "Toggle Group",
  ]);
  for (const name of ["input"]) {
    expect((await page.request.get(`/components/${name}/`)).status()).toBe(404);
  }
  expect(errors).toEqual([]);
});
