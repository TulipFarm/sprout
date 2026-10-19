import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../packages/sprout/src/components/select.js";
import { settle } from "./support.js";

function Choice({
  label,
  items,
  value,
  ...trigger
}: {
  label: string;
  items: string[];
  value?: string;
} & Parameters<typeof SelectTrigger>[0]) {
  return (
    <Select defaultValue={value ?? items[0]}>
      <SelectTrigger aria-label={label} {...trigger}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
const content = () =>
  document.querySelector<HTMLElement>(
    '[data-slot="select-content"][data-open]',
  )!;

function insideViewport(node: Element) {
  const box = node.getBoundingClientRect();
  return (
    box.left >= 0 &&
    box.top >= 0 &&
    box.right <= innerWidth + 0.5 &&
    box.bottom <= innerHeight + 0.5
  );
}

describe("Select on a touch screen", () => {
  it("coarse pointers get 44px targets and the popup fits a phone", async () => {
    await page.viewport(390, 844);
    const screen = await render(
      <Choice
        label="Proposal"
        size="sm"
        items={["Update the Q3 forecast sheet", "Post the launch summary"]}
      />,
    );
    const trigger = screen.getByRole("combobox").element();
    expect(getComputedStyle(trigger).minHeight).toBe("44px");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await screen.getByRole("combobox").click();
    await settle();
    expect(insideViewport(content())).toBe(true);
    expect(
      getComputedStyle(content().querySelector('[role="option"]')!).minHeight,
    ).toBe("44px");
  });
});
