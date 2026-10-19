import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import * as sprout from "../packages/sprout/src/index.js";
import {
  Sidebar,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSection,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuSkeleton,
} from "../packages/sprout/src/index.js";
import {
  Badge,
  badgeSizeNames,
  badgeVariantNames,
  badgeVariants,
} from "../packages/sprout/src/components/badge.js";
import { cn, stateClassName } from "../packages/sprout/src/internal/classes.js";

const badgeExports = [
  "Badge",
  "badgeVariants",
  "badgeVariantNames",
  "badgeSizeNames",
];

const statePanelExports = ["StatePanel", "statePanelKindNames"];

const tableExports = [
  "Table",
  "tableAggregateNames",
  "tableAlignNames",
  "tableEditNames",
  "tableFilterNames",
  "tableLayoutKeys",
  "tableNarrowNames",
  "tableVariantNames",
];

const statePanelSampleExports = [
  "AgentTasksSample",
  "AgentsSample",
  "ChatsSample",
  "CreateInChatSample",
  "FilesSample",
  "GrantsSample",
  "IntegrationsSample",
  "InvitationsSample",
  "MembersSample",
  "ModelsSample",
  "ProjectsSample",
  "RecordsSample",
  "SkillsSample",
  "TablesSample",
  "TeamsSample",
  "WorkflowsSample",
];

const stateSampleExports = [
  "SampleBar",
  "SampleIconTile",
  "SampleList",
  "SampleMark",
  "SampleTable",
  "SampleText",
  "SampleWindow",
  "sampleBarWidthNames",
  "sampleColumnSizeNames",
  "sampleMarkSizeNames",
  "sampleMarkToneNames",
  "sampleTextToneNames",
];

const pageHeaderExports = ["PageActions", "PageChromeContext", "PageHeader"];

const pageContentExports = ["PageContent"];

const settingsListExports = [
  "SettingsGroup",
  "SettingsRow",
  "settingsGroupHeadingNames",
];

const breadcrumbExports = [
  "Breadcrumb",
  "BreadcrumbEllipsis",
  "BreadcrumbItem",
  "BreadcrumbLink",
  "BreadcrumbList",
  "BreadcrumbPage",
  "BreadcrumbSeparator",
];

const alertExports = [
  "Alert",
  "AlertAction",
  "AlertDescription",
  "AlertTitle",
  "alertVariantNames",
  "alertVariants",
];

const avatarExports = [
  "AgentAvatar",
  "Avatar",
  "AvatarBadge",
  "AvatarFallback",
  "AvatarGroup",
  "AvatarGroupCount",
  "AvatarImage",
  "EntityAvatar",
  "agentAvatarSrc",
];

const brandIconExports = [
  "BrandIcon",
  "BrandStack",
  "BrandTile",
  "brandIconSizeNames",
  "brandNames",
  "brandTileSizeNames",
];

const accordionExports = [
  "Accordion",
  "AccordionContent",
  "AccordionItem",
  "AccordionTrigger",
  "accordionTriggerVariantNames",
];

const collapsibleExports = [
  "Collapsible",
  "CollapsibleContent",
  "CollapsibleTrigger",
  "collapsibleContentVariantNames",
];

const commandExports = [
  "Command",
  "CommandDialog",
  "CommandEmpty",
  "CommandGroup",
  "CommandInput",
  "CommandItem",
  "CommandList",
  "CommandSeparator",
  "CommandShortcut",
  "defaultCommandFilter",
];

const contextMenuExports = [
  "ContextMenu",
  "ContextMenuCheckboxItem",
  "ContextMenuContent",
  "ContextMenuGroup",
  "ContextMenuItem",
  "ContextMenuLabel",
  "ContextMenuPortal",
  "ContextMenuRadioGroup",
  "ContextMenuRadioItem",
  "ContextMenuSeparator",
  "ContextMenuShortcut",
  "ContextMenuSub",
  "ContextMenuSubContent",
  "ContextMenuSubTrigger",
  "ContextMenuTrigger",
  "contextMenuItemVariantNames",
];

const searchDialogExports = [
  "SearchDialog",
  "SearchEmpty",
  "SearchFilter",
  "SearchFilters",
  "SearchFooter",
  "SearchGroup",
  "SearchHint",
  "SearchInput",
  "SearchItem",
  "SearchItemIcon",
  "SearchList",
];

