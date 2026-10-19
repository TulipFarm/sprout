import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  PageActions,
  PageChromeContext,
  PageHeader,
  type PageChrome,
} from "../../packages/sprout/src/components/page-header.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const longTitle =
  "Quarterly reconciliation export for the northern greenhouse cooperative";

function Headers() {
  return (
    <main style={{ display: "grid", gap: 32, padding: 16, maxWidth: 720 }}>
      <PageHeader
        title="Usage"
        description="Credits used by every workspace this month."
        actions={<Button>New workflow</Button>}
      />
      <PageHeader
        title="Customer accounts"
        back={{ label: "Back to examples", link: <a href="#examples" /> }}
        parent={{ label: "Projects", link: <a href="#projects" /> }}
      />
      <PageActions>
        <Button variant="outline">Local page action</Button>
      </PageActions>
      <div data-testid="file">
        <PageHeader
          title={longTitle}
          actions={
            <>
              <Button variant="outline">Share</Button>
              <Button>Download</Button>
            </>
          }
        />
      </div>
    </main>
  );
}

function Chrome({ title }: { title: string }) {
  const [chrome, setChrome] = useState<PageChrome>({
    title: null,
    actions: null,
  });
  return (
    <div>
      <header
        aria-label="Workspace header"
        style={{ display: "flex", alignItems: "center", gap: 8, height: 44 }}
      >
        <div
          ref={(node) => {
            if (node && chrome.title !== node)
              setChrome((c) => ({ ...c, title: node }));
          }}
          style={{ display: "flex", flex: 1, minWidth: 0, gap: 4 }}
        />
        <div
          ref={(node) => {
            if (node && chrome.actions !== node)
              setChrome((c) => ({ ...c, actions: node }));
          }}
        />
      </header>
      <PageChromeContext value={chrome}>
        <PageHeader
          title={title}
          parent={{ label: "Tables", link: <a href="#tables" /> }}
          actions={<Button variant="outline">Change fields in chat</Button>}
          description="Every customer the team manages."
        />
      </PageChromeContext>
    </div>
  );
}

const box = (node: Element) => node.getBoundingClientRect();

describe("PageHeader in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Headers />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("titles, breadcrumb and inline actions keep their styles", async () => {
    const screen = await render(<Headers />);
    const usage = screen.getByRole("heading", { name: "Usage" }).element();
    expect(getComputedStyle(usage).fontSize).toBe("24px");
    const inline = screen.container.querySelector(
      '[data-slot="page-actions"][data-placement="inline"]',
    )!;
    expect(getComputedStyle(inline).justifyContent).toBe("flex-end");
    const action = screen
      .getByRole("button", { name: "Local page action" })
      .element();
    expect(Math.round(box(inline).right - box(action).right)).toBe(0);
    const separator = screen.container.querySelector(
      ".sprout-page-header-breadcrumb-separator svg",
    )!;
    expect([box(separator).width, box(separator).height]).toEqual([14, 14]);
  });

  it("long titles wrap and actions wrap below on mobile", async () => {
    await page.viewport(390, 900);
    const screen = await render(<Headers />);
    await settle();
    const file = screen.getByTestId("file").element();
    const title = box(file.querySelector("h1")!);
    expect(title.height).toBeGreaterThan(40);
    const actions = box(file.querySelector('[data-slot="page-actions"]')!);
    expect(actions.top).toBeGreaterThanOrEqual(title.bottom);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("back label hides below 640px but stays the accessible name", async () => {
    await page.viewport(390, 900);
    const screen = await render(<Headers />);
    const back = screen.getByRole("link", { name: "Back to examples" });
    await expect.element(back).toBeVisible();
    expect(box(back.element()).width).toBe(28);
    await page.viewport(1024, 900);
    await expect.poll(() => box(back.element()).width).toBeGreaterThan(80);
  });

  it("keyboard reaches links with a focus ring and focus can move to the title", async () => {
    function Focus() {
      const title = useRef<HTMLHeadingElement>(null);
      return (
        <>
          <Headers />
          <PageHeader
            title="Skills"
            focusable
            titleRef={title}
            actions={
              <Button onClick={() => title.current?.focus()}>
                Import skill
              </Button>
            }
          />
        </>
      );
    }
    const screen = await render(<Focus />);
    screen.getByRole("link", { name: "Back to examples" }).element().focus();
    await userEvent.tab();
    const crumb = screen.getByRole("link", { name: "Projects" });
    await expect.element(crumb).toHaveFocus();
    expect(getComputedStyle(crumb.element()).outlineStyle).toBe("solid");
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: "Local page action" }))
      .toHaveFocus();
    screen.getByRole("button", { name: "Import skill" }).element().focus();
    await userEvent.keyboard("{Enter}");
    const heading = screen.getByRole("heading", { name: "Skills" });
    await expect.element(heading).toHaveFocus();
    expect(getComputedStyle(heading.element()).outlineStyle).toBe("solid");
  });

  it("app header receives a truncating title, breadcrumb and actions", async () => {
    await page.viewport(390, 900);
    const screen = await render(<Chrome title={longTitle} />);
    const header = screen.getByRole("banner").element();
    const title = screen.getByRole("heading", { level: 1 });
    await expect.element(title).toHaveAttribute("data-placement", "chrome");
    expect(header.contains(title.element())).toBe(true);
    const css = getComputedStyle(title.element());
    expect(css.fontSize).toBe("14px");
    expect(css.whiteSpace).toBe("nowrap");
    expect(css.textOverflow).toBe("ellipsis");
    const node = title.element() as HTMLElement;
    expect(node.scrollWidth).toBeGreaterThan(node.clientWidth);
    expect(box(node).width).toBeGreaterThanOrEqual(40);
    expect(box(header).height).toBe(44);
    expect(
      header.contains(
        screen.getByRole("button", { name: "Change fields in chat" }).element(),
      ),
    ).toBe(true);
    expect(
      header.contains(
        screen.container.querySelector('[data-slot="page-description"]'),
      ),
    ).toBe(false);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("link color transition respects reduced motion", async () => {
    const screen = await render(<Headers />);
    const crumb = screen.getByRole("link", { name: "Projects" }).element();
    expect(getComputedStyle(crumb).transitionDuration).toBe("0.12s");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(crumb).transitionDuration).toBe("0s");
  });
});
