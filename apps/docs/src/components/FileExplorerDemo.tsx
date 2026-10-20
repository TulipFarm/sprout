import { FileExplorer, type FileExplorerFile } from '@tulipfarm/sprout/file-explorer';
import '../styles/file-explorer-demo.css';

const soul: FileExplorerFile[] = [
  {
    path: 'SOUL.md',
    content: `# Meadow

Meadow is the operations agent for the Tulip Farm greenhouse team.

## Voice

- Calm, short sentences. Say what changed, then what to do.
- Name the bed, the crop, and the date. Never "some plants".
- When unsure, ask the grower on shift before acting.

## Boundaries

1. Never change irrigation schedules without a grower's approval.
2. Read sensor data; do not write to it.
3. Escalate frost warnings to \`#greenhouse-alerts\` at once.

\`\`\`yaml
escalate:
  frost_below_c: 2
  humidity_above: 92
\`\`\`
`,
  },
  {
    path: 'agents/scout/persona.md',
    content: `# Scout

Scout walks the beds each morning and writes the daily crop report.

- Checks every bed listed in \`memory/beds.json\`.
- Flags leaves with spots, wilt, or pests, with a photo link.
- Hands frost and flood risks to Meadow.
`,
  },
  {
    path: 'agents/scout/tools.ts',
    content: `import { defineTool } from "@tulipfarm/agents";
import { z } from "zod";

/** Reads the latest sensor values for one bed. */
export const readBed = defineTool({
  name: "read_bed",
  description: "Latest soil moisture, temperature, and light for a bed.",
  input: z.object({ bed: z.string().regex(/^[A-H]\\d{1,2}$/) }),
  async run({ bed }, { sensors }) {
    const reading = await sensors.latest(bed);
    if (!reading) return { status: "missing", bed } as const;
    return {
      status: "ok",
      bed,
      moisture: Math.round(reading.moisture * 100),
      celsius: reading.celsius,
      lux: reading.lux,
    } as const;
  },
});

export const tools = [readBed];
`,
  },
  {
    path: 'agents/harvest/persona.md',
    content: `# Harvest

Harvest plans the week's picking from ripeness scores and orders.
Keep the plan to one table: bed, crop, crates, and picker.
`,
  },
  {
    path: 'agents/harvest/schedule.py',
    content: `from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class Pick:
    bed: str
    crop: str
    crates: int
    day: date


def plan_week(scores: dict[str, float], start: date) -> list[Pick]:
    """Pick the ripest beds first, two beds per day."""
    ripe = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    picks = []
    for index, (bed, score) in enumerate(ripe):
        if score < 0.7:
            break
        crates = max(1, round(score * 12))
        picks.append(Pick(bed, "tulip", crates, start + timedelta(days=index // 2)))
    return picks
`,
  },
  {
    path: 'memory/beds.json',
    content: `{
  "greenhouse": "North",
  "beds": [
    { "id": "A1", "crop": "tulip", "variety": "Queen of Night", "planted": "2026-02-14" },
    { "id": "A2", "crop": "tulip", "variety": "Apricot Beauty", "planted": "2026-02-14" },
    { "id": "B4", "crop": "ranunculus", "variety": "Amandine", "planted": "2026-03-02" }
  ],
  "frostProtection": true
}
`,
  },
  {
    path: 'memory/notes/2026-10-12.md',
    content: `# Shift notes, 12 October

- Bed A2: wilt on the north edge. Scout flagged it twice.
- Frost warning overnight. Meadow escalated at 21:40.
`,
  },
  {
    path: 'memory/notes/2026-10-18.md',
    content: `# Shift notes, 18 October

- Harvest picked 18 crates from A1.
- Humidity in B4 reached 94%. Vents opened by hand.
`,
  },
  {
    path: 'skills/frost-watch/SKILL.md',
    content: `# Frost watch

Use when the forecast drops below 4 °C.

1. Read every bed with \`read_bed\`.
2. Close vents on beds under 6 °C.
3. Post one message to \`#greenhouse-alerts\` with the beds at risk.
`,
  },
  {
    path: 'skills/frost-watch/check.sh',
    content: `#!/usr/bin/env bash
set -euo pipefail

threshold="\${FROST_BELOW_C:-2}"
for bed in A1 A2 B4; do
  celsius=$(tulip sensors latest "$bed" --field celsius)
  if (( $(echo "$celsius < $threshold" | bc -l) )); then
    echo "frost risk: $bed at \${celsius}°C"
  fi
done
`,
  },
  {
    path: 'config.yaml',
    content: `name: meadow
model: claude-sonnet-5-5
timezone: Europe/Amsterdam

schedules:
  - agent: scout
    cron: "0 6 * * *"
  - agent: harvest
    cron: "0 7 * * 1"

channels:
  alerts: "#greenhouse-alerts"
  reports: "#crop-reports"
`,
  },
  { path: '.env.example', content: `SENSORS_URL=\nFROST_BELOW_C=2\n` },
  {
    path: 'styles/report.css',
    content: `.report {\n  font: 14px/1.5 system-ui;\n  color: #1d6a37;\n}\n`,
  },
  {
    path: 'assets/greenhouse-map.png',
    unavailable: 'Images cannot be displayed here.',
  },
  { path: 'README', content: '' },
];

export function FileExplorerPlayground() {
  return (
    <div className="file-explorer-demo">
      <FileExplorer files={soul} label="Soul" defaultPath="agents/scout/tools.ts" />
    </div>
  );
}
