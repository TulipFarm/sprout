"use client";

import {
  Panel,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type FitViewOptions,
  type Node,
} from "@xyflow/react";
import { useEffect, useSyncExternalStore, type KeyboardEvent } from "react";
import { Add } from "reicon-react/icons/Add";
import { Minus } from "reicon-react/icons/Minus";
import { Scan } from "reicon-react/icons/Scan";
import { Button } from "../components/button.js";

export const flowMinZoom = 0.2;
export const flowMaxZoom = 1.5;
const panStep = 48;

const mobileQuery = "(max-width: 767px)";
const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribeMobile(callback: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useViewportMobile() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  );
}

export const motion = (ms: number) =>
  typeof window !== "undefined" && window.matchMedia(motionQuery).matches
    ? 0
    : ms;

/**
 * Refits whenever the pane resizes or the nodes change. The canvas panel
 * animates open, so the first fit sees a narrower pane than the final one.
 */
export function FitOnResize({
  nodes,
  fit,
}: {
  nodes: readonly Node[];
  fit: FitViewOptions;
}) {
  const { fitView } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const measured = useNodesInitialized();
  useEffect(() => {
    if (!measured) return;
    const frame = requestAnimationFrame(() => void fitView(fit));
    return () => cancelAnimationFrame(frame);
  }, [fitView, fit, width, height, measured, nodes]);
  return null;
}

export function ZoomControls({
  position,
  fit,
  className,
  slot,
}: {
  position: "top-right" | "bottom-right";
  fit: FitViewOptions;
  className: string;
  slot: string;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  return (
    <Panel
      position={position}
      className={className}
      data-slot={slot}
      role="toolbar"
      aria-label="Diagram view"
      aria-orientation="vertical"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom in"
        title="Zoom in"
        disabled={zoom >= flowMaxZoom}
        onClick={() => void zoomIn({ duration: motion(160) })}
      >
        <Add size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom out"
        title="Zoom out"
        disabled={zoom <= flowMinZoom}
        onClick={() => void zoomOut({ duration: motion(160) })}
      >
        <Minus size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Fit to view"
        title="Fit to view"
        onClick={() => void fitView({ ...fit, duration: motion(180) })}
      >
        <Scan size={16} aria-hidden="true" />
      </Button>
    </Panel>
  );
}

/** Arrow keys pan, plus and minus zoom, and 0 fits, from the pane or a node. */
export function useKeyboardView(fit: FitViewOptions) {
  const { getViewport, setViewport, zoomIn, zoomOut, fitView } = useReactFlow();
  return (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (
      target !== event.currentTarget &&
      !target.classList.contains("react-flow__node")
    )
      return;
    const step = panStep * (event.shiftKey ? 4 : 1);
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = pan[event.key];
    if (move) {
      const { x, y, zoom } = getViewport();
      void setViewport(
        { x: x + move[0], y: y + move[1], zoom },
        { duration: motion(120) },
      );
    } else if (event.key === "+" || event.key === "=") {
      void zoomIn({ duration: motion(160) });
    } else if (event.key === "-" || event.key === "_") {
      void zoomOut({ duration: motion(160) });
    } else if (event.key === "0") {
      void fitView({ ...fit, duration: motion(180) });
    } else return;
    event.preventDefault();
  };
}
