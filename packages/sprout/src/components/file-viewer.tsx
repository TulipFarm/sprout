import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowUpRight } from "reicon-react/icons/ArrowUpRight";
import { ChevronLeft } from "reicon-react/icons/ChevronLeft";
import { ChevronRight } from "reicon-react/icons/ChevronRight";
import { Download } from "reicon-react/icons/Download";
import { MoreH } from "reicon-react/icons/MoreH";
import { SidebarRight } from "reicon-react/icons/SidebarRight";
import { X } from "reicon-react/icons/X";
import { cn } from "../internal/classes.js";
import { fileKind, type FileKind } from "../internal/file-kind.js";
import { Button } from "./button.js";
import { CodeBlock, languageForFilename } from "./code-block.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  type DialogContentProps,
} from "./dialog.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu.js";
import { Spinner } from "./spinner.js";
import { StatePanel } from "./state-panel.js";

export type ViewableFileSource =
  { kind: "local"; file: File } | { kind: "remote"; url: string };

export interface ViewableFile {
  name: string;
  mediaType: string;
  source: ViewableFileSource;
}

export type ViewableFileKind = FileKind;

export interface FileSheetRendererProps {
  name: string;
  bytes: ArrayBuffer;
  onRetry: () => void;
}

export interface FileOfficeRendererProps extends FileSheetRendererProps {
  kind: "document" | "slides";
}

export interface FileMarkdownRendererProps {
  text: string;
}

/**
 * Renderers for formats that need a heavy parser. Without one, sheets and
 * Office files show a download prompt and Markdown shows its plain text.
 * Each renderer runs inside Suspense with `LoadingFile` as the fallback,
 * so a lazy component works as is.
 */
export interface FileRenderers {
  markdown?: ((props: FileMarkdownRendererProps) => ReactNode) | undefined;
  sheet?: ((props: FileSheetRendererProps) => ReactNode) | undefined;
  office?: ((props: FileOfficeRendererProps) => ReactNode) | undefined;
}

const RenderersContext = createContext<FileRenderers>({});

export interface FileRenderersProviderProps {
  renderers: FileRenderers;
  children?: ReactNode;
}

/** Registers file renderers once for every viewer below it. */
export function FileRenderersProvider({
  renderers,
  children,
}: FileRenderersProviderProps) {
  const parent = useContext(RenderersContext);
  const value = useMemo(
    () => ({ ...parent, ...renderers }),
    [parent, renderers],
  );
  return <RenderersContext value={value}>{children}</RenderersContext>;
}

function useRenderers(own: FileRenderers | undefined) {
  const shared = useContext(RenderersContext);
  return own ? { ...shared, ...own } : shared;
}

export const maxViewableFileBytes = 50 * 1024 * 1024;

export function viewableFileKind(
  name: string,
  mediaType: string,
): ViewableFileKind {
  return fileKind(name, mediaType);
}

export interface GoogleDocumentLink {
  url: string;
  embedUrl: string;
  mediaType: string;
}

/** Recognizes a docs.google.com Docs, Sheets, or Slides link. */
export function googleDocument(url: string): GoogleDocumentLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "docs.google.com" ||
    parsed.username ||
    parsed.password ||
    parsed.port
  )
    return null;
  const match =
    /^\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/.exec(
      parsed.pathname,
    );
  if (!match) return null;
  const [, family, id] = match;
  const canonical = `https://docs.google.com/${family}/d/${id}`;
  const endpoint = family === "presentation" ? "embed" : "preview";
  return {
    url: `${canonical}/edit`,
    embedUrl: `${canonical}/${endpoint}${family === "spreadsheets" ? "?widget=true&headers=false" : ""}`,
    mediaType: `application/vnd.google-apps.${family === "spreadsheets" ? "spreadsheet" : family}`,
  };
}

