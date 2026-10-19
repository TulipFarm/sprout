// @vitest-environment jsdom
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarSection,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
  type SidebarProps,
  type SidebarProviderProps,
} from "../packages/sprout/src/components/sidebar.js";

const realMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = realMatchMedia;
});
const mobile = () => {
  window.matchMedia = vi.fn(
    () =>
      ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      }) as never,
  );
};

function App({
  provider,
  sidebar,
}: {
  provider?: Partial<SidebarProviderProps>;
  sidebar?: Partial<SidebarProps>;
}) {
  return (
    <SidebarProvider {...provider}>
      <Sidebar {...sidebar}>
        <SidebarHeader>
          <SidebarInput aria-label="Search" />
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  icon={<svg />}
                  badge={3}
                  isActive
                  tooltip="Home"
                >
                  Home
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  nativeButton={false}
                  render={<a href="#docs" />}
                  isActive
                  tooltip={{ children: "Docs", className: "x" }}
                >
                  Docs
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarSection label="Projects">
                <SidebarMenuSubButton>Garden</SidebarMenuSubButton>
              </SidebarSection>
              <SidebarSection label="Teams" open onOpenChange={() => {}}>
                <SidebarMenuAction>More</SidebarMenuAction>
              </SidebarSection>
            </SidebarMenu>
            <SidebarMenuSkeleton />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      <SidebarTrigger />
      <input aria-label="Field" />
    </SidebarProvider>
  );
}

const trigger = () => screen.getByRole("button", { name: "Toggle sidebar" });
const panel = () => document.querySelector("[data-sprout-sidebar]")!;
const press = (target: EventTarget, init: KeyboardEventInit) =>
  fireEvent.keyDown(target, { key: "b", ...init });

describe("Sidebar in the DOM", () => {
  it("collapses to icons with the trigger and the keyboard shortcut", () => {
    render(<App />);
    expect(panel().getAttribute("data-state")).toBe("expanded");
    fireEvent.click(trigger());
    expect(panel().getAttribute("data-state")).toBe("collapsed");
    press(document.body, { ctrlKey: true });
    expect(panel().getAttribute("data-state")).toBe("expanded");
    press(document.body, { metaKey: true, repeat: true });
    press(document.body, { metaKey: true, altKey: true });
    press(document.body, { key: "x", metaKey: true });
    press(document.body, {});
    press(screen.getByRole("textbox", { name: "Field" }), { metaKey: true });
    expect(panel().getAttribute("data-state")).toBe("expanded");
    press(screen.getByRole("button", { name: "Home" }), { metaKey: true });
    expect(panel().getAttribute("data-state")).toBe("collapsed");
    expect(
      screen.getByRole("button", { name: "Expand Teams", hidden: true }),
    ).toBeTruthy();
  });

  it("ignores the shortcut when disabled, prevented, or from another provider", () => {
    const onOpenChange = vi.fn();
    render(
      <>
        <App provider={{ open: true, onOpenChange, keyboardShortcut: false }} />
        <SidebarProvider data-testid="other">
          <button type="button">Other</button>
        </SidebarProvider>
      </>,
    );
    press(document.body, { metaKey: true });
    press(screen.getByRole("button", { name: "Other" }), { metaKey: true });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Toggle sidebar" })[0]!,
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(panel().getAttribute("data-state")).toBe("expanded");
  });

  it("lets a trigger click handler cancel the toggle", () => {
    render(
      <SidebarProvider>
        <Sidebar collapsible="offcanvas" />
        <SidebarTrigger onClick={(event) => event.preventDefault()} />
        <SidebarTrigger aria-label="Real" />
      </SidebarProvider>,
    );
    fireEvent.click(trigger());
    expect(panel().hasAttribute("data-offcanvas")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Real" }));
    expect(panel().hasAttribute("data-offcanvas")).toBe(true);
  });

  it("opens and closes sections", () => {
    const onOpenChange = vi.fn();
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Expand Projects" }));
    expect(
      screen.getByRole("button", { name: "Collapse Projects" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Collapse Teams" }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("opens as a drawer on mobile and closes after following a link", async () => {
    mobile();
    const onOpenMobileChange = vi.fn();
    render(
      <App provider={{ onOpenMobileChange }} sidebar={{ side: "right" }} />,
    );
    fireEvent.click(trigger());
    expect(onOpenMobileChange).toHaveBeenCalledWith(true);
    const docs = await screen.findByRole("link", { name: "Docs" });
    expect(docs.getAttribute("aria-current")).toBe("page");
    fireEvent.click(docs, { metaKey: true });
    expect(onOpenMobileChange).toHaveBeenCalledTimes(1);
    fireEvent.click(docs);
    expect(onOpenMobileChange).toHaveBeenLastCalledWith(false);
  });

  it("stays a panel on mobile when not collapsible", () => {
    mobile();
    render(
      <App
        provider={{ openMobile: false }}
        sidebar={{ collapsible: "none" }}
      />,
    );
    expect(panel().getAttribute("data-collapsible")).toBe("none");
  });

  it("throws outside the provider and outside the sidebar", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSidebar())).toThrow(/SidebarProvider/);
    expect(() =>
      render(
        <SidebarProvider>
          <SidebarMenuAction />
        </SidebarProvider>,
      ),
    ).toThrow(/inside Sidebar/);
  });
});