const alertDialogExports = [
  "AlertDialog",
  "AlertDialogAction",
  "AlertDialogCancel",
  "AlertDialogContent",
  "AlertDialogDescription",
  "AlertDialogFooter",
  "AlertDialogHeader",
  "AlertDialogMedia",
  "AlertDialogOverlay",
  "AlertDialogPortal",
  "AlertDialogTitle",
  "AlertDialogTrigger",
  "alertDialogSizeNames",
];

const dialogExports = [
  "Dialog",
  "DialogBody",
  "DialogClose",
  "DialogContent",
  "DialogDescription",
  "DialogFooter",
  "DialogHeader",
  "DialogOverlay",
  "DialogPortal",
  "DialogTitle",
  "DialogTrigger",
  "dialogPlacementNames",
  "dialogSizeNames",
];

const dropdownMenuExports = [
  "DropdownMenu",
  "DropdownMenuCheckboxItem",
  "DropdownMenuContent",
  "DropdownMenuGroup",
  "DropdownMenuItem",
  "DropdownMenuLabel",
  "DropdownMenuPortal",
  "DropdownMenuRadioGroup",
  "DropdownMenuRadioItem",
  "DropdownMenuSeparator",
  "DropdownMenuShortcut",
  "DropdownMenuSub",
  "DropdownMenuSubContent",
  "DropdownMenuSubTrigger",
  "DropdownMenuTrigger",
  "dropdownMenuContentSizeNames",
  "dropdownMenuItemVariantNames",
];

const popoverExports = [
  "Popover",
  "PopoverContent",
  "PopoverDescription",
  "PopoverHeader",
  "PopoverTitle",
  "PopoverTrigger",
  "popoverContentSizeNames",
];

const sheetExports = [
  "Sheet",
  "SheetBody",
  "SheetClose",
  "SheetContent",
  "SheetDescription",
  "SheetFooter",
  "SheetHeader",
  "SheetOverlay",
  "SheetPortal",
  "SheetTitle",
  "SheetTrigger",
  "sheetSideNames",
  "sheetSizeNames",
  "sheetTitleSizeNames",
];

const tabsExports = [
  "Tabs",
  "TabsContent",
  "TabsList",
  "TabsTrigger",
  "tabsListVariantNames",
  "tabsListVariants",
];

const checkboxExports = ["Checkbox", "checkboxVariantNames"];
const radioGroupExports = ["RadioGroup", "RadioGroupItem"];

const choiceListExports = [
  "ChoiceList",
  "ChoiceSummary",
  "choiceListLayoutNames",
];

const switchExports = ["Switch", "switchSizeNames"];
const sliderExports = ["Slider"];
const reasoningEffortExports = ["ReasoningEffort"];

const toggleExports = [
  "Toggle",
  "toggleSizeNames",
  "toggleVariantNames",
  "toggleVariants",
];

const toggleGroupExports = [
  "ToggleGroup",
  "ToggleGroupItem",
  "toggleGroupSizeNames",
  "toggleGroupVariantNames",
];

const tooltipExports = [
  "Tooltip",
  "TooltipContent",
  "TooltipProvider",
  "TooltipTrigger",
];

const toastExports = [
  "Toast",
  "ToastAction",
  "ToastClose",
  "ToastContent",
  "ToastDescription",
  "ToastPortal",
  "ToastProvider",
  "ToastTitle",
  "ToastViewport",
  "Toaster",
  "createToastManager",
  "toast",
  "toastTypeNames",
  "useToastManager",
];

const fieldExports = [
  "CheckboxField",
  "ChoiceGroup",
  "Field",
  "FieldSeparator",
  "FieldsDisabled",
  "checkboxFieldVariantNames",
  "choiceGroupLayoutNames",
  "choiceGroupTypeNames",
  "fieldLabelVisibilityNames",
  "useFieldControl",
];

const formExports = [
  "Form",
  "FormFooter",
  "FormSection",
  "formFooterLayoutNames",
  "formSectionLevelNames",
];

const hoverCardExports = ["HoverCard", "HoverCardContent", "HoverCardTrigger"];

const inputExports = ["Input", "inputScaleNames"];

