"use client";

import type { ComponentProps } from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { brandGlyphs } from "../internal/brand-glyphs.js";
import { cn } from "../internal/classes.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip.js";

export type Brand = keyof typeof brandGlyphs;

export const brandNames: Record<Brand, string> = {
  claude: "Claude",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  grok: "Grok",
  kimi: "Kimi",
  gemini: "Gemini",
  mistral: "Mistral",
  meta: "Meta",
  qwen: "Qwen",
  google: "Google Workspace",
  gmail: "Gmail",
  "google-calendar": "Google Calendar",
  "google-drive": "Google Drive",
  "google-sheets": "Google Sheets",
  "google-docs": "Google Docs",
  "google-slides": "Google Slides",
  "google-forms": "Google Forms",
  slack: "Slack",
  github: "GitHub",
  jira: "Jira",
  confluence: "Confluence",
  trello: "Trello",
  notion: "Notion",
  hubspot: "HubSpot",
  figma: "Figma",
  microsoft: "Microsoft",
  linear: "Linear",
  stripe: "Stripe",
  airtable: "Airtable",
  asana: "Asana",
  clickup: "ClickUp",
  discord: "Discord",
  shopify: "Shopify",
  zendesk: "Zendesk",
  dropbox: "Dropbox",
  gitlab: "GitLab",
  calendly: "Calendly",
};

export const brandTileSizeNames = ["sm", "md", "lg", "xl", "action"] as const;
export const brandIconSizeNames = [
  "inline",
  "glyph",
  "fill",
  "sm",
  "md",
  "lg",
  "xl",
] as const;

export type BrandTileSize = (typeof brandTileSizeNames)[number];
export type BrandIconSize = (typeof brandIconSizeNames)[number];

function Glyph({ brand }: { brand: Brand }) {
  const glyph = brandGlyphs[brand];
  return (
    <svg
      viewBox={glyph.viewBox}
      className="sprout-brand-glyph"
      aria-hidden="true"
      focusable="false"
    >
      {glyph.paths.map((path, index) => (
        <path
          key={index}
          d={path.d}
          fill={"fill" in path ? path.fill : "currentColor"}
          fillRule={"evenOdd" in path ? "evenodd" : undefined}
          clipRule={"evenOdd" in path ? "evenodd" : undefined}
        />
      ))}
    </svg>
  );
}

export type BrandTileProps = useRender.ComponentProps<"span"> & {
  size?: BrandTileSize;
};

export function BrandTile({
  size = "md",
  render,
  ref,
  className,
  ...props
}: BrandTileProps) {
  return useRender({
    defaultTagName: "span",
    render,
    ref,
    props: mergeProps<"span">(
      {
        "data-slot": "brand-tile",
        "data-size": size,
        className: cn("sprout-brand-tile", className),
      } as ComponentProps<"span">,
      props,
    ),
  });
}

export interface BrandIconProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  brand: Brand;
  size?: BrandIconSize;
}

export function BrandIcon({
  brand,
  size = "md",
  className,
  ...props
}: BrandIconProps) {
  if (size === "inline" || size === "glyph" || size === "fill")
    return (
      <span
        data-slot="brand-icon"
        data-brand={brand}
        data-size={size}
        {...props}
        className={cn("sprout-brand-icon", className)}
      >
        <Glyph brand={brand} />
      </span>
    );
  return (
    <BrandTile data-brand={brand} size={size} {...props} className={className}>
      <Glyph brand={brand} />
    </BrandTile>
  );
}

export interface BrandStackItem {
  brand: Brand;
  name: string;
}

export interface BrandStackProps extends Omit<
  ComponentProps<"span">,
  "children" | "role"
> {
  brands: readonly BrandStackItem[];
  /** Accessible name for the whole stack. Defaults to the brand names. */
  label?: string;
}

export function BrandStack({
  brands,
  label,
  className,
  ...props
}: BrandStackProps) {
  if (brands.length === 0) return null;
  return (
    <TooltipProvider delay={200}>
      <span
        data-slot="brand-stack"
        {...props}
        role="img"
        aria-label={label ?? brands.map((item) => item.name).join(", ")}
        className={cn("sprout-brand-stack", className)}
      >
        {brands.map((item) => (
          <Tooltip key={item.brand}>
            <TooltipTrigger
              data-slot="brand-tile"
              render={<BrandTile size="sm" data-brand={item.brand} />}
            >
              <Glyph brand={item.brand} />
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="sprout-brand-tooltip">
              {item.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </span>
    </TooltipProvider>
  );
}