/** Reads the document link from a .gdoc, .gsheet, or .gslides shortcut. */
export function googleShortcut(text: string): string {
  const value: unknown = JSON.parse(text);
  if (
    typeof value !== "object" ||
    value === null ||
    !("url" in value) ||
    typeof value.url !== "string"
  )
    throw new Error("This Google shortcut does not contain a document link.");
  const document = googleDocument(value.url);
  if (!document)
    throw new Error(
      "This shortcut does not contain a supported Google Docs, Sheets, or Slides link.",
    );
  return document.url;
}

const rasterTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/heic",
  "image/heif",
  "image/tiff",
]);

/**
 * The type to give a same-origin blob URL. Stored media types are
 * untrusted, so anything a browser could run as a document, including SVG,
 * becomes `application/octet-stream`.
 */
export function renderableType(name: string, mediaType: string) {
  const kind = fileKind(name, mediaType);
  if (kind === "pdf") return "application/pdf";
  const type = mediaType.trim().toLowerCase();
  return kind === "image" && rasterTypes.has(type)
    ? type
    : "application/octet-stream";
}

type LoadedFile =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; url: string; bytes: ArrayBuffer };

function useFileContent(
  file: ViewableFile,
  attempt = 0,
  enabled = true,
): LoadedFile {
  const [loaded, setLoaded] = useState<LoadedFile>({ kind: "loading" });
  const { source, name, mediaType } = file;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoaded({ kind: "loading" });
    const load = async () => {
      let blob: Blob;
      if (source.kind === "local") blob = source.file;
      else {
        const response = await fetch(source.url, { signal: controller.signal });
        if (!response.ok)
          throw new Error(
            "The file could not be loaded. Check the link and try again.",
          );
        blob = await response.blob();
      }
      if (blob.size > maxViewableFileBytes)
        throw new Error(
          "This file is larger than the 50 MB local viewing limit.",
        );
      const bytes = await blob.arrayBuffer();
      if (cancelled) return;
      objectUrl = URL.createObjectURL(
        new Blob([bytes], {
          type: renderableType(name, blob.type || mediaType),
        }),
      );
      setLoaded({ kind: "ready", bytes, url: objectUrl });
    };
    void load()
      .catch((error: unknown) => {
        if (!cancelled)
          setLoaded({
            kind: "error",
            message:
              error instanceof Error && error.name !== "AbortError"
                ? error.message
                : "The file took too long to load. Try again.",
          });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source, name, mediaType, attempt, enabled]);
  return loaded;
}

interface FileViewerBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renderers?: FileRenderers | undefined;
  /** Where focus goes on close. Defaults to the element that had focus when the viewer opened. */
  finalFocus?: DialogContentProps["finalFocus"];
  /** Your header controls before Download, such as who is viewing and a Share button. */
  actions?: ReactNode;
  /** `DropdownMenuItem`s added to the More actions menu after Reload. */
  menu?: ReactNode;
  /**
   * A side panel for comments, activity, sharing, or file details. Adds a
   * header toggle. It stays mounted while hidden and across file steps, so
   * tabs and drafts inside it survive.
   */
  panel?: ReactNode;
  /** The panel's accessible name and toggle label. Defaults to “Details”. */
  panelLabel?: string;
  /** Controls whether the panel shows. */
  panelOpen?: boolean;
  /** Whether the panel starts open. Defaults to open on screens 1024px and wider. */
  defaultPanelOpen?: boolean;
  onPanelOpenChange?: (open: boolean) => void;
}

interface SingleFileProps {
  file: ViewableFile | null;
  files?: undefined;
  index?: undefined;
  onIndexChange?: undefined;
}

interface FileSetProps {
  file?: undefined;
  /** Files to step through with Previous, Next, and the arrow keys. */
  files: readonly ViewableFile[];
  index: number;
  onIndexChange: (index: number) => void;
}

export type FileViewerProps = FileViewerBaseProps &
  (SingleFileProps | FileSetProps);

const ownsArrowKeys =
  'input, textarea, select, iframe, [contenteditable="true"], [role="region"], [role="slider"]';

