import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  ReviewCard,
  ReviewRow,
  ReviewRows,
  ReviewSteps,
  ReviewValues,
} from "../../packages/sprout/src/components/review-card.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("review-card %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "grid",
        gap: 12,
        padding: 16,
        width: 440,
        background: "var(--sprout-canvas)",
      }}
    >
      <ReviewCard
        icon={
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect
              x="2"
              y="2"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
            />
          </svg>
        }
        title="Update a row in Supplier deliveries"
        badge={{ label: "Needs review", variant: "warning" }}
        status={<p>Approving changes the row right away.</p>}
        actions={
          <>
            <Button>Approve change</Button>
            <Button variant="outline">Decline</Button>
          </>
        }
      >
        <ReviewRows>
          <ReviewRow label="Table">Supplier deliveries</ReviewRow>
          <ReviewRow label="Status">Delivered</ReviewRow>
        </ReviewRows>
        <ReviewSteps
          title="2 steps"
          steps={[
            { summary: "Send a webhook" },
            {
              summary: "Write the row",
              detail: (
                <ReviewValues
                  values={[{ name: "Authorization", value: "Bearer •••••" }]}
                />
              ),
            },
          ]}
        />
      </ReviewCard>
      <ReviewCard
        icon={
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" />
          </svg>
        }
        title="Send the weekly digest"
        badge={{ label: "Applied", variant: "success" }}
        settled
        status={<p>Row updated.</p>}
      />
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`review-card-${theme}-${mode}`);
});