const inputGroupExports = [
  "InputGroup",
  "InputGroupAddon",
  "InputGroupButton",
  "InputGroupInput",
  "InputGroupText",
  "InputGroupTextarea",
  "inputGroupAddonAlignNames",
  "inputGroupButtonSizeNames",
  "inputGroupSizeNames",
  "inputGroupVariantNames",
];

const textareaExports = ["Textarea", "textareaVariantNames"];

const inputOtpExports = [
  "InputOTP",
  "InputOTPGroup",
  "InputOTPSeparator",
  "InputOTPSlot",
];

const searchFieldExports = ["SearchField"];

const glassBannerExports = ["GlassBanner", "GlassChip"];

const gradientBannerExports = [
  "GradientBanner",
  "GradientBannerBadge",
  "GradientBannerPanel",
  "GradientBannerProgress",
  "gradientBannerPanelToneNames",
  "gradientBannerSizeNames",
  "gradientBannerVariantNames",
];

const resizableExports = [
  "ResizableHandle",
  "ResizablePanel",
  "ResizablePanelGroup",
  "resizableOrientationNames",
  "useResizableLayout",
];

const resultCardExports = [
  "ResultAppActions",
  "ResultCard",
  "resultAppActionStateNames",
  "resultCardKindNames",
  "resultCardStateNames",
];

const reviewCardExports = [
  "ReviewCard",
  "ReviewRow",
  "ReviewRows",
  "ReviewSteps",
  "ReviewValues",
  "reviewCardBadgeVariantNames",
];

const richTextEditorExports = ["RichTextEditor", "richTextEditorSizeNames"];

const aspectRatioExports = ["AspectRatio"];

const carouselExports = [
  "Carousel",
  "CarouselContent",
  "CarouselItem",
  "CarouselNext",
  "CarouselPrevious",
  "carouselAlignNames",
  "carouselOrientationNames",
  "useCarousel",
];

const directionExports = ["DirectionProvider", "useDirection"];

const kbdExports = ["Kbd", "KbdGroup", "kbdVariantNames"];
const messageExports = [
  "Message",
  "MessageAvatar",
  "MessageContent",
  "MessageFooter",
  "MessageGroup",
  "MessageHeader",
  "MessageBubble",
  "MessageReactions",
  "messageAlignNames",
  "messageBubbleVariantNames",
  "messageReactionsSideNames",
];
const skeletonExports = [
  "Skeleton",
  "SkeletonGroup",
  "skeletonGroupGapNames",
  "skeletonShapeNames",
];

const spinnerExports = [
  "Spinner",
  "spinnerSizeNames",
  "spinnerActivityNames",
  "thinkingSpinnerSizeNames",
];

const progressExports = [
  "Progress",
  "ProgressIndicator",
  "ProgressLabel",
  "ProgressTrack",
  "ProgressValue",
];

const selectionSlotExports = ["SelectionSlot"];

const labelExports = ["Label"];

const paginationExports = [
  "Pagination",
  "PaginationContent",
  "PaginationEllipsis",
  "PaginationItem",
  "PaginationLink",
  "PaginationNext",
  "PaginationPrevious",
];

const buttonGroupExports = [
  "ButtonGroup",
  "ButtonGroupSeparator",
  "ButtonGroupText",
  "buttonGroupOrientationNames",
  "buttonGroupVariants",
];

const calendarExports = [
  "Calendar",
  "CalendarDayButton",
  "calendarCaptionLayoutNames",
];

const canvasExports = [
  "CanvasFrame",
  "CanvasPanel",
  "CanvasSection",
  "CanvasToggle",
  "ChatSplit",
  "canvasSplitMinWidth",
];

const noticeBannerExports = ["NoticeBanner"];

const presenceCursorExports = ["PresenceCursor"];

const menubarExports = [
  "Menubar",
  "MenubarCheckboxItem",
  "MenubarContent",
  "MenubarGroup",
  "MenubarItem",
  "MenubarLabel",
  "MenubarMenu",
  "MenubarPortal",
  "MenubarRadioGroup",
  "MenubarRadioItem",
  "MenubarSeparator",
  "MenubarShortcut",
  "MenubarSub",
  "MenubarSubContent",
  "MenubarSubTrigger",
  "MenubarTrigger",
  "menubarItemVariantNames",
];

