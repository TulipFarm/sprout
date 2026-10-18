import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../packages/sprout/src/components/breadcrumb.js";
import { Button } from "../packages/sprout/src/components/button.js";
import * as sprout from "../packages/sprout/src/index.js";

describe("Breadcrumb", () => {
  it("is exported from the package root", () => {
    for (const name of [
      "Breadcrumb",
      "BreadcrumbEllipsis",
      "BreadcrumbItem",
      "BreadcrumbLink",
      "BreadcrumbList",
      "BreadcrumbPage",
      "BreadcrumbSeparator",
    ]) {
      expect(sprout).toHaveProperty(name);
    }
  });

  it("renders a labelled nav with an ordered list, links, separators, and the current page", () => {
    const html = renderToString(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Meadow</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(html).toMatch(
      /^<nav aria-label="Breadcrumb" data-slot="breadcrumb" class="sprout-breadcrumb"><ol data-slot="breadcrumb-list" data-wrap="true" class="sprout-breadcrumb-list">/,
    );
    expect(html).toContain(
      '<li data-slot="breadcrumb-item" class="sprout-breadcrumb-item"><a data-slot="breadcrumb-link" class="sprout-breadcrumb-link" href="/projects">Projects</a></li>',
    );
    expect(html).toMatch(
      /<li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" class="sprout-breadcrumb-separator"><svg/,
    );
    expect(html).toContain(
      '<span data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" class="sprout-breadcrumb-page">Meadow</span>',
    );
  });

  it("accepts custom labels, classes, and separator content", () => {
    const html = renderToString(
      <Breadcrumb aria-label="Folder path" className="extra">
        <BreadcrumbList wrap={false} className="list">
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem className="min-w-0" aria-current="page">
            <h1>Garden notes</h1>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(html).toContain('aria-label="Folder path"');
    expect(html).toContain('class="sprout-breadcrumb extra"');
    expect(html).toContain(
      'data-wrap="false" class="sprout-breadcrumb-list list"',
    );
    expect(html).toMatch(/class="sprout-breadcrumb-separator">\/<\/li>/);
    expect(html).toContain(
      'class="sprout-breadcrumb-item min-w-0" aria-current="page"><h1>Garden notes</h1>',
    );
  });

  it("renders links through router elements and Sprout buttons", () => {
    const routed = renderToString(
      <BreadcrumbLink render={<a href="/files?folder=f1" data-router="" />}>
        Finance
      </BreadcrumbLink>,
    );
    expect(routed).toContain('href="/files?folder=f1"');
    expect(routed).toContain('data-router=""');
    expect(routed).toContain("sprout-breadcrumb-link");
    const button = renderToString(
      <BreadcrumbLink
        truncate
        render={<Button variant="ghost" size="xs" disabled />}
      >
        Northwind Traders — renewal 2027
      </BreadcrumbLink>,
    );
    expect(button).toMatch(/^<button/);
    expect(button).toContain("sprout-button-variant-ghost");
    expect(button).toContain("sprout-button-size-xs");
    expect(button).toContain("sprout-breadcrumb-link");
    expect(button).toContain("disabled");
    expect(button).toContain(
      '<span data-slot="breadcrumb-label" class="sprout-breadcrumb-label" title="Northwind Traders — renewal 2027">Northwind Traders — renewal 2027</span>',
    );
  });

  it("truncates pages with a title only when asked", () => {
    expect(
      renderToString(<BreadcrumbPage>Drafts</BreadcrumbPage>),
    ).not.toContain("breadcrumb-label");
    expect(
      renderToString(<BreadcrumbPage truncate>Search results</BreadcrumbPage>),
    ).toContain('title="Search results">Search results</span>');
    expect(
      renderToString(
        <BreadcrumbPage truncate>
          <em>Drafts</em>
        </BreadcrumbPage>,
      ),
    ).not.toContain("title=");
  });

  it("hides the ellipsis from assistive technology", () => {
    const html = renderToString(<BreadcrumbEllipsis />);
    expect(html).toMatch(
      /^<span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" class="sprout-breadcrumb-ellipsis"><svg/,
    );
    expect(html).toContain(
      '<span class="sprout-breadcrumb-sr-only">More</span>',
    );
  });
});
