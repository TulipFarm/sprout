import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { Bell } from 'reicon-react/icons/Bell';
import { Bold } from 'reicon-react/icons/Bold';
import { ChevronDown } from 'reicon-react/icons/ChevronDown';
import { Code } from 'reicon-react/icons/Code';
import { Eye } from 'reicon-react/icons/Eye';
import { Filter } from 'reicon-react/icons/Filter';
import { Italic } from 'reicon-react/icons/Italic';
import { Pin } from 'reicon-react/icons/Pin';
import { Star } from 'reicon-react/icons/Star';
import { Underline } from 'reicon-react/icons/Underline';
import {
  Toggle,
  toggleVariantNames,
  toggleVariants,
  type ToggleSize,
  type ToggleVariant,
} from '@tulipfarm/sprout/toggle';
import '../styles/toggle-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="toggle-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="toggle-demo-card-body">{children}</div>
    </section>
  );
}

const sizes: Record<ToggleSize, { label: string; note: string }> = {
  sm: { label: 'Small', note: '28px · filter chip' },
  md: { label: 'Medium', note: '32px · icon and label' },
  lg: { label: 'Large', note: '36px · view option' },
};

/* Each size shows the content Cloud pairs with it. */
function SizeSample({ variant, size }: { variant: ToggleVariant; size: ToggleSize }) {
  return (
    <div className="toggle-demo-row">
      {size === 'sm' ? (
        <>
          <Toggle variant={variant} size="sm" defaultPressed>
            <Star data-icon="inline-start" aria-hidden="true" />
            Starred
          </Toggle>
          <Toggle variant={variant} size="sm" aria-label="Small bold">
            <Bold aria-hidden="true" />
          </Toggle>
        </>
      ) : size === 'lg' ? (
        <>
          <Toggle variant={variant} size="lg" defaultPressed>
            <Eye data-icon="inline-start" aria-hidden="true" />
            Show archived
          </Toggle>
          <Toggle variant={variant} size="lg" aria-label="Large bold">
            <Bold aria-hidden="true" />
          </Toggle>
        </>
      ) : (
        <>
          <Toggle variant={variant} defaultPressed>
            <Bold data-icon="inline-start" aria-hidden="true" />
            Bold
          </Toggle>
          <Toggle variant={variant} aria-label="Italic">
            <Italic aria-hidden="true" />
          </Toggle>
        </>
      )}
    </div>
  );
}

