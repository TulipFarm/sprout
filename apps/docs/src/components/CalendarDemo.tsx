import { useState, type ReactNode } from "react";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { ChevronLeft } from "reicon-react/icons/ChevronLeft";
import { ChevronRight } from "reicon-react/icons/ChevronRight";
import { Button } from "@tulipfarm/sprout/button";
import {
  Calendar,
  CalendarDayButton,
  type CalendarDayButtonProps,
  type DateRange,
} from "@tulipfarm/sprout/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@tulipfarm/sprout/popover";
import DocsSelect from "./DocsSelect";
import { Example, Row } from "./dialog-demo-parts";
import "../styles/calendar-demo.css";

/* Sample data uses a fixed "today" so every reader sees the same month. */
const today = new Date(2026, 9, 12);
const october = new Date(2026, 9, 1);

const long = (date: Date) =>
  date.toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const short = (date: Date) =>
  date.toLocaleDateString("en", { month: "short", day: "numeric" });

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="calendar-demo-status">
      {children}
    </p>
  );
}

function rangeText(range: DateRange | undefined) {
  if (!range?.from) return "No dates selected.";
  if (!range.to) return `From ${short(range.from)}. Pick an end date.`;
  return `${short(range.from)} – ${short(range.to)}`;
}

function datesText(dates: Date[] | undefined) {
  if (!dates?.length) return "No dates selected.";
  return [...dates]
    .sort((a, b) => a.getTime() - b.getTime())
    .map(short)
    .join(", ");
}

/* ------------------------------------------------------------------ */
/* Playground                                                          */
/* ------------------------------------------------------------------ */

type Mode = "single" | "range" | "multiple";
type Caption = "label" | "dropdown";
type Nav = "ghost" | "outline";

function Toggle({
  label,
  pressed,
  onChange,
}: {
  label: string;
  pressed: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Button
      size="sm"
      variant={pressed ? "secondary" : "outline"}
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
    >
      {label}
    </Button>
  );
}

