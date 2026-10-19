import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import { ButtonGroup } from "../../packages/sprout/src/components/button-group.js";
import {
  Separator,
  SeparatorContent,
  SeparatorIcon,
} from "../../packages/sprout/src/components/separator.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const Check = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8l3 3 7-7" stroke="currentColor" fill="none" />
  </svg>
);

function Gallery() {
  return (
    <div style={{ display: "grid", gap: 16, padding: 16, maxWidth: 480 }}>
      <div data-testid="panel" style={{ padding: 16 }}>
        <Separator />
        <div
          data-testid="meta-row"
          style={{ display: "flex", alignItems: "center", gap: 8, height: 20 }}
        >
          Draft
          <Separator orientation="vertical" />
          Edited today
          <Separator orientation="vertical" />3 files
        </div>
      </div>
      <ButtonGroup aria-label="Row pages">
        <Button variant="outline">Previous</Button>
        <Separator orientation="vertical" tone="input" />
        <Button variant="outline">Next</Button>
      </ButtonGroup>
      <ButtonGroup orientation="vertical" aria-label="Column pages">
        <Button variant="outline">Previous</Button>
        <Separator tone="input" />
        <Button variant="outline">Next</Button>
      </ButtonGroup>
      <Separator data-testid="or">or</Separator>
      <Separator data-testid="plain">{false}</Separator>
      <Separator data-testid="today">
        <SeparatorIcon>
          <Check />
        </SeparatorIcon>
        Today
      </Separator>
      <Separator variant="fade">Auto compacted</Separator>
      <Separator variant="marker" data-testid="marker">
        <SeparatorIcon>
          <Check />
        </SeparatorIcon>
        <SeparatorContent>
          Used skill Weekly report · <a href="#changes">View changes</a>
        </SeparatorContent>
      </Separator>
      <Separator
        variant="marker"
        render={<a href="#skill" />}
        data-testid="whole"
      >
        <SeparatorIcon>
          <Check />
        </SeparatorIcon>
        <SeparatorContent>Open skill Weekly report</SeparatorContent>
      </Separator>
      <Separator variant="marker-border" data-testid="border">
        <SeparatorContent>Today</SeparatorContent>
      </Separator>
    </div>
  );
}

