import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../packages/sprout/src/components/accordion.js";
import { setTheme, settle, themes } from "./support.js";

it.each(themes)("accordion %s %s", async (theme, mode) => {
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{ width: 360, padding: 16, background: "var(--sprout-canvas)" }}
    >
      <Accordion multiple defaultValue={["what", "quiet"]}>
        <AccordionItem value="what">
          <AccordionTrigger>What is this example?</AccordionTrigger>
          <AccordionContent>
            <p>Real shared components.</p>
            <p>
              Read about <a href="#knowledge">Automatic Knowledge</a>.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="more">
          <AccordionTrigger>Can I open more than one?</AccordionTrigger>
          <AccordionContent>Only in multiple mode.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="off" disabled>
          <AccordionTrigger>Disabled item</AccordionTrigger>
          <AccordionContent>Unavailable</AccordionContent>
        </AccordionItem>
        <AccordionItem value="quiet">
          <AccordionTrigger variant="quiet">Google calendars</AccordionTrigger>
          <AccordionContent>Work, Personal</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>,
  );
  await settle();
  await expect
    .element(screen.getByTestId("shot"))
    .toMatchScreenshot(`accordion-${theme}-${mode}`);
});
