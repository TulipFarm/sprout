import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  PromptList,
  type PromptListItem,
} from "../../packages/sprout/src/components/prompt-list.js";
import {
  axeViolations,
  emulate,
  setTheme,
  settle,
  size,
  themes,
} from "./support.js";

const Dot = () => (
  <svg viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="5" fill="currentColor" />
  </svg>
);

const tasks: PromptListItem[] = [
  {
    id: "meetings",
    label: "Prepare me for tomorrow's meetings",
    icon: <Dot />,
  },
  {
    id: "emails",
    label: "Draft replies to recent customer emails",
    icon: <Dot />,
    brands: [{ brand: "gmail", name: "Gmail" }],
  },
  {
    id: "standup",
    label: "Write the standup summary",
    icon: <Dot />,
    brands: [
      { brand: "github", name: "GitHub" },
      { brand: "slack", name: "Slack" },
      { brand: "google-calendar", name: "Google Calendar" },
    ],
  },
];
const long: PromptListItem[] = [
  {
    id: "long",
    label:
      "Draft replies to recent customer emails about delayed spring bulb orders",
    icon: <Dot />,
  },
];

function colorOf(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

const rows = () => [
  ...document.querySelectorAll('[data-slot="prompt-list-item"]'),
];

describe("PromptList in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe and mutes the title",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(
        <div style={{ display: "grid", gap: 16, padding: 16, width: 480 }}>
          <PromptList
            title="Start with a task"
            items={tasks}
            onSelect={() => {}}
          />
          <PromptList
            title="More"
            showTitle={false}
            items={long}
            onSelect={() => {}}
            disabled
          />
        </div>,
      );
      await settle();
      expect(
        getComputedStyle(screen.getByRole("heading").element()).color,
      ).toBe(colorOf("--sprout-muted"));
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("keyboard moves through rows, shows focus, and chooses with Enter or Space", async () => {
    const chosen: string[] = [];
    const screen = await render(
      <PromptList
        title="Start with a task"
        items={tasks}
        onSelect={(id) => chosen.push(id)}
      />,
    );
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: tasks[0]!.label }))
      .toHaveFocus();
    expect(getComputedStyle(rows()[0]!).outlineStyle).toBe("solid");
    await expect
      .poll(() => getComputedStyle(rows()[0]!).backgroundColor)
      .toBe(colorOf("--sprout-hover"));
    await userEvent.keyboard("{Enter}");
    await userEvent.tab();
    await expect
      .element(screen.getByRole("button", { name: tasks[1]!.label }))
      .toHaveFocus();
    await userEvent.keyboard(" ");
    expect(chosen).toEqual(["meetings", "emails"]);
  });

  it("clicking anywhere on a row chooses it, and hover fills the row", async () => {
    const chosen: string[] = [];
    await render(
      <div style={{ width: 480 }}>
        <PromptList
          title="Start with a task"
          items={tasks}
          onSelect={(id) => chosen.push(id)}
        />
      </div>,
    );
    await settle();
    const row = rows()[0]!;
    const box = row.getBoundingClientRect();
    await userEvent.click(document.body, {
      position: { x: box.right - 6, y: box.top + box.height / 2 },
    });
    expect(chosen).toEqual(["meetings"]);
    await userEvent.hover(rows()[1]!);
    await expect
      .poll(() => getComputedStyle(rows()[1]!).backgroundColor)
      .toBe(colorOf("--sprout-hover"));
  });

  it("disabled rows fade and ignore hover and clicks", async () => {
    const chosen: string[] = [];
    const screen = await render(
      <PromptList
        title="Start with a task"
        items={tasks}
        onSelect={(id) => chosen.push(id)}
        disabled
      />,
    );
    await settle();
    const row = rows()[0]!;
    expect(getComputedStyle(row).opacity).toBe("0.5");
    await userEvent.hover(row);
    expect(getComputedStyle(row).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    await screen
      .getByRole("button", { name: tasks[0]!.label })
      .click({ force: true });
    expect(chosen).toEqual([]);
  });

  it("long labels truncate on one line at 390px", async () => {
    await page.viewport(390, 844);
    const screen = await render(
      <div style={{ padding: 16 }}>
        <PromptList
          title="Long"
          items={[...long, ...tasks]}
          onSelect={() => {}}
        />
      </div>,
    );
    await settle();
    const button = screen
      .getByRole("button", { name: /about delayed spring bulb/ })
      .element();
    expect(button.scrollWidth).toBeGreaterThan(button.clientWidth);
    for (const row of rows()) {
      const [, height] = size(row);
      expect(height).toBeGreaterThanOrEqual(32);
      expect(height).toBeLessThan(40);
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
      expect(size(row.querySelector(".sprout-prompt-list-arrow")!)[0]).toBe(14);
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("rows rise in with motion and stay still with reduced motion", async () => {
    await render(
      <PromptList
        title="Start with a task"
        items={tasks}
        onSelect={() => {}}
      />,
    );
    const [first, second] = rows().map((row) => getComputedStyle(row));
    expect(first!.animationName).toBe("sprout-prompt-rise");
    expect(first!.animationDuration).toBe("0.18s");
    expect(second!.animationDelay).toBe("0.04s");
    await emulate({ reducedMotion: true });
    expect(first!.animationName).toBe("none");
    await userEvent.hover(rows()[0]!);
    expect(
      getComputedStyle(rows()[0]!.querySelector(".sprout-prompt-list-icon")!)
        .transform,
    ).toBe("none");
  });

  it("rows grow to 44px for coarse pointers", async () => {
    await emulate({ coarse: true });
    await page.viewport(390, 844);
    await render(
      <PromptList
        title="Start with a task"
        items={tasks}
        onSelect={() => {}}
      />,
    );
    for (const row of rows())
      expect(
        Math.round(row.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
  });
});
