---
name: sprout
description: Build React UIs with the Sprout component library (@tulipfarm/sprout). Use when writing, choosing, or reviewing Sprout components, forms, overlays, tables, chat and agent UIs, or Sprout theming.
---

# Sprout

Sprout is a React 19 + Tailwind CSS 4 component library built on Base UI.
Before you write a custom component, check the index below. Most needs are
already covered.

For a usage snippet of any component, read
[references/components.md](references/components.md) and search for its name.

## Setup

```css
@import 'tailwindcss';
@import '@tulipfarm/sprout/styles.css';
/* Optional preset, then <html data-sprout-theme="tulipfarm"> */
@import '@tulipfarm/sprout/themes/tulipfarm.css';
```

Presets: `neutral` (default), `tulipfarm`, `claude`, `chatgpt`, `cloudflare`,
`discord`, `github`, `grok`, `linear`, `notion`, `perplexity`, `raycast`,
`spotify`, `stripe`, `supabase`, `vercel`.

## Rules

- **One entry per component.** Import from `@tulipfarm/sprout/<slug>`, for
  example `import { Button } from "@tulipfarm/sprout/button"`. The slug is in
  the index.
- **Compose with `render`, not `asChild`.** Triggers and parts take Base UI's
  `render` prop: `<DialogTrigger render={<Button variant="outline" />}>`.
  Router links go in `render={<Link to="…" />}`.
- **A link styled as a button** needs `nativeButton={false}`:
  `<Button nativeButton={false} render={<a href="/x" />}>`.
- **Icons** come from `reicon-react/icons/<Name>`. Mark decorative icons
  `aria-hidden="true"`. Put `data-icon="inline-start"` or `"inline-end"` on an
  icon next to text to tighten padding.
- **Icon-only controls** need an `aria-label`. Add a `Tooltip` to show it.
- **Colors and sizes come from tokens.** Use `--sprout-*` variables or their
  Tailwind classes (`text-sprout-muted`, `bg-sprout-surface`,
  `text-sprout-danger`). Do not hard-code hex colors. Theme by overriding
  tokens in CSS, never with a JS theme object. App chrome Sprõut does not
  draw uses `--sprout-sidebar`, `--sprout-popover`, `--sprout-body`,
  `--sprout-faint`, and `--sprout-primary-text`.
- **Color is never the only signal.** Badge and status text must carry the
  meaning in words.
- **Busy and blocked actions** use `Button`'s `state` instead of hand-made
  spinners: `state={{ kind: "busy" }}` with `pendingLabel="Saving…"`, or
  `state={{ kind: "blocked", reason: "Add a name first" }}`.
- **Forms**: wrap each control in `Field` (label, helper, error). Use `Form` +
  `FormFooter` when a form saves, so fields lock and focus moves to the first
  error.
- **Rows of records always use `Table`.** It is the only table. It has no public
  parts (`TableRow`, `TableCell` do not exist). If it cannot do something, the
  feature goes into `Table`.
- **Loading, empty, and error states** are app-owned. Use `StatePanel`,
  `Skeleton`, or `Spinner` to show them.

## Choose the right one

```
Need an overlay?
  must answer before going on, hard to undo ── Alert Dialog
  short form / preview, blocks page ───────── Dialog
  needs more room, page stays visible ──────── Sheet
  floating panel, page stays usable ────────── Popover
  list of actions behind a button ──────────── Dropdown Menu
  one-line name for an icon button ─────────── Tooltip
  preview of a link target ─────────────────── Hover Card

Pick a value?
  short fixed list ───────── Select
  long list, type to filter ─ Combobox
  2–5 visible choices ─────── Radio Group / Toggle Group (spacing={0})
  on/off, applies now ─────── Switch
  on/off, saved with form ─── Checkbox
  number or range ─────────── Slider

Show a message?
  inline, next to content ──── Alert
  top of page, needs action ── Notice Banner
  just happened, goes away ─── Toast

Waiting?
  known amount ──────────── Progress
  shape of content known ── Skeleton
  short wait, no shape ──── Spinner
  state of a task or step ── Status
  a run's tasks as a tree ── Task Tree

Show / hide in place?
  one region ──────── Collapsible
  stack of sections ─ Accordion
  one panel at a time Tabs
```

