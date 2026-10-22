import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen } from 'reicon-react/icons/BookOpen';
import { ChatDots } from 'reicon-react/icons/ChatDots';
import { Compass } from 'reicon-react/icons/Compass';
import { GraduationCap } from 'reicon-react/icons/GraduationCap';
import { Laptop } from 'reicon-react/icons/Laptop';
import { Lightbulb } from 'reicon-react/icons/Lightbulb';
import { Link } from 'reicon-react/icons/Link';
import { Map } from 'reicon-react/icons/Map';
import { Sparkles } from 'reicon-react/icons/Sparkles';
import { Target } from 'reicon-react/icons/Target';
import { Telescope } from 'reicon-react/icons/Telescope';
import { User } from 'reicon-react/icons/User';
import { FileTypeIcon, type AttachmentFile } from '@tulipfarm/sprout/attachment';
import { BrandIcon, type Brand } from '@tulipfarm/sprout/brand-icon';
import {
  ChatInput,
  type ChatInputIntegration,
  type ChatInputModel,
  type ChatInputOption,
  type ChatInputPrompt,
  type ChatInputStatus,
  type ChatInputSuggestion,
} from '@tulipfarm/sprout/chat-input';
import { findKeywords, type RichTextValue } from '@tulipfarm/sprout/rich-text-editor';
import { TooltipProvider } from '@tulipfarm/sprout/tooltip';
import '../styles/chat-input-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <TooltipProvider>
      <section className="chat-input-demo-card" aria-label={title}>
        <header>
          <h3>{title}</h3>
          <p>{description}</p>
        </header>
        <div className="chat-input-demo-card-body">{children}</div>
      </section>
    </TooltipProvider>
  );
}

const icon = (Icon: typeof Map) => <Icon size={16} aria-hidden="true" />;

const emptyDoc = (): RichTextValue => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});
const textDoc = (text: string): RichTextValue => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const agents: ChatInputSuggestion[] = [
  {
    id: 'researcher',
    label: 'Researcher',
    description: 'Finds and cites sources',
    media: icon(Telescope),
  },
  {
    id: 'designer',
    label: 'Designer',
    description: 'Reviews layouts and flows',
    media: icon(Compass),
  },
  {
    id: 'pm',
    label: 'Product manager',
    description: 'Writes specs and plans',
    media: icon(User),
  },
];
const skills: ChatInputSuggestion[] = [
  {
    id: 'usability-review',
    label: 'usability-review',
    description: 'Heuristic review of a screen',
    media: icon(BookOpen),
  },
  {
    id: 'user-interview',
    label: 'user-interview',
    description: 'Draft an interview guide',
    media: icon(BookOpen),
  },
  {
    id: 'prd',
    label: 'prd',
    description: 'Turn notes into a product spec',
    media: icon(BookOpen),
  },
];
const savedFiles = [
  { name: 'financial-dashboard.png', mediaType: 'image/png', size: '412 KB' },
  { name: 'messaging-dashboard.png', mediaType: 'image/png', size: '388 KB' },
  {
    name: 'Q3-forecast.xlsx',
    mediaType: 'application/vnd.ms-excel',
    size: '182 KB',
  },
  { name: 'pricing-2026.pdf', mediaType: 'application/pdf', size: '920 KB' },
];
const fileSuggestions: ChatInputSuggestion[] = savedFiles.map(file => ({
  id: file.name,
  label: file.name,
  description: file.size,
  media: <FileTypeIcon name={file.name} mediaType={file.mediaType} />,
}));

const search = (items: ChatInputSuggestion[]) => (query: string) =>
  items.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));

