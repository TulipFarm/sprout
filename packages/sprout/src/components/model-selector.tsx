'use client';

import { type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { Check } from 'reicon-react/icons/Check';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { Search } from 'reicon-react/icons/Search';
import { cn } from '../internal/classes.js';
import { BrandIcon, type Brand } from './brand-icon.js';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip.js';

export const modelSelectorMetricNames = ['speed', 'quality', 'cost'] as const;

export type ModelSelectorMetric = (typeof modelSelectorMetricNames)[number];

/** A rating from 1 to 5, or `null` when the model has no number for that metric. */
export type ModelSelectorRating = Record<ModelSelectorMetric, number | null>;

export interface ModelSelectorModel {
  id: string;
  label: string;
  /** One short line under the name, such as "Everyday work". */
  description?: string | undefined;
  /** Draws the vendor logo. Use `icon` for a mark that isn't a `Brand`. */
  brand?: Brand | undefined;
  /** A 16px mark. Without `brand` or `icon`, the first letter of `label` stands in. */
  icon?: ReactNode;
  disabled?: boolean | undefined;
  /** Any raw number where higher is faster, such as tokens per second. */
  speed?: number | undefined;
  /** Any raw number where higher is better, such as a benchmark score. */
  quality?: number | undefined;
  /** Any raw number where higher costs more, such as dollars per million tokens. */
  cost?: number | undefined;
}

export interface ModelSelectorProps {
  models: ModelSelectorModel[];
  /** The chosen model's `id`. */
  value: string | undefined;
  onValueChange: (id: string) => void;
  /** Names the picker and heads the first column. Defaults to `Model`. */
  label?: string | undefined;
  /** Placeholder for the search field. Defaults to `Search models`. */
  searchPlaceholder?: string | undefined;
  /** Shown when the search matches nothing. Defaults to `No model found.` */
  emptyMessage?: string | undefined;
  disabled?: boolean | undefined;
  /** Which side of the trigger the list opens on. Defaults to `bottom`. */
  side?: 'top' | 'bottom' | undefined;
  align?: 'start' | 'center' | 'end' | undefined;
  /** Swap the trigger element, such as an `InputGroupButton` inside a composer. */
  render?: ReactElement | undefined;
  className?: string | undefined;
}

const LEVELS = 5;
const metricNames: Record<ModelSelectorMetric, string> = { speed: 'Speed', quality: 'Quality', cost: 'Cost' };
const metricMeanings: Record<ModelSelectorMetric, string> = {
  speed: 'How quickly it answers.',
  quality: 'How well it handles hard work.',
  cost: 'How much each message costs.',
};
const levelNames: Record<ModelSelectorMetric, readonly string[]> = {
  speed: ['Slowest', 'Slower', 'Middle', 'Faster', 'Fastest'],
  quality: ['Weakest', 'Weaker', 'Middle', 'Stronger', 'Strongest'],
  cost: ['Cheapest', 'Cheaper', 'Middle', 'Pricier', 'Priciest'],
};

/**
 * Rates each model from 1 to 5 per metric, against the slowest, weakest, and
 * cheapest model in the list (1) and the fastest, strongest, and priciest (5).
 * When every model has the same number, they all get 3.
 */
export function rateModels(models: readonly ModelSelectorModel[]): Map<string, ModelSelectorRating> {
  const ranges = {} as Record<ModelSelectorMetric, [number, number] | null>;
  for (const metric of modelSelectorMetricNames) {
    const values = models.map(model => model[metric]).filter((n): n is number => Number.isFinite(n));
    ranges[metric] = values.length ? [Math.min(...values), Math.max(...values)] : null;
  }
  const ratings = new Map<string, ModelSelectorRating>();
  for (const model of models) {
    const rating = {} as ModelSelectorRating;
    for (const metric of modelSelectorMetricNames) {
      const value = model[metric];
      const range = ranges[metric];
      if (!range || value === undefined || !Number.isFinite(value)) rating[metric] = null;
      else if (range[0] === range[1]) rating[metric] = Math.ceil(LEVELS / 2);
      else rating[metric] = 1 + Math.round(((value - range[0]) / (range[1] - range[0])) * (LEVELS - 1));
    }
    ratings.set(model.id, rating);
  }
  return ratings;
}

function Mark({ model }: { model: ModelSelectorModel }) {
  if (model.brand) return <BrandIcon brand={model.brand} size="inline" />;
  if (model.icon) return model.icon;
  return (
    <span className="sprout-model-selector-letter" aria-hidden="true">
      {Array.from(model.label.trim())[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

function Meter({ metric, level }: { metric: ModelSelectorMetric; level: number | null }) {
  if (level === null)
    return (
      <span data-slot="model-selector-meter" data-metric={metric} className="sprout-model-selector-meter">
        <span className="sprout-model-selector-unknown" aria-hidden="true">
          –
        </span>
        <span className="sprout-model-selector-sr-only">{metricNames[metric]} unknown.</span>
      </span>
    );
  return (
    <span data-slot="model-selector-meter" data-metric={metric} className="sprout-model-selector-meter">
      <Segments level={level} />
      <span className="sprout-model-selector-sr-only">
        {metricNames[metric]} {level} of {LEVELS}, {levelNames[metric][level - 1]!.toLowerCase()}.
      </span>
    </span>
  );
}

function Segments({ level }: { level: number }) {
  return Array.from({ length: LEVELS }, (_, index) => (
    <span
      key={index}
      aria-hidden="true"
      data-on={index < level}
      className="sprout-model-selector-segment"
      style={{ '--sprout-model-selector-index': index } as CSSProperties}
    />
  ));
}

/** Explains a column heading: what it measures and what each count of bars means. */
function Heading({ metric }: { metric: ModelSelectorMetric }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span />} data-metric={metric} className="sprout-model-selector-heading">
        {metricNames[metric]}
      </TooltipTrigger>
      <TooltipContent side="top" className="sprout-model-selector-legend">
        <span className="sprout-model-selector-legend-title">{metricNames[metric]}</span>
        <span className="sprout-model-selector-legend-meaning">
          {metricMeanings[metric]} Rated against the other models in this list.
        </span>
        <span className="sprout-model-selector-legend-scale">
          {levelNames[metric].map((name, index) => (
            <span key={name} className="sprout-model-selector-legend-row">
              <span className="sprout-model-selector-meter" data-metric={metric}>
                <Segments level={index + 1} />
              </span>
              {name}
            </span>
          ))}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

const modelLabel = (model: ModelSelectorModel) => model.label;
const sameModel = (a: ModelSelectorModel, b: ModelSelectorModel) => a.id === b.id;
const matches = (model: ModelSelectorModel, query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [model.label, model.description, model.brand].some(text => text?.toLowerCase().includes(needle));
};

/**
 * A searchable model picker for chat. The trigger shows the vendor logo and
 * name. The list has a search field and shows each model with its logo, a
 * description and, when the models carry numbers, colored 5-step meters for
 * speed, quality, and cost, rated against the other models in the list.
 */
export function ModelSelector({
  models,
  value,
  onValueChange,
  label = 'Model',
  searchPlaceholder = 'Search models',
  emptyMessage = 'No model found.',
  disabled = false,
  side = 'bottom',
  align = 'start',
  render,
  className,
}: ModelSelectorProps) {
  const ratings = rateModels(models);
  const metered = [...ratings.values()].some(rating => modelSelectorMetricNames.some(m => rating[m] !== null));
  const selected = models.find(model => model.id === value) ?? null;

  return (
    <ComboboxPrimitive.Root
      items={models}
      value={selected}
      onValueChange={model => {
        if (model) onValueChange(model.id);
      }}
      itemToStringLabel={modelLabel}
      isItemEqualToValue={sameModel}
      filter={matches}
      autoHighlight
      disabled={disabled || models.length === 0}
    >
      <ComboboxPrimitive.Trigger
        data-slot="model-selector"
        aria-label={`${label}: ${selected?.label ?? 'None'}`}
        render={render}
        className={cn('sprout-model-selector-trigger', className)}
      >
        {selected && (
          <span data-slot="model-selector-mark" className="sprout-model-selector-mark">
            <Mark model={selected} />
          </span>
        )}
        <span data-slot="model-selector-value" className="sprout-model-selector-value" data-empty={!selected}>
          {selected?.label ?? label}
        </span>
        <ChevronDown aria-hidden="true" className="sprout-model-selector-chevron" />
      </ComboboxPrimitive.Trigger>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          className="sprout-model-selector-positioner"
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
        >
          <ComboboxPrimitive.Popup
            data-slot="model-selector-content"
            data-metered={metered}
            className="sprout-model-selector-content"
          >
            <div data-slot="model-selector-search" className="sprout-model-selector-search">
              <Search aria-hidden="true" />
              <ComboboxPrimitive.Input
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                className="sprout-model-selector-input"
              />
            </div>
            <div data-slot="model-selector-header" className="sprout-model-selector-header" aria-hidden="true">
              <span className="sprout-model-selector-heading-model">{label}</span>
              {metered && (
                <TooltipProvider delay={200}>
                  {modelSelectorMetricNames.map(metric => (
                    <Heading key={metric} metric={metric} />
                  ))}
                </TooltipProvider>
              )}
            </div>
            <ComboboxPrimitive.Empty className="sprout-model-selector-empty">{emptyMessage}</ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="sprout-model-selector-list">
              {(model: ModelSelectorModel) => {
                const rating = ratings.get(model.id)!;
                return (
                  <ComboboxPrimitive.Item
                    key={model.id}
                    value={model}
                    disabled={model.disabled}
                    data-slot="model-selector-item"
                    className="sprout-model-selector-item"
                  >
                    <span className="sprout-model-selector-tile" data-brand={model.brand}>
                      <Mark model={model} />
                    </span>
                    <span className="sprout-model-selector-text">
                      <span className="sprout-model-selector-name">
                        <span className="sprout-model-selector-name-text">{model.label}</span>
                        <ComboboxPrimitive.ItemIndicator className="sprout-model-selector-check">
                          <Check size={14} aria-hidden="true" />
                        </ComboboxPrimitive.ItemIndicator>
                      </span>
                      {model.description && (
                        <span className="sprout-model-selector-description">{model.description}</span>
                      )}
                    </span>
                    {metered &&
                      modelSelectorMetricNames.map(metric => (
                        <Meter key={metric} metric={metric} level={rating[metric]} />
                      ))}
                  </ComboboxPrimitive.Item>
                );
              }}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
