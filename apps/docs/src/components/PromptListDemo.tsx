import { useEffect, useState, type ReactNode } from 'react';
import { Book } from 'reicon-react/icons/Book';
import { CalendarSearch } from 'reicon-react/icons/CalendarSearch';
import { Checklist } from 'reicon-react/icons/Checklist';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { ChevronUp } from 'reicon-react/icons/ChevronUp';
import { Clock } from 'reicon-react/icons/Clock';
import { Database } from 'reicon-react/icons/Database';
import { FileText } from 'reicon-react/icons/FileText';
import { Leaf } from 'reicon-react/icons/Leaf';
import { MessageEdit } from 'reicon-react/icons/MessageEdit';
import { Note } from 'reicon-react/icons/Note';
import { Plug } from 'reicon-react/icons/Plug';
import { Repeat } from 'reicon-react/icons/Repeat';
import { UserAdd } from 'reicon-react/icons/UserAdd';
import { Alert, AlertDescription } from '@tulipfarm/sprout/alert';
import type { Brand } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@tulipfarm/sprout/collapsible';
import { PromptList, type PromptListItem } from '@tulipfarm/sprout/prompt-list';
import DocsSelect from './DocsSelect';
import '../styles/prompt-list-demo.css';

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
    <section className="prompt-demo-frame" aria-label={title} data-recipe={id}>
      <div className="prompt-demo-bar">
        <div className="prompt-demo-bar-text">
          <span className="prompt-demo-bar-title">{title}</span>
          {note && <span className="prompt-demo-note">{note}</span>}
        </div>
        {controls && <div className="prompt-demo-controls">{controls}</div>}
      </div>
      <div className="prompt-demo-stage">{children}</div>
    </section>
  );
}

function Panel({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="prompt-demo-panel">
      <p className="prompt-demo-caption">{caption}</p>
      {children}
    </div>
  );
}

/* Sample recommendations, shaped like the ones the chat start screen gets.
   The adapter below turns them into Prompt List rows. */

type Destination = 'integrations' | 'files' | 'members';
type Source = 'google' | 'github' | 'slack';
type Recommendation = {
  id: string;
  kind: 'prompt' | 'onboarding';
  label: string;
  brands: Brand[];
  action: { kind: 'prompt'; prompt: string } | { kind: 'open'; destination: Destination; sourcePicker?: Source };
};

const prompt = (text: string) => ({ kind: 'prompt' as const, prompt: text });

const suggested: Recommendation[] = [
  {
    id: 'meetings',
    kind: 'prompt',
    label: "Prepare me for tomorrow's meetings",
    brands: ['google-calendar'],
    action: prompt("Read tomorrow's meetings from Google Calendar and list what I should prepare."),
  },
  {
    id: 'inbox',
    kind: 'prompt',
    label: 'Draft replies to recent customer emails',
    brands: ['gmail'],
    action: prompt('Find recent customer emails in Gmail that still need a reply and draft one for each.'),
  },
  {
    id: 'table-review',
    kind: 'prompt',
    label: 'Review rows in Supplier deliveries',
    brands: [],
    action: prompt('Review the rows in the Supplier deliveries table and suggest next actions.'),
  },
  {
    id: 'github',
    kind: 'prompt',
    label: 'Summarize my open GitHub work',
    brands: ['github'],
    action: prompt('Summarize my open GitHub issues and pull requests by repository.'),
  },
  {
    id: 'slack-update',
    kind: 'prompt',
    label: 'Draft a Slack update for my team',
    brands: ['slack'],
    action: prompt('Help me draft a short team update for Slack.'),
  },
];

const fallback: Recommendation[] = [
  {
    id: 'follow-ups',
    kind: 'prompt',
    label: 'Plan customer follow-ups',
    brands: [],
    action: prompt('Help me plan customer follow-ups.'),
  },
  {
    id: 'support',
    kind: 'prompt',
    label: 'Draft a support reply',
    brands: [],
    action: prompt('Help me draft a reply to a customer support request.'),
  },
  {
    id: 'week',
    kind: 'prompt',
    label: 'Plan my week',
    brands: [],
    action: prompt('Help me plan my week.'),
  },
];

