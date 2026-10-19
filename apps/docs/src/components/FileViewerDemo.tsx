import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight } from "reicon-react/icons/ArrowUpRight";
import { Refresh } from "reicon-react/icons/Refresh";
import {
  AttachmentGroup,
  FileAttachment,
  type AttachmentFile,
} from "@tulipfarm/sprout/attachment";
import {
  AvatarGroup,
  AvatarGroupCount,
  EntityAvatar,
} from "@tulipfarm/sprout/avatar";
import { Button } from "@tulipfarm/sprout/button";
import { DropdownMenuItem } from "@tulipfarm/sprout/dropdown-menu";
import {
  FileContent,
  FileError,
  FileRenderersProvider,
  FileViewer,
  LoadingFile,
  ViewableFileContent,
  renderableType,
  type FileMarkdownRendererProps,
  type FileOfficeRendererProps,
  type FileRenderers,
  type FileSheetRendererProps,
  type ViewableFile,
} from "@tulipfarm/sprout/file-viewer";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@tulipfarm/sprout/tabs";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tulipfarm/sprout/tooltip";
import "../styles/file-viewer-demo.css";

const types = {
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  png: "image/png",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  gsheet: "application/vnd.google-apps.spreadsheet",
  bin: "application/octet-stream",
};

const samples = {
  notes:
    "Harvest notes · Fictional sample\n\nBed 2 tomatoes are ready on Friday.\nMove the basil trays out of the greenhouse before noon.\nOrder two more rolls of frost cloth.",
  plan: "# Spring planting plan\n\nAll data is fictional.\n\n## This week\n\n- Sow **sweet peas** in the north border\n- Pot on the tomato seedlings\n- Check the irrigation timer\n\n## Next week\n\n1. Plant out the onion sets\n2. Mulch the fruit cage",
  prices:
    "Item,Supplier,Unit,Price\nTerracotta pot 30 cm,Clayworks,each,12.50\nPeat-free compost,Green Earth,40 L bag,8.90\nFrost cloth,Fieldline,10 m roll,15.00\nSeed trays,Fieldline,pack of 10,6.40",
  order:
    '{"order":"SO-1042","customer":"Meadow Café","items":[{"sku":"POT-30","quantity":12},{"sku":"CMP-40","quantity":4}],"status":"Ready to ship"}',
  brokenJson: '{"order":"SO-1043","items":[{"sku":"POT-30" "quantity":2}]',
  floorPlan:
    "SAMPLE-DOCUMENT\nStore floor plan\nThe entrance opens onto seasonal displays. Tools and gloves sit on the left wall; seeds and bulbs are by the till.\nThe greenhouse door is kept closed between October and March.",
  deck: "SAMPLE-SLIDES\nQ3 launch deck\nAutumn bulbs arrive in week 36\nWe expect 40% of bulb sales in the first two weeks\nPre-orders open on the website on 1 August",
  python:
    'from dataclasses import dataclass\n\n\n@dataclass\nclass Bed:\n    name: str\n    crops: list[str]\n\n\ndef ready(bed: Bed, week: int) -> bool:\n    """Fictional: beds are ready from week 12."""\n    return week >= 12 and bool(bed.crops)\n',
  rust: 'fn main() {\n    let beds = ["north", "south"];\n    for bed in beds {\n        println!("Watering {bed}");\n    }\n}\n',
  sql: "-- Fictional weekly orders\nSELECT customer, count(*) AS orders\nFROM orders\nWHERE placed_at > now() - interval '7 days'\nGROUP BY customer\nORDER BY orders DESC;\n",
  dockerfile:
    'FROM node:22-alpine\nWORKDIR /app\nCOPY package.json pnpm-lock.yaml ./\nRUN corepack enable && pnpm install --frozen-lockfile\nCOPY . .\nCMD ["pnpm", "start"]\n',
  yaml: "# Fictional deploy settings\nname: meadow\nregion: eu-west\nreplicas: 2\nfeatures:\n  - planner\n  - reminders\n",
  shortcut:
    '{"url":"https://docs.google.com/spreadsheets/d/1PlantingCalendarSample/edit"}',
  brokenShortcut: '{"url":"https://drive.google.com/drive/folders/1Archive"}',
};

