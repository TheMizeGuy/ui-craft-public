---
topic: design
role: reference
scope: color
audience: ui-designer
---

# OKLCH Color System

Perceptually uniform color, Display P3 gamut, semantic 3-tier tokens, APCA contrast, light-dark() and relative color syntax. Authoritative reference for any color decision in a 2026 codebase.

Primary sources cited inline: MDN, web.dev, W3C, and the APCA reference implementations.

## 1. Why OKLCH wins in 2026

| Reason | Detail |
|---|---|
| Perceptual uniformity | Equal `L` values across hues look equally bright. HSL `50%` lightness on yellow looks brighter than on blue; OKLCH `0.7` looks identical |
| Predictable shade scales | Adjust `L` uniformly across one hue to get a 50/100/.../900 ramp without per-hue eyeballing |
| Predictable dark mode | Flipping `L` (e.g. `0.95 -> 0.15`) gives consistent inversion across the palette; HSL inversion drifts hue and chroma |
| Display P3 gamut | OKLCH addresses the wider P3 colorspace; sRGB cannot |
| Tooling defaults | Tailwind v4 ships OKLCH defaults, Radix 3 ships OKLCH, Figma exports OKLCH natively |
| Browser support | >92% global as of Q2 2025 (Tailwind v4 / Radix 3 / Chrome 111+ / Safari 16.4+ / Firefox 113+) |

### HSL saturation-shift example

`hsl(60, 100%, 50%)` (yellow) and `hsl(240, 100%, 50%)` (blue) both report 50% lightness, yet yellow is visually about 4x brighter than the blue. In OKLCH `oklch(0.85 0.18 95)` and `oklch(0.45 0.20 260)` reflect their actual perceived brightness, so a designer can tell the same story with just the L axis. ([MDN oklch()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch)).

## 2. OKLCH syntax and ranges

`oklch(L C H [/ alpha])` — three required components, optional alpha.

| Component | Range | Notes |
|---|---|---|
| `L` (Lightness) | `0` (black) .. `1` (white), or `0%` .. `100%` | `0.5` is mid-gray. Use percentages for legibility in `--vars` |
| `C` (Chroma) | `0` (gray) .. `~0.4` typical max | Saturation. `>0.37` may exceed P3, browser clamps |
| `H` (Hue) | `0` .. `360` (deg) | 30=orange, 100=yellow-green, 145=green, 200=cyan, 260=blue, 320=magenta |
| `alpha` | `0` .. `1`, or `0%` .. `100%` | Same as RGB alpha |

The ramp below is a syntax demonstration on a face-value blue, not a palette recommendation. Hue 250 sits inside the 250-285 indigo/purple band that `references/aesthetic/03-taste-checklist.md` item 1.3 scores HIGH when it turns up as a *brand accent*, because that band is where every unconsidered default lands. Naming a blue `--blue-500` at hue 250 is honest; pointing `--brand` at it is the failure.

```css
/* Same hue at multiple lightnesses (deterministic ramp) */
--blue-50:  oklch(0.97 0.02 250);
--blue-100: oklch(0.93 0.04 250);
--blue-200: oklch(0.86 0.08 250);
--blue-300: oklch(0.78 0.12 250);
--blue-400: oklch(0.68 0.16 250);
--blue-500: oklch(0.58 0.20 250);   /* base */
--blue-600: oklch(0.48 0.20 250);
--blue-700: oklch(0.38 0.18 250);
--blue-800: oklch(0.28 0.14 250);
--blue-900: oklch(0.20 0.10 250);

/* Neutral grays — chroma 0 */
--gray-50:  oklch(0.98 0 0);
--gray-500: oklch(0.55 0 0);
--gray-900: oklch(0.18 0 0);

/* Vibrant accents — chroma at the high end */
--accent-violet: oklch(0.65 0.30 295);
--accent-coral:  oklch(0.70 0.22 25);
--accent-mint:   oklch(0.85 0.18 165);
```

## 3. The 3-tier token system

