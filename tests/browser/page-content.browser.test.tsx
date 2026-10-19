import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { PageContent } from "../../packages/sprout/src/components/page-content.js";
import {
  Alert,
  AlertTitle,
} from "../../packages/sprout/src/components/alert.js";
import { axeViolations, setTheme, settle, themes } from "./support.js";

function Files() {
  return (
    <div role="region" aria-label="Files page" tabIndex={0}>
      <PageContent>
        <input type="file" hidden aria-label="Upload" />
        <header data-testid="header" style={{ height: 40 }}>
          <h1 style={{ margin: 0 }}>Files</h1>
        </header>
        <Alert>
          <AlertTitle>Storage is almost full.</AlertTitle>
        </Alert>
        <ul aria-label="My files" style={{ marginTop: 0 }}>
          <li>Q3 board deck.pdf</li>
          <li>Garden notes.md</li>
        </ul>
        <nav
          aria-label="Filter apps"
          style={{
            marginInline: "calc(-1 * var(--sprout-page-content-inline))",
            height: 32,
            background: "var(--sprout-hover)",
          }}
        />
      </PageContent>
    </div>
  );
}

const rect = (node: Element) => node.getBoundingClientRect();

describe("PageContent in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Files />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  for (const [width, block, inline] of [
    [390, 16, 16],
    [1440, 20, 24],
  ] as const)
    it(`padding, stack spacing and bleed match Cloud at ${width}px`, async () => {
      await page.viewport(width, 900);
      const screen = await render(<Files />);
      await settle();
      const content = screen.container.querySelector(
        '[data-slot="page-content"]',
      )!;
      const style = getComputedStyle(content);
      expect(style.paddingTop).toBe(`${block}px`);
      expect(style.paddingBottom).toBe(`${block}px`);
      expect(style.paddingLeft).toBe(`${inline}px`);
      expect(style.paddingRight).toBe(`${inline}px`);
      expect(style.transitionDuration).toBe("0s");
      expect(style.animationName).toBe("none");
      const outer = rect(content);
      expect(outer.width).toBeCloseTo(
        rect(screen.getByRole("region").element()).width,
        0,
      );
      // The hidden file input comes first and adds no space.
      const header = rect(screen.getByTestId("header").element());
      expect(header.top - outer.top).toBeCloseTo(block, 0);
      const alert = rect(screen.getByRole("alert").element());
      const list = screen.getByRole("list", { name: "My files" }).element();
      expect(alert.top - header.bottom).toBeCloseTo(16, 0);
      expect(rect(list).top - alert.bottom).toBeCloseTo(16, 0);
      const nav = screen.getByRole("navigation").element();
      expect(rect(nav).top - rect(list).bottom).toBeCloseTo(16, 0);
      expect(getComputedStyle(nav).marginBottom).toBe("0px");
      expect(rect(nav).left).toBeCloseTo(outer.left, 0);
      expect(rect(nav).width).toBeCloseTo(outer.width, 0);
      expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    });
});
