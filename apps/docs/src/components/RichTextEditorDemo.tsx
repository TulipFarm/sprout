import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Extension,
  Node,
  mergeAttributes,
  type Editor,
  type Extensions,
  type Range,
} from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { ArrowUp } from "reicon-react/icons/ArrowUp";
import { Bold } from "reicon-react/icons/Bold";
import { BookOpen } from "reicon-react/icons/BookOpen";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { Cpu } from "reicon-react/icons/Cpu";
import { FileText } from "reicon-react/icons/FileText";
import { Italic } from "reicon-react/icons/Italic";
import { Lightbulb } from "reicon-react/icons/Lightbulb";
import { List } from "reicon-react/icons/List";
import { Paperclip } from "reicon-react/icons/Paperclip";
import { Send } from "reicon-react/icons/Send";
import { Sparkle } from "reicon-react/icons/Sparkle";
import { Stop3 } from "reicon-react/icons/Stop3";
import { X } from "reicon-react/icons/X";
import { Button } from "@tulipfarm/sprout/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@tulipfarm/sprout/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@tulipfarm/sprout/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@tulipfarm/sprout/input-group";
import { Kbd } from "@tulipfarm/sprout/kbd";
import { Label } from "@tulipfarm/sprout/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@tulipfarm/sprout/popover";
import {
  RichTextEditor,
  type RichTextEditorHandle,
  type RichTextValue,
} from "@tulipfarm/sprout/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tulipfarm/sprout/select";
import { Switch } from "@tulipfarm/sprout/switch";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tulipfarm/sprout/tooltip";
import "../styles/rich-text-editor-demo.css";

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
    <section className="rte-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="rte-demo-card-body">{children}</div>
    </section>
  );
}

const paragraph = (text: string): RichTextValue => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
const doc = (...content: RichTextValue[]): RichTextValue => ({
  type: "doc",
  content,
});
const emptyDoc = (): RichTextValue => doc({ type: "paragraph" });

function hasContent(node: RichTextValue): boolean {
  if (node.type === "reference") return true;
  if (node.type === "text") return Boolean(node.text?.trim());
  return node.content?.some(hasContent) ?? false;
}

function textLength(node: RichTextValue): number {
  if (node.type === "text") return node.text?.length ?? 0;
  return node.content?.reduce((sum, child) => sum + textLength(child), 0) ?? 0;
}

/** Re-renders when the editor's selection or marks change, so toolbar buttons show the current format. */
function useEditorTick(handle: RefObject<RichTextEditorHandle | null>) {
  const [, setTick] = useState(0);
  useEffect(() => {
    let editor: Editor | null = null;
    let frame = 0;
    const bump = () => setTick((tick) => tick + 1);
    const attach = () => {
      editor = handle.current?.editor() ?? null;
      if (!editor) {
        frame = requestAnimationFrame(attach);
        return;
      }
      editor.on("transaction", bump);
      bump();
    };
    attach();
    return () => {
      cancelAnimationFrame(frame);
      editor?.off("transaction", bump);
    };
  }, [handle]);
}

function FormatToolbar({
  editor,
  disabled = false,
  onSend,
}: {
  editor: RefObject<RichTextEditorHandle | null>;
  disabled?: boolean;
  onSend: () => void;
}) {
  useEditorTick(editor);
  const current = editor.current?.editor();
  const format = (
    label: string,
    mark: string,
    icon: ReactNode,
    run: (editor: Editor) => void,
  ) => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={!disabled && (current?.isActive(mark) ?? false)}
            disabled={disabled}
            onClick={() => {
              const instance = editor.current?.editor();
              if (instance) run(instance);
            }}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
  return (
    <>
      {format("Bold", "bold", <Bold size={16} aria-hidden="true" />, (e) =>
        e.chain().focus().toggleMark("bold").run(),
      )}
      {format(
        "Italic",
        "italic",
        <Italic size={16} aria-hidden="true" />,
        (e) => e.chain().focus().toggleMark("italic").run(),
      )}
      {format(
        "Bulleted list",
        "bulletList",
        <List size={16} aria-hidden="true" />,
        (e) => e.chain().focus().toggleList("bulletList", "listItem").run(),
      )}
      <Button
        variant="outline"
        size="sm"
        className="rte-demo-push"
        disabled={disabled}
        onClick={onSend}
      >
        Send
        <Send size={16} aria-hidden="true" />
      </Button>
    </>
  );
}

