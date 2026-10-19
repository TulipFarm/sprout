import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "../../packages/sprout/src/components/menubar.js";
import { axeViolations, emulate, setTheme, settle } from "./support.js";

const Icon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 3h10v10H3z" fill="none" stroke="currentColor" />
  </svg>
);

function App({ onAction = () => {} }: { onAction?: (name: string) => void }) {
  const [sidebar, setSidebar] = useState(true);
  const [density, setDensity] = useState("comfortable");
  return (
    <div style={{ padding: 16 }}>
      <Menubar aria-label="Application menu">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => onAction("new")}>
              <Icon />
              New draft<MenubarShortcut>⌘ N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled>Print</MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger>Open recent</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>
                  <span
                    data-testid="long"
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Field notes from the north greenhouse, week 14 — irrigation
                    and seedling counts.md
                  </span>
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem variant="destructive">
              <Icon />
              Discard draft
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarGroup>
              <MenubarLabel inset>Panels</MenubarLabel>
              <MenubarCheckboxItem
                checked={sidebar}
                onCheckedChange={setSidebar}
              >
                Show sidebar
              </MenubarCheckboxItem>
            </MenubarGroup>
            <MenubarRadioGroup value={density} onValueChange={setDensity}>
              <MenubarRadioItem value="compact">Compact</MenubarRadioItem>
              <MenubarRadioItem value="comfortable">
                Comfortable
              </MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarItem inset>Reset view</MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger>More</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Zoom in</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Help</MenubarTrigger>
          <MenubarContent align="end" alignOffset={-4}>
            <MenubarItem>
              Keyboard shortcuts<MenubarShortcut>⌘ /</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
}

const trigger = (name: string) =>
  page.getByRole("menubar").getByRole("menuitem", { name, exact: true });
const item = (name: RegExp | string) => page.getByRole("menuitem", { name });
const content = () =>
  document.querySelector<HTMLElement>('[data-slot="menubar-content"]')!;
const subContent = () =>
  document.querySelector<HTMLElement>('[data-slot="menubar-sub-content"]')!;

/** The menu stays in the viewport, and nothing inside it spills sideways. */
function contained(menu: Element) {
  const box = menu.getBoundingClientRect();
  return {
    inViewport:
      box.left >= 0 &&
      box.top >= 0 &&
      box.right <= innerWidth + 0.5 &&
      box.bottom <= innerHeight + 0.5,
    inside: [...menu.querySelectorAll("*")].every((child) => {
      const rect = child.getBoundingClientRect();
      return (
        !rect.width ||
        (rect.left >= box.left - 1 && rect.right <= box.right + 1)
      );
    }),
    noScroll: menu.scrollWidth <= menu.clientWidth + 1,
  };
}
const fits = { inViewport: true, inside: true, noScroll: true };

const textStart = (node: Element) =>
  node.getBoundingClientRect().left +
  parseFloat(getComputedStyle(node).paddingLeft);

/** Tabs from the top of the page, whatever the previous test left focused. */
async function tabFromStart() {
  const start = document.createElement("button");
  document.body.prepend(start);
  start.focus();
  await userEvent.tab();
  start.remove();
}

