import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft } from 'reicon-react/icons/ChevronLeft';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { Plus } from 'reicon-react/icons/Plus';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
  type CarouselApi,
  type CarouselOrientation,
} from '@tulipfarm/sprout/carousel';
import { FileAttachment, type AttachmentFile } from '@tulipfarm/sprout/attachment';
import { Button } from '@tulipfarm/sprout/button';
import '../styles/carousel-demo.css';

function Example({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="carousel-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="carousel-demo-card-body">{children}</div>
    </section>
  );
}

const steps = ['Plant', 'Water', 'Grow'];

function SlidePosition() {
  const { selectedIndex, snapCount } = useCarousel();
  return (
    <p className="carousel-demo-position" aria-live="polite">
      Slide {selectedIndex + 1} of {Math.max(snapCount, 1)}
    </p>
  );
}

function StepCarousel({ orientation }: { orientation: CarouselOrientation }) {
  const content = (
    <CarouselContent>
      {steps.map((label, index) => (
        <CarouselItem key={label} aria-label={`${index + 1} of ${steps.length}`}>
          <div className="carousel-demo-slide">
            {index + 1}. {label}
          </div>
        </CarouselItem>
      ))}
    </CarouselContent>
  );
  return (
    <div className="carousel-demo-stage" data-orientation={orientation}>
      <span className="carousel-demo-caption">{orientation}</span>
      <div className="carousel-demo-frame" data-orientation={orientation}>
        <Carousel
          orientation={orientation}
          aria-label={`Growing steps, ${orientation}`}
          data-testid={`steps-${orientation}`}
        >
          {orientation === 'vertical' ? <div className="carousel-demo-vertical-viewport">{content}</div> : content}
          <CarouselPrevious />
          <CarouselNext />
          <SlidePosition />
        </Carousel>
      </div>
    </div>
  );
}

function Orientations() {
  return (
    <Example
      title="Orientations"
      description="One slide at a time, sideways or up and down. Use the arrows, the arrow keys, a swipe, or drag with a mouse. The arrows turn off at either end."
    >
      <div className="carousel-demo-orientations">
        <StepCarousel orientation="horizontal" />
        <StepCarousel orientation="vertical" />
      </div>
    </Example>
  );
}

const fileTypes = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
};

const seedFiles = (): AttachmentFile[] => [
  {
    id: '1',
    name: 'Price list 2026.xlsx',
    mediaType: fileTypes.xlsx,
    size: '48 KB',
    state: 'ready',
  },
  {
    id: '2',
    name: 'Returns policy.pdf',
    mediaType: fileTypes.pdf,
    size: '212 KB',
    state: 'uploading',
  },
  {
    id: '3',
    name: 'Onboarding checklist.docx',
    mediaType: fileTypes.docx,
    size: '2 KB',
    state: 'ready',
  },
  {
    id: '4',
    name: 'garden-notes.txt',
    mediaType: fileTypes.txt,
    size: '1 KB',
    state: 'error',
  },
  {
    id: '5',
    name: 'Spring planting plan.md',
    mediaType: fileTypes.md,
    size: '6 KB',
    state: 'processing',
  },
  {
    id: '6',
    name: 'inventory.json',
    mediaType: fileTypes.json,
    size: '14 KB',
    state: 'ready',
  },
  {
    id: '7',
    name: 'Q3 launch deck.pptx',
    mediaType: fileTypes.pptx,
    size: '3.1 MB',
    state: 'ready',
  },
];

const extraFiles: Omit<AttachmentFile, 'id'>[] = [
  {
    name: 'Seed suppliers.csv',
    mediaType: fileTypes.csv,
    size: '9 KB',
    state: 'uploading',
  },
  {
    name: 'Greenhouse layout.pdf',
    mediaType: fileTypes.pdf,
    size: '640 KB',
    state: 'ready',
  },
];

/** The edge arrows an attachment row draws from `useCarousel`. */
function AttachmentArrows() {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } = useCarousel();
  return (
    <>
      {canScrollPrev && (
        <span className="carousel-demo-edge" data-side="start">
          <button
            type="button"
            aria-label="Previous attachments"
            className="carousel-demo-edge-arrow"
            onClick={scrollPrev}
          >
            <ChevronLeft size={12} aria-hidden="true" />
          </button>
        </span>
      )}
      {canScrollNext && (
        <span className="carousel-demo-edge" data-side="end">
          <button type="button" aria-label="Next attachments" className="carousel-demo-edge-arrow" onClick={scrollNext}>
            <ChevronRight size={12} aria-hidden="true" />
          </button>
        </span>
      )}
    </>
  );
}

