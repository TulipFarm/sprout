import { useState, type ReactNode } from 'react';
import { Edit } from 'reicon-react/icons/Edit';
import { MagicStar } from 'reicon-react/icons/MagicStar';
import { Refresh } from 'reicon-react/icons/Refresh';
import { Button } from '@tulipfarm/sprout/button';
import { TypedText } from '@tulipfarm/sprout/typed-text';
import '../styles/typed-text-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="typed-text-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="typed-text-demo-card-body">{children}</div>
    </section>
  );
}

interface SampleChat {
  title: string;
  titleRevision: number;
  titleManual: boolean;
}

const agentTitles = [
  'Prepare our investor pitch',
  'Compare Q3 vendor contracts for the Lisbon and Porto warehouse expansion',
  'Connected app results',
];

const manualTitle = 'Board deck — final review';

const newChat: SampleChat = {
  title: 'New chat',
  titleRevision: 0,
  titleManual: false,
};

function ChatTitle() {
  const [chat, setChat] = useState(newChat);
  const [next, setNext] = useState(0);
  const animate = !chat.titleManual && chat.titleRevision > 1;
  return (
    <Example
      title="Chat title"
      description="An agent names the chat. Its first title appears at once; later agent renames type in. A title someone typed by hand never animates."
    >
      <div className="typed-text-demo-chat" data-testid="chat-header">
        <h4 tabIndex={-1} title={chat.title} className="typed-text-demo-chat-title">
          <TypedText text={chat.title} animate={animate} />
        </h4>
      </div>
      <dl className="typed-text-demo-meta" data-testid="chat-meta">
        <div>
          <dt>Revision</dt>
          <dd>{chat.titleRevision}</dd>
        </div>
        <div>
          <dt>Named by</dt>
          <dd>{chat.titleRevision === 0 ? 'Nobody yet' : chat.titleManual ? 'Person' : 'Agent'}</dd>
        </div>
        <div>
          <dt>Animated</dt>
          <dd>{animate ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
      <div className="typed-text-demo-row">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setChat(current => ({
              title: agentTitles[next % agentTitles.length]!,
              titleRevision: current.titleRevision + 1,
              titleManual: false,
            }));
            setNext(next + 1);
          }}
        >
          <MagicStar aria-hidden="true" />
          Agent renames
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setChat(current => ({
              title: manualTitle,
              titleRevision: current.titleRevision + 1,
              titleManual: true,
            }))
          }
        >
          <Edit aria-hidden="true" />
          Edit title
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setChat(newChat);
            setNext(0);
          }}
        >
          <Refresh aria-hidden="true" />
          Reset
        </Button>
      </div>
    </Example>
  );
}

function Sentence() {
  const [alternate, setAlternate] = useState(false);
  return (
    <Example
      title="Animated changes"
      description="Each change types the new sentence in, 25ms a character and never longer than 800ms."
    >
      <p className="typed-text-demo-sentence" data-testid="sentence">
        <TypedText text={alternate ? 'Your fictional garden plan is ready.' : 'Let’s make a garden plan.'} />
      </p>
      <div className="typed-text-demo-row">
        <Button variant="outline" onClick={() => setAlternate(!alternate)}>
          Change sentence
        </Button>
      </div>
    </Example>
  );
}

function Graphemes() {
  const [alternate, setAlternate] = useState(false);
  return (
    <Example
      title="Emoji and accents"
      description="Typing steps by what a reader sees as one character, so emoji families and accented letters never split."
    >
      <p className="typed-text-demo-sentence" data-testid="graphemes">
        <TypedText text={alternate ? '👩‍🌾 Crew booked for Café Søndergård 🌷' : '🌱 Seed order sent to Jürgen'} />
      </p>
      <div className="typed-text-demo-row">
        <Button variant="outline" size="sm" onClick={() => setAlternate(!alternate)}>
          Change status
        </Button>
      </div>
    </Example>
  );
}

function Static() {
  return (
    <Example title="Without animation" description={'animate={false} shows every change at once.'}>
      <p className="typed-text-demo-sentence" data-testid="static">
        <TypedText text="This sentence appears immediately." animate={false} />
      </p>
    </Example>
  );
}

export default function TypedTextDemo() {
  return (
    <div id="typed-text-demo" className="typed-text-demo">
      <ChatTitle />
      <Sentence />
      <Graphemes />
      <Static />
    </div>
  );
}
