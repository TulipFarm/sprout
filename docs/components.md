# Component reference

Short notes on each component. The docs site has live examples.

Accordion (`@tulipfarm/sprout/accordion`) stacks sections that open in
place, one at a time or several with `multiple`, uncontrolled or controlled,
with disabled items. `AccordionTrigger` comes in `default` (underlines on hover)
and `quiet` (for a title with a summary line) variants.

Alert (`@tulipfarm/sprout/alert`) shows inline messages in `default` and
`destructive` variants. `AlertTitle`, `AlertDescription`, a leading icon, and a
corner `AlertAction` compose freely. It announces with `role="alert"` by
default; pass `role="status"` or `role="note"` for quieter messages.

Aspect Ratio (`@tulipfarm/sprout/aspect-ratio`) keeps images, video, and
placeholders at a fixed `ratio` (width divided by height, such as `16 / 9`) as
their width changes. It is a relative `div` that takes all `div` props.

Avatar (`@tulipfarm/sprout/avatar`) provides image avatars with initials
fallbacks, four sizes, badges, overlapping groups, seeded agent artwork, and
gradient entity avatars for people and workspaces in circle or square shapes.

Badge (`@tulipfarm/sprout/badge`) labels status, counts, and metadata in nine
tones (`default`, `success`, `warning`, `info`, `secondary`, `destructive`,
`outline`, `ghost`, `link`) and two sizes (`default`, wrapping `chip`). Its Base
UI `render` prop turns it into a link or button; `badgeVariants()` returns its
classes for custom elements.

Brand Icon (`@tulipfarm/sprout/brand-icon`) draws logos for 33 connected apps
and models (`brandNames` maps each to its display name). `BrandIcon` sizes are
bare `inline`, `glyph`, and `fill` glyphs or framed `sm`, `md`, `lg`, and `xl`
tiles. `BrandTile` frames any icon and renders as a button or popover trigger in
a touch-sized `action` size. `BrandStack` overlaps tiles as one labelled image
with a name tooltip on hover. Near-black logos follow the text color in dark
mode.

Button (`@tulipfarm/sprout/button`) provides seven variants (`default`,
`outline`, `secondary`, `ghost`, `destructive`, `link`, `scope`), text and icon
sizes, and pattern sizes for common rows, cards, calendars, trees, and floating
launchers. It renders real links with `nativeButton={false}`, styles disabled,
busy, invalid, pressed, and expanded states, and works as the `render` target of
Base UI triggers. `buttonVariants()` applies the same classes to other elements.
Pass `state` (`ready`, `busy`, or `blocked`) for actions that can be busy or
blocked. Busy shows an optional `pendingLabel` with a spinner; blocked stays
focusable and shows a reason with an optional `jump`, `link`, or `action` fix.
`ActionGroup` shares one state across a row of actions, `jumpTo` scrolls to and
focuses an element, and `useActionControl` applies the same rules to any button.

Card (`@tulipfarm/sprout/card`) groups related content in a bordered panel with
`default` and `sm` sizes and `default` and `raised` surfaces. `CardHeader` lays
out `CardTitle`, `CardDescription`, and a corner `CardAction`; `CardContent` and
a tinted `CardFooter` complete it. Every part takes Base UI's `render` prop.

Item (`@tulipfarm/sprout/item`) is a compact row with `default`, `outline`,
`muted`, `card`, and `interactive` variants and `default`, `sm`, and `xs` sizes.
`ItemMedia` (`default`, `icon`, `image`), `ItemContent`, `ItemTitle`,
`ItemDescription`, `ItemActions`, `ItemHeader`, and `ItemFooter` compose it;
`ItemOverlayButton` makes an interactive row clickable, and `ItemGroup` and
`ItemSeparator` stack rows as a list.

Dialog (`@tulipfarm/sprout/dialog`) wraps the Base UI modal dialog. Its
`DialogContent` comes in four sizes: `default`, `form`, `split`, and
`fullscreen`. It is placed `center` or `top` (`--sprout-dialog-top`), and its
corner close button can be hidden. `DialogHeader`, `DialogBody`, and
`DialogFooter` accept `render`, so a body or footer can be a form. Focus is
trapped, Escape closes the dialog, and `finalFocus` returns focus where the
next task starts.

