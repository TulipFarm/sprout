<div align="center">

# 🌱 Sprõut

**Thoughtful React controls, built with Base UI and Tailwind CSS.**

Every state planted, every edge case tended.

[![CI](https://github.com/TulipFarm/sprout/actions/workflows/ci.yml/badge.svg)](https://github.com/TulipFarm/sprout/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@tulipfarm/sprout?color=188038)](https://www.npmjs.com/package/@tulipfarm/sprout)
[![License: MIT](https://img.shields.io/badge/license-MIT-188038)](https://github.com/TulipFarm/sprout/blob/main/LICENSE)
[![Conventional Commits](https://img.shields.io/badge/commits-conventional-188038)](https://www.conventionalcommits.org)

[Install](#install) · [Components](#components) · [Theming](#theming) · [Develop](#develop) · [Contributing](#contributing)

</div>

---

Sprõut is a general-purpose component library from
[TulipFarm](https://tulipfarm.ai). It cares about the small things: busy,
blocked, invalid, empty, and loading states, keyboard paths, and screen reader
labels. The default theme is neutral, so it fits your product, not ours.

- **Accessible by default.** Built on [Base UI](https://base-ui.com) primitives.
- **Tailwind CSS 4 native.** One CSS import. No JavaScript theme object.
- **Tree-shakable.** Every component has its own import path.
- **Agent-ready.** Chat, plan, tool, and review components for AI products.
- **Light and dark.** A neutral default and 15 more CSS theme presets.

> [!NOTE]
> Sprõut is pre-1.0. APIs can change between minor versions.

## Install

Sprõut needs React 19 and Tailwind CSS 4.

```sh
pnpm add @tulipfarm/sprout
```

<details>
<summary>Install from GitHub instead of npm</summary>

Each [GitHub release](https://github.com/TulipFarm/sprout/releases) has the
package tarball attached. No login needed:

```sh
pnpm add https://github.com/TulipFarm/sprout/releases/download/v0.1.0/tulipfarm-sprout-0.1.0.tgz
```

The package is also on GitHub Packages. It needs a GitHub token with
`read:packages`. Add this to `.npmrc`:

```ini
@tulipfarm:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

</details>

Add the styles to your CSS entry:

```css
@import 'tailwindcss';
@import '@tulipfarm/sprout/styles.css';
```

Use a component:

```tsx
import { Button } from '@tulipfarm/sprout/button';
import { Badge } from '@tulipfarm/sprout/badge';

export function Status() {
  return (
    <>
      <Badge variant="success">Connected</Badge>
      <Button state={{ kind: 'busy' }} pendingLabel="Saving…">
        Save
      </Button>
    </>
  );
}
```

The CSS entry registers Sprõut's classes with Tailwind. It does not change your
body styles or generic shadcn tokens. Tailwind utility prefixes are not
supported yet.

## Components

Each component imports from `@tulipfarm/sprout/<name>`, for example
`@tulipfarm/sprout/dialog`. See the [component reference](https://github.com/TulipFarm/sprout/blob/main/docs/components.md)
for notes on each one.

### Bundle size

<!-- bundle-size:start -->

Full library: **842.5 kB** gzip. Each component path is smaller. Sizes are minified, with React and other peer dependencies left out.

<details>
<summary>Size of each component</summary>

| Component           |      Raw |     Gzip |   Brotli |
| ------------------- | -------: | -------: | -------: |
| `accordion`         |  64.1 kB |  21.9 kB |  19.3 kB |
| `agent-fanout`      | 260.9 kB |  86.7 kB |  74.6 kB |
| `alert`             |  35.2 kB |  11.5 kB |  10.1 kB |
| `alert-dialog`      | 169.1 kB |  57.0 kB |  49.7 kB |
| `aspect-ratio`      |  30.2 kB |   9.7 kB |   8.5 kB |
| `attachment`        | 352.1 kB | 118.4 kB |  97.9 kB |
| `avatar`            |  45.5 kB |  15.4 kB |  13.6 kB |
| `badge`             |  34.9 kB |  11.4 kB |  10.0 kB |
| `board`             | 452.5 kB | 148.5 kB | 125.3 kB |
| `brand-icon`        | 195.1 kB |  70.2 kB |  61.2 kB |
| `breadcrumb`        |  40.5 kB |  13.4 kB |  11.7 kB |
| `button`            |  50.5 kB |  16.7 kB |  14.6 kB |
| `button-group`      |  37.9 kB |  12.1 kB |  10.7 kB |
| `calendar`          | 312.3 kB | 103.5 kB |  88.2 kB |
| `canvas`            | 235.1 kB |  80.8 kB |  69.2 kB |
| `card`              |  35.4 kB |  11.6 kB |  10.1 kB |
| `carousel`          |  60.4 kB |  19.9 kB |  17.6 kB |
| `chart`             | 540.1 kB | 155.5 kB | 129.9 kB |
| `timeline`          | 598.5 kB | 175.9 kB | 147.1 kB |
| `chat-confirmation` |  76.7 kB |  26.3 kB |  22.4 kB |
| `chat-plan`         |  42.3 kB |  13.4 kB |  11.7 kB |
| `chat-sources`      | 206.2 kB |  70.5 kB |  60.5 kB |
| `chat-input`        | 902.0 kB | 297.7 kB | 246.8 kB |
| `checkbox`          |  60.0 kB |  21.0 kB |  18.5 kB |
| `choice-list`       |  43.0 kB |  14.5 kB |  12.6 kB |
| `code-block`        |  74.5 kB |  26.1 kB |  22.3 kB |
| `collapsible`       |  55.5 kB |  18.7 kB |  16.5 kB |
| `combobox`          | 268.6 kB |  90.8 kB |  77.7 kB |
| `command`           | 181.9 kB |  61.6 kB |  53.5 kB |
| `context-menu`      | 242.8 kB |  81.0 kB |  70.0 kB |
| `dialog`            | 170.7 kB |  57.5 kB |  50.2 kB |
| `direction`         |   1.4 kB |   0.7 kB |   0.7 kB |
| `dropdown-menu`     | 239.6 kB |  80.0 kB |  69.1 kB |
| `field`             |  97.9 kB |  34.1 kB |  29.6 kB |
| `file-explorer`     | 175.8 kB |  61.5 kB |  51.5 kB |
| `file-viewer`       | 320.8 kB | 108.3 kB |  90.7 kB |
| `form`              | 109.7 kB |  37.2 kB |  32.2 kB |
| `glass-banner`      |  33.0 kB |  10.6 kB |   9.4 kB |
| `gradient-banner`   |  32.2 kB |  10.3 kB |   9.1 kB |
| `hover-card`        | 163.2 kB |  56.3 kB |  49.1 kB |
| `input`             | 108.2 kB |  37.4 kB |  32.4 kB |
| `input-group`       | 119.1 kB |  40.4 kB |  34.8 kB |
| `input-otp`         |  65.3 kB |  22.9 kB |  20.3 kB |
| `kbd`               |  30.4 kB |   9.7 kB |   8.5 kB |
| `label`             |  30.2 kB |   9.6 kB |   8.4 kB |
| `mention-list`      |  52.6 kB |  17.2 kB |  15.2 kB |
| `menubar`           | 244.9 kB |  82.2 kB |  70.7 kB |
| `message`           |  36.2 kB |  11.7 kB |  10.3 kB |
| `message-actions`   |  71.4 kB |  24.9 kB |  20.8 kB |
| `message-response`  | 232.8 kB |  74.3 kB |  64.2 kB |
| `message-scroller`  |  69.0 kB |  22.1 kB |  19.6 kB |
| `navigation-menu`   | 182.3 kB |  63.0 kB |  54.8 kB |
| `notice-banner`     |  30.4 kB |   9.7 kB |   8.5 kB |
| `page-content`      |  30.2 kB |   9.6 kB |   8.4 kB |
| `page-header`       |  54.6 kB |  17.6 kB |  15.5 kB |
| `pagination`        |  55.3 kB |  17.9 kB |  15.6 kB |
| `plan-outline`      |  79.9 kB |  26.8 kB |  22.9 kB |
| `popover`           | 178.0 kB |  60.7 kB |  52.7 kB |
| `presence-cursor`   |  30.8 kB |   9.9 kB |   8.6 kB |
| `progress`          |  39.8 kB |  13.2 kB |  11.6 kB |
| `prompt-list`       | 199.0 kB |  71.9 kB |  62.6 kB |
| `questionnaire`     |  69.5 kB |  23.3 kB |  20.4 kB |
| `radio-group`       |  80.8 kB |  27.9 kB |  24.8 kB |
| `reasoning-effort`  |  35.5 kB |  12.0 kB |  10.5 kB |
| `record-list`       |  65.8 kB |  22.3 kB |  19.0 kB |
| `resizable`         |  39.4 kB |  13.4 kB |  11.8 kB |
| `result-card`       | 240.3 kB |  85.3 kB |  72.4 kB |
| `result-notice`     |  34.3 kB |  11.3 kB |   9.9 kB |
| `review-card`       |  61.6 kB |  21.2 kB |  18.5 kB |
| `rich-text-editor`  | 442.5 kB | 140.2 kB | 119.8 kB |
| `schema-diagram`    | 247.9 kB |  82.9 kB |  71.3 kB |
| `sql-viewer`        | 265.6 kB |  89.1 kB |  76.3 kB |
| `scroll-area`       |  57.3 kB |  19.7 kB |  17.4 kB |
| `search-dialog`     | 190.2 kB |  64.6 kB |  55.5 kB |
| `search-field`      | 122.2 kB |  41.4 kB |  35.5 kB |
| `select`            | 230.4 kB |  79.3 kB |  67.8 kB |
| `selection-slot`    |  31.5 kB |  10.2 kB |   8.9 kB |
| `separator`         |  36.9 kB |  11.9 kB |  10.5 kB |
| `settings-list`     |  31.1 kB |   9.9 kB |   8.7 kB |
| `sheet`             | 213.4 kB |  72.9 kB |  63.2 kB |
| `sidebar`           | 251.1 kB |  85.7 kB |  72.8 kB |
| `skeleton`          |  35.1 kB |  11.5 kB |  10.1 kB |
| `slider`            |  83.6 kB |  29.5 kB |  25.9 kB |
| `spinner`           |  36.5 kB |  11.6 kB |  10.1 kB |
| `state-panel`       | 460.5 kB | 155.8 kB | 128.5 kB |
| `state-sample`      |  33.5 kB |  10.5 kB |   9.2 kB |
| `switch`            |  50.3 kB |  17.3 kB |  15.3 kB |
| `table`             | 541.3 kB | 173.3 kB | 145.8 kB |
| `table-nuqs`        |   2.1 kB |   1.1 kB |   1.0 kB |
| `tabs`              |  80.3 kB |  27.6 kB |  24.5 kB |
| `textarea`          |  98.2 kB |  34.2 kB |  29.6 kB |
| `toast`             | 189.5 kB |  65.2 kB |  56.6 kB |
| `toggle`            |  46.1 kB |  15.7 kB |  13.8 kB |
| `toggle-group`      |  67.1 kB |  23.0 kB |  20.3 kB |
| `tool-activity`     |  86.7 kB |  29.2 kB |  25.2 kB |
| `toolbar-status`    | 189.3 kB |  64.3 kB |  55.5 kB |
| `tooltip`           | 164.7 kB |  56.7 kB |  49.4 kB |
| `typed-text`        |  31.2 kB |  10.1 kB |   8.8 kB |
| `view-switcher`     | 270.2 kB |  90.6 kB |  77.1 kB |

</details>
<!-- bundle-size:end -->

CI compares sizes on each pull request. Run `pnpm size` to see them locally.

| Group                   | Components                                                                                                                                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Actions**             | Button · Button Group · Toggle · Toggle Group · Toolbar Status · Kbd                                                                                                                                                                                           |
| **Forms**               | Field · Form · Label · Input · Input Group · Input OTP · Textarea · Checkbox · Radio Group · Switch · Slider · Select · Combobox · Choice List · Calendar · Search Field · Rich Text Editor · Mention List · Questionnaire · Selection Slot · Reasoning Effort |
| **Overlays**            | Dialog · Alert Dialog · Sheet · Popover · Hover Card · Tooltip · Dropdown Menu · Context Menu · Menubar · Command · Search Dialog · Toast                                                                                                                      |
| **Layout & navigation** | Sidebar · Navigation Menu · Breadcrumb · Pagination · Tabs · View Switcher · Accordion · Collapsible · Page Header · Page Content · Settings List · Card · Carousel · Resizable · Scroll Area · Separator · Aspect Ratio · Direction · Canvas                  |
| **Feedback**            | Alert · Notice Banner · Badge · Progress · Spinner · Skeleton · State Panel · State Sample                                                                                                                                                                     |
| **Data display**        | Table · Chart · Code Block · File Viewer · Schema Diagram · Avatar · Brand Icon · Attachment · Typed Text · Gradient Banner · Glass Banner                                                                                                                     |
| **Agents & chat**       | Message · Message Actions · Message Response · Message Scroller · Chat Confirmation · Chat Plan · Chat Sources · Plan Outline · Prompt List · Result Card · Review Card · Tool Activity                                                                        |

## Theming

Themes are plain CSS. Override any `--sprout-*` token:

```css
:root {
  --sprout-radius-control: 0.5rem;
}
```

Presets live in `@tulipfarm/sprout/themes/*`: `neutral`, `tulipfarm`, `github`,
`linear`, `vercel`, `stripe`, `notion`, and more.

```css
@import '@tulipfarm/sprout/themes/tulipfarm.css';
```

### shadcn

A shadcn registry item is at `apps/docs/public/r/sprout.json`. It works with
`shadcn add` (tested with shadcn 4.22.0). A public URL will come with the docs
release.

## Develop

You need Node 22.22+ and pnpm 11.5.3.

```sh
pnpm install
pnpm dev        # docs and live examples at http://localhost:4321
```

After you change package code, run `pnpm --filter @tulipfarm/sprout build`.

```sh
pnpm build
pnpm typecheck
pnpm lint       # Oxfmt check and Oxlint; `pnpm format` fixes formatting
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm test:install   # packs the library and installs it in a fresh app
```

Run test commands one at a time.

```
sprout/
├── packages/sprout   the published package and CSS themes
├── apps/docs         Astro docs, live examples, shadcn registry
├── tests             unit, browser, and packed-consumer tests
└── docs              ADRs, plans, component reference
```

The docs deploy to Cloudflare Pages: build with `pnpm build` and serve
`apps/docs/dist`.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](https://github.com/TulipFarm/sprout/blob/main/CONTRIBUTING.md) and the
[Code of Conduct](https://github.com/TulipFarm/sprout/blob/main/CODE_OF_CONDUCT.md). Report security problems privately, as
described in [SECURITY.md](https://github.com/TulipFarm/sprout/blob/main/SECURITY.md).

## License

[MIT](https://github.com/TulipFarm/sprout/blob/main/LICENSE) © TulipFarm

---

<div align="center">
  <a href="https://tulipfarm.ai">
    <img src="https://tulipfarm.ai/brand/v1/mark-green.svg" alt="TulipFarm" width="40" height="40">
  </a>
  <p>
    Grown at <a href="https://tulipfarm.ai"><b>TulipFarm</b></a>,<br>
    one farm for every team's records, docs, agents, and workflows.
  </p>
</div>
