---
topic: dataviz
role: reference
scope: chart-color-validation
audience: ui-designer
---

# Chart Color: Four Jobs, Six Checks, One Validator

Chart color is not hand-picked. Every color in a chart does exactly one job, and a palette is legal only if it passes six checks. The checks are the product: they are what makes a palette safe to change and what lets the same method run on any design system's ramps. The single most important habit: **the color part is computable, so compute it.** Never eyeball whether a palette is colorblind-safe; run `scripts/validate_palette.js` (at this plugin's root, sibling of `references/`).

## 1. The Jobs

| Job | Encodes | Structure |
|---|---|---|
| **Categorical** | identity (which series) | 8 hues, fixed order, assigned in sequence, never cycled |
| **Ordinal** | position in a sequence (funnel stage, tier, bucket) | one hue, monotone lightness steps; light end still >= 2:1 on surface |
| **Sequential** | magnitude (how much) | one hue, light to dark; flips anchor in dark mode |
| **Diverging** | polarity (which side of a baseline) | two warm/cool hues + a neutral gray midpoint; equal steps per arm |
| **Status** | state (good to critical) | a small fixed scale, reserved meaning, always icon + label |

**Categorical or ordinal?** If swapping the category order would change the meaning (funnel stages, size tiers, age bands), it is ordinal and takes a one-hue ramp so the reader sees the order in the color. If swapping would not (products, teams, regions), it is nominal categorical: every bar of a single series takes the same slot-1 hue (one series needs no legend box; the title names it), or slots 1..N for N series. Never color nominal bars by their value; that spends the identity channel re-encoding what bar length already shows.

## 2. The Six Checks

1. **Fixed hue anchors.** Eight families in a fixed order. The order is the CVD-safety mechanism; it never changes. (Structural: enforced, not measured.)
2. **Lightness band per mode.** OKLCH L ~ 0.43-0.77 light; ~ 0.48-0.67 dark. (Validator.)
3. **Chroma floor.** OKLCH C >= ~0.10; below it a hue reads as gray and stops doing identity work. (Validator.)
4. **CVD separation.** Delta-E throughout is Euclidean distance in OKLab x100, under protanopia and deuteranopia simulated with Machado-Oliveira-Fernandes 2009 at severity 1.0 (the simulation model is part of the standard). Target >= 8; floor >= 6, legal only with secondary encoding. A companion **normal-vision floor** gates the same pairs unsimulated: worst pair >= 15, a hard gate that secondary encoding does not excuse. Adjacent pairs for stacks/bars/lines; **all pairs for scatter, bubble, choropleth, and small multiples** (`--pairs all`), where any two marks can sit side by side. All-pairs is strictly harder and caps how many series those forms carry: the reference palette validates all-pairs with its first four slots only. More series in an all-pairs form means folding to "Other," faceting, or direct labels, never a palette change. (Validator.)
5. **Contrast vs surface.** >= 3:1 for marks; conditionally relaxed where values are readable another way (visible direct labels or the table view). A contrast WARN is not dismissable: it obligates the relief channel. (Validator.)
6. **Documented palette only.** Every slot is a hex from the palette instance below or your system's equivalent; no eyeballed values. (Structural.)

## 3. Run the Validator

```bash
node scripts/validate_palette.js \
  "#2a78d6,#008300,#e87ba4,#eda100,#1baf7a,#eb6834,#4a3aa7,#e34948" --mode light
node scripts/validate_palette.js "..." --mode dark --surface "#1a1a19"
node scripts/validate_palette.js "#86b6ef,#5598e7,#256abf,#104281" --ordinal
```

It can also be loaded as a `<script type="module">` in the chart's own page, where it reads `data-palette` (plus `data-mode`, `data-surface`, `data-pairs`, `data-ordinal`) off `<body>` and logs a `console.table` report.

Reading the result: exit 0 means no hard FAIL. WARN bands still exit 0 and carry obligations: CVD in the 6-8 floor band requires secondary encoding (direct labels, gaps, or texture); sub-3:1 contrast requires visible labels or the table view. A normal-vision-floor FAIL on the adjacent pairlist means re-stepping one of the pair; under `--pairs all` it means the series cap is binding, so cut series, facet, or change form. Scope: the six checks judge categorical palettes only. For a lone status or text color run a WCAG text-contrast check (the script exports `contrast(a, b)`); for a sequential ramp the check is lightness monotonicity, and running the categorical validator on a good ramp FAILs by design. Use `--ordinal` for discrete ordered ramps: it checks monotone L, adjacent delta-L >= 0.06, light-end contrast >= 2:1, and single hue instead.

## 4. Snap-to-Passing (Any Design System)

