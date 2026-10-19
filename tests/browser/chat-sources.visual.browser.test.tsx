import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  ChatSources,
  InlineCitation,
  type ChatSource,
} from "../../packages/sprout/src/components/chat-sources.js";
import { setTheme, settle, themes } from "./support.js";

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
    excerpt: "Net 30 remains the default.",
    href: "https://drive.example.com/q3",
  },
];

it.each(themes)("chat-sources %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(400, 420);
  const screen = await render(
    <div style={{ display: "grid", gap: 12, padding: 16 }}>
      <p style={{ margin: 0 }}>
        Water bulbs once
        <InlineCitation source={sources[0]!} number={1} /> and pay on Net 30
        <InlineCitation source={sources[1]!} number={2} />.
      </p>
      <ChatSources sources={sources} defaultOpen />
    </div>,
  );
  await screen.getByRole("button", { name: /^Source 1:/ }).click();
  await settle();
  await expect
    .element(page.elementLocator(document.body))
    .toMatchScreenshot(`chat-sources-${theme}-${mode}`);
});