/** A full-screen dialog that opens a local or linked file, or steps through several. */
export function FileViewer({
  file,
  files,
  index = 0,
  onIndexChange,
  open,
  onOpenChange,
  renderers,
  finalFocus,
  actions,
  menu,
  panel,
  panelLabel = "Details",
  panelOpen,
  defaultPanelOpen,
  onPanelOpenChange,
}: FileViewerProps) {
  const panelId = useId();
  const [ownPanelOpen, setOwnPanelOpen] = useState(
    () =>
      defaultPanelOpen ??
      (typeof window !== "undefined" &&
        !!window.matchMedia?.("(min-width: 1024px)").matches),
  );
  const panelShown = !!panel && (panelOpen ?? ownPanelOpen);
  const togglePanel = () => {
    setOwnPanelOpen(!panelShown);
    onPanelOpenChange?.(!panelShown);
  };
  const current = files ? (files[index] ?? null) : file;
  const count = files?.length ?? 0;
  const refocus = useRef<{ popup: Element; direction: string } | null>(null);
  const goTo = (target: number) => () => {
    const button = document.activeElement?.closest<HTMLElement>("[data-step]");
    const popup = button?.closest("[data-file-viewer]");
    refocus.current =
      button && popup ? { popup, direction: button.dataset.step ?? "" } : null;
    onIndexChange?.(target);
  };
  const step =
    files && count > 1
      ? {
          position: index + 1,
          count,
          previous: index > 0 ? goTo(index - 1) : undefined,
          next: index < count - 1 ? goTo(index + 1) : undefined,
        }
      : undefined;
  // Each step remounts the file to reset its state, which destroys the focused step button.
  useEffect(() => {
    const pending = refocus.current;
    refocus.current = null;
    if (!pending) return;
    const enabled = ":not(:disabled):not([aria-disabled='true'])";
    const target =
      pending.popup.querySelector<HTMLElement>(
        `[data-step="${pending.direction}"]${enabled}`,
      ) ?? pending.popup.querySelector<HTMLElement>(`[data-step]${enabled}`);
    target?.focus();
  }, [index]);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      !step ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if ((event.target as Element).closest(ownsArrowKeys)) return;
    const move = event.key === "ArrowLeft" ? step.previous : step.next;
    if (!move) return;
    event.preventDefault();
    move();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="fullscreen"
        showCloseButton={false}
        data-file-viewer=""
        data-panel={panelShown ? "open" : undefined}
        className="sprout-file-viewer"
        finalFocus={finalFocus}
        onKeyDown={handleKeyDown}
      >
        {current && open && (
          <SelectedFile
            key={step ? index : undefined}
            file={current}
            renderers={renderers}
            step={step}
            actions={actions}
            menu={menu}
            panel={
              panel
                ? {
                    id: panelId,
                    label: panelLabel,
                    open: panelShown,
                    toggle: togglePanel,
                  }
                : undefined
            }
          />
        )}
        {current && open && panel && (
          <aside
            id={panelId}
            aria-label={panelLabel}
            hidden={!panelShown}
            data-slot="file-viewer-panel"
            className="sprout-file-viewer-panel"
          >
            {panel}
          </aside>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FileStep {
  position: number;
  count: number;
  previous: (() => void) | undefined;
  next: (() => void) | undefined;
}

function sourceLabel(file: ViewableFile, google: boolean) {
  return google
    ? "Google document"
    : file.source.kind === "local"
      ? "Local file · Not uploaded"
      : "Linked file";
}

interface PanelToggle {
  id: string;
  label: string;
  open: boolean;
  toggle: () => void;
}

function SelectedFile({
  file,
  renderers,
  step,
  actions,
  menu,
  panel,
}: {
  file: ViewableFile;
  renderers: FileRenderers | undefined;
  step: FileStep | undefined;
  actions: ReactNode;
  menu: ReactNode;
  panel: PanelToggle | undefined;
}) {
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((value) => value + 1);
  const google =
    file.source.kind === "remote" ? googleDocument(file.source.url) : null;
  const loaded = useFileContent(file, attempt, !google);
  return (
    <>
      <header
        data-slot="file-viewer-header"
        className="sprout-file-viewer-header"
      >
        <div className="sprout-file-viewer-heading">
          <DialogTitle>
            <span className="sprout-file-viewer-truncate" title={file.name}>
              {file.name}
            </span>
          </DialogTitle>
          <DialogDescription>
            <span className="sprout-file-viewer-truncate">
              {sourceLabel(file, !!google)}
            </span>
          </DialogDescription>
        </div>
        <div
          data-slot="file-viewer-controls"
          className="sprout-file-viewer-controls"
        >
          {step && (
            <div
              data-slot="file-viewer-steps"
              className="sprout-file-viewer-steps"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous file"
                data-step="previous"
                disabled={!step.previous}
                onClick={step.previous}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </Button>
              <span className="sprout-file-viewer-position" aria-hidden="true">
                {step.position} of {step.count}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next file"
                data-step="next"
                disabled={!step.next}
                onClick={step.next}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
              <span aria-live="polite" className="sprout-file-viewer-sr-only">
                {file.name}, file {step.position} of {step.count}
              </span>
            </div>
          )}
          {actions && (
            <div
              data-slot="file-viewer-actions"
              className="sprout-file-viewer-actions"
            >
              {actions}
            </div>
          )}
          {google ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={google.url}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ArrowUpRight size={16} aria-hidden="true" />
              Open in Google
            </Button>
          ) : loaded.kind === "ready" ? (
            <Button
              variant="outline"
              size="sm"
              aria-label="Download"
              nativeButton={false}
              render={<a href={loaded.url} download={file.name} />}
            >
              <Download size={16} aria-hidden="true" />
              <span className="sprout-file-viewer-label">Download</span>
            </Button>
          ) : (
            <Button variant="outline" size="sm" aria-label="Download" disabled>
              <Download size={16} aria-hidden="true" />
              <span className="sprout-file-viewer-label">Download</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="More actions"
                />
              }
            >
              <MoreH size={16} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" size="menu">
              <DropdownMenuItem onClick={retry}>
                {google ? "Reload viewer" : "Reload file"}
              </DropdownMenuItem>
              {menu && (
                <>
                  <DropdownMenuSeparator />
                  {menu}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div
          data-slot="file-viewer-window"
          className="sprout-file-viewer-window"
        >
          {panel && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={panel.label}
              aria-expanded={panel.open}
              aria-controls={panel.id}
              onClick={panel.toggle}
            >
              <SidebarRight size={16} aria-hidden="true" />
            </Button>
          )}
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close file viewer"
              />
            }
          >
            <X size={18} aria-hidden="true" />
          </DialogClose>
        </div>
      </header>
      <div
        data-slot="viewable-file-content"
        className="sprout-file-viewer-surface"
      >
        {google ? (
          <EmbeddedFile
            key={`${google.embedUrl}:${attempt}`}
            url={google.embedUrl}
            name={file.name}
            google
            onRetry={retry}
          />
        ) : (
          <FileBody
            loaded={loaded}
            file={file}
            renderers={renderers}
            onRetry={retry}
          />
        )}
      </div>
    </>
  );
}

export interface ViewableFileContentProps extends HTMLAttributes<HTMLDivElement> {
  file: ViewableFile;
  renderers?: FileRenderers | undefined;
}

/** Loads a local or linked file and shows it inline, with reload and download. */
export function ViewableFileContent({
  file,
  renderers,
  className,
  ...props
}: ViewableFileContentProps) {
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((value) => value + 1);
  const google =
    file.source.kind === "remote" ? googleDocument(file.source.url) : null;
  return (
    <div
      data-slot="viewable-file-content"
      {...props}
      className={cn("sprout-file-viewer-surface", className)}
    >
      {google ? (
        <EmbeddedFile
          key={`${google.embedUrl}:${attempt}`}
          url={google.embedUrl}
          name={file.name}
          google
          onRetry={retry}
        />
      ) : (
        <LocalFile
          key={attempt}
          file={file}
          renderers={renderers}
          onRetry={retry}
        />
      )}
    </div>
  );
}

function LocalFile({
  file,
  renderers,
  onRetry,
}: {
  file: ViewableFile;
  renderers: FileRenderers | undefined;
  onRetry: () => void;
}) {
  const loaded = useFileContent(file);
  return (
    <>
      {loaded.kind === "ready" && (
        <div
          data-slot="file-viewer-toolbar"
          className="sprout-file-viewer-toolbar"
          data-align="end"
        >
          <Button variant="ghost" size="sm" onClick={onRetry}>
            Reload file
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={loaded.url} download={file.name} />}
          >
            <Download size={16} aria-hidden="true" />
            Download
          </Button>
        </div>
      )}
      <FileBody
        loaded={loaded}
        file={file}
        renderers={renderers}
        onRetry={onRetry}
      />
    </>
  );
}

function FileBody({
  loaded,
  file,
  renderers,
  onRetry,
}: {
  loaded: LoadedFile;
  file: ViewableFile;
  renderers: FileRenderers | undefined;
  onRetry: () => void;
}) {
  if (loaded.kind === "loading") return <LoadingFile />;
  if (loaded.kind === "error")
    return <FileError message={loaded.message} onRetry={onRetry} />;
  return (
    <FileContent
      name={file.name}
      mediaType={file.mediaType}
      bytes={loaded.bytes}
      url={loaded.url}
      onRetry={onRetry}
      renderers={renderers}
    />
  );
}

const textKinds: readonly ViewableFileKind[] = [
  "text",
  "code",
  "json",
  "markdown",
  "google",
];

export interface FileContentProps {
  name: string;
  mediaType: string;
  bytes: ArrayBuffer;
  /** A blob URL for `bytes`, typed with `renderableType`. */
  url: string;
  onRetry: () => void;
  renderers?: FileRenderers | undefined;
}

/** Shows bytes you already loaded: images, PDF, text, JSON, Markdown, Google shortcuts, and more. */
export function FileContent({
  name,
  mediaType,
  bytes,
  url,
  onRetry,
  renderers: own,
}: FileContentProps) {
  const renderers = useRenderers(own);
  const kind = fileKind(name, mediaType);
  const text = useMemo(() => {
    if (!textKinds.includes(kind)) return null;
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return undefined;
    }
  }, [bytes, kind]);
  if (text === undefined)
    return (
      <FileError
        message="This file is not valid UTF-8 text. Download it to open in another application."
        onRetry={onRetry}
      />
    );
  const unavailable = (
    <StatePanel
      kind="unavailable"
      title="This format cannot be displayed locally"
      description={
        name.toLowerCase().endsWith(".ppt")
          ? "Save this older PowerPoint file as .pptx to view the slides here. You can still download the original."
          : "Download the original file to open it in a compatible application."
      }
    />
  );
  let body: ReactNode;
  if (bytes.byteLength === 0)
    body = (
      <StatePanel
        kind="empty"
        title="This file is empty"
        description="The file contains no data to display."
      />
    );
  else if (kind === "image")
    body = <ImageFile url={url} name={name} onRetry={onRetry} />;
  else if (kind === "pdf")
    body = <EmbeddedFile url={url} name={name} onRetry={onRetry} />;
  else if (kind === "google")
    body = <GoogleShortcut text={text ?? ""} name={name} onRetry={onRetry} />;
  else if (kind === "sheet")
    body = renderers.sheet ? (
      <Suspense fallback={<LoadingFile />}>
        {renderers.sheet({ name, bytes, onRetry })}
      </Suspense>
    ) : (
      unavailable
    );
  else if (kind === "document" || kind === "slides")
    body = renderers.office ? (
      <Suspense fallback={<LoadingFile />}>
        {renderers.office({ name, bytes, kind, onRetry })}
      </Suspense>
    ) : (
      unavailable
    );
  else if (text !== null)
    body = (
      <TextFile
        text={text}
        name={name}
        kind={kind}
        renderMarkdown={renderers.markdown}
      />
    );
  else body = unavailable;
  return (
    <div
      data-slot="file-content"
      data-kind={kind}
      className="sprout-file-content"
    >
      {body}
    </div>
  );
}

export type LoadingFileProps = HTMLAttributes<HTMLDivElement>;

export function LoadingFile({ className, ...props }: LoadingFileProps) {
  return (
    <StatePanel
      kind="loading"
      title="Opening file"
      description="Preparing the document viewer."
      data-file-state="loading"
      {...props}
      className={className}
    />
  );
}

export interface FileErrorProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  message: ReactNode;
  onRetry: () => void;
}