const modes: ChatInputOption[] = [
  {
    id: 'plan',
    label: 'Plan',
    description: 'Proposes steps before it acts',
    icon: icon(Map),
    color: '#3b9ef5',
  },
  {
    id: 'research',
    label: 'Deep research',
    description: 'Reads many sources, takes longer',
    icon: icon(Telescope),
    color: '#6366f1',
  },
  {
    id: 'ask',
    label: 'Ask',
    description: 'Answers without making edits',
    icon: icon(ChatDots),
    color: '#10b981',
  },
  {
    id: 'learn',
    label: 'Learn',
    description: 'Explains step by step',
    icon: icon(GraduationCap),
    color: '#f97316',
  },
];
const projects: ChatInputOption[] = [
  { id: 'none', label: 'No project' },
  { id: 'onboarding', label: 'Onboarding redesign' },
  { id: 'billing', label: 'Billing revamp' },
  { id: 'q3', label: 'Q3 research' },
];
/** Sample numbers: output tokens per second, a 0–100 eval score, and dollars per million output tokens. */
const models: ChatInputModel[] = [
  {
    id: 'claude-opus',
    label: 'Claude Opus 5.5',
    brand: 'claude',
    description: 'Anthropic · best for hard work',
    speed: 45,
    quality: 92,
    cost: 75,
  },
  {
    id: 'claude-sonnet',
    label: 'Claude Sonnet 5.5',
    brand: 'claude',
    description: 'Anthropic · fast and capable',
    speed: 80,
    quality: 86,
    cost: 15,
  },
  { id: 'gpt', label: 'GPT-5.5', brand: 'openai', description: 'OpenAI', speed: 70, quality: 90, cost: 30 },
  {
    id: 'gemini',
    label: 'Gemini 3 Pro',
    brand: 'gemini',
    description: 'Google',
    speed: 95,
    quality: 89,
    cost: 12,
  },
  { id: 'grok', label: 'Grok 5', brand: 'grok', description: 'xAI', speed: 110, quality: 84, cost: 15 },
  {
    id: 'mistral',
    label: 'Mistral Large 3',
    brand: 'mistral',
    description: 'Mistral',
    speed: 85,
    quality: 78,
    cost: 6,
  },
  { id: 'llama', label: 'Llama 5', brand: 'meta', description: 'Meta', speed: 120, quality: 76, cost: 0.9 },
  { id: 'qwen', label: 'Qwen 4', brand: 'qwen', description: 'Alibaba', speed: 100, quality: 80, cost: 1.6 },
  {
    id: 'deepseek',
    label: 'DeepSeek V4',
    brand: 'deepseek',
    description: 'DeepSeek',
    speed: 60,
    quality: 82,
    cost: 1.1,
  },
  {
    id: 'kimi',
    label: 'Kimi K3',
    brand: 'kimi',
    description: 'Moonshot · unavailable',
    disabled: true,
    speed: 75,
    quality: 81,
    cost: 2.5,
  },
];
const prompts: ChatInputPrompt[] = [
  {
    id: 'clarify',
    label: 'Clarify user problem',
    icon: icon(Lightbulb),
    prompt: 'Help me clarify the user problem we are solving.',
  },
  {
    id: 'context',
    label: 'Define user context',
    icon: icon(Target),
    prompt: 'Describe who the users are and where they use this.',
  },
  {
    id: 'deliverable',
    label: 'Select deliverable',
    icon: icon(BookOpen),
    prompt: 'Which deliverable fits best: a spec, a prototype, or a report?',
  },
  {
    id: 'refine',
    label: 'Refine requirements',
    icon: icon(Sparkles),
    prompt: 'Refine these requirements and list open questions.',
  },
];

const ready = (name: string, mediaType: string, size: string): AttachmentFile => ({
  id: `${name}-${Math.random().toString(36).slice(2, 8)}`,
  name,
  mediaType,
  size,
  state: 'ready',
});

const integration = (
  brand: Brand,
  label: string,
  options: Partial<ChatInputIntegration> = {},
): ChatInputIntegration => ({
  id: brand,
  label,
  icon: <BrandIcon brand={brand} size="inline" />,
  ...options,
});

const integrationList: ChatInputIntegration[] = [
  integration('openai', 'ChatGPT', { match: ['ChatGPT', 'OpenAI', 'GPT'] }),
  integration('claude', 'Claude', { match: ['Claude', 'Anthropic'] }),
  integration('slack', 'Slack'),
  integration('gmail', 'Gmail', { match: ['Gmail', 'Google Mail'] }),
  integration('google-docs', 'Google Docs', { match: ['Google Docs', 'Google Doc', 'GDocs', 'GDoc'] }),
  integration('google-drive', 'Google Drive', { match: ['Google Drive', 'GDrive', 'Drive'] }),
  integration('google-sheets', 'Google Sheets', { match: ['Google Sheets', 'Google Sheet', 'GSheets', 'Sheets'] }),
  integration('google-slides', 'Google Slides', { match: ['Google Slides', 'GSlides', 'Slides'] }),
  integration('google-calendar', 'Google Calendar', { match: ['Google Calendar', 'GCal'] }),
  integration('github', 'GitHub'),
  integration('linear', 'Linear'),
  integration('notion', 'Notion'),
  integration('hubspot', 'HubSpot', { connected: false }),
  integration('jira', 'Jira', { connected: false }),
];

