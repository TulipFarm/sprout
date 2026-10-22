# Sprout component usage

One minimal example per component. Import path is `@tulipfarm/sprout/<slug>`.
Icons come from `reicon-react/icons/<Name>`.

## Actions

### Button

```tsx
import { Button } from "@tulipfarm/sprout/button";

<Button onClick={save}>Save</Button>
<Button variant="outline" size="sm">
  <PlusIcon data-icon="inline-start" />
  Add item
</Button>
<Button variant="ghost" size="icon-sm" aria-label="Delete file">
  <TrashIcon />
</Button>
<Button nativeButton={false} render={<a href="/docs" />}>Docs</Button>
<Button state={saving ? { kind: "busy" } : { kind: "ready" }} pendingLabel="Saving…">
  Save
</Button>
```

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`,
`scope`. `buttonVariants()` returns the classes for other elements.

### Button Group

```tsx
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@tulipfarm/sprout/button-group';

<ButtonGroup aria-label="Pages">
  <Button variant="outline" disabled={page === 1}>
    Previous
  </Button>
  <ButtonGroupSeparator />
  <Button variant="outline">Next</Button>
</ButtonGroup>;
```

### Toggle

```tsx
import { Toggle } from '@tulipfarm/sprout/toggle';

<Toggle variant="outline" size="sm" pressed={starred} onPressedChange={setStarred}>
  <Star data-icon="inline-start" />
  Starred
</Toggle>;
```

### Toggle Group

```tsx
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';

<ToggleGroup
  aria-label="Time range"
  variant="outline"
  spacing={0}
  value={[range]}
  onValueChange={value => value[0] && setRange(value[0])}
>
  <ToggleGroupItem value="7">7d</ToggleGroupItem>
  <ToggleGroupItem value="30">30d</ToggleGroupItem>
</ToggleGroup>;
```

Value is always an array. Add `multiple` for several on at once.

### Toolbar Status

```tsx
import { ToolbarStatus } from '@tulipfarm/sprout/toolbar-status';

<ToolbarStatus label={failed ? 'Export failed' : 'Export result'} message={note} error={failed}>
  <Button variant="outline" size="sm" onClick={run}>
    Export again
  </Button>
</ToolbarStatus>;
```

### Kbd

```tsx
import { Kbd, KbdGroup } from '@tulipfarm/sprout/kbd';

<KbdGroup>
  <Kbd>⌘</Kbd>
  <Kbd>K</Kbd>
</KbdGroup>;
```

## Forms

### Calendar

```tsx
import { Calendar } from '@tulipfarm/sprout/calendar';

<Calendar mode="single" selected={date} onSelect={setDate} />;
```

`mode` is `single`, `multiple`, or `range` (react-day-picker).

### Checkbox

```tsx
import { Checkbox } from "@tulipfarm/sprout/checkbox";

<Label>
  <Checkbox checked={ok} onCheckedChange={setOk} />
  I authorize this change
</Label>
<Checkbox aria-label="Select all rows" checked={all} indeterminate={some} onCheckedChange={selectAll} />
```

### Choice List

```tsx
import { ChoiceList, ChoiceSummary } from "@tulipfarm/sprout/choice-list";

<ChoiceList
  legend="Reply style"
  options={[{ id: "short", label: "Short answers" }, { id: "detailed", label: "Detailed answers" }]}
  value={style}
  onChange={setStyle}
/>
<ChoiceSummary prompt="Reply style" answer="Short answers" />
```

Add `multiple`, `layout="compact"`, `error`, and `textOption` for a typed answer.

### Combobox

```tsx
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@tulipfarm/sprout/combobox';

<Combobox items={fruits}>
  <ComboboxInput aria-label="Choose a fruit" placeholder="Choose a fruit" showClear />
  <ComboboxContent>
    <ComboboxEmpty>No fruit found.</ComboboxEmpty>
    <ComboboxList>
      {item => (
        <ComboboxItem key={item} value={item}>
          {item}
        </ComboboxItem>
      )}
    </ComboboxList>
  </ComboboxContent>
</Combobox>;
```

### Field

```tsx
import { CheckboxField, ChoiceGroup, Field, FieldsDisabled } from '@tulipfarm/sprout/field';

<FieldsDisabled value={saving}>
  <Field label="Name" required error={errors.name}>
    <Input value={name} onChange={e => setName(e.target.value)} />
  </Field>
  <ChoiceGroup
    type="radio"
    legend="Repeat"
    options={[
      { value: 'daily', label: 'Every day' },
      { value: 'weekly', label: 'Every week' },
    ]}
    value={repeat}
    onValueChange={setRepeat}
  />
  <CheckboxField label="Notify me" checked={notify} onCheckedChange={setNotify} />
</FieldsDisabled>;
```

`Field` also takes `helper` and `counter`.

### Form

```tsx
import { Form, FormFooter, FormSection } from "@tulipfarm/sprout/form";

<Form label="Change interval" disabled={saving} onSubmit={() => (error ? "invalid" : save())}>
  <FormSection title="Scheduled trigger" description="Start this agent on an interval.">
    <Field label="Run every" required error={error}>
      <Input type="number" value={minutes} onChange={…} />
    </Field>
  </FormSection>
  <FormFooter
    dirty={minutes !== saved}
    submit={{ label: "Save", pendingLabel: "Saving…", state: saving ? { kind: "busy" } : { kind: "ready" } }}
    cancel={{ kind: "reset", label: "Discard changes", onReset: reset }}
  />
</Form>
```

Return `"invalid"` from `onSubmit` to move focus to the first error.

### Input

```tsx
import { Input } from "@tulipfarm/sprout/input";

<Field label="Agent name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
<Input scale="lg" type="email" autoComplete="email" />
```

### Input Group

```tsx
import {
  InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText,
} from "@tulipfarm/sprout/input-group";

<InputGroup>
  <InputGroupAddon><Search3 size={14} aria-hidden="true" /></InputGroupAddon>
  <InputGroupInput aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
  <InputGroupAddon align="inline-end">
    <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => setQ("")}>
      <X aria-hidden="true" />
    </InputGroupButton>
  </InputGroupAddon>
</InputGroup>

<InputGroup size="lg">
  <InputGroupAddon><InputGroupText>app.example.com/</InputGroupText></InputGroupAddon>
  <InputGroupInput id="slug" />
