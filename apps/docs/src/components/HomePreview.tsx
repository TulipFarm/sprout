import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Bold } from 'reicon-react/icons/Bold';
import { Check } from 'reicon-react/icons/Check';
import { ChatRound } from 'reicon-react/icons/ChatRound';
import { Database } from 'reicon-react/icons/Database';
import { DocumentText } from 'reicon-react/icons/DocumentText';
import { Folder } from 'reicon-react/icons/Folder';
import { Home } from 'reicon-react/icons/Home';
import { InfoCircle } from 'reicon-react/icons/InfoCircle';
import { Italic } from 'reicon-react/icons/Italic';
import { MoreH } from 'reicon-react/icons/MoreH';
import { Paperclip } from 'reicon-react/icons/Paperclip';
import { Plus } from 'reicon-react/icons/Plus';
import { Search } from 'reicon-react/icons/Search';
import { Settings } from 'reicon-react/icons/Settings';
import { Star } from 'reicon-react/icons/Star';
import { Underline } from 'reicon-react/icons/Underline';
import { Upload } from 'reicon-react/icons/Upload';
import { AgentFanout } from '@tulipfarm/sprout/agent-fanout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@tulipfarm/sprout/accordion';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@tulipfarm/sprout/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@tulipfarm/sprout/alert-dialog';
import { AspectRatio } from '@tulipfarm/sprout/aspect-ratio';
import { AttachmentGroup, FileAttachment } from '@tulipfarm/sprout/attachment';
import { Avatar, AvatarBadge, AvatarFallback } from '@tulipfarm/sprout/avatar';
import { Badge } from '@tulipfarm/sprout/badge';
import { BrandIcon, BrandStack, brandNames } from '@tulipfarm/sprout/brand-icon';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@tulipfarm/sprout/breadcrumb';
import { Board } from '@tulipfarm/sprout/board';
import { Button } from '@tulipfarm/sprout/button';
import { TimelineChart, timelineRange } from '@tulipfarm/sprout/timeline';
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@tulipfarm/sprout/button-group';
import { Calendar } from '@tulipfarm/sprout/calendar';
import { CanvasPanel, CanvasSection, CanvasToggle } from '@tulipfarm/sprout/canvas';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@tulipfarm/sprout/card';
import { Checkbox } from '@tulipfarm/sprout/checkbox';
import { ChoiceList } from '@tulipfarm/sprout/choice-list';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@tulipfarm/sprout/collapsible';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@tulipfarm/sprout/combobox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@tulipfarm/sprout/command';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@tulipfarm/sprout/context-menu';
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
import { DirectionProvider } from '@tulipfarm/sprout/direction';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@tulipfarm/sprout/dropdown-menu';
import { Field } from '@tulipfarm/sprout/field';
import { Form, FormFooter, FormSection } from '@tulipfarm/sprout/form';
import { GradientBanner, GradientBannerBadge, GradientBannerPanel } from '@tulipfarm/sprout/gradient-banner';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@tulipfarm/sprout/hover-card';
import { Input } from '@tulipfarm/sprout/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@tulipfarm/sprout/input-group';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@tulipfarm/sprout/input-otp';
import { Kbd, KbdGroup } from '@tulipfarm/sprout/kbd';
import { Label } from '@tulipfarm/sprout/label';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@tulipfarm/sprout/menubar';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@tulipfarm/sprout/navigation-menu';
import { NoticeBanner } from '@tulipfarm/sprout/notice-banner';
import { PageContent } from '@tulipfarm/sprout/page-content';
import { PageHeader } from '@tulipfarm/sprout/page-header';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@tulipfarm/sprout/pagination';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@tulipfarm/sprout/popover';
import { PresenceCursor } from '@tulipfarm/sprout/presence-cursor';
import { Progress, ProgressLabel, ProgressValue } from '@tulipfarm/sprout/progress';
import { RadioGroup, RadioGroupItem } from '@tulipfarm/sprout/radio-group';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@tulipfarm/sprout/resizable';
import { RecordList } from '@tulipfarm/sprout/record-list';
import { ResultCard } from '@tulipfarm/sprout/result-card';
import { ResultNotice } from '@tulipfarm/sprout/result-notice';
import type { RichTextValue } from '@tulipfarm/sprout/rich-text-editor';
import { ScrollArea } from '@tulipfarm/sprout/scroll-area';
import {
  SearchDialog,
  SearchEmpty,
  SearchGroup,
  SearchInput,
  SearchItem,
  SearchItemIcon,
  SearchList,
} from '@tulipfarm/sprout/search-dialog';
import { SearchField } from '@tulipfarm/sprout/search-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tulipfarm/sprout/select';
import { SelectionSlot } from '@tulipfarm/sprout/selection-slot';
import { Separator } from '@tulipfarm/sprout/separator';
import { SettingsGroup, SettingsRow } from '@tulipfarm/sprout/settings-list';
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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@tulipfarm/sprout/sidebar';
import { Skeleton, SkeletonGroup } from '@tulipfarm/sprout/skeleton';
import { Slider } from '@tulipfarm/sprout/slider';
import { Spinner } from '@tulipfarm/sprout/spinner';
import { Status, type StatusState } from '@tulipfarm/sprout/status';
import { StatePanel } from '@tulipfarm/sprout/state-panel';
import { SampleIconTile, SampleList, SampleText, SampleWindow } from '@tulipfarm/sprout/state-sample';
import { Switch } from '@tulipfarm/sprout/switch';
import { Table } from '@tulipfarm/sprout/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tulipfarm/sprout/tabs';
import { ViewSwitcher } from '@tulipfarm/sprout/view-switcher';
import { ChartBar } from 'reicon-react/icons/ChartBar';
import { Grid } from 'reicon-react/icons/Grid';
import { Kanban } from 'reicon-react/icons/Kanban';
import { List } from 'reicon-react/icons/List';
import { Textarea } from '@tulipfarm/sprout/textarea';
import { Toggle } from '@tulipfarm/sprout/toggle';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import { ToolbarStatus } from '@tulipfarm/sprout/toolbar-status';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@tulipfarm/sprout/tooltip';
import { Message, MessageBubble, MessageContent, MessageReactions } from '@tulipfarm/sprout/message';
import { MentionList, MentionOption } from '@tulipfarm/sprout/mention-list';
import { BookOpen } from 'reicon-react/icons/BookOpen';