export function FileError({
  message,
  onRetry,
  className,
  ...props
}: FileErrorProps) {
  return (
    <StatePanel
      kind="error"
      title="Could not open this file"
      description={message}
      data-file-state="error"
      {...props}
      className={className}
    >
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </StatePanel>
  );
}

function codeLanguageFor(name: string, kind: ViewableFileKind) {
  return kind === "code" ? (languageForFilename(name) ?? "text") : kind;
}

const previewTextKinds: readonly ViewableFileKind[] = [
  "text",
  "code",
  "json",
  "markdown",
];
const previewBytes = 16 * 1024;
const previewLines = 24;

/** Whether `FilePreview` can show this file: images, text, code, JSON, and Markdown, but not Google shortcuts. */
export function isPreviewableFile(file: ViewableFile) {
  if (file.source.kind === "remote" && googleDocument(file.source.url))
    return false;
  const kind = fileKind(file.name, file.mediaType);
  return kind === "image" || previewTextKinds.includes(kind);
}

export interface FilePreviewProps extends HTMLAttributes<HTMLDivElement> {
  file: ViewableFile;
}

/**
 * A small, non-interactive peek at a file: the image, or the first lines
 * of text and code with syntax colors. Made for hover cards and thumbnails.
 * Renders nothing for files `isPreviewableFile` rejects.
 */