const navigationMenuExports = [
  "NavigationMenu",
  "NavigationMenuContent",
  "NavigationMenuIndicator",
  "NavigationMenuItem",
  "NavigationMenuLink",
  "NavigationMenuList",
  "NavigationMenuPositioner",
  "NavigationMenuTrigger",
  "navigationMenuTriggerStyle",
];

const scrollAreaExports = [
  "ScrollArea",
  "ScrollBar",
  "scrollAreaOrientationNames",
  "scrollAreaSizeNames",
  "scrollAreaVariantNames",
];

const comboboxExports = [
  "Combobox",
  "ComboboxChip",
  "ComboboxChips",
  "ComboboxChipsInput",
  "ComboboxCollection",
  "ComboboxContent",
  "ComboboxEmpty",
  "ComboboxGroup",
  "ComboboxInput",
  "ComboboxItem",
  "ComboboxLabel",
  "ComboboxList",
  "ComboboxSeparator",
  "ComboboxTrigger",
  "ComboboxValue",
  "useComboboxAnchor",
];

const selectExports = [
  "Select",
  "SelectContent",
  "SelectGroup",
  "SelectItem",
  "SelectLabel",
  "SelectScrollDownButton",
  "SelectScrollUpButton",
  "SelectSeparator",
  "SelectTrigger",
  "SelectValue",
  "selectTriggerSizeNames",
  "selectTriggerWidthNames",
];

const separatorExports = [
  "Separator",
  "SeparatorContent",
  "SeparatorIcon",
  "separatorOrientationNames",
  "separatorToneNames",
  "separatorVariantNames",
];

const cardExports = [
  "Card",
  "CardAction",
  "CardContent",
  "CardDescription",
  "CardFooter",
  "CardHeader",
  "CardTitle",
  "cardSizeNames",
  "cardSurfaceNames",
  "cardVariants",
];

const toolbarStatusExports = ["ToolbarStatus"];
const mentionListExports = [
  "MentionGroup",
  "MentionList",
  "MentionOption",
  "MentionStatus",
  "mentionStatusToneNames",
];

const attachmentExports = [
  "Attachment",
  "AttachmentAction",
  "AttachmentActions",
  "AttachmentContent",
  "AttachmentDescription",
  "AttachmentDropzone",
  "AttachmentGroup",
  "AttachmentMedia",
  "AttachmentTitle",
  "AttachmentTrigger",
  "FileAttachment",
  "FileTypeIcon",
  "LocalFileAttachment",
  "attachmentGroupVariantNames",
  "attachmentMediaVariantNames",
  "attachmentOrientationNames",
  "attachmentSizeNames",
  "attachmentStateNames",
  "fileAttachmentStateNames",
  "fileAttachmentVariantNames",
  "fileTypeIconSizeNames",
];

const codeBlockExports = [
  "CodeBlock",
  "codeBlockLanguages",
  "codeBlockVariantNames",
  "codeLanguageName",
  "isHighlightedLanguage",
  "languageForFilename",
  "preloadCodeLanguages",
];

const fileViewerExports = [
  "FileContent",
  "FileError",
  "FilePreview",
  "FileRenderersProvider",
  "FileViewer",
  "isPreviewableFile",
  "LoadingFile",
  "ViewableFileContent",
  "googleDocument",
  "googleShortcut",
  "maxViewableFileBytes",
  "renderableType",
  "viewableFileKind",
];

const fileExplorerExports = ["FileExplorer", "fileExplorerMaxMatches"];

const messageResponseExports = ["MessageResponse", "MessageTableViewport"];

const messageActionsExports = [
  "MessageActions",
  "MessageBranch",
  "messageActionsAuthorNames",
];

const messageScrollerExports = [
  "MessageScroller",
  "MessageScrollerButton",
  "MessageScrollerContent",
  "MessageScrollerItem",
  "MessageScrollerProvider",
  "MessageScrollerViewport",
  "messageScrollerButtonDirectionNames",
  "messageScrollerDefaultScrollPositionNames",
  "messageScrollerScrollAlignNames",
  "useMessageScroller",
  "useMessageScrollerScrollable",
  "useMessageScrollerVisibility",
];

const chatInputExports = [
  "ChatInput",
  "chatInputReferenceKindNames",
  "chatInputStatusNames",
];

const chatConfirmationExports = [
  "ChatConfirmation",
  "chatConfirmationStateNames",
];

