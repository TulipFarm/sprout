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
      <ul aria-label="Web sources" className="m-0 flex list-none flex-wrap gap-1.5 p-0 pointer-coarse:gap-y-4">
        {sources.map(source => (
          <li key={source.url} className="min-w-0 max-w-full">
            <WebSource url={source.url} title={source.title} />
          </li>
        ))}
      </ul>
      <p className="m-0 max-w-prose text-[15px] leading-7">
        WCAG asks for text alternatives on every image{' '}
        <WebSource variant="inline" url={sources[1]!.url} title="WCAG 2 Overview" />, and MDN explains how screen
        readers announce them <WebSource variant="inline" url={sources[0]!.url} title="Accessibility | MDN" />.
        Playwright can check the result in a real browser{' '}
        <WebSource variant="inline" url={sources[2]!.url} title="Playwright" />.
      </p>
      <ul aria-label="Other states" className="m-0 flex list-none flex-wrap gap-1.5 p-0 pointer-coarse:gap-y-4">
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
