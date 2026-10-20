import { describe, expect, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetContentProps,
  type SheetTitleSize,
} from "../../packages/sprout/src/components/sheet.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

function Sample({
  title = "Pending work",
  titleSize,
  rows = 3,
  children,
  ...content
}: SheetContentProps & {
  title?: string;
  titleSize?: SheetTitleSize;
  rows?: number;
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button />}>Open {title}</SheetTrigger>
      <SheetContent {...content}>
        <SheetHeader>
          <SheetTitle size={titleSize}>{title}</SheetTitle>
          <SheetDescription>
            Tasks and approvals that need your attention.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {children}
          {Array.from({ length: rows }, (_, index) => (
            <p key={index}>
              Harbor Foods asked to move the spring bulb delivery to Thursday
              morning. Item {index + 1}.
            </p>
          ))}
        </SheetBody>
        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          <SheetClose render={<Button />}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const sheets = () => document.querySelectorAll('[data-slot="sheet-content"]');
const sheet = () =>
  document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!;
const box = () => sheet().getBoundingClientRect();

async function openSample(ui = <Sample />) {
  const screen = await render(ui);
  const trigger = screen.getByRole("button", { name: /^Open / });
  await trigger.click();
  await expect.poll(() => sheets().length).toBe(1);
  await settle();
  return { screen, trigger };
}

/** The sheet stays in the viewport and nothing inside spills sideways. */
function contained(element: HTMLElement) {
  const outer = element.getBoundingClientRect();
  const inside = [...element.querySelectorAll("*")].every((child) => {
    const rect = child.getBoundingClientRect();
    if (!rect.width || getComputedStyle(child).position === "fixed")
      return true;
    return rect.left >= outer.left - 1 && rect.right <= outer.right + 1;
  });
  return {
    inViewport: outer.left >= -0.5 && outer.right <= innerWidth + 0.5,
    inside,
    noScroll: element.scrollWidth <= element.clientWidth + 1,
  };
}
const fits = { inViewport: true, inside: true, noScroll: true };

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type Point = { x: number; y: number };
const centre = (rect: DOMRect): Point => ({
  x: Math.round(rect.left + rect.width / 2),
  y: Math.round(rect.top + rect.height / 2),
});

async function touchDrag(from: Point, to: Point, steps = 12) {
  const session = cdp();
  const touch = (type: string, points: Point[]) =>
    session.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  await touch("touchStart", [from]);
  for (let step = 1; step <= steps; step++) {
    await pause(16);
    await touch("touchMove", [
      {
        x: from.x + ((to.x - from.x) * step) / steps,
        y: from.y + ((to.y - from.y) * step) / steps,
      },
    ]);
  }
  // Hold still so the release is not a flick.
  await pause(120);
  await touch("touchMove", [to]);
  await touch("touchEnd", []);
}

async function mouseDrag(from: Point, to: Point, steps = 12) {
  const session = cdp();
  const mouse = (type: string, { x, y }: Point) =>
    session.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: "left",
      buttons: type === "mouseReleased" ? 0 : 1,
      clickCount: 1,
    });
  await mouse("mouseMoved", from);
  await mouse("mousePressed", from);
  for (let step = 1; step <= steps; step++)
    await mouse("mouseMoved", {
      x: from.x + ((to.x - from.x) * step) / steps,
      y: from.y + ((to.y - from.y) * step) / steps,
    });
  await mouse("mouseReleased", to);
}

const widths = { default: 384, lg: 512, xl: 672, full: 1440 } as const;