Three layers: primitive, semantic, component. Components only ever read semantic tokens; semantic tokens only ever resolve to primitives. This is the same three-tier shape the W3C Design Tokens format encodes, where a semantic token's `$value` is an alias (`{color.blue.500}`) rather than a literal ([W3C Design Tokens 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)). The full token-architecture treatment, including multi-brand and the responsive axis, is `references/architecture/03-styling-architecture.md`.

| Tier | Example | Purpose |
|---|---|---|
| Primitive | `--brand-500: oklch(0.58 0.20 95)` | Raw palette. Never appears in component CSS |
| Semantic | `--accent-default: var(--brand-500)` | Intent-based alias. Swap for theme/brand without touching components |
| Component | `--button-bg: var(--accent-default)` | Per-component binding. Granular override surface |

```css
:root {
  /* Tier 1: primitive ramp (hue 95 is the section-4 worked example, not a recommendation) */
  --brand-500: oklch(0.58 0.20 95);
  --brand-600: oklch(0.48 0.20 95);
  --gray-50:   oklch(0.98 0 0);
  --gray-900:  oklch(0.18 0 0);
  --red-500:   oklch(0.62 0.24 25);

  /* Tier 2: semantic */
  --accent-default: var(--brand-500);
  --accent-hover:   var(--brand-600);
  --surface:        var(--gray-50);
  --text:           var(--gray-900);
  --feedback-error: var(--red-500);

  /* Tier 3: component */
  --button-bg:      var(--accent-default);
  --button-bg-hover: var(--accent-hover);
  --button-fg:      var(--surface);
  --card-bg:        var(--surface);
  --card-text:      var(--text);
}

.button {
  background: var(--button-bg);
  color: var(--button-fg);
}
.button:hover { background: var(--button-bg-hover); }
```

A theme switch only re-binds tier 2. Components never know.

### Semantic hues carry meaning — use color for purpose, not decoration

Semantic colors are signifiers: **blue = trust/information, red = danger/urgency/error, yellow = warning, green = success/new**. Users read these before they read the copy — an update toast in blue, a failed install in red with a Retry action, a compatibility warning in yellow, a success confirmation in green. Two rules follow:

- Never repurpose a semantic hue decoratively where feedback lives (a red promotional chip beside a form invites misreads).
- Let color find its function before its aesthetics: the announcement bar that must grab attention, the focus ring on an input, the green "New" chip on a nav item. If a saturated element has no meaning to signify, it is decoration — question it.

Pair every semantic color with a shape or icon (see anti-patterns) so color-blind users get the same signal.

## 4. Generating a perceptual ramp from one origin hue

Start with **one primary color** — usually the brand color. Lighten it (raise `L`, taper `C`) for section backgrounds; darken it (lower `L`) for heading/text colors. That lighten/darken pair already carries subtle color through an otherwise gray design and is literally half of a full ramp — chips, states, charts, and every other tinted surface derive from the same 50–950 scale. A page whose background, heading, and accent all share one hue at different lightnesses reads as designed; a gray page with one saturated button reads as unfinished.

CSS relative color syntax (Chrome 119+, Safari 16.4+, Firefox 128+) lets the ramp derive itself at runtime from one source token. Killer for white-label themes.

Pick the origin hue from the POV brief, not from this file. Two bands are effectively pre-spent: **250-285** (indigo through purple) is the shadcn/Tailwind default accent and the single most common AI-generated brand colour, and **~180** (teal) is the second. Landing in either without a reason is a HIGH finding under `references/aesthetic/03-taste-checklist.md` item 1.3. The worked example below uses hue 95 for that reason, and nothing about the method depends on the number: change `--brand-hue` and the entire ramp re-derives.

```css
:root {
  --brand-hue: 95;                              /* derive from the brief */
  --brand: oklch(0.58 0.20 var(--brand-hue));   /* single source of truth */

  --brand-50:  oklch(from var(--brand) 0.97 calc(c * 0.10) h);
  --brand-100: oklch(from var(--brand) 0.93 calc(c * 0.20) h);
  --brand-200: oklch(from var(--brand) 0.86 calc(c * 0.40) h);
  --brand-300: oklch(from var(--brand) 0.78 calc(c * 0.60) h);
  --brand-400: oklch(from var(--brand) 0.68 calc(c * 0.80) h);
  --brand-500: var(--brand);
  --brand-600: oklch(from var(--brand) calc(l - 0.10) c h);
  --brand-700: oklch(from var(--brand) calc(l - 0.20) calc(c * 0.90) h);
  --brand-800: oklch(from var(--brand) calc(l - 0.30) calc(c * 0.70) h);
  --brand-900: oklch(from var(--brand) calc(l - 0.40) calc(c * 0.50) h);
}
```

