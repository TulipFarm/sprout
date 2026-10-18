import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { BookOpen } from "reicon-react/icons/BookOpen";
import { Compress } from "reicon-react/icons/Compress";
import { X } from "reicon-react/icons/X";
import { FileAttachment, FileTypeIcon } from "@tulipfarm/sprout/attachment";
import { Avatar, AvatarFallback } from "@tulipfarm/sprout/avatar";
import { Badge } from "@tulipfarm/sprout/badge";
import { BrandIcon, type Brand } from "@tulipfarm/sprout/brand-icon";
import { Button } from "@tulipfarm/sprout/button";
import {
  MentionGroup,
  MentionList,
  MentionOption,
  MentionStatus,
} from "@tulipfarm/sprout/mention-list";
import { Textarea } from "@tulipfarm/sprout/textarea";
import "../styles/mention-list-demo.css";

/* ------------------------------------------------------------------ */
/* Sample adapters. They stand in for the app's file and skill APIs.   */
/* ------------------------------------------------------------------ */

type SampleFile = {
  id: string;
  name: string;
  mediaType: string;
  size: number | null;
};
type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  brand: Brand;
  kind: string;
};
type Skill = { id: string; name: string; revision: string };

const sampleFiles: SampleFile[] = [
  {
    id: "f1",
    name: "Q3 revenue forecast.xlsx",
    mediaType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 48_200,
  },
  {
    id: "f2",
    name: "Launch brief.pdf",
    mediaType: "application/pdf",
    size: 1_240_000,
  },
  {
    id: "f3",
    name: "Customer interviews — March 2026 synthesis and follow-up notes.docx",
    mediaType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 312_000,
  },
  {
    id: "f4",
    name: "Storefront hero.png",
    mediaType: "image/png",
    size: 2_860_000,
  },
  { id: "f5", name: "Retro notes", mediaType: "text/plain", size: null },
];

const driveFiles: DriveFile[] = [
  {
    id: "d1",
    name: "Roadmap 2026",
    mimeType: "application/vnd.google-apps.document",
    brand: "google-docs",
    kind: "Google Docs",
  },
  {
    id: "d2",
    name: "Budget tracker",
    mimeType: "application/vnd.google-apps.spreadsheet",
    brand: "google-sheets",
    kind: "Google Sheets",
  },
  {
    id: "d3",
    name: "Board deck — Q3 review",
    mimeType: "application/vnd.google-apps.presentation",
    brand: "google-slides",
    kind: "Google Slides",
  },
  {
    id: "d4",
    name: "Beta signup form",
    mimeType: "application/vnd.google-apps.form",
    brand: "google-forms",
    kind: "Google Forms",
  },
  {
    id: "d5",
    name: "Revenue model.pdf",
    mimeType: "application/pdf",
    brand: "google-drive",
    kind: "PDF",
  },
];

const skills: Skill[] = [
  { id: "s1", name: "Brand voice review", revision: "3f9a1c2e7b" },
  { id: "s2", name: "Customer research synthesis", revision: "a71d04be55" },
  { id: "s3", name: "Release notes writer", revision: "0c88e2f1d9" },
  { id: "s4", name: "Weekly metrics digest", revision: "9be3570aa2" },
];

const people = [
  { name: "Alex Meadow", role: "Product lead" },
  { name: "Robin Field", role: "Design" },
  { name: "Sam Okafor", role: "Engineering" },
];