const RichTextEditor = lazy(() =>
  import('@tulipfarm/sprout/rich-text-editor').then(m => ({
    default: m.RichTextEditor,
  })),
);
const FileViewer = lazy(() =>
  import('@tulipfarm/sprout/file-viewer').then(m => ({
    default: m.FileViewer,
  })),
);
const GlassBanner = lazy(() =>
  import('@tulipfarm/sprout/glass-banner').then(m => ({
    default: m.GlassBanner,
  })),
);
const GlassChip = lazy(() =>
  import('@tulipfarm/sprout/glass-banner').then(m => ({
    default: m.GlassChip,
  })),
);

const Stack = ({ children, row = false }: { children: ReactNode; row?: boolean }) => (
  <div className={row ? 'home-p-row' : 'home-p-stack'}>{children}</div>
);

function ButtonPreview() {
  const [count, setCount] = useState(0);
  return (
    <Stack row>
      <Button onClick={() => setCount(count + 1)}>Saved {count}×</Button>
      <Button variant="outline">
        <Plus data-icon="inline-start" />
        Add item
      </Button>
    </Stack>
  );
}

function ButtonGroupPreview() {
  const [page, setPage] = useState(1);
  return (
    <ButtonGroup aria-label="Pages">
      <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
        Previous
      </Button>
      <ButtonGroupText>Page {page} of 3</ButtonGroupText>
      <ButtonGroupSeparator />
      <Button variant="outline" disabled={page === 3} onClick={() => setPage(page + 1)}>
        Next
      </Button>
    </ButtonGroup>
  );
}

function ToolbarStatusPreview() {
  const [runs, setRuns] = useState(0);
  const failed = runs % 2 === 1;
  return (
    <ToolbarStatus
      label={failed ? 'Export failed' : 'Export result'}
      message={runs === 0 ? 'Ready to export.' : failed ? 'Export failed. Try again.' : 'Exported 128 rows.'}
      error={failed}
    >
      <Button variant="outline" size="sm" onClick={() => setRuns(runs + 1)}>
        {failed ? 'Retry export' : 'Export'}
      </Button>
    </ToolbarStatus>
  );
}

function CalendarPreview() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 9, 12));
  return (
    <div className="home-p-zoom">
      <Calendar mode="single" selected={date} onSelect={setDate} defaultMonth={new Date(2026, 9, 1)} />
    </div>
  );
}

function CheckboxPreview() {
  const [rows, setRows] = useState([true, false]);
  const all = rows.every(Boolean);
  const some = rows.some(Boolean) && !all;
  return (
    <Stack>
      <Label>
        <Checkbox checked={all} indeterminate={some} onCheckedChange={next => setRows(rows.map(() => next))} />
        Select all
      </Label>
      {['Share with members', 'Email a summary'].map((label, index) => (
        <Label key={label}>
          <Checkbox
            checked={rows[index]}
            onCheckedChange={next => setRows(rows.map((value, i) => (i === index ? next : value)))}
          />
          {label}
        </Label>
      ))}
    </Stack>
  );
}

function ChoiceListPreview() {
  const [style, setStyle] = useState<string[]>(['short']);
  return (
    <ChoiceList
      layout="compact"
      legend="Reply style"
      options={[
        { id: 'short', label: 'Short answers' },
        { id: 'detailed', label: 'Detailed answers' },
      ]}
      value={style}
      onChange={setStyle}
    />
  );
}

const fruits = ['Apple', 'Apricot', 'Blueberry', 'Cherry', 'Pear'];

function ComboboxPreview() {
  return (
    <Combobox items={fruits}>
      <ComboboxInput aria-label="Choose a fruit" placeholder="Choose a fruit" showClear />
      <ComboboxContent>
        <ComboboxEmpty>No fruit found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function FieldPreview() {
  const [name, setName] = useState('');
  return (
    <Field label="Agent name" required error={name.length > 20 ? 'Use 20 characters or fewer.' : undefined}>
      <Input value={name} placeholder="People Ops helper" onChange={event => setName(event.target.value)} />
    </Field>
  );
}

function FormPreview() {
  const [minutes, setMinutes] = useState('30');
  const [saved, setSaved] = useState('30');
  return (
    <div className="home-p-zoom">
      <Form label="Change interval" onSubmit={() => setSaved(minutes)}>
        <FormSection title="Scheduled trigger">
          <Field label="Run every (minutes)" required>
            <Input type="number" value={minutes} onChange={event => setMinutes(event.target.value)} />
          </Field>
        </FormSection>
        <FormFooter
          dirty={minutes !== saved}
          submit={{
            label: 'Save',
            pendingLabel: 'Saving…',
            state: { kind: 'ready' },
          }}
          cancel={{
            kind: 'reset',
            label: 'Discard',
            onReset: () => setMinutes(saved),
          }}
        />
      </Form>
    </div>
  );
}

function InputPreview() {
  const [value, setValue] = useState('');
  return (
    <Stack>
      <Label htmlFor="home-input">Email</Label>
      <Input
        id="home-input"
        type="email"
        placeholder="you@company.com"
        value={value}
        onChange={event => setValue(event.target.value)}
      />
    </Stack>
  );
}

function InputGroupPreview() {
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search size={14} aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput aria-label="Search chats" placeholder="Search chats" />
    </InputGroup>
  );
}

function InputOTPPreview() {
  const [code, setCode] = useState('194');
  return (
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
    </InputOTP>
  );
}

function RichTextPreview() {
  const [value, setValue] = useState<RichTextValue>({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  });
  return (
    <div className="home-p-wide">
      <Suspense fallback={<Skeleton />}>
        <RichTextEditor
          size="sm"
          value={value}
          onChange={setValue}
          placeholder="Write a message… Enter sends"
          onSend={() => {}}
        />
      </Suspense>
    </div>
  );
}

function SearchFieldPreview() {
  const [search, setSearch] = useState('');
  return <SearchField label="Find agents" placeholder="Search agents" value={search} onChange={setSearch} />;
}

const durations = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '90 minutes' },
];

