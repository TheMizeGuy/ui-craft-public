---
topic: dataviz
role: reference
scope: chart-marks-interaction
audience: ui-designer
---

# Marks, Interaction, and Figures: The Quiet Chart

The considered look is a few fixed specs plus two pieces of negative space. The data is the only thing allowed to be loud.

## 1. Mark Specs (Fixed Across Every Chart)

| Mark | Spec |
|---|---|
| Bar / column | <= 24px thick (never fill the slot; the band's leftover is air); 4px rounded data-end, square at the baseline; grows from a single baseline |
| Line | 2px, round join/cap |
| Marker / end-dot | >= 8px (r >= 4), filled with the series color |
| Area fill | the series hue at ~10% opacity (a wash, never a saturated block) |
| Gridlines / axes | one-step-off-surface gray, hairline (1px), solid (never dashed), recessive |

## 2. The Two Spacers (White Doing the Separating)

- **Surface gap.** A 2px gap in the surface color separates touching marks: every segment of a stacked bar, and every adjacent bar, the same width. Neighbors one step apart read distinct because of the gap, not a stroke drawn around them.
- **Surface ring.** Dots and end-markers carry a 2px ring in the surface color so they stay legible where they cross a line or overlap. The ring is part of the mark's hover/hit target, not just spacing.

Never draw a border around a mark to separate it. The gap and the ring are the mechanism; a stroke adds data-weight ink that is not data.

## 3. Labels and Legend

A **legend is always present for two or more series**; it is the dependable identity channel, never replaced by color-matching alone. Direct labels ride the marks to supplement it. A single series needs no legend box: the title already says what is plotted.

- **Label selectively, never a number on every point.** Label the endpoint, the extreme, or the one series the story is about; the axis, legend, and tooltip/table carry the rest. Direct labels work because they are sparing.
- **A label that will not fit does not get clipped; measure first.** Inside a bar or segment only when the rendered text fits with comfortable padding. Otherwise: outside the bar end, or to the tooltip (interior stacked segments skip the inline label; legend + tooltip carry it). The value stays in the table view either way. Never `overflow: hidden` on the segment; cropping characters is worse than no label.
- Bars: value at the tip. Columns: on the cap. Lines: at the end. Y-ticks round to clean thousands-comma'd numbers.
- **Text never wears the data color.** Marks carry the series color; labels, values, legends, and axis text use text tokens (primary/secondary/muted). Identity comes from a colored key beside the text (dot, short line, swatch). The one exception: a label set inside a colored fill picks white or ink by the fill's luminance.
- **When end-labels collide, do not stack them.** Converging lines get leader lines, small multiples, or legend + tooltip. Past ~4 converging series, small multiples is usually right.

## 4. Figures: When the Form Is a Number

- **Stat tile** contract: `label` (sentence case, no trailing colon) / `value` (sans semibold, auto-compact: 1,284 / 12.9K / $4.2M) / `delta` (optional; signed, vs a named period; color = direction x whether up is good) / `trend` (optional; 12-point sparkline in the de-emphasis hue, current period in the accent).
- **Meter:** the fill carries severity (accent to warning to danger); the unfilled track is a lighter step of the same ramp so state reads across the whole bar.
- **Hero figure:** the single number a dashboard leads with, >= 48px, in the same sans as everything else (a display or serif face reads as off-brand decoration). This is a deliberate exception to the ~24px dashboard cap in `references/design/02-typography.md`, which governs headings and labels, not data displays (stat-tile values are exempt on the same grounds). Exactly one per view.
- **Proportional figures for big standalone numbers; tabular only in columns.** `font-variant-numeric: tabular-nums` gives every digit a `0`'s width, so `121` looks loose at display sizes. Reserve it for columns that must align vertically (table rows, axis ticks).

## 5. Texture: The Backup Channel (Opt-In)

Where hue fails (full-severity CVD, grayscale print, `forced-colors`), texture carries identity. One directional hand-drawn fill, at 45 degrees and its 135-degree mirror only (horizontal/vertical read as gridlines/bars). Inked tone-on-tone from the fill's own ramp, equal loudness across slots. On value scales the texture is ordered (rotation steps with magnitude) so it never misstates the value. Triggered by an accessibility setting, print, or `forced-colors`; never on by default.

## 6. Tooltips and Hover (Default, Not an Upgrade)

An HTML chart is interactive by default; the hover layer is part of the deliverable. The only form that skips it is a bare stat tile with no plot. Tooltips **enhance, never gate**: every value a tooltip shows is also reachable through direct labels or the table view, and keyboard focus shows the same details as hover.

- **The crosshair finds the X.** On line/area, a vertical hairline tracks the pointer and snaps to the nearest data position. Readers aim at a date, never at a 2px line.
- **On bars and cells, the mark is the hit target.** Each bar, segment, dot, or heat-cell carries its own `pointermove`/`focus` tooltip, and the hovered mark lifts (slight lighten or outline).
- **One tooltip, every series.** The readout lists every series at that X.
- **Values lead, labels follow.** In the tooltip the value is the strong element and the series name secondary: the legend's hierarchy inverted, because here the reader has the series and wants the number.
- **Line keys, not boxes,** for tooltip rows; legends still mirror the mark (rect for bars/areas, line for lines).
- **The hit target is bigger than the mark.** Include the 2px gap and then some; an 8px scatter dot gets a transparent hit area of at least 24px, or a nearest-point/Voronoi layer for dense scatter.
- **Labels are untrusted data.** Series and category names come from CSVs and APIs; insert them into tooltip/legend/table DOM with `textContent`, never `innerHTML` concatenation.
- A value pushed off its mark lives in the tooltip, and stays in the table view so nothing is gated on hovering.

## 7. Filters and Time Ranges

Standard UI, not chart marks; build them with ordinary form controls styled to match the chart chrome. Composition rules:

- **One row, above the charts,** left-aligned, scoping everything below it. Never inside a chart card, never per-chart; if one chart needs its own range, it is a different dashboard.
- **Date range first** (the filter every reader reaches for), presets before a custom range: today, last 7/30/90 days. A good date picker lists presets as rows, marks selection with a bold check, keeps hover a ghost wash, and tucks the custom range behind a hairline in the footer.
- **Refetch keeps the frame.** While data reloads, charts hold their previous render at reduced opacity: no skeleton, no layout jump, no flash.

## 8. Accessibility Pass (Every Chart)

For >= 2 series a legend is always present and <= 4 series are also direct-labeled, so identity is never color-alone. A table view exists as the WCAG-clean twin of every chart. Dark mode is selected, not flipped (file 02). Texture is available for the CVD/print/forced-colors case. The chart container (a `<figure>` or card) owns responsive sizing, title/caption, and the table-view toggle, and any fixed height includes the x-axis label band so the card never grows a nested vertical scroll.

## 9. Cross-References

| Need | File |
|---|---|
| Form selection | `references/dataviz/01-choosing-a-form.md` |
| Color jobs and the validator | `references/dataviz/02-color-jobs-and-validation.md` |
| Failure catalog | `references/dataviz/04-anti-patterns.md` |
| Keyboard/focus depth | `references/accessibility/02-keyboard-focus.md` |
| Depth, shadows, overlay craft | `references/design/07-depth-and-overlays.md` |
