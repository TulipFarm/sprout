import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  alertVariantNames,
  alertVariants,
} from "../packages/sprout/src/components/alert.js";

function tag(html: string, slot: string) {
  const match = html.match(
    new RegExp(`<([a-z0-9]+)[^>]*data-slot="${slot}"[^>]*>`),
  );
  expect(match, slot).toBeTruthy();
  return match![0];
}

describe("Alert", () => {
  it("renders an announced default alert with every part", () => {
    const html = renderToString(
      <Alert>
        <svg aria-hidden="true" />
        <AlertTitle>Chat archived</AlertTitle>
        <AlertDescription>It moved to Archived chats.</AlertDescription>
        <AlertAction>
          <button type="button">Undo</button>
        </AlertAction>
      </Alert>,
    );
    const root = tag(html, "alert");
    expect(root).toMatch(/^<div /);
    expect(root).toContain('role="alert"');
    expect(root).toContain('class="sprout-alert sprout-alert-default"');
    expect(root).toContain('data-variant="default"');
    expect(tag(html, "alert-title")).toContain('class="sprout-alert-title"');
    expect(html).toContain(">Chat archived</div>");
    expect(tag(html, "alert-description")).toContain(
      'class="sprout-alert-description"',
    );
    expect(tag(html, "alert-action")).toContain('class="sprout-alert-action"');
  });

  it("supports both variants and overriding the role", () => {
    expect(alertVariantNames).toEqual(["default", "destructive"]);
    for (const variant of alertVariantNames) {
      const html = renderToString(
        <Alert variant={variant}>
          <AlertDescription>Slack status could not refresh.</AlertDescription>
        </Alert>,
      );
      expect(html).toContain(`sprout-alert-${variant}`);
      expect(html).toContain(`data-variant="${variant}"`);
    }
    for (const role of ["status", "note"]) {
      const html = renderToString(
        <Alert role={role}>Queue details are hidden.</Alert>,
      );
      expect(html).toContain(`role="${role}"`);
      expect(html).not.toContain('role="alert"');
    }
    expect(
      renderToString(<Alert role={undefined}>Conditional role.</Alert>),
    ).toContain('role="alert"');
  });

  it("merges classes, attributes, and render targets", () => {
    const html = renderToString(
      <Alert
        variant="destructive"
        className="mb-4"
        id="save-error"
        aria-live="assertive"
        render={<section />}
      >
        <AlertTitle className="wrap-anywhere" render={<h3 />}>
          Workspace creation needs attention
        </AlertTitle>
        <AlertDescription render={<p />}>That URL is taken.</AlertDescription>
      </Alert>,
    );
    expect(tag(html, "alert")).toMatch(/^<section /);
    expect(html).toContain(
      'class="sprout-alert sprout-alert-destructive mb-4"',
    );
    expect(html).toContain('id="save-error"');
    expect(html).toContain('aria-live="assertive"');
    expect(tag(html, "alert-title")).toMatch(
      /^<h3 [^>]*class="sprout-alert-title wrap-anywhere"/,
    );
    expect(tag(html, "alert-description")).toMatch(
      /^<p [^>]*class="sprout-alert-description"/,
    );
  });

  it("exposes its classes for custom elements", () => {
    expect(alertVariants()).toBe("sprout-alert sprout-alert-default");
    expect(alertVariants({ variant: "destructive", className: "mt-2" })).toBe(
      "sprout-alert sprout-alert-destructive mt-2",
    );
    expect(alertVariants({ variant: null })).toBe(
      "sprout-alert sprout-alert-default",
    );
  });
});
