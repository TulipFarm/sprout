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

A page that uses only a few components can import their styles one by one from
`@tulipfarm/sprout/styles/<component>.css`, in the order `styles.css` lists them, and then
`@tulipfarm/sprout/styles/base.css` last. It loads less CSS and keeps the same cascade.

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

Full library: **924.6 kB** gzip. Each component path is smaller. Sizes are minified, with React and other peer dependencies left out.

<details>
<summary>Size of each component</summary>

| Component           |       Raw |     Gzip |   Brotli |
| ------------------- | --------: | -------: | -------: |
| `a2ui`              | 1518.3 kB | 458.3 kB | 380.2 kB |
| `a2ui/catalog`      |   52.3 kB |  18.3 kB |  16.4 kB |
| `accordion`         |  182.0 kB |  53.6 kB |  44.7 kB |
| `agent-fanout`      |  361.1 kB | 117.0 kB |  99.0 kB |
| `agent-avatar`      |  139.2 kB |  40.3 kB |  34.4 kB |
| `monster-avatar`    |   69.8 kB |  22.9 kB |  19.9 kB |
| `alert`             |   36.5 kB |  11.8 kB |  10.4 kB |
| `alert-dialog`      |  284.2 kB |  87.8 kB |  75.0 kB |
| `aspect-ratio`      |   31.6 kB |  10.0 kB |   8.7 kB |
| `attachment`        |  435.9 kB | 138.5 kB | 115.9 kB |
| `avatar`            |   45.4 kB |  15.0 kB |  13.2 kB |
| `badge`             |   36.3 kB |  11.8 kB |  10.3 kB |
| `board`             |  562.1 kB | 179.3 kB | 150.0 kB |
| `brand-icon`        |  196.5 kB |  70.5 kB |  61.6 kB |
| `breadcrumb`        |  156.6 kB |  44.0 kB |  36.6 kB |
| `button`            |  165.7 kB |  48.4 kB |  39.6 kB |
| `button-group`      |   39.3 kB |  12.5 kB |  11.0 kB |
| `calendar`          |  423.9 kB | 132.8 kB | 113.0 kB |
| `canvas`            |  343.4 kB | 108.6 kB |  93.0 kB |
| `card`              |   36.8 kB |  11.9 kB |  10.4 kB |
| `carousel`          |  174.3 kB |  51.4 kB |  42.3 kB |
| `chart`             |  602.7 kB | 170.8 kB | 140.2 kB |
| `timeline`          |  766.3 kB | 219.6 kB | 180.1 kB |
| `chat-confirmation` |  186.8 kB |  53.7 kB |  45.6 kB |
| `chat-plan`         |  153.4 kB |  42.9 kB |  35.6 kB |
| `chat-sources`      |  315.8 kB |  98.4 kB |  83.9 kB |
| `chat-input`        | 1048.9 kB | 339.3 kB | 281.9 kB |
| `chat-window`       |  389.1 kB | 122.7 kB | 102.4 kB |
| `checkbox`          |  177.2 kB |  52.5 kB |  43.6 kB |
| `choice-list`       |  158.4 kB |  45.0 kB |  37.1 kB |
| `code-block`        |  185.5 kB |  55.3 kB |  45.8 kB |
| `collapsible`       |   56.8 kB |  19.1 kB |  16.9 kB |
| `combobox`          |  381.1 kB | 121.4 kB | 102.0 kB |
| `command`           |  293.9 kB |  91.7 kB |  77.8 kB |
| `context-menu`      |  359.8 kB | 111.9 kB |  95.1 kB |
| `dialog`            |  284.7 kB |  88.0 kB |  75.2 kB |
| `direction`         |    1.5 kB |   0.8 kB |   0.7 kB |
| `dropdown-menu`     |  356.6 kB | 110.6 kB |  94.4 kB |
| `field`             |  215.6 kB |  65.2 kB |  54.9 kB |
| `file-explorer`     |  264.8 kB |  82.6 kB |  69.0 kB |
| `file-viewer`       |  413.1 kB | 131.6 kB | 110.4 kB |
| `form`              |  224.1 kB |  68.5 kB |  57.0 kB |
| `glass-banner`      |   34.3 kB |  11.0 kB |   9.6 kB |
| `gradient-banner`   |   33.5 kB |  10.7 kB |   9.4 kB |
| `hover-card`        |  164.5 kB |  56.6 kB |  49.4 kB |
| `input`             |  225.9 kB |  68.3 kB |  57.7 kB |
| `input-group`       |  233.5 kB |  72.1 kB |  59.7 kB |
| `icons`             |  123.1 kB |  33.5 kB |  27.3 kB |
| `input-otp`         |  183.4 kB |  54.6 kB |  45.7 kB |
| `kbd`               |   31.7 kB |  10.0 kB |   8.7 kB |
| `knowledge-base`    |  424.4 kB | 137.7 kB | 115.6 kB |
| `label`             |   31.5 kB |  10.0 kB |   8.7 kB |
| `mention-list`      |  168.0 kB |  49.0 kB |  40.2 kB |
| `menubar`           |  361.9 kB | 113.3 kB |  96.1 kB |
| `message`           |   37.5 kB |  12.1 kB |  10.6 kB |
| `message-actions`   |  308.9 kB |  97.6 kB |  82.3 kB |
| `message-response`  |  352.8 kB | 105.2 kB |  90.5 kB |
| `message-rich-text` |  443.9 kB | 141.0 kB | 117.6 kB |
| `message-scroller`  |  183.1 kB |  53.3 kB |  44.3 kB |
| `metric`            |   32.5 kB |  10.3 kB |   9.0 kB |
| `model-selector`    |  387.8 kB | 127.0 kB | 107.0 kB |
| `navigation-menu`   |  300.2 kB |  94.9 kB |  80.3 kB |
| `notice-banner`     |   31.9 kB |  10.1 kB |   8.8 kB |
| `page-content`      |   31.5 kB |  10.0 kB |   8.7 kB |
| `page-header`       |  168.5 kB |  49.1 kB |  40.2 kB |
| `pagination`        |  167.4 kB |  48.8 kB |  40.0 kB |
| `plan-outline`      |  182.6 kB |  53.7 kB |  44.6 kB |
| `popover`           |  179.3 kB |  61.1 kB |  52.8 kB |
| `presence-cursor`   |   32.1 kB |  10.2 kB |   8.9 kB |
| `progress`          |   41.1 kB |  13.5 kB |  11.8 kB |
| `prompt-list`       |  316.6 kB | 102.5 kB |  87.6 kB |
| `questionnaire`     |  183.9 kB |  53.0 kB |  45.1 kB |
| `radio-group`       |   82.2 kB |  28.2 kB |  25.0 kB |
| `reasoning-effort`  |   36.9 kB |  12.4 kB |  10.8 kB |
| `record-list`       |  173.7 kB |  51.0 kB |  41.9 kB |
| `resizable`         |   40.8 kB |  13.7 kB |  12.1 kB |
| `result-card`       |  351.2 kB | 114.2 kB |  95.9 kB |
| `result-notice`     |  151.5 kB |  42.2 kB |  35.0 kB |
| `review-card`       |  179.5 kB |  51.1 kB |  43.6 kB |
| `rich-text-editor`  |  581.0 kB | 179.7 kB | 152.4 kB |
| `schema-diagram`    |  423.6 kB | 137.8 kB | 112.9 kB |
| `sql-viewer`        |  429.1 kB | 140.0 kB | 114.8 kB |
| `scroll-area`       |   58.7 kB |  20.0 kB |  17.7 kB |
| `search-dialog`     |  302.3 kB |  93.6 kB |  79.9 kB |
| `search-field`      |  234.2 kB |  72.3 kB |  59.9 kB |
| `select`            |  346.9 kB | 109.8 kB |  93.0 kB |
| `selection-slot`    |   32.9 kB |  10.5 kB |   9.2 kB |
| `separator`         |   38.3 kB |  12.2 kB |  10.8 kB |
| `settings-list`     |   32.5 kB |  10.2 kB |   8.9 kB |
| `sheet`             |  327.3 kB | 102.9 kB |  88.2 kB |
| `sidebar`           |  368.2 kB | 117.6 kB |  98.3 kB |
| `skeleton`          |   36.5 kB |  11.9 kB |  10.4 kB |
| `slider`            |   84.9 kB |  29.8 kB |  26.3 kB |
| `spinner`           |  151.8 kB |  42.3 kB |  35.1 kB |
| `state-panel`       |  592.2 kB | 186.8 kB | 155.6 kB |
| `state-sample`      |   34.8 kB |  10.8 kB |   9.5 kB |
| `status`            |   35.6 kB |  11.5 kB |  10.1 kB |
| `switch`            |   51.6 kB |  17.7 kB |  15.6 kB |
| `table`             |  645.3 kB | 200.4 kB | 168.7 kB |
| `table-nuqs`        |    2.1 kB |   1.1 kB |   1.0 kB |
| `tabs`              |   81.6 kB |  27.9 kB |  24.7 kB |
| `task-tree`         |  428.4 kB | 138.4 kB | 114.3 kB |
| `textarea`          |  215.9 kB |  65.2 kB |  54.9 kB |
| `toast`             |  297.3 kB |  93.5 kB |  80.3 kB |
| `toggle`            |   47.5 kB |  16.0 kB |  14.1 kB |
| `toggle-group`      |   68.5 kB |  23.4 kB |  20.7 kB |
| `tool-activity`     |  194.9 kB |  58.1 kB |  48.2 kB |
| `toolbar-status`    |  304.4 kB |  94.4 kB |  80.9 kB |
| `tooltip`           |  166.0 kB |  57.0 kB |  49.7 kB |
| `typed-text`        |   32.5 kB |  10.5 kB |   9.1 kB |
| `view-switcher`     |  381.9 kB | 119.7 kB | 101.0 kB |
| `web-source`        |  152.3 kB |  42.7 kB |  35.4 kB |

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

Every component is a shadcn registry item. The CLI copies the source into your
app, with the Sprõut components it uses and the CSS it needs:

```sh
pnpm dlx shadcn@latest add https://sprout.tulipfarm.ai/r/button.json
```

Or add `"registries": { "@sprout": "https://sprout.tulipfarm.ai/r/{name}.json" }`
to `components.json` and run `shadcn add @sprout/button`. Themes are
`@sprout/theme-<name>`. Each component page lists the command and the manual
steps. `sprout.json` installs the npm package instead of copying source.

The registry is built from the package source by `pnpm registry`, and
`pnpm test:registry` installs every item into a fresh app with the real CLI.

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
