// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReasoningEffort } from "../packages/sprout/src/components/reasoning-effort.js";

const levels = ["Low", "Medium", "High", "Max"];
let frames: FrameRequestCallback[] = [];
let now = 0;

function tick(ms: number) {
  act(() => {
    now += ms;
    const run = frames;
    frames = [];
    for (const f of run) f(now);
  });
}
const settle = () => {
  for (let i = 0; i < 40; i++) tick(20);
};

beforeEach(() => {
  frames = [];
  now = 0;
  vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) =>
    frames.push(f),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    width: 256,
  } as DOMRect);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Effort({
  initial = 1,
  count = 4,
}: {
  initial?: number;
  count?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <ReasoningEffort
      levels={levels.slice(0, count)}
      value={value}
      onValueChange={setValue}
      label="Model"
    />
  );
}

const slider = () => screen.getByRole("slider");
const now$ = () => slider().getAttribute("aria-valuenow");

describe("ReasoningEffort in the DOM", () => {
  it("drags across the track, opening the bubble at both ends", () => {
    render(<Effort />);
    fireEvent.pointerDown(slider(), { button: 2, clientX: 0 });
    fireEvent.pointerMove(slider(), { clientX: 0 });
    fireEvent.pointerUp(slider());
    expect(now$()).toBe("1");

    fireEvent.pointerDown(slider(), { button: 0, clientX: 0, pointerId: 1 });
    expect(now$()).toBe("0");
    settle();
    const shell = document.querySelector(
      "[data-slot='reasoning-effort-shell']",
    )!;
    const left = shell.getAttribute("d");
    fireEvent.pointerMove(slider(), { clientX: 128 });
    settle();
    fireEvent.pointerMove(slider(), { clientX: 256 });
    settle();
    expect(now$()).toBe("3");
    expect(shell.getAttribute("d")).not.toBe(left);
    fireEvent.pointerCancel(slider());
    settle();
    expect(document.querySelector("[data-dragging='false']")).toBeTruthy();
  });

  it("changes with the keyboard and clamps at the ends", () => {
    render(<Effort initial={0} />);
    fireEvent.keyDown(slider(), { key: "ArrowLeft" });
    expect(now$()).toBe("0");
    fireEvent.keyDown(slider(), { key: "ArrowUp" });
    fireEvent.keyDown(slider(), { key: "ArrowRight" });
    expect(now$()).toBe("2");
    fireEvent.keyDown(slider(), { key: "ArrowDown" });
    fireEvent.keyDown(slider(), { key: "End" });
    expect(now$()).toBe("3");
    fireEvent.keyDown(slider(), { key: "Home" });
    fireEvent.keyDown(slider(), { key: "a" });
    expect(now$()).toBe("0");
    settle();
  });

  it("skips tweens with reduced motion and handles a single level", () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: true })) as never;
    render(<Effort count={1} initial={0} />);
    fireEvent.pointerDown(slider(), { button: 0, clientX: 200 });
    fireEvent.pointerUp(slider());
    expect(frames).toHaveLength(0);
    window.matchMedia = matchMedia;
  });
});
