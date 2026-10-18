import { useState, type ReactNode } from "react";
import { ArrowDown } from "reicon-react/icons/ArrowDown";
import { ArrowUp } from "reicon-react/icons/ArrowUp";
import { Backspace } from "reicon-react/icons/Backspace";
import { Calendar } from "reicon-react/icons/Calendar";
import { Command as CommandIcon } from "reicon-react/icons/Command";
import { FileText } from "reicon-react/icons/FileText";
import { Search3 } from "reicon-react/icons/Search3";
import { Button } from "@tulipfarm/sprout/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@tulipfarm/sprout/command";
import { Kbd, KbdGroup, type KbdVariant } from "@tulipfarm/sprout/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tulipfarm/sprout/tooltip";
import "../styles/kbd-demo.css";

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
    <section className="kbd-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="kbd-demo-card-body">{children}</div>
    </section>
  );
}

const variantKeys: Record<KbdVariant, { note: string; keys: ReactNode[] }> = {
  default: {
    note: "Muted fill. Standalone keys and keys inside text.",
    keys: ["⌘", "Enter", "Esc", "Shift", "Tab"],
  },
  outline: {
    note: "Bordered surface. Hints on tinted strips and selected rows.",
    keys: ["↑ ↓", "↵", "Esc", "/", "[ ]"],
  },
};

function Variants() {
  return (
    <Example
      title="Variants"
      description="One 20px size. Keys grow with their label, so a single symbol stays square and a word gets room."
    >
      <div className="kbd-demo-variants">
        {(Object.keys(variantKeys) as KbdVariant[]).map((variant) => (
          <div
            key={variant}
            className="kbd-demo-variant"
            data-testid={`variant-${variant}`}
          >
            <div className="kbd-demo-variant-text">
              <code>{`variant="${variant}"`}</code>
              <span>{variantKeys[variant].note}</span>
            </div>
            <div className="kbd-demo-keys">
              {variantKeys[variant].keys.map((key, index) => (
                <Kbd key={index} variant={variant}>
                  {key}
                </Kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Example>
  );
}

function Groups() {
  return (
    <Example
      title="Keys and key groups"
      description="KbdGroup holds keys pressed together. Icons inside a key are 12px."
    >
      <dl className="kbd-demo-shortcuts">
        <div>
          <dt>Open search</dt>
          <dd>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </dd>
        </div>
        <div>
          <dt>Send message</dt>
          <dd>
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>Enter</Kbd>
            </KbdGroup>
          </dd>
        </div>
        <div>
          <dt>Move between results</dt>
          <dd>
            <KbdGroup>
              <Kbd>
                <ArrowUp aria-hidden="true" />
                <span className="kbd-demo-sr">Up arrow</span>
              </Kbd>
              <Kbd>
                <ArrowDown aria-hidden="true" />
                <span className="kbd-demo-sr">Down arrow</span>
              </Kbd>
            </KbdGroup>
          </dd>
        </div>
        <div>
          <dt>Delete draft</dt>
          <dd>
            <KbdGroup>
              <Kbd>
                <CommandIcon aria-hidden="true" />
                Cmd
              </Kbd>
              <Kbd>
                <Backspace aria-hidden="true" />
                <span className="kbd-demo-sr">Backspace</span>
              </Kbd>
            </KbdGroup>
          </dd>
        </div>
      </dl>
      <p className="kbd-demo-sentence">
        Press <Kbd>Esc</Kbd> to close.
      </p>
      <p className="kbd-demo-sentence">
        Press{" "}
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>{" "}
        anywhere to search notes, projects, and people.
      </p>
    </Example>
  );
}

const footers = [
  {
    label: "Search palette",
    hints: [
      ["↑↓", "Select"],
      ["↵", "Open"],
      ["Esc", "Close"],
    ],
  },
  {
    label: "Calendar commands",
    hints: [
      ["/", "Open commands"],
      ["[ ]", "Previous / next"],
      ["Esc", "Close"],
    ],
  },
  {
    label: "Search examples",
    hints: [
      ["↑ ↓", "Navigate"],
      ["↵", "Choose"],
    ],
  },
] as const;

function FooterHints() {
  return (
    <Example
      title="Footer hints"
      description="Outline keys on a tinted strip, each followed by what it does. The strip wraps instead of overflowing."
    >
      <div className="kbd-demo-footers">
        {footers.map((footer) => (
          <div key={footer.label} className="kbd-demo-footer-wrap">
            <span className="kbd-demo-footer-label">{footer.label}</span>
            <div
              role="group"
              className="kbd-demo-footer"
              aria-label={`${footer.label} keys`}
            >
              {footer.hints.map(([keys, action]) => (
                <span key={keys} className="kbd-demo-hint">
                  <Kbd variant="outline">{keys}</Kbd>
                  {action}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Example>
  );
}

const results = [
  {
    id: "new-event",
    title: "New event",
    media: <CommandIcon />,
    trailing: "N",
  },
  { id: "today", title: "Go to today", media: <CommandIcon />, trailing: "T" },
  {
    id: "planting",
    title: "Spring planting review",
    media: <Calendar />,
    detail: "Tue 14 Apr · 10:00–10:45",
  },
  {
    id: "notes",
    title: "Greenhouse notes",
    media: <FileText />,
    detail: "Meadow · Edited yesterday",
  },
];

function SelectedRow() {
  const [chosen, setChosen] = useState("Nothing chosen yet.");
  return (
    <Example
      title="Selected row"
      description="A hidden ↵ key appears on the highlighted row and replaces its shortcut. Use the arrow keys in the field, then Enter."
    >
      <div className="kbd-demo-palette">
        <Command label="Calendar results">
          <CommandInput placeholder="Find an event or command…" />
          <CommandList>
            <CommandEmpty>
              No matches. Try another title or command.
            </CommandEmpty>
            <CommandGroup heading="Results">
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  className="kbd-demo-result"
                  onSelect={(value) => setChosen(`Chose ${value}.`)}
                >
                  <span className="kbd-demo-result-media" aria-hidden="true">
                    {result.media}
                  </span>
                  <span className="kbd-demo-result-text">
                    <span className="kbd-demo-result-title">
                      {result.title}
                    </span>
                    {result.detail && (
                      <span className="kbd-demo-result-detail">
                        {result.detail}
                      </span>
                    )}
                  </span>
                  {result.trailing && (
                    <span className="kbd-demo-result-trailing">
                      {result.trailing}
                    </span>
                  )}
                  <Kbd
                    variant="outline"
                    aria-hidden="true"
                    className="kbd-demo-result-enter"
                  >
                    ↵
                  </Kbd>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <p role="status" className="kbd-demo-muted">
          {chosen}
        </p>
      </div>
    </Example>
  );
}

function InTooltip() {
  return (
    <Example
      title="In a tooltip"
      description="Keys sit beside the tooltip label and keep their fill on the tooltip surface."
    >
      <TooltipProvider>
        <div className="kbd-demo-tooltips">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" size="icon" aria-label="Search" />
              }
            >
              <Search3 aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>
              Search
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" />}>
              Close panel
            </TooltipTrigger>
            <TooltipContent>
              Close
              <Kbd>Esc</Kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </Example>
  );
}

export default function KbdDemo() {
  return (
    <div id="kbd-demo" className="kbd-demo">
      <Variants />
      <Groups />
      <FooterHints />
      <SelectedRow />
      <InTooltip />
    </div>
  );
}
