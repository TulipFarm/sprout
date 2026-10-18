import { useState, type ReactNode } from "react";
import { AspectRatio } from "@tulipfarm/sprout/aspect-ratio";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import "../styles/aspect-ratio-demo.css";

const sampleImage = "/aspect-ratio-samples/landscape.svg";

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
    <section className="aspect-ratio-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="aspect-ratio-demo-card-body">{children}</div>
    </section>
  );
}

function ImageRatios() {
  return (
    <Example
      title="Image ratios"
      description="The three ratios the playground shows: 16:9, 4:3, and square. Each frame fills its column up to 288px, and the image covers the frame."
    >
      <div className="aspect-ratio-demo-ratios">
        {[16 / 9, 4 / 3, 1].map((ratio) => (
          <figure key={ratio} className="aspect-ratio-demo-figure">
            <div className="aspect-ratio-demo-frame">
              <AspectRatio ratio={ratio}>
                <img
                  src={sampleImage}
                  alt="Fictional green landscape"
                  className="aspect-ratio-demo-media"
                />
              </AspectRatio>
            </div>
            <figcaption>Ratio {ratio.toFixed(2)}</figcaption>
          </figure>
        ))}
      </div>
    </Example>
  );
}

const choices = [
  {
    value: "16:9",
    label: "16:9",
    ratio: 16 / 9,
    use: "Video and cover images",
  },
  { value: "4:3", label: "4:3", ratio: 4 / 3, use: "Photos and screenshots" },
  { value: "1:1", label: "Square", ratio: 1, use: "Thumbnails and avatars" },
] as const;

type Choice = (typeof choices)[number]["value"];

function ChooseRatio() {
  const [value, setValue] = useState<Choice>("16:9");
  const choice = choices.find((item) => item.value === value)!;
  return (
    <Example
      title="Change the ratio"
      description="The ratio is a number, so it can change at runtime. The frame keeps its width and the height follows."
    >
      <ToggleGroup
        aria-label="Ratio"
        size="sm"
        variant="outline"
        spacing={0}
        value={[value]}
        onValueChange={(next) => next[0] && setValue(next[0] as Choice)}
      >
        {choices.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="aspect-ratio-demo-live">
        <div className="aspect-ratio-demo-frame">
          <AspectRatio ratio={choice.ratio} data-testid="live-ratio">
            <img
              src={sampleImage}
              alt="Fictional green landscape"
              className="aspect-ratio-demo-media"
            />
          </AspectRatio>
        </div>
        <p role="status" className="aspect-ratio-demo-status">
          {choice.label} · Ratio {choice.ratio.toFixed(2)} · {choice.use}
        </p>
      </div>
    </Example>
  );
}

function ReservedSpace() {
  return (
    <Example
      title="Reserved space"
      description="The frame holds its height before the image arrives, so the page does not jump. Put a placeholder or a fallback inside it."
    >
      <div className="aspect-ratio-demo-ratios">
        <figure className="aspect-ratio-demo-figure">
          <div className="aspect-ratio-demo-frame">
            <AspectRatio ratio={16 / 9} aria-busy="true">
              <div
                role="status"
                className="aspect-ratio-demo-placeholder"
                data-state="loading"
              >
                Loading preview…
              </div>
            </AspectRatio>
          </div>
          <figcaption>Loading</figcaption>
        </figure>
        <figure className="aspect-ratio-demo-figure">
          <div className="aspect-ratio-demo-frame">
            <AspectRatio ratio={4 / 3}>
              <div className="aspect-ratio-demo-placeholder" data-state="error">
                Preview unavailable
              </div>
            </AspectRatio>
          </div>
          <figcaption>Image failed</figcaption>
        </figure>
        <figure className="aspect-ratio-demo-figure">
          <div className="aspect-ratio-demo-frame">
            <AspectRatio ratio={1}>
              <div className="aspect-ratio-demo-placeholder" data-state="empty">
                No cover image yet. Upload one in project settings to show it
                here.
              </div>
            </AspectRatio>
          </div>
          <figcaption>Empty, long text</figcaption>
        </figure>
      </div>
    </Example>
  );
}

export default function AspectRatioDemo() {
  return (
    <div id="aspect-ratio-demo" className="aspect-ratio-demo">
      <ImageRatios />
      <ChooseRatio />
      <ReservedSpace />
    </div>
  );
}