Alert Dialog (`@tulipfarm/sprout/alert-dialog`) wraps the Base UI alert
dialog for confirmations that must be answered. `AlertDialogContent` comes in
`default` and `sm` sizes; `AlertDialogHeader` and `AlertDialogMedia` add an
icon beside or above the title, and `AlertDialogFooter` holds an outline
`AlertDialogCancel` that closes and an `AlertDialogAction` button that stays
open until the caller closes it, so pending and error states fit inside.

Direction (`@tulipfarm/sprout/direction`) re-exports the Base UI
`DirectionProvider` and `useDirection`. Set `direction="rtl"` (default
`ltr`) and a matching `dir` on a wrapping element, so keyboard navigation and
CSS both follow right-to-left text.

Scroll Area (`@tulipfarm/sprout/scroll-area`) wraps content in a Base UI
scroll region with thin theme-aware scrollbars. `size` is `auto`, `sm`, or
`md`; `orientation` draws `vertical`, `horizontal`, or `both` bars; and
`variant="table"` adds a bordered, height-capped, labeled region for wide
data grids.

Selection Slot (`@tulipfarm/sprout/selection-slot`) swaps a toolbar for a
selection toolbar in the same grid cell when `active` is true, so the row keeps
its height. The hidden tools stay mounted but inert; focus moves into the
selection when it came from the tools and returns when the selection closes.
The slot is a `sprout-selection` size container for folding actions into a
menu.

Separator (`@tulipfarm/sprout/separator`) draws a `horizontal` or `vertical`
line with Base UI `role="separator"`. `tone="input"` matches control borders in
button groups. With children it centers short text such as "or" on a line.
`variant="fade"` fades the line toward a centered label, and
`variant="marker"` or `"marker-border"` renders a quiet timeline note with
`SeparatorIcon` and `SeparatorContent`. `SidebarSeparator` insets a line
between sidebar groups.

Settings List (`@tulipfarm/sprout/settings-list`) groups settings under a
title. `SettingsGroup` takes `title`, an optional `titleId` that names the
section, and an `h2`–`h4` `heading`. `SettingsRow` takes a `label`, an optional
`description`, `htmlFor` for a real label, and children for the value or
control. Rows stack in narrow groups and put the control on the right from
36rem of group width.

Sheet (`@tulipfarm/sprout/sheet`) is a modal panel that slides in from the
`top`, `right`, `bottom`, or `left` edge. Side sheets come in `default`
(24rem), `lg` (32rem), and `xl` (42rem) widths, and `full` covers the
viewport. `SheetTitle` has `default` and `lg` sizes. `SheetContent` can hide
its close button and `keepMounted` to keep drafts while closed.
`SheetHeader`, `SheetBody`, and `SheetFooter` accept `render`. On touch
screens a sheet swipes closed toward its `side`. Mouse and pen drags move it
only from the handle or empty panel space, so text selection in forms still
works. `showSwipeHandle` adds a grab bar.

Page Content (`@tulipfarm/sprout/page-content`) is the padded column that
holds a page's header and sections: 16px padding on small screens, 24px by 20px
from 640px, and 16px between direct children. It does not scroll; put it in
your own scroll region. `--sprout-page-content-inline` lets children bleed to
the page edge.

Page Header (`@tulipfarm/sprout/page-header`) renders a page's `h1` title,
description, and actions, with an optional `back` link (label hidden below
640px) or `parent` breadcrumb. `titleId`, `titleRef`, and `focusable` support
focus management. Inside `PageChromeContext` it moves the title and actions into
the app header bar; `PageActions` places page actions there without a header.
An optional `documentTitle` formatter updates the browser tab title.

Pagination (`@tulipfarm/sprout/pagination`) composes previous, next, numbered
page links, and a skipped-pages ellipsis. Page links are ghost Sprout buttons,
outlined with `aria-current="page"` when `isActive`; they take any button
`size`, `disabled`, and a Base UI `render` for router links. Previous and next
labels are customizable with `text` and hidden below 640px.

Progress (`@tulipfarm/sprout/progress`) is a 4px bar for a `value` from `min`
to `max` (0–100 by default), or `null` while the amount is unknown, when it
slides. `ProgressLabel` and `ProgressValue` children share a row above the
track; a bare bar is named with `aria-label`, and `getAriaValueText` can read
sizes instead of a percent. The width eases in 180ms and reduced motion stops
the slide.