const setup: Recommendation[] = [
  {
    id: 'personalize-bud',
    kind: 'onboarding',
    label: 'Set how Bud replies to you',
    brands: [],
    action: prompt('Help me set how Bud replies to me.'),
  },
  {
    id: 'connect-apps',
    kind: 'onboarding',
    label: 'Connect Slack, Google, or GitHub',
    brands: [],
    action: { kind: 'open', destination: 'integrations' },
  },
  {
    id: 'slack-sources',
    kind: 'onboarding',
    label: 'Choose Slack channels for knowledge',
    brands: ['slack'],
    action: {
      kind: 'open',
      destination: 'integrations',
      sourcePicker: 'slack',
    },
  },
  {
    id: 'google-sources',
    kind: 'onboarding',
    label: 'Choose Google sources for knowledge',
    brands: [],
    action: {
      kind: 'open',
      destination: 'integrations',
      sourcePicker: 'google',
    },
  },
  {
    id: 'create-table',
    kind: 'onboarding',
    label: 'Create your first business table',
    brands: [],
    action: prompt('Help me create my first business table.'),
  },
  {
    id: 'create-workflow',
    kind: 'onboarding',
    label: 'Create your first Workflow',
    brands: [],
    action: prompt('Help me create my first Workflow.'),
  },
  {
    id: 'add-knowledge',
    kind: 'onboarding',
    label: 'Add knowledge about your business',
    brands: [],
    action: { kind: 'open', destination: 'files' },
  },
  {
    id: 'invite-teammate',
    kind: 'onboarding',
    label: 'Invite a teammate',
    brands: [],
    action: { kind: 'open', destination: 'members' },
  },
];

const icons: Record<string, ReactNode> = {
  'personalize-bud': <MessageEdit />,
  'connect-apps': <Plug />,
  'create-table': <Database />,
  'create-workflow': <Repeat />,
  'add-knowledge': <Book />,
  'invite-teammate': <UserAdd />,
  meetings: <CalendarSearch />,
  inbox: <MessageEdit />,
  'table-review': <Database />,
  github: <Checklist />,
  'slack-update': <MessageEdit />,
  'follow-ups': <Checklist />,
  support: <MessageEdit />,
  week: <CalendarSearch />,
  standup: <Clock />,
  process: <Note />,
};
const destinationIcons: Record<Destination, ReactNode> = {
  integrations: <Plug />,
  files: <Book />,
  members: <UserAdd />,
};
const destinationNames: Record<Destination, string> = {
  integrations: 'Integrations',
  files: 'Files',
  members: 'Members',
};
const brandNames: Partial<Record<Brand, string>> = {
  gmail: 'Gmail',
  'google-calendar': 'Google Calendar',
  github: 'GitHub',
  slack: 'Slack',
};
const sourceNames: Record<Source, string> = {
  google: 'Google',
  github: 'GitHub',
  slack: 'Slack',
};

function rows(recommendations: Recommendation[]): PromptListItem[] {
  return recommendations.map(item => {
    const { action } = item;
    const source = action.kind === 'open' ? action.sourcePicker : undefined;
    return {
      id: item.id,
      label: item.label,
      icon:
        action.kind === 'open' ? (
          source ? (
            <Book />
          ) : (
            destinationIcons[action.destination]
          )
        ) : (
          (icons[item.id] ?? <MessageEdit />)
        ),
      brands: source
        ? [{ brand: source, name: sourceNames[source] }]
        : item.brands.map(brand => ({
            brand,
            name: brandNames[brand] ?? brand,
          })),
    };
  });
}

/* The chat start screen: tasks, more tasks, setup, and the load states ---- */

type Feed = 'ready' | 'fallback' | 'loading' | 'updating' | 'error' | 'offline';
const feedChoices: { value: Feed; label: string }[] = [
  { value: 'ready', label: 'Saved recommendations' },
  { value: 'fallback', label: 'No recommendations yet' },
  { value: 'loading', label: 'Loading' },
  { value: 'updating', label: 'Updating in background' },
  { value: 'error', label: 'Could not load' },
  { value: 'offline', label: 'Live updates unavailable' },
];
const feedMessages: Record<Feed, string | null> = {
  ready: null,
  fallback: null,
  loading: 'Loading saved recommendations.',
  updating: 'Recommendations are updating in the background.',
  error: 'Saved recommendations could not be loaded.',
  offline: 'Live updates are not available. Reload the saved list to reconnect.',
};

type SetupLeft = 'several' | 'one' | 'none';
const setupChoices: { value: SetupLeft; label: string }[] = [
  { value: 'several', label: 'Eight steps left' },
  { value: 'one', label: 'One step left' },
  { value: 'none', label: 'All done' },
];
const setupCounts: Record<SetupLeft, number> = {
  several: setup.length,
  one: 1,
  none: 0,
};

