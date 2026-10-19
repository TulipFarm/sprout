import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { useEffect, useState, type CSSProperties } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
  type CarouselApi,
  type CarouselOrientation,
} from "../../packages/sprout/src/components/carousel.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const steps = ["Plant", "Water", "Grow"];

function Position() {
  const { selectedIndex, snapCount } = useCarousel();
  return (
    <p data-testid="position" aria-live="polite">
      Slide {selectedIndex + 1} of {Math.max(snapCount, 1)}
    </p>
  );
}

function Steps({
  orientation = "horizontal",
}: {
  orientation?: CarouselOrientation;
}) {
  const vertical = orientation === "vertical";
  const content = (
    <CarouselContent>
      {steps.map((label, index) => (
        <CarouselItem key={label} aria-label={`${index + 1} of 3`}>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              boxSizing: "border-box",
              height: 160,
              border: "1px solid var(--sprout-line)",
              borderRadius: 12,
              userSelect: "none",
            }}
          >
            {index + 1}. {label}
          </div>
        </CarouselItem>
      ))}
    </CarouselContent>
  );
  return (
    <div
      data-testid="frame"
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: vertical ? 320 : 480,
        padding: vertical ? "48px 0" : "0 48px",
      }}
    >
      <Carousel
        orientation={orientation}
        aria-label={`Growing steps, ${orientation}`}
      >
        {vertical ? (
          <div
            style={{ display: "flex", flexDirection: "column", height: 160 }}
          >
            {content}
          </div>
        ) : (
          content
        )}
        <CarouselPrevious />
        <CarouselNext />
        <Position />
      </Carousel>
    </div>
  );
}

const guides = ["Tomatoes", "Basil", "Lettuce", "Carrots", "Peas"];

