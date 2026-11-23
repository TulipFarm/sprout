import type { ReactNode } from 'react';
import { Badge } from '../../components/badge.js';
import { SampleMark, SampleText, type SampleMarkTone, type SampleWindowProps } from '../../components/state-sample.js';

/** Pass-through props for the outer sample window. */
export type StatePanelSampleProps = Omit<SampleWindowProps, 'icon' | 'trail' | 'tabs' | 'children'>;

export const muted = (text: string) => <SampleText tone="muted">{text}</SampleText>;
export const strong = (text: string) => <SampleText tone="strong">{text}</SampleText>;
export const named = (tone: SampleMarkTone, text: string) => (
  <>
    <SampleMark tone={tone} />
    {strong(text)}
  </>
);
export const badge = (variant: 'success' | 'secondary' | 'warning' | 'info', text: ReactNode) => (
  <Badge variant={variant}>{text}</Badge>
);
