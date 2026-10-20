import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSection,
} from '../../packages/sprout/src/components/sidebar.js';
import { setTheme, settle, themes } from './support.js';

const Icon = () => (
  <svg viewBox="0 0 16 16">
    <rect x="3" y="3" width="10" height="10" fill="none" stroke="currentColor" />
  </svg>
);

it.each(themes)('sidebar %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div data-testid="shot" style={{ display: 'inline-grid', background: 'var(--sprout-canvas)' }}>
      <SidebarProvider style={{ height: 300 }}>
        <Sidebar label="Workspace navigation">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton icon={<Icon />} isActive badge={3}>
                    Overview
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton icon={<Icon />}>Files</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarSection label="Projects" defaultOpen icon={<Icon />}>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton>Website refresh</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarSection>
                <SidebarMenuItem>
                  <SidebarMenuButton icon={<Icon />} disabled>
                    Integrations
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`sidebar-${theme}-${mode}`);
});
