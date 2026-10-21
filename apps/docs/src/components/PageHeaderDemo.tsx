import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Add } from 'reicon-react/icons/Add';
import { ArrowUpRight } from 'reicon-react/icons/ArrowUpRight';
import { ChatRound } from 'reicon-react/icons/ChatRound';
import { Download } from 'reicon-react/icons/Download';
import { FolderAdd } from 'reicon-react/icons/FolderAdd';
import { MoreH } from 'reicon-react/icons/MoreH';
import { Search } from 'reicon-react/icons/Search';
import { Settings } from 'reicon-react/icons/Settings';
import { Upload } from 'reicon-react/icons/Upload';
import { Badge } from '@tulipfarm/sprout/badge';
import { Button } from '@tulipfarm/sprout/button';
import { PageActions, PageChromeContext, PageHeader, type PageLink } from '@tulipfarm/sprout/page-header';
import DocsSelect from './DocsSelect';
import '../styles/page-header-demo.css';

// Sample adapter: stands in for the application's router link.
function link(label: string, href: string): PageLink {
  return {
    label,
    link: <a href={href} onClick={event => event.preventDefault()} />,
  };
}

function Frame({ title, example, children }: { title: string; example: string; children: ReactNode }) {
  return (
    <section className="page-demo-frame" aria-label={title} data-example={example}>
      <div className="page-demo-frame-bar">{title}</div>
      <div className="page-demo-frame-body">{children}</div>
    </section>
  );
}

type Navigation = 'none' | 'back' | 'parent' | 'both';
type Actions = 'none' | 'primary' | 'pair' | 'badge';
type Placement = 'page' | 'chrome';

export function PageHeaderPlayground() {
  const [placement, setPlacement] = useState<Placement>('page');
  const [navigation, setNavigation] = useState<Navigation>('back');
  const [actions, setActions] = useState<Actions>('pair');
  const [description, setDescription] = useState(true);
  const header = (
    <PageHeader
      title="Spring launch"
      description={description ? "Shared space for the launch team's chats, files, and instructions." : undefined}
      back={navigation === 'back' || navigation === 'both' ? link('Back to projects', '#projects') : undefined}
      parent={navigation === 'parent' || navigation === 'both' ? link('Projects', '#projects') : undefined}
      actions={
        actions === 'primary' ? (
          <Button>
            <Add aria-hidden="true" />
            New chat
          </Button>
        ) : actions === 'pair' ? (
          <>
            <Button variant="outline">Invite people</Button>
            <Button>
              <Add aria-hidden="true" />
              New chat
            </Button>
          </>
        ) : actions === 'badge' ? (
          <Badge variant="success">Active</Badge>
        ) : undefined
      }
    />
  );
  return (
    <section className="page-demo-playground" aria-label="Page header playground">
      <div className="page-demo-toolbar">
        <label>
          Placement
          <DocsSelect
            label="Placement"
            value={placement}
            items={[
              { value: 'page', label: 'In page' },
              { value: 'chrome', label: 'App header' },
            ]}
            onValueChange={setPlacement}
          />
        </label>
        <label>
          Navigation
          <DocsSelect
            label="Navigation"
            value={navigation}
            items={[
              { value: 'none', label: 'None' },
              { value: 'back', label: 'Back link' },
              { value: 'parent', label: 'Parent breadcrumb' },
              { value: 'both', label: 'Back and parent' },
            ]}
            onValueChange={setNavigation}
          />
        </label>
        <label>
          Actions
          <DocsSelect
            label="Actions"
            value={actions}
            items={[
              { value: 'none', label: 'None' },
              { value: 'primary', label: 'Primary' },
              { value: 'pair', label: 'Outline and primary' },
              { value: 'badge', label: 'Status badge' },
            ]}
            onValueChange={setActions}
          />
        </label>
        <button
          type="button"
          className="page-demo-toggle"
          aria-pressed={description}
          onClick={() => setDescription(value => !value)}
        >
          Description
        </button>
      </div>
      <div className="page-demo-stage">
        {placement === 'chrome' ? <Shell workspace="Northwind">{header}</Shell> : header}
      </div>
    </section>
  );
}

