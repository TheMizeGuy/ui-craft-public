---
topic: design
role: reference
scope: typography
audience: ui-designer
---

# Typography

Variable fonts, banned defaults, modular type scales, fluid `clamp()`, optical sizing, web font loading, microtypography, numeral features. Reference for any text decision in a 2026 codebase.

Primary sources cited inline: MDN, web.dev, WCAG 2.2.

## 1. Variable fonts are the default

One file ships infinite weights along named axes. Smaller payload than 3+ static weights, smoother weight interpolation, runtime control via `font-variation-settings`. ~95% global support.

| Axis | Tag | Range | Use |
|---|---|---|---|
| Weight | `wght` | 1-1000 | Smooth weight transitions; hover/emphasis |
| Width | `wdth` | 75-125 typical | Condensed for tight headlines |
| Italic | `ital` | 0 or 1 | True italic, not slanted roman |
| Slant | `slnt` | -90..90 (deg) | Continuous oblique |
| Optical size | `opsz` | font-defined | Auto-adjust contrast/spacing for size |

```css
:root {
  /* Faces come from the project's POV brief. The mechanics below are what matters here. */
  --font-display: "<DISPLAY-FACE>", system-ui, sans-serif;
  --font-body:    "<BODY-FACE>", system-ui, sans-serif;
  --font-mono:    "<MONO-FACE>", ui-monospace, monospace;   /* code and log surfaces only */
}

h1 {
  font-family: var(--font-display);
  /* one file, exact weight + larger optical size */
  font-variation-settings: "wght" 720, "opsz" 56;
}

body {
  font-family: var(--font-body);
  font-variation-settings: "wght" 420, "opsz" 14;
}

a:hover {
  font-variation-settings: "wght" 540;
  transition: font-variation-settings 120ms ease-out;
}
```

Reference: [MDN font-variation-settings](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variation-settings).

## 2. Banned and approved typefaces

This section is the single statement of the type policy. Other files link here rather than restating it.

### The system stack, stated with its platform scope

The house default for UI and information-dense surfaces is the platform system stack. That is a real decision, but only if you know what you have decided, because "the system stack" is four different typefaces:

| Platform | What `-apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif` actually renders | Notes |
|---|---|---|
| macOS / iOS / iPadOS | SF Pro (SF Pro Text below 20px, SF Pro Display above, switched by optical size) | Apple-licensed for Apple platforms. Never self-host the files on the web |
| Windows 11 | Segoe UI Variable Text | Genuine variable font with its own optical-size axis |
| Windows 10 and earlier | Segoe UI (static) | No optical sizing; weights 300/400/600/700 only |
| Android / ChromeOS | Roboto | Roboto Flex on recent Android builds |
| Linux | Whatever `sans-serif` maps to, commonly DejaVu Sans or Cantarell | The least predictable leg. Add a named fallback if Linux traffic matters |

Two consequences worth stating plainly. First, roughly two thirds of web traffic is not Apple, so "SF Pro's optical sizing carries the voice" is only true for a minority of users; on the rest the voice is Segoe or Roboto. Second, the Roboto ban below is about *choosing* Roboto, not about reaching it as the Android leg of the system stack. Downloading a webfont to override a platform's own system face is usually a net loss on that platform.

If the off-Apple rendering matters to the brand, do not stretch the system stack to cover it. Ship a self-hostable variable face as `--font-sans` and let the system stack be the fallback: **DM Sans**, **Plus Jakarta Sans**, and **Public Sans** are all open-licensed, variable, and not on the banned list.

**Poppins** is the approved display face for modern-elegant areas (marketing moments, hero and display type). Use it at chosen weights, never as body text.

For long-form reading (articles, documentation, editorial body) the house serif is **Source Serif 4** (Adobe, SIL Open Font License 1.1). It is the serif counterpart to the self-hostable sans above: variable on both `wght` (200-900) and `opsz` (8-60), with a true variable italic rather than a synthesised oblique, and drawn for screen reading rather than luxury display. The two siblings are treated differently on purpose: **Source Sans** is banned as a primary face for ubiquity, and that ban does not extend to Source Serif, because the reason for it does not hold. The sans is everywhere; the serif is not.

### The checkable rule (replaces "deliberate vs default")

"Was the system stack deliberate?" is not auditable. This is:

> A project passes the type gate when it declares (a) a `--font-display` distinct from `--font-sans`, **and** (b) an explicit heading weight and tracking (`font-variation-settings` or `font-weight` + `letter-spacing`) rather than browser defaults.

