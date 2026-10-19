import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  MessageResponse,
  MessageTableViewport,
} from "../../packages/sprout/src/components/message-response.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const markdown = `# Launch notes

## Checklist

Ask @robin about \`@robin\` and read [the brief](https://example.com/brief).

- [x] Task
- [ ] Task

> Check them twice.

---

| Item | Status | Price |
| :--- | :----: | ----: |
| Bulbs | Ready | $14.00 |

\`\`\`ts
const total = 14;
\`\`\``;

const rows = Array.from(
  { length: 20 },
  (_, i) =>
    `| Bed ${i + 1} | Tulip | ${i * 10} | Northwind Traders spring order |`,
).join("\n");
const table = `| Bed | Variety | Bulbs | Customer |\n| --- | --- | --: | --- |\n${rows}`;

const region = (root: Element) =>
  root.querySelector<HTMLElement>(
    '[role="region"][aria-label="Response table"]',
  )!;

describe("MessageResponse in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <div style={{ width: 560 }}>
        <MessageResponse streaming>{markdown}</MessageResponse>
      </div>,
    );
    await expect
      .poll(() =>
        screen.container
          .querySelector('[data-slot="code-block"]')
          ?.hasAttribute("data-highlighted"),
      )
      .toBe(true);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("styles inline code, table alignment and quotes", async () => {
    const screen = await render(<MessageResponse>{markdown}</MessageResponse>);
    const root = screen.container;
    expect(
      getComputedStyle(root.querySelector("p code")!).backgroundColor,
    ).not.toBe("rgba(0, 0, 0, 0)");
    const cell = [...root.querySelectorAll("td")].find(
      (td) => td.textContent === "$14.00",
    )!;
    expect(getComputedStyle(cell).textAlign).toBe("right");
    const status = [...root.querySelectorAll("th")].find(
      (th) => th.textContent === "Status",
    )!;
    expect(getComputedStyle(status).textAlign).toBe("center");
    const quote = getComputedStyle(root.querySelector("blockquote")!);
    expect(quote.borderLeftStyle).toBe("solid");
  });

  it("bounded tables cap at 12rem, scroll with the keyboard and keep a sticky header", async () => {
    const screen = await render(
      <MessageTableViewport bounded>
        <MessageResponse data-testid="bounded">{table}</MessageResponse>
      </MessageTableViewport>,
    );
    const bounded = region(screen.getByTestId("bounded").element());
    expect(bounded.getBoundingClientRect().height).toBeLessThanOrEqual(192.5);
    expect(bounded.scrollHeight).toBeGreaterThan(bounded.clientHeight);
    await userEvent.tab();
    expect(document.activeElement).toBe(bounded);
    expect(getComputedStyle(bounded).outlineStyle).toBe("solid");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await expect.poll(() => bounded.scrollTop).toBeGreaterThan(0);
    await userEvent.keyboard("{End}");
    await expect.poll(() => bounded.scrollTop).toBeGreaterThan(100);
    const header = bounded.querySelector("th")!.getBoundingClientRect();
    expect(header.top - bounded.getBoundingClientRect().top).toBeLessThan(1);
  });

  it("open tables grow to fit and scroll sideways on a phone", async () => {
    await page.viewport(390, 900);
    const screen = await render(
      <div style={{ padding: 16 }}>
        <MessageResponse data-testid="open">{table}</MessageResponse>
      </div>,
    );
    const response = screen.getByTestId("open").element();
    const open = region(response);
    expect(open.hasAttribute("data-bounded")).toBe(false);
    expect(getComputedStyle(open).overflowX).toBe("auto");
    expect(open.scrollHeight).toBeLessThanOrEqual(open.clientHeight + 1);
    expect(response.scrollWidth).toBeLessThanOrEqual(response.clientWidth + 1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("the streaming caret pulses only without reduced motion", async () => {
    const screen = await render(
      <MessageResponse streaming>Planting</MessageResponse>,
    );
    const caret = screen.container.querySelector(
      ".sprout-message-response-caret",
    )!;
    expect(getComputedStyle(caret).animationName).toBe(
      "sprout-message-response-pulse",
    );
    expect(caret.getBoundingClientRect().width).toBe(6);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(caret).animationName).toBe("none");
  });
});