export function FilePreview({ file, className, ...props }: FilePreviewProps) {
  if (!isPreviewableFile(file)) return null;
  const kind = fileKind(file.name, file.mediaType);
  return (
    <div
      data-slot="file-preview"
      data-kind={kind}
      {...props}
      className={cn("sprout-file-preview", className)}
    >
      {kind === "image" && file.source.kind === "remote" ? (
        <img
          src={file.source.url}
          alt={file.name}
          className="sprout-file-preview-image"
        />
      ) : (
        <LoadedPreview file={file} kind={kind} />
      )}
    </div>
  );
}

function LoadedPreview({
  file,
  kind,
}: {
  file: ViewableFile;
  kind: ViewableFileKind;
}) {
  const loaded = useFileContent(file);
  const text = useMemo(() => {
    if (loaded.kind !== "ready" || kind === "image") return null;
    const head = new TextDecoder().decode(loaded.bytes.slice(0, previewBytes));
    return head.split("\n").slice(0, previewLines).join("\n");
  }, [loaded, kind]);
  if (loaded.kind === "loading")
    return (
      <span className="sprout-file-preview-state">
        <Spinner size="sm" aria-hidden="true" />
        Loading preview…
      </span>
    );
  if (loaded.kind === "error")
    return (
      <span className="sprout-file-preview-state">Preview unavailable</span>
    );
  if (text === null)
    return (
      <img
        src={loaded.url}
        alt={file.name}
        className="sprout-file-preview-image"
      />
    );
  if (!text.trim())
    return (
      <span className="sprout-file-preview-state">This file is empty</span>
    );
  return (
    <CodeBlock
      code={text}
      language={codeLanguageFor(file.name, kind)}
      variant="preview"
      lineNumbers={false}
      wrap={kind === "text" || kind === "markdown"}
    />
  );
}

