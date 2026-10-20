import type { ComponentType } from 'react';
import { describe, expect, it, onTestFinished } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../../packages/sprout/src/components/button.js';
import { StatePanel } from '../../packages/sprout/src/components/state-panel.js';
import {
  AgentTasksSample,
  AgentsSample,
  ChatsSample,
  CreateInChatSample,
  FilesSample,
  GrantsSample,
  IntegrationsSample,
  InvitationsSample,
  MembersSample,
  ModelsSample,
  ProjectsSample,
  RecordsSample,
  SkillsSample,
  TablesSample,
  TeamsSample,
  WorkflowsSample,
  type StatePanelSampleProps,
} from '../../packages/sprout/src/components/state-panel-samples.js';
import { axeViolations, setTheme, settle, themes } from './support.js';

const Records = (props: StatePanelSampleProps) => (
  <RecordsSample table="Suppliers" fields={['Name', 'Contact email', 'Payment terms', 'Region']} {...props} />
);

const scenes: [string, ComponentType<StatePanelSampleProps>][] = [
  ['chats', ChatsSample],
  ['files', FilesSample],
  ['agents', AgentsSample],
  ['projects', ProjectsSample],
  ['tasks', AgentTasksSample],
  ['skills', SkillsSample],
  ['workflows', WorkflowsSample],
  ['tables', TablesSample],
  ['records', Records],
  ['create', CreateInChatSample],
  ['integrations', IntegrationsSample],
  ['models', ModelsSample],
  ['members', MembersSample],
  ['teams', TeamsSample],
  ['invitations', InvitationsSample],
  ['grants', GrantsSample],
];

function Gallery({ width = 576 }: { width?: number }) {
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16 }}>
      {scenes.map(([name, Sample]) => (
        <div key={name} data-scene={name} style={{ maxWidth: width, minWidth: 0, overflow: 'hidden' }}>
          <Sample />
        </div>
      ))}
    </div>
  );
}

const scene = (name: string) => document.querySelector<HTMLElement>(`[data-scene="${name}"]`)!;
const texts = (root: ParentNode, selector: string) =>
  [...root.querySelectorAll(selector)].map(node => node.textContent);
const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();

