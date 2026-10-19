import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Badge } from "../../packages/sprout/src/components/badge.js";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardSize,
  type CardSurface,
} from "../../packages/sprout/src/components/card.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

function Project({
  size = "default",
  surface = "default",
  footer = true,
  text = "Three tasks are ready to review.",
  testId,
}: {
  size?: CardSize;
  surface?: CardSurface;
  footer?: boolean;
  text?: string;
  testId?: string;
}) {
  return (
    <Card size={size} surface={surface} data-testid={testId ?? size}>
      <CardHeader>
        <CardTitle render={<h4 />}>Meadow project</CardTitle>
        <CardDescription>A fictional garden project · {size}</CardDescription>
        <CardAction>
          <Badge variant="success">Active</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0 }}>{text}</p>
      </CardContent>
      {footer && (
        <CardFooter>
          <Button variant="outline" size={size === "sm" ? "sm" : "default"}>
            Review example
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function Gallery() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        alignItems: "start",
        gap: 16,
        padding: 16,
      }}
    >
      <Project />
      <Project size="sm" />
      <Project surface="raised" testId="raised" />
    </div>
  );
}

function colorOf(value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.append(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

const slot = (card: Element, name: string) =>
  card.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

describe("Card in a real browser", () => {
  it.each(themes)(
    "%s %s paints the surface and passes axe",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(<Gallery />);
      await settle();
      expect(
        getComputedStyle(screen.getByTestId("default").element())
          .backgroundColor,
      ).toBe(colorOf("var(--sprout-surface)"));
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("sizes set spacing, title size, action position, and a flush footer", async () => {
    const screen = await render(<Gallery />);
    await settle();
    for (const [size, spacing, titleSize] of [
      ["default", 16, "16px"],
      ["sm", 12, "14px"],
    ] as const) {
      const card = screen.getByTestId(size).element();
      const css = getComputedStyle(card);
      expect(card.getAttribute("data-size")).toBe(size);
      expect(css.paddingTop).toBe(`${spacing}px`);
      expect(css.paddingBottom).toBe("0px");
      expect(css.rowGap).toBe(`${spacing}px`);
      expect(css.borderRadius).toBe("12px");
      const title = getComputedStyle(slot(card, "card-title"));
      expect(title.fontSize).toBe(titleSize);
      expect(title.fontWeight).toBe("500");
      const box = card.getBoundingClientRect();
      const header = slot(card, "card-header").getBoundingClientRect();
      const action = slot(card, "card-action").getBoundingClientRect();
      expect(Math.round(action.top)).toBe(Math.round(header.top));
      expect(Math.round(box.right - action.right)).toBe(spacing + 1);
      const content = slot(card, "card-content");
      expect(
        Math.round(
          content.querySelector("p")!.getBoundingClientRect().left -
            content.getBoundingClientRect().left,
        ),
      ).toBe(spacing);
      const footer = slot(card, "card-footer");
      expect(getComputedStyle(footer).paddingTop).toBe(`${spacing}px`);
      expect(getComputedStyle(footer).borderTopWidth).toBe("1px");
      expect(Math.round(footer.getBoundingClientRect().bottom)).toBe(
        Math.round(box.bottom - 1),
      );
    }
  });

  it("without a footer the bottom padding returns; a wrapped footer stays flush", async () => {
    const screen = await render(
      <>
        <Project footer={false} testId="bare" />
        <Project size="sm" footer={false} testId="bare-sm" />
        <Card data-testid="wrapped">
          <CardContent>Notes</CardContent>
          <div>
            <CardFooter>Saved</CardFooter>
          </div>
        </Card>
      </>,
    );
    const pad = (id: string) =>
      getComputedStyle(screen.getByTestId(id).element()).paddingBottom;
    expect(pad("bare")).toBe("16px");
    expect(pad("bare-sm")).toBe("12px");
    expect(pad("wrapped")).toBe("0px");
  });

  it("raised surface tints the panel in light and dark", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Gallery />);
    const flat = screen.getByTestId("default").element();
    const raised = screen.getByTestId("raised").element();
    expect(raised.getAttribute("data-surface")).toBe("raised");
    for (const mode of ["light", "dark"] as const) {
      setTheme("neutral", mode);
      const color = getComputedStyle(raised).backgroundColor;
      expect(color).not.toBe(getComputedStyle(flat).backgroundColor);
      expect(color).toBe(colorOf("var(--sprout-card-raised)"));
      const shadow = getComputedStyle(raised).boxShadow;
      if (mode === "light") expect(shadow).not.toBe("none");
      else expect(shadow).toBe("none");
      expect(getComputedStyle(flat).boxShadow).toBe("none");
    }
  });

  it("fits a 390px phone without horizontal overflow", async () => {
    await page.viewport(390, 844);
    const screen = await render(<Gallery />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const card of screen.container.querySelectorAll('[data-slot="card"]'))
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
  });

  it("transitions are subtle and stop for reduced motion", async () => {
    const screen = await render(<Project />);
    const card = screen.getByTestId("default").element();
    for (const value of getComputedStyle(card).transitionDuration.split(",")) {
      const ms = parseFloat(value) * 1000;
      expect(ms).toBeGreaterThanOrEqual(120);
      expect(ms).toBeLessThanOrEqual(180);
    }
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(card).transitionDuration).toBe("0s");
  });
});