Sidebar provides grouped navigation, nested links, independent disclosure
actions, active states, icon collapse with tooltips, a mobile drawer, and
keyboard controls. Workspace and account content, routing, fetching, and
preference storage remain application-owned. The local showcase covers ready,
loading, empty, error/retry, and long-label states.

Slider (`@tulipfarm/sprout/slider`) picks one number or a range on a 0–100
track by default. A number `value` or `defaultValue` gets one thumb, an array
gets one thumb per entry. It supports controlled and uncontrolled values,
`disabled`, and `horizontal` or `vertical` orientation; the root `aria-label`
names each thumb.

Spinner (`@tulipfarm/sprout/spinner`) is a 12, 16 (default), or 20px loader
that takes the current text color. It is a `status` named “Loading” by
default; pass `aria-label` to name it or `aria-hidden="true"` when visible text
beside it already explains the wait. It stops spinning for reduced motion.

State Panel (`@tulipfarm/sprout/state-panel`) explains `empty`, `loading`,
`success`, `unavailable`, and `error` states with a title, description, heading
level (`h1`–`h4`), optional icon, and action children. Empty panels can show a
decorative `sample` preview in a container-responsive split card. Errors
require a recovery child and are announced as alerts.

Table (`@tulipfarm/sprout/table`) builds native tables in a `plain` or `grid`
variant. Grid tables scroll inside a named region with a pinned header,
dividers, a `selection` column, and `stickyEnd` actions. `TableSortHead` adds
sort buttons with `aria-sort`; rows can be `interactive` or selected, and the
table can carry a caption and a totals footer.

Tabs (`@tulipfarm/sprout/tabs`) switch between related panels in `default`,
`line`, and `steps` list variants, horizontally or vertically. They support
controlled and uncontrolled values, disabled tabs, `keepMounted` panels, and
icon or step markers inside triggers; `tabsListVariants()` returns list classes.

Toggle Group (`@tulipfarm/sprout/toggle-group`) is a row or column of toggle
buttons that share one value array, single or `multiple`. It has `default` and
`outline` variants, `sm`, `default`, and `lg` sizes, a `spacing` gap where `0`
joins items into one segmented control, and group or item `disabled` states.

Tooltip (`@tulipfarm/sprout/tooltip`) names icon buttons, column hints, brand
tiles, and collapsed sidebar items. `TooltipTrigger` takes any control through
`render`, including select, popover, and menu triggers; `TooltipContent` brings
its own portal and arrow and defaults to the top side with a 4px offset.

Hover Card (`@tulipfarm/sprout/hover-card`) previews a link to a person or
page. `HoverCardTrigger` renders a link, or your own through `render`;
`HoverCardContent` is a 16rem card with its own portal that defaults to the
bottom side and opens on hover or keyboard focus.

Input (`@tulipfarm/sprout/input`) is a single-line text field on Base UI
`Input`. It has `default` (32px) and `lg` (44px) `scale`s, takes every native
input prop and `type` (text, email, password, number, date, time,
datetime-local, url, file), and shows placeholder, focus, read-only, disabled,
and `aria-invalid` states. Inside a Base UI `Field.Root` it picks up its label,
description, invalid, and disabled state. `SidebarInput` is the sidebar search
field.

Navigation Menu (`@tulipfarm/sprout/navigation-menu`) is a row of site links
where triggers open panels of more links in one shared, resizing popup. Mix
`NavigationMenuTrigger` + `NavigationMenuContent` items with plain
`NavigationMenuLink` items; `active` marks the current page, `align` places the
panel, and `navigationMenuTriggerStyle()` makes any link match the triggers.

Gradient Banner (`@tulipfarm/sprout/gradient-banner`) is decorative gradient
art in six variants (`aurora`, `citrus`, `lagoon`, `iris`, `cobalt`, `mint`)
and four sizes (`sm`, `md`, `lg`, `xl`), with optional film-grain `texture`.
Children sit centered on top. `GradientBannerPanel` is a `light` or `dark`
surface that keeps text readable, `GradientBannerBadge` a pill that follows the
panel tone, and `GradientBannerProgress` a clamped 0–100 `progressbar`.

Glass Banner (`@tulipfarm/sprout/glass-banner`) is a frosted blue showcase with
a `title`, optional `caption`, and `GlassChip` children that take text and an
optional `icon`. Chips can be dragged with a pointer and spring back; on wide
banners up to three float over the bubble art, otherwise they wrap in rows.
Reduced motion stops the float and snaps chips home.
