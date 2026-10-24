import { WebSource } from '@tulipfarm/sprout/web-source';

const sources = [
  { url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility', title: 'Accessibility | MDN' },
  { url: 'https://www.w3.org/WAI/standards-guidelines/wcag/', title: 'WCAG 2 Overview' },
  { url: 'https://github.com/microsoft/playwright', title: 'Playwright on GitHub' },
  { url: 'https://www.ons.gov.uk/economy/inflationandpriceindices' },
];

export default function WebSourceDemo() {
  return (
    <div className="flex flex-col gap-6">
      <ul aria-label="Web sources" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {sources.map(source => (
          <li key={source.url} className="min-w-0 max-w-full">
            <WebSource url={source.url} title={source.title} />
          </li>
        ))}
      </ul>
      <ul aria-label="Other states" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        <li className="min-w-0 max-w-full">
          <WebSource url="https://www.ft.com/content/inflation" title="Inflation outlook" failed />
        </li>
        <li className="min-w-0 max-w-full">
          <WebSource url="https://example.com/no-icon" title="No icon" icon={() => null} />
        </li>
      </ul>
    </div>
  );
}
