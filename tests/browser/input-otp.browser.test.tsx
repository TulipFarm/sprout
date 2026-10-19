import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../../packages/sprout/src/components/input-otp.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

function colorOf(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function Code(
  props: Partial<Parameters<typeof InputOTP>[0]> & { testId?: string },
) {
  const { testId = "code", ...rest } = props;
  return (
    <InputOTP
      maxLength={6}
      aria-label="Verification code"
      data-testid={testId}
      {...rest}
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

function Editable() {
  const [value, setValue] = useState("194278");
  const [invalid, setInvalid] = useState(true);
  return (
    <Code
      testId="error"
      value={value}
      aria-invalid={invalid}
      onChange={(next) => {
        setValue(next);
        setInvalid(false);
      }}
    />
  );
}

const slots = (testId = "code") => [
  ...page
    .getByTestId(testId)
    .element()
    .querySelectorAll<HTMLInputElement>('[data-slot="input-otp-slot"]'),
];
const code = (testId = "code") =>
  slots(testId)
    .map((slot) => slot.value)
    .join("");

describe("InputOTP in a real browser", () => {
  it.each(themes)(
    "%s %s paints theme tokens and passes axe",
    async (theme, mode) => {
      setTheme(theme, mode);
      const screen = await render(
        <div style={{ display: "grid", gap: 16, padding: 16 }}>
          <Code defaultValue="12" />
          <Editable />
          <Code
            testId="disabled"
            aria-label="Locked code"
            disabled
            defaultValue="123456"
          />
        </div>,
      );
      slots()[2]!.focus();
      await settle();
      const first = getComputedStyle(slots()[0]!);
      expect(first.backgroundColor).toBe(colorOf("--sprout-surface"));
      expect(first.borderTopColor).toBe(colorOf("--sprout-input"));
      expect(first.color).toBe(colorOf("--sprout-text"));
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("slots render at Cloud dimensions with grouped borders", async () => {
    await render(<Code defaultValue="12" />);
    const [a, b, c, d] = slots().map((slot) => getComputedStyle(slot));
    expect([a!.width, a!.height, a!.fontSize, a!.textAlign]).toEqual([
      "32px",
      "32px",
      "14px",
      "center",
    ]);
    expect(a!.borderLeftWidth).toBe("1px");
    expect(b!.borderLeftWidth).toBe("0px");
    expect(a!.borderTopLeftRadius).toMatch(/^[1-9]/);
    expect(b!.borderTopLeftRadius).toBe("0px");
    expect(c!.borderTopRightRadius).toMatch(/^[1-9]/);
    expect(d!.borderLeftWidth).toBe("1px");
    const separator = document.querySelector(
      '[data-slot="input-otp-separator"] svg',
    )!;
    expect(getComputedStyle(separator).width).toBe("16px");
    const gap =
      slots()[3]!.getBoundingClientRect().left -
      slots()[2]!.getBoundingClientRect().right;
    expect(gap).toBe(32);
  });

  it("a native label focuses the first slot", async () => {
    const screen = await render(
      <>
        <label id="sign-in" htmlFor="sign-in-code">
          Sign-in code
        </label>
        <Code
          aria-label={undefined}
          aria-labelledby="sign-in"
          id="sign-in-code"
        />
      </>,
    );
    await screen.getByText("Sign-in code").click();
    expect(document.activeElement).toBe(slots()[0]);
  });

  it("typing, arrows, Home/End, Backspace, Delete, Tab and paste", async () => {
    await emulate({ reducedMotion: true });
    await render(
      <>
        <button type="button">Before</button>
        <Code defaultValue="12" />
        <button type="button">After</button>
      </>,
    );
    page.getByRole("button", { name: "Before" }).element().focus();
    await userEvent.tab();
    const s = slots();
    expect(document.activeElement).toBe(s[2]);
    const focused = getComputedStyle(s[2]!);
    expect(focused.borderTopColor).toBe(colorOf("--sprout-border"));
    expect(focused.outlineWidth).toBe("1px");
    expect(focused.zIndex).toBe("1");

    await userEvent.keyboard("3a4");
    expect(code()).toBe("1234");
    expect(document.activeElement).toBe(s[4]);
    await userEvent.keyboard("{Home}");
    expect(document.activeElement).toBe(s[0]);
    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(s[4]);
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(s[3]);
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(s[4]);
    await userEvent.keyboard("{Backspace}");
    expect(code()).toBe("123");
    expect(document.activeElement).toBe(s[3]);
    await userEvent.keyboard("{Home}{Delete}");
    expect(code()).toBe("23");
    await userEvent.tab();
    await expect
      .element(page.getByRole("button", { name: "After" }))
      .toHaveFocus();

    s[0]!.focus();
    const data = new DataTransfer();
    data.setData("text/plain", "987 654");
    s[0]!.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
    await expect.poll(() => code()).toBe("987654");
  });

  it("an invalid code shows danger borders and a ring, and editing clears it", async () => {
    await emulate({ reducedMotion: true });
    await render(<Editable />);
    for (const slot of slots("error"))
      expect(getComputedStyle(slot).borderTopColor).toBe(
        colorOf("--sprout-danger"),
      );
    const group = document.querySelector('[data-slot="input-otp-group"]')!;
    expect(getComputedStyle(group).boxShadow).toMatch(/3px/);
    slots("error")[5]!.focus();
    await userEvent.keyboard("{Backspace}");
    expect(code("error")).toBe("19427");
    await expect
      .element(page.getByTestId("error"))
      .not.toHaveAttribute("data-invalid");
    expect(slots("error")[0]!.hasAttribute("aria-invalid")).toBe(false);
  });

  it("a disabled code is dimmed and cannot be focused", async () => {
    await render(<Code testId="disabled" disabled defaultValue="123456" />);
    expect(
      getComputedStyle(page.getByTestId("disabled").element()).opacity,
    ).toBe("0.5");
    expect(getComputedStyle(slots("disabled")[0]!).cursor).toBe("not-allowed");
    await page.elementLocator(slots("disabled")[0]!).click({ force: true });
    expect(document.activeElement).not.toBe(slots("disabled")[0]);
  });

  it("slot colors transition only when motion is allowed", async () => {
    await render(<Code />);
    expect(getComputedStyle(slots()[0]!).transitionDuration).toMatch(/^0\.12s/);
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(slots()[0]!).transitionDuration).toBe("0s");
  });
});