Change `--brand` once, the whole ramp regenerates. Chroma tapers at the extremes because high chroma at very high or very low L is unstable in P3. ([MDN relative color syntax](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_colors/Relative_colors)).

## 5. Light/dark with `light-dark()`

`light-dark()` resolves at the `color-scheme` boundary — no JS, no class toggle, no FOUC. Pair with `color-scheme: light dark` so form controls and scrollbars also flip.

```css
:root {
  color-scheme: light dark;
  --brand-hue: 95;   /* derive from the brief, as in section 4 */

  --text:        light-dark(oklch(0.20 0 0), oklch(0.92 0 0));
  --surface:     light-dark(oklch(0.98 0 0), oklch(0.16 0 0));
  --surface-2:   light-dark(oklch(0.95 0 0), oklch(0.21 0 0));
  --border:      light-dark(oklch(0.85 0 0), oklch(0.30 0 0));
  --accent:      light-dark(oklch(0.50 0.20 var(--brand-hue)), oklch(0.72 0.18 var(--brand-hue)));
}

/* light-dark() resolves colors ONLY. A shadow, an opacity, a length, or a bare
   channel triple (`0 0 0`) inside light-dark() is invalid at computed-value time:
   the declaration is dropped and the property silently keeps its inherited value.
   Scope those under the media query instead. */
:root { --shadow-card: 0 8px 24px -12px oklch(0 0 0 / 0.14); }
@media (prefers-color-scheme: dark) {
  :root { --shadow-card: 0 8px 24px -12px oklch(0 0 0 / 0.55); }
}

.card {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

/* Manual overrides */
.theme-light { color-scheme: light; }
.theme-dark  { color-scheme: dark; }
```

| Limitation | Workaround |
|---|---|
| `light-dark()` only resolves color values | For images/shadows/opacity use `@media (prefers-color-scheme: dark) { ... }` or a `[data-theme="dark"]` wrapper |
| Older Safari (<16.4) lacks support | Provide a sRGB fallback declaration before the `light-dark()` line |
| Dark mode is not inversion | Invert L, dampen C ~10-20%. Use lighter accents on dark for legibility, never `filter: invert()` |

### Dark-mode surface craft

Four adjustments that separate an authored dark theme from a mirrored one:

| Adjustment | Why |
|---|---|
| Dim the borders | A light-mode border weight glares on dark; drop border contrast (e.g. `oklch(0.30 0 0)` not `oklch(0.85 0 0)`) so the hairline separates without shouting |
| Elevation = lightness delta, not shadow | Shadows barely register on dark backgrounds. A raised surface is a *lighter* surface: background `L 0.16`, card `L 0.21`, popover `L 0.26`. Each layer up gains lightness |
| Desaturate bright chips, flip their text | A light-mode-bright accent chip glares on dark. Dim its saturation and brightness, and flip the text relationship (dark-text-on-bright-chip becomes bright-text-on-dim-chip) to preserve hierarchy |
| Dark surfaces are not only navy/gray | Deep purples, reds, and greens all work as dark-mode surface hues — pick the dark ramp from the brand hue instead of defaulting to slate |

