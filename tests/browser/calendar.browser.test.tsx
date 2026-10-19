import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { useState } from "react";
import {
  Calendar,
  type DateRange,
} from "../../packages/sprout/src/components/calendar.js";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../packages/sprout/src/components/popover.js";
import {
  axeViolations,
  emulate,
  setTheme,
  settle,
  size,
  themes,
} from "./support.js";

const october = new Date(2026, 9, 1);
const today = new Date(2026, 9, 12);
const day = (n: number, month = 9) => new Date(2026, month, n);

function Single() {
  const [selected, setSelected] = useState<Date | undefined>(day(12));
  return (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={setSelected}
      defaultMonth={october}
      today={today}
    />
  );
}

function Range() {
  const [selected, setSelected] = useState<DateRange | undefined>({
    from: day(12),
    to: day(16),
  });
  return (
    <Calendar
      mode="range"
      selected={selected}
      onSelect={setSelected}
      defaultMonth={october}
      today={today}
    />
  );
}

function Multiple() {
  const [selected, setSelected] = useState<Date[] | undefined>([
    day(13),
    day(15),
  ]);
  return (
    <Calendar
      mode="multiple"
      selected={selected}
      onSelect={setSelected}
      disabled={{ dayOfWeek: [0, 6] }}
      defaultMonth={october}
      today={today}
    />
  );
}

function Dropdowns() {
  return (
    <Calendar
      mode="single"
      captionLayout="dropdown"
      buttonVariant="outline"
      startMonth={new Date(2020, 0)}
      endMonth={new Date(2030, 11)}
      defaultMonth={october}
      today={today}
    />
  );
}

function Picker() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(day(19));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="calendar-title" />}>
        Choose date
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="Choose a calendar date">
        <Calendar
          mode="single"
          weekStartsOn={1}
          today={today}
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return;
            setOpen(false);
            setSelected(date);
          }}
        />
      </PopoverContent>
      <output>{selected.toDateString()}</output>
    </Popover>
  );
}

function Gallery() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16 }}>
      <Single />
      <Range />
      <Multiple />
      <Dropdowns />
    </div>
  );
}

const dayButton = (name: RegExp) => page.getByRole("button", { name });

/** Every visible calendar fits its own box: no cell or caption spills sideways. */
function spills() {
  return [...document.querySelectorAll('[data-slot="calendar"]')].flatMap(
    (calendar) => {
      const box = calendar.getBoundingClientRect();
      if (!box.width) return [];
      const children = [...calendar.querySelectorAll("*")].filter((child) => {
        const rect = child.getBoundingClientRect();
        // Base UI keeps a 1px visually hidden input beside each select trigger.
        if (rect.width <= 1 || child.matches('input[aria-hidden="true"]'))
          return false;
        return rect.left < box.left - 1 || rect.right > box.right + 1;
      });
      return [
        ...children.map((child) => `${child.tagName}.${child.className}`),
        ...(calendar.scrollWidth > calendar.clientWidth ? ["scroll"] : []),
        ...(box.right > innerWidth + 0.5 ? ["viewport"] : []),
      ];
    },
  );
}

function insideViewport(node: Element) {
  const box = node.getBoundingClientRect();
  return box.left >= 0 && box.right <= innerWidth + 0.5;
}

