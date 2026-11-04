import { LinkOff } from 'reicon-react/icons/LinkOff';
import type { RichTextKeyword } from '../components/rich-text-editor.js';
import { accountLabel } from './keywords.js';

/** What a keyword chip says on hover, in the composer and in sent messages alike. */
export function KeywordHintBody({ keyword }: { keyword: RichTextKeyword }) {
  if (keyword.connected === false)
    return (
      <>
        <LinkOff size={14} aria-hidden="true" />
        <span>{keyword.label} isn't connected</span>
      </>
    );
  return (
    <>
      {keyword.icon != null && (
        <span className="sprout-rich-text-keyword-hint-icon" aria-hidden="true">
          {keyword.icon}
        </span>
      )}
      <span className="sprout-rich-text-keyword-hint-label">{keyword.label}</span>
      <span className="sprout-rich-text-keyword-hint-account">{accountLabel(keyword)}</span>
    </>
  );
}
