import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AspectRatio } from "../../packages/sprout/src/components/aspect-ratio.js";
import { axeViolations, setTheme, settle, themes } from "./support.js";

const landscape =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#4a7"/></svg>',
  );
const ratios = [16 / 9, 4 / 3, 1];

function Frames({ width = 288 }: { width?: number | string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: 16,
        width,
        boxSizing: "border-box",
      }}
    >
      {ratios.map((ratio) => (
        <AspectRatio key={ratio} ratio={ratio} data-testid="frame">
          <img
            src={landscape}
            alt="Fictional green landscape"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AspectRatio>
      ))}
    </div>
  );
}

const frames = () =>
  [...document.querySelectorAll('[data-slot="aspect-ratio"]')].map((node) =>
    node.getBoundingClientRect(),
  );

describe("AspectRatio in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Frames />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("frames hold 16:9, 4:3 and square with covering images", async () => {
    const screen = await render(<Frames />);
    await settle();
    frames().forEach((box, index) => {
      expect(box.width).toBe(256);
      expect(Math.abs(box.width / box.height - ratios[index]!)).toBeLessThan(
        0.02,
      );
    });
    const frame = screen.getByTestId("frame").first().element();
    expect(getComputedStyle(frame).position).toBe("relative");
    expect(frame.hasAttribute("tabindex")).toBe(false);
    expect(frame.hasAttribute("role")).toBe(false);
    for (const image of screen.container.querySelectorAll("img")) {
      expect(image.naturalWidth).toBeGreaterThan(0);
      const inner = image.getBoundingClientRect();
      const outer = image.parentElement!.getBoundingClientRect();
      expect(Math.abs(inner.width - outer.width)).toBeLessThan(1);
      expect(Math.abs(inner.height - outer.height)).toBeLessThan(1);
    }
  });

  it("frames shrink with their column on a phone and keep the ratio", async () => {
    await page.viewport(320, 900);
    await render(<Frames width="100%" />);
    await settle();
    frames().forEach((box, index) => {
      expect(box.width).toBeGreaterThan(150);
      expect(Math.abs(box.width / box.height - ratios[index]!)).toBeLessThan(
        0.02,
      );
    });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });

  it("changing the ratio changes the height, not the width", async () => {
    const screen = await render(
      <div style={{ width: 300 }}>
        <AspectRatio ratio={16 / 9} data-testid="live" />
      </div>,
    );
    const box = () =>
      screen.getByTestId("live").element().getBoundingClientRect();
    expect(Math.round(box().height)).toBe(169);
    await screen.rerender(
      <div style={{ width: 300 }}>
        <AspectRatio ratio={1} data-testid="live" />
      </div>,
    );
    expect([box().width, box().height]).toEqual([300, 300]);
  });

  it("tall content scrolls inside the frame instead of stretching it", async () => {
    const screen = await render(
      <div style={{ width: 200 }}>
        <AspectRatio ratio={1} data-testid="frame" style={{ overflow: "auto" }}>
          <p style={{ margin: 0 }}>
            {"No preview yet. Upload a file to see it here. ".repeat(20)}
          </p>
        </AspectRatio>
      </div>,
    );
    const frame = screen.getByTestId("frame").element();
    expect(frame.getBoundingClientRect().height).toBe(200);
    expect(frame.scrollHeight).toBeGreaterThan(frame.clientHeight);
  });
});
