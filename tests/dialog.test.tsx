import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  dialogPlacementNames,
  dialogSizeNames,
} from "../packages/sprout/src/components/dialog.js";
import { Button } from "../packages/sprout/src/components/button.js";

function tag(html: string, slot: string) {
  const match = html.match(
    new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`),
  );
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe("Dialog", () => {
  it("lists every size and placement Cloud uses", () => {
    expect(dialogSizeNames).toEqual(["default", "form", "split", "fullscreen"]);
    expect(dialogPlacementNames).toEqual(["center", "top"]);
  });

  it("renders a Button trigger with dialog semantics and no popup until opened", () => {
    const html = renderToString(
      <Dialog>
        <DialogTrigger render={<Button variant="destructive" size="sm" />}>
          Remove member
        </DialogTrigger>
        <DialogContent size="form">
          <DialogTitle>Remove kofi@meadow.example?</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const trigger = tag(html, "dialog-trigger");
    expect(trigger).toMatch(/^<button /);
    expect(trigger).toContain("sprout-button-variant-destructive");
    expect(trigger).toContain('aria-haspopup="dialog"');
    expect(trigger).toContain('aria-expanded="false"');
    expect(html).toContain(">Remove member</button>");
    expect(html).not.toContain("dialog-content");
  });

  it("renders header, body, and footer parts with render and className", () => {
    const html = renderToString(
      <Dialog defaultOpen>
        <DialogHeader className="sr-only">
          <span>Command Palette</span>
        </DialogHeader>
        <DialogBody render={<form id="paste-text" />}>
          <textarea rows={10} aria-label="Text" />
        </DialogBody>
        <DialogFooter>
          <p>These items are already here.</p>
          <Button variant="outline">Cancel</Button>
          <Button type="submit" form="copy-form">
            Save copy
          </Button>
        </DialogFooter>
      </Dialog>,
    );
    expect(tag(html, "dialog-header")).toContain(
      'class="sprout-dialog-header sr-only"',
    );
    const body = tag(html, "dialog-body");
    expect(body).toMatch(/^<form /);
    expect(body).toContain('id="paste-text"');
    expect(body).toContain('class="sprout-dialog-body"');
    expect(tag(html, "dialog-footer")).toContain(
      'class="sprout-dialog-footer"',
    );
    expect(html).toContain("<p>These items are already here.</p>");
    expect(html).toContain('form="copy-form"');
    expect(html).not.toContain(">Close</button>");
  });

  it("appends an outline close button to the footer on request", () => {
    const html = renderToString(
      <Dialog defaultOpen>
        <DialogFooter showCloseButton closeLabel="Close details">
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </Dialog>,
    );
    const footer = html.slice(html.indexOf('data-slot="dialog-footer"'));
    expect(footer.indexOf(">Done</button>")).toBeLessThan(
      footer.indexOf(">Close details</button>"),
    );
    expect(footer).toContain("sprout-button-variant-outline");
  });

  it("accepts every DialogContent prop combination Cloud passes", () => {
    for (const size of dialogSizeNames) {
      for (const placement of dialogPlacementNames) {
        expect(() =>
          renderToString(
            <Dialog defaultOpen>
              <DialogContent
                size={size}
                placement={placement}
                showCloseButton={size !== "fullscreen"}
                closeLabel="Close dialog"
                data-slot="search-dialog"
                finalFocus={() => null}
                className={(state) => (state.open ? "is-open" : "")}
              >
                <DialogTitle className="sr-only">Search Meadow</DialogTitle>
                <DialogDescription>
                  Search files, projects, and agents.
                </DialogDescription>
              </DialogContent>
            </Dialog>,
          ),
        ).not.toThrow();
      }
    }
  });
});
