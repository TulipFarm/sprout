import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Button } from "../../packages/sprout/src/components/button.js";
import {
  FileViewer,
  type ViewableFile,
} from "../../packages/sprout/src/components/file-viewer.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const local = (
  name: string,
  type: string,
  parts: BlobPart[],
): ViewableFile => ({
  name,
  mediaType: type,
  source: { kind: "local", file: new File(parts, name, { type }) },
});

const notes = local("Harvest notes.txt", "text/plain", [
  "Harvest notes\nBed 2 tomatoes are ready on Friday.\n",
]);

/** A real PNG, so the browser has something to decode. */
async function png(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#188038";
  context.fillRect(0, 0, width, height);
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((value) => resolve(value!), "image/png"),
  );
  return local("Greenhouse layout.png", "image/png", [blob]);
}

function Viewer({
  file,
  panel = false,
  defaultOpen = false,
}: {
  file: ViewableFile;
  panel?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Inspect {file.name}</Button>
      <FileViewer
        file={file}
        open={open}
        onOpenChange={setOpen}
        panel={
          panel ? <p style={{ padding: 16 }}>Shared with Ana</p> : undefined
        }
        panelLabel="Details"
      />
    </>
  );
}

const dialog = () => page.getByRole("dialog");
const css = (node: Element) => getComputedStyle(node);
const header = () =>
  document.querySelector<HTMLElement>('[data-slot="file-viewer-header"]')!;

/** The dialog sits inside the viewport and nothing in the header spills. */
function fits() {
  const rect = dialog().element().getBoundingClientRect();
  return {
    inside:
      rect.left >= 0 &&
      rect.right <= innerWidth + 1 &&
      rect.bottom <= innerHeight + 1,
    header: header().scrollWidth <= header().clientWidth + 1,
  };
}

describe("FileViewer in a real browser", () => {
  it.each(themes)("%s %s passes axe with a file open", async (theme, mode) => {
    setTheme(theme, mode);
    await render(<Viewer file={notes} defaultOpen />);
    await expect.element(dialog().getByText(/Bed 2 tomatoes/)).toBeVisible();
    await settle();
    expect(await axeViolations(document.body)).toEqual([]);
    expect(fits()).toEqual({ inside: true, header: true });
  });

  it("opens and closes from the keyboard and returns focus", async () => {
    const screen = await render(<Viewer file={notes} />);
    const trigger = screen.getByRole("button", {
      name: "Inspect Harvest notes.txt",
    });
    (trigger.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("dialog", { name: "Harvest notes.txt" }))
      .toBeVisible();
    await expect.element(dialog().getByText(/Bed 2 tomatoes/)).toBeVisible();
    const download = dialog().getByRole("link", { name: "Download" });
    expect(download.element().getAttribute("href")).toMatch(/^blob:/);
    expect(download.element().getAttribute("download")).toBe(
      "Harvest notes.txt",
    );
    const close = dialog()
      .getByRole("button", { name: "Close file viewer" })
      .element();
    for (let step = 0; step < 10 && document.activeElement !== close; step++)
      await userEvent.tab();
    await expect.element(page.elementLocator(close)).toHaveFocus();
    expect(css(close).outlineStyle).toBe("solid");
    await userEvent.keyboard("{Enter}");
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await expect.element(dialog()).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it("images decode, fit the stage, and zoom to actual size", async () => {
    await render(<Viewer file={await png(2000, 400)} defaultOpen />);
    const image = dialog().getByRole("img", { name: "Greenhouse layout.png" });
    await expect.element(image).toHaveAttribute("data-state", "ready");
    await settle();
    const stage = document.querySelector(".sprout-file-image-stage")!;
    const fit = image.element().getBoundingClientRect().width;
    expect(fit).toBeLessThan(2000);
    expect(fit).toBeLessThanOrEqual(stage.clientWidth);
    expect(css(image.element()).opacity).toBe("1");

    const zoom = dialog().getByRole("button", { name: "Actual size" });
    (zoom.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(dialog().getByRole("button", { name: "Fit image" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(image.element().getBoundingClientRect().width).toBe(2000);
    const region = dialog().getByRole("region", {
      name: "Greenhouse layout.png at actual size",
    });
    await userEvent.tab();
    await expect.element(region).toHaveFocus();
    expect(css(region.element()).outlineStyle).toBe("solid");
    expect(region.element().scrollWidth).toBeGreaterThan(
      region.element().clientWidth,
    );
  });

  it("explains an image the browser cannot decode", async () => {
    await render(
      <Viewer
        file={local("Brand mark.png", "image/png", ["not an image"])}
        defaultOpen
      />,
    );
    await expect
      .element(dialog().getByText(/could not decode this image/))
      .toBeVisible();
  });

  it("the details panel opens beside the file on wide screens", async () => {
    await render(<Viewer file={notes} panel defaultOpen />);
    const panel = page.getByRole("complementary", { name: "Details" });
    await expect.element(panel).toBeVisible();
    await expect
      .element(dialog().getByRole("button", { name: "Details" }))
      .toHaveAttribute("aria-expanded", "true");
    const surface = document
      .querySelector('[data-slot="viewable-file-content"]')!
      .getBoundingClientRect();
    const box = panel.element().getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(surface.right - 1);
    expect(box.width).toBeGreaterThanOrEqual(288);
    expect(box.width).toBeLessThanOrEqual(384);
  });

  it("fits a 390px phone and starts with the panel closed", async () => {
    await page.viewport(390, 844);
    await render(<Viewer file={notes} panel defaultOpen />);
    await expect.element(dialog().getByText(/Bed 2 tomatoes/)).toBeVisible();
    await settle();
    expect(fits()).toEqual({ inside: true, header: true });
    const download = dialog().getByRole("link", { name: "Download" });
    expect(download.element().getBoundingClientRect().width).toBe(28);
    expect(
      css(download.element().querySelector(".sprout-file-viewer-label")!)
        .display,
    ).toBe("none");
    const toggle = dialog().getByRole("button", { name: "Details" });
    await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    const panel = page.getByRole("complementary", { name: "Details" });
    await expect.element(panel).toBeVisible();
    await expect
      .poll(() => panel.element().getBoundingClientRect().right)
      .toBeLessThanOrEqual(391);
    expect(panel.element().getBoundingClientRect().left).toBeGreaterThanOrEqual(
      0,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  });

  it("reduced motion stops the panel and image fades", async () => {
    await emulate({ reducedMotion: true });
    await render(<Viewer file={await png(320, 200)} panel defaultOpen />);
    const image = dialog().getByRole("img", { name: "Greenhouse layout.png" });
    await expect.element(image).toHaveAttribute("data-state", "ready");
    expect(css(image.element()).transitionDuration).toBe("0s");
    const panel = page.getByRole("complementary", { name: "Details" });
    expect(css(panel.element()).animationName).toBe("none");
  });
});
