import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  Calendar,
  CalendarDayButton,
  calendarCaptionLayoutNames,
  type CalendarDayButtonProps,
} from "../packages/sprout/src/components/calendar.js";
import * as sprout from "../packages/sprout/src/index.js";

const today = new Date(2026, 9, 12);
const october = new Date(2026, 9, 1);

/** Every opening tag of a day button, keyed by its day of month. */
function dayButtons(html: string) {
  const buttons = new Map<number, string>();
  for (const match of html.matchAll(
    /<button[^>]*data-slot="calendar-day-button"[^>]*>(\d+)/g,
  )) {
    const tag = match[0];
    if (!/aria-label="[^"]*October/.test(tag)) continue;
    buttons.set(Number(match[1]), tag);
  }
  return buttons;
}

function cells(html: string) {
  return [...html.matchAll(/<td[^>]*role="gridcell"[^>]*>/g)].map(
    (match) => match[0],
  );
}

function weekdays(html: string) {
  return [
    ...html.matchAll(
      /<th[^>]*aria-label="([A-Za-z]+)"[^>]*class="[^"]*sprout-calendar-weekday/g,
    ),
  ].map((match) => match[1]);
}

describe("Calendar", () => {
  it("is exported from the package root with its day button", () => {
    expect(sprout.Calendar).toBe(Calendar);
    expect(sprout.CalendarDayButton).toBe(CalendarDayButton);
    expect(calendarCaptionLayoutNames).toEqual([
      "label",
      "dropdown",
      "dropdown-months",
      "dropdown-years",
    ]);
  });

  it("renders a single-date grid with Cloud's defaults: outside days, a month label, and ghost navigation", () => {
    const html = renderToString(
      <Calendar
        mode="single"
        selected={today}
        defaultMonth={october}
        today={today}
      />,
    );
    expect(html).toMatch(/<div[^>]*data-slot="calendar"/);
    expect(html).toMatch(
      /<div data-slot="calendar" class="[^"]*\bsprout-calendar(?:\s|")/,
    );
    expect(html).toContain('data-mode="single"');
    expect(html).toContain('data-caption-layout="label"');
    expect(html).toContain('data-button-variant="ghost"');
    expect(html).toMatch(
      /class="[^"]*sprout-calendar-caption-label[^"]*"[^>]*>October 2026</,
    );
    expect(html).toContain('role="grid"');
    expect(html).not.toContain("<select");

    const nav = html.match(
      /<button[^>]*aria-label="Go to the Previous Month"[^>]*>/,
    )![0];
    expect(nav).toContain("sprout-button-variant-ghost");
    expect(nav).toContain("sprout-calendar-nav-button");
    expect(
      html.match(/<button[^>]*aria-label="Go to the Next Month"[^>]*>/)![0],
    ).toContain("sprout-button-variant-ghost");

    // October 2026 starts on a Thursday, so September 27–30 show as outside days.
    expect(
      cells(html).filter((cell) => cell.includes('data-outside="true"')),
    ).toHaveLength(4);
    expect(
      cells(html).find((cell) => cell.includes('data-outside="true"')),
    ).toContain("sprout-calendar-outside");
    expect(weekdays(html)[0]).toBe("Sunday");

    const days = dayButtons(html);
    expect(days.size).toBe(31);
    expect(days.get(12)).toContain('data-selected-single="true"');
    expect(days.get(12)).toContain('tabindex="0"');
    expect(days.get(13)).toContain('data-selected-single="false"');
    expect(days.get(13)).toContain('tabindex="-1"');
    const todayCell = cells(html).find((cell) =>
      cell.includes('data-today="true"'),
    )!;
    expect(todayCell).toContain('data-selected="true"');
    expect(todayCell).toContain("sprout-calendar-today");
  });

  it("hides outside days when showOutsideDays is false", () => {
    const html = renderToString(
      <Calendar
        mode="single"
        showOutsideDays={false}
        defaultMonth={october}
        today={today}
      />,
    );
    expect(html).toContain("sprout-calendar-hidden");
    expect(html).not.toMatch(
      /data-slot="calendar-day-button"[^>]*aria-label="[^"]*September/,
    );
  });

  it("marks range start, middle, and end days", () => {
    const html = renderToString(
      <Calendar
        mode="range"
        selected={{ from: today, to: new Date(2026, 9, 16) }}
        defaultMonth={october}
        today={today}
      />,
    );
    const days = dayButtons(html);
    expect(days.get(12)).toContain('data-range-start="true"');
    expect(days.get(12)).toContain('data-selected-single="false"');
    for (const day of [13, 14, 15])
      expect(days.get(day)).toContain('data-range-middle="true"');
    expect(days.get(16)).toContain('data-range-end="true"');
    expect(days.get(17)).toContain('data-range-middle="false"');
    expect(html).toContain("sprout-calendar-range-start");
    expect(html).toContain("sprout-calendar-range-middle");
    expect(html).toContain("sprout-calendar-range-end");
  });

  it("selects several dates and disables weekends with a dayOfWeek matcher", () => {
    const html = renderToString(
      <Calendar
        mode="multiple"
        selected={[new Date(2026, 9, 13), new Date(2026, 9, 15)]}
        defaultMonth={october}
        today={today}
        disabled={{ dayOfWeek: [0, 6] }}
      />,
    );
    expect(html).toContain('data-mode="multiple"');
    const days = dayButtons(html);
    expect(days.get(13)).toContain('data-selected-single="true"');
    expect(days.get(15)).toContain('data-selected-single="true"');
    // October 17 and 18, 2026 are a Saturday and Sunday.
    expect(days.get(17)).toMatch(/ disabled=""/);
    expect(days.get(18)).toMatch(/ disabled=""/);
    expect(days.get(16)).not.toMatch(/ disabled=""/);
    expect(html).toContain("sprout-calendar-disabled");
  });

  it("uses Sprout selects for dropdown captions and outline navigation buttons", () => {
    const html = renderToString(
      <Calendar
        mode="single"
        selected={today}
        captionLayout="dropdown"
        buttonVariant="outline"
        defaultMonth={october}
        today={today}
      />,
    );
    expect(html).not.toContain("<select");
    expect(html).toContain('data-caption-layout="dropdown"');
    const month = html.match(
      /<button[^>]*aria-label="Choose the Month"[^>]*>/,
    )![0];
    const year = html.match(
      /<button[^>]*aria-label="Choose the Year"[^>]*>/,
    )![0];
    for (const trigger of [month, year]) {
      expect(trigger).toContain('role="combobox"');
      expect(trigger).toContain("sprout-select-trigger");
      expect(trigger).toContain("sprout-calendar-dropdown");
    }
    expect(html).toMatch(/aria-label="Choose the Month"[\s\S]*?>Oct</);
    expect(html).toMatch(/aria-label="Choose the Year"[\s\S]*?>2026</);
    expect(
      html.match(/<button[^>]*aria-label="Go to the Previous Month"[^>]*>/)![0],
    ).toContain("sprout-button-variant-outline");
  });

  it("supports month-only and year-only dropdowns", () => {
    const months = renderToString(
      <Calendar
        mode="single"
        captionLayout="dropdown-months"
        defaultMonth={october}
        today={today}
      />,
    );
    expect(months).toContain('aria-label="Choose the Month"');
    expect(months).not.toContain('aria-label="Choose the Year"');
    const years = renderToString(
      <Calendar
        mode="single"
        captionLayout="dropdown-years"
        defaultMonth={october}
        today={today}
      />,
    );
    expect(years).toContain('aria-label="Choose the Year"');
    expect(years).not.toContain('aria-label="Choose the Month"');
  });

  it("starts weeks on Monday with weekStartsOn 1, as on the calendar page", () => {
    const html = renderToString(
      <Calendar
        mode="single"
        weekStartsOn={1}
        selected={new Date(2026, 9, 19, 12)}
        defaultMonth={new Date(2026, 9, 19, 12)}
        today={today}
      />,
    );
    expect(weekdays(html)).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
    expect(dayButtons(html).get(19)).toContain('data-selected-single="true"');
  });

  it("renders week numbers and several months", () => {
    const html = renderToString(
      <Calendar
        mode="range"
        numberOfMonths={2}
        showWeekNumber
        weekStartsOn={1}
        selected={{ from: new Date(2026, 9, 26), to: new Date(2026, 10, 6) }}
        defaultMonth={october}
        today={today}
      />,
    );
    expect(html).toContain("data-week-numbers");
    expect(html).toContain("data-multiple-months");
    expect(html).toContain("sprout-calendar-week-number-header");
    expect(html).toMatch(
      /<th[^>]*class="[^"]*sprout-calendar-week-number [^>]*><div class="sprout-calendar-week-number-cell">\d+</,
    );
    expect(html).toContain(">October 2026<");
    expect(html).toContain(">November 2026<");
  });

  it("merges custom classNames, formatters, and components over Sprout's", () => {
    function EventDay({ children, ...props }: CalendarDayButtonProps) {
      return (
        <CalendarDayButton {...props} className="event-day">
          {children}
          {props.day.isoDate === "2026-10-12" && <span>3</span>}
        </CalendarDayButton>
      );
    }
    const html = renderToString(
      <Calendar
        mode="single"
        defaultMonth={october}
        today={today}
        classNames={{ caption_label: "custom-caption" }}
        formatters={{
          formatCaption: (month) => `Plan · ${month.getFullYear()}`,
        }}
        components={{ DayButton: EventDay }}
      />,
    );
    expect(html).toMatch(/class="custom-caption"[^>]*>Plan · 2026</);
    expect(html).toMatch(
      /class="[^"]*sprout-calendar-day-button[^"]*event-day[^"]*"[^>]*>12<span>3<\/span>/,
    );
  });

  it("formats data-day with the calendar locale", () => {
    const html = renderToString(
      <Calendar
        mode="single"
        defaultMonth={october}
        today={today}
        locale={{ code: "de-DE" }}
      />,
    );
    expect(html).toContain('data-day="12.10.2026"');
    expect(html).toContain('lang="de-DE"');
  });

  it("renders a read-only grid without day buttons when there is no mode", () => {
    const html = renderToString(
      <Calendar defaultMonth={october} today={today} />,
    );
    expect(html).not.toContain('data-slot="calendar-day-button"');
    expect(html).toContain('role="grid"');
  });
});
