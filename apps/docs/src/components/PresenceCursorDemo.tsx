import { useEffect, useState, type ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@tulipfarm/sprout/avatar';
import { PresenceCursor } from '@tulipfarm/sprout/presence-cursor';
import { Switch } from '@tulipfarm/sprout/switch';
import { Label } from '@tulipfarm/sprout/label';
import '../styles/presence-cursor-demo.css';

const people = [
  {
    name: 'rico@gmail.com',
    photo: '/presence-cursor-samples/rico.jpg',
    initials: 'R',
    color: '#c92a2a',
    x: 62,
    y: 14,
  },
  {
    name: 'jessica@gmail.com',
    photo: '/presence-cursor-samples/jessica.jpg',
    initials: 'J',
    color: '#5b4fe0',
    x: 44,
    y: 34,
  },
  {
    name: 'justin@gmail.com',
    photo: '/presence-cursor-samples/justin.jpg',
    initials: 'JU',
    color: '#1c6fb8',
    x: 66,
    y: 56,
  },
  {
    name: 'jenny@gmail.com',
    photo: '/presence-cursor-samples/jenny.jpg',
    initials: 'JE',
    color: '#b55309',
    x: 44,
    y: 70,
  },
];

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="presence-cursor-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="presence-cursor-demo-card-body">{children}</div>
    </section>
  );
}

/** Moves each sample cursor to a new spot every 1.6s. Percent of the board. */
function useWander(paused: boolean) {
  const [spots, setSpots] = useState(people.map(({ x, y }) => ({ x, y })));
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(
      () =>
        setSpots(current =>
          current.map(({ x, y }) => ({
            x: Math.min(70, Math.max(4, x + (Math.random() - 0.5) * 24)),
            y: Math.min(78, Math.max(4, y + (Math.random() - 0.5) * 24)),
          })),
        ),
      1600,
    );
    return () => window.clearInterval(id);
  }, [paused]);
  return spots;
}

type Kind = 'label' | 'initials' | 'photo';

function Board({ kind, moving }: { kind: Kind; moving: boolean }) {
  const spots = useWander(!moving);
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <div
      className="presence-cursor-demo-board"
      data-testid={`${kind}-board`}
      ref={node => {
        if (!node) return;
        const observer = new ResizeObserver(([entry]) =>
          setSize({
            width: entry!.contentRect.width,
            height: entry!.contentRect.height,
          }),
        );
        observer.observe(node);
        return () => observer.disconnect();
      }}
    >
      {size.width > 0 &&
        people.map((person, index) => (
          <PresenceCursor
            key={person.name}
            name={person.name}
            color={person.color}
            x={(spots[index]!.x / 100) * size.width}
            y={(spots[index]!.y / 100) * size.height}
            avatar={
              kind === 'label' ? undefined : (
                <Avatar size={kind === 'photo' ? 'md' : 'sm'}>
                  {kind === 'photo' && <AvatarImage src={person.photo} alt="" />}
                  <AvatarFallback>{person.initials}</AvatarFallback>
                </Avatar>
              )
            }
          />
        ))}
    </div>
  );
}

export default function PresenceCursorDemo() {
  const [moving, setMoving] = useState(false);
  return (
    <div id="presence-cursor-demo" className="presence-cursor-demo">
      <div className="presence-cursor-demo-controls">
        <Switch id="presence-cursor-move" checked={moving} onCheckedChange={setMoving} />
        <Label htmlFor="presence-cursor-move">Move cursors</Label>
      </div>
      <Example title="Name tags" description="Each cursor shows the person's email in their color.">
        <Board kind="label" moving={moving} />
      </Example>
      <Example
        title="Initials"
        description="Pass an Avatar with initials to show it next to the arrow instead of the tag."
      >
        <Board kind="initials" moving={moving} />
      </Example>
      <Example title="Face photos" description="An Avatar with a photo. The initials show until the photo loads.">
        <Board kind="photo" moving={moving} />
      </Example>
    </div>
  );
}
