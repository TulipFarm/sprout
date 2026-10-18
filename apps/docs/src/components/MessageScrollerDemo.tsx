import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@tulipfarm/sprout/alert";
import { Button } from "@tulipfarm/sprout/button";
import { Input } from "@tulipfarm/sprout/input";
import {
  Message,
  MessageBubble,
  MessageContent,
} from "@tulipfarm/sprout/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
  type MessageScrollerDefaultScrollPosition,
  type MessageScrollerScrollAlign,
} from "@tulipfarm/sprout/message-scroller";
import { Skeleton, SkeletonGroup } from "@tulipfarm/sprout/skeleton";
import { Switch } from "@tulipfarm/sprout/switch";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import { ArrowDown } from "reicon-react/icons/ArrowDown";
import "../styles/message-scroller-demo.css";

function Frame({
  id,
  title,
  note,
  controls,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="msc-demo-frame" aria-label={title} data-recipe={id}>
      <div className="msc-demo-bar">
        <div className="msc-demo-bar-text">
          <span className="msc-demo-bar-title">{title}</span>
          {note && <span className="msc-demo-note">{note}</span>}
        </div>
        {controls && <div className="msc-demo-controls">{controls}</div>}
      </div>
      <div className="msc-demo-body">{children}</div>
    </section>
  );
}