function SelectPreview() {
  const [duration, setDuration] = useState('60');
  return (
    <Select items={durations} value={duration} onValueChange={value => value && setDuration(value)}>
      <SelectTrigger aria-label="Duration">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {durations.map(item => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SliderPreview() {
  const [volume, setVolume] = useState(40);
  return (
    <div className="home-p-wide">
      <Slider
        aria-label="Volume"
        value={volume}
        onValueChange={next => setVolume(typeof next === 'number' ? next : next[0]!)}
      />
    </div>
  );
}

function SwitchPreview() {
  const [on, setOn] = useState(true);
  return (
    <Label>
      <Switch checked={on} onCheckedChange={setOn} />
      Email summaries {on ? 'on' : 'off'}
    </Label>
  );
}

function TextareaPreview() {
  const [prompt, setPrompt] = useState('');
  return (
    <div className="home-p-wide">
      <Field label="Task prompt" optional counter={`${prompt.length} / 200`}>
        <Textarea rows={2} maxLength={200} value={prompt} onChange={event => setPrompt(event.target.value)} />
      </Field>
    </div>
  );
}

function AlertDialogPreview() {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>Stop plan</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Stop this plan?</AlertDialogTitle>
        <AlertDialogDescription>Unfinished tasks are cancelled. Finished work is kept.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep running</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Stop plan</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CommandPreview() {
  return (
    <div className="home-p-wide home-p-command">
      <Command label="Sample commands">
        <CommandInput placeholder="Type a command…" />
        <CommandList>
          <CommandEmpty>No matching commands.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <Plus size={16} aria-hidden="true" />
              New draft
              <CommandShortcut>⌘ N</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Folder size={16} aria-hidden="true" />
              Open folder
            </CommandItem>
            <CommandItem>
              <Settings size={16} aria-hidden="true" />
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

function ContextMenuPreview() {
  return (
    <ContextMenu>
      <ContextMenuTrigger tabIndex={0} role="group" aria-label="Sample card actions" className="home-p-target">
        Right-click here
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>
          Open<ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>Rename</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function DialogPreview() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Edit profile</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Changes show to your workspace right away.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Field label="Name" required>
            <Input defaultValue="Alex Meadow" />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DropdownMenuPreview() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Row actions" />}>
        <MoreH size={16} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem>Edit row</DropdownMenuItem>
          <DropdownMenuItem>History</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete row</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HoverCardPreview() {
  return (
    <HoverCard>
      <HoverCardTrigger render={<a href="/components/hover-card/" className="home-p-link" />}>
        @alexmeadow
      </HoverCardTrigger>
      <HoverCardContent side="top">
        <p className="home-p-strong">Alex Meadow</p>
        <p className="home-p-note">Fictional garden project coordinator.</p>
      </HoverCardContent>
    </HoverCard>
  );
}

function MenubarPreview() {
  return (
    <Menubar aria-label="Application menu">
      {['File', 'Edit', 'View'].map(menu => (
        <MenubarMenu key={menu}>
          <MenubarTrigger>{menu}</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New draft<MenubarShortcut>⌘ N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>Duplicate</MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled>Print</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      ))}
    </Menubar>
  );
}

function PopoverPreview() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Sync status</PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Synced 2 minutes ago</PopoverTitle>
          <PopoverDescription>All 4 sources are up to date.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

const pages = [
  { title: 'Overview', meta: 'Workspace' },
  { title: 'Agents', meta: 'Workspace' },
  { title: 'Billing', meta: 'Settings' },
  { title: 'Members', meta: 'Settings' },
];

function SearchDialogPreview() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = pages.filter(page => page.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Search data-icon="inline-start" aria-hidden="true" />
        Jump to…
      </Button>
      <SearchDialog open={open} onOpenChange={setOpen} title="Jump to…" description="Find workspace pages.">
        <SearchInput value={query} onValueChange={setQuery} placeholder="Find a page…" label="Find a page" />
        <SearchList label="Pages">
          {results.length === 0 && <SearchEmpty title="No pages match" description="Try another word." />}
          <SearchGroup heading="Pages" count={results.length}>
            {results.map(page => (
              <SearchItem
                key={page.title}
                value={page.title}
                onSelect={() => setOpen(false)}
                media={
                  <SearchItemIcon>
                    <DocumentText size={16} aria-hidden="true" />
                  </SearchItemIcon>
                }
                title={page.title}
                meta={page.meta}
              />
            ))}
          </SearchGroup>
        </SearchList>
      </SearchDialog>
    </>
  );
}

function SheetPreview() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>Filters (2)</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter and sort</SheetTitle>
          <SheetDescription>Results update as you choose.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Label>
            <Checkbox defaultChecked />
            Only active agents
          </Label>
        </SheetBody>
        <SheetFooter>
          <Button onClick={() => setOpen(false)}>Show results</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TooltipPreview() {
  return (
    <TooltipProvider>
      <Stack row>
        {[
          { label: 'Attach files', icon: Paperclip },
          { label: 'Bold', icon: Bold },
          { label: 'Add to favorites', icon: Star },
        ].map(({ label, icon: Icon }) => (
          <Tooltip key={label}>
            <TooltipTrigger render={<Button size="icon" variant="outline" aria-label={label} />}>
              <Icon size={16} aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </Stack>
    </TooltipProvider>
  );
}

function BreadcrumbPreview() {
  return (
    <Breadcrumb aria-label="Folder path">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#components">All files</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#components">Projects</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Meadow</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function NavigationMenuPreview() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Projects</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="home-p-navpanel">
              <NavigationMenuLink href="#components">Meadow project</NavigationMenuLink>
              <NavigationMenuLink href="#components">Garden notes</NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="/installation/">Docs</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function PaginationPreview() {
  const [page, setPage] = useState(2);
  const go = (next: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    setPage(Math.min(3, Math.max(1, next)));
  };
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" onClick={go(page - 1)} />
        </PaginationItem>
        {[1, 2, 3].map(n => (
          <PaginationItem key={n}>
            <PaginationLink href="#" isActive={n === page} onClick={go(n)}>
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href="#" onClick={go(page + 1)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function SidebarPreview() {
  const [active, setActive] = useState('Overview');
  return (
    <div className="home-p-frame">
      <SidebarProvider keyboardShortcut={false} className="home-p-sidebar">
        <Sidebar label="Sample navigation" collapsible="none">
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                {[
                  { label: 'Overview', icon: <Home /> },
                  { label: 'Chats', icon: <ChatRound /> },
                  { label: 'Settings', icon: <Settings /> },
                ].map(item => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      icon={item.icon}
                      isActive={active === item.label}
                      onClick={() => setActive(item.label)}
                    >
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </div>
  );
}

function TabsPreview() {
  return (
    <Tabs defaultValue="members" className="home-p-wide">
      <TabsList aria-label="Members settings">
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="invites">Invitations</TabsTrigger>
      </TabsList>
      <TabsContent value="members">
        <p className="home-p-note">12 people in this workspace.</p>
      </TabsContent>
      <TabsContent value="invites">
        <p className="home-p-note">2 invitations are waiting.</p>
      </TabsContent>
    </Tabs>
  );
}

const previewViews = [
  { id: 'table', label: 'Table', icon: Grid, description: 'Rows and columns.' },
  { id: 'list', label: 'List', icon: List, description: 'One item per row.' },
  { id: 'board', label: 'Board', icon: Kanban, description: 'Cards in lanes.' },
  { id: 'chart', label: 'Chart', icon: ChartBar, description: 'Totals by group.' },
];

function ViewSwitcherPreview() {
  const [value, setValue] = useState('table');
  return (
    <div className="home-p-wide">
      <ViewSwitcher
        views={previewViews}
        value={value}
        onValueChange={setValue}
        options={previewViews}
        onAdd={setValue}
        label="Seed order views"
      />
    </div>
  );
}

function AccordionPreview() {
  return (
    <Accordion defaultValue={['one']} className="home-p-wide">
      <AccordionItem value="one">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It follows the WAI-ARIA pattern.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="two">
        <AccordionTrigger>Can I style it?</AccordionTrigger>
        <AccordionContent>Yes. It uses your Sprõut tokens.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function AspectRatioPreview() {
  const [wide, setWide] = useState(true);
  return (
    <button type="button" className="home-p-ratio" onClick={() => setWide(!wide)} aria-label="Switch ratio">
      <AspectRatio ratio={wide ? 16 / 9 : 1}>
        <img src="/aspect-ratio-samples/landscape.svg" alt="" className="home-p-img" />
      </AspectRatio>
      <span className="home-p-note">{wide ? '16:9' : '1:1'}, click to switch</span>
    </button>
  );
}

function CardPreview() {
  const [done, setDone] = useState(false);
  return (
    <div className="home-p-zoom home-p-wide">
      <Card>
        <CardHeader>
          <CardTitle render={<h3 />}>Meadow project</CardTitle>
          <CardDescription>Spring plan · 12 beds</CardDescription>
          <CardAction>
            <Badge variant={done ? 'success' : 'secondary'}>{done ? 'Reviewed' : 'Active'}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" onClick={() => setDone(!done)}>
            {done ? 'Undo review' : 'Review tasks'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CollapsiblePreview() {
  return (
    <Collapsible className="home-p-wide">
      <CollapsibleTrigger render={<Button variant="outline" size="sm" />}>Approval details</CollapsibleTrigger>
      <CollapsibleContent>
        <p className="home-p-note">Only the listed changes are approved.</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DirectionPreview() {
  const [rtl, setRtl] = useState(true);
  return (
    <Stack>
      <DirectionProvider direction={rtl ? 'rtl' : 'ltr'}>
        <div dir={rtl ? 'rtl' : 'ltr'}>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#components">{rtl ? 'المشاريع' : 'Projects'}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{rtl ? 'الحديقة' : 'Garden'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </DirectionProvider>
      <Button size="sm" variant="ghost" onClick={() => setRtl(!rtl)}>
        Switch to {rtl ? 'LTR' : 'RTL'}
      </Button>
    </Stack>
  );
}

function PageContentPreview() {
  return (
    <div className="home-p-frame home-p-zoom">
      <PageContent>
        <PageHeader title="Usage" description="Credits, and where they go." />
        <Progress value={64}>
          <ProgressLabel>Credits used</ProgressLabel>
          <ProgressValue />
        </Progress>
      </PageContent>
    </div>
  );
}

function PageHeaderPreview() {
  return (
    <div className="home-p-zoom home-p-wide">
      <PageHeader
        title="Files"
        description="Find and organize files."
        actions={
          <Button size="sm">
            <Upload aria-hidden="true" />
            Upload
          </Button>
        }
      />
    </div>
  );
}

function ResizablePreview() {
  return (
    <div className="home-p-resizable">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="40%" minSize="20%">
          <div className="home-p-pane">Files</div>
        </ResizablePanel>
        <ResizableHandle aria-label="Resize file list" />
        <ResizablePanel minSize="20%">
          <div className="home-p-pane">Preview</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function ScrollAreaPreview() {
  return (
    <div className="home-p-wide">
      <ScrollArea size="sm" viewportLabel="Recent activity">
        {Array.from({ length: 12 }, (_, index) => (
          <p key={index} className="home-p-line">
            Run #{1042 - index} finished
          </p>
        ))}
      </ScrollArea>
    </div>
  );
}

function SelectionSlotPreview() {
  const [selected, setSelected] = useState(false);
  return (
    <Stack>
      <div className="home-p-wide">
        <SelectionSlot
          active={selected}
          selection={
            <div role="toolbar" aria-label="Selected items" className="home-p-row">
              <span role="status">2 selected</span>
              <Button variant="ghost" size="sm" onClick={() => setSelected(false)}>
                Clear
              </Button>
            </div>
          }
        >
          <div className="home-p-row">
            <span className="home-p-note">All files</span>
            <Button variant="outline" size="sm" onClick={() => setSelected(true)}>
              Select 2
            </Button>
          </div>
        </SelectionSlot>
      </div>
    </Stack>
  );
}

function SeparatorPreview() {
  return (
    <Stack>
      <div className="home-p-row">
        <span>Meadow</span>
        <Separator orientation="vertical" />
        <span className="home-p-note">Updated today</span>
      </div>
      <div className="home-p-wide">
        <Separator>or</Separator>
      </div>
    </Stack>
  );
}

function SettingsListPreview() {
  return (
    <div className="home-p-zoom home-p-wide">
      <SettingsGroup title="Notifications">
        <SettingsRow label="Email summaries" htmlFor="home-summary">
          <Switch id="home-summary" defaultChecked />
        </SettingsRow>
        <SettingsRow label="Desktop alerts" htmlFor="home-alerts">
          <Switch id="home-alerts" />
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}

function AlertPreview() {
  const [archived, setArchived] = useState(true);
  return (
    <div className="home-p-wide">
      <Alert role="status">
        <InfoCircle aria-hidden="true" />
        <AlertTitle>{archived ? 'Chat archived' : 'Chat restored'}</AlertTitle>
        <AlertDescription>{archived ? 'It moved to Archived chats.' : 'It is back in your list.'}</AlertDescription>
        <AlertAction>
          <Button variant="ghost" size="sm" onClick={() => setArchived(!archived)}>
            {archived ? 'Undo' : 'Archive'}
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
}

function NoticeBannerPreview() {
  const [fixed, setFixed] = useState(false);
  return (
    <div className="home-p-zoom home-p-wide">
      <NoticeBanner
        aria-label="Integration authorization"
        actions={
          <Button variant="outline" size="sm" onClick={() => setFixed(!fixed)}>
            {fixed ? 'Reset' : 'Approve'}
          </Button>
        }
      >
        <p role="status">{fixed ? 'Google Calendar is connected.' : 'Google Calendar needs authorization.'}</p>
      </NoticeBanner>
    </div>
  );
}

function ResultNoticePreview() {
  return (
    <div className="home-p-wide">
      <ResultNotice
        shown={100}
        total={2431}
        noun="rows"
        action={
          <Button size="sm" variant="ghost">
            Open in Table
          </Button>
        }
      />
    </div>
  );
}

function ProgressPreview() {
  const [value, setValue] = useState(40);
  return (
    <Stack>
      <div className="home-p-wide">
        <Progress value={value}>
          <ProgressLabel>Uploading</ProgressLabel>
          <ProgressValue />
        </Progress>
      </div>
      <Button size="sm" variant="outline" onClick={() => setValue(value >= 100 ? 0 : value + 20)}>
        {value >= 100 ? 'Restart' : 'Add 20%'}
      </Button>
    </Stack>
  );
}

function SkeletonPreview() {
  return (
    <div className="home-p-wide">
      <SkeletonGroup label="Loading projects">
        <Skeleton shape="title" />
        <Skeleton />
        <Skeleton />
      </SkeletonGroup>
    </div>
  );
}

function SpinnerPreview() {
  return (
    <Stack row>
      <p role="status" className="home-p-row home-p-note">
        <Spinner aria-hidden="true" />
        Loading rows…
      </p>
      <Badge variant="secondary">
        <Spinner size="sm" aria-hidden="true" />
        Finding sources
      </Badge>
    </Stack>
  );
}

const statusSteps: { state: StatusState; value?: number }[] = [
  { state: 'pending' },
  { state: 'running' },
  { state: 'running', value: 35 },
  { state: 'running', value: 80 },
  { state: 'success' },
];

function StatusPreview() {
  const [index, setIndex] = useState(1);
  const step = statusSteps[index]!;
  return (
    <Stack>
      <ul className="home-p-stack home-p-note">
        <li className="home-p-row">
          <Status state="success" /> Install dependencies
        </li>
        <li className="home-p-row">
          <Status state={step.state} value={step.value} /> Build web app
        </li>
        <li className="home-p-row">
          <Status state="pending" /> Deploy
        </li>
      </ul>
      <Button size="sm" variant="outline" onClick={() => setIndex((index + 1) % statusSteps.length)}>
        {index === statusSteps.length - 1 ? 'Restart' : 'Next step'}
      </Button>
    </Stack>
  );
}

const panelKinds = ['empty', 'loading', 'success', 'error'] as const;

function StatePanelPreview() {
  const [index, setIndex] = useState(0);
  const kind = panelKinds[index]!;
  return (
    <div className="home-p-zoom home-p-wide">
      <StatePanel kind={kind} heading="h3" title={`State: ${kind}`} description="Click to see the next state.">
        <Button variant="outline" size="sm" onClick={() => setIndex((index + 1) % panelKinds.length)}>
          Next state
        </Button>
      </StatePanel>
    </div>
  );
}

function StateSamplePreview() {
  return (
    <div className="home-p-zoom home-p-wide">
      <SampleWindow icon={ChatRound} trail={['Chats']} tabs={['Active', 'Archived']}>
        <SampleList
          items={[
            {
              leading: <SampleIconTile icon={ChatRound} />,
              title: 'Follow up with Northwind',
              detail: 'Draft ready for review',
              trailing: <SampleText tone="muted">1h ago</SampleText>,
            },
          ]}
        />
      </SampleWindow>
    </div>
  );
}

function AttachmentPreview() {
  const [files, setFiles] = useState([
    {
      id: 'a',
      name: 'Plan.pdf',
      mediaType: 'application/pdf',
      size: '48 KB',
      state: 'ready' as const,
    },
    {
      id: 'b',
      name: 'Notes.docx',
      mediaType: 'application/msword',
      size: '12 KB',
      state: 'uploading' as const,
    },
  ]);
  return (
    <Stack>
      <AttachmentGroup variant="carousel" aria-label="Attached files">
        {files.map(file => (
          <FileAttachment
            key={file.id}
            variant="chip"
            file={file}
            onRemove={() => setFiles(files.filter(item => item.id !== file.id))}
          />
        ))}
      </AttachmentGroup>
      {files.length < 2 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setFiles([
              {
                id: 'a',
                name: 'Plan.pdf',
                mediaType: 'application/pdf',
                size: '48 KB',
                state: 'ready',
              },
              {
                id: 'b',
                name: 'Notes.docx',
                mediaType: 'application/msword',
                size: '12 KB',
                state: 'uploading',
              },
            ])
          }
        >
          Reset files
        </Button>
      )}
    </Stack>
  );
}

function AvatarPreview() {
  return (
    <Stack row>
      <Avatar size="lg">
        <AvatarFallback>AM</AvatarFallback>
        <AvatarBadge role="img" aria-label="Verified">
          <Check aria-hidden="true" />
        </AvatarBadge>
      </Avatar>
      <Avatar>
        <AvatarFallback>KO</AvatarFallback>
      </Avatar>
      <Avatar size="sm">
        <AvatarFallback>RB</AvatarFallback>
      </Avatar>
    </Stack>
  );
}

function BadgePreview() {
  return (
    <Stack row>
      <Badge variant="success">
        <Check aria-hidden="true" />
        Connected
      </Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">v2.1</Badge>
    </Stack>
  );
}

function BrandIconPreview() {
  return (
    <Stack row>
      <BrandIcon brand="slack" size="sm" />
      <BrandIcon brand="gmail" size="sm" />
      <BrandIcon brand="google-calendar" size="sm" />
      <BrandStack
        brands={[
          { brand: 'jira', name: brandNames.jira },
          { brand: 'gmail', name: brandNames.gmail },
        ]}
      />
    </Stack>
  );
}

const sampleText = new File(['Returns are accepted within 30 days.'], 'Returns policy.txt', { type: 'text/plain' });

function FileViewerPreview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <DocumentText data-icon="inline-start" aria-hidden="true" />
        Open Returns policy.txt
      </Button>
      {open && (
        <Suspense fallback={null}>
          <FileViewer
            file={{
              name: sampleText.name,
              mediaType: sampleText.type,
              source: { kind: 'local', file: sampleText },
            }}
            open={open}
            onOpenChange={setOpen}
          />
        </Suspense>
      )}
    </>
  );
}

function GlassBannerPreview() {
  return (
    <div className="home-p-zoom home-p-wide">
      <Suspense fallback={<Skeleton shape="panel" />}>
        <GlassBanner title="Connect once." caption="Drag the chips">
          <GlassChip icon={<BrandIcon brand="gmail" size="glyph" />}>Drafted 3 follow-ups</GlassChip>
          <GlassChip icon={<BrandIcon brand="slack" size="glyph" />}>Answered in #support</GlassChip>
        </GlassBanner>
      </Suspense>
    </div>
  );
}

const gradients = ['iris', 'aurora', 'citrus', 'lagoon'] as const;

function GradientBannerPreview() {
  const [index, setIndex] = useState(0);
  return (
    <button type="button" className="home-p-wide home-p-plain" onClick={() => setIndex((index + 1) % gradients.length)}>
      <GradientBanner variant={gradients[index]!} size="sm">
        <GradientBannerPanel tone="dark">
          <GradientBannerBadge>{gradients[index]}</GradientBannerBadge>
          <span>Click for the next gradient</span>
        </GradientBannerPanel>
      </GradientBanner>
    </button>
  );
}

function PresenceCursorPreview() {
  return (
    <div className="relative h-24 w-56">
      <PresenceCursor name="rico@gmail.com" color="#c92a2a" x={96} y={4} />
      <PresenceCursor
        name="jenny@gmail.com"
        color="#b55309"
        x={16}
        y={44}
        avatar={
          <Avatar size="sm">
            <AvatarFallback>JE</AvatarFallback>
          </Avatar>
        }
      />
    </div>
  );
}

const previewRecords = [
  { id: 'r1', title: 'Order compost for the north beds', owner: 'Chen Wei', due: 'Oct 8', status: 'In progress' },
  { id: 'r2', title: 'Replace torn shade cloth', owner: 'Ana Ruiz', due: 'Oct 15', status: 'Open' },
  { id: 'r3', title: 'Frost alert texts arrive late', owner: 'Ben Okafor', due: 'Oct 22', status: 'Done' },
] as const;
const previewRecordTone = { 'In progress': 'warning', Open: 'info', Done: 'success' } as const;

function RecordListPreview() {
  return (
    <div className="home-p-zoom home-p-wide">
      <RecordList
        label="Tasks"
        density="sm"
        items={[...previewRecords]}
        renderTitle={record => record.title}
        values={record => [
          { label: 'Owner', value: record.owner },
          { label: 'Due', value: record.due },
        ]}
        badges={record => <Badge variant={previewRecordTone[record.status]}>{record.status}</Badge>}
      />
    </div>
  );
}

function ResultCardPreview() {
  const [opened, setOpened] = useState(false);
  return (
    <div className="home-p-zoom home-p-wide">
      <ResultCard
        title="Investor pitch"
        kind="File"
        status={opened ? 'Opened in canvas' : 'Saved in Google Slides'}
        state="success"
        apps={[
          {
            brand: 'google-slides',
            name: 'Google Slides',
            actions: [{ label: 'Created the pitch deck', state: 'completed' }],
          },
        ]}
        action={{ label: 'View slides', onClick: () => setOpened(true) }}
      />
    </div>
  );
}

const previewBoardItems = [
  { id: 'b1', columnId: 'todo', title: 'Order compost' },
  { id: 'b2', columnId: 'todo', title: 'Fix vent motor' },
  { id: 'b3', columnId: 'doing', title: 'Spring price list' },
  { id: 'b4', columnId: 'doing', title: 'Shade cloth' },
];

function BoardPreview() {
  return (
    <div className="home-p-zoom home-p-wide home-p-clip">
      <Board
        label="Tasks"
        className="home-p-board"
        columns={[
          { id: 'todo', title: 'To do', tone: 'secondary' },
          { id: 'doing', title: 'In progress', tone: 'warning', total: 12 },
          { id: 'done', title: 'Done', tone: 'success', status: 'loading' },
        ]}
        items={previewBoardItems}
        onColumnShowAll={() => {}}
      />
    </div>
  );
}

const previewTimelineRows = [
  { id: 'p1', title: 'Research', team: 'design', start: '2026-10-02', end: '2026-10-09' },
  { id: 'p2', title: 'Pricing page', team: 'build', start: '2026-10-06', end: '2026-10-20' },
  { id: 'p3', title: 'Launch day', team: 'launch', start: '2026-10-23', end: '' },
];

function TimelinePreview() {
  return (
    <div className="home-p-zoom home-p-wide home-p-clip">
      <TimelineChart
        rows={previewTimelineRows}
        rowKey="id"
        category="title"
        start="start"
        end="end"
        seriesKey="team"
        series={[
          { key: 'design', label: 'Design', color: 'var(--sprout-chart-1)' },
          { key: 'build', label: 'Build', color: 'var(--sprout-chart-2)' },
          { key: 'launch', label: 'Launch', color: 'var(--sprout-chart-3)' },
        ]}
        title="Launch plan"
        locale="en-US"
        window={timelineRange('month', '2026-10-14')}
        today="2026-10-14"
      />
    </div>
  );
}

function TablePreview() {
  const rows = [
    { name: 'Customers', records: 1284 },
    { name: 'Invoices', records: 9407 },
    { name: 'Suppliers', records: 38 },
  ];
  return (
    <div className="home-p-zoom home-p-wide">
      <Table
        aria-label="Tables"
        data={rows}
        getRowId={row => row.name}
        columns={[
          { key: 'name', header: 'Table' },
          {
            key: 'records',
            header: 'Records',
            align: 'right',
            cell: row => row.records.toLocaleString('en-US'),
          },
        ]}
      />
    </div>
  );
}

const canvasTabs = [
  { id: 'rows', title: 'Customers', icon: Database },
  { id: 'doc', title: 'Launch notes', icon: DocumentText },
];

function CanvasPreview() {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState('rows');
  return (
    <Stack>
      <CanvasToggle open={open} count={canvasTabs.length} onToggle={() => setOpen(!open)} />
      {open && (
        <div className="home-p-frame home-p-canvas">
          <CanvasPanel
            tabs={canvasTabs}
            activeId={active}
            onSelect={setActive}
            onCloseTab={() => setOpen(false)}
            onClose={() => setOpen(false)}
          >
            <CanvasSection title={canvasTabs.find(tab => tab.id === active)!.title} meta="Sample result">
              <p className="home-p-note">Results open here beside the chat.</p>
            </CanvasSection>
          </CanvasPanel>
        </div>
      )}
    </Stack>
  );
}

const previews: Record<string, () => ReactNode> = {
  'agent-fanout': () => (
    <div className="home-p-fanout">
      <AgentFanout
        layout="tree"
        agent={{
          id: 'lead',
          name: 'Lead',
          model: 'Opus 5.5',
          brand: 'claude',
          task: 'Launch pricing',
          status: 'running',
          elapsed: 48_000,
          agents: [
            {
              id: 'research',
              name: 'Research',
              model: 'GPT-5.5',
              brand: 'openai',
              task: 'Compare plans',
              status: 'done',
              elapsed: 21_000,
            },
            {
              id: 'scrape',
              name: 'Scrape',
              model: 'DeepSeek',
              brand: 'deepseek',
              task: 'Pull prices',
              status: 'running',
              elapsed: 12_000,
            },
            {
              id: 'copy',
              name: 'Copy',
              model: 'Grok 5',
              brand: 'grok',
              task: 'Name the plan',
              status: 'needs-you',
              elapsed: 9_000,
            },
          ],
        }}
      />
    </div>
  ),
  button: ButtonPreview,
  'button-group': ButtonGroupPreview,
  toggle: () => (
    <Stack row>
      <Toggle aria-label="Bold" defaultPressed>
        <Bold />
      </Toggle>
      <Toggle variant="outline">
        <Star data-icon="inline-start" />
        Starred
      </Toggle>
    </Stack>
  ),
  'toggle-group': () => (
    <ToggleGroup aria-label="Text style" multiple defaultValue={['bold']}>
      <ToggleGroupItem value="bold" aria-label="Bold">
        <Bold />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <Italic />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <Underline />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
  'toolbar-status': ToolbarStatusPreview,
  kbd: () => (
    <Stack row>
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
      <span className="home-p-row home-p-note">
        <Kbd variant="outline">↵</Kbd>
        Open
      </span>
    </Stack>
  ),
  calendar: CalendarPreview,
  checkbox: CheckboxPreview,
  'choice-list': ChoiceListPreview,
  combobox: ComboboxPreview,
  field: FieldPreview,
  form: FormPreview,
  input: InputPreview,
  'input-group': InputGroupPreview,
  'input-otp': InputOTPPreview,
  label: () => (
    <Label>
      <Checkbox defaultChecked />
      Shared business account
    </Label>
  ),
  'radio-group': () => (
    <RadioGroup defaultValue="weekly" aria-label="Digest frequency">
      {['Daily', 'Weekly', 'Never'].map(label => (
        <Label key={label}>
          <RadioGroupItem value={label.toLowerCase()} />
          {label}
        </Label>
      ))}
    </RadioGroup>
  ),
  'rich-text-editor': RichTextPreview,
  'search-field': SearchFieldPreview,
  select: SelectPreview,
  slider: SliderPreview,
  switch: SwitchPreview,
  textarea: TextareaPreview,
  'alert-dialog': AlertDialogPreview,
  command: CommandPreview,
  'context-menu': ContextMenuPreview,
  dialog: DialogPreview,
  'dropdown-menu': DropdownMenuPreview,
  'hover-card': HoverCardPreview,
  menubar: MenubarPreview,
  popover: PopoverPreview,
  'search-dialog': SearchDialogPreview,
  sheet: SheetPreview,
  tooltip: TooltipPreview,
  breadcrumb: BreadcrumbPreview,
  'navigation-menu': NavigationMenuPreview,
  pagination: PaginationPreview,
  sidebar: SidebarPreview,
  tabs: TabsPreview,
  'view-switcher': ViewSwitcherPreview,
  accordion: AccordionPreview,
  'aspect-ratio': AspectRatioPreview,
  card: CardPreview,
  collapsible: CollapsiblePreview,
  direction: DirectionPreview,
  'page-content': PageContentPreview,
  'page-header': PageHeaderPreview,
  resizable: ResizablePreview,
  'scroll-area': ScrollAreaPreview,
  'selection-slot': SelectionSlotPreview,
  separator: SeparatorPreview,
  'settings-list': SettingsListPreview,
  alert: AlertPreview,
  'notice-banner': NoticeBannerPreview,
  progress: ProgressPreview,
  'result-notice': ResultNoticePreview,
  skeleton: SkeletonPreview,
  spinner: SpinnerPreview,
  'state-panel': StatePanelPreview,
  'state-sample': StateSamplePreview,
  status: StatusPreview,
  attachment: AttachmentPreview,
  avatar: AvatarPreview,
  badge: BadgePreview,
  'brand-icon': BrandIconPreview,
  'file-viewer': FileViewerPreview,
  'glass-banner': GlassBannerPreview,
  'gradient-banner': GradientBannerPreview,
  'presence-cursor': PresenceCursorPreview,
  'record-list': RecordListPreview,
  'result-card': ResultCardPreview,
  board: BoardPreview,
  timeline: TimelinePreview,
  table: TablePreview,
  canvas: CanvasPreview,
  message: () => (
    <Stack>
      <div className="home-p-wide" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Message align="end">
          <MessageContent>
            <MessageBubble variant="secondary">Create a Customers table.</MessageBubble>
          </MessageContent>
        </Message>
        <Message>
          <MessageContent>
            <MessageBubble variant="tinted" reactions={<MessageReactions align="start">✓ 1</MessageReactions>}>
              Done. Review the changes.
            </MessageBubble>
          </MessageContent>
        </Message>
      </div>
    </Stack>
  ),
  'mention-list': MentionListPreview,
};

const previewSkills = ['Brand voice review', 'Release notes writer'];

function MentionListPreview() {
  const [active, setActive] = useState(0);
  return (
    <MentionList id="home-mention-list" label="Skills you can use">
      {previewSkills.map((name, index) => (
        <MentionOption
          key={name}
          id={`home-mention-${index}`}
          active={index === active}
          onSelect={() => setActive(index)}
          media={<BookOpen size={16} aria-hidden="true" />}
          title={name}
          description="Workspace skill"
        />
      ))}
    </MentionList>
  );
}

export default function HomePreview({ slug }: { slug: string }) {
  const Preview = previews[slug];
  return Preview ? <Preview /> : null;
}