const chatPlanExports = ["ChatPlan", "chatPlanStepStateNames"];

const agentFanoutExports = [
  "AgentFanout",
  "agentFanoutStateNames",
  "agentFanoutStatusNames",
];

const planOutlineExports = [
  "PlanOutline",
  "planOutlineMarkNames",
  "planOutlineToneNames",
];

const promptListExports = ["PromptList"];

const questionnaireExports = [
  "Questionnaire",
  "QuestionnaireActions",
  "QuestionnaireChoice",
  "QuestionnaireChoiceDescription",
  "QuestionnaireChoices",
  "QuestionnaireDescription",
  "QuestionnaireError",
  "QuestionnaireInput",
  "QuestionnaireItem",
  "QuestionnaireNext",
  "QuestionnairePrevious",
  "QuestionnaireProgress",
  "QuestionnaireSkip",
  "QuestionnaireSubmit",
  "QuestionnaireTitle",
  "questionnaireItemStatusNames",
  "questionnaireShortcutModeNames",
];

const schemaDiagramExports = [
  "SchemaDiagram",
  "SchemaLegend",
  "schemaChangeNames",
  "schemaDiagramLayoutNames",
  "schemaTableStateNames",
];

const sqlViewerExports = ["SqlViewer", "sqlViewerLayoutNames"];

const chatSourcesExports = [
  "ChatSources",
  "CheckedCitation",
  "InlineCitation",
  "citationStateKindNames",
];

const toolActivityExports = [
  "ActivityPanel",
  "ToolActivity",
  "toolActivityStatusNames",
  "toolActivityVariantNames",
];

const typedTextExports = [
  "TypedText",
  "typedTextCharacterDuration",
  "typedTextMaxDuration",
];

