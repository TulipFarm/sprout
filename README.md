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

Full library: **892.9 kB** gzip. Each component path is smaller. Sizes are minified, with React and other peer dependencies left out.

<details>
<summary>Size of each component</summary>

| Component           |       Raw |     Gzip |   Brotli |
| ------------------- | --------: | -------: | -------: |
| `a2ui`              | 1497.4 kB | 453.3 kB | 375.8 kB |
| `a2ui/catalog`      |   52.3 kB |  18.3 kB |  16.4 kB |
| `accordion`         |  180.1 kB |  53.4 kB |  44.5 kB |
| `agent-fanout`      |  359.2 kB | 117.1 kB |  98.7 kB |
| `agent-avatar`      |  137.9 kB |  40.0 kB |  34.2 kB |
| `monster-avatar`    |   68.4 kB |  22.6 kB |  19.6 kB |
| `alert`             |   35.2 kB |  11.5 kB |  10.1 kB |
| `alert-dialog`      |  282.3 kB |  87.3 kB |  74.7 kB |
| `aspect-ratio`      |   30.3 kB |   9.7 kB |   8.5 kB |
| `attachment`        |  433.9 kB | 138.1 kB | 115.6 kB |
| `avatar`            |   44.0 kB |  14.6 kB |  12.9 kB |
| `badge`             |   35.0 kB |  11.5 kB |  10.0 kB |
| `board`             |  558.2 kB | 178.3 kB | 149.3 kB |
| `brand-icon`        |  195.2 kB |  70.2 kB |  61.2 kB |
| `breadcrumb`        |  154.7 kB |  43.4 kB |  36.2 kB |
| `button`            |  163.8 kB |  48.1 kB |  39.4 kB |
| `button-group`      |   38.0 kB |  12.1 kB |  10.7 kB |
| `calendar`          |  422.0 kB | 132.4 kB | 112.8 kB |
| `canvas`            |  341.5 kB | 108.2 kB |  92.8 kB |
| `card`              |   35.4 kB |  11.6 kB |  10.2 kB |
| `carousel`          |  172.4 kB |  51.0 kB |  42.0 kB |
| `chart`             |  593.4 kB | 169.2 kB | 138.9 kB |
| `timeline`          |  756.4 kB | 217.9 kB | 179.0 kB |
| `chat-confirmation` |  184.9 kB |  53.4 kB |  45.3 kB |
| `chat-plan`         |  151.4 kB |  42.3 kB |  35.1 kB |
| `chat-sources`      |  313.9 kB |  97.9 kB |  83.5 kB |
| `chat-input`        | 1047.4 kB | 338.4 kB | 281.2 kB |
| `chat-window`       |  387.2 kB | 122.3 kB | 102.1 kB |
| `checkbox`          |  175.2 kB |  52.3 kB |  43.4 kB |
| `choice-list`       |  156.5 kB |  44.8 kB |  36.8 kB |
| `code-block`        |  183.6 kB |  55.0 kB |  45.6 kB |
| `collapsible`       |   55.5 kB |  18.7 kB |  16.6 kB |
| `combobox`          |  379.2 kB | 121.2 kB | 101.6 kB |
| `command`           |  292.0 kB |  91.3 kB |  77.4 kB |
| `context-menu`      |  357.9 kB | 111.4 kB |  94.7 kB |
| `dialog`            |  282.7 kB |  87.5 kB |  75.0 kB |
| `direction`         |    1.5 kB |   0.8 kB |   0.7 kB |
| `dropdown-menu`     |  354.7 kB | 110.1 kB |  94.0 kB |
| `field`             |  213.7 kB |  65.0 kB |  54.5 kB |
| `file-explorer`     |  262.9 kB |  82.2 kB |  68.8 kB |
| `file-viewer`       |  411.1 kB | 131.2 kB | 110.0 kB |
| `form`              |  222.2 kB |  68.2 kB |  56.7 kB |
| `glass-banner`      |   33.0 kB |  10.7 kB |   9.4 kB |
| `gradient-banner`   |   32.2 kB |  10.3 kB |   9.1 kB |
| `hover-card`        |  163.2 kB |  56.3 kB |  49.1 kB |
| `input`             |  224.0 kB |  68.2 kB |  57.5 kB |
| `input-group`       |  231.6 kB |  71.8 kB |  59.4 kB |
| `icons`             |  122.5 kB |  33.3 kB |  27.2 kB |
| `input-otp`         |  181.5 kB |  54.3 kB |  45.5 kB |
| `kbd`               |   30.4 kB |   9.7 kB |   8.5 kB |
| `knowledge-base`    |  422.4 kB | 137.3 kB | 115.2 kB |
| `label`             |   30.2 kB |   9.6 kB |   8.4 kB |
| `mention-list`      |  166.0 kB |  48.7 kB |  39.9 kB |
| `menubar`           |  360.0 kB | 112.9 kB |  95.8 kB |
| `message`           |   36.2 kB |  11.7 kB |  10.4 kB |
| `message-actions`   |  307.0 kB |  97.5 kB |  82.2 kB |
| `message-response`  |  341.8 kB | 103.0 kB |  87.7 kB |
| `message-rich-text` |  441.9 kB | 140.6 kB | 117.3 kB |
| `message-scroller`  |  181.2 kB |  53.0 kB |  44.0 kB |
| `metric`            |   31.2 kB |   9.9 kB |   8.7 kB |
| `model-selector`    |  385.9 kB | 126.6 kB | 106.6 kB |
| `navigation-menu`   |  298.3 kB |  94.5 kB |  80.0 kB |
| `notice-banner`     |   30.6 kB |   9.8 kB |   8.5 kB |
| `page-content`      |   30.2 kB |   9.6 kB |   8.5 kB |
| `page-header`       |  166.5 kB |  48.7 kB |  39.9 kB |
| `pagination`        |  165.5 kB |  48.5 kB |  39.8 kB |
| `plan-outline`      |  180.7 kB |  53.5 kB |  44.4 kB |
| `popover`           |  178.0 kB |  60.7 kB |  52.6 kB |
| `presence-cursor`   |   30.8 kB |   9.9 kB |   8.6 kB |
| `progress`          |   39.8 kB |  13.2 kB |  11.6 kB |
| `prompt-list`       |  314.7 kB | 102.1 kB |  87.3 kB |
| `questionnaire`     |  181.9 kB |  52.5 kB |  44.7 kB |
| `radio-group`       |   80.9 kB |  27.9 kB |  24.8 kB |
| `reasoning-effort`  |   35.5 kB |  12.0 kB |  10.6 kB |
| `record-list`       |  171.8 kB |  50.5 kB |  41.7 kB |
| `resizable`         |   39.4 kB |  13.4 kB |  11.8 kB |
| `result-card`       |  349.2 kB | 114.0 kB |  95.9 kB |
| `result-notice`     |  149.6 kB |  41.5 kB |  34.6 kB |
| `review-card`       |  177.6 kB |  50.8 kB |  43.3 kB |
| `rich-text-editor`  |  579.4 kB | 179.2 kB | 151.5 kB |
| `schema-diagram`    |  358.7 kB | 112.0 kB |  95.1 kB |
| `sql-viewer`        |  364.1 kB | 114.6 kB |  96.8 kB |
| `scroll-area`       |   57.4 kB |  19.7 kB |  17.4 kB |
| `search-dialog`     |  300.4 kB |  93.5 kB |  79.6 kB |
| `search-field`      |  232.3 kB |  72.1 kB |  59.6 kB |
| `select`            |  345.0 kB | 109.1 kB |  92.7 kB |
| `selection-slot`    |   31.5 kB |  10.2 kB |   8.9 kB |
| `separator`         |   37.0 kB |  11.9 kB |  10.5 kB |
| `settings-list`     |   31.1 kB |   9.9 kB |   8.7 kB |
| `sheet`             |  325.4 kB | 102.8 kB |  87.9 kB |
| `sidebar`           |  366.3 kB | 117.1 kB |  98.0 kB |
| `skeleton`          |   35.2 kB |  11.6 kB |  10.1 kB |
| `slider`            |   83.6 kB |  29.5 kB |  26.0 kB |
| `spinner`           |  149.9 kB |  41.7 kB |  34.7 kB |
| `state-panel`       |  589.6 kB | 186.0 kB | 155.2 kB |
| `state-sample`      |   33.5 kB |  10.5 kB |   9.2 kB |
| `status`            |   34.2 kB |  11.2 kB |   9.8 kB |
| `switch`            |   50.3 kB |  17.3 kB |  15.3 kB |
| `table`             |  641.5 kB | 199.6 kB | 168.1 kB |
| `table-nuqs`        |    2.1 kB |   1.1 kB |   1.0 kB |
| `tabs`              |   80.3 kB |  27.6 kB |  24.5 kB |
| `task-tree`         |  363.5 kB | 113.7 kB |  96.2 kB |
| `textarea`          |  214.0 kB |  65.1 kB |  54.7 kB |
| `toast`             |  295.3 kB |  93.1 kB |  80.0 kB |
| `toggle`            |   46.2 kB |  15.7 kB |  13.9 kB |
| `toggle-group`      |   67.2 kB |  23.1 kB |  20.4 kB |
| `tool-activity`     |  193.0 kB |  57.6 kB |  47.9 kB |
| `toolbar-status`    |  302.5 kB |  94.4 kB |  80.5 kB |
| `tooltip`           |  164.7 kB |  56.7 kB |  49.5 kB |
| `typed-text`        |   31.2 kB |  10.1 kB |   8.9 kB |
| `view-switcher`     |  380.0 kB | 119.7 kB | 100.6 kB |
| `web-source`        |  150.4 kB |  42.2 kB |  35.0 kB |

