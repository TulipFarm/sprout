import { useState, type ReactNode } from "react";
import { DocumentText } from "reicon-react/icons/DocumentText";
import { FilePdf } from "reicon-react/icons/FilePdf";
import { FileZip } from "reicon-react/icons/FileZip";
import { Gallery } from "reicon-react/icons/Gallery";
import { Button } from "@tulipfarm/sprout/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@tulipfarm/sprout/progress";
import { Skeleton } from "@tulipfarm/sprout/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import "../styles/progress-demo.css";

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
    <section className="progress-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="progress-demo-card-body">{children}</div>
    </section>
  );
}

function formatFileSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1).replace(/\.0$/, "")} ${units[unit]}`;
}

const MB = 1_000_000;
const GB = 1_000_000_000;

function States() {
  const [value, setValue] = useState(40);
  return (
    <Example
      title="States"
      description="Empty, partial, complete, and indeterminate. A null value has no amount, so the value text stays empty and the indicator slides."
    >
      <div className="progress-demo-states">
        {[0, value, 100, null].map((amount, index) => (
          <div
            key={index}
            data-testid={
              [
                "state-empty",
                "state-partial",
                "state-complete",
                "state-waiting",
              ][index]
            }
          >
            <Progress value={amount}>
              <ProgressLabel>
                {amount === null
                  ? "Waiting"
                  : amount === 100
                    ? "Complete"
                    : "Progress"}
              </ProgressLabel>
              <ProgressValue />
            </Progress>
          </div>
        ))}
        <Button
          variant="outline"
          className="progress-demo-advance"
          onClick={() =>
            setValue((previous) => (previous >= 100 ? 0 : previous + 20))
          }
        >
          Advance example
        </Button>
      </div>
    </Example>
  );
}

type StorageState = "ready" | "full" | "loading" | "unavailable";

const storageSamples = {
  ready: { usedBytes: 3.2 * GB, quotaBytes: 10 * GB, maxFileBytes: 5 * GB },
  full: { usedBytes: 10.4 * GB, quotaBytes: 10 * GB, maxFileBytes: 5 * GB },
};

function StorageUsage({
  state,
  onRetry,
}: {
  state: StorageState;
  onRetry: () => void;
}) {
  if (state === "loading")
    return (
      <div
        role="status"
        aria-label="Loading storage use"
        className="progress-demo-storage"
      >
        <Skeleton />
        <span className="progress-demo-sr">Loading storage use…</span>
      </div>
    );
  if (state === "unavailable")
    return (
      <div className="progress-demo-storage progress-demo-note">
        <p>Storage use unavailable. Uploads are limited to 5 GB per file.</p>
        <Button variant="link" size="sm" onClick={onRetry}>
          Check storage again
        </Button>
      </div>
    );
  const { usedBytes, quotaBytes, maxFileBytes } = storageSamples[state];
  const percent = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
  return (
    <div className="progress-demo-storage">
      <Progress value={percent} aria-label="Workspace storage used" />
      <p className="progress-demo-note">
        <span className="progress-demo-strong">
          {formatFileSize(usedBytes)}
        </span>{" "}
        of {formatFileSize(quotaBytes)} used, including Trash.
      </p>
      <p className="progress-demo-note">
        Up to {formatFileSize(maxFileBytes)} per file.
      </p>
    </div>
  );
}

function Storage() {
  const [state, setState] = useState<StorageState>("ready");
  return (
    <Example
      title="Storage use"
      description="A bare bar named with aria-label, beside text that gives the real numbers. Use over the quota is capped at 100."
    >
      <ToggleGroup
        aria-label="Sample storage state"
        variant="outline"
        size="sm"
        spacing={0}
        value={[state]}
        onValueChange={(value) => {
          if (value[0]) setState(value[0] as StorageState);
        }}
      >
        <ToggleGroupItem value="ready">Ready</ToggleGroupItem>
        <ToggleGroupItem value="full">Over quota</ToggleGroupItem>
        <ToggleGroupItem value="loading">Loading</ToggleGroupItem>
        <ToggleGroupItem value="unavailable">Unavailable</ToggleGroupItem>
      </ToggleGroup>
      <aside
        className="progress-demo-aside"
        aria-label="Files"
        data-testid="storage"
      >
        <p className="progress-demo-aside-title">Storage</p>
        <StorageUsage state={state} onRetry={() => setState("ready")} />
      </aside>
    </Example>
  );
}

type UploadState =
  | { kind: "waiting" }
  | { kind: "sending"; sent: number }
  | { kind: "ready" }
  | { kind: "cancelled" };

interface Upload {
  id: string;
  name: string;
  size: number;
  destination: string;
  icon: typeof FilePdf;
  state: UploadState;
}

const initialUploads: Upload[] = [
  {
    id: "deck",
    name: "Q3 board deck.pdf",
    size: 8.4 * MB,
    destination: "Reports",
    icon: FilePdf,
    state: { kind: "sending", sent: 3.1 * MB },
  },
  {
    id: "photos",
    name: "Team offsite photos – Lisbon 2026 – final selects.zip",
    size: 46.2 * MB,
    destination: "Shared / Events",
    icon: FileZip,
    state: { kind: "sending", sent: 46.2 * MB },
  },
  {
    id: "notes",
    name: "Interview notes.docx",
    size: 0.2 * MB,
    destination: "Research",
    icon: DocumentText,
    state: { kind: "waiting" },
  },
  {
    id: "logo",
    name: "logo-dark.png",
    size: 0.4 * MB,
    destination: "Brand",
    icon: Gallery,
    state: { kind: "ready" },
  },
];

const stateLabels: Record<UploadState["kind"], string> = {
  waiting: "Waiting",
  sending: "Uploading",
  ready: "Uploaded",
  cancelled: "Cancelled",
};

/* Every byte sent is not yet a stored file: the server still saves it. */
const sendingLabel = (sent: number, size: number) =>
  sent >= size
    ? "Saving…"
    : `Uploading ${formatFileSize(sent)} of ${formatFileSize(size)}`;

function SendingProgress({
  name,
  sent,
  size,
}: {
  name: string;
  sent: number;
  size: number;
}) {
  const label = sendingLabel(sent, size);
  return (
    <div className="progress-demo-sending">
      <Progress
        value={Math.floor((sent / size) * 100)}
        aria-label={`Uploading ${name}`}
        getAriaValueText={() => label}
      />
    </div>
  );
}

function Uploads() {
  const [uploads, setUploads] = useState(initialUploads);
  const update = (id: string, state: UploadState) =>
    setUploads((list) =>
      list.map((upload) => (upload.id === id ? { ...upload, state } : upload)),
    );
  const sendChunk = () =>
    setUploads((list) =>
      list.map((upload) => {
        const sent =
          upload.state.kind === "waiting"
            ? 0
            : upload.state.kind === "sending"
              ? upload.state.sent
              : upload.size;
        if (sent >= upload.size) return upload;
        return {
          ...upload,
          state: {
            kind: "sending",
            sent: Math.min(upload.size, sent + 1.8 * MB),
          },
        };
      }),
    );
  const pending = uploads.filter(
    (upload) =>
      upload.state.kind === "waiting" || upload.state.kind === "sending",
  ).length;
  const done = uploads.filter((upload) => upload.state.kind === "ready").length;
  const cancelled = uploads.filter(
    (upload) => upload.state.kind === "cancelled",
  ).length;
  const summary = pending
    ? `Uploading ${uploads.length - pending + 1} of ${uploads.length}…`
    : [`${done} uploaded`, cancelled ? `${cancelled} cancelled` : null]
        .filter(Boolean)
        .join(", ");
  return (
    <Example
      title="Upload list"
      description="A bar under each file that is sending, named after the file. getAriaValueText reads the sizes instead of a bare percent, and “Saving…” once every byte is sent."
    >
      <div className="progress-demo-toolbar">
        <Button variant="outline" size="sm" onClick={sendChunk}>
          Send next chunk
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setUploads(initialUploads)}
        >
          Reset uploads
        </Button>
      </div>
      <section aria-label="Uploads" className="progress-demo-uploads">
        <p role="status" className="progress-demo-summary">
          {summary}
        </p>
        <ul>
          {uploads.map((upload) => {
            const Icon = upload.icon;
            const { state } = upload;
            return (
              <li key={upload.id} data-testid={`upload-${upload.id}`}>
                <span className="progress-demo-file-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div className="progress-demo-file">
                  <p className="progress-demo-file-name" title={upload.name}>
                    {upload.name}
                  </p>
                  <p className="progress-demo-file-meta">
                    {state.kind === "sending"
                      ? sendingLabel(state.sent, upload.size)
                      : stateLabels[state.kind]}{" "}
                    · {upload.destination}
                  </p>
                  {state.kind === "sending" && (
                    <SendingProgress
                      name={upload.name}
                      sent={state.sent}
                      size={upload.size}
                    />
                  )}
                </div>
                <div className="progress-demo-file-actions">
                  {(state.kind === "waiting" || state.kind === "sending") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Cancel uploading ${upload.name}`}
                      onClick={() => update(upload.id, { kind: "cancelled" })}
                    >
                      Cancel
                    </Button>
                  )}
                  {state.kind === "cancelled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Retry uploading ${upload.name}`}
                      onClick={() => update(upload.id, { kind: "waiting" })}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </Example>
  );
}

export default function ProgressDemo() {
  return (
    <div id="progress-demo" className="progress-demo">
      <States />
      <Storage />
      <Uploads />
    </div>
  );
}
