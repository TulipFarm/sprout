import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { ChatInput } from "../../packages/sprout/src/components/chat-input.js";
import { TooltipProvider } from "../../packages/sprout/src/components/tooltip.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("chat-input %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <TooltipProvider>
      <div
        data-testid="shot"
        style={{
          display: "grid",
          gap: 16,
          padding: 16,
          width: 560,
          background: "var(--sprout-canvas)",
        }}
      >
        <ChatInput
          value={{
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Compare the greenhouse layout." },
                ],
              },
            ],
          }}
          onValueChange={() => {}}
          onSend={() => {}}
          attachments={[
            {
              id: "pdf",
              name: "returns-policy.pdf",
              mediaType: "application/pdf",
              size: "1 KB",
              state: "ready",
            },
          ]}
          attachActions={[
            { id: "url", label: "Add a web page", onSelect: () => {} },
          ]}
          modes={[{ id: "plan", label: "Plan", color: "#3b9ef5" }]}
          mode="plan"
          models={[{ id: "gpt", label: "GPT-5.5", brand: "openai" }]}
          model="gpt"
        />
        <ChatInput
          value={{ type: "doc", content: [{ type: "paragraph" }] }}
          onValueChange={() => {}}
          onSend={() => {}}
          onStop={() => {}}
          status="streaming"
        />
      </div>
    </TooltipProvider>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`chat-input-${theme}-${mode}`);
});
