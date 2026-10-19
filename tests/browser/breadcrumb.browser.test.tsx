import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../packages/sprout/src/components/breadcrumb.js";
import { Button } from "../../packages/sprout/src/components/button.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const Home = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 8 8 2l6 6v6H2z" fill="none" stroke="currentColor" />
  </svg>
);

const sr = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
} as const;

function Trail({ dir }: { dir?: "ltr" | "rtl" }) {
  return (
    <Breadcrumb dir={dir} data-testid={dir ?? "trail"}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#home">
            <Home />
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
          <span style={sr}>Higher folders not shown</span>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#projects">Projects</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Meadow</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function HeaderTrail({ title }: { title: string }) {
  return (
    <div
      role="group"
      aria-label="App header"
      style={{ display: "flex", width: "100%", maxWidth: 340, minWidth: 0 }}
    >
      <Breadcrumb>
        <BreadcrumbList wrap={false}>
          <BreadcrumbItem>
            <BreadcrumbLink href="#automations">Automations</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem aria-current="page">
            <h4
              style={{
                margin: 0,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "var(--sprout-text-sm)",
                fontWeight: 500,
              }}
            >
              {title}
            </h4>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

function colorOf(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const slot = (root: Element, name: string) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

describe("Breadcrumb in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe and paints muted links and a text-colored page",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(<Trail />);
      await settle();
      const nav = screen.getByTestId("trail").element();
      expect(getComputedStyle(slot(nav, "breadcrumb-list")).color).toBe(
        colorOf("--sprout-muted"),
      );
      expect(getComputedStyle(slot(nav, "breadcrumb-page")).color).toBe(
        colorOf("--sprout-text"),
      );
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("icons, ellipsis and wrapping keep their geometry", async () => {
    const screen = await render(<Trail />);
    const nav = screen.getByTestId("trail").element();
    const icon = screen
      .getByRole("link", { name: "Home" })
      .element()
      .querySelector("svg")!;
    expect(getComputedStyle(icon).width).toBe("14px");
    expect(getComputedStyle(slot(nav, "breadcrumb-ellipsis")).width).toBe(
      "20px",
    );
    expect(getComputedStyle(slot(nav, "breadcrumb-list")).flexWrap).toBe(
      "wrap",
    );
    const sr = getComputedStyle(
      nav.querySelector(".sprout-breadcrumb-sr-only")!,
    );
    expect([sr.width, sr.position]).toEqual(["1px", "absolute"]);
  });

  it("keyboard moves through links, shows focus, and skips the current page", async () => {
    const screen = await render(
      <>
        <Trail />
        <button>After</button>
      </>,
    );
    await userEvent.tab();
    const home = screen.getByRole("link", { name: "Home" });
    await expect.element(home).toHaveFocus();
    expect(getComputedStyle(home.element()).outlineStyle).toBe("solid");
    await userEvent.tab();
    await expect
      .element(screen.getByRole("link", { name: "Projects" }))
      .toHaveFocus();
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: "After" }))
      .toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect
      .element(screen.getByRole("link", { name: "Projects" }))
      .toHaveFocus();
  });

  it("a one-line header trail on a phone shrinks only the title", async () => {
    await page.viewport(390, 900);
    const screen = await render(
      <HeaderTrail title="Weekly revenue digest for the finance and operations team" />,
    );
    await settle();
    const chrome = screen.getByRole("group", { name: "App header" }).element();
    const list = slot(chrome, "breadcrumb-list");
    expect(getComputedStyle(list).flexWrap).toBe("nowrap");
    const parent = screen.getByRole("link", { name: "Automations" }).element();
    const title = screen.getByRole("heading").element();
    expect(
      getComputedStyle(chrome.querySelector('[aria-current="page"]')!)
        .flexShrink,
    ).toBe("1");
    expect(getComputedStyle(parent.parentElement!).flexShrink).toBe("0");
    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    expect(parent.scrollWidth).toBeLessThanOrEqual(parent.clientWidth);
    const box = list.getBoundingClientRect();
    expect(box.height).toBeLessThanOrEqual(24);
    expect(box.right).toBeLessThanOrEqual(
      chrome.getBoundingClientRect().right + 0.5,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("truncated labels cap their width and ghost button crumbs stay compact", async () => {
    const name = "Q3 board meeting — statements and supporting schedules";
    const screen = await render(
      <>
        <Breadcrumb aria-label="Folder path">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#q3" truncate>
                {name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Breadcrumb
          aria-label="Destination path"
          style={{ ["--sprout-breadcrumb-label-width" as string]: "10rem" }}
        >
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Button variant="ghost" size="xs" />}>
                Clients
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage truncate>
                Northwind Traders — renewal 2027 and beyond
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </>,
    );
    const label = slot(
      screen.getByRole("link", { name }).element(),
      "breadcrumb-label",
    );
    expect(label.title).toBe(name);
    expect(getComputedStyle(label).maxWidth).toBe("192px");
    expect(getComputedStyle(label).textOverflow).toBe("ellipsis");
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    const clients = screen.getByRole("button", { name: "Clients" }).element();
    expect(clients.getBoundingClientRect().height).toBe(24);
    const destination = screen
      .getByRole("navigation", { name: "Destination path" })
      .element();
    expect(
      getComputedStyle(
        slot(slot(destination, "breadcrumb-page"), "breadcrumb-label"),
      ).maxWidth,
    ).toBe("160px");
  });

  it("separators flip and items reverse in right-to-left text", async () => {
    const screen = await render(
      <>
        <Trail dir="ltr" />
        <Trail dir="rtl" />
      </>,
    );
    const ltr = screen.getByTestId("ltr").element();
    const rtl = screen.getByTestId("rtl").element();
    const arrow = (nav: Element) =>
      nav.querySelector('[data-slot="breadcrumb-separator"] svg')!;
    expect(getComputedStyle(arrow(ltr)).transform).toBe("none");
    expect(getComputedStyle(arrow(rtl)).transform).toBe(
      "matrix(-1, 0, 0, 1, 0, 0)",
    );
    expect(rtl.querySelector("a")!.getBoundingClientRect().x).toBeGreaterThan(
      slot(rtl, "breadcrumb-page").getBoundingClientRect().x,
    );
  });

  it("link color transitions respect reduced motion", async () => {
    const screen = await render(<Trail />);
    const link = screen.getByRole("link", { name: "Projects" }).element();
    expect(getComputedStyle(link).transitionDuration).toBe("0.12s");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(link).transitionDuration).toBe("0s");
  });
});
