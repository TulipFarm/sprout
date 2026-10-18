import {
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@tulipfarm/sprout/pagination";
import type { ButtonSize } from "@tulipfarm/sprout/button";
import "../styles/pagination-demo.css";
import DocsSelect from "./DocsSelect";

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
    <section className="pagination-demo-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="pagination-demo-card-body">{children}</div>
    </section>
  );
}

// Sample adapter: first, last, and the pages around the current one.
function pageWindow(page: number, total: number): (number | "gap")[] {
  const keep = [1, total, page - 1, page, page + 1]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
    .filter((n, index, all) => all.indexOf(n) === index);
  const out: (number | "gap")[] = [];
  keep.forEach((n, index) => {
    const before = keep[index - 1];
    if (before !== undefined && n - before === 2) out.push(n - 1);
    else if (before !== undefined && n - before > 2) out.push("gap");
    out.push(n);
  });
  return out;
}

function PageNavigation() {
  const [page, setPage] = useState(1);
  return (
    <>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#previous"
              onClick={(event) => {
                event.preventDefault();
                setPage(Math.max(1, page - 1));
              }}
            />
          </PaginationItem>
          {[1, 2, 3].map((number) => (
            <PaginationItem key={number}>
              <PaginationLink
                href={`#page-${number}`}
                isActive={page === number}
                onClick={(event) => {
                  event.preventDefault();
                  setPage(number);
                }}
              >
                {number}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#next"
              onClick={(event) => {
                event.preventDefault();
                setPage(Math.min(3, page + 1));
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <p role="status" className="pagination-demo-status">
        Page {page}
      </p>
    </>
  );
}

type RunState = "many" | "single" | "loading" | "empty";
const runStates: { value: RunState; label: string }[] = [
  { value: "many", label: "24 pages" },
  { value: "single", label: "One page" },
  { value: "loading", label: "Loading" },
  { value: "empty", label: "No runs" },
];

function RunHistory() {
  const [state, setState] = useState<RunState>("many");
  const [page, setPage] = useState(7);
  const total = state === "single" ? 1 : 24;
  const loading = state === "loading";
  const go = (next: number) => (event: MouseEvent) => {
    event.preventDefault();
    setPage(Math.min(total, Math.max(1, next)));
  };
  const current = Math.min(page, total);
  return (
    <>
      <div className="pagination-demo-toolbar">
        <label>
          Results
          <DocsSelect<RunState>
            label="Results"
            value={state}
            onValueChange={setState}
            items={runStates}
          />
        </label>
      </div>
      {state === "empty" ? (
        <p className="pagination-demo-note">
          No runs yet. Runs show here after an automation starts.
        </p>
      ) : (
        <>
          <Pagination
            aria-label="Run history pages"
            aria-busy={loading || undefined}
          >
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={`#runs-${current - 1}`}
                  text="Newer"
                  aria-label="Newer runs"
                  disabled={loading || current === 1}
                  onClick={go(current - 1)}
                />
              </PaginationItem>
              {pageWindow(current, total).map((item, index) => (
                <PaginationItem key={item === "gap" ? `gap-${index}` : item}>
                  {item === "gap" ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href={`#runs-${item}`}
                      aria-label={`Page ${item}`}
                      isActive={item === current}
                      disabled={loading}
                      onClick={go(item)}
                    >
                      {item}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href={`#runs-${current + 1}`}
                  text="Older"
                  aria-label="Older runs"
                  disabled={loading || current === total}
                  onClick={go(current + 1)}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <p role="status" className="pagination-demo-status">
            {loading
              ? "Loading runs…"
              : `Runs ${(current - 1) * 25 + 1}–${current * 25} · page ${current} of ${total}`}
          </p>
        </>
      )}
    </>
  );
}

const sizes: {
  name: string;
  caption: string;
  link: ButtonSize;
  edge: ButtonSize;
  total: number;
  start: number;
}[] = [
  {
    name: "Comment pages",
    caption: "Compact · icon-sm with sm",
    link: "icon-sm",
    edge: "sm",
    total: 4,
    start: 2,
  },
  {
    name: "Search results pages",
    caption: "Default · icon with default",
    link: "icon",
    edge: "default",
    total: 9,
    start: 5,
  },
  {
    name: "Template gallery pages",
    caption: "Large · icon-lg with lg",
    link: "icon-lg",
    edge: "lg",
    total: 12,
    start: 1,
  },
];

function SizedPagination({
  name,
  link,
  edge,
  total,
  start,
}: (typeof sizes)[number]) {
  const [page, setPage] = useState(start);
  const go = (next: number) => (event: MouseEvent) => {
    event.preventDefault();
    setPage(next);
  };
  return (
    <Pagination aria-label={name} className="pagination-demo-start">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            size={edge}
            href={`#${link}-${page - 1}`}
            disabled={page === 1}
            onClick={go(page - 1)}
          />
        </PaginationItem>
        {pageWindow(page, total).map((item, index) => (
          <PaginationItem key={item === "gap" ? `gap-${index}` : item}>
            {item === "gap" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                size={link}
                href={`#${link}-${item}`}
                isActive={item === page}
                onClick={go(item)}
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            size={edge}
            href={`#${link}-${page + 1}`}
            disabled={page === total}
            onClick={go(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function RouterLink({
  to,
  navigate,
  ...props
}: Omit<ComponentProps<"a">, "href"> & {
  to: string;
  navigate: (to: string) => void;
}) {
  return (
    <a
      {...props}
      href={to}
      onClick={(event) => {
        props.onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        navigate(to);
      }}
    />
  );
}

function RouterPagination() {
  const [path, setPath] = useState("/inbox?page=2");
  const page = Number(path.split("=")[1]);
  const link = (n: number) => (
    <RouterLink to={`/inbox?page=${n}`} navigate={setPath} />
  );
  return (
    <>
      <Pagination aria-label="Inbox pages">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious disabled={page === 1} render={link(page - 1)} />
          </PaginationItem>
          {[1, 2, 3, 4].map((n) => (
            <PaginationItem key={n}>
              <PaginationLink isActive={n === page} render={link(n)}>
                {n}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext disabled={page === 4} render={link(page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <p role="status" className="pagination-demo-status">
        Route <code>{path}</code>
      </p>
    </>
  );
}

function DirectionPagination({ dir }: { dir: "ltr" | "rtl" }) {
  const rtl = dir === "rtl";
  return (
    <div dir={dir} lang={rtl ? "ar" : "en"}>
      <Pagination aria-label={rtl ? "الصفحات" : "Pages"}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={`#${dir}-1`}
              onClick={(event) => event.preventDefault()}
              {...(rtl
                ? { text: "السابق", "aria-label": "الصفحة السابقة" }
                : {})}
            />
          </PaginationItem>
          {[1, 2].map((n) => (
            <PaginationItem key={n}>
              <PaginationLink
                href={`#${dir}-${n}`}
                isActive={n === 2}
                onClick={(event) => event.preventDefault()}
              >
                {n}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href={`#${dir}-3`}
              onClick={(event) => event.preventDefault()}
              {...(rtl
                ? { text: "التالي", "aria-label": "الصفحة التالية" }
                : {})}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export default function PaginationDemo() {
  return (
    <div className="pagination-demo" id="pagination-demo">
      <Example
        title="Page navigation"
        description="Previous, numbered pages, skipped pages, and next. The active page is outlined."
      >
        <PageNavigation />
      </Example>
      <Example
        title="Run history"
        description="Long lists keep the first, last, and nearby pages. Edges and loading disable links."
      >
        <RunHistory />
      </Example>
      <Example
        title="Sizes"
        description="Page numbers take icon sizes; previous and next take the matching text size."
      >
        {sizes.map((size) => (
          <div className="pagination-demo-size" key={size.link}>
            <span className="pagination-demo-caption">{size.caption}</span>
            <SizedPagination {...size} />
          </div>
        ))}
      </Example>
      <Example
        title="Router links"
        description="The render prop swaps the anchor for your router's link."
      >
        <RouterPagination />
      </Example>
      <Example
        title="Direction"
        description="Chevrons flip in right-to-left text."
      >
        <DirectionPagination dir="ltr" />
        <DirectionPagination dir="rtl" />
      </Example>
    </div>
  );
}
