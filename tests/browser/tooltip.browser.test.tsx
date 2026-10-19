import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../packages/sprout/src/components/tooltip.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

function Tip({
  label,
  hint,
  side,
  align,
  disabled,
}: {
  label: string;
  hint: string;
  side?: Side;
  align?: Align;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" disabled={disabled} />}>
        {label}
      </TooltipTrigger>
      <TooltipContent side={side} align={align}>
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

function Playground({ align }: { align?: Align }) {
  return (
    <TooltipProvider>
      {/* Stacked so an open tooltip never covers the next trigger. */}
      <div
        style={{
          display: "grid",
          gap: 64,
          padding: 120,
          justifyItems: "center",
        }}
      >
        <Button variant="ghost">Before</Button>
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <Tip
            key={side}
            label={side}
            side={side}
            align={align}
            hint={`Helpful information on the ${side}.`}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

// A closing tooltip stays mounted for a frame while its exit style applies.
const openTips = () => [
  ...document.querySelectorAll('[role="tooltip"][data-open]'),
];
const tip = () => page.elementLocator(openTips()[0]!);
const trigger = (name: string) =>
  page.getByRole("button", { name, exact: true });

function insideViewport(node: Element) {
  const box = node.getBoundingClientRect();
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(innerWidth + 0.5);
}

describe("Tooltip in a real browser", () => {
  it.each(themes)(
    "%s %s opens on every side with an arrow and passes axe",
    async (theme, mode) => {
      setTheme(theme, mode);
      await render(<Playground />);
      for (const side of ["top", "right", "bottom", "left"] as const) {
        await trigger(side).hover();
        await expect
          .poll(() => openTips()[0]?.textContent)
          .toBe(`Helpful information on the ${side}.`);
        const popup = openTips()[0]!;
        expect(popup.getAttribute("data-side")).toBe(side);
        await expect
          .element(
            page.elementLocator(
              popup.querySelector('[data-slot="tooltip-arrow"]')!,
            ),
          )
          .toBeVisible();
        insideViewport(popup);
      }
      await settle();
      const popup = openTips()[0]!;
      const style = getComputedStyle(popup);
      const probe = document.createElement("span");
      probe.style.color = "var(--sprout-surface)";
      document.body.append(probe);
      expect(style.backgroundColor).toBe(getComputedStyle(probe).color);
      probe.remove();
      expect(await axeViolations()).toEqual([]);
    },
  );

  it("keyboard focus opens and describes the trigger, Tab swaps, and Escape closes", async () => {
    await render(<Playground />);
    await trigger("Before").hover();
    await expect.poll(() => openTips()).toHaveLength(0);
    (trigger("Before").element() as HTMLElement).focus();
    await userEvent.tab();
    await expect.element(trigger("top")).toHaveFocus();
    await expect
      .poll(() => openTips()[0]?.textContent)
      .toBe("Helpful information on the top.");
    const id = openTips()[0]!.id;
    expect(id).toBeTruthy();
    await expect
      .element(trigger("top"))
      .toHaveAttribute("aria-describedby", id);
    await expect
      .element(trigger("top"))
      .toHaveAccessibleDescription("Helpful information on the top.");
    await userEvent.tab();
    await expect.element(trigger("right")).toHaveFocus();
    await expect
      .poll(() => openTips()[0]?.textContent)
      .toBe("Helpful information on the right.");
    expect(openTips()).toHaveLength(1);
    await expect
      .element(trigger("top"))
      .not.toHaveAttribute("aria-describedby");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => openTips()).toHaveLength(0);
    await expect.element(trigger("right")).toHaveFocus();
    await expect
      .element(trigger("right"))
      .not.toHaveAttribute("aria-describedby");
  });

  it("moving focus between triggers outside a provider never shows two", async () => {
    await render(
      <div style={{ display: "flex", gap: 16, padding: 80 }}>
        <Tip label="Access" hint="Turned-off models can't be picked." />
        <Tip label="Linear" hint="Linear · Synced 2 minutes ago" />
      </div>,
    );
    await page
      .elementLocator(document.body)
      .hover({ position: { x: 1, y: 1 } });
    await expect.poll(() => openTips()).toHaveLength(0);
    (trigger("Linear").element() as HTMLElement).focus();
    await expect
      .poll(() => openTips()[0]?.textContent)
      .toBe("Linear · Synced 2 minutes ago");
    await userEvent.tab({ shift: true });
    expect(openTips().length).toBeLessThanOrEqual(1);
    await expect
      .poll(() => openTips()[0]?.textContent)
      .toBe("Turned-off models can't be picked.");
    expect(openTips()).toHaveLength(1);
    await userEvent.tab();
    expect(openTips().length).toBeLessThanOrEqual(1);
    await expect
      .poll(() => openTips()[0]?.textContent)
      .toBe("Linear · Synced 2 minutes ago");
    expect(openTips()).toHaveLength(1);
  });

  it.each(["start", "center", "end"] as const)(
    "aligns to the %s of the trigger",
    async (align) => {
      await render(<Playground align={align} />);
      await trigger("bottom").hover();
      await expect
        .poll(() => openTips()[0]?.getAttribute("data-align"))
        .toBe(align);
      await settle();
      const box = openTips()[0]!.getBoundingClientRect();
      const anchor = trigger("bottom").element().getBoundingClientRect();
      if (align === "start")
        expect(Math.abs(box.left - anchor.left)).toBeLessThan(2);
      if (align === "end")
        expect(Math.abs(box.right - anchor.right)).toBeLessThan(2);
      if (align === "center")
        expect(
          Math.abs(box.left + box.width / 2 - anchor.left - anchor.width / 2),
        ).toBeLessThan(2);
      expect(box.top).toBeGreaterThan(anchor.bottom);
    },
  );

  it("a provider opens a neighbour instantly and keeps one open", async () => {
    await render(<Playground />);
    await trigger("top").hover();
    await expect
      .poll(() => openTips()[0]?.textContent)
      .toBe("Helpful information on the top.");
    await trigger("right").hover();
    await expect
      .poll(() => openTips()[0]?.textContent)
      .toBe("Helpful information on the right.");
    await expect.element(tip()).toHaveAttribute("data-instant");
    expect(openTips()).toHaveLength(1);
  });

  it("a disabled trigger shows nothing, and an enabled one shows its hint", async () => {
    const screen = await render(
      <TooltipProvider>
        <div style={{ padding: 80 }}>
          <Tip label="Send message" hint="Send · Enter" disabled />
        </div>
      </TooltipProvider>,
    );
    await trigger("Send message").hover({ force: true });
    // The provider opens with no delay, so 250ms is ample time for a wrong open.
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(openTips()).toHaveLength(0);
    await screen.rerender(
      <TooltipProvider>
        <div style={{ padding: 80 }}>
          <Tip label="Send message" hint="Send · Enter" />
        </div>
      </TooltipProvider>,
    );
    await page.getByRole("button").first().hover();
    await trigger("Send message").hover();
    await expect.poll(() => openTips()[0]?.textContent).toBe("Send · Enter");
  });

  it("long hints wrap at 20rem, and hidden content renders nothing", async () => {
    const screen = await render(
      <div style={{ padding: 120 }}>
        <Tooltip>
          <TooltipTrigger delay={0} render={<Button variant="outline" />}>
            Chat mode
          </TooltipTrigger>
          <TooltipContent>
            Normal acts on your request right away. Plan only proposes the steps
            first and waits for you to approve each one before anything changes.
          </TooltipContent>
        </Tooltip>
      </div>,
    );
    await trigger("Chat mode").hover();
    await expect.poll(() => openTips()).toHaveLength(1);
    await settle();
    const box = openTips()[0]!.getBoundingClientRect();
    expect(box.width).toBeLessThanOrEqual(320.5);
    expect(box.height).toBeGreaterThan(30);
    await screen.rerender(
      <div style={{ padding: 120 }}>
        <Tooltip>
          <TooltipTrigger delay={0} render={<Button variant="outline" />}>
            Chat mode
          </TooltipTrigger>
          <TooltipContent hidden>Chat mode</TooltipContent>
        </Tooltip>
      </div>,
    );
    await page.getByRole("button").hover();
    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(0);
  });

  it("stays on a phone screen near the edge", async () => {
    await page.viewport(390, 844);
    await render(
      <TooltipProvider>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "80px 4px",
          }}
        >
          <Tip
            label="Skills"
            hint="Skills are saved procedures the agent follows · /"
          />
          <Tip
            label="Model"
            hint="AI model that writes replies, picked per chat"
          />
        </div>
      </TooltipProvider>,
    );
    for (const name of ["Skills", "Model"]) {
      await trigger(name).hover();
      await expect
        .poll(() => openTips()[0]?.textContent)
        .toContain(name === "Skills" ? "Skills" : "AI model");
      await settle();
      insideViewport(openTips()[0]!);
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("fades over 120ms, and reduced motion turns the transition off", async () => {
    await render(<Playground />);
    await trigger("top").hover();
    await expect.poll(() => openTips()).toHaveLength(1);
    expect(
      getComputedStyle(openTips()[0]!).transitionDuration.split(",")[0]!.trim(),
    ).toBe("0.12s");
    await settle();
    expect(getComputedStyle(openTips()[0]!).opacity).toBe("1");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(openTips()[0]!).transitionDuration).toBe("0s");
  });
});
