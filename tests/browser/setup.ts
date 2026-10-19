import "@fontsource-variable/inter";
import "../../packages/sprout/src/styles/index.css";
import "../../packages/sprout/src/styles/themes/neutral.css";
import "../../packages/sprout/src/styles/themes/tulipfarm.css";
import { afterEach, beforeEach } from "vitest";
import { page } from "vitest/browser";
import { parkPointer, resetEmulation } from "./support.js";

const base = document.createElement("style");
base.textContent = `body { margin: 0; background: var(--sprout-canvas); color: var(--sprout-text); font-family: var(--sprout-font); }`;
document.head.append(base);

beforeEach(async () => {
  const root = document.documentElement;
  root.setAttribute("data-sprout-theme", "neutral");
  root.classList.remove("dark");
  root.classList.add("light");
  await page.viewport(1280, 720);
  await parkPointer();
});

afterEach(resetEmulation);
