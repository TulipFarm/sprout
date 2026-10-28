import { useMemo, useState } from 'react';
import { A2uiSurface, checkSurface, sproutCatalog, type A2uiAction, type A2uiSize } from '@tulipfarm/sprout/a2ui';
import { CodeBlock } from '@tulipfarm/sprout/code-block';
import { ToggleGroup, ToggleGroupItem } from '@tulipfarm/sprout/toggle-group';
import { brokenExample, dateExample, memoryExample, reportExample, streamingExample } from '../data/a2ui-examples';
import '../styles/a2ui-demo.css';

const examples = {
  date: { label: 'Date and week', messages: dateExample, size: 'compact', streaming: false },
  memory: { label: 'Memory with chart', messages: memoryExample, size: 'compact', streaming: false },
  report: { label: 'Report', messages: reportExample, size: 'full', streaming: false },
  streaming: { label: 'Streaming', messages: streamingExample, size: 'compact', streaming: true },
  broken: { label: 'Broken part', messages: brokenExample, size: 'compact', streaming: false },
} as const satisfies Record<string, { label: string; messages: unknown[]; size: A2uiSize; streaming: boolean }>;

type ExampleName = keyof typeof examples;

export default function A2uiSurfaceDemo() {
  const [name, setName] = useState<ExampleName>('memory');
  const [action, setAction] = useState<string>();
  const example = examples[name];
  const check = useMemo(() => checkSurface(example.messages, { catalog: sproutCatalog }), [example]);
  return (
    <div className="a2ui-demo" data-testid="a2ui-demo">
      <ToggleGroup
        aria-label="Example reply"
        variant="outline"
        size="sm"
        spacing={0}
        value={[name]}
        onValueChange={value => {
          if (value[0]) {
            setName(value[0] as ExampleName);
            setAction(undefined);
          }
        }}
      >
        {Object.entries(examples).map(([key, item]) => (
          <ToggleGroupItem key={key} value={key}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="a2ui-demo-frame" data-size={example.size}>
        <p className="a2ui-demo-where">{example.size === 'compact' ? 'In chat' : 'In Canvas'}</p>
        <A2uiSurface
          messages={example.messages}
          size={example.size}
          streaming={example.streaming}
          onAction={(next: A2uiAction) =>
            setAction(next.type === 'send' ? `Sends “${next.text}”` : `Opens ${next.componentId} in full`)
          }
        />
        {action ? (
          <p className="a2ui-demo-action" role="status">
            {action}
          </p>
        ) : null}
      </div>
      <p className="a2ui-demo-check" data-ok={check.ok}>
        {check.ok
          ? 'checkSurface: valid'
          : `checkSurface: ${check.errors.length} problem${check.errors.length === 1 ? '' : 's'}: ${check.errors[0]?.message}`}
      </p>
      <CodeBlock code={JSON.stringify(example.messages, null, 2)} language="json" filename="messages.json" />
    </div>
  );
}