describe("Sidebar public surface", () => {
  it("exports only Accordion, Alert, Alert Dialog, Aspect Ratio, Attachment, Avatar, Badge, Brand Icon, Breadcrumb, Button, Button Group, Canvas, Card, Carousel, Chart, Chat Confirmation, Chat Plan, Chat Sources, Checkbox, Choice List, Code Block, Collapsible, Combobox, Command, Context Menu, Dialog, Direction, Dropdown Menu, File Viewer, Form, Glass Banner, Gradient Banner, Hover Card, Input, Input Group, Input OTP, Kbd, Label, Menubar, Message, Message Actions, Message Response, Message Scroller, Navigation Menu, Notice Banner, Page Content, Page Header, Pagination, Plan Outline, Popover, Progress, Prompt List, Questionnaire, Radio Group, Reasoning Effort, Result Card, Review Card, Rich Text Editor, Schema Diagram, Scroll Area, Search Field, Select, Selection Slot, Separator, Settings List, Sheet, Sidebar, Skeleton, Slider, Spinner, State Panel, State Sample, Switch, Table, Tables Feedback, Tabs, Textarea, Toggle, Toggle Group, Toast, Tool Activity, Tooltip, and Typed Text parts", () => {
    const names = Object.keys(sprout);
    const buttonExports = [
      "Button",
      "buttonVariants",
      "buttonVariantNames",
      "buttonSizeNames",
      "ActionGroup",
      "jumpTo",
      "useActionControl",
    ];
    const chartExports = [
      "chartIndicatorNames",
      "chartColor",
      "ChartContainer",
      "ChartStyle",
      "ChartTooltip",
      "ChartTooltipContent",
      "ChartLegend",
      "ChartLegendContent",
      "UsageChart",
      "CategoryChart",
    ];
    expect(
      names.every(
        (name) =>
          name.startsWith("Sidebar") ||
          name === "useSidebar" ||
          alertExports.includes(name) ||
          alertDialogExports.includes(name) ||
          avatarExports.includes(name) ||
          badgeExports.includes(name) ||
          brandIconExports.includes(name) ||
          breadcrumbExports.includes(name) ||
          statePanelExports.includes(name) ||
          tableExports.includes(name) ||
          stateSampleExports.includes(name) ||
          statePanelSampleExports.includes(name) ||
          pageHeaderExports.includes(name) ||
          pageContentExports.includes(name) ||
          settingsListExports.includes(name) ||
          dialogExports.includes(name) ||
          searchDialogExports.includes(name) ||
          searchFieldExports.includes(name) ||
          dropdownMenuExports.includes(name) ||
          fieldExports.includes(name) ||
          formExports.includes(name) ||
          glassBannerExports.includes(name) ||
          gradientBannerExports.includes(name) ||
          popoverExports.includes(name) ||
          sheetExports.includes(name) ||
          accordionExports.includes(name) ||
          collapsibleExports.includes(name) ||
          commandExports.includes(name) ||
          contextMenuExports.includes(name) ||
          tabsExports.includes(name) ||
          checkboxExports.includes(name) ||
          radioGroupExports.includes(name) ||
          choiceListExports.includes(name) ||
          switchExports.includes(name) ||
          sliderExports.includes(name) ||
          reasoningEffortExports.includes(name) ||
          toggleExports.includes(name) ||
          toggleGroupExports.includes(name) ||
          tooltipExports.includes(name) ||
          toastExports.includes(name) ||
          hoverCardExports.includes(name) ||
          inputExports.includes(name) ||
          inputGroupExports.includes(name) ||
          inputOtpExports.includes(name) ||
          textareaExports.includes(name) ||
          resizableExports.includes(name) ||
          resultCardExports.includes(name) ||
          reviewCardExports.includes(name) ||
          richTextEditorExports.includes(name) ||
          scrollAreaExports.includes(name) ||
          comboboxExports.includes(name) ||
          selectExports.includes(name) ||
          separatorExports.includes(name) ||
          aspectRatioExports.includes(name) ||
          carouselExports.includes(name) ||
          directionExports.includes(name) ||
          kbdExports.includes(name) ||
          messageExports.includes(name) ||
          skeletonExports.includes(name) ||
          spinnerExports.includes(name) ||
          progressExports.includes(name) ||
          selectionSlotExports.includes(name) ||
          labelExports.includes(name) ||
          paginationExports.includes(name) ||
          buttonGroupExports.includes(name) ||
          calendarExports.includes(name) ||
          canvasExports.includes(name) ||
          noticeBannerExports.includes(name) ||
          presenceCursorExports.includes(name) ||
          menubarExports.includes(name) ||
          navigationMenuExports.includes(name) ||
          cardExports.includes(name) ||
          attachmentExports.includes(name) ||
          fileViewerExports.includes(name) ||
          fileExplorerExports.includes(name) ||
          codeBlockExports.includes(name) ||
          messageResponseExports.includes(name) ||
          messageActionsExports.includes(name) ||
          messageScrollerExports.includes(name) ||
          toolbarStatusExports.includes(name) ||
          mentionListExports.includes(name) ||
          toolActivityExports.includes(name) ||
          chatConfirmationExports.includes(name) ||
          chatInputExports.includes(name) ||
          chatPlanExports.includes(name) ||
          agentFanoutExports.includes(name) ||
          planOutlineExports.includes(name) ||
          promptListExports.includes(name) ||
          questionnaireExports.includes(name) ||
          schemaDiagramExports.includes(name) ||
          sqlViewerExports.includes(name) ||
          chatSourcesExports.includes(name) ||
          typedTextExports.includes(name) ||
          chartExports.includes(name) ||
          buttonExports.includes(name),
      ),
    ).toBe(true);
    expect(names).toEqual(
      expect.arrayContaining([
        ...alertExports,
        ...chartExports,
        ...alertDialogExports,
        ...avatarExports,
        ...badgeExports,
        ...brandIconExports,
        ...breadcrumbExports,
        ...toolbarStatusExports,
        ...mentionListExports,
        ...buttonExports,
        ...accordionExports,
        ...collapsibleExports,
        ...commandExports,
        ...contextMenuExports,
        ...dialogExports,
        ...searchDialogExports,
        ...searchFieldExports,
        ...dropdownMenuExports,
        ...fieldExports,
        ...formExports,
        ...glassBannerExports,
        ...gradientBannerExports,
        ...pageContentExports,
        ...settingsListExports,
        ...pageHeaderExports,
        ...popoverExports,
        ...sheetExports,
        ...statePanelExports,
        ...tableExports,
        ...stateSampleExports,
        ...statePanelSampleExports,
        ...tabsExports,
        ...checkboxExports,
        ...radioGroupExports,
        ...choiceListExports,
        ...switchExports,
        ...sliderExports,
        ...reasoningEffortExports,
        ...toggleExports,
        ...toggleGroupExports,
        ...tooltipExports,
        ...toastExports,
        ...hoverCardExports,
        ...inputExports,
        ...inputGroupExports,
        ...inputOtpExports,
        ...textareaExports,
        ...resizableExports,
        ...resultCardExports,
        ...reviewCardExports,
        ...richTextEditorExports,
        ...scrollAreaExports,
        ...comboboxExports,
        ...selectExports,
        ...separatorExports,
        ...aspectRatioExports,
        ...carouselExports,
        ...directionExports,
        ...kbdExports,
        ...messageExports,
        ...skeletonExports,
        ...spinnerExports,
        ...progressExports,
        ...selectionSlotExports,
        ...labelExports,
        ...paginationExports,
        ...buttonGroupExports,
        ...calendarExports,
        ...canvasExports,
        ...noticeBannerExports,
        ...presenceCursorExports,
        ...menubarExports,
        ...navigationMenuExports,
        ...cardExports,
        ...attachmentExports,
        ...fileViewerExports,
        ...fileExplorerExports,
        ...codeBlockExports,
        ...messageResponseExports,
        ...messageActionsExports,
        ...messageScrollerExports,
        ...toolActivityExports,
        ...chatConfirmationExports,
        ...chatInputExports,
        ...agentFanoutExports,
        ...promptListExports,
        ...questionnaireExports,
        ...schemaDiagramExports,
        ...sqlViewerExports,
        ...typedTextExports,
      ]),
    );
  });
  it("renders native active links without browser globals", () => {
    const html = renderToString(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                nativeButton={false}
                render={<a href="/overview" />}
                isActive
              >
                Overview
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>,
    );
    expect(html).toContain('href="/overview"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-label="Overview"');
    expect(html).not.toContain('role="button"');
  });
  it("keeps collapsed labels accessible and nested links hidden", () => {
    const html = renderToString(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarMenu>
            <SidebarSection label="Projects" defaultOpen>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton>Website</SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarSection>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>,
    );
    expect(html).toContain('data-state="collapsed"');
    expect(html).toContain('aria-label="Projects"');
    expect(html).not.toContain(">Website<");
  });
  it("provides deterministic skeletons", () => {
    expect(renderToString(<SidebarMenuSkeleton />)).toBe(
      renderToString(<SidebarMenuSkeleton />),
    );
  });
  it("requires a provider", () => {
    expect(() => renderToString(<Sidebar />)).toThrow(
      "Sidebar parts must be inside SidebarProvider.",
    );
  });
  it("keeps class overrides and Base UI state callbacks", () => {
    expect(cn("text-sprout-sm text-sprout-text", "text-sprout-xs")).toBe(
      "text-sprout-text text-sprout-xs",
    );
    const classes = stateClassName("h-9", (state: { disabled: boolean }) =>
      state.disabled ? "h-10" : "h-8",
    );
    expect(typeof classes).toBe("function");
    if (typeof classes === "function")
      expect(classes({ disabled: true })).toBe("h-10");
  });
});