function Segmented<Value extends string>({
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
    <ToggleGroup
      aria-label={label}
      size="sm"
      variant="outline"
      value={[value]}
      onValueChange={(next) => {
        const picked = items.find((item) => item.value === next[0]);
        if (picked) onChange(picked.value);
      }}
    >
      {items.map((item) => (
        <ToggleGroupItem key={item.value} value={item.value}>
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="msc-demo-switch">
      <Switch
        size="sm"
        aria-label={label}
        checked={checked}
        onCheckedChange={onChange}
      />
      {label}
    </label>
  );
}

/* Sample data ---------------------------------------------------------------- */

type Author = "human" | "assistant";
interface Turn {
  id: string;
  author: Author;
  text: string;
}

const script: readonly [Author, string][] = [
  ["human", "Which March orders are missing from the warehouse export?"],
  [
    "assistant",
    "Three of the 1,284 March orders are missing: SO-1042, SO-1077, and SO-1103.",
  ],
  ["human", "Why weren’t they exported?"],
  [
    "assistant",
    "All three were created on March 28, after the 6 pm export had already run.",
  ],
  ["human", "Will they show up in the April file?"],
  [
    "assistant",
    "Yes. The April 1 export picks up anything created since the last run.",
  ],
  ["human", "Can you draft a note to Robin about it?"],
  [
    "assistant",
    "Draft: “Hi Robin — SO-1042, SO-1077, and SO-1103 missed the March export. They’ll be in April’s file.”",
  ],
  ["human", "Add the order totals."],
  [
    "assistant",
    "Updated: Northwind $2,140, Meadow Supply $860, Alder & Co $1,315 — $4,315 in total.",
  ],
  ["human", "Who owns the warehouse export job?"],
  [
    "assistant",
    "Jordan Lee on the Ops team. Want me to open the job settings?",
  ],
];

const extra: readonly [Author, string][] = [
  ["human", "Not yet. Remind me on Monday."],
  ["assistant", "Done. I’ll remind you at 9:00 am on Monday."],
  ["human", "Also check February for the same problem."],
  [
    "assistant",
    "February is clean: all 1,102 orders are in the warehouse export.",
  ],
];

const turns = (
  lines: readonly [Author, string][],
  prefix = "m",
  from = 0,
): Turn[] =>
  lines.map(([author, text], index) => ({
    id: `${prefix}${from + index + 1}`,
    author,
    text,
  }));

const earlier: readonly [Author, string][] = [
  ["human", "Pull the March order count from the store."],
  ["assistant", "March has 1,284 orders across 3 sales channels."],
  ["human", "And the warehouse export?"],
  ["assistant", "The warehouse export lists 1,281 March orders."],
];

const longReply = `Here’s the full reconciliation. I matched every March order by order number, then by customer and total for the 12 orders whose numbers were re-issued. 1,281 orders match exactly. The three that don’t — SO-1042 (Northwind, $2,140), SO-1077 (Meadow Supply, $860), and SO-1103 (Alder & Co, $1,315) — were all created on March 28 between 6:12 pm and 7:40 pm, after the export job ran at 6:00 pm. None were cancelled or refunded. The April 1 export will include them, so no manual fix is needed. If you want them in the March file anyway, re-run the export for March 28 from the job settings; it takes about two minutes and replaces the existing file. Totals still reconcile: the store reports $412,880 in March revenue and the export reports $408,565, a difference of $4,315 — exactly the three missing orders. Shipping and tax match to the cent once those orders are excluded. Two refunds issued on March 30 (SO-0988 and SO-1011) appear in both files with the same negative totals, so they don’t affect the gap. To stop this happening again, move the export to 11:30 pm, or add a second run at midnight that only picks up orders created after 6:00 pm. Jordan Lee owns the job and can approve either change; the second run is the safer option because it leaves the current file times unchanged for the warehouse team.`;

function Turn({ turn }: { turn: Pick<Turn, "author" | "text"> }) {
  const human = turn.author === "human";
  return (
    <div className="msc-demo-turn">
      <Message align={human ? "end" : "start"}>
        <MessageContent>
          <MessageBubble variant={human ? "default" : "secondary"}>
            {turn.text}
          </MessageBubble>
        </MessageContent>
      </Message>
    </div>
  );
}

function History({
  items,
  anchorHumans = true,
}: {
  items: Turn[];
  anchorHumans?: boolean;
}) {
  const lastHuman = anchorHumans
    ? items.reduce(
        (last, turn, index) => (turn.author === "human" ? index : last),
        -1,
      )
    : -1;
  return items.map((turn, index) => (
    <MessageScrollerItem
      key={turn.id}
      messageId={turn.id}
      scrollAnchor={index === lastHuman}
    >
      <Turn turn={turn} />
    </MessageScrollerItem>
  ));
}

/* Conversation: the Cloud composition --------------------------------------- */

export function MessageScrollerConversation() {
  const [count, setCount] = useState(script.length);
  const all = [...script, ...extra];
  const items = turns(all.slice(0, Math.min(count, all.length)));
  const full = count >= all.length;
  return (
    <Frame
      id="conversation"
      title="Conversation"
      note="Each added message is pinned under the top edge, with a peek of the one before."
      controls={
        <Button
          variant="outline"
          size="sm"
          disabled={full}
          onClick={() => setCount(count + 1)}
        >
          {full ? "No more messages" : "Add message"}
        </Button>
      }
    >
      <div className="msc-demo-window" data-testid="conversation">
        <MessageScrollerProvider>
          <MessageScroller>
            <MessageScrollerViewport aria-label="Conversation history">
              <MessageScrollerContent className="msc-demo-content">
                {items.map((turn, index) => (
                  <MessageScrollerItem
                    key={turn.id}
                    messageId={turn.id}
                    scrollAnchor={index === items.length - 1}
                  >
                    <Turn turn={turn} />
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton aria-label="Scroll to newest message" />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>
    </Frame>
  );
}

/* Streaming with autoScroll -------------------------------------------------- */

const streamedReply =
  "I checked the warehouse export job. It runs daily at 6:00 pm, so orders created later in the day wait for the next run. To catch late orders, move the run to 11:30 pm or add a second run. Moving it is one change in the job settings, and Jordan can approve it.";

export function MessageScrollerStreaming() {
  const [items, setItems] = useState<Turn[]>(() => turns(script.slice(0, 6)));
  const [follow, setFollow] = useState(true);
  const [draft, setDraft] = useState("Why does the export run so early?");
  const [streaming, setStreaming] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);

  function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || streaming) return;
    const id = items.length;
    const reply = { id: `s${id + 2}`, author: "assistant" as const, text: "" };
    setItems((current) => [
      ...current,
      { id: `s${id + 1}`, author: "human", text },
      reply,
    ]);
    setDraft("");
    setStreaming(true);
    const words = streamedReply.split(" ");
    let shown = 0;
    timer.current = window.setInterval(() => {
      shown += 2;
      const text = words.slice(0, shown).join(" ");
      setItems((current) =>
        current.map((turn) =>
          turn.id === reply.id ? { ...turn, text } : turn,
        ),
      );
      if (shown >= words.length) {
        window.clearInterval(timer.current);
        setStreaming(false);
      }
    }, 70);
  }

  return (
    <Frame
      id="streaming"
      title="Streaming reply"
      note="With autoScroll, the history follows the reply while you stay at the end. Scroll up to stop following."
      controls={
        <Toggle label="Follow replies" checked={follow} onChange={setFollow} />
      }
    >
      <MessageScrollerProvider autoScroll={follow}>
        <div className="msc-demo-window" data-testid="streaming">
          <MessageScroller>
            <MessageScrollerViewport aria-label="Streaming conversation">
              <MessageScrollerContent className="msc-demo-content">
                {items.map((turn, index) => (
                  <MessageScrollerItem
                    key={turn.id}
                    messageId={turn.id}
                    scrollAnchor={
                      turn.author === "human" && index >= items.length - 2
                    }
                  >
                    {turn.text ? (
                      <Turn turn={turn} />
                    ) : (
                      <div className="msc-demo-turn">
                        <p className="msc-demo-thinking" role="status">
                          Thinking…
                        </p>
                      </div>
                    )}
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton aria-label="Scroll to newest message" />
          </MessageScroller>
        </div>
        <form className="msc-demo-composer" onSubmit={send}>
          <Input
            aria-label="Message"
            placeholder="Ask about the export"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" disabled={!draft.trim() || streaming}>
            {streaming ? "Replying…" : "Send"}
          </Button>
        </form>
      </MessageScrollerProvider>
    </Frame>
  );
}

/* Navigation hooks ----------------------------------------------------------- */

function NavigationControls({
  align,
  ids,
}: {
  align: MessageScrollerScrollAlign;
  ids: string[];
}) {
  const { scrollToMessage, scrollToStart, scrollToEnd } = useMessageScroller();
  const edges = useMessageScrollerScrollable();
  const { visibleMessageIds, currentAnchorId } = useMessageScrollerVisibility();
  const middle = ids[Math.floor(ids.length / 2)]!;
  return (
    <div className="msc-demo-nav">
      <div className="msc-demo-actions" role="group" aria-label="Jump to">
        <Button
          variant="outline"
          size="sm"
          onClick={() => scrollToStart({ behavior: "smooth" })}
        >
          First message
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scrollToMessage(middle, { align, behavior: "smooth" })}
        >
          Draft to Robin
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scrollToEnd({ behavior: "smooth" })}
        >
          Latest reply
        </Button>
      </div>
      <dl className="msc-demo-readout" data-testid="navigation-readout">
        <div>
          <dt>More above</dt>
          <dd data-testid="edge-start">{edges.start ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>More below</dt>
          <dd data-testid="edge-end">{edges.end ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>In view</dt>
          <dd data-testid="visible-ids">
            {visibleMessageIds.join(", ") || "None"}
          </dd>
        </div>
        <div>
          <dt>Pinned turn</dt>
          <dd data-testid="anchor-id">{currentAnchorId ?? "None"}</dd>
        </div>
      </dl>
    </div>
  );
}

export function MessageScrollerNavigation() {
  const [align, setAlign] = useState<MessageScrollerScrollAlign>("start");
  const items = turns(script);
  return (
    <Frame
      id="navigation"
      title="Jump and read position"
      note="useMessageScroller moves the history; the other hooks report edges and which messages are in view."
      controls={
        <Segmented
          label="Align"
          value={align}
          items={[
            { value: "start", label: "Start" },
            { value: "center", label: "Center" },
            { value: "end", label: "End" },
            { value: "nearest", label: "Nearest" },
          ]}
          onChange={setAlign}
        />
      }
    >
      <MessageScrollerProvider defaultScrollPosition="end">
        <NavigationControls align={align} ids={items.map((turn) => turn.id)} />
        <div className="msc-demo-window" data-testid="navigation">
          <MessageScroller>
            <MessageScrollerViewport aria-label="Order thread">
              <MessageScrollerContent className="msc-demo-content">
                <History items={items} />
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton
              direction="start"
              aria-label="Scroll to first message"
            />
            <MessageScrollerButton
              direction="end"
              aria-label="Scroll to newest message"
            />
          </MessageScroller>
        </div>
      </MessageScrollerProvider>
    </Frame>
  );
}

/* Opening position ----------------------------------------------------------- */

export function MessageScrollerOpening() {
  const [position, setPosition] =
    useState<MessageScrollerDefaultScrollPosition>("last-anchor");
  const items: Turn[] = [
    ...turns(script.slice(0, 4)),
    {
      id: "m5",
      author: "human",
      text: "Walk me through the whole reconciliation.",
    },
    { id: "m6", author: "assistant", text: longReply },
  ];
  return (
    <Frame
      id="opening"
      title="Opening position"
      note="Where a saved conversation opens. last-anchor pins the newest question so a long answer reads from its start."
      controls={
        <Segmented
          label="Opens at"
          value={position}
          items={[
            { value: "last-anchor", label: "Last anchor" },
            { value: "end", label: "End" },
            { value: "start", label: "Start" },
          ]}
          onChange={setPosition}
        />
      }
    >
      <div className="msc-demo-window" data-testid="opening">
        <MessageScrollerProvider
          key={position}
          defaultScrollPosition={position}
        >
          <MessageScroller>
            <MessageScrollerViewport aria-label="Saved conversation">
              <MessageScrollerContent className="msc-demo-content">
                <History items={items} />
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton
              direction="start"
              aria-label="Scroll to first message"
            />
            <MessageScrollerButton aria-label="Scroll to newest message" />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>
    </Frame>
  );
}

/* Button pairings ------------------------------------------------------------ */

const pairings = [
  {
    id: "secondary-icon-sm",
    title: "secondary · icon-sm",
    note: "Default: a floating surface icon button.",
    button: <MessageScrollerButton aria-label="Scroll to newest message" />,
  },
  {
    id: "outline-sm",
    title: "outline · sm",
    note: "A labeled pill for unread replies.",
    button: (
      <MessageScrollerButton variant="outline" size="sm">
        <ArrowDown aria-hidden="true" />
        New replies
      </MessageScrollerButton>
    ),
  },
  {
    id: "default-icon",
    title: "default · icon",
    note: "A primary fill on a busy history.",
    button: (
      <MessageScrollerButton
        variant="default"
        size="icon"
        aria-label="Scroll to newest message"
      />
    ),
  },
] as const;

export function MessageScrollerButtons() {
  return (
    <Frame
      id="buttons"
      title="Jump button pairings"
      note="variant and size pass to Button. Each history opens at the start, so the button shows."
    >
      <div className="msc-demo-grid">
        {pairings.map((pairing) => (
          <figure
            key={pairing.id}
            className="msc-demo-pairing"
            data-pairing={pairing.id}
          >
            <figcaption>
              <code>{pairing.title}</code>
              <span>{pairing.note}</span>
            </figcaption>
            <div className="msc-demo-window msc-demo-window-sm">
              <MessageScrollerProvider defaultScrollPosition="start">
                <MessageScroller>
                  <MessageScrollerViewport
                    aria-label={`History with ${pairing.title} button`}
                  >
                    <MessageScrollerContent className="msc-demo-content">
                      <History
                        items={turns(script.slice(0, 6), pairing.id)}
                        anchorHumans={false}
                      />
                    </MessageScrollerContent>
                  </MessageScrollerViewport>
                  {pairing.button}
                </MessageScroller>
              </MessageScrollerProvider>
            </div>
          </figure>
        ))}
      </div>
    </Frame>
  );
}

/* Prepending older messages -------------------------------------------------- */

export function MessageScrollerHistory() {
  const [loaded, setLoaded] = useState(false);
  const [keepPlace, setKeepPlace] = useState(true);
  const items = [
    ...(loaded ? turns(earlier, "e") : []),
    ...turns(script.slice(4), "m", 4),
  ];
  return (
    <Frame
      id="history"
      title="Loading earlier messages"
      note="preserveScrollOnPrepend keeps the message you are reading still when older ones load above it."
      controls={
        <>
          <Toggle
            label="Keep place"
            checked={keepPlace}
            onChange={setKeepPlace}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLoaded(!loaded)}
          >
            {loaded ? "Reset" : "Load earlier messages"}
          </Button>
        </>
      }
    >
      <div className="msc-demo-window" data-testid="history">
        <MessageScrollerProvider>
          <MessageScroller>
            <MessageScrollerViewport
              aria-label="Paged conversation"
              preserveScrollOnPrepend={keepPlace}
            >
              <MessageScrollerContent className="msc-demo-content">
                <History items={items} anchorHumans={false} />
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton
              direction="start"
              aria-label="Scroll to first message"
            />
            <MessageScrollerButton aria-label="Scroll to newest message" />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>
    </Frame>
  );
}

/* States --------------------------------------------------------------------- */

type LoadState = "ready" | "empty" | "loading" | "error";

export function MessageScrollerStates() {
  const [state, setState] = useState<LoadState>("loading");
  return (
    <Frame
      id="states"
      title="Empty, loading, and error"
      note="The scroller keeps its frame; what goes in the content column changes."
      controls={
        <Segmented
          label="State"
          value={state}
          items={[
            { value: "ready", label: "Ready" },
            { value: "empty", label: "Empty" },
            { value: "loading", label: "Loading" },
            { value: "error", label: "Error" },
          ]}
          onChange={setState}
        />
      }
    >
      <div className="msc-demo-window" data-testid="states" data-state={state}>
        <MessageScrollerProvider>
          <MessageScroller>
            <MessageScrollerViewport
              aria-label="Conversation"
              aria-busy={state === "loading" || undefined}
            >
              <MessageScrollerContent className="msc-demo-content">
                {state === "ready" && (
                  <History items={turns(script.slice(0, 8))} />
                )}
                {state === "empty" && (
                  <div className="msc-demo-empty">
                    <p className="msc-demo-empty-title">No messages yet</p>
                    <p>
                      Ask about an order, a customer, or an export to start.
                    </p>
                  </div>
                )}
                {state === "loading" && (
                  <SkeletonGroup
                    label="Loading conversation"
                    gap="lg"
                    className="msc-demo-skeleton"
                  >
                    <Skeleton className="msc-demo-skeleton-end" />
                    <Skeleton
                      shape="panel"
                      className="msc-demo-skeleton-start"
                    />
                    <Skeleton className="msc-demo-skeleton-end" />
                    <Skeleton
                      shape="panel"
                      className="msc-demo-skeleton-start"
                    />
                  </SkeletonGroup>
                )}
                {state === "error" && (
                  <div className="msc-demo-states-error">
                    <Alert variant="destructive">
                      <AlertTitle>Couldn’t load this conversation</AlertTitle>
                      <AlertDescription>
                        The connection dropped while loading 12 messages.
                      </AlertDescription>
                      <AlertAction>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setState("ready")}
                        >
                          Try again
                        </Button>
                      </AlertAction>
                    </Alert>
                  </div>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton aria-label="Scroll to newest message" />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>
    </Frame>
  );
}
