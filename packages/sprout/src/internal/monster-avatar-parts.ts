// Monster avatar artwork. Every part is drawn on one 128 × 128 grid, so any
// body, ears, eyes, mouth, hat and held item combine into one character.

export const ink = '#1b1722';

export interface Palette {
  body: string;
  shade: string;
  light: string;
  accent: string;
}

export const palettes = {
  yellow: { body: '#ffd23f', shade: '#e9a91d', light: '#fff1b0', accent: '#ff6b8b' },
  blue: { body: '#4aa3ff', shade: '#2c74d9', light: '#c4e2ff', accent: '#ffd23f' },
  pink: { body: '#ff8fb8', shade: '#e0628f', light: '#ffd6e5', accent: '#4aa3ff' },
  green: { body: '#6fd36a', shade: '#3fa64a', light: '#cff5c6', accent: '#ffd23f' },
  purple: { body: '#a979ff', shade: '#7b4fe0', light: '#e3d5ff', accent: '#3fd6c2' },
  teal: { body: '#3fd6c2', shade: '#1fa595', light: '#c6f7ef', accent: '#ff8fb8' },
  red: { body: '#ff6464', shade: '#d63c45', light: '#ffcaca', accent: '#ffd23f' },
  orange: { body: '#ff9f43', shade: '#e2761f', light: '#ffe1c0', accent: '#4aa3ff' },
  lime: { body: '#b8e04a', shade: '#8db52a', light: '#edf9c6', accent: '#a979ff' },
} satisfies Record<string, Palette>;

export type MonsterColor = keyof typeof palettes;
export const colors = Object.keys(palettes) as MonsterColor[];

// ---------------------------------------------------------------------------
// Bodies are generated once from a few numbers: a domed head that flows into
// slightly flared sides, two stubby legs, and a fixed-seed wobble so the
// outline looks hand drawn without a runtime SVG filter.

interface BodySpec {
  /** Half width at the shoulders, where the dome meets the sides. */
  a: number;
  /** Half width at the hips. */
  w: number;
  top: number;
  /** Height of the dome above the shoulders. */
  b: number;
  /** Squareness of the dome: higher is flatter. */
  n: number;
  fur?: boolean;
  /** Both arms up, waving. */
  raised?: boolean;
  seed: number;
}

const bodySpecs = {
  blob: { a: 34, w: 38, top: 28, b: 20, n: 2.4, seed: 3 },
  fluffy: { a: 35, w: 39, top: 28, b: 20, n: 2.4, fur: true, seed: 11 },
  round: { a: 40, w: 44, top: 38, b: 24, n: 2.1, seed: 5 },
  tall: { a: 29, w: 32, top: 20, b: 17, n: 2.5, seed: 7 },
  bell: { a: 30, w: 43, top: 28, b: 19, n: 2.2, seed: 13 },
  square: { a: 38, w: 39, top: 30, b: 12, n: 3.6, seed: 17 },
  cheer: { a: 34, w: 38, top: 30, b: 20, n: 2.4, raised: true, seed: 19 },
} satisfies Record<string, BodySpec>;

export type MonsterBody = keyof typeof bodySpecs | 'anteater';
export const bodies = [...Object.keys(bodySpecs), 'anteater'] as MonsterBody[];

export const patterns = ['plain', 'fur', 'spots', 'stripes'] as const;
export type MonsterPattern = (typeof patterns)[number];

const bottom = 118;
const hip = 106;
const r1 = (value: number) => Math.round(value * 10) / 10;

