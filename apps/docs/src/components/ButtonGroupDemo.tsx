import { useState, type ReactNode } from "react";
import { ChevronDown } from "reicon-react/icons/ChevronDown";
import { ChevronLeft } from "reicon-react/icons/ChevronLeft";
import { ChevronRight } from "reicon-react/icons/ChevronRight";
import { Copy } from "reicon-react/icons/Copy";
import { Download } from "reicon-react/icons/Download";
import { Minus } from "reicon-react/icons/Minus";
import { Plus } from "reicon-react/icons/Plus";
import { Button } from "@tulipfarm/sprout/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  type ButtonGroupOrientation,
} from "@tulipfarm/sprout/button-group";
import "../styles/button-group-demo.css";

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
    <section className="button-group-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="button-group-demo-card-body">{children}</div>
    </section>
  );
}

function Label({ code, note }: { code: string; note: string }) {
  return (
    <div className="button-group-demo-label">
      <code>{code}</code>
      <span>{note}</span>
    </div>
  );
}

const orientations: ButtonGroupOrientation[] = ["horizontal", "vertical"];

function Orientations() {
  const [pages, setPages] = useState({ horizontal: 1, vertical: 1 });
  const [quantities, setQuantities] = useState({ horizontal: 0, vertical: 0 });
  return (
    <Example
      title="Orientation"
      description="A pager with a separator and a quantity with a text cell. Page and quantity changes stay in this example."
    >
      <div className="button-group-demo-columns">
        {orientations.map((orientation) => (
          <div
            key={orientation}
            className="button-group-demo-panel"
            data-testid={`orientation-${orientation}`}
          >
            <Label
              code={`orientation="${orientation}"`}
              note={
                orientation === "horizontal"
                  ? "Default. Joins controls left to right."
                  : "Stacks controls and joins them top to bottom."
              }
            />
            <div className="button-group-demo-stack">
              <ButtonGroup
                orientation={orientation}
                aria-label={`${orientation} pages`}
              >
                <Button
                  variant="outline"
                  disabled={pages[orientation] === 1}
                  onClick={() =>
                    setPages((current) => ({
                      ...current,
                      [orientation]: current[orientation] - 1,
                    }))
                  }
                >
                  Previous
                </Button>
                <ButtonGroupSeparator
                  orientation={
                    orientation === "horizontal" ? "vertical" : "horizontal"
                  }
                />
                <Button
                  variant="outline"
                  disabled={pages[orientation] === 3}
                  onClick={() =>
                    setPages((current) => ({
                      ...current,
                      [orientation]: current[orientation] + 1,
                    }))
                  }
                >
                  Next
                </Button>
              </ButtonGroup>
              <p role="status" className="button-group-demo-muted">
                Page {pages[orientation]} of 3
              </p>
            </div>
            <div className="button-group-demo-stack">
              <ButtonGroup
                orientation={orientation}
                aria-label={`${orientation} quantity`}
              >
                <ButtonGroupText>
                  Quantity: {quantities[orientation]}
                </ButtonGroupText>
                <Button
                  variant="outline"
                  aria-label="Add one"
                  onClick={() =>
                    setQuantities((current) => ({
                      ...current,
                      [orientation]: current[orientation] + 1,
                    }))
                  }
                >
                  <Plus aria-hidden="true" />
                </Button>
              </ButtonGroup>
              <p role="status" className="button-group-demo-muted">
                {quantities[orientation]} items selected locally.
              </p>
            </div>
          </div>
        ))}
      </div>
    </Example>
  );
}

function Sizes() {
  const [message, setMessage] = useState("No action yet.");
  const say = (text: string) => () => setMessage(text);
  return (
    <Example
      title="Button sizes"
      description="The group keeps each button's height. Small sizes use the full control radius on the outer corners."
    >
      <div className="button-group-demo-rows">
        <div className="button-group-demo-row" data-testid="size-xs">
          <Label
            code='size="xs" · "icon-xs"'
            note="Split share action in a dense row."
          />
          <ButtonGroup aria-label="Share note">
            <Button
              variant="outline"
              size="xs"
              onClick={say("Copied link to Greenhouse notes.")}
            >
              <Copy data-icon="inline-start" aria-hidden="true" />
              Copy link
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              aria-label="More share options"
              onClick={say("Opened share options.")}
            >
              <ChevronDown aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
        <div className="button-group-demo-row" data-testid="size-sm">
          <Label
            code='size="sm" · "icon-sm"'
            note="Week stepper in a calendar header."
          />
          <ButtonGroup aria-label="Week">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous week"
              onClick={say("Showing 6–12 Apr.")}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={say("Showing this week.")}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next week"
              onClick={say("Showing 20–26 Apr.")}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
        <div className="button-group-demo-row" data-testid="size-default">
          <Label
            code='size="default"'
            note="Text cell, value, and an icon-only default button."
          />
          <ButtonGroup aria-label="Rows per page">
            <ButtonGroupText>Rows per page</ButtonGroupText>
            <Button variant="outline" onClick={say("Showing 25 rows.")}>
              25
            </Button>
            <Button
              variant="outline"
              aria-label="More row counts"
              onClick={say("Opened row counts.")}
            >
              <ChevronDown aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
        <div className="button-group-demo-row" data-testid="size-icon">
          <Label
            code='size="icon"'
            note="Square month pager in a date picker."
          />
          <ButtonGroup aria-label="Month">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={say("Showing March 2026.")}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              onClick={say("Showing May 2026.")}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
        <div className="button-group-demo-row" data-testid="size-lg">
          <Label
            code='size="lg" · "icon-lg"'
            note="Export with a format menu trigger."
          />
          <ButtonGroup aria-label="Export report">
            <Button
              variant="outline"
              size="lg"
              onClick={say("Exported Spring harvest.csv.")}
            >
              <Download data-icon="inline-start" aria-hidden="true" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="More export formats"
              onClick={say("Opened export formats.")}
            >
              <ChevronDown aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
      </div>
      <p role="status" className="button-group-demo-muted">
        {message}
      </p>
    </Example>
  );
}

