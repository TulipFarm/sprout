import { useEffect, useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@tulipfarm/sprout/accordion";
import { Button } from "@tulipfarm/sprout/button";
import { Input } from "@tulipfarm/sprout/input";
import "../styles/accordion-demo.css";
import DocsSelect from "./DocsSelect";

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
    <section className="accordion-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="accordion-demo-card-body">{children}</div>
    </section>
  );
}

function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="accordion-demo-pair" role="group" aria-label={label}>
      <span className="accordion-demo-label">{label}</span>
      <div className="accordion-demo-pair-body">{children}</div>
    </div>
  );
}

export function AccordionHero() {
  return (
    <Example
      title="Single and multiple"
      description="The first section starts open. The third section is disabled."
    >
      <div className="accordion-demo-columns">
        {[false, true].map((multiple) => (
          <div
            key={String(multiple)}
            className="accordion-demo-column"
            role="group"
            aria-label={multiple ? "Multiple open" : "Single open"}
          >
            <p className="accordion-demo-eyebrow">
              {multiple
                ? "Multiple sections can stay open"
                : "Only one section can stay open"}
            </p>
            <Accordion multiple={multiple} defaultValue={["one"]}>
              <AccordionItem value="one">
                <AccordionTrigger>What is this example?</AccordionTrigger>
                <AccordionContent>
                  Real shared components with sample data and local state.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="two">
                <AccordionTrigger>Can I open more than one?</AccordionTrigger>
                <AccordionContent>
                  {multiple
                    ? "Yes. This allows multiple open panels."
                    : "This example allows a single open panel."}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="three" disabled>
                <AccordionTrigger>Disabled item</AccordionTrigger>
                <AccordionContent>Unavailable</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ))}
      </div>
    </Example>
  );
}

function TwoLine({
  id,
  title,
  summary,
}: {
  id: string;
  title: string;
  summary: string;
}) {
  return (
    <span className="accordion-demo-two-line">
      <span>{title}</span>
      <span id={id} className="accordion-demo-summary">
        {summary}
      </span>
    </span>
  );
}

export function AccordionVariants() {
  return (
    <Example
      title="Trigger variants"
      description="default underlines its label on hover. quiet holds a title and a summary and stays still."
    >
      <Pair label="default">
        <Accordion>
          <AccordionItem>
            <AccordionTrigger>About this integration</AccordionTrigger>
            <AccordionContent>
              <p className="accordion-demo-muted">
                Ask about repositories, issues and pull requests in your
                personal chats.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Pair>
      <Pair label="quiet">
        <Accordion>
          <AccordionItem value="sources">
            <AccordionTrigger
              variant="quiet"
              aria-label="Google calendars"
              aria-describedby="variant-source-summary"
            >
              <TwoLine
                id="variant-source-summary"
                title="Google calendars"
                summary="2 of 3 shown"
              />
            </AccordionTrigger>
            <AccordionContent>
              <p className="accordion-demo-muted">
                Work, Team rota, and Holidays are connected.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Pair>
    </Example>
  );
}

const sampleCalendars = [
  { id: "work", summary: "Work" },
  { id: "rota", summary: "Team rota" },
  { id: "holidays", summary: "Holidays in United Kingdom" },
];

const zones = [
  { value: "Europe/London", label: "London" },
  { value: "America/New_York", label: "New York" },
  { value: "Asia/Kolkata", label: "Kolkata" },
  { value: "America/Los_Angeles", label: "Los Angeles" },
] as const;

type Zone = (typeof zones)[number]["value"];
const zoneName = (zone: string) =>
  zone.split("/").at(-1)?.replaceAll("_", " ") ?? zone;
const sampleTime: Record<Zone, string> = {
  "Europe/London": "9:41 AM",
  "America/New_York": "4:41 AM",
  "Asia/Kolkata": "2:11 PM",
  "America/Los_Angeles": "1:41 AM",
};