export function ToggleVariants() {
  return (
    <Example
      title="Variants and sizes"
      description="default has no border. outline draws a control border. Each size pairs a labeled toggle with an icon-only one."
    >
      <div className="toggle-demo-matrix">
        {(['sm', 'md', 'lg'] as const).map(size => (
          <div key={size} className="toggle-demo-matrix-row">
            <div className="toggle-demo-matrix-label">
              <p>{sizes[size].label}</p>
              <span>{sizes[size].note}</span>
            </div>
            {toggleVariantNames.map(variant => (
              <div key={variant} className="toggle-demo-matrix-cell" data-testid={`sample-${variant}-${size}`}>
                <span className="toggle-demo-caption">{variant}</span>
                <SizeSample variant={variant} size={size} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Example>
  );
}

export function ToggleStates() {
  return (
    <Example
      title="States"
      description="Off, on, disabled, and disabled while on. A disabled toggle keeps its pressed look so the saved value stays visible."
    >
      {toggleVariantNames.map(variant => (
        <div key={variant} className="toggle-demo-stack" data-testid={`states-${variant}`}>
          <span className="toggle-demo-caption">{variant}</span>
          <div className="toggle-demo-row">
            <Toggle variant={variant} aria-label={`${variant} bold off`}>
              <Bold aria-hidden="true" />
            </Toggle>
            <Toggle variant={variant} defaultPressed aria-label={`${variant} bold on`}>
              <Bold aria-hidden="true" />
            </Toggle>
            <Toggle variant={variant} disabled aria-label={`${variant} italic disabled`}>
              <Italic aria-hidden="true" />
            </Toggle>
            <Toggle variant={variant} disabled defaultPressed aria-label={`${variant} italic disabled on`}>
              <Italic aria-hidden="true" />
            </Toggle>
          </div>
        </div>
      ))}
    </Example>
  );
}

type Format = 'bold' | 'italic' | 'underline' | 'code';
const formats: { value: Format; label: string; icon: typeof Bold }[] = [
  { value: 'bold', label: 'Bold', icon: Bold },
  { value: 'italic', label: 'Italic', icon: Italic },
  { value: 'underline', label: 'Underline', icon: Underline },
  { value: 'code', label: 'Inline code', icon: Code },
];

export function ToggleToolbar() {
  const [applied, setApplied] = useState<Format[]>(['bold']);
  return (
    <Example
      title="Formatting toolbar"
      description="Each toggle is controlled with pressed and onPressedChange. Tab moves between them; Space or Enter presses one."
    >
      <div className="toggle-demo-panel">
        <div className="toggle-demo-row" role="toolbar" aria-label="Text formatting">
          {formats.map(({ value, label, icon: Icon }) => (
            <Toggle
              key={value}
              size="sm"
              aria-label={label}
              pressed={applied.includes(value)}
              onPressedChange={pressed =>
                setApplied(current => (pressed ? [...current, value] : current.filter(item => item !== value)))
              }
            >
              <Icon aria-hidden="true" />
            </Toggle>
          ))}
        </div>
        <p className="toggle-demo-muted" role="status">
          {applied.length
            ? `Applied: ${formats
                .filter(({ value }) => applied.includes(value))
                .map(({ label }) => label)
                .join(', ')}`
            : 'No formatting'}
        </p>
      </div>
    </Example>
  );
}

export function ToggleIcons() {
  return (
    <Example
      title="Icon placement"
      description='Mark a leading or trailing icon with data-icon="inline-start" or "inline-end" to tighten that side by 2px.'
    >
      <div className="toggle-demo-row">
        <Toggle variant="outline" size="sm">
          <Filter data-icon="inline-start" aria-hidden="true" />
          Open only
        </Toggle>
        <Toggle variant="outline">
          Group by owner
          <ChevronDown data-icon="inline-end" aria-hidden="true" />
        </Toggle>
        <Toggle variant="outline" size="lg" defaultPressed>
          <Pin data-icon="inline-start" aria-hidden="true" />
          Pinned to sidebar
        </Toggle>
      </div>
    </Example>
  );
}

export function ToggleSaving() {
  const [following, setFollowing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <Example
      title="Saving and errors"
      description="Disable the toggle and set aria-busy while a change saves. Set aria-invalid and describe the error when it fails."
    >
      <div className="toggle-demo-panel">
        <div className="toggle-demo-row">
          <Toggle
            variant="outline"
            pressed={following}
            disabled={saving}
            aria-busy={saving || undefined}
            onPressedChange={pressed => {
              setSaving(true);
              timer.current = window.setTimeout(() => {
                setFollowing(pressed);
                setSaving(false);
              }, 700);
            }}
          >
            <Bell data-icon="inline-start" aria-hidden="true" />
            Follow table
          </Toggle>
          <span className="toggle-demo-muted" role="status">
            {saving ? 'Saving…' : following ? 'You get updates.' : ''}
          </span>
        </div>
        <div className="toggle-demo-stack">
          <div className="toggle-demo-row">
            <Toggle
              variant="outline"
              aria-invalid={failed || undefined}
              aria-describedby={failed ? 'toggle-demo-error' : undefined}
              onPressedChange={pressed => setFailed(pressed)}
              pressed={failed}
            >
              <Pin data-icon="inline-start" aria-hidden="true" />
              Pin to sidebar
            </Toggle>
          </div>
          {failed ? (
            <p id="toggle-demo-error" className="toggle-demo-error">
              The sidebar holds 8 pins. Unpin one first.
            </p>
          ) : (
            <p className="toggle-demo-muted">Press Pin to sidebar to see the error.</p>
          )}
        </div>
      </div>
    </Example>
  );
}

const ranges = ['7d', '30d', '90d'] as const;

export function ToggleVariantsFunction() {
  const [range, setRange] = useState<string[]>(['30d']);
  return (
    <Example
      title="toggleVariants"
      description="Give a Base UI Toggle the same look inside your own group. This is how Toggle Group items get their style."
    >
      {(['default', 'outline'] as const).map(variant => (
        <div key={variant} className="toggle-demo-stack">
          <span className="toggle-demo-caption">{variant} · sm</span>
          <BaseToggleGroup
            aria-label={`${variant} time range`}
            className="toggle-demo-group"
            value={range}
            onValueChange={value => {
              if (value[0]) setRange(value);
            }}
          >
            {ranges.map(value => (
              <BaseToggle key={value} value={value} className={toggleVariants({ variant, size: 'sm' })}>
                {value}
              </BaseToggle>
            ))}
          </BaseToggleGroup>
        </div>
      ))}
    </Example>
  );
}

export default function ToggleDemo() {
  return (
    <div id="toggle-demo" className="toggle-demo">
      <ToggleVariants />
      <ToggleStates />
      <ToggleToolbar />
      <ToggleIcons />
      <ToggleSaving />
      <ToggleVariantsFunction />
    </div>
  );
}
