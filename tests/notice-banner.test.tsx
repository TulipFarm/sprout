import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { NoticeBanner } from "../packages/sprout/src/components/notice-banner.js";
import * as sprout from "../packages/sprout/src/index.js";

describe("NoticeBanner", () => {
  it("is exported from the package root", () => {
    expect(sprout).toHaveProperty("NoticeBanner", NoticeBanner);
  });

  it("renders a named section with message and actions slots", () => {
    const html = renderToString(
      <NoticeBanner
        aria-label="Integration authorization"
        actions={<button type="button">Update permissions</button>}
      >
        <p role="status">Slack workspace needs authorization.</p>
      </NoticeBanner>,
    );
    expect(html).toMatch(
      /^<section data-slot="notice-banner" class="sprout-notice-banner" aria-label="Integration authorization">/,
    );
    expect(html).toContain(
      '<div data-slot="notice-banner-content" class="sprout-notice-banner-content"><p role="status">Slack workspace needs authorization.</p></div>',
    );
    expect(html).toContain(
      '<div data-slot="notice-banner-actions" class="sprout-notice-banner-actions"><button type="button">Update permissions</button></div>',
    );
  });

  it("renders a select and button together in the actions slot", () => {
    const html = renderToString(
      <NoticeBanner
        actions={
          <>
            <div data-picker="" />
            <button type="button" disabled aria-busy="true">
              Please wait...
            </button>
          </>
        }
      >
        3 integrations need authorization.
      </NoticeBanner>,
    );
    expect(html).toMatch(
      /notice-banner-actions"><div data-picker=""><\/div><button type="button" disabled="" aria-busy="true">Please wait...<\/button><\/div>/,
    );
  });

  it("leaves out the actions slot when there are no actions", () => {
    for (const actions of [undefined, null, false]) {
      const html = renderToString(
        <NoticeBanner actions={actions}>Read-only notice</NoticeBanner>,
      );
      expect(html).not.toContain("notice-banner-actions");
    }
  });

  it("merges classes and passes props to the section", () => {
    const html = renderToString(
      <NoticeBanner className="rounded" id="notice" data-x="1" actions="Act">
        Text
      </NoticeBanner>,
    );
    expect(html).toContain('class="sprout-notice-banner rounded"');
    expect(html).toContain('id="notice"');
    expect(html).toContain('data-x="1"');
  });
});