## Component index

Import path is `@tulipfarm/sprout/<slug>`.

### Actions

| Component      | Slug             | Use when                                                                                                                 |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Button         | `button`         | Any action, link, or trigger. Seven variants, icon sizes, busy/blocked `state`. `ActionGroup` shares state across a row. |
| Button Group   | `button-group`   | Join related buttons into one control: pagers, steppers, split actions.                                                  |
| Toggle         | `toggle`         | One button that stays on or off: bold, a filter, a view option.                                                          |
| Toggle Group   | `toggle-group`   | Several toggles sharing one value: layout, time range, text styles.                                                      |
| Toolbar Status | `toolbar-status` | Replace an action button with what it did ("Export failed") plus details.                                                |
| Kbd            | `kbd`            | Show a key or shortcut in text, tooltips, menus, footers.                                                                |

### Forms

| Component        | Slug               | Use when                                                                                            |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| Calendar         | `calendar`         | Pick one date, several dates, or a range. Put it in a Popover for a date picker.                    |
| Checkbox         | `checkbox`         | Consent, permissions, multi-pick, row selection. Supports `indeterminate`.                          |
| Choice List      | `choice-list`      | Radio or checkbox rows answering one question, with an optional typed answer.                       |
| Combobox         | `combobox`         | Long list (people, channels, time zones): type to filter, one or many.                              |
| Field            | `field`            | Label + helper + error around any control. `ChoiceGroup`, `CheckboxField`, `FieldsDisabled`.        |
| Form             | `form`             | A form that saves: locks fields, focuses the first error, `FormFooter` explains why it cannot save. |
| Input            | `input`            | Single-line text, email, number, date, time, url, file.                                             |
| Input Group      | `input-group`      | One bordered field with icons, prefixes, and buttons. Also the chat composer.                       |
| Input OTP        | `input-otp`        | One-time sign-in or verification code, one slot per character.                                      |
| Label            | `label`            | Name a control. Wrap a checkbox, switch, or radio with it.                                          |
| Radio Group      | `radio-group`      | Short list where exactly one is chosen.                                                             |
| Rich Text Editor | `rich-text-editor` | Chat message box: Enter sends, Markdown shortcuts, keyword chips. Tiptap-based.                     |
| Search Field     | `search-field`     | Search input with magnifier and clear button for filtering a list.                                  |
| Select           | `select`           | Pick one value from a short, fixed list.                                                            |
| Slider           | `slider`           | Pick a number or a range on a track.                                                                |
| Switch           | `switch`           | On/off setting that applies right away.                                                             |
| Textarea         | `textarea`         | Multi-line text: prompts, notes, replies. Grows with content.                                       |

### Overlays

| Component     | Slug            | Use when                                                                                   |
| ------------- | --------------- | ------------------------------------------------------------------------------------------ |
| Alert Dialog  | `alert-dialog`  | Confirm something hard to undo: delete, disconnect, discard. Outside click does not close. |
| Command       | `command`       | Searchable list of actions, inline, in a picker, or as a palette.                          |
| Context Menu  | `context-menu`  | Right-click / long-press shortcuts for actions also reachable another way.                 |
| Dialog        | `dialog`        | Modal for a decision, short form, preview. Sizes `default`, `form`, `split`, `fullscreen`. |
| Dropdown Menu | `dropdown-menu` | Actions behind a button: row actions, account menu, filters.                               |
| Hover Card    | `hover-card`    | Preview a person or page behind a link.                                                    |
| Menubar       | `menubar`       | File / View style menus for an editor with many commands.                                  |
| Popover       | `popover`       | Floating panel with any content: details, pickers, short forms.                            |
| Search Dialog | `search-dialog` | Wide "jump to" palette with grouped results and counts.                                    |
| Sheet         | `sheet`         | Panel from an edge for details, filters, editors that need room. Swipes closed on touch.   |
| Tooltip       | `tooltip`       | One-line label for icon buttons, column hints, collapsed nav.                              |

