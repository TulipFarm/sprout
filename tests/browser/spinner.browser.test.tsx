import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Badge } from "../../packages/sprout/src/components/badge.js";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  Spinner,
  spinnerActivityNames,
} from "../../packages/sprout/src/components/spinner.js";
import {
  axeViolations,
  emulate,
  setTheme,
  settle,
  size,
  themes,
} from "./support.js";

function Gallery() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        padding: 16,
        color: "var(--sprout-info)",
      }}
    >
      <Spinner size="sm" data-testid="sm" />
      <Spinner data-testid="default" aria-label="Opening workspace" />
      <Spinner size="lg" data-testid="lg" />
      <Button disabled aria-busy="true">
        <Spinner aria-hidden="true" />
        Opening sign-in…
      </Button>
      <Button size="icon" aria-label="Refresh integrations">
        <Spinner aria-hidden="true" />
      </Button>
      <Badge>
        <Spinner aria-label="Uploading" />
        Uploading
      </Badge>
      <p role="status" style={{ margin: 0 }}>
        <Spinner aria-hidden="true" /> Saving access change…
      </p>
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

/** Counts painted canvas pixels and the share that are light. */
function ink(canvas: HTMLCanvasElement) {
  const { data } = canvas
    .getContext("2d")!
    .getImageData(0, 0, canvas.width, canvas.height);
  let painted = 0;
  let light = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    painted += 1;
    if (data[index] > 128) light += 1;
  }
  return { painted, lightShare: painted ? light / painted : 0 };
}

describe("Spinner in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe and takes the text color",
    async (theme, mode) => {
      setTheme(theme, mode);
      await emulate({ reducedMotion: true });
      const screen = await render(<Gallery />);
      await settle();
      for (const spinner of screen.container.querySelectorAll(
        '[data-slot="spinner"]',
      ))
        expect(getComputedStyle(spinner).color).toBe(
          getComputedStyle(spinner.parentElement!).color,
        );
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("every size keeps its footprint in buttons and shrinks in badges", async () => {
    // A rotating square has a larger bounding box, so measure it at rest.
    await emulate({ reducedMotion: true });
    const screen = await render(<Gallery />);
    expect(size(screen.getByTestId("sm").element())).toEqual([12, 12]);
    expect(size(screen.getByTestId("default").element())).toEqual([16, 16]);
    expect(size(screen.getByTestId("lg").element())).toEqual([20, 20]);
    for (const button of screen.container.querySelectorAll("button"))
      expect(size(button.querySelector("svg")!)).toEqual([16, 16]);
    const badge = screen.container.querySelector('[data-slot="badge"] svg')!;
    expect(size(badge)).toEqual([12, 12]);
    const spinner = screen.getByTestId("default").element();
    expect(getComputedStyle(spinner).color).toBe(colorOf("--sprout-info"));
    expect(getComputedStyle(spinner).pointerEvents).toBe("none");
  });

  it("the spin runs and stops for reduced motion", async () => {
    const screen = await render(<Gallery />);
    const spinner = screen.getByTestId("default").element();
    const css = getComputedStyle(spinner);
    expect(css.animationName).toBe("sprout-spinner-spin");
    expect(css.animationDuration).toBe("1s");
    expect(css.animationTimingFunction).toBe("linear");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(spinner).animationName).toBe("none");
  });

  it("thinking orbs draw every activity at both sizes and follow the theme", async () => {
    setTheme("neutral", "light");
    await emulate({ reducedMotion: true });
    const screen = await render(
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 16 }}>
        {spinnerActivityNames.map((activity) => (
          <Spinner
            key={activity}
            variant="thinking"
            size="xl"
            activity={activity}
            aria-label={`${activity} orb`}
          />
        ))}
        <Spinner variant="thinking" data-testid="inline" aria-hidden="true" />
      </div>,
    );
    for (const activity of spinnerActivityNames) {
      const orb = screen.getByRole("status", {
        name: `${activity} orb`,
        exact: true,
      });
      await expect
        .poll(() => orb.element().querySelector("canvas"))
        .toBeTruthy();
      expect(orb.element().querySelector("canvas")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      expect(size(orb.element())).toEqual([64, 64]);
    }
    const inline = screen.getByTestId("inline").element();
    await expect.poll(() => inline.querySelector("canvas")).toBeTruthy();
    expect(size(inline.querySelector("canvas")!)).toEqual([20, 20]);

    const searching = () =>
      screen
        .getByRole("status", { name: "searching orb" })
        .element()
        .querySelector("canvas")!;
    await expect.poll(() => ink(searching()).painted).toBeGreaterThan(50);
    await expect.poll(() => ink(searching()).lightShare).toBeLessThan(0.2);
    setTheme("neutral", "dark");
    await expect.poll(() => ink(searching()).lightShare).toBeGreaterThan(0.6);
  });

  it("a page-loading pane centers the spinner without overflowing 390px", async () => {
    await page.viewport(390, 800);
    await emulate({ reducedMotion: true });
    const screen = await render(
      <div
        role="status"
        style={{ display: "grid", placeItems: "center", height: 240 }}
      >
        <Spinner size="lg" aria-hidden="true" />
        Opening TulipFarm…
      </div>,
    );
    const pane = screen.getByRole("status").element().getBoundingClientRect();
    const spinner = screen.container
      .querySelector('[data-slot="spinner"]')!
      .getBoundingClientRect();
    expect(spinner.left + spinner.width / 2).toBeCloseTo(
      pane.left + pane.width / 2,
      0,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
