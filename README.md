<div align="center">

# 🌱 Sprout

**Thoughtful React controls, built with Base UI and Tailwind CSS.**

Every state planted, every edge case tended.

[![CI](https://github.com/TulipFarm/sprout/actions/workflows/ci.yml/badge.svg)](https://github.com/TulipFarm/sprout/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@tulipfarm/sprout?color=188038)](https://www.npmjs.com/package/@tulipfarm/sprout)
[![License: MIT](https://img.shields.io/badge/license-MIT-188038)](https://github.com/TulipFarm/sprout/blob/main/LICENSE)
[![Conventional Commits](https://img.shields.io/badge/commits-conventional-188038)](https://www.conventionalcommits.org)

[Install](#install) · [Components](#components) · [Theming](#theming) · [Develop](#develop) · [Contributing](#contributing)

</div>

---

Sprout is a general-purpose component library from
[TulipFarm](https://tulipfarm.ai). It cares about the small things: busy,
blocked, invalid, empty, and loading states, keyboard paths, and screen reader
labels. The default theme is neutral, so it fits your product, not ours.

- **Accessible by default.** Built on [Base UI](https://base-ui.com) primitives.
- **Tailwind CSS 4 native.** One CSS import. No JavaScript theme object.
- **Tree-shakable.** Every component has its own import path.
- **Agent-ready.** Chat, plan, tool, and review components for AI products.
- **Light and dark.** A neutral default and 15 more CSS theme presets.

> [!NOTE]
> Sprout is pre-1.0. APIs can change between minor versions.

## Install

Sprout needs React 19 and Tailwind CSS 4.

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
@import "tailwindcss";
@import "@tulipfarm/sprout/styles.css";
```

Use a component:

```tsx
import { Button } from "@tulipfarm/sprout/button";
import { Badge } from "@tulipfarm/sprout/badge";

export function Status() {
  return (
    <>
      <Badge variant="success">Connected</Badge>
      <Button state={{ kind: "busy" }} pendingLabel="Saving…">
        Save
      </Button>
    </>
  );
}
```

The CSS entry registers Sprout's classes with Tailwind. It does not change your
body styles or generic shadcn tokens. Tailwind utility prefixes are not
supported yet.

## Components

Each component imports from `@tulipfarm/sprout/<name>`, for example
`@tulipfarm/sprout/dialog`. See the [component reference](https://github.com/TulipFarm/sprout/blob/main/docs/components.md)
for notes on each one.

| Group                   | Components                                                                                                                                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Actions**             | Button · Button Group · Toggle · Toggle Group · Toolbar Status · Kbd                                                                                                                                                                                           |
| **Forms**               | Field · Form · Label · Input · Input Group · Input OTP · Textarea · Checkbox · Radio Group · Switch · Slider · Select · Combobox · Choice List · Calendar · Search Field · Rich Text Editor · Mention List · Questionnaire · Selection Slot · Reasoning Effort |
| **Overlays**            | Dialog · Alert Dialog · Sheet · Popover · Hover Card · Tooltip · Dropdown Menu · Context Menu · Menubar · Command · Search Dialog · Toast                                                                                                                      |
| **Layout & navigation** | Sidebar · Navigation Menu · Breadcrumb · Pagination · Tabs · Accordion · Collapsible · Page Header · Page Content · Settings List · Card · Carousel · Resizable · Scroll Area · Separator · Aspect Ratio · Direction · Canvas                                  |
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
@import "@tulipfarm/sprout/themes/tulipfarm.css";
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
pnpm format:check
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
