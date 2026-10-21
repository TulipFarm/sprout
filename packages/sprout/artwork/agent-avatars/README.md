# Agent avatar artwork

The sources for [`AgentAvatar`](../../src/components/agent-avatar.tsx): 100 original objects in eight colors.
Formerly the `TulipFarm/avatars` repository and `avatars.tulipfarm.ai`.

- `<slug>.svg`: one drawing per object, in a `0 0 256 256` viewBox.
- `catalog.json`: each object's slug, name, group, default color and approval status.
- `palettes.json`: the seven color roles for each of the eight colors.

After any change, run `pnpm avatars` from the repository root. It checks every source, optimizes it with svgo
and writes `src/internal/agent-avatar-artwork.ts`. A unit test fails if that file is out of date.

## Rules

- Never reorder or remove catalog entries, and do not append new ones: agents are assigned artwork by position,
  so any change gives existing agents a different picture.
- Every colored attribute names a role instead of a fixed color, for example
  `fill="#FFD6E5" data-fill="main"`. Use `data-stroke` for strokes and `data-stop-color` for gradient stops.
  Roles are `circle`, `outline`, `main`, `secondary`, `highlight`, `shadow` and `accent`. `fill="none"` needs no role.
- Each drawing has exactly one `<circle cx="128" cy="128" r="120" data-fill="circle">`. The shared gradient and
  grain are added on top of it; ids starting with `tf-background-` are reserved for them.
- Use only self-contained vector shapes: no scripts, `style`, links, fonts or embedded images.
- Only `approved` objects ship. Check a drawing in all eight colors on the Agent Avatar docs page before approving it.
