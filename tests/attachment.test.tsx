import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentDropzone,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
  FileAttachment,
  FileTypeIcon,
  LocalFileAttachment,
  attachmentGroupVariantNames,
  attachmentOrientationNames,
  attachmentSizeNames,
  attachmentStateNames,
  fileAttachmentStateNames,
  fileAttachmentVariantNames,
  fileTypeIconSizeNames,
  type AttachmentFile,
} from "../packages/sprout/src/components/attachment.js";
import * as sprout from "../packages/sprout/src/index.js";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../packages/sprout/src/styles/attachment.css");

const file = (overrides: Partial<AttachmentFile> = {}): AttachmentFile => ({
  id: "policy",
  name: "Returns policy.pdf",
  mediaType: "application/pdf",
  size: "212 KB",
  state: "ready",
  ...overrides,
});

describe("Attachment", () => {
  it("is exported from the package root and its subpath", () => {
    for (const name of [
      "Attachment",
      "AttachmentAction",
      "AttachmentActions",
      "AttachmentContent",
      "AttachmentDescription",
      "AttachmentDropzone",
      "AttachmentGroup",
      "AttachmentMedia",
      "AttachmentTitle",
      "AttachmentTrigger",
      "FileAttachment",
      "FileTypeIcon",
      "LocalFileAttachment",
    ])
      expect(sprout).toHaveProperty(name);
    const manifest = JSON.parse(read("../packages/sprout/package.json"));
    expect(manifest.exports["./attachment"]).toEqual({
      types: "./dist/components/attachment.d.ts",
      import: "./dist/components/attachment.js",
    });
    expect(read("../packages/sprout/src/styles/index.css")).toContain(
      '@import "./attachment.css";',
    );
  });

  it("lists every Cloud variant, size, and state", () => {
    expect(attachmentStateNames).toEqual([
      "idle",
      "uploading",
      "processing",
      "error",
      "done",
    ]);
    expect(attachmentSizeNames).toEqual(["default", "sm", "xs"]);
    expect(attachmentOrientationNames).toEqual(["horizontal", "vertical"]);
    expect(attachmentGroupVariantNames).toEqual([
      "carousel",
      "grid",
      "inline",
      "list",
    ]);
    expect(fileAttachmentVariantNames).toEqual([
      "list",
      "grid",
      "inline",
      "chip",
    ]);
    expect(fileAttachmentStateNames).toEqual([
      "ready",
      "uploading",
      "processing",
      "error",
    ]);
    expect(fileTypeIconSizeNames).toEqual(["sm", "lg"]);
  });

  it("renders parts with state, size, and orientation", () => {
    for (const state of attachmentStateNames)
      for (const size of attachmentSizeNames)
        for (const orientation of attachmentOrientationNames) {
          const html = renderToString(
            <Attachment state={state} size={size} orientation={orientation}>
              <AttachmentMedia variant="image">
                <img src="/a.png" alt="" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>Price list 2026.xlsx</AttachmentTitle>
                <AttachmentDescription>48 KB</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label="Remove Price list 2026.xlsx">
                  x
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>,
          );
          expect(html).toContain(`data-state="${state}"`);
          expect(html).toContain(`data-size="${size}"`);
          expect(html).toContain(`data-orientation="${orientation}"`);
          expect(html).toContain(`sprout-attachment-size-${size}`);
          expect(html).toContain(`sprout-attachment-${orientation}`);
          expect(html).toContain('data-slot="attachment-media"');
          expect(html).toContain('data-variant="image"');
          expect(html).toContain('data-slot="attachment-action"');
          expect(html).toContain('aria-label="Remove Price list 2026.xlsx"');
        }
    expect(renderToString(<Attachment />)).toContain('data-state="done"');
    expect(renderToString(<AttachmentMedia />)).toContain(
      'data-variant="icon"',
    );
  });

  it("renders a trigger as a button, or through render", () => {
    const html = renderToString(<AttachmentTrigger aria-label="Open deck" />);
    expect(html).toMatch(/^<button/);
    expect(html).toContain('type="button"');
    expect(html).toContain('data-slot="attachment-trigger"');
    const link = renderToString(
      <AttachmentTrigger
        render={<a href="/files/1" />}
        aria-label="Open deck"
      />,
    );
    expect(link).toMatch(/^<a/);
    expect(link).toContain('href="/files/1"');
    expect(link).not.toContain("type=");
  });

  it("draws file type icons with an extension badge per kind", () => {
    const cases = [
      ["Returns policy.pdf", "application/pdf", "pdf", "PDF"],
      ["Price list 2026.xlsx", "", "sheet", "XLSX"],
      ["tasks.csv", "text/csv", "sheet", "CSV"],
      ["Onboarding checklist.docx", "", "document", "DOCX"],
      ["Q3 launch deck.pptx", "", "slides", "PPTX"],
      ["photo.png", "image/png", "image", "PNG"],
      ["data.json", "", "json", "JSON"],
      ["notes.txt", "text/plain", "text", "TXT"],
      ["plan.md", "", "markdown", "MD"],
      [
        "Sheet.gsheet",
        "application/vnd.google-apps.spreadsheet",
        "google",
        "GSHE",
      ],
      ["export.zip", "application/zip", "unsupported", "ZIP"],
    ] as const;
    for (const [name, mediaType, kind, label] of cases) {
      const html = renderToString(
        <FileTypeIcon name={name} mediaType={mediaType} />,
      );
      expect(html).toContain(`data-kind="${kind}"`);
      expect(html).toContain(`>${label}</text>`);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('data-size="sm"');
    }
    const empty = renderToString(
      <FileTypeIcon name="" mediaType="" size="lg" />,
    );
    expect(empty).not.toContain("<text");
    expect(empty).toContain("sprout-file-type-icon-size-lg");
  });

  it("names each file attachment's controls and states", () => {
    for (const variant of fileAttachmentVariantNames) {
      const ready = renderToString(
        <FileAttachment
          variant={variant}
          file={file()}
          onOpen={() => undefined}
          onRemove={() => undefined}
        />,
      );
      expect(ready).toContain(`data-variant="${variant}"`);
      expect(ready).toContain('aria-label="Inspect Returns policy.pdf"');
      expect(ready).toContain('aria-label="Remove Returns policy.pdf"');
      if (variant !== "inline" && variant !== "chip")
        expect(ready).toContain("212 KB");

      const failed = renderToString(
        <FileAttachment
          variant={variant}
          file={file({ state: "error" })}
          onOpen={() => undefined}
          onRetry={() => undefined}
        />,
      );
      expect(failed).toContain('data-state="error"');
      expect(failed).toContain('aria-label="Retry Returns policy.pdf"');

      for (const [state, label] of [
        ["uploading", "Uploading…"],
        ["processing", "Processing…"],
      ] as const) {
        const busy = renderToString(
          <FileAttachment
            variant={variant}
            file={file({ state })}
            onOpen={() => undefined}
          />,
        );
        expect(busy).toContain(label);
        expect(busy).toMatch(/<button[^>]*disabled=""/);
      }
    }
  });

  it("shows grid status, chip size titles, and a download label", () => {
    const grid = renderToString(
      <FileAttachment
        variant="grid"
        file={file({ state: "error" })}
        onOpen={() => undefined}
      />,
    );
    expect(grid).toContain("Upload failed");
    expect(grid).toContain('tabindex="-1"');
    const chip = renderToString(
      <FileAttachment
        variant="chip"
        actionLabel="Download"
        file={file({ size: "Google Drive" })}
        onOpen={() => undefined}
      />,
    );
    expect(chip).toContain('aria-label="Download Returns policy.pdf"');
    expect(chip).toContain('title="Returns policy.pdf · Google Drive"');
    const inline = renderToString(
      <FileAttachment variant="inline" file={file({ state: "error" })} />,
    );
    expect(inline).toContain("Failed");
  });

  it("renders the name as text when it cannot open", () => {
    const html = renderToString(
      <FileAttachment variant="chip" file={file()} />,
    );
    expect(html).not.toContain("<button");
    expect(html).toContain("Returns policy.pdf");
    const sourceless = renderToString(
      <FileAttachment variant="chip" file={file()} viewable />,
    );
    expect(sourceless).not.toContain("<button");
  });

  it("opens a file with a source in the built-in viewer, closed until clicked", () => {
    for (const variant of ["chip", "list", "grid", "inline"] as const) {
      const html = renderToString(
        <FileAttachment
          variant={variant}
          file={file({ url: "/policy.pdf" })}
          viewable
        />,
      );
      expect(html).toContain('aria-label="Inspect Returns policy.pdf"');
      expect(html).not.toContain("data-file-viewer");
    }
  });

  it("previews images, text, and code on hover, but not other files or failed uploads", () => {
    const peek = (overrides: Partial<AttachmentFile>) =>
      renderToString(
        <FileAttachment
          file={file({ url: "/f", ...overrides })}
          preview
          viewable
        />,
      );
    for (const name of [
      "score_lead.py",
      "notes.txt",
      "README.md",
      "order.json",
      "photo.png",
    ])
      expect(peek({ name, mediaType: "" })).toContain(
        'data-slot="hover-card-trigger"',
      );
    expect(peek({})).not.toContain("hover-card-trigger");
    expect(
      peek({ name: "main.go", mediaType: "", state: "error" }),
    ).not.toContain("hover-card-trigger");
    const plain = renderToString(
      <FileAttachment
        file={file({ name: "main.go", mediaType: "", url: "/f" })}
        preview
      />,
    );
    expect(plain).toContain('data-slot="hover-card-trigger"');
    expect(plain).not.toContain("<button");
  });

  it("shows image previews", () => {
    const html = renderToString(
      <FileAttachment
        variant="list"
        file={file({
          name: "Storefront.png",
          mediaType: "image/png",
          url: "/s.png",
        })}
      />,
    );
    expect(html).toContain('src="/s.png"');
    expect(html).toContain('alt="Storefront.png"');
  });

  it("lays out groups, with a labelled carousel", () => {
    for (const variant of attachmentGroupVariantNames) {
      const html = renderToString(
        <AttachmentGroup variant={variant} aria-label="Attached files">
          <FileAttachment variant="chip" file={file()} />
          <FileAttachment
            variant="chip"
            file={file({ id: "b", name: "b.txt" })}
          />
        </AttachmentGroup>,
      );
      if (variant === "carousel") {
        expect(html).toContain('role="region"');
        expect(html).toContain('aria-roledescription="carousel"');
        expect(html).toContain('aria-label="Attached files"');
        expect(html.match(/role="group"/g)).toHaveLength(2);
      } else {
        expect(html).toContain(`data-variant="${variant}"`);
        expect(html).toContain(`sprout-attachment-group-${variant}`);
      }
    }
  });

  it("renders a drop zone with a hidden multiple file input", () => {
    const html = renderToString(
      <AttachmentDropzone accept=".txt,.md" onFiles={() => undefined} />,
    );
    expect(html).toContain('type="file"');
    expect(html).toContain('accept=".txt,.md"');
    expect(html).toContain("multiple");
    expect(html).toContain("Choose files");
    const disabled = renderToString(
      <AttachmentDropzone disabled onFiles={() => undefined} />,
    );
    expect(disabled).toContain("data-disabled");
    expect(disabled).toMatch(/<button[^>]*disabled=""/);
    expect(disabled).toContain("image/*");
  });

  it("shows a local file as a chip with its size", () => {
    const local = new File(["x".repeat(2048)], "garden-notes.txt", {
      type: "text/plain",
    });
    const html = renderToString(
      <LocalFileAttachment file={local} onRemove={() => undefined} />,
    );
    expect(html).toContain('data-variant="chip"');
    expect(html).toContain("garden-notes.txt");
    expect(html).toContain('aria-label="Remove garden-notes.txt"');
  });

  it("uses Sprout tokens and respects reduced motion", () => {
    expect(css).toContain("--sprout-file-pdf");
    expect(css).toContain(".dark");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("forced-colors");
    expect(css).toContain("var(--sprout-motion-");
  });
});
