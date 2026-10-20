import { useState, type ReactNode } from 'react';
import { Separator } from '@tulipfarm/sprout/separator';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import '../styles/separator-fade-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="separator-fade-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="separator-fade-demo-card-body">{children}</div>
    </section>
  );
}

function Labels() {
  return (
    <Example
      title="Fade labels"
      description="Faded lines with a centered label. These are the two labels the chat uses after a compaction."
    >
      <div className="separator-fade-demo-labels">
        <Separator variant="fade">Auto compacted</Separator>
        <Separator variant="fade">Compacted</Separator>
      </div>
    </Example>
  );
}

type Trigger = 'manual' | 'automatic' | 'inactivity';
type Handoff = 'completed' | 'pending';

// Sample adapter: the label a finished compaction shows in the transcript.
function compactionLabel(trigger: Trigger) {
  return trigger === 'manual' ? 'Compacted' : 'Auto compacted';
}

const triggers: { value: Trigger; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'inactivity', label: 'Inactivity recap' },
];

function Message({ from, children }: { from: 'user' | 'assistant'; children: ReactNode }) {
  return (
    <div className="separator-fade-demo-message" data-from={from}>
      <p>{children}</p>
    </div>
  );
}

function ChatCompaction() {
  const [trigger, setTrigger] = useState<Trigger>('manual');
  const [handoff, setHandoff] = useState<Handoff>('completed');
  return (
    <Example
      title="Chat compaction"
      description="A finished compaction collapses to a fade separator between messages. While the handoff is still being written, the chat shows a status row instead."
    >
      <div className="separator-fade-demo-controls">
        <ToggleGroup
          aria-label="Compaction trigger"
          size="sm"
          value={[trigger]}
          onValueChange={value => value[0] && setTrigger(value[0] as Trigger)}
        >
          {triggers.map(({ value, label }) => (
            <ToggleGroupItem key={value} value={value}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          aria-label="Handoff status"
          size="sm"
          value={[handoff]}
          onValueChange={value => value[0] && setHandoff(value[0] as Handoff)}
        >
          <ToggleGroupItem value="completed">Completed</ToggleGroupItem>
          <ToggleGroupItem value="pending">Writing handoff</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="separator-fade-demo-transcript" role="log" aria-label="Sample chat">
        <Message from="user">Summarise the spring planting plan for the Meadow beds.</Message>
        <Message from="assistant">
          Tulips go in the north beds first, then the allium border once the soil drops below 12°C.
        </Message>
        {handoff === 'completed' ? (
          <Separator variant="fade">{compactionLabel(trigger)}</Separator>
        ) : (
          <p role="status" className="separator-fade-demo-status">
            Writing the handoff for this chat…
          </p>
        )}
        <Message from="user">Which beds still need compost?</Message>
      </div>
    </Example>
  );
}

function NarrowWidth() {
  return (
    <Example
      title="Narrow columns"
      description="The lines shrink first. If a label still does not fit, it stays on one line and ends with an ellipsis."
    >
      <div className="separator-fade-demo-narrow">
        <div data-testid="narrow-column">
          <Separator variant="fade">Auto compacted</Separator>
        </div>
        <div data-testid="narrow-column">
          <Separator variant="fade">Compacted</Separator>
        </div>
      </div>
    </Example>
  );
}

export default function SeparatorFadeDemo() {
  return (
    <div id="separator-fade-demo" className="separator-fade-demo">
      <Labels />
      <ChatCompaction />
      <NarrowWidth />
    </div>
  );
}
