import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@tulipfarm/sprout/sidebar";
import { Button as LocalButton } from "./components/ui/button";

export function App() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton nativeButton={false} render={<a href="/" />}>
                Overview
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <main>
        <SidebarTrigger />
        <LocalButton>Existing control</LocalButton>
      </main>
    </SidebarProvider>
  );
}