describe("Calendar in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe and paints the selected day",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(<Gallery />);
      await settle();
      const selected = getComputedStyle(
        screen
          .getByRole("button", { name: /October 12th, 2026, selected/ })
          .first()
          .element(),
      );
      expect(selected.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(selected.backgroundColor).not.toBe(selected.color);
      expect(spills()).toEqual([]);
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("single calendar supports the full keyboard flow with a focus ring", async () => {
    await render(<Single />);
    const selected = dayButton(/October 12th, 2026, selected/);
    await expect.element(selected).toHaveAttribute("tabindex", "0");
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await expect.element(selected).toHaveFocus();
    expect(getComputedStyle(selected.element()).outlineStyle).toBe("solid");

    await userEvent.keyboard("{ArrowRight}");
    await expect.element(dayButton(/October 13th, 2026/)).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(dayButton(/October 20th, 2026/)).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(dayButton(/October 20th, 2026, selected/))
      .toHaveAttribute("data-selected-single", "true");
    await userEvent.keyboard("{PageDown}");
    await expect
      .element(page.getByRole("grid", { name: "November 2026" }))
      .toBeVisible();
    await expect.element(dayButton(/November 20th, 2026/)).toHaveFocus();
    await userEvent.keyboard("{PageUp}");
    await expect
      .element(page.getByRole("grid", { name: "October 2026" }))
      .toBeVisible();
  });

  it("range ends and the band paint differently", async () => {
    await render(<Range />);
    const start = dayButton(/October 12th/);
    const middle = dayButton(/October 14th/);
    await expect.element(start).toHaveAttribute("data-range-start", "true");
    await expect.element(middle).toHaveAttribute("data-range-middle", "true");
    const startBg = getComputedStyle(start.element()).backgroundColor;
    const middleBg = getComputedStyle(middle.element()).backgroundColor;
    expect(middleBg).not.toBe("rgba(0, 0, 0, 0)");
    expect(startBg).not.toBe(middleBg);
    expect(getComputedStyle(middle.element()).borderRadius).toBe("0px");
    await dayButton(/October 20th/).click();
    await expect
      .element(dayButton(/October 20th/))
      .toHaveAttribute("data-range-end", "true");
  });

  it("disabled weekends fade while other days stay pickable", async () => {
    await render(<Multiple />);
    const saturday = dayButton(/Saturday, October 17th/);
    await expect.element(saturday).toBeDisabled();
    expect(Number(getComputedStyle(saturday.element()).opacity)).toBeLessThan(
      1,
    );
    await dayButton(/October 21st/).click();
    await expect
      .element(dayButton(/October 21st, 2026, selected/))
      .toBeVisible();
  });

  it("dropdown captions open Sprout selects and keep focus", async () => {
    await render(<Dropdowns />);
    const month = page.getByRole("combobox", { name: "Choose the Month" });
    const year = page.getByRole("combobox", { name: "Choose the Year" });
    await expect.element(month).toHaveTextContent("Oct");
    expect(
      page.getByRole("button", { name: "Go to the Next Month" }).element()
        .className,
    ).toContain("sprout-button-variant-outline");
    (month.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    const listbox = page.getByRole("listbox");
    await expect.element(listbox).toBeVisible();
    expect(page.getByRole("option").elements()).toHaveLength(12);
    await page.getByRole("option", { name: "Mar", exact: true }).click();
    await expect.element(listbox).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("grid", { name: "March 2026" }))
      .toBeVisible();
    await expect.element(month).toHaveFocus();

    await year.click();
    await expect
      .element(page.getByRole("option", { name: "2026", exact: true }))
      .toBeInViewport();
    await page.getByRole("option", { name: "2024", exact: true }).click();
    await expect
      .element(page.getByRole("grid", { name: "March 2024" }))
      .toBeVisible();
    await page.getByRole("button", { name: "Go to the Next Month" }).click();
    await expect.element(month).toHaveTextContent("Apr");
  });

  it("the date picker popover is Monday-first, picks by keyboard, and returns focus", async () => {
    await render(<Picker />);
    const trigger = page.getByRole("button", { name: "Choose date" });
    (trigger.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    const popup = page.getByRole("dialog", { name: "Choose a calendar date" });
    await expect.element(popup).toBeVisible();
    await settle();
    const headers = [
      ...popup.element().querySelectorAll("th.sprout-calendar-weekday"),
    ].map((cell) => cell.getAttribute("aria-label"));
    expect([headers[0], headers[6]]).toEqual(["Monday", "Sunday"]);
    const selected = dayButton(/October 19th, 2026, selected/);
    for (let i = 0; i < 4 && document.activeElement !== selected.element(); i++)
      await userEvent.tab();
    await expect.element(selected).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await expect.element(popup).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Mon Nov 02 2026");
    await expect.element(trigger).toHaveFocus();
    await trigger.click();
    await expect.element(popup).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(popup).not.toBeInTheDocument();
  });

  it("two months sit side by side on desktop and stack on a phone", async () => {
    const twoMonths = (
      <Calendar
        mode="range"
        numberOfMonths={2}
        showWeekNumber
        weekStartsOn={1}
        defaultMonth={october}
        defaultSelected={{ from: day(26), to: day(6, 10) }}
        today={today}
      />
    );
    const screen = await render(twoMonths);
    const grids = () =>
      [...screen.container.querySelectorAll('[role="grid"]')].map((grid) =>
        grid.getBoundingClientRect(),
      );
    expect(grids()[1]!.left).toBeGreaterThan(grids()[0]!.right);
    expect(spills()).toEqual([]);
    await page.viewport(390, 844);
    await settle();
    expect(grids()[1]!.top).toBeGreaterThan(grids()[0]!.bottom);
    expect(spills()).toEqual([]);
  });

  it("fits a 390px phone, popups included", async () => {
    await page.viewport(390, 844);
    await render(
      <div style={{ display: "grid", gap: 16, padding: 16 }}>
        <Gallery />
        <Picker />
      </div>,
    );
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    expect(spills()).toEqual([]);
    await page.getByRole("combobox", { name: "Choose the Year" }).click();
    await settle();
    expect(insideViewport(page.getByRole("listbox").element())).toBe(true);
    await userEvent.keyboard("{Escape}");
    await page.getByRole("button", { name: "Choose date" }).click();
    await settle();
    expect(insideViewport(page.getByRole("dialog").element())).toBe(true);
    expect(spills()).toEqual([]);
  });

  it("day buttons ease within 120–180ms, and not with reduced motion", async () => {
    await render(<Single />);
    const button = document.querySelector('[data-slot="calendar-day-button"]')!;
    const durations = getComputedStyle(button)
      .transitionDuration.split(",")
      .map((value) => parseFloat(value) * 1000);
    expect(durations.some((ms) => ms > 0)).toBe(true);
    for (const ms of durations)
      expect(ms === 0 || (ms >= 120 && ms <= 180)).toBe(true);
    expect(size(button)).toEqual([28, 28]);
    await emulate({ reducedMotion: true });
    expect(
      getComputedStyle(button)
        .transitionDuration.split(",")
        .every((value) => parseFloat(value) === 0),
    ).toBe(true);
  });
});