</InputGroup>
```

Chat composer: `variant="composer"` with `InputGroupTextarea` or
`RichTextEditor`, and addons at `align="block-start"` / `"block-end"`.

### Input OTP

```tsx
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@tulipfarm/sprout/input-otp';

<InputOTP maxLength={6} value={code} onChange={setCode} aria-label="Verification code">
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>;
```

### Label

```tsx
import { Label } from "@tulipfarm/sprout/label";

<Label htmlFor="workspace-name">Workspace name</Label>
<Input id="workspace-name" />
```

### Radio Group

```tsx
import { RadioGroup, RadioGroupItem } from '@tulipfarm/sprout/radio-group';

<RadioGroup value={freq} onValueChange={setFreq} aria-label="Digest frequency">
  <Label>
    <RadioGroupItem value="daily" />
    Daily
  </Label>
  <Label>
    <RadioGroupItem value="weekly" />
    Weekly
  </Label>
</RadioGroup>;
```

### Rich Text Editor

```tsx
import { RichTextEditor, type RichTextValue } from '@tulipfarm/sprout/rich-text-editor';

const [value, setValue] = useState<RichTextValue>({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

<InputGroup variant="composer">
  <RichTextEditor
    value={value}
    onChange={setValue}
    onSend={send}
    placeholder="Ask anything…"
    toolbarAddon={
      <InputGroupButton type="submit" size="icon-sm" aria-label="Send message">
        <ArrowUp aria-hidden="true" />
      </InputGroupButton>
    }
  />
</InputGroup>;
```

### Search Field

```tsx
import { SearchField } from '@tulipfarm/sprout/search-field';

<SearchField label="Find agents" value={search} onChange={setSearch} />;
```

### Select

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tulipfarm/sprout/select';

<Select items={durations} value={duration} onValueChange={setDuration}>
  <SelectTrigger id="duration" width="full">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {durations.map(d => (
      <SelectItem key={d.value} value={d.value}>
        {d.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>;
```

### Slider

```tsx
import { Slider } from "@tulipfarm/sprout/slider";

<Slider aria-label="Volume" value={volume} onValueChange={(v) => setVolume(typeof v === "number" ? v : v[0])} />
<Slider aria-label="Range" defaultValue={[20, 75]} />
```

### Switch

```tsx
import { Switch } from '@tulipfarm/sprout/switch';

<SettingsRow label="Email summaries" htmlFor="summary">
  <Switch id="summary" checked={on} onCheckedChange={setOn} />
</SettingsRow>;
```

### Textarea

```tsx
import { Textarea } from '@tulipfarm/sprout/textarea';

<Field label="Task prompt" counter={`${prompt.length} / 8,000`}>
  <Textarea maxLength={8000} value={prompt} onChange={e => setPrompt(e.target.value)} />
</Field>;
```

## Overlays

### Alert Dialog

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@tulipfarm/sprout/alert-dialog';

<AlertDialog open={open} onOpenChange={v => !busy && setOpen(v)}>
  <AlertDialogContent>
    <AlertDialogTitle>Stop this plan?</AlertDialogTitle>
    <AlertDialogDescription>Unfinished tasks are cancelled.</AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={busy}>Keep running</AlertDialogCancel>
      <AlertDialogAction variant="destructive" disabled={busy} onClick={stop}>
        Stop plan
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>;
```

`AlertDialogAction` does not close by itself. Close it when the work succeeds.

### Command

```tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@tulipfarm/sprout/command';

<Command>
  <CommandInput aria-label="Search commands" placeholder="Search commands…" />
  <CommandList>
    <CommandEmpty>No matching commands.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem onSelect={newDraft}>
        New draft<CommandShortcut>⌘ N</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  </CommandList>
</Command>;
```

### Context Menu

```tsx
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@tulipfarm/sprout/context-menu';

<ContextMenu>
  <ContextMenuTrigger tabIndex={0} role="group" aria-label="Card actions">
    …
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onClick={open}>Open</ContextMenuItem>
    <ContextMenuItem variant="destructive" onClick={remove}>
      Delete
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>;
```

### Dialog

```tsx
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tulipfarm/sprout/dialog';

<Dialog open={open} onOpenChange={v => !pending && setOpen(v)}>
  <DialogTrigger render={<Button variant="outline" />}>Rename</DialogTrigger>
  <DialogContent size="form">
    <DialogHeader>
      <DialogTitle>Rename project</DialogTitle>
      <DialogDescription>Everyone in the workspace sees the new name.</DialogDescription>
    </DialogHeader>
    <DialogBody>…</DialogBody>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={save}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

`DialogBody` / `DialogFooter` take `render={<form />}`. Use `finalFocus` to
send focus where the next task starts.

### Dropdown Menu

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tulipfarm/sprout/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Row actions" />}>
    <MoreH size={16} aria-hidden="true" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={edit}>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onClick={remove}>
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

### Hover Card

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@tulipfarm/sprout/hover-card';

<HoverCard>
  <HoverCardTrigger render={<a href="/people/alex" />}>Alex Meadow</HoverCardTrigger>
  <HoverCardContent>Project coordinator.</HoverCardContent>
</HoverCard>;
```

### Menubar

```tsx
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@tulipfarm/sprout/menubar';

<Menubar aria-label="Application menu">
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem onClick={newDraft}>New draft</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>;
```

Also: `MenubarCheckboxItem`, `MenubarRadioGroup`/`MenubarRadioItem`,
`MenubarSub`/`MenubarSubTrigger`/`MenubarSubContent`, `MenubarShortcut`.

### Popover

```tsx
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@tulipfarm/sprout/popover';

<Popover>
  <PopoverTrigger render={<Button variant="outline" size="sm" />}>Sync status</PopoverTrigger>
  <PopoverContent align="end">
    <PopoverHeader>
      <PopoverTitle>Synced 2 minutes ago</PopoverTitle>
      <PopoverDescription>All sources are up to date.</PopoverDescription>
    </PopoverHeader>
  </PopoverContent>
</Popover>;
```

### Search Dialog

```tsx
import {
  SearchDialog,
  SearchEmpty,
  SearchGroup,
  SearchInput,
  SearchItem,
  SearchList,
} from '@tulipfarm/sprout/search-dialog';

<SearchDialog open={open} onOpenChange={setOpen} title="Jump to…" description="Find pages.">
  <SearchInput value={q} onValueChange={setQ} label="Find a page" />
  <SearchList label="Pages">
    {pages.length ? (
      <SearchGroup heading="Pages" count={pages.length}>
        {pages.map(p => (
          <SearchItem key={p.id} value={p.id} title={p.title} onSelect={() => go(p)} />
        ))}
      </SearchGroup>
    ) : (
      <SearchEmpty title="No pages found" />
    )}
  </SearchList>
</SearchDialog>;
```

### Sheet

```tsx
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@tulipfarm/sprout/sheet';

<Sheet open={open} onOpenChange={setOpen}>
  <SheetTrigger render={<Button variant="outline" size="sm" />}>Filters</SheetTrigger>
  <SheetContent side="right" size="lg">
    <SheetHeader>
      <SheetTitle>Filter and sort</SheetTitle>
      <SheetDescription>Results update as you choose.</SheetDescription>
    </SheetHeader>
    <SheetBody>…</SheetBody>
    <SheetFooter>
      <Button onClick={() => setOpen(false)}>Show results</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>;
```

`side`: `top`, `right`, `bottom`, `left`. `keepMounted` keeps drafts while closed.

### Tooltip

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@tulipfarm/sprout/tooltip';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Attach files" />}>
      <Paperclip size={16} aria-hidden="true" />
    </TooltipTrigger>
    <TooltipContent>Attach files</TooltipContent>
  </Tooltip>
</TooltipProvider>;
```

## Navigation

### Breadcrumb

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@tulipfarm/sprout/breadcrumb';

<Breadcrumb aria-label="Folder path">
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink render={<Link to="/files" />}>All files</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage truncate>{folder.name}</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>;
```

### Navigation Menu

```tsx
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@tulipfarm/sprout/navigation-menu';

<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Projects</NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink href="/projects/meadow">Meadow</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
    <NavigationMenuItem>
      <NavigationMenuLink href="/help">Help</NavigationMenuLink>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>;
```

### Pagination

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@tulipfarm/sprout/pagination';

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="?page=1" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="?page=2" isActive>
        2
      </PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationEllipsis />
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="?page=3" />
    </PaginationItem>
  </PaginationContent>
</Pagination>;
```

### Sidebar

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@tulipfarm/sprout/sidebar';

<SidebarProvider className="min-h-dvh">
  <Sidebar label="Main navigation">
    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton icon={<HomeIcon />} nativeButton={false} render={<a href="/" />} isActive>
              Overview
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  <main className="min-w-0 flex-1">
    <SidebarTrigger />
    {children}
  </main>
</SidebarProvider>;
```

### Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tulipfarm/sprout/tabs';

<Tabs defaultValue="members">
  <TabsList aria-label="Members settings" variant="line">
    <TabsTrigger value="members">Members</TabsTrigger>
    <TabsTrigger value="invitations">Invitations</TabsTrigger>
  </TabsList>
  <TabsContent value="members">…</TabsContent>
  <TabsContent value="invitations">…</TabsContent>
</Tabs>;
```

List variants: `default`, `line`, `steps`.

### View Switcher

```tsx
import { ViewSwitcher, viewSwitcherTabId } from '@tulipfarm/sprout/view-switcher';

<ViewSwitcher
  views={[
    { id: 'table', label: 'Table', icon: Grid },
    { id: 'board', label: 'Board', icon: Kanban, closable: true },
  ]}
  value={layout}
  onValueChange={setLayout}
  options={[
    { id: 'list', label: 'List', icon: List, description: 'One item per row for quick reading.' },
    {
      id: 'board',
      label: 'Board',
      icon: Kanban,
      description: 'Cards in lanes.',
      unavailable: 'Needs a single-select field.',
    },
  ]}
  onAdd={id => openView(id)}
  onClose={id => closeView(id)}
  panelId="records"
  actions={
    <Button variant="ghost" size="icon-sm" aria-label="View settings">
      …
    </Button>
  }
/>;
<div role="tabpanel" id="records" aria-labelledby={viewSwitcherTabId('records', layout)} tabIndex={0}>
  …
</div>;
```

Fully controlled: it shows exactly `views` (the bar) and `options` (the "Add view" menu) and decides nothing. Options already in `views` show a check; choosing one still calls `onAdd`, so switch to it there. `unavailable` disables an option and shows the reason. Close shows only for `closable` views when `onClose` is passed; Delete on a focused tab closes it.

## Layout

### Accordion

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@tulipfarm/sprout/accordion';

<Accordion multiple defaultValue={['one']}>
  <AccordionItem value="one">
    <AccordionTrigger>What is this?</AccordionTrigger>
    <AccordionContent>Details.</AccordionContent>
  </AccordionItem>
</Accordion>;
```

### Aspect Ratio

```tsx
import { AspectRatio } from '@tulipfarm/sprout/aspect-ratio';

<AspectRatio ratio={16 / 9}>
  <img src={src} alt="" className="size-full object-cover" />
</AspectRatio>;
```

### Card

```tsx
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@tulipfarm/sprout/card';

<Card>
  <CardHeader>
    <CardTitle render={<h3 />}>Meadow project</CardTitle>
    <CardDescription>12 beds</CardDescription>
    <CardAction>
      <Badge variant="success">Active</Badge>
    </CardAction>
  </CardHeader>
  <CardContent>Three tasks are ready.</CardContent>
  <CardFooter>
    <Button variant="outline">Review</Button>
  </CardFooter>
</Card>;
```

### Collapsible

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@tulipfarm/sprout/collapsible';

<Collapsible>
  <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>Details</CollapsibleTrigger>
  <CollapsibleContent>…</CollapsibleContent>
</Collapsible>;
```

### Direction

```tsx
import { DirectionProvider } from '@tulipfarm/sprout/direction';

<DirectionProvider direction="rtl">
  <div dir="rtl">{app}</div>
</DirectionProvider>;
```

### Page Content and Page Header

```tsx
import { PageContent } from '@tulipfarm/sprout/page-content';
import { PageHeader } from '@tulipfarm/sprout/page-header';

<div className="min-h-0 flex-1 overflow-auto">
  <PageContent>
    <PageHeader
      title="Files"
      description="Find and organize workspace files."
      actions={
        <Button>
          <Upload aria-hidden="true" />
          Upload
        </Button>
      }
    />
    {sections}
  </PageContent>
</div>;
```

`PageHeader` also takes `back` or `parent`.

### Resizable

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@tulipfarm/sprout/resizable';

<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel defaultSize="28%" minSize="220px">
    <FileTree />
  </ResizablePanel>
  <ResizableHandle aria-label="Resize file tree" />
  <ResizablePanel minSize="35%">
    <OpenFile />
  </ResizablePanel>
</ResizablePanelGroup>;
```

### Scroll Area

```tsx
import { ScrollArea } from '@tulipfarm/sprout/scroll-area';

<ScrollArea size="sm" viewportLabel="Recent activity">
  {items}
</ScrollArea>;
```

### Selection Slot

```tsx
import { SelectionSlot } from '@tulipfarm/sprout/selection-slot';

<SelectionSlot active={selected.length > 0} selection={<SelectionToolbar />}>
  <FilterBar />
</SelectionSlot>;
```

### Separator

```tsx
import { Separator } from "@tulipfarm/sprout/separator";

<Separator />
<Separator orientation="vertical" />
<Separator>or</Separator>
```

### Settings List

```tsx
import { SettingsGroup, SettingsRow } from '@tulipfarm/sprout/settings-list';

<SettingsGroup title="Profile">
  <SettingsRow label="Email" description="Used to sign in.">
    {user.email}
  </SettingsRow>
  <SettingsRow label="Name" htmlFor="name">
    <Input id="name" />
  </SettingsRow>
</SettingsGroup>;
```

## Feedback

### Alert

```tsx
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@tulipfarm/sprout/alert";

<Alert variant="destructive">
  <AlertTitle>This table is unavailable</AlertTitle>
  <AlertDescription>It was deleted, or your access changed.</AlertDescription>
</Alert>
<Alert role="status">
  <AlertTitle>Chat archived</AlertTitle>
  <AlertAction><Button variant="ghost" size="sm" onClick={undo}>Undo</Button></AlertAction>
</Alert>
```

Default `role="alert"`. Use `role="status"` or `"note"` for quiet messages.

### Notice Banner

```tsx
import { NoticeBanner } from '@tulipfarm/sprout/notice-banner';

<NoticeBanner aria-label="Integration authorization" actions={<Button variant="outline">Update permissions</Button>}>
  <p role="status">Google Calendar needs authorization.</p>
</NoticeBanner>;
```

### Result Notice

```tsx
import { ResultNotice } from '@tulipfarm/sprout/result-notice';

<ResultNotice
  shown={100}
  total="10000+"
  noun="groups"
  action={
    <Button size="sm" variant="ghost">
      Open in Table
    </Button>
  }
/>;
```

Says "Showing the first 100 of 10,000+ groups." with `role="status"`. Put it above a chart or inside a timeline whenever
the view cuts its result short. Renders nothing when `total` is an exact count not above `shown`. Not for page-top notices;
use Notice Banner.

### Progress

```tsx
import { Progress, ProgressLabel, ProgressValue } from '@tulipfarm/sprout/progress';

<Progress value={40}>
  <ProgressLabel>Uploading</ProgressLabel>
  <ProgressValue />
</Progress>;
```

### Skeleton

```tsx
import { Skeleton, SkeletonGroup } from '@tulipfarm/sprout/skeleton';

<SkeletonGroup label="Loading projects">
  <Skeleton shape="title" />
  <Skeleton />
  <Skeleton shape="panel" />
</SkeletonGroup>;
```

### Status

```tsx
import { Status } from '@tulipfarm/sprout/status';

<Status state="pending" />;
<Status state="running" />; // amount unknown: a line runs around the ring
<Status state="running" value={40} />; // amount known: 8 segments fill, the active one fades in and out; named "Running, 40%"
<Status state="success" size="lg" />;
```

`state` is `pending` (default), `running`, `paused`, `success`, `warning`, `error`, `stopped`, or `skipped`.
`size` is `sm` (12px), `md` (16px), or `lg` (20px). It is an `img` named after its state; pass `aria-hidden="true"`
when text beside it says the state. The mark animates in on mount and on every state change, and replays its glyph on
hover.

### Spinner

```tsx
import { Spinner } from '@tulipfarm/sprout/spinner';

<p role="status">
  <Spinner aria-hidden="true" /> Loading rows…
</p>;
```

### State Panel and State Sample

```tsx
import { StatePanel } from "@tulipfarm/sprout/state-panel";
import { SampleList, SampleWindow } from "@tulipfarm/sprout/state-sample";

<StatePanel kind="error" heading="h3" title="Could not open this file" description={error.message}>
  <Button variant="outline" onClick={retry}>Try again</Button>
</StatePanel>

<StatePanel kind="empty" title="No chats yet" sample={<SampleWindow trail={["Chats"]}><SampleList items={rows} /></SampleWindow>}>
  <Button>Start a chat</Button>
</StatePanel>
```

`kind`: `empty`, `loading`, `success`, `unavailable`, `error`. Errors need a
recovery child.

### Toast

```tsx
import { Toaster, toast } from '@tulipfarm/sprout/toast';

<Toaster>
  <App />
</Toaster>; // once, near the root
toast.add({
  title: 'Invite sent',
  description: 'Ana can now join.',
  type: 'success',
});
```

## Data display

### Attachment

```tsx
import { AttachmentGroup, FileAttachment } from '@tulipfarm/sprout/attachment';

<AttachmentGroup variant="carousel" aria-label="Attached files">
  {uploads.map(u => (
    <FileAttachment
      key={u.id}
      variant="chip"
      file={{
        id: u.id,
        name: u.file.name,
        mediaType: u.file.type,
        state: u.state,
        source: { kind: 'local', file: u.file },
      }}
      preview
      viewable
      onRemove={() => remove(u.id)}
    />
  ))}
</AttachmentGroup>;
```

### Avatar

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@tulipfarm/sprout/avatar';

<Avatar size="lg">
  <AvatarImage src={user.image} alt={user.name} />
  <AvatarFallback>AM</AvatarFallback>
</Avatar>;
```

### Agent Avatar

```tsx
import { AgentAvatar, agentAvatar } from '@tulipfarm/sprout/agent-avatar';

<AgentAvatar agentId={agent.id} name={agent.name} size="sm" />;
agentAvatar(agent.id); // { object, color, src }
```

- 100 objects in eight colors ship in the package as SVG `data:` URLs. No host, no network request.
- The same `agentId` always gets the same picture. `object` and `color` choose it yourself; `src` uses your own image with an initial fallback.
- Decorative (`alt=""`): keep the agent's name in nearby text.

### Badge

```tsx
import { Badge } from "@tulipfarm/sprout/badge";

<Badge variant="success"><Check aria-hidden="true" />Connected</Badge>
<Badge variant="outline" size="chip">maya@example.com</Badge>
```

Tones: `default`, `success`, `warning`, `info`, `secondary`, `destructive`,
`outline`, `ghost`, `link`.

### Board

```tsx
import { Board, type BoardColumn, type BoardItem } from '@tulipfarm/sprout/board';

<Board
  label="Product team"
  columns={[
    { id: 'todo', title: 'To do' },
    { id: 'doing', title: 'In progress', limit: 3, total: 42, tone: 'info' },
    { id: 'done', title: 'Done', status: 'error' },
  ]}
  lanes={[
    { id: 'ana', title: 'Ana' },
    { id: 'ben', title: 'Ben' },
  ]}
  items={items}
  onItemsChange={setItems}
  onColumnsChange={setColumns}
  onItemAdd={({ title, columnId, laneId }) => addCard(title, columnId, laneId)}
  onItemOpen={item => openSheet(item)}
  renderBody={item => <Badge variant="warning">{item.priority}</Badge>}
  itemActions={item => <DropdownMenuItem onClick={() => remove(item)}>Delete card</DropdownMenuItem>}
  onColumnRetry={column => reload(column.id)}
  onColumnShowAll={column => openTable(column.id)}
  searchable
/>;
```

A Kanban board. Columns go across, optional `lanes` (swimlanes) go down, and a card sits in the cell of its `columnId` and `laneId`. Card order in a cell is its order in `items`; every move, rename, or column delete comes back as a whole new list through `onItemsChange`. Columns reorder by a grip and rename from the title through `onColumnsChange`. `limit` marks a column "Over limit" in words. Leave out `onItemsChange` and `onColumnsChange` for a read-only board: cards and columns do not drag, rename, or select, and Enter still opens. Columns can load on their own: `total` is the server count (header, accessible name, "Over limit"); `status: 'loading'` shows skeleton cards with `aria-busy`, `'error'` an alert with "Try again" (`onColumnRetry(column)`), `'unavailable'` a message only, and `error` replaces the message; other columns are not affected. `onColumnShowAll(column)` adds "Show all N" at the column foot when `total` is more than the loaded cards. With lanes, the message and "Show all" show once, under the header and at the board foot. A ready column with no cards says "No cards". `columnText={{ empty, showAll: (total, column) => … }}` replaces those texts, such as "No rows" or "Show all 40 in table"; the Show all button's accessible name still ends with the column title. `tone` draws the column title as a Badge of that variant. `renderBody` adds content under the title, `renderTitle` replaces the title content, and `renderCard(item, { title, menu })` draws the whole card with no default frame (place `title` and `menu` yourself; drag, focus, keys and selection stay with the board). Lanes and the cards in each cell are virtualized, so boards with thousands of cards stay fast. Use Table for records in rows; use Board when the column is the status.

### Brand Icon

```tsx
import { BrandIcon, BrandStack, brandNames } from "@tulipfarm/sprout/brand-icon";

<BrandIcon brand="slack" size="sm" />
<BrandStack brands={[{ brand: "gmail", name: brandNames.gmail }]} />
```

### Carousel

```tsx
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@tulipfarm/sprout/carousel';

<Carousel aria-label="Steps">
  <CarouselContent>
    {steps.map(s => (
      <CarouselItem key={s}>{s}</CarouselItem>
    ))}
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
</Carousel>;
```

### Chart

```tsx
import { UsageChart, type UsageSeries } from '@tulipfarm/sprout/chart';

const series: UsageSeries[] = [{ key: 's0', label: 'Model A', color: 'var(--sprout-chart-1)' }];

<UsageChart days={[{ date: '2026-10-16', s0: 12.5 }]} series={series} />;
```

Ready charts, all from `@tulipfarm/sprout/chart`. Most take `rows`, a
`category` key, and `series` (`{ key, label, color }`); all take `title`,
`className`, and `valueFormatter`.

| Need                     | Chart                                             |
| ------------------------ | ------------------------------------------------- |
| Trend over time          | `TrendChart`, `AreaTrendChart` (`stack`)          |
| Compare categories       | `CategoryChart` (`horizontal`, `stack`, negative) |
| Two units at once        | `ComboChart` (series `kind`, `axis: "right"`)     |
| Share of a whole         | `DonutChart` (`variant="pie"`), `TreemapChart`    |
| Stat tile trend / goal   | `Sparkline`, `GaugeChart`                         |
| Conversion steps         | `StepFunnelChart`                                 |
| Bridge from start to end | `WaterfallChart` (`totals`)                       |
| Activity by day and hour | `HeatmapChart` (`x`, `y`, `value`)                |
| Project plan             | `TimelineChart` (`/timeline` entry, see Timeline) |
| Two numbers, or bubbles  | `ScatterPlotChart` (`size`)                       |
| Flows between stages     | `SankeyChart` (`nodes`, `links`)                  |
| Scores on many axes      | `RadarScoreChart`                                 |

```tsx
<DonutChart rows={traffic} category="source" value="visitors" totalLabel="Visitors" />
```

Part charts color the top five parts and fold the rest into one muted
"N more". Anything else: wrap Recharts in `ChartContainer` with `ChartTooltip`.

### Code Block

```tsx
import { CodeBlock } from '@tulipfarm/sprout/code-block';

<CodeBlock code={source} language="python" filename="score.py" />;
```

### File Explorer

```tsx
import { FileExplorer } from '@tulipfarm/sprout/file-explorer';

<div className="h-[36rem]">
  <FileExplorer
    label="Soul"
    files={[
      { path: 'SOUL.md', content: soulMd },
      { path: 'agents/scout/tools.ts', content: toolsTs },
      {
        path: 'assets/map.png',
        unavailable: 'Images cannot be displayed here.',
      },
    ]}
    defaultPath="SOUL.md"
  />
</div>;
```

Read only. Folders come from `/` in paths. Give the parent a height. Search covers names and text, up to 500 lines.

### File Viewer

```tsx
import { FileViewer } from '@tulipfarm/sprout/file-viewer';

<FileViewer
  file={{
    name: 'Policy.pdf',
    mediaType: 'application/pdf',
    source: { kind: 'local', file },
  }}
  open={open}
  onOpenChange={setOpen}
/>;
```

`FileAttachment viewable` opens it for you.

Add sharing, comments, or activity through slots:

```tsx
<FileViewer
  file={file}
  open={open}
  onOpenChange={setOpen}
  actions={<Button size="sm">Share</Button>}
  menu={<DropdownMenuItem>Copy link</DropdownMenuItem>}
  panel={<Tabs>…</Tabs>}
  panelLabel="Comments and activity"
/>
```

- `actions`: header controls before Download, such as an `AvatarGroup` of viewers and Share.
- `menu`: `DropdownMenuItem`s added to More actions after Reload.
- `panel`: a side panel with a header toggle. Control it with `panelOpen` and `onPanelOpenChange`, or set `defaultPanelOpen`.

### Glass Banner

```tsx
import { GlassBanner, GlassChip } from '@tulipfarm/sprout/glass-banner';

<GlassBanner title="Connect once." caption="Example activity">
  <GlassChip icon={<BrandIcon brand="gmail" size="glyph" />}>Drafted 3 follow-ups</GlassChip>
</GlassBanner>;
```

### Gradient Banner

```tsx
import { GradientBanner, GradientBannerBadge, GradientBannerPanel } from '@tulipfarm/sprout/gradient-banner';

<GradientBanner variant="iris" size="md">
  <GradientBannerPanel tone="dark">
    <GradientBannerBadge>Example</GradientBannerBadge>
    <span>How agents work</span>
  </GradientBannerPanel>
</GradientBanner>;
```

### Presence Cursor

```tsx
import { PresenceCursor } from '@tulipfarm/sprout/presence-cursor';

<div className="relative">
  <PresenceCursor name="rico@gmail.com" color="#c92a2a" x={120} y={80} />
  <PresenceCursor
    name="jenny@gmail.com"
    color="#b55309"
    x={40}
    y={200}
    avatar={
      <Avatar size="sm">
        <AvatarFallback>JE</AvatarFallback>
      </Avatar>
    }
  />
</div>;
```

`x`/`y` are px from the positioned parent. `color` needs 4.5:1 contrast with white.

### Record List

```tsx
import { RecordList, type RecordListHandle } from '@tulipfarm/sprout/record-list';

const list = useRef<RecordListHandle>(null);

<RecordList
  ref={list}
  label="Tickets"
  items={rows}
  status={loading ? 'loading' : failed ? 'error' : 'ready'}
  onRetry={retry}
  values={row => [{ label: 'Assignee', value: row.assignee }]}
  badges={row => <Badge variant="info">{row.status}</Badge>}
  renderActions={row => <RowActions row={row} />}
  onItemOpen={row => openSheet(row)}
  footer={<Pagination aria-label="Ticket pages">…</Pagination>}
/>;
```

The List view of a table: one row per record on the current page, in one bordered panel. Items are `{ id, title }` plus your fields; `title` is the plain-text name screen readers use. `values` returns `{ label, value, text? }[]` and only the first four show. `badges` holds choice Badges and `renderActions` is a free slot (Edit button plus a `DropdownMenu`). Click or Enter calls `onItemOpen`; clicks in actions do not. One tab stop: Up/Down/Home/End move between rows and Tab reaches the focused row's actions. `status="loading"` dims current rows with `aria-busy`, or shows five skeleton rows; `"error"` shows a StatePanel with Try again. `empty` replaces the default empty state, and `footer` holds Pagination. Call `list.current.focusFirst()` after a page change; while loading it waits for the new rows. Use Table for columns, editing, and bulk actions.

### Result Card

```tsx
import { ResultCard } from '@tulipfarm/sprout/result-card';

<ResultCard
  title="Investor pitch"
  kind="File"
  status="Saved in Google Slides"
  state="success"
  apps={[
    {
      brand: 'google-slides',
      name: 'Google Slides',
      actions: [{ label: 'Created the deck', state: 'completed' }],
    },
  ]}
  action={{ label: 'View slides', onClick: openInCanvas }}
/>;
```

### Schema Diagram

```tsx
import { SchemaDiagram, SchemaLegend } from "@tulipfarm/sprout/schema-diagram";

<SchemaDiagram tables={tables} links={links} label="Schema for Sales" />
<SchemaLegend />
```

Tables: `{ id, label, state: "new" | "changed", fields: [{ id, label, type, required, change? }] }`.
Links: `{ id, source, field, target, label }`.

### SQL Viewer

```tsx
import { SqlViewer } from '@tulipfarm/sprout/sql-viewer';

<SqlViewer tables={tableDocuments} groups={{ [salesTeamId]: 'Sales' }} label="Tables in Sales" />;
```

`tables` takes TulipFarm table definitions or table documents as they are: `{ id, label, owningTeamId?, fields, uniqueKeys? }`. Relationship fields become joins to the table whose `id` is `targetTableId`. Tables of a team named in `groups` sit in one tinted frame. Past `maxVisible` (default 4) tables collapse into a "+N tables" card. Hover or click a table or a foreign key to light its joins.

### Table

```tsx
import { Table, type TableColumn } from '@tulipfarm/sprout/table';

const columns: TableColumn<Order>[] = [
  { key: 'customer', header: 'Customer', sort: true, filter: 'text' },
  {
    key: 'crop',
    header: 'Crop',
    filter: 'select',
    group: true,
    options: crops,
  },
  {
    key: 'boxes',
    header: 'Boxes',
    align: 'right',
    sort: true,
    aggregate: 'sum',
    edit: 'number',
  },
];

<Table
  aria-label="Orders"
  data={orders}
  columns={columns}
  getRowId={row => row.id}
  searchable
  selectable
  onRowSave={(row, changes) => save(row.id, changes)}
/>;
```

`narrow="stack"` turns rows into cards on phones. Share view state by URL with
`state` / `onStateChange` and `@tulipfarm/sprout/table-nuqs`.

### Timeline

`TimelineChart` draws `start`–`end` bars per `category` row, colored by
`seriesKey`. Give it a `window` and it is the Timeline view of a table: rows in
one week, month, or quarter, with an HTML list of labels in start order.

```tsx
import {
  TimelineChart,
  TimelineWindowBar,
  timelineRange,
  timelineToday,
  type TimelineZoom,
} from '@tulipfarm/sprout/timeline';
```

```tsx
const window = timelineRange(view.zoom, view.from); // { start, end }, inclusive YYYY-MM-DD

<TimelineWindowBar {...view} today={timelineToday()} onChange={setView} />
<TimelineChart
  rows={rows} rowKey="id" category="title" start="start" end="due" title="Tasks"
  window={window} today={timelineToday()} status="ready" onRetry={refetch}
  undated={{ count: 3, field: 'Start date' }} notice={notice}
  onRowOpen={open} renderActions={row => <RowActions row={row} />}
/>;
```

No end, or an empty end: a diamond. End before start: a hollow diamond and an
"End before start" chip. Bars past the window are cut with a chevron. Dates are
`YYYY-MM-DD`; timestamps are epoch ms in the reader's zone or `timeZone`.
`shiftTimeline(zoom, from, step)` moves a window. Read only.

## AI and chat

### Agent Fanout

```tsx
import { AgentFanout } from '@tulipfarm/sprout/agent-fanout';

<AgentFanout
  title="Pricing launch"
  agent={{
    id: 'orchestrator',
    name: 'Orchestrator',
    model: 'Opus 5.5',
    brand: 'claude',
    tools: ['slack', 'notion', 'github'],
    task: 'Launch the new pricing page by Friday',
    status: 'running',
    elapsed: 14000,
    agents: [
      {
        id: 'researcher',
        name: 'Researcher',
        model: 'GPT-5.5',
        brand: 'openai',
        tools: ['notion'],
        task: 'Compare the pricing of five competitors',
        status: 'needs-you',
        reason: 'Which five competitors?',
        elapsed: 7000,
      },
    ],
  }}
  onRetry={retry}
  onDismiss={dismiss}
  onOpen={open}
/>;
```

- `agent` is the root; nest the agents it started in `agents`, as deep as they go. Each agent is a card with its model, tools, task, status, and run time.
- You own the run. Move `status` through `queued`, `running`, `needs-you`, `done`, `failed`, and `stopped`, and tick `elapsed` in ms.
- `brand` picks the model logo from Brand Icon (`claude`, `openai`, `deepseek`, `grok`, …) and `model` names it. Pass `icon` for agents that are not a known model. `tools` are Brand Icon names; past four, the rest show as a count.
- Agents that need you or failed get a header button listing each one's task and `reason`. `onOpen` adds Open to needs-you agents; `onRetry` and `onDismiss` add Retry and Dismiss to failed ones. The component never changes the run itself.
- `layout`: `auto` (default) puts the root's agents side by side and falls back to `list` when the row does not fit; `tree` always uses a row and scrolls; `list` always stacks under the parent.
- The footer count shows or hides an agent's subagents. `defaultCollapsed` takes agent ids to start hidden.
- Lines are neutral; lines leading to running agents turn blue. Needs-you and failed cards get a warning or danger border.
- New lines draw from the parent and cards fade in; hidden or removed cards fade out and their lines retract. Nothing animates on first mount. Reduced motion keeps only short fades.
- Tokens: `--sprout-agent-fanout-card` (17.25rem), `--sprout-agent-fanout-gap` (3rem), `--sprout-agent-fanout-indent` (2.5rem), `--sprout-agent-fanout-line`, `--sprout-agent-fanout-line-active`.

### Chat Confirmation

```tsx
import { ChatConfirmation, type ConfirmationState } from '@tulipfarm/sprout/chat-confirmation';

<ChatConfirmation
  title="Remove the Notes field"
  details={[{ label: 'Affected rows', value: '128' }]}
  state={state}
  onDecision={async decision => {
    setState({ kind: 'submitting', decision });
    setState(await save(decision));
  }}
/>;
```

### Chat Input

```tsx
import { ChatInput } from '@tulipfarm/sprout/chat-input';

<ChatInput
  value={value}
  onValueChange={setValue}
  onSend={send}
  onStop={stop}
  status={streaming ? 'streaming' : 'idle'}
  agents={query => searchAgents(query)}
  skills={query => searchSkills(query)}
  files={query => searchFiles(query)}
  modes={[{ id: 'plan', label: 'Plan', color: '#3b9ef5' }]}
  mode={mode}
  onModeChange={setMode}
  models={[{ id: 'opus', label: 'Claude Opus 5.5', brand: 'claude' }]}
  model={model}
  onModelChange={setModel}
/>;
```

- Leave `agents`, `skills`, or `files` unset to turn off `@`, `/`, or `#`.
- `attachments` show as `FileAttachment` chips in one row that scrolls sideways. `attachActions` fills the `+` menu.
- Give every mode a `color` (any CSS color). While the mode is on, the box border, the mode chip, and its menu icon use it. Use bright colors such as `#3b9ef5`, `#6366f1`, `#10b981`, `#f97316`.
- `description` on actions and modes shows as a second line in the menu.
- `prompts` show only while the message is empty.
- On touch screens, bar buttons grow to 44px tap targets. The send fill stays at 28px. Do not override these sizes.

### Chat Plan

```tsx
import { ChatPlan } from '@tulipfarm/sprout/chat-plan';

<ChatPlan
  title="Fill in missing suppliers"
  steps={[
    { id: 'find', title: 'Find deliveries', state: 'complete' },
    { id: 'match', title: 'Match suppliers', state: 'running' },
  ]}
/>;
```

### Chat Sources

```tsx
import { ChatSources, InlineCitation } from "@tulipfarm/sprout/chat-sources";

<p>Collect the tax form first. <InlineCitation source={sources[0]} number={1} /></p>
<ChatSources sources={sources} />
```

### Model Selector

Pass raw numbers for `speed`, `quality`, and `cost` (higher is faster, better, and pricier). Each one is rated 1–5 against the min and max of the list, so prices never show. A search field filters by name, description, or vendor. Hovering a column heading shows what it measures and what each bar count means. `ChatInput` uses this picker for `models`.

```tsx
import { ModelSelector } from '@tulipfarm/sprout/model-selector';

<ModelSelector
  models={[
    {
      id: 'opus',
      label: 'Claude Opus 5.5',
      brand: 'claude',
      description: 'Hardest problems',
      speed: 40,
      quality: 95,
      cost: 25,
    },
    {
      id: 'deepseek',
      label: 'DeepSeek V4',
      brand: 'deepseek',
      description: 'Cheap and capable',
      speed: 70,
      quality: 80,
      cost: 1,
    },
  ]}
  value={model}
  onValueChange={setModel}
/>;
```

Set `--sprout-model-selector-speed`, `-quality`, and `-cost` on `:root` to recolor the meters; the list renders in a portal.

### Plan Outline

```tsx
import { PlanOutline } from '@tulipfarm/sprout/plan-outline';

<PlanOutline title="Launch the catalog" status="Running" tone="active" progress="1 of 2 done" tasks={tasks} />;
```

Tasks: `{ id, title, mark, label, children?, criteria?, dependencies?, assignee? }`.

### Prompt List

```tsx
import { PromptList } from '@tulipfarm/sprout/prompt-list';

<PromptList
  title="Start with a task"
  items={[{ id: 'meetings', label: 'Prepare for tomorrow', icon: <CalendarSearch /> }]}
  onSelect={id => send(promptFor(id))}
/>;
```

### Questionnaire

```tsx
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from '@tulipfarm/sprout/questionnaire';

<Questionnaire
  items={[
    {
      name: 'style',
      required: true,
      choices: [{ value: 'short' }, { value: 'detailed' }],
    },
  ]}
  onSubmit={e => {
    e.preventDefault();
    save(new FormData(e.currentTarget));
  }}
>
  <QuestionnaireProgress />
  <QuestionnaireItem name="style" required>
    <QuestionnaireTitle>How should answers look?</QuestionnaireTitle>
    <QuestionnaireChoices>
      <QuestionnaireChoice value="short">Short</QuestionnaireChoice>
      <QuestionnaireChoice value="detailed">Detailed</QuestionnaireChoice>
    </QuestionnaireChoices>
  </QuestionnaireItem>
  <QuestionnaireActions>
    <QuestionnairePrevious />
    <QuestionnaireSkip />
    <QuestionnaireNext />
    <QuestionnaireSubmit />
  </QuestionnaireActions>
</Questionnaire>;
```

### Reasoning Effort

```tsx
import { ReasoningEffort } from '@tulipfarm/sprout/reasoning-effort';

<ReasoningEffort levels={['Low', 'Medium', 'High', 'Max']} value={value} onValueChange={setValue} />;
```

### Tool Activity

```tsx
import { ToolActivity } from '@tulipfarm/sprout/tool-activity';

<ToolActivity
  active={working}
  items={[
    {
      id: '1',
      label: 'Searched the inbox',
      status: 'completed',
      visual: <BrandIcon brand="gmail" size="inline" />,
    },
    {
      id: '2',
      label: 'Update the record',
      status: 'failed',
      detail: 'Retry, or check the connection.',
    },
  ]}
/>;
```

### Typed Text

```tsx
import { TypedText } from '@tulipfarm/sprout/typed-text';

<h1>
  <TypedText text={chat.title} animate={!chat.titleManual} />
</h1>;
```

## Agent patterns

### Canvas

```tsx
import { CanvasPanel, CanvasSection, CanvasToggle, ChatSplit } from "@tulipfarm/sprout/canvas";

<CanvasToggle open={open} count={items.length} onToggle={() => setOpen(!open)} />
<ChatSplit
  open={open}
  onOpenChange={setOpen}
  layoutId="chat"
  chat={<Conversation />}
  canvas={
    <CanvasPanel tabs={tabs} activeId={activeId} onSelect={setActiveId} onCloseTab={close} onClose={() => setOpen(false)}>
      <CanvasSection title={item.title} meta="3 rows">…</CanvasSection>
    </CanvasPanel>
  }
/>
```

### Mention List

```tsx
import { MentionGroup, MentionList, MentionOption, MentionStatus } from "@tulipfarm/sprout/mention-list";

{open && (
  <MentionList id={listId} label="Files you can add"
    status={loading ? <MentionStatus tone="loading">Searching…</MentionStatus> : undefined}>
    {options.map((o) => <MentionOption key={o.id} … />)}
  </MentionList>
)}
```

The text field keeps focus. Wire `aria-controls` and `aria-activedescendant`
on it and move the active option with arrow keys.

### Message

```tsx
import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from '@tulipfarm/sprout/message';

<MessageGroup>
  <Message align="start">
    <MessageAvatar>
      <Avatar>
        <AvatarFallback>AM</AvatarFallback>
      </Avatar>
    </MessageAvatar>
    <MessageContent>
      <MessageHeader>Alex · 10:30</MessageHeader>
      <MessageBubble variant="secondary">Can you help?</MessageBubble>
      <MessageFooter>Delivered</MessageFooter>
    </MessageContent>
  </Message>
  <Message align="end">
    <MessageContent>
      <MessageBubble>Yes.</MessageBubble>
    </MessageContent>
  </Message>
</MessageGroup>;
```

### Message Actions

```tsx
import { MessageActions } from '@tulipfarm/sprout/message-actions';

<MessageActions
  text={m.text}
  createdAt={m.createdAt}
  feedback={m.feedback}
  onFeedback={v => rate(m.id, v)}
  onRetry={() => regenerate(m.id)}
/>;
```

### Message Response

```tsx
import { MessageResponse } from '@tulipfarm/sprout/message-response';

<MessageResponse streaming={m.status === 'streaming'}>{m.text}</MessageResponse>;
```

### Message Scroller

```tsx
import {
  MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem,
  MessageScrollerProvider, MessageScrollerViewport,
} from "@tulipfarm/sprout/message-scroller";

<MessageScrollerProvider>
  <MessageScroller>
    <MessageScrollerViewport>
      <MessageScrollerContent>
        {messages.map((m, i) => (
          <MessageScrollerItem key={m.id} messageId={m.id} scrollAnchor={i === messages.length - 1}>
            <Message …/>
          </MessageScrollerItem>
        ))}
      </MessageScrollerContent>
    </MessageScrollerViewport>
    <MessageScrollerButton aria-label="Scroll to newest message" />
  </MessageScroller>
</MessageScrollerProvider>
```

### Review Card

```tsx
import { ReviewCard, ReviewRow, ReviewRows } from '@tulipfarm/sprout/review-card';

<ReviewCard
  label="Review row change"
  title="Update a row in Supplier deliveries"
  badge={{ label: 'Needs approval', variant: 'warning' }}
  settled={status !== 'pending'}
  actions={
    <>
      <Button onClick={approve}>Approve</Button>
      <Button variant="ghost" onClick={dismiss}>
        Dismiss
      </Button>
    </>
  }
>
  <ReviewRows>
    <ReviewRow label="Table">Supplier deliveries</ReviewRow>
  </ReviewRows>
</ReviewCard>;
```
