import type { ReactNode } from "react";
import { Button } from "@tulipfarm/sprout/button";
import { ScrollArea } from "@tulipfarm/sprout/scroll-area";
import "../styles/scroll-area-demo.css";

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
    <section className="scroll-area-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="scroll-area-demo-card-body">{children}</div>
    </section>
  );
}

function Records({ count, wide = false }: { count: number; wide?: boolean }) {
  return (
    <div className="scroll-area-demo-records" data-wide={wide || undefined}>
      {Array.from({ length: count }, (_, index) => (
        <p key={index}>Sample record {index + 1} · Meadow project</p>
      ))}
    </div>
  );
}

const sizes = [
  {
    size: "sm",
    variant: "plain",
    orientation: "vertical",
    count: 16,
    note: 'size="sm" · plain · vertical · 10rem tall',
  },
  {
    size: "md",
    variant: "plain",
    orientation: "both",
    count: 16,
    note: 'size="md" · plain · both · 16rem tall, 40rem wide content',
  },
  {
    size: "auto",
    variant: "table",
    orientation: "vertical",
    count: 8,
    note: 'size="auto" · table · vertical · grows to 60dvh',
  },
] as const;

function Sizes() {
  return (
    <Example
      title="Sizes"
      description="Each size with the variant and orientation it is used with. The bars appear only on axes that overflow."
    >
      <div className="scroll-area-demo-sizes">
        {sizes.map((item) => (
          <figure key={item.size} className="scroll-area-demo-size">
            <figcaption>{item.note}</figcaption>
            <ScrollArea
              size={item.size}
              variant={item.variant}
              orientation={item.orientation}
              viewportLabel={`${item.size} sample records`}
              data-testid={`size-${item.size}`}
              className={
                item.variant === "plain" ? "scroll-area-demo-framed" : undefined
              }
            >
              <Records count={item.count} wide={item.size === "md"} />
            </ScrollArea>
          </figure>
        ))}
      </div>
    </Example>
  );
}

const plantings = [
  [
    "Meadow",
    "Tulip ‘Apricot Beauty’",
    "North bed",
    "Planted",
    "12 Oct",
    "Dhruv",
  ],
  ["Meadow", "Narcissus ‘Thalia’", "Orchard edge", "Ordered", "14 Oct", "Asha"],
  [
    "Riverside",
    "Allium ‘Purple Sensation’",
    "Border 2",
    "Planted",
    "15 Oct",
    "Lena",
  ],
  [
    "Riverside",
    "Crocus tommasinianus",
    "Lawn drift",
    "Scheduled",
    "18 Oct",
    "Dhruv",
  ],
  [
    "Hilltop",
    "Fritillaria meleagris",
    "Wet meadow",
    "Ordered",
    "19 Oct",
    "Asha",
  ],
  [
    "Hilltop",
    "Camassia leichtlinii",
    "Pond margin",
    "Scheduled",
    "21 Oct",
    "Lena",
  ],
  [
    "Meadow",
    "Tulip ‘Ballerina’",
    "Cutting garden",
    "Planted",
    "22 Oct",
    "Dhruv",
  ],
  [
    "Riverside",
    "Muscari armeniacum",
    "Path edge",
    "Scheduled",
    "24 Oct",
    "Asha",
  ],
  ["Hilltop", "Iris reticulata", "Gravel bed", "Ordered", "25 Oct", "Lena"],
  ["Meadow", "Anemone blanda", "Woodland", "Scheduled", "27 Oct", "Dhruv"],
  ["Riverside", "Scilla siberica", "Under hedge", "Planted", "28 Oct", "Asha"],
  [
    "Hilltop",
    "Tulip ‘Queen of Night’",
    "Terrace pots",
    "Scheduled",
    "30 Oct",
    "Lena",
  ],
  ["Orchard", "Galanthus nivalis", "Under pears", "Ordered", "2 Nov", "Dhruv"],
  ["Orchard", "Eranthis hyemalis", "Grass verge", "Scheduled", "3 Nov", "Asha"],
  ["Woodland", "Erythronium ‘Pagoda’", "Fern walk", "Ordered", "5 Nov", "Lena"],
  [
    "Woodland",
    "Hyacinthoides non-scripta",
    "Copse",
    "Scheduled",
    "6 Nov",
    "Dhruv",
  ],
  [
    "Courtyard",
    "Tulip ‘Black Parrot’",
    "Large urns",
    "Planted",
    "8 Nov",
    "Asha",
  ],
  [
    "Courtyard",
    "Hyacinth ‘Woodstock’",
    "Window boxes",
    "Scheduled",
    "9 Nov",
    "Lena",
  ],
  ["Meadow", "Tulip sylvestris", "Long grass", "Ordered", "11 Nov", "Dhruv"],
  [
    "Riverside",
    "Leucojum aestivum",
    "Stream bank",
    "Scheduled",
    "12 Nov",
    "Asha",
  ],
];

