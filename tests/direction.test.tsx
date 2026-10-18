import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  DirectionProvider,
  useDirection,
  type TextDirection,
} from "../packages/sprout/src/components/direction.js";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../packages/sprout/src/components/breadcrumb.js";
import * as sprout from "../packages/sprout/src/index.js";

function Readout() {
  return <output>{useDirection()}</output>;
}

describe("Direction", () => {
  it("is exported from the package root", () => {
    expect(sprout.DirectionProvider).toBe(DirectionProvider);
    expect(sprout.useDirection).toBe(useDirection);
  });

  it("defaults to left to right without a provider or direction", () => {
    expect(renderToString(<Readout />)).toBe("<output>ltr</output>");
    expect(
      renderToString(
        <DirectionProvider>
          <Readout />
        </DirectionProvider>,
      ),
    ).toBe("<output>ltr</output>");
  });

  it.each<TextDirection>(["ltr", "rtl"])(
    "passes %s to descendants and renders no element of its own",
    (direction) => {
      expect(
        renderToString(
          <DirectionProvider direction={direction}>
            <Readout />
          </DirectionProvider>,
        ),
      ).toBe(`<output>${direction}</output>`);
    },
  );

  it("uses the nearest provider", () => {
    expect(
      renderToString(
        <DirectionProvider direction="rtl">
          <Readout />
          <DirectionProvider direction="ltr">
            <Readout />
          </DirectionProvider>
        </DirectionProvider>,
      ),
    ).toBe("<output>rtl</output><output>ltr</output>");
  });

  it("wraps a dir element and breadcrumb as the playground does", () => {
    const html = renderToString(
      <DirectionProvider direction="rtl">
        <div dir="rtl" className="w-full">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#example">المشاريع</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>الحديقة</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </DirectionProvider>,
    );
    expect(html.startsWith('<div dir="rtl" class="w-full"><nav')).toBe(true);
    expect(html).toContain("المشاريع");
    expect(html).toContain('aria-current="page"');
  });
});
