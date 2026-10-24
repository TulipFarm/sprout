'use client';

import { useState, type ComponentProps } from 'react';
import { Danger } from 'reicon-react/icons/Danger';
import { Globe } from 'reicon-react/icons/Globe';
import { cn } from '../internal/classes.js';

/** Returns an image address for a page's icon, or nothing to show the site's first letter. */
export type WebSourceIcon = (url: string) => string | null | undefined;

function webUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null;
  } catch {
    return null;
  }
}

/** The default icon for a page: its site's favicon from icon.horse. */
export const webSourceIcon: WebSourceIcon = url => {
  const host = webUrl(url)?.hostname;
  return host ? `https://icon.horse/icon/${encodeURIComponent(host)}` : null;
};

function WebSourceFavicon({ src, letter }: { src: string | null; letter: string | null }) {
  const [state, setState] = useState<{ src: string | null; status: 'loading' | 'loaded' | 'failed' }>({
    src,
    status: 'loading',
  });
  const status = state.src === src ? state.status : 'loading';
  return (
    <span
      data-slot="source-favicon"
      data-status={src ? status : 'failed'}
      aria-hidden="true"
      className="sprout-web-source-favicon"
    >
      {(!src || status === 'failed') &&
        (letter ? <span className="sprout-web-source-letter">{letter}</span> : <Globe size={16} />)}
      {src && status !== 'failed' && (
        <img
          src={src}
          alt=""
          width={16}
          height={16}
          ref={img => {
            // A server-rendered image can finish before hydration attaches onLoad.
            if (img?.complete && status === 'loading') {
              setState({ src, status: img.naturalWidth > 0 ? 'loaded' : 'failed' });
            }
          }}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onLoad={() => setState({ src, status: 'loaded' })}
          onError={() => setState({ src, status: 'failed' })}
        />
      )}
    </span>
  );
}

export interface WebSourceProps extends Omit<ComponentProps<'a'>, 'href' | 'title' | 'children'> {
  /** The page's address. Only `http` and `https` pages become links. */
  url: string;
  /** The page's title. Without one, the chip shows the address. */
  title?: string | null | undefined;
  /** Finds the page's icon. Defaults to `webSourceIcon`; return nothing for a letter tile. */
  icon?: WebSourceIcon | undefined;
  /** The page could not be read. Shows a warning. */
  failed?: boolean | undefined;
  /** `block` is a chip for lists of sources; `inline` sits within a line of text and follows its size. */
  variant?: 'block' | 'inline' | undefined;
  /** For `block` chips: `default` is 28px tall; `sm` is 24px with smaller text, for dense lists. */
  size?: 'default' | 'sm' | undefined;
}

/**
 * A chip for a web page: its favicon and title, linking to the page in a new
 * tab. Icons load without cookies or a referrer; a tile holds its place while it loads,
 * and the site's first letter shows if it fails.
 */
export function WebSource({
  url,
  title,
  icon = webSourceIcon,
  failed = false,
  variant = 'block',
  size = 'default',
  className,
  ...props
}: WebSourceProps) {
  const page = webUrl(url);
  const href = page?.href ?? null;
  const letter =
    page?.hostname
      .replace(/^www\./, '')
      .charAt(0)
      .toUpperCase() || null;
  const label = title?.trim() || url.replace(/^https?:\/\/(?:www\.)?/, '');
  const content = (
    <>
      <WebSourceFavicon src={(href && icon(url)) || null} letter={letter} />
      <span className="sprout-web-source-title">{label}</span>
      {failed && (
        <>
          <Danger size={14} aria-hidden="true" className="sprout-web-source-failed" />
          <span className="sprout-web-source-sr-only">Page unavailable. Retry or paste the text.</span>
        </>
      )}
    </>
  );
  const shared = {
    'data-slot': 'source-chip',
    'data-failed': failed || undefined,
    'data-variant': variant,
    'data-size': variant === 'block' && size === 'sm' ? 'sm' : undefined,
    title: `${label}\n${url}`,
    className: cn('sprout-web-source', className),
  };
  return href ? (
    <a {...props} {...shared} href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <span {...(props as ComponentProps<'span'>)} {...shared}>
      {content}
    </span>
  );
}
