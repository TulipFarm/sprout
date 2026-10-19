import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../packages/sprout/src/components/breadcrumb.js";
import {
  DirectionProvider,
  useDirection,
  type TextDirection,
} from "../../packages/sprout/src/components/direction.js";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../packages/sprout/src/components/toggle-group.js";
import { axeViolations, setTheme, settle, themes } from "./support.js";

const copy = {
  ltr: {
    first: "Projects",
    page: "Garden",
    view: "View",
    views: ["List", "Board"],
  },
  rtl: {
    first: "المشاريع",
    page: "الحديقة",
    view: "العرض",
    views: ["قائمة", "لوحة"],
  },
} as const;

function Path({ direction }: { direction: TextDirection }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#projects">
            {copy[direction].first}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{copy[direction].page}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function Readout() {
  return <output data-testid="readout">{useDirection()}</output>;
}

function Frame({ direction }: { direction: TextDirection }) {
  const text = copy[direction];
  return (
    <DirectionProvider direction={direction}>
      <div
        dir={direction}
        data-testid={direction}
        style={{ maxWidth: 360, display: "grid", gap: 8 }}
      >
        <Path direction={direction} />
        <ToggleGroup
          aria-label={text.view}
          variant="outline"
          size="sm"
          spacing={0}
          defaultValue={[text.views[0]]}
        >
          {text.views.map((item) => (
            <ToggleGroupItem key={item} value={item}>
              {item}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Readout />
      </div>
    </DirectionProvider>
  );
}

function Switchable() {
  const [direction, setDirection] = useState<TextDirection>("rtl");
  return (
    <>
      <button onClick={() => setDirection("ltr")}>Left to right</button>
      <Frame key={direction} direction={direction} />
    </>
  );
}

describe("Direction in a real browser", () => {
  it("breadcrumbs start on the reading side and the chevron flips in rtl", async () => {
    const screen = await render(
      <>
        <Frame direction="ltr" />
        <Frame direction="rtl" />
      </>,
    );
    for (const direction of ["ltr", "rtl"] as const) {
      const frame = screen.getByTestId(direction).element();
      const first = frame.querySelector("a")!.getBoundingClientRect();
      const current = frame
        .querySelector('[aria-current="page"]')!
        .getBoundingClientRect();
      const edge = frame.getBoundingClientRect();
      const chevron = frame.querySelector(
        '[data-slot="breadcrumb-separator"] svg',
      )!;
      if (direction === "ltr") {
        expect(first.x).toBeLessThan(current.x);
        expect(first.left - edge.left).toBeLessThan(4);
        expect(getComputedStyle(chevron).transform).toBe("none");
      } else {
        expect(first.x).toBeGreaterThan(current.x);
        expect(edge.right - first.right).toBeLessThan(4);
        expect(getComputedStyle(chevron).transform).not.toBe("none");
      }
    }
  });

  it("arrow keys and useDirection follow the provider", async () => {
    const screen = await render(<Switchable />);
    await expect
      .element(screen.getByTestId("readout"))
      .toHaveTextContent("rtl");
    const rtl = screen.getByRole("group", { name: "العرض" });
    (
      rtl.getByRole("button", { name: "قائمة" }).element() as HTMLElement
    ).focus();
    await userEvent.keyboard("{ArrowLeft}");
    const board = rtl.getByRole("button", { name: "لوحة" });
    await expect.element(board).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(board).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(rtl.getByRole("button", { name: "قائمة" }))
      .toHaveFocus();

    await screen.getByRole("button", { name: "Left to right" }).click();
    await expect
      .element(screen.getByTestId("readout"))
      .toHaveTextContent("ltr");
    const ltr = screen.getByRole("group", { name: "View" });
    (
      ltr.getByRole("button", { name: "List" }).element() as HTMLElement
    ).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(ltr.getByRole("button", { name: "Board" }))
      .toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect
      .element(ltr.getByRole("button", { name: "List" }))
      .toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect
      .element(screen.getByRole("link", { name: "Projects" }))
      .toHaveFocus();
  });

  it("fits a phone without overflow", async () => {
    await page.viewport(320, 640);
    const screen = await render(
      <>
        <Frame direction="ltr" />
        <Frame direction="rtl" />
      </>,
    );
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    for (const direction of ["ltr", "rtl"])
      expect(
        [...screen.getByTestId(direction).element().children].every(
          (child) => child.scrollWidth <= child.clientWidth + 1,
        ),
      ).toBe(true);
  });

  it.each(themes)("%s %s passes axe", async (theme, mode) => {
    setTheme(theme, mode);
    const screen = await render(
      <>
        <Frame direction="ltr" />
        <Frame direction="rtl" />
      </>,
    );
    await settle();
    expect(await axeViolations(screen.container)).toEqual([]);
  });
});
