import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Skeleton,
  SkeletonGroup,
  skeletonShapeNames,
} from "../../packages/sprout/src/components/skeleton.js";
import {
  axeViolations,
  emulate,
  setTheme,
  settle,
  size,
  themes,
} from "./support.js";

function colorOf(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function Shapes() {
  return (
    <div style={{ display: "grid", gap: 12, padding: 16, width: 300 }}>
      {skeletonShapeNames.map((shape) => (
        <div key={shape} data-testid={shape}>
          <Skeleton shape={shape} />
        </div>
      ))}
      {(["sm", "md", "lg"] as const).map((gap) => (
        <SkeletonGroup
          key={gap}
          gap={gap}
          label={`Loading ${gap}`}
          data-testid={`gap-${gap}`}
        >
          <Skeleton />
          <Skeleton />
        </SkeletonGroup>
      ))}
    </div>
  );
}

const item = (id: string) =>
  page.getByTestId(id).element().querySelector('[data-slot="skeleton"]')!;

describe("Skeleton in a real browser", () => {
  it.each(themes)(
    "%s %s fills with the secondary token and passes axe",
    async (theme, mode) => {
      await emulate({ reducedMotion: true });
      setTheme(theme, mode);
      const screen = await render(<Shapes />);
      await settle();
      expect(getComputedStyle(item("line")).backgroundColor).toBe(
        colorOf("--sprout-secondary"),
      );
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("every shape keeps the Cloud footprint", async () => {
    await render(<Shapes />);
    expect(size(item("line"))).toEqual([300, 16]);
    expect(size(item("title"))[1]).toBe(24);
    expect(item("title").getBoundingClientRect().width / 300).toBeCloseTo(
      2 / 3,
      2,
    );
    expect(size(item("panel"))).toEqual([300, 128]);
    expect(size(item("avatar"))).toEqual([32, 32]);
    expect(size(item("checkbox"))).toEqual([16, 16]);
    expect(size(item("action"))).toEqual([28, 28]);
    expect(getComputedStyle(item("avatar")).borderRadius).toBe("9999px");
    expect(getComputedStyle(item("checkbox")).borderRadius).toBe("4px");
    expect(getComputedStyle(item("avatar")).pointerEvents).toBe("none");
  });

  it("groups space placeholders by gap and hide their label visually", async () => {
    await render(<Shapes />);
    for (const [gap, px] of [
      ["sm", 8],
      ["md", 12],
      ["lg", 16],
    ] as const) {
      const [first, second] = page
        .getByTestId(`gap-${gap}`)
        .element()
        .querySelectorAll('[data-slot="skeleton"]');
      expect(
        Math.round(
          second!.getBoundingClientRect().top -
            first!.getBoundingClientRect().bottom,
        ),
      ).toBe(px);
    }
    const label = document.querySelector(".sprout-skeleton-group-label")!;
    expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });

  it("pulses for 1.6s, and reduced motion stops it", async () => {
    await render(<Shapes />);
    expect(getComputedStyle(item("line")).animationName).toBe(
      "sprout-skeleton-pulse",
    );
    expect(getComputedStyle(item("line")).animationDuration).toBe("1.6s");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(item("line")).animationName).toBe("none");
  });

  it("fits a phone without overflow", async () => {
    await emulate({ reducedMotion: true });
    await page.viewport(320, 640);
    await render(
      <SkeletonGroup label="Loading projects" style={{ padding: 16 }}>
        <Skeleton shape="title" />
        <Skeleton shape="panel" />
      </SkeletonGroup>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });
});
