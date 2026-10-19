import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import {
  BrandIcon,
  BrandStack,
  BrandTile,
  brandNames,
  type Brand,
} from "../../packages/sprout/src/components/brand-icon.js";
import { Button } from "../../packages/sprout/src/components/button.js";
import { size } from "./support.js";

const stack = [
  { brand: "google", name: "Google Workspace" },
  { brand: "slack", name: "Slack" },
  { brand: "github", name: "GitHub" },
  { brand: "confluence", name: "Atlassian" },
] as const;

function Action({ brand, disabled }: { brand: Brand; disabled?: boolean }) {
  return (
    <BrandTile
      size="action"
      render={<Button variant="ghost" size="icon" disabled={disabled} />}
      aria-label={`${brandNames[brand]} actions`}
    >
      <BrandIcon brand={brand} size="fill" />
    </BrandTile>
  );
}

function Gallery() {
  return (
    <div style={{ display: "grid", gap: 12, padding: 16 }}>
      <ul
        aria-label="Brand catalog"
        style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: 0 }}
      >
        {(Object.keys(brandNames) as Brand[]).map((brand) => (
          <li
            key={brand}
            data-catalog-brand={brand}
            style={{ listStyle: "none" }}
          >
            <BrandIcon brand={brand} />
          </li>
        ))}
      </ul>
      <BrandStack brands={stack} />
      <div style={{ display: "flex", gap: 8 }}>
        <Action brand="gmail" />
        <Action brand="google-sheets" />
        <Action brand="slack" disabled />
      </div>
    </div>
  );
}

describe("BrandIcon on a touch screen", () => {
  it("action tiles grow to 44px on touch screens and fit a phone", async () => {
    await page.viewport(390, 844);
    await render(<Gallery />);
    expect(
      size(page.getByRole("button", { name: "Gmail actions" }).element()),
    ).toEqual([44, 44]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
