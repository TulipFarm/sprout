import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  FileContent,
  FileError,
  FilePreview,
  FileRenderersProvider,
  FileViewer,
  LoadingFile,
  ViewableFileContent,
  googleDocument,
  googleShortcut,
  isPreviewableFile,
  maxViewableFileBytes,
  renderableType,
  viewableFileKind,
  type FileRenderers,
} from '../packages/sprout/src/components/file-viewer.js';
import { preloadCodeLanguages } from '../packages/sprout/src/components/code-block.js';
import * as sprout from '../packages/sprout/src/index.js';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../packages/sprout/src/styles/file-viewer.css');
const bytes = (value: string | number[]) =>
  (typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value)).buffer as ArrayBuffer;
const noop = () => {};
const content = (name: string, mediaType: string, value: string | number[], renderers?: FileRenderers) =>
  renderToString(
    <FileContent
      name={name}
      mediaType={mediaType}
      bytes={bytes(value)}
      url="blob:sample"
      onRetry={noop}
      renderers={renderers}
    />,
  );

const sample: FileRenderers = {
  sheet: ({ name, bytes }) => <p data-sample="sheet">{`${name}:${bytes.byteLength}`}</p>,
  office: ({ name, kind }) => <p data-sample="office">{`${name}:${kind}`}</p>,
  markdown: ({ text }) => <article data-sample="markdown">{text.toUpperCase()}</article>,
};