const formatSize = (bytes: number) =>
  bytes < 1_000_000
    ? `${Math.round(bytes / 1_000)} KB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;
const version = (revision: string) => `Version ${revision.slice(0, 8)}`;
const matches = (name: string, query: string) =>
  name.toLowerCase().includes(query.trim().toLowerCase());
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/* ------------------------------------------------------------------ */
/* A trigger-aware textarea. Real apps own this; Sprout draws the list. */
/* ------------------------------------------------------------------ */

function triggerAt(text: string, caret: number, char: string) {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf(char);
  if (start < 0 || (start > 0 && !/\s/u.test(before[start - 1]!))) return null;
  const query = before.slice(start + 1);
  return query.includes("\n") ? null : { start, end: caret, query };
}

function useTriggerField(char: string, initial = "") {
  const field = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(initial);
  const [caret, setCaret] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const pendingCaret = useRef<number | null>(null);
  const trigger = caret === null ? null : triggerAt(text, caret, char);
  const open = trigger !== null && trigger.start !== dismissed;
  const query = open ? trigger.query : null;
  useEffect(() => setActive(0), [query]);
  useLayoutEffect(() => {
    const at = pendingCaret.current;
    if (at === null || !field.current) return;
    pendingCaret.current = null;
    field.current.focus();
    field.current.setSelectionRange(at, at);
  });

  function track(event: SyntheticEvent<HTMLTextAreaElement>) {
    const { selectionStart, selectionEnd, value } = event.currentTarget;
    const next = selectionStart === selectionEnd ? selectionStart : null;
    setCaret(next);
    if (next === null || !triggerAt(value, next, char)) setDismissed(null);
  }
  function replace(insert: string) {
    if (!trigger) return;
    const at = trigger.start + insert.length;
    setText(text.slice(0, trigger.start) + insert + text.slice(trigger.end));
    setCaret(null);
    pendingCaret.current = at;
  }
  function keyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    {
      count,
      choose,
      retry,
    }: {
      count: number;
      choose: (index: number) => void;
      retry?: (() => void) | undefined;
    },
  ) {
    if (!open || !trigger || event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setDismissed(trigger.start);
      return;
    }
    if (retry && event.key === "Enter") {
      event.preventDefault();
      retry();
      return;
    }
    if (!count) return;
    const current = Math.min(active, count - 1);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(
        (current + (event.key === "ArrowDown" ? 1 : count - 1)) % count,
      );
    } else if (
      (event.key === "Enter" && !event.shiftKey) ||
      event.key === "Tab"
    ) {
      event.preventDefault();
      choose(current);
    }
  }
  function typeTrigger() {
    const input = field.current;
    if (!input) return;
    const before = text.slice(0, input.selectionEnd);
    const inserted = before === "" || /\s$/u.test(before) ? char : ` ${char}`;
    const at = before.length + inserted.length;
    setText(before + inserted + text.slice(before.length));
    setCaret(at);
    setDismissed(null);
    pendingCaret.current = at;
  }
  const textareaProps = (
    listId: string,
    optionId: string | undefined,
    shown = open,
  ) => ({
    ref: field,
    value: text,
    "aria-autocomplete": "list" as const,
    "aria-controls": shown ? listId : undefined,
    "aria-activedescendant": shown ? optionId : undefined,
    onChange: (event: SyntheticEvent<HTMLTextAreaElement>) => {
      setText(event.currentTarget.value);
      track(event);
    },
    onSelect: track,
    onBlur: (event: FocusEvent<HTMLTextAreaElement>) => {
      if (
        !event.currentTarget
          .closest("[data-demo-composer]")
          ?.contains(event.relatedTarget)
      )
        setCaret(null);
    },
  });
  return {
    text,
    open,
    query,
    active,
    setActive,
    replace,
    keyDown,
    typeTrigger,
    textareaProps,
  };
}

function Segments<Value extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: Value;
  items: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <div className="mention-list-demo-control" role="group" aria-label={label}>
      <span aria-hidden="true">{label}</span>
      <div className="mention-list-demo-segments">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className="mention-list-demo-toggle"
            aria-pressed={value === item.value}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Playground({
  controls,
  children,
}: {
  controls: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mention-list-demo-playground">
      <div className="mention-list-demo-controls">{controls}</div>
      <div className="mention-list-demo-stage">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Files with @: Files plus Google Drive groups.                       */
/* ------------------------------------------------------------------ */

type FilesSearch = "ready" | "loading" | "error";
type DriveSearch = "ready" | "loading" | "blocked" | "error";
type FileOption =
  | { source: "tulipfarm"; item: SampleFile }
  | { source: "google"; item: DriveFile };

function GoogleMentionIcon({ file }: { file: DriveFile }) {
  return file.brand === "google-drive" ? (
    <FileTypeIcon name={file.name} mediaType={file.mimeType} />
  ) : (
    <BrandIcon brand={file.brand} size="glyph" />
  );
}

export function MentionListFiles() {
  const listId = useId();
  const [drive, setDrive] = useState<"connected" | "off">("connected");
  const [filesSearch, setFilesSearch] = useState<FilesSearch>("ready");
  const [driveSearch, setDriveSearch] = useState<DriveSearch>("ready");
  const [added, setAdded] = useState<FileOption[]>([]);
  const field = useTriggerField("@", "Compare the forecast with ");
  const query = field.query?.trim() ?? "";
  const google = drive === "connected";
  const isAdded = (source: string, id: string) =>
    added.some((entry) => entry.source === source && entry.item.id === id);

  const fileMatches =
    filesSearch === "ready"
      ? sampleFiles.filter((file) => matches(file.name, query))
      : [];
  const files: FileOption[] = fileMatches
    .filter((file) => !isAdded("tulipfarm", file.id))
    .map((item) => ({ source: "tulipfarm", item }));
  const driveMatches =
    google && query && driveSearch === "ready"
      ? driveFiles.filter((file) => matches(file.name, query)).slice(0, 3)
      : [];
  const driveOptions: FileOption[] = driveMatches
    .filter((file) => !isAdded("google", file.id))
    .map((item) => ({ source: "google", item }));
  const options = [...files, ...driveOptions];
  const current = Math.min(field.active, Math.max(0, options.length - 1));
  const optionId = (index: number) => `${listId}-option-${index}`;
  const select = (option: FileOption) => {
    setAdded((list) => [...list, option]);
    field.replace("");
  };
  const retryFiles = () => setFilesSearch("ready");

  const retry = { label: "Retry search", onAction: retryFiles };
  const status =
    filesSearch === "loading" ? (
      <MentionStatus tone="loading">Searching your files…</MentionStatus>
    ) : filesSearch === "error" ? (
      <MentionStatus tone="error" action={retry}>
        Couldn’t search Files. Check your connection, then retry.
      </MentionStatus>
    ) : files.length ? undefined : (
      <MentionStatus tone="empty">
        {fileMatches.length
          ? "Every matching file is already added."
          : query
            ? `No files you can open match “${query}”.`
            : "No files yet. Upload one in Files to use it here."}
      </MentionStatus>
    );
  const driveStatus = !google ? undefined : !query ? (
    <MentionStatus tone="empty">
      Type a name to search your Google Drive.
    </MentionStatus>
  ) : driveSearch === "loading" ? (
    <MentionStatus tone="loading">Searching Google Drive…</MentionStatus>
  ) : driveSearch === "blocked" ? (
    <MentionStatus tone="error">
      Google Drive needs reconnecting. Reconnect it in Integrations to add Drive
      files.
    </MentionStatus>
  ) : driveSearch === "error" ? (
    filesSearch === "error" ? (
      <MentionStatus tone="error">
        Couldn’t search Google Drive. Google didn’t respond.
      </MentionStatus>
    ) : (
      <MentionStatus
        tone="error"
        action={{
          label: "Retry Drive search",
          onAction: () => setDriveSearch("ready"),
        }}
      >
        Couldn’t search Google Drive. Google didn’t respond.
      </MentionStatus>
    )
  ) : driveOptions.length ? undefined : (
    <MentionStatus tone="empty">
      {driveMatches.length
        ? "Every matching Drive file is already added."
        : `No Google Drive files you can read match “${query}”.`}
    </MentionStatus>
  );

  const option = (entry: FileOption, index: number) => (
    <MentionOption
      key={`${entry.source}:${entry.item.id}`}
      id={optionId(index)}
      active={index === current}
      onSelect={() => select(entry)}
      title={entry.item.name}
      media={
        entry.source === "tulipfarm" ? (
          <FileTypeIcon
            name={entry.item.name}
            mediaType={entry.item.mediaType}
          />
        ) : (
          <GoogleMentionIcon file={entry.item} />
        )
      }
      description={
        entry.source === "google"
          ? entry.item.kind
          : entry.item.size === null
            ? undefined
            : formatSize(entry.item.size)
      }
    />
  );

  return (
    <Playground
      controls={
        <>
          <Segments
            label="Drive"
            value={drive}
            onChange={setDrive}
            items={[
              { value: "connected", label: "Connected" },
              { value: "off", label: "Not connected" },
            ]}
          />
          <Segments
            label="Files search"
            value={filesSearch}
            onChange={setFilesSearch}
            items={[
              { value: "ready", label: "Results" },
              { value: "loading", label: "Loading" },
              { value: "error", label: "Fails" },
            ]}
          />
          <Segments
            label="Drive search"
            value={driveSearch}
            onChange={setDriveSearch}
            items={[
              { value: "ready", label: "Results" },
              { value: "loading", label: "Loading" },
              { value: "blocked", label: "Needs reconnect" },
              { value: "error", label: "Fails" },
            ]}
          />
        </>
      }
    >
      <div className="mention-list-demo-composer" data-demo-composer="">
        {field.open && (
          <MentionList
            id={listId}
            label="Files you can add"
            status={
              status || driveStatus ? (
                <>
                  {status}
                  {driveStatus}
                </>
              ) : undefined
            }
            announcement={
              options.length
                ? `${plural(options.length, "file", "files")} you can add. Use Up and Down to choose, Enter to add, Escape to close.`
                : undefined
            }
          >
            {google ? (
              <>
                {files.length > 0 && (
                  <MentionGroup label="Files">{files.map(option)}</MentionGroup>
                )}
                {driveOptions.length > 0 && (
                  <MentionGroup label="Google Drive">
                    {driveOptions.map((entry, index) =>
                      option(entry, files.length + index),
                    )}
                  </MentionGroup>
                )}
              </>
            ) : (
              files.map(option)
            )}
          </MentionList>
        )}
        {added.length > 0 && (
          <div
            className="mention-list-demo-chips"
            aria-label="Added files"
            role="group"
          >
            {added.map((entry) => (
              <FileAttachment
                key={`${entry.source}:${entry.item.id}`}
                variant="chip"
                file={{
                  id: entry.item.id,
                  name: entry.item.name,
                  mediaType:
                    entry.source === "google"
                      ? entry.item.mimeType
                      : entry.item.mediaType,
                  size:
                    entry.source === "google"
                      ? "Google Drive"
                      : entry.item.size === null
                        ? "File"
                        : formatSize(entry.item.size),
                  state: "ready",
                }}
                onRemove={() =>
                  setAdded((list) => list.filter((item) => item !== entry))
                }
              />
            ))}
          </div>
        )}
        <Textarea
          {...field.textareaProps(
            listId,
            options.length ? optionId(current) : undefined,
          )}
          aria-label="Message with file mentions"
          placeholder="Type @ to add a file"
          rows={2}
          onKeyDown={(event) =>
            field.keyDown(event, {
              count: options.length,
              choose: (index) => select(options[index]!),
              retry: filesSearch === "error" ? retryFiles : undefined,
            })
          }
        />
        <div className="mention-list-demo-composer-actions">
          <Button variant="outline" size="sm" onClick={field.typeTrigger}>
            Add file
          </Button>
        </div>
      </div>
    </Playground>
  );
}

/* ------------------------------------------------------------------ */
/* Skills with /: one flat list plus a whole-message command.          */
/* ------------------------------------------------------------------ */

type SkillsSearch = "ready" | "loading" | "error" | "none";
type SkillItem = {
  id: string;
  title: string;
  description: string;
  media: ReactNode;
  apply: () => void;
};

export function MentionListSkills() {
  const listId = useId();
  const [search, setSearch] = useState<SkillsSearch>("ready");
  const [staged, setStaged] = useState<Skill | null>(null);
  const field = useTriggerField("/");
  const query = field.query?.trim() ?? null;

  // `/compact` is a whole-message command, offered only at the start of the draft.
  const name = field.query?.trimStart().toLowerCase() ?? "";
  const leading =
    field.query !== null &&
    field.text.trimStart().startsWith(`/${field.query}`);
  const command = leading && name.startsWith("compact ");
  const offer: SkillItem[] =
    leading && name.length > 0 && "compact".startsWith(name)
      ? [
          {
            id: "command:compact",
            title: "/compact",
            description:
              "Summarize earlier messages to free context. Add instructions for a handoff.",
            media: <Compress size={16} aria-hidden="true" />,
            apply: () => field.replace("/compact "),
          },
        ]
      : [];
  const found: SkillItem[] =
    search === "ready"
      ? skills
          .filter((skill) => matches(skill.name, query ?? ""))
          .map((skill) => ({
            id: skill.id,
            title: skill.name,
            description: `Workspace skill · ${version(skill.revision)}`,
            media: <BookOpen size={16} aria-hidden="true" />,
            apply: () => {
              setStaged(skill);
              field.replace("");
            },
          }))
      : [];
  const options = [...offer, ...found];
  const current = Math.min(field.active, Math.max(0, options.length - 1));
  const optionId = (index: number) => `${listId}-option-${index}`;
  const retry = () => setSearch("ready");

  const status =
    search === "loading" ? (
      <MentionStatus tone="loading">Loading skills…</MentionStatus>
    ) : search === "error" ? (
      <MentionStatus
        tone="error"
        action={{ label: "Retry skills", onAction: retry }}
      >
        Couldn’t load skills. Check your connection, then retry.
      </MentionStatus>
    ) : options.length ? undefined : (
      <MentionStatus tone="empty">
        {search === "ready" && query
          ? `No skills match “${query}”.`
          : "No reviewed skills yet. An admin reviews skills in Skills."}
      </MentionStatus>
    );

  return (
    <Playground
      controls={
        <Segments
          label="Skills"
          value={search}
          onChange={setSearch}
          items={[
            { value: "ready", label: "Results" },
            { value: "loading", label: "Loading" },
            { value: "error", label: "Fails" },
            { value: "none", label: "None reviewed" },
          ]}
        />
      }
    >
      <div className="mention-list-demo-composer" data-demo-composer="">
        {field.open && !command && (
          <MentionList
            id={listId}
            label="Skills you can use"
            status={status}
            announcement={
              options.length
                ? `${plural(options.length, "skill", "skills")} you can use. Use Up and Down to choose, Enter to use, Escape to close.`
                : undefined
            }
          >
            {options.map((item, index) => (
              <MentionOption
                key={item.id}
                id={optionId(index)}
                active={index === current}
                onSelect={item.apply}
                media={item.media}
                title={item.title}
                description={item.description}
              />
            ))}
          </MentionList>
        )}
        {staged && (
          <div className="mention-list-demo-staged">
            <div className="mention-list-demo-staged-row">
              <Badge variant="secondary" size="chip" title={staged.name}>
                <BookOpen aria-hidden="true" />
                {staged.name} · {version(staged.revision)}
              </Badge>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove skill ${staged.name}`}
                onClick={() => setStaged(null)}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </div>
            <p>The assistant follows this skill for this message only.</p>
          </div>
        )}
        <Textarea
          {...field.textareaProps(
            listId,
            options.length ? optionId(current) : undefined,
            field.open && !command,
          )}
          aria-label="Message with skills"
          placeholder="Type / to use a skill"
          rows={2}
          onKeyDown={(event) =>
            !command &&
            field.keyDown(event, {
              count: options.length,
              choose: (index) => options[index]!.apply(),
              retry: search === "error" ? retry : undefined,
            })
          }
        />
        <div className="mention-list-demo-composer-actions">
          <Button variant="outline" size="sm" onClick={field.typeTrigger}>
            Use skill
          </Button>
        </div>
      </div>
    </Playground>
  );
}

