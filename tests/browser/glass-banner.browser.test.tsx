import { describe, expect, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BrandIcon } from "../../packages/sprout/src/components/brand-icon.js";
import {
  GlassBanner,
  GlassChip,
} from "../../packages/sprout/src/components/glass-banner.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const Plus = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v12M2 8h12" stroke="currentColor" />
  </svg>
);

function Starters({ width, count = 3 }: { width: number; count?: number }) {
  const chips = [
    <GlassChip key="notes" icon={<Plus />}>
      Garden notes
    </GlassChip>,
    <GlassChip key="plan" icon={<Plus />}>
      Plan a project
    </GlassChip>,
    <GlassChip key="try">Try a new workflow</GlassChip>,
    <GlassChip key="extra">One more idea</GlassChip>,
  ];
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <GlassBanner
        title="Grow your next idea"
        caption="Fictional project starters"
      >
        {chips.slice(0, count)}
      </GlassBanner>
    </div>
  );
}

function Activity({ width = 352 }: { width?: number }) {
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <GlassBanner title="Your apps at work">
        <GlassChip icon={<BrandIcon brand="gmail" size="glyph" />}>
          Drafted 3 follow-ups
        </GlassChip>
        <GlassChip icon={<BrandIcon brand="slack" size="glyph" />}>
          Answered in #support
        </GlassChip>
        <GlassChip>
          Summarize the quarterly supplier invoices into one tidy report
        </GlassChip>
      </GlassBanner>
    </div>
  );
}

const banner = () =>
  document.querySelector<HTMLElement>('[data-slot="glass-banner"]')!;
const chips = (root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>('[data-slot="glass-chip"]'),
];
const surface = (chip: HTMLElement) =>
  chip.querySelector<HTMLElement>('[data-slot="glass-chip-surface"]')!;

function inside(inner: Element, outer: Element) {
  const a = inner.getBoundingClientRect();
  const b = outer.getBoundingClientRect();
  return (
    a.left >= b.left - 1 &&
    a.top >= b.top - 1 &&
    a.right <= b.right + 1 &&
    a.bottom <= b.bottom + 1
  );
}

type Point = { x: number; y: number };
const centre = (element: Element): Point => {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2),
  };
};
const mouse = (
  type: "mouseMoved" | "mousePressed" | "mouseReleased",
  { x, y }: Point,
  button: "left" | "right" = "left",
) =>
  cdp().send("Input.dispatchMouseEvent", {
    type,
    x,
    y,
    button,
    buttons: type === "mouseReleased" ? 0 : button === "left" ? 1 : 2,
    clickCount: 1,
  });
async function press(from: Point, dx: number, dy: number, button?: "right") {
  await mouse("mouseMoved", from, button);
  await mouse("mousePressed", from, button);
  for (let step = 1; step <= 8; step++)
    await mouse(
      "mouseMoved",
      { x: from.x + (dx * step) / 8, y: from.y + (dy * step) / 8 },
      button,
    );
}

