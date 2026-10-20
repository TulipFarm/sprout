export interface NavItem {
  name: string;
  href: string;
  description: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const component = (name: string, description: string): NavItem => ({
  name,
  href: `/components/${name.toLowerCase().replaceAll(' ', '-')}/`,
  description,
});

export const guides: NavItem[] = [
  {
    name: 'Introduction',
    href: '/',
    description: 'What Sprõut is and what it ships.',
  },
  {
    name: 'Installation',
    href: '/installation/',
    description: 'Add Sprõut to a React 19 and Tailwind 4 app.',
  },
  {
    name: 'Theming',
    href: '/theming/',
    description: 'Neutral by default, with brand presets in CSS.',
  },
  {
    name: 'Agent skill',
    href: '/skill/',
    description: 'Teach coding agents to build with Sprõut.',
  },
  {
    name: 'Changelog',
    href: '/changelog/',
    description: 'What changed in each release.',
  },
];

export const componentGroups: NavGroup[] = [
  {
    title: 'Actions',
    items: [
      component('Button', 'Compact buttons and links for actions, toggles, and triggers.'),
      component('Button Group', 'Joins related buttons, text cells, and separators into one control.'),
      component('Toggle', 'A two-state button for text styles, filters, and view options.'),
      component('Toggle Group', 'A row of toggle buttons that share one value.'),
      component('Toolbar Status', 'A toolbar button that reports what an action did.'),
      component('Kbd', 'Keyboard keys and shortcut groups for hints and footers.'),
    ],
  },
  {
    title: 'Forms',
    items: [
      component('Calendar', 'A month grid for picking one date, several dates, or a range.'),
      component('Checkbox', 'A box for consent, permissions, filters, and row selection.'),
      component('Choice List', 'Radio or checkbox rows for answering a question.'),
      component('Combobox', 'Search a list and pick one or more values.'),
      component('Field', 'Labeled form rows, choice groups, and disabled sets.'),
      component('Form', 'Locks fields while saving and moves focus to the first error.'),
      component('Input', 'A single-line text field for names, emails, and numbers.'),
      component('Input Group', 'One bordered field with icons, text, and buttons.'),
      component('Input OTP', 'A one-time code field with one slot per character.'),
      component('Label', 'Names a form control above, around, or beside it.'),
      component('Radio Group', 'A set of radios where one value is chosen.'),
      component('Rich Text Editor', 'A Tiptap chat editor: Enter sends, shortcuts format.'),
      component('Search Field', 'A search input with a magnifier and a clear button.'),
      component('Select', 'Pick one value from a short list.'),
      component('Slider', 'A track and thumb for a number or a range.'),
      component('Switch', 'An on/off control for settings that apply right away.'),
      component('Textarea', 'A multi-line field for prompts, notes, and replies.'),
    ],
  },
  {
    title: 'Overlays',
    items: [
      component('Alert Dialog', 'Confirmations that interrupt and wait for an answer.'),
      component('Command', 'Searchable lists of actions for pickers and palettes.'),
      component('Context Menu', 'Right-click and long-press menus with submenus.'),
      component('Dialog', 'Modal dialogs for confirmations, forms, and previews.'),
      component('Dropdown Menu', 'Action menus with checkboxes, radios, and shortcuts.'),
      component('Hover Card', 'A preview card for links to people and pages.'),
      component('Menubar', 'A row of app menus with items and submenus.'),
      component('Popover', 'Floating panels for details, pickers, and filters.'),
      component('Search Dialog', 'A wide search palette with grouped results.'),
      component('Sheet', 'Panels that slide in from an edge and swipe closed.'),
      component('Tooltip', 'Short labels for icon buttons and collapsed navigation.'),
    ],
  },
  {
    title: 'Navigation',
    items: [
      component('Breadcrumb', 'A path of links that shows where a page sits.'),
      component('Navigation Menu', 'Site links where some items open a panel.'),
      component('Pagination', 'Previous, next, and numbered pages for long lists.'),
      component('Sidebar', 'Collapsible groups, an icon rail, and a mobile drawer.'),
      component('Tabs', 'Switch between related panels of one page.'),
      component('View Switcher', "The bar of a table's open views, with an Add view menu."),
    ],
  },
  {
    title: 'Layout',
    items: [
      component('Accordion', 'Sections of details and settings that open in place.'),
      component('Aspect Ratio', 'A frame that keeps media at a fixed ratio.'),
      component('Card', 'A bordered panel with a title, content, and actions.'),
      component('Collapsible', 'Show and hide one region in place.'),
      component('Direction', 'Tells Base UI parts whether text reads LTR or RTL.'),
      component('Page Content', "The padded column that holds a page's sections."),
      component('Page Header', 'Title, description, and main actions of a page.'),
      component('Resizable', 'Panels split by a draggable, keyboard-friendly divider.'),
      component('Scroll Area', 'A scrolling region with thin, theme-aware scrollbars.'),
      component('Selection Slot', 'Swaps a toolbar for a selection toolbar in place.'),
      component('Separator', 'Lines that divide content, sections, and timelines.'),
      component('Settings List', 'Titled groups of settings with controls beside them.'),
    ],
  },
  {
    title: 'Feedback',
    items: [
      component('Alert', 'Inline messages for errors, warnings, and status.'),
      component('Notice Banner', 'A full-width strip for something that needs action.'),
      component('Progress', 'A thin bar that shows how far a task has come.'),
      component('Result Notice', 'Says a chart or timeline shows only part of the result.'),
      component('Skeleton', 'Pulsing placeholders that hold the shape of content.'),
      component('Spinner', 'A spinning loader and a thought orb for AI work.'),
      component('State Panel', 'Empty, loading, success, and error states in one place.'),
      component('State Sample', 'Small pictures of a filled page for empty states.'),
      component('Toast', 'Short notices that stack in a corner and dismiss themselves.'),
    ],
  },
  {
    title: 'Data display',
    items: [
      component('Attachment', 'File cards, chips, upload states, and a drop zone.'),
      component('Avatar', 'Pictures for people, agents, and workspaces.'),
      component('Badge', 'Small labels for status, counts, and metadata.'),
      component('Board', 'A Kanban board with columns, lanes, drag and drop, and inline editing.'),
      component('Brand Icon', 'Logos for the apps and models you connect to.'),
      component('Carousel', 'Slides that scroll sideways or up and down, with arrows.'),
      component('Chart', 'Bar charts for daily usage and categories, with tooltips and legends.'),
      component('Code Block', 'Code with syntax colors, line numbers, and a copy button.'),
      component('File Explorer', 'A read-only code explorer with a tree, tabs, and search.'),
      component('File Viewer', 'Open local, linked, and Google files in a viewer.'),
      component('Glass Banner', 'A frosted banner with glass chips you can fling.'),
      component('Gradient Banner', 'Gradient art with readable panels on top.'),
      component('Presence Cursor', "Other people's pointers with a name tag or an avatar."),
      component('Record List', 'Rows of records to read and triage, with values, badges, and row actions.'),
      component('Result Card', 'A compact card for something an agent produced.'),
      component('Schema Diagram', 'Tables, fields, and links with proposed changes marked.'),
      component('SQL Viewer', 'Explore tables, keys, and the joins between them.'),
      component('Table', 'Rows of records with sorting, filters, grouping, editing, and a card layout on phones.'),
    ],
  },
  {
    title: 'AI & chat',
    items: [
      component('Agent Fanout', 'A parent agent handing one task to subagents, live.'),
      component('Chat Confirmation', 'Asks someone to approve or decline an agent’s action.'),
      component('Chat Plan', 'A plan an agent proposed, with each step’s progress.'),
      component('Plan Outline', "A saved plan's nested tasks, marks, and dependencies."),
      component('Chat Sources', 'Numbered citations and the list of sources a reply used.'),
      component('Reasoning Effort', 'A pill slider for how hard a model thinks before it replies.'),
      component('Prompt List', 'Starter prompts to pick from, with the apps each one uses.'),
      component('Questionnaire', 'Asks one question at a time, with choices, typed answers, and skips.'),
      component('Tool Activity', 'A live timeline of the tools an agent used, with sources.'),
      component('Typed Text', 'Text that types itself in when an agent changes it.'),
    ],
  },
  {
    title: 'Agent patterns',
    items: [
      component('Canvas', 'A resizable side panel that shows chat results in tabs.'),
      component('Message', 'Chat messages with bubbles, reactions, avatars, names, and reply status.'),
      component('Chat Input', 'A rich chat message box with @ agents, / skills, # files, and model picks.'),
      component('Mention List', 'The @ and / suggestion panel a message box drives.'),
      component('Message Actions', 'Copy, rate, regenerate, and step through versions of a chat message.'),
      component('Message Response', "Renders an assistant's Markdown reply with tables, code, and links."),
      component('Message Scroller', 'A chat history that follows new replies and pins each new turn.'),
      component('Review Card', 'Asks someone to review a draft or action before it runs.'),
    ],
  },
];

export const allPages: NavItem[] = [...guides, ...componentGroups.flatMap(group => group.items)];

export const componentCount = componentGroups.reduce((count, group) => count + group.items.length, 0);