/* ------------------------------------------------------------------ */
/* Editor suggestion panel: the rich editor's shared panel and states. */
/* ------------------------------------------------------------------ */

type EditorItem = {
  id: string;
  title: string;
  description?: string;
  media?: ReactNode;
};
type EditorState = {
  key: string;
  label: string;
  items: readonly EditorItem[];
  active: number;
  select: (index: number) => void;
};

/** The rich editor's panel: error first, then loading, then empty. */
function EditorSuggestionPanel({
  state,
  loading = false,
  empty,
  error,
}: {
  state: EditorState;
  loading?: boolean;
  empty: string;
  error?: { message: string; retry: () => void };
}) {
  const status = error ? (
    <MentionStatus
      tone="error"
      action={{ label: "Retry", onAction: error.retry }}
    >
      {error.message}
    </MentionStatus>
  ) : loading ? (
    <MentionStatus tone="loading">Searching…</MentionStatus>
  ) : state.items.length ? undefined : (
    <MentionStatus tone="empty">{empty}</MentionStatus>
  );
  return (
    <MentionList
      id={`${state.key}-suggestions`}
      label={state.label}
      status={status}
      announcement={
        state.items.length
          ? `${plural(state.items.length, "option", "options")}. Use Up and Down to choose, Enter to select, Escape to close.`
          : undefined
      }
    >
      {state.items.map((item, index) => (
        <MentionOption
          key={item.id}
          id={`${state.key}-option-${index}`}
          active={index === state.active}
          onSelect={() => state.select(index)}
          media={item.media}
          title={item.title}
          description={item.description}
        />
      ))}
    </MentionList>
  );
}

