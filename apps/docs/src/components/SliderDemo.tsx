import { useState, type ReactNode } from "react";
import { Slider } from "@tulipfarm/sprout/slider";
import "../styles/slider-demo.css";

function Example({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="slider-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="slider-demo-card-body">{children}</div>
    </section>
  );
}

function Row({
  testId,
  label,
  children,
}: {
  testId: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="slider-demo-row" data-testid={testId}>
      <p className="slider-demo-label">{label}</p>
      {children}
    </div>
  );
}

/* Number values arrive as a number, ranges as an array. */
const first = (next: number | readonly number[]) =>
  typeof next === "number" ? next : (next[0] ?? 0);

export function SliderStates() {
  const [value, setValue] = useState(40);
  const [range, setRange] = useState<number[]>([20, 75]);
  return (
    <Example
      title="Single and range"
      description="A number value gets one thumb. An array value gets one thumb per entry. Disabled sliders dim and ignore input."
    >
      <div className="slider-demo-stack">
        <Row testId="slider-single" label={`Volume: ${value}`}>
          <Slider
            aria-label="Volume"
            value={value}
            onValueChange={(next) => setValue(first(next))}
          />
        </Row>
        <Row testId="slider-range" label={`Range: ${range[0]}–${range[1]}`}>
          <Slider
            aria-label="Range"
            value={range}
            onValueChange={(next) => {
              if (typeof next !== "number") setRange([...next]);
            }}
          />
        </Row>
        <Row testId="slider-disabled" label="Disabled value: 65">
          <Slider aria-label="Disabled" disabled defaultValue={65} />
        </Row>
      </div>
    </Example>
  );
}

export function SliderVertical() {
  const [value, setValue] = useState(60);
  return (
    <Example
      title="Vertical"
      description="Set orientation to vertical. The slider fills its parent's height, with a 160px minimum."
    >
      <div className="slider-demo-vertical" data-testid="slider-vertical">
        <p className="slider-demo-label">Vertical volume: {value}</p>
        <Slider
          aria-label="Vertical volume"
          orientation="vertical"
          value={value}
          onValueChange={(next) => setValue(first(next))}
        />
      </div>
    </Example>
  );
}

export default function SliderDemo() {
  return (
    <div id="slider-demo" className="slider-demo">
      <SliderStates />
      <SliderVertical />
    </div>
  );
}
