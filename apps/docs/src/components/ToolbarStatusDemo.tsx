import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download } from "reicon-react/icons/Download";
import { Filter } from "reicon-react/icons/Filter";
import { Trash } from "reicon-react/icons/Trash";
import { Button } from "@tulipfarm/sprout/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@tulipfarm/sprout/dropdown-menu";
import { Input } from "@tulipfarm/sprout/input";
import { Spinner } from "@tulipfarm/sprout/spinner";
import { ToolbarStatus } from "@tulipfarm/sprout/toolbar-status";
import { Example, Row } from "./dialog-demo-parts";
import "../styles/toolbar-status-demo.css";

/* ------------------------------------------------------------------ */
/* Sample adapters. They stand in for the app's table export requests. */
/* ------------------------------------------------------------------ */

type Outcome = "success" | "capped" | "failed";

const outcomes: readonly { value: Outcome; label: string }[] = [
  { value: "success", label: "Succeeds" },
  { value: "capped", label: "Hits row cap" },
  { value: "failed", label: "Fails" },
];

const exportRowCap = 10_000;
const sampleRows = 1_284;

function finalNote(outcome: Outcome) {
  if (outcome === "failed")
    return "Export failed. The table changed while exporting. Try again.";
  if (outcome === "capped")
    return `Exported the first ${exportRowCap.toLocaleString("en-US")} rows. Narrow the search to export the rest.`;
  return `Exported ${sampleRows.toLocaleString("en-US")} rows.`;
}

/** Counts rows up over about a second, then settles on the chosen outcome. */
function useSampleExport(outcome: Outcome) {
  const [rows, setRows] = useState<number | null>(null);
  const [note, report] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const run = () => {
    stop();
    setRows(0);
    report("");
    const total = outcome === "capped" ? exportRowCap : sampleRows;
    let done = 0;
    timer.current = setInterval(() => {
      done = Math.min(total, done + Math.ceil(total / 8));
      setRows(done);
      if (done >= total) {
        stop();
        setRows(null);
        report(finalNote(outcome));
      }
    }, 140);
  };
  const cancel = () => {
    stop();
    setRows(null);
    report("Export cancelled.");
  };
  return { rows, note, run, cancel };
}

