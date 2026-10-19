import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Field } from "../../packages/sprout/src/components/field.js";
import {
  Form,
  FormFooter,
  FormSection,
  type FormActionState,
  type FormFooterLayout,
} from "../../packages/sprout/src/components/form.js";
import { Input } from "../../packages/sprout/src/components/input.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

function Compaction({
  layout = "bar",
  state = { kind: "ready" },
  error,
}: {
  layout?: FormFooterLayout;
  state?: FormActionState;
  error?: string;
}) {
  const [threshold, setThreshold] = useState("80");
  const [keep, setKeep] = useState("20");
  const [submitted, setSubmitted] = useState(false);
  const thresholdError =
    submitted && threshold === "" ? "Enter a percentage." : undefined;
  const keepError =
    submitted && Number(keep) > 50 ? "Keep 50 messages or fewer." : undefined;
  const dirty = threshold !== "80" || keep !== "20";
  return (
    <Form
      label="Compaction"
      onSubmit={() => {
        setSubmitted(true);
        if (threshold === "" || Number(keep) > 50) return "invalid";
      }}
    >
      <FormSection
        title="Context compaction"
        description="When long chats are summarized to save context."
        meta="2 / 2"
      >
        <Field
          id="keep-messages"
          label="Recent messages to keep"
          error={keepError}
        >
          <Input value={keep} onChange={(e) => setKeep(e.target.value)} />
        </Field>
        <Field
          id="compact-at"
          label="Start compacting at"
          error={thresholdError}
          required
        >
          <Input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </Field>
        <FormFooter
          layout={layout}
          dirty={dirty}
          note="Applies to new chats."
          error={error}
          cancel={{
            kind: "reset",
            label: "Discard changes",
            onReset: () => {
              setThreshold("80");
              setKeep("20");
              setSubmitted(false);
            },
          }}
          secondarySubmit={{
            label: "Save draft",
            disabled: false,
            onSelect: () => {},
          }}
          submit={{
            label: "Save compaction settings",
            pendingLabel: "Saving…",
            state,
          }}
        />
      </FormSection>
    </Form>
  );
}

const noOverflow = () => {
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
  for (const node of document.querySelectorAll(
    '[data-slot="form-footer"], [data-slot="form-section"]',
  ))
    expect(node.scrollWidth).toBeLessThanOrEqual(node.clientWidth + 1);
};

const blocked: FormActionState = {
  kind: "blocked",
  reason: "Choose a destination team below first.",
  fix: { kind: "jump", label: "Choose a team", target: "compact-at" },
};

describe("Form in a real browser", () => {
  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <Compaction state={blocked} error="Could not save. Try again." />,
    );
    await userEvent.fill(screen.getByLabelText("Start compacting at"), "70");
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });

  it("invalid submit focuses the first invalid field and discard recovers", async () => {
    const screen = await render(<Compaction />);
    const threshold = screen.getByLabelText("Start compacting at");
    const keep = screen.getByLabelText("Recent messages to keep");
    await userEvent.fill(threshold, "");
    await expect.element(screen.getByText("Unsaved changes")).toBeVisible();
    await userEvent.fill(keep, "90");
    await screen
      .getByRole("button", { name: "Save compaction settings" })
      .click();
    await expect.element(keep).toHaveFocus();
    await expect.element(keep).toHaveAttribute("aria-invalid", "true");
    await expect.element(threshold).toHaveAttribute("aria-invalid", "true");
    await screen.getByRole("button", { name: "Discard changes" }).click();
    await expect.element(threshold).toHaveValue("80");
    await expect
      .element(screen.getByText("Unsaved changes"))
      .not.toBeInTheDocument();
  });

  it("a blocked submit stays focusable and its jump fix focuses the field", async () => {
    await page.viewport(1280, 400);
    const screen = await render(
      <>
        <div style={{ height: 600 }} />
        <Compaction state={blocked} />
      </>,
    );
    const submit = screen.getByRole("button", {
      name: "Save compaction settings",
    });
    (submit.element() as HTMLElement).focus();
    await expect.element(submit).toHaveFocus();
    await expect
      .element(submit)
      .toHaveAccessibleDescription("Choose a destination team below first.");
    window.scrollTo(0, 0);
    await screen.getByRole("button", { name: "Choose a team" }).click();
    const field = screen.getByLabelText("Start compacting at");
    await expect.element(field).toHaveFocus();
    await expect.element(field).toBeInViewport();
  });

  it("stack layout gives equal full-width buttons on a phone", async () => {
    await page.viewport(390, 844);
    const screen = await render(<Compaction layout="stack" />);
    await userEvent.fill(screen.getByLabelText("Start compacting at"), "70");
    await settle();
    const stack = screen.container.querySelector(".sprout-form-footer-stack")!;
    const widths = [...stack.children].map((node) =>
      Math.round(node.getBoundingClientRect().width),
    );
    expect(widths).toHaveLength(3);
    expect(new Set(widths).size).toBe(1);
    expect(widths[0]).toBe(Math.round(stack.getBoundingClientRect().width));
    noOverflow();
  });

  for (const layout of ["bar", "stack", "compact"] as const)
    it(`${layout} layout fits 320px with a blocked reason and an error`, async () => {
      await page.viewport(320, 800);
      const screen = await render(
        <Compaction layout={layout} state={blocked} error="Could not save." />,
      );
      await userEvent.fill(screen.getByLabelText("Start compacting at"), "70");
      await expect
        .element(screen.getByText("Choose a destination team below first."))
        .toBeVisible();
      await settle();
      noOverflow();
    });

  it("status fades in and reduced motion removes the fade", async () => {
    const screen = await render(<Compaction />);
    await userEvent.fill(screen.getByLabelText("Start compacting at"), "70");
    const dirty = screen.container.querySelector(".sprout-form-footer-dirty")!;
    expect(getComputedStyle(dirty).transitionDuration).toBe("0.18s");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(dirty).transitionDuration).toBe("0s");
  });
});
