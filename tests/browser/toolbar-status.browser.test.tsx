import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import { ToolbarStatus } from "../../packages/sprout/src/components/toolbar-status.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const longMessage =
  "Exported the first 10,000 rows. Narrow the search or split the export to get the remaining 2,431 rows from the candidates table.";

function Bar({
  children,
  width = 560,
}: {
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Candidates table"
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        width,
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: 8,
        marginLeft: "auto",
      }}
    >
      {children}
    </div>
  );
}

const popup = () =>
  document.querySelector<HTMLElement>(
    '[data-slot="toolbar-status-content"][data-open]',
  );
const trigger = (name: string) =>
  page.getByRole("button", { name, exact: true });

function contained(node: HTMLElement) {
  const box = node.getBoundingClientRect();
  return {
    inViewport: box.left >= 0 && box.right <= innerWidth + 0.5,
    inside: [...node.querySelectorAll("*")].every((child) => {
      const rect = child.getBoundingClientRect();
      return (
        !rect.width ||
        (rect.left >= box.left - 1 && rect.right <= box.right + 1)
      );
    }),
    noScroll: node.scrollWidth <= node.clientWidth + 1,
  };
}
const fits = { inViewport: true, inside: true, noScroll: true };

function colorOf(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

async function close() {
  await userEvent.keyboard("{Escape}");
  await expect.poll(popup).toBeNull();
}

describe("ToolbarStatus in a real browser", () => {
  it.each(themes)("%s %s passes axe closed and open", async (theme, mode) => {
    setTheme(theme, mode);
    await render(
      <Bar>
        <ToolbarStatus label="Exported" message="Exported 3 selected rows." />
        <ToolbarStatus
          error
          label="Export failed"
          message="You no longer have access to this table."
        >
          <Button size="sm">Retry export</Button>
        </ToolbarStatus>
      </Bar>,
    );
    await settle();
    expect(await axeViolations()).toEqual([]);
    await trigger("Export failed").click();
    await expect.poll(popup).not.toBeNull();
    await settle();
    expect(contained(popup()!)).toEqual(fits);
    const color = (slot: string) =>
      getComputedStyle(popup()!.querySelector(`[data-slot="${slot}"]`)!).color;
    expect(color("popover-title")).toBe(colorOf("--sprout-danger"));
    expect(color("popover-title")).not.toBe(color("popover-description"));
    expect(await axeViolations()).toEqual([]);
  });

  for (const [label, error, message, action] of [
    ["Exported", false, "Exported 3 selected rows.", "Export again"],
    [
      "Export failed",
      true,
      "Check your connection and try again.",
      "Retry export",
    ],
    ["Export result", false, longMessage, "Export again"],
    ["Saved", false, "The local draft is ready.", null],
  ] as const)
    it(`${label} uses the right trigger, live role, and popover`, async () => {
      await render(
        <Bar>
          <ToolbarStatus label={label} error={error} message={message}>
            {action && <Button size="sm">{action}</Button>}
          </ToolbarStatus>
        </Bar>,
      );
      const live = document.querySelector(
        '[data-slot="toolbar-status-message"]',
      )!;
      expect(live.getAttribute("role")).toBe(error ? "alert" : "status");
      expect(live.getBoundingClientRect().width).toBeLessThanOrEqual(1);
      const button = trigger(label);
      expect(button.element().className).toMatch(
        error
          ? /sprout-button-variant-destructive/
          : /sprout-button-variant-outline/,
      );
      expect(getComputedStyle(button.element()).height).toBe("28px");
      await button.click();
      await expect.poll(popup).not.toBeNull();
      const content = popup()!;
      expect(content.getAttribute("data-align")).toBe("end");
      await expect
        .element(page.getByRole("heading", { name: label }))
        .toBeVisible();
      expect(content.textContent).toContain(message);
      await settle();
      expect(contained(content)).toEqual(fits);
      if (action) {
        const node = page.getByRole("button", { name: action }).element();
        expect(node.getBoundingClientRect().width).toBeLessThan(
          content.getBoundingClientRect().width / 2,
        );
      } else
        expect(
          content.querySelector('[data-slot="toolbar-status-actions"]'),
        ).toBeNull();
      await close();
    });

  it("keyboard opens the details, reaches the action, and Escape returns focus", async () => {
    await render(
      <Bar>
        <ToolbarStatus label="Exported" message="Exported 3 selected rows.">
          <Button size="sm">Export again</Button>
        </ToolbarStatus>
      </Bar>,
    );
    const button = trigger("Exported");
    (button.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(button).toHaveAttribute("aria-expanded", "true");
    const action = page.getByRole("button", { name: "Export again" });
    for (let i = 0; i < 3 && document.activeElement !== action.element(); i++)
      await userEvent.tab();
    await expect.element(action).toHaveFocus();
    await close();
    await expect.element(button).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.poll(popup).not.toBeNull();
    await close();
  });

  it("defaultOpen shows the details on mount", async () => {
    await render(
      <Bar>
        <ToolbarStatus
          defaultOpen
          error
          label="Save failed"
          message="This fictional save failed. No data was sent."
        >
          <Button>Retry sample</Button>
        </ToolbarStatus>
      </Bar>,
    );
    await expect.poll(popup).not.toBeNull();
    expect(popup()!.textContent).toContain("No data was sent.");
  });

  it("stays on screen and truncates its label on a 390px phone", async () => {
    await page.viewport(390, 844);
    await render(
      <>
        <Bar>
          <Button size="sm">Filter</Button>
          <ToolbarStatus
            error
            label="Export failed"
            message="The table changed while exporting. Try again."
          >
            <Button size="sm">Retry export</Button>
          </ToolbarStatus>
        </Bar>
        <div data-testid="slot" style={{ display: "flex", width: 72 }}>
          <ToolbarStatus label="Export result" message={longMessage} />
        </div>
      </>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const label = trigger("Export failed")
      .element()
      .querySelector(".sprout-toolbar-status-label")!;
    expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
    const slot = page.getByTestId("slot").element().getBoundingClientRect();
    const narrow = trigger("Export result").element();
    expect(narrow.getBoundingClientRect().right).toBeLessThanOrEqual(
      slot.right + 0.5,
    );
    expect(
      getComputedStyle(narrow.querySelector(".sprout-toolbar-status-label")!)
        .textOverflow,
    ).toBe("ellipsis");
    await trigger("Export failed").click();
    await expect.poll(popup).not.toBeNull();
    await settle();
    expect(contained(popup()!)).toEqual(fits);
  });

  it("the popover fades over 0.12s, and not under reduced motion", async () => {
    await render(
      <Bar>
        <ToolbarStatus label="Saved" message="The local draft is ready." />
      </Bar>,
    );
    await trigger("Saved").click();
    await expect.poll(popup).not.toBeNull();
    expect(getComputedStyle(popup()!).transitionDuration).toMatch(/0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(popup()!).transitionDuration).toBe("0s");
  });
});
