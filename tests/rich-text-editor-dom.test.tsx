// @vitest-environment jsdom
import { act, render, waitFor } from "@testing-library/react";
import type { Editor } from "@tiptap/core";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  RichTextEditor,
  type RichTextEditorHandle,
  type RichTextEditorProps,
  type RichTextValue,
} from "../packages/sprout/src/components/rich-text-editor.js";

const doc = (...content: RichTextValue[]): RichTextValue => ({
  type: "doc",
  content,
});
const p = (text?: string): RichTextValue => ({
  type: "paragraph",
  ...(text ? { content: [{ type: "text", text }] } : {}),
});

async function setup(props: Partial<RichTextEditorProps> = {}) {
  const ref = createRef<RichTextEditorHandle>();
  const onChange = vi.fn();
  const onSend = vi.fn();
  const element = (extra: Partial<RichTextEditorProps> = {}) => (
    <RichTextEditor
      ref={ref}
      value={doc(p())}
      onChange={onChange}
      onSend={onSend}
      {...props}
      {...extra}
    />
  );
  const view = render(element());
  await waitFor(() => expect(ref.current?.editor()).toBeTruthy());
  const editor = ref.current!.editor()!;
  return {
    ref,
    editor,
    onChange,
    onSend,
    rerender: (extra: Partial<RichTextEditorProps>) =>
      view.rerender(element(extra)),
  };
}

function press(editor: Editor, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    cancelable: true,
    ...init,
  });
  let handled = false;
  act(() => {
    handled = !!editor.view.props.handleKeyDown!(editor.view, event);
  });
  return handled;
}

function type(editor: Editor, text: string) {
  act(() => {
    for (const char of text) {
      const { from, to } = editor.state.selection;
      const handled = editor.view.someProp("handleTextInput", (f) =>
        f(editor.view, from, to, char, () =>
          editor.state.tr.insertText(char, from, to),
        ),
      );
      if (!handled)
        editor.view.dispatch(editor.state.tr.insertText(char, from, to));
    }
  });
}

function paste(editor: Editor, text: string) {
  const event = {
    clipboardData: { getData: () => text },
  } as unknown as ClipboardEvent;
  let handled = false;
  act(() => {
    const plugin = editor.state.plugins.find((p) =>
      (p as unknown as { key: string }).key.startsWith(
        "markdownCodeFencePaste",
      ),
    )!;
    handled = !!plugin.props.handlePaste!.call(
      plugin,
      editor.view,
      event,
      editor.state.doc.slice(0),
    );
  });
  return handled;
}

const types = (editor: Editor) =>
  editor.getJSON().content?.map((n) => [n.type, n.attrs?.language ?? null]);