const local = (
  name: string,
  mediaType: string,
  content: BlobPart[],
): ViewableFile => ({
  name,
  mediaType,
  source: { kind: "local", file: new File(content, name, { type: mediaType }) },
});
const remote = (
  name: string,
  mediaType: string,
  url: string,
): ViewableFile => ({
  name,
  mediaType,
  source: { kind: "remote", url },
});

function SampleMarkdown({ text }: FileMarkdownRendererProps) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const inline = (value: string) =>
    value
      .split(/(\*\*[^*]+\*\*)/)
      .map((part, index) =>
        part.startsWith("**") ? (
          <strong key={index}>{part.slice(2, -2)}</strong>
        ) : (
          part
        ),
      );
  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, index) => (
      <li key={index}>{inline(item)}</li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length}>{items}</ol>
      ) : (
        <ul key={blocks.length}>{items}</ul>
      ),
    );
    list = null;
  };
  for (const line of text.split("\n")) {
    const bullet = /^(-|\d+\.) (.*)$/.exec(line);
    if (bullet) {
      const ordered = bullet[1] !== "-";
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push(bullet[2]!);
      continue;
    }
    flush();
    if (line.startsWith("## "))
      blocks.push(<h3 key={blocks.length}>{line.slice(3)}</h3>);
    else if (line.startsWith("# "))
      blocks.push(<h2 key={blocks.length}>{line.slice(2)}</h2>);
    else if (line.trim())
      blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="file-viewer-demo-markdown">{blocks}</div>;
}

type Sheet = { name: string; rows: string[][] };