function Segments<Value extends string>({
  label,
  value,
  items,
  onChange,
  disabled,
}: {
  label: string;
  value: Value;
  items: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="toolbar-status-demo-control"
      role="group"
      aria-label={label}
    >
      <span aria-hidden="true">{label}</span>
      <div className="toolbar-status-demo-segments">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className="toolbar-status-demo-toggle"
            aria-pressed={value === item.value}
            disabled={disabled}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Playground: the table query bar export slot.                        */
/* ------------------------------------------------------------------ */

function ExportSlot({
  outcome,
  disabled,
}: {
  outcome: Outcome;
  disabled: boolean;
}) {
  const { rows, note, run, cancel } = useSampleExport(outcome);
  const failed = note.startsWith("Export failed");
  return (
    <div className="toolbar-status-demo-export-slot">
      {rows !== null ? (
        <Button
          variant="outline"
          size="sm"
          onClick={cancel}
          aria-label={`Exporting ${rows} rows. Cancel export`}
        >
          <Spinner data-icon="inline-start" aria-hidden="true" />
          Cancel export
        </Button>
      ) : note ? (
        <ToolbarStatus
          label={failed ? "Export failed" : "Export result"}
          message={note}
          error={failed}
        >
          <Button variant="outline" size="sm" disabled={disabled} onClick={run}>
            {failed ? "Retry export" : "Export again"}
          </Button>
        </ToolbarStatus>
      ) : (
        <Button variant="outline" size="sm" disabled={disabled} onClick={run}>
          <Download data-icon="inline-start" size={14} aria-hidden="true" />
          Export
        </Button>
      )}
    </div>
  );
}

export function ToolbarStatusPlayground() {
  const [outcome, setOutcome] = useState<Outcome>("success");
  const [busy, setBusy] = useState<"ready" | "busy">("ready");
  const [round, setRound] = useState(0);
  return (
    <section
      className="toolbar-status-demo-playground"
      aria-label="Toolbar status playground"
    >
      <div className="toolbar-status-demo-controls">
        <Segments
          label="Next export"
          value={outcome}
          items={outcomes}
          onChange={setOutcome}
        />
        <Segments
          label="Table"
          value={busy}
          items={[
            { value: "ready", label: "Ready" },
            { value: "busy", label: "Saving a row" },
          ]}
          onChange={setBusy}
        />
        <button
          type="button"
          className="toolbar-status-demo-toggle"
          onClick={() => setRound((n) => n + 1)}
        >
          Reset
        </button>
      </div>
      <div className="toolbar-status-demo-stage">
        <div
          className="toolbar-status-demo-querybar"
          role="toolbar"
          aria-label="Candidates table"
        >
          <Input
            className="toolbar-status-demo-search"
            aria-label="Search rows"
            placeholder="Search rows"
            defaultValue="stage==Interview"
          />
          <Button variant="outline" size="sm">
            <Filter data-icon="inline-start" size={14} aria-hidden="true" />
            Filters
          </Button>
          <ExportSlot
            key={round}
            outcome={outcome}
            disabled={busy === "busy"}
          />
        </div>
        <p className="toolbar-status-demo-hint">
          Export, then open the status for details. The slot is 7rem wide, as in
          the table toolbar.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Every outcome the app shows.                                        */
/* ------------------------------------------------------------------ */

function Replay({
  label,
  children,
}: {
  label: string;
  children: (key: number) => ReactNode;
}) {
  const [shown, setShown] = useState(0);
  return (
    <>
      {shown > 0 ? (
        children(shown)
      ) : (
        <span className="toolbar-status-demo-muted">Not shown yet</span>
      )}
      <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + 1)}>
        {label}
      </Button>
    </>
  );
}

export function ToolbarStatusOutcomes() {
  return (
    <Example
      id="toolbar-status-outcomes"
      title="Outcomes"
      description="Each row is a status the app shows after an action. Open one to read the details."
    >
      <Row label="Exported" note="outline sm · role status · Export again">
        <ToolbarStatus label="Exported" message="Exported 3 selected rows.">
          <Button variant="outline" size="sm">
            Export again
          </Button>
        </ToolbarStatus>
      </Row>
      <Row
        label="Export failed"
        note="destructive sm · role alert · Retry export"
      >
        <ToolbarStatus
          error
          label="Export failed"
          message="Export failed. You no longer have access to this table."
        >
          <Button variant="outline" size="sm">
            Retry export
          </Button>
        </ToolbarStatus>
      </Row>
      <Row
        label="Export result"
        note="outline sm · long message wraps in the popover"
      >
        <ToolbarStatus label="Export result" message={finalNote("capped")}>
          <Button variant="outline" size="sm">
            Export again
          </Button>
        </ToolbarStatus>
      </Row>
      <Row label="Export cancelled" note="outline sm · not an error">
        <ToolbarStatus label="Export result" message="Export cancelled.">
          <Button variant="outline" size="sm">
            Export again
          </Button>
        </ToolbarStatus>
      </Row>
      <Row label="Action disabled" note="table busy · child action disabled">
        <ToolbarStatus
          error
          label="Export failed"
          message="Export failed. Check your connection and try again."
        >
          <Button variant="outline" size="sm" disabled>
            Retry export
          </Button>
        </ToolbarStatus>
      </Row>
      <Row label="Saved" note="outline sm · message only, no actions">
        <ToolbarStatus label="Saved" message="The local draft is ready." />
      </Row>
      <Row
        label="Open on mount"
        note="defaultOpen · error · default-size action"
      >
        <Replay label="Show failed save">
          {(key) => <SaveSample key={key} />}
        </Replay>
      </Row>
    </Example>
  );
}

function SaveSample() {
  const [retried, setRetried] = useState(false);
  return (
    <ToolbarStatus
      error={!retried}
      label={retried ? "Saved" : "Save failed"}
      message={
        retried
          ? "The local sample was saved."
          : "This fictional save failed. No data was sent."
      }
      defaultOpen={!retried}
    >
      {!retried && (
        <Button variant="outline" onClick={() => setRetried(true)}>
          Retry sample
        </Button>
      )}
    </ToolbarStatus>
  );
}

/* ------------------------------------------------------------------ */
/* Selected rows toolbar.                                              */
/* ------------------------------------------------------------------ */

type BulkState = {
  kind: "idle" | "loading" | "success" | "error";
  message?: string;
};

function SelectedRows({
  count,
  fail,
  canDelete,
}: {
  count: number;
  fail: boolean;
  canDelete: boolean;
}) {
  const [state, setState] = useState<BulkState>({ kind: "idle" });
  const [cleared, setCleared] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const disabled = state.kind === "loading";
  const run = () => {
    if (timer.current) return;
    setState({ kind: "loading" });
    timer.current = setTimeout(() => {
      timer.current = null;
      setState(
        fail
          ? { kind: "error", message: "Export failed. Try again." }
          : {
              kind: "success",
              message: `Exported ${count} selected ${count === 1 ? "row" : "rows"}.`,
            },
      );
    }, 700);
  };
  if (cleared)
    return (
      <div className="toolbar-status-demo-selection">
        <span className="toolbar-status-demo-muted">Selection cleared.</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setCleared(false);
            setState({ kind: "idle" });
          }}
        >
          Select again
        </Button>
      </div>
    );
  const outcome = state.message ? (
    <ToolbarStatus
      label={state.kind === "error" ? "Export failed" : "Exported"}
      message={state.message}
      error={state.kind === "error"}
    >
      <Button variant="outline" size="sm" disabled={disabled} onClick={run}>
        {state.kind === "error" ? "Retry export" : "Export again"}
      </Button>
    </ToolbarStatus>
  ) : null;
  return (
    <div
      aria-label="Selected row actions"
      role="group"
      className="toolbar-status-demo-selection"
    >
      <span role="status" className="toolbar-status-demo-count">
        {count} selected
        <span className="toolbar-status-demo-sr"> on this page</span>
      </span>
      <div className="toolbar-status-demo-wide">
        {outcome ?? (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-busy={disabled}
            onClick={run}
          >
            <Download data-icon="inline-start" size={14} aria-hidden="true" />
            {disabled ? "Exporting..." : "Export selected"}
          </Button>
        )}
        {canDelete && (
          <Button variant="destructive" size="sm" disabled={disabled}>
            <Trash data-icon="inline-start" size={14} aria-hidden="true" />
            Delete selected
          </Button>
        )}
      </div>
      <div className="toolbar-status-demo-narrow">
        {outcome ?? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  aria-busy={disabled}
                />
              }
            >
              {disabled ? "Exporting..." : "Selected actions"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={run}>
                  Export selected
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem variant="destructive">
                    Delete selected
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {outcome && canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" disabled={disabled} />
              }
            >
              Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive">
                  Delete selected
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label="Clear selection"
        onClick={() => setCleared(true)}
      >
        Clear
      </Button>
    </div>
  );
}

export function ToolbarStatusSelection() {
  const [fail, setFail] = useState<"ok" | "fail">("ok");
  const [round, setRound] = useState(0);
  return (
    <section
      className="toolbar-status-demo-playground"
      aria-label="Selected rows toolbar"
    >
      <div className="toolbar-status-demo-controls">
        <Segments
          label="Next export"
          value={fail}
          items={[
            { value: "ok", label: "Succeeds" },
            { value: "fail", label: "Fails" },
          ]}
          onChange={(value) => {
            setFail(value);
            setRound((n) => n + 1);
          }}
        />
      </div>
      <div className="toolbar-status-demo-frames">
        <div className="toolbar-status-demo-frame" data-width="wide">
          <span className="toolbar-status-demo-frame-label">
            Full width · wide layout from 36rem
          </span>
          <SelectedRows
            key={`w${round}`}
            count={3}
            fail={fail === "fail"}
            canDelete
          />
        </div>
        <div className="toolbar-status-demo-frame" data-width="narrow">
          <span className="toolbar-status-demo-frame-label">
            Narrow · 24rem
          </span>
          <SelectedRows
            key={`n${round}`}
            count={1}
            fail={fail === "fail"}
            canDelete
          />
        </div>
        <div className="toolbar-status-demo-frame" data-width="narrow">
          <span className="toolbar-status-demo-frame-label">
            Narrow · no delete permission
          </span>
          <SelectedRows
            key={`r${round}`}
            count={12}
            fail={fail === "fail"}
            canDelete={false}
          />
        </div>
      </div>
    </section>
  );
}