function Variants() {
  const [message, setMessage] = useState("Draft not saved.");
  return (
    <Example
      title="Button variants"
      description="Outline buttons join on their borders. Filled buttons have no border, so add ButtonGroupSeparator between them."
    >
      <div className="button-group-demo-rows">
        <div className="button-group-demo-row" data-testid="variant-outline">
          <Label
            code='variant="outline"'
            note="Borders meet; no separator needed."
          />
          <ButtonGroup aria-label="Draft actions">
            <Button
              variant="outline"
              onClick={() => setMessage("Draft discarded.")}
            >
              Discard
            </Button>
            <Button
              variant="outline"
              onClick={() => setMessage("Draft saved.")}
            >
              Save draft
            </Button>
          </ButtonGroup>
        </div>
        <div className="button-group-demo-row" data-testid="variant-secondary">
          <Label
            code='variant="secondary"'
            note="A separator splits the fill."
          />
          <ButtonGroup aria-label="Publish">
            <Button
              variant="secondary"
              onClick={() => setMessage("Published to Meadow.")}
            >
              Publish
            </Button>
            <ButtonGroupSeparator />
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="More publish options"
              onClick={() => setMessage("Opened publish options.")}
            >
              <ChevronDown aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
        <div className="button-group-demo-row" data-testid="variant-default">
          <Label code='variant="default"' note="Primary split action." />
          <ButtonGroup aria-label="Invite">
            <Button onClick={() => setMessage("Invited 3 people.")}>
              Send invites
            </Button>
            <ButtonGroupSeparator />
            <Button
              size="icon-sm"
              aria-label="More invite options"
              onClick={() => setMessage("Opened invite options.")}
            >
              <ChevronDown aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
      </div>
      <p role="status" className="button-group-demo-muted">
        {message}
      </p>
    </Example>
  );
}

function TextAndNesting() {
  const [seats, setSeats] = useState(3);
  const [week, setWeek] = useState(15);
  return (
    <Example
      title="Text cells and nested groups"
      description="ButtonGroupText can render another element, such as an output. A group of groups spaces them 8px apart."
    >
      <div className="button-group-demo-rows">
        <div className="button-group-demo-row" data-testid="text-render">
          <Label
            code="render={<output />}"
            note="Live seat count between steppers."
          />
          <ButtonGroup aria-label="Seats">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Remove a seat"
              disabled={seats === 1}
              onClick={() => setSeats((value) => value - 1)}
            >
              <Minus aria-hidden="true" />
            </Button>
            <ButtonGroupText render={<output aria-live="polite" />}>
              {seats} {seats === 1 ? "seat" : "seats"}
            </ButtonGroupText>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Add a seat"
              disabled={seats === 10}
              onClick={() => setSeats((value) => value + 1)}
            >
              <Plus aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
        <div className="button-group-demo-row" data-testid="text-icon">
          <Label
            code="ButtonGroupText + svg"
            note="Icons in a text cell are 16px."
          />
          <ButtonGroup aria-label="Attachments">
            <ButtonGroupText>
              <Download aria-hidden="true" />
              12 files
            </ButtonGroupText>
            <Button variant="outline">Download all</Button>
          </ButtonGroup>
        </div>
        <div className="button-group-demo-row" data-testid="nested">
          <Label code="ButtonGroup > ButtonGroup" note="Calendar toolbar." />
          <ButtonGroup aria-label="Calendar toolbar">
            <ButtonGroup aria-label="Week navigation">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous week"
                onClick={() => setWeek((value) => value - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <ButtonGroupText render={<output aria-live="polite" />}>
                Week {week}
              </ButtonGroupText>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next week"
                onClick={() => setWeek((value) => value + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </ButtonGroup>
            <ButtonGroup aria-label="Jump to date">
              <Button variant="outline" onClick={() => setWeek(15)}>
                Today
              </Button>
            </ButtonGroup>
          </ButtonGroup>
        </div>
      </div>
    </Example>
  );
}

export default function ButtonGroupDemo() {
  return (
    <div id="button-group-demo" className="button-group-demo">
      <Orientations />
      <Sizes />
      <Variants />
      <TextAndNesting />
    </div>
  );
}