function TextFile({
  text,
  name,
  kind,
  renderMarkdown,
}: {
  text: string;
  name: string;
  kind: ViewableFileKind;
  renderMarkdown: FileRenderers["markdown"];
}) {
  const [source, setSource] = useState(false);
  const json = useMemo(() => {
    if (kind !== "json") return null;
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return undefined;
    }
  }, [kind, text]);
  const markdown = kind === "markdown" && renderMarkdown;
  const prose = kind === "text" || kind === "markdown";
  return (
    <div
      className="sprout-file-text"
      data-format={markdown && !source ? "formatted" : "source"}
    >
      {markdown && (
        <div className="sprout-file-text-bar">
          <Button
            variant="outline"
            size="sm"
            aria-pressed={source}
            onClick={() => setSource((value) => !value)}
          >
            {source ? "Show formatted" : "Show source"}
          </Button>
        </div>
      )}
      {json === undefined && (
        <p role="alert" className="sprout-file-text-alert">
          This file contains invalid JSON. The original text is shown below.
        </p>
      )}
      {markdown && !source ? (
        // The formatted page scrolls here, so keyboard users need to reach it.
        <div
          className="sprout-file-text-scroll"
          tabIndex={0}
          role="region"
          aria-label={name}
        >
          <div className="sprout-file-text-page">
            <Suspense fallback={<LoadingFile />}>
              {renderMarkdown({ text })}
            </Suspense>
          </div>
        </div>
      ) : (
        <CodeBlock
          code={json ?? text}
          language={codeLanguageFor(name, kind)}
          variant="file"
          wrap={prose}
        />
      )}
    </div>
  );
}

