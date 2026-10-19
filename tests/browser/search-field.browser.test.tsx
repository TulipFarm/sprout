import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "../../packages/sprout/src/components/popover.js";
import { SearchField } from "../../packages/sprout/src/components/search-field.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

function Search({
  label,
  initial = "",
  ...props
}: {
  label: string;
  initial?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <SearchField label={label} value={value} onChange={setValue} {...props} />
  );
}

function Gallery() {
  return (
    <div style={{ display: "grid", gap: 12, padding: 16 }}>
      <Search label="Search models" />
      <Search label="Find agents" placeholder="Search agents" maxLength={120} />
      <Search label="Search Google Drive" initial="Board deck" />
      <div data-testid="long" style={{ width: 240 }}>
        <Search
          label="Search chats"
          initial="Quarterly planning notes for the platform reliability review"
        />
      </div>
      <fieldset
        disabled
        data-testid="disabled"
        style={{ border: 0, padding: 0 }}
      >
        <legend>Apps</legend>
        <Search label="Search apps" initial="Slack" />
      </fieldset>
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

const box = (label: string) => page.getByRole("searchbox", { name: label });
const field = (label: string) =>
  box(label).element().closest<HTMLElement>("[data-slot=search-field]")!;
const clearIn = (label: string) =>
  field(label).querySelector<HTMLElement>("[data-slot=search-field-clear]");

describe("SearchField in a real browser", () => {
  it.each(themes)("%s %s colors and axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    const filled = getComputedStyle(field("Search Google Drive"));
    expect(filled.backgroundColor).toBe(colorOf("--sprout-surface"));
    expect(filled.borderTopColor).toBe(colorOf("--sprout-input"));
    expect(getComputedStyle(box("Search models").element()).color).toBe(
      colorOf("--sprout-text"),
    );
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("matches Cloud dimensions and limits", async () => {
    await render(<Gallery />);
    const models = box("Search models");
    await expect
      .element(models)
      .toHaveAttribute("placeholder", "Search models");
    expect(getComputedStyle(models.element()).fontSize).toBe("14px");
    expect(getComputedStyle(field("Search models")).maxWidth).toBe("384px");
    for (const node of document.querySelectorAll<HTMLElement>(
      "[data-slot=search-field]",
    ))
      expect(node.getBoundingClientRect().height).toBe(32);
    expect(
      getComputedStyle(field("Search models").querySelector("svg")!).width,
    ).toBe("16px");
    const clear = getComputedStyle(clearIn("Search Google Drive")!);
    expect([clear.width, clear.height]).toEqual(["24px", "24px"]);

    const agents = box("Find agents");
    await agents.fill("x".repeat(200));
    await expect.element(agents).toHaveValue("x".repeat(120));

    const chats = box("Search chats").element();
    expect(chats.scrollWidth).toBeGreaterThan(chats.clientWidth);
    const long = page.getByTestId("long").element().getBoundingClientRect();
    expect(
      field("Search chats").getBoundingClientRect().right,
    ).toBeLessThanOrEqual(long.right + 0.5);
    await expect
      .element(page.getByTestId("long").getByRole("button"))
      .toBeVisible();
  });

  it("fits a 390px phone", async () => {
    await page.viewport(390, 800);
    await render(<Gallery />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const node of document.querySelectorAll("[data-slot=search-field]")) {
      const rect = node.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(390);
    }
  });

  it("types, clears with the button and Escape, and draws a focus ring", async () => {
    await render(<Search label="Search models" />);
    const input = box("Search models");
    const ring = () => getComputedStyle(field("Search models"));
    await userEvent.tab();
    await userEvent.keyboard("gpt");
    await expect.element(input).toHaveValue("gpt");
    expect(ring().outlineStyle).toBe("solid");
    expect(ring().outlineWidth).toBe("1px");
    await expect
      .poll(() => ring().borderTopColor)
      .toBe(colorOf("--sprout-border"));

    await userEvent.tab();
    const clear = page.getByRole("button", { name: "Clear search" });
    await expect.element(clear).toHaveFocus();
    expect(ring().outlineWidth).toBe("0px");
    await userEvent.keyboard("{Enter}");
    await expect.element(input).toHaveValue("");
    await expect.element(input).toHaveFocus();
    expect(clearIn("Search models")).toBeNull();

    await userEvent.keyboard("claude{Escape}");
    await expect.element(input).toHaveValue("");
    await expect.element(input).toHaveFocus();

    await userEvent.keyboard("x");
    await clear.click();
    await expect.element(input).toHaveValue("");
    await expect.element(input).toHaveFocus();

    (input.element() as HTMLElement).blur();
    await page
      .elementLocator(field("Search models").querySelector("svg")!)
      .click({ force: true });
    await expect.element(input).toHaveFocus();
  });

  it("in a popover, the first Escape clears and the second closes", async () => {
    await render(
      <Popover>
        <PopoverTrigger>Globex</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Customer</PopoverTitle>
          <Search label="Search Customer" />
        </PopoverContent>
      </Popover>,
    );
    await page.getByRole("button", { name: "Globex" }).click();
    const input = box("Search Customer");
    await expect.element(input).toBeVisible();
    await input.click();
    await userEvent.keyboard("zzz{Escape}");
    await expect.element(input).toHaveValue("");
    await expect.element(input).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.querySelector("[role=dialog]")).toBeNull();
  });

  it("a disabled fieldset disables the input and clear button", async () => {
    await render(<Gallery />);
    await expect.element(box("Search apps")).toBeDisabled();
    await expect.element(box("Search apps")).toHaveValue("Slack");
    await expect
      .element(page.getByTestId("disabled").getByRole("button"))
      .toBeDisabled();
    const style = getComputedStyle(field("Search apps"));
    expect(style.opacity).toBe("0.5");
    expect(style.backgroundColor).toBe(colorOf("--sprout-hover"));
  });

  it("transitions and the clear animation stop under reduced motion", async () => {
    await render(<Search label="Search models" initial="gpt" />);
    const group = () => getComputedStyle(field("Search models"));
    expect(group().transitionDuration).toContain("0.12s");
    expect(getComputedStyle(clearIn("Search models")!).animationDuration).toBe(
      "0.12s",
    );
    await emulate({ reducedMotion: true });
    expect(group().transitionDuration).toBe("0s");
    expect(getComputedStyle(clearIn("Search models")!).animationName).toBe(
      "none",
    );
  });
});
