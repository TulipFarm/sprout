const origin = process.env.BOARD_ORIGIN ?? "http://127.0.0.1:4330";
const priority = [
  "Primitives",
  "Forms",
  "Feedback",
  "Data & content",
  "AI & chat",
  "App compositions",
];

export function nextCards(snapshot) {
  const picked = snapshot.cards.filter((card) => card.state === "PICK").length;
  return snapshot.cards
    .filter((card) => card.state === "TODO" && !card.sourceMissing)
    .sort(
      (a, b) =>
        rank(a.category) - rank(b.category) ||
        b.usageCount - a.usageCount ||
        a.name.localeCompare(b.name),
    )
    .slice(0, Math.max(0, snapshot.maxPicked - picked));
}

function rank(category) {
  const index = priority.indexOf(category);
  return index === -1 ? priority.length : index;
}

async function board() {
  const response = await fetch(`${origin}/api/board`);
  if (!response.ok) throw new Error(`Board returned ${response.status}`);
  return response.json();
}

async function move(card, snapshot) {
  const response = await fetch(
    `${origin}/api/cards/${encodeURIComponent(card.id)}/move`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Board-Token": snapshot.csrfToken,
        Origin: origin,
      },
      body: JSON.stringify({ state: "PICK", revision: snapshot.revision }),
    },
  );
  if (!response.ok)
    throw new Error(`${card.name}: ${(await response.json()).error}`);
}

export async function fill() {
  let snapshot = await board();
  if (snapshot.paused)
    return { paused: true, queueError: snapshot.queueError, picked: [] };
  const picked = [];
  for (const card of nextCards(snapshot)) {
    await move(card, snapshot);
    picked.push(card.name);
    snapshot = await board();
  }
  return { paused: false, picked };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const interval = Number(process.argv[2] ?? 0);
  do {
    try {
      const result = await fill();
      if (result.picked.length || result.paused)
        console.log(new Date().toISOString(), JSON.stringify(result));
    } catch (error) {
      console.error(new Date().toISOString(), error.message);
    }
    if (interval)
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  } while (interval);
}