function Shell({
  workspace,
  documentTitle,
  children,
}: {
  workspace: string;
  documentTitle?: boolean;
  children: ReactNode;
}) {
  const [title, setTitle] = useState<HTMLDivElement | null>(null);
  const [actions, setActions] = useState<HTMLDivElement | null>(null);
  const chrome = useMemo(
    () => ({
      title,
      actions,
      documentTitle: documentTitle ? (text: string) => `${text} · Northwind` : undefined,
    }),
    [title, actions, documentTitle],
  );
  return (
    <div className="page-demo-shell" data-slot="demo-shell">
      <header aria-label="Workspace header" className="page-demo-shell-header">
        <div ref={setTitle} className="page-demo-shell-title" />
        <div ref={setActions} className="page-demo-shell-actions" />
        <span className="page-demo-shell-workspace">{workspace}</span>
      </header>
      <div className="page-demo-shell-body">
        <PageChromeContext value={chrome}>{children}</PageChromeContext>
      </div>
    </div>
  );
}

export function PageHeaderExamples() {
  const [downloading, setDownloading] = useState(false);
  return (
    <div className="page-demo-grid">
      <Frame title="Title and description" example="description">
        <PageHeader title="Usage" description="Credits, and where they go. Split by model, agent, or activity." />
      </Frame>
      <Frame title="Primary action" example="primary">
        <PageHeader
          title="Workflows"
          description="See how repeatable work runs. Create and edit workflows in chat."
          actions={<Button>New workflow</Button>}
        />
      </Frame>
      <Frame title="Disabled action" example="disabled">
        <PageHeader
          title="Chats"
          description="Shared with everyone in Spring launch. Most recently active first."
          actions={
            <Button nativeButton={false} disabled render={<a href="#new-chat" />}>
              New chat
            </Button>
          }
        />
      </Frame>
      <Frame title="Icon actions" example="icon-actions">
        <PageHeader
          title="Files"
          description="Find, open, and organize workspace files. Sharing a file never changes who owns it."
          actions={
            <>
              <Button>
                <Upload aria-hidden="true" />
                Upload
              </Button>
              <Button variant="outline">
                <FolderAdd aria-hidden="true" />
                New folder
              </Button>
            </>
          }
        />
      </Frame>
      <Frame title="Linked actions" example="links">
        <PageHeader
          title="Agents"
          description="Private instructions you can share with people and teams."
          actions={
            <>
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href="#agents/new" onClick={e => e.preventDefault()} />}
              >
                Configure manually
              </Button>
              <Button nativeButton={false} render={<a href="#chat" onClick={e => e.preventDefault()} />}>
                Create in chat
              </Button>
            </>
          }
        />
      </Frame>
      <Frame title="Small link action" example="small-link">
        <PageHeader
          title="Workflows"
          actions={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href="#chat" onClick={e => e.preventDefault()} />}
            >
              Open in chat
              <ArrowUpRight size={14} aria-hidden="true" />
            </Button>
          }
        />
      </Frame>
      <Frame title="Calendar actions" example="calendar">
        <PageHeader
          title="Calendar"
          actions={
            <>
              <span className="page-demo-wide-only">
                <Button variant="ghost" size="md" aria-label="Calendar commands" title="Search events and commands (/)">
                  <Search size={14} aria-hidden="true" />
                  Search
                </Button>
              </span>
              <Button size="md">
                <Add size={14} aria-hidden="true" />
                Create
              </Button>
            </>
          }
        />
      </Frame>
      <Frame title="File with busy action" example="file">
        <PageHeader
          title="Q3 customer retention analysis – board review copy (final).xlsx"
          description="2.4 MB · Owned by you"
          actions={
            <>
              <Button>
                <ChatRound size={16} aria-hidden="true" />
                Use in chat
              </Button>
              <Button
                variant="outline"
                disabled={downloading}
                aria-busy={downloading}
                onClick={() => {
                  setDownloading(true);
                  setTimeout(() => setDownloading(false), 1500);
                }}
              >
                <Download size={16} aria-hidden="true" />
                {downloading ? 'Downloading…' : 'Download'}
              </Button>
              <Button variant="outline" size="icon" aria-label="More file actions">
                <MoreH size={16} aria-hidden="true" />
              </Button>
            </>
          }
        />
      </Frame>
      <Frame title="Back link" example="back">
        <PageHeader title="Import skill" back={link('Back to skills', '#skills')} />
      </Frame>
      <Frame title="Back link with description and action" example="back-action">
        <PageHeader
          title="New agent"
          description="Give it a role. Choose its access. Review before it starts."
          back={link('Back to agents', '#agents')}
          actions={<Button variant="outline">Create in chat</Button>}
        />
      </Frame>
      <Frame title="Back link with status" example="back-badge">
        <PageHeader
          title="Weekly pipeline digest"
          description="Start tasks with this agent. Managers set up how it runs and who can use it."
          back={link('Back to agents', '#agents')}
          actions={<Badge variant="success">Active</Badge>}
        />
      </Frame>
      <Frame title="Back link with ghost action" example="back-ghost">
        <PageHeader
          title="Spring launch"
          back={link('Back to projects', '#projects')}
          actions={
            <Button variant="ghost" size="sm">
              <Settings size={16} aria-hidden="true" />
              Edit project
            </Button>
          }
        />
      </Frame>
      <Frame title="Parent breadcrumb" example="parent">
        <PageHeader
          title="Customer accounts"
          parent={link('Tables', '#tables')}
          actions={
            <>
              <Button variant="outline" size="sm">
                Change fields in chat
              </Button>
              <Button variant="outline" size="icon-sm" aria-label="More table options">
                <MoreH size={16} aria-hidden="true" />
              </Button>
            </>
          }
        />
      </Frame>
      <Frame title="Back, parent, and page actions" example="back-parent">
        <PageHeader
          title={<span>Garden notes</span>}
          parent={link('Projects', '#projects')}
          back={link('Back to examples', '#examples')}
        />
        <PageActions>
          <Button variant="outline">Local page action</Button>
        </PageActions>
      </Frame>
    </div>
  );
}

