import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  ChatSources,
  CheckedCitation,
  InlineCitation,
  type ChatSource,
  type CitationState,
} from "../../packages/sprout/src/components/chat-sources.js";
import {
  axeViolations,
  emulate,
  setTheme,
  settle,
  size,
  themes,
} from "./support.js";

const sources: ChatSource[] = [
  {
    id: "garden",
    title: "Fictional garden notes",
    location: "Example collection",
    excerpt: "Water newly planted bulbs once, then wait for shoots.",
    href: "https://garden.example.com/notes",
  },
  {
    id: "vendor",
    title: "Q3 vendor review.pdf",
    location: "File · Payment terms",
    excerpt:
      "Net 30 remains the default. Suppliers with three late deliveries in a quarter move to Net 15.",
    href: "https://www.drive.example.com/q3",
  },
  {
    id: "thread",
    title:
      "#supplier-ops thread with a very long unbroken name_that_should_wrap_cleanly",
    location: "Slack · 14 replies",
    excerpt: "Agreed: flag late suppliers in the weekly review.",
    href: "https://slack.example.com/t/1",
  },
];

function Reply() {
  return (
    <div style={{ display: "grid", gap: 16, padding: 16, maxWidth: 560 }}>
      <p style={{ margin: 0 }}>
        Bulbs need one deep watering
        <InlineCitation source={sources[0]!} number={1} /> and late suppliers
        move to Net 15
        <InlineCitation source={sources[1]!} number={2} />.
      </p>
      <ChatSources sources={sources} defaultOpen data-testid="many" />
      <ChatSources sources={sources.slice(0, 1)} data-testid="single" />
      <ChatSources sources={[]} />
    </div>
  );
}

const ready: CitationState = {
  kind: "ready",
  title: "Fictional garden notes",
  location: "Note · Spring",
  excerpt: "Water newly planted bulbs once.\nThen wait for shoots.",
};

function Checked({ initial }: { initial: CitationState }) {
  const [state, setState] = useState(initial);
  return (
    <p style={{ padding: 16 }}>
      See the{" "}
      <CheckedCitation
        label="Garden notes"
        state={state}
        onOpen={() => {}}
        onRetry={() => setState(ready)}
      />
      .
    </p>
  );
}

const popup = () => page.getByRole("dialog");
const popupNode = () =>
  document.querySelector<HTMLElement>('[data-slot="popover-content"]');

function insideViewport(node: Element) {
  const box = node.getBoundingClientRect();
  return box.left >= 0 && box.right <= innerWidth + 0.5;
}

describe("ChatSources in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe with a passage open",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(<Reply />);
      await screen.getByRole("button", { name: /^Source 2:/ }).click();
      await expect.element(popup()).toBeVisible();
      await settle();
      expect(await axeViolations()).toEqual([]);
    },
  );

  it("hovering a citation previews the passage and leaving closes it", async () => {
    const screen = await render(<Reply />);
    const citation = screen.getByRole("button", { name: /^Source 2:/ });
    const before = getComputedStyle(citation.element()).backgroundColor;
    await citation.hover();
    await expect.element(popup()).toBeVisible();
    expect(getComputedStyle(citation.element()).backgroundColor).not.toBe(
      before,
    );
    expect(
      popupNode()!.querySelector(".sprout-chat-sources-preview-head")!
        .textContent,
    ).toBe("2drive.example.com");
    await page.elementLocator(popupNode()!.querySelector("a")!).hover();
    await expect.element(popup()).toBeVisible();
    await screen.getByText("No sources were used for this response.").hover();
    await expect.element(popup()).not.toBeInTheDocument();
  });

  it("citations and the list toggle work by keyboard and return focus", async () => {
    const screen = await render(<Reply />);
    const citation = screen.getByRole("button", { name: /^Source 1:/ });
    (citation.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(popup()).toBeVisible();
    await expect
      .poll(() => popupNode()?.textContent)
      .toContain("Example collection");
    await userEvent.keyboard("{Escape}");
    await expect.element(popup()).not.toBeInTheDocument();
    await expect.element(citation).toHaveFocus();

    const toggle = screen.getByRole("button", { name: "1 source" });
    (toggle.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard(" ");
    await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("retry after an error keeps focus inside the passage", async () => {
    const screen = await render(
      <Checked
        initial={{ kind: "error", message: "Couldn’t check access." }}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "Source: Garden notes",
    });
    (trigger.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    const retry = page.getByRole("button", { name: "Load source again" });
    (retry.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .poll(() => popupNode()?.textContent)
      .toContain("Then wait for shoots.");
    expect(popupNode()!.contains(document.activeElement)).toBe(true);
    const excerpt = popupNode()!.querySelector("[data-preserve-lines]")!;
    expect(getComputedStyle(excerpt).whiteSpace).toBe("pre-wrap");
    await userEvent.keyboard("{Escape}");
    await expect.element(trigger).toHaveFocus();
  });

  it("a click-opened passage stays open after the pointer leaves", async () => {
    const screen = await render(<Checked initial={ready} />);
    await screen.getByRole("button", { name: "Source: Garden notes" }).click();
    await expect.element(popup()).toBeVisible();
    await userEvent.unhover(screen.getByRole("button"));
    await new Promise((resolve) => setTimeout(resolve, 250));
    await expect.element(popup()).toBeVisible();
  });

  it("cards, citations and passages fit a phone", async () => {
    await page.viewport(390, 844);
    const screen = await render(<Reply />);
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const list = screen.getByTestId("many").element();
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth + 1);
    for (const item of list.querySelectorAll("li")) {
      expect(getComputedStyle(item).padding).toBe("12px");
      expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1);
      expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(
        list.getBoundingClientRect().right + 0.5,
      );
    }
    for (const citation of screen.container.querySelectorAll(
      '[data-slot="inline-citation"]',
    ))
      expect(size(citation)).toEqual([24, 24]);
    await screen.getByRole("button", { name: /^Source 2:/ }).click();
    await expect.element(popup()).toBeVisible();
    await settle();
    expect(insideViewport(popupNode()!)).toBe(true);
    expect(popupNode()!.scrollWidth).toBeLessThanOrEqual(
      popupNode()!.clientWidth + 1,
    );
  });

  it("trigger, citation and list transitions, and reduced motion removes them", async () => {
    const screen = await render(<Reply />);
    const trigger = screen.container.querySelector(
      ".sprout-chat-sources-trigger",
    )!;
    const content = screen
      .getByTestId("many")
      .element()
      .querySelector('[data-slot="collapsible-content"]')!;
    expect(getComputedStyle(trigger).transitionDuration).toBe("0.12s");
    expect(getComputedStyle(content).transitionDuration).toBe("0.18s, 0.12s");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(trigger).transitionDuration).toBe("0s");
  });
});
