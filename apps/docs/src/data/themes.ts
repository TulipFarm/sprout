export interface ThemeEntry {
  slug: string;
  name: string;
}

export const sproutThemes: ThemeEntry[] = [
  { slug: "neutral", name: "Neutral" },
  { slug: "tulipfarm", name: "TulipFarm" },
];

export const brandThemes: ThemeEntry[] = [
  { slug: "chatgpt", name: "ChatGPT" },
  { slug: "claude", name: "Claude" },
  { slug: "cloudflare", name: "Cloudflare" },
  { slug: "discord", name: "Discord" },
  { slug: "github", name: "GitHub" },
  { slug: "grok", name: "Grok" },
  { slug: "linear", name: "Linear" },
  { slug: "notion", name: "Notion" },
  { slug: "perplexity", name: "Perplexity" },
  { slug: "raycast", name: "Raycast" },
  { slug: "spotify", name: "Spotify" },
  { slug: "stripe", name: "Stripe" },
  { slug: "supabase", name: "Supabase" },
  { slug: "vercel", name: "Vercel" },
];

export const allThemes = [...sproutThemes, ...brandThemes];
