"use client";

import { Toggle } from "@base-ui/react/toggle";
import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { X } from "reicon-react/icons/X";
import { cn } from "../internal/classes.js";
import { Button } from "./button.js";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  type DialogContentProps,
} from "./dialog.js";

export interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Visually hidden dialog title. It also names the results combobox. */
  title: string;
  /** Visually hidden description of what the search covers. */
  description: string;
  className?: string;
  /** Where the portal renders. Defaults to `document.body`. */
  container?: DialogContentProps["container"];
  children: ReactNode;
}

/**
 * A wide search palette pinned near the top of the viewport. You filter and
 * group results yourself; arrow keys wrap and Enter opens the active item.
 */
export function SearchDialog({
  open,
  onOpenChange,
  title,
  description,
  className,
  container,
  children,
}: SearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent
        data-slot="search-dialog"
        placement="top"
        showCloseButton={false}
        container={container}
        className={cn("sprout-search-dialog", className)}
      >
        <DialogTitle className="sprout-command-sr-only">{title}</DialogTitle>
        <DialogDescription className="sprout-command-sr-only">
          {description}
        </DialogDescription>
        <Command
          shouldFilter={false}
          loop
          label={title}
          className="sprout-search-command"
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export interface SearchInputProps {
  ref?: Ref<HTMLInputElement>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  /** Accessible name of the search field. */
  label: string;
  /** Accessible name of the trailing close button. */
  closeLabel?: string;
}

/** The search field with a leading magnifier and a trailing close button. */
export function SearchInput({
  ref,
  value,
  onValueChange,
  placeholder,
  label,
  closeLabel = "Close search",
}: SearchInputProps) {
  return (
    <div data-slot="search-input" className="sprout-search-input">
      <CommandInput
        ref={ref}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        aria-label={label}
      />
      <DialogClose
        render={
          <Button variant="ghost" size="icon-sm" aria-label={closeLabel} />
        }
      >
        <X size={16} aria-hidden="true" />
      </DialogClose>
    </div>
  );
}

export interface SearchFiltersProps {
  /** Accessible name of the filter group. */
  label: string;
  children: ReactNode;
}

/** A row of toggle filters under the input. It scrolls sideways when narrow. */
export function SearchFilters({ label, children }: SearchFiltersProps) {
  return (
    <div
      data-slot="search-filters"
      role="group"
      aria-label={label}
      className="sprout-search-filters"
    >
      {children}
    </div>
  );
}

export interface SearchFilterProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  icon?: ReactNode;
  children: ReactNode;
}

/** A pressable filter chip. */
export function SearchFilter({
  pressed,
  onPressedChange,
  icon,
  children,
}: SearchFilterProps) {
  return (
    <Toggle
      data-slot="search-filter"
      pressed={pressed}
      onPressedChange={(next) => onPressedChange(next)}
      className="sprout-search-filter"
    >
      {icon}
      {children}
    </Toggle>
  );
}

export interface SearchListProps {
  /** Accessible name of the results listbox. */
  label: string;
  children: ReactNode;
}

/** The scrolling results area. It keeps a steady height so typing does not resize the dialog. */
export function SearchList({ label, children }: SearchListProps) {
  return (
    <CommandList aria-label={label} className="sprout-search-list">
      {children}
    </CommandList>
  );
}

export interface SearchGroupProps {
  heading: string;
  /** Shown as a badge after the heading. A group with a count of `0` is not rendered. */
  count: number;
  children: ReactNode;
}

/** Results under a heading with a count. Groups after the first get a dashed divider. */
export function SearchGroup({ heading, count, children }: SearchGroupProps) {
  if (count === 0) return null;
  return (
    <CommandGroup
      className="sprout-search-group"
      heading={
        <span className="sprout-search-group-heading">
          {heading}{" "}
          <span
            data-slot="search-group-count"
            className="sprout-search-group-count"
          >
            {count}
          </span>
        </span>
      }
    >
      {children}
    </CommandGroup>
  );
}

export interface SearchItemIconProps {
  children: ReactNode;
}