function AttachmentRow() {
  const [files, setFiles] = useState(seedFiles);
  const [added, setAdded] = useState(0);
  const add = () => {
    const next = extraFiles[added % extraFiles.length]!;
    setFiles(current => [...current, { ...next, id: `extra-${added}` }]);
    setAdded(count => count + 1);
  };
  return (
    <Example
      title="Attachment row"
      description="Staged files in one free-scrolling row: chips keep their own width, sit 8px apart, and align to the start. Edge arrows from useCarousel appear on hover or focus and hide at either end."
    >
      <div className="carousel-demo-composer" data-testid="attachment-row">
        {files.length ? (
          <Carousel
            data-slot="attachment-group"
            aria-label="Attached files"
            opts={{ align: 'start', dragFree: true }}
            className="carousel-demo-attachments"
          >
            <CarouselContent className="carousel-demo-attachments-track">
              {files.map(file => (
                <CarouselItem key={file.id} className="carousel-demo-attachments-item">
                  <FileAttachment
                    variant="chip"
                    file={file}
                    onRemove={() => setFiles(current => current.filter(item => item.id !== file.id))}
                    onRetry={
                      file.state === 'error'
                        ? () =>
                            setFiles(current =>
                              current.map(item => (item.id === file.id ? { ...item, state: 'ready' } : item)),
                            )
                        : undefined
                    }
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <AttachmentArrows />
          </Carousel>
        ) : (
          <p className="carousel-demo-empty" role="status">
            No files attached. Add one to start the row.
          </p>
        )}
        <div className="carousel-demo-actions">
          <Button size="sm" variant="outline" onClick={add}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Add file
          </Button>
          <Button size="sm" variant="ghost" disabled={!files.length} onClick={() => setFiles([])}>
            Remove all
          </Button>
          <span className="carousel-demo-count" role="status">
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>
    </Example>
  );
}

const guides = [
  { title: 'Tomatoes', detail: 'Sow indoors 6 weeks before the last frost.' },
  { title: 'Basil', detail: 'Pinch the tips weekly so it grows bushy.' },
  { title: 'Lettuce', detail: 'Sow a short row every two weeks.' },
  {
    title: 'Carrots',
    detail: 'Thin seedlings to 5 cm once they are 3 cm tall.',
  },
  { title: 'Peas', detail: 'Give them a trellis before they start to climb.' },
];

function ApiDots() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!api) return;
    const sync = (current: CarouselApi) => {
      setSelected(current.selectedScrollSnap());
      setCount(current.scrollSnapList().length);
    };
    sync(api);
    api.on('select', sync).on('reInit', sync);
    return () => {
      api.off('select', sync).off('reInit', sync);
    };
  }, [api]);
  return (
    <Example
      title="Several per view, with the API"
      description="Set --sprout-carousel-basis to show more than one card. opts.loop wraps at the ends, and setApi drives the dots and the counter."
    >
      <div className="carousel-demo-frame" data-orientation="horizontal">
        <Carousel
          aria-label="Planting guides"
          opts={{ align: 'start', loop: true }}
          setApi={setApi}
          className="carousel-demo-guides"
          data-testid="guides"
        >
          <CarouselContent>
            {guides.map((guide, index) => (
              <CarouselItem key={guide.title} aria-label={`${index + 1} of ${guides.length}`}>
                <article className="carousel-demo-guide">
                  <h4>{guide.title}</h4>
                  <p>{guide.detail}</p>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
      <div className="carousel-demo-dots" role="group" aria-label="Choose a position">
        {Array.from({ length: count }, (_, index) => (
          <button
            key={index}
            type="button"
            className="carousel-demo-dot"
            aria-label={`Go to position ${index + 1}`}
            aria-current={index === selected ? 'true' : undefined}
            onClick={() => api?.scrollTo(index)}
          />
        ))}
      </div>
      <p className="carousel-demo-position" data-testid="guides-status">
        Position {selected + 1} of {Math.max(count, 1)}
      </p>
    </Example>
  );
}

export default function CarouselDemo() {
  return (
    <div id="carousel-demo" className="carousel-demo">
      <Orientations />
      <AttachmentRow />
      <ApiDots />
    </div>
  );
}