export function CalendarPlayground() {
  const [mode, setMode] = useState<Mode>("single");
  const [caption, setCaption] = useState<Caption>("label");
  const [nav, setNav] = useState<Nav>("ghost");
  const [weekStart, setWeekStart] = useState<"0" | "1">("0");
  const [outside, setOutside] = useState(true);
  const [weekNumbers, setWeekNumbers] = useState(false);
  const [weekends, setWeekends] = useState(false);
  const [date, setDate] = useState<Date | undefined>(today);
  const [range, setRange] = useState<DateRange | undefined>({
    from: today,
    to: new Date(2026, 9, 16),
  });
  const [dates, setDates] = useState<Date[] | undefined>([
    new Date(2026, 9, 13),
    new Date(2026, 9, 15),
  ]);
  const shared = {
    defaultMonth: october,
    today,
    captionLayout: caption,
    buttonVariant: nav,
    weekStartsOn: Number(weekStart) as 0 | 1,
    showOutsideDays: outside,
    showWeekNumber: weekNumbers,
    disabled: weekends ? { dayOfWeek: [0, 6] } : undefined,
  };
  return (
    <div className="calendar-demo-playground">
      <div
        className="calendar-demo-controls"
        role="group"
        aria-label="Calendar options"
      >
        <DocsSelect
          label="Mode"
          value={mode}
          onValueChange={setMode}
          items={[
            { value: "single", label: "Single date" },
            { value: "range", label: "Date range" },
            { value: "multiple", label: "Multiple dates" },
          ]}
        />
        <DocsSelect
          label="Caption"
          value={caption}
          onValueChange={setCaption}
          items={[
            { value: "label", label: "Month label" },
            { value: "dropdown", label: "Month and year menus" },
          ]}
        />
        <DocsSelect
          label="Navigation buttons"
          value={nav}
          onValueChange={setNav}
          items={[
            { value: "ghost", label: "Ghost buttons" },
            { value: "outline", label: "Outline buttons" },
          ]}
        />
        <DocsSelect
          label="Week starts on"
          value={weekStart}
          onValueChange={setWeekStart}
          items={[
            { value: "0", label: "Sunday first" },
            { value: "1", label: "Monday first" },
          ]}
        />
        <Toggle label="Outside days" pressed={outside} onChange={setOutside} />
        <Toggle
          label="Week numbers"
          pressed={weekNumbers}
          onChange={setWeekNumbers}
        />
        <Toggle label="No weekends" pressed={weekends} onChange={setWeekends} />
      </div>
      <div className="calendar-demo-stage">
        {mode === "single" ? (
          <Calendar
            {...shared}
            mode="single"
            selected={date}
            onSelect={setDate}
          />
        ) : mode === "range" ? (
          <Calendar
            {...shared}
            mode="range"
            selected={range}
            onSelect={setRange}
          />
        ) : (
          <Calendar
            {...shared}
            mode="multiple"
            selected={dates}
            onSelect={setDates}
          />
        )}
        <Status>
          {mode === "single"
            ? date
              ? long(date)
              : "No date selected."
            : mode === "range"
              ? rangeText(range)
              : datesText(dates)}
        </Status>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selection modes (internal playground parity)                        */
/* ------------------------------------------------------------------ */

export function CalendarSelection() {
  const [date, setDate] = useState<Date | undefined>(today);
  const [range, setRange] = useState<DateRange | undefined>({
    from: today,
    to: new Date(2026, 9, 16),
  });
  const [dates, setDates] = useState<Date[] | undefined>([
    new Date(2026, 9, 13),
    new Date(2026, 9, 15),
  ]);
  return (
    <Example
      title="Selection modes"
      description="Click a selected date again to clear it. Weekends are disabled in the multiple-date calendar."
    >
      <Row
        label="Single date"
        note='mode="single" · ghost nav · label caption · Sunday first'
      >
        <div className="calendar-demo-stack">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            defaultMonth={october}
            today={today}
          />
          <Status>{date ? long(date) : "No date selected."}</Status>
        </div>
      </Row>
      <Row
        label="Date range"
        note='mode="range" · Oct 12 – 16 · start, middle, and end days'
      >
        <div className="calendar-demo-stack">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            defaultMonth={october}
            today={today}
          />
          <Status>{rangeText(range)}</Status>
        </div>
      </Row>
      <Row
        label="Multiple dates"
        note='mode="multiple" · disabled={{ dayOfWeek: [0, 6] }}'
      >
        <div className="calendar-demo-stack">
          <Calendar
            mode="multiple"
            selected={dates}
            onSelect={setDates}
            defaultMonth={october}
            today={today}
            disabled={{ dayOfWeek: [0, 6] }}
          />
          <Status>{datesText(dates)}</Status>
        </div>
      </Row>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Captions and navigation buttons                                     */
/* ------------------------------------------------------------------ */

export function CalendarCaptions() {
  const [ghost, setGhost] = useState<Date | undefined>(today);
  const [outline, setOutline] = useState<Date | undefined>(today);
  return (
    <Example
      title="Captions and navigation"
      description="Month and year menus are Sprout selects, never native ones. Years run from 100 years ago to this year."
    >
      <Row
        label="Month label"
        note='captionLayout="label" · buttonVariant="ghost" (defaults)'
      >
        <Calendar
          mode="single"
          selected={ghost}
          onSelect={setGhost}
          defaultMonth={october}
          today={today}
        />
      </Row>
      <Row
        label="Dropdown captions"
        note='captionLayout="dropdown" · buttonVariant="outline"'
      >
        <Calendar
          mode="single"
          selected={outline}
          onSelect={setOutline}
          captionLayout="dropdown"
          buttonVariant="outline"
          defaultMonth={october}
          today={today}
        />
      </Row>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Date picker in a popover (Cloud calendar page)                      */
/* ------------------------------------------------------------------ */

const monthTitle = (date: Date) =>
  date.toLocaleDateString("en", { month: "long", year: "numeric" });
const monthShort = (date: Date) =>
  date.toLocaleDateString("en", { month: "short", year: "numeric" });

function moveWeek(date: Date, by: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + by * 7);
  return next;
}

export function CalendarDatePicker() {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(new Date(2026, 9, 19, 12));
  const title = monthTitle(day);
  return (
    <Example
      title="Date picker"
      description="The calendar page opens a Monday-first calendar from its month title. Picking a date closes the popover and moves the view."
    >
      <Row
        label="Toolbar title"
        note="ghost calendar-title trigger · PopoverContent align start · weekStartsOn 1"
      >
        <div className="calendar-demo-toolbar">
          <Button
            variant="ghost"
            size="calendar-icon"
            aria-label="Previous range"
            onClick={() => setDay(moveWeek(day, -1))}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
          <Popover open={open} onOpenChange={setOpen}>
            <h2 className="calendar-demo-title" aria-label={title}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="calendar-title"
                    aria-label="Choose date"
                  />
                }
              >
                <span className="calendar-demo-title-full">{title}</span>
                <span className="calendar-demo-title-short">
                  {monthShort(day)}
                </span>
                <ChevronDown size={14} aria-hidden="true" />
              </PopoverTrigger>
            </h2>
            <PopoverContent align="start" aria-label="Choose a calendar date">
              <Calendar
                mode="single"
                weekStartsOn={1}
                today={today}
                selected={day}
                defaultMonth={day}
                onSelect={(date) => {
                  if (date) {
                    setOpen(false);
                    setDay(
                      new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                        12,
                      ),
                    );
                  }
                }}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="calendar-icon"
            aria-label="Next range"
            onClick={() => setDay(moveWeek(day, 1))}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </div>
        <Status>Showing the week of {long(day)}.</Status>
      </Row>
    </Example>
  );
}

/* ------------------------------------------------------------------ */
/* Layout and custom days                                              */
/* ------------------------------------------------------------------ */

const eventCounts: Record<string, number> = {
  "2026-10-05": 2,
  "2026-10-07": 1,
  "2026-10-12": 3,
  "2026-10-14": 1,
  "2026-10-19": 4,
  "2026-10-22": 2,
  "2026-10-28": 1,
};

function EventDay({ children, ...props }: CalendarDayButtonProps) {
  const count = eventCounts[props.day.isoDate];
  return (
    <CalendarDayButton {...props}>
      {children}
      {count ? <span aria-hidden="true">{count}</span> : null}
    </CalendarDayButton>
  );
}

export function CalendarLayouts() {
  const [leave, setLeave] = useState<DateRange | undefined>({
    from: new Date(2026, 9, 26),
    to: new Date(2026, 10, 6),
  });
  const [day, setDay] = useState<Date | undefined>(today);
  return (
    <Example
      title="Layout and custom days"
      description="Show week numbers and two months for longer ranges. Add content under each date with CalendarDayButton."
    >
      <Row
        label="Out of office"
        note="numberOfMonths 2 · showWeekNumber · weekStartsOn 1 · range across months"
      >
        <div className="calendar-demo-stack">
          <Calendar
            mode="range"
            numberOfMonths={2}
            showWeekNumber
            weekStartsOn={1}
            selected={leave}
            onSelect={setLeave}
            defaultMonth={october}
            today={today}
          />
          <Status>{rangeText(leave)}</Status>
        </div>
      </Row>
      <Row
        label="Event counts"
        note="components.DayButton → CalendarDayButton · --sprout-calendar-cell 2.25rem"
      >
        <div className="calendar-demo-stack">
          <Calendar
            mode="single"
            className="calendar-demo-roomy"
            selected={day}
            onSelect={setDay}
            defaultMonth={october}
            today={today}
            components={{ DayButton: EventDay }}
          />
          <Status>
            {day
              ? `${long(day)} · ${eventCounts[isoDay(day)] ?? 0} events`
              : "No date selected."}
          </Status>
        </div>
      </Row>
    </Example>
  );
}
