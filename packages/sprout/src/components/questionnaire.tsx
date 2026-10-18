"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type ComponentProps,
  type FormEvent,
  type SubmitEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from "react";
import { Check } from "reicon-react/icons/Check";
import { cn } from "../internal/classes.js";
import {
  buttonVariants,
  type ButtonSize,
  type ButtonVariant,
} from "./button.js";

export const questionnaireItemStatusNames = [
  "unanswered",
  "answered",
  "skipped",
] as const;
export const questionnaireShortcutModeNames = ["letters", "numbers"] as const;

export type QuestionnaireItemStatus =
  (typeof questionnaireItemStatusNames)[number];
export type QuestionnaireShortcutMode =
  (typeof questionnaireShortcutModeNames)[number];

export interface QuestionnaireChoiceDefinition {
  value: string;
  disabled?: boolean | undefined;
}

export interface QuestionnaireItemDefinition {
  name: string;
  choices?: readonly QuestionnaireChoiceDefinition[] | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
}

export type QuestionnaireInputType =
  | "date"
  | "datetime-local"
  | "email"
  | "month"
  | "number"
  | "password"
  | "search"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week";

/* Helpers ------------------------------------------------------------------- */

type AnswerControl =
  | {
      type: "choice";
      id: string;
      element: HTMLInputElement;
      disabled: boolean;
      ownDisabled: boolean;
      value: string;
    }
  | { type: "input"; id: string; element: HTMLInputElement; disabled: boolean };

interface ItemRegistration {
  name: string;
  element: HTMLFieldSetElement;
  disabled: boolean;
  required: boolean;
  status: QuestionnaireItemStatus;
  choices: QuestionnaireChoiceDefinition[];
  focus: () => void;
  focusInvalid: () => void;
  validate: () => boolean;
  reset: () => void;
  skip: () => void;
  getAnswerByElement: (element: Element) => AnswerControl | null;
  getAnswerByShortcut: (shortcut: string) => AnswerControl | null;
  moveAnswerFocus: (target: Element, direction: "next" | "previous") => boolean;
}

function hasText(value: unknown) {
  return Array.isArray(value)
    ? value.some((part) => String(part).trim().length > 0)
    : value != null && String(value).trim().length > 0;
}

function shortcutKeys(mode: QuestionnaireShortcutMode | null) {
  if (mode === "letters")
    return Array.from({ length: 26 }, (_, index) =>
      String.fromCharCode(65 + index),
    );
  if (mode === "numbers")
    return Array.from({ length: 9 }, (_, index) => String(index + 1));
  return [];
}

function shortcutFromKey(key: string, mode: QuestionnaireShortcutMode) {
  const normalized = mode === "letters" ? key.toUpperCase() : key;
  return shortcutKeys(mode).includes(normalized) ? normalized : null;
}

function keyShortcuts(shortcut: string | null, enter: boolean) {
  return (
    [shortcut, enter ? "Enter" : null].filter(Boolean).join(" ") || undefined
  );
}

function isAnswered(control: AnswerControl) {
  return control.type === "choice"
    ? control.element.checked
    : control.element.hasAttribute("name") && hasText(control.element.value);
}

function isEmptyTextInput(control: AnswerControl | null | undefined) {
  return (
    control?.type === "input" &&
    ["email", "password", "search", "tel", "text", "url"].includes(
      control.element.type,
    ) &&
    !hasText(control.element.value)
  );
}

function isTextEntry(element: EventTarget) {
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  )
    return true;
  if (element instanceof HTMLInputElement)
    return !["button", "checkbox", "radio", "reset", "submit"].includes(
      element.type,
    );
  return element instanceof HTMLElement && element.isContentEditable;
}

function isRadio(element: EventTarget) {
  return element instanceof HTMLInputElement && element.type === "radio";
}