A globals.css whose entire type system is `--font-sans: <system stack>` with default weights and default tracking has made no type decision, regardless of intent. That is the tell.

### Banned by default

| Family | Reason |
|---|---|
| Inter (body) | The most-used AI default. Acceptable only as Inter Display in a header *with* tightened tracking |
| Roboto **as a chosen face** | Android system font; reads as "framework demo" when downloaded onto other platforms. Reaching it via the system stack's Android leg is in scope |
| Arial | Generic, no point-of-view |
| Helvetica | Same: overused, no design intent |

### Acceptable defaults

| Family | Use | Why |
|---|---|---|
| System stack | Body, UI, information-dense surfaces; the house default | Native-feeling, zero payload, no self-hosting risk. Only counts as a decision under the checkable rule above |
| Poppins | Display, modern-elegant areas | House display face for elegant marketing and hero moments; geometric warmth, strong at 500-700 display weights |
| Geist / Geist Mono | Only when deliberately chosen and paired against a distinctive display face | Never the fallback default. Geist plus Vercel-blue plus a dotted grid is a catalogued AI tell (`references/aesthetic/02-distinctive-systems.md`); the face is fine, the unexamined Vercel-stack combination is not |
| Söhne | Body, display | Modern grotesque with character; broad family |
| Inter Display | Header only with custom tracking | Display cut tames the body Inter overuse |
| JetBrains Mono | Code | Strong figures, ligatures, distinct glyphs |
| Berkeley Mono | Code only | Premium mono with strong personality -- stays inside code/log surfaces, never UI chrome |
| Commit Mono | Code | Free, opinionated, contemporary |
| IBM Plex Sans | Technical apps | Engineered feel, multi-script |
| Instrument Serif | Display | Editorial serif with high contrast |
| Fraunces | Display | Variable axes for `opsz`, `SOFT`, `WONK` |
| Recoleta | Display | Distinctive humanist serif |
| Söhne Schmal | Display, distinctive UI | Condensed variant of Söhne -- weight + width carry the technical voice |
| Söhne Mono | Code only | Mono variant of Söhne, for code blocks and log panes |
| Migra | Display | Strong serif point-of-view |
| GT America / GT Walsheim / GT Sectra / GT Pressura | Custom direction | Grilli Type families with designerly voice |
| DM Sans | Body, UI | Low-contrast geometric humanist; a workhorse single-family choice that is not Inter |
| Plus Jakarta Sans | Body, display | Warm geometric with real personality at display weights; carries a whole product on its own |
| Source Serif 4 | Body, long-form | Open-licensed screen serif: genuine optical sizing, a true variable italic, contrast low enough to hold at 16px. The serif counterpart to DM Sans and Plus Jakarta Sans above -- not another display serif |

Pair *one* display + *one* body. Optionally one mono for genuine code/log content only -- a mono face is never the display or body voice, and never styles labels, kickers, stats, or numerals (tabular figures on the sans do digit alignment). Three families is the absolute ceiling — and one well-chosen sans-serif is often enough on its own (weights, optical sizes, and tracking do the differentiation; mood-keyed pairing seeds live in `references/aesthetic/04-style-taxonomy.md`).

## 3. Type scale

Pick a modular ratio. Multiply base size by the ratio to step up; divide to step down. Higher ratios shout, lower ratios converse.

| Ratio | Name | Best for |
|---|---|---|
| 1.125 | Major Second | Dense data UIs, editor surfaces |
| 1.2 | Minor Third | Small UI, dashboards, settings panels |
| 1.25 | Major Third | General-purpose product UI |
| 1.333 | Perfect Fourth | Marketing pages, balanced content |
| 1.414 | Augmented Fourth | Strong headline systems |
| 1.5 | Perfect Fifth | Editorial, long-form, hero surfaces |

```css
/* Minor third (1.2) starting at 16px */
--text-xs:  0.694rem;   /* 11.1px */
--text-sm:  0.833rem;   /* 13.3px */
--text-base: 1rem;      /* 16px */
--text-lg:  1.2rem;     /* 19.2px */
--text-xl:  1.44rem;    /* 23px */
--text-2xl: 1.728rem;   /* 27.6px */
--text-3xl: 2.074rem;   /* 33.2px */
--text-4xl: 2.488rem;   /* 39.8px */
--text-5xl: 2.986rem;   /* 47.8px */
```