function random(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

type Point = [number, number];

// Catmull-Rom spline through the points, as cubic Béziers, without the move.
function spline(points: Point[]) {
  let d = '';
  for (let i = 1; i < points.length - 2; i++) {
    const [p0, p1, p2, p3] = [points[i - 1]!, points[i]!, points[i + 1]!, points[i + 2]!];
    d +=
      `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

export interface BodyGeometry {
  path: string;
  top: number;
  /** Centre of the head, where ears and hats go. */
  cx: number;
  /** Horizontal scale for parts drawn for a head 33.5 wide each side. */
  sx: number;
  /** Shift of the face from where eyes and mouth are drawn. */
  face: Point;
  /** Left and right edges of the body at a height, if it is inside. */
  span: (y: number) => [number, number] | undefined;
  /** Where the held item's box goes, and whether a paw holds it. */
  item: Point;
  paw: boolean;
  /** A raised arm drawn behind the body, and its shoulder. */
  wave?: { art: (fill: string) => string; shoulder: Point };
  /** Toes, drawn over the feet. */
  toes: string;
  /** Left arm, drawn over the body. */
  arm: (fill: string) => string;
  /** Right arm, left off while the paw holds an item. */
  armRight: (fill: string) => string;
}

const toeMarks = (feet: [number, number][], count: number) =>
  feet
    .flatMap(([x0, x1]) => {
      const half = Math.min((x1 - x0) / count / 2, 3.8);
      return Array.from({ length: count }, (_, i) => [(x0 + x1) / 2 + (i - (count - 1) / 2) * half * 2, half]);
    })
    .map(
      ([x, half]) =>
        `<path d="M${r1(x! - half!)} ${bottom}C${r1(x! - half!)} ${bottom - 8} ${r1(x! + half!)} ${bottom - 8} ${r1(x! + half!)} ${bottom}" fill="#cfe9fb" stroke-width="1.8"/>`,
    )
    .join('');

// A long-nosed creature on four legs, facing left, drawn by hand.
function anteater(): BodyGeometry {
  const path =
    'M11.5 104C9 92 13 80 21 70C17 52 28 39 44 38.5C54 38 60 41.5 66 43.5C90 35 116 39 120.5 62' +
    'C123.5 78 120.5 96 117 104C118 112 117 118 111.5 118L104.5 118C104.5 111.5 100 111.5 100 118L94.5 118' +
    'C91 118 91 111 92 104Q79 100.5 66.5 104C67.5 112 67 118 62.5 118L57.5 118C57.5 111.5 53 111.5 53 118' +
    'L46.5 118C42 118 42 111 42.5 104C36 98 31 88 30.5 80C26.5 88 24 97 22.5 104C22.5 110.5 11.5 110.5 11.5 104Z';
  return {
    path,
    top: 38,
    cx: 41,
    sx: 0.55,
    face: [-25, -2],
    span: y => {
      if (y < 44 || y > 104) return undefined;
      const x = 37 * Math.sqrt(Math.max(0, 1 - ((y - 74) / 30) ** 2));
      return [Math.max(48, 82 - x), 82 + x];
    },
    item: [80, 22],
    paw: false,
    toes:
      toeMarks(
        [
          [43, 53],
          [57, 66],
          [92.5, 100],
          [104.5, 116],
        ],
        2,
      ) + `<ellipse cx="16.8" cy="106" rx="2.4" ry="2.8" fill="${ink}" stroke="none"/>`,
    arm: () => '',
    armRight: () => '',
  };
}

const geometry = new Map<MonsterBody, BodyGeometry>();

export function bodyGeometry(kind: MonsterBody): BodyGeometry {
  let result = geometry.get(kind);
  if (result) return result;
  if (kind === 'anteater') {
    result = anteater();
    geometry.set(kind, result);
    return result;
  }
  const { a, w, top, b, n, fur, raised, seed }: BodySpec = bodySpecs[kind];
  const next = random(seed);
  const cy = top + b;
  const side = (y: number) => {
    const t = (y - cy) / (hip - cy);
    return a + (w - a) * t ** 1.4 + Math.sin(Math.PI * t) * 1.2;
  };
  const half = (y: number) => {
    if (y < top || y > bottom) return 0;
    if (y >= cy) return y > hip ? w : side(y);
    return a * (1 - ((cy - y) / b) ** n) ** (1 / n);
  };

  // Outline from the left hip, up and over the dome, down to the right hip.
  const outline: Point[] = [];
  const sideSteps = 5;
  for (let i = 0; i <= sideSteps; i++) {
    const y = hip - ((hip - cy) * i) / sideSteps;
    outline.push([64 - side(y), y]);
  }
  const domeSteps = 14;
  for (let i = 1; i < domeSteps; i++) {
    const angle = Math.PI - (Math.PI * i) / domeSteps;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    outline.push([64 + a * Math.sign(c) * Math.abs(c) ** (2 / n), cy - b * Math.abs(s) ** (2 / n)]);
  }
  for (let i = sideSteps; i >= 0; i--) {
    const y = hip - ((hip - cy) * i) / sideSteps;
    outline.push([64 + side(y), y]);
  }
  for (const point of outline.slice(1, -1)) {
    point[0] += (next() - 0.5) * 1.2;
    point[1] += (next() - 0.5) * 1.2;
  }

  let upper: string;
  if (fur) {
    // Resample the outline evenly, then draw a pointed tuft between samples.
    const dense: Point[] = [];
    for (let i = 0; i < outline.length - 1; i++) {
      const [x0, y0] = outline[i]!;
      const [x1, y1] = outline[i + 1]!;
      for (let k = 0; k < 8; k++) dense.push([x0 + ((x1 - x0) * k) / 8, y0 + ((y1 - y0) * k) / 8]);
    }
    dense.push(outline.at(-1)!);
    const lengths = [0];
    for (let i = 1; i < dense.length; i++) {
      lengths.push(lengths[i - 1]! + Math.hypot(dense[i]![0] - dense[i - 1]![0], dense[i]![1] - dense[i - 1]![1]));
    }
    const total = lengths.at(-1)!;
    const tufts = Math.round(total / 11);
    const at = (distance: number): Point => {
      let i = lengths.findIndex(length => length >= distance);
      if (i <= 0) return dense[Math.max(0, i)]!;
      const t = (distance - lengths[i - 1]!) / (lengths[i]! - lengths[i - 1]! || 1);
      return [
        dense[i - 1]![0] + (dense[i]![0] - dense[i - 1]![0]) * t,
        dense[i - 1]![1] + (dense[i]![1] - dense[i - 1]![1]) * t,
      ];
    };
    upper = '';
    for (let i = 0; i < tufts; i++) {
      const p0 = at((total * i) / tufts);
      const p1 = at((total * (i + 1)) / tufts);
      const tx = p1[0] - p0[0];
      const ty = p1[1] - p0[1];
      const length = Math.hypot(tx, ty) || 1;
      const nx = ty / length;
      const ny = -tx / length;
      const depth = 3 + next() * 1.4;
      // Round clumps whose tips lean the way the fur falls: outwards and down.
      const tip: Point = [p0[0] + tx * 0.82 + nx * depth * 0.8, p0[1] + ty * 0.82 + ny * depth * 0.8 + 0.5];
      upper +=
        `Q${r1(p0[0] + tx * 0.3 + nx * depth * 1.5)} ${r1(p0[1] + ty * 0.3 + ny * depth * 1.5)} ${r1(tip[0])} ${r1(tip[1])}` +
        `Q${r1(p0[0] + tx * 0.92 + nx * 0.4)} ${r1(p0[1] + ty * 0.92 + ny * 0.4)} ${r1(p1[0])} ${r1(p1[1])}`;
    }
  } else {
    const ends: Point[] = [[outline[0]![0], hip + 8], ...outline, [outline.at(-1)![0], hip + 8]];
    upper = spline(ends);
  }

  // Legs: flat feet with a rounded notch between them.
  const gap = 5;
  const notch = 13;
  const path =
    `M${r1(64 - w)} ${hip}` +
    upper +
    `C${r1(64 + w + 0.6)} ${hip + 6} ${r1(64 + w - 0.5)} ${bottom} ${r1(64 + w - 5)} ${bottom}` +
    `L${64 + gap} ${bottom}V${bottom - notch + gap}A${gap} ${gap} 0 0 0 ${64 - gap} ${bottom - notch + gap}V${bottom}` +
    `L${r1(64 - w + 5)} ${bottom}C${r1(64 - w + 0.5)} ${bottom} ${r1(64 - w - 0.6)} ${hip + 6} ${r1(64 - w)} ${hip}Z`;

  const toes = toeMarks(
    [
      [64 - w + 1, 64 - gap],
      [64 + gap, 64 + w - 1],
    ],
    3,
  );

  const shoulder = Math.min(cy + 8, 82);
  const wrist = Math.min(shoulder + 30, 101);
  const armPath = (sign: 1 | -1) => {
    const x = (dx: number, y: number) => r1(64 + sign * (side(y) + dx));
    return (
      `M${x(-1.5, shoulder)} ${shoulder}C${x(3.5, shoulder + 8)} ${shoulder + 8} ${x(5.5, wrist - 10)} ${wrist - 10} ${x(4.5, wrist)} ${wrist}` +
      `C${x(4, wrist + 5)} ${wrist + 5} ${x(-3, wrist + 6)} ${wrist + 6} ${x(-4.5, wrist + 2)} ${wrist + 2}` +
      `C${x(-6, wrist - 6)} ${wrist - 6} ${x(-6, shoulder + 10)} ${shoulder + 10} ${x(-3.5, shoulder + 2)} ${shoulder + 2}`
    );
  };
  const arm = (sign: 1 | -1) => (fill: string) =>
    `<path d="${armPath(sign)}" fill="${fill}"/>` +
    `<path d="M${r1(64 + sign * (side(wrist) + 1.5))} ${wrist + 1.5}v3M${r1(64 + sign * (side(wrist) - 1.5))} ${wrist + 2}v3" stroke-width="1.5"/>`;

  // Raised arms are thick round strokes behind the body, so it hides the shoulder.
  const up = (sign: 1 | -1) => (fill: string) => {
    const d =
      `M${r1(64 + sign * (side(cy + 12) - 6))} ${cy + 12}` +
      `Q${r1(64 + sign * (a + 16))} ${cy + 8} ${r1(64 + sign * (a + 14))} ${top - 2}`;
    return `<path d="${d}" fill="none" stroke-width="14"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="8.6"/>`;
  };

  const head = half(top + 20);
  result = {
    path,
    top,
    cx: 64,
    sx: r1(head / 33.5) || 1,
    face: [0, top - 34],
    span: y => {
      const x = half(y);
      return x > 0 && y < hip ? [64 - x, 64 + x] : undefined;
    },
    item: [76, 72],
    paw: true,
    toes,
    ...(raised
      ? { wave: { art: up(-1), shoulder: [64 - side(cy + 12) + 6, cy + 12] as Point }, arm: () => '', armRight: up(1) }
      : { arm: arm(-1), armRight: arm(1) }),
  };
  geometry.set(kind, result);
  return result;
}

const textures = new Map<string, string>();

/** Fur strokes, spots or stripes, kept inside the body and off the face. */
export function bodyTexture(kind: MonsterBody, pattern: MonsterPattern, color: string) {
  if (pattern === 'plain') return '';
  const key = `${kind}/${pattern}`;
  let marks = textures.get(key);
  if (marks === undefined) {
    const { span, face: shift, top } = bodyGeometry(kind);
    const next = random(kind.length * 31 + pattern.length * 7);
    const within = (x: number, y: number, margin: number) => {
      const edge = span(y);
      return edge !== undefined && x > edge[0] + margin && x < edge[1] - margin;
    };
    const inside = (x: number, y: number, margin: number) =>
      within(x, y, margin) && within(x, y - margin, margin) && within(x, y + margin, margin);
    const face = (x: number, y: number) =>
      ((x - 64 - shift[0]) / 25) ** 2 + ((y - 64 - shift[1]) / 17) ** 2 < 1 || (kind === 'anteater' && x < 50);
    marks = '';
    if (pattern === 'stripes') {
      for (let y = kind === 'anteater' ? 62 : top + 58; y < (kind === 'anteater' ? 96 : hip - 2); y += 10) {
        const edge = span(y);
        if (!edge) continue;
        const [x0, x1] = [edge[0] + 1.6, edge[1] - 1.6];
        const mid = (x0 + x1) / 2;
        marks += `<path d="M${r1(x0)} ${y}Q${r1((x0 + mid) / 2)} ${y + 3} ${r1(mid)} ${y}T${r1(x1)} ${y}" fill="none" stroke-width="4"/>`;
      }
    } else {
      const step = pattern === 'fur' ? 10.5 : 11;
      for (let y = top + 6; y < hip; y += step) {
        for (let x = 22; x < 120; x += step) {
          const px = x + (next() - 0.5) * step * 0.8;
          const py = y + (next() - 0.5) * step * 0.8;
          if (!inside(px, py, 4) || face(px, py)) continue;
          if (pattern === 'fur') {
            const lean = (px - 64) / 14;
            marks += `M${r1(px)} ${r1(py)}q${r1(lean * 0.2 - 0.7)} 2.4 ${r1(lean * 0.5)} 4.8`;
          } else {
            marks += `<circle cx="${r1(px)}" cy="${r1(py)}" r="${r1(1.4 + next() * 2.4)}"/>`;
          }
        }
      }
      if (pattern === 'fur') marks = `<path d="${marks}" fill="none" stroke-width="1.7"/>`;
    }
    textures.set(key, marks);
  }
  return pattern === 'spots'
    ? `<g fill="${color}" stroke="none" opacity=".75">${marks}</g>`
    : `<g stroke="${color}" opacity="${pattern === 'fur' ? 0.9 : 0.7}">${marks}</g>`;
}

// ---------------------------------------------------------------------------
// Parts. Each is a function of the palette and returns SVG markup.

export type Part = (p: Palette) => string;
const record =
  <V>() =>
  <K extends string>(value: Record<K, V>) =>
    value;
const mirror = (svg: string) => `${svg}<g transform="matrix(-1 0 0 1 128 0)">${svg}</g>`;

export const earParts = record<Part>()({
  none: () => '',
  cat: p =>
    mirror(
      `<path d="M33 46C32 36 33 27 36 21C42 24 47 29 51 35" fill="${p.body}"/>` +
        `<path d="M37 34C37 30 37.5 27 38.5 25C41 27 43 29 45 32" fill="${p.shade}" stroke="none"/>`,
    ),
  horns: () => mirror(`<path d="M42 36C38 31 37 25 40 18C42 24 46 27 51 29" fill="#f6e3c3"/>`),
  antennae: p =>
    mirror(
      `<path d="M52 32C51 25 48 19 44 15" fill="none" stroke-width="2.6"/><circle cx="43" cy="14" r="4.6" fill="${p.body}"/>`,
    ),
  stalks: () =>
    mirror(
      `<path d="M52 32C51 24 49 18 46 13" fill="none" stroke-width="2.6"/>` +
        `<circle cx="45" cy="11" r="6" fill="#ffe27a"/><circle cx="45" cy="11" r="3.6" fill="#fff" stroke-width="1.6"/>` +
        `<circle cx="45.6" cy="11.4" r="1.7" fill="${ink}" stroke="none"/>`,
    ),
  bunny: p =>
    mirror(
      `<path d="M44 38C39 26 38 12 43 6C50 5 55 20 56 34" fill="${p.body}"/>` +
        `<path d="M45.5 27C43.5 20 43.5 13 45 10.5C48.5 12.5 50.5 19.5 51 27" fill="${p.light}" stroke="none"/>`,
    ),
  bear: p =>
    mirror(
      `<circle cx="40" cy="31" r="7.5" fill="${p.body}"/><circle cx="40" cy="31" r="3.6" fill="${p.shade}" stroke="none"/>`,
    ),
  tuft: p =>
    `<path d="M54 32C53 23 56 17 61 13C61 19 63 22 65 26C67 20 72 16 77 15C73 21 72 27 72 32" fill="${p.body}"/>`,
});

export type MonsterEars = keyof typeof earParts;
export const ears = Object.keys(earParts) as MonsterEars[];

// Eyes sit close together near the top of the head, like the hand-drawn set.
const L = 56;
const R = 72;
const eye = (cx: number, r = 7.6, pupil = 3.3) =>
  `<circle cx="${cx}" cy="60" r="${r}" fill="#fff" stroke-width="2.2"/>` +
  `<circle cx="${cx + 0.9}" cy="60.8" r="${pupil}" fill="${ink}" stroke="none"/>`;
const brow = (cx: number, side: 1 | -1, y = 49) =>
  `<path d="M${cx - side * 6.5} ${y + 1.6}Q${cx - side * 1.5} ${y - 2.4} ${cx + side * 4.5} ${y - 0.4}" fill="none" stroke-width="2"/>`;
const arc = (cx: number, up: boolean) =>
  up
    ? `<path d="M${cx - 5} 62Q${cx} 55 ${cx + 5} 62" fill="none" stroke-width="2.8"/>`
    : `<path d="M${cx - 5} 59Q${cx} 64 ${cx + 5} 59" fill="none" stroke-width="2.8"/>`;
const shade = (cx: number) =>
  `<path d="M${cx - 8} 55H${cx + 8}V59Q${cx + 8} 66 ${cx} 66Q${cx - 8} 66 ${cx - 8} 59Z" fill="${ink}"/>` +
  `<path d="M${cx - 4.5} 57.5H${cx - 1.5}" stroke="#fff" stroke-width="1.8"/>`;

export const eyeParts = record<Part>()({
  round: () => eye(L) + eye(R),
  wide: () => eye(L - 1, 8.7, 3.9) + eye(R + 1, 8.7, 3.9) + brow(L - 1, -1, 47.6) + brow(R + 1, 1, 47.6),
  sleepy: p =>
    ([L, R] as const)
      .map(
        (cx, i) =>
          `<circle cx="${cx}" cy="60" r="7.6" fill="#fff" stroke-width="2.2"/>` +
          `<path d="M${cx - 2.6} 60a3.3 3.3 0 0 0 6.6 0Z" fill="${ink}" stroke="none"/>` +
          `<path d="M${cx - 7.6} 60a7.6 7.6 0 0 1 15.2 0Z" fill="${p.body}" stroke-width="2.2"/>` +
          brow(cx, i ? 1 : -1),
      )
      .join(''),
  content: () => arc(L, false) + arc(R, false),
  happy: () => arc(L, true) + arc(R, true),
  wink: () => eye(L) + arc(R, true),
  glasses: () =>
    eye(L, 5.6, 2.8) +
    eye(R, 5.6, 2.8) +
    `<g fill="none" stroke-width="2.6"><circle cx="${L}" cy="60" r="8"/><circle cx="${R}" cy="60" r="8"/><path d="M63 59Q64 57.5 65 59"/></g>`,
  shades: () => `${shade(L)}${shade(R)}<path d="M63 56.5H65" stroke-width="2.6"/>`,
  cyclops: () =>
    `<circle cx="64" cy="59" r="11" fill="#fff"/><circle cx="65.2" cy="60" r="4.8" fill="${ink}" stroke="none"/>` +
    `<path d="M54.5 46.6Q64 41.4 73.5 46.6" fill="none" stroke-width="2"/>`,
});

export type MonsterEyes = keyof typeof eyeParts;
export const eyes = Object.keys(eyeParts) as MonsterEyes[];

export const mouthParts = record<Part>()({
  smile: () => `<path d="M59 71Q64 76 69 71" fill="none" stroke-width="2.6"/>`,
  grin: () =>
    `<path d="M56 70Q64 85 72 70Z" fill="${ink}"/>` +
    `<path d="M59.6 72L61 74.6L62.4 72.4ZM65.6 72.4L67 74.6L68.4 72Z" fill="#fff" stroke="none"/>` +
    `<path d="M60 77.4Q64 75 68 77.4Q66 80.6 64 80.6Q62 80.6 60 77.4Z" fill="#ff7a90" stroke="none"/>`,
  fangs: () =>
    `<path d="M56 70Q64 78 72 70" fill="none" stroke-width="2.6"/>` +
    `<path d="M58.6 72.2L60 76L61.4 73.4ZM66.6 73.4L68 76L69.4 72.2Z" fill="#fff" stroke-width="1.4"/>`,
  o: () => `<ellipse cx="64" cy="73" rx="3" ry="3.8" fill="${ink}"/>`,
  flat: () => `<path d="M59.5 73H68.5" stroke-width="2.6"/>`,
  cat: () => `<path d="M58 71Q61 75 64 72Q67 75 70 71" fill="none" stroke-width="2.6"/>`,
  lips: () =>
    `<rect x="50.5" y="68" width="27" height="10.6" rx="5.3" fill="#ff94b8"/><path d="M55 73.3H73" stroke-width="1.8"/>`,
  tongue: () =>
    `<path d="M58 71Q64 76 70 71" fill="none" stroke-width="2.6"/>` +
    `<path d="M62 74.4Q62 80 65.4 80Q68.4 80 68 73.4" fill="#ff7a90" stroke-width="2"/>`,
});

export type MonsterMouth = keyof typeof mouthParts;
export const mouths = Object.keys(mouthParts) as MonsterMouth[];

const phones =
  `<path d="M29 60C27 22 101 22 99 60" fill="none" stroke-width="9"/>` +
  `<path d="M29 60C27 22 101 22 99 60" fill="none" stroke="#4b4560" stroke-width="4.4"/>`;
const cups = (p: Palette) =>
  [20, 93]
    .map(
      x =>
        `<rect x="${x}" y="50" width="15" height="24" rx="7" fill="#4b4560"/>` +
        `<rect x="${x + 3.5}" y="55" width="8" height="14" rx="4" fill="${p.accent}" stroke="none"/>`,
    )
    .join('');

export interface Hat {
  art: Part;
  /** Gentle sway for things that grow out of the head. */
  sway?: boolean;
}

export const hatParts = record<Hat>()({
  none: { art: () => '' },
  headphones: { art: p => phones + cups(p) },
  headset: {
    art: p =>
      phones +
      cups(p) +
      `<path d="M27 70C29 86 39 90 49 88" fill="none" stroke-width="3"/><circle cx="50" cy="88" r="4" fill="${ink}"/>`,
  },
  'grad-cap': {
    art: () =>
      `<path d="M44 26V36Q64 44 84 36V26Z" fill="#3a3446"/><path d="M64 10L102 22L64 34L26 22Z" fill="#3a3446"/>` +
      `<path d="M64 22L94 26V40" fill="none" stroke="#ffd23f" stroke-width="2.5"/>` +
      `<circle cx="64" cy="22" r="2.6" fill="#ffd23f" stroke="none"/><circle cx="94" cy="42" r="3.2" fill="#ffd23f" stroke-width="1.6"/>`,
  },
  'hard-hat': {
    art: () =>
      `<path d="M34 40C34 14 94 14 94 40Z" fill="#ffcc33"/><path d="M58 18Q64 16 70 18V38H58Z" fill="#ffe27a" stroke-width="2.4"/>` +
      `<rect x="27" y="37" width="74" height="8" rx="4" fill="#ffcc33"/>`,
  },
  'chef-hat': {
    art: () =>
      `<g fill="#fff"><circle cx="50" cy="17" r="10"/><circle cx="78" cy="17" r="10"/><circle cx="64" cy="11" r="12"/></g>` +
      `<rect x="44" y="14" width="40" height="12" fill="#fff" stroke="none"/><path d="M44 22H84V36Q64 40 44 36Z" fill="#fff"/>`,
  },
  cap: {
    art: p =>
      `<path d="M84 34C96 31 108 33 113 38C104 41 94 41 84 39Z" fill="${p.accent}"/>` +
      `<path d="M38 38C38 14 90 14 90 38Z" fill="${p.accent}"/><path d="M64 16V37" fill="none" stroke-width="2"/>` +
      `<circle cx="64" cy="15" r="2.6" fill="${p.accent}"/>`,
  },
  'sun-hat': {
    art: () =>
      `<ellipse cx="64" cy="34" rx="46" ry="9" fill="#f2c45e"/><path d="M42 34C42 10 86 10 86 34Z" fill="#f2c45e"/>` +
      `<path d="M42.4 26Q64 31 85.6 26L86 32Q64 37 42 32Z" fill="#e8574c" stroke-width="2"/>`,
  },
  beanie: {
    art: p =>
      `<path d="M36 36C36 8 92 8 92 36Z" fill="${p.accent}"/><rect x="33" y="30" width="62" height="11" rx="5.5" fill="${p.accent}"/>` +
      `<path d="M44 32V39M54 32V39M64 32V39M74 32V39M84 32V39" stroke-width="2"/><circle cx="64" cy="9" r="6" fill="#fff"/>`,
  },
  crown: {
    art: () =>
      `<path d="M42 34L43 12L53 23L64 8L75 23L85 12L86 34Z" fill="#ffd34d"/>` +
      `<circle cx="64" cy="27" r="3.2" fill="#ff5c7a" stroke-width="1.6"/><circle cx="50" cy="29" r="2.2" fill="#4aa3ff" stroke-width="1.4"/>` +
      `<circle cx="78" cy="29" r="2.2" fill="#4aa3ff" stroke-width="1.4"/>`,
  },
  party: {
    art: p =>
      `<g transform="rotate(12 64 34)"><path d="M64 0L80 34Q64 39 48 34Z" fill="${p.accent}"/>` +
      `<path d="M58.5 13L69.5 13M54 23L74 23" stroke="#fff" stroke-width="3"/><circle cx="64" cy="0" r="4.5" fill="#fff"/></g>`,
  },
  wizard: {
    art: () =>
      `<ellipse cx="64" cy="33" rx="30" ry="6" fill="#5b3cc4"/><path d="M60 -6L84 32Q64 38 44 32Z" fill="#7b4fe0"/>` +
      `<path d="M62 12l1.4 2.8 3 .4-2.2 2 .6 3-2.8-1.5-2.8 1.5.6-3-2.2-2 3-.4Z" fill="#ffd34d" stroke-width="1.2"/>`,
  },
  astronaut: {
    art: () =>
      `<circle cx="64" cy="62" r="44" fill="#cfeaff" fill-opacity=".26" stroke-width="3.4"/>` +
      `<path d="M33 48Q39 32 54 25" fill="none" stroke="#fff" stroke-width="4" stroke-opacity=".85"/>` +
      `<rect x="58" y="12" width="12" height="7" rx="3" fill="#e6e3ee"/>`,
  },
  bow: {
    art: () =>
      `<path d="M86 30L75 22V38ZM86 30L97 22V38Z" fill="#ff6b8b"/><circle cx="86" cy="30" r="3.6" fill="#ff6b8b"/>`,
  },
  sprout: {
    sway: true,
    art: () =>
      `<path d="M64 31C64 24 64 20 63 15" fill="none" stroke-width="3"/>` +
      `<path d="M63 18C56 18 50 13 49 6C57 6 62 11 63 18Z" fill="#6fd36a"/><path d="M63.5 15C68 9 75 7 81 9C79 16 71 18 63.5 15Z" fill="#6fd36a"/>`,
  },
  tulip: {
    sway: true,
    art: () =>
      `<path d="M64 31C64 22 65 16 64 13" fill="none" stroke-width="3"/>` +
      `<path d="M64 27C58 25 54 20 54 15C60 16 63 20 64 27Z" fill="#6fd36a"/>` +
      `<path d="M56 3L60 8L64 1L68 8L72 3C73.5 12 70 17 64 17C58 17 54.5 12 56 3Z" fill="#ff6b8b"/>`,
  },
  halo: {
    sway: true,
    art: () =>
      `<ellipse cx="64" cy="14" rx="19" ry="5" fill="none" stroke-width="7"/>` +
      `<ellipse cx="64" cy="14" rx="19" ry="5" fill="none" stroke="#ffd34d" stroke-width="3.6"/>`,
  },
});

export type MonsterHat = keyof typeof hatParts;
export const hats = Object.keys(hatParts) as MonsterHat[];

// Items sit in a 40 × 40 box at the monster's lower right, held by its paw.
export type ItemMotion = 'bob' | 'ring' | 'float' | 'pulse' | 'sway';

export interface Item {
  art: string;
  motion?: ItemMotion;
  /** Where the paw holds the item, in the item's 40 × 40 box. */
  hand?: Point;
}

const paper = '#ffffff';
const dark = '#3d3a4a';
const metal = '#c9c6d6';

export const itemParts = record<Item>()({
  none: { art: '' },
  laptop: {
    art: `<rect x="2" y="6" width="34" height="24" rx="3" fill="${dark}"/><circle cx="19" cy="18" r="3" fill="#fff" stroke="none"/><path d="M-1 30H39L36 35H2Z" fill="${metal}"/>`,
  },
  code: {
    art:
      `<rect x="1" y="4" width="38" height="28" rx="3" fill="${dark}"/><rect x="4" y="7" width="32" height="22" rx="1.5" fill="#1f1b2a" stroke="none"/>` +
      `<path d="M15 13L10 18L15 23M25 13L30 18L25 23M22 11L18 25" fill="none" stroke="#5ef0a8" stroke-width="2.2"/><path d="M-2 32H42L39 36H1Z" fill="${metal}"/>`,
  },
  megaphone: {
    motion: 'ring',
    art:
      `<path d="M6 14L30 4V36L6 26Z" fill="${paper}"/><rect x="28" y="1" width="7" height="38" rx="3.5" fill="#ff6b5e"/>` +
      `<rect x="9" y="25" width="6" height="11" rx="2" fill="${dark}"/><path d="M38 9L42 6M39 20H43M38 31L42 34" fill="none"/>`,
  },
  chart: {
    art:
      `<rect x="4" y="2" width="32" height="36" rx="3" fill="${paper}"/>` +
      `<path d="M9 31L16 22L22 26L31 12M25.5 12H31V17.5" fill="none" stroke="#2d7ff9" stroke-width="3"/>`,
  },
  bars: {
    art:
      `<rect x="3" y="2" width="34" height="36" rx="3" fill="${paper}"/>` +
      `<g stroke-width="2"><rect x="9" y="22" width="5" height="10" fill="#2d7ff9"/><rect x="17.5" y="15" width="5" height="17" fill="#2d7ff9"/><rect x="26" y="9" width="5" height="23" fill="#ff6b5e"/></g>`,
  },
  clipboard: {
    art:
      `<rect x="5" y="4" width="30" height="36" rx="3" fill="#c98b4b"/><rect x="9" y="9" width="22" height="27" rx="1" fill="${paper}" stroke-width="2"/>` +
      `<rect x="14" y="1" width="12" height="7" rx="2" fill="#9aa0ad"/>` +
      `<path d="M12 16L14 18L17.5 13.5M20 16H28M12 24L14 26L17.5 21.5M20 24H28M12 31H28" fill="none" stroke-width="2"/>`,
  },
  document: {
    art:
      `<path d="M5 2H27L35 10V38H5Z" fill="${paper}"/><path d="M27 2V10H35" fill="none"/>` +
      `<path d="M10 16H30M10 22H30M10 28H24" fill="none" stroke="#2d7ff9" stroke-width="2.4"/>`,
  },
  email: {
    art:
      `<rect x="1" y="8" width="38" height="26" rx="3" fill="${paper}"/><path d="M2 10L20 24L38 10" fill="none"/>` +
      `<path d="M20 26.5C16 23.6 15.5 20.2 18 20C19.3 20 20 21 20 21C20 21 20.7 20 22 20C24.5 20.2 24 23.6 20 26.5Z" fill="#ff6b5e" stroke="none"/>`,
  },
  calendar: {
    art:
      `<rect x="3" y="6" width="34" height="31" rx="4" fill="${paper}"/><path d="M3 10A4 4 0 0 1 7 6H33A4 4 0 0 1 37 10V16H3Z" fill="#ff6b5e"/>` +
      `<path d="M12 2V9M28 2V9" fill="none" stroke-width="3"/>` +
      `<g stroke="none" fill="${ink}"><rect x="8.5" y="21" width="5" height="4" rx="1"/><rect x="17.5" y="21" width="5" height="4" rx="1"/>` +
      `<rect x="26.5" y="21" width="5" height="4" rx="1"/><rect x="8.5" y="29" width="5" height="4" rx="1"/><rect x="26.5" y="29" width="5" height="4" rx="1"/></g>` +
      `<rect x="17.5" y="29" width="5" height="4" rx="1" fill="#2d7ff9" stroke="none"/>`,
  },
  magnifier: {
    motion: 'sway',
    art:
      `<path d="M25 25L37 37" stroke-width="8"/><path d="M25 25L37 37" stroke="#c98b4b" stroke-width="3.4"/>` +
      `<circle cx="16" cy="16" r="12" fill="#d8f0ff"/><path d="M9 13Q11 8 16 8" fill="none" stroke="#fff" stroke-width="2.6"/>`,
  },
  book: {
    art:
      `<path d="M0 8V37C8 35 14 36 20 38C26 36 32 35 40 37V8Z" fill="#2d7ff9"/>` +
      `<path d="M20 8C14 4 6 4 1 6V34C6 32 14 32 20 36C26 32 34 32 39 34V6C34 4 26 4 20 8Z" fill="${paper}"/><path d="M20 8V36" fill="none"/>` +
      `<path d="M6 13H15M6 19H15M6 25H13M25 13H34M25 19H34M25 25H32" fill="none" stroke-width="2"/>`,
  },
  camera: {
    art:
      `<path d="M12 11L15 5H25L28 11Z" fill="${dark}"/><rect x="1" y="10" width="38" height="26" rx="5" fill="${dark}"/>` +
      `<circle cx="20" cy="23" r="9" fill="#7a7590"/><circle cx="20" cy="23" r="5" fill="#1f1b2a" stroke="none"/>` +
      `<circle cx="18" cy="21" r="1.6" fill="#fff" stroke="none"/><rect x="30" y="13" width="5" height="3" rx="1" fill="#ffd34d" stroke="none"/>`,
  },
  calculator: {
    art:
      `<rect x="6" y="2" width="28" height="37" rx="4" fill="${dark}"/><rect x="10" y="6" width="20" height="8" rx="1.5" fill="#c8f0c8" stroke-width="2"/>` +
      `<g fill="#fff" stroke="none"><rect x="10" y="18" width="5" height="4" rx="1"/><rect x="17.5" y="18" width="5" height="4" rx="1"/><rect x="25" y="18" width="5" height="4" rx="1"/>` +
      `<rect x="10" y="25" width="5" height="4" rx="1"/><rect x="17.5" y="25" width="5" height="4" rx="1"/><rect x="25" y="25" width="5" height="4" rx="1"/>` +
      `<rect x="10" y="32" width="5" height="4" rx="1"/><rect x="17.5" y="32" width="5" height="4" rx="1"/></g>` +
      `<rect x="25" y="32" width="5" height="4" rx="1" fill="#ff9f43" stroke="none"/>`,
  },
  shield: {
    motion: 'pulse',
    art:
      `<path d="M20 2L36 8V20C36 30 28 36 20 39C12 36 4 30 4 20V8Z" fill="#3ccf91"/>` +
      `<path d="M12 20L18 26L28 15" fill="none" stroke-width="3.6"/>`,
  },
  globe: {
    motion: 'sway',
    art:
      `<circle cx="20" cy="20" r="17" fill="#5ab8ff"/>` +
      `<path d="M10 9C14 12 12 16 16 18C19 20 17 25 13 27C9 25 5 20 6 15Z M27 22C31 21 34 24 33 28C31 32 27 33 25 30C24 27 25 23 27 22Z" fill="#3ccf91" stroke-width="2"/>` +
      `<ellipse cx="20" cy="20" rx="7" ry="17" fill="none" stroke-width="1.8"/><path d="M3 20H37" fill="none" stroke-width="1.8"/>`,
  },
  flask: {
    art:
      `<path d="M16 3V14L5 34Q3 38 8 38H32Q37 38 35 34L24 14V3Z" fill="${paper}"/>` +
      `<path d="M8.6 27.5H31.4L34.4 33.6Q36.2 37 32 37H8Q3.8 37 5.6 33.6Z" fill="#3ccf91" stroke="none"/>` +
      `<path d="M16 3V14L5 34Q3 38 8 38H32Q37 38 35 34L24 14V3M13 3H27" fill="none"/>` +
      `<circle cx="17" cy="21" r="1.8" fill="#fff"/><circle cx="23" cy="16" r="1.3" fill="#fff"/>`,
  },
  rocket: {
    motion: 'float',
    hand: [6, 30],
    art:
      `<g transform="rotate(35 20 20)"><path d="M14 30Q20 44 26 30Z" fill="#ffb020"/>` +
      `<path d="M12 23L5 32H12ZM28 23L35 32H28Z" fill="#ff6b5e"/><path d="M20 1C30 8 32 20 28 31H12C8 20 10 8 20 1Z" fill="${paper}"/>` +
      `<circle cx="20" cy="15" r="4.5" fill="#5ab8ff"/></g>`,
  },
  pencil: {
    hand: [8, 24],
    art:
      `<g transform="rotate(135 20 20)"><rect x="0" y="16" width="6" height="8" rx="2" fill="#ff8fa3"/>` +
      `<rect x="6" y="16" width="4" height="8" fill="${metal}"/><rect x="10" y="16" width="22" height="8" fill="#ffc93c"/>` +
      `<path d="M32 16L41 20L32 24Z" fill="#f6dcb4"/><path d="M38 18.7L41 20L38 21.3Z" fill="${ink}"/></g>`,
  },
  scales: {
    motion: 'sway',
    hand: [16, 34],
    art:
      `<path d="M20 5V36M12 37H28M5 10H35M5 10L1 22M5 10L9 22M35 10L31 22M35 10L39 22" fill="none"/>` +
      `<path d="M0 22Q5 28 10 22Z M30 22Q35 28 40 22Z" fill="#ffd34d"/><circle cx="20" cy="5" r="2.6" fill="#ffd34d"/>`,
  },
  bell: {
    motion: 'ring',
    art:
      `<circle cx="20" cy="33" r="4" fill="#ffb020"/><path d="M20 4C10 4 8 14 8 22L4 30H36L32 22C32 14 30 4 20 4Z" fill="#ffd34d"/>` +
      `<circle cx="20" cy="4" r="2.6" fill="#ffd34d"/>`,
  },
  heart: {
    motion: 'pulse',
    art:
      `<path d="M20 36C6 26 2 18 4 11C6 4 15 3 20 10C25 3 34 4 36 11C38 18 34 26 20 36Z" fill="#ff5c7a"/>` +
      `<path d="M9 12Q10 9 13 8.6" fill="none" stroke="#fff" stroke-width="2.4"/>`,
  },
  play: {
    motion: 'pulse',
    art: `<circle cx="20" cy="20" r="17" fill="${dark}"/><path d="M16 12L28 20L16 28Z" fill="#fff" stroke="none"/>`,
  },
  image: {
    art:
      `<rect x="2" y="5" width="36" height="30" rx="4" fill="${paper}"/><rect x="6" y="9" width="28" height="22" rx="2" fill="#bfe3ff" stroke-width="2"/>` +
      `<path d="M7 30L16 19L22 25L27 20L33 27V30Z" fill="#4a8cff" stroke-width="2"/><circle cx="28" cy="14" r="3" fill="#ffd34d" stroke="none"/>`,
  },
  'map-pin': {
    motion: 'float',
    art: `<path d="M20 38C20 38 6 24 6 15A14 14 0 0 1 34 15C34 24 20 38 20 38Z" fill="#ff6b5e"/><circle cx="20" cy="15" r="5" fill="#fff"/>`,
  },
  map: {
    art:
      `<path d="M2 8L13 4L27 8L38 4V32L27 36L13 32L2 36Z" fill="${paper}"/><path d="M13 4V32M27 8V36" fill="none" stroke-width="2"/>` +
      `<path d="M6 26C10 20 16 24 20 18S30 14 34 10" fill="none" stroke="#ff6b5e" stroke-width="2.2" stroke-dasharray="3 3"/>`,
  },
  plane: {
    motion: 'float',
    hand: [6, 30],
    art: `<path transform="rotate(45 20 20)" d="M20 2Q23 2 23 6V16L38 24V28L23 23V32L28 36V39L20 37L12 39V36L17 32V23L2 28V24L17 16V6Q17 2 20 2Z" fill="${paper}"/>`,
  },
  suitcase: {
    art:
      `<path d="M14 10V5Q14 3 16 3H24Q26 3 26 5V10" fill="none" stroke-width="3"/><rect x="3" y="10" width="34" height="27" rx="4" fill="#e2763a"/>` +
      `<path d="M12 10V37M28 10V37" fill="none" stroke="#a84f20" stroke-width="3"/>`,
  },
  bag: {
    art: `<path d="M13 12V9A7 7 0 0 1 27 9V12" fill="none" stroke-width="3"/><path d="M5 12H35L33 38H7Z" fill="#e46bd3"/>`,
  },
  cart: {
    art:
      `<path d="M10 12H37L33 28H13Z" fill="#5ab8ff"/><path d="M1 6H8L13 28H33" fill="none" stroke-width="3"/>` +
      `<circle cx="15" cy="34" r="3.2" fill="${ink}"/><circle cx="31" cy="34" r="3.2" fill="${ink}"/>`,
  },
  leaf: {
    motion: 'sway',
    art: `<path d="M4 36C4 16 16 4 36 4C36 24 24 36 4 36Z" fill="#3ccf91"/><path d="M6 34L28 12M16 24H24M16 24V16" fill="none" stroke-width="2"/>`,
  },
  plant: {
    motion: 'sway',
    hand: [8, 30],
    art:
      `<path d="M20 22C12 20 8 12 10 4C18 6 22 14 20 22Z M20 22C26 16 34 14 38 16C34 24 26 24 20 22Z" fill="#3ccf91"/>` +
      `<path d="M8 25H32L29 39H11Z" fill="#e0784a"/><rect x="6" y="21" width="28" height="6" rx="2" fill="#e0784a"/>`,
  },
  dumbbell: {
    hand: [16, 22],
    art:
      `<rect x="6" y="17" width="28" height="6" rx="2" fill="${metal}"/><rect x="1" y="9" width="8" height="22" rx="2.5" fill="${dark}"/>` +
      `<rect x="31" y="9" width="8" height="22" rx="2.5" fill="${dark}"/><rect x="-3" y="13" width="4" height="14" rx="1.5" fill="${dark}"/>` +
      `<rect x="39" y="13" width="4" height="14" rx="1.5" fill="${dark}"/>`,
  },
  gamepad: {
    art:
      `<path d="M8 10H32C38 10 40 18 39 26C38 34 32 36 28 30L25 26H15L12 30C8 36 2 34 1 26C0 18 2 10 8 10Z" fill="${dark}"/>` +
      `<path d="M10 17V24M6.5 20.5H13.5" stroke="#fff" stroke-width="2.4"/>` +
      `<circle cx="28" cy="18" r="2.4" fill="#ff6b5e" stroke="none"/><circle cx="32" cy="22.5" r="2.4" fill="#5ab8ff" stroke="none"/>`,
  },
  clapper: {
    art:
      `<rect x="2" y="14" width="36" height="24" rx="2" fill="${dark}"/>` +
      `<g transform="rotate(-14 2 13)"><rect x="2" y="6" width="36" height="7" fill="#fff"/>` +
      `<path d="M8 6L13 13M17 6L22 13M26 6L31 13" stroke-width="3"/></g><path d="M8 22H32M8 29H24" fill="none" stroke="#fff" stroke-width="2"/>`,
  },
  newspaper: {
    art:
      `<rect x="2" y="4" width="36" height="32" rx="2" fill="${paper}"/><rect x="6" y="8" width="28" height="5" fill="${ink}" stroke="none"/>` +
      `<rect x="6" y="16" width="12" height="10" fill="#bfe3ff" stroke-width="2"/><path d="M22 17H34M22 21H34M22 25H34M6 30H34" fill="none" stroke-width="2"/>`,
  },
  telescope: {
    hand: [12, 26],
    art:
      `<path d="M18 24L10 39M18 24L26 39M18 24V39" fill="none"/>` +
      `<g transform="rotate(-32 20 18)"><rect x="2" y="13" width="32" height="10" rx="3" fill="#ff8fa3"/>` +
      `<rect x="32" y="11" width="6" height="14" rx="2" fill="${dark}"/><rect x="-2" y="15" width="5" height="6" rx="1.5" fill="${dark}"/></g>`,
  },
  paw: {
    motion: 'pulse',
    art:
      `<circle cx="20" cy="20" r="19" fill="${paper}"/><g fill="${dark}" stroke="none"><ellipse cx="20" cy="26" rx="8.5" ry="7"/>` +
      `<circle cx="9" cy="16" r="3.6"/><circle cx="16" cy="10" r="3.6"/><circle cx="24" cy="10" r="3.6"/><circle cx="31" cy="16" r="3.6"/></g>`,
  },
  house: {
    art:
      `<path d="M4 20L20 6L36 20V38H4Z" fill="#fff4dc"/><path d="M0 21L20 2L40 21L35 21L20 8L5 21Z" fill="#e2574c"/>` +
      `<rect x="16" y="26" width="8" height="12" fill="#c98b4b"/><rect x="27" y="22" width="6" height="6" fill="#bfe3ff" stroke-width="2"/>`,
  },
  key: {
    motion: 'sway',
    art:
      `<rect x="16" y="17" width="22" height="5" rx="1" fill="#ffd34d"/><path d="M30 22V28M35 22V26" stroke-width="3.4"/>` +
      `<circle cx="10" cy="19.5" r="8.5" fill="#ffd34d"/><circle cx="10" cy="19.5" r="3" fill="#fff"/>`,
  },
  car: {
    art:
      `<path d="M2 28V21Q2 18 6 17L11 10Q13 8 16 8H26Q29 8 31 11L35 17Q39 18 39 22V28Z" fill="#8a7cff"/>` +
      `<path d="M13 16L16 11H20V16ZM23 11H27L30 16H23Z" fill="#d8f0ff" stroke-width="2"/>` +
      `<circle cx="11" cy="29" r="5" fill="${dark}"/><circle cx="30" cy="29" r="5" fill="${dark}"/>` +
      `<circle cx="11" cy="29" r="2" fill="${metal}" stroke="none"/><circle cx="30" cy="29" r="2" fill="${metal}" stroke="none"/>`,
  },
  target: {
    art:
      `<circle cx="20" cy="20" r="18" fill="#fff"/><circle cx="20" cy="20" r="12" fill="#ff6b5e"/><circle cx="20" cy="20" r="6" fill="#fff"/>` +
      `<circle cx="20" cy="20" r="2" fill="${ink}"/><path d="M20 20L36 4" fill="none"/><path d="M33 3L39 1L37 7Z" fill="#3ccf91"/>`,
  },
  phone: {
    art:
      `<rect x="9" y="2" width="22" height="36" rx="5" fill="${dark}"/><rect x="12" y="6" width="16" height="26" rx="2" fill="#8fd3ff" stroke="none"/>` +
      `<path d="M15 12H25M15 17H22" stroke="#fff" stroke-width="2.4"/>`,
  },
  chat: {
    art:
      `<path d="M4 6H36Q39 6 39 9V26Q39 29 36 29H18L10 36V29H4Q1 29 1 26V9Q1 6 4 6Z" fill="${paper}"/>` +
      `<g fill="${ink}" stroke="none"><circle class="sm-dot" cx="12" cy="17.5" r="2.6"/><circle class="sm-dot" cx="20" cy="17.5" r="2.6"/>` +
      `<circle class="sm-dot" cx="28" cy="17.5" r="2.6"/></g>`,
  },
  coffee: {
    art:
      `<path d="M14 8Q11 5 14 2M22 8Q19 5 22 2" fill="none" stroke="#9aa0ad" stroke-width="2.2" class="sm-steam"/>` +
      `<path d="M30 17Q38 17 38 24Q38 31 30 31" fill="none" stroke-width="3"/><path d="M6 12H30V32Q30 38 24 38H12Q6 38 6 32Z" fill="${paper}"/>` +
      `<path d="M6 18H30" stroke="#c98b4b" stroke-width="2"/>`,
  },
  bowl: {
    art:
      `<path d="M22 2L34 16M27 1L38 13" stroke="#c98b4b" stroke-width="3"/>` +
      `<path d="M6 18Q10 10 16 14Q20 8 26 13Q32 10 34 18Z" fill="#ffb020"/><path d="M2 18H38Q36 36 20 36Q4 36 2 18Z" fill="${paper}"/>` +
      `<path d="M8 25Q20 29 32 25" fill="none" stroke="#ff6b5e" stroke-width="2"/>`,
  },
  music: {
    motion: 'float',
    art:
      `<path d="M17 31V8L33 4V27" fill="none" stroke-width="3"/><path d="M17 8L33 4" stroke-width="5"/>` +
      `<ellipse cx="12" cy="32" rx="6" ry="5" fill="${ink}"/><ellipse cx="28" cy="28" rx="6" ry="5" fill="${ink}"/>`,
  },
  mic: {
    art:
      `<path d="M8 18Q8 30 20 30Q32 30 32 18M20 30V38M13 38H27" fill="none"/><rect x="13" y="2" width="14" height="22" rx="7" fill="#9aa0ad"/>` +
      `<path d="M13 9H18M13 14H18M13 19H18" stroke-width="2"/>`,
  },
  cloud: {
    motion: 'float',
    art:
      `<path d="M12 30Q3 30 3 23Q3 16 11 16Q13 8 21 8Q30 8 31 17Q38 17 38 23.5Q38 30 31 30Z" fill="${paper}"/>` +
      `<path d="M12 34L10 39M20 34L18 39M28 34L26 39" fill="none" stroke="#5ab8ff" stroke-width="2.6"/>`,
  },
  sun: {
    motion: 'sway',
    art:
      `<path d="M20 2V8M20 32V38M2 20H8M32 20H38M7 7L11 11M29 29L33 33M7 33L11 29M29 11L33 7" fill="none" stroke="#ffb020" stroke-width="3"/>` +
      `<circle cx="20" cy="20" r="9" fill="#ffd34d"/>`,
  },
  lightning: {
    motion: 'pulse',
    art: `<path d="M24 2L8 22H19L15 38L32 16H21Z" fill="#ffd34d"/>`,
  },
  trophy: {
    art:
      `<path d="M10 8H4Q4 18 11 18M30 8H36Q36 18 29 18" fill="none" stroke-width="3"/>` +
      `<path d="M10 4H30V14Q30 26 20 26Q10 26 10 14Z" fill="#ffd34d"/><path d="M20 26V32" stroke-width="3"/>` +
      `<rect x="12" y="32" width="16" height="6" rx="1.5" fill="#c98b4b"/>`,
  },
  gear: {
    motion: 'sway',
    art:
      `<circle cx="20" cy="20" r="14" fill="none" stroke="#9aa0ad" stroke-width="8" stroke-dasharray="5.5 5.5"/>` +
      `<circle cx="20" cy="20" r="11.5" fill="#9aa0ad"/><circle cx="20" cy="20" r="4.5" fill="#fff"/>`,
  },
  database: {
    art:
      `<path d="M4 8V32Q20 40 36 32V8" fill="#8a7cff"/><ellipse cx="20" cy="8" rx="16" ry="5" fill="#b3a9ff"/>` +
      `<path d="M4 16Q20 24 36 16M4 24Q20 32 36 24" fill="none"/>`,
  },
  gift: {
    motion: 'ring',
    art:
      `<rect x="4" y="16" width="32" height="22" rx="2" fill="#ff6b5e"/><rect x="2" y="10" width="36" height="8" rx="2" fill="#ff8a7e"/>` +
      `<rect x="17" y="10" width="6" height="28" fill="#ffd34d" stroke-width="2"/><path d="M20 10C14 2 6 6 12 10ZM20 10C26 2 34 6 28 10Z" fill="#ffd34d"/>`,
  },
  palette: {
    art:
      `<path d="M20 4C8 4 2 12 2 20C2 30 10 36 18 36C22 36 22 32 20 30C18 28 20 25 24 25H30C35 25 38 22 38 17C38 10 30 4 20 4Z" fill="#f6dcb4"/>` +
      `<g stroke="none"><circle cx="11" cy="17" r="3.4" fill="#ff6b5e"/><circle cx="18" cy="10.5" r="3.4" fill="#ffd34d"/>` +
      `<circle cx="27.5" cy="11.5" r="3.4" fill="#4aa3ff"/><circle cx="10" cy="26" r="3.4" fill="#3ccf91"/></g>`,
  },
  bulb: {
    motion: 'pulse',
    art:
      `<path d="M4 6L8 9M36 6L32 9M20 0V3" fill="none" stroke="#ffb020" stroke-width="2.6"/>` +
      `<path d="M20 5A12 12 0 0 0 13 26V30H27V26A12 12 0 0 0 20 5Z" fill="#ffe680"/><rect x="13" y="30" width="14" height="7" rx="2" fill="#9aa0ad"/>`,
  },
});

export type MonsterItem = keyof typeof itemParts;
export const items = Object.keys(itemParts) as MonsterItem[];

export const defaultHand: Point = [3, 25];