function byDocumentOrder(a: { element: Element }, b: { element: Element }) {
  if (a.element === b.element) return 0;
  const position = a.element.compareDocumentPosition(b.element);
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

interface Definitions {
  items: readonly QuestionnaireItemDefinition[];
  enabledItems: readonly QuestionnaireItemDefinition[];
  itemByName: Map<string, QuestionnaireItemDefinition>;
}

function initialItem(
  definitions: Definitions | null,
  defaultItem: string | undefined,
) {
  if (!definitions) return defaultItem ?? null;
  const match = defaultItem
    ? definitions.itemByName.get(defaultItem)
    : undefined;
  return match && !match.disabled
    ? match.name
    : (definitions.enabledItems[0]?.name ?? null);
}

function shortcutsForDefinition(
  definition: QuestionnaireItemDefinition | undefined,
  mode: QuestionnaireShortcutMode | null,
) {
  const map = new Map<string, string>();
  if (!definition || !mode) return map;
  const keys = shortcutKeys(mode);
  let index = 0;
  for (const choice of definition.choices ?? []) {
    if (choice.disabled) continue;
    const key = keys[index];
    if (!key) break;
    map.set(choice.value, key);
    index += 1;
  }
  return map;
}

/* Contexts ------------------------------------------------------------------ */

interface RootContextValue {
  current: number;
  first: boolean;
  last: boolean;
  total: number;
  activeItemName: string | null;
  activeItemRequired: boolean | null;
  activeItemStatus: QuestionnaireItemStatus | null;
  domVersion: number;
  goNext: () => void;
  goPrevious: () => void;
  skipCurrent: () => void;
  itemDefinitionByName: Map<string, QuestionnaireItemDefinition> | null;
  nativeValidation: boolean;
  registerItem: (item: ItemRegistration) => () => void;
  shortcuts: QuestionnaireShortcutMode | null;
}

interface ItemContextValue {
  disabled: boolean;
  hasInputAnswer: boolean;
  invalid: boolean;
  multiple: boolean;
  name: string;
  required: boolean;
  resetVersion: number;
  selectedAnswerIds: string[];
  shortcutByAnswerId: Map<string, string>;
  shortcutByChoiceValue: Map<string, string> | null;
  status: QuestionnaireItemStatus;
  registerAnswerControl: (control: AnswerControl) => () => void;
  registerAnswerSelection: (id: string, selected: boolean) => () => void;
  registerDescription: (id: string) => () => void;
  registerError: (id: string) => () => void;
  setAnswerDefault: (id: string, selected: boolean) => void;
  setAnswerSelectionFromInteraction: (id: string, selected: boolean) => void;
  syncControlledAnswerSelection: (id: string, selected: boolean) => void;
}

const RootContext = createContext<RootContextValue | null>(null);
const ItemContext = createContext<ItemContextValue | null>(null);

function useRoot(part: string) {
  const context = useContext(RootContext);
  if (!context) throw new Error(`${part} must be used within a Questionnaire.`);
  return context;
}

function useItem(part: string) {
  const context = useContext(ItemContext);
  if (!context)
    throw new Error(`${part} must be used within a QuestionnaireItem.`);
  return context;
}

/* Root ---------------------------------------------------------------------- */

export interface QuestionnaireState extends Record<string, unknown> {
  current: number;
  first: boolean;
  last: boolean;
  total: number;
}

export type QuestionnaireProps = Omit<
  ComponentProps<"form">,
  "defaultValue" | "value"
> & {
  /** The item shown first when uncontrolled. Falls back to the first enabled item. */
  defaultItem?: string | undefined;
  /** The shown item, when controlled. */
  item?: string | undefined;
  /**
   * The ordered list of items and choices. Sets the step order, progress
   * total, and which letters or numbers each choice gets as a shortcut.
   * Without it, rendered items are used in document order.
   */
  items?: readonly QuestionnaireItemDefinition[] | undefined;
  onItemChange?: ((item: string) => void) | undefined;
  /** Press a letter or number to pick a choice. Off by default. */
  shortcuts?: QuestionnaireShortcutMode | undefined;
};

/**
 * A form that asks one question at a time. It moves between items with
 * Next, Previous, and Skip, checks required answers before moving on, and
 * submits after the last item.
 */
export function Questionnaire({
  className,
  defaultItem,
  item,
  items,
  noValidate = true,
  onItemChange,
  onReset,
  onSubmit,
  ref,
  shortcuts,
  ...props
}: QuestionnaireProps) {
  const definitions = useMemo<Definitions | null>(
    () =>
      items === undefined
        ? null
        : {
            items,
            enabledItems: items.filter((entry) => !entry.disabled),
            itemByName: new Map(items.map((entry) => [entry.name, entry])),
          },
    [items],
  );
  const [registered, setRegistered] = useState<ItemRegistration[]>([]);
  const [internalItem, setInternalItem] = useState(() =>
    initialItem(definitions, defaultItem),
  );
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const [domVersion, setDomVersion] = useState(0);
  const pending = useRef<{ name: string; target: "item" | "invalid" } | null>(
    null,
  );
  const controlled = item !== undefined;
  const activeName = controlled ? item : internalItem;
  const previousActive = useRef(activeName);
  const nativeValidation = noValidate === false;
  const shortcutMode = shortcuts ?? null;

  useLayoutEffect(() => {
    if (!form || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() =>
      setDomVersion((version) => version + 1),
    );
    observer.observe(form, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [form]);

  const enabledRegistered = useMemo(
    () => registered.filter((entry) => !entry.disabled).sort(byDocumentOrder),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registered, domVersion],
  );
  const registeredByName = useMemo(
    () => new Map(enabledRegistered.map((entry) => [entry.name, entry])),
    [enabledRegistered],
  );
  const sequence: readonly { name: string }[] =
    definitions?.enabledItems ?? enabledRegistered;
  const index = sequence.findIndex((entry) => entry.name === activeName);
  const active =
    index < 0 || !activeName
      ? null
      : (registeredByName.get(activeName) ?? null);
  const activeDefinition = activeName
    ? definitions?.itemByName.get(activeName)
    : undefined;
  const activeRequired =
    index < 0
      ? null
      : activeDefinition
        ? !!activeDefinition.required
        : (active?.required ?? false);
  const activeStatus =
    index < 0 ? null : (active?.status ?? (activeName ? "unanswered" : null));
  const ordered = useMemo(
    () =>
      definitions
        ? definitions.enabledItems.flatMap((entry) => {
            const match = registeredByName.get(entry.name);
            return match ? [match] : [];
          })
        : enabledRegistered,
    [definitions, registeredByName, enabledRegistered],
  );
  const total = sequence.length;
  const current = index < 0 ? 0 : index + 1;
  const first = total > 0 && index === 0;
  const last = total > 0 && index === total - 1;

  const go = useCallback(
    (name: string, target: "item" | "invalid" = "item") => {
      if (name === activeName) return;
      pending.current = { name, target };
      if (!controlled) setInternalItem(name);
      onItemChange?.(name);
    },
    [activeName, controlled, onItemChange],
  );

  useLayoutEffect(() => {
    if (total === 0) return;
    if (index < 0) {
      if (!controlled && activeName === null) {
        setInternalItem(sequence[0]!.name);
        return;
      }
      go(sequence[0]!.name);
      return;
    }
    const request = pending.current;
    const changed = previousActive.current !== activeName;
    previousActive.current = activeName;
    if (!request || request.name !== activeName) {
      if (controlled && changed) {
        pending.current = null;
        active?.focus();
      }
      return;
    }
    if (request.target === "invalid") active?.focusInvalid();
    else active?.focus();
    pending.current = null;
  }, [active, activeName, controlled, index, sequence, go, total]);

  const registerItem = useCallback((entry: ItemRegistration) => {
    setRegistered((list) => [
      ...list.filter(
        (other) => other.element !== entry.element && other.name !== entry.name,
      ),
      entry,
    ]);
    return () =>
      setRegistered((list) => list.filter((other) => other !== entry));
  }, []);

  const goPrevious = useCallback(() => {
    if (index <= 0) return;
    go(sequence[index - 1]!.name);
  }, [index, sequence, go]);

  const goNext = useCallback(() => {
    if (!active || index >= total - 1) return;
    if (!active.validate()) {
      active.focusInvalid();
      return;
    }
    go(sequence[index + 1]!.name);
  }, [active, index, sequence, go, total]);

  const advance = useCallback(() => {
    if (!active) return;
    if (!active.validate()) {
      active.focusInvalid();
      return;
    }
    if (last) {
      form?.requestSubmit();
      return;
    }
    go(sequence[index + 1]!.name);
  }, [active, index, last, sequence, form, go]);

  const skipCurrent = useCallback(() => {
    if (!active || active.required) return;
    active.skip();
    if (!last) {
      go(sequence[index + 1]!.name);
      return;
    }
    queueMicrotask(() => form?.requestSubmit());
  }, [active, index, last, sequence, form, go]);

  function handleReset(event: FormEvent<HTMLFormElement>) {
    onReset?.(event);
    if (event.defaultPrevented) return;
    for (const entry of registered) entry.reset();
    const target = definitions
      ? initialItem(definitions, defaultItem)
      : (enabledRegistered.find((entry) => entry.name === defaultItem)?.name ??
        enabledRegistered[0]?.name);
    if (target) go(target);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    const invalid = ordered.find((entry) => !entry.validate());
    if (invalid) {
      event.preventDefault();
      go(invalid.name, "invalid");
      if (invalid.name === activeName) {
        invalid.focusInvalid();
        pending.current = null;
      }
      return;
    }
    onSubmit?.(event);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      event.keyCode === 229 ||
      !active ||
      !(target instanceof Element)
    )
      return;
    if (
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      if (!event.repeat) advance();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (
      (event.key === "ArrowUp" || event.key === "ArrowDown") &&
      active.moveAnswerFocus(
        target,
        event.key === "ArrowDown" ? "next" : "previous",
      )
    ) {
      event.preventDefault();
      return;
    }
    if (
      (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
      !isTextEntry(target) &&
      !isRadio(target)
    ) {
      event.preventDefault();
      if (event.repeat) return;
      if (event.key === "ArrowLeft") goPrevious();
      else if (active.status !== "unanswered") goNext();
      return;
    }
    if (event.key === "Enter") {
      const control = active.getAnswerByElement(target);
      if (!control) return;
      event.preventDefault();
      if (!event.repeat && isAnswered(control)) advance();
      return;
    }
    if (!shortcutMode || isTextEntry(target)) return;
    const key = shortcutFromKey(event.key, shortcutMode);
    const control = key ? active.getAnswerByShortcut(key) : null;
    if (!control) return;
    event.preventDefault();
    if (event.repeat) return;
    control.element.focus();
    if (control.type === "choice") control.element.click();
  }

  const context = useMemo<RootContextValue>(
    () => ({
      current,
      first,
      last,
      total,
      activeItemName: activeName,
      activeItemRequired: activeRequired,
      activeItemStatus: activeStatus,
      domVersion,
      goNext: advance,
      goPrevious,
      skipCurrent,
      itemDefinitionByName: definitions?.itemByName ?? null,
      nativeValidation,
      registerItem,
      shortcuts: shortcutMode,
    }),
    [
      current,
      first,
      last,
      total,
      activeName,
      activeRequired,
      activeStatus,
      domVersion,
      advance,
      goPrevious,
      skipCurrent,
      definitions,
      nativeValidation,
      registerItem,
      shortcutMode,
    ],
  );

  const handleRef = useCallback(
    (element: HTMLFormElement | null) => {
      setForm(element);
      assignRef(ref, element);
    },
    [ref],
  );

  const element = useRender({
    defaultTagName: "form",
    props: mergeProps<"form">(
      {
        "data-slot": "questionnaire",
        "data-shortcuts": shortcutMode ?? undefined,
        className: cn("sprout-questionnaire", className),
        noValidate,
        onKeyDown: handleKeyDown,
        onReset: handleReset,
        onSubmit: handleSubmit,
        ref: handleRef,
      } as object,
      props,
    ),
    state: { current, first, last, total } satisfies QuestionnaireState,
  });
  return <RootContext.Provider value={context}>{element}</RootContext.Provider>;
}

/* Progress ------------------------------------------------------------------ */

export type QuestionnaireProgressProps = useRender.ComponentProps<
  "div",
  QuestionnaireState
>;

/** "Question 2 of 3", announced politely as the step changes. */
export function QuestionnaireProgress({
  children,
  className,
  render,
  ...props
}: QuestionnaireProgressProps) {
  const { current, first, last, total } = useRoot("QuestionnaireProgress");
  const text = total ? `Question ${current} of ${total}` : undefined;
  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        "data-slot": "questionnaire-progress",
        className: cn("sprout-questionnaire-progress", className),
        role: "progressbar",
        "aria-label": "Questionnaire progress",
        "aria-live": "polite",
        "aria-valuemin": total ? 1 : undefined,
        "aria-valuemax": total || undefined,
        "aria-valuenow": total ? current : undefined,
        "aria-valuetext": text,
        children: children ?? text,
      } as object,
      props,
    ),
    state: { current, first, last, total },
  });
}