export function AccordionCalendarFilters() {
  const [hidden, setHidden] = useState<string[]>(["holidays"]);
  const [zone, setZone] = useState<Zone>("Europe/London");
  const [second, setSecond] = useState<Zone | "none">("America/New_York");
  const shown = sampleCalendars.length - hidden.length;
  return (
    <Example
      title="Calendar filters"
      description="multiple with quiet triggers. Each summary updates as you change the section."
    >
      <div className="accordion-demo-filters">
        <Accordion multiple>
          <AccordionItem value="sources">
            <AccordionTrigger
              variant="quiet"
              aria-label="Google calendars"
              aria-describedby="calendar-source-summary"
            >
              <TwoLine
                id="calendar-source-summary"
                title="Google calendars"
                summary={`${shown} of ${sampleCalendars.length} shown`}
              />
            </AccordionTrigger>
            <AccordionContent>
              <section
                className="accordion-demo-stack"
                aria-label="Calendar sources"
              >
                {sampleCalendars.map((source) => (
                  <label key={source.id} className="accordion-demo-check">
                    <input
                      type="checkbox"
                      checked={!hidden.includes(source.id)}
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setHidden((current) =>
                          checked
                            ? current.filter((value) => value !== source.id)
                            : [...current, source.id],
                        );
                      }}
                    />
                    {source.summary}
                  </label>
                ))}
                <Button
                  variant="link"
                  size="xs"
                  nativeButton={false}
                  render={<a href="#calendar-filters" />}
                >
                  Manage integrations
                </Button>
              </section>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="zones">
            <AccordionTrigger
              variant="quiet"
              aria-label="Time zones"
              aria-describedby="calendar-zone-summary"
            >
              <TwoLine
                id="calendar-zone-summary"
                title="Time zones"
                summary={`${zoneName(zone)}${second !== "none" && second !== zone ? ` · ${zoneName(second)}` : ""}`}
              />
            </AccordionTrigger>
            <AccordionContent>
              <section className="accordion-demo-stack" aria-label="Time zones">
                <div className="accordion-demo-row">
                  <span>Calendar time</span>
                  <time>{sampleTime[zone]}</time>
                </div>
                <DocsSelect<Zone>
                  label="Calendar time zone"
                  value={zone}
                  items={zones}
                  onValueChange={setZone}
                  className="accordion-demo-select"
                />
                <div className="accordion-demo-row">
                  <span>Compare with</span>
                  {second !== "none" && <time>{sampleTime[second]}</time>}
                </div>
                <DocsSelect<Zone | "none">
                  label="Second time zone"
                  value={second}
                  items={[{ value: "none", label: "None" }, ...zones]}
                  onValueChange={setSecond}
                  className="accordion-demo-select"
                />
              </section>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Example>
  );
}

const kindOptions = [
  { value: "docs", label: "Documentation" },
  { value: "issues", label: "Issues" },
  { value: "pulls", label: "Pull requests" },
  { value: "discussions", label: "Discussions" },
] as const;

export function AccordionImportSettings() {
  const [open, setOpen] = useState(false);
  const [kinds, setKinds] = useState<string[]>(["docs", "issues"]);
  const [after, setAfter] = useState("2026-04-01");
  const [shared, setShared] = useState(false);
  const since = Number.isFinite(Date.parse(after))
    ? `since ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(Date.parse(after))}`
    : "choose a date";
  return (
    <Example
      title="GitHub import settings"
      description="Controlled with value and onValueChange. A summary replaces the settings while they are closed."
    >
      <div className="accordion-demo-muted-box">
        <Accordion
          value={open ? ["settings"] : []}
          onValueChange={(value) => setOpen(value.includes("settings"))}
        >
          <AccordionItem value="settings">
            <AccordionTrigger>Import settings</AccordionTrigger>
            <AccordionContent>
              <div className="accordion-demo-settings">
                <fieldset className="accordion-demo-fieldset">
                  <legend>Content to import</legend>
                  {kindOptions.map((kind) => (
                    <label key={kind.value} className="accordion-demo-check">
                      <input
                        type="checkbox"
                        checked={kinds.includes(kind.value)}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setKinds((current) =>
                            checked
                              ? [...current, kind.value]
                              : current.filter((value) => value !== kind.value),
                          );
                        }}
                      />
                      {kind.label}
                    </label>
                  ))}
                  {!kinds.length && (
                    <p className="accordion-demo-error" role="alert">
                      Choose at least one kind of content.
                    </p>
                  )}
                </fieldset>
                <div className="accordion-demo-field">
                  <label htmlFor="github-after">Import activity after</label>
                  <Input
                    id="github-after"
                    type="date"

                    value={after}
                    onChange={(event) => setAfter(event.currentTarget.value)}
                  />
                  <p className="accordion-demo-summary">
                    Applies to issues, pull requests and discussions. Dates use
                    UTC.
                  </p>
                </div>
                <section
                  className="accordion-demo-access"
                  aria-label="Who can access this content"
                >
                  <h4>Who can access this content?</h4>
                  <label className="accordion-demo-check">
                    <input
                      type="checkbox"
                      checked={shared}
                      onChange={(event) =>
                        setShared(event.currentTarget.checked)
                      }
                    />
                    Share with selected workspace members
                  </label>
                </section>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        {!open && (
          <p className="accordion-demo-summary" data-testid="import-summary">
            {kindOptions
              .filter((kind) => kinds.includes(kind.value))
              .map((kind) => kind.label)
              .join(", ") || "Choose content"}{" "}
            · {since} · {shared ? "3 readers + you" : "only you"}
          </p>
        )}
      </div>
    </Example>
  );
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const savedProposal = "6f1c2a9e-4b7d-4e2a-9c51-0d3e8f7a1b24";

