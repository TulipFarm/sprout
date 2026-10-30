import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Check } from 'reicon-react/icons/Check';
import { CheckCircle } from 'reicon-react/icons/CheckCircle';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { Cursor } from 'reicon-react/icons/Cursor';
import { UserAdd } from 'reicon-react/icons/UserAdd';
import { AgentAvatar } from '@tulipfarm/sprout/agent-avatar';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
  EntityAvatar,
  type AvatarSize,
  type EntityAvatarShape,
  type EntityAvatarSize,
} from '@tulipfarm/sprout/avatar';
import { Button } from '@tulipfarm/sprout/button';
import { Input } from '@tulipfarm/sprout/input';
import { Toggle } from '@tulipfarm/sprout/toggle';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@tulipfarm/sprout/sidebar';
import DocsSelect from './DocsSelect';
import '../styles/avatar-demo.css';
import '../styles/workspace-switcher.css';

const sizes: AvatarSize[] = ['sm', 'md', 'lg'];
const entitySizes: EntityAvatarSize[] = ['sm', 'md', 'lg'];
const sample = {
  landscape: '/avatar-samples/landscape.svg',
  person: '/avatar-samples/person.svg',
  workspace: '/avatar-samples/workspace.svg',
  missing: '/avatar-samples/missing.svg',
};

function Frame({
  title,
  label,
  children,
  foot,
}: {
  title: string;
  label?: string;
  children: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <section className="avatar-frame" aria-label={label ?? title}>
      <div className="avatar-frame-bar">{title}</div>
      <div className="avatar-frame-body">{children}</div>
      {foot && <div className="avatar-frame-foot">{foot}</div>}
    </section>
  );
}

type Content = 'image' | 'initials' | 'broken' | 'slow';

export function AvatarPlayground() {
  const [size, setSize] = useState<AvatarSize>('lg');
  const [content, setContent] = useState<Content>('image');
  const [badge, setBadge] = useState(true);
  const [status, setStatus] = useState('idle');
  const [slowSrc, setSlowSrc] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (content !== 'slow') return;
    setSlowSrc(undefined);
    setStatus('loading');
    const timer = setTimeout(() => setSlowSrc(`${sample.person}?attempt=${attempt}`), 1500);
    return () => clearTimeout(timer);
  }, [content, attempt]);

  const src = {
    image: sample.person,
    initials: undefined,
    broken: sample.missing,
    slow: slowSrc,
  }[content];

  return (
    <section className="avatar-playground" aria-label="Avatar playground">
      <div className="avatar-toolbar">
        <label>
          Size
          <DocsSelect<AvatarSize>
            label="Avatar size"
            value={size}
            onValueChange={setSize}
            items={sizes.map(value => ({ value, label: value }))}
          />
        </label>
        <label>
          Content
          <DocsSelect<Content>
            label="Avatar content"
            value={content}
            onValueChange={value => {
              setStatus(value === 'initials' ? 'idle' : 'loading');
              setContent(value);
            }}
            items={[
              { value: 'image', label: 'Image' },
              { value: 'initials', label: 'Initials only' },
              { value: 'broken', label: 'Broken image' },
              { value: 'slow', label: 'Slow image' },
            ]}
          />
        </label>
        <Toggle
          variant="outline"
          size="sm"

          pressed={badge}
          onClick={() => setBadge(value => !value)}
        >
          Badge
        </Toggle>
        {content === 'slow' && (
          <Button
            variant="outline"
            size="sm"

            onClick={() => setAttempt(value => value + 1)}
          >
            Reload image
          </Button>
        )}
      </div>
      <div className="avatar-stage">
        <Avatar size={size} data-testid="playground-avatar">
          {src && <AvatarImage key={src} src={src} alt="Alex Meadow" onLoadingStatusChange={setStatus} />}
          <AvatarFallback>AM</AvatarFallback>
          {badge && (
            <AvatarBadge role="img" aria-label="Verified">
              <Check aria-hidden="true" />
            </AvatarBadge>
          )}
        </Avatar>
        <p className="avatar-status" role="status">
          Image status: {content === 'initials' ? 'no image' : status}
        </p>
      </div>
    </section>
  );
}