/* Item ---------------------------------------------------------------------- */

export interface QuestionnaireItemState extends Record<string, unknown> {
  active: boolean;
  disabled: boolean;
  invalid: boolean;
  multiple: boolean;
  required: boolean;
  status: QuestionnaireItemStatus;
}

export type QuestionnaireItemProps = Omit<
  ComponentProps<"fieldset">,
  "name" | "value"
> & {
  name: string;
  /** Checkbox choices instead of radios. */
  multiple?: boolean | undefined;
  /** Must be answered; hides Skip. */
  required?: boolean | undefined;
  /** Shows the error even after an answer, such as for a server-side check. */
  invalid?: boolean | undefined;
  onStatusChange?: ((status: QuestionnaireItemStatus) => void) | undefined;
};

/** One question. Only the current item is shown; the rest are hidden and inert. */
export function QuestionnaireItem({
  "aria-describedby": ariaDescribedBy,
  "aria-keyshortcuts": ariaKeyShortcuts,
  children,
  className,
  disabled = false,
  invalid = false,
  multiple = false,
  name,
  onStatusChange,
  ref,
  required = false,
  ...props
}: QuestionnaireItemProps) {
  const root = useRoot("QuestionnaireItem");
  const {
    activeItemName,
    domVersion,
    first,
    last,
    itemDefinitionByName,
    nativeValidation,
    registerItem,
    shortcuts,
  } = root;
  const [element, setElement] = useState<HTMLFieldSetElement | null>(null);
  const [controls, setControls] = useState<AnswerControl[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [skipped, setSkipped] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [descriptionIds, setDescriptionIds] = useState<string[]>([]);
  const [errorIds, setErrorIds] = useState<string[]>([]);
  const defaults = useRef<string[]>([]);
  const multipleRef = useRef(multiple);
  const previousMultiple = useRef(multiple);
  multipleRef.current = multiple;

  const active = !disabled && activeItemName === name;
  const sorted = useMemo(
    () => [...controls].sort(byDocumentOrder),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controls, domVersion],
  );
  const enabled = useMemo(
    () => sorted.filter((control) => !control.disabled),
    [sorted],
  );
  const answered = enabled.some((control) => selected.includes(control.id));
  const status: QuestionnaireItemStatus = skipped
    ? "skipped"
    : answered
      ? "answered"
      : "unanswered";
  const skippedOptional = status === "skipped" && !required;
  const valid =
    disabled || skippedOptional || (!invalid && status === "answered");
  const showInvalid =
    !disabled && !skippedOptional && (invalid || (attempted && !valid));
  const hasInputAnswer = enabled.some((control) => control.type === "input");
  const lastStatus = useRef(status);
  const definition = itemDefinitionByName?.get(name);
  const shortcutByChoiceValue = useMemo(
    () =>
      itemDefinitionByName
        ? shortcutsForDefinition(definition, shortcuts)
        : null,
    [definition, itemDefinitionByName, shortcuts],
  );
  const shortcutByAnswerId = useMemo(() => {
    if (shortcutByChoiceValue) return new Map<string, string>();
    const keys = shortcutKeys(shortcuts);
    const choices = enabled.filter((control) => control.type === "choice");
    return new Map(
      choices
        .slice(0, keys.length)
        .map((control, position) => [control.id, keys[position]!]),
    );
  }, [enabled, shortcutByChoiceValue, shortcuts]);

  useLayoutEffect(() => {
    if (lastStatus.current === status) return;
    lastStatus.current = status;
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  const registerAnswerControl = useCallback((control: AnswerControl) => {
    setControls((list) => [
      ...list.filter(
        (other) => other.element !== control.element && other.id !== control.id,
      ),
      control,
    ]);
    return () =>
      setControls((list) => list.filter((other) => other !== control));
  }, []);

  const select = useCallback(
    (id: string, on: boolean) => {
      setSelected((list) => {
        if (!on) return list.filter((other) => other !== id);
        if (!multiple) return [id];
        return list.includes(id) ? list : [...list, id];
      });
    },
    [multiple],
  );

  const setAnswerSelectionFromInteraction = useCallback(
    (id: string, on: boolean) => {
      setSkipped(false);
      select(id, on);
    },
    [select],
  );

  const syncControlledAnswerSelection = useCallback(
    (id: string, on: boolean) => {
      if (on) setSkipped(false);
      select(id, on);
    },
    [select],
  );

  const registerAnswerSelection = useCallback(
    (id: string, initial: boolean) => {
      if (initial) {
        defaults.current = [
          ...defaults.current.filter((other) => other !== id),
          id,
        ];
        setSelected((list) => {
          if (multipleRef.current)
            return list.includes(id) ? list : [...list, id];
          return list.length ? list : [id];
        });
      }
      return () => {
        defaults.current = defaults.current.filter((other) => other !== id);
        setSelected((list) => list.filter((other) => other !== id));
      };
    },
    [],
  );

  const setAnswerDefault = useCallback((id: string, on: boolean) => {
    if (on) {
      if (!defaults.current.includes(id))
        defaults.current = [...defaults.current, id];
      return;
    }
    defaults.current = defaults.current.filter((other) => other !== id);
  }, []);

  const registerDescription = useCallback((id: string) => {
    setDescriptionIds((list) => (list.includes(id) ? list : [...list, id]));
    return () =>
      setDescriptionIds((list) => list.filter((other) => other !== id));
  }, []);

  const registerError = useCallback((id: string) => {
    setErrorIds((list) => (list.includes(id) ? list : [...list, id]));
    return () => setErrorIds((list) => list.filter((other) => other !== id));
  }, []);

  const validate = useCallback(() => {
    setAttempted(true);
    if (!valid) return false;
    if (!nativeValidation) return true;
    const failing = enabled.find(
      (control) =>
        isAnswered(control) &&
        control.element.willValidate &&
        !control.element.validity.valid,
    );
    if (!failing) return true;
    failing.element.focus();
    failing.element.reportValidity();
    return false;
  }, [enabled, nativeValidation, valid]);

  const focus = useCallback(() => element?.focus(), [element]);

  const focusInvalid = useCallback(() => {
    const filled = element?.querySelector<HTMLElement>(
      "input[data-filled][name]:not(:disabled)",
    );
    const firstField = element?.querySelector<HTMLElement>(
      "input:not([type=hidden]):not(:disabled), textarea:not(:disabled)",
    );
    (filled ?? firstField ?? element)?.focus();
  }, [element]);

  const reset = useCallback(() => {
    setAttempted(false);
    setSkipped(false);
    setSelected(
      multiple ? [...defaults.current] : defaults.current.slice(0, 1),
    );
    setResetVersion((version) => version + 1);
  }, [multiple]);

  const skip = useCallback(() => {
    if (required) return;
    setSelected([]);
    setSkipped(true);
  }, [required]);

  useLayoutEffect(() => {
    const wasMultiple = previousMultiple.current;
    previousMultiple.current = multiple;
    if (!wasMultiple || multiple) return;
    setSelected((list) => {
      const keep = enabled.find((control) => list.includes(control.id));
      return keep ? [keep.id] : [];
    });
  }, [enabled, multiple]);

  const getAnswerByElement = useCallback(
    (target: Element) =>
      enabled.find((control) => control.element === target) ?? null,
    [enabled],
  );

  const getAnswerByShortcut = useCallback(
    (shortcut: string) => {
      if (shortcutByChoiceValue) {
        const value = [...shortcutByChoiceValue.entries()].find(
          ([, key]) => key === shortcut,
        )?.[0];
        return (
          enabled.find(
            (control) => control.type === "choice" && control.value === value,
          ) ?? null
        );
      }
      const id = [...shortcutByAnswerId.entries()].find(
        ([, key]) => key === shortcut,
      )?.[0];
      return enabled.find((control) => control.id === id) ?? null;
    },
    [enabled, shortcutByAnswerId, shortcutByChoiceValue],
  );

  const moveAnswerFocus = useCallback(
    (target: Element, direction: "next" | "previous") => {
      const position = enabled.findIndex(
        (control) => control.element === target,
      );
      const currentControl = position < 0 ? null : (enabled[position] ?? null);
      if (
        !enabled.length ||
        (isTextEntry(target) && !isEmptyTextInput(currentControl)) ||
        (position < 0 && target !== element)
      )
        return false;
      const next =
        position < 0
          ? (enabled.find(isAnswered) ??
            (direction === "next" ? enabled[0] : enabled[enabled.length - 1]))
          : enabled[
              (position + (direction === "next" ? 1 : -1) + enabled.length) %
                enabled.length
            ];
      if (
        !next ||
        next.element === target ||
        (position >= 0 && isRadio(target) && isRadio(next.element))
      )
        return false;
      next.element.focus();
      if (next.type === "choice" && isRadio(next.element)) next.element.click();
      return true;
    },
    [element, enabled],
  );

  useLayoutEffect(() => {
    if (!element) return;
    return registerItem({
      name,
      element,
      disabled,
      required,
      status,
      choices: sorted.flatMap((control) =>
        control.type === "choice"
          ? [{ value: control.value, disabled: control.ownDisabled }]
          : [],
      ),
      focus,
      focusInvalid,
      validate,
      reset,
      skip,
      getAnswerByElement,
      getAnswerByShortcut,
      moveAnswerFocus,
    });
  }, [
    sorted,
    disabled,
    element,
    focus,
    focusInvalid,
    getAnswerByElement,
    getAnswerByShortcut,
    moveAnswerFocus,
    name,
    registerItem,
    required,
    reset,
    skip,
    status,
    validate,
  ]);

  const context = useMemo<ItemContextValue>(
    () => ({
      disabled,
      hasInputAnswer,
      invalid: showInvalid,
      multiple,
      name,
      required,
      resetVersion,
      selectedAnswerIds: selected,
      shortcutByAnswerId,
      shortcutByChoiceValue,
      status,
      registerAnswerControl,
      registerAnswerSelection,
      registerDescription,
      registerError,
      setAnswerDefault,
      setAnswerSelectionFromInteraction,
      syncControlledAnswerSelection,
    }),
    [
      disabled,
      hasInputAnswer,
      showInvalid,
      multiple,
      name,
      required,
      resetVersion,
      selected,
      shortcutByAnswerId,
      shortcutByChoiceValue,
      status,
      registerAnswerControl,
      registerAnswerSelection,
      registerDescription,
      registerError,
      setAnswerDefault,
      setAnswerSelectionFromInteraction,
      syncControlledAnswerSelection,
    ],
  );

  const handleRef = useCallback(
    (node: HTMLFieldSetElement | null) => {
      setElement(node);
      assignRef(ref, node);
    },
    [ref],
  );

  const describedBy =
    [...descriptionIds, ...(showInvalid ? errorIds : []), ariaDescribedBy]
      .filter(Boolean)
      .join(" ") || undefined;
  const itemShortcuts =
    [
      ariaKeyShortcuts,
      active ? "Meta+Enter Control+Enter" : undefined,
      active && enabled.length ? "ArrowUp ArrowDown" : undefined,
      active && !first ? "ArrowLeft" : undefined,
      active && !last && status !== "unanswered" ? "ArrowRight" : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const state: QuestionnaireItemState = {
    active,
    disabled,
    invalid: showInvalid,
    multiple,
    required,
    status,
  };
  return (
    <ItemContext.Provider value={context}>
      <fieldset
        data-slot="questionnaire-item"
        data-active={active ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-invalid={showInvalid ? "" : undefined}
        data-multiple={multiple ? "" : undefined}
        data-required={required ? "" : undefined}
        data-status={state.status}
        {...props}
        ref={handleRef}
        className={cn("sprout-questionnaire-item", className)}
        aria-describedby={describedBy}
        aria-invalid={showInvalid || undefined}
        aria-keyshortcuts={itemShortcuts}
        disabled={disabled}
        hidden={!active}
        inert={!active}
        tabIndex={-1}
      >
        {children}
      </fieldset>
    </ItemContext.Provider>
  );
}

/* Text ---------------------------------------------------------------------- */

export type QuestionnaireTitleProps = useRender.ComponentProps<"legend">;

/** The question, as the item's `legend`. */
export function QuestionnaireTitle({
  className,
  render,
  ...props
}: QuestionnaireTitleProps) {
  useItem("QuestionnaireTitle");
  return useRender({
    defaultTagName: "legend",
    render,
    props: mergeProps<"legend">(
      {
        "data-slot": "questionnaire-title",
        className: cn("sprout-questionnaire-title", className),
      } as object,
      props,
    ),
  });
}

export type QuestionnaireDescriptionProps = useRender.ComponentProps<"p">;

/** Help text under the question. The item references it with `aria-describedby`. */
export function QuestionnaireDescription({
  className,
  id,
  render,
  ...props
}: QuestionnaireDescriptionProps) {
  const { registerDescription } = useItem("QuestionnaireDescription");
  const generated = useId();
  const resolved = id ?? generated;
  useLayoutEffect(
    () => registerDescription(resolved),
    [resolved, registerDescription],
  );
  return useRender({
    defaultTagName: "p",
    render,
    props: mergeProps<"p">(
      {
        "data-slot": "questionnaire-description",
        id: resolved,
        className: cn("sprout-questionnaire-description", className),
      } as object,
      props,
    ),
  });
}

/* Choices ------------------------------------------------------------------- */

export interface QuestionnaireChoicesState extends Record<string, unknown> {
  shortcuts: QuestionnaireShortcutMode | null;
}

export type QuestionnaireChoicesProps = useRender.ComponentProps<
  "div",
  QuestionnaireChoicesState
>;

/** Stacks the item's choices. */
export function QuestionnaireChoices({
  className,
  render,
  ...props
}: QuestionnaireChoicesProps) {
  useItem("QuestionnaireChoices");
  const { shortcuts } = useRoot("QuestionnaireChoices");
  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        "data-slot": "questionnaire-choices",
        className: cn("sprout-questionnaire-choices", className),
      } as object,
      props,
    ),
    state: { shortcuts },
  });
}

