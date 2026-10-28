const version = 'v0.9.1';

/** Builds the A2UI messages for one surface in `sprout/basic@1`. */
export function surfaceMessages(surfaceId: string, components: Record<string, unknown>[], data?: unknown) {
  return [
    { version, createSurface: { surfaceId, catalogId: 'sprout/basic@1' } },
    { version, updateComponents: { surfaceId, components } },
    ...(data === undefined ? [] : [{ version, updateDataModel: { surfaceId, path: '/', value: data } }]),
  ];
}

const memory = [9.8, 10.1, 10.4, 10.2, 10.8, 10.9, 11.0, 11.2];

export const dateExample = surfaceMessages('date', [
  { id: 'root', component: 'Row', children: ['date', 'time', 'week'] },
  { id: 'date', component: 'Metric', label: 'Date', value: 'Thu, 18 Sep 2026' },
  { id: 'time', component: 'Metric', label: 'Time', value: '14:32', caption: 'Europe/London' },
  { id: 'week', component: 'Metric', label: 'Week', value: '38', caption: 'ISO week' },
]);

export const memoryExample = surfaceMessages(
  'memory',
  [
    { id: 'root', component: 'Column', children: ['summary', 'used', 'chart'] },
    {
      id: 'summary',
      component: 'Text',
      text: 'You are using **11.2 GB** of 16 GB. Chrome uses the most.',
    },
    {
      id: 'used',
      component: 'Metric',
      label: 'Memory used',
      value: '11.2 GB',
      change: { value: '0.4 GB', direction: 'up', tone: 'negative', label: 'in 10 min' },
      trend: { path: '/trend' },
    },
    {
      id: 'chart',
      component: 'Chart',
      type: 'area',
      title: 'Memory in the last 10 minutes',
      category: 'time',
      series: [{ key: 'used', label: 'Used' }],
      rows: { path: '/samples' },
      unit: 'GB',
    },
  ],
  {
    trend: memory,
    samples: memory.map((used, index) => ({ time: `14:${String(22 + index).padStart(2, '0')}`, used })),
  },
);

const apps = [
  { app: 'Chrome', memory: 4.1, share: 37 },
  { app: 'Slack', memory: 1.6, share: 14 },
  { app: 'Docker', memory: 1.4, share: 13 },
  { app: 'VS Code', memory: 1.2, share: 11 },
  { app: 'Figma', memory: 0.9, share: 8 },
  { app: 'Spotify', memory: 0.4, share: 4 },
  { app: 'Mail', memory: 0.3, share: 3 },
  { app: 'Notes', memory: 0.2, share: 2 },
  { app: 'Terminal', memory: 0.2, share: 2 },
  { app: 'Finder', memory: 0.2, share: 2 },
  { app: 'Calendar', memory: 0.1, share: 1 },
  { app: 'Other', memory: 0.6, share: 5 },
];

export const reportExample = surfaceMessages(
  'report',
  [
    {
      id: 'root',
      component: 'Column',
      gap: 'large',
      children: ['title', 'intro', 'numbers', 'warning', 'tabs', 'details', 'actions'],
    },
    { id: 'title', component: 'Heading', level: 1, text: 'Memory report' },
    {
      id: 'intro',
      component: 'Text',
      text: 'Memory use rose 14% in the last hour. Three apps account for most of it.',
    },
    { id: 'numbers', component: 'Row', children: ['used', 'free', 'swap'] },
    {
      id: 'used',
      component: 'Metric',
      label: 'Used',
      value: '11.2 GB',
      change: { value: '1.4 GB', direction: 'up', tone: 'negative', label: 'in 1 hour' },
      trend: memory,
    },
    { id: 'free', component: 'Metric', label: 'Free', value: '4.8 GB', caption: 'Of 16 GB' },
    {
      id: 'swap',
      component: 'Metric',
      label: 'Swap',
      value: '0 GB',
      change: { value: '0 GB', direction: 'flat', label: 'in 1 hour' },
    },
    {
      id: 'warning',
      component: 'Callout',
      tone: 'warning',
      title: 'Warning: memory is filling up',
      text: 'At this rate, the system starts swapping in about **40 minutes**.',
    },
    {
      id: 'tabs',
      component: 'Tabs',
      tabs: [
        { label: 'By app', child: 'byApp' },
        { label: 'Share', child: 'share' },
        { label: 'Table', child: 'table' },
      ],
    },
    {
      id: 'byApp',
      component: 'Chart',
      type: 'bar',
      title: 'Memory by app',
      category: 'app',
      series: [{ key: 'memory', label: 'Memory' }],
      rows: { path: '/apps' },
      horizontal: true,
      unit: 'GB',
    },
    {
      id: 'share',
      component: 'Chart',
      type: 'donut',
      title: 'Share of memory',
      category: 'app',
      series: [{ key: 'share', label: 'Share (%)' }],
      rows: { path: '/apps' },
    },
    {
      id: 'table',
      component: 'Table',
      label: 'Memory by app',
      columns: [
        { key: 'app', label: 'App' },
        { key: 'memory', label: 'Memory (GB)', align: 'end' },
        { key: 'share', label: 'Share (%)', align: 'end' },
      ],
      rows: { path: '/apps' },
    },
    {
      id: 'details',
      component: 'Details',
      items: [
        { title: 'How this was measured', child: 'method' },
        { title: 'Top processes', child: 'processes' },
      ],
    },
    {
      id: 'method',
      component: 'Text',
      text: 'Sampled every minute from `vm_stat`. See [Apple’s guide](https://support.apple.com/guide/activity-monitor/).',
    },
    { id: 'processes', component: 'List', ordered: true, children: { componentId: 'process', path: '/apps' } },
    { id: 'process', component: 'Text', text: { path: 'app' } },
    { id: 'actions', component: 'Row', align: 'start', children: ['quit', 'watch'] },
    { id: 'quit', component: 'Button', label: 'How do I free memory?', message: 'How do I free memory?' },
    { id: 'watch', component: 'Button', label: 'Alert me at 90%', message: 'Alert me when memory passes 90%.' },
  ],
  { apps },
);

/** The memory reply cut off mid-stream: the chart and its data have not arrived yet. */
export const streamingExample = surfaceMessages('memory', [
  { id: 'root', component: 'Column', children: ['summary', 'used', 'chart'] },
  { id: 'summary', component: 'Text', text: 'You are using **11.2 GB** of 16 GB. Chrome uses the most.' },
  { id: 'used', component: 'Metric', label: 'Memory used', value: '11.2 GB' },
]);

/** A reply with one broken part: the rest still shows. */
export const brokenExample = surfaceMessages('broken', [
  { id: 'root', component: 'Column', children: ['ok', 'bad'] },
  { id: 'ok', component: 'Text', text: 'This part is fine. The next one names a component the catalog does not have.' },
  { id: 'bad', component: 'Map', center: [51.5, -0.1] },
]);
