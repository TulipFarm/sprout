import { expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  FileAttachment,
  FileTypeIcon,
  type AttachmentFile,
} from '../../packages/sprout/src/components/attachment.js';
import { emulate, setTheme, settle, themes } from './support.js';

const file = (name: string, mediaType: string): AttachmentFile => ({
  id: name,
  name,
  mediaType,
  size: '12 KB',
  state: 'ready',
});

it.each(themes)('attachment %s %s', async (theme, mode) => {
  await emulate({ reducedMotion: true });
  setTheme(theme, mode);
  const screen = await render(
    <div
      data-testid="shot"
      style={{
        display: 'grid',
        gap: 12,
        width: 360,
        padding: 16,
        background: 'var(--sprout-canvas)',
      }}
    >
      <Attachment state="done">
        <AttachmentMedia>
          <FileTypeIcon name="Returns policy.pdf" mediaType="application/pdf" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>Returns policy.pdf</AttachmentTitle>
          <AttachmentDescription>48 KB</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
      <Attachment state="error" size="sm">
        <AttachmentMedia>
          <FileTypeIcon
            name="Supplier notes.docx"
            mediaType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>Supplier notes.docx</AttachmentTitle>
          <AttachmentDescription>Upload failed</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
      <AttachmentGroup variant="list" aria-label="Files">
        <FileAttachment file={file('Price list 2026.xlsx', 'text/csv')} onOpen={() => {}} onRemove={() => {}} />
      </AttachmentGroup>
      <AttachmentGroup variant="inline" aria-label="Chips">
        <FileAttachment variant="chip" file={file('garden-notes.txt', 'text/plain')} />
        <FileAttachment variant="chip" file={file('inventory.json', 'application/json')} />
      </AttachmentGroup>
    </div>,
  );
  await settle();
  await expect.element(screen.getByTestId('shot')).toMatchScreenshot(`attachment-${theme}-${mode}`);
});