export function RichTextEditorSizes() {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [value, setValue] = useState<RichTextValue>(
    doc(paragraph("A local draft. Try bold, lists, or a heading.")),
  );
  const [sent, setSent] = useState(false);
  const [compactValue, setCompactValue] = useState<RichTextValue>(
    doc(paragraph("Remind me to send the Northwind renewal on Friday")),
  );
  const [compactSent, setCompactSent] = useState(false);
  return (
    <Example
      title="Sizes"
      description="Default is an 80px to 256px box with 16px text and a toolbar row below. Compact is a 40px to 128px box with 14px text that keeps its toolbar inline. Enter sends; Shift+Enter adds a line."
    >
      <div className="rte-demo-grid">
        <div className="rte-demo-sample" data-testid="size-default">
          <div className="rte-demo-frame">
            <RichTextEditor
              ref={editorRef}
              value={value}
              onChange={setValue}
              onSend={() => setSent(true)}
              ariaLabel="Local draft"
              placeholder="Write a local draft…"
              toolbarAddon={
                <FormatToolbar
                  editor={editorRef}
                  onSend={() => setSent(true)}
                />
              }
            />
          </div>
          <p role="status" className="rte-demo-note">
            {sent
              ? "Draft example sent locally."
              : "default · formatting toolbar · Nothing has been sent."}
          </p>
        </div>
        <div className="rte-demo-sample" data-testid="size-compact">
          <div className="rte-demo-frame">
            <RichTextEditor
              size="compact"
              value={compactValue}
              onChange={setCompactValue}
              onSend={() => setCompactSent(true)}
              ariaLabel="Quick note"
              placeholder="Write a local draft…"
            />
          </div>
          <p role="status" className="rte-demo-note">
            {compactSent
              ? "Note sent locally."
              : "compact · no toolbar · Cmd or Ctrl+Enter also sends"}
          </p>
        </div>
      </div>
    </Example>
  );
}

