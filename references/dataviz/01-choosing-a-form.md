---
topic: dataviz
role: reference
scope: chart-form-selection
audience: ui-designer
---

# Choosing a Form: The Data's Job Picks the Chart

Decide the form before touching color. A chart is read by people and executed by you, so form selection is a procedure, not taste: identify the data's job (magnitude, identity, polarity, a single headline, change over time), and the job picks the chart type. Sometimes the right form is not a chart at all.

The full dataviz procedure, in order: pick the form (this file) -> assign color by job and validate it (`02-color-jobs-and-validation.md`) -> apply mark specs and the hover layer (`03-marks-interaction-figures.md`) -> check the result against the catalog (`04-anti-patterns.md`) -> render it and look at it. The validator checks color, not layout; the final eyeball pass catches label collisions, geometry, and overflow.

## 1. Is It Even a Chart?

| The data is... | Use | Not |
|---|---|---|
| A single current value (+ maybe a trend) | Stat tile (value + delta + sparkline) | A one-bar bar chart |
| A handful of headline numbers | KPI row of stat tiles | A grouped bar chart |
| The one number a dashboard leads with | Hero figure (>= 48px, the same sans as everything else) | A display/serif face |
| A single ratio against a limit | Meter (same-ramp track) | A pie of 2 slices |
| More than ~7 classes that all carry meaning | A table (or table + chart) | More colors |

## 2. The Job Picks the Type

| Job (what the reader must do) | Default form | Color job |
|---|---|---|
| Compare magnitude, low to high | bar / column; heatmap for a grid | sequential (one hue) |
| Trend over time | line; area for a single series | sequential or 1 categorical |
| Tell distinct series apart | grouped/stacked bar, multi-line | categorical |
| One series is the point, rest are context | emphasis (highlight one, gray the rest) | 1 hue + gray |
| Above/below a baseline; delta to target | diverging bar, or line vs baseline | diverging |
| Part-to-whole | stacked bar (horizontal for many / long-named categories) | categorical |
| Ordered-scale share (Likert, sentiment) | diverging stacked bar, centered on neutral | diverging |
| Before/after per item | dumbbell | 1 hue, 2 shades |

The rules behind the table:

- **Sequential is the safe default.** One hue, more-is-darker. Legible, consistent, hard to misread. Reach for it unless the job is specifically identity or polarity.
- **Categorical is for when the series ARE the subject**, and it has a real cost: it can bury the one data point that matters. If the story is "this one went up," that is emphasis, not categorical.
- **Emphasis is the most underused form.** One series in the accent hue, the rest in the de-emphasis gray. Often the honest answer to "make this chart clearer."
- **Texture is an opt-in accessibility channel, not a default form.** It earns its place for full CVD, print/export, and `forced-colors` only. Never decorative.

## 3. Series-Count Ladder (Categorical)

| Series | Treatment |
|---|---|
| 1-3 | color alone is comfortable for everyone; direct-label |
| 4 | the CVD floor enters; direct labels become mandatory, not a courtesy |
| 5-6 | soft cap; legend or small multiples |
| 7-8 | token ceiling; past it, fold the tail into "Other," facet into small multiples, or use composite encoding (hue x shape) |

Never solve "too many series" by generating more hues. A generated 9th hue is indistinguishable from an existing one under CVD and breaks every check in file 02.

## 4. Beyond the Core Kit

The specialized forms, with the condition that justifies each. Every one of these needs its table-view twin (file 03) because their encodings are harder for assistive tech.

| Form | Justified when | Skip when |
|---|---|---|
| Funnel / Sankey | A real sequential multi-stage process with drop-off, or quantities flowing between nodes | The stages are not actually ordered |
| Waterfall | Individual +/- contributions must reconcile to a total (variance bridges) | A plain bar answers the same question |
| Treemap / Sunburst | Size relationships inside a hierarchy; hundreds of leaves | < ~15 nodes (a bar chart reads faster) |
| Box plot / Violin | Spread, median, and outliers of a distribution matter | The audience needs the mean only (stat tile) |
| Candlestick / OHLC | Financial time series where intraday range carries meaning | Any non-trading context |
| Bullet chart | Many KPIs vs targets side by side in a dense dashboard | One KPI (a meter or stat tile) |
| Waffle / Pictogram | A single percentage for a general audience | Comparing several close percentages (bars) |
| Choropleth / Bubble map | The regional dimension IS the story | Geography is incidental to the comparison |
| Network graph | Connections between entities are the subject | The graph is a tree (use a tree) |
| Line + confidence band | Forecast or model output where uncertainty must be visible | Presenting predictions as if they were observations |
| Radar / Spider | Rarely. Multiple entities across the same 3-6 axes, all on comparable scales | Almost always: area distorts perception, axis order is arbitrary. Prefer grouped bars or small multiples |
| Pie / Donut | Part-to-whole at a glance, <= 5 segments, one dominant slice | Comparing close values (bars), > 5 segments |

## 5. Library Selection (Web)

Pick by the surface's needs, not habit. Whatever renders it, the specs in files 02-04 apply unchanged.

| Situation | Reach for | Why |
|---|---|---|
| Plain HTML/SVG page, few charts | Hand-rolled SVG + the palette custom properties | Zero deps; full control of marks, gaps, hover |
| React product dashboard | Recharts (fast to ship) or visx (full control) | Composable; visx exposes scales for custom marks |
| Dense/streaming dashboards, big data | ECharts or uPlot | Canvas rendering holds frame rate past ~10k points |
| Bespoke editorial/scrollytelling | D3 directly | Nothing else gives that shape freedom |
| SwiftUI | Swift Charts | Accessibility built in (see the apple-ui-craft plugin) |

Whichever library: disable its default categorical cycling and feed it the fixed slot order from `02-color-jobs-and-validation.md`. Library defaults cycle hues, which breaks identity on filter.

## 6. Cross-References

| Need | File |
|---|---|
| Color jobs, six checks, validator, reference palette | `references/dataviz/02-color-jobs-and-validation.md` |
| Mark specs, labels, figures, tooltips, filters | `references/dataviz/03-marks-interaction-figures.md` |
| The failure catalog to check every chart against | `references/dataviz/04-anti-patterns.md` |
| OKLCH token architecture the palette plugs into | `references/design/01-color-oklch.md` |
| Dashboard type scale (<= 24px caps) | `references/design/02-typography.md` |