// Brand tints for the tinted sample, kept only where text passes 4.5:1 and the tint stays visible in light and dark.
// Black or pale brands (ChatGPT, GitHub, Notion, Drive, Sheets, Slides) stay neutral.
const tints: Partial<Record<string, string>> = {
  claude: '#d97757',
  slack: '#e01e5a',
  gmail: '#ea4335',
  'google-docs': '#4285f4',
  'google-calendar': '#4285f4',
  linear: '#5e6ad2',
  hubspot: '#ff7a59',
  jira: '#0052cc',
};

// Sample accounts per app; the first one is in use.
const accountOptions: Record<string, readonly string[]> = {
  openai: ['dhruv@tulipfarm.ai', 'research@tulipfarm.ai'],
  claude: ['dhruv@tulipfarm.ai', 'research@tulipfarm.ai'],
  slack: ['tulipfarm.slack.com', 'acme-partners.slack.com', 'growth-guild.slack.com'],
  gmail: ['dhruv@tulipfarm.ai', 'sales@tulipfarm.ai', 'dhruv.personal@gmail.com'],
  'google-docs': ['dhruv@tulipfarm.ai', 'sales@tulipfarm.ai'],
  'google-drive': ['dhruv@tulipfarm.ai', 'sales@tulipfarm.ai'],
  'google-sheets': ['dhruv@tulipfarm.ai', 'sales@tulipfarm.ai'],
  'google-slides': ['dhruv@tulipfarm.ai', 'sales@tulipfarm.ai'],
  'google-calendar': ['dhruv@tulipfarm.ai', 'sales@tulipfarm.ai'],
  github: ['TulipFarm', 'maddhruv'],
  linear: ['TulipFarm', 'Acme'],
  notion: ['TulipFarm workspace', 'Personal'],
  hubspot: ['TulipFarm CRM', 'Acme CRM'],
  jira: ['tulipfarm.atlassian.net', 'acme.atlassian.net'],
};

function useIntegrations(tinted: boolean) {
  const [connected, setConnected] = useState<Set<string>>(() => new Set());
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const list = integrationList.map(item => {
    const isConnected = item.connected !== false || connected.has(item.id);
    const options = accountOptions[item.id] ?? [];
    return {
      ...item,
      connected: isConnected,
      accounts: options.map(label => ({ id: label, label })),
      account: isConnected ? (chosen[item.id] ?? options[0]) : undefined,
      color: tinted ? tints[item.id] : undefined,
    };
  });
  return {
    list,
    connect: (item: ChatInputIntegration) => setConnected(current => new Set(current).add(item.id)),
    choose: (item: ChatInputIntegration, account: string) => setChosen(current => ({ ...current, [item.id]: account })),
  };
}

function useChat(initial: RichTextValue, initialFiles: AttachmentFile[] = [], initialStatus: ChatInputStatus = 'idle') {
  const [value, setValue] = useState(initial);
  const [attachments, setAttachments] = useState(initialFiles);
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState('Nothing has been sent.');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    value,
    setValue,
    attachments,
    setAttachments,
    status,
    note,
    setNote,
    send: () => {
      setValue(emptyDoc());
      setAttachments([]);
      setStatus('streaming');
      setNote('Sent. The agent is working. Stop ends the reply.');
      timer.current = setTimeout(() => {
        setStatus('idle');
        setNote('Reply finished. Nothing left this page.');
      }, 4000);
    },
    stop: () => {
      clearTimeout(timer.current);
      setStatus('idle');
      setNote('Reply stopped.');
    },
  };
}

