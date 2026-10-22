# Vibrant palette

Brighter shared colors for charts, SqlViewer, and StateSample.

- `chart.css` base layer defines ten named hues (`--sprout-red` … `--sprout-tan`) with light and dark values.
- Light values are deeper so each keeps 3:1 contrast on `--sprout-surface`. Dark values are the bright set.
- `--sprout-chart-1..10` point at the hues in an order where neighbors differ: indigo, green, orange, red, sky, purple, yellow, teal, blue, tan.
- One shared set; brand themes do not override it.
- SqlViewer keeps tones 1–5.
- StateSample drops its private copies and uses the shared hues.
- Tailwind exposes `sprout-<hue>` and `sprout-chart-1..10`.
