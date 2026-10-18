import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { Dialog } from "../packages/sprout/src/components/dialog.js";
import { Command } from "../packages/sprout/src/components/command.js";
import * as sprout from "../packages/sprout/src/index.js";
import {
  SearchDialog,
  SearchEmpty,
  SearchFilter,
  SearchFilters,
  SearchFooter,
  SearchGroup,
  SearchHint,
  SearchInput,
  SearchItem,
  SearchItemIcon,
  SearchList,
} from "../packages/sprout/src/components/search-dialog.js";

const noop = () => {};

function tag(html: string, slot: string) {
  const match = html.match(
    new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`),
  );
  expect(match, slot).toBeTruthy();
  return match![0];
}

/** Dialog parts need the Dialog and Command contexts; the popup itself only renders in a browser. */
function inPalette(children: ReactNode) {
  return renderToString(
    <Dialog open>
      <Command shouldFilter={false} loop label="Jump to…">
        {children}
      </Command>
    </Dialog>,
  );
}

describe("SearchDialog", () => {
  it("is exported from the package root and its own subpath", () => {
    const pkg = JSON.parse(
      readFileSync("packages/sprout/package.json", "utf8"),
    );
    expect(pkg.exports["./search-dialog"]).toEqual({
      types: "./dist/components/search-dialog.d.ts",
      import: "./dist/components/search-dialog.js",
    });
    for (const name of [
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
    ]) {
      expect(sprout, name).toHaveProperty(name);
    }
    expect(
      readFileSync("packages/sprout/src/styles/index.css", "utf8"),
    ).toContain('@import "./search-dialog.css";');
  });

  it("renders nothing until opened", () => {
    const html = renderToString(
      <SearchDialog
        open={false}
        onOpenChange={noop}
        title="Jump to…"
        description="Find pages."
      >
        <SearchInput
          value=""
          onValueChange={noop}
          placeholder="Find a page or action…"
          label="Find a page or action"
        />
      </SearchDialog>,
    );
    expect(html).not.toContain("search-dialog");
  });

  it("renders the input as a labelled combobox with a close button", () => {
    const html = inPalette(
      <>
        <SearchInput
          value="age"
          onValueChange={noop}
          placeholder="Find a page or action…"
          label="Find a page or action"
        />
        <SearchList label="Pages and actions">{null}</SearchList>
      </>,
    );
    const input = tag(html, "command-input");
    expect(input).toContain('role="combobox"');
    expect(input).toContain('aria-label="Find a page or action"');
    expect(input).toContain('placeholder="Find a page or action…"');
    expect(input).toContain('value="age"');
    expect(tag(html, "search-input")).toContain("sprout-search-input");
    expect(html).toContain('aria-label="Close search"');
    const list = tag(html, "command-list");
    expect(list).toContain('role="listbox"');
    expect(list).toContain('aria-label="Pages and actions"');
    expect(list).toContain("sprout-search-list");
  });

  it("renders groups with counts and every item prop combination", () => {
    const html = inPalette(
      <SearchList label="Calendar results">
        <SearchGroup heading="Commands" count={1}>
          <SearchItem
            value="today"
            title="Go to today"
            media={<svg />}
            trailing="T"
            onSelect={noop}
          />
        </SearchGroup>
        <SearchGroup heading="Events in this view" count={1}>
          <SearchItem
            value="ev-1"
            title="Design standup"
            media={<svg />}
            detail="9:30 AM – 9:45 AM"
            onSelect={noop}
          />
        </SearchGroup>
        <SearchGroup heading="Records" count={1}>
          <SearchItem
            value="garden"
            title="Garden notes"
            meta="Document"
            detail="Edited 2 hours ago"
            media={
              <SearchItemIcon>
                <svg />
              </SearchItemIcon>
            }
            onSelect={noop}
          />
        </SearchGroup>
        <SearchGroup heading="Empty" count={0}>
          {null}
        </SearchGroup>
      </SearchList>,
    );
    expect(html.match(/data-slot="command-group"/g)).toHaveLength(3);
    expect(html).not.toContain(">Empty<");
    expect(html).toMatch(
      /Commands(<!-- -->)? (<!-- -->)?<span data-slot="search-group-count"[^>]*>1<\/span>/,
    );
    expect(html.match(/data-slot="command-item"/g)).toHaveLength(3);
    expect(html).toContain('data-value="today"');
    expect(tag(html, "search-item-trailing")).toBeTruthy();
    expect(html).toContain(">T</span>");
    expect(tag(html, "search-item-detail")).toBeTruthy();
    expect(html).toContain(">9:30 AM – 9:45 AM<");
    expect(tag(html, "search-item-meta")).toBeTruthy();
    expect(html).toContain(">Document<");
    expect(tag(html, "search-item-icon")).toBeTruthy();
    expect(html.match(/sprout-search-item-enter/g)).toHaveLength(3);
  });

  it("renders filters as pressed toggle buttons in a labelled group", () => {
    const html = inPalette(
      <SearchFilters label="Record type">
        <SearchFilter pressed onPressedChange={noop} icon={<svg />}>
          Documents only
        </SearchFilter>
        <SearchFilter pressed={false} onPressedChange={noop}>
          Shared with me
        </SearchFilter>
      </SearchFilters>,
    );
    const group = tag(html, "search-filters");
    expect(group).toContain('role="group"');
    expect(group).toContain('aria-label="Record type"');
    const filters = html.match(/<button[^>]*data-slot="search-filter"[^>]*>/g)!;
    expect(filters).toHaveLength(2);
    expect(filters[0]).toContain('aria-pressed="true"');
    expect(filters[0]).toContain("data-pressed");
    expect(filters[1]).toContain('aria-pressed="false"');
  });

  it("renders empty states with and without media and action", () => {
    const plain = inPalette(
      <SearchEmpty
        title="No pages or actions found"
        description="Try another page or action name."
        action={<button type="button">Clear search</button>}
      />,
    );
    expect(tag(plain, "search-empty")).toContain('role="status"');
    expect(plain).not.toContain("search-empty-tile");
    expect(plain).toContain(">Clear search<");

    const single = inPalette(
      <SearchEmpty
        media={<svg />}
        title="No matches"
        description="Try another title."
      />,
    );
    expect(single.match(/data-slot="search-empty-tile"/g)).toHaveLength(1);

    const fanned = inPalette(
      <SearchEmpty
        media={
          <>
            <svg />
            <svg />
            <svg />
          </>
        }
        title="No matches"
        description="Try another term or clear the filters."
      />,
    );
    expect(fanned.match(/data-slot="search-empty-tile"/g)).toHaveLength(3);
    expect(fanned).toContain(
      'aria-hidden="true" class="sprout-search-empty-media"',
    );
  });

  it("renders footer hints as keys", () => {
    const html = inPalette(
      <SearchFooter>
        <SearchHint keys="/">Open commands</SearchHint>
        <SearchHint keys="[ ]">Previous / next</SearchHint>
        <SearchHint keys="Esc">Close</SearchHint>
      </SearchFooter>,
    );
    expect(tag(html, "search-footer")).toMatch(/^<footer/);
    expect(html.match(/data-slot="search-hint"/g)).toHaveLength(3);
    expect(html).toContain(
      '<kbd class="sprout-search-kbd">[ ]</kbd>Previous / next',
    );
  });
});
