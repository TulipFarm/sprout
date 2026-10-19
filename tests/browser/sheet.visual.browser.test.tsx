import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../packages/sprout/src/components/sheet.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("sheet %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  await page.viewport(640, 420);
  await render(
    <Sheet open>
      <SheetContent showSwipeHandle>
        <SheetHeader>
          <SheetTitle>Pending work</SheetTitle>
          <SheetDescription>
            Tasks and approvals that need your attention.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <p style={{ margin: 0 }}>
            Harbor Foods asked to move the spring bulb delivery to Thursday
            morning.
          </p>
        </SheetBody>
        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          <SheetClose render={<Button />}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>,
  );
  await settle();
  await expect
    .element(page.elementLocator(document.body))
    .toMatchScreenshot(`sheet-${theme}-${mode}`);
});