function SampleSheet({ name, bytes, onRetry }: FileSheetRendererProps) {
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "error" } | { kind: "ready"; sheets: Sheet[] }
  >({
    kind: "loading",
  });
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (!/\.(csv|tsv)$/i.test(name)) throw new Error("Not a sample sheet");
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        const rows = text
          .split("\n")
          .map((row) => row.split(name.endsWith(".tsv") ? "\t" : ","));
        setState({
          kind: "ready",
          sheets: [
            { name: "Prices", rows },
            { name: "Notes", rows: [] },
          ],
        });
      } catch {
        setState({ kind: "error" });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [bytes, name]);
  if (state.kind === "loading") return <LoadingFile />;
  if (state.kind === "error")
    return (
      <FileError
        message="The spreadsheet could not be read. It may be damaged or password-protected."
        onRetry={onRetry}
      />
    );
  const sheet = state.sheets[selected]!;
  const columns = Array.from(
    { length: Math.max(...state.sheets[0]!.rows.map((row) => row.length)) },
    (_, index) => String.fromCharCode(65 + index),
  );
  return (
    <div className="file-viewer-demo-sheet">
      <div
        className="file-viewer-demo-sheet-tabs"
        role="group"
        aria-label="Worksheets"
      >
        {state.sheets.map((item, index) => (
          <Button
            key={item.name}
            variant={selected === index ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {item.name}
          </Button>
        ))}
      </div>
      {sheet.rows.length ? (
        <div
          className="file-viewer-demo-grid"
          tabIndex={0}
          role="region"
          aria-label={`${sheet.name} worksheet`}
        >
          <table>
            <thead>
              <tr>
                <th>
                  <span className="sr-only">Row</span>
                </th>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row, index) => (
                <tr key={index}>
                  <th scope="row">{index + 1}</th>
                  {columns.map((column, cell) => (
                    <td key={column}>{row[cell] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="file-viewer-demo-sheet-empty">This worksheet is empty.</p>
      )}
    </div>
  );
}

function SampleOffice({ bytes, kind, name, onRetry }: FileOfficeRendererProps) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const lines = useMemo(() => {
    try {
      const text = new TextDecoder("utf-8", { fatal: true })
        .decode(bytes)
        .split("\n");
      return text[0] ===
        (kind === "slides" ? "SAMPLE-SLIDES" : "SAMPLE-DOCUMENT")
        ? text.slice(1)
        : null;
    } catch {
      return null;
    }
  }, [bytes, kind]);
  useEffect(() => {
    const timer = setTimeout(() => setState(lines ? "ready" : "error"), 300);
    return () => clearTimeout(timer);
  }, [lines]);
  return (
    <div className="file-viewer-demo-office">
      {state === "loading" && (
        <div className="file-viewer-demo-office-loading">
          <LoadingFile />
        </div>
      )}
      {state === "error" && (
        <FileError
          message="This Office file could not be rendered. It may be damaged, encrypted, or use unsupported formatting."
          onRetry={onRetry}
        />
      )}
      {state === "ready" && lines && (
        <div
          className="file-viewer-demo-pages"
          aria-label={`${name} ${kind === "slides" ? "slides" : "document"}`}
          role="region"
          tabIndex={0}
        >
          {kind === "slides" ? (
            lines.slice(1).map((line, index) => (
              <section key={index} className="file-viewer-demo-slide">
                <p>
                  Slide {index + 1} of {lines.length - 1}
                </p>
                <h2>{index === 0 ? lines[0] : line}</h2>
                {index === 0 && <p>{line}</p>}
              </section>
            ))
          ) : (
            <section className="file-viewer-demo-page">
              <h2>{lines[0]}</h2>
              {lines.slice(1).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const renderers: FileRenderers = {
  markdown: (props) => <SampleMarkdown {...props} />,
  sheet: (props) => <SampleSheet {...props} />,
  office: (props) => <SampleOffice {...props} />,
};

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
    <section className="file-viewer-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="file-viewer-demo-card-body">{children}</div>
    </section>
  );
}

const sizeOf = (file: ViewableFile) =>
  file.source.kind === "local"
    ? file.source.file.size === 0
      ? "0 bytes"
      : file.source.file.size < 1024
        ? `${file.source.file.size} B`
        : `${Math.round(file.source.file.size / 1024 / 1024)} MB`
    : file.source.url.startsWith("https://docs.google.com")
      ? "Google Docs"
      : "Linked file";

function FileList({ files, label }: { files: ViewableFile[]; label: string }) {
  return (
    <AttachmentGroup
      variant="grid"
      aria-label={label}
      className="file-viewer-demo-files"
    >
      {files.map((file) => {
        const attachment: AttachmentFile = {
          id: file.name,
          name: file.name,
          mediaType: file.mediaType,
          size: sizeOf(file),
          state: "ready",
          source: file.source,
        };
        return (
          <FileAttachment key={file.name} file={attachment} preview viewable />
        );
      })}
    </AttachmentGroup>
  );
}

function OpenFiles() {
  const files = useMemo(
    () => [
      local("Harvest notes.txt", types.txt, [samples.notes]),
      local("Spring planting plan.md", types.md, [samples.plan]),
      local("Supplier price list.csv", types.csv, [samples.prices]),
      local("Order SO-1042.json", types.json, [samples.order]),
      local("bed_ready.py", "", [samples.python]),
      local("main.rs", "", [samples.rust]),
      local("weekly_orders.sql", "", [samples.sql]),
      local("Dockerfile", "", [samples.dockerfile]),
      local("deploy.yaml", "", [samples.yaml]),
      remote(
        "Greenhouse layout.png",
        types.png,
        "/file-viewer-samples/greenhouse-layout.png",
      ),
      remote(
        "Returns policy.pdf",
        types.pdf,
        "/file-viewer-samples/returns-policy.pdf",
      ),
      local("Store floor plan.docx", types.docx, [samples.floorPlan]),
      local("Q3 launch deck.pptx", types.pptx, [samples.deck]),
      local("Planting calendar.gsheet", types.gsheet, [samples.shortcut]),
      remote(
        "Supplier contract",
        "application/vnd.google-apps.document",
        "https://docs.google.com/document/d/1SupplierContractSample/edit",
      ),
      remote(
        "Harvest log.txt",
        types.txt,
        "/file-viewer-samples/harvest-log.txt",
      ),
    ],
    [],
  );
  return (
    <Example
      title="Open a file"
      description="Attachments open the full-screen viewer. Local files stay in browser memory; linked files load from their URL; Google links embed Google’s own viewer."
    >
      <FileList files={files} label="Sample files" />
    </Example>
  );
}

function EdgeCases() {
  const [large, setLarge] = useState<ViewableFile | null>(null);
  const files = useMemo(
    () => [
      local("Empty notes.txt", types.txt, []),
      local("Legacy export.txt", types.txt, [
        new Uint8Array([0xff, 0xfe, 0xff]),
      ]),
      local("Order SO-1043.json", types.json, [samples.brokenJson]),
      remote("Brand mark.svg", types.svg, "/avatar-samples/landscape.svg"),
      local("Damaged price list.xlsx", types.xlsx, ["not a workbook"]),
      local("Encrypted proposal.docx", types.docx, ["encrypted"]),
      local("2019 board deck.ppt", types.ppt, ["legacy"]),
      local("Archive shortcut.gdoc", "", [samples.brokenShortcut]),
      local("Firmware backup.bin", types.bin, ["fictional"]),
      remote(
        "Moved supplier list.txt",
        types.txt,
        "/file-viewer-samples/missing-supplier-list.txt",
      ),
    ],
    [],
  );
  return (
    <Example
      title="Empty, invalid, and unsupported files"
      description="Each file explains what went wrong and how to recover. Errors offer Try again; formats the browser can’t show suggest downloading."
    >
      <FileList files={files} label="Edge case files" />
      <div className="file-viewer-demo-row">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setLarge(
              local("Drone survey.tif", "image/tiff", [
                new Uint8Array(50 * 1024 * 1024 + 1),
              ]),
            )
          }
        >
          Open a 50 MB survey image
        </Button>
        <FileViewer
          file={large}
          open={large !== null}
          onOpenChange={(open) => !open && setLarge(null)}
        />
      </div>
    </Example>
  );
}

function InlineContent() {
  const [file] = useState(() =>
    local("Harvest notes.txt", types.txt, [samples.notes]),
  );
  const [plan] = useState(() =>
    local("Spring planting plan.md", types.md, [samples.plan]),
  );
  return (
    <Example
      title="Inline in a panel"
      description="ViewableFileContent fills any flex column, such as a chat canvas tab or a fixed-height preview."
    >
      <div className="file-viewer-demo-split">
        <div className="file-viewer-demo-frame" data-height="sm">
          <ViewableFileContent file={file} />
        </div>
        <div
          className="file-viewer-demo-frame"
          data-height="sm"
          data-testid="inline-markdown"
        >
          <ViewableFileContent file={plan} />
        </div>
      </div>
    </Example>
  );
}

type Loaded =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ready"; bytes: ArrayBuffer; url: string };

function useSampleBytes(
  name: string,
  mediaType: string,
  load: () => Promise<ArrayBuffer>,
  state: "loading" | "failed" | "ready",
  attempt: number,
) {
  const [content, setContent] = useState<Loaded>({ kind: "loading" });
  useEffect(() => {
    if (state !== "ready") {
      setContent({ kind: state });
      return;
    }
    let url: string | null = null;
    let cancelled = false;
    setContent({ kind: "loading" });
    void load().then((bytes) => {
      if (cancelled) return;
      url = URL.createObjectURL(
        new Blob([bytes], { type: renderableType(name, mediaType) }),
      );
      setContent({ kind: "ready", bytes, url });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [name, mediaType, state, attempt]);
  return content;
}

const workspaceFiles = {
  pdf: {
    label: "PDF",
    name: "Returns policy.pdf",
    mediaType: types.pdf,
    load: () =>
      fetch("/file-viewer-samples/returns-policy.pdf").then((r) =>
        r.arrayBuffer(),
      ),
  },
  sheet: {
    label: "Sheet",
    name: "Supplier price list.csv",
    mediaType: types.csv,
    load: async () =>
      new TextEncoder().encode(samples.prices).buffer as ArrayBuffer,
  },
  markdown: {
    label: "Markdown",
    name: "Spring planting plan.md",
    mediaType: types.md,
    load: async () =>
      new TextEncoder().encode(samples.plan).buffer as ArrayBuffer,
  },
  image: {
    label: "Image",
    name: "Greenhouse layout.png",
    mediaType: types.png,
    load: () =>
      fetch("/file-viewer-samples/greenhouse-layout.png").then((r) =>
        r.arrayBuffer(),
      ),
  },
  json: {
    label: "JSON",
    name: "Order SO-1042.json",
    mediaType: types.json,
    load: async () =>
      new TextEncoder().encode(samples.order).buffer as ArrayBuffer,
  },
};
type WorkspaceKind = keyof typeof workspaceFiles;

function Choice<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly (readonly [Value, string])[];
  onChange: (value: Value) => void;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      size="sm"
      variant="outline"
      spacing={0}
      value={[value]}
      onValueChange={(next) => next[0] && onChange(next[0] as Value)}
    >
      {options.map(([option, text]) => (
        <ToggleGroupItem key={option} value={option}>
          {text}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function WorkspaceFilePage() {
  const [kind, setKind] = useState<WorkspaceKind>("pdf");
  const [state, setState] = useState<"loading" | "failed" | "ready">("ready");
  const [attempt, setAttempt] = useState(0);
  const file = workspaceFiles[kind];
  const content = useSampleBytes(
    file.name,
    file.mediaType,
    file.load,
    state,
    attempt,
  );
  const retry = () => {
    setState("ready");
    setAttempt((value) => value + 1);
  };
  return (
    <Example
      title="Files you load yourself"
      description="A file page or canvas tab fetches bytes its own way, then shows LoadingFile, FileError, or FileContent."
    >
      <div className="file-viewer-demo-controls">
        <Choice
          label="Sample file"
          value={kind}
          onChange={setKind}
          options={Object.entries(workspaceFiles).map(
            ([key, item]) => [key as WorkspaceKind, item.label] as const,
          )}
        />
        <Choice
          label="Content state"
          value={state}
          onChange={setState}
          options={[
            ["loading", "Loading"],
            ["failed", "Failed"],
            ["ready", "Ready"],
          ]}
        />
      </div>
      <section
        aria-label="File content"
        className="file-viewer-demo-frame"
        data-height="lg"
        data-testid="workspace-file"
      >
        <div className="file-viewer-demo-toolbar">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href="#file-viewer-demo" />}
          >
            Open in Files
          </Button>
        </div>
        {content.kind === "loading" ? (
          <LoadingFile />
        ) : content.kind === "failed" ? (
          <FileError
            message="The file content couldn’t be loaded. Your file is unchanged."
            onRetry={retry}
          />
        ) : (
          <FileContent
            key={file.name}
            name={file.name}
            mediaType={file.mediaType}
            bytes={content.bytes}
            url={content.url}
            onRetry={retry}
          />
        )}
      </section>
    </Example>
  );
}

function ProposedUpload() {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const content = useSampleBytes(
    "Autumn order.csv",
    types.csv,
    async () => new TextEncoder().encode(samples.prices).buffer as ArrayBuffer,
    failed ? "failed" : "ready",
    attempt,
  );
  const retry = () => {
    setFailed(false);
    setAttempt((value) => value + 1);
  };
  return (
    <Example
      title="Proposed upload"
      description="An approval card shows the exact file an action will upload before anyone approves it."
    >
      <div className="file-viewer-demo-controls">
        <Choice
          label="Proposed file"
          value={failed ? "failed" : "ready"}
          onChange={(value) => setFailed(value === "failed")}
          options={[
            ["ready", "Decoded"],
            ["failed", "Can’t decode"],
          ]}
        />
      </div>
      <section
        aria-label="Exact proposed file"
        className="file-viewer-demo-proposal"
      >
        <div className="file-viewer-demo-proposal-meta">
          <p>Exact proposed file · 1 KB</p>
          {content.kind === "ready" && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={content.url} download="Autumn order.csv" />}
            >
              Download exact file
            </Button>
          )}
        </div>
        <div className="file-viewer-demo-frame" data-height="md">
          {content.kind === "failed" ? (
            <FileError
              message="The proposed file could not be decoded. Check the action before approving."
              onRetry={retry}
            />
          ) : content.kind === "ready" ? (
            <FileContent
              key={attempt}
              name="Autumn order.csv"
              mediaType={types.csv}
              bytes={content.bytes}
              url={content.url}
              onRetry={retry}
            />
          ) : (
            <LoadingFile />
          )}
        </div>
      </section>
    </Example>
  );
}

function GoogleFileCanvas() {
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const content = useSampleBytes(
    "Opening hours.docx",
    types.docx,
    () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve(
              new TextEncoder().encode(
                "SAMPLE-DOCUMENT\nOpening hours\nMonday to Saturday, 9:00 to 17:30.\nSunday, 10:00 to 16:00. Closed on bank holidays.",
              ).buffer as ArrayBuffer,
            ),
          400,
        ),
      ),
    "ready",
    attempt,
  );
  useEffect(() => {
    if (content.kind === "ready") setRefreshing(false);
  }, [content.kind]);
  const retry = () => {
    if (refreshing) return;
    setRefreshing(true);
    setAttempt((value) => value + 1);
  };
  return (
    <Example
      title="Google file in a canvas"
      description="A Google Drive file downloaded as Office bytes and shown with the renderers registered by FileRenderersProvider."
    >
      <div
        className="file-viewer-demo-frame file-viewer-demo-canvas"
        data-height="lg"
        data-testid="google-canvas"
      >
        <header className="file-viewer-demo-canvas-header">
          <div className="file-viewer-demo-canvas-title">
            <div>
              <h3>Opening hours</h3>
              <p>Current Google file</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh Google file"
              disabled={refreshing}
              aria-busy={refreshing}
              onClick={retry}
            >
              <Refresh size={16} aria-hidden="true" />
            </Button>
          </div>
          <div className="file-viewer-demo-row">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href="https://docs.google.com/document/d/1OpeningHoursSample/edit"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ArrowUpRight size={14} aria-hidden="true" />
              Open in Google
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href="#file-viewer-demo" />}
            >
              Open Google file page
            </Button>
          </div>
        </header>
        {content.kind === "ready" ? (
          <FileContent
            name="Opening hours.docx"
            mediaType={types.docx}
            bytes={content.bytes}
            url={content.url}
            onRetry={retry}
          />
        ) : (
          <LoadingFile />
        )}
      </div>
    </Example>
  );
}

function Unregistered() {
  const [file] = useState(() =>
    local("Supplier price list.csv", types.csv, [samples.prices]),
  );
  return (
    <Example
      title="Without renderers"
      description="With no sheet or Office renderer registered, those formats ask people to download the original. Markdown falls back to plain text."
    >
      <FileRenderersProvider
        renderers={{ sheet: undefined, office: undefined, markdown: undefined }}
      >
        <div className="file-viewer-demo-frame" data-height="sm">
          <ViewableFileContent file={file} />
        </div>
      </FileRenderersProvider>
    </Example>
  );
}

export default function FileViewerDemo() {
  return (
    <FileRenderersProvider renderers={renderers}>
      <div id="file-viewer-demo" className="file-viewer-demo">
        <OpenFiles />
        <SharedFile />
        <EdgeCases />
        <InlineContent />
        <WorkspaceFilePage />
        <GoogleFileCanvas />
        <ProposedUpload />
        <Unregistered />
        <CanvasNote />
      </div>
    </FileRenderersProvider>
  );
}

function CanvasNote() {
  const [file] = useState(() =>
    local("Q3 launch deck.pptx", types.pptx, [samples.deck]),
  );
  return (
    <Example
      title="Slides in a canvas tab"
      description="A file attached in chat opens in the canvas with ViewableFileContent, here rendered by the registered Office renderer."
    >
      <div
        className="file-viewer-demo-frame"
        data-height="md"
        data-testid="canvas-slides"
      >
        <ViewableFileContent file={file} />
      </div>
    </Example>
  );
}

const people = [
  { name: "Maya Okafor", access: "Owner", seen: "Viewing now" },
  { name: "Theo Lindqvist", access: "Can edit", seen: "Viewing now" },
  { name: "Greenhouse team", access: "Can view", seen: "Viewed yesterday" },
  { name: "Priya Raman", access: "Can comment", seen: "Viewed 2 hours ago" },
  { name: "Sam Ortiz", access: "Can view", seen: "Viewed last week" },
  { name: "Lena Brandt", access: "Can view", seen: "Not opened yet" },
];
const shownPeople = 4;

const comments = [
  {
    name: "Theo Lindqvist",
    time: "10 min ago",
    text: "Can we move the sweet peas to the south border? The north side gets frost first.",
  },
  {
    name: "Maya Okafor",
    time: "4 min ago",
    text: "Good call. I will update the plan after the irrigation check.",
  },
];

const activity = [
  { name: "Priya Raman", text: "and 3 others viewed", time: "Today" },
  { name: "Maya Okafor", text: "edited This week", time: "Yesterday" },
  { name: "Maya Okafor", text: "shared with Greenhouse team", time: "Mon" },
];

function SharedFile() {
  const [file] = useState(() =>
    local("Spring planting plan.md", types.md, [samples.plan]),
  );
  const [open, setOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState("comments");
  const showPeople = () => {
    setTab("people");
    setPanelOpen(true);
  };
  return (
    <Example
      title="Shared file with activity"
      description="Put people and Share in actions, extra commands in menu, and comments, activity, or access in the side panel. Selecting an avatar opens the People tab."
    >
      <div className="file-viewer-demo-row">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Open shared plan
        </Button>
      </div>
      <FileViewer
        file={file}
        open={open}
        onOpenChange={setOpen}
        panelLabel="Comments and activity"
        panelOpen={panelOpen}
        onPanelOpenChange={setPanelOpen}
        actions={
          <>
            <TooltipProvider>
              <AvatarGroup
                className="file-viewer-demo-people"
                aria-label="People with access"
              >
                {people.slice(0, shownPeople).map((person) => (
                  <Tooltip key={person.name}>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="file-viewer-demo-person"
                          data-live={
                            person.seen === "Viewing now" ? "" : undefined
                          }
                          aria-label={`${person.name}, ${person.seen}`}
                          onClick={showPeople}
                        />
                      }
                    >
                      <EntityAvatar
                        seed={person.name}
                        name={person.name}
                        size="sm"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <strong>{person.name}</strong> · {person.seen}
                    </TooltipContent>
                  </Tooltip>
                ))}
                <AvatarGroupCount className="file-viewer-demo-people-count">
                  <button
                    type="button"
                    aria-label={`${people.length - shownPeople} more people`}
                    onClick={showPeople}
                  >
                    +{people.length - shownPeople}
                  </button>
                </AvatarGroupCount>
              </AvatarGroup>
            </TooltipProvider>
            <Button size="sm" onClick={showPeople}>
              Share
            </Button>
          </>
        }
        menu={
          <>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
            <DropdownMenuItem>Version history</DropdownMenuItem>
          </>
        }
        panel={
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(String(value))}
            className="file-viewer-demo-panel"
          >
            <TabsList variant="line" aria-label="File details">
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
            </TabsList>
            <TabsContent value="comments">
              <ul className="file-viewer-demo-feed">
                {comments.map((comment) => (
                  <li key={comment.time}>
                    <EntityAvatar
                      seed={comment.name}
                      name={comment.name}
                      size="sm"
                    />
                    <div>
                      <p>
                        <strong>{comment.name}</strong>{" "}
                        <span>{comment.time}</span>
                      </p>
                      <p>{comment.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="activity">
              <ul className="file-viewer-demo-feed">
                {activity.map((item) => (
                  <li key={item.text}>
                    <EntityAvatar seed={item.name} name={item.name} size="sm" />
                    <div>
                      <p>
                        <strong>{item.name}</strong> {item.text}
                      </p>
                      <p>
                        <span>{item.time}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="people">
              <ul className="file-viewer-demo-feed">
                {people.map((person) => (
                  <li key={person.name}>
                    <EntityAvatar
                      seed={person.name}
                      name={person.name}
                      size="sm"
                    />
                    <div>
                      <p>
                        <strong>{person.name}</strong>
                      </p>
                      <p>
                        <span>{person.seen}</span>
                      </p>
                    </div>
                    <span className="file-viewer-demo-access">
                      {person.access}
                    </span>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        }
      />
    </Example>
  );
}
