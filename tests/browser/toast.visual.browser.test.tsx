import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Toaster,
  createToastManager,
} from "../../packages/sprout/src/components/toast.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("toast %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  // Toasts measure their height once on mount; a late font leaves them too short.
  await document.fonts.load('14px "Inter Variable"');
  await page.viewport(440, 320);
  const manager = createToastManager();
  await render(<Toaster toastManager={manager} />);
  manager.add({
    title: "Invite sent",
    description: "Ana Ruiz can now join the Meadow workspace.",
    type: "success",
    timeout: 0,
  });
  manager.add({
    title: "Couldn’t publish",
    description: "Harvest log is locked by another editor.",
    type: "error",
    timeout: 0,
  });
  manager.add({
    title: "Sample saved",
    description: "Undo within a minute.",
    actionProps: { children: "Undo" },
    timeout: 0,
  });
  await expect
    .poll(() => document.querySelectorAll('[data-slot="toast"]').length)
    .toBe(3);
  const front = [...document.querySelectorAll('[data-slot="toast"]')].find(
    (node) => node.textContent?.includes("Sample saved"),
  )!;
  await userEvent.hover(front);
  await expect
    .poll(() =>
      [...document.querySelectorAll('[data-slot="toast"]')].every((node) =>
        node.hasAttribute("data-expanded"),
      ),
    )
    .toBe(true);
  await settle();
  await expect
    .element(page.elementLocator(document.body))
    .toMatchScreenshot(`toast-${theme}-${mode}`);
});
