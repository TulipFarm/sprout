import type { ReactNode } from 'react';
import { BookOpen } from 'reicon-react/icons/BookOpen';
import { Calendar } from 'reicon-react/icons/Calendar';
import { Check } from 'reicon-react/icons/Check';
import { History } from 'reicon-react/icons/History';
import { Separator, SeparatorContent, SeparatorIcon } from '@tulipfarm/sprout/separator';
import '../styles/separator-marker-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="separator-marker-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="separator-marker-demo-card-body">{children}</div>
    </section>
  );
}

const rowKinds = ['marker', 'label', 'marker-border'] as const;
type RowKind = (typeof rowKinds)[number];

function TimelineRow({ kind, icon, children }: { kind: RowKind; icon: ReactNode; children: ReactNode }) {
  if (kind === 'label')
    return (
      <Separator>
        <SeparatorIcon>{icon}</SeparatorIcon>
        {children}
      </Separator>
    );
  return (
    <Separator variant={kind}>
      <SeparatorIcon>{icon}</SeparatorIcon>
      <SeparatorContent>{children}</SeparatorContent>
    </Separator>
  );
}

const rowNotes: Record<RowKind, { code: string; note: string; icon: ReactNode; text: string }> = {
  marker: {
    code: 'variant="marker"',
    note: 'Icon and text on one quiet row. Chat uses it for skill use.',
    icon: <BookOpen size={16} />,
    text: 'Used skill Weekly report · 3f9a2c1b',
  },
  label: {
    code: '<Separator>',
    note: 'An icon and text centered between two lines. Use it to split a timeline by day.',
    icon: <Check />,
    text: 'Today',
  },
  'marker-border': {
    code: 'variant="marker-border"',
    note: 'A line under the row. Use it as a heading over a group of events.',
    icon: <History />,
    text: 'Yesterday · 4 events',
  },
};

function Variants() {
  return (
    <Example
      title="Marker variants"
      description="One 14px text size with a 16px icon. Pick the row by how strongly the note should split the timeline."
    >
      <div className="separator-marker-demo-variants">
        {rowKinds.map(kind => (
          <div key={kind} className="separator-marker-demo-variant" data-testid={`variant-${kind}`}>
            <div className="separator-marker-demo-variant-text">
              <code>{rowNotes[kind].code}</code>
              <span>{rowNotes[kind].note}</span>
            </div>
            <TimelineRow kind={kind} icon={rowNotes[kind].icon}>
              {rowNotes[kind].text}
            </TimelineRow>
          </div>
        ))}
      </div>
    </Example>
  );
}

function PlaygroundVariants() {
  return (
    <Example
      title="Timeline marker variants"
      description="The internal playground row. Each row has a check icon and its name with “Today”."
    >
      <div className="separator-marker-demo-preview">
        {rowKinds.map(kind => (
          <TimelineRow key={kind} kind={kind} icon={<Check />}>
            {kind} · Today
          </TimelineRow>
        ))}
      </div>
    </Example>
  );
}

interface SampleSkill {
  name: string;
  revision: string;
}

const skillLabel = (skill: SampleSkill) => `${skill.name} · ${skill.revision.slice(0, 8)}`;

function SkillUse({ skill }: { skill: SampleSkill }) {
  return (
    <Separator variant="marker">
      <SeparatorIcon>
        <BookOpen size={16} />
      </SeparatorIcon>
      <SeparatorContent>Used skill {skillLabel(skill)}</SeparatorContent>
    </Separator>
  );
}

type ChatPart =
  | { type: 'text'; role: 'user' | 'assistant'; text: string }
  | { type: 'skill-use'; skill: SampleSkill }
  | { type: 'day'; label: string };

const conversation: ChatPart[] = [
  { type: 'day', label: 'Today' },
  {
    type: 'text',
    role: 'user',
    text: "Draft this week's greenhouse update for the team.",
  },
  {
    type: 'skill-use',
    skill: { name: 'Weekly report', revision: '3f9a2c1b7d40e6a2' },
  },
  {
    type: 'skill-use',
    skill: { name: 'Plain language', revision: 'a71e09c45b2f8d13' },
  },
  {
    type: 'text',
    role: 'assistant',
    text: 'Here is the update. Seedlings in bay 2 are ready to move, and the new drip lines are in.',
  },
];

function ChatTimeline() {
  return (
    <Example
      title="Chat skill use"
      description="Sample chat parts. A skill-use part renders a marker with a book icon, the skill name, and an 8-character revision. A day part renders a labeled Separator."
    >
      <div className="separator-marker-demo-chat" role="log" aria-label="Sample chat">
        {conversation.map((part, index) => {
          switch (part.type) {
            case 'day':
              return (
                <Separator key={index}>
                  <SeparatorIcon>
                    <Calendar />
                  </SeparatorIcon>
                  {part.label}
                </Separator>
              );
            case 'skill-use':
              return <SkillUse key={index} skill={part.skill} />;
            case 'text':
              return (
                <p key={index} className="separator-marker-demo-message" data-role={part.role}>
                  {part.text}
                </p>
              );
          }
        })}
      </div>
    </Example>
  );
}

function Links() {
  return (
    <Example
      title="Links"
      description="Links inside SeparatorContent, or a whole marker rendered as a link, are underlined and darken on hover and focus."
    >
      <div className="separator-marker-demo-preview">
        <Separator variant="marker">
          <SeparatorIcon>
            <History />
          </SeparatorIcon>
          <SeparatorContent>
            Robin edited the brief · <a href="#separator-marker-demo">View changes</a>
          </SeparatorContent>
        </Separator>
        <Separator variant="marker" render={<a href="#separator-marker-demo" />}>
          <SeparatorIcon>
            <BookOpen size={16} />
          </SeparatorIcon>
          <SeparatorContent>Open skill Weekly report · 3f9a2c1b</SeparatorContent>
        </Separator>
      </div>
    </Example>
  );
}

function Narrow() {
  return (
    <Example
      title="Long content"
      description="In narrow columns marker text wraps. A labeled row stays on one line and ends with an ellipsis."
    >
      <div className="separator-marker-demo-narrow">
        {rowKinds.map(kind => (
          <div key={kind} className="separator-marker-demo-narrow-column" data-testid={`narrow-${kind}`}>
            <TimelineRow kind={kind} icon={<BookOpen size={16} />}>
              Used skill Quarterly greenhouse operations summary · 9c04be7f
            </TimelineRow>
          </div>
        ))}
      </div>
    </Example>
  );
}

export default function SeparatorMarkerDemo() {
  return (
    <div id="separator-marker-demo" className="separator-marker-demo">
      <Variants />
      <ChatTimeline />
      <PlaygroundVariants />
      <Links />
      <Narrow />
    </div>
  );
}
