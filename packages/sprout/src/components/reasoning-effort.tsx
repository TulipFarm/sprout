"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { cn } from "../internal/classes.js";

const TRACK = 256;
const HEIGHT = 32;
const RADIUS = HEIGHT / 2;
const BUMP_H = 20;
const REST_W = 27.2;
const DRAG_W = 33.6;
const REST_H = 27.2;
const EDGE_PAD = (HEIGHT - REST_H) / 2;
const SHOULDER = 23.572;
/** Space from each label edge to the foot of the shoulder. */
const TEXT_SIDE = 20;
/** How far the outer foot walks down the end cap once it passes the crown. */
const PHI_MAX = 0.6;
const PHI_REACH = 36;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

function smoothstep(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function plateauFor(textW: number) {
  return Math.max(8, textW + TEXT_SIDE * 2 - SHOULDER * 2);
}

function capFoot(side: -1 | 1, phi: number) {
  const crown = side === -1 ? RADIUS : TRACK - RADIUS;
  return {
    x: crown + side * RADIUS * Math.sin(phi),
    y: BUMP_H + RADIUS * (1 - Math.cos(phi)),
  };
}

function shellGeom(cx: number, plateauW: number) {
  const crownL = RADIUS;
  const crownR = TRACK - RADIUS;
  let topL = cx - plateauW / 2;
  let topR = topL + plateauW;
  let phiL = 0;
  let phiR = 0;

  const overflowL = crownL - (topL - SHOULDER);
  if (overflowL > 0) {
    phiL = PHI_MAX * smoothstep(overflowL / PHI_REACH);
    const foot = capFoot(-1, phiL);
    const minTopL = foot.x + SHOULDER * Math.cos(phiL);
    if (topL < minTopL) {
      topR += minTopL - topL;
      topL = minTopL;
    }
  }

  const overflowR = topR + SHOULDER - crownR;
  if (overflowR > 0) {
    phiR = PHI_MAX * smoothstep(overflowR / PHI_REACH);
    const foot = capFoot(1, phiR);
    const maxTopR = foot.x - SHOULDER * Math.cos(phiR);
    if (topR > maxTopR) {
      topL -= topR - maxTopR;
      topR = maxTopR;
    }
  }

  // A tilted shoulder is shorter in x, which would pull the label onto the
  // outer edge. Grow the plateau inward by that loss and keep the label with it.
  const insetL = phiL > 0 ? SHOULDER * (1 - Math.cos(phiL)) : 0;
  const insetR = phiR > 0 ? SHOULDER * (1 - Math.cos(phiR)) : 0;
  topR += insetL;
  topL -= insetR;

  return { topL, topR, phiL, phiR, insetL, insetR };
}

/** One shoulder curve. `phi` tilts the foot onto the cap tangent; 0 is flat. */
function shoulderCmds(
  footX: number,
  footY: number,
  platX: number,
  platY: number,
  phi: number,
  dir: 1 | -1,
) {
  const xScale = Math.abs(platX - footX) / SHOULDER;
  const yScale = Math.max(0.001, (footY - platY) / 20);
  const tangent = { x: dir * Math.cos(phi), y: -Math.sin(phi) };
  const map = (lx: number, ly: number) => ({
    x: footX + dir * lx * xScale,
    y: footY + (ly - 20) * yScale,
  });
  const h1 = 5.398 * xScale;
  const p0 = { x: footX, y: footY };
  const c1 = { x: footX + tangent.x * h1, y: footY + tangent.y * h1 };
  const c2 = map(10.012, 16.114);
  const p1 = map(10.93, 10.794);
  const c3 = map(11.916, 4.577);
  const c4 = map(17.277, 0);
  const p3 = { x: platX, y: platY };
  const fmt = (p: { x: number; y: number }) =>
    `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  if (dir === 1)
    return `C${fmt(c1)} ${fmt(c2)} ${fmt(p1)}C${fmt(c3)} ${fmt(c4)} ${fmt(p3)}`;
  return `C${fmt(c4)} ${fmt(c3)} ${fmt(p1)}C${fmt(c2)} ${fmt(c1)} ${fmt(p0)}`;
}

/** One outline: the pill, with the label bump grown out of its top edge. */
function shellPath(cx: number, open: number, plateauW: number) {
  const trackTop = BUMP_H;
  const trackBot = BUMP_H + HEIGHT;
  const crownL = RADIUS;
  const crownR = TRACK - RADIUS;
  if (open < 0.012) {
    return `M${crownL} ${trackTop}H${crownR}A${RADIUS} ${RADIUS} 0 0 1 ${crownR} ${trackBot}H${crownL}A${RADIUS} ${RADIUS} 0 0 1 ${crownL} ${trackTop}Z`;
  }

  const bumpTop = BUMP_H * (1 - open);
  const { topL, topR, phiL, phiR } = shellGeom(cx, plateauW);
  const cmds = [`M${crownL} ${trackBot}`];

  if (phiL > 0.001) {
    const foot = capFoot(-1, phiL);
    cmds.push(
      `A${RADIUS} ${RADIUS} 0 0 1 ${foot.x.toFixed(2)} ${foot.y.toFixed(2)}`,
    );
    cmds.push(shoulderCmds(foot.x, foot.y, topL, bumpTop, phiL, 1));
  } else {
    cmds.push(`A${RADIUS} ${RADIUS} 0 0 1 ${crownL} ${trackTop}`);
    const footL = topL - SHOULDER;
    if (footL > crownL + 0.4) cmds.push(`H${footL.toFixed(2)}`);
    cmds.push(shoulderCmds(footL, trackTop, topL, bumpTop, 0, 1));
  }

  if (topR > topL + 0.4) cmds.push(`H${topR.toFixed(2)}`);

  if (phiR > 0.001) {
    const foot = capFoot(1, phiR);
    cmds.push(shoulderCmds(foot.x, foot.y, topR, bumpTop, phiR, -1));
    cmds.push(`A${RADIUS} ${RADIUS} 0 0 1 ${crownR} ${trackBot}`);
  } else {
    const footR = topR + SHOULDER;
    cmds.push(shoulderCmds(footR, trackTop, topR, bumpTop, 0, -1));
    if (footR < crownR - 0.4) cmds.push(`H${crownR}`);
    cmds.push(`A${RADIUS} ${RADIUS} 0 0 1 ${crownR} ${trackBot}`);
  }

  cmds.push(`H${crownL}Z`);
  return cmds.join("");
}

function useTween(target: number, duration: number, delay = 0) {
  const ref = useRef(target);
  const [value, setValue] = useState(target);
  useEffect(() => {
    const from = ref.current;
    if (reducedMotion() || Math.abs(target - from) < 0.001) {
      ref.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const elapsed = now - start - delay;
      if (elapsed >= 0) {
        const t = Math.min(1, elapsed / duration);
        ref.current = from + (target - from) * easeOut(t);
        setValue(ref.current);
        if (t === 1) return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return value;
}

export interface ReasoningEffortProps {
  /** Level names from lowest to highest effort. Each one gets a tick. */
  levels: readonly string[];
  /** Index of the chosen level in `levels`. */
  value: number;
  /** Called with the new index on drag, click, or key press. */
  onValueChange: (index: number) => void;
  /**
   * Bold text before the level name in the bubble shown while dragging,
   * such as the model name.
   */
  label?: string | undefined;
  /** Names the slider. Defaults to "Reasoning effort". */
  "aria-label"?: string | undefined;
  /** Points at visible text that names the slider, instead of `aria-label`. */
  "aria-labelledby"?: string | undefined;
  className?: string | undefined;
}

/**
 * A pill-shaped slider that picks one of a few effort levels. While dragging,
 * a bubble grows out of the track and shows `label` and the level name.
 * Release snaps the thumb to the nearest level.
 */
export function ReasoningEffort({
  levels,
  value,
  onValueChange,
  label,
  "aria-label": ariaLabel = "Reasoning effort",
  "aria-labelledby": ariaLabelledBy,
  className,
}: ReasoningEffortProps) {
  const max = Math.max(0, levels.length - 1);
  const current = clamp(Math.round(value), 0, max);
  const trackRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(current);
  const [textW, setTextW] = useState(64);
  const gradId = useId();

  const settled = useTween(dragging ? dragValue : current, 220);
  const display = dragging ? dragValue : settled;
  const open = useTween(dragging ? 1 : 0, 220);
  const reveal = useTween(
    dragging ? 1 : 0,
    dragging ? 132 : 90,
    dragging ? 85 : 0,
  );
  const plateauW = useTween(plateauFor(textW), 90);

  const centerFor = (index: number) =>
    RADIUS + (max === 0 ? 0 : index / max) * (TRACK - RADIUS * 2);

  const valueFrom = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || max === 0) return current;
    return clamp(
      ((clientX - rect.left - RADIUS) / (rect.width - RADIUS * 2)) * max,
      0,
      max,
    );
  };

  const move = (next: number) => {
    setDragValue(next);
    if (Math.round(next) !== current) onValueChange(Math.round(next));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    move(valueFrom(event.clientX));
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging) move(valueFrom(event.clientX));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowUp: current + 1,
      ArrowLeft: current - 1,
      ArrowDown: current - 1,
      Home: 0,
      End: max,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const clamped = clamp(next, 0, max);
    if (clamped !== current) onValueChange(clamped);
  };

  const center = centerFor(display);
  const thumbW = REST_W + (DRAG_W - REST_W) * open;
  const thumbLeft = clamp(
    center - thumbW / 2,
    EDGE_PAD,
    TRACK - EDGE_PAD - thumbW,
  );
  const thumbRight = thumbLeft + thumbW;
  const fillW = Math.min(TRACK, thumbRight + EDGE_PAD);
  const active = Math.round(display);
  const level = levels[active];
  const plateau = shellGeom(center, plateauW);
  const labelX =
    (plateau.topL + plateau.topR) / 2 + (plateau.insetL - plateau.insetR) / 2;

  useLayoutEffect(() => {
    const w = labelRef.current?.getBoundingClientRect().width ?? 0;
    if (w > 0 && Math.abs(w - textW) > 0.4) setTextW(w);
  }, [level, label, textW]);

  return (
    <div
      data-slot="reasoning-effort"
      data-dragging={dragging}
      className={cn("sprout-reasoning-effort", className)}
    >
      <svg
        className="sprout-reasoning-effort-shell"
        viewBox={`0 0 ${TRACK} ${BUMP_H + HEIGHT}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="sprout-reasoning-effort-stop-top" />
            <stop offset="1" className="sprout-reasoning-effort-stop-bottom" />
          </linearGradient>
        </defs>
        <path
          data-slot="reasoning-effort-shell"
          d={shellPath(center, open, plateauW)}
          fill={`url(#${gradId})`}
          strokeWidth="0.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        ref={labelRef}
        data-slot="reasoning-effort-bubble"
        aria-hidden="true"
        className="sprout-reasoning-effort-bubble"
        style={{
          left: labelX,
          opacity: reveal,
          filter:
            reveal > 0.98
              ? undefined
              : `blur(${((1 - reveal) * 3).toFixed(2)}px)`,
          transform: `translate(-50%, ${3 * (1 - open)}px)`,
        }}
      >
        <span key={level} className="sprout-reasoning-effort-bubble-text">
          {label && (
            <span className="sprout-reasoning-effort-bubble-label">
              {label}
            </span>
          )}
          <span className="sprout-reasoning-effort-bubble-level">{level}</span>
        </span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        data-slot="reasoning-effort-track"
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-valuetext={levels[current]}
        className="sprout-reasoning-effort-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div
          data-slot="reasoning-effort-fill"
          className="sprout-reasoning-effort-fill"
          style={{ width: fillW }}
        />
        <div
          data-slot="reasoning-effort-thumb"
          className="sprout-reasoning-effort-thumb"
          style={{
            left: thumbLeft,
            width: thumbW,
            height: REST_H,
            marginTop: -REST_H / 2,
          }}
        />
        {levels.map((name, index) => {
          const x = centerFor(index);
          const onThumb = x >= thumbLeft + 0.5 && x <= thumbRight - 0.5;
          return (
            <span
              key={`${index}-${name}`}
              data-slot="reasoning-effort-tick"
              data-on-thumb={onThumb}
              data-active={index === active && !onThumb}
              className="sprout-reasoning-effort-tick"
              style={{
                left: x,
                height: 4.8 + (max === 0 ? 0 : index / max) * 4.8,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
