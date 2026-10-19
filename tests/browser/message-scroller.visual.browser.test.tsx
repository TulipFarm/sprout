import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  Message,
  MessageBubble,
  MessageContent,
} from "../../packages/sprout/src/components/message.js";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "../../packages/sprout/src/components/message-scroller.js";
import { emulate, setTheme, settle, themes } from "./support.js";

const turns = [
  "Which March orders are missing from the warehouse export?",
  "Three of the 1,284 March orders are missing: SO-1042, SO-1077, and SO-1103.",
  "Why weren’t they exported?",
  "All three were created on March 28, after the 6 pm export had already run.",
  "Will they show up in the April file?",
  "Yes. The April 1 export picks up anything created since the last run.",
];

it.each(themes)("message-scroller %s %s", async (theme, mode) => {
  await emulate({ reducedMotion: true });
  setTheme(theme, mode);
  const screen = await render(
    <MessageScrollerProvider defaultScrollPosition="start">
      <div
        data-testid="shot"
        style={{
          position: "relative",
          width: 360,
          height: 240,
          overflow: "hidden",
          border: "1px solid var(--sprout-line)",
          background: "var(--sprout-surface)",
        }}
      >
        <MessageScroller>
          <MessageScrollerViewport aria-label="Conversation history">
            <MessageScrollerContent>
              {turns.map((text, index) => (
                <MessageScrollerItem key={index} messageId={`m${index}`}>
                  <div style={{ padding: 12 }}>
                    <Message align={index % 2 === 0 ? "end" : "start"}>
                      <MessageContent>
                        <MessageBubble
                          variant={index % 2 === 0 ? "default" : "secondary"}
                        >
                          {text}
                        </MessageBubble>
                      </MessageContent>
                    </Message>
                  </div>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton aria-label="Scroll to newest message" />
        </MessageScroller>
      </div>
    </MessageScrollerProvider>,
  );
  await expect
    .poll(() => document.querySelectorAll("[data-pending-scroll]").length)
    .toBe(0);
  await expect
    .element(screen.getByRole("button", { name: "Scroll to newest message" }))
    .toHaveAttribute("data-active", "true");
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`message-scroller-${theme}-${mode}`);
});