</details>
<!-- bundle-size:end -->

CI compares sizes on each pull request. Run `pnpm size` to see them locally.

| Group                   | Components                                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Actions**             | Button · Button Group · Toggle · Toggle Group · Toolbar Status · Kbd                                                                                                                                                                                                      |
| **Forms**               | Field · Form · Label · Input · Input Group · Input OTP · Textarea · Checkbox · Radio Group · Switch · Slider · Select · Combobox · Choice List · Calendar · Search Field · Rich Text Editor · Mention List · Questionnaire · Selection Slot · Reasoning Effort            |
| **Overlays**            | Dialog · Alert Dialog · Sheet · Popover · Hover Card · Tooltip · Dropdown Menu · Context Menu · Menubar · Command · Search Dialog · Toast                                                                                                                                 |
| **Layout & navigation** | Sidebar · Navigation Menu · Breadcrumb · Pagination · Tabs · View Switcher · Accordion · Collapsible · Page Header · Page Content · Settings List · Card · Carousel · Resizable · Scroll Area · Separator · Aspect Ratio · Direction · Canvas                             |
| **Feedback**            | Alert · Notice Banner · Badge · Progress · Spinner · Skeleton · State Panel · State Sample · Status · Task Tree                                                                                                                                                           |
| **Data display**        | Table · Chart · Metric · Code Block · File Viewer · Schema Diagram · Avatar · Agent Avatar · Monster Avatar · Brand Icon · Attachment · Typed Text · Gradient Banner · Glass Banner                                                                                       |
| **Agents & chat**       | A2UI Surface · Message · Message Actions · Message Response · Message Rich Text · Message Scroller · Chat Confirmation · Chat Plan · Chat Sources · Knowledge Base · Model Selector · Plan Outline · Prompt List · Result Card · Review Card · Tool Activity · Web Source |

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

The `tulipfarm` preset is the source of truth for every TulipFarm product. The
app and tulipfarm.ai read their colors from it, so change TulipFarm colors
there.

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
After you change agent avatar artwork in `packages/sprout/artwork/agent-avatars`, run `pnpm avatars`.

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
