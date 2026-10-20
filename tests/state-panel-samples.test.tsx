import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import * as samples from '../packages/sprout/src/components/state-panel-samples.js';
import * as statePanel from '../packages/sprout/src/components/state-panel.js';
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
} from '../packages/sprout/src/components/state-panel-samples.js';

const cloudExports = [
  'AgentTasksSample',
  'AgentsSample',
  'ChatsSample',
  'CreateInChatSample',
  'FilesSample',
  'GrantsSample',
  'IntegrationsSample',
  'InvitationsSample',
  'MembersSample',
  'ModelsSample',
  'ProjectsSample',
  'RecordsSample',
  'SkillsSample',
  'TablesSample',
  'TeamsSample',
  'WorkflowsSample',
];

const count = (html: string, pattern: RegExp) => html.match(new RegExp(pattern, 'g'))?.length ?? 0;
const crumbs = (html: string) => [...html.matchAll(/sprout-state-sample-crumb"[^>]*>([^<]*)</g)].map(m => m[1]);
const tabs = (html: string) => [...html.matchAll(/sprout-state-sample-tab"[^>]*>([^<]*)</g)].map(m => m[1]);
const heads = (html: string) => {
  const head = html.match(/sprout-state-sample-head">(.*?)<\/div>/)?.[1] ?? '';
  return [...head.matchAll(/data-size="(\w+)">([^<]*)</g)].map(m => `${m[2]}:${m[1]}`);
};
const badges = (html: string) =>
  [...html.matchAll(/sprout-badge sprout-badge-(\w+)[^>]*>([^<]*)</g)].map(m => `${m[1]}:${m[2]}`);

describe('State panel samples', () => {
  it('exports exactly the Cloud samples from State Panel and the root', () => {
    expect(Object.keys(samples).sort()).toEqual(cloudExports);
    for (const name of cloudExports) {
      const sample = (samples as Record<string, unknown>)[name];
      expect((statePanel as Record<string, unknown>)[name]).toBe(sample);
      expect((sprout as Record<string, unknown>)[name]).toBe(sample);
    }
  });

  it('draws Chats with two tabs and five icon-tile rows', () => {
    const html = renderToString(<ChatsSample />);
    expect(html).toMatch(/^<div data-slot="state-sample"/);
    expect(crumbs(html)).toEqual(['Chats']);
    expect(tabs(html)).toEqual(['Active', 'Archived']);
    expect(count(html, /sprout-state-sample-item"/)).toBe(5);
    expect(count(html, /data-slot="state-sample-icon-tile"/)).toBe(5);
    expect(html).toContain('Which invoices are overdue this week?');
    expect(html).toContain('data-tone="muted"');
  });

  it('draws Files with folders and spreadsheet, PDF, and document icons', () => {
    const html = renderToString(<FilesSample />);
    expect(crumbs(html)).toEqual(['Files', 'My files']);
    expect(tabs(html)).toEqual([]);
    expect(count(html, /data-slot="state-sample-icon-tile"/)).toBe(2);
    expect(count(html, /data-slot="file-type-icon"/)).toBe(3);
    expect(html).toContain('data-kind="sheet"');
    expect(html).toContain('data-kind="pdf"');
    expect(html).toContain('data-kind="document"');
  });

  it('draws Agents and Agent tasks with small agent avatars and status badges', () => {
    const agents = renderToString(<AgentsSample />);
    expect(crumbs(agents)).toEqual(['Agents']);
    expect(count(agents, /data-agent-avatar=""/)).toBe(5);
    expect(count(agents, /data-size="sm"/)).toBeGreaterThanOrEqual(5);
    expect(badges(agents)).toEqual([
      'success:Active',
      'success:Active',
      'secondary:Draft',
      'success:Active',
      'secondary:Draft',
    ]);
    const tasks = renderToString(<AgentTasksSample />);
    expect(crumbs(tasks)).toEqual(['My agent tasks']);
    expect(count(tasks, /data-agent-avatar=""/)).toBe(4);
    expect(badges(tasks)).toEqual([
      'warning:Needs review',
      'success:Completed',
      'success:Completed',
      'secondary:Pending',
    ]);
  });

  it('draws Projects as two grouped text-only lists', () => {
    const html = renderToString(<ProjectsSample />);
    expect(count(html, /sprout-state-panel-samples-group/)).toBe(2);
    expect(html).toContain('Active projects');
    expect(html).toContain('Archived projects');
    expect(count(html, /data-slot="state-sample-list"/)).toBe(2);
    expect(count(html, /sprout-state-sample-leading/)).toBe(0);
    expect(badges(html)).toEqual(['secondary:Archived']);
  });

  it('draws Skills with Workspace and Built-in tabs', () => {
    const html = renderToString(<SkillsSample />);
    expect(tabs(html)).toEqual(['Workspace', 'Built-in']);
    expect(badges(html)).toEqual(['success:Approved', 'success:Approved', 'warning:In review', 'secondary:Draft']);
  });

  it('draws the table samples with Cloud column sizes', () => {
    const workflows = renderToString(<WorkflowsSample />);
    expect(heads(workflows)).toEqual(['Workflow:wide', 'Trigger:default', 'Status:narrow']);
    expect(count(workflows, /sprout-state-sample-row"/)).toBe(5);
    const tables = renderToString(<TablesSample />);
    expect(heads(tables)).toEqual(['Table:wide', 'Fields:narrow', 'Rows:narrow']);
    expect(count(tables, /sprout-state-sample-row"/)).toBe(6);
    for (const tone of ['blue', 'green', 'orange', 'violet', 'red', 'teal'])
      expect(tables).toContain(`data-tone="${tone}"`);
    const members = renderToString(<MembersSample />);
    expect(crumbs(members)).toEqual(['Settings', 'Members']);
    expect(heads(members)).toEqual(['Member:wide', 'Role:narrow', 'Teams:default']);
    expect(badges(members)).toEqual([
      'info:Admin',
      'secondary:Member',
      'secondary:Member',
      'secondary:Member',
      'info:Admin',
    ]);
    const invitations = renderToString(<InvitationsSample />);
    expect(crumbs(invitations)).toEqual(['Settings', 'Members', 'Invitations']);
    expect(heads(invitations)).toEqual(['Email:wide', 'Status:narrow', 'Email delivery:default']);
    expect(count(invitations, /data-tone="link"/)).toBe(4);
    const grants = renderToString(<GrantsSample />);
    expect(crumbs(grants)).toEqual(['Settings', 'Table access']);
    expect(tabs(grants)).toEqual(['Sales', 'Finance', 'Support']);
    expect(heads(grants)).toEqual(['Table:wide', 'Read:narrow', 'Edit:narrow']);
    expect(count(grants, /sprout-badge-success/)).toBe(6);
  });

  it('draws Integrations and Models with small brand icons', () => {
    const integrations = renderToString(<IntegrationsSample />);
    expect(tabs(integrations)).toEqual(['Connected', 'All']);
    expect(count(integrations, /data-brand="/)).toBe(5);
    expect(badges(integrations).at(-1)).toBe('warning:Needs attention');
    const models = renderToString(<ModelsSample />);
    expect(crumbs(models)).toEqual(['Settings', 'Models']);
    expect(badges(models)).toEqual(['success:Enabled', 'success:Enabled', 'secondary:Off', 'secondary:Off']);
  });

  it('draws Teams with medium marks and no trailing slot', () => {
    const html = renderToString(<TeamsSample />);
    expect(crumbs(html)).toEqual(['Settings', 'Teams']);
    expect(count(html, /data-slot="state-sample-mark"[^>]*data-size="md"/)).toBe(4);
    expect(count(html, /sprout-state-sample-trailing/)).toBe(0);
  });

  it('draws Create in chat as a request, reply, and nested schema table', () => {
    const html = renderToString(<CreateInChatSample />);
    expect(crumbs(html)).toEqual(['New chat']);
    expect(html).toContain('sprout-state-panel-samples-bubble');
    expect(html).toContain('<strong>Suppliers</strong>');
    expect(html).toMatch(/sprout-state-panel-samples-schema"><div data-slot="state-sample-table"/);
    expect(heads(html)).toEqual(['Field:wide', 'Type:default']);
    expect(count(html, /sprout-state-sample-row"/)).toBe(4);
  });

  it('builds Rows columns from the first three fields', () => {
    const four = renderToString(
      <RecordsSample table="Suppliers" fields={['Name', 'Contact email', 'Payment terms', 'Region']} />,
    );
    expect(crumbs(four)).toEqual(['Tables', 'Suppliers']);
    expect(heads(four)).toEqual(['Name:wide', 'Contact email:default', 'Payment terms:default']);
    expect(count(four, /data-slot="state-sample-bar"/)).toBe(18);
    expect(count(four, /data-slot="state-sample-mark"/)).toBe(6);
    const two = renderToString(<RecordsSample table="Tickets" fields={['Subject', 'Priority']} />);
    expect(heads(two)).toEqual(['Subject:wide', 'Priority:default']);
    expect(count(two, /data-slot="state-sample-bar"/)).toBe(12);
    const none = renderToString(<RecordsSample table="Untitled" fields={[]} />);
    expect(heads(none)).toEqual(['Row:wide']);
    expect(count(none, /data-slot="state-sample-bar"/)).toBe(6);
  });

  it('passes window props through and keeps nothing focusable', () => {
    const html = renderToString(<ModelsSample label="Preview" className="extra" data-testid="m" />);
    expect(html).toContain('class="sprout-state-sample extra"');
    expect(html).toContain('data-testid="m"');
    expect(html).toContain('<span class="sprout-state-sample-label">Preview</span>');
    const rows = renderToString(<RecordsSample table="T" fields={['A']} id="records" />);
    expect(rows).toContain('id="records"');
    for (const Sample of [
      ChatsSample,
      FilesSample,
      AgentsSample,
      ProjectsSample,
      AgentTasksSample,
      SkillsSample,
      WorkflowsSample,
      TablesSample,
      CreateInChatSample,
      IntegrationsSample,
      ModelsSample,
      MembersSample,
      TeamsSample,
      InvitationsSample,
      GrantsSample,
    ]) {
      const out = renderToString(<Sample />);
      expect(out).toContain('<span class="sprout-state-sample-label">Example</span>');
      expect(out).not.toMatch(/<(a|button|input)\b|tabindex/);
    }
  });
});