describe("RichTextEditor in the DOM", () => {
  it("exposes focus, the editor, and setContent through the ref", async () => {
    const { ref, onChange } = await setup({
      ariaDescribedBy: "hint",
      ariaControls: "list",
      ariaActiveDescendant: "opt",
    });
    act(() => ref.current!.focus());
    act(() => ref.current!.setContent(doc(p("Hello"))));
    expect(onChange).toHaveBeenLastCalledWith(doc(p("Hello")));
    const box = document.querySelector("[role='textbox']")!;
    expect(box.getAttribute("aria-describedby")).toBe("hint");
    expect(box.getAttribute("aria-controls")).toBe("list");
    expect(box.getAttribute("aria-activedescendant")).toBe("opt");
  });

  it("sends on Enter and Cmd+Enter but not on Shift+Enter or while composing", async () => {
    const { editor, onSend, rerender } = await setup();
    expect(press(editor, "Enter")).toBe(true);
    expect(press(editor, "Enter", { metaKey: true })).toBe(true);
    expect(press(editor, "Enter", { ctrlKey: true })).toBe(true);
    expect(press(editor, "Enter", { shiftKey: true })).toBe(false);
    expect(press(editor, "Enter", { isComposing: true })).toBe(false);
    expect(press(editor, "a")).toBe(false);
    expect(onSend).toHaveBeenCalledTimes(3);
    rerender({ ariaExpanded: true });
    expect(press(editor, "Enter")).toBe(false);
  });

  it("keeps Enter for lists, code blocks, and fence lines", async () => {
    const { editor, onSend, rerender } = await setup();
    rerender({
      value: doc({
        type: "bulletList",
        content: [{ type: "listItem", content: [p("one")] }],
      }),
    });
    act(() => editor.commands.setTextSelection(4));
    expect(press(editor, "Enter")).toBe(false);
    rerender({
      value: doc({ type: "codeBlock", content: [{ type: "text", text: "x" }] }),
    });
    act(() => editor.commands.setTextSelection(1));
    expect(press(editor, "Enter")).toBe(false);
    rerender({ value: doc(p("```ts")) });
    act(() => editor.commands.setTextSelection(6));
    expect(press(editor, "Enter")).toBe(false);
    act(() => editor.commands.setTextSelection({ from: 1, to: 3 }));
    expect(press(editor, "Enter")).toBe(true);
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("follows the value, placeholder, and disabled props", async () => {
    const { editor, rerender } = await setup();
    rerender({ value: doc(p("Next")) });
    expect(editor.getText()).toBe("Next");
    rerender({ value: doc(p("Next")), placeholder: "Write…", disabled: true });
    expect(editor.isEditable).toBe(false);
  });

  it("turns a typed fence into a code block, also after a line break", async () => {
    const { editor, rerender } = await setup();
    act(() => editor.commands.focus("end"));
    type(editor, "```js ");
    expect(types(editor)[0]).toEqual(["codeBlock", "js"]);

    rerender({
      value: doc({
        type: "paragraph",
        content: [{ type: "text", text: "hi" }, { type: "hardBreak" }],
      }),
    });
    act(() => editor.commands.focus("end"));
    type(editor, "``` ");
    expect(types(editor).slice(0, 2)).toEqual([
      ["paragraph", null],
      ["codeBlock", null],
    ]);

    rerender({ value: doc(p("a")) });
    act(() => editor.commands.focus("end"));
    type(editor, "```py ");
    expect(types(editor)).not.toContainEqual(["codeBlock", "py"]);
  });

  it("skips the fence rule in the middle of a paragraph", async () => {
    const { editor, rerender } = await setup();
    rerender({ value: doc(p("ab")) });
    act(() => editor.commands.setTextSelection(2));
    type(editor, "```go ");
    expect(types(editor)).not.toContainEqual(["codeBlock", "go"]);
  });

  it("pastes markdown fences as code blocks", async () => {
    const { editor, rerender } = await setup();
    act(() => editor.commands.focus("end"));
    expect(paste(editor, "plain text")).toBe(false);
    expect(
      paste(
        editor,
        "intro\r\n```ts\nconst a = 1;\n```\n\n~~~ bad!lang\n~~~\nouter\n````\n",
      ),
    ).toBe(true);
    expect(types(editor).slice(0, 5)).toEqual([
      ["paragraph", null],
      ["codeBlock", "ts"],
      ["codeBlock", null],
      ["paragraph", null],
      ["codeBlock", null],
    ]);

    rerender({ value: doc(p()) });
    act(() => editor.commands.focus("end"));
    expect(paste(editor, "```\ncode")).toBe(true);
    expect(types(editor)[0]).toEqual(["codeBlock", null]);
    act(() => editor.commands.setTextSelection(2));
    expect(paste(editor, "```\nmore")).toBe(false);
  });

  it("drops a stored link mark once the linked text is deleted", async () => {
    const link = (text: string) => ({
      type: "text",
      text,
      marks: [{ type: "link", attrs: { href: "https://x.test" } }],
    });
    const { editor, rerender } = await setup();
    rerender({ value: doc({ type: "paragraph", content: [link("a")] }) });
    const mark = editor.schema.marks.link!.create({ href: "https://x.test" });
    act(() => {
      editor.view.dispatch(editor.state.tr.delete(1, 2).addStoredMark(mark));
    });
    expect(editor.state.storedMarks ?? []).toEqual([]);

    rerender({ value: doc({ type: "paragraph", content: [link("abc")] }) });
    act(() => editor.commands.setTextSelection(2));
    act(() => {
      editor.view.dispatch(editor.state.tr.delete(2, 3).addStoredMark(mark));
    });

    act(() => {
      editor.view.dispatch(editor.state.tr.insertText("z", 1));
    });
  });
});