const formattedDraft = doc(
  {
    type: "heading",
    attrs: { level: 2 },
    content: [{ type: "text", text: "Q3 renewal plan" }],
  },
  {
    type: "paragraph",
    content: [
      { type: "text", text: "Northwind renews on " },
      { type: "text", marks: [{ type: "bold" }], text: "October 31" },
      { type: "text", text: ". Draft terms live in " },
      {
        type: "text",
        marks: [
          { type: "link", attrs: { href: "https://example.com/northwind" } },
        ],
        text: "the contract folder",
      },
      { type: "text", text: "." },
    ],
  },
  {
    type: "bulletList",
    content: [
      {
        type: "listItem",
        content: [paragraph("Confirm seat count with procurement")],
      },
      {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Offer the " },
              { type: "text", marks: [{ type: "italic" }], text: "annual" },
              { type: "text", text: " discount only if they sign by the 24th" },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "orderedList",
    attrs: { start: 1 },
    content: [
      { type: "listItem", content: [paragraph("Send the summary")] },
      { type: "listItem", content: [paragraph("Book the review call")] },
    ],
  },
  {
    type: "blockquote",
    content: [
      paragraph("We need the signed copy before finance closes the quarter."),
    ],
  },
  {
    type: "paragraph",
    content: [
      { type: "text", text: "Run " },
      {
        type: "text",
        marks: [{ type: "code" }],
        text: "forecast --quarter q3",
      },
      { type: "text", text: " before the call:" },
    ],
  },
  {
    type: "codeBlock",
    attrs: { language: "sql" },
    content: [
      {
        type: "text",
        text: "select account, seats, renews_on\nfrom renewals\nwhere renews_on < '2026-11-01';",
      },
    ],
  },
);

export function RichTextEditorFormatting() {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [value, setValue] = useState<RichTextValue>(formattedDraft);
  const [sent, setSent] = useState(false);
  const [disabledValue, setDisabledValue] = useState<RichTextValue>(
    doc(paragraph("This chat is archived. Restore it to keep writing.")),
  );
  const disabledRef = useRef<RichTextEditorHandle>(null);
  return (
    <Example
      title="Formatting and states"
      description="Headings 1 to 3, bold, italic, links, lists, quotes, inline code, and fenced code blocks. Type ``` and a language, then Space, to start a code block; pasted fences become code blocks too. Disabled dims the editor and its toolbar."
    >
      <div className="rte-demo-grid">
        <div className="rte-demo-sample" data-testid="formatted">
          <div className="rte-demo-frame">
            <RichTextEditor
              ref={editorRef}
              value={value}
              onChange={setValue}
              onSend={() => setSent(true)}
              ariaLabel="Renewal plan draft"
              placeholder="Write a local draft…"
              toolbarAddon={
                <FormatToolbar
                  editor={editorRef}
                  onSend={() => setSent(true)}
                />
              }
            />
          </div>
          <p className="rte-demo-note">
            <span role="status">
              {sent
                ? "Plan sent locally."
                : "Enter inside a list or code block adds a line."}
            </span>{" "}
            <button
              type="button"
              className="rte-demo-link"
              onClick={() => {
                editorRef.current?.setContent(formattedDraft);
                setSent(false);
              }}
            >
              Reset draft
            </button>
          </p>
        </div>
        <div className="rte-demo-sample" data-testid="disabled">
          <div className="rte-demo-frame">
            <RichTextEditor
              ref={disabledRef}
              value={disabledValue}
              onChange={setDisabledValue}
              onSend={() => {}}
              ariaLabel="Archived chat message"
              disabled
              toolbarAddon={
                <FormatToolbar
                  editor={disabledRef}
                  disabled
                  onSend={() => {}}
                />
              }
            />
          </div>
          <p className="rte-demo-note">disabled · toolbar disabled too</p>
        </div>
      </div>
      <p className="rte-demo-keys">
        <span>
          <Kbd>Enter</Kbd> send
        </span>
        <span>
          <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> new line
        </span>
        <span>
          <Kbd>⌘</Kbd> <Kbd>Enter</Kbd> send from a list or code block
        </span>
        <span>
          <Kbd>⌘</Kbd> <Kbd>B</Kbd> bold
        </span>
        <span>
          <Kbd>⌘</Kbd> <Kbd>I</Kbd> italic
        </span>
      </p>
    </Example>
  );
}

// --- Sample chat adapters: Cloud wires these to real files, skills, and models.

type SuggestionItem = {
  id: string;
  title: string;
  description?: string;
  media?: ReactNode;
  apply: (editor: Editor, range: Range) => void;
};
type SuggestionState = {
  key: string;
  label: string;
  items: readonly SuggestionItem[];
  active: number;
  select: (index: number) => void;
} | null;

const referenceNode = Node.create({
  name: "reference",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  addAttributes() {
    return { kind: { default: "file" }, label: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-reference]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-reference": node.attrs.kind,
        class: "rte-demo-reference",
      }),
      `${node.attrs.kind === "skill" ? "/" : ""}${node.attrs.label}`,
    ];
  },
});

function triggerExtension(options: {
  key: string;
  char: string;
  label: string;
  items: (query: string) => SuggestionItem[];
  onState: (state: SuggestionState) => void;
}) {
  return Extension.create({
    name: `${options.key}Suggestion`,
    addProseMirrorPlugins() {
      return [
        Suggestion<SuggestionItem>({
          editor: this.editor,
          pluginKey: new PluginKey(options.key),
          char: options.char,
          allowSpaces: true,
          startOfLine: false,
          items: ({ query }) => options.items(query),
          command: ({ editor, range, props }) => props.apply(editor, range),
          render: () => {
            let current: SuggestionProps<SuggestionItem> | null = null;
            let active = 0;
            const publish = () => {
              if (!current) return;
              options.onState({
                key: options.key,
                label: options.label,
                items: current.items,
                active: Math.min(active, Math.max(0, current.items.length - 1)),
                select: (index) => {
                  const item = current?.items[index];
                  if (item) current?.command(item);
                },
              });
            };
            return {
              onStart: (props) => {
                current = props;
                active = 0;
                publish();
              },
              onUpdate: (props) => {
                current = props;
                active = 0;
                publish();
              },
              onKeyDown: ({ event }: SuggestionKeyDownProps) => {
                if (event.key === "Escape") {
                  options.onState(null);
                  return true;
                }
                if (!current?.items.length) return false;
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  const count = current.items.length;
                  active =
                    (active + (event.key === "ArrowDown" ? 1 : count - 1)) %
                    count;
                  publish();
                  return true;
                }
                if (
                  (event.key === "Enter" && !event.shiftKey) ||
                  event.key === "Tab"
                ) {
                  current.command(current.items[active]!);
                  return true;
                }
                return false;
              },
              onExit: () => {
                current = null;
                options.onState(null);
              },
            };
          },
        }),
      ];
    },
  });
}

