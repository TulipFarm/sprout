import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../packages/sprout/src/components/breadcrumb.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("breadcrumb %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: "inline-grid",
        padding: 16,
        background: "var(--sprout-canvas)",
      }}
    >
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#home">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 8 8 2l6 6v6H2z" fill="none" stroke="currentColor" />
              </svg>
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#projects">Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Meadow</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>,
  );
  // Park the pointer on the padding so no link renders its hover color.
  await screen.getByTestId("shot").hover({ position: { x: 2, y: 2 } });
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`breadcrumb-${theme}-${mode}`);
});