export function PageHeaderFocus() {
  const heading = useRef<HTMLHeadingElement>(null);
  const [done, setDone] = useState(false);
  return (
    <Frame title="Focusable title" example="focus">
      <PageHeader
        titleRef={heading}
        titleId="skills-heading"
        focusable
        title="Skills"
        description="Reusable procedures. Skills never grant tools or permissions."
        actions={
          <Button
            onClick={() => {
              setDone(true);
              heading.current?.focus();
            }}
          >
            Import skill
          </Button>
        }
      />
      <p role="status" className="page-demo-note">
        {done ? 'Skill imported. Focus moved to the Skills heading.' : ''}
      </p>
    </Frame>
  );
}

type ShellPage = 'chats' | 'table' | 'project' | 'teams' | 'calendar';

export function PageHeaderChrome() {
  const [page, setPage] = useState<ShellPage>('table');
  const [tabTitle, setTabTitle] = useState(false);
  return (
    <section className="page-demo-playground" aria-label="App header example">
      <div className="page-demo-toolbar">
        <label>
          Page
          <DocsSelect
            label="Page"
            value={page}
            items={[
              { value: 'chats', label: 'Chats' },
              { value: 'table', label: 'Table' },
              { value: 'project', label: 'Project settings' },
              { value: 'teams', label: 'Teams' },
              { value: 'calendar', label: 'Calendar' },
            ]}
            onValueChange={setPage}
          />
        </label>
        <button
          type="button"
          className="page-demo-toggle"
          aria-pressed={tabTitle}
          onClick={() => setTabTitle(value => !value)}
        >
          Update tab title
        </button>
      </div>
      <div className="page-demo-stage" data-shell>
        <Shell workspace="Northwind" documentTitle={tabTitle}>
          <div className="page-demo-content">
            {page === 'chats' ? (
              <PageHeader
                title="Chats"
                description="Only you can see these chats. Most recently active first."
                actions={
                  <Button nativeButton={false} render={<a href="#chat" onClick={e => e.preventDefault()} />}>
                    New chat
                  </Button>
                }
              />
            ) : page === 'table' ? (
              <PageHeader
                title="Customer accounts"
                parent={link('Tables', '#tables')}
                actions={
                  <>
                    <Button variant="outline" size="sm">
                      Change fields in chat
                    </Button>
                    <Button variant="outline" size="icon-sm" aria-label="More table options">
                      <MoreH size={16} aria-hidden="true" />
                    </Button>
                  </>
                }
              />
            ) : page === 'project' ? (
              <PageHeader title="Edit project" back={link('Spring launch', '#projects/spring-launch')} />
            ) : page === 'teams' ? (
              <>
                <PageHeader
                  titleId="governance-heading"
                  focusable
                  title="Teams"
                  description="Group members so you can grant access once per team."
                />
                <PageActions>
                  <Button>New team</Button>
                </PageActions>
              </>
            ) : (
              <PageHeader
                title="Calendar"
                actions={
                  <>
                    <span className="page-demo-wide-only">
                      <Button variant="ghost" size="md" aria-label="Calendar commands">
                        <Search size={14} aria-hidden="true" />
                        Search
                      </Button>
                    </span>
                    <Button size="md">
                      <Add size={14} aria-hidden="true" />
                      Create
                    </Button>
                  </>
                }
              />
            )}
            <div className="page-demo-placeholder" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </Shell>
      </div>
    </section>
  );
}
