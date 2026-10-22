# DESIGN.md: Sprõut

## Product

- **What it is:** A general-purpose React 19 + Tailwind CSS 4 component library from TulipFarm, built on Base UI, with a neutral default theme.
- **Why it's different:** It handles every state: busy, blocked, invalid, empty, and loading states, keyboard paths, and screen reader labels. It also ships agent and chat parts (chat, plan, tool, review) that shadcn-style kits lack.
- **Surfaces:** the package (`packages/sprout`, Operate: components inside other apps); the docs site (`apps/docs`, Persuade on the home page, Read on the component pages); the agent skill (`skills/sprout`, Read by coding agents).
- **Success looks like:** An engineer finds the right component, drops it in, and ships without patching edge cases or restyling it.
- **Constraints:**
  - WCAG 2.2 AA.
  - Evergreen browsers.
  - Honor `prefers-reduced-motion`.
  - Every component has its own import path and stays inside its tree-shaken size budget (`tools/bundle-size`).
  - Never use a native `<select>`.
  - MIT license.
  - Pre-1.0: APIs can change between minor versions.

## Personas

### Priya: product engineer (primary)

- **Context:** Builds a React SaaS or AI app on desktop. She skims the docs between tasks, many times a week.
- **Job:** Pick the right component quickly, copy a working snippet, and have it behave correctly in every state.
- **Expertise:** Expert in React and Tailwind. She knows accessibility in principle but does not want to hand-roll it.
- **Must feel in 5 seconds:** "This is crafted and complete. I can trust it in production without patching edge cases."
- **Deal-breakers:**
  - Missing states.
  - Broken keyboard or focus behavior.
  - Hard-coded colors she can't theme.
  - Docs demos that look better than the real component.
  - Heavy bundles.
- **Delighted by:**
  - Thoughtful edge cases already solved.
  - A neutral look that fits her brand.
  - One-line theming.

### TulipFarm Cloud team (secondary)

- **Context:** The internal consumer. They migrate TulipFarm Cloud screens to Sprõut.
- **Job:** Every variant, size, combination, and feature they use must exist.
- **Must feel:** "We never have to fork or wrap it."
- **Deal-breakers:** Missing features or parity gaps that force local workarounds.

### Coding agent (tertiary)

- **Context:** Reads `skills/sprout/SKILL.md` and `references/components.md` to write UI.
- **Job:** Choose the right component and import path, and follow the rules.
- **Deal-breakers:** Docs that disagree with each other, undocumented props, or components missing from the index.

## Brand

- **Personality:** Quiet, precise, considered.
- **Voice:**
  - Write short, plain sentences.
  - Name the state ("Saving…", "Add a name first").
  - Don't use hype, exclamation marks, or "magic", "seamless", or "supercharge".
- **Admired references:** Linear, Vercel/Geist, the Base UI docs.
- **Anti-references:** The generic shadcn template look and gradient-heavy AI landing pages.

## Design System

Source of truth: `packages/sprout/src/styles/index.css`. All values are `--sprout-*` CSS variables and are also exposed as Tailwind utilities (`bg-sprout-surface`, `text-sprout-muted`, `rounded-sprout-control`, …). Theme by overriding tokens in CSS. Never use a JS theme object.

### Color (neutral default)

| Token                                                                            | Light                   | Dark                   | Use                                                   |
| -------------------------------------------------------------------------------- | ----------------------- | ---------------------- | ----------------------------------------------------- |
| `--sprout-canvas`                                                                | #f8f8f8                 | #151515                | page background                                       |
| `--sprout-surface`                                                               | #fdfdfd                 | #1d1d1d                | cards, panels, popovers                               |
| `--sprout-hover` / `--sprout-active`                                             | #ededed / #e3e3e3       | #2b2b2b / #363636      | hover and pressed fills                               |
| `--sprout-text`                                                                  | #242424                 | #f0f0f0                | body text                                             |
| `--sprout-muted`                                                                 | #626262                 | #adadad                | secondary text                                        |
| `--sprout-line`                                                                  | #e0e0e0                 | #383838                | dividers and decorative borders                       |
| `--sprout-border` / `--sprout-border-strong`                                     | #909090 / #707070       | #808080 / #a0a0a0      | control borders (3:1 non-text contrast)               |
| `--sprout-input`                                                                 | #939393                 | #686868                | input borders                                         |
| `--sprout-primary` (+ `-hover`, `-active`)                                       | #262626                 | #ededed                | primary actions only                                  |
| `--sprout-on-primary`                                                            | #fafafa                 | #202020                | text on primary                                       |
| `--sprout-secondary`                                                             | #ececec                 | #2c2c2c                | secondary fills                                       |
| `--sprout-primary-subtle`                                                        | primary 10% on surface  | primary 16% on surface | selected and current tints                            |
| `--sprout-focus-ring`                                                            | #3b82f6                 | #60a5fa                | `:focus-visible` outline (`--sprout-focus-width` 1px) |
| `--sprout-danger` / `-subtle`                                                    | #b32d34 / #fdeeef       | #ff9197 / #3a2124      | destructive and error                                 |
| `--sprout-success` / `-subtle`                                                   | #1d6a37 / #e8f4eb       | #82d29a / #1c3223      | success                                               |
| `--sprout-warning` / `-subtle`                                                   | #8a4b08 / #fdf1dc       | #eec27e / #34291b      | warning                                               |
| `--sprout-info` / `-subtle`                                                      | #1f5fb8 / #ebf1fd       | #8fb8f5 / #1f2c45      | info                                                  |
| `--sprout-overlay`                                                               | rgb(18 18 18 / .35)     | rgb(8 8 8 / .65)       | modal backdrop                                        |
| Hue palette `--sprout-{indigo,green,orange,red,sky,purple,yellow,teal,blue,tan}` | defined in `chart.css`  | lighter variants       | categorical data only                                 |
| `--sprout-chart-1…10`                                                            | maps to the hue palette | same                   | chart series                                          |