const editorFiles: EditorItem[] = [
  {
    id: "tulipfarm:f2",
    title: "Launch brief.pdf",
    description: "1.2 MB",
    media: <FileTypeIcon name="Launch brief.pdf" mediaType="application/pdf" />,
  },
  {
    id: "tulipfarm:f5",
    title: "Retro notes",
    media: <FileTypeIcon name="Retro notes" mediaType="text/plain" />,
  },
  {
    id: "google:d1",
    title: "Roadmap 2026",
    description: "Google Docs",
    media: <BrandIcon brand="google-docs" size="glyph" />,
  },
  { id: "tulipfarm:f9", title: "Imported row without an icon" },
];

type EditorMode = "results" | "searching" | "empty" | "error";

export function MentionListEditor() {
  const [mode, setMode] = useState<EditorMode>("results");
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState("Nothing selected yet.");
  const items = mode === "results" ? editorFiles : [];
  const state: EditorState = {
    key: "file",
    label: "Files you can add",
    items,
    active,
    select: (index) => {
      setActive(index);
      setPicked(`Added ${items[index]!.title}.`);
    },
  };
  return (
    <Playground
      controls={
        <Segments
          label="Editor search"
          value={mode}
          onChange={setMode}
          items={[
            { value: "results", label: "Results" },
            { value: "searching", label: "Searching" },
            { value: "empty", label: "No match" },
            { value: "error", label: "Fails" },
          ]}
        />
      }
    >
      <div className="mention-list-demo-composer">
        <EditorSuggestionPanel
          state={state}
          loading={mode === "searching"}
          empty="No files you can open match."
          error={
            mode === "error"
              ? {
                  message:
                    "Couldn’t search Files. Check your connection, then retry.",
                  retry: () => setMode("results"),
                }
              : undefined
          }
        />
        <p className="mention-list-demo-note" role="status">
          {picked}
        </p>
      </div>
    </Playground>
  );
}