function colorOf(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const box = (node: Element) => node.getBoundingClientRect();
const css = (node: Element, pseudo?: string) => getComputedStyle(node, pseudo);

describe("Separator in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe and paints muted labels",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(<Gallery />);
      await settle();
      const muted = colorOf("--sprout-muted");
      expect(css(screen.getByTestId("or").element()).color).toBe(muted);
      expect(css(screen.getByTestId("marker").element()).color).toBe(muted);
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("horizontal and vertical separators keep 1px geometry", async () => {
    const screen = await render(<Gallery />);
    const panel = screen.getByTestId("panel").element();
    const horizontal = panel.querySelector('[aria-orientation="horizontal"]')!;
    expect(css(horizontal).height).toBe("1px");
    expect(Math.round(box(horizontal).width)).toBe(
      Math.round(box(panel).width - 32),
    );
    const row = box(screen.getByTestId("meta-row").element());
    const verticals = panel.querySelectorAll('[aria-orientation="vertical"]');
    expect(verticals).toHaveLength(2);
    for (const vertical of verticals) {
      expect(css(vertical).width).toBe("1px");
      expect(box(vertical).height).toBeGreaterThanOrEqual(16);
      expect(box(vertical).height).toBeLessThanOrEqual(row.height);
    }
  });

  it("button group separators use the input tone, span the group and never take focus", async () => {
    const screen = await render(<Gallery />);
    const row = screen.getByRole("group", { name: "Row pages" }).element();
    const column = screen
      .getByRole("group", { name: "Column pages" })
      .element();
    const rowLine = row.querySelector('[role="separator"]')!;
    const columnLine = column.querySelector('[role="separator"]')!;
    expect(css(rowLine).backgroundColor).toBe(colorOf("--sprout-input"));
    expect(colorOf("--sprout-input")).not.toBe(colorOf("--sprout-line"));
    const next = (group: Element) =>
      [...group.querySelectorAll("button")].find(
        (b) => b.textContent === "Next",
      )!;
    expect(Math.round(box(rowLine).height)).toBe(
      Math.round(box(next(row)).height),
    );
    expect(Math.round(box(columnLine).width)).toBe(
      Math.round(box(next(column)).width),
    );
    (row.querySelector("button") as HTMLElement).focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(next(row));
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(row.querySelector("button"));
    for (const node of screen.container.querySelectorAll('[role="separator"]'))
      expect((node as HTMLElement).tabIndex).toBeLessThan(0);
  });

  it("labeled separators center their content between equal lines", async () => {
    const screen = await render(<Gallery />);
    const or = screen.getByTestId("or").element();
    const label = or.querySelector('[data-slot="separator-label-content"]')!;
    const middle = (node: Element) => box(node).x + box(node).width / 2;
    expect(Math.abs(middle(label) - middle(or))).toBeLessThan(2);
    expect(css(or).height).toBe("20px");
    expect(css(screen.getByTestId("plain").element()).height).toBe("20px");

    const today = screen.getByTestId("today").element();
    const sides = today.querySelectorAll(".sprout-separator-label-line");
    expect(sides).toHaveLength(2);
    for (const side of sides) {
      expect(css(side).height).toBe("1px");
      expect(css(side).backgroundColor).toBe(colorOf("--sprout-line"));
    }
    expect(Math.abs(box(sides[0]).width - box(sides[1]).width)).toBeLessThan(2);
    expect(box(today.querySelector("svg")!).width).toBe(16);
  });

  it("fade labels span the row with faded lines and a hidden shine", async () => {
    const screen = await render(<Gallery />);
    const fade = screen
      .getByRole("separator", { name: "Auto compacted" })
      .element();
    const parent = fade.parentElement!;
    expect(Math.round(box(fade).width)).toBe(
      Math.round(box(parent).width - 32),
    );
    const label = fade.querySelector(":scope > .sprout-separator-fade-label")!;
    const middle = (node: Element) => box(node).x + box(node).width / 2;
    expect(Math.abs(middle(label) - middle(fade))).toBeLessThan(2);
    const before = css(fade, "::before");
    expect(before.height).toBe("1px");
    expect(before.backgroundImage).toContain("linear-gradient");
    expect(before.backgroundImage).toContain(colorOf("--sprout-line"));
    expect(
      css(fade.querySelector(".sprout-separator-fade-shine")!).opacity,
    ).toBe("0");
  });

  it("fade hover sweeps the shine once and reduced motion disables it", async () => {
    const screen = await render(<Gallery />);
    const fade = screen.getByRole("separator", { name: "Auto compacted" });
    const shine = fade.element().querySelector(".sprout-separator-fade-shine")!;
    await fade.hover();
    expect(css(shine).animationName).toBe("sprout-separator-fade-shine");
    expect(css(shine).animationDuration).toBe("0.65s");
    await emulate({ reducedMotion: true });
    expect(css(shine).animationName).toBe("none");
  });

  it("markers keep their type, spacing, border and icon size", async () => {
    const screen = await render(<Gallery />);
    const marker = screen.getByTestId("marker").element();
    expect(css(marker).fontSize).toBe("14px");
    expect(css(marker).columnGap).toBe("8px");
    expect(css(marker).borderBottomWidth).toBe("0px");
    const svg = box(marker.querySelector("svg")!);
    expect([Math.round(svg.width), Math.round(svg.height)]).toEqual([16, 16]);
    const border = css(screen.getByTestId("border").element());
    expect(border.borderBottomWidth).toBe("1px");
    expect(border.borderBottomColor).toBe(colorOf("--sprout-line"));
    expect(border.paddingBottom).toBe("8px");
  });

  it("marker links underline, focus by keyboard, and darken", async () => {
    await emulate({ reducedMotion: true });
    const screen = await render(<Gallery />);
    const inline = screen.getByRole("link", { name: "View changes" });
    const whole = screen.getByRole("link", { name: /Open skill/ });
    const muted = colorOf("--sprout-muted");
    const text = colorOf("--sprout-text");
    for (const link of [inline, whole]) {
      expect(css(link.element()).textDecorationLine).toBe("underline");
      expect(css(link.element()).color).toBe(muted);
    }
    (screen.getByText("Next").last().element() as HTMLElement).focus();
    await userEvent.tab();
    await expect.element(inline).toHaveFocus();
    expect(css(inline.element()).color).toBe(text);
    await userEvent.tab();
    await expect.element(whole).toHaveFocus();
    expect(css(whole.element()).color).toBe(text);
    expect(css(whole.element()).outlineStyle).toBe("solid");
    expect(css(whole.element()).transitionDuration).toBe("0s");
  });

  it("reduced motion removes the color transitions", async () => {
    const screen = await render(<Gallery />);
    const line = screen.container.querySelector('[role="separator"]')!;
    const marker = screen.getByTestId("marker").element();
    expect(css(line).transitionDuration).toBe("0.12s");
    expect(css(marker).transitionDuration).toBe("0.12s");
    await emulate({ reducedMotion: true });
    expect(css(line).transitionDuration).toBe("0s");
    expect(css(marker).transitionDuration).toBe("0s");
  });

  it("narrow columns wrap marker text and truncate labels", async () => {
    await page.viewport(390, 900);
    const long =
      "Used skill Quarterly-greenhouse-reconciliation-report-for-every-supplier";
    const screen = await render(
      <div style={{ display: "grid", gap: 16, width: 200, padding: 16 }}>
        <Separator variant="marker" data-testid="marker">
          <SeparatorContent>{long}</SeparatorContent>
        </Separator>
        <Separator variant="marker-border" data-testid="border">
          <SeparatorContent>{long}</SeparatorContent>
        </Separator>
        <Separator data-testid="label">{long}</Separator>
        <Separator variant="fade">{long}</Separator>
      </div>,
    );
    for (const id of ["marker", "border"]) {
      const marker = screen.getByTestId(id).element();
      const content = marker.querySelector('[data-slot="separator-content"]')!;
      expect(box(content).height).toBeGreaterThan(24);
      expect(box(content).right).toBeLessThanOrEqual(box(marker).right + 0.5);
    }
    for (const content of screen.container.querySelectorAll(
      '[data-slot="separator-label-content"], .sprout-separator-fade > .sprout-separator-fade-label',
    )) {
      expect(css(content).textOverflow).toBe("ellipsis");
      expect(css(content).whiteSpace).toBe("nowrap");
      expect(content.scrollWidth).toBeGreaterThan(content.clientWidth);
      expect(box(content).right).toBeLessThanOrEqual(
        box(content.parentElement!).right,
      );
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