describe('State panel samples in a real browser', () => {
  it.each(themes)('%s %s passes axe with every sample on the page', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Gallery />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('every sample fits a phone without overflowing', async () => {
    await page.viewport(390, 900);
    await render(<Gallery />);
    for (const [name] of scenes) {
      const window = scene(name).querySelector('[data-slot="state-sample"]')!;
      expect(window.scrollWidth, name).toBeLessThanOrEqual(window.clientWidth + 1);
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("draws each Cloud sample's parts", async () => {
    await render(<Gallery />);
    expect(texts(scene('chats'), '.sprout-state-sample-tab')).toEqual(['Active', 'Archived']);
    expect(scene('files').querySelectorAll('[data-slot="file-type-icon"]')).toHaveLength(3);
    expect(scene('agents').querySelectorAll('[data-agent-avatar]')).toHaveLength(5);
    expect(scene('tasks').querySelectorAll('[data-agent-avatar]')).toHaveLength(4);
    expect(texts(scene('projects'), '.sprout-state-panel-samples-group')).toEqual([
      'Active projects',
      'Archived projects',
    ]);
    expect(scene('integrations').querySelectorAll('[data-brand]')).toHaveLength(5);
    expect(scene('models').querySelectorAll('[data-brand]')).toHaveLength(4);
    expect(scene('teams').querySelectorAll('[data-slot="state-sample-mark"][data-size="md"]')).toHaveLength(4);
    expect(scene('invitations').querySelectorAll('[data-tone="link"]')).toHaveLength(4);
    expect(scene('grants').querySelectorAll('.sprout-state-sample-tab')).toHaveLength(3);
    for (const variant of ['success', 'secondary', 'warning', 'info'])
      expect(document.querySelector(`[data-scene] .sprout-badge-${variant}`)?.checkVisibility(), variant).toBe(true);
    expect(
      document.querySelectorAll(
        '[data-slot="state-sample"] a, [data-slot="state-sample"] button, [data-slot="state-sample"] [tabindex]',
      ),
    ).toHaveLength(0);
  });

  it("rows sample follows the table's fields", async () => {
    await render(
      <>
        {(
          [
            ['four', 'Suppliers', ['Name', 'Contact email', 'Payment terms', 'Region']],
            ['two', 'Support tickets', ['Subject', 'Priority']],
            ['one', 'Regions', ['Region']],
            ['none', 'Empty', []],
          ] as const
        ).map(([name, table, fields]) => (
          <div key={name} data-records={name}>
            <RecordsSample table={table} fields={fields} />
          </div>
        ))}
      </>,
    );
    const head = (name: string) => `[data-records="${name}"] .sprout-state-sample-head [data-size]`;
    expect(texts(document, head('four'))).toEqual(['Name', 'Contact email', 'Payment terms']);
    expect(texts(document, head('two'))).toEqual(['Subject', 'Priority']);
    expect(texts(document, head('one'))).toEqual(['Region']);
    expect(texts(document, head('none'))).toEqual(['Row']);
    expect(document.querySelector(head('none'))!.getAttribute('data-size')).toBe('wide');
    expect(document.querySelector('[data-records="two"] .sprout-state-sample-crumb[data-current]')!.textContent).toBe(
      'Support tickets',
    );
    expect(document.querySelectorAll('[data-records="four"] [data-slot="state-sample-bar"]')).toHaveLength(18);
  });

  it('geometry matches Cloud', async () => {
    await page.viewport(1440, 1000);
    // Cloud's sizes assume Tailwind preflight's border-box reset.
    const reset = document.createElement('style');
    reset.textContent = '*, ::before, ::after { box-sizing: border-box; }';
    document.head.append(reset);
    onTestFinished(() => reset.remove());
    await render(<Gallery />);
    expect(box('[data-scene="tables"] .sprout-state-sample-bar').height).toBe(40);
    expect(box('[data-scene="tables"] .sprout-state-sample-row').height).toBe(40);
    expect(box('[data-scene="chats"] .sprout-state-sample-item').height).toBeGreaterThanOrEqual(56);
    expect(box('[data-scene="teams"] [data-slot="state-sample-mark"]').width).toBe(28);
    const avatar = box('[data-scene="agents"] [data-agent-avatar]');
    expect(avatar.width).toBe(avatar.height);
    const chat = box('[data-scene="create"] .sprout-state-panel-samples-chat');
    const bubble = box('[data-scene="create"] .sprout-state-panel-samples-bubble');
    expect(Math.round(chat.right - 16 - bubble.right)).toBe(0);
    expect(bubble.width).toBeLessThanOrEqual(288);
    expect(getComputedStyle(document.querySelector('.sprout-state-panel-samples-bubble')!).borderTopLeftRadius).toBe(
      '12px',
    );
    expect(box('[data-scene="create"] .sprout-state-panel-samples-schema').width).toBeLessThanOrEqual(320);
    expect(getComputedStyle(document.querySelector('.sprout-state-panel-samples-group')!).fontWeight).toBe('500');
  });

  it('long crumbs truncate in a narrow container and labels pass through', async () => {
    await page.viewport(390, 900);
    await render(
      <>
        <div data-props="narrow" style={{ maxWidth: 300, overflow: 'hidden' }}>
          <RecordsSample
            table="Quarterly supplier performance review"
            fields={['Supplier name', 'Primary contact email', 'Payment terms']}
          />
        </div>
        <div data-props="label">
          <ModelsSample label="Preview" />
        </div>
      </>,
    );
    const narrow = document.querySelector<HTMLElement>('[data-props="narrow"]')!;
    const crumb = narrow.querySelector('.sprout-state-sample-crumb[data-current]')!;
    expect(getComputedStyle(crumb).textOverflow).toBe('ellipsis');
    expect(crumb.scrollWidth).toBeGreaterThan(crumb.clientWidth);
    const window = narrow.querySelector('[data-slot="state-sample"]')!;
    expect(window.scrollWidth).toBeLessThanOrEqual(window.clientWidth + 1);
    expect(document.querySelector('[data-props="label"] .sprout-state-sample-label')!.textContent).toBe('Preview');
  });

  it('a StatePanel keeps its sample hidden from assistive tech and inert', async () => {
    const screen = await render(
      <StatePanel
        kind="empty"
        title="No files yet"
        description="Upload files to share them with your agents."
        sample={<FilesSample />}
      >
        <Button>Upload</Button>
      </StatePanel>,
    );
    const sample = document.querySelector<HTMLElement>('[data-slot="state-panel-sample"]')!;
    expect(sample.getAttribute('aria-hidden')).toBe('true');
    expect(sample.inert).toBe(true);
    await expect.element(screen.getByRole('heading', { name: 'No files yet' })).toBeVisible();
    expect(await axeViolations(screen.container)).toEqual([]);
  });
});
