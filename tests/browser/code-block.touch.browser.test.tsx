import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { CodeBlock } from "../../packages/sprout/src/components/code-block.js";
const curl = `curl -X POST 'https://hooks.example.com/v1/workflows/wf_8c2d1e/trigger?source=docs&retry=3' -H 'Authorization: Bearer $TULIPFARM_WEBHOOK_KEY' -d '{"lead":"northwind"}'`;

const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
afterEach(() => {
  if (original) Object.defineProperty(navigator, "clipboard", original);
  else delete (navigator as { clipboard?: Clipboard }).clipboard;
});

describe("CodeBlock on a touch screen", () => {
  it("copy is a 44px target on coarse pointers", async () => {
    const screen = await render(<CodeBlock code={curl} filename="curl" />);
    expect(
      getComputedStyle(screen.getByRole("button").element()).minHeight,
    ).toBe("44px");
  });
});
