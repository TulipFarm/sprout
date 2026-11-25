import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@tulipfarm/sprout/button';
import { CheckIcon, CopyIcon } from '@tulipfarm/sprout/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tulipfarm/sprout/tabs';
import { cssText, type CssObject } from '../data/css-text';
import { managers, type CommandSet, type Manager } from '../data/install-commands';
import type { InstallInfo } from '../data/registry';
import '../styles/component-docs.css';

const methods = ['cli', 'manual', 'npm'] as const;
type Method = (typeof methods)[number];

const MANAGER_KEY = 'sprout-docs-package-manager';
const METHOD_KEY = 'sprout-docs-install-method';
const changed = 'sprout-docs-preference';

function read<T extends string>(key: string, options: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key) as T | null;
    return value && options.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

/** A preference saved across pages and shared by every block on this one. */
function usePreference<T extends string>(key: string, options: readonly T[], fallback: T) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const sync = () => setValue(read(key, options, fallback));
    sync();
    window.addEventListener(changed, sync);
    return () => window.removeEventListener(changed, sync);
  }, [key, options, fallback]);
  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, next);
      } catch {}
      window.dispatchEvent(new Event(changed));
    },
    [key],
  );
  return [value, update] as const;
}

function useCopy() {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (text: string | (() => Promise<string>)) => {
    clearTimeout(timer.current);
    try {
      if (typeof text === 'string') await navigator.clipboard.writeText(text);
      else if (typeof ClipboardItem === 'function') {
        // Safari drops the click's permission across an await, so hand the clipboard a pending blob.
        const blob = text().then(value => new Blob([value], { type: 'text/plain' }));
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      } else await navigator.clipboard.writeText(await text());
      setState('copied');
    } catch (error) {
      console.error('Could not copy.', error);
      setState('error');
    }
    timer.current = setTimeout(() => setState('idle'), 1600);
  };
  return { state, copy };
}

function CopyButton({ label, text }: { label: string; text: string | (() => Promise<string>) }) {
  const { state, copy } = useCopy();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="install-copy"
        aria-label={`Copy ${label}`}
        data-state={state}
        onClick={() => copy(text)}
      >
        {state === 'copied' ? (
          <CheckIcon data-icon="inline-start" aria-hidden="true" />
        ) : (
          <CopyIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {state === 'copied' ? 'Copied' : state === 'error' ? 'Try again' : 'Copy'}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === 'copied' ? `${label} copied.` : state === 'error' ? `Could not copy ${label}.` : ''}
      </span>
    </>
  );
}