const savedFiles = [
  { name: "Q3-forecast.xlsx", detail: "Spreadsheet · 182 KB" },
  { name: "northwind-contract.docx", detail: "Document · 64 KB" },
  { name: "board-deck-q3.pptx", detail: "Slides · 4.1 MB" },
  { name: "pricing-2026.pdf", detail: "PDF · 920 KB" },
];
const skills = [
  { name: "Weekly metrics digest", detail: "Summarize last week's numbers" },
  { name: "Renewal follow-up", detail: "Draft a renewal reminder email" },
  { name: "Meeting prep", detail: "Brief me before my next meeting" },
];

function insertReference(kind: "file" | "skill", label: string) {
  return (editor: Editor, range: Range) =>
    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        { type: "reference", attrs: { kind, label } },
        { type: "text", text: " " },
      ])
      .run();
}

function useChatExtensions(onState: (state: SuggestionState) => void) {
  const stateRef = useRef(onState);
  stateRef.current = onState;
  return useMemo<Extensions>(
    () => [
      referenceNode,
      triggerExtension({
        key: "file",
        char: "@",
        label: "Saved files",
        onState: (state) => stateRef.current(state),
        items: (query) =>
          savedFiles
            .filter((file) =>
              file.name.toLowerCase().includes(query.toLowerCase()),
            )
            .map((file) => ({
              id: file.name,
              title: file.name,
              description: file.detail,
              media: <FileText size={16} aria-hidden="true" />,
              apply: insertReference("file", file.name),
            })),
      }),
      triggerExtension({
        key: "skill",
        char: "/",
        label: "Skills",
        onState: (state) => stateRef.current(state),
        items: (query) =>
          skills
            .filter((skill) =>
              skill.name.toLowerCase().includes(query.toLowerCase()),
            )
            .map((skill) => ({
              id: skill.name,
              title: skill.name,
              description: skill.detail,
              media: <BookOpen size={16} aria-hidden="true" />,
              apply: insertReference("skill", skill.name),
            })),
      }),
    ],
    [],
  );
}

function SuggestionPanel({ state }: { state: NonNullable<SuggestionState> }) {
  return (
    <div className="rte-demo-suggestions">
      <p
        className="rte-demo-suggestions-label"
        id={`${state.key}-suggestions-label`}
      >
        {state.label}
      </p>
      <div
        id={`${state.key}-suggestions`}
        role="listbox"
        aria-labelledby={`${state.key}-suggestions-label`}
      >
        {state.items.map((item, index) => (
          <div
            key={item.id}
            id={`${state.key}-option-${index}`}
            role="option"
            aria-selected={index === state.active}
            className="rte-demo-option"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => state.select(index)}
          >
            {item.media}
            <span className="rte-demo-option-title">{item.title}</span>
            <span className="rte-demo-option-detail">{item.description}</span>
          </div>
        ))}
      </div>
      {!state.items.length && (
        <p role="status" className="rte-demo-suggestions-empty">
          {state.key === "file" ? "No saved files match." : "No skills match."}
        </p>
      )}
      {state.items.length > 0 && (
        <p className="sr-only" aria-live="polite">
          {state.items.length} {state.items.length === 1 ? "option" : "options"}
          . Use Up and Down to choose, Enter to select, Escape to close.
        </p>
      )}
    </div>
  );
}

const modes = [
  {
    id: "research",
    label: "Research",
    description: "Searches your sources before answering",
  },
  { id: "write", label: "Write", description: "Drafts and edits documents" },
];
const agents = [
  {
    id: "renewal-desk",
    label: "Renewal desk",
    description: "Tracks renewals and drafts follow-ups",
  },
  {
    id: "people-ops",
    label: "People Ops helper",
    description: "Answers policy and onboarding questions",
  },
];
type Persona = { kind: "mode" | "agent"; id: string; label: string };

const models = [
  { id: "gpt", label: "GPT-5.5", efforts: ["Low", "Medium", "High"] },
  {
    id: "claude",
    label: "Claude Sonnet 5",
    efforts: ["Low", "Medium", "High"],
  },
  { id: "gemini", label: "Gemini 3 Flash", efforts: [] as string[] },
  {
    id: "o-legacy",
    label: "Legacy reasoning model",
    efforts: [],
    disabled: true,
    reason: "retired",
  },
];

