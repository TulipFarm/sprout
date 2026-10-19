import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Field } from "../../packages/sprout/src/components/field.js";
import {
  Form,
  FormFooter,
  FormSection,
} from "../../packages/sprout/src/components/form.js";
import { Input } from "../../packages/sprout/src/components/input.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("form %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ width: 480, padding: 16, background: "var(--sprout-canvas)" }}
    >
      <Form label="Compaction" onSubmit={() => {}}>
        <FormSection
          title="Context compaction"
          description="When long chats are summarized to save context."
          meta="2 / 2"
        >
          <Field label="Start compacting at" required>
            <Input defaultValue="80" />
          </Field>
          <Field label="Recent messages to keep" error="Keep 50 or fewer.">
            <Input defaultValue="90" />
          </Field>
          <FormFooter
            dirty
            note="Applies to new chats."
            cancel={{ kind: "reset", label: "Discard", onReset: () => {} }}
            submit={{
              label: "Save",
              pendingLabel: "Saving…",
              state: {
                kind: "blocked",
                reason: "Fix the field above first.",
                fix: { kind: "action", label: "Reset", onClick: () => {} },
              },
            }}
          />
        </FormSection>
      </Form>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`form-${theme}-${mode}`);
});
