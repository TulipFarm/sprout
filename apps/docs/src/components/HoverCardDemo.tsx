import type { MouseEvent } from 'react';
import { Avatar, AvatarFallback } from '@tulipfarm/sprout/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  type HoverCardContentProps,
} from '@tulipfarm/sprout/hover-card';
import '../styles/hover-card-demo.css';

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

type Side = NonNullable<HoverCardContentProps['side']>;

interface Person {
  name: string;
  initials: string;
  role: string;
  about: string;
}

const people: Record<'top' | 'right' | 'bottom' | 'left', Person> = {
  top: {
    name: 'Alex Meadow',
    initials: 'AM',
    role: 'Project coordinator',
    about: 'Fictional garden project coordinator.',
  },
  right: {
    name: 'Priya Raman',
    initials: 'PR',
    role: 'Growth lead',
    about: 'Runs the weekly seed-catalog review and owns the spring launch.',
  },
  bottom: {
    name: 'Jonas Becker',
    initials: 'JB',
    role: 'Support',
    about: 'Answers greenhouse questions in the shared inbox.',
  },
  left: {
    name: 'Mei Tanaka',
    initials: 'MT',
    role: 'Design',
    about: 'Draws the plot maps and planting guides for every season.',
  },
};

const sides = ['top', 'right', 'bottom', 'left'] as const;

/** Sample profile links stay on this page. */
const stay = (event: MouseEvent) => event.preventDefault();

function ProfileLink({ person, side }: { person: Person; side?: Side }) {
  return (
    <HoverCard>
      <HoverCardTrigger render={<a href="#fictional-profile" onClick={stay} />}>{person.name}</HoverCardTrigger>
      <HoverCardContent side={side}>
        <p className="font-medium">{person.name}</p>
        <p className="text-sm text-sprout-muted">{person.about}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

/* ------------------------------------------------------------------ */
/* Playground                                                          */
/* ------------------------------------------------------------------ */

export function HoverCardPlayground() {
  return (
    <section className="hover-card-demo-stage" aria-label="Hover card playground">
      <div className="hover-card-demo-toolbar">
        <span className="hover-card-demo-caption">Hover or Tab to a name. Escape or moving away closes the card.</span>
      </div>
      <div className="hover-card-demo-sides">
        {sides.map(side => (
          <div key={side} className="hover-card-demo-side" role="group" aria-label={side}>
            <span className="hover-card-demo-side-name">{side}</span>
            <ProfileLink person={people[side]} side={side} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* In running text                                                     */
/* ------------------------------------------------------------------ */

export function HoverCardInText() {
  const alex = people.top;
  const priya = people.right;
  return (
    <div className="hover-card-demo-card" aria-label="Mentions in text" role="region">
      <p className="hover-card-demo-text">
        <HoverCard>
          <HoverCardTrigger render={<a href="#fictional-profile" onClick={stay} />}>{priya.name}</HoverCardTrigger>
          <HoverCardContent align="start">
            <div className="hover-card-demo-profile">
              <Avatar size="lg">
                <AvatarFallback>{priya.initials}</AvatarFallback>
              </Avatar>
              <div className="hover-card-demo-profile-text">
                <p className="font-medium">{priya.name}</p>
                <p className="text-xs text-sprout-muted">{priya.role}</p>
              </div>
            </div>
            <p className="hover-card-demo-about text-sm text-sprout-muted">{priya.about}</p>
          </HoverCardContent>
        </HoverCard>{' '}
        moved the spring launch to Thursday. <ProfileLink person={alex} /> will confirm the plot assignments before
        then.
      </p>
      <p className="hover-card-demo-text">
        Notes from{' '}
        <HoverCard>
          <HoverCardTrigger render={<a href="#fictional-profile" onClick={stay} />}>
            greenhouse-irrigation-retrofit-north-wing-2026
          </HoverCardTrigger>
          <HoverCardContent side="top">
            <p className="font-medium">greenhouse-irrigation-retrofit-north-wing-2026</p>
            <p className="text-sm text-sprout-muted">
              Long names and unbroken text wrap inside the card instead of spilling out of it.
            </p>
          </HoverCardContent>
        </HoverCard>
        .
      </p>
    </div>
  );
}
