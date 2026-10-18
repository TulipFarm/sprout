import { useState, type ReactNode } from "react";
import { ArrowUp } from "reicon-react/icons/ArrowUp";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { BrandIcon, type Brand } from "@tulipfarm/sprout/brand-icon";
import { Button } from "@tulipfarm/sprout/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@tulipfarm/sprout/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@tulipfarm/sprout/popover";
import { ReasoningEffort } from "@tulipfarm/sprout/reasoning-effort";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tulipfarm/sprout/tooltip";
import "../styles/reasoning-effort-demo.css";

function Example({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="reasoning-effort-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="reasoning-effort-demo-card-body">{children}</div>
    </section>
  );
}

const playgroundLevels = ["Quick", "Balanced", "Thorough", "Maximum"];

/** Cloud's internal playground: four named levels, no label. */
export function ReasoningEffortPlayground() {
  const [value, setValue] = useState(1);
  return (
    <Example
      title="Interactive effort selector"
      description="Drag the thumb, click a spot on the track, or use the arrow keys. A bubble with the level name grows out of the track while you drag, and the thumb snaps to the nearest level when you let go."
    >
      <div
        className="reasoning-effort-demo-stack"
        data-testid="effort-playground"
      >
        <ReasoningEffort
          levels={playgroundLevels}
          value={value}
          onValueChange={setValue}
        />
        <p role="status" className="reasoning-effort-demo-status">
          Selected level: {playgroundLevels[value]}
        </p>
      </div>
    </Example>
  );
}

/* Cloud's composer vocabulary: the effort ids map to these labels. */
type Effort = "low" | "medium" | "high" | "max";
const effortLabel: Record<Effort, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  max: "Max",
};
const allEfforts: readonly Effort[] = ["low", "medium", "high", "max"];

interface Model {
  id: string;
  label: string;
  brand: Brand;
  efforts: readonly Effort[];
}

const models: readonly Model[] = [
  {
    id: "claude-opus",
    label: "Claude Opus",
    brand: "claude",
    efforts: allEfforts,
  },
  {
    id: "claude-sonnet",
    label: "Claude Sonnet",
    brand: "claude",
    efforts: allEfforts,
  },
  { id: "gpt", label: "GPT", brand: "openai", efforts: allEfforts },
  {
    id: "deepseek-pro",
    label: "DeepSeek Pro",
    brand: "deepseek",
    efforts: allEfforts,
  },
  { id: "grok", label: "Grok", brand: "grok", efforts: allEfforts },
  { id: "kimi", label: "Kimi", brand: "kimi", efforts: allEfforts },
];

function ModelPicker() {
  const [open, setOpen] = useState(false);
  const [modelId, setModelId] = useState("claude-opus");
  const [effort, setEffort] = useState<Effort>("high");
  const model = models.find((candidate) => candidate.id === modelId)!;
  const showEffort = model.efforts.length > 0;
  const effortIndex = Math.max(0, model.efforts.indexOf(effort));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Model: ${model.label}${showEffort ? `, ${effortLabel[effort]} effort` : ""}`}
                />
              }
            />
          }
        >
          <BrandIcon brand={model.brand} size="inline" />
          <span className="reasoning-effort-demo-truncate">{model.label}</span>
          <ChevronDown size={12} aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>AI model that writes replies</TooltipContent>
      </Tooltip>
      <PopoverContent size="picker" side="top" align="end" sideOffset={8}>
        <Command>
          <CommandInput
            aria-label="Search models"
            placeholder="Search models…"
          />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            <CommandGroup heading="Model">
              {models.map((candidate) => (
                <CommandItem
                  key={candidate.id}
                  value={candidate.label}
                  data-checked={candidate.id === modelId}
                  onSelect={() => setModelId(candidate.id)}
                >
                  <BrandIcon brand={candidate.brand} size="inline" />
                  <span>{candidate.label}</span>
                  {candidate.id === modelId && (
                    <span className="reasoning-effort-demo-sr-only">
                      Current model
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {showEffort && (
          <div
            className="reasoning-effort-demo-effort"
            data-testid="effort-footer"
          >
            <div className="reasoning-effort-demo-effort-head">
              <span className="reasoning-effort-demo-muted">Effort</span>
              <span className="reasoning-effort-demo-strong">
                {effortLabel[effort]}
              </span>
            </div>
            <ReasoningEffort
              label={model.label}
              levels={model.efforts.map((level) => effortLabel[level])}
              value={effortIndex}
              onValueChange={(index) => {
                const level = model.efforts[index];
                if (level) setEffort(level);
              }}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Cloud's chat composer: the effort slider sits under the model list. */
export function ReasoningEffortComposer() {
  return (
    <Example
      title="Composer model picker"
      description="The chat composer's model picker. The slider sits below the model list, the bubble shows the model name with the level, and picking a model keeps the panel open so you can set its effort."
    >
      <div
        className="reasoning-effort-demo-composer"
        role="group"
        aria-label="Sample message composer"
        data-testid="effort-composer"
      >
        <p className="reasoning-effort-demo-muted">Ask about your workspace…</p>
        <div className="reasoning-effort-demo-composer-bar">
          <span className="reasoning-effort-demo-spacer" />
          <ModelPicker />
          <Button size="icon-sm" aria-label="Send message" disabled>
            <ArrowUp size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Example>
  );
}

function LevelRow({
  testId,
  model,
  efforts,
  initial,
}: {
  testId: string;
  model: string;
  efforts: readonly Effort[];
  initial: number;
}) {
  const [value, setValue] = useState(initial);
  const levels = efforts.map((level) => effortLabel[level]);
  return (
    <div className="reasoning-effort-demo-row" data-testid={testId}>
      <div className="reasoning-effort-demo-effort-head">
        <span className="reasoning-effort-demo-muted">
          {model} · {levels.length} {levels.length === 1 ? "level" : "levels"}
        </span>
        <span className="reasoning-effort-demo-strong">{levels[value]}</span>
      </div>
      <ReasoningEffort
        label={model}
        aria-label={`${model} reasoning effort`}
        levels={levels}
        value={value}
        onValueChange={setValue}
      />
    </div>
  );
}

/** Ticks spread evenly however many levels a model offers. */
export function ReasoningEffortLevels() {
  return (
    <Example
      title="Level counts"
      description="A model's level list sets the ticks. Ticks grow taller toward higher effort, and the tick under the fill turns light. One level still renders, with the thumb parked at the start."
    >
      <div className="reasoning-effort-demo-grid">
        <LevelRow
          testId="effort-levels-4"
          model="Claude Opus"
          efforts={allEfforts}
          initial={3}
        />
        <LevelRow
          testId="effort-levels-3"
          model="DeepSeek Pro"
          efforts={["low", "medium", "high"]}
          initial={1}
        />
        <LevelRow
          testId="effort-levels-2"
          model="Kimi"
          efforts={["low", "high"]}
          initial={0}
        />
        <LevelRow
          testId="effort-levels-1"
          model="Grok"
          efforts={["high"]}
          initial={0}
        />
      </div>
    </Example>
  );
}

export default function ReasoningEffortDemo() {
  return (
    <div id="reasoning-effort-demo" className="reasoning-effort-demo">
      <ReasoningEffortPlayground />
      <ReasoningEffortComposer />
      <ReasoningEffortLevels />
    </div>
  );
}
