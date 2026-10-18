import { useRef, useState, type ReactNode } from "react";
import { CheckSquare } from "reicon-react/icons/CheckSquare";
import { ChevronRight } from "reicon-react/icons/ChevronRight";
import { Clock3 } from "reicon-react/icons/Clock3";
import { Route } from "reicon-react/icons/Route";
import { Alert, AlertDescription } from "@tulipfarm/sprout/alert";
import { Badge, type BadgeVariant } from "@tulipfarm/sprout/badge";
import { BrandIcon } from "@tulipfarm/sprout/brand-icon";
import { Button } from "@tulipfarm/sprout/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardSize,
  type CardSurface,
} from "@tulipfarm/sprout/card";
import { PageContent } from "@tulipfarm/sprout/page-content";
import { StatePanel } from "@tulipfarm/sprout/state-panel";
import "../styles/card-demo.css";
import DocsSelect from "./DocsSelect";

function Example({
  title,
  description,
  controls,
  children,
}: {
  title: string;
  description: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card-demo-example" aria-label={title}>
      <header>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {controls && <div className="card-demo-controls">{controls}</div>}
      </header>
      <div className="card-demo-body">{children}</div>
    </section>
  );
}

type Parts = "full" | "header-content" | "content";

function Playground() {
  const [size, setSize] = useState<CardSize>("default");
  const [surface, setSurface] = useState<CardSurface>("default");
  const [parts, setParts] = useState<Parts>("full");
  const [reviewed, setReviewed] = useState(false);
  return (
    <Example
      title="Playground"
      description="Change the size, surface, and parts of one card."
      controls={
        <>
          <DocsSelect<CardSize>
            label="Size"
            value={size}
            items={[
              { value: "default", label: "Default" },
              { value: "sm", label: "Small" },
            ]}
            onValueChange={setSize}
          />
          <DocsSelect<CardSurface>
            label="Surface"
            value={surface}
            items={[
              { value: "default", label: "Default surface" },
              { value: "raised", label: "Raised surface" },
            ]}
            onValueChange={setSurface}
          />
          <DocsSelect<Parts>
            label="Parts"
            value={parts}
            items={[
              { value: "full", label: "Header, content, footer" },
              { value: "header-content", label: "Header and content" },
              { value: "content", label: "Content only" },
            ]}
            onValueChange={setParts}
          />
        </>
      }
    >
      <div className="card-demo-stage">
        <Card size={size} surface={surface} data-testid="playground-card">
          {parts !== "content" && (
            <CardHeader>
              <CardTitle>Meadow project</CardTitle>
              <CardDescription>Spring planting plan · 12 beds</CardDescription>
              <CardAction>
                <Badge variant={reviewed ? "secondary" : "success"}>
                  {reviewed ? "Reviewed" : "Active"}
                </Badge>
              </CardAction>
            </CardHeader>
          )}
          <CardContent>
            <p className="card-demo-text">
              {reviewed
                ? "All tasks are reviewed. Next check-in is Monday."
                : "Three tasks are ready to review."}
            </p>
          </CardContent>
          {parts === "full" && (
            <CardFooter>
              <Button
                variant="outline"
                size={size === "sm" ? "sm" : "default"}
                onClick={() => setReviewed((value) => !value)}
              >
                {reviewed ? "Reopen tasks" : "Review tasks"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </Example>
  );
}

function Sizes() {
  return (
    <Example
      title="Sizes"
      description="Default uses 16px spacing and a 16px title. Small uses 12px spacing and a 14px title for dense grids."
    >
      <div className="card-demo-grid">
        <Card size="default" data-testid="size-default">
          <CardHeader>
            <CardTitle render={<h4 />}>Meadow project</CardTitle>
            <CardDescription>
              A fictional garden project · default
            </CardDescription>
            <CardAction>
              <Badge variant="success">Active</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="card-demo-text">Three tasks are ready to review.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline">Review example</Button>
          </CardFooter>
        </Card>
        <Card size="sm" data-testid="size-sm">
          <CardHeader>
            <CardTitle render={<h4 />}>Seed order</CardTitle>
            <CardDescription>Due Friday · 4 suppliers · sm</CardDescription>
            <CardAction>
              <Badge variant="warning">Needs input</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="card-demo-text">
              Two suppliers replied with new prices.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm">
              Compare prices
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Example>
  );
}

function Surfaces() {
  return (
    <Example
      title="Surfaces"
      description="Default sits flat on the page. Raised lifts settings panels that hold their own lists and states."
    >
      <div className="card-demo-grid">
        <Card data-testid="surface-default">
          <CardHeader>
            <CardTitle>Garden notes</CardTitle>
            <CardDescription>
              Nested content inherits the standard page spacing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="card-demo-text">
              Beds 1–4 water at 06:00. Beds 5–8 skip today after rain.
            </p>
          </CardContent>
        </Card>
        <Card surface="raised" data-testid="surface-raised">
          <CardContent>
            <div className="card-demo-stack">
              <div className="card-demo-row">
                <BrandIcon brand="github" size="sm" />
                <p className="card-demo-strong">@alex-meadow</p>
                <Badge variant="success">Connected</Badge>
              </div>
              <p className="card-demo-muted">
                Personal and organization repositories you can access are
                available to import.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Example>
  );
}

type AccountState = "active" | "reconnect" | "authorizing" | "disconnected";
interface Account {
  id: string;
  login: string | null;
  state: AccountState;
}
type AccountsView = "ready" | "loading" | "empty" | "error" | "unavailable";

const sampleAccounts: Account[] = [
  { id: "a1", login: "alex-meadow", state: "active" },
  { id: "a2", login: "meadow-labs", state: "reconnect" },
  { id: "a3", login: null, state: "authorizing" },
];

const accountBadge: Record<AccountState, [BadgeVariant, string]> = {
  active: ["success", "Connected"],
  reconnect: ["warning", "Reconnect required"],
  authorizing: ["warning", "Not connected"],
  disconnected: ["secondary", "Disconnected"],
};

function AccountsPanel() {
  const [view, setView] = useState<AccountsView>("ready");
  const [accounts, setAccounts] = useState(sampleAccounts);
  const [managing, setManaging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const update = (id: string, state: AccountState, message: string) => {
    setAccounts((current) =>
      current.map((account) =>
        account.id === id ? { ...account, state } : account,
      ),
    );
    setNotice(message);
  };
  const retry = (
    <Button
      variant="outline"
      onClick={() => {
        setView("ready");
        setNotice(null);
      }}
    >
      Check GitHub accounts
    </Button>
  );
  return (
    <Example
      title="Settings panel"
      description="A raised card with only CardContent holds an account list and its loading, empty, error, and unavailable states."
      controls={
        <DocsSelect<AccountsView>
          label="Account state"
          value={view}
          items={[
            { value: "ready", label: "Ready" },
            { value: "loading", label: "Loading" },
            { value: "empty", label: "Empty" },
            { value: "error", label: "Error" },
            { value: "unavailable", label: "Unavailable" },
          ]}
          onValueChange={(next) => {
            setView(next);
            setNotice(null);
          }}
        />
      }
    >
      <section
        aria-label="Personal GitHub accounts"
        className="card-demo-panel"
      >
        <Card surface="raised" data-testid="accounts-card">
          <CardContent>
            <div className="card-demo-stack">
              {view === "loading" && (
                <div role="status" className="card-demo-stack-sm">
                  <p className="card-demo-text">Loading GitHub accounts…</p>
                  <span className="card-demo-skeleton" aria-hidden="true" />
                  <span className="card-demo-skeleton" aria-hidden="true" />
                </div>
              )}
              {view === "error" && (
                <StatePanel
                  kind="error"
                  heading="h4"
                  title="Could not load GitHub accounts"
                  description="The request timed out before GitHub answered."
                >
                  {retry}
                </StatePanel>
              )}
              {view === "unavailable" && (
                <StatePanel
                  kind="unavailable"
                  heading="h4"
                  title="GitHub account access unavailable"
                  description="Your session or workspace access changed. Sign in again or return to a workspace you can access."
                >
                  {retry}
                </StatePanel>
              )}
              {view === "empty" && (
                <StatePanel
                  kind="empty"
                  heading="h4"
                  title="No personal GitHub accounts"
                  description="Connect your GitHub login to use the personal and organization repositories you can access."
                >
                  <Button
                    onClick={() =>
                      setNotice("GitHub sign-in opens here in a real app.")
                    }
                  >
                    Connect GitHub account
                  </Button>
                </StatePanel>
              )}
              {notice && (
                <Alert role="status">
                  <AlertDescription>{notice}</AlertDescription>
                </Alert>
              )}
              {view === "ready" && (
                <>
                  <div className="card-demo-split">
                    <ul
                      aria-label="GitHub accounts"
                      className="card-demo-accounts"
                    >
                      {accounts.map((account) => {
                        const [variant, label] = accountBadge[account.state];
                        return (
                          <li key={account.id}>
                            <div className="card-demo-row">
                              <BrandIcon brand="github" size="sm" />
                              <p className="card-demo-strong card-demo-break">
                                {account.login
                                  ? `@${account.login}`
                                  : "Unfinished integration"}
                              </p>
                              <Badge variant={variant}>{label}</Badge>
                            </div>
                            {account.state !== "active" && (
                              <div className="card-demo-stack-sm">
                                <p className="card-demo-muted">
                                  {account.login
                                    ? "Reconnect with this same GitHub login to restore access."
                                    : "GitHub sign-in was not completed. Finish connecting or dismiss this attempt."}
                                </p>
                                <div className="card-demo-actions">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      update(
                                        account.id,
                                        "active",
                                        `${account.login ? `@${account.login}` : "The new account"} is connected.`,
                                      )
                                    }
                                  >
                                    {account.login
                                      ? `Reconnect @${account.login}`
                                      : "Finish connecting"}
                                  </Button>
                                  {!account.login && (
                                    <Button
                                      variant="ghost"
                                      onClick={() => {
                                        setAccounts((current) =>
                                          current.filter(
                                            (item) => item.id !== account.id,
                                          ),
                                        );
                                        setNotice(
                                          "The unfinished attempt was dismissed.",
                                        );
                                      }}
                                    >
                                      Dismiss attempt
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-expanded={managing}
                      aria-controls="card-demo-account-management"
                      onClick={() => setManaging((value) => !value)}
                    >
                      {managing ? "Hide account settings" : "Manage accounts"}
                    </Button>
                  </div>
                  {managing && (
                    <section
                      id="card-demo-account-management"
                      aria-label="Account settings"
                      className="card-demo-manage"
                    >
                      <p className="card-demo-muted">
                        Need a different login? Connect another account.
                        Reconnecting keeps the same identity.
                      </p>
                      <div className="card-demo-actions">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setNotice(
                              "GitHub sign-in opens here in a real app.",
                            )
                          }
                        >
                          Connect another GitHub account
                        </Button>
                      </div>
                      {accounts
                        .filter((account) => account.login)
                        .map((account) => (
                          <div
                            key={account.id}
                            className="card-demo-manage-row"
                          >
                            <p className="card-demo-strong card-demo-break">
                              @{account.login}
                            </p>
                            <Button
                              variant="destructive"
                              disabled={account.state === "disconnected"}
                              onClick={() =>
                                update(
                                  account.id,
                                  "disconnected",
                                  `@${account.login} was disconnected.`,
                                )
                              }
                            >
                              Disconnect @{account.login}
                            </Button>
                          </div>
                        ))}
                      <p className="card-demo-caption">
                        Disconnecting stops new calls. Your GitHub repositories
                        are not changed.
                      </p>
                    </section>
                  )}
                </>
              )}
              <p className="card-demo-caption">
                Local demo · Sample GitHub data · No real GitHub changes
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </Example>
  );
}

type SourcesView = "imported" | "empty" | "stale";
interface Source {
  name: string;
  detail: string;
  status: [BadgeVariant, string];
}

const sampleSources: Source[] = [
  {
    name: "alex-meadow/garden-plans",
    detail: "Docs and issues · Synced 5 minutes ago",
    status: ["success", "Synced"],
  },
  {
    name: "meadow-labs/seed-catalog-with-a-very-long-repository-name",
    detail: "Docs only · 120 of 340 files",
    status: ["info", "Syncing"],
  },
];

function KnowledgePanel() {
  const [view, setView] = useState<SourcesView>("imported");
  const [sources, setSources] = useState(sampleSources);
  const [saved, setSaved] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const list = view === "empty" ? [] : sources;
  const add = () => {
    const name = "alex-meadow/volunteer-rota";
    setView("imported");
    setSources((current) =>
      current.some((source) => source.name === name)
        ? current
        : [
            ...current,
            {
              name,
              detail: "Docs and issues · Queued",
              status: ["secondary", "Queued"],
            },
          ],
    );
    setSaved(name);
    heading.current?.focus();
  };
  return (
    <Example
      title="Content list"
      description="A raised card with a focusable heading, a bordered list, a stale-data alert, and an empty prompt."
      controls={
        <DocsSelect<SourcesView>
          label="Source state"
          value={view}
          items={[
            { value: "imported", label: "Imported" },
            { value: "empty", label: "Empty" },
            { value: "stale", label: "Stale" },
          ]}
          onValueChange={(next) => {
            setView(next);
            setSaved(null);
          }}
        />
      }
    >
      <section
        aria-label="GitHub knowledge sources"
        className="card-demo-panel"
      >
        <Card surface="raised" data-testid="knowledge-card">
          <CardContent>
            <div className="card-demo-stack">
              <div className="card-demo-split">
                <h4 ref={heading} tabIndex={-1} className="card-demo-heading">
                  Repositories in Knowledge
                </h4>
                {list.length > 0 && (
                  <Button onClick={add}>Add repositories</Button>
                )}
              </div>
              <p className="card-demo-muted card-demo-prose">
                Import selected content so you can find it in Knowledge.
                Connecting an account does not import anything automatically.
              </p>
              {saved && (
                <p role="status" className="card-demo-text">
                  {saved} was saved. Import continues in the background when you
                  leave this page.
                </p>
              )}
              {view === "stale" && (
                <div className="card-demo-stack-sm">
                  <Alert variant="destructive">
                    <AlertDescription>
                      Could not update source status. The last confirmed list is
                      shown; management is paused until status is checked.
                    </AlertDescription>
                  </Alert>
                  <div className="card-demo-actions">
                    <Button
                      variant="outline"
                      onClick={() => setView("imported")}
                    >
                      Retry loading GitHub sources
                    </Button>
                  </div>
                </div>
              )}
              {list.length === 0 ? (
                <div className="card-demo-empty">
                  <p className="card-demo-strong">
                    No repositories imported yet
                  </p>
                  <p className="card-demo-muted">
                    Choose repositories, what to import, and who can see the
                    content.
                  </p>
                  <div className="card-demo-actions">
                    <Button onClick={add}>Add repositories</Button>
                  </div>
                </div>
              ) : (
                <ul aria-label="Existing imports" className="card-demo-sources">
                  {list.map((source) => (
                    <li key={source.name}>
                      <div className="card-demo-source-text">
                        <p className="card-demo-strong card-demo-break">
                          {source.name}
                        </p>
                        <p className="card-demo-caption">{source.detail}</p>
                      </div>
                      <Badge variant={source.status[0]}>
                        {source.status[1]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </Example>
  );
}

interface PendingItem {
  id: string;
  kind: "task" | "workflow";
  title: string;
  status: [BadgeVariant, string];
}

const pendingItems: PendingItem[] = [
  {
    id: "irrigation",
    kind: "task",
    title:
      "Confirm the greenhouse irrigation quote before the supplier deadline on Friday afternoon",
    status: ["warning", "Waiting for approval"],
  },
  {
    id: "rota",
    kind: "task",
    title: "Draft volunteer rota",
    status: ["secondary", "In progress"],
  },
  {
    id: "seed-order",
    kind: "workflow",
    title: "Approve spring seed order",
    status: ["warning", "Needs your input"],
  },
];

function PendingCards() {
  const [message, setMessage] = useState("");
  return (
    <Example
      title="Pending items"
      description="Small cards in an equal-height grid. The title is a full-width link and the footer stays at the bottom."
    >
      <div className="card-demo-pending">
        {pendingItems.map((item) => {
          const Icon = item.kind === "task" ? CheckSquare : Route;
          const open = (event: { preventDefault(): void }) => {
            event.preventDefault();
            setMessage(`Opened ${item.title}.`);
          };
          return (
            <article
              key={item.id}
              aria-label={item.title}
              className="card-demo-pending-item"
            >
              <Card size="sm">
                <CardHeader>
                  <Button
                    variant="ghost"
                    size="card-title"
                    nativeButton={false}
                    title={item.title}
                    onClick={open}
                    render={<a href={`#${item.kind}-${item.id}`} />}
                  >
                    <span className="card-demo-kind" data-kind={item.kind}>
                      <Icon size={14} aria-hidden="true" />
                    </span>
                    <span className="card-demo-clamp">{item.title}</span>
                  </Button>
                </CardHeader>
                <div className="card-demo-push">
                  <CardFooter>
                    <div className="card-demo-footer-row">
                      <Badge variant={item.status[0]}>{item.status[1]}</Badge>
                      {item.kind === "task" ? (
                        <Button
                          variant="outline"
                          size="calendar"
                          onClick={() =>
                            setMessage(
                              `Reserved 09:00 tomorrow for ${item.title}.`,
                            )
                          }
                        >
                          <Clock3 size={14} aria-hidden="true" />
                          Reserve time
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="calendar"
                          aria-label={`Review ${item.title}`}
                          nativeButton={false}
                          onClick={open}
                          render={<a href={`#review-${item.id}`} />}
                        >
                          Review
                          <ChevronRight size={14} aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </div>
              </Card>
            </article>
          );
        })}
      </div>
      <p role="status" className="card-demo-muted card-demo-status">
        {message}
      </p>
    </Example>
  );
}

function Regions() {
  return (
    <Example
      title="Inside page regions"
      description="Cards nest in PageContent and in side panels without extra wrappers."
    >
      <div className="card-demo-grid">
        <div className="card-demo-frame" aria-label="Page content" role="group">
          <PageContent>
            <p className="card-demo-text">
              This is the shared page content region.
            </p>
            <Card>
              <CardHeader>
                <CardTitle>Garden notes</CardTitle>
                <CardDescription>
                  Nested content inherits the standard page spacing.
                </CardDescription>
              </CardHeader>
              <CardContent>Sample local content.</CardContent>
            </Card>
          </PageContent>
        </div>
        <div className="card-demo-frame" aria-label="Side panel" role="group">
          <div className="card-demo-frame-bar">
            <span className="card-demo-strong">Garden plan</span>
            <span className="card-demo-caption">Local example</span>
          </div>
          <div className="card-demo-frame-body">
            <Card>
              <CardHeader>
                <CardTitle>Plant spring bulbs</CardTitle>
                <CardDescription>Owner: Alex Meadow</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="success">Ready</Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Example>
  );
}

export default function CardDemo() {
  return (
    <div id="card-demo" className="card-demo">
      <Playground />
      <Sizes />
      <Surfaces />
      <AccountsPanel />
      <KnowledgePanel />
      <PendingCards />
      <Regions />
    </div>
  );
}
