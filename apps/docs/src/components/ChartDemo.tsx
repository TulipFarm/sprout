import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartBar } from "reicon-react/icons/ChartBar";
import { Globe } from "reicon-react/icons/Globe";
import { Tasks } from "reicon-react/icons/Tasks";
import { Button } from "@tulipfarm/sprout/button";
import { CanvasSection } from "@tulipfarm/sprout/canvas";
import {
  CategoryChart,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  UsageChart,
  chartColor,
  type ChartConfig,
  type UsageDay,
  type UsageSeries,
} from "@tulipfarm/sprout/chart";
import { StatePanel } from "@tulipfarm/sprout/state-panel";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import "../styles/chart-demo.css";

function Example({
  title,
  description,
  testId,
  children,
}: {
  title: string;
  description: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section
      className="chart-demo-card"
      aria-label={title}
      data-testid={testId}
    >
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="chart-demo-card-body">{children}</div>
    </section>
  );
}

/* ---------- Workspace credits: the Credits page adapter ---------- */

type Split = "model" | "agent" | "activity";
type Range = 7 | 30;
type View = "data" | "empty" | "loading" | "error";
type CreditRow = {
  date: string;
  modelId: string;
  activity: string;
  agentName: string | null;
  credits: number;
  calls: number;
};
type Group = { id: string; label: string; credits: number; calls: number };

const models = [
  "claude-sonnet-4.5",
  "gpt-5",
  "gemini-2.5-pro",
  "claude-haiku-4.5",
  "gpt-5-mini",
  "mistral-large",
  "llama-4-maverick",
];
const weights = [9, 6, 4, 3, 2, 0.6, 0.3];
const activities = ["chat", "agent", "table-search", "knowledge-ingest"];
const agents = ["Inbox triage", "Release notes writer", null];

const days = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 9, 17 - 29 + index));
  return date.toISOString().slice(0, 10);
});

const creditRows: CreditRow[] = days.flatMap((date, day) =>
  models.flatMap((modelId, model) => {
    const step = (day * 7 + model * 13) % 11;
    if (step < 2) return [];
    const credits = Math.round(((step * weights[model]!) / 4) * 100) / 100;
    const activity = activities[(day + model) % activities.length]!;
    return [
      {
        date,
        modelId,
        activity,
        agentName: activity === "agent" ? agents[(day + model) % 3]! : null,
        credits,
        calls: Math.ceil(credits * 3),
      },
    ];
  }),
);

const splits: { value: Split; label: string }[] = [
  { value: "model", label: "Model" },
  { value: "agent", label: "Agent" },
  { value: "activity", label: "Activity" },
];
const colored = 5;

const activityLabel = (activity: string) =>
  activity === "chat"
    ? "Normal chat"
    : activity === "agent"
      ? "Agent"
      : activity === "table-search"
        ? "Table search"
        : activity.startsWith("knowledge-")
          ? "Knowledge"
          : "Other runtime";
const format = (value: number) =>
  value > 0 && value < 0.01
    ? "<0.01"
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const percent = (value: number, total: number) =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";

function groupOf(row: CreditRow, split: Split) {
  if (split === "model") return row.modelId;
  if (split === "activity") return activityLabel(row.activity);
  if (row.agentName) return row.agentName;
  return row.activity === "agent"
    ? "Other agents"
    : row.activity === "chat"
      ? "Default assistant"
      : activityLabel(row.activity);
}

function useUsage(rows: CreditRow[], split: Split, range: Range) {
  return useMemo(() => {
    const window = days.slice(-range);
    const first = window[0] ?? "";
    const groups = new Map<string, Group>();
    for (const row of rows) {
      if (row.date < first) continue;
      const id = groupOf(row, split);
      const group = groups.get(id) ?? { id, label: id, credits: 0, calls: 0 };
      groups.set(id, {
        ...group,
        credits: group.credits + row.credits,
        calls: group.calls + row.calls,
      });
    }
    const ranked = [...groups.values()].sort(
      (a, b) => b.credits - a.credits || a.label.localeCompare(b.label),
    );
    const slot = new Map(
      ranked.map((group, index) => [group.id, Math.min(index, colored)]),
    );
    const series: UsageSeries[] = ranked
      .slice(0, colored)
      .map((group, index) => ({
        key: `s${index}`,
        label: group.label,
        color: `var(--sprout-chart-${index + 1})`,
      }));
    if (ranked.length > colored)
      series.push({
        key: `s${colored}`,
        label: `${ranked.length - colored} more`,
        color: "var(--sprout-muted)",
      });
    const byDay = new Map(window.map((date) => [date, { date } as UsageDay]));
    for (const row of rows) {
      const day = byDay.get(row.date);
      if (!day || row.credits === 0) continue;
      const key = `s${slot.get(groupOf(row, split))}`;
      day[key] = (Number(day[key]) || 0) + row.credits;
    }
    const total = ranked.reduce((sum, group) => sum + group.credits, 0);
    return { chart: [...byDay.values()], series, ranked, slot, total };
  }, [rows, split, range]);
}

