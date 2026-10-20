'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Search } from 'reicon-react/icons/Search';
import { X } from 'reicon-react/icons/X';
import { cn } from '../internal/classes.js';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group.js';

export interface SearchFieldProps {
  /** Accessible name of the input. It is also the placeholder when none is given. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  maxLength?: number | undefined;
  id?: string | undefined;
  /** Classes for the group. It is full width up to 24rem by default. */
  className?: string | undefined;
}

/**
 * An `InputGroup` preset for search: a leading magnifier and a clear button
 * that appears once there is text. Clear and Escape empty the value and keep
 * focus in the input. A disabled ancestor `fieldset` disables both controls.
 */
export function SearchField({ label, value, onChange, placeholder, maxLength, id, className }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  // The first Escape clears the text; with no text it reaches popovers and dialogs.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape' || !value) return;
    event.preventDefault();
    event.stopPropagation();
    onChange('');
  };
  return (
    <InputGroup data-slot="search-field" className={cn('sprout-search-field', className)}>
      <InputGroupAddon>
        <Search size={16} aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        ref={input}
        id={id}
        type="search"
        aria-label={label}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder ?? label}
        autoComplete="off"
        spellCheck={false}
        onChange={event => onChange(event.currentTarget.value)}
        onKeyDown={onKeyDown}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            data-slot="search-field-clear"
            size="icon-xs"
            aria-label="Clear search"
            className="sprout-search-field-clear"
            onClick={() => {
              onChange('');
              input.current?.focus();
            }}
          >
            <X size={14} aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