/* ------------------------------------------------------------------ */
/* States and people: the internal playground compositions.            */
/* ------------------------------------------------------------------ */

export function MentionListPeople() {
  const [selected, setSelected] = useState("Alex Meadow");
  return (
    <div className="mention-list-demo-grid">
      <div className="mention-list-demo-panel">
        <MentionList
          id="example-mentions"
          label="Example people"
          announcement={`${selected} selected`}
        >
          <MentionGroup label="People">
            {people.map((person) => (
              <MentionOption
                key={person.name}
                id={`person-${person.name.replaceAll(" ", "-")}`}
                active={selected === person.name}
                onSelect={() => setSelected(person.name)}
                media={
                  <Avatar size="sm">
                    <AvatarFallback>{person.name[0]}</AvatarFallback>
                  </Avatar>
                }
                title={person.name}
                description={person.role}
              />
            ))}
          </MentionGroup>
          <MentionGroup label="Agents">
            <MentionOption
              id="person-research-agent"
              active={selected === "Research agent"}
              onSelect={() => setSelected("Research agent")}
              media={
                <Avatar size="sm">
                  <AvatarFallback>R</AvatarFallback>
                </Avatar>
              }
              title="Research agent"
              description="Finds sources and summarizes them"
            />
          </MentionGroup>
        </MentionList>
      </div>
    </div>
  );
}