([web.dev light-dark()](https://web.dev/articles/light-dark)).

## 6. APCA contrast ladder, with the WCAG 2.x floor

WCAG 2 ratios are a poor design tool on dark mode (they over-rate dark-on-darker as legible) and ignore weight/size. APCA (the WCAG 3.0 candidate) is polarity-aware and font-size-aware. APCA is the design ladder; WCAG 2.x is still the compliance claim. Score is `Lc` ranging roughly `-108..+106`; magnitude matters, sign indicates polarity.

| Lc | Use case |
|---|---|
| 90+ | Body text, small + regular weight |
| 75+ | Fluent body text, larger or bold |
| 60+ | Headlines, large UI text |
| 45+ | Large non-text, icons, focus rings |
| 30+ | Decorative non-essential |
| <15 | Invisible. Never for functional content |

WCAG 2.x remains the compliance floor and is checked in the same pass: every text pair at least `4.5:1`, or `3:1` for large text (24px regular / 18.66px bold and above) and for non-text UI (icons, borders, focus rings, 1.4.11). A pair that passes APCA and fails WCAG 2.x fails. Math, thresholds and the finding format: `references/accessibility/01-wcag-2-2.md` section 5; when to use which: section 6.

Calculate via the `apca-w3` npm package or `apcach` (OKLCH-aware):

```ts
import { calcAPCA } from "apca-w3";
// arguments: text colour first, background second; the sign is polarity (positive = dark text on light)
const lc = calcAPCA("#1A1A1A", "#FCFCFC");   // ~98 -> clears 90+ for small body text
// long form: APCAcontrast(sRGBtoY(text), sRGBtoY(bg))
```

```ts
import { apcach, apcachToCss, crToBg } from "apcach";
// "I want a color with Lc 75 against the page surface, hue 95, max chroma"
const accessibleAccent = apcach(crToBg("#FFFFFF", 75), 0.18, 95);
const css = apcachToCss(accessibleAccent, "oklch");
```

[apca-w3 on GitHub](https://github.com/Myndex/apca-w3) | [apcach on GitHub](https://github.com/antiflasher/apcach).

## 7. Display P3 fallbacks

P3 ships on every modern Apple display (iPhone 7+, iPad Pro 2017+, every M-series Mac), most flagship Android, and recent 4K monitors. Older sRGB-only screens (~8% of traffic) need a fallback.

```css
.accent {
  /* sRGB fallback declared first: the gamut-mapped value of the OKLCH line below */
  color: rgb(134 112 0);
  /* OKLCH layer — wins on supporting browsers, browser clamps to gamut */
  color: oklch(0.55 0.20 95);
}

/* P3-only vibrant accent — use only if the design degrades gracefully without it */
@media (color-gamut: p3) {
  .vibrant { color: oklch(0.65 0.35 150); }
}

/* Feature query — gate experimental rules behind oklch() support */
@supports (color: oklch(0.7 0.15 30)) {
  :root { --accent: oklch(0.58 0.20 95); }
}
```

| Gamut media query | Matches |
|---|---|
| `(color-gamut: srgb)` | Standard sRGB displays |
| `(color-gamut: p3)` | Display P3 (~Apple devices, most modern phones) |
| `(color-gamut: rec2020)` | Rec.2020 (HDR / pro displays) |

## 8. Anti-patterns

| Anti-pattern | Why it fails | Replace with |
|---|---|---|
| `color: #000` / `#FFF` for text/surfaces | Pure black/white crush detail and burn retinas in dark mode | `oklch(0.18 0 0)` for "black", `oklch(0.98 0 0)` for "white" |
| One gray ramp for every surface | Shadow/elevation reads incorrectly on different bg colors | Tint each neutral toward its accent — e.g. cool gray for blue UI, warm gray for amber UI |
| Saturated red/green for system feedback | Often fails APCA at small sizes; red-green colorblind users miss the polarity | Pair color with shape (icon) and pre-test with apca-w3 / `prefers-contrast` |
| Hex literals in components | Breaks theming, multi-brand, dark mode, tokens spec compliance | Tokens at every layer. No `#` outside `:root` or `@theme` |
| HSL for ramp generation | Perceptual non-uniformity; lightness lies | Author in OKLCH, derive with relative color syntax |
| `filter: invert()` for dark mode | Inverts photos, maps, video, illustrations — visually wrong | Author dual values via `light-dark()` per token |
| `transparent` in `color-mix()` or a JS-interpolated gradient | `transparent` = `rgba(0,0,0,0)`; interpolation that does not premultiply alpha passes through dark gray (CSS gradients and transitions premultiply and do not) | Use `oklch(L C H / 0)` or `color-mix(in oklch, var(--surface), transparent)` |

([web.dev high-definition CSS color guide](https://web.dev/articles/high-definition-css-color-guide)).