function PersonaPicker({
  value,
  onChange,
  disabled,
}: {
  value: Persona | null;
  onChange: (persona: Persona | null) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = value?.label ?? "Mode";
  const pick = (next: Persona) => {
    onChange(value?.id === next.id ? null : next);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <InputGroupButton
            size="sm"
            variant="ghost"
            disabled={disabled}
            aria-label={`Mode or agent: ${label}`}
          />
        }
      >
        <Sparkle size={16} aria-hidden="true" />
        <span className="rte-demo-truncate">{label}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent size="menu" side="top" align="start" sideOffset={8}>
        <Command>
          <CommandInput
            aria-label="Search modes and agents"
            placeholder="Search modes and agents…"
          />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Modes">
              {modes.map((mode) => (
                <CommandItem
                  key={mode.id}
                  value={`${mode.label} ${mode.description}`}
                  data-checked={value?.id === mode.id}
                  onSelect={() =>
                    pick({ kind: "mode", id: mode.id, label: mode.label })
                  }
                >
                  <Sparkle size={16} aria-hidden="true" />
                  <span className="rte-demo-nowrap">{mode.label}</span>
                  <span className="rte-demo-option-detail">
                    {mode.description}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Agents">
              {agents.map((agent) => (
                <CommandItem
                  key={agent.id}
                  value={`${agent.label} ${agent.description}`}
                  data-checked={value?.id === agent.id}
                  onSelect={() =>
                    pick({ kind: "agent", id: agent.id, label: agent.label })
                  }
                >
                  <Lightbulb size={16} aria-hidden="true" />
                  <span className="rte-demo-nowrap">{agent.label}</span>
                  <span className="rte-demo-option-detail">
                    {agent.description}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ModelPicker({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState(models[1]!);
  const [effort, setEffort] = useState("Medium");
  const showEffort = model.efforts.length > 0;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <InputGroupButton
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  aria-label={`Model: ${model.label}${showEffort ? `, ${effort} effort` : ""}`}
                />
              }
            />
          }
        >
          <Cpu size={16} aria-hidden="true" />
          <span className="rte-demo-truncate rte-demo-model">
            {model.label}
          </span>
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
                  data-checked={candidate.id === model.id}
                  disabled={"disabled" in candidate}
                  onSelect={() => setModel(candidate)}
                >
                  <Cpu size={16} aria-hidden="true" />
                  <span>
                    {candidate.label}
                    {"reason" in candidate ? ` (${candidate.reason})` : ""}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {showEffort && (
          <div className="rte-demo-effort">
            <span className="rte-demo-option-detail">Effort</span>
            <ToggleGroup
              size="sm"
              variant="outline"
              spacing={0}
              aria-label={`${model.label} effort`}
              value={[effort]}
              onValueChange={(next) => {
                if (next[0]) setEffort(next[0]);
              }}
            >
              {model.efforts.map((level) => (
                <ToggleGroupItem key={level} value={level}>
                  {level}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

const fileChoices = {
  read: {
    title: "Let the assistant read a file",
    detail:
      "Type @ and pick a saved file. The assistant reads it with your message.",
  },
  store: {
    title: "Store a private file",
    detail:
      "Saved for download. This chat doesn’t read it. Up to 5 files, 10 MiB each.",
  },
  knowledge: {
    title: "Add a file to Knowledge",
    detail:
      "Opens Files. Your chats and agents can search Knowledge; other people can’t.",
  },
} as const;

function FileChoices({
  disabled,
  read,
  store,
  knowledge,
}: {
  disabled: boolean;
  read: () => void;
  store: () => void;
  knowledge: () => void;
}) {
  const choice = (key: keyof typeof fileChoices, run: () => void) => (
    <DropdownMenuItem onClick={run}>
      <span className="rte-demo-menu-copy">
        <span>{fileChoices[key].title}</span>
        <span className="rte-demo-option-detail">
          {fileChoices[key].detail}
        </span>
      </span>
    </DropdownMenuItem>
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <InputGroupButton
            size="sm"
            variant="ghost"
            aria-label="Add a file"
            disabled={disabled}
          />
        }
      >
        <Paperclip size={16} aria-hidden="true" />
        <span className="rte-demo-wide-only">Files</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent size="menu" side="top">
        <DropdownMenuGroup>
          <DropdownMenuLabel>What should happen to the file?</DropdownMenuLabel>
          {choice("read", read)}
          {choice("store", store)}
          {choice("knowledge", knowledge)}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const projects = [
  { value: "none", label: "No project" },
  { value: "renewals", label: "Q3 renewals" },
  { value: "hiring", label: "Support hiring" },
];

function ProjectScope({ disabled }: { disabled: boolean }) {
  const [project, setProject] = useState("none");
  return (
    <Select
      value={project}
      disabled={disabled}
      onValueChange={(value) => {
        if (typeof value === "string") setProject(value);
      }}
    >
      <SelectTrigger size="sm" aria-label="Start this chat in">
        <SelectValue>
          {projects.find((item) => item.value === project)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {projects.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const messageLimit = 400;
type Phase = "idle" | "sending" | "replying";

interface ComposerProps {
  label: string;
  compact?: boolean;
  questionPending?: boolean;
  value: RichTextValue;
  onValueChange: (value: RichTextValue) => void;
  attachments: string[];
  onAttachmentsChange: (files: string[]) => void;
  phase: Phase;
  onSend: () => void;
  onStop: () => void;
  readOnly?: boolean;
}

/** A sample chat composer: Cloud's composition of InputGroup, RichTextEditor, and toolbar pickers. */
function ChatComposer({
  label,
  compact = false,
  questionPending = false,
  value,
  onValueChange,
  attachments,
  onAttachmentsChange,
  phase,
  onSend,
  onStop,
  readOnly = false,
}: ComposerProps) {
  const input = useRef<RichTextEditorHandle>(null);
  const form = useRef<HTMLFormElement>(null);
  const errorId = useId();
  const [focused, setFocused] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionState>(null);
  const [panelBelow, setPanelBelow] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [mode, setMode] = useState<"normal" | "plan">("normal");
  const extensions = useChatExtensions(setSuggestion);
  // Compact composers keep mention nodes but drop @ and / triggers.
  const editorExtensions = useMemo(
    () =>
      compact
        ? extensions.filter((extension) => extension.type !== "extension")
        : extensions,
    [compact, extensions],
  );
  const length = textLength(value);
  const validation =
    length > messageLimit
      ? `Shorten your message to ${messageLimit} characters. It has ${length}.`
      : null;
  const canSend = hasContent(value) && !validation;
  const sending = phase === "sending";
  const disabled = readOnly;
  const busy = disabled || sending;
  const condensed =
    !compact && questionPending && !focused && !attachments.length && !canSend;
  const panelOpen = !compact && !!suggestion;
  useLayoutEffect(() => {
    const bounds = form.current?.getBoundingClientRect();
    // A composer near the top of a short screen has no room above it, so suggestions open below.
    if (panelOpen && bounds)
      setPanelBelow(
        bounds.top < 320 && window.innerHeight - bounds.bottom > bounds.top,
      );
  }, [panelOpen]);
  const send = () => {
    if (canSend && !busy) onSend();
  };
  const placeholder = questionPending
    ? "Send a separate message…"
    : persona?.kind === "agent"
      ? `Ask ${persona.label} anything…`
      : "Ask anything…";

  return (
    <form
      ref={form}
      className="rte-demo-composer"
      aria-label={label}
      data-condensed={condensed || undefined}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <InputGroup variant={questionPending ? "question-composer" : "composer"}>
        {attachments.length > 0 && (
          <InputGroupAddon align="block-start">
            {attachments.map((file) => (
              <span key={file} className="rte-demo-chip">
                <FileText size={14} aria-hidden="true" />
                <span className="rte-demo-truncate">{file}</span>
                <InputGroupButton
                  size="icon-xs"
                  aria-label={`Remove ${file}`}
                  disabled={busy}
                  onClick={() =>
                    onAttachmentsChange(
                      attachments.filter((name) => name !== file),
                    )
                  }
                >
                  <X aria-hidden="true" />
                </InputGroupButton>
              </span>
            ))}
          </InputGroupAddon>
        )}
        <RichTextEditor
          key={compact ? "compact" : "full"}
          ref={input}
          size={compact ? "compact" : "default"}
          condensed={condensed}
          placeholder={placeholder}
          value={value}
          disabled={busy}
          ariaInvalid={!!validation}
          ariaDescribedBy={validation ? errorId : undefined}
          ariaExpanded={panelOpen}
          ariaControls={
            compact || !suggestion ? undefined : `${suggestion.key}-suggestions`
          }
          ariaActiveDescendant={
            compact || !suggestion?.items.length
              ? undefined
              : `${suggestion.key}-option-${suggestion.active}`
          }
          extensions={editorExtensions}
          onChange={onValueChange}
          onSend={send}
          toolbarAddon={
            <>
              {!compact && !condensed && (
                <>
                  <FileChoices
                    disabled={busy}
                    read={() =>
                      input.current
                        ?.editor()
                        ?.chain()
                        .focus()
                        .insertContent("@")
                        .run()
                    }
                    store={() =>
                      onAttachmentsChange([
                        ...new Set([...attachments, "pricing-2026.pdf"]),
                      ])
                    }
                    knowledge={() =>
                      onAttachmentsChange([
                        ...new Set([...attachments, "brand-guide.pdf"]),
                      ])
                    }
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <InputGroupButton
                          size="sm"
                          variant="ghost"
                          aria-label="Use a skill"
                          disabled={busy}
                          onClick={() =>
                            input.current
                              ?.editor()
                              ?.chain()
                              .focus()
                              .insertContent("/")
                              .run()
                          }
                        />
                      }
                    >
                      <BookOpen size={16} aria-hidden="true" />
                      <span className="rte-demo-wide-only">Skills</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Skills are saved procedures the agent follows · /
                    </TooltipContent>
                  </Tooltip>
                  <ProjectScope disabled={busy} />
                  <Select
                    value={mode}
                    disabled={busy}
                    onValueChange={(next) => {
                      if (next === "normal" || next === "plan") setMode(next);
                    }}
                  >
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <SelectTrigger size="sm" aria-label="Chat mode" />
                        }
                      >
                        <SelectValue>
                          {mode === "plan" ? "Plan" : "Normal"}
                        </SelectValue>
                      </TooltipTrigger>
                      <TooltipContent>
                        Normal acts on your request. Plan only proposes steps
                        first.
                      </TooltipContent>
                    </Tooltip>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="plan">Plan only</SelectItem>
                    </SelectContent>
                  </Select>
                  <PersonaPicker
                    value={persona}
                    onChange={setPersona}
                    disabled={busy}
                  />
                </>
              )}
              <div className="rte-demo-toolbar-end">
                {!compact && !condensed && <ModelPicker disabled={busy} />}
                {phase === "replying" ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <InputGroupButton
                          size="icon-sm"
                          variant="default"
                          aria-label="Stop reply"
                          disabled={disabled}
                          onClick={onStop}
                        />
                      }
                    >
                      <Stop3 size={16} aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent>Stop reply</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <InputGroupButton
                          type="submit"
                          size="icon-sm"
                          variant={canSend ? "default" : "secondary"}
                          aria-label="Send message"
                          aria-busy={sending}
                          disabled={busy || !canSend}
                        />
                      }
                    >
                      <ArrowUp size={16} aria-hidden="true" />
                    </TooltipTrigger>
                    <TooltipContent>Send · Enter</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </>
          }
        />
      </InputGroup>
      {panelOpen && suggestion && (
        <div
          className={
            panelBelow
              ? "rte-demo-panel rte-demo-panel-below"
              : "rte-demo-panel"
          }
        >
          <SuggestionPanel state={suggestion} />
        </div>
      )}
      {validation && (
        <p id={errorId} role="alert" className="rte-demo-danger">
          {validation}
        </p>
      )}
    </form>
  );
}

function useConversation(initial: RichTextValue, initialFiles: string[] = []) {
  const [value, setValue] = useState<RichTextValue>(initial);
  const [attachments, setAttachments] = useState<string[]>(initialFiles);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("Nothing has been sent.");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const send = () => {
    if (phase !== "idle") return;
    setPhase("sending");
    setStatus("Sending…");
    timers.current = [
      setTimeout(() => {
        setValue(emptyDoc());
        setAttachments([]);
        setPhase("replying");
        setStatus("The agent is replying. Stop ends the reply.");
      }, 700),
      setTimeout(() => {
        setPhase("idle");
        setStatus("Reply finished. Nothing left this page.");
      }, 4000),
    ];
  };
  const stop = () => {
    timers.current.forEach(clearTimeout);
    setPhase("idle");
    setStatus("Reply stopped.");
  };
  return {
    value,
    setValue,
    attachments,
    setAttachments,
    phase,
    status,
    send,
    stop,
  };
}

export function RichTextEditorComposer() {
  const chat = useConversation(emptyDoc(), ["Q3-forecast.xlsx"]);
  return (
    <Example
      title="Chat composer"
      description="Inside a composer InputGroup, the editor drives the group's focus and invalid states, and toolbarAddon becomes the toolbar row. Type @ for saved files or / for skills: Up and Down choose, Enter picks, Escape closes. Over 400 characters shows an error."
    >
      <div className="rte-demo-sample" data-testid="composer">
        <ol className="rte-demo-transcript" aria-label="Sample conversation">
          <li data-role="user">
            Pull the Q3 numbers for Northwind and Contoso.
          </li>
          <li data-role="agent">
            Northwind grew 14% and Contoso held flat. Want a renewal summary for
            each?
          </li>
        </ol>
        <ChatComposer
          label="Message composer"
          value={chat.value}
          onValueChange={chat.setValue}
          attachments={chat.attachments}
          onAttachmentsChange={chat.setAttachments}
          phase={chat.phase}
          onSend={chat.send}
          onStop={chat.stop}
        />
        <p role="status" className="rte-demo-note">
          {chat.status}
        </p>
      </div>
    </Example>
  );
}

export function RichTextEditorCompactComposer() {
  const chat = useConversation(
    doc({
      type: "paragraph",
      content: [
        { type: "text", text: "Compare " },
        {
          type: "reference",
          attrs: { kind: "file", label: "Q3-forecast.xlsx" },
        },
        { type: "text", text: " with last quarter" },
      ],
    }),
  );
  return (
    <Example
      title="Compact composer"
      description="Side panels use size compact: one 40px row with 14px text and only the send or stop button inline. Saved file chips still render, but @ and / suggestions are off."
    >
      <div
        className="rte-demo-sample rte-demo-side"
        data-testid="compact-composer"
      >
        <ChatComposer
          label="Side panel composer"
          compact
          value={chat.value}
          onValueChange={chat.setValue}
          attachments={chat.attachments}
          onAttachmentsChange={chat.setAttachments}
          phase={chat.phase}
          onSend={chat.send}
          onStop={chat.stop}
        />
        <p role="status" className="rte-demo-note">
          {chat.status}
        </p>
      </div>
    </Example>
  );
}

export function RichTextEditorQuestionComposer() {
  const chat = useConversation(emptyDoc());
  const [pending, setPending] = useState(true);
  const read = useConversation(emptyDoc());
  return (
    <Example
      title="Question composer and read-only"
      description="While an agent waits on a question, an empty composer condenses to one row with only send. Focus it and the full toolbar returns. A read-only chat disables the editor and every toolbar control."
    >
      <div className="rte-demo-stack">
        <div className="rte-demo-sample" data-testid="question-composer">
          <div className="rte-demo-question">
            <p>
              <Lightbulb size={14} aria-hidden="true" />
              The agent asked: Which region should the Q3 report cover?
            </p>
            <Label className="rte-demo-switch">
              <Switch
                size="sm"
                checked={pending}
                onCheckedChange={setPending}
              />
              Question waiting
            </Label>
          </div>
          <ChatComposer
            label="Separate message composer"
            questionPending={pending}
            value={chat.value}
            onValueChange={chat.setValue}
            attachments={chat.attachments}
            onAttachmentsChange={chat.setAttachments}
            phase={chat.phase}
            onSend={chat.send}
            onStop={chat.stop}
          />
          <p role="status" className="rte-demo-note">
            {chat.status}
          </p>
        </div>
        <div className="rte-demo-sample" data-testid="read-only">
          <ChatComposer
            label="Read-only composer"
            readOnly
            value={read.value}
            onValueChange={read.setValue}
            attachments={read.attachments}
            onAttachmentsChange={read.setAttachments}
            phase={read.phase}
            onSend={read.send}
            onStop={read.stop}
          />
          <p className="rte-demo-note">
            This chat is read-only. composer · disabled
          </p>
        </div>
      </div>
    </Example>
  );
}

export default function RichTextEditorDemo() {
  return (
    <TooltipProvider>
      <div id="rich-text-editor-demo" className="rte-demo">
        <RichTextEditorSizes />
        <RichTextEditorFormatting />
        <RichTextEditorComposer />
        <RichTextEditorCompactComposer />
        <RichTextEditorQuestionComposer />
      </div>
    </TooltipProvider>
  );
}
