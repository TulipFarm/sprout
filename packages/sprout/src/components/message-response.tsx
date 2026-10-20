'use client';

import { createContext, useContext, useMemo, type ComponentProps, type HTMLAttributes, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../internal/classes.js';
import { CodeBlock } from './code-block.js';

/** Renders one Markdown link. Return a plain `<a>` for links you do not handle. */
export type MessageResponseRenderLink = (href: string, children: ReactNode) => ReactNode;

const LinkContext = createContext<MessageResponseRenderLink | undefined>(undefined);
const TableContext = createContext(false);

export interface MessageTableViewportProps {
  /** Caps every table inside at 12rem tall and scrolls both ways; otherwise tables only scroll sideways. */
  bounded: boolean;
  children?: ReactNode;
}

/** Sets how tall the tables in the responses inside it may grow. */
export function MessageTableViewport({ bounded, children }: MessageTableViewportProps) {
  return <TableContext value={bounded}>{children}</TableContext>;
}

const ResponseTable: NonNullable<Components['table']> = ({ children }) => {
  const bounded = useContext(TableContext);
  return (
    <div
      className="sprout-message-response-table"
      data-bounded={bounded ? '' : undefined}
      tabIndex={0}
      role="region"
      aria-label="Response table"
    >
      <table>{children}</table>
    </div>
  );
};

function ResponseLink({ href, children }: ComponentProps<'a'>) {
  const render = useContext(LinkContext);
  return render ? (
    render(href ?? '', children)
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

const components: Components = {
  pre({ node, children }) {
    const code = node?.children[0];
    if (code?.type !== 'element' || code.tagName !== 'code') return <pre>{children}</pre>;
    const classes = code.properties.className;
    const language = Array.isArray(classes)
      ? classes.find((value): value is string => typeof value === 'string' && value.startsWith('language-'))
      : undefined;
    const text = code.children
      .map(child => (child.type === 'text' ? child.value : ''))
      .join('')
      .replace(/\n$/, '');
    return <CodeBlock code={text} language={language ? language.slice(9) : 'text'} />;
  },
  a: ResponseLink,
  table: ResponseTable,
  // GFM task list boxes have no label of their own; the item text follows them.
  input: ({ node: _node, ...props }) =>
    props.type === 'checkbox' ? <input {...props} aria-label="Task" /> : <input {...props} />,
};

export interface MessageResponseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Markdown with GitHub extensions. Raw HTML is dropped and images are not shown. */
  children: string;
  /** Marks the response busy and shows a caret after the text. */
  streaming?: boolean | undefined;
  /** Replaces every link, for citations, downloads, or in-app routes. */
  renderLink?: MessageResponseRenderLink | undefined;
}

/** Renders an assistant's Markdown reply: headings, lists, quotes, tables, task lists, and code blocks. */
export function MessageResponse({
  children,
  streaming = false,
  renderLink,
  className,
  ...props
}: MessageResponseProps) {
  const markdown = useMemo(
    () => (
      <Markdown remarkPlugins={[remarkGfm]} components={components} skipHtml disallowedElements={['img']}>
        {children}
      </Markdown>
    ),
    [children],
  );
  return (
    <div
      data-slot="message-response"
      data-streaming={streaming ? '' : undefined}
      aria-busy={streaming}
      {...props}
      className={cn('sprout-message-response', className)}
    >
      <LinkContext value={renderLink}>{markdown}</LinkContext>
      {streaming && <span aria-hidden="true" className="sprout-message-response-caret" />}
    </div>
  );
}
