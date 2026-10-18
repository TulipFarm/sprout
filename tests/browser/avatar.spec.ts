import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setColorMode } from "./choose-option";

const agentArt =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#dceefb"/><circle cx="32" cy="30" r="12" fill="#e2557f"/></svg>';

async function openAvatar(page: Page) {
  const external: string[] = [];
  await page.route("https://avatars.tulipfarm.ai/**", (route) => {
    external.push(route.request().url());
    return route.fulfill({ contentType: "image/svg+xml", body: agentArt });
  });
  await page.goto("/components/avatar/");
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return external;
}

async function chooseOption(page: Page, label: string, option: string) {
  if (label === "Color mode") return setColorMode(page, option);
  const trigger = page.getByRole("combobox", { name: label, exact: true });
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".docs-select-popup:visible")).toHaveCount(0);
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    );
  });
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((image) =>
        image.complete ? undefined : image.decode().catch(() => undefined),
      ),
    );
    await new Promise(requestAnimationFrame);
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    );
  });
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`avatar ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        await openAvatar(page);
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
        await expect(
          page.getByRole("region", { name: "Avatar playground" }),
        ).toBeVisible();
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const shot = await page.screenshot({ fullPage: true });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`avatar-${theme}-${mode}-${width}`, {
          body: shot,
          contentType: "image/png",
        });
      });
    }
  }
}

test("sizes, shapes, badges, and group counts match the Cloud scale", async ({
  page,
}, testInfo) => {
  await openAvatar(page);
  await settle(page);
  const sizes = { xs: 20, sm: 24, default: 32, lg: 40 };
  for (const [size, px] of Object.entries(sizes)) {
    const avatar = page
      .locator(`[data-size-sample="${size}"] [data-slot="avatar"]`)
      .first();
    expect(await avatar.boundingBox()).toMatchObject({
      width: px,
      height: px,
    });
    const badge = avatar.locator('[data-slot="avatar-badge"]');
    await expect(badge).toBeVisible();
    await expect(badge.locator("svg")).toBeVisible({
      visible: size === "default" || size === "lg",
    });
  }
  const entity = page.locator('[data-slot="entity-avatar"]');
  for (const [size, px] of Object.entries({ ...sizes, xl: 64 })) {
    for (const shape of ["circle", "square"]) {
      const box = await entity
        .and(page.locator(`[data-size="${size}"][data-shape="${shape}"]`))
        .first()
        .boundingBox();
      expect(box?.width).toBe(px);
    }
  }
  await expect(
    entity.and(page.locator('[data-size="xs"][data-shape="square"]')).first(),
  ).toHaveCSS("border-radius", "4px");
  await expect(
    entity.and(page.locator('[data-size="lg"][data-shape="square"]')).first(),
  ).toHaveCSS("border-radius", "8px");
  await expect(
    entity.and(page.locator('[data-size="lg"][data-shape="circle"]')).first(),
  ).toHaveCSS("border-radius", "9999px");
  for (const [size, px] of Object.entries({ sm: 24, default: 32, lg: 40 })) {
    const count = page
      .getByRole("group", { name: `7 people, ${size}` })
      .locator('[data-slot="avatar-group-count"]');
    expect((await count.boundingBox())?.width).toBe(px);
  }
  await expect(
    page
      .getByRole("group", { name: "Team members" })
      .getByLabel("Invite people"),
  ).toBeVisible();
  const groups = page.getByRole("region", { name: "Avatar groups" });
  await testInfo.attach("avatar-groups", {
    body: await groups.screenshot(),
    contentType: "image/png",
  });
});

test("images load, fail, and fall back to initials", async ({ page }) => {
  const external = await openAvatar(page);
  await settle(page);
  const playground = page.getByRole("region", { name: "Avatar playground" });
  const avatar = playground.getByTestId("playground-avatar");
  await expect(avatar.getByRole("img", { name: "Alex Meadow" })).toBeVisible();
  await expect(playground.getByRole("status")).toHaveText(
    "Image status: loaded",
  );

  await chooseOption(page, "Avatar content", "Broken image");
  await expect(playground.getByRole("status")).toHaveText(
    "Image status: error",
  );
  await expect(avatar).toContainText("AM");
  await expect(avatar.locator("img")).toHaveCount(0);

  await chooseOption(page, "Avatar content", "Initials only");
  await expect(playground.getByRole("status")).toHaveText(
    "Image status: no image",
  );
  await expect(avatar).toContainText("AM");

  await chooseOption(page, "Avatar content", "Slow image");
  await expect(playground.getByRole("status")).toHaveText(
    "Image status: loading",
  );
  await expect(avatar).toContainText("AM");
  await expect(avatar.getByRole("img", { name: "Alex Meadow" })).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole("button", { name: "Reload image" }).click();
  await expect(playground.getByRole("status")).toHaveText(
    "Image status: loading",
  );

  await page.getByRole("button", { name: "Badge" }).click();
  await expect(avatar.locator('[data-slot="avatar-badge"]')).toHaveCount(0);
  await chooseOption(page, "Avatar size", "xs");
  expect((await avatar.boundingBox())?.width).toBe(20);

  const fallbackAgent = page
    .locator("[data-agent-avatar]")
    .filter({ hasText: "W" });
  await expect(fallbackAgent).toHaveCount(1);
  const brokenEntity = page
    .locator('[data-slot="entity-avatar"]')
    .filter({ hasText: "R" })
    .first();
  await expect(brokenEntity).toBeVisible();
  await expect(
    page.locator('[data-slot="entity-avatar"]').filter({ hasText: "?" }),
  ).toHaveCount(1);
  expect(external.length).toBeGreaterThan(0);
  expect(
    external.every((url) =>
      /^https:\/\/avatars\.tulipfarm\.ai\/avatar\/[a-z-]+\/[a-z]+\.svg$/.test(
        url,
      ),
    ),
  ).toBe(true);
});

test("agent compositions respond to keyboard and live names", async ({
  page,
}) => {
  await openAvatar(page);
  const draft = page.getByRole("region", { name: "Sample draft agent" });
  await expect(draft.getByTestId("draft-title")).toHaveText("Your new agent");
  await draft.getByLabel("Agent name").fill("  Seed sorter ");
  await expect(draft.getByTestId("draft-title")).toHaveText("Seed sorter");

  const showcase = page.getByRole("radiogroup", { name: "Example agent" });
  await showcase.getByRole("radio", { name: "Collections assistant" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    showcase.getByRole("radio", { name: "Onboarding guide" }),
  ).toBeFocused();
  await expect(
    showcase.getByRole("radio", { name: "Onboarding guide" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("region", { name: "Sample agent showcase" }),
  ).toContainText("Welcomes new customers");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(
    showcase.getByRole("radio", { name: "Inventory watcher" }),
  ).toBeFocused();

  const mentions = page.getByRole("listbox", { name: "Example people" });
  await mentions.getByRole("option", { name: /Alex Meadow/ }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(
    mentions.getByRole("option", { name: /Robin Field/ }),
  ).toHaveAttribute("aria-selected", "true");

  const workflow = page.getByRole("region", { name: "Sample workflow" });
  await expect(
    workflow.locator('[aria-hidden="true"] [data-agent-avatar]'),
  ).toHaveCount(1);
});

test("image picker uploads, validates, removes, and locks", async ({
  page,
}, testInfo) => {
  await openAvatar(page);
  const picker = page.getByRole("region", { name: "Sample image picker" });
  const upload = picker.getByRole("button", { name: "Upload image" });
  await expect(upload).toBeVisible();
  await picker.getByTestId("circle-file").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(picker.getByRole("alert")).toHaveText(
    "Choose a PNG, JPEG, or WebP image.",
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await picker.getByTestId("circle-file").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(picker.getByRole("alert")).toHaveCount(0);
  const circle = picker.locator('[data-shape="circle"]');
  await expect(circle.locator("img")).toHaveAttribute("src", /^blob:/);
  await expect(circle.locator("img")).toHaveAttribute(
    "referrerpolicy",
    "no-referrer",
  );
  await expect(
    picker.getByRole("button", { name: "Change image" }),
  ).toHaveCount(2);
  await picker.getByRole("button", { name: "Remove" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(circle.locator("img")).toHaveCount(0);
  await expect(circle).toContainText("R");
  await expect(upload).toBeVisible();

  await picker.getByRole("button", { name: "Locked" }).click();
  await expect(upload).toBeDisabled();
  await expect(
    picker.getByRole("button", { name: "Change image" }),
  ).toBeDisabled();
  await testInfo.attach("avatar-image-picker", {
    body: await picker.screenshot(),
    contentType: "image/png",
  });
});

test("workspace menu composes entity avatars with Sidebar and Base UI menus", async ({
  page,
}, testInfo) => {
  await openAvatar(page);
  const region = page.getByRole("region", { name: "Sample workspace menu" });
  const trigger = region.getByRole("button", {
    name: "Workspace menu, Studio workspace",
  });
  const icon = trigger.locator('[data-slot="entity-avatar"]');
  await expect(icon).toHaveAttribute("data-size", "xs");
  await expect(icon).toHaveAttribute("data-shape", "square");
  await trigger.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByLabel("Current workspace")).toHaveCount(1);
  await testInfo.attach("avatar-workspace-menu", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  const garden = menu.getByRole("menuitem", { name: /Garden club/ });
  for (let step = 0; step < 4; step++) {
    if ((await garden.getAttribute("data-highlighted")) !== null) break;
    await page.keyboard.press("ArrowDown");
  }
  await expect(garden).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("Enter");
  await expect(menu).toHaveCount(0);
  await expect(
    region.getByRole("button", { name: "Workspace menu, Garden club" }),
  ).toBeFocused();
  await expect(
    region
      .getByRole("button", { name: "Account menu" })
      .locator('[data-slot="entity-avatar"][data-shape="circle"]'),
  ).toBeVisible();
});

test("image fade honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openAvatar(page);
  const image = page
    .getByRole("region", { name: "Avatar playground" })
    .getByRole("img", { name: "Alex Meadow" });
  await expect(image).toHaveCSS("transition-duration", "0.18s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(image).toHaveCSS("transition-duration", "0s");
});

test("docs navigation lists Avatar and Sidebar", async ({ page }) => {
  await openAvatar(page);
  const nav = page.getByRole("navigation", { name: "Documentation" });
  await expect(nav.getByRole("link", { name: "Avatar" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: "Sidebar" })).toHaveAttribute(
    "href",
    "/components/sidebar/",
  );
});