describe("Menubar in a real browser", () => {
  for (const mode of ["light", "dark"] as const)
    it(`${mode} mode passes axe with a menu open and places it under its trigger`, async () => {
      setTheme("neutral", mode);
      await render(<App />);
      await settle();
      expect(await axeViolations()).toEqual([]);
      expect(getComputedStyle(page.getByRole("menubar").element()).height).toBe(
        "32px",
      );
      const file = trigger("File").element().getBoundingClientRect();
      await trigger("File").click();
      await settle();
      const box = content().getBoundingClientRect();
      expect(box.width).toBeGreaterThanOrEqual(144);
      expect(Math.abs(box.x - (file.x - 4))).toBeLessThanOrEqual(1);
      expect(Math.abs(box.y - (file.bottom + 8))).toBeLessThanOrEqual(1);
      expect(contained(content())).toEqual(fits);
      await item(/New draft/).hover();
      expect(await axeViolations()).toEqual([]);
    });

  it("disabled items fade and can't be chosen; destructive items change tone", async () => {
    const actions: string[] = [];
    await render(<App onAction={(name) => actions.push(name)} />);
    await trigger("File").click();
    await expect
      .element(trigger("File"))
      .toHaveAttribute("data-popup-open", "");
    const print = item("Print");
    await expect.element(print).toHaveAttribute("aria-disabled", "true");
    expect(getComputedStyle(print.element()).opacity).toBe("0.5");
    await print.click({ force: true });
    await expect.element(page.getByRole("menu")).toBeVisible();
    const discard = item("Discard draft").element();
    const draft = item(/New draft/).element();
    expect(getComputedStyle(discard).color).not.toBe(
      getComputedStyle(draft).color,
    );
    expect(getComputedStyle(discard.querySelector("svg")!).width).toBe("16px");
    await item(/New draft/).click();
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    expect(actions).toEqual(["new"]);
  });

  it("labels, inset rows and checkable rows share one text column", async () => {
    await render(<App />);
    await trigger("View").click();
    await settle();
    const label = document.querySelector('[data-slot="menubar-label"]')!;
    const outline = page
      .getByRole("menuitemcheckbox", { name: "Show sidebar" })
      .element();
    const reset = item("Reset view").element();
    expect(textStart(label)).toBe(textStart(outline));
    expect(textStart(reset)).toBe(textStart(outline));
  });

  it("submenus and long names stay inside the viewport and truncate", async () => {
    await page.viewport(390, 700);
    await render(<App />);
    await trigger("File").click();
    await item("Open recent").hover();
    await expect.element(page.getByTestId("long")).toBeVisible();
    await settle();
    expect(contained(content())).toEqual(fits);
    expect(contained(subContent())).toEqual(fits);
    const long = page.getByTestId("long").element();
    expect(long.scrollWidth).toBeGreaterThan(long.clientWidth);
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Escape}");
    await trigger("Help").click();
    await settle();
    expect(contained(content())).toEqual(fits);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("keyboard moves between menus, opens them, and returns focus", async () => {
    await render(<App />);
    const file = trigger("File");
    const view = trigger("View");
    await tabFromStart();
    await expect.element(file).toHaveFocus();
    expect(getComputedStyle(file.element()).outlineStyle).toBe("solid");
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(view).toHaveFocus();
    expect(getComputedStyle(view.element()).outlineStyle).toBe("solid");
    await userEvent.keyboard("{ArrowLeft}");
    await expect.element(file).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    await expect.element(item(/New draft/)).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(item("Print")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(item("Open recent")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(item("Discard draft")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    const sidebar = page.getByRole("menuitemcheckbox", {
      name: "Show sidebar",
    });
    await expect.element(sidebar).toBeVisible();
    await expect.element(view).toHaveAttribute("data-popup-open", "");
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(sidebar).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(sidebar).toHaveAttribute("aria-checked", "false");
    await userEvent.keyboard("m");
    await expect.element(item("More")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(item("Zoom in")).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect.element(item("More")).toHaveFocus();
    await expect.poll(subContent).toBeNull();
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    await expect.element(view).toHaveFocus();
  });

  it("menus fade over the fast motion token, and reduced motion removes it", async () => {
    await render(<App />);
    await trigger("File").click();
    await expect
      .poll(() => getComputedStyle(content()).transitionDuration)
      .toBe("0.12s, 0.12s");
    await userEvent.keyboard("{Escape}");
    await expect.poll(content).toBeNull();
    await emulate({ reducedMotion: true });
    await trigger("File").click();
    await expect.element(page.getByRole("menu")).toBeVisible();
    await expect
      .poll(() => content().hasAttribute("data-starting-style"))
      .toBe(false);
    expect(getComputedStyle(content()).transitionDuration).toBe("0s");
  });
});
