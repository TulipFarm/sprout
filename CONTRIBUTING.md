# Contributing

Thanks for helping with Sprout.

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
pnpm format:check
pnpm test
pnpm test:browser   # needs: pnpm exec playwright install chromium
pnpm test:install
```

While you work, run one test file at a time: `pnpm vitest run tests/sprout/button.test.tsx`.

## Pull requests

- Keep each pull request to one change.
- Add or update tests for behavior changes.
- Add or update the docs demo in `apps/docs` for visible changes, and attach
  a screenshot.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for
  commit messages (`feat:`, `fix:`, `docs:`, `chore:`). The changelog is
  generated from them.

## Layout

See [Layout](README.md#layout) in the README. Terms are defined in
[GLOSSARY.md](GLOSSARY.md).

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