function ImageFile({
  url,
  name,
  onRetry,
}: {
  url: string;
  name: string;
  onRetry: () => void;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState(false);
  if (state === "error")
    return (
      <FileError
        message="Your browser could not decode this image. Try a PNG, JPEG, GIF, WebP, AVIF, or BMP version."
        onRetry={onRetry}
      />
    );
  return (
    <>
      <div className="sprout-file-viewer-toolbar" data-align="center">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={zoom}
          onClick={() => setZoom((value) => !value)}
        >
          {zoom ? "Fit image" : "Actual size"}
        </Button>
      </div>
      {state === "loading" && <LoadingFile />}
      <div
        className="sprout-file-image-stage"
        data-zoom={zoom ? "actual" : "fit"}
        tabIndex={zoom ? 0 : undefined}
        role={zoom ? "region" : undefined}
        aria-label={zoom ? `${name} at actual size` : undefined}
      >
        <img
          src={url}
          alt={name}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          className="sprout-file-image"
          data-state={state}
        />
      </div>
    </>
  );
}

function GoogleShortcut({
  text,
  name,
  onRetry,
}: {
  text: string;
  name: string;
  onRetry: () => void;
}) {
  let document: GoogleDocumentLink | null;
  try {
    document = googleDocument(googleShortcut(text));
  } catch (error) {
    return (
      <FileError
        message={
          error instanceof Error
            ? error.message
            : "Invalid Google document shortcut."
        }
        onRetry={onRetry}
      />
    );
  }
  if (!document) return null;
  return (
    <>
      <div className="sprout-file-google-link">
        <a href={document.url} target="_blank" rel="noopener noreferrer">
          Open in Google
        </a>
      </div>
      <EmbeddedFile
        url={document.embedUrl}
        name={name}
        google
        onRetry={onRetry}
      />
    </>
  );
}

function EmbeddedFile({
  url,
  name,
  google = false,
  onRetry,
}: {
  url: string;
  name: string;
  google?: boolean;
  onRetry: () => void;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "slow">("loading");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timer.current = setTimeout(
      () => setState((value) => (value === "loading" ? "slow" : value)),
      12000,
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  return (
    <div
      data-slot="file-embed"
      data-state={state}
      className="sprout-file-embed"
    >
      {google && (
        <p className="sprout-file-embed-notice">
          Google controls access to this document. If it cannot open here, use
          Open in Google to sign in or request access.
        </p>
      )}
      {state === "loading" && (
        <div className="sprout-file-embed-loading">
          <LoadingFile />
        </div>
      )}
      {state === "slow" && (
        <div className="sprout-file-embed-slow">
          <p role="status">
            The embedded viewer is taking longer than expected.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reload viewer
          </Button>
        </div>
      )}
      <iframe
        title={name}
        src={url}
        className="sprout-file-embed-frame"
        referrerPolicy="no-referrer"
        onLoad={() => {
          if (timer.current) clearTimeout(timer.current);
          setState("loaded");
        }}
        onError={() => setState("slow")}
        allowFullScreen
      />
    </div>
  );
}