describe('File Viewer', () => {
  it('exports every part from the root and the subpath', () => {
    for (const name of [
      'FileContent',
      'FileError',
      'FilePreview',
      'isPreviewableFile',
      'FileViewer',
      'LoadingFile',
      'ViewableFileContent',
      'FileRenderersProvider',
      'googleDocument',
      'googleShortcut',
      'renderableType',
      'viewableFileKind',
      'maxViewableFileBytes',
    ])
      expect(sprout).toHaveProperty(name);
    const manifest = JSON.parse(read('../packages/sprout/package.json'));
    expect(manifest.exports['./file-viewer']).toMatchObject({
      import: './dist/components/file-viewer.js',
    });
    expect(read('../packages/sprout/src/styles/index.css')).toContain("@import './file-viewer.css';");
    expect(maxViewableFileBytes).toBe(50 * 1024 * 1024);
  });

  it('renders the loading and error states', () => {
    const loading = renderToString(<LoadingFile />);
    expect(loading).toContain('Opening file');
    expect(loading).toContain('Preparing the document viewer.');
    expect(loading).toContain('data-file-state="loading"');
    const error = renderToString(<FileError message="The file took too long to load. Try again." onRetry={noop} />);
    expect(error).toContain('Could not open this file');
    expect(error).toContain('The file took too long to load. Try again.');
    expect(error).toContain('Try again');
    expect(error).toContain('data-file-state="error"');
  });

  it('shows text, JSON, and empty files', () => {
    expect(content('Harvest notes.txt', 'text/plain', 'Bed 2 is ready')).toContain('Bed 2 is ready');
    const json = content('Order.json', 'application/json', '{"order":"SO-1042"}');
    expect(json).toContain('{\n  &quot;order&quot;: &quot;SO-1042&quot;\n}');
    const invalid = content('Order.json', 'application/json', '{"order" "SO"}');
    expect(invalid).toContain('This file contains invalid JSON. The original text is shown below.');
    expect(invalid).toContain('role="alert"');
    expect(content('Empty.txt', 'text/plain', [])).toContain('This file is empty');
    expect(content('Legacy.txt', 'text/plain', [0xff, 0xfe, 0xff])).toContain('This file is not valid UTF-8 text.');
  });

  it('shows source code in a highlighted code block', async () => {
    await preloadCodeLanguages('python');
    const python = content('jobs/score_lead.py', '', 'def run(lead):\n    return 1');
    expect(python).toContain('data-kind="code"');
    expect(python).toContain('data-language="python"');
    expect(python).toMatch(/sprout-code-block-label[^>]*>Python</);
    expect(python).toContain('<span class="sprout-syntax-keyword">def</span>');
    expect(python).toMatch(/sprout-code-block-gutter">1\n2</);
    const text = content('Harvest notes.txt', 'text/plain', 'Bed 2 is ready');
    expect(text).toContain('data-language="text"');
    expect(text).toContain('data-wrap');
    expect(text).not.toContain('sprout-code-block-gutter');
  });

  it('previews images and text but not Google shortcuts or binaries', () => {
    const remote = (name: string, url = '/f') => ({
      name,
      mediaType: '',
      source: { kind: 'remote' as const, url },
    });
    const image = renderToString(<FilePreview file={remote('Bed.png', '/bed.png')} />);
    expect(image).toContain('data-slot="file-preview"');
    expect(image).toContain('src="/bed.png"');
    expect(image).toContain('alt="Bed.png"');
    expect(renderToString(<FilePreview file={remote('main.py')} />)).toContain('Loading preview');
    expect(isPreviewableFile(remote('notes.txt'))).toBe(true);
    expect(isPreviewableFile(remote('Plan.gdoc', 'https://docs.google.com/document/d/abc/edit'))).toBe(false);
    expect(isPreviewableFile(remote('Policy.pdf'))).toBe(false);
    expect(renderToString(<FilePreview file={remote('export.zip')} />)).toBe('');
  });

  it('formats Markdown only when a renderer is registered', () => {
    const plain = content('Plan.md', 'text/markdown', '# Plan');
    expect(plain).toContain('# Plan');
    expect(plain).toContain('data-language="markdown"');
    expect(plain).toContain('data-wrap');
    expect(plain).not.toContain('Show source');
    const formatted = content('Plan.md', 'text/markdown', '# Plan', sample);
    expect(formatted).toContain('data-sample="markdown"');
    expect(formatted).toContain('# PLAN');
    expect(formatted).toContain('Show source');
    expect(formatted).toContain('aria-pressed="false"');
    expect(formatted).not.toContain('data-slot="code-block"');
  });

  it('routes sheets and Office files to registered renderers', () => {
    const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    expect(content('Prices.xlsx', xlsx, 'abc', sample)).toContain('Prices.xlsx:3');
    expect(content('Prices.csv', 'text/csv', 'a,b', sample)).toContain('data-sample="sheet"');
    expect(content('Plan.docx', '', 'abc', sample)).toContain('Plan.docx:document');
    expect(content('Deck.pptx', '', 'abc', sample)).toContain('Deck.pptx:slides');
    expect(content('Prices.xlsx', xlsx, 'abc')).toContain('This format cannot be displayed locally');
    expect(content('Plan.docx', '', 'abc')).toContain('Download the original file');
    const provided = renderToString(
      <FileRenderersProvider renderers={sample}>
        <FileContent name="Deck.pptx" mediaType="" bytes={bytes('x')} url="blob:x" onRetry={noop} />
      </FileRenderersProvider>,
    );
    expect(provided).toContain('Deck.pptx:slides');
    const cleared = renderToString(
      <FileRenderersProvider renderers={sample}>
        <FileRenderersProvider renderers={{ office: undefined }}>
          <FileContent name="Deck.pptx" mediaType="" bytes={bytes('x')} url="blob:x" onRetry={noop} />
        </FileRenderersProvider>
      </FileRenderersProvider>,
    );
    expect(cleared).toContain('This format cannot be displayed locally');
  });

  it('explains unsupported formats', () => {
    expect(content('Board.ppt', 'application/vnd.ms-powerpoint', 'x')).toContain(
      'Save this older PowerPoint file as .pptx',
    );
    expect(content('Backup.bin', 'application/octet-stream', 'x')).toContain('This format cannot be displayed locally');
  });

  it('embeds images, PDFs, and Google shortcuts', () => {
    const image = content('Layout.png', 'image/png', 'x');
    expect(image).toContain('alt="Layout.png"');
    expect(image).toContain('Actual size');
    expect(image).toContain('aria-pressed="false"');
    const pdf = content('Policy.pdf', 'application/pdf', 'x');
    expect(pdf).toContain('<iframe title="Policy.pdf" src="blob:sample"');
    const shortcut = content('Calendar.gsheet', '', '{"url":"https://docs.google.com/spreadsheets/d/abc_1/edit"}');
    expect(shortcut).toContain('https://docs.google.com/spreadsheets/d/abc_1/preview?widget=true&amp;headers=false');
    expect(shortcut).toContain('Google controls access to this document.');
    expect(content('Archive.gdoc', '', '{"url":"https://drive.google.com/x"}')).toContain(
      'This shortcut does not contain a supported Google Docs, Sheets, or Slides link.',
    );
  });

  it('recognizes Google document links', () => {
    expect(googleDocument('https://docs.google.com/document/d/abc/edit')).toEqual({
      url: 'https://docs.google.com/document/d/abc/edit',
      embedUrl: 'https://docs.google.com/document/d/abc/preview',
      mediaType: 'application/vnd.google-apps.document',
    });
    expect(googleDocument('https://docs.google.com/presentation/d/abc')?.embedUrl).toBe(
      'https://docs.google.com/presentation/d/abc/embed',
    );
    for (const url of [
      'http://docs.google.com/document/d/abc',
      'https://docs.google.com.evil.test/document/d/abc',
      'https://user@docs.google.com/document/d/abc',
      'https://docs.google.com/forms/d/abc',
      'not a url',
    ])
      expect(googleDocument(url)).toBeNull();
    expect(googleShortcut('{"url":"https://docs.google.com/document/d/abc/edit#h"}')).toBe(
      'https://docs.google.com/document/d/abc/edit',
    );
    expect(() => googleShortcut('{}')).toThrow('does not contain a document link');
  });

  it('only keeps safe blob types', () => {
    expect(renderableType('Layout.png', 'image/PNG')).toBe('image/png');
    expect(renderableType('Policy.pdf', '')).toBe('application/pdf');
    expect(renderableType('Mark.svg', 'image/svg+xml')).toBe('application/octet-stream');
    expect(renderableType('Page.html', 'text/html')).toBe('application/octet-stream');
    expect(viewableFileKind('Plan.md', '')).toBe('markdown');
    for (const name of ['main.py', 'lib.rs', 'App.tsx', 'Dockerfile', '.env.local', 'query.sql', 'Page.html'])
      expect(viewableFileKind(name, '')).toBe('code');
    expect(viewableFileKind('notes.txt', '')).toBe('text');
    expect(viewableFileKind('Prices.csv', '')).toBe('sheet');
    expect(viewableFileKind('Mark.svg', '')).toBe('image');
    expect(viewableFileKind('archive.zip', '')).toBe('unsupported');
  });

  it('renders the viewer shells', () => {
    const file = {
      name: 'Notes.txt',
      mediaType: 'text/plain',
      source: {
        kind: 'remote' as const,
        url: 'https://docs.google.com/document/d/abc/edit',
      },
    };
    const inline = renderToString(<ViewableFileContent file={file} className="h-80" />);
    expect(inline).toContain('data-slot="viewable-file-content"');
    expect(inline).toContain('h-80');
    expect(inline).toContain('https://docs.google.com/document/d/abc/preview');
    expect(renderToString(<FileViewer file={null} open={false} onOpenChange={noop} />)).toBe('');
  });

  it('keeps motion subtle and respects reduced motion', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('var(--sprout-motion-normal, 180ms)');
    expect(css).toContain(':focus-visible');
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});