/** A muted icon tile for an item's `media`. */
export function SearchItemIcon({ children }: SearchItemIconProps) {
  return (
    <span data-slot="search-item-icon" className="sprout-search-item-icon">
      {children}
    </span>
  );
}

export interface SearchItemProps {
  /** Unique within the dialog. */
  value: string;
  onSelect: () => void;
  /** Leading icon or avatar, centered in a 28px box. */
  media: ReactNode;
  title: string;
  /** Muted text after the title, separated by a dot. */
  meta?: string | undefined;
  /** A second muted line. */
  detail?: string | undefined;
  /** Trailing hint such as a shortcut. It swaps for the Enter key while active. */
  trailing?: ReactNode;
}

/** One result. The active item shows an Enter key hint. */
export function SearchItem({
  value,
  onSelect,
  media,
  title,
  meta,
  detail,
  trailing,
}: SearchItemProps) {
  return (
    <CommandItem
      value={value}
      onSelect={() => onSelect()}
      className="sprout-search-item"
    >
      <span data-slot="search-item-media" className="sprout-search-item-media">
        {media}
      </span>
      <span className="sprout-search-item-text">
        <span className="sprout-search-item-line">
          <span
            data-slot="search-item-title"
            className="sprout-search-item-title"
          >
            {title}
          </span>
          {meta && (
            <>
              <span aria-hidden="true" className="sprout-search-item-dot">
                ·
              </span>
              <span
                data-slot="search-item-meta"
                className="sprout-search-item-meta"
              >
                {meta}
              </span>
            </>
          )}
        </span>
        {detail && (
          <span
            data-slot="search-item-detail"
            className="sprout-search-item-detail"
          >
            {detail}
          </span>
        )}
      </span>
      {trailing && (
        <span
          data-slot="search-item-trailing"
          className="sprout-search-item-trailing"
        >
          {trailing}
        </span>
      )}
      <kbd
        aria-hidden="true"
        className="sprout-search-kbd sprout-search-item-enter"
      >
        ↵
      </kbd>
    </CommandItem>
  );
}

function tiles(media: ReactNode) {
  const nodes =
    isValidElement(media) && media.type === Fragment
      ? (media as ReactElement<{ children?: ReactNode }>).props.children
      : media;
  return Children.toArray(nodes).map((node, index) => (
    <span
      key={index}
      data-slot="search-empty-tile"
      className="sprout-search-empty-tile"
    >
      {node}
    </span>
  ));
}

export interface SearchEmptyProps {
  /** One to three icons shown as fanned tiles over a faint grid. */
  media?: ReactNode;
  title: string;
  description: string;
  /** A recovery action such as Clear search. */
  action?: ReactNode;
}

/** Fills the list when nothing matches and is announced as a status. */
export function SearchEmpty({
  media,
  title,
  description,
  action,
}: SearchEmptyProps) {
  return (
    <div data-slot="search-empty" role="status" className="sprout-search-empty">
      {media && (
        <div aria-hidden="true" className="sprout-search-empty-media">
          <span className="sprout-search-empty-tiles">{tiles(media)}</span>
        </div>
      )}
      <div className="sprout-search-empty-text">
        <p className="sprout-search-empty-title">{title}</p>
        <p className="sprout-search-empty-description">{description}</p>
      </div>
      {action}
    </div>
  );
}

export interface SearchFooterProps {
  children: ReactNode;
}

/** A tinted strip of keyboard hints. Hidden below 640px, where there is no keyboard to hint at. */
export function SearchFooter({ children }: SearchFooterProps) {
  return (
    <footer data-slot="search-footer" className="sprout-search-footer">
      {children}
    </footer>
  );
}

export interface SearchHintProps {
  keys: string;
  children: ReactNode;
}

/** A key and what it does. */
export function SearchHint({ keys, children }: SearchHintProps) {
  return (
    <span data-slot="search-hint" className="sprout-search-hint">
      <kbd className="sprout-search-kbd">{keys}</kbd>
      {children}
    </span>
  );
}
