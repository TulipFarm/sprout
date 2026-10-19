import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { BrandIcon } from "../../packages/sprout/src/components/brand-icon.js";
import {
  GlassBanner,
  GlassChip,
} from "../../packages/sprout/src/components/glass-banner.js";
import { emulate, setTheme, settle, themes } from "./support.js";

it.each(themes)("glass-banner %s %s", async (theme, mode) => {
  await emulate({ reducedMotion: true });
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ width: 384, padding: 16, background: "var(--sprout-canvas)" }}
    >
      <GlassBanner title="Your apps at work" caption="Example activity">
        <GlassChip icon={<BrandIcon brand="gmail" size="glyph" />}>
          Drafted 3 follow-ups
        </GlassChip>
        <GlassChip icon={<BrandIcon brand="slack" size="glyph" />}>
          Answered in #support
        </GlassChip>
        <GlassChip>Triaged 5 new issues</GlassChip>
      </GlassBanner>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`glass-banner-${theme}-${mode}`);
});
