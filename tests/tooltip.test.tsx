import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as sprout from '../packages/sprout/src/index.js';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../packages/sprout/src/components/tooltip.js';
import { Button } from '../packages/sprout/src/components/button.js';
import { BrandStack } from '../packages/sprout/src/components/brand-icon.js';
import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '../packages/sprout/src/components/sidebar.js';

function tag(html: string, slot: string) {
  const match = html.match(new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`));
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe('Tooltip', () => {
  it('is exported from the package root', () => {
    expect(sprout.Tooltip).toBe(Tooltip);
    expect(sprout.TooltipContent).toBe(TooltipContent);
    expect(sprout.TooltipProvider).toBe(TooltipProvider);
    expect(sprout.TooltipTrigger).toBe(TooltipTrigger);
  });

  it('renders a Button trigger with its variant and size and no popup while closed', () => {
    const html = renderToString(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            className="extra"
            render={<Button variant="ghost" size="icon-sm" aria-label="Attach files" />}
          >
            +
          </TooltipTrigger>
          <TooltipContent>Attach files from your device</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    const trigger = tag(html, 'tooltip-trigger');
    expect(trigger).toMatch(/^<button/);
    expect(trigger).toContain('aria-label="Attach files"');
    expect(trigger).toMatch(/class="[^"]*extra/);
    expect(trigger).not.toContain('aria-describedby');
    expect(html).not.toContain('role="tooltip"');
    expect(html).not.toContain('Attach files from your device');
  });

  it('defaults to a plain button trigger', () => {
    const html = renderToString(
      <Tooltip>
        <TooltipTrigger aria-label="About Rates">i</TooltipTrigger>
        <TooltipContent>Credits per 1M input / output tokens.</TooltipContent>
      </Tooltip>,
    );
    expect(tag(html, 'tooltip-trigger')).toMatch(/^<button[^>]*type="button"/);
  });

  it('renders nothing for hidden content', () => {
    const html = renderToString(
      <Tooltip defaultOpen>
        <TooltipTrigger>Home</TooltipTrigger>
        <TooltipContent hidden>Home</TooltipContent>
      </Tooltip>,
    );
    expect(html).not.toContain('tooltip-content');
  });

  it('keeps BrandStack tiles as tooltip triggers', () => {
    const html = renderToString(
      <BrandStack
        brands={[
          { brand: 'slack', name: 'Slack' },
          { brand: 'notion', name: 'Notion' },
        ]}
      />,
    );
    expect(html.match(/data-slot="tooltip-trigger"/g)).toHaveLength(2);
  });

  it('names a collapsed SidebarMenuButton from a string or object tooltip', () => {
    const html = renderToString(
      <SidebarProvider defaultOpen={false} keyboardShortcut={false}>
        <Sidebar collapsible="icon">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Home">Home</SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={{ children: 'Jump to… ⌘K', side: 'bottom' }}>Jump to…</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>,
    );
    expect(html).toContain('aria-label="Home"');
    expect(html).toContain('aria-label="Jump to… ⌘K"');
    expect(html.match(/data-slot="tooltip-trigger"/g)).toHaveLength(2);
  });
});