type Chat = 'idle' | 'sending';
const chatChoices: { value: Chat; label: string }[] = [
  { value: 'idle', label: 'Ready' },
  { value: 'sending', label: 'Sending a message' },
];

export function PromptListStartingTasks() {
  const [feed, setFeed] = useState<Feed>('ready');
  const [chat, setChat] = useState<Chat>('idle');
  const [setupLeft, setSetupLeft] = useState<SetupLeft>('several');
  const [refreshing, setRefreshing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [result, setResult] = useState('Nothing chosen yet.');
  useEffect(() => {
    if (!refreshing) return;
    const timer = setTimeout(() => {
      setRefreshing(false);
      setFeed('ready');
    }, 900);
    return () => clearTimeout(timer);
  }, [refreshing]);

  const disabled = chat === 'sending';
  const tasks = feed === 'ready' || feed === 'updating' ? suggested : fallback;
  const primary = tasks.slice(0, 3);
  const more = tasks.slice(3);
  const steps = setup.slice(0, setupCounts[setupLeft]);
  const message = feedMessages[feed];
  const error = feed === 'error' || feed === 'offline';
  const choose = (id: string) => {
    const action = [...tasks, ...steps].find(item => item.id === id)?.action;
    if (action?.kind === 'prompt') setResult(`Sent to chat: “${action.prompt}”`);
    else if (action)
      setResult(
        `Opened ${destinationNames[action.destination]}${action.sourcePicker ? ` › ${sourceNames[action.sourcePicker]} sources` : ''}.`,
      );
  };

  return (
    <section className="prompt-demo-frame" aria-label="Starting tasks" data-recipe="starting-tasks">
      <div className="prompt-demo-toolbar">
        <span className="prompt-demo-picker">
          Recommendations
          <DocsSelect<Feed> label="Recommendations" value={feed} onValueChange={setFeed} items={feedChoices} />
        </span>
        <span className="prompt-demo-picker">
          Setup
          <DocsSelect<SetupLeft> label="Setup" value={setupLeft} onValueChange={setSetupLeft} items={setupChoices} />
        </span>
        <span className="prompt-demo-picker">
          Chat
          <DocsSelect<Chat> label="Chat" value={chat} onValueChange={setChat} items={chatChoices} />
        </span>
      </div>
      <div className="prompt-demo-stage">
        <div className="prompt-demo-chat">
          <section aria-label="Recommended for you" className="prompt-demo-start">
            <div className="prompt-demo-group">
              <PromptList title="Start with a task" disabled={disabled} onSelect={choose} items={rows(primary)} />
              {more.length > 0 && (
                <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
                  <CollapsibleContent>
                    <div className="prompt-demo-more">
                      <PromptList
                        title="More tasks"
                        showTitle={false}
                        disabled={disabled}
                        onSelect={choose}
                        items={rows(more)}
                      />
                    </div>
                  </CollapsibleContent>
                  <div className="prompt-demo-trigger">
                    <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
                      {moreOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                      {moreOpen ? 'Fewer tasks' : `More tasks (${more.length})`}
                    </CollapsibleTrigger>
                  </div>
                </Collapsible>
              )}
            </div>
            {steps.length > 0 && (
              <div className="prompt-demo-group prompt-demo-setup">
                <PromptList
                  title="Set up your workspace"
                  disabled={disabled}
                  onSelect={choose}
                  items={rows(steps.slice(0, 1))}
                />
                {steps.length > 1 && (
                  <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
                    <div className="prompt-demo-trigger">
                      <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
                        {setupOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                        {setupOpen ? 'Fewer setup options' : `More setup options (${steps.length - 1})`}
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="prompt-demo-more-setup">
                        <PromptList
                          title="More setup options"
                          showTitle={false}
                          disabled={disabled}
                          onSelect={choose}
                          items={rows(steps.slice(1))}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
                <p className="prompt-demo-hint">Optional. You can start a task now.</p>
              </div>
            )}
            {message &&
              (error ? (
                <div className="prompt-demo-error">
                  <Alert>
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={refreshing}
                      aria-busy={refreshing}
                      onClick={() => setRefreshing(true)}
                    >
                      {refreshing ? 'Loading saved list...' : 'Reload saved list'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p role="status" className="prompt-demo-hint prompt-demo-message">
                  {message}
                </p>
              ))}
          </section>
          <p className="prompt-demo-result" data-testid="starting-tasks-result" aria-live="polite">
            {result}
          </p>
        </div>
      </div>
    </section>
  );
}

/* Title shown or hidden ---------------------------------------------------- */

export function PromptListTitles() {
  const [picked, setPicked] = useState('Nothing chosen yet.');
  const pick = (id: string) => setPicked(`Chose ${id}.`);
  return (
    <Frame id="titles" title="Title shown or hidden" note="A hidden title still names the list for screen readers">
      <div className="prompt-demo-pair">
        <Panel caption="showTitle (default)">
          <PromptList title="Start with a task" onSelect={pick} items={rows(fallback)} />
        </Panel>
        <Panel caption="showTitle={false}, inside “More tasks”">
          <PromptList title="More tasks" showTitle={false} onSelect={pick} items={rows(suggested.slice(3))} />
        </Panel>
      </div>
      <p className="prompt-demo-result" aria-live="polite">
        {picked}
      </p>
    </Frame>
  );
}

/* Brands ------------------------------------------------------------------- */

const brandRows: PromptListItem[] = [
  { id: 'process', label: 'Write down a business process', icon: <Note /> },
  {
    id: 'meetings',
    label: "Prepare me for tomorrow's meetings",
    icon: <CalendarSearch />,
    brands: [{ brand: 'google-calendar', name: 'Google Calendar' }],
  },
  {
    id: 'standup',
    label: 'Prepare a daily team update',
    icon: <Clock />,
    brands: [
      { brand: 'github', name: 'GitHub' },
      { brand: 'slack', name: 'Slack' },
      { brand: 'google-calendar', name: 'Google Calendar' },
    ],
  },
];

export function PromptListBrands() {
  const [picked, setPicked] = useState('Nothing chosen yet.');
  return (
    <Frame id="brands" title="Apps a prompt uses" note="No apps, one app, and several apps. Hover a tile for its name.">
      <div className="prompt-demo-chat">
        <PromptList title="Start with a task" onSelect={id => setPicked(`Chose ${id}.`)} items={brandRows} />
        <p className="prompt-demo-result" aria-live="polite">
          {picked}
        </p>
      </div>
    </Frame>
  );
}

/* Disabled while a message sends ------------------------------------------- */

export function PromptListDisabled() {
  return (
    <Frame id="disabled" title="Disabled" note="Every row locks while a message is sending">
      <div className="prompt-demo-pair">
        <Panel caption="Enabled">
          <PromptList title="Set up your workspace" onSelect={() => {}} items={rows(setup.slice(1, 4))} />
        </Panel>
        <Panel caption="disabled">
          <PromptList title="Set up your workspace" disabled onSelect={() => {}} items={rows(setup.slice(1, 4))} />
        </Panel>
      </div>
    </Frame>
  );
}

/* Long labels in a narrow column ------------------------------------------- */

const longRows: PromptListItem[] = [
  {
    id: 'long-table',
    label: 'Review rows in Supplier deliveries from the legacy accounting export',
    icon: <Database />,
  },
  {
    id: 'long-inbox',
    label: 'Draft replies to recent customer emails about delayed spring bulb orders',
    icon: <MessageEdit />,
    brands: [{ brand: 'gmail', name: 'Gmail' }],
  },
  {
    id: 'long-sources',
    label: 'Choose Google sources for knowledge',
    icon: <Book />,
    brands: [{ brand: 'google', name: 'Google' }],
  },
];

export function PromptListLongLabels() {
  return (
    <Frame id="long" title="Long labels" note="Labels stay on one line and show in full on hover">
      <div className="prompt-demo-narrow">
        <PromptList title="Start with a task" onSelect={() => {}} items={longRows} />
      </div>
    </Frame>
  );
}

/* Playground: fictional starter prompts ------------------------------------ */

const fictional: PromptListItem[] = [
  { id: 'notes', label: 'Summarize garden notes', icon: <FileText /> },
  {
    id: 'plan',
    label: 'Plan a garden project',
    icon: <Leaf />,
    brands: [{ brand: 'notion', name: 'Notion' }],
  },
];

export function PromptListFictional() {
  const [selected, setSelected] = useState('No prompt selected.');
  return (
    <Frame id="fictional" title="Starter prompts" note="The component playground’s fictional tasks">
      <div className="prompt-demo-pair">
        <Panel caption="Enabled">
          <PromptList title="Try a fictional task" items={fictional} onSelect={setSelected} />
          <p role="status" className="prompt-demo-result">
            {selected}
          </p>
        </Panel>
        <Panel caption="disabled">
          <PromptList title="Unavailable prompts" items={fictional} onSelect={setSelected} disabled />
        </Panel>
      </div>
    </Frame>
  );
}