Tooling: [Type Scale](https://typescale.com), [Utopia](https://utopia.fyi).

### Size-count caps by surface

The ratio gives you the steps; the surface caps how many you use. Landing pages and marketing sites: at most ~6 sizes, wide range (a 64/42/32/20/16/14 ladder is typical). Dashboards and dense product UI: the range shrinks hard — nothing above ~24px (24/20/18/16/14/12), because information density rises and oversized headings steal space from data. A dashboard H1 at landing-page scale is a defect, not a style choice.

### Display tightening

Large text ships loose by default. On display sizes (roughly 32px+), tighten letter-spacing to **-2% to -3%** (`tracking [-0.02em..-0.03em]`) and drop line-height to **110-120%**. This single adjustment moves header text from "template" to "set with intent" — it is the highest-leverage microtypography move on hero and section headings. Body text stays at the foundry's tracking (see anti-patterns below); the tightening applies only as size grows.

```css
.hero-title {
  font-size: clamp(2.5rem, 1.5rem + 4vw, 4rem);
  letter-spacing: -0.025em;   /* -2.5% */
  line-height: 1.15;          /* 110-120% for display, never body's 1.5 */
}
```

## 4. Fluid typography with `clamp()`

`clamp(min, preferred, max)` interpolates linearly between viewport breakpoints with no media queries and no resize listener.

Formula, for a step that runs `minPx` at `minVW` to `maxPx` at `maxVW`:

```text
slopeVw      = (maxPx - minPx) / (maxVW - minVW) * 100
interceptRem = (minPx - (slopeVw / 100) * minVW) / 16
step         = clamp(minPx/16 rem, interceptRem rem + slopeVw vw, maxPx/16 rem)
```

The ladder below uses **360px and 1440px** as its viewport anchors for every step, a 1.2 ratio off a 16px base at 360px, and a 1.25 ratio off a 20px base at 1440px. The ratio widening with the viewport is the point: a 1.2 scale reads well on a phone and looks timid at desktop width.

```css
/* Anchors: 360px -> 1440px viewport. Every step below shares them. */
--step-0: clamp(1rem,     0.9167rem + 0.3704vw, 1.25rem);    /* body  16 -> 20px */
--step-1: clamp(1.2rem,   1.0792rem + 0.5370vw, 1.5625rem);  /* h4  19.2 -> 25px */
--step-2: clamp(1.44rem,  1.2690rem + 0.7602vw, 1.9531rem);  /* h3  23.0 -> 31.25px */
--step-3: clamp(1.728rem, 1.4904rem + 1.0565vw, 2.4414rem);  /* h2  27.6 -> 39.1px */
--step-4: clamp(2.074rem, 1.7477rem + 1.4491vw, 3.0518rem);  /* h1  33.2 -> 48.8px */
--step-5: clamp(2.488rem, 2.0458rem + 1.9657vw, 3.8150rem);  /* hero 39.8 -> 61.0px */

h1 { font-size: var(--step-4); }
```

Worked derivation for `--step-5`, so the numbers above are auditable rather than copied: `slopeVw = (61.04 - 39.81) / (1440 - 360) * 100 = 1.9657`; `interceptRem = (39.81 - 0.019657 * 360) / 16 = 32.733 / 16 = 2.0458`. Check both ends: at 360px the preferred term is `32.73 + 7.08 = 39.81px`; at 1440px it is `32.73 + 28.31 = 61.04px`. Both land exactly on the anchors, which is the test.

Three rules that keep a fluid ladder honest:

- **Every step shares the same min and max viewport anchors.** If they differ, the steps unfreeze at different widths and the modular ratio distorts across the middle of the range: the h1 pins at its maximum while body text is still growing, which compresses the hierarchy in exactly the tablet and small-laptop band the ladder exists to smooth.
- **Check where each step reaches its max.** Solve `interceptRem * 16 + slopeVw / 100 * W = maxPx` for `W` and confirm it lands on the intended max anchor. A slope steeper than the formula gives freezes the step early: a body step that maxes at 960px renders identically at 1280px, 1920px, and 2560px.
- **Keep the `rem` term.** A pure-`vw` preferred value (`clamp(2rem, 4vw, 4rem)`) ignores the user's browser font size, which fails text resize under [WCAG 2.2 SC 1.4.4](https://www.w3.org/TR/WCAG22/#resize-text). Also ensure the max is not capped so low that 200% zoom cannot scale the text proportionally.

Reference: [web.dev min-max-clamp](https://web.dev/articles/min-max-clamp).

## 5. Optical sizing axis

`opsz` adjusts contrast, x-height, and spacing for the rendered size. Display cuts have higher contrast (thin thins, sharp serifs); text cuts have lower contrast and slightly looser spacing for legibility at body size.

| Use | `opsz` value (typical) |
|---|---|
| Hero `<h1>` 56px+ | `opsz` 48-72 (display cut) |
| Section heading 32-44px | `opsz` 28-36 |
| Card title 18-24px | `opsz` 18-24 |
| Body 14-18px | `opsz` 14 (text cut) |
| Caption 11-13px | `opsz` 11 |

```css
/* Auto mode lets the browser pick opsz based on font-size */
:root { font-optical-sizing: auto; }

/* Manual override on a hero */
.hero-title {
  font-size: 4rem;
  font-variation-settings: "wght" 700, "opsz" 72;
}
```

Fonts with strong `opsz`: Fraunces, Roboto Flex, Source Serif 4, Recursive, Inter Display.

Check the build, not the family name. Source Serif 4 is the cautionary case: the Google Fonts build ships one file per style carrying both axes (`SourceSerif4[opsz,wght].ttf`, `opsz` 8-60, `wght` 200-900), while Adobe's own GitHub release ships a weight-only variable font (`wght` 200-900, no `opsz`) alongside five *static* optical cuts named Caption, SmText, Text, Subhead, and Display. Self-host the second one and `font-optical-sizing: auto` does nothing, with no error and no fallback: the page renders and the axis is absent. Confirm the axes in the binary you are actually shipping (Wakamai Fondue, or `fonttools ttx -t fvar`) rather than trusting the family name. Optical sizing is a property of the file, not the typeface.

## 6. Web font loading

| Strategy | Use when | Tradeoff |
|---|---|---|
| `font-display: swap` | Default | Visible FOUT; LCP unaffected |
| `font-display: optional` | Best CWV | Some users never see the web font |
| `<link rel="preload" as="font" type="font/woff2" crossorigin>` | 1-2 critical fonts | More than 2 wastes bandwidth |
| `next/font` (Next.js) | Next.js app | Self-hosts, subsets, generates `@font-face`, sets `size-adjust` |
| `@font-face` with `size-adjust` and `ascent-override` | Match system font metrics | Eliminates layout shift on swap |
| Self-host on same origin | Always (over Google CDN) | Enables HTTP/3, Cache-Control, no third-party DNS |
| WOFF2 only | Always | 30% smaller than WOFF; >99% support; drop TTF/EOT |
| Subset by `unicode-range` | Multilingual sites | Latin-only is ~30 KB vs ~150 KB full |

```css
@font-face {
  font-family: "DM Sans";
  src: url("/fonts/dm-sans-variable.woff2") format("woff2-variations");
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
  size-adjust: 100.06%;
  ascent-override: 92%;
  descent-override: 24%;
  line-gap-override: 0%;
}
```

```html
<!-- Preload only critical above-the-fold fonts -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/dm-sans-variable.woff2" crossorigin>
```

Tools: [Fontaine](https://github.com/unjs/fontaine) for fallback metrics, [glyphhanger](https://github.com/zachleat/glyphhanger) for subsetting.

## 7. Microtypography

| Property | Use | Browser |
|---|---|---|
| `text-wrap: balance` | Headlines (multi-line `<h1>`/`<h2>`) — equalize line lengths | Chrome 114+, Safari 17.5+, Firefox 121+ |
| `text-wrap: pretty` | Paragraphs — prevents orphans, balances last 3-4 lines | Chrome 117+, Firefox 124+ |
| `hyphens: auto` + `lang="..."` | Justified or narrow body — prevents river/jagged | All evergreen |
| `hanging-punctuation: first last` | Pull quotes/headings | Safari 18+, Chrome 132+ |
| `text-spacing-trim: trim-start` | CJK content — removes opening punctuation indent | Chrome 123+ |
| `font-feature-settings: "kern"` | Already on by default | All evergreen |

```css
h1, h2, h3 { text-wrap: balance; }
p          { text-wrap: pretty; hyphens: auto; }
blockquote { hanging-punctuation: first last; }
```

References: [MDN text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap), [MDN hyphens](https://developer.mozilla.org/en-US/docs/Web/CSS/hyphens), [MDN hanging-punctuation](https://developer.mozilla.org/en-US/docs/Web/CSS/hanging-punctuation).

## 8. Numerals

Switch numeral styles via OpenType features.

| Feature | CSS | Use |
|---|---|---|
| Tabular | `font-variant-numeric: tabular-nums` | Tables, prices, timers, dashboards |
| Proportional | `font-variant-numeric: proportional-nums` | Body prose |
| Lining | `font-variant-numeric: lining-nums` | Headings, all-caps |
| Old-style | `font-variant-numeric: oldstyle-nums` | Body prose with serif |
| Slashed zero | `font-variant-numeric: slashed-zero` | Code, IDs, monospace UIs |
| Stacked fractions | `font-variant-numeric: stacked-fractions` | Recipe / measurement contexts |

```css
/* Data table — perfectly aligned columns */
.data-cell { font-variant-numeric: tabular-nums lining-nums; }

/* Editorial body — old-style figures, sit on baseline like lowercase */
.prose      { font-variant-numeric: oldstyle-nums proportional-nums; }

/* Always slash the zero in code */
code, pre   { font-variant-numeric: slashed-zero tabular-nums; }
```

Reference: [MDN font-variant-numeric](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric).

## 9. Anti-patterns

| Anti-pattern | Why | Replace with |
|---|---|---|
| `font-size: 16px` everywhere | Fixed px breaks browser zoom for vision-impaired users | `rem` units + a modular scale |
| `letter-spacing: 0.5px` on body | Body text already shipped at the foundry's optimal tracking | Tracking only on display sizes; tighten as size grows |
| Shipping 5 weights | Bloats LCP, payload, render time | Variable font with the 2-3 weights you actually use, animate via `wght` |
| Inter on a generic SaaS landing | Maximum AI tell in 2026 | Söhne, GT Walsheim, DM Sans, Plus Jakarta Sans, or pair Instrument Serif + Söhne |
| Loading the full Latin Extended subset | Most apps need only Latin Basic | Subset with `unicode-range`, drop ~70% of glyphs |
| `line-height: 1` on body | Crowds descenders, illegible | `1.5` for body, `1.2-1.3` for headings |
| Justifying text without `hyphens: auto` | Creates rivers of whitespace | Either left-align or hyphenate |
| Landing-page heading sizes inside a dashboard | Information density demands a tighter ladder | Cap dashboard type at ~24px; see Size-count caps |
| 8+ distinct font sizes on one page | Scale stops reading as a system | 6 sizes or fewer on marketing surfaces, fewer on dense UI |
| Fluid steps with mismatched viewport anchors | Steps unfreeze at different widths; the modular ratio distorts mid-range | One min/max anchor pair for the whole ladder; verify each step's freeze width |
| A `clamp()` whose preferred value is pure `vw` | Ignores the user's browser font size; fails WCAG 2.2 SC 1.4.4 | Keep the `interceptRem rem + slopeVw vw` shape |
| Line-length 100+ characters | Eye loses its place between lines | Cap at 65-75ch with `max-inline-size: 65ch` |
| Mixing fonts of different x-heights | Visual disharmony; paired fonts look mismatched | Pair within one family's cuts (Söhne + Söhne Mono, IBM Plex Sans + IBM Plex Mono), or measure the x-heights before pairing across foundries |
| Using `Inter` and `IBM Plex` together | Both neutral grotesques — no contrast | Pair geometric sans + humanist serif, or display + body cuts of the same family |

## 10. Tooling

| Job | Tool |
|---|---|
| Build a modular scale and read off the steps | [Type Scale](https://typescale.com) |
| Generate a fluid type and space ladder from two anchor viewports | [Utopia](https://utopia.fyi) |
| Subset a font to the glyphs a site actually uses | [glyphhanger](https://github.com/zachleat/glyphhanger) |
| Generate metric-matched fallback `@font-face` rules (kills swap-time layout shift) | [Fontaine](https://github.com/unjs/fontaine), or `next/font` if you are on Next.js |
| Inspect and instance a variable font's axes | [Wakamai Fondue](https://wakamaifondue.com), [Fontdrop](https://fontdrop.info) |
| Convert TTF/OTF to WOFF2 and subset by `unicode-range` | [fonttools](https://github.com/fonttools/fonttools) `pyftsubset --flavor=woff2` |
| Check rendered contrast of a chosen weight and size | `apca-w3` / `apcach` (see `references/design/01-color-oklch.md` § 6) |