### Navigation

| Component       | Slug              | Use when                                                     |
| --------------- | ----------------- | ------------------------------------------------------------ |
| Breadcrumb      | `breadcrumb`      | Show where a page or folder sits.                            |
| Navigation Menu | `navigation-menu` | Site links where some items open a panel of links.           |
| Pagination      | `pagination`      | Previous / next / numbered pages for long lists.             |
| Sidebar         | `sidebar`         | App navigation: groups, icon rail, mobile drawer.            |
| Tabs            | `tabs`            | Switch between panels of one page, or steps of a setup flow. |
| View Switcher   | `view-switcher`   | A table's open views (Table, List, Board…) and Add view.     |

### Layout

| Component      | Slug             | Use when                                                                          |
| -------------- | ---------------- | --------------------------------------------------------------------------------- |
| Accordion      | `accordion`      | Stack of sections that open in place: FAQs, filters, details.                     |
| Aspect Ratio   | `aspect-ratio`   | Keep an image, video, or placeholder at a fixed ratio.                            |
| Card           | `card`           | Bordered panel with header, content, footer.                                      |
| Collapsible    | `collapsible`    | Show and hide one region in place.                                                |
| Direction      | `direction`      | Right-to-left languages: `DirectionProvider direction="rtl"` + `dir="rtl"`.       |
| Page Content   | `page-content`   | Padded column for a page's header and sections. Put it in your own scroll region. |
| Page Header    | `page-header`    | Page `h1`, description, actions, back link or breadcrumb.                         |
| Resizable      | `resizable`      | Panels split by a draggable divider.                                              |
| Scroll Area    | `scroll-area`    | Scroll region with thin themed scrollbars; `variant="table"` for wide grids.      |
| Selection Slot | `selection-slot` | Swap a toolbar for a selection toolbar in place without layout shift.             |
| Separator      | `separator`      | Divide content; centered "or" label; timeline marker.                             |
| Settings List  | `settings-list`  | Settings page: titled groups, label + description + control per row.              |

### Feedback

| Component     | Slug            | Use when                                                                             |
| ------------- | --------------- | ------------------------------------------------------------------------------------ |
| Alert         | `alert`         | Inline error, conflict, or note next to the content it affects.                      |
| Notice Banner | `notice-banner` | Full-width strip at the top of a page that needs action.                             |
| Progress      | `progress`      | Known progress (upload, quota). `value={null}` when unknown.                         |
| Result Notice | `result-notice` | Inside a chart or timeline that shows only the first part of the result.             |
| Skeleton      | `skeleton`      | Hold the shape of loading content so the page does not jump.                         |
| Spinner       | `spinner`       | Short wait with no known shape: busy buttons, status lines.                          |
| State Panel   | `state-panel`   | Empty, loading, success, unavailable, or error state with a next step.               |
| State Sample  | `state-sample`  | Small picture of a filled page, passed to an empty State Panel's `sample`.           |
| Status        | `status`        | Round mark for a task, run, or step: pending, running (with `value`), done, failed.  |
| Task Tree     | `task-tree`     | Live tree of a run's tasks with a Status on each; parents follow their parts.        |
| Toast         | `toast`         | Short notice that something just happened. Mount `Toaster` once, call `toast.add()`. |

### Data display

