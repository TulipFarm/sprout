# Contributing

Thanks for helping with Sprõut.

## Setup

You need Node 22.22 or newer and pnpm (the version is pinned in
`package.json`; run `corepack enable` to get it).

```sh
pnpm install
pnpm dev          # build the package and start the docs site
```

## Checks

CI runs these. Run them before you open a pull request:

```sh
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:browser   # needs: pnpm exec playwright install chromium
pnpm test:install
```

`pnpm lint` checks formatting with Oxfmt and runs Oxlint. `pnpm format` fixes
formatting. The shared rules live in TulipFarm/root `docs/code-style.md`.

While you work, run one test file at a time: `pnpm vitest run tests/sprout/button.test.tsx`.

## Pull requests

- Keep each pull request to one change.
- Add or update tests for behavior changes.
- Add or update the docs demo in `apps/docs` for visible changes, and attach
  a screenshot.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for
  commit messages (`feat:`, `fix:`, `docs:`, `chore:`). The changelog is
  generated from them.
- For a breaking change, write a `BREAKING CHANGE:` footer that says what to
  change: old and new names, props and import paths. Apps are migrated from
  this text.

## Releases

Publishing a GitHub release runs
[`notify-consumers.yml`](.github/workflows/notify-consumers.yml). It sends a
`sprout-release` dispatch to TulipFarm/tulipfarm and TulipFarm/tulipfarm.ai,
whose `sprout-upgrade` workflow bumps the pin, has Copilot migrate the code
from the changelog and source diff, and opens a pull request. The dispatch
needs the `SPROUT_UPGRADE_TOKEN` secret.

## Layout

See [Layout](README.md#layout) in the README. Terms are defined in
[GLOSSARY.md](GLOSSARY.md).

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
