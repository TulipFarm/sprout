'use client';

import { useEffect, useRef, type ChangeEvent, type ComponentProps } from 'react';
import {
  DayPicker,
  getDefaultClassNames,
  type ChevronProps,
  type DayButtonProps,
  type DropdownProps,
  type RootProps,
  type WeekNumberProps,
  useDayPicker,
} from 'react-day-picker';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { ChevronLeft } from 'reicon-react/icons/ChevronLeft';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { cn } from '../internal/classes.js';
import { Button, buttonVariants, type ButtonVariant } from './button.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select.js';

export type { DateRange, Matcher } from 'react-day-picker';

export const calendarCaptionLayoutNames = ['label', 'dropdown', 'dropdown-months', 'dropdown-years'] as const;

export type CalendarCaptionLayout = (typeof calendarCaptionLayoutNames)[number];

export type CalendarProps = ComponentProps<typeof DayPicker> & {
  /** The Button variant for the previous and next month buttons. Defaults to `ghost`. */
  buttonVariant?: ButtonVariant;
};

type DayPickerLocale = ComponentProps<typeof DayPicker>['locale'];

function CalendarRoot({ className, rootRef, ...props }: RootProps) {
  return <div data-slot="calendar" ref={rootRef} className={className} {...props} />;
}

function CalendarChevron({ className, orientation, size: _size, disabled: _disabled, ...props }: ChevronProps) {
  const Icon = orientation === 'left' ? ChevronLeft : orientation === 'right' ? ChevronRight : ChevronDown;
  return <Icon aria-hidden="true" className={cn('sprout-calendar-chevron', className)} {...props} />;
}

function CalendarWeekNumber({ children, week: _week, ...props }: WeekNumberProps) {
  return (
    <th {...props}>
      <div className="sprout-calendar-week-number-cell">{children}</div>
    </th>
  );
}

/** Month and year pickers use a Base UI select, never a native `<select>`. */
function CalendarDropdown({
  options = [],
  value,
  onChange,
  disabled,
  className,
  style,
  'aria-label': label,
}: DropdownProps) {
  const items = options.map(option => ({
    value: option.value,
    label: option.label,
  }));
  return (
    <Select<number>
      items={items}
      value={Number(value)}
      disabled={disabled}
      onValueChange={next => {
        if (next === null) return;
        onChange?.({
          target: { value: String(next) },
        } as ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger size="sm" aria-label={label} style={style} className={cn('sprout-calendar-dropdown', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="sprout-calendar-dropdown-content">
        {options.map(option => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * A month grid for picking one date, several dates, or a range. It takes every
 * React DayPicker prop, including `mode`, `selected`, `onSelect`,
 * `defaultMonth`, `disabled`, `weekStartsOn`, `showWeekNumber`, and
 * `numberOfMonths`.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  locale,
  formatters,
  components,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();
  const navButton = cn(buttonVariants({ variant: buttonVariant, size: 'icon-sm' }), 'sprout-calendar-nav-button');
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('sprout-calendar', className)}
      data-button-variant={buttonVariant}
      data-caption-layout={captionLayout}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: date => date.toLocaleString(locale?.code, { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('sprout-calendar-root', defaults.root),
        months: cn('sprout-calendar-months', defaults.months),
        month: cn('sprout-calendar-month', defaults.month),
        nav: cn('sprout-calendar-nav', defaults.nav),
        button_previous: cn(navButton, defaults.button_previous),
        button_next: cn(navButton, defaults.button_next),
        month_caption: cn('sprout-calendar-caption', defaults.month_caption),
        dropdowns: cn('sprout-calendar-dropdowns', defaults.dropdowns),
        dropdown_root: cn('sprout-calendar-dropdown-root', defaults.dropdown_root),
        dropdown: cn(defaults.dropdown),
        caption_label: cn('sprout-calendar-caption-label', defaults.caption_label),
        month_grid: cn('sprout-calendar-grid', defaults.month_grid),
        weekdays: cn('sprout-calendar-weekdays', defaults.weekdays),
        weekday: cn('sprout-calendar-weekday', defaults.weekday),
        week: cn('sprout-calendar-week', defaults.week),
        week_number_header: cn('sprout-calendar-week-number-header', defaults.week_number_header),
        week_number: cn('sprout-calendar-week-number', defaults.week_number),
        day: cn('sprout-calendar-day', defaults.day),
        range_start: cn('sprout-calendar-range-start', defaults.range_start),
        range_middle: cn('sprout-calendar-range-middle', defaults.range_middle),
        range_end: cn('sprout-calendar-range-end', defaults.range_end),
        today: cn('sprout-calendar-today', defaults.today),
        outside: cn('sprout-calendar-outside', defaults.outside),
        disabled: cn('sprout-calendar-disabled', defaults.disabled),
        hidden: cn('sprout-calendar-hidden', defaults.hidden),
        ...classNames,
      }}
      components={{
        Root: CalendarRoot,
        Chevron: CalendarChevron,
        Dropdown: CalendarDropdown,
        DayButton: CalendarDayButton,
        WeekNumber: CalendarWeekNumber,
        ...components,
      }}
      {...props}
    />
  );
}

export type CalendarDayButtonProps = DayButtonProps & {
  locale?: DayPickerLocale;
};

/**
 * The button inside each day cell. Use it in `components.DayButton` to add
 * content under the date, such as an event count in a `span`. `locale`
 * defaults to the calendar's locale.
 */
export function CalendarDayButton({ className, day, modifiers, locale, ...props }: CalendarDayButtonProps) {
  const calendarLocale = useDayPicker().dayPickerProps.locale;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  const range = modifiers.range_start || modifiers.range_end || modifiers.range_middle;
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-slot="calendar-day-button"
      data-day={day.date.toLocaleDateString((locale ?? calendarLocale)?.code)}
      data-selected-single={Boolean(modifiers.selected && !range)}
      data-range-start={Boolean(modifiers.range_start)}
      data-range-end={Boolean(modifiers.range_end)}
      data-range-middle={Boolean(modifiers.range_middle)}
      className={cn('sprout-calendar-day-button', getDefaultClassNames().day_button, className)}
      {...(props as ComponentProps<typeof Button>)}
    />
  );
}