function Composer({
  initial = emptyDoc(),
  initialFiles,
  initialStatus,
  tinted = false,
}: {
  initial?: RichTextValue;
  initialFiles?: AttachmentFile[];
  initialStatus?: ChatInputStatus;
  tinted?: boolean;
}) {
  const chat = useChat(initial, initialFiles, initialStatus);
  const integrations = useIntegrations(tinted);
  const [mode, setMode] = useState<string | null>(null);
  const [project, setProject] = useState('onboarding');
  const [model, setModel] = useState('claude-opus');
  const picker = useRef<HTMLInputElement>(null);
  const add = (file: AttachmentFile) => chat.setAttachments(current => [...current, file]);
  return (
    <div className="chat-input-demo-sample">
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        onChange={event => {
          for (const file of event.currentTarget.files ?? [])
            add({
              ...ready(file.name, file.type, `${Math.ceil(file.size / 1024)} KB`),
              source: { kind: 'local', file },
            });
          event.currentTarget.value = '';
        }}
      />
      <ChatInput
        label="Message"
        value={chat.value}
        onValueChange={chat.setValue}
        onSend={() => {
          const used = findKeywords(chat.value, integrations.list).map(item => item.label);
          chat.send();
          if (used.length) chat.setNote(`Sent with ${used.join(', ')}. The agent is working.`);
        }}
        onStop={chat.stop}
        status={chat.status}
        agents={search(agents)}
        skills={search(skills)}
        files={search(fileSuggestions)}
        integrations={integrations.list}
        onConnectIntegration={item => {
          integrations.connect(item);
          chat.setNote(`${item.label} connected.`);
        }}
        onIntegrationAccountChange={async (item, account) => {
          await new Promise(resolve => setTimeout(resolve, 600));
          integrations.choose(item, account);
          chat.setNote(`${item.label} now uses ${account}.`);
        }}
        attachments={chat.attachments}
        onRemoveAttachment={id => chat.setAttachments(current => current.filter(file => file.id !== id))}
        attachActions={[
          {
            id: 'computer',
            label: 'Upload from computer',
            description: 'Files and images from this device',
            icon: icon(Laptop),
            onSelect: () => picker.current?.click(),
          },
          {
            id: 'drive',
            label: 'Add from Google Drive',
            description: 'Docs, sheets, and slides',
            icon: <BrandIcon brand="google-drive" size="inline" />,
            onSelect: () => add(ready('Research plan.gdoc', 'application/vnd.google-apps.document', 'Google Drive')),
          },
          {
            id: 'url',
            label: 'Add a web page',
            description: 'Reads the page at a URL',
            icon: icon(Link),
            onSelect: () => add(ready('sprout.dev', 'text/html', 'Web page')),
          },
        ]}
        modes={modes}
        mode={mode}
        onModeChange={setMode}
        projects={projects}
        project={project}
        onProjectChange={setProject}
        models={models}
        model={model}
        onModelChange={setModel}
        prompts={prompts}
      />
      <p role="status" className="chat-input-demo-note">
        {chat.note}
      </p>
      {tinted ? <TintLegend /> : null}
    </div>
  );
}

function TintLegend() {
  const neutral = integrationList.filter(item => !tints[item.id]).map(item => item.label);
  return (
    <div className="chat-input-demo-tints">
      <ul aria-label="Brand tints">
        {integrationList.flatMap(item => {
          const color = tints[item.id];
          if (!color) return [];
          return [
            <li key={item.id}>
              <span className="chat-input-demo-swatch" style={{ background: color }} aria-hidden="true" />
              {item.label}
              <code>{color}</code>
            </li>,
          ];
        })}
      </ul>
      <p>Neutral, since their brand color is black or too pale in one theme: {neutral.join(', ')}.</p>
    </div>
  );
}

export function ChatInputComposer() {
  return (
    <Example
      title="Chat input"
      description="Type @ for agents, / for skills, or # for files. ** makes bold, _ makes italic, and links and emails turn into links. + adds files, the sliders pick a mode, and the model sits by send. Starter prompts show under an empty box."
    >
      <Composer />
    </Example>
  );
}

export function ChatInputIntegrations() {
  return (
    <Example
      title="Integrations"
      description="Type an app's name, such as Slack or ChatGPT, and it shows as a chip with its icon. Hover a chip, or put the caret in it and press Tab, to see or switch its account. HubSpot and Jira aren't connected yet. These chips take a brand color that reads in light and dark."
    >
      <Composer
        tinted
        initial={textDoc(
          'Use ChatGPT to find B2B leads, enrich them, export to Slack, and log each contact in HubSpot. Ask Claude to draft the outreach, send it from Gmail, and book calls on Google Calendar. Keep notes in Google Docs and Notion, the list in Google Sheets, decks in Google Slides, and files in Google Drive. Track the work in Linear, Jira, and GitHub.',
        )}
      />
    </Example>
  );
}

export function ChatInputAttachments() {
  return (
    <Example
      title="With attachments"
      description="Attached files show as chips above the message. Click one to view it, hover to peek, × removes it."
    >
      <Composer
        initial={textDoc(
          'Compare the greenhouse layout with the returns policy. List the places where the layout makes returns hard, and suggest one fix for each.',
        )}
        initialFiles={[
          {
            ...ready('greenhouse-layout.png', 'image/png', '4 KB'),
            url: '/file-viewer-samples/greenhouse-layout.png',
          },
          {
            ...ready('returns-policy.pdf', 'application/pdf', '1 KB'),
            source: {
              kind: 'remote',
              url: '/file-viewer-samples/returns-policy.pdf',
            },
          },
        ]}
      />
    </Example>
  );
}

export function ChatInputStreaming() {
  return (
    <Example
      title="Working"
      description="While a reply streams, send turns into stop and the placeholder says the agent is working."
    >
      <Composer initialStatus="streaming" />
    </Example>
  );
}