function Command({ label, commands }: { label: string; commands: CommandSet }) {
  const [manager, setManager] = usePreference(MANAGER_KEY, managers, 'pnpm');
  return (
    <div className="install-code">
      <Tabs value={manager} onValueChange={value => setManager(value as Manager)}>
        <div className="install-code-toolbar">
          <TabsList aria-label="Package manager" className="install-managers">
            {managers.map(name => (
              <TabsTrigger key={name} value={name}>
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
          <CopyButton label={label} text={commands[manager].text} />
        </div>
        {managers.map(name => (
          <TabsContent key={name} value={name} tabIndex={-1} className="install-code-panel">
            <pre tabIndex={0} aria-label={`${label}, ${name}`}>
              <code dangerouslySetInnerHTML={{ __html: commands[name].html }} />
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Step({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <li className="install-step">
      <p className="install-step-title">{title}</p>
      {children}
    </li>
  );
}

const items = new Map<
  string,
  Promise<{
    files?: { target: string; content: string }[];
    css?: CssObject;
    cssVars?: { theme?: CssObject };
  }>
>();
function fetchItem(name: string) {
  if (!items.has(name)) {
    items.set(
      name,
      fetch(`/r/${name}.json`).then(response => {
        if (!response.ok) throw new Error(`Could not load ${name}.json`);
        return response.json();
      }),
    );
  }
  return items.get(name)!;
}

const kb = (bytes: number) => `${(bytes / 1000).toFixed(bytes < 10_000 ? 1 : 0)} kB`;

interface ComponentInstallProps {
  info: InstallInfo;
  /** The main file, highlighted on the server. */
  source?: ReactNode;
  /** The item's CSS, highlighted on the server. */
  css?: ReactNode;
  /** The package's CSS imports, highlighted on the server. */
  packageCss?: ReactNode;
  /** Install commands, highlighted on the server. */
  commands: Record<'cli' | 'deps' | 'npm', CommandSet>;
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <>
      {items.map((node, index) => (
        <Fragment key={index}>
          {index > 0 && (index < items.length - 1 ? ', ' : items.length > 2 ? ', and ' : ' and ')}
          {node}
        </Fragment>
      ))}
    </>
  );
}

export default function ComponentInstall({ info, source, css, packageCss, commands }: ComponentInstallProps) {
  const [method, setMethod] = usePreference(METHOD_KEY, methods, 'cli');
  const components = info.requires.filter(dep => dep.name !== 'sprout-base');
  const [main, ...rest] = info.files;
  const localPath = info.importLine.match(/"(.+)"/)?.[1];
  return (
    <Tabs value={method} onValueChange={value => setMethod(value as Method)} className="component-install">
      <TabsList variant="line" aria-label="Install method">
        <TabsTrigger value="cli">shadcn CLI</TabsTrigger>
        <TabsTrigger value="manual">Manual</TabsTrigger>
        <TabsTrigger value="npm">npm package</TabsTrigger>
      </TabsList>

      <TabsContent value="cli" keepMounted tabIndex={-1} className="install-panel">
        <Command label="shadcn command" commands={commands.cli} />
        <p className="install-note">
          Copies {info.title}
          {components.length > 0 && (
            <>
              {' '}
              and the components it uses (<List items={components.map(dep => dep.title)} />)
            </>
          )}{' '}
          into your app, installs the packages, and adds the styles. Then import it from <code>{localPath}</code>. Needs
          Tailwind CSS 4 and a <code>components.json</code> from <code>shadcn init</code>.
        </p>
      </TabsContent>

      <TabsContent value="manual" keepMounted tabIndex={-1} className="install-panel">
        <ol className="install-steps">
          <Step title="Install the following dependencies:">
            <Command label="Install command" commands={commands.deps} />
          </Step>
          <Step
            title={
              <>
                Add Sprout base once per app: the <code>cn()</code> helper and the design tokens.
              </>
            }
          >
            <ul className="install-list">
              <li>
                <code>lib/sprout/classes.ts</code>
                <CopyButton
                  label="classes.ts"
                  text={async () => (await fetchItem('sprout-base')).files?.[0]?.content ?? ''}
                />
              </li>
              <li>
                <span>Design tokens, for your global CSS</span>
                <CopyButton
                  label="design tokens"
                  text={async () => {
                    const base = await fetchItem('sprout-base');
                    const theme = Object.fromEntries(
                      Object.entries(base.cssVars?.theme ?? {}).map(([key, value]) => [`--${key}`, value]),
                    );
                    return cssText({ '@theme inline': theme, ...base.css });
                  }}
                />
              </li>
            </ul>
          </Step>
          {components.length > 0 && (
            <Step
              title={
                <>
                  Add the components it uses:{' '}
                  <List
                    items={components.map(dep =>
                      dep.href ? (
                        <a key={dep.name} href={dep.href}>
                          {dep.title}
                        </a>
                      ) : (
                        dep.title
                      ),
                    )}
                  />
                  .
                </>
              }
            />
          )}
          {main && (
            <Step title="Copy and paste the following code into your project.">
              {source}
              {rest.length > 0 && (
                <>
                  <p className="install-note">And the files it imports:</p>
                  <ul className="install-list">
                    {rest.map(file => (
                      <li key={file.target}>
                        <span className="install-item">
                          <code>{file.target}</code>
                          <span className="install-item-meta">{kb(file.bytes)}</span>
                        </span>
                        <CopyButton
                          label={file.target}
                          text={async () =>
                            (await fetchItem(info.name)).files?.find(entry => entry.target === file.target)?.content ??
                            ''
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Step>
          )}
          {css && (
            <Step
              title={
                <>
                  Add the styles to your global CSS, after <code>@import &quot;tailwindcss&quot;</code>.
                </>
              }
            >
              {css}
            </Step>
          )}
          <Step
            title={
              <>
                Import it from <code>{localPath}</code>. Update the paths if your <code>@/</code> alias points
                elsewhere.
              </>
            }
          />
        </ol>
      </TabsContent>

      <TabsContent value="npm" keepMounted tabIndex={-1} className="install-panel">
        <Command label="Install command" commands={commands.npm} />
        {packageCss}
        <p className="install-note">
          The package keeps the source and ships fixes with each release. Import from{' '}
          <code>{info.packageImport.match(/"(.+)"/)?.[1]}</code>.
        </p>
      </TabsContent>
    </Tabs>
  );
}
