import { expect, type Page } from "@playwright/test";

/** The docs header has a dark-mode toggle button, not a select. */
export async function setColorMode(page: Page, mode: string) {
  const dark = mode.toLowerCase() === "dark";
  const toggle = page.getByRole("button", { name: "Dark mode", exact: true });
  if ((await toggle.getAttribute("aria-pressed")) !== String(dark))
    await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", String(dark));
  if (dark) await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
}

/** The docs site theme picker is a searchable popover. */
export async function chooseSiteTheme(page: Page, name: string) {
  await page.getByRole("button", { name: /^Site theme/ }).click();
  await page
    .getByRole("dialog", { name: "Site theme" })
    .getByRole("option", { name, exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Site theme" })).toHaveCount(0);
}

export async function chooseOption(page: Page, label: string, option: string) {
  if (label === "Color mode") await setColorMode(page, option);
  else if (label === "Site theme") await chooseSiteTheme(page, option);
  else {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
  }
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    // Nested transitions (a Badge in a Button) restart each frame, which cancels the old one.
    // Looping spinners never finish, so skip infinite animations.
    const finite = () =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        );
    while (finite().length)
      await Promise.allSettled(finite().map((animation) => animation.finished));
  });
}
