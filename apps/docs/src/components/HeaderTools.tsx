import { useEffect, useState } from "react";
import { navigate } from "astro:transitions/client";
import { Popover } from "@base-ui/react/popover";
import { Search } from "reicon-react/icons/Search";
import { DocumentText } from "reicon-react/icons/DocumentText";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { Check } from "reicon-react/icons/Check";
import { Moon } from "reicon-react/icons/Moon";
import { Sun } from "reicon-react/icons/Sun";
import { Shuffle } from "reicon-react/icons/Shuffle";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@tulipfarm/sprout/command";
import { componentGroups, guides } from "../data/nav";
import {
  allThemes,
  brandThemes,
  sproutThemes,
  type ThemeEntry,
} from "../data/themes";
import "../styles/docs-select.css";

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function SearchPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Window listener runs after document listeners, so the Command demo's own ⌘K wins on its page.
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const typing = (event.target as HTMLElement | null)?.closest(
        "input, textarea, [contenteditable='true']",
      );
      if (
        (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "/" && !typing)
      ) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };
  return (
    <>
      <button
        type="button"
        className="docs-search-trigger"
        aria-label="Search components"
        onClick={() => setOpen(true)}
      >
        <Search size={15} aria-hidden="true" />
        <span className="docs-search-label">Search components…</span>
        <kbd aria-hidden="true">⌘K</kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search documentation"
        description="Jump to a guide or component."
      >
        <Command label="Search documentation">
          <CommandInput placeholder="Search components and guides…" />
          <CommandList>
            <CommandEmpty>No pages match that search.</CommandEmpty>
            <CommandGroup heading="Guides">
              {guides.map((page) => (
                <CommandItem
                  key={page.href}
                  onSelect={() => go(page.href)}
                  keywords={[page.description]}
                >
                  <DocumentText size={16} aria-hidden="true" />
                  {page.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {componentGroups.map((group) => (
              <CommandGroup key={group.title} heading={group.title}>
                {group.items.map((page) => (
                  <CommandItem
                    key={page.href}
                    onSelect={() => go(page.href)}
                    keywords={[group.title, page.description]}
                  >
                    <span className="docs-search-dot" aria-hidden="true" />
                    {page.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

function Swatches({ slug }: { slug: string }) {
  return (
    <span
      className="docs-theme-swatches"
      data-sprout-theme={slug}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function ThemePicker() {
  const [theme, setTheme] = useState("neutral");
  const [open, setOpen] = useState(false);
  useEffect(() => setTheme(read("sprout-docs-theme", "neutral")), []);
  const current =
    allThemes.find((item) => item.slug === theme) ?? allThemes[0]!;
  const preview = (slug: string) => {
    document.documentElement.dataset.sproutTheme = slug;
  };
  const apply = (slug: string) => {
    setTheme(slug);
    write("sprout-docs-theme", slug);
    document.documentElement.dataset.sproutTheme = slug;
  };
  const shuffle = () => {
    const others = allThemes.filter((item) => item.slug !== theme);
    apply(others[Math.floor(Math.random() * others.length)]!.slug);
  };
  const item = (entry: ThemeEntry) => (
    <CommandItem
      key={entry.slug}
      value={entry.name}
      onPointerEnter={() => preview(entry.slug)}
      onSelect={() => {
        apply(entry.slug);
        setOpen(false);
      }}
    >
      <Swatches slug={entry.slug} />
      <span className="docs-theme-name">{entry.name}</span>
      {entry.slug === theme && <Check size={14} aria-hidden="true" />}
    </CommandItem>
  );
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) preview(theme);
      }}
    >
      <Popover.Trigger
        className="docs-select-trigger docs-theme-trigger"
        aria-label={`Site theme, ${current.name}`}
      >
        <Swatches slug={current.slug} />
        <span className="docs-select-value">{current.name}</span>
        <span className="docs-select-chevron">
          <ChevronDown size={14} aria-hidden="true" />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="docs-select-positioner"
          sideOffset={6}
          align="end"
        >
          <Popover.Popup
            className="docs-select-popup docs-theme-popup"
            aria-label="Site theme"
          >
            <Command label="Site themes" loop>
              <CommandInput placeholder="Search themes…" />
              <div className="docs-theme-bar">
                <span>{allThemes.length} themes</span>
                <button
                  type="button"
                  className="docs-icon-link"
                  aria-label="Random theme"
                  title="Random theme"
                  onClick={shuffle}
                >
                  <Shuffle size={16} aria-hidden="true" />
                </button>
              </div>
              <CommandList onPointerLeave={() => preview(theme)}>
                <CommandEmpty>No themes match.</CommandEmpty>
                <CommandGroup heading="Sprõut">
                  {sproutThemes.map(item)}
                </CommandGroup>
                <CommandGroup heading="Brand themes">
                  {brandThemes.map(item)}
                </CommandGroup>
              </CommandList>
            </Command>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ModeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    setDark(
      root.classList.contains("dark") ||
        (!root.classList.contains("light") &&
          matchMedia("(prefers-color-scheme: dark)").matches),
    );
  }, []);
  const toggle = () => {
    const mode = dark ? "light" : "dark";
    setDark(!dark);
    write("sprout-docs-mode", mode);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(mode);
  };
  return (
    <button
      type="button"
      className="docs-icon-link"
      aria-label="Dark mode"
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {dark ? (
        <Sun size={16} aria-hidden="true" />
      ) : (
        <Moon size={16} aria-hidden="true" />
      )}
    </button>
  );
}

export default function HeaderTools() {
  return (
    <div className="docs-header-tools">
      <SearchPalette />
      <a
        className="docs-icon-link"
        href="https://github.com/TulipFarm/sprout"
        aria-label="Sprõut on GitHub"
      >
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
          fill="currentColor"
        >
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </a>
      <ThemePicker />
      <ModeToggle />
    </div>
  );
}
