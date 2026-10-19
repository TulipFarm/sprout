# Plan: `ChatInput` component

## Context

Sprout has no chat input component in the library. A near-complete prototype already lives in
docs only: `ChatComposer` in `apps/docs/src/components/RichTextEditorDemo.tsx:1016-1290`
(TipTap, `@`/`/` suggestions, model + project pickers, chips, send/stop).
Goal: move it into `packages/sprout` as `ChatInput`, harden and polish it to match the
reference screenshots, and show it running locally in the docs app.

## Decisions (from grilling)

| #                | Decision                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Triggers         | `@` agents, `/` skills, `#` files                                                            |
| Formatting       | Markdown input rules + Cmd+B / Cmd+I / Cmd+K. Auto-link URLs and emails (mailto). No toolbar |
| Bottom bar left  | `[+ attach menu]` `[✦ modes menu]` `\|` `[Project ▾]`                                        |
| Bottom bar right | `[Model ▾ with logo]` `[Send ↑ / Stop ■]`                                                    |
| Attach menu (+)  | Items passed in: local file, Google Drive, URL, … (app supplies handlers)                    |
| Modes menu       | Items passed in: Plan, Deep research, Learning, … (toggle, active mode shown as chip in bar) |
| Skipped          | Mic, rewrite pen, "Thinking…" strip                                                          |
| Below box        | Suggested prompt chips (icon + label, like screenshot)                                       |
| Build path       | Promote demo code into the library, swap hand-made parts for Sprout parts                    |

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ [file.png ×] [spec.pdf ×]          ← FileAttachment chips │
│ Ask anything, @agents, /skills, #files …                  │
│                                                           │
│ [+] [✦] │ [Project ▾]              [◆ Claude Opus ▾] (↑) │
└──────────────────────────────────────────────────────────┘
 [◇ Clarify problem] [◇ Define context] [◇ Refine reqs]   ← prompt chips
```

Send button: filled dark circle (light theme), filled white (dark theme), becomes Stop while
`status="streaming"`. Placeholder turns to a soft "Working on your request…" while streaming.

## Files

**New**

- `packages/sprout/src/components/chat-input.tsx` — `ChatInput` + small parts:
  - Root props: `value`/`onValueChange` (TipTap JSON), `onSend`, `onStop`, `status: "idle" | "streaming"`,
    `placeholder`, `disabled`, `attachments` + `onRemoveAttachment`,
    `agents`, `skills`, `files` (each `(query) => Item[] | Promise<Item[]>`),
    `attachActions`, `modes` + `mode`/`onModeChange`,
    `projects` + `project`/`onProjectChange`, `models` + `model`/`onModelChange`,
    `prompts` + `onPromptSelect`.
  - Internals moved from the demo: `referenceNode` (kind: agent | skill | file), `triggerExtension`
    (`RichTextEditorDemo.tsx:475-578`), panel-flip logic (`:1059`), send/stop (`:1224-1262`).
  - Built on `RichTextEditor` (`rich-text-editor.tsx`, already TipTap 3, Enter-to-send, `extensions` prop,
    `ariaExpanded`/`ariaActiveDescendant` hooks) inside `InputGroup variant="composer"`.
- `packages/sprout/src/styles/chat-input.css` — `sprout-chat-input-*` classes, tokens only, light + dark.
- `apps/docs/src/components/ChatInputDemo.tsx` + `apps/docs/src/styles/chat-input-demo.css` —
  states: empty, typing, with attachments, streaming, dark.
- `apps/docs/src/pages/components/chat-input.astro` — docs page (copy `mention-list.astro` shape).
- `tests/chat-input.test.tsx` (vitest) and `tests/browser/chat-input.spec.ts` (Playwright).

**Reuse instead of re-writing**

- Suggestion panel → `MentionList` / `MentionOption` / `MentionGroup` / `MentionStatus` (`mention-list.tsx`).
- Chips → `FileAttachment variant="chip"` (`attachment.tsx:567`).
- Pickers → `Popover` + `Command` (pattern from demo `ModelPicker` `:818`, `PersonaPicker` `:735`).
- `+` and modes menus → `DropdownMenu`.
- Model logos → `BrandIcon` (`brand-icon.tsx`).
- Prompt chips → `Button` (outline, sm) with icon; no new component.

**Edit**

- `packages/sprout/package.json` — add `@tiptap/suggestion@3.31.4` dep (+ `@tiptap/extension-link` only if
  StarterKit's link autolink misses emails); add `"./chat-input"` subpath export.
- `packages/sprout/src/index.ts`, `src/styles/index.css` — export + import.
- `packages/sprout/src/internal/brand-glyphs.ts` + `brand-icon.tsx` — add `gemini`, `mistral`, `meta`, `qwen`
  from `@lobehub/icons-static-svg` (same generator source as existing glyphs).
- `apps/docs/src/data/nav.ts`, `HomePreview.tsx` tile, `tests/components.test.tsx` export lists,
  `tools/component-board/inventory.mjs`, `skills/sprout/SKILL.md` + `references/components.md`.
- `RichTextEditorDemo.tsx` + `InputGroupDemo.tsx` composer demos → use `ChatInput` (delete duplicate code).
- `docs/plans/chat-input.md` — copy of this plan (per AGENTS.md).

## Hardening

- Keyboard: arrows/Enter/Tab pick suggestion, Esc closes, Enter sends only when panel closed, Shift+Enter newline.
- a11y: combobox wiring via `ariaExpanded`/`ariaControls`/`ariaActiveDescendant`; labelled buttons; live status.
- Async item loaders with loading / empty / error via `MentionStatus`.
- Send disabled when empty or `disabled`; stop always enabled while streaming.
- Paste: plain text + markdown fences already handled by `RichTextEditor`.

## Verification

1. `pnpm typecheck`
2. `pnpm vitest run tests/chat-input.test.tsx tests/components.test.tsx` (one process at a time)
3. `pnpm dev` → open `http://127.0.0.1:4321/components/chat-input` (local preview for user).
4. agent-browser screenshots (light + dark): empty, `@`/`/`/`#` panels open, chips, streaming → `/tmp`.
5. `pnpm build && pnpm test:browser tests/browser/chat-input.spec.ts`
6. Stop dev server and close Chrome for Testing afterwards.