describe("Button", () => {
  const { Button, buttonVariants, buttonVariantNames, buttonSizeNames } =
    sprout;
  it("lists every variant and size", () => {
    expect(buttonVariantNames).toEqual([
      "default",
      "outline",
      "secondary",
      "ghost",
      "destructive",
      "link",
      "scope",
    ]);
    expect(buttonSizeNames).toHaveLength(24);
    for (const size of buttonSizeNames)
      expect(buttonVariants({ size })).toContain(`sprout-button-size-${size}`);
  });
  it("renders a native button with defaults and data hooks", () => {
    const html = renderToString(<Button>Save</Button>);
    expect(html).toMatch(/^<button/);
    expect(html).toContain('type="button"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('data-size="default"');
    expect(html).toContain("sprout-button-variant-default");
  });
  it("passes form, ARIA, and data props and allows data-slot overrides", () => {
    const html = renderToString(
      <Button
        type="submit"
        form="settings"
        variant="destructive"
        size="icon-sm"
        aria-label="Delete"
        aria-busy="true"
        aria-invalid="true"
        aria-pressed={false}
        data-slot="alert-dialog-action"
        title="Delete"
        disabled
      />,
    );
    for (const text of [
      'type="submit"',
      'form="settings"',
      'aria-label="Delete"',
      'aria-busy="true"',
      'aria-invalid="true"',
      'aria-pressed="false"',
      'data-slot="alert-dialog-action"',
      'data-size="icon-sm"',
      "disabled",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain('data-slot="button"');
  });
  it("renders real links that stay links", () => {
    const link = renderToString(
      <Button nativeButton={false} render={<a href="/files" />}>
        Files
      </Button>,
    );
    expect(link).toMatch(/^<a/);
    expect(link).toContain('href="/files"');
    expect(link).not.toContain("role=");
    expect(link).not.toContain("type=");
    const disabled = renderToString(
      <Button nativeButton={false} disabled render={<a href="/files" />}>
        Files
      </Button>,
    );
    expect(disabled).toContain('aria-disabled="true"');
    expect(disabled).toContain('tabindex="-1"');
  });
  it("merges utilities and state classNames", () => {
    expect(buttonVariants({ variant: "ghost", className: "size-8 p-0" })).toBe(
      "sprout-button sprout-button-variant-ghost sprout-button-size-default size-8 p-0",
    );
    const html = renderToString(
      <Button
        disabled
        className={(state) => (state.disabled ? "is-off" : "is-on")}
      >
        Off
      </Button>,
    );
    expect(html).toContain("is-off");
    expect(html).toContain("sprout-button-size-default");
  });
});

describe("Badge", () => {
  it("renders a span with slot, variant, and size state", () => {
    const html = renderToString(<Badge>Pinned</Badge>);
    expect(html).toMatch(/^<span /);
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('data-variant="default"');
    expect(html).toContain('data-size="default"');
    expect(html).toContain('class="sprout-badge sprout-badge-default"');
    expect(html).toContain(">Pinned</span>");
  });
  it("supports every variant in both sizes", () => {
    expect(badgeVariantNames).toEqual([
      "default",
      "success",
      "warning",
      "info",
      "secondary",
      "destructive",
      "outline",
      "ghost",
      "link",
    ]);
    expect(badgeSizeNames).toEqual(["default", "chip"]);
    for (const variant of badgeVariantNames)
      for (const size of badgeSizeNames) {
        const html = renderToString(
          <Badge variant={variant} size={size}>
            {variant}
          </Badge>,
        );
        expect(html).toContain(`sprout-badge-${variant}`);
        expect(html).toContain(`data-variant="${variant}"`);
        expect(html).toContain(`data-size="${size}"`);
        expect(html.includes("sprout-badge-chip")).toBe(size === "chip");
      }
  });
  it("passes attributes, merges classes, and keeps children", () => {
    const html = renderToString(
      <Badge
        variant="secondary"
        size="chip"
        role="img"
        aria-label="Skill Review, version 1a2b3c4d"
        title="Review"
        className="max-w-40"
        id="skill"
      >
        <svg aria-hidden="true" />
        Review
      </Badge>,
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Skill Review, version 1a2b3c4d"');
    expect(html).toContain('title="Review"');
    expect(html).toContain('id="skill"');
    expect(html).toContain(
      'class="sprout-badge sprout-badge-secondary sprout-badge-chip max-w-40"',
    );
    expect(html).toContain('<svg aria-hidden="true"></svg>Review');
  });
  it("renders links and buttons through the render prop", () => {
    const link = renderToString(
      <Badge variant="link" render={<a href="/workflows" />}>
        View
      </Badge>,
    );
    expect(link).toMatch(/^<a /);
    expect(link).toContain('href="/workflows"');
    expect(link).toContain("sprout-badge-link");
    const button = renderToString(
      <Badge
        variant="ghost"
        render={(props, state) => (
          <button type="button" {...props} data-tone={state.variant} />
        )}
      >
        Clear
      </Badge>,
    );
    expect(button).toMatch(/^<button /);
    expect(button).toContain('data-tone="ghost"');
    expect(button).toContain("sprout-badge-ghost");
  });
  it("exposes variant classes for custom elements", () => {
    expect(badgeVariants()).toBe("sprout-badge sprout-badge-default");
    expect(badgeVariants({ variant: "outline", size: "chip" })).toBe(
      "sprout-badge sprout-badge-outline sprout-badge-chip",
    );
    expect(
      badgeVariants({ variant: null, size: null, className: "ml-2" }),
    ).toBe("sprout-badge sprout-badge-default ml-2");
  });
});