function DataGrid() {
  return (
    <Example
      title="Data grid"
      description='variant="table" with orientation="both". The table label names the region, and the header stays pinned while rows scroll.'
    >
      <ScrollArea
        variant="table"
        orientation="both"
        viewportLabel="Bulb plantings"
        data-slot="table-container"
      >
        <table aria-label="Bulb plantings" className="scroll-area-demo-grid">
          <thead>
            <tr>
              {["Project", "Bulb", "Location", "Status", "Date", "Owner"].map(
                (heading) => (
                  <th key={heading} scope="col">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {plantings.map((row) => (
              <tr key={row[1]}>
                {row.map((cell, index) => (
                  <td key={index}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </Example>
  );
}

const projects = [
  ["Meadow", "Spring planting plan", "24 tasks"],
  ["Riverside", "Wetland border refresh", "11 tasks"],
  ["Hilltop", "Terrace pots and gravel", "8 tasks"],
  ["Orchard", "Underplanting the old pears", "15 tasks"],
  ["Woodland", "Shade bulbs and ferns", "6 tasks"],
  ["Courtyard", "Container rotation", "9 tasks"],
];

function Horizontal() {
  return (
    <Example
      title="Horizontal"
      description='orientation="horizontal" for a single row of cards. Shift + wheel, a trackpad swipe, or arrow keys on the focused region scroll it.'
    >
      <ScrollArea
        orientation="horizontal"
        viewportLabel="Projects"
        data-testid="horizontal"
      >
        <ul className="scroll-area-demo-row" aria-label="Projects">
          {projects.map(([name, summary, tasks]) => (
            <li key={name} className="scroll-area-demo-tile">
              <p className="scroll-area-demo-strong">{name}</p>
              <p className="scroll-area-demo-muted">{summary}</p>
              <p className="scroll-area-demo-meta">{tasks}</p>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </Example>
  );
}

function States() {
  return (
    <Example
      title="States"
      description="Loading and error content keep the table frame. Empty content does not overflow, so no bars draw and the region is skipped by Tab."
    >
      <div className="scroll-area-demo-states">
        <figure className="scroll-area-demo-size">
          <figcaption>Loading</figcaption>
          <ScrollArea
            size="sm"
            variant="table"
            viewportLabel="Loading plantings"
            data-testid="state-loading"
            aria-busy="true"
          >
            <div className="scroll-area-demo-skeletons" role="status">
              <span className="scroll-area-demo-visually-hidden">
                Loading plantings
              </span>
              {Array.from({ length: 10 }, (_, index) => (
                <span key={index} className="scroll-area-demo-skeleton" />
              ))}
            </div>
          </ScrollArea>
        </figure>
        <figure className="scroll-area-demo-size">
          <figcaption>Empty</figcaption>
          <ScrollArea
            size="sm"
            variant="table"
            viewportLabel="No plantings"
            data-testid="state-empty"
          >
            <div className="scroll-area-demo-message">
              <p className="scroll-area-demo-strong">No plantings yet</p>
              <p className="scroll-area-demo-muted">
                Add bulbs to a bed to see them here.
              </p>
            </div>
          </ScrollArea>
        </figure>
        <figure className="scroll-area-demo-size">
          <figcaption>Error</figcaption>
          <ScrollArea
            size="sm"
            variant="table"
            viewportLabel="Plantings failed to load"
            data-testid="state-error"
          >
            <div className="scroll-area-demo-message">
              <p className="scroll-area-demo-strong">
                Plantings could not load
              </p>
              <p className="scroll-area-demo-muted">
                The Meadow project is offline. Try again in a moment.
              </p>
              <Button size="sm" variant="outline">
                Retry
              </Button>
            </div>
          </ScrollArea>
        </figure>
      </div>
    </Example>
  );
}

export default function ScrollAreaDemo() {
  return (
    <div id="scroll-area-demo" className="scroll-area-demo">
      <Sizes />
      <DataGrid />
      <Horizontal />
      <States />
    </div>
  );
}
