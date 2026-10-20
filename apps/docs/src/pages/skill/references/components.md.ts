import components from '../../../../../../skills/sprout/references/components.md?raw';

export const GET = () =>
  new Response(components, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