export function AvatarSizes() {
  return (
    <Frame title="Sizes, images, fallbacks, and badges">
      <div className="avatar-row">
        {sizes.map(size => (
          <div key={size} className="avatar-cell" data-size-sample={size}>
            <Avatar size={size}>
              <AvatarImage src={sample.landscape} alt="Green landscape" />
              <AvatarFallback>AM</AvatarFallback>
              <AvatarBadge role="img" aria-label="Verified">
                <Check aria-hidden="true" />
              </AvatarBadge>
            </Avatar>
            <Avatar size={size}>
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
            <span>{size}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function EntityAvatars() {
  return (
    <Frame
      title="Entity shapes and sizes"
      foot="People use circles. Workspaces use squares. Without an image, the seed picks a stable gradient."
    >
      <div className="avatar-entity-grid">
        {(['circle', 'square'] as EntityAvatarShape[]).map(shape =>
          entitySizes.map(size => (
            <div key={`${shape}-${size}`} className="avatar-cell">
              <EntityAvatar seed="meadow-example" name="Meadow" shape={shape} size={size} />
              <span>
                {shape} · {size}
              </span>
            </div>
          )),
        )}
      </div>
      <div className="avatar-row avatar-row-top">
        <div className="avatar-cell">
          <EntityAvatar seed="image-example" name="Garden" image={sample.landscape} size="lg" />
          <span>image</span>
        </div>
        <div className="avatar-cell">
          <EntityAvatar seed="image-example" name="Garden" image={sample.workspace} size="lg" shape="square" />
          <span>square image</span>
        </div>
        <div className="avatar-cell">
          <EntityAvatar seed="broken-example" name="Robin Field" image={sample.missing} size="lg" />
          <span>broken image</span>
        </div>
        <div className="avatar-cell">
          <EntityAvatar seed="blank-example" name="  " size="lg" />
          <span>empty name</span>
        </div>
      </div>
    </Frame>
  );
}

export function AvatarGroups() {
  return (
    <Frame title="Avatar groups">
      <div className="avatar-row">
        {(['sm', 'md', 'lg'] as AvatarSize[]).map(size => (
          <div key={size} className="avatar-cell">
            <AvatarGroup aria-label={`7 people, ${size}`} role="group">
              {['Alex', 'Robin', 'Sam'].map(name => (
                <Avatar key={name} size={size}>
                  <AvatarFallback>{name[0]}</AvatarFallback>
                </Avatar>
              ))}
              <AvatarGroupCount>+4</AvatarGroupCount>
            </AvatarGroup>
            <span>{size}</span>
          </div>
        ))}
        <div className="avatar-cell">
          <AvatarGroup aria-label="5 people" role="group">
            {['Meadow', 'Robin'].map(name => (
              <EntityAvatar key={name} seed={name} name={name} size="sm" />
            ))}
            <AvatarGroupCount>+3</AvatarGroupCount>
          </AvatarGroup>
          <span>entity</span>
        </div>
        <div className="avatar-cell">
          <AvatarGroup aria-label="Team members" role="group">
            <Avatar>
              <AvatarImage src={sample.person} alt="Alex Meadow" />
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage src={sample.landscape} alt="Robin Field" />
              <AvatarFallback>R</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>
              <UserAdd aria-label="Invite people" />
            </AvatarGroupCount>
          </AvatarGroup>
          <span>icon count</span>
        </div>
      </div>
    </Frame>
  );
}

const sampleAgents = [
  {
    id: 'sample-collections',
    name: 'Collections assistant',
    detail: 'Follows up on overdue invoices',
    status: 'Active',
  },
  {
    id: 'sample-onboarding',
    name: 'Onboarding guide',
    detail: 'Welcomes new customers and books kickoffs',
    status: 'Active',
  },
  {
    id: 'sample-inventory',
    name: 'Inventory watcher',
    detail: 'Flags products below reorder level',
    status: 'Draft',
  },
];

export function AgentCompositions() {
  const [draftName, setDraftName] = useState('');
  const [active, setActive] = useState(0);
  const nameId = useId();
  const current = sampleAgents[active]!;

  return (
    <div className="avatar-compositions">
      <Frame title="Agent list" label="Sample agent list">
        <ul className="avatar-list">
          {sampleAgents.map(agent => (
            <li key={agent.id}>
              <AgentAvatar agentId={agent.id} name={agent.name} size="sm" />
              <span className="avatar-list-copy">
                <span className="avatar-list-title">{agent.name}</span>
                <span className="avatar-list-detail">{agent.detail}</span>
              </span>
              <span className="avatar-pill" data-tone={agent.status}>
                {agent.status}
              </span>
            </li>
          ))}
        </ul>
      </Frame>
      <Frame title="Agents table" label="Sample agents table">
        <table className="avatar-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {sampleAgents.map(agent => (
              <tr key={agent.id}>
                <td>
                  <span className="avatar-inline">
                    <AgentAvatar agentId={agent.id} name={agent.name} />
                    <a href="#agents-table">{agent.name}</a>
                  </span>
                </td>
                <td>{agent.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Frame>
      <Frame title="Draft agent header" label="Sample draft agent">
        <label htmlFor={nameId} className="avatar-field-label">
          Agent name
        </label>
        <Input
          id={nameId}
          value={draftName}
          placeholder="New agent"
          onChange={event => setDraftName(event.target.value)}
        />
        <div className="avatar-header">
          <AgentAvatar agentId="draft-agent-example" name={draftName.trim() || 'New agent'} size="lg" />
          <span className="avatar-list-copy">
            <span className="avatar-list-title" data-testid="draft-title">
              {draftName.trim() || 'Your new agent'}
            </span>
            <span className="avatar-list-detail">Personal agent</span>
          </span>
          <span className="avatar-pill">Draft</span>
        </div>
      </Frame>
      <Frame title="Agent showcase" label="Sample agent showcase">
        <div className="avatar-header">
          <AgentAvatar agentId={current.id} name={current.name} size="lg" />
          <span className="avatar-list-copy">
            <span className="avatar-list-title">{current.name}</span>
            <span className="avatar-list-detail">{current.detail}</span>
          </span>
        </div>
        <div
          className="avatar-showcase-picker"
          role="radiogroup"
          aria-label="Example agent"
          onKeyDown={event => {
            const step =
              event.key === 'ArrowRight' || event.key === 'ArrowDown'
                ? 1
                : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                  ? -1
                  : 0;
            if (!step) return;
            event.preventDefault();
            const next = (active + step + sampleAgents.length) % sampleAgents.length;
            setActive(next);
            (event.currentTarget.children[next] as HTMLElement | undefined)?.focus();
          }}
        >
          {sampleAgents.map((agent, index) => (
            <button
              key={agent.id}
              type="button"
              role="radio"
              aria-checked={index === active}
              aria-label={agent.name}
              tabIndex={index === active ? 0 : -1}
              data-active={index === active || undefined}
              onClick={() => setActive(index)}
            >
              <AgentAvatar agentId={agent.id} name={agent.name} size="sm" />
            </button>
          ))}
        </div>
      </Frame>
      <Frame title="Workflow steps" label="Sample workflow">
        <ol className="avatar-workflow">
          <li>
            <span className="avatar-workflow-identity" aria-hidden="true">
              <AgentAvatar agentId="sample-collections" name="Collections assistant" />
            </span>
            <span className="avatar-list-copy">
              <span className="avatar-list-title">Collections assistant</span>
              <span className="avatar-list-detail">Drafts reminder emails</span>
            </span>
          </li>
          <li>
            <span className="avatar-workflow-identity" aria-hidden="true">
              <CheckCircle size={18} />
            </span>
            <span className="avatar-list-copy">
              <span className="avatar-list-title">Review</span>
              <span className="avatar-list-detail">A person approves</span>
            </span>
          </li>
        </ol>
      </Frame>
    </div>
  );
}

const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];

function ImagePicker({
  seed,
  name,
  shape,
  disabled,
  initial,
}: {
  seed: string;
  name: string;
  shape: EntityAvatarShape;
  disabled: boolean;
  initial: string | null;
}) {
  const chooser = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(initial);
  const [problem, setProblem] = useState('');

  useEffect(
    () => () => {
      if (image?.startsWith('blob:')) URL.revokeObjectURL(image);
    },
    [image],
  );

  function choose(file: File | undefined) {
    if (!file) return;
    setProblem('');
    if (!allowedTypes.includes(file.type)) {
      setProblem('Choose a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > 2_000_000) {
      setProblem('Choose an image smaller than 2 MB.');
      return;
    }
    setImage(URL.createObjectURL(file));
  }

  return (
    <div className="avatar-picker">
      <EntityAvatar seed={seed} name={name} image={image} size="lg" shape={shape} />
      <input
        ref={chooser}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        tabIndex={-1}
        aria-hidden
        data-testid={`${shape}-file`}
        onChange={event => {
          choose(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <Button
        variant="outline"
        size="sm"

        disabled={disabled}
        onClick={() => chooser.current?.click()}
      >
        {image ? 'Change image' : 'Upload image'}
      </Button>
      {image && (
        <Button
          variant="ghost"
          size="sm"

          disabled={disabled}
          onClick={() => {
            setProblem('');
            setImage(null);
          }}
        >
          Remove
        </Button>
      )}
      {problem && (
        <p role="alert" className="avatar-problem">
          {problem}
        </p>
      )}
    </div>
  );
}

const sampleMembers = [
  { id: 'member-alex', name: 'Alex Meadow', image: sample.person },
  { id: 'member-robin', name: 'Robin Field', image: null },
  { id: 'member-sam', name: 'Sam Orchard', image: sample.missing },
];
const sampleWorkspaces = [
  { id: 'ws-studio', name: 'Studio workspace', icon: sample.workspace },
  { id: 'ws-garden', name: 'Garden club', icon: null },
  {
    id: 'ws-long',
    name: 'A workspace with a very long name for truncation',
    icon: null,
  },
];

export function EntityCompositions() {
  const [locked, setLocked] = useState(false);
  const [workspace, setWorkspace] = useState(sampleWorkspaces[0]!);

  return (
    <div className="avatar-compositions">
      <Frame
        title="Image picker"
        label="Sample image picker"
        foot={
          <Toggle
            variant="outline"
            size="sm"

            pressed={locked}
            onClick={() => setLocked(value => !value)}
          >
            Locked
          </Toggle>
        }
      >
        <div className="avatar-picker-stack">
          <div>
            <p className="avatar-field-label">Member photo</p>
            <ImagePicker seed="member-robin" name="Robin Field" shape="circle" disabled={locked} initial={null} />
          </div>
          <div>
            <p className="avatar-field-label">Workspace icon</p>
            <ImagePicker
              seed="ws-studio"
              name="Studio workspace"
              shape="square"
              disabled={locked}
              initial={sample.workspace}
            />
          </div>
        </div>
      </Frame>
      <Frame title="Read-only settings row" label="Sample settings row">
        <div className="avatar-settings-row">
          <span>Workspace icon</span>
          <EntityAvatar seed="ws-garden" name="Garden club" image={null} size="lg" shape="square" />
        </div>
      </Frame>
      <Frame title="Member table" label="Sample member table">
        <ul className="avatar-list">
          {sampleMembers.map(member => (
            <li key={member.id}>
              <EntityAvatar seed={member.id} name={member.name} image={member.image} size="sm" />
              <span className="avatar-list-title">{member.name}</span>
            </li>
          ))}
          <li>
            <EntityAvatar seed="workspace-member" name="Member" size="sm" />
            <span className="avatar-list-title">Member (not loaded)</span>
          </li>
        </ul>
      </Frame>
      <Frame title="Invite canvas labels" label="Sample invite canvas">
        <ul className="avatar-invite">
          {sampleMembers.slice(0, 2).map(member => (
            <li key={member.id}>
              <Cursor size={18} aria-hidden="true" />
              <span className="avatar-invite-label">
                <EntityAvatar seed={member.id} name={member.name} image={member.image} size="sm" />
                <span>{member.name}</span>
              </span>
            </li>
          ))}
          <li>
            <Cursor size={18} aria-hidden="true" />
            <span className="avatar-invite-label">
              <span>robin@example.com</span>
            </span>
          </li>
        </ul>
      </Frame>
      <Frame title="Workspace and account menus" label="Sample workspace menu">
        <SidebarProvider keyboardShortcut={false} className="avatar-sidebar-frame">
          <Sidebar label="Sample workspace navigation" collapsible="none">
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Menu.Root>
                    <Menu.Trigger
                      aria-label={`Workspace menu, ${workspace.name}`}
                      render={
                        <SidebarMenuButton
                          icon={
                            <EntityAvatar
                              seed={workspace.id}
                              name={workspace.name}
                              image={workspace.icon}
                              size="sm"
                              shape="square"
                            />
                          }
                        />
                      }
                    >
                      {workspace.name}
                      <ChevronDown size={12} aria-hidden="true" />
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner className="workspace-menu-positioner" align="start" sideOffset={6}>
                        <Menu.Popup className="workspace-menu">
                          <Menu.Group>
                            <Menu.GroupLabel className="workspace-menu-label">Switch workspace</Menu.GroupLabel>
                            {sampleWorkspaces.map(item => (
                              <Menu.Item
                                key={item.id}
                                className="workspace-menu-item avatar-menu-item"
                                onClick={() => setWorkspace(item)}
                              >
                                <EntityAvatar
                                  seed={item.id}
                                  name={item.name}
                                  image={item.icon}
                                  size="sm"
                                  shape="square"
                                />
                                <span className="avatar-truncate">{item.name}</span>
                                {item.id === workspace.id && <Check size={14} aria-label="Current workspace" />}
                              </Menu.Item>
                            ))}
                          </Menu.Group>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                <p className="avatar-sidebar-note">Sample navigation.</p>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    aria-label="Account menu"
                    icon={<EntityAvatar seed="user-alex" name="Alex Meadow" image={sample.person} size="sm" />}
                  >
                    Alex Meadow
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
        </SidebarProvider>
      </Frame>
    </div>
  );
}

export function ChatCompositions() {
  const [selected, setSelected] = useState('Alex Meadow');
  return (
    <div className="avatar-compositions">
      <Frame title="Message author" label="Sample message">
        <div className="avatar-message">
          <Avatar>
            <AvatarFallback>AM</AvatarFallback>
          </Avatar>
          <div>
            <p className="avatar-list-detail">Alex Meadow · 10:30</p>
            <p className="avatar-bubble">Can you help plan the garden?</p>
          </div>
        </div>
      </Frame>
      <Frame title="Mention options" label="Sample mention options">
        <div role="listbox" aria-label="Example people" className="avatar-list">
          {['Alex Meadow', 'Robin Field'].map(name => (
            <div
              key={name}
              role="option"
              tabIndex={selected === name ? 0 : -1}
              aria-selected={selected === name}
              className="avatar-option"
              onClick={() => setSelected(name)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelected(name);
                }
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  const sibling =
                    event.key === 'ArrowDown'
                      ? event.currentTarget.nextElementSibling
                      : event.currentTarget.previousElementSibling;
                  (sibling as HTMLElement | null)?.focus();
                }
              }}
            >
              <Avatar>
                <AvatarFallback>{name[0]}</AvatarFallback>
              </Avatar>
              <span className="avatar-list-copy">
                <span className="avatar-list-title">{name}</span>
                <span className="avatar-list-detail">Fictional team member</span>
              </span>
            </div>
          ))}
        </div>
      </Frame>
    </div>
  );
}