function Guides() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!api) return;
    const sync = (current: CarouselApi) => {
      setSelected(current.selectedScrollSnap());
      setCount(current.scrollSnapList().length);
    };
    sync(api);
    api.on("select", sync).on("reInit", sync);
    return () => {
      api.off("select", sync).off("reInit", sync);
    };
  }, [api]);
  return (
    <div style={{ boxSizing: "border-box", maxWidth: 480, padding: "0 48px" }}>
      <Carousel
        aria-label="Planting guides"
        opts={{ align: "start", loop: true }}
        setApi={setApi}
        style={
          {
            "--sprout-carousel-basis": "calc((100% - 16px) / 2)",
          } as CSSProperties
        }
      >
        <CarouselContent>
          {guides.map((title, index) => (
            <CarouselItem key={title} aria-label={`${index + 1} of 5`}>
              <article style={{ minHeight: 104 }}>{title}</article>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Go to position ${index + 1}`}
          aria-current={index === selected ? "true" : undefined}
          onClick={() => api?.scrollTo(index)}
        />
      ))}
      <p data-testid="guides-status">
        Position {selected + 1} of {Math.max(count, 1)}
      </p>
    </div>
  );
}

function EdgeArrows() {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } =
    useCarousel();
  return (
    <>
      {canScrollPrev && (
        <button type="button" aria-label="Previous chips" onClick={scrollPrev}>
          ‹
        </button>
      )}
      {canScrollNext && (
        <button type="button" aria-label="Next chips" onClick={scrollNext}>
          ›
        </button>
      )}
    </>
  );
}

const chips = [
  "Price list 2026.xlsx",
  "Returns policy.pdf",
  "Onboarding checklist.docx",
  "garden-notes.txt",
  "Spring planting plan.md",
  "inventory.json",
  "Q3 launch deck.pptx",
];

function Row() {
  return (
    <div style={{ width: 360 }}>
      <Carousel
        aria-label="Attached files"
        opts={{ align: "start", dragFree: true }}
        style={
          {
            "--sprout-carousel-gap": "8px",
            "--sprout-carousel-basis": "auto",
          } as CSSProperties
        }
      >
        <CarouselContent>
          {chips.map((name) => (
            <CarouselItem key={name}>
              <button type="button">{name}</button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <EdgeArrows />
      </Carousel>
    </div>
  );
}

const viewport = (scope: Element = document.body) =>
  scope.querySelector<HTMLElement>('[data-slot="carousel-content"]')!;
const status = () => page.getByTestId("position");
const slides = () =>
  [...document.querySelectorAll('[aria-roledescription="slide"]')].map((node) =>
    node.getBoundingClientRect(),
  );

describe("Carousel in a real browser", () => {
  it.each(themes)(
    "%s %s passes axe with arrows inside the frame",
    async (theme, mode) => {
      await emulate({ reducedMotion: true });
      setTheme(theme, mode);
      const screen = await render(
        <div style={{ display: "grid", gap: 16, padding: 16 }}>
          <Steps />
          <Steps orientation="vertical" />
        </div>,
      );
      await settle();
      for (const frame of screen.container.querySelectorAll(
        '[data-testid="frame"]',
      )) {
        const outer = frame.getBoundingClientRect();
        for (const control of frame.querySelectorAll(
          ".sprout-carousel-control",
        )) {
          const box = control.getBoundingClientRect();
          expect(box.left).toBeGreaterThanOrEqual(outer.left);
          expect(box.right).toBeLessThanOrEqual(outer.right);
          expect(box.top).toBeGreaterThanOrEqual(outer.top);
        }
      }
      expect(await axeViolations(screen.container)).toEqual([]);
    },
  );

  it("horizontal arrows step one slide and turn off at each end", async () => {
    await emulate({ reducedMotion: true });
    await render(<Steps />);
    const previous = page.getByRole("button", { name: "Previous slide" });
    const next = page.getByRole("button", { name: "Next slide" });
    await expect.element(status()).toHaveTextContent("Slide 1 of 3");
    await expect.element(previous).toHaveAttribute("aria-disabled", "true");
    expect(getComputedStyle(next.element()).borderRadius).toBe("999px");
    const view = viewport().getBoundingClientRect();
    const [first, second] = slides();
    expect(Math.abs(first!.width - view.width)).toBeLessThan(1);
    expect(Math.round(second!.left - first!.right)).toBe(16);

    await next.click();
    await expect.element(status()).toHaveTextContent("Slide 2 of 3");
    await expect
      .poll(() => Math.round(viewport().scrollLeft))
      .toBe(Math.round(view.width + 16));
    await next.click();
    await expect.element(status()).toHaveTextContent("Slide 3 of 3");
    await expect.element(next).toHaveAttribute("aria-disabled", "true");
    await expect.element(next).toHaveFocus();

    await userEvent.keyboard("{ArrowLeft}");
    await expect.element(status()).toHaveTextContent("Slide 2 of 3");
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowLeft}");
    await expect.element(status()).toHaveTextContent("Slide 1 of 3");
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(status()).toHaveTextContent("Slide 2 of 3");
    await previous.click();
    await expect.element(status()).toHaveTextContent("Slide 1 of 3");
    await expect.poll(() => viewport().scrollLeft).toBe(0);
  });

  it("vertical carousel scrolls up and down with turned arrows", async () => {
    await emulate({ reducedMotion: true });
    await render(<Steps orientation="vertical" />);
    const previous = page.getByRole("button", { name: "Previous slide" });
    const next = page.getByRole("button", { name: "Next slide" });
    expect(getComputedStyle(viewport()).scrollSnapType).toBe("y mandatory");
    expect(
      getComputedStyle(document.querySelector(".sprout-carousel-track")!)
        .flexDirection,
    ).toBe("column");
    expect(getComputedStyle(next.element()).rotate).toBe("90deg");
    expect(getComputedStyle(previous.element()).rotate).toBe("90deg");
    const view = viewport().getBoundingClientRect();
    expect(Math.round(view.height)).toBe(160);
    const up = previous.element().getBoundingClientRect();
    const down = next.element().getBoundingClientRect();
    expect(up.bottom).toBeLessThanOrEqual(view.top);
    expect(down.top).toBeGreaterThanOrEqual(view.bottom);
    expect(
      Math.abs(up.left + up.width / 2 - (view.left + view.width / 2)),
    ).toBeLessThan(1);

    await next.click();
    await expect.element(status()).toHaveTextContent("Slide 2 of 3");
    await expect.poll(() => viewport().scrollTop).toBe(176);
    expect(viewport().scrollLeft).toBe(0);
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(status()).toHaveTextContent("Slide 3 of 3");
    await expect.element(next).toHaveAttribute("aria-disabled", "true");
    await userEvent.keyboard("{ArrowUp}");
    await expect.element(status()).toHaveTextContent("Slide 2 of 3");
    await userEvent.keyboard("{ArrowLeft}");
    await expect.element(status()).toHaveTextContent("Slide 1 of 3");
  });

  it("a viewport without focusable slides takes focus and answers Home and End", async () => {
    await emulate({ reducedMotion: true });
    await render(
      <>
        <Steps />
        <Row />
      </>,
    );
    const steps = viewport();
    expect(steps).toHaveAttribute("tabindex", "0");
    await userEvent.tab();
    expect(document.activeElement).toBe(steps);
    expect(getComputedStyle(steps).outlineStyle).toBe("solid");
    await userEvent.keyboard("{End}");
    await expect.element(status()).toHaveTextContent("Slide 3 of 3");
    await userEvent.keyboard("{Home}");
    await expect.element(status()).toHaveTextContent("Slide 1 of 3");
    await userEvent.tab();
    await expect
      .element(page.getByRole("button", { name: "Previous slide" }))
      .toHaveFocus();
    const row = page.getByRole("region", { name: "Attached files" }).element();
    expect(viewport(row)).not.toHaveAttribute("tabindex");
  });

  it("dragging with a mouse moves one slide and snaps back on a nudge", async () => {
    await emulate({ reducedMotion: true });
    await render(<Steps />);
    const node = viewport();
    const box = node.getBoundingClientRect();
    const y = box.top + box.height / 2;
    const fire = (type: string, x: number) =>
      node.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
          clientX: x,
          clientY: y,
        }),
      );
    const drag = async (from: number, to: number) => {
      fire("pointerdown", from);
      for (let step = 1; step <= 6; step++)
        fire("pointermove", from + ((to - from) * step) / 6);
      await new Promise(requestAnimationFrame);
      return node.hasAttribute("data-dragging");
    };
    const dragging = await drag(
      box.left + box.width * 0.7,
      box.left + box.width * 0.4,
    );
    expect(dragging).toBe(true);
    expect(getComputedStyle(node).scrollSnapType).toBe("none");
    fire("pointerup", box.left + box.width * 0.4);
    await expect.poll(() => node.hasAttribute("data-dragging")).toBe(false);
    await expect.element(status()).toHaveTextContent("Slide 2 of 3");
    await expect
      .poll(() => Math.round(node.scrollLeft))
      .toBe(Math.round(box.width + 16));

    await drag(box.left + box.width * 0.5, box.left + box.width * 0.5 + 12);
    fire("pointerup", box.left + box.width * 0.5 + 12);
    await expect.element(status()).toHaveTextContent("Slide 2 of 3");
    await expect
      .poll(() => Math.round(node.scrollLeft))
      .toBe(Math.round(box.width + 16));
  });

  it("free rows keep chip widths, gap and useCarousel edge arrows", async () => {
    await emulate({ reducedMotion: true });
    await render(<Row />);
    const row = page.getByRole("region", { name: "Attached files" }).element();
    const node = viewport(row);
    expect(node).toHaveAttribute("data-align", "start");
    expect(node).toHaveAttribute("data-drag-free", "");
    expect(getComputedStyle(node).scrollSnapType).toBe("none");
    expect(
      getComputedStyle(row.querySelector('[data-slot="carousel-track"]')!)
        .columnGap,
    ).toBe("8px");
    const widths = slides().map((rect) => Math.round(rect.width));
    expect(new Set(widths).size).toBeGreaterThan(1);
    await expect
      .element(page.getByRole("button", { name: "Previous chips" }))
      .not.toBeInTheDocument();
    await page.getByRole("button", { name: "Next chips" }).click();
    await expect.poll(() => node.scrollLeft).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Previous chips" }).click();
    await expect.poll(() => node.scrollLeft).toBe(0);

    (
      page.getByRole("button", { name: chips[0] }).element() as HTMLElement
    ).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.poll(() => node.scrollLeft).toBeGreaterThan(0);
    await userEvent.keyboard("{Home}");
    await expect.poll(() => node.scrollLeft).toBe(0);
    node.scrollTo({ left: node.scrollWidth });
    await expect
      .element(page.getByRole("button", { name: "Next chips" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Previous chips" }))
      .toBeVisible();
  });

  it("several per view loop and follow the API dots, then fit a phone", async () => {
    await emulate({ reducedMotion: true });
    await render(<Guides />);
    const dots = () => page.getByRole("button", { name: /^Go to position/ });
    const guidesStatus = page.getByTestId("guides-status");
    await expect.element(guidesStatus).toHaveTextContent("Position 1 of 4");
    expect(dots().elements()).toHaveLength(4);
    const view = viewport().getBoundingClientRect();
    expect(Math.abs(slides()[0]!.width - (view.width - 16) / 2)).toBeLessThan(
      1,
    );

    await page.getByRole("button", { name: "Previous slide" }).click();
    await expect.element(guidesStatus).toHaveTextContent("Position 4 of 4");
    await expect.element(dots().nth(3)).toHaveAttribute("aria-current", "true");
    await page.getByRole("button", { name: "Next slide" }).click();
    await expect.element(guidesStatus).toHaveTextContent("Position 1 of 4");
    await dots().nth(2).click();
    await expect.element(guidesStatus).toHaveTextContent("Position 3 of 4");
    await expect
      .element(page.getByRole("group", { name: "3 of 5" }))
      .toBeInViewport();
  });

  it("scrolling animates only when motion is allowed", async () => {
    await render(<Steps />);
    expect(getComputedStyle(viewport()).scrollBehavior).toBe("smooth");
    await page.getByRole("button", { name: "Next slide" }).click();
    await expect.element(status()).toHaveTextContent("Slide 2 of 3");
    await emulate({ reducedMotion: true });
    expect(getComputedStyle(viewport()).scrollBehavior).toBe("auto");
  });

  it("touch screens get 44px arrows that fit a phone", async () => {
    await emulate({ reducedMotion: true, coarse: true });
    await page.viewport(390, 844);
    await render(
      <div style={{ width: "100%", maxWidth: 390 }}>
        <Steps />
      </div>,
    );
    const next = page.getByRole("button", { name: "Next slide" });
    const box = next.element().getBoundingClientRect();
    expect([Math.round(box.width), Math.round(box.height)]).toEqual([44, 44]);
    await next.click();
    await expect.element(status()).toHaveTextContent("Slide 2 of 3");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });
});
