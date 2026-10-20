import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check } from 'reicon-react/icons/Check';
import { Copy } from 'reicon-react/icons/Copy';
import { Alert, AlertDescription } from '@tulipfarm/sprout/alert';
import { Button } from '@tulipfarm/sprout/button';
import { FileRenderersProvider, ViewableFileContent, type ViewableFile } from '@tulipfarm/sprout/file-viewer';
import {
  MessageResponse,
  MessageTableViewport,
  type MessageResponseRenderLink,
} from '@tulipfarm/sprout/message-response';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@tulipfarm/sprout/popover';
import { Spinner } from '@tulipfarm/sprout/spinner';
import { Switch } from '@tulipfarm/sprout/switch';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import DocsSelect from './DocsSelect';
import '../styles/message-response-demo.css';

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
    <section className="mr-demo-frame" aria-label={title} data-recipe={id}>
      <div className="mr-demo-bar">
        <div className="mr-demo-bar-text">
          <span className="mr-demo-bar-title">{title}</span>
          {note && <span className="mr-demo-note">{note}</span>}
        </div>
        {controls && <div className="mr-demo-controls">{controls}</div>}
      </div>
      <div className="mr-demo-body">{children}</div>
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
      onValueChange={next => {
        const picked = items.find(item => item.value === next[0]);
        if (picked) onChange(picked.value);
      }}
    >
      {items.map(item => (
        <ToggleGroupItem key={item.value} value={item.value}>
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/* Sample replies ------------------------------------------------------------- */

const gardenPlan = `### Garden plan

A **small plan** for the fictional Meadow project.

- Choose a sunny patch
- Plant bulbs in groups
- Water after planting

> Start with a single bed.

| Task | Owner |
| --- | --- |
| Plant | Alex |
| Water | Robin |

Visit [the sample notes](#sample-notes) for details.`;

const pipeline = `## Pipeline this week

Three deals moved forward and one stalled. **Northwind** is the largest open deal at **$48,000**.

1. Northwind asked for a security review before Friday.
2. Blue Harbor signed the order form.
3. Fennel & Co. has not replied in 9 days.

| Company | Stage | Value | Owner | Next step | Last touch |
| --- | --- | ---: | --- | --- | --- |
| Northwind Traders | Security review | $48,000 | Priya Shah | Send SOC 2 report | Today |
| Blue Harbor | Closed won | $21,500 | Marco Diaz | Kickoff call | Yesterday |
| Fennel & Co. | Proposal | $12,000 | Priya Shah | Follow-up email | 9 days ago |
| Lumen Labs | Discovery | $8,400 | Ada Okafor | Book a demo | 3 days ago |
| Orchard Supply | Proposal | $16,750 | Marco Diaz | Pricing call | 2 days ago |
| Kestrel Health | Discovery | $30,000 | Ada Okafor | Intro meeting | 5 days ago |

I can draft the follow-up to Fennel & Co. if you want.`;

const sqlAnswer = `The \`orders\` table has **1,284** rows from last month. This query groups them by region:

\`\`\`sql
SELECT region, count(*) AS orders, sum(total) AS revenue
FROM orders
WHERE created_at >= date_trunc('month', now()) - interval '1 month'
GROUP BY region
ORDER BY revenue DESC;
\`\`\`

West leads with **$212,400**. Run it again after the import finishes at 6 PM.`;

const replies = {
  garden: { label: 'Garden plan', text: gardenPlan },
  pipeline: { label: 'Weekly pipeline', text: pipeline },
  sql: { label: 'SQL answer', text: sqlAnswer },
} as const;
type ReplyKey = keyof typeof replies;

/* Playground ------------------------------------------------------------------ */

export function MessageResponsePlayground() {
  const [reply, setReply] = useState<ReplyKey>('pipeline');
  const [streaming, setStreaming] = useState(false);
  const [bounded, setBounded] = useState(false);
  return (
    <Frame
      id="playground"
      title="Playground"
      note="Every prop: Markdown text, streaming, and the table viewport."
      controls={
        <>
          <DocsSelect
            label="Reply"
            value={reply}
            items={Object.entries(replies).map(([value, item]) => ({
              value: value as ReplyKey,
              label: item.label,
            }))}
            onValueChange={setReply}
          />
          <label className="mr-demo-switch">
            <Switch size="sm" aria-label="Streaming" checked={streaming} onCheckedChange={setStreaming} />
            Streaming
          </label>
          <label className="mr-demo-switch">
            <Switch size="sm" aria-label="Bounded tables" checked={bounded} onCheckedChange={setBounded} />
            Bounded tables
          </label>
        </>
      }
    >
      <div className="mr-demo-bubble" data-testid="playground-response">
        <MessageTableViewport bounded={bounded}>
          <MessageResponse streaming={streaming}>{replies[reply].text}</MessageResponse>
        </MessageTableViewport>
      </div>
    </Frame>
  );
}

/* Every Markdown feature --------------------------------------------------------- */

const everything = `# Launch checklist

## Before Friday

### Content

#### Owners

Ship the **spring catalog** with *new photos*, and ~~skip the old banner~~. Ask \`@robin\` for the final copy.

- Photos
  - Hero shot
  - Six product shots
- Copy review
- Price check

1. Freeze the catalog
2. Publish to the store
3. Email the list

- [x] Draft the announcement
- [ ] Schedule the email

> Customers saw the old prices for two hours last launch. Check them twice.

---

| Item | Status | Price |
| :--- | :---: | ---: |
| Tulip bulbs, mixed | Ready | $14.00 |
| Watering can, 5 L | Waiting for photo | $22.50 |

\`\`\`ts
export const launch = { date: "2026-03-20", channel: "email" } as const;
\`\`\`

\`\`\`
Plain fence: no language, shown as text.
\`\`\`

Details live at https://example.com/spring-launch and in [the brief](https://example.com/brief).

<b>HTML tags are dropped; their words stay.</b> ![Images are not shown](https://example.com/hero.png)`;

export function MessageResponseMarkdown() {
  return (
    <Frame
      id="markdown"
      title="Every Markdown feature"
      note="Headings, emphasis, lists, task lists, quotes, rules, aligned tables, fences, and links."
    >
      <div className="mr-demo-bubble" data-testid="markdown-response">
        <MessageResponse>{everything}</MessageResponse>
      </div>
    </Frame>
  );
}

/* Streaming ------------------------------------------------------------------- */

const streamed = `Here is a **partially streamed** response for the Meadow beds.

| Task | Status |
| --- | --- |
| Plant bulbs | Ready |
| Mulch beds | Next week |

Water within an hour of planting.`;

type StreamState = 'waiting' | 'streaming' | 'done';
const streamPoint = streamed.indexOf('| Mulch');

export function MessageResponseStreaming() {
  const [state, setState] = useState<StreamState>('streaming');
  const [length, setLength] = useState(streamPoint);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);

  const show = (next: StreamState) => {
    clearInterval(timer.current);
    setState(next);
    setLength(next === 'waiting' ? 0 : next === 'streaming' ? streamPoint : streamed.length);
  };
  const replay = () => {
    show('waiting');
    let at = 0;
    timer.current = setInterval(() => {
      at = Math.min(streamed.length, at + 6);
      setLength(at);
      setState(at === streamed.length ? 'done' : 'streaming');
      if (at === streamed.length) clearInterval(timer.current);
    }, 50);
  };

  return (
    <Frame
      id="streaming"
      title="Streaming"
      note="A caret follows the text and the region is busy until the reply ends."
      controls={
        <>
          <Segmented
            label="Stream state"
            value={state}
            items={[
              { value: 'waiting', label: 'Waiting' },
              { value: 'streaming', label: 'Streaming' },
              { value: 'done', label: 'Done' },
            ]}
            onChange={show}
          />
          <Button variant="outline" size="sm" onClick={replay}>
            Replay
          </Button>
        </>
      }
    >
      <div className="mr-demo-bubble" data-testid="streaming-response">
        <MessageTableViewport bounded>
          <MessageResponse streaming={state !== 'done'}>{streamed.slice(0, length)}</MessageResponse>
        </MessageTableViewport>
      </div>
    </Frame>
  );
}

/* Table viewport (records canvas) ---------------------------------------------------- */

const leads = Array.from({ length: 12 }, (_, index) => {
  const names = ['Northwind', 'Blue Harbor', 'Fennel & Co.', 'Lumen Labs', 'Orchard Supply', 'Kestrel Health'];
  const stages = ['Discovery', 'Proposal', 'Security review', 'Closed won'];
  return `| ${names[index % names.length]} ${index >= names.length ? 'EU' : 'US'} | ${stages[index % stages.length]} | $${(8 + index * 3.5).toFixed(1)}k |`;
}).join('\n');
const leadsReply = `I found **12 leads** that match “opened a pricing email this week”.

| Company | Stage | Value |
| --- | --- | ---: |
${leads}

The full rows are open in the canvas.`;

function RowViewChip({ table, rows }: { table: string; rows: number }) {
  return (
    <div className="mr-demo-row-view">
      <span className="mr-demo-row-view-name">{table}</span>
      <span className="mr-demo-row-view-count">{rows} rows · open in canvas</span>
    </div>
  );
}

export function MessageResponseTables() {
  return (
    <div className="mr-demo-split">
      <Frame id="bounded" title="With row views" note="bounded: tables stop at 12rem and scroll both ways.">
        <div className="mr-demo-stack">
          <div className="mr-demo-bubble" data-testid="bounded-response">
            <MessageTableViewport bounded>
              <MessageResponse>{leadsReply}</MessageResponse>
            </MessageTableViewport>
          </div>
          <RowViewChip table="Leads" rows={12} />
        </div>
      </Frame>
      <Frame id="unbounded" title="Without row views" note="Not bounded: tables grow to full height.">
        <div className="mr-demo-bubble" data-testid="unbounded-response">
          <MessageTableViewport bounded={false}>
            <MessageResponse>{pipeline}</MessageResponse>
          </MessageTableViewport>
        </div>
      </Frame>
    </div>
  );
}

/* Custom links (GitHub downloads and knowledge citations) ---------------------------- */

const workspaceId = 'ws_meadow';
const chatId = '3f6b2c1e-8a4d-4f7e-9b1c-2d5e6f7a8b9c';
const taskId = 'c2d4e6f8-1a3b-4c5d-8e7f-9a0b1c2d3e4f';
const goodFile = '0b8f6a2e-5c1d-4e3f-9a7b-6c5d4e3f2a1b';
const lostFile = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';
const source = '6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d';
const citationPrefix = '#knowledge-citation=';

type CitationState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'ready'; title: string; location: string; excerpt: string }
  | { kind: 'unavailable' | 'error'; message: string };

const passages: Record<string, CitationState> = {
  '0': {
    kind: 'ready',
    title: 'Returns policy',
    location: 'Note · Refund window',
    excerpt: 'Customers can return unopened bulbs within 30 days for a full refund. Opened packs get store credit…',
  },
  '1': {
    kind: 'unavailable',
    message:
      'This source changed, was removed, or your access ended. Its passage is hidden. Ask again to search current knowledge.',
  },
  '2': {
    kind: 'error',
    message: 'We couldn’t check access to this source. Your answer is unchanged.',
  },
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function SampleCitation({ id, children }: { id: string; children: ReactNode }) {
  const [state, setState] = useState<CitationState>({ kind: 'idle' });
  const passage = id.split(':')[1] ?? '0';
  const load = async () => {
    setState({ kind: 'loading' });
    await wait(500);
    setState(passages[passage] ?? passages['1']!);
  };
  return (
    <Popover onOpenChange={open => open && void load()}>
      <PopoverTrigger className="mr-demo-citation">{children}</PopoverTrigger>
      <PopoverContent align="start">
        {state.kind === 'ready' ? (
          <PopoverHeader>
            <PopoverTitle>{state.title}</PopoverTitle>
            <PopoverDescription>{state.location}</PopoverDescription>
            <p className="mr-demo-excerpt">{state.excerpt}</p>
          </PopoverHeader>
        ) : state.kind === 'unavailable' || state.kind === 'error' ? (
          <div className="mr-demo-citation-message" role={state.kind === 'error' ? 'alert' : undefined}>
            <p>{state.message}</p>
            {state.kind === 'error' && (
              <Button variant="outline" size="sm" onClick={() => void load()}>
                Retry
              </Button>
            )}
          </div>
        ) : (
          <p className="mr-demo-citation-message" role="status">
            <Spinner size="sm" /> Checking access…
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SampleDownload({ path, children }: { path: string; children: ReactNode }) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const download = async () => {
    if (state === 'loading') return;
    setState('loading');
    await wait(600);
    if (path.endsWith(lostFile)) {
      setState('error');
      return;
    }
    const url = URL.createObjectURL(
      new Blob(['Sample export from the Sprõut docs.\n'], {
        type: 'text/plain',
      }),
    );
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = 'orders-export.txt';
      link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
    setState('success');
  };
  return (
    <span>
      <Button
        variant="link"
        size="task-link"
        disabled={state === 'loading'}
        aria-busy={state === 'loading'}
        onClick={() => void download()}
      >
        {children}
      </Button>
      {state === 'loading' && <span role="status"> Checking access and downloading…</span>}
      {state === 'success' && <span role="status"> Download sent to your browser.</span>}
      {state === 'error' && (
        <span role="alert">
          {' '}
          Download unavailable. Check your selected GitHub account and source access, then select the link to retry. If
          the file changed or expired, request a new download.
        </span>
      )}
    </span>
  );
}

/** Sample adapter: citations open a passage, workspace downloads fetch a file, and other links open a new tab. */
function githubLinks(id: string, task: boolean): MessageResponseRenderLink {
  const prefix = `/v1/workspaces/${workspaceId}/github/${task ? 'tasks' : 'chats'}/${id}/downloads/`;
  return (href, label) => {
    if (href.startsWith(citationPrefix))
      return <SampleCitation id={href.slice(citationPrefix.length)}>{label}</SampleCitation>;
    return href.startsWith(prefix) && /^[0-9a-f-]{36}$/.test(href.slice(prefix.length)) ? (
      <SampleDownload path={href}>{label}</SampleDownload>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  };
}

const githubReply = (prefix: string) => `I compared the two exports in **meadow/storefront**.

- The refund rule matches [the returns policy](${citationPrefix}${source}:0).
- The shipping rule cites [an old pricing note](${citationPrefix}${source}:1) that you can no longer open.
- Check [the warehouse FAQ](${citationPrefix}${source}:2) before you change it.

Download [orders-export.csv](${prefix}${goodFile}) or the older [orders-2025.csv](${prefix}${lostFile}). The diff is on [GitHub](https://github.com/).`;

export function MessageResponseLinks() {
  const [mode, setMode] = useState<'chat' | 'task'>('chat');
  const id = mode === 'task' ? taskId : chatId;
  const prefix = `/v1/workspaces/${workspaceId}/github/${mode === 'task' ? 'tasks' : 'chats'}/${id}/downloads/`;
  return (
    <Frame
      id="links"
      title="Custom links"
      note="renderLink turns citations into passages and workspace files into downloads."
      controls={
        <Segmented
          label="Download scope"
          value={mode}
          items={[
            { value: 'chat', label: 'Chat' },
            { value: 'task', label: 'Agent task' },
          ]}
          onChange={setMode}
        />
      }
    >
      <div className="mr-demo-bubble" data-testid="links-response">
        <MessageResponse renderLink={githubLinks(id, mode === 'task')}>{githubReply(prefix)}</MessageResponse>
      </div>
    </Frame>
  );
}

const taskPrefix = `/v1/workspaces/${workspaceId}/github/tasks/${taskId}/downloads/`;
const history = [
  {
    role: 'owner',
    text: 'Export last month’s orders from **meadow/storefront** as CSV.',
    sources: 0,
  },
  {
    role: 'agent',
    text: `Done. [orders-export.csv](${taskPrefix}${goodFile}) has 1,284 rows. I skipped 3 test orders.`,
    sources: 2,
  },
] as const;

export function MessageResponseTaskHistory() {
  const renderLink = githubLinks(taskId, true);
  return (
    <Frame id="task" title="Agent task result" note="The latest agent update, then the full history.">
      <div className="mr-demo-task">
        <section aria-label="Latest task update" className="mr-demo-stack">
          <h4 className="mr-demo-heading">Result</h4>
          <MessageResponse renderLink={renderLink}>{history[1].text}</MessageResponse>
        </section>
        <ol className="mr-demo-history" aria-label="Request and history">
          {history.map((message, index) => (
            <li key={index}>
              <h5 className="mr-demo-subheading">{message.role === 'owner' ? 'You' : 'Agent'}</h5>
              <MessageResponse renderLink={renderLink}>{message.text}</MessageResponse>
              {message.sources > 0 && (
                <p className="mr-demo-muted">
                  {message.sources} explicit source references. Access is checked on each read.
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </Frame>
  );
}

/* File viewer ---------------------------------------------------------------- */

const plan = `# Spring planting plan

Plant **400 tulip bulbs** across four beds before the ground freezes.

## Beds

| Bed | Variety | Bulbs |
| --- | --- | ---: |
| North | Queen of Night | 120 |
| South | Apricot Beauty | 100 |
| East | Mixed Darwin | 100 |
| West | White Triumphator | 80 |

## Steps

1. Loosen the soil to 30 cm.
2. Plant bulbs 15 cm deep, pointy side up.
3. Water once, then wait for spring.

- [x] Order bulbs
- [ ] Buy bone meal`;

const planFile: ViewableFile = {
  name: 'Spring planting plan.md',
  mediaType: 'text/markdown',
  source: {
    kind: 'local',
    file: new File([plan], 'Spring planting plan.md', {
      type: 'text/markdown',
    }),
  },
};

export function MessageResponseFile() {
  return (
    <Frame id="file" title="Markdown file" note="FileViewer's markdown renderer, with Show source and Show formatted.">
      <FileRenderersProvider
        renderers={{
          markdown: ({ text }) => <MessageResponse>{text}</MessageResponse>,
        }}
      >
        <div className="mr-demo-file" data-testid="file-response">
          <ViewableFileContent file={planFile} />
        </div>
      </FileRenderersProvider>
    </Frame>
  );
}

/* Compaction handoff ------------------------------------------------------------ */

const handoff = `## Handoff

**Goal:** reconcile March orders with the warehouse export.

- 1,284 orders matched; **3** are missing from the warehouse.
- Missing: \`SO-1042\`, \`SO-1077\`, \`SO-1103\`.

Next: ask Robin whether the three were cancelled.`;

function CopyHandoff({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mr-demo-actions">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={copied ? 'Copied' : 'Copy handoff'}
        onClick={() =>
          void navigator.clipboard.writeText(text).then(
            () => setCopied(true),
            () => setCopied(false),
          )
        }
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </Button>
    </div>
  );
}

export function MessageResponseHandoff() {
  const [status, setStatus] = useState<'completed' | 'hidden' | 'failed'>('completed');
  return (
    <Frame
      id="handoff"
      title="Compaction handoff"
      note="A written handoff in a bordered panel, with its hidden and failed states."
      controls={
        <Segmented
          label="Handoff state"
          value={status}
          items={[
            { value: 'completed', label: 'Written' },
            { value: 'hidden', label: 'Hidden' },
            { value: 'failed', label: 'Failed' },
          ]}
          onChange={setStatus}
        />
      }
    >
      <section className="mr-demo-stack" aria-label="Handoff" data-testid="handoff">
        {status === 'failed' && (
          <Alert variant="destructive">
            <AlertDescription>
              The handoff could not be written. The model stopped early. Retrying writes only the handoff; the working
              summary is kept.
            </AlertDescription>
          </Alert>
        )}
        {status === 'hidden' && (
          <p className="mr-demo-muted">
            This handoff is hidden because you can no longer read some of the sources it was written from.
          </p>
        )}
        {status === 'completed' && (
          <>
            <div className="mr-demo-panel">
              <MessageResponse>{handoff}</MessageResponse>
            </div>
            <CopyHandoff text={handoff} />
          </>
        )}
        <p className="mr-demo-small">Instructions: Keep order numbers and the open question.</p>
      </section>
    </Frame>
  );
}
