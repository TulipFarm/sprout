import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Download } from 'reicon-react/icons/Download';
import { Folder } from 'reicon-react/icons/Folder';
import { Paperclip } from 'reicon-react/icons/Paperclip';
import { X } from 'reicon-react/icons/X';
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
  fileAttachmentVariantNames,
  type AttachmentFile,
  type AttachmentSize,
  type AttachmentState,
  type FileAttachmentVariant,
} from '@tulipfarm/sprout/attachment';
import { BrandIcon } from '@tulipfarm/sprout/brand-icon';
import { Button } from '@tulipfarm/sprout/button';
import { Spinner } from '@tulipfarm/sprout/spinner';
import '../styles/attachment-demo.css';

const landscape = '/avatar-samples/landscape.svg';
const types = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  png: 'image/png',
  gdoc: 'application/vnd.google-apps.document',
  gsheet: 'application/vnd.google-apps.spreadsheet',
};

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="attachment-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="attachment-demo-card-body">{children}</div>
    </section>
  );
}

function Pane({ caption, children, testId }: { caption: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <div className="attachment-demo-pane" data-testid={testId}>
      <span className="attachment-demo-caption">{caption}</span>
      {children}
    </div>
  );
}

const primitiveStates: {
  state: AttachmentState;
  name: string;
  type: string;
  description: string;
}[] = [
  {
    state: 'idle',
    name: 'Supplier contacts.csv',
    type: types.csv,
    description: 'Waiting to upload',
  },
  {
    state: 'uploading',
    name: 'Price list 2026.xlsx',
    type: types.xlsx,
    description: 'Uploading 1.2 MB of 3.4 MB',
  },
  {
    state: 'processing',
    name: 'Returns policy.pdf',
    type: types.pdf,
    description: 'Reading 14 pages…',
  },
  {
    state: 'error',
    name: 'Store floor plan.pdf',
    type: types.pdf,
    description: 'This file is 14 MB. The upload limit is 10 MB.',
  },
  {
    state: 'done',
    name: 'Onboarding checklist.docx',
    type: types.docx,
    description: 'Document · 31 KB',
  },
];

const sizeSamples: Record<AttachmentSize, { title: string; description: string }> = {
  lg: { title: 'Greenhouse layout.png', description: 'Image · 1.4 MB' },
  md: { title: 'Seed tray.png', description: '220 KB' },
  sm: { title: 'Logo.png', description: 'PNG' },
};