describe("GlassBanner in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe and inks the glass",
    async (theme, mode) => {
      await emulate({ reducedMotion: true });
      setTheme(theme, mode);
      const screen = await render(
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 16,
            padding: 16,
          }}
        >
          <Starters width={960} />
          <Activity />
        </div>,
      );
      await settle();
      expect(getComputedStyle(banner()).color).toBe(
        mode === "light" ? "rgb(29, 39, 66)" : "rgb(227, 232, 245)",
      );
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it.each([390, 1280])(
    "at %ipx every chip stays inside its banner",
    async (width) => {
      await emulate({ reducedMotion: true });
      await page.viewport(width, 900);
      await render(
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 16,
            padding: 16,
          }}
        >
          <Starters width={960} />
          <Starters width={960} count={4} />
          <Activity />
        </div>,
      );
      await settle();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      for (const each of document.querySelectorAll(
        '[data-slot="glass-banner"]',
      )) {
        expect(each.scrollWidth).toBeLessThanOrEqual(each.clientWidth + 1);
        for (const chip of chips(each)) expect(inside(chip, each)).toBe(true);
      }
    },
  );

  it("wide banners scatter tilted chips clear of the text; narrow ones wrap", async () => {
    await emulate({ reducedMotion: true });
    await render(
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 16,
          padding: 16,
        }}
      >
        <Starters width={960} />
        <Activity />
      </div>,
    );
    const [wide, narrow] = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="glass-banner"]'),
    ];
    expect(wide!.getBoundingClientRect().width).toBeGreaterThanOrEqual(704);
    expect(narrow!.getBoundingClientRect().width).toBeLessThan(704);
    const position = (root: HTMLElement) =>
      chips(root).map((chip) => getComputedStyle(chip).position);
    expect(position(wide!)).toEqual(["absolute", "absolute", "absolute"]);
    expect(position(narrow!)).toEqual(["static", "static", "static"]);
    expect(
      chips(wide!).map((chip) => getComputedStyle(surface(chip)).rotate),
    ).toEqual(["3deg", "-4deg", "1.5deg"]);
    const text = [
      ...wide!.querySelectorAll('[data-slot="glass-banner-copy"] p'),
    ].map((p) => {
      const range = document.createRange();
      range.selectNodeContents(p);
      return range.getBoundingClientRect();
    });
    expect(text).toHaveLength(2);
    for (const chip of chips(wide!)) {
      const box = chip.getBoundingClientRect();
      for (const line of text)
        expect(
          box.left < line.right &&
            box.right > line.left &&
            box.top < line.bottom &&
            box.bottom > line.top,
        ).toBe(false);
    }
    const long = page.getByText(/Summarize the quarterly/).element();
    expect(long.getBoundingClientRect().height).toBeGreaterThan(20);
  });

  it("four or more chips wrap even on a wide banner", async () => {
    await emulate({ reducedMotion: true });
    await render(<Starters width={960} count={4} />);
    expect(chips().map((chip) => getComputedStyle(chip).position)).toEqual([
      "static",
      "static",
      "static",
      "static",
    ]);
  });

  it("text chips pad evenly; icon chips tuck around a 28px bubble", async () => {
    await render(<Starters width={352} />);
    const [icon, , text] = chips();
    expect(getComputedStyle(surface(text!)).paddingLeft).toBe("14px");
    expect(getComputedStyle(surface(icon!)).paddingLeft).toBe("4px");
    const bubble = icon!.querySelector('[data-slot="glass-chip-icon"]')!;
    expect(bubble.getBoundingClientRect().width).toBe(28);
    expect(bubble.getBoundingClientRect().height).toBe(28);
    expect(surface(icon!).getBoundingClientRect().height).toBe(38);
  });

  it("chips take no focus: Tab skips over the banner", async () => {
    await render(
      <>
        <button type="button">Before</button>
        <Starters width={960} />
        <button type="button">After</button>
      </>,
    );
    page.getByRole("button", { name: "Before" }).element().focus();
    await userEvent.tab();
    await expect
      .element(page.getByRole("button", { name: "After" }))
      .toHaveFocus();
    expect(banner().querySelectorAll("[tabindex]")).toHaveLength(0);
  });

  it("chips float, stretch while dragged, and spring home", async () => {
    await render(<Starters width={960} />);
    const chip = chips()[0]!;
    expect(getComputedStyle(chip).cursor).toBe("grab");
    expect(getComputedStyle(surface(chip)).animationName).toBe(
      "sprout-glass-float",
    );
    expect(getComputedStyle(surface(chip)).animationIterationCount).toBe(
      "infinite",
    );
    const before = chip.getBoundingClientRect();
    await press(centre(chip), 80, 40);
    expect(chip.hasAttribute("data-dragging")).toBe(true);
    expect(getComputedStyle(chip).cursor).toBe("grabbing");
    expect(getComputedStyle(chip).zIndex).toBe("1");
    await expect
      .poll(() => chip.getBoundingClientRect().x - before.x)
      .toBeGreaterThan(40);
    expect(chip.style.transform).toContain("translate(");
    await mouse("mouseReleased", centre(chip));
    await expect
      .poll(() => chip.hasAttribute("data-dragging"), { timeout: 4000 })
      .toBe(false);
    expect(chip.style.transform).toBe("");
    expect(Math.abs(chip.getBoundingClientRect().x - before.x)).toBeLessThan(2);
  });

  it("only the primary button drags", async () => {
    await render(<Starters width={960} />);
    const chip = chips()[1]!;
    const from = centre(chip);
    await press(from, 80, 40, "right");
    expect(chip.hasAttribute("data-dragging")).toBe(false);
    expect(chip.style.transform).toBe("");
    await mouse("mouseReleased", { x: from.x + 80, y: from.y + 40 }, "right");
  });

  it("reduced motion stops the float and snaps chips home", async () => {
    await emulate({ reducedMotion: true });
    await render(<Starters width={960} />);
    const chip = chips()[1]!;
    expect(getComputedStyle(surface(chip)).animationName).toBe("none");
    expect(getComputedStyle(surface(chip)).transitionDuration).toBe("0s");
    const before = chip.getBoundingClientRect();
    await press(centre(chip), -60, 30);
    expect(chip.hasAttribute("data-dragging")).toBe(true);
    await mouse("mouseReleased", centre(chip));
    expect([chip.style.transform, chip.hasAttribute("data-dragging")]).toEqual([
      "",
      false,
    ]);
    expect(Math.abs(chip.getBoundingClientRect().x - before.x)).toBeLessThan(1);
  });
});
