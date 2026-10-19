import { useState } from "react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
  type AlertDialogSize,
} from "../../packages/sprout/src/components/alert-dialog.js";
import { Button } from "../../packages/sprout/src/components/button.js";
import { axeViolations, emulate, setTheme, settle, themes } from "./support.js";

const Trash = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 4h10M6 4V2h4v2M4 4l1 10h6l1-10" stroke="currentColor" />
  </svg>
);

function Confirm({
  size = "default",
  defaultOpen = false,
  onConfirm,
}: {
  size?: AlertDialogSize;
  defaultOpen?: boolean;
  onConfirm?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete file
      </AlertDialogTrigger>
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Q3 supplier contracts.pdf?</AlertDialogTitle>
          <AlertDialogDescription>
            The file leaves Files for everyone in Field operations. It stays
            recoverable for 30 days.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep file</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false);
              onConfirm?.();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const dialog = () => page.getByRole("alertdialog");
const popup = () =>
  document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
const slot = (name: string) =>
  popup().querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

/** Dialog stays inside the viewport and nothing inside it overflows sideways. */
function fits(node: HTMLElement) {
  const box = node.getBoundingClientRect();
  const inside = [...node.querySelectorAll("*")].every((child) => {
    const rect = child.getBoundingClientRect();
    return (
      !rect.width || (rect.left >= box.left - 1 && rect.right <= box.right + 1)
    );
  });
  const buttons = [...node.querySelectorAll("button")].every(
    (button) => button.scrollWidth <= button.clientWidth + 1,
  );
  return {
    inViewport:
      box.left >= 0 &&
      box.right <= innerWidth + 0.5 &&
      box.bottom <= innerHeight + 0.5,
    inside,
    buttons,
    noScroll: node.scrollWidth <= node.clientWidth + 1,
  };
}
const fitting = {
  inViewport: true,
  inside: true,
  buttons: true,
  noScroll: true,
};

describe("AlertDialog in a real browser", () => {
  it.each(themes)("%s %s passes axe while open", async (theme, mode) => {
    setTheme(theme, mode);
    await render(<Confirm defaultOpen />);
    await expect.element(dialog()).toBeVisible();
    await settle();
    expect(await axeViolations()).toEqual([]);
  });

  for (const width of [390, 1280])
    for (const size of ["default", "sm"] as const)
      it(`${size} lays out media, title and footer at ${width}px`, async () => {
        await page.viewport(width, 900);
        await render(<Confirm size={size} defaultOpen />);
        await expect.element(dialog()).toHaveAttribute("data-size", size);
        await settle();
        expect(fits(popup())).toEqual(fitting);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        const box = popup().getBoundingClientRect();
        const wide = size === "default" && width >= 640;
        expect(box.width).toBe(wide ? 384 : 320);
        const media = slot("alert-dialog-media").getBoundingClientRect();
        const title = slot("alert-dialog-title").getBoundingClientRect();
        if (wide) {
          expect(media.right).toBeLessThan(title.left);
          expect(Math.abs(media.top - title.top)).toBeLessThan(4);
        } else {
          expect(media.bottom).toBeLessThan(title.top);
          expect(
            Math.abs(media.left + media.width / 2 - (box.left + box.width / 2)),
          ).toBeLessThan(1);
        }
        const [cancel, action] = [
          ...slot("alert-dialog-footer").querySelectorAll("button"),
        ].map((button) => button.getBoundingClientRect());
        if (size === "sm") {
          expect(Math.abs(cancel.width - action.width)).toBeLessThan(1);
          expect(cancel.top).toBe(action.top);
          expect(cancel.left).toBeLessThan(action.left);
        } else if (wide) {
          expect(cancel.top).toBe(action.top);
          expect(Math.abs(action.right - (box.right - 17))).toBeLessThan(1.5);
        } else {
          expect(action.top).toBeLessThan(cancel.top);
        }
      });

  it("keyboard opens, traps focus, ignores outside clicks, and returns focus", async () => {
    let confirmed = 0;
    const screen = await render(<Confirm onConfirm={() => confirmed++} />);
    const trigger = screen.getByRole("button", { name: "Delete file" });
    (trigger.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(dialog()).toBeVisible();
    await expect
      .element(dialog())
      .toHaveAccessibleName("Delete Q3 supplier contracts.pdf?");
    const cancel = page.getByRole("button", { name: "Keep file" });
    const confirm = page.getByRole("button", {
      name: "Delete",
      exact: true,
    });
    await expect.element(cancel).toHaveFocus();
    await userEvent.tab();
    await expect.element(confirm).toHaveFocus();
    await userEvent.tab();
    await expect.element(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect.element(confirm).toHaveFocus();
    await page
      .elementLocator(
        document.querySelector('[data-slot="alert-dialog-overlay"]')!,
      )
      .click({ position: { x: 10, y: 10 }, force: true });
    await expect.element(dialog()).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect.element(dialog()).toBeVisible();
    await userEvent.keyboard("{Enter}");
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(cancel).toHaveFocus();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect.element(dialog()).not.toBeInTheDocument();
    expect(confirmed).toBe(1);
  });

  it("opens with a 180ms transition and reduced motion removes it", async () => {
    const screen = await render(<Confirm />);
    const trigger = screen.getByRole("button", { name: "Delete file" });
    await trigger.click();
    await expect.element(dialog()).toBeVisible();
    expect(getComputedStyle(popup()).transitionDuration).toBe("0.18s, 0.18s");
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog()).not.toBeInTheDocument();
    await emulate({ reducedMotion: true });
    await trigger.click();
    await expect.element(dialog()).toBeVisible();
    expect(getComputedStyle(popup()).transitionDuration).toBe("0s");
    expect(
      getComputedStyle(
        document.querySelector('[data-slot="alert-dialog-overlay"]')!,
      ).transitionDuration,
    ).toBe("0s");
  });
});
