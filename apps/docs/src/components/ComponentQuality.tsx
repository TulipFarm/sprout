import { Button } from '@tulipfarm/sprout/button';
import { CheckCircleIcon, CheckIcon, ChevronDownIcon, InfoIcon, WarningIcon } from '@tulipfarm/sprout/icons';
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '@tulipfarm/sprout/popover';
import type { ComponentStats } from '../data/registry';
import '../styles/component-docs.css';

type Tone = 'pass' | 'warn';

const kb = (bytes: number) => {
  const value = bytes / 1000;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} kB`;
};
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function rows(stats: ComponentStats) {
  const { size, accessibility, behavior, compiler, doctor } = stats;
  const issues = doctor.errors + doctor.warnings;
  return [
    {
      label: 'Size',
      value: `${kb(size.own)} · ${kb(size.total)}`,
      tone: 'pass' as Tone,
    },
    {
      label: 'Accessibility',
      value: accessibility
        ? `${plural(accessibility, 'check')} pass${accessibility === 1 ? 'es' : ''}`
        : 'Not checked yet',
      tone: (accessibility ? 'pass' : 'warn') as Tone,
    },
    {
      label: 'Behavior',
      value: behavior ? plural(behavior, 'test') : 'Not tested yet',
      tone: (behavior ? 'pass' : 'warn') as Tone,
    },
    {
      label: 'React Compiler',
      value: compiler.bailouts ? `${compiler.bailouts} skipped` : 'Optimized',
      tone: (compiler.bailouts ? 'warn' : 'pass') as Tone,
    },
    {
      label: 'React Doctor',
      value: issues
        ? [doctor.errors && plural(doctor.errors, 'error'), doctor.warnings && plural(doctor.warnings, 'warning')]
            .filter(Boolean)
            .join(' · ')
        : 'No issues',
      tone: (issues ? 'warn' : 'pass') as Tone,
    },
  ];
}

export default function ComponentQuality({ title, stats }: { title: string; stats: ComponentStats }) {
  const list = rows(stats);
  const verified = list.every(row => row.tone === 'pass');
  const notes = list.filter(row => row.tone === 'warn').length;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            shape="pill"
            className="component-quality-trigger"
            data-verified={verified}
          />
        }
      >
        {verified ? (
          <CheckCircleIcon data-icon="inline-start" className="component-quality-icon" aria-hidden="true" />
        ) : (
          <InfoIcon data-icon="inline-start" className="component-quality-icon" aria-hidden="true" />
        )}
        {verified ? 'Verified' : `Quality · ${plural(notes, 'note')}`}
        <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="component-quality" data-verified={verified}>
        <PopoverTitle className="component-quality-title">
          {verified ? (
            <CheckCircleIcon size="sm" className="component-quality-icon" aria-hidden="true" />
          ) : (
            <InfoIcon size="sm" className="component-quality-icon" aria-hidden="true" />
          )}
          {verified ? 'Verified' : `${plural(notes, 'note')}`}
        </PopoverTitle>
        <PopoverDescription className="sr-only">
          Size, tests, and static checks for the {title} source.
        </PopoverDescription>
        <dl className="component-quality-list">
          {list.map(row => (
            <div key={row.label} className="component-quality-row" data-tone={row.tone}>
              <dt>{row.label}</dt>
              <dd>
                {row.value}
                {row.tone === 'pass' ? (
                  <CheckIcon size="sm" aria-label="Passes" />
                ) : (
                  <WarningIcon size="sm" aria-label="Needs work" />
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="component-quality-footnote">
          Size is own code · with dependencies, min + gzip. Checked on every change.
        </p>
      </PopoverContent>
    </Popover>
  );
}