Rules:

- The neutral theme is grayscale. Color appears only for meaning (danger, success, warning, info) and for data.
- Never make color the only signal. Status always carries words.
- Never hard-code hex values in components. Use a token, or add one.
- 15 presets in `src/styles/themes/*.css` are selected with `data-sprout-theme="<name>"` on `<html>` or any subtree. The presets are tulipfarm, claude, chatgpt, cloudflare, discord, github, grok, linear, notion, perplexity, raycast, spotify, stripe, supabase, and vercel. Each preset overrides only tokens: font, radii, and colors.

### Typography

- **Families:**
  - `--sprout-font` is `ui-sans-serif, system-ui, sans-serif` by default.
  - The docs site uses Geist Variable for the neutral theme.
  - The tulipfarm preset uses Inter Variable.
  - Fonts load with `@fontsource-variable/*`. The package itself loads no fonts.
- **Scale:** `--sprout-text-xs` 12px, `--sprout-text-sm` 14px (default control and UI text), `--sprout-text-base` 16px.
- **Rules:**
  - Component UI text is 14px.
  - Display sizes belong to the docs site, not the library.
  - Use tabular numbers for counts and metrics.

### Spacing & Layout

- **Scale:** Tailwind's 4px scale.
- **Control height:** `--sprout-control-height` 32px is the default `md` size.
- **Sidebar:**
  - `--sprout-sidebar-width` 15.25rem
  - `--sprout-sidebar-icon-width` 3.5rem
  - `--sprout-sidebar-mobile-width` 18rem
- **Breakpoints:** Mostly 640px/40rem (narrow ↔ wide), with 768px/48rem as a second step.
- **Docs layout:** header 56px, sidebar 248px, table of contents 208px.

### Shape & Elevation

- **Radii:** `--sprout-radius-control` 6px for buttons, inputs, and menu items. `--sprout-radius-panel` 12px for cards, dialogs, and popovers.
- **Shadows:**
  - `--sprout-shadow-control` `0 1px 2px rgb(24 24 24/.04)`
  - `--sprout-shadow-panel` `0 2px 6px -4px rgb(24 24 24/.1)`
  - `--sprout-shadow-overlay` `0 16px 64px -16px rgb(18 18 18/.3)`
- **Borders:** 1px. Use `--sprout-line` for structure and `--sprout-border`/`--sprout-input` for interactive edges.
- **Z-index (in use):**
  - 1–5 for local stacking
  - 10–40 for sticky regions and headers
  - 50+ for overlays (popover, dialog, toast)

### Motion

- **Durations:**
  - `--sprout-motion-fast` 120ms for micro feedback (hover, press, toggle).
  - `--sprout-motion-normal` 180ms for disclosure, overlays, and sidebar collapse.
  - 240ms or more is rare and only for large surfaces.
- **Easing:** `--sprout-motion-ease` is `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- **Reduced motion:** Wrap animation in `@media (prefers-reduced-motion: no-preference)`. Under `reduce`, state changes are instant.
- **Rules:**
  - Use subtle micro-transitions for every state change: sidebar expand and collapse, nested disclosure, accordions, and overlays.
  - Animate only `transform` and `opacity` where possible.

### Components

- **Base:** Base UI primitives. Compose with `render`, not `asChild`. A link styled as a button needs `nativeButton={false}`.
- **Button:**
  - Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `ghost-destructive`, `link`, `scope`.
  - Sizes: `md` (default), `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`.
  - For busy or blocked actions, pass `state={{ kind: 'busy' | 'blocked' }}` with `pendingLabel` or `reason`.
- **Badge:** `default`, `success`, `warning`, `info`, `secondary`, `destructive`, `outline`, `ghost`, `link`.
- **Forms:** Wrap every control in a `Field` with a label, helper text, and an error. Use `Form` + `FormFooter` for forms that save.
- **Records:** `Table` is the only table component. It has no public row or cell parts. See `GLOSSARY.md` and `docs/adr/0001-one-table-component.md`.
- **Selects:** Use the custom `Select` or `Combobox` only. Never use a native `<select>`.
- **States:** The app owns loading, empty, and error states and shows them with `StatePanel`, `Skeleton`, or `Spinner`.
- **Icons:** Use `reicon-react` (`reicon-react/icons/<Name>`).
  - Mark decorative icons `aria-hidden="true"`.
  - Put `data-icon="inline-start|inline-end"` on an icon next to text.
  - Icon-only controls need an `aria-label` and a `Tooltip`.
- **Dark mode:** Use the `.dark` or `.light` class on an ancestor. Without a class, the theme follows `prefers-color-scheme`.
- **Styling:** Each component has a matching `src/styles/<name>.css`, imported by `styles.css`. Classes are prefixed `sprout-`.
- **Full index:** `skills/sprout/SKILL.md`. Usage snippets: `skills/sprout/references/components.md`.

## Do / Don't

- **Do:**
  - Design every state: default, hover, focus-visible, active, disabled, busy, blocked, invalid, empty, and loading.
  - Check light and dark mode on desktop and mobile.
  - Extend tokens instead of hard-coding values.
  - Keep the neutral theme neutral.
  - Update the skill, the references, and the docs home preview when you add a component.
- **Don't:**
  - Use native `<select>`.
  - Use color-only status.
  - Use hex values in component CSS.
  - Use gradients or glow for decoration in the default theme.
  - Add a second table-like component.
  - Use motion that ignores reduced-motion settings.
  - Make docs demos that rely on styles the package doesn't ship.
