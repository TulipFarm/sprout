import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import type { ComponentProps } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../packages/sprout/src/components/pagination.js";
import * as sprout from "../packages/sprout/src/index.js";

describe("Pagination", () => {
  it("is exported from the package root", () => {
    for (const name of [
      "Pagination",
      "PaginationContent",
      "PaginationEllipsis",
      "PaginationItem",
      "PaginationLink",
      "PaginationNext",
      "PaginationPrevious",
    ]) {
      expect(sprout).toHaveProperty(name);
    }
  });

  it("renders a labelled nav with a list, links, an ellipsis, and the active page", () => {
    const html = renderToString(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#previous" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#page-1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#page-2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(html).toMatch(
      /^<nav role="navigation" aria-label="pagination" data-slot="pagination" class="sprout-pagination"><ul data-slot="pagination-content" class="sprout-pagination-content"><li data-slot="pagination-item" class="sprout-pagination-item">/,
    );
    expect(html).not.toContain('role="button"');
    const link = html.match(/<a[^>]*href="#page-1"[^>]*>1<\/a>/)?.[0] ?? "";
    expect(link).toContain('data-slot="pagination-link"');
    expect(link).toContain("sprout-button-variant-ghost");
    expect(link).toContain("sprout-button-size-icon");
    expect(link).not.toContain("aria-current");
    const active = html.match(/<a[^>]*href="#page-2"[^>]*>2<\/a>/)?.[0] ?? "";
    expect(active).toContain('aria-current="page"');
    expect(active).toContain('data-active="true"');
    expect(active).toContain("sprout-button-variant-outline");
    const previous = html.match(/<a[^>]*href="#previous"[^>]*>/)?.[0] ?? "";
    expect(previous).toContain('aria-label="Go to previous page"');
    expect(previous).toContain("sprout-button-size-default");
    expect(previous).toContain("sprout-pagination-previous");
    expect(html).toContain(
      '<span class="sprout-pagination-label">Previous</span>',
    );
    expect(html).toContain('<span class="sprout-pagination-label">Next</span>');
    expect(html).toContain('aria-label="Go to next page"');
    expect(html).toMatch(/data-icon="inline-start"/);
    expect(html).toMatch(/data-icon="inline-end"/);
    expect(html).toMatch(
      /<span aria-hidden="true" data-slot="pagination-ellipsis" class="sprout-pagination-ellipsis"><svg[^]*<span class="sprout-pagination-sr-only">More pages<\/span><\/span>/,
    );
  });

  it("accepts labels, sizes, custom text, classes, and overrides", () => {
    const html = renderToString(
      <Pagination aria-label="Run history pages" className="extra">
        <PaginationContent className="row">
          <PaginationItem className="cell">
            <PaginationPrevious
              href="#newer"
              text="Newer"
              aria-label="Newer runs"
              size="sm"
              className="edge"
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#p" size="icon-sm">
              3
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#older" text="Older" size="lg" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(html).toContain('aria-label="Run history pages"');
    expect(html).toContain('class="sprout-pagination extra"');
    expect(html).toContain('class="sprout-pagination-content row"');
    expect(html).toContain('class="sprout-pagination-item cell"');
    expect(html).toContain('aria-label="Newer runs"');
    expect(html).not.toContain("Go to previous page");
    expect(html).toContain(">Newer</span>");
    expect(html).toContain(">Older</span>");
    expect(html).toMatch(
      /sprout-button-size-sm[^"]*sprout-pagination-link sprout-pagination-previous edge/,
    );
    expect(html).toContain("sprout-button-size-icon-sm");
    expect(html).toContain("sprout-button-size-lg");
  });

  it("disables links and supports router renders", () => {
    function RouterLink({
      to,
      ...props
    }: ComponentProps<"a"> & { to: string }) {
      return <a data-router="" href={to} {...props} />;
    }
    const html = renderToString(
      <>
        <PaginationPrevious href="#previous" disabled />
        <PaginationLink isActive render={<RouterLink to="/inbox?page=2" />}>
          2
        </PaginationLink>
      </>,
    );
    const previous = html.match(/<a[^>]*href="#previous"[^>]*>/)?.[0] ?? "";
    expect(previous).toContain('aria-disabled="true"');
    expect(previous).toContain('tabindex="-1"');
    const routed = html.match(/<a[^>]*data-router=""[^>]*>/)?.[0] ?? "";
    expect(routed).toContain('href="/inbox?page=2"');
    expect(routed).toContain('aria-current="page"');
    expect(routed).toContain('data-slot="pagination-link"');
  });
});