export function MentionListStates() {
  const [retries, setRetries] = useState(0);
  const retry = () => setRetries((count) => count + 1);
  return (
    <div className="mention-list-demo-grid">
      <figure className="mention-list-demo-panel" aria-label="Loading">
        <MentionList
          id="state-loading"
          label="Skills you can use"
          status={<MentionStatus tone="loading">Loading skills…</MentionStatus>}
        />
        <figcaption>Loading</figcaption>
      </figure>
      <figure className="mention-list-demo-panel" aria-label="Empty">
        <MentionList
          id="state-empty"
          label="Files you can add"
          status={
            <MentionStatus tone="empty">
              No files yet. Upload one in Files to use it here.
            </MentionStatus>
          }
        />
        <figcaption>Empty</figcaption>
      </figure>
      <figure className="mention-list-demo-panel" aria-label="Error with retry">
        <MentionList
          id="state-error"
          label="Skills you can use"
          status={
            <MentionStatus
              tone="error"
              action={{ label: "Retry skills", onAction: retry }}
            >
              Couldn’t load skills. Check your connection, then retry.
            </MentionStatus>
          }
        />
        <figcaption>Error with retry</figcaption>
      </figure>
      <figure
        className="mention-list-demo-panel"
        aria-label="Error without action"
      >
        <MentionList
          id="state-blocked"
          label="Files you can add"
          status={
            <MentionStatus tone="error">
              Google Drive needs reconnecting. Reconnect it in Integrations to
              add Drive files.
            </MentionStatus>
          }
        />
        <figcaption>Error without action</figcaption>
      </figure>
      <figure
        className="mention-list-demo-panel"
        aria-label="Results and a loading source"
      >
        <MentionList
          id="state-mixed"
          label="Files you can add"
          status={
            <MentionStatus tone="loading">
              Searching Google Drive…
            </MentionStatus>
          }
          announcement="2 files you can add. Use Up and Down to choose, Enter to add, Escape to close."
        >
          <MentionGroup label="Files">
            <MentionOption
              id="state-mixed-0"
              active
              onSelect={() => undefined}
              media={
                <FileTypeIcon name="Q3 revenue forecast.xlsx" mediaType="" />
              }
              title="Q3 revenue forecast.xlsx"
              description="48 KB"
            />
            <MentionOption
              id="state-mixed-1"
              active={false}
              onSelect={() => undefined}
              media={
                <FileTypeIcon
                  name="Customer interviews — March 2026 synthesis and follow-up notes.docx"
                  mediaType=""
                />
              }
              title="Customer interviews — March 2026 synthesis and follow-up notes.docx"
              description="312 KB"
            />
          </MentionGroup>
        </MentionList>
        <figcaption>Results and a loading source</figcaption>
      </figure>
      <figure
        className="mention-list-demo-panel"
        aria-label="Two failed sources"
      >
        <MentionList
          id="state-both"
          label="Files you can add"
          status={
            <>
              <MentionStatus
                tone="error"
                action={{ label: "Retry search", onAction: retry }}
              >
                Couldn’t search Files. Check your connection, then retry.
              </MentionStatus>
              <MentionStatus tone="error">
                Couldn’t search Google Drive. Google didn’t respond.
              </MentionStatus>
            </>
          }
        />
        <figcaption>Two failed sources</figcaption>
      </figure>
      <p className="mention-list-demo-note" role="status">
        {retries
          ? `Retry pressed ${retries} ${retries === 1 ? "time" : "times"}.`
          : "No retries yet."}
      </p>
    </div>
  );
}
