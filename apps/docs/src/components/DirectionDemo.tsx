import { useState, type MouseEvent, type ReactNode } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@tulipfarm/sprout/breadcrumb';
import { DirectionProvider, useDirection, type TextDirection } from '@tulipfarm/sprout/direction';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import '../styles/direction-demo.css';

const stay = (event: MouseEvent) => event.preventDefault();

const copy = {
  ltr: {
    title: 'Left to right',
    project: 'Projects',
    page: 'Garden',
    view: 'View',
    views: ['List', 'Board', 'Calendar'],
  },
  rtl: {
    title: 'Right to left',
    project: 'المشاريع',
    page: 'الحديقة',
    view: 'العرض',
    views: ['قائمة', 'لوحة', 'تقويم'],
  },
} as const;

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="direction-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="direction-demo-card-body">{children}</div>
    </section>
  );
}

function ProjectPath({ direction }: { direction: TextDirection }) {
  const text = copy[direction];
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#example" onClick={stay}>
            {text.project}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{text.page}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function BothDirections() {
  return (
    <div className="direction-demo-pair">
      {(['ltr', 'rtl'] as const).map(direction => (
        <Example
          key={direction}
          title={copy[direction].title}
          description={
            direction === 'ltr'
              ? 'direction="ltr" with dir="ltr". The path starts on the left.'
              : 'direction="rtl" with dir="rtl". The path starts on the right and the chevron flips.'
          }
        >
          <DirectionProvider direction={direction}>
            <div dir={direction} className="direction-demo-frame">
              <ProjectPath direction={direction} />
            </div>
          </DirectionProvider>
        </Example>
      ))}
    </div>
  );
}

function DirectionReadout() {
  const direction = useDirection();
  return (
    <p dir="ltr" className="direction-demo-readout" data-direction={direction}>
      <code>useDirection()</code> returns <code>"{direction}"</code>
    </p>
  );
}

function ViewPicker({ direction }: { direction: TextDirection }) {
  const text = copy[direction];
  const [view, setView] = useState<string>(text.views[0]);
  return (
    <ToggleGroup
      aria-label={text.view}
      size="sm"
      variant="outline"
      spacing={0}
      value={[view]}
      onValueChange={next => next[0] && setView(next[0])}
    >
      {text.views.map(item => (
        <ToggleGroupItem key={item} value={item}>
          {item}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function SwitchDirection() {
  const [direction, setDirection] = useState<TextDirection>('rtl');
  return (
    <Example
      title="Keyboard and useDirection"
      description="Base UI parts read the provider. In right-to-left text, the left arrow moves to the next view. useDirection returns the same value to your own parts."
    >
      <div className="direction-demo-toolbar">
        <span id="direction-demo-label">Direction</span>
        <ToggleGroup
          aria-labelledby="direction-demo-label"
          size="sm"
          variant="outline"
          spacing={0}
          value={[direction]}
          onValueChange={next => next[0] && setDirection(next[0] as TextDirection)}
        >
          <ToggleGroupItem value="ltr">Left to right</ToggleGroupItem>
          <ToggleGroupItem value="rtl">Right to left</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <DirectionProvider direction={direction}>
        <div dir={direction} className="direction-demo-frame direction-demo-stack" data-testid="direction-demo-switch">
          <ProjectPath direction={direction} />
          <ViewPicker key={direction} direction={direction} />
          <DirectionReadout />
        </div>
      </DirectionProvider>
    </Example>
  );
}

export default function DirectionDemo() {
  return (
    <div id="direction-demo" className="direction-demo">
      <BothDirections />
      <SwitchDirection />
    </div>
  );
}