export interface QuestionnaireChoiceState extends Record<string, unknown> {
  checked: boolean;
  disabled: boolean;
  invalid: boolean;
  shortcut: string | null;
  type: "checkbox" | "radio";
}

export type QuestionnaireChoiceProps = Omit<
  useRender.ComponentProps<"label", QuestionnaireChoiceState>,
  "onChange"
> & {
  value: string;
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  disabled?: boolean | undefined;
  onChange?: ChangeEventHandler<HTMLInputElement> | undefined;
};

/**
 * One answer row. A radio in single-answer items and a checkbox in
 * `multiple` items; the whole row is the hit area.
 */
export function QuestionnaireChoice({
  checked,
  children,
  className,
  defaultChecked = false,
  disabled: ownDisabled = false,
  onChange,
  render,
  value,
  ...props
}: QuestionnaireChoiceProps) {
  const item = useItem("QuestionnaireChoice");
  const {
    disabled: itemDisabled,
    hasInputAnswer,
    invalid,
    multiple,
    name,
    registerAnswerControl,
    registerAnswerSelection,
    required,
    resetVersion,
    selectedAnswerIds,
    setAnswerDefault,
    setAnswerSelectionFromInteraction,
    shortcutByAnswerId,
    shortcutByChoiceValue,
    status,
    syncControlledAnswerSelection,
  } = item;
  const id = useId();
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const initialChecked = useRef(defaultChecked);
  const controlled = checked !== undefined;
  const disabled = itemDisabled || ownDisabled;
  const isChecked = controlled
    ? status === "skipped"
      ? false
      : checked
    : selectedAnswerIds.includes(id);
  const type = multiple ? "checkbox" : "radio";
  const shortcut =
    shortcutByChoiceValue?.get(value) ?? shortcutByAnswerId.get(id) ?? null;

  useLayoutEffect(
    () => registerAnswerSelection(id, initialChecked.current),
    [id, registerAnswerSelection],
  );
  useLayoutEffect(
    () => setAnswerDefault(id, defaultChecked),
    [id, defaultChecked, setAnswerDefault],
  );
  useLayoutEffect(() => {
    if (!input) return;
    return registerAnswerControl({
      type: "choice",
      id,
      element: input,
      disabled,
      ownDisabled,
      value,
    });
  }, [id, ownDisabled, disabled, input, registerAnswerControl, value]);
  useLayoutEffect(() => {
    if (controlled) syncControlledAnswerSelection(id, checked);
  }, [id, controlled, checked, resetVersion, syncControlledAnswerSelection]);
  useLayoutEffect(() => {
    if (!input) return;
    input.defaultChecked = controlled ? checked : defaultChecked;
    if (resetVersion > 0) input.checked = isChecked;
  }, [isChecked, controlled, checked, defaultChecked, input, resetVersion]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event);
    if (event.defaultPrevented) return;
    if (!controlled) {
      setAnswerSelectionFromInteraction(id, event.target.checked);
      return;
    }
    if (status === "skipped" && checked === event.target.checked)
      setAnswerSelectionFromInteraction(id, checked);
  }

  const state: QuestionnaireChoiceState = {
    checked: isChecked,
    disabled,
    invalid,
    shortcut,
    type,
  };
  return useRender({
    defaultTagName: "label",
    render,
    props: mergeProps<"label">(
      {
        "data-slot": "questionnaire-choice",
        className: cn("sprout-questionnaire-choice", className),
        children: (
          <>
            <input
              data-slot="questionnaire-choice-input"
              className="sprout-questionnaire-choice-input"
              ref={setInput}
              id={id}
              type={type}
              name={status === "skipped" ? undefined : name}
              value={value}
              checked={isChecked}
              disabled={disabled}
              required={required && !multiple && !hasInputAnswer}
              aria-invalid={invalid || undefined}
              aria-keyshortcuts={keyShortcuts(shortcut, !disabled && isChecked)}
              data-checked={isChecked ? "" : undefined}
              data-unchecked={isChecked ? undefined : ""}
              onChange={handleChange}
            />
            <span
              aria-hidden="true"
              data-slot="questionnaire-choice-indicator"
              className="sprout-questionnaire-choice-indicator"
            >
              <span className="sprout-questionnaire-choice-dot" />
              <Check className="sprout-questionnaire-choice-check" />
            </span>
            <span
              data-slot="questionnaire-choice-label"
              className="sprout-questionnaire-choice-label"
            >
              {children}
            </span>
            {shortcut !== null && (
              <span
                aria-hidden="true"
                data-slot="questionnaire-choice-shortcut"
                className="sprout-questionnaire-choice-shortcut"
              >
                {shortcut}
              </span>
            )}
          </>
        ),
      } as object,
      props,
    ),
    state,
    stateAttributesMapping: {
      checked: (on: unknown): Record<string, string> =>
        on ? { "data-checked": "" } : { "data-unchecked": "" },
    },
  });
}

