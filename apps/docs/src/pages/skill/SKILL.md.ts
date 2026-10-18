import skill from "../../../../../skills/sprout/SKILL.md?raw";

export const GET = () =>
  new Response(skill, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
