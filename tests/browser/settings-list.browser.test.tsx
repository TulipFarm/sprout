import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import { Input } from "../../packages/sprout/src/components/input.js";
import {
  SettingsGroup,
  SettingsRow,
} from "../../packages/sprout/src/components/settings-list.js";
import { Switch } from "../../packages/sprout/src/components/switch.js";
import { axeViolations, setTheme, themes } from "./support.js";

function Profile({ width = 640 }: { width?: number }) {
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <SettingsGroup title="Profile" titleId="profile-heading">
        <SettingsRow label="Picture" description="Shown beside your name.">
          <Button variant="outline" size="sm">
            Upload image
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Name"
          htmlFor="account-name"
          description="Shown to people in your workspaces."
        >
          <Input
            id="account-name"
            defaultValue="Maya Chen"
            style={{ width: "100%" }}
          />
        </SettingsRow>
        <SettingsRow label="Email" description="Used to sign in.">
          <span style={{ overflowWrap: "anywhere" }}>
            maya.chen@northwind-logistics-and-shipping.example.com
          </span>
        </SettingsRow>
        <SettingsRow label="Role" description="Your role is team manager." />
        <SettingsRow label="Quiet hours" htmlFor="quiet">
          <Switch id="quiet" />
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}

const group = () =>
  document.querySelector<HTMLElement>('[data-slot="settings-group"]')!;
const row = (label: string) =>
  [
    ...document.querySelectorAll<HTMLElement>('[data-slot="settings-row"]'),
  ].find(
    (el) =>
      el.querySelector(".sprout-settings-row-label")!.textContent === label,
  )!;
const rect = (el: Element) => el.getBoundingClientRect();

describe("SettingsList in a real browser", () => {
  it("matches Cloud spacing and puts controls beside text on wide groups", async () => {
    await render(<Profile />);
    await expect
      .element(page.getByRole("region", { name: "Profile" }))
      .toBeVisible();
    const title = page.getByRole("heading", { level: 2, name: "Profile" });
    const titleStyle = getComputedStyle(title.element());
    expect(titleStyle.fontSize).toBe("14px");
    expect(titleStyle.fontWeight).toBe("500");
    const content = group().querySelector(
      '[data-slot="settings-group-content"]',
    )!;
    expect(getComputedStyle(content).borderTopWidth).toBe("1px");
    expect(rect(content).top - rect(title.element()).bottom).toBeCloseTo(8, 0);

    const email = row("Email");
    const style = getComputedStyle(email);
    expect(style.paddingTop).toBe("12px");
    expect(style.paddingLeft).toBe("16px");
    expect(style.flexDirection).toBe("row");
    expect(style.borderTopWidth).toBe("1px");
    expect(getComputedStyle(row("Picture")).borderTopWidth).toBe("0px");
    const control = email.querySelector('[data-slot="settings-row-control"]')!;
    expect(rect(email).right - rect(control).right).toBeCloseTo(16, 0);
    expect(rect(control).width).toBeLessThanOrEqual(
      rect(email).width * 0.6 + 1,
    );
    expect(
      getComputedStyle(email.querySelector(".sprout-settings-row-description")!)
        .fontSize,
    ).toBe("12px");
    expect(
      rect(email.querySelector(".sprout-settings-row-label")!).left,
    ).toBeCloseTo(rect(email).left + 16, 0);
  });

  it("stacks rows and stretches fields on narrow groups", async () => {
    await page.viewport(390, 800);
    await render(<Profile />);
    const name = row("Name");
    expect(getComputedStyle(name).flexDirection).toBe("column");
    const text = rect(name.querySelector(".sprout-settings-row-text")!);
    const control = rect(
      name.querySelector('[data-slot="settings-row-control"]')!,
    );
    expect(control.top).toBeGreaterThanOrEqual(text.bottom + 11);
    expect(rect(document.getElementById("account-name")!).width).toBeCloseTo(
      rect(name).width - 32,
      0,
    );
    const email = row("Email");
    expect(email.scrollWidth).toBeLessThanOrEqual(email.clientWidth);
    expect(group().scrollWidth).toBeLessThanOrEqual(group().clientWidth + 1);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("leaves out the control area when a row has no children", async () => {
    await render(<Profile />);
    expect(
      row("Role").querySelector('[data-slot="settings-row-control"]'),
    ).toBeNull();
    expect(row("Role").textContent).toContain("Your role is team manager.");
  });

  it("labels focus their controls and toggle switches", async () => {
    await render(<Profile />);
    await page.getByText("Name", { exact: true }).click();
    await expect.element(page.getByRole("textbox")).toHaveFocus();
    const quiet = page.getByRole("switch", { name: "Quiet hours" });
    await expect.element(quiet).toHaveAttribute("aria-checked", "false");
    await page.getByText("Quiet hours", { exact: true }).click();
    await expect.element(quiet).toHaveAttribute("aria-checked", "true");
    (quiet.element() as HTMLElement).focus();
    await userEvent.keyboard(" ");
    await expect.element(quiet).toHaveAttribute("aria-checked", "false");
  });

  it("has no motion of its own", async () => {
    await render(<Profile />);
    expect(getComputedStyle(row("Email")).transitionDuration).toBe("0s");
    expect(getComputedStyle(group()).transitionDuration).toBe("0s");
  });

  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(<Profile />);
    expect(await axeViolations(screen.container)).toEqual([]);
  });
});