export type QuestionnaireChoiceDescriptionProps = ComponentProps<"span">;

/** A muted second line inside a choice. */
export function QuestionnaireChoiceDescription({
  className,
  ...props
}: QuestionnaireChoiceDescriptionProps) {
  return (
    <span
      data-slot="questionnaire-choice-description"
      className={cn("sprout-questionnaire-choice-description", className)}
      {...props}
    />
  );
}

/* Input --------------------------------------------------------------------- */

export interface QuestionnaireInputState extends Record<string, unknown> {
  disabled: boolean;
  filled: boolean;
  invalid: boolean;
}

export type QuestionnaireInputProps = Omit<
  useRender.ComponentProps<"input", QuestionnaireInputState>,
  "form" | "name" | "type"
> & {
  type?: QuestionnaireInputType | undefined;
};

/**
 * A typed answer. It counts as answered once it has text, and is only sent
 * with the form while it does.
 */
export function QuestionnaireInput({
  className,
  defaultValue,
  disabled: ownDisabled = false,
  onChange,
  ref,
  render,
  type = "text",
  value,
  ...props
}: QuestionnaireInputProps) {
  const {
    disabled: itemDisabled,
    invalid,
    name,
    registerAnswerControl,
    registerAnswerSelection,
    resetVersion,
    selectedAnswerIds,
    setAnswerDefault,
    setAnswerSelectionFromInteraction,
    syncControlledAnswerSelection,
  } = useItem("QuestionnaireInput");
  const id = useId();
  const element = useRef<HTMLInputElement | null>(null);
  const initialFilled = useRef(hasText(defaultValue));
  const controlled = value !== undefined;
  const defaultFilled = hasText(defaultValue);
  const valueFilled = hasText(value);
  const [filledState, setFilledState] = useState(defaultFilled);
  const disabled = itemDisabled || ownDisabled;
  const filled = controlled ? valueFilled : filledState;
  const selected = selectedAnswerIds.includes(id);

  useLayoutEffect(
    () => registerAnswerSelection(id, initialFilled.current),
    [id, registerAnswerSelection],
  );
  useLayoutEffect(
    () => setAnswerDefault(id, defaultFilled),
    [defaultFilled, id, setAnswerDefault],
  );
  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    return registerAnswerControl({
      type: "input",
      id,
      element: node,
      disabled,
    });
  }, [disabled, id, registerAnswerControl]);
  useLayoutEffect(() => {
    if (controlled) {
      syncControlledAnswerSelection(id, valueFilled);
      return;
    }
    if (resetVersion > 0) setFilledState(defaultFilled);
  }, [
    controlled,
    valueFilled,
    value,
    defaultFilled,
    id,
    resetVersion,
    syncControlledAnswerSelection,
  ]);
  useLayoutEffect(() => {
    const node = element.current;
    if (node && controlled) node.defaultValue = String(value);
  }, [controlled, value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event);
    if (event.defaultPrevented || controlled) return;
    const nowFilled = event.target.value.trim().length > 0;
    setFilledState(nowFilled);
    setAnswerSelectionFromInteraction(id, nowFilled);
  }

  const handleRef = useCallback(
    (node: HTMLInputElement | null) => {
      element.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const input = useRender({
    defaultTagName: "input",
    render,
    props: mergeProps<"input">(
      {
        "data-slot": "questionnaire-input",
        className: cn("sprout-input", "sprout-questionnaire-input", className),
        "aria-invalid": invalid || undefined,
        "aria-keyshortcuts": keyShortcuts(
          null,
          !disabled && filled && selected,
        ),
        defaultValue: controlled ? undefined : defaultValue,
        disabled,
        form: selected ? undefined : "",
        id,
        name: selected ? name : undefined,
        onChange: handleChange,
        ref: handleRef,
        type,
        value: controlled ? value : undefined,
      } as object,
      props,
    ),
    state: { disabled, filled, invalid },
    stateAttributesMapping: {
      filled: (on): Record<string, string> =>
        on ? { "data-filled": "" } : { "data-empty": "" },
    },
  });
  return (
    <div
      data-slot="questionnaire-input-wrapper"
      className="sprout-questionnaire-input-wrapper"
    >
      {input}
    </div>
  );
}

/* Error --------------------------------------------------------------------- */

export interface QuestionnaireErrorState extends Record<string, unknown> {
  invalid: boolean;
}

export type QuestionnaireErrorProps = useRender.ComponentProps<
  "p",
  QuestionnaireErrorState
>;

/** Shown after someone tries to move on without a valid answer. */
export function QuestionnaireError({
  children,
  className,
  id,
  render,
  ...props
}: QuestionnaireErrorProps) {
  const { invalid, registerError, required } = useItem("QuestionnaireError");
  const generated = useId();
  const resolved = id ?? generated;
  useLayoutEffect(() => registerError(resolved), [resolved, registerError]);
  return useRender({
    defaultTagName: "p",
    render,
    props: mergeProps<"p">(
      {
        "data-slot": "questionnaire-error",
        className: cn("sprout-questionnaire-error", className),
        id: resolved,
        hidden: !invalid,
        role: invalid ? "alert" : undefined,
        children:
          children ??
          (required
            ? "Choose an answer to continue."
            : "Choose an answer or skip this question."),
      } as object,
      props,
    ),
    state: { invalid },
  });
}

/* Actions ------------------------------------------------------------------- */

export type QuestionnaireActionsProps = ComponentProps<"div">;

/** Previous on the start side; Skip and Next or Submit on the end side. */
export function QuestionnaireActions({
  className,
  ...props
}: QuestionnaireActionsProps) {
  return (
    <div
      data-slot="questionnaire-actions"
      className={cn("sprout-questionnaire-actions", className)}
      {...props}
    />
  );
}

export interface QuestionnaireNavigationState extends Record<string, unknown> {
  disabled: boolean;
  shortcut: "Enter" | null;
  status: QuestionnaireItemStatus | null;
  visible: boolean;
}

export type QuestionnaireNavigationProps = useRender.ComponentProps<
  "button",
  QuestionnaireNavigationState
> & {
  /** A Button variant. */
  variant?: ButtonVariant | undefined;
  /** A Button size. */
  size?: ButtonSize | undefined;
};

export type QuestionnairePreviousProps = QuestionnaireNavigationProps;
export type QuestionnaireSkipProps = QuestionnaireNavigationProps;
export type QuestionnaireNextProps = QuestionnaireNavigationProps;
export type QuestionnaireSubmitProps = QuestionnaireNavigationProps;

type NavigationSlot = "previous" | "skip" | "next" | "submit";

function useNavigationButton(
  slot: NavigationSlot,
  {
    children,
    className,
    disabled = false,
    onClick,
    render,
    size = "default",
    tabIndex,
    type,
    variant,
    ...props
  }: QuestionnaireNavigationProps,
  {
    label,
    visible,
    status,
    shortcut,
    action,
  }: {
    label: string;
    visible: boolean;
    status: QuestionnaireItemStatus | null;
    shortcut?: "Enter";
    action?: () => void;
  },
) {
  const resolvedVariant =
    variant ?? (slot === "next" || slot === "submit" ? "default" : "outline");
  const activeShortcut = visible && !disabled ? (shortcut ?? null) : null;
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (!event.defaultPrevented) action?.();
  }
  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        "data-slot": `questionnaire-${slot}`,
        "data-size": size,
        "data-variant": resolvedVariant,
        className: cn(
          buttonVariants({ variant: resolvedVariant, size }),
          "sprout-questionnaire-action",
          `sprout-questionnaire-${slot}`,
          className,
        ),
        "aria-hidden": !visible || undefined,
        "aria-keyshortcuts": activeShortcut ?? undefined,
        children: children ?? label,
        disabled,
        hidden: !visible,
        inert: !visible,
        onClick: action ? handleClick : onClick,
        tabIndex: visible ? tabIndex : -1,
        type: type ?? (slot === "submit" ? "submit" : "button"),
      } as object,
      props,
    ),
    state: { disabled, shortcut: activeShortcut, status, visible },
    stateAttributesMapping: {
      visible: (on): Record<string, string> =>
        on ? { "data-visible": "" } : { "data-hidden": "" },
    },
  });
}

