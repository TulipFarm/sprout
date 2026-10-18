// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GlassBanner,
  GlassChip,
} from "../packages/sprout/src/components/glass-banner.js";

let frames: FrameRequestCallback[] = [];
const flush = (count = 200) =>
  act(() => {
    for (let i = 0; i < count && frames.length; i++) frames.shift()!(0);
  });
const realMatchMedia = window.matchMedia;

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) =>
    frames.push(f),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  HTMLElement.prototype.setPointerCapture = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.matchMedia = realMatchMedia;
});

function setup() {
  const ref = vi.fn();
  render(
    <GlassBanner title="Title">
      <GlassChip ref={ref}>Chip</GlassChip>
    </GlassBanner>,
  );
  expect(ref).toHaveBeenCalled();
  return screen.getByText("Chip").closest("li")!;
}

describe("GlassChip in the DOM", () => {
  it("follows the pointer, stretches, and springs home", () => {
    const chip = setup();
    fireEvent.pointerDown(chip, { button: 2, pointerId: 1 });
    expect(chip.hasAttribute("data-dragging")).toBe(false);
    fireEvent.pointerDown(chip, {
      button: 0,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerDown(chip, { button: 0, pointerId: 2 });
    expect(chip.hasAttribute("data-dragging")).toBe(true);
    fireEvent.pointerMove(chip, { pointerId: 2, clientX: 99 });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 40, clientY: 20 });
    flush(3);
    expect(chip.style.transform).toContain("translate(");
    fireEvent.pointerUp(chip, { pointerId: 2 });
    fireEvent.pointerUp(chip, { pointerId: 1 });
    flush(500);
    expect(chip.style.transform).toBe("");
    expect(chip.hasAttribute("data-dragging")).toBe(false);
  });

  it("snaps home with reduced motion", () => {
    window.matchMedia = vi.fn(() => ({ matches: true })) as never;
    const chip = setup();
    fireEvent.pointerDown(chip, { button: 0, pointerId: 1 });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 40 });
    flush(2);
    fireEvent.pointerCancel(chip, { pointerId: 1 });
    expect(chip.style.transform).toBe("");
  });
});
