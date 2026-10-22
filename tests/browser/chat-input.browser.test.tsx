import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  ChatInput,
  type ChatInputStatus,
  type ChatInputSuggestion,
} from '../../packages/sprout/src/components/chat-input.js';
import type { AttachmentFile } from '../../packages/sprout/src/components/attachment.js';
import type { RichTextValue } from '../../packages/sprout/src/components/rich-text-editor.js';
import { TooltipProvider } from '../../packages/sprout/src/components/tooltip.js';
import { axeViolations, setTheme, settle, themes } from './support.js';

const emptyDoc = (): RichTextValue => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

const rows = (...labels: string[]): ChatInputSuggestion[] => labels.map(label => ({ id: label, label }));
const search = (items: ChatInputSuggestion[]) => (query: string) =>
  items.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));

function Composer() {
  const [value, setValue] = useState(emptyDoc);
  const [status, setStatus] = useState<ChatInputStatus>('idle');
  const [mode, setMode] = useState<string | null>(null);
  const [model, setModel] = useState('claude-opus');
  const [project, setProject] = useState('onboarding');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  return (
    <TooltipProvider>
      <div style={{ padding: 16, maxWidth: 720 }}>
        <ChatInput
          value={value}
          onValueChange={setValue}
          onSend={() => {
            setValue(emptyDoc());
            setStatus('streaming');
          }}
          onStop={() => setStatus('idle')}
          status={status}
          agents={search(rows('Researcher', 'Designer'))}
          skills={search(rows('prd', 'usability-review'))}
          files={search(rows('financial-dashboard.png', 'pricing-2026.pdf'))}
          attachments={attachments}
          onRemoveAttachment={id => setAttachments(all => all.filter(file => file.id !== id))}
          attachActions={[
            {
              id: 'url',
              label: 'Add a web page',
              onSelect: () =>
                setAttachments(all => [
                  ...all,
                  {
                    id: 'web',
                    name: 'sprout.dev',
                    mediaType: 'text/html',
                    size: 'Web page',
                    state: 'ready',
                  },
                ]),
            },
          ]}
          modes={[
            { id: 'plan', label: 'Plan', color: '#3b9ef5' },
            { id: 'research', label: 'Deep research', color: '#6366f1' },
          ]}
          mode={mode}
          onModeChange={setMode}
          projects={[
            { id: 'none', label: 'No project' },
            { id: 'onboarding', label: 'Onboarding redesign' },
          ]}
          project={project}
          onProjectChange={setProject}
          models={[
            { id: 'claude-opus', label: 'Claude Opus 5.5', brand: 'claude' },
            { id: 'gpt', label: 'GPT-5.5', brand: 'openai' },
          ]}
          model={model}
          onModelChange={setModel}
          prompts={[
            {
              id: 'clarify',
              label: 'Clarify user problem',
              prompt: 'Help me clarify the user problem we are solving.',
            },
          ]}
        />
      </div>
    </TooltipProvider>
  );
}

const editor = () => page.getByRole('textbox');

describe('ChatInput in a real browser', () => {
  it.each(themes)('%s %s passes axe', async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Composer />);
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it('triggers insert agent, skill and file references', async () => {
    await render(<Composer />);
    await editor().click();
    await userEvent.keyboard('Ask @res');
    const agents = page.getByRole('listbox', { name: 'Agents' });
    await expect.element(agents).toBeVisible();
    await expect.element(editor()).toHaveAttribute('aria-controls', agents.element().id);
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('to run /pr');
    await expect.element(page.getByRole('listbox', { name: 'Skills' })).toBeVisible();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('on #fin');
    await expect.element(page.getByRole('listbox', { name: 'Files' })).toBeVisible();
    await userEvent.keyboard('{Tab}');
    const chips = () => [...editor().element().querySelectorAll('[data-chat-reference]')].map(chip => chip.textContent);
    await expect.poll(chips).toEqual(['@Researcher', '/prd', '#financial-dashboard.png']);
    expect(editor().element().querySelectorAll('[data-chat-reference][id]')).toHaveLength(0);
    await userEvent.keyboard('@');
    await expect.element(agents).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
  });

  it('formats markdown and links emails as you type', async () => {
    await render(<Composer />);
    await editor().click();
    await userEvent.keyboard('**bold** mail bob@example.com ');
    await expect.poll(() => editor().element().querySelector('strong')?.textContent).toBe('bold');
    await expect.poll(() => editor().element().querySelector('a[href="mailto:bob@example.com"]')).not.toBeNull();
  });

  it('a prompt fills the box, Enter sends, and Stop ends streaming', async () => {
    const screen = await render(<Composer />);
    const send = screen.getByRole('button', { name: 'Send message' });
    await expect.element(send).toBeDisabled();
    await screen.getByRole('button', { name: 'Clarify user problem' }).click();
    await expect.poll(() => editor().element().textContent).toContain('clarify the user problem');
    await expect.element(send).toBeEnabled();
    await editor().click();
    await userEvent.keyboard('{Enter}');
    const stop = screen.getByRole('button', { name: 'Stop' });
    await expect.element(stop).toBeVisible();
    expect(screen.container.querySelector('[data-slot="chat-input"]')!.getAttribute('data-status')).toBe('streaming');
    await stop.click();
    await expect.element(screen.getByRole('button', { name: 'Send message' })).toBeVisible();
  });

  it('model, mode and attach menus open, pick and close', async () => {
    const screen = await render(<Composer />);
    await screen.getByRole('combobox', { name: 'Model: Claude Opus 5.5' }).click();
    await page.getByRole('option', { name: /GPT-5\.5/ }).click();
    await expect.element(screen.getByRole('combobox', { name: 'Model: GPT-5.5' })).toBeVisible();
    await screen.getByRole('button', { name: 'Mode: Default' }).click();
    await page.getByRole('menuitemradio', { name: /Deep research/ }).click();
    await screen.getByRole('button', { name: 'Turn off Deep research' }).click();
    await expect.element(screen.getByRole('button', { name: 'Mode: Default' })).toBeVisible();
    await screen.getByRole('button', { name: 'Add files and more' }).click();
    await page.getByRole('menuitem', { name: /Add a web page/ }).click();
    await expect.element(screen.getByText('sprout.dev')).toBeVisible();
  });

  it('fits a 390px phone', async () => {
    await page.viewport(390, 800);
    await render(<Composer />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