function PrimitivesExample() {
  const [removed, setRemoved] = useState<string[]>([]);
  const [opened, setOpened] = useState('Nothing opened yet');
  return (
    <Example
      title="Attachment parts"
      description="Compose media, content, and actions. State changes the border, title shimmer, and error color; size and orientation set the footprint."
    >
      <div className="attachment-demo-grid">
        <Pane caption="States" testId="attachment-states">
          <div className="attachment-demo-stack">
            {primitiveStates
              .filter(item => !removed.includes(item.state))
              .map(item => (
                <Attachment key={item.state} state={item.state}>
                  <AttachmentMedia>
                    {item.state === 'uploading' || item.state === 'processing' ? (
                      <Spinner aria-hidden="true" />
                    ) : (
                      <FileTypeIcon name={item.name} mediaType={item.type} />
                    )}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{item.name}</AttachmentTitle>
                    <AttachmentDescription>{item.description}</AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Remove ${item.name}`}
                      onClick={() => setRemoved(current => [...current, item.state])}
                    >
                      <X aria-hidden="true" />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ))}
            {removed.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setRemoved([])}>
                Restore removed
              </Button>
            )}
          </div>
        </Pane>
        <Pane caption="Sizes and orientations" testId="attachment-sizes">
          <div className="attachment-demo-sizes">
            {(['lg', 'md', 'sm'] as const).map(size => (
              <div key={size} className="attachment-demo-size-row">
                <span className="attachment-demo-label">
                  <code>{size}</code>
                </span>
                {(['horizontal', 'vertical'] as const).map(orientation => (
                  <Attachment
                    key={orientation}
                    size={size}
                    orientation={orientation}
                    data-testid={`attachment-${size}-${orientation}`}
                  >
                    <AttachmentMedia variant="image">
                      <img src={landscape} alt="" />
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{sizeSamples[size].title}</AttachmentTitle>
                      <AttachmentDescription>{sizeSamples[size].description}</AttachmentDescription>
                    </AttachmentContent>
                  </Attachment>
                ))}
              </div>
            ))}
          </div>
        </Pane>
        <Pane caption="Whole-card trigger" testId="attachment-trigger">
          <Attachment>
            <AttachmentTrigger
              aria-label="Open Q3 launch deck.pptx"
              onClick={() => setOpened('Opened Q3 launch deck.pptx')}
            />
            <AttachmentMedia>
              <FileTypeIcon name="Q3 launch deck.pptx" mediaType={types.pptx} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>Q3 launch deck.pptx</AttachmentTitle>
              <AttachmentDescription>Slides · 2.8 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                aria-label="Download Q3 launch deck.pptx"
                onClick={() => setOpened('Downloaded Q3 launch deck.pptx')}
              >
                <Download aria-hidden="true" />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <p className="attachment-demo-note" role="status">
            {opened}
          </p>
        </Pane>
      </div>
    </Example>
  );
}

const variantFiles: AttachmentFile[] = [
  {
    id: 'policy',
    name: 'Returns policy.pdf',
    mediaType: types.pdf,
    size: '212 KB',
    state: 'ready',
  },
  {
    id: 'photo',
    name: 'Storefront.png',
    mediaType: types.png,
    size: '1.4 MB',
    state: 'ready',
    url: landscape,
  },
  {
    id: 'prices',
    name: 'Price list 2026.xlsx',
    mediaType: types.xlsx,
    size: '48 KB',
    state: 'uploading',
  },
  {
    id: 'deck',
    name: 'Q3 launch deck.pptx',
    mediaType: types.pptx,
    size: '2.8 MB',
    state: 'processing',
  },
  {
    id: 'notes',
    name: 'Supplier notes from the March visit.docx',
    mediaType: types.docx,
    size: '31 KB',
    state: 'error',
  },
];

function VariantsExample() {
  const [status, setStatus] = useState('No action yet');
  const [files, setFiles] = useState(variantFiles);
  const retry = (id: string) =>
    setFiles(current => current.map(file => (file.id === id ? { ...file, state: 'uploading' } : file)));
  useEffect(() => {
    if (!files.some(file => file.id === 'notes' && file.state === 'uploading')) return;
    const timer = window.setTimeout(
      () => setFiles(current => current.map(file => (file.id === 'notes' ? { ...file, state: 'ready' } : file))),
      1200,
    );
    return () => window.clearTimeout(timer);
  }, [files]);
  return (
    <Example
      title="File attachment variants"
      description="A ready-made row, card, inline mention, or chip. Uploading and processing files show a spinner, failed files offer Retry, and each can be removed."
    >
      <div className="attachment-demo-variants">
        {fileAttachmentVariantNames.map((variant: FileAttachmentVariant) => (
          <Pane key={variant} caption={<code>{variant}</code>} testId={`file-${variant}`}>
            <AttachmentGroup
              variant={variant === 'grid' ? 'grid' : variant === 'list' ? 'list' : 'inline'}
              aria-label={`${variant} files`}
            >
              {files.map(file => (
                <FileAttachment
                  key={file.id}
                  variant={variant}
                  file={file}
                  onOpen={() => setStatus(`Opened ${file.name} from ${variant}`)}
                  onRetry={() => {
                    retry(file.id);
                    setStatus(`Retrying ${file.name}`);
                  }}
                  onRemove={() => setStatus(`Removed ${file.name} from ${variant}`)}
                />
              ))}
            </AttachmentGroup>
          </Pane>
        ))}
      </div>
      <p className="attachment-demo-note" role="status" data-testid="variant-status">
        {status}
      </p>
    </Example>
  );
}

type Upload = {
  id: string;
  file: File;
  kind: 'ready' | 'uploading' | 'error';
  message?: string;
};

const composerSeed = (): Upload[] => [
  {
    id: '1',
    file: new File(['Fictional price list'], 'Price list 2026.xlsx', {
      type: types.xlsx,
    }),
    kind: 'ready',
  },
  {
    id: '2',
    file: new File(['Fictional policy'], 'Returns policy.pdf', {
      type: types.pdf,
    }),
    kind: 'uploading',
  },
  {
    id: '3',
    file: new File(['x'.repeat(2048)], 'Onboarding checklist.docx', {
      type: types.docx,
    }),
    kind: 'ready',
  },
  {
    id: '4',
    file: new File(['Fictional notes'], 'garden-notes.txt', {
      type: types.txt,
    }),
    kind: 'error',
    message: 'Upload failed. Check your connection and retry.',
  },
  {
    id: '5',
    file: new File(['# Plan'], 'Spring planting plan.md', { type: types.md }),
    kind: 'ready',
  },
  {
    id: '6',
    file: new File(['{}'], 'inventory.json', { type: types.json }),
    kind: 'ready',
  },
  {
    id: '7',
    file: new File(['Fictional deck'], 'Q3 launch deck.pptx', {
      type: types.pptx,
    }),
    kind: 'ready',
  },
];

function ComposerExample() {
  const [uploads, setUploads] = useState(composerSeed);
  const [disabled, setDisabled] = useState(false);
  return (
    <Example
      title="Composer uploads"
      description="Staged files scroll sideways in a carousel. Click a chip to preview it, use the arrows or Left and Right keys to scroll, and remove or retry each file."
    >
      <div className="attachment-demo-composer" data-testid="composer">
        <AttachmentGroup variant="carousel" aria-label="Attached files">
          {uploads.map(item => (
            <FileAttachment
              key={item.id}
              variant="chip"
              file={{
                id: item.id,
                name: item.file.name,
                mediaType: item.file.type,
                size: `${Math.max(1, Math.round(item.file.size / 1024))} KB`,
                state: item.kind,
                source: { kind: 'local', file: item.file },
              }}
              preview
              viewable
              onRemove={
                disabled ? undefined : () => setUploads(current => current.filter(upload => upload.id !== item.id))
              }
              onRetry={
                disabled
                  ? undefined
                  : () =>
                      setUploads(current =>
                        current.map(upload => (upload.id === item.id ? { ...upload, kind: 'ready' } : upload)),
                      )
              }
            />
          ))}
        </AttachmentGroup>
        <div className="attachment-demo-status-lines">
          {uploads.map(item => (
            <p key={item.id} role={item.kind === 'error' ? 'alert' : 'status'}>
              {item.file.name}:{' '}
              {item.kind === 'ready'
                ? 'Ready to send · Storage only, not read by this chat'
                : item.kind === 'uploading'
                  ? 'Uploading for private storage…'
                  : item.message}
            </p>
          ))}
          {uploads.length === 0 && <p>No files attached.</p>}
        </div>
        <div className="attachment-demo-row">
          <Button variant="outline" size="sm" onClick={() => setDisabled(value => !value)}>
            {disabled ? 'Enable editing' : 'Sending… (lock files)'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setUploads(composerSeed())}>
            Reset files
          </Button>
        </div>
      </div>
    </Example>
  );
}

function ReferencesExample() {
  const [status, setStatus] = useState('No file opened');
  const [downloading, setDownloading] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <Example
      title="Sent references"
      description="Chips in a sent message point at Files or Google Drive. A loading reference shows a disabled chip; generated files offer Download."
    >
      <div className="attachment-demo-message" data-testid="references">
        <p className="attachment-demo-bubble">
          Compare the 2026 prices with last year’s, and flag anything that went up more than 10%.
        </p>
        <div className="attachment-demo-chips">
          <FileAttachment
            variant="chip"
            file={{
              id: 'g1',
              name: 'Supplier price sheet',
              mediaType: types.gsheet,
              size: 'Google Drive',
              state: 'ready',
            }}
            onOpen={() => setStatus('Opened Supplier price sheet from Google Drive')}
          />
          <FileAttachment
            variant="chip"
            file={{
              id: 'f1',
              name: 'Price list 2025.xlsx',
              mediaType: types.xlsx,
              size: 'File reference',
              state: 'ready',
            }}
            onOpen={() => setStatus('Opened Price list 2025.xlsx')}
          />
          <FileAttachment
            variant="chip"
            file={{
              id: 'loading',
              name: 'Loading file…',
              mediaType: '',
              size: '',
              state: 'processing',
            }}
            onOpen={() => undefined}
          />
        </div>
        <div className="attachment-demo-chips" data-align="start">
          <FileAttachment
            variant="chip"
            file={{
              id: 'f2',
              name: 'Price changes.csv',
              mediaType: types.csv,
              size: 'Saved in Files',
              state: 'ready',
            }}
            onOpen={() => setStatus('Opened Price changes.csv')}
          />
          <FileAttachment
            variant="chip"
            actionLabel="Download"
            file={{
              id: 'd1',
              name: 'Price comparison.xlsx',
              mediaType: types.xlsx,
              size: '52 KB',
              state: downloading ? 'processing' : 'ready',
            }}
            onOpen={() => {
              setDownloading(true);
              setStatus('Downloading Price comparison.xlsx…');
              timer.current = window.setTimeout(() => {
                setDownloading(false);
                setStatus('Downloaded Price comparison.xlsx');
              }, 1200);
            }}
          />
        </div>
        <p className="attachment-demo-note" role="status" data-testid="reference-status">
          {status}
        </p>
      </div>
    </Example>
  );
}

const groupFiles: AttachmentFile[] = [
  {
    id: 'a',
    name: 'Returns policy.pdf',
    mediaType: types.pdf,
    size: '212 KB',
    state: 'ready',
    source: { kind: 'remote', url: '/file-viewer-samples/returns-policy.pdf' },
  },
  {
    id: 'b',
    name: 'Greenhouse layout.png',
    mediaType: 'image/png',
    size: '18 KB',
    state: 'ready',
    url: '/file-viewer-samples/greenhouse-layout.png',
  },
  {
    id: 'c',
    name: 'Harvest log.txt',
    mediaType: 'text/plain',
    size: '1 KB',
    state: 'ready',
    source: { kind: 'remote', url: '/file-viewer-samples/harvest-log.txt' },
  },
];

const previewSources: [name: string, type: string, text: string][] = [
  [
    'score_lead.py',
    'text/x-python',
    `from dataclasses import dataclass


@dataclass
class Lead:
    company: str
    seats: int
    replied: bool = False


def score(lead: Lead) -> int:
    """Rank a lead from 0 to 100."""
    points = min(lead.seats, 50)
    if lead.replied:
        points += 30
    return min(points, 100)
`,
  ],
  [
    'README.md',
    'text/markdown',
    '# Meadow\n\nA **fictional** garden planner.\n\n## Setup\n\n```bash\npnpm install\npnpm dev\n```\n\n- Plan beds\n- Track sowing dates\n',
  ],
  [
    'planting.json',
    'application/json',
    '{"bed":"North","crops":[{"name":"Tulip","weeks":12,"ready":true},{"name":"Fern","weeks":20,"ready":false}]}',
  ],
  [
    'main.rs',
    '',
    'fn main() {\n    let beds = ["north", "south"];\n    for bed in beds {\n        println!("Watering {bed}");\n    }\n}\n',
  ],
  [
    'Harvest notes.txt',
    'text/plain',
    'Bed 2 is ready for the second sowing. The tulips by the gate came up early this year, so move the irrigation timer forward by a week.',
  ],
];

function PreviewExample() {
  const files = useMemo<AttachmentFile[]>(
    () => [
      ...previewSources.map(([name, type, text]) => {
        const file = new File([text], name, { type });
        return {
          id: name,
          name,
          mediaType: type,
          size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          state: 'ready' as const,
          source: { kind: 'local' as const, file },
        };
      }),
      {
        id: 'photo',
        name: 'Storefront.svg',
        mediaType: 'image/svg+xml',
        size: '4 KB',
        state: 'ready',
        url: landscape,
      },
    ],
    [],
  );
  return (
    <Example
      title="Preview and open"
      description="preview peeks at images, text, and code on hover or focus. viewable opens the file full screen on click, with syntax colors for every language. Inside a group, the arrows and arrow keys step through its files."
    >
      <div className="attachment-demo-grid">
        {(['chip', 'list'] as const).map(variant => (
          <Pane key={variant} caption={<code>{variant}</code>} testId={`preview-${variant}`}>
            <AttachmentGroup variant={variant === 'chip' ? 'inline' : 'list'} aria-label={`${variant} previews`}>
              {files.map(file => (
                <FileAttachment key={file.id} variant={variant} file={file} preview viewable />
              ))}
            </AttachmentGroup>
          </Pane>
        ))}
      </div>
    </Example>
  );
}

function GroupsExample() {
  return (
    <Example
      title="Group layouts"
      description="carousel scrolls one row, grid makes two columns (three from 640px), inline wraps, and list stacks."
    >
      <div className="attachment-demo-groups">
        {attachmentGroupVariantNames.map(variant => (
          <Pane key={variant} caption={<code>{variant}</code>} testId={`group-${variant}`}>
            <AttachmentGroup variant={variant} aria-label={`${variant} group`}>
              {groupFiles.map(file => (
                <FileAttachment
                  key={file.id}
                  variant={variant === 'grid' ? 'grid' : variant === 'list' ? 'list' : 'chip'}
                  file={file}
                  preview
                  viewable
                />
              ))}
            </AttachmentGroup>
          </Pane>
        ))}
      </div>
    </Example>
  );
}

const iconSamples = [
  ['Returns policy.pdf', types.pdf],
  ['Price list 2026.xlsx', types.xlsx],
  ['Onboarding checklist.docx', types.docx],
  ['Q3 launch deck.pptx', types.pptx],
  ['Storefront.png', types.png],
  ['inventory.json', types.json],
  ['garden-notes.txt', types.txt],
  ['Spring plan.md', types.md],
  ['Supplier sheet.gsheet', types.gsheet],
  ['export.zip', 'application/zip'],
] as const;

function FileTypeIconExample() {
  const [fieldFiles, setFieldFiles] = useState(['Signed lease.pdf', 'Floor plan.png']);
  const [taskFiles, setTaskFiles] = useState([
    { name: 'Returns policy.pdf', type: types.pdf, google: false },
    { name: 'Supplier price sheet', type: types.gsheet, google: true },
  ]);
  return (
    <Example
      title="File type icons"
      description="A decorative paper glyph with a colored extension badge. sm (20 × 24) sits in rows and chips; lg (30 × 36) fills grid previews."
    >
      <div className="attachment-demo-icons" data-testid="file-type-icons">
        {iconSamples.map(([name, type]) => (
          <div key={name} className="attachment-demo-icon">
            <span className="attachment-demo-icon-pair">
              <FileTypeIcon name={name} mediaType={type} size="sm" />
              <FileTypeIcon name={name} mediaType={type} size="lg" />
            </span>
            <span className="attachment-demo-icon-name">{name}</span>
          </div>
        ))}
        <div className="attachment-demo-icon">
          <span className="attachment-demo-icon-pair">
            <FileTypeIcon name="" mediaType="" />
            <FileTypeIcon name="" mediaType="" size="lg" />
          </span>
          <span className="attachment-demo-icon-name">Unknown name</span>
        </div>
      </div>
      <div className="attachment-demo-grid">
        <Pane caption="Files table" testId="icon-files-table">
          <ul className="attachment-demo-table">
            {[
              {
                name: 'Contracts',
                kind: 'folder',
                detail: '6 items',
                owner: 'You',
              },
              {
                name: 'Price list 2026.xlsx',
                kind: 'file',
                type: types.xlsx,
                detail: 'Spreadsheet · 48 KB',
                owner: 'You',
              },
              {
                name: 'Returns policy.pdf',
                kind: 'file',
                type: types.pdf,
                detail: 'PDF · 212 KB',
                owner: 'Robin',
              },
              {
                name: 'Onboarding checklist.docx',
                kind: 'file',
                type: types.docx,
                detail: 'Document · 31 KB',
                owner: 'You',
              },
            ].map(item => (
              <li key={item.name}>
                <span className="attachment-demo-table-icon" aria-hidden="true">
                  {item.kind === 'folder' ? (
                    <Folder size={20} />
                  ) : (
                    <FileTypeIcon name={item.name} mediaType={item.type ?? 'application/octet-stream'} />
                  )}
                </span>
                <span className="attachment-demo-table-text">
                  <span title={item.name}>{item.name}</span>
                  <small>{item.detail}</small>
                </span>
                <small>{item.owner}</small>
              </li>
            ))}
          </ul>
        </Pane>
        <Pane caption="Uploads" testId="icon-uploads">
          <ul className="attachment-demo-table">
            {[
              {
                name: 'Store floor plan.pdf',
                type: types.pdf,
                detail: 'Uploading 2.1 MB of 6.4 MB · Contracts',
                action: 'Cancel',
              },
              {
                name: 'Staff rota.xlsx',
                type: types.xlsx,
                detail: 'Uploaded · Projects / Spring launch',
                action: null,
              },
              {
                name: 'Supplier photos.png',
                type: types.png,
                detail: 'This file is 14 MB. The upload limit is 10 MB. · Files',
                action: null,
              },
              {
                name: 'Meeting notes.docx',
                type: types.docx,
                detail: 'Failed · Files',
                action: 'Retry',
              },
            ].map(item => (
              <li key={item.name}>
                <FileTypeIcon name={item.name} mediaType={item.type} />
                <span className="attachment-demo-table-text">
                  <span title={item.name}>{item.name}</span>
                  <small>{item.detail}</small>
                </span>
                {item.action && (
                  <Button
                    variant={item.action === 'Retry' ? 'outline' : 'ghost'}
                    size="sm"
                    aria-label={`${item.action} uploading ${item.name}`}
                  >
                    {item.action}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Pane>
        <Pane caption="Message editor mention" testId="icon-mention">
          <p className="attachment-demo-editor">
            Summarize
            <span className="attachment-demo-mention">
              <FileTypeIcon name="Returns policy.pdf" mediaType={types.pdf} />
              <span>Returns policy.pdf</span>
            </span>
            and compare it with
            <span className="attachment-demo-mention">
              <FileTypeIcon name="" mediaType="" />
              <span>File</span>
            </span>
            before Friday.
          </p>
        </Pane>
        <Pane caption="Table file field" testId="icon-field">
          <ul className="attachment-demo-field">
            {fieldFiles.map(name => (
              <li key={name}>
                <FileTypeIcon name={name} mediaType="" />
                <span title={name}>{name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${name}`}
                  onClick={() => setFieldFiles(current => current.filter(item => item !== name))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFieldFiles(current => [...current, `Receipt ${current.length + 1}.pdf`])}
          >
            <Paperclip aria-hidden="true" />
            Attach file
          </Button>
        </Pane>
        <Pane caption="Task files to read" testId="icon-task">
          <ul className="attachment-demo-field">
            {taskFiles.map(file => (
              <li key={file.name}>
                <FileTypeIcon name={file.name} mediaType={file.type} />
                <span title={file.name}>{file.name}</span>
                {file.google && <small>Google Drive</small>}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setTaskFiles(current => current.filter(item => item !== file))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </Pane>
        <Pane caption="Dialog file heading and Drive picker" testId="icon-dialog">
          <p className="attachment-demo-heading">
            <FileTypeIcon name="Supplier notes from the March visit.docx" mediaType={types.docx} />
            <span title="Supplier notes from the March visit.docx">Supplier notes from the March visit.docx</span>
          </p>
          <ul className="attachment-demo-table">
            <li>
              <BrandIcon brand="google-drive" size="glyph" />
              <span className="attachment-demo-table-text">
                <span>Supplier price sheet</span>
                <small>Google Sheets</small>
              </span>
            </li>
            <li>
              <FileTypeIcon name="Delivery terms.pdf" mediaType={types.pdf} />
              <span className="attachment-demo-table-text">
                <span>Delivery terms.pdf</span>
                <small>PDF · Proposed new Drive file · 84 KB</small>
              </span>
            </li>
          </ul>
        </Pane>
      </div>
    </Example>
  );
}

const knowledgeAccept =
  '.txt,.md,.markdown,.json,.jsonl,.yaml,.yml,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.rb,.go,.rs,.java,.c,.h,.cpp,.cs,.sh,.sql,.toml,.ini,.log,.pdf,.docx';

function DropzoneExample() {
  const [files, setFiles] = useState<File[]>([]);
  const [knowledge, setKnowledge] = useState<File[]>([]);
  return (
    <Example
      title="Local file picker"
      description="Drop files or choose them. Files stay in browser memory; nothing is uploaded. Images get a live thumbnail."
    >
      <div className="attachment-demo-grid">
        <Pane caption="Default" testId="dropzone-default">
          <AttachmentDropzone onFiles={next => setFiles(current => [...current, ...next])} />
          {files.length > 0 && (
            <AttachmentGroup variant="inline" aria-label="Chosen files">
              {files.map((file, index) => (
                <LocalFileAttachment
                  key={`${file.name}-${index}`}
                  file={file}
                  preview
                  viewable
                  onRemove={() => setFiles(current => current.filter((_, item) => item !== index))}
                />
              ))}
            </AttachmentGroup>
          )}
        </Pane>
        <Pane caption="Project knowledge, text and code only" testId="dropzone-knowledge">
          <AttachmentDropzone
            accept={knowledgeAccept}
            onFiles={next => setKnowledge(current => [...current, ...next])}
          />
          {knowledge.length > 0 && (
            <ul className="attachment-demo-table">
              {knowledge.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  <FileTypeIcon name={file.name} mediaType="text/plain" />
                  <span className="attachment-demo-table-text">
                    <span>{file.name}</span>
                    <small>{file.size.toLocaleString()} B · Updated today</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Pane>
        <Pane caption="Disabled while saving" testId="dropzone-disabled">
          <AttachmentDropzone disabled onFiles={() => undefined} />
        </Pane>
      </div>
    </Example>
  );
}

export default function AttachmentDemo() {
  return (
    <div id="attachment-demo" className="attachment-demo">
      <PrimitivesExample />
      <VariantsExample />
      <PreviewExample />
      <ComposerExample />
      <ReferencesExample />
      <GroupsExample />
      <FileTypeIconExample />
      <DropzoneExample />
    </div>
  );
}
