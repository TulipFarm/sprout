import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../packages/sprout/src/components/collapsible.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const Chevron = (props: { "data-direction"?: string }) => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    aria-hidden="true"
    data-slot="collapsible-indicator"
    {...props}
  >
    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" />
  </svg>
);

/** The rotation of `node` in whole degrees. */
function rotation(node: Element) {
  const value = getComputedStyle(node).transform;
  if (value === "none") return 0;
  const [a, b] = value.slice(7, -1).split(",").map(Number);
  return Math.abs(Math.round((Math.atan2(b, a) * 180) / Math.PI));
}

function Project() {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger render={<Button variant="outline" />}>
        Project details
        <Chevron />
      </CollapsibleTrigger>
      <CollapsibleContent>Meadow: launch on Friday.</CollapsibleContent>
    </Collapsible>
  );
}

function Gallery() {
  return (
    <div style={{ display: "grid", gap: 12, padding: 16, maxWidth: 480 }}>
      <Project />
      <Collapsible>
        <CollapsibleTrigger>
          Thinking
          <Chevron />
        </CollapsibleTrigger>
        <CollapsibleContent variant="card">Reasoning steps</CollapsibleContent>
      </Collapsible>
      <Collapsible disabled>
        <CollapsibleTrigger aria-describedby="why">
          Show unavailable details
        </CollapsibleTrigger>
        <p id="why">The details cannot be opened.</p>
      </Collapsible>
    </div>
  );
}

/** Tabs from the top of the page, whatever the previous test left focused. */
async function tabFromStart() {
  const start = document.createElement("button");
  document.body.prepend(start);
  start.focus();
  await userEvent.tab();
  start.remove();
}

