'use client';

import { createContext, useContext, useEffect, type ReactElement, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { useRender } from '@base-ui/react/use-render';
import { ChevronLeft } from 'reicon-react/icons/ChevronLeft';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { cn } from '../internal/classes.js';
import { Button } from './button.js';

export interface PageChrome {
  /** App header element that receives the back link and page title. */
  title: HTMLElement | null;
  /** App header element that receives page actions. */
  actions: HTMLElement | null;
  /** Formats `document.title` from a string page title. Omit to leave it alone. */
  documentTitle?: ((title: string) => string) | undefined;
}

export const PageChromeContext = createContext<PageChrome>({
  title: null,
  actions: null,
});

export interface PageLink {
  /** Visible text, and the accessible name when the back label is hidden. */
  label: string;
  /** Link element to render, such as `<a href />` or a router link. */
  link: ReactElement;
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Back link above the title. Below 640px only its chevron shows. */
  back?: PageLink | undefined;
  /** Shows the title as the last step of a breadcrumb under this parent page. */
  parent?: PageLink | undefined;
  titleId?: string | undefined;
  titleRef?: Ref<HTMLHeadingElement> | undefined;
  /** Lets code move focus to the title, for example after navigation. */
  focusable?: boolean | undefined;
  className?: string | undefined;
}

function ParentLink({ link, label }: PageLink) {
  return useRender({
    defaultTagName: 'a',
    render: link,
    props: {
      'data-slot': 'page-breadcrumb-link',
      className: 'sprout-page-header-breadcrumb-link',
      children: label,
    },
  });
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  parent,
  titleId,
  titleRef,
  focusable,
  className,
}: PageHeaderProps) {
  const chrome = useContext(PageChromeContext);
  const format = chrome.documentTitle;
  const text = typeof title === 'string' ? title : null;
  useEffect(() => {
    if (!text || !format) return;
    const previous = document.title;
    document.title = format(text);
    return () => {
      document.title = previous;
    };
  }, [text, format]);

  const inChrome = !!(chrome.title && chrome.actions);
  const placement = inChrome ? 'chrome' : 'page';
  const heading = (
    <h1
      id={titleId}
      ref={titleRef}
      tabIndex={focusable ? -1 : undefined}
      data-slot="page-title"
      data-placement={placement}
      className="sprout-page-header-title"
    >
      {title}
    </h1>
  );
  const trail = parent && (
    <nav
      aria-label="Breadcrumb"
      data-slot="page-breadcrumb"
      data-placement={placement}
      className="sprout-page-header-breadcrumb"
    >
      <ol className="sprout-page-header-breadcrumb-list">
        <li className="sprout-page-header-breadcrumb-item">
          <ParentLink {...parent} />
        </li>
        <li role="presentation" aria-hidden="true" className="sprout-page-header-breadcrumb-separator">
          <ChevronRight size={14} />
        </li>
        <li aria-current="page" className="sprout-page-header-breadcrumb-item sprout-page-header-breadcrumb-current">
          {heading}
        </li>
      </ol>
    </nav>
  );
  const backButton = back && (
    <Button
      variant="ghost"
      size="back"
      nativeButton={false}
      render={back.link}
      data-slot="page-back"
      className="sprout-page-header-back"
    >
      <ChevronLeft data-icon="inline-start" aria-hidden="true" />
      <span className="sprout-page-header-back-label">{back.label}</span>
    </Button>
  );

  if (inChrome) {
    return (
      <>
        {createPortal(
          <>
            {backButton}
            {trail ?? heading}
          </>,
          chrome.title!,
        )}
        {actions &&
          createPortal(
            <div data-slot="page-actions" data-placement="chrome" className="sprout-page-header-actions">
              {actions}
            </div>,
            chrome.actions!,
          )}
        {description && (
          <p data-slot="page-description" className={cn('sprout-page-header-description', className)}>
            {description}
          </p>
        )}
      </>
    );
  }
  return (
    <header data-slot="page-header" className={cn('sprout-page-header', className)}>
      {backButton}
      <div className="sprout-page-header-row">
        <div className="sprout-page-header-text">
          {trail ?? heading}
          {description && (
            <p data-slot="page-description" className="sprout-page-header-description">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div data-slot="page-actions" data-placement="page" className="sprout-page-header-actions">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export interface PageActionsProps {
  children: ReactNode;
  className?: string | undefined;
}

/** Page-level actions without a header: moved into the app header when one is provided. */
export function PageActions({ children, className }: PageActionsProps) {
  const { actions } = useContext(PageChromeContext);
  return actions ? (
    createPortal(
      <div data-slot="page-actions" data-placement="chrome" className={cn('sprout-page-header-actions', className)}>
        {children}
      </div>,
      actions,
    )
  ) : (
    <div data-slot="page-actions" data-placement="inline" className={cn('sprout-page-header-actions', className)}>
      {children}
    </div>
  );
}
