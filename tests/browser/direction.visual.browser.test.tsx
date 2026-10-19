import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../packages/sprout/src/components/breadcrumb.js";
import { DirectionProvider } from "../../packages/sprout/src/components/direction.js";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../packages/sprout/src/components/toggle-group.js";
import { setTheme, settle, themes } from "./support.js";

const copy = {
  ltr: { first: "Projects", page: "Garden", views: ["List", "Board"] },
  rtl: { first: "المشاريع", page: "الحديقة", views: ["قائمة", "لوحة"] },
} as const;

it.each(themes)("direction %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-grid",
        gap: 12,
        width: 240,
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      {(["ltr", "rtl"] as const).map((direction) => (
        <DirectionProvider key={direction} direction={direction}>
          <div dir={direction} style={{ display: "grid", gap: 8 }}>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#p">
                    {copy[direction].first}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{copy[direction].page}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <ToggleGroup
              aria-label={`View ${direction}`}
              variant="outline"
              size="sm"
              spacing={0}
              defaultValue={[copy[direction].views[0]]}
            >
              {copy[direction].views.map((item) => (
                <ToggleGroupItem key={item} value={item}>
                  {item}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </DirectionProvider>
      ))}
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`direction-${theme}-${mode}`);
});