describe("Collapsible in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("keyboard toggles with Enter and Space and keeps focus", async () => {
    const screen = await render(<Project />);
    const trigger = screen.getByRole("button", { name: "Project details" });
    await tabFromStart();
    await expect.element(trigger).toHaveFocus();
    const controls = trigger.element().getAttribute("aria-controls")!;
    expect(document.getElementById(controls)?.textContent).toContain("Meadow");
    await userEvent.keyboard("{Enter}");
    await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
    await expect.element(screen.getByText(/Meadow/)).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(screen.getByText(/Meadow/)).toBeVisible();
    await expect.element(trigger).toHaveFocus();
  });

  it("plain triggers show a focus ring and indicators turn", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(
      <>
        <Gallery />
        <Collapsible defaultOpen>
          <div data-testid="header">
            <Chevron />
            <CollapsibleTrigger>Review</CollapsibleTrigger>
          </div>
          <CollapsibleContent>Tables</CollapsibleContent>
        </Collapsible>
        <Collapsible defaultOpen>
          <CollapsibleTrigger>
            Chats
            <Chevron data-direction="right" />
          </CollapsibleTrigger>
        </Collapsible>
      </>,
    );
    const thinking = screen.getByRole("button", { name: "Thinking" });
    await tabFromStart();
    await userEvent.tab();
    await expect.element(thinking).toHaveFocus();
    expect(getComputedStyle(thinking.element()).outlineStyle).toBe("solid");
    const chevron = thinking.element().querySelector("svg")!;
    expect(rotation(chevron)).toBe(0);
    await userEvent.keyboard("{Enter}");
    await expect.element(thinking).toHaveAttribute("aria-expanded", "true");
    expect(rotation(chevron)).toBe(180);

    const outside = screen
      .getByTestId("header")
      .element()
      .querySelector("svg")!;
    expect(rotation(outside)).toBe(180);
    await screen.getByRole("button", { name: "Review" }).click();
    await settle();
    expect(rotation(outside)).toBe(0);
    expect(
      rotation(
        screen
          .getByRole("button", { name: "Chats" })
          .element()
          .querySelector("svg")!,
      ),
    ).toBe(90);
  });

  it("content variants animate within 120–180ms and unmount when closed", async () => {
    const screen = await render(
      <>
        {(["default", "sidebar", "card"] as const).map((variant) => (
          <Collapsible key={variant} defaultOpen>
            <CollapsibleTrigger>{variant}</CollapsibleTrigger>
            <CollapsibleContent variant={variant}>
              {variant} body
            </CollapsibleContent>
          </Collapsible>
        ))}
      </>,
    );
    const content = (variant: string) =>
      screen.container.querySelector(
        `[data-slot="collapsible-content"][data-variant="${variant}"]`,
      );
    for (const variant of ["sidebar", "card"]) {
      const css = getComputedStyle(content(variant)!);
      const durations = css.transitionDuration.split(",").map(parseFloat);
      expect(Math.max(...durations)).toBeLessThanOrEqual(0.18);
      expect(Math.min(...durations)).toBeGreaterThanOrEqual(0.12);
      expect(css.overflow).toBe("hidden");
    }
    expect(getComputedStyle(content("default")!).transitionDuration).toBe("0s");
    const indicatorFree = screen.getByRole("button", { name: "sidebar" });
    await indicatorFree.click();
    await expect
      .element(indicatorFree)
      .toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => content("sidebar")).toBeNull();
  });

  it("reduced motion removes content and indicator transitions", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>
          Sources
          <Chevron />
        </CollapsibleTrigger>
        <CollapsibleContent variant="card">Three sources</CollapsibleContent>
      </Collapsible>,
    );
    const content = screen.getByText("Three sources").element();
    expect(getComputedStyle(content).transitionDuration).toBe("0s");
    expect(
      getComputedStyle(screen.container.querySelector("svg")!)
        .transitionDuration,
    ).toBe("0s");
  });

  it("keepMounted hides closed content but keeps form state", async () => {
    const screen = await render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Google Drive</CollapsibleTrigger>
        <CollapsibleContent keepMounted>
          <label>
            <input type="checkbox" /> Create documents
          </label>
        </CollapsibleContent>
      </Collapsible>,
    );
    const box = screen.getByLabelText("Create documents");
    await box.click();
    const trigger = screen.getByRole("button", { name: "Google Drive" });
    await trigger.click();
    await expect.element(box).not.toBeVisible();
    const content = screen.container.querySelector(
      '[data-slot="collapsible-content"]',
    )!;
    expect(content.hasAttribute("hidden")).toBe(true);
    expect(getComputedStyle(content).display).toBe("none");
    await trigger.click();
    await expect.element(box).toBeChecked();
  });

  it("disabled triggers fade and ignore presses", async () => {
    const screen = await render(<Gallery />);
    const disabled = screen.getByRole("button", {
      name: "Show unavailable details",
    });
    await expect
      .element(disabled)
      .toHaveAccessibleDescription("The details cannot be opened.");
    expect(getComputedStyle(disabled.element()).opacity).toBe("0.5");
    expect(getComputedStyle(disabled.element()).cursor).toBe("not-allowed");
    await disabled.click({ force: true });
    await expect.element(disabled).toHaveAttribute("aria-expanded", "false");
  });

  it("content can render above its trigger", async () => {
    const screen = await render(
      <Collapsible>
        <CollapsibleContent>Clean up duplicate contacts</CollapsibleContent>
        <CollapsibleTrigger>More tasks</CollapsibleTrigger>
      </Collapsible>,
    );
    const trigger = screen.getByRole("button", { name: "More tasks" });
    await trigger.click();
    const item = screen.getByText("Clean up duplicate contacts");
    await expect.element(item).toBeVisible();
    await expect.element(trigger).toHaveFocus();
    expect(item.element().getBoundingClientRect().bottom).toBeLessThanOrEqual(
      trigger.element().getBoundingClientRect().top,
    );
  });

  it("fits a 390px phone", async () => {
    await page.viewport(390, 800);
    const screen = await render(<Gallery />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const trigger of screen.container.querySelectorAll(
      '[data-slot="collapsible-trigger"]',
    ))
      expect(trigger.scrollWidth).toBeLessThanOrEqual(trigger.clientWidth + 1);
  });
});