The method is system-agnostic; a design system supplies parameters (ramps, a categorical order, a diverging pair, a status palette, surfaces) and the method consumes them unchanged. Given a brand's ramps and a desired order:

1. For each slot, pick the ramp step whose OKLCH L sits in the mode's band with C >= floor.
2. Run the validator. For any adjacent pair below the delta-E 8 target, nudge one slot a step (hold its hue, move its lightness) and re-run.
3. Repeat until the worst pair clears. Function preserved, the brand's hues kept.

**Themes.** The slot order is a separable, named choice on the same hues and checks: swapping themes tunes mood without touching the method. A surface adopts one theme and freezes it; never mix themes within a dashboard. Deriving an order for a system with none: enumerate candidate orderings, run the validator on each, and keep the one that maximizes the minimum adjacent CVD delta-E. Never guess.

## 5. Reference Palette Instance

A validated default, usable as-is or as the template to fill with brand values. Define only the roles a chart uses as CSS custom properties in a local style block, declared for both the OS media query and the `data-theme` toggle scope (see `references/design/01-color-oklch.md` for the dual-scope pattern).

**Categorical (fixed order; the dark column is the same eight hues re-stepped, not a new palette):**

| Slot | Hue | Light | Dark |
|---|---|---|---|
| 1 | blue | `#2a78d6` | `#3987e5` |
| 2 | green | `#008300` | `#008300` |
| 3 | magenta | `#e87ba4` | `#d55181` |
| 4 | yellow | `#eda100` | `#c98500` |
| 5 | aqua | `#1baf7a` | `#199e70` |
| 6 | orange | `#eb6834` | `#d95926` |
| 7 | violet | `#4a3aa7` | `#9085e9` |
| 8 | red | `#e34948` | `#e66767` |

Adjacent pairlist: worst CVD delta-E 9.1 light / 8.4 dark, worst normal-vision 19.6 / 19.3, all gates cleared. Three light-mode slots (magenta, yellow, aqua) sit below 3:1 on the light surface: the relief rule applies. Under `--pairs all` only the first four slots validate (dark lands in the 6-8 floor band; ship secondary encoding).

**Sequential:** blue, steps 100-700 light to dark (`#cde2fb` 100, `#9ec5f4` 200, `#6da7ec` 300, `#3987e5` 400, `#256abf` 500, `#184f95` 600, `#0d366b` 700). A second simultaneous sequential context takes the next categorical hue (green) as its own one-hue ramp. For an ordinal ramp, the palest step must still clear 2:1: start no lighter than step 250 (`#86b6ef`) on light; go no darker than step 600 on dark.

**Diverging:** blue vs red (warm/cool poles that read as opposite), neutral gray midpoint (light `#f0efec`, dark `#383835`), equal steps per arm. Two cool hues as poles fails; the midpoint must read as "nothing."

**Status (fixed, never themed):** good `#0ca30c`, warning `#fab219`, serious `#ec835a`, critical `#d03b3b`. Always icon + label, never color alone (warning and serious are sub-3:1 on light by design; the pairing is the mitigation). Steps are deliberately distinct from the categorical slots so a status color never impersonates a series. The collision rule: when a series MEANS good/bad (error rate, pass/fail) it wears status tokens; when it is just "series 4" it wears categorical; never both in one chart.

**Surfaces and chrome:** chart surface light `#fcfcfb` / dark `#1a1a19` (the validator's defaults; re-run against your own surfaces when you swap palettes). Ink: primary `#0b0b0b`/`#ffffff`, secondary `#52514e`/`#c3c2b7`, muted axis/labels `#898781` both modes, gridline hairline `#e1e0d9`/`#2c2c2a`, baseline `#c3c2b7`/`#383835`.

## 6. Non-Negotiables

- Assign categorical hues in fixed order, never cycled; color follows the entity, never its rank. A filter that changes the series count must not repaint the survivors.
- One axis. Never a dual-axis chart (two y-scales). Two measures of different scale: two charts, small multiples, or index both to a common base.
- Sequential = one hue light-to-dark; diverging = two hues + neutral gray midpoint. Never a rainbow; never a hue at the diverging midpoint.
- Text wears text tokens, never the series color. Marks carry identity; a colored key sits beside the text.
- Dark mode is selected, not flipped: its own steps from the same ramps, validated against the dark surface.

## 7. Cross-References

| Need | File |
|---|---|
| Form selection (before color) | `references/dataviz/01-choosing-a-form.md` |
| Marks, labels, tooltips, texture | `references/dataviz/03-marks-interaction-figures.md` |
| Failure catalog | `references/dataviz/04-anti-patterns.md` |
| OKLCH ramps and dual-scope theming | `references/design/01-color-oklch.md` |