/** Goes back one item. Hidden on the first item. */
export function QuestionnairePrevious(props: QuestionnairePreviousProps) {
  const root = useRoot("QuestionnairePrevious");
  return useNavigationButton("previous", props, {
    label: "Previous",
    visible: root.total > 1 && !root.first,
    status: root.activeItemStatus,
    action: root.goPrevious,
  });
}

/** Clears the answer and moves on. Shown only on optional items; submits on the last one. */
export function QuestionnaireSkip(props: QuestionnaireSkipProps) {
  const root = useRoot("QuestionnaireSkip");
  return useNavigationButton("skip", props, {
    label: "Skip",
    visible: root.activeItemRequired === false,
    status: root.activeItemStatus,
    action: root.skipCurrent,
  });
}

/** Checks the answer and moves on. Hidden on the last item. */
export function QuestionnaireNext(props: QuestionnaireNextProps) {
  const root = useRoot("QuestionnaireNext");
  return useNavigationButton("next", props, {
    label: "Next",
    visible: root.total > 1 && !root.last,
    status: root.activeItemStatus,
    shortcut: "Enter",
    action: root.goNext,
  });
}

/** Submits the form. Shown only on the last item. */
export function QuestionnaireSubmit(props: QuestionnaireSubmitProps) {
  const root = useRoot("QuestionnaireSubmit");
  return useNavigationButton("submit", props, {
    label: "Submit",
    visible: root.total > 0 && root.last,
    status: root.activeItemStatus,
    shortcut: "Enter",
  });
}
