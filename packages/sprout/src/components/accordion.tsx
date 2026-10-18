"use client";

import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { cn, stateClassName } from "../internal/classes.js";

export const accordionTriggerVariantNames = ["default", "quiet"] as const;

export type AccordionTriggerVariant =
  (typeof accordionTriggerVariantNames)[number];

export type AccordionProps<Value = any> = BaseAccordion.Root.Props<Value>;

/**
 * A stack of sections that open in place. One section opens at a time unless
 * you pass `multiple`. Pass `value` and `onValueChange` to control which
 * sections are open, or `defaultValue` to let it manage itself.
 */
export function Accordion<Value = any>({
  className,
  ...props
}: AccordionProps<Value>) {
  return (
    <BaseAccordion.Root<Value>
      data-slot="accordion"
      {...props}
      className={stateClassName<BaseAccordion.Root.State<Value>>(
        "sprout-accordion",
        className,
      )}
    />
  );
}

export type AccordionItemProps = BaseAccordion.Item.Props;

/** One section. Give it a `value` to open it by default or to control it. */
export function AccordionItem({ className, ...props }: AccordionItemProps) {
  return (
    <BaseAccordion.Item
      data-slot="accordion-item"
      {...props}
      className={stateClassName<BaseAccordion.Item.State>(
        "sprout-accordion-item",
        className,
      )}
    />
  );
}

export interface AccordionTriggerProps extends BaseAccordion.Trigger.Props {
  /**
   * `default` underlines its label on hover. `quiet` stays still, for
   * triggers that hold a title and a summary line.
   */
  variant?: AccordionTriggerVariant;
}

/** The heading button that opens and closes its section. */
export function AccordionTrigger({
  className,
  children,
  variant = "default",
  ...props
}: AccordionTriggerProps) {
  return (
    <BaseAccordion.Header
      data-slot="accordion-header"
      className="sprout-accordion-header"
    >
      <BaseAccordion.Trigger
        data-slot="accordion-trigger"
        data-variant={variant}
        {...props}
        className={stateClassName<BaseAccordion.Trigger.State>(
          `sprout-accordion-trigger sprout-accordion-trigger-${variant}`,
          className,
        )}
      >
        {children}
        <ChevronDown
          size={16}
          aria-hidden="true"
          data-slot="accordion-trigger-icon"
          className="sprout-accordion-trigger-icon"
        />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

export interface AccordionContentProps extends Omit<
  BaseAccordion.Panel.Props,
  "className"
> {
  /** Classes for the padded inner box that holds the content. */
  className?: string;
}

/** The section body. It grows open and shrinks closed. */
export function AccordionContent({
  className,
  children,
  ...props
}: AccordionContentProps) {
  return (
    <BaseAccordion.Panel
      data-slot="accordion-content"
      {...props}
      className="sprout-accordion-content"
    >
      <div className={cn("sprout-accordion-content-inner", className)}>
        {children}
      </div>
    </BaseAccordion.Panel>
  );
}
