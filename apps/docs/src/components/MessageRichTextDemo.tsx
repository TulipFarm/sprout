import type { ReactNode } from 'react';
import { FileRenderersProvider } from '@tulipfarm/sprout/file-viewer';
import { Message, MessageBubble, MessageContent } from '@tulipfarm/sprout/message';
import { MessageRichText, type MessageRichTextReference } from '@tulipfarm/sprout/message-rich-text';
import type { RichTextValue } from '@tulipfarm/sprout/rich-text-editor';
import { agents, fileSuggestions, skills, useIntegrations } from './ChatInputDemo';
import { renderers } from './FileViewerDemo';
import '../styles/message-actions-demo.css';

type Node = NonNullable<RichTextValue['content']>[number];

const sources = { agent: agents, skill: skills, file: fileSuggestions };
const find = (kind: string, id: string) => sources[kind as keyof typeof sources]?.find(item => item.id === id);
const resolveReference = ({ kind, id }: MessageRichTextReference) => find(kind, id);
const text = (value: string, marks?: Node['marks']): Node => ({ type: 'text', text: value, marks });
const reference = (kind: 'agent' | 'skill' | 'file', id: string): Node => ({
  type: 'chatReference',
  attrs: { kind, id, label: find(kind, id)?.label ?? id, description: find(kind, id)?.description ?? null },
});
const doc = (...content: Node[]): RichTextValue => ({ type: 'doc', content: [{ type: 'paragraph', content }] });

const sent = doc(
  reference('agent', 'researcher'),
  text(' compare '),
  reference('file', 'Q3-forecast.csv'),
  text(' with last quarter, then post the '),
  text('three biggest changes', [{ type: 'bold' }]),
  text(' to Slack and open a ticket in Jira.'),
);

function Frame({ id, title, note, children }: { id: string; title: string; note: string; children: ReactNode }) {
  return (
    <section className="ma-demo-frame" aria-label={title} data-recipe={id}>
      <div className="ma-demo-bar">
        <div className="ma-demo-bar-text">
          <span className="ma-demo-bar-title">{title}</span>
          <span className="ma-demo-note">{note}</span>
        </div>
      </div>
      <div className="ma-demo-body">{children}</div>
    </section>
  );
}

function Sent({ accounts }: { accounts?: Record<string, string> }) {
  const integrations = useIntegrations(false);
  return (
    <FileRenderersProvider renderers={renderers}>
      <Message align="end">
        <MessageContent>
          <MessageBubble variant="secondary">
            <MessageRichText
              value={sent}
              keywords={integrations.list}
              accounts={accounts}
              resolveReference={resolveReference}
            />
          </MessageBubble>
        </MessageContent>
      </Message>
    </FileRenderersProvider>
  );
}

export function MessageRichTextPlayground() {
  return (
    <Frame
      id="playground"
      title="Sent message"
      note="Hover or focus a chip: apps show the account the message used, agents what they do, and files a preview. Click the file to open it."
    >
      <Sent accounts={{ slack: 'acme-partners.slack.com', jira: 'TulipFarm' }} />
    </Frame>
  );
}

export function MessageRichTextAccounts() {
  return (
    <Frame
      id="accounts"
      title="Current accounts"
      note="Without saved accounts, Slack shows the account in use now and Jira, which is not connected, shows the composer\u2019s warning."
    >
      <Sent />
    </Frame>
  );
}