const swatch = (slot: number) =>
  ({
    "--chart-demo-swatch":
      slot < colored
        ? `var(--sprout-chart-${slot + 1})`
        : "var(--sprout-muted)",
  }) as CSSProperties;

export function ChartCredits() {
  const [split, setSplit] = useState<Split>("model");
  const [range, setRange] = useState<Range>(30);
  const [view, setView] = useState<View>("data");
  const usage = useUsage(view === "empty" ? [] : creditRows, split, range);
  const splitLabel =
    splits.find((item) => item.value === split)?.label ?? "Model";
  return (
    <Example
      testId="chart-credits"
      title="Workspace credits"
      description="UsageChart stacks credits by day. The top five groups take chart colors and the rest fold into one muted “N more” series. Hover or focus the chart, then use the arrow keys."
    >
      <div className="chart-demo-toolbar">
        <span className="chart-demo-eyebrow">Preview</span>
        <ToggleGroup
          aria-label="Preview state"
          variant="outline"
          size="sm"
          spacing={0}
          value={[view]}
          onValueChange={(value) => {
            if (value[0]) setView(value[0] as View);
          }}
        >
          <ToggleGroupItem value="data">Usage</ToggleGroupItem>
          <ToggleGroupItem value="empty">Empty</ToggleGroupItem>
          <ToggleGroupItem value="loading">Loading</ToggleGroupItem>
          <ToggleGroupItem value="error">Error</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <section
        className="chart-demo-credits"
        aria-labelledby="chart-usage-heading"
      >
        <div className="chart-demo-credits-head">
          <div className="chart-demo-credits-title">
            <h4 id="chart-usage-heading">Workspace usage</h4>
            {view === "data" || view === "empty" ? (
              <p>
                <strong>{format(usage.total)}</strong> credits in the last{" "}
                {range} days · <span>{format(usage.total / range)}</span> a day
                · UTC
              </p>
            ) : null}
          </div>
          <div className="chart-demo-credits-controls">
            <ToggleGroup
              aria-label="Split usage by"
              variant="outline"
              size="sm"
              spacing={0}
              value={[split]}
              onValueChange={(value) => {
                if (value[0]) setSplit(value[0] as Split);
              }}
            >
              {splits.map((item) => (
                <ToggleGroupItem key={item.value} value={item.value}>
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ToggleGroup
              aria-label="Time range"
              variant="outline"
              size="sm"
              spacing={0}
              value={[String(range)]}
              onValueChange={(value) => {
                if (value[0]) setRange(Number(value[0]) as Range);
              }}
            >
              {([7, 30] as const).map((count) => (
                <ToggleGroupItem key={count} value={String(count)}>
                  {count}d
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
        {view === "loading" ? (
          <StatePanel
            kind="loading"
            heading="h4"
            title="Loading usage"
            description="Counting model calls from chats, agents, and knowledge."
          />
        ) : view === "error" ? (
          <StatePanel
            kind="error"
            heading="h4"
            title="Couldn’t load usage"
            description="The credits service didn’t answer. Your balance is unchanged."
          >
            <Button variant="outline" size="sm" onClick={() => setView("data")}>
              Try again
            </Button>
          </StatePanel>
        ) : usage.ranked.length === 0 ? (
          <StatePanel
            kind="empty"
            heading="h4"
            icon={ChartBar}
            title={`No usage in the last ${range} days`}
            description="Model calls from chats, agents, and knowledge appear here by day. Send a chat message to start using your credits."
          >
            <Button size="sm" onClick={() => setView("data")}>
              New chat
            </Button>
          </StatePanel>
        ) : (
          <>
            <UsageChart
              days={usage.chart}
              series={usage.series}
              locale="en-US"
              title={`Workspace credits by ${splitLabel.toLowerCase()}, last ${range} days`}
            />
            <div className="chart-demo-table-wrap">
              <table className="chart-demo-table">
                <caption>
                  Usage by {splitLabel.toLowerCase()} · Last {range} days
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{splitLabel}</th>
                    <th scope="col">Calls</th>
                    <th scope="col">Credits</th>
                    <th scope="col">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.ranked.map((group) => (
                    <tr key={group.id}>
                      <td>
                        <span className="chart-demo-group">
                          <span
                            aria-hidden="true"
                            className="chart-demo-swatch"
                            style={swatch(usage.slot.get(group.id) ?? colored)}
                          />
                          <span>{group.label}</span>
                        </span>
                      </td>
                      <td>{group.calls.toLocaleString("en-US")}</td>
                      <td>{format(group.credits)}</td>
                      <td className="chart-demo-muted">
                        {percent(group.credits, usage.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </Example>
  );
}

/* ---------- Canvas chart results: the chat canvas adapter ---------- */

type CanvasChart = {
  title: string;
  category: string;
  series: UsageSeries[];
  rows: Record<string, number | string>[];
};

const canvasCharts: CanvasChart[] = [
  {
    title: "Open tasks by project",
    category: "project",
    series: [
      { key: "open", label: "Open", color: "var(--sprout-chart-1)" },
      { key: "blocked", label: "Blocked", color: "var(--sprout-chart-5)" },
      { key: "review", label: "In review", color: "var(--sprout-chart-2)" },
    ],
    rows: [
      { project: "Spring launch", open: 14, blocked: 2, review: 5 },
      { project: "Onboarding revamp", open: 9, blocked: 4, review: 3 },
      { project: "Billing migration", open: 6, blocked: 1, review: 7 },
      { project: "Help center", open: 11, blocked: 0, review: 2 },
      { project: "Mobile app", open: 4, blocked: 3, review: 1 },
      { project: "Partner portal", open: 8, blocked: 2, review: 4 },
    ],
  },
  {
    title: "Deals won by region",
    category: "region",
    series: [{ key: "won", label: "Won", color: "var(--sprout-chart-2)" }],
    rows: [
      { region: "EMEA", won: 23 },
      { region: "North America", won: 31 },
      { region: "APAC", won: 17 },
      { region: "LATAM", won: 9 },
    ],
  },
];

export function ChartCanvas() {
  return (
    <Example
      testId="chart-canvas"
      title="Chart results in the canvas"
      description="A chat canvas item carries rows, a category key, and series. CategoryChart draws side-by-side bars per category with a legend."
    >
      <div className="chart-demo-canvas">
        {canvasCharts.map((chart) => (
          <div key={chart.title} className="chart-demo-canvas-item">
            <CanvasSection title={chart.title}>
              <CategoryChart
                rows={chart.rows}
                category={chart.category}
                series={chart.series}
                title={chart.title}
              />
            </CanvasSection>
          </div>
        ))}
      </div>
    </Example>
  );
}

/* ---------- Playground: the internal playground adapter ---------- */

const playgroundSeries: UsageSeries[] = [
  { key: "tasks", label: "Tasks", color: "var(--sprout-chart-1)" },
  { key: "notes", label: "Notes", color: "var(--sprout-chart-2)" },
];

const indicators = ["dot", "line", "dashed"] as const;

export function ChartPlayground() {
  return (
    <Example
      testId="chart-playground"
      title="Playground"
      description="Daily usage where one day has no notes, three projects with a legend, and the three tooltip indicators."
    >
      <div className="chart-demo-stack">
        <div className="chart-demo-block" data-testid="chart-daily">
          <p className="chart-demo-eyebrow">Daily usage</p>
          <UsageChart
            locale="en-US"
            title="Tasks and notes by day"
            days={[
              { date: "2026-10-10", tasks: 4, notes: 3 },
              { date: "2026-10-11", tasks: 7, notes: 2 },
              { date: "2026-10-12", tasks: 5, notes: 6 },
              { date: "2026-10-13", tasks: 8, notes: null },
            ]}
            series={playgroundSeries}
          />
        </div>
        <div className="chart-demo-block" data-testid="chart-categories">
          <p className="chart-demo-eyebrow">Categories and legend</p>
          <CategoryChart
            rows={[
              { project: "Meadow", tasks: 12, notes: 4 },
              { project: "Garden", tasks: 8, notes: 6 },
              { project: "Orchard", tasks: 5, notes: 9 },
            ]}
            category="project"
            series={playgroundSeries}
          />
        </div>
        <div className="chart-demo-block">
          <p className="chart-demo-eyebrow">Tooltip indicators</p>
          <div className="chart-demo-indicators">
            {indicators.map((indicator) => (
              <div
                key={indicator}
                className="chart-demo-indicator"
                data-testid={`chart-indicator-${indicator}`}
              >
                <code>{indicator}</code>
                <ChartContainer
                  config={{
                    tasks: { label: "Tasks", color: "var(--sprout-chart-1)" },
                  }}
                >
                  <div>
                    <ChartTooltipContent
                      active
                      label="Meadow"
                      indicator={indicator}
                      payload={[
                        {
                          graphicalItemId: "example-tasks",
                          name: "tasks",
                          dataKey: "tasks",
                          value: 12,
                          color: "var(--sprout-chart-1)",
                        },
                      ]}
                    />
                    <ChartLegendContent
                      payload={[
                        {
                          value: "Tasks",
                          dataKey: "tasks",
                          color: "var(--sprout-chart-1)",
                        },
                      ]}
                    />
                  </div>
                </ChartContainer>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Example>
  );
}

/* ---------- Tooltip and legend options ---------- */

const optionConfig = {
  chat: { label: "Normal chat", color: "var(--sprout-chart-1)", icon: Globe },
  agent: { label: "Agent", color: "var(--sprout-chart-4)", icon: Tasks },
} satisfies ChartConfig;

const optionPayload = [
  {
    graphicalItemId: "option-chat",
    name: "chat",
    dataKey: "chat",
    value: 128.5,
    color: "var(--sprout-chart-1)",
  },
  {
    graphicalItemId: "option-agent",
    name: "agent",
    dataKey: "agent",
    value: 42.25,
    color: "var(--sprout-chart-4)",
  },
];

const plainConfig = {
  chat: { label: "Normal chat", color: "var(--sprout-chart-1)" },
  agent: { label: "Agent", color: "var(--sprout-chart-4)" },
} satisfies ChartConfig;

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="chart-demo-indicator">
      <code>{label}</code>
      {children}
    </div>
  );
}

export function ChartOptions() {
  return (
    <Example
      testId="chart-options"
      title="Tooltip and legend options"
      description="ChartTooltipContent and ChartLegendContent read labels, colors, and icons from the config."
    >
      <div className="chart-demo-indicators" data-testid="chart-option-tips">
        <Tip label="two series · line">
          <ChartContainer config={plainConfig}>
            <div>
              <ChartTooltipContent
                active
                label="Oct 14"
                indicator="line"
                payload={optionPayload}
              />
            </div>
          </ChartContainer>
        </Tip>
        <Tip label="hideLabel">
          <ChartContainer config={plainConfig}>
            <div>
              <ChartTooltipContent active hideLabel payload={optionPayload} />
            </div>
          </ChartContainer>
        </Tip>
        <Tip label="hideIndicator">
          <ChartContainer config={plainConfig}>
            <div>
              <ChartTooltipContent
                active
                label="Oct 14"
                hideIndicator
                payload={optionPayload}
              />
            </div>
          </ChartContainer>
        </Tip>
        <Tip label="icons + legend">
          <ChartContainer config={optionConfig}>
            <div>
              <ChartTooltipContent
                active
                label="Oct 14"
                payload={optionPayload}
              />
              <ChartLegendContent
                payload={[
                  {
                    value: "chat",
                    dataKey: "chat",
                    color: "var(--sprout-chart-1)",
                  },
                  {
                    value: "agent",
                    dataKey: "agent",
                    color: "var(--sprout-chart-4)",
                  },
                ]}
              />
            </div>
          </ChartContainer>
        </Tip>
        <Tip label="formatter">
          <ChartContainer config={plainConfig}>
            <div>
              <ChartTooltipContent
                active
                label="Oct 14"
                payload={optionPayload}
                formatter={(value, name) => (
                  <span className="chart-demo-formatted">
                    <span>
                      {plainConfig[name as keyof typeof plainConfig]?.label}
                    </span>
                    <strong>{format(Number(value))} credits</strong>
                  </span>
                )}
              />
            </div>
          </ChartContainer>
        </Tip>
      </div>
    </Example>
  );
}

/* ---------- Custom composition ---------- */

const trendConfig = {
  chats: {
    label: "Chats",
    theme: { light: "#245cba", dark: "#9cbdff" },
    icon: Globe,
  },
  agentRuns: {
    label: "Agent runs",
    theme: { light: "#7c4eb0", dark: "#c6a4ed" },
    icon: Tasks,
  },
} satisfies ChartConfig;

const trend = [
  { week: "Sep 1", chats: 184, agentRuns: 42 },
  { week: "Sep 8", chats: 201, agentRuns: 57 },
  { week: "Sep 15", chats: 176, agentRuns: 71 },
  { week: "Sep 22", chats: 232, agentRuns: 88 },
  { week: "Sep 29", chats: 248, agentRuns: 96 },
  { week: "Oct 6", chats: 239, agentRuns: 121 },
];

export function ChartComposition() {
  return (
    <Example
      testId="chart-composition"
      title="Custom chart"
      description="ChartContainer around any Recharts chart. Theme colors switch with dark mode; the legend sits on top and shows config icons."
    >
      <ChartContainer config={trendConfig} className="chart-demo-trend">
        <LineChart
          data={trend}
          accessibilityLayer
          title="Chats and agent runs by week"
          margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis
            width={40}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <ChartLegend
            verticalAlign="top"
            itemSorter={null}
            content={<ChartLegendContent />}
          />
          {(["chats", "agentRuns"] as const).map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={chartColor(key)}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </Example>
  );
}

export default function ChartDemo() {
  return (
    <div className="chart-demo">
      <ChartCredits />
      <ChartCanvas />
      <ChartPlayground />
    </div>
  );
}
