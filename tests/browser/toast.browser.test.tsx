import { describe, expect, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  Toaster,
  createToastManager,
  type ToastManager,
} from "../../packages/sprout/src/components/toast.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const samples = [
  {
    title: "Draft saved",
    description: "Changes are stored on this device.",
  },
  {
    title: "Invite sent",
    description: "Ana Ruiz can now join the Meadow workspace.",
    type: "success",
  },
  {
    title: "Couldn’t publish",
    description: "Harvest log is locked by another editor.",
    type: "error",
  },
  {
    title: "Storage almost full",
    description: "9.2 of 10 GB used. Older uploads may be archived.",
    type: "warning",
  },
  {
    title: "New version available",
    description: "Reload to get the latest editor.",
    type: "info",
  },
  {
    title: "Importing contacts",
    description: "1,240 rows from contacts.csv…",
    type: "loading",
  },
];

async function open(manager: ToastManager, items: typeof samples) {
  const screen = await render(
    <Toaster toastManager={manager}>
      <Button>Notify</Button>
    </Toaster>,
  );
  for (const item of items) manager.add({ ...item, timeout: 0 });
  await expect.poll(() => live().length).toBe(Math.min(items.length, 3));
  return screen;
}

const live = () => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-slot="toast"]:not([data-ending-style]):not([data-limited])',
  ),
];
const named = (title: string) =>
  live().find(
    (node) =>
      node.querySelector('[data-slot="toast-title"]')?.textContent === title,
  )!;
const rect = (node: Element) => node.getBoundingClientRect();

function colorOf(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

describe("Toast in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe with every type expanded",
    async (theme, mode) => {
      setTheme(theme, mode);
      await emulate({ reducedMotion: true });
      for (const group of [samples.slice(0, 3), samples.slice(3)]) {
        const screen = await open(createToastManager(), group);
        await userEvent.hover(named(group[2]!.title));
        await expect
          .poll(() =>
            live().every((node) => node.hasAttribute("data-expanded")),
          )
          .toBe(true);
        await settle();
        expect(await axeViolations(document.body)).toEqual([]);
        await screen.unmount();
      }
    },
  );

  it.each([390, 1440])(
    "expanded toasts stay inside a %ipx viewport",
    async (width) => {
      await page.viewport(width, 900);
      await emulate({ reducedMotion: true });
      await open(createToastManager(), samples.slice(0, 3));
      await userEvent.hover(named("Couldn’t publish"));
      await expect
        .poll(() => live().every((node) => node.hasAttribute("data-expanded")))
        .toBe(true);
      await settle();
      for (const node of live()) {
        const box = rect(node);
        expect(box.x).toBeGreaterThanOrEqual(15);
        expect(box.right).toBeLessThanOrEqual(width - 15);
        expect(box.width).toBeLessThanOrEqual(384.5);
        expect(box.height).toBeLessThanOrEqual(100);
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    },
  );

  it("collapses into a stack and colors only the error icon", async () => {
    await page.viewport(1280, 800);
    await emulate({ reducedMotion: true });
    await open(createToastManager(), [samples[1]!, samples[2]!, samples[3]!]);
    await userEvent.hover(document.body, { position: { x: 10, y: 10 } });
    await settle();
    const front = named("Storage almost full");
    const behind = named("Invite sent");
    expect(front).not.toHaveAttribute("data-expanded");
    expect(rect(behind).width).toBeLessThan(rect(front).width);
    expect(rect(behind).y).toBeLessThan(rect(front).y);
    const content = behind.querySelector('[data-slot="toast-content"]')!;
    expect(getComputedStyle(content).opacity).toBe("0");

    const icon = (title: string) =>
      getComputedStyle(named(title).querySelector('[data-slot="toast-icon"]')!)
        .color;
    const danger = colorOf("--sprout-danger");
    expect(icon("Couldn’t publish")).toBe(danger);
    expect(icon("Invite sent")).not.toBe(danger);
    expect(icon("Storage almost full")).not.toBe(danger);
  });

  it("never steals focus and is reachable with F6, Tab, and Enter", async () => {
    await page.viewport(1280, 800);
    await emulate({ reducedMotion: true });
    const manager = createToastManager();
    const screen = await render(
      <Toaster toastManager={manager}>
        <Button onClick={() => manager.add(samples[1]!)}>Notify</Button>
      </Toaster>,
    );
    const trigger = screen.getByRole("button", { name: "Notify" });
    trigger.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => named("Invite sent")).toBeTruthy();
    await expect.element(trigger).toHaveFocus();

    await userEvent.keyboard("{F6}");
    const viewport = document.querySelector('[data-slot="toast-viewport"]')!;
    expect(document.activeElement).toBe(viewport);
    expect(viewport).toHaveAttribute("aria-live", "polite");
    await userEvent.tab();
    const item = named("Invite sent");
    expect(document.activeElement).toBe(item);
    expect(getComputedStyle(item).outlineStyle).toBe("solid");
    await userEvent.tab();
    const close = item.querySelector('[data-slot="toast-close"]')!;
    expect(document.activeElement).toBe(close);
    await userEvent.keyboard("{Enter}");
    await expect
      .poll(() => document.querySelectorAll('[data-slot="toast"]').length)
      .toBe(0);
    await expect.element(trigger).toHaveFocus();
  });

  it("swipes away to the right", async () => {
    await page.viewport(1280, 800);
    await emulate({ reducedMotion: true });
    await open(createToastManager(), [samples[0]!]);
    const item = named("Draft saved");
    await userEvent.hover(item);
    await settle();
    // Base UI rebases the start on the first move, so drag in real steps.
    const { x, y } = rect(item);
    const mouse = (type: string, dx: number) =>
      cdp().send("Input.dispatchMouseEvent", {
        type,
        x: x + 40 + dx,
        y: y + 20,
        button: "left",
        buttons: type === "mouseReleased" ? 0 : 1,
        clickCount: 1,
      });
    await mouse("mousePressed", 0);
    for (let step = 1; step <= 10; step += 1)
      await mouse("mouseMoved", step * 20);
    await mouse("mouseReleased", 200);
    await expect
      .poll(() => document.querySelectorAll('[data-slot="toast"]').length)
      .toBe(0);
  });

  it("slides and reflows with motion, and only fades with reduced motion", async () => {
    await page.viewport(1280, 800);
    await open(createToastManager(), [samples[4]!]);
    const item = named("New version available");
    const css = getComputedStyle(item);
    expect(css.transitionProperty).toBe("transform, opacity, height");
    expect(css.transitionDuration).toBe("0.18s, 0.18s, 0.12s");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(item).transitionProperty).toBe("opacity");
  });
});
