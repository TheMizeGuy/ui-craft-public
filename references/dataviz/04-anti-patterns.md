---
topic: dataviz
role: reference
scope: chart-anti-patterns
audience: ui-reviewer
---

# Dataviz Anti-Patterns: What Goes Wrong in Shipping Dashboards

Check every chart against this list before shipping and during review. If the output matches an entry, it is wrong; fix it. These are real failure modes, each caught in shipping dashboards. (This catalog is chart correctness, not AI-tell detection; the AI-tells catalogue in `references/catalogue/01-ai-tells.md` is a separate gate.)

## Color and Encoding

| Wrong | Why it misleads | Right |
|---|---|---|
| Dual-axis chart (two y-scales on one plot) | The alignment of the two scales is arbitrary, so the chart invents a correlation that is not in the data. Real case: Users (0-30k) plotted against Sessions (0-800k) read as "hallucinated" to a reviewer. The #1 chart mistake | Two charts, small multiples, or index both series to a common base (=100 at t0) on one axis |
| Recolor-on-filter (colors assigned by current rank) | A reader who learned "Acme is blue" is now misled when filtering repaints survivors | Color follows the entity, not its row number |
| Cycling or generating hues past 8 | A generated 9th hue is indistinguishable from an existing slot under CVD and breaks the order check | Fold the tail into "Other," facet into small multiples, or composite encoding (hue x shape) |
| Eyeballed colorblind-safety ("these look different enough") | Human judgment misses protan/deutan collapses reliably | Run `scripts/validate_palette.js`; adjacent delta-E >= 8, or 6-8 with secondary encoding |
| A value-ramp on nominal categories (each bar darker where bigger) | Double-encodes bar length as hue and burns the identity channel on information the chart already shows | One series, one color for every bar; ordered categories take the ordinal ramp (`--ordinal`) |
| Rainbow / multi-hue sequential ramp | No perceptual order; fails CVD | One hue, light to dark |
| A hue at the diverging midpoint, or two cool hues as poles | The midpoint must read as "nothing"; poles must read as opposite (blue-aqua fails; blue-red or blue-orange succeed) | Two opposite-reading hues + a neutral gray midpoint |
| Status color on a non-status series (or vice versa) | Reserved meaning leaks; "series 4" impersonates "critical" | Status tokens only when the color means good/bad; categorical when it is identity |

## Form

| Wrong | Why | Right |
|---|---|---|
| Eight categorical hues when the story is one number | The most common way a chart misses its point | Emphasis (highlight one, gray the rest), or a stat tile / hero number |
| A one-bar bar chart, or a 2-slice pie | The number is the chart | A stat tile |
| A donut/pie comparing close values | Angle comparison is imprecise | A bar, or the numbers; pie only for at-a-glance part-to-whole, <= 5 segments |
| More than ~7 color classes carrying meaning | Adjacent classes blur | A table, or table + chart |
| Radar chart for entity comparison | Enclosed area distorts perception; axis order is arbitrary and changes the shape | Grouped bars or small multiples |
| A y-axis truncated to "show the difference better" | Data-integrity violation; exaggerates magnitude | Zero baseline for bars, or an explicit broken-axis marker with the full-range twin nearby |

## Marks and Chrome

| Wrong | Why | Right |
|---|---|---|
| Thick saturated blocks, heavy gridlines, no breathing room | Reads loud, even childish, at scale | Thin marks, hairline recessive grid/axes, generous padding; saturation for small marks and accents only |
| Dashed gridlines or axis rules | Dashing adds noise and reads as "projection" or "threshold" | Solid hairlines, one shade off the surface |
| A number on every data point | Chaos; goes unread | Legend always present for >= 2 series; direct-label selectively |
| A border drawn around marks to separate them | Data-weight ink that is not data | 2px surface gap between fills; 2px surface ring on overlapping markers |
| A label clipped by or overflowing a too-small bar/segment (incl. `overflow: hidden` crops) | Cropped characters are worse than no label | Render inside only when it fits with padding; otherwise outside the end or in the tooltip (value stays in the table view) |
| A chart container whose fixed height excludes the x-axis band | The plot fits, the labels do not; the card grows a tiny nested scroll | Size the container to plot + axis band, or let it grow with content |
| A display or serif face on the hero figure | Reads as off-brand decoration | The same sans as everything else |
| `tabular-nums` on a large standalone number | Equal-width digits make `121` look loose at display size | Proportional figures on hero/stat values; tabular only where columns align |
| Texture on by default, or as decoration | Dense angled fields are a vestibular risk and read as noise | Opt-in only (a11y setting, print, forced-colors), 45/135 degrees, ordered on value scales |

## Interaction and Accessibility

| Wrong | Why | Right |
|---|---|---|
| A tooltip as the only way to read a value | Gates data on hovering; excludes keyboard and touch | Tooltips enhance, never gate; direct labels or the table view carry every value; focus mirrors hover |
| Pinpoint hover targets (an 8px dot you must hit dead-center) | Nobody lands it reliably | Hit area includes the 2px gap and meets ~24px minimum; dense scatter gets a nearest-point/Voronoi layer |
| Per-chart filters, or filters inside a chart card | Numbers stop agreeing across the dashboard | One filter row above everything it scopes; all charts re-render against the same slice |
| Skeleton flash on refetch | Layout jump and flash for a known-shape update | Hold the previous render at reduced opacity |
| No table view / color-only encoding on a continuous scale | Fails WCAG use-of-color; excludes screen readers | Every chart has a table-view twin |
| Series names inserted via `innerHTML` concatenation | CSV headers and API strings are untrusted; XSS through a tooltip | `textContent` / `createTextNode` for all data-derived DOM text |

## Cross-References

| Need | File |
|---|---|
| Form selection | `references/dataviz/01-choosing-a-form.md` |
| Color jobs and validation | `references/dataviz/02-color-jobs-and-validation.md` |
| Marks, tooltips, figures | `references/dataviz/03-marks-interaction-figures.md` |
| Review rubric this feeds | `references/review/01-universal-rubric.md` |