| Component       | Slug              | Use when                                                                         |
| --------------- | ----------------- | -------------------------------------------------------------------------------- |
| Agent Avatar    | `agent-avatar`    | An agent's picture, built in and picked from its id. No hosting needed.          |
| Attachment      | `attachment`      | File rows, cards, chips, upload states, drop zone.                               |
| Avatar          | `avatar`          | People and workspaces, with initials fallback and groups.                        |
| Badge           | `badge`           | Status, count, or metadata label. Nine tones.                                    |
| Board           | `board`           | Kanban board: drag and drop or read-only, column loading/error/Show all, lanes.  |
| Brand Icon      | `brand-icon`      | Logos of connected apps and models; tiles and stacks.                            |
| Carousel        | `carousel`        | Slides that scroll one stop at a time.                                           |
| Chart           | `chart`           | `UsageChart` for usage over days; `ChartContainer` wraps any Recharts chart.     |
| Code Block      | `code-block`      | Syntax-colored code with line numbers and copy.                                  |
| File Explorer   | `file-explorer`   | Read-only repo: folder tree, tabs, syntax colors, name and text search.          |
| File Viewer     | `file-viewer`     | Open images, PDF, text, code, Google files in a viewer.                          |
| Glass Banner    | `glass-banner`    | Frosted hero banner with draggable chips.                                        |
| Gradient Banner | `gradient-banner` | Decorative gradient art with readable panels on top.                             |
| Presence Cursor | `presence-cursor` | Other people's pointers on a shared surface, with a name tag or avatar.          |
| Record List     | `record-list`     | List view of records: title, four labelled values, badges, row actions, paging.  |
| Result Card     | `result-card`     | Something an agent made, with apps used, status, one action.                     |
| Schema Diagram  | `schema-diagram`  | Tables, fields, and links with proposed changes marked.                          |
| SQL Viewer      | `sql-viewer`      | Explore TulipFarm tables, columns, keys, and joins. Shows 4, collapses the rest. |
| Table           | `table`           | Any rows of records: sort, filter, group, edit, select, card layout on phones.   |
| Timeline        | `timeline`        | Records by week, month, or quarter: bars, dates, row actions, a text list.       |

### AI and chat

| Component         | Slug                | Use when                                                         |
| ----------------- | ------------------- | ---------------------------------------------------------------- |
| Agent Fanout      | `agent-fanout`      | A live tree of the agents a run started and what each is doing.  |
| Chat Confirmation | `chat-confirmation` | Ask to approve or decline an agent's action.                     |
| Chat Input        | `chat-input`        | Chat message box: @agents, /skills, #files, integrations, model. |
| Chat Plan         | `chat-plan`         | Agent's proposed plan with per-step progress.                    |
| Chat Sources      | `chat-sources`      | Inline numbered citations and the source list of a reply.        |
| Model Selector    | `model-selector`    | Searchable model picker with logos and speed, quality, cost.     |
| Plan Outline      | `plan-outline`      | Saved plan as a read-only outline of nested tasks.               |
| Prompt List       | `prompt-list`       | Starter prompts at the start of a chat.                          |
| Questionnaire     | `questionnaire`     | Ask one question at a time with choices, typed answers, skips.   |
| Reasoning Effort  | `reasoning-effort`  | Pill slider for how hard a model thinks.                         |
| Tool Activity     | `tool-activity`     | Live timeline of the tools an agent called.                      |
| Typed Text        | `typed-text`        | Short text that types itself in when an agent changes it.        |
| Web Source        | `web-source`        | A web page as a chip: favicon and title, linking to the page.    |

### Agent patterns

| Component        | Slug               | Use when                                                   |
| ---------------- | ------------------ | ---------------------------------------------------------- |
| Canvas           | `canvas`           | Resizable side panel next to chat showing results in tabs. |
| Mention List     | `mention-list`     | `@` and `/` suggestion panel driven by a message box.      |
| Message          | `message`          | One chat message: avatar, bubbles, name line, status line. |
| Message Actions  | `message-actions`  | Copy, rate, regenerate, and version steps under a message. |
| Message Response | `message-response` | Render an assistant's Markdown reply safely.               |
| Message Scroller | `message-scroller` | Chat history column that follows new replies.              |
| Review Card      | `review-card`      | Ask someone to review a draft or change before it runs.    |
