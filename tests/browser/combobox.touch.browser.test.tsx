import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../../packages/sprout/src/components/combobox.js";
import { settle } from "./support.js";

const fruits = ["Apple", "Apricot", "Blueberry", "Cherry", "Pear"];

function Items() {
  return (
    <ComboboxList>
      {(item: string) => (
        <ComboboxItem key={item} value={item}>
          {item}
        </ComboboxItem>
      )}
    </ComboboxList>
  );
}

function Fruit({ disabled }: { disabled?: boolean }) {
  return (
    <Combobox items={fruits} disabled={disabled}>
      <ComboboxInput
        aria-label="Choose a fruit"
        placeholder="Choose a fruit"
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>No fruit found.</ComboboxEmpty>
        <Items />
      </ComboboxContent>
    </Combobox>
  );
}

const popup = () =>
  document.querySelector<HTMLElement>(
    '[data-slot="combobox-content"][data-open]',
  );

function insideViewport(node: Element) {
  const box = node.getBoundingClientRect();
  return (
    box.left >= 0 &&
    box.top >= 0 &&
    box.right <= innerWidth + 0.5 &&
    box.bottom <= innerHeight + 0.5
  );
}

describe("Combobox on a touch screen", () => {
  it("coarse pointers get 44px items and the list fits a phone", async () => {
    await page.viewport(390, 844);
    const screen = await render(<Fruit />);
    const input = screen.getByRole("combobox");
    await input.click();
    await expect.poll(popup).not.toBeNull();
    await settle();
    expect(
      getComputedStyle(page.getByRole("option").first().element()).minHeight,
    ).toBe("44px");
    expect(insideViewport(popup()!)).toBe(true);
    await page.getByRole("option", { name: "Pear" }).click();
    await expect.element(input).toHaveValue("Pear");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