describe("Sheet in a real browser", () => {
  describe.each(themes)("%s %s", (theme, mode) => {
    it.each([390, 1440])(
      "every size fits at %ipx and passes axe",
      async (width) => {
        setTheme(theme, mode);
        await page.viewport(width, 900);
        for (const size of ["default", "lg", "xl", "full"] as const) {
          const { screen } = await openSample(<Sample size={size} />);
          const element = sheet();
          expect(element.dataset.size).toBe(size);
          expect(element.dataset.side).toBe("right");
          expect(contained(element)).toEqual(fits);
          const expected =
            size === "full"
              ? width
              : width === 1440
                ? widths[size]
                : size === "default"
                  ? width * 0.75
                  : width;
          expect(Math.abs(box().width - expected)).toBeLessThan(1);
          expect(box().height).toBe(900);
          expect(Math.round(box().right)).toBe(width);
          expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
            width,
          );
          expect(await axeViolations()).toEqual([]);
          await userEvent.keyboard("{Escape}");
          await expect.poll(() => sheets().length).toBe(0);
          await screen.unmount();
        }
      },
    );
  });

  it.each([390, 1280])("each side hugs its edge at %ipx", async (width) => {
    await page.viewport(width, 800);
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const { screen } = await openSample(<Sample side={side} />);
      expect(sheet().dataset.side).toBe(side);
      expect(contained(sheet())).toEqual(fits);
      const rect = box();
      if (side === "top") expect(rect.top).toBe(0);
      if (side === "bottom") expect(Math.round(rect.bottom)).toBe(800);
      if (side === "left") expect(rect.left).toBe(0);
      if (side === "right") expect(Math.round(rect.right)).toBe(width);
      if (side === "top" || side === "bottom") {
        expect(rect.width).toBe(width);
        expect(rect.height).toBeLessThan(800 * 0.85 + 1);
      }
      expect(await axeViolations()).toEqual([]);
      await userEvent.keyboard("{Escape}");
      await expect.poll(() => sheets().length).toBe(0);
      await screen.unmount();
    }
  });

  it("traps focus, closes with Escape or an outside click, and returns focus", async () => {
    const { trigger } = await openSample();
    await expect
      .element(page.getByRole("dialog", { name: "Pending work" }))
      .toHaveAccessibleDescription(
        "Tasks and approvals that need your attention.",
      );
    const inside = () => sheet().contains(document.activeElement);
    await expect.poll(inside).toBe(true);
    for (const key of ["{Tab}", "{Shift>}{Tab}{/Shift}"])
      for (let step = 0; step < 4; step++) {
        await userEvent.keyboard(key);
        expect(inside()).toBe(true);
      }
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => sheets().length).toBe(0);
    await expect.element(trigger).toHaveFocus();

    await trigger.click();
    await expect.poll(() => sheets().length).toBe(1);
    await settle();
    await userEvent.click(document.body, { position: { x: 10, y: 360 } });
    await expect.poll(() => sheets().length).toBe(0);
  });

  it("title sizes, the corner close, and footer layout", async () => {
    let { screen } = await openSample(<Sample titleSize="lg" />);
    const title = () =>
      document.querySelector<HTMLElement>('[data-slot="sheet-title"]')!;
    expect(title().dataset.size).toBe("lg");
    expect(getComputedStyle(title()).fontSize).toBe("20px");
    await expect
      .element(page.getByRole("button", { name: "Close", exact: true }))
      .toBeVisible();
    const footer = () =>
      getComputedStyle(document.querySelector('[data-slot="sheet-footer"]')!);
    expect(footer().flexDirection).toBe("column");
    await page.getByRole("button", { name: "Done" }).click();
    await expect.poll(() => sheets().length).toBe(0);
    await screen.unmount();

    ({ screen } = await openSample(
      <Sample side="bottom" showCloseButton={false} />,
    ));
    expect(getComputedStyle(title()).fontSize).toBe("16px");
    expect(
      page.getByRole("button", { name: "Close", exact: true }).elements(),
    ).toHaveLength(0);
    expect(footer().flexDirection).toBe("row");
    expect(footer().justifyContent).toBe("flex-end");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => sheets().length).toBe(0);
    await screen.unmount();

    await page.viewport(390, 844);
    await openSample(<Sample side="bottom" />);
    expect(footer().flexDirection).toBe("column");
  });

  it("keepMounted keeps a draft while closed", async () => {
    const { trigger } = await openSample(
      <Sample keepMounted>
        <label>
          Title <input />
        </label>
      </Sample>,
    );
    await page.getByLabelText("Title").fill("Crew planning");
    await userEvent.keyboard("{Escape}");
    await expect
      .poll(() => sheet().hidden || !sheet().checkVisibility())
      .toBe(true);
    await trigger.click();
    await expect
      .element(page.getByLabelText("Title"))
      .toHaveValue("Crew planning");
  });

  it("Escape in a nested sheet closes only the inner one", async () => {
    await openSample(
      <Sample>
        <Sample title="Complete member" size="lg" />
      </Sample>,
    );
    await page.getByRole("button", { name: "Open Complete member" }).click();
    await expect.poll(() => sheets().length).toBe(2);
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => sheets().length).toBe(1);
    await expect
      .element(page.getByRole("dialog", { name: "Pending work" }))
      .toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => sheets().length).toBe(0);
  });

  it("slides over 180ms and stops with reduced motion", async () => {
    let { screen } = await openSample();
    expect(getComputedStyle(sheet()).transitionDuration).toBe(
      "0.18s, 0.18s, 0.18s",
    );
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => sheets().length).toBe(0);
    await screen.unmount();
    await emulate({ reducedMotion: true });
    ({ screen } = await openSample());
    expect(getComputedStyle(sheet()).transitionDuration).toBe("0s");
  });

  describe("swipe to close", () => {
    it("a bottom sheet springs back from a short swipe and closes from a long one", async () => {
      await page.viewport(390, 844);
      const { trigger } = await openSample(
        <Sample side="bottom" showSwipeHandle />,
      );
      expect(sheet().dataset.swipeDirection).toBe("down");
      const handle = sheet().querySelector<HTMLElement>(
        '[data-slot="sheet-swipe-handle"]',
      )!;
      expect(handle.getAttribute("aria-hidden")).toBe("true");
      expect(getComputedStyle(handle).cursor).toBe("grab");
      const resting = box();
      const handleBox = handle.getBoundingClientRect();
      expect(handleBox.top - resting.top).toBeLessThan(12);
      expect(Math.round(handleBox.width)).toBe(Math.round(resting.width));

      const start = centre(
        page
          .getByRole("heading", { name: "Pending work" })
          .element()
          .getBoundingClientRect(),
      );
      await touchDrag(start, { x: start.x, y: start.y + 40 });
      await settle();
      expect(sheets()).toHaveLength(1);
      expect(box().top).toBeCloseTo(resting.top, 0);

      await touchDrag(
        start,
        { x: start.x, y: start.y + resting.height * 0.7 },
        20,
      );
      await expect.poll(() => sheets().length).toBe(0);
      await expect.element(trigger).toHaveFocus();
    });

    it("the panel follows the finger while it moves", async () => {
      await page.viewport(390, 844);
      await openSample(<Sample side="bottom" showSwipeHandle />);
      const resting = box();
      const start = centre(
        page
          .getByRole("heading", { name: "Pending work" })
          .element()
          .getBoundingClientRect(),
      );
      const session = cdp();
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [start],
      });
      for (let step = 1; step <= 8; step++) {
        await pause(16);
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: start.x, y: start.y + step * 10 }],
        });
      }
      await expect.poll(() => sheet().hasAttribute("data-swiping")).toBe(true);
      const moved = box().top - resting.top;
      expect(moved).toBeGreaterThan(40);
      expect(moved).toBeLessThanOrEqual(81);
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect.poll(() => sheet().hasAttribute("data-swiping")).toBe(false);
    });

    it("a right sheet ignores a vertical scroll and closes from a right swipe", async () => {
      await page.viewport(390, 420);
      const { trigger } = await openSample(<Sample rows={12} />);
      expect(sheet().dataset.swipeDirection).toBe("right");
      const resting = box();
      const body = sheet().querySelector<HTMLElement>(
        '[data-slot="sheet-body"]',
      )!;
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
      const rect = body.getBoundingClientRect();
      const point = {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.bottom - 20),
      };
      await touchDrag(point, { x: point.x, y: point.y - 150 });
      await expect.poll(() => body.scrollTop).toBeGreaterThan(0);
      await settle();
      expect(sheets()).toHaveLength(1);
      expect(box().left).toBeCloseTo(resting.left, 0);

      await touchDrag(
        point,
        { x: point.x + resting.width * 0.7, y: point.y },
        20,
      );
      await expect.poll(() => sheets().length).toBe(0);
      await expect.element(trigger).toHaveFocus();
    });

    it("a left sheet only swipes toward the left", async () => {
      await openSample(<Sample side="left" />);
      expect(sheet().dataset.swipeDirection).toBe("left");
      const width = box().width;
      const start = centre(
        page.getByRole("heading").element().getBoundingClientRect(),
      );
      await touchDrag(start, { x: start.x + 200, y: start.y }, 20);
      await settle();
      expect(sheets()).toHaveLength(1);
      expect(box().left).toBe(0);
      await touchDrag(start, { x: start.x - width * 0.7, y: start.y }, 20);
      await expect.poll(() => sheets().length).toBe(0);
    });

    it("mouse drags select text without moving the sheet, but the handle drags it", async () => {
      const { trigger } = await openSample(
        <Sample showSwipeHandle rows={1}>
          <label htmlFor="note">Note</label>
          <textarea
            id="note"
            defaultValue="Harbor Foods asked to move the delivery"
          />
        </Sample>,
      );
      const resting = box();
      const stillOpen = async () => {
        expect(sheets()).toHaveLength(1);
        expect(sheet().hasAttribute("data-swiping")).toBe(false);
        await settle();
        expect(box().left).toBeCloseTo(resting.left, 0);
      };

      const note = page
        .getByRole("textbox", { name: "Note" })
        .element() as HTMLTextAreaElement;
      const noteBox = note.getBoundingClientRect();
      await mouseDrag(
        { x: Math.round(noteBox.left + 4), y: Math.round(noteBox.top + 12) },
        { x: Math.round(noteBox.right - 4), y: Math.round(noteBox.top + 12) },
      );
      await stillOpen();
      expect(note.selectionEnd - note.selectionStart).toBeGreaterThan(10);

      const copy = page
        .getByText(/Item 1\./)
        .element()
        .getBoundingClientRect();
      await mouseDrag(
        { x: Math.round(copy.left + 2), y: Math.round(copy.top + 8) },
        { x: Math.round(copy.right - 2), y: Math.round(copy.top + 8) },
      );
      await stillOpen();
      expect(String(getSelection())).toContain("Harbor Foods");

      const header = centre(
        sheet()
          .querySelector('[data-slot="sheet-header"]')!
          .getBoundingClientRect(),
      );
      await mouseDrag(header, {
        x: header.x + Math.round(resting.width),
        y: header.y,
      });
      await stillOpen();

      const handleBox = sheet()
        .querySelector('[data-slot="sheet-swipe-handle"]')!
        .getBoundingClientRect();
      expect(Math.abs(handleBox.left - resting.left)).toBeLessThanOrEqual(1);
      const handle = centre(handleBox);
      await mouseDrag(handle, { x: handle.x + 40, y: handle.y });
      await stillOpen();
      await mouseDrag(handle, {
        x: handle.x + Math.round(resting.width * 0.7),
        y: handle.y,
      });
      await expect.poll(() => sheets().length).toBe(0);
      await expect.element(trigger).toHaveFocus();
    });

    it("Escape and an outside click still close a swipeable sheet", async () => {
      await page.viewport(390, 844);
      const { trigger } = await openSample(
        <Sample side="bottom" showSwipeHandle />,
      );
      await userEvent.keyboard("{Escape}");
      await expect.poll(() => sheets().length).toBe(0);
      await expect.element(trigger).toHaveFocus();
      await trigger.click();
      await expect.poll(() => sheets().length).toBe(1);
      await settle();
      await userEvent.click(document.body, { position: { x: 195, y: 40 } });
      await expect.poll(() => sheets().length).toBe(0);
      await expect.element(trigger).toHaveFocus();
    });
  });
});
