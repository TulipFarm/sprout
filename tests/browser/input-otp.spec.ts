import { expect, test, devices, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseOption } from "./choose-option";

const route = "/components/input-otp/";

async function openInputOTP(page: Page) {
  await page.goto(route);
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  return page.locator("#input-otp-demo");
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

function slots(page: Page, testId: string) {
  return page.getByTestId(testId).locator('[data-slot="input-otp-slot"]');
}

async function code(page: Page, testId: string) {
  return (await slots(page, testId).evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLInputElement).value).join(""),
  )) as string;
}

for (const theme of ["neutral", "tulipfarm"]) {
  for (const mode of ["light", "dark"]) {
    for (const width of [390, 1440]) {
      test(`input otp ${theme} ${mode} at ${width}px`, async ({
        page,
      }, testInfo) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: 1000 });
        const demo = await openInputOTP(page);
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
        const first = slots(page, "state-progress").first();
        await expect(first).toHaveCSS(
          "background-color",
          await cssColor(page, "var(--sprout-surface)"),
        );
        await expect(first).toHaveCSS(
          "border-top-color",
          await cssColor(page, "var(--sprout-input)"),
        );
        await expect(first).toHaveCSS(
          "color",
          await cssColor(page, "var(--sprout-text)"),
        );
        for (const body of await demo
          .locator(".input-otp-demo-card-body")
          .all())
          expect(
            await body.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
        for (const slot of await demo
          .locator('[data-slot="input-otp-slot"]')
          .all()) {
          const box = (await slot.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
        // Focus a slot so the screenshot shows the active ring.
        await slots(page, "state-progress").nth(2).focus();
        const results = await new AxeBuilder({ page })
          .include("#input-otp-demo")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
        const path = testInfo.outputPath(
          `input-otp-${theme}-${mode}-${width}.png`,
        );
        const shot = await demo.screenshot({ animations: "disabled", path });
        expect(shot.byteLength).toBeGreaterThan(10_000);
        await testInfo.attach(`input-otp-${theme}-${mode}-${width}`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

test("slots render at Cloud dimensions with grouped borders", async ({
  page,
}) => {
  await openInputOTP(page);
  const progress = slots(page, "state-progress");
  await expect(progress).toHaveCount(6);
  const first = progress.nth(0);
  await expect(first).toHaveCSS("width", "32px");
  await expect(first).toHaveCSS("height", "32px");
  await expect(first).toHaveCSS("font-size", "14px");
  await expect(first).toHaveCSS("text-align", "center");
  await expect(first).toHaveCSS("border-left-width", "1px");
  await expect(progress.nth(1)).toHaveCSS("border-left-width", "0px");
  await expect(first).toHaveCSS("border-top-left-radius", /^[1-9]/);
  await expect(progress.nth(1)).toHaveCSS("border-top-left-radius", "0px");
  await expect(progress.nth(2)).toHaveCSS("border-top-right-radius", /^[1-9]/);
  await expect(progress.nth(3)).toHaveCSS("border-left-width", "1px");
  const separator = page
    .getByTestId("state-progress")
    .locator('[data-slot="input-otp-separator"]');
  await expect(separator).toHaveAttribute("role", "separator");
  await expect(separator.locator("svg")).toHaveCSS("width", "16px");
  const groupGap =
    (await progress.nth(3).boundingBox())!.x -
    ((await progress.nth(2).boundingBox())!.x + 32);
  expect(groupGap).toBe(32);
  expect(await code(page, "state-progress")).toBe("12");
});

test("coarse pointers get 44px touch slots", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL: "http://127.0.0.1:4322",
  });
  const page = await context.newPage();
  try {
    await openInputOTP(page);
    const first = slots(page, "state-progress").first();
    await expect(first).toHaveCSS("width", "44px");
    await expect(first).toHaveCSS("height", "44px");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const shot = await page
      .getByTestId("six-digit")
      .screenshot({ animations: "disabled" });
    await testInfo.attach("input-otp-touch", {
      body: shot,
      contentType: "image/png",
    });
  } finally {
    await context.close();
  }
});

test("labels name the group and each slot", async ({ page }) => {
  await openInputOTP(page);
  await expect(
    page.getByRole("group", { name: "Verification code", exact: true }),
  ).toBeVisible();
  const progress = page.getByTestId("state-progress");
  await expect(
    progress.getByRole("textbox", { name: "Verification code", exact: true }),
  ).toHaveCount(1);
  await expect(
    progress.getByRole("textbox", { name: "Character 4 of 6" }),
  ).toHaveCount(1);
  const first = progress.getByRole("textbox").first();
  await expect(first).toHaveAttribute("autocomplete", "one-time-code");
  await expect(first).toHaveAttribute("inputmode", "numeric");

  const labelled = page.getByTestId("labelled");
  await expect(
    labelled.getByRole("textbox", { name: "Sign-in code", exact: true }),
  ).toHaveCount(1);
  await expect(
    labelled.getByRole("group", { name: "Sign-in code" }),
  ).toHaveAccessibleDescription(/authenticator app/);
  await labelled.getByText("Sign-in code", { exact: true }).click();
  await expect(slots(page, "labelled").first()).toBeFocused();
});

test("keyboard: typing, arrows, Home/End, Backspace, Delete, Tab, paste", async ({
  page,
}) => {
  await openInputOTP(page);
  const progress = slots(page, "state-progress");
  const status = page.getByTestId("state-progress").getByRole("status");
  await expect(status).toHaveText("2 of 6 digits entered.");

  // Tab enters the field once, on the next empty slot.
  await page
    .getByTestId("state-progress")
    .locator(".input-otp-demo-label")
    .click();
  await page.keyboard.press("Tab");
  await expect(progress.nth(2)).toBeFocused();
  await expect(progress.nth(2)).toHaveCSS(
    "border-top-color",
    await cssColor(page, "var(--sprout-border)"),
  );
  await expect(progress.nth(2)).toHaveCSS("outline-width", "1px");
  await expect(progress.nth(2)).toHaveCSS("z-index", "1");

  await page.keyboard.type("3a4");
  expect(await code(page, "state-progress")).toBe("1234");
  await expect(progress.nth(4)).toBeFocused();
  await expect(status).toHaveText("4 of 6 digits entered.");

  await page.keyboard.press("Home");
  await expect(progress.nth(0)).toBeFocused();
  await page.keyboard.press("End");
  await expect(progress.nth(4)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(progress.nth(3)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(progress.nth(4)).toBeFocused();

  await page.keyboard.press("Backspace");
  expect(await code(page, "state-progress")).toBe("123");
  await expect(progress.nth(3)).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("Delete");
  expect(await code(page, "state-progress")).toBe("23");

  await page.keyboard.press("Tab");
  await expect(progress.last()).not.toBeFocused();
  await expect(
    page
      .getByTestId("state-error")
      .locator('[data-slot="input-otp-slot"]:focus'),
  ).toHaveCount(1);

  await progress.first().focus();
  await page.evaluate(() => {
    const target = document.activeElement!;
    const data = new DataTransfer();
    data.setData("text/plain", "987 654");
    target.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect.poll(() => code(page, "state-progress")).toBe("987654");
  await expect(status).toHaveText(
    "All 6 digits entered. Nothing was verified.",
  );
});

test("incorrect code: invalid slots, alert, edit clears error, try another", async ({
  page,
}, testInfo) => {
  await openInputOTP(page);
  const box = page.getByTestId("state-error");
  const group = box.getByRole("group", { name: "Incorrect verification code" });
  const errorSlots = slots(page, "state-error");
  await expect(group).toHaveAttribute("data-invalid", "");
  await expect(group).toHaveAccessibleDescription(
    "That code didn’t match. Try again.",
  );
  await expect(box.getByRole("alert")).toHaveText(
    "That code didn’t match. Try again.",
  );
  expect(await code(page, "state-error")).toBe("194278");
  for (const slot of await errorSlots.all()) {
    await expect(slot).toHaveAttribute("aria-invalid", "true");
    await expect(slot).toHaveCSS(
      "border-top-color",
      await cssColor(page, "var(--sprout-danger)"),
    );
  }
  await expect(box.locator('[data-slot="input-otp-group"]').first()).toHaveCSS(
    "box-shadow",
    /3px/,
  );
  const shot = await page
    .getByTestId("six-digit")
    .screenshot({ animations: "disabled" });
  await testInfo.attach("input-otp-states", {
    body: shot,
    contentType: "image/png",
  });

  await errorSlots.last().focus();
  await page.keyboard.press("Backspace");
  expect(await code(page, "state-error")).toBe("19427");
  await expect(box.getByRole("status")).toHaveText(
    "Code changed locally; no verification request was sent.",
  );
  await expect(errorSlots.first()).not.toHaveAttribute("aria-invalid", "true");
  await expect(group).not.toHaveAttribute("data-invalid", "");

  await box.getByRole("button", { name: "Try another code" }).click();
  expect(await code(page, "state-error")).toBe("");
  await expect(box.getByRole("alert")).toHaveCount(0);
});

test("disabled code is dimmed, filled, and not focusable", async ({ page }) => {
  await openInputOTP(page);
  const disabled = slots(page, "state-disabled");
  expect(await code(page, "state-disabled")).toBe("123456");
  for (const slot of await disabled.all()) await expect(slot).toBeDisabled();
  await expect(disabled.first()).toHaveCSS("cursor", "not-allowed");
  await expect(
    page.getByTestId("state-disabled").locator('[data-slot="input-otp"]'),
  ).toHaveCSS("opacity", "0.5");
  await disabled.first().click({ force: true });
  await expect(disabled.first()).not.toBeFocused();
});

test("reduced motion removes slot transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openInputOTP(page);
  const slot = slots(page, "state-progress").first();
  await expect(slot).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(slot).toHaveCSS("transition-duration", /^0\.12s/);
});

test("docs navigation links Input OTP", async ({ page }) => {
  await openInputOTP(page);
  const link = page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Input OTP", exact: true });
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#input-otp-demo select")).toHaveCount(0);
});