type Recovery =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded" }
  | { kind: "error" };

export function AccordionRecoverProposal() {
  const [reference, setReference] = useState("");
  const [state, setState] = useState<Recovery>({ kind: "idle" });
  useEffect(() => {
    if (state.kind !== "loading") return;
    const timer = setTimeout(
      () =>
        setState({
          kind: reference === savedProposal ? "loaded" : "error",
        }),
      700,
    );
    return () => clearTimeout(timer);
  }, [state, reference]);
  const busy = state.kind === "loading";
  return (
    <Example
      title="Proposal recovery"
      description={`One closed section with a form. Try ${savedProposal} or any other UUID.`}
    >
      <Accordion>
        <AccordionItem>
          <AccordionTrigger>Recover a saved proposal</AccordionTrigger>
          <AccordionContent>
            <div className="accordion-demo-stack accordion-demo-gap-lg">
              <p>
                Enter a proposal reference to read its saved decision and
                receipt. Recovery never resends an execution.
              </p>
              <label
                htmlFor="recover-proposal"
                className="accordion-demo-label-text"
              >
                Proposal reference
              </label>
              <Input
                id="recover-proposal"

                value={reference}
                spellCheck={false}
                autoComplete="off"
                onChange={(event) => {
                  setReference(event.currentTarget.value.trim());
                  setState({ kind: "idle" });
                }}
              />
              <div>
                <Button
                  variant="outline"
                  aria-busy={busy}
                  disabled={busy || !uuid.test(reference)}
                  onClick={() => setState({ kind: "loading" })}
                >
                  {busy ? "Loading saved proposal…" : "Load saved proposal"}
                </Button>
              </div>
              {state.kind === "loaded" && (
                <p role="status" className="accordion-demo-success">
                  Proposal loaded. Decision: approved. Receipt: succeeded.
                </p>
              )}
              {state.kind === "error" && (
                <p role="alert" className="accordion-demo-error">
                  No saved proposal matches this reference.
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Example>
  );
}

export function AccordionAboutIntegration() {
  const [automatic, setAutomatic] = useState(false);
  return (
    <Example
      title="Integration details"
      description="A single section at the end of a settings sheet, below a divider."
    >
      <label className="accordion-demo-check">
        <input
          type="checkbox"
          checked={automatic}
          onChange={(event) => setAutomatic(event.currentTarget.checked)}
        />
        Automatic Knowledge is on
      </label>
      <div className="accordion-demo-divided">
        <Accordion>
          <AccordionItem>
            <AccordionTrigger>About this integration</AccordionTrigger>
            <AccordionContent>
              <div className="accordion-demo-prose">
                <p>
                  Ask about repositories, issues and pull requests in your
                  personal chats. Supported changes need your approval.
                </p>
                <p>
                  Your integration is private to you. Workspace admins cannot
                  use it.{" "}
                  {automatic ? (
                    <>
                      New integrations import content only you can search; see{" "}
                      <a href="#about-this-integration">Automatic Knowledge</a>.
                    </>
                  ) : (
                    "Importing content into Knowledge is a separate choice below your connected account."
                  )}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Example>
  );
}
