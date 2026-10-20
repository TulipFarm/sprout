import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import {
  SearchDialog,
  SearchFilter,
  SearchFilters,
  SearchFooter,
  SearchGroup,
  SearchHint,
  SearchInput,
  SearchItem,
  SearchItemIcon,
  SearchList,
} from '../../packages/sprout/src/components/search-dialog.js';
import { setTheme, settle, themes } from './support.js';

const Dot = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <circle cx="8" cy="8" r="5" fill="currentColor" />
  </svg>
);

const media = (
  <SearchItemIcon>
    <Dot />
  </SearchItemIcon>
);

it.each(themes)('search-dialog %s %s', async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(720, 560);
  await render(
    <SearchDialog open onOpenChange={() => {}} title="Search records" description="Find pages and actions.">
      <SearchInput value="" onValueChange={() => {}} placeholder="Search…" label="Search records" />
      <SearchFilters label="Record type">
        <SearchFilter pressed onPressedChange={() => {}} icon={<Dot />}>
          Documents only
        </SearchFilter>
        <SearchFilter pressed={false} onPressedChange={() => {}}>
          Shared with me
        </SearchFilter>
      </SearchFilters>
      <SearchList label="Results">
        <SearchGroup heading="Pages" count={2}>
          <SearchItem
            value="home"
            onSelect={() => {}}
            media={media}
            title="Home"
            meta="Document"
            detail="Edited 2 hours ago · Notes"
          />
          <SearchItem value="chats" onSelect={() => {}} media={media} title="Chats" trailing="G C" />
        </SearchGroup>
        <SearchGroup heading="Actions" count={1}>
          <SearchItem value="new-chat" onSelect={() => {}} media={media} title="New chat" trailing="C" />
        </SearchGroup>
      </SearchList>
      <SearchFooter>
        <SearchHint keys="↑↓">Select</SearchHint>
        <SearchHint keys="↵">Open</SearchHint>
        <SearchHint keys="Esc">Close</SearchHint>
      </SearchFooter>
    </SearchDialog>,
  );
  await settle();
  await expect.element(page.elementLocator(document.body)).toMatchScreenshot(`search-dialog-${theme}-${mode}`);
});
