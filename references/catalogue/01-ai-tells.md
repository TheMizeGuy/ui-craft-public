---
topic: catalogue
role: reference
scope: anti-ai-tells
audience: ui-designer, ui-reviewer
---

# Anti-AI Tells: The Canonical Catalogue of Patterns That Scream "AI Generated This"

The single flagship reference for ui-craft. Every architect writes against it; every reviewer audits against it. Each entry follows the same shape: pattern -> why AI defaults to it -> concrete remediation, with a detection cue and a severity class. Read this before you ship anything; audit against it before you call work done.

**Provenance.** Merged 2026-07-07 from three independent catalogues that had been maintained separately and cross-referenced each other:

- the **typescript-ui 108-tell catalogue** (base skeleton: 88 categorized tells across 8 numbered categories at merge time + 20 Deep Cuts + the ranked Strongest-10 + severity classes + OKLCH remediation tables + the designer-validation test),
- the **ui-review platform extensions** (10 user-flagged visual tells at merge time + 35 platform-specific tells: 15 web / 10 Apple / 10 Android, with detection methods),
- **anti-slop design research** (AI component fingerprints, the cream-serif-sage emerging tell, the logo-swap diagnostic, the missing-states problem, dark-mode bias and failures, design-system integration drift).

The counts above are the *historical* source-catalogue figures, frozen at the 2026-07-07 merge. **Current totals are carried by the section headings themselves and are authoritative there:** 93 numbered base tells across sections 1-8 (C18, T14, L13, S12, W10, M7, I7, U12), 11 user-flagged visual tells (V1-V11), 35 platform tells (P15 / A10 / AM10), 20 Deep Cuts (D1-D20), plus the Strongest-10 ranks and the section-11 fingerprints. When you add a tell, update its section heading count and this line in the same edit.

Where the three catalogues independently ranked the same fingerprints in the same order, that agreement is itself signal and is called out below. For the corpus evidence behind which of these tells real people actually name -- and which popular "AI tells" the data does not support -- see `references/catalogue/02-empirical-evidence.md`.

## What AI-Generated UI Looks Like in 2026

AI design output converges on the same visible shape because risk-minimizing training pulls toward the median of its corpus -- which is Tailwind documentation, shadcn/ui demos, Vercel templates, and SaaS landing pages. The result is a recognizable house style: rounded cards, gradient hero, generic icon-in-circle features, Inter or Geist on every surface, hashtag purple-and-teal palette, default shadcn unmodified, lorem-ipsum-shaped copy, frosted nav, "Most Popular" pricing tier. None of these elements are wrong individually. The tell is when they all show up together with no point-of-view binding them.

The deepest cause is upstream of any single pattern: an unspecified prompt returns the median of the training data, and everyone's median is identical. The fix is never to swap one default for another (purple for cream, "delve" for "dive") -- that just resets the clock. The fix is a deliberate choice with a reason.

The user's verbatim rejection criteria from prior sessions: "rounded cards, Newsreader+JetBrains Mono pairing, colored-left-border sections, emoji indicators, large decorative serif numerals." Treat these as banned by default; require explicit justification to use any of them.

Real human design teams diverge from defaults intentionally. Linear didn't ship with Inter -- they built a custom display variant. Stripe doesn't use indigo -- they have a restrained brand-specific palette. Things app doesn't have a bento grid -- it has generous whitespace and one perfect yellow. The point is not to be weird; the point is to make decisions that someone -- not an averaging algorithm -- can defend.

**The logo-swap test** is the fastest single diagnostic: if you can swap any SaaS logo onto the page and it still makes sense, the design lacks identity. Good design is inseparable from its content and brand. AI fails this test on every project. Your job is to pass it.

### A note on specificity

Generic advice ("don't use generic colors") wastes the time of every reader. Every entry below is specific: a concrete pattern with a concrete replacement. Where a hex is named, an OKLCH replacement is named. Where a font is rejected, three alternatives are named. Where a layout is criticized, an alternative composition is described. If you find yourself reading something vague, treat it as a bug in this file and propose a fix.

### A note on weighting

Not every tell carries equal weight, and the corpus evidence (file 02) is explicit about this. The strongest real complaints are, in order: **generic sameness ("all looks the same"), the un-themed shadcn/Tailwind default kit, AI purple, gradients,** and the emerging **cream-serif-sage "tasteful default."** Two surprises worth internalizing: the memes are near the bottom -- bento grids (0.1% of complaints; people defend them) and mesh/aurora gradients (a keyword artifact) are not real tells, so do not lead with them. And a lone hit is almost never a tell: one `rounded-lg` card, one `<em>`, one glassmorphism panel is clean. **Concentration is the signal.** Weight by density and by repeated identical treatment across a surface, and honor any deliberate choice marked `anti-slop-allow: <reason>`.

## The Tasteful Default (Cream + Serif + Sage) -- the top emerging tell

The current top emerging tell, and the one most lists miss. A warm cream/beige page background + a serif display font + a sage or forest-green accent, often with a generated product-screenshot card to the right. This is the look the *previous* wave of anti-AI advice converged on, so it now signals "AI tried to be tasteful." It reads as AI faster than purple does, precisely because it looks like a choice: being told it is a default lands worse than being told purple is.

**Anti-patterns:**

- Cream/beige page background: hexes like `#faf8f5`, `#f5f1e8`, `#f3eee3`, `#fdfbf7`, or Tailwind `bg-stone-50` / `bg-amber-50` / `bg-orange-50` used as the page surface.
- Serif display face for headings: Instrument Serif, Fraunces, Playfair Display, Cormorant, Spectral, DM Serif.
- Sage / forest-green as the brand color (`#15573a`, emerald/green 700-900). Per the 2026-07 drift check the accent detail is shifting toward rusty-orange in fresh output.
- The screenshot-card-on-the-right hero that ships with it.

**The signal is the combination.** Any two of {cream background, serif display, sage green} together is the strong tell. One alone may be a real decision.

**Remediation:** this is not "pick a different nice palette" -- that just resets the clock. Anchor color and type to the real brand or a reference. If none exists, choose a direction that is specific and uncommon rather than the current tasteful average. If warm-editorial cream-and-serif is a genuine, stated decision, keep it and mark the line `anti-slop-allow: <reason>`. **Severity: HIGH** (rising; false-positive risk also rising as human 2026 design trends converge on the same palette -- flag the combination, not a lone element).

## How to apply: presence vs concentration

Not every tell fires the same way, and the biggest source of false positives is treating a concentration tell as if a single hit were damning. Before writing a finding, classify the tell you matched.

**Presence-flaggable tells -- a single instance is a finding.** These are specific, high-signal compositions that read as AI on sight; one occurrence is enough, so do not wait for a cluster:

- every AI Component Fingerprint in section 11 (badge pill, gradient text, frosted nav, stats row, dashboard trinity, pricing table, social-proof toast, chat widget, the SaaS landing sequence, and the rest);
- every member of the Strongest-10 (section 17);
- V5 gradient text on hero words; L6 the frosted-glass sticky nav; S3 the unmodified shadcn `<Card>`;
- the cream + serif + sage combination (the top emerging tell).

**Concentration tells -- need >=3 identical treatments, or dominance of a surface.** Most of the property-level rows -- the bulk of the Color (C), Typography (T), Copy (W), and Micro (M) tells -- are only a tell when repeated. Weight by density: three or more identical treatments across a surface, or one treatment that dominates the surface. A single `rounded-lg` card, one `<em>`, one glassmorphism panel, or one gradient is almost never a finding on its own.

**The floor: a lone utility-class hit is not a finding.** One `text-slate-600`, one `text-muted-foreground`, or one `shadow-sm` on an otherwise clean, coherent surface is clean -- do not write it up. The signal is an unspecified default reached for *repeatedly and without a point of view*, not the presence of any single Tailwind class. When in doubt on a concentration tell, count occurrences before flagging, and honor any line marked `anti-slop-allow: <reason>`.

This rule governs the whole catalogue below. Where an individual entry carries its own note (for example C9 glassmorphism, "flag only when applied everywhere without purpose"), that note refines this rule for that specific tell. The corpus evidence behind the presence/concentration split is in `references/catalogue/02-empirical-evidence.md`.

## The remediation floor: a fix never removes responsive or accessible behaviour

Several tells in this file describe a *default expression* of something the interface genuinely needs: a responsive type scale (Strongest-10 #9, T14), responsive container padding (D12), a scrollbar (S8), tuned tracking (T8), a focus ring (U3), a loading state (S10). For every one of these, the cheapest way to make the tell stop matching is to delete the behaviour, and that is always the wrong answer.

**Two hard rules for anyone writing a finding against this catalogue:**

1. **Every finding names its remediation, taken from the tell's own "What humans do" / "Instead" column.** A finding that only names the offence is incomplete, and an incomplete finding on a presence-flaggable tell gets closed by deletion.
2. **A remediation may never reduce the interface's responsiveness, keyboard reachability, screen-reader output, contrast, hit-target size, or motion-preference handling.** If the only way you can see to clear a tell is to make one of those worse, you have the wrong remediation. Re-read the tell; every one of them has a fix that keeps the behaviour and changes its expression.

Concretely: the fix for a stepped `text-4xl sm:text-5xl lg:text-6xl` ramp is a fluid `clamp()` ramp, never a fixed size. The fix for `px-4 sm:px-6 lg:px-8` is `clamp()` padding, never one flat value. The fix for a default focus ring is a *better* focus ring, never `outline: none`. The fix for the default scrollbar is a tuned color, never a thinner drag target.

## 1. Color Tells (18)

| # | Pattern | Why AI does it | What humans do |
|---|---------|----------------|----------------|
| C1 | Pure black background `#000000` | Tailwind `bg-black`, easiest "dark" | Slightly warm or cool dark: `oklch(0.12 0.005 280)` cool-graphite, `oklch(0.14 0.008 60)` warm-coal. Pure black halates on OLED and reads as cheap |
| C2 | Pure white surface `#ffffff` | Tailwind `bg-white` default | Off-whites: `oklch(0.985 0.005 90)` warm paper, `oklch(0.98 0.004 250)` cool fog. Pure white burns the eye and flattens the type |
| C3 | AI purple family (indigo / violet / purple / fuchsia) as primary, accent, or hero gradient stop -- `#6366f1`, `#4f46e5`, `#8b5cf6`, `#a855f7`, `#9333ea`, `#d946ef`, i.e. OKLCH hue 255-325 at chroma >= 0.15 | Tailwind `indigo-500` is the demo color in every starter, and every "make it pop" reflex lands somewhere in the violet-to-fuchsia arc | Pick a hue at least 30 degrees off the whole 255-325 arc: `oklch(0.58 0.16 40)` burnt-orange, `oklch(0.5 0.14 235)` deep-prussian, `oklch(0.55 0.13 145)` workshop moss. Document why this hue and not another |
| C4 | Teal-as-secondary `#14b8a6` | Tailwind `teal-500` paired with indigo is the "AI palette" | Single accent. If you need a second, derive it via `oklch(from var(--accent) l calc(c * 0.7) calc(h + 30))` so it's mathematically related, not arbitrarily picked |
| C5 | Purple-to-pink gradient hero `from-purple-500 to-pink-500` | Trained on Tailwind landing demos and v0 output | Banned in serious products. If the brand demands gradient: rare combos like `oklch(0.7 0.18 30)` -> `oklch(0.5 0.2 350)` warm-blood, or skip the gradient and use a single bold hue with depth |
| C6 | Blue-to-teal gradient `from-blue-500 to-teal-400` | Linear's hero clones | Linear earned that gradient with the rest of the design. Imitating one component without the system reads as cargo-culting. Use a flat color or a textured solid |
| C7 | Same neutral gray scale on every surface | One token set, no surface-aware tuning | Tune neutral per surface: warm gray on light bg, cool gray on dark bg, slightly desaturated within cards. `oklch(0.92 0.005 80)` for light cards, `oklch(0.18 0.01 250)` for dark cards |
| C8 | Rainbow accent palette for categories (red, orange, yellow, green, blue, purple) | Default category color picker in dashboards | Pick 2-3 with intent. Prefer monochromatic ramp (`oklch(l from c30 to 75)`) or analogous trio (`+30deg`, `-30deg` from accent). Six category colors is bad data viz |
| C9 | Glassmorphism translucent white over generic gradient | "Modern" cargo-cult since 2020 | Use sparingly. If you must, layer over real photography or a noise texture, not a gradient. Backdrop-blur is expensive and obscures content. (Low-signal per the corpus -- flag only when applied everywhere without purpose, not on presence) |
| C10 | Saturated success-green / error-red / warning-yellow without contrast tuning | Tailwind default semantic colors | Tune for APCA contrast against actual surface, not nominal value. Status colors should desaturate when over busy backgrounds. `oklch(0.65 0.15 145)` over light, `oklch(0.75 0.18 145)` over dark |
| C11 | Decorative blur blobs `bg-purple-300 rounded-full blur-3xl opacity-20` | v0 template default for "visual interest" | Solid blocks, real photography, or noise texture. Decorative blobs add no information and read as filler |
| C12 | Identical 0.1-opacity shadow on every component | `shadow-sm` on every Card | Shadow communicates elevation. Most surfaces should be flat. Reserve shadow for actively-elevated states (modals, dragging, picked items). Vary shadow intensity with elevation |
| C13 | Black `rgba(0,0,0,0.5)` modal overlay | shadcn default `Dialog` overlay | Tinted overlay matched to brand: `oklch(0.05 0.01 280 / 0.6)` cool-deep, `oklch(0.08 0.015 30 / 0.5)` warm-deep. Adds atmospheric depth |
| C14 | Color used as the only signal of meaning (red border = error) | Visual shorthand AI inherits from training | WCAG 1.4.1 violation. Pair color with icon, label, or texture. Never make red-vs-green the only differentiator |
| C15 | Six-digit hex throughout `#3b82f6` | Trained on pre-OKLCH CSS | OKLCH everywhere: `oklch(0.62 0.2 250)` is perceptually uniform, supports P3 wide gamut, enables `oklch(from var(--c) ...)` derivation, and matches modern design tools |
| C16 | "Light mode = white, dark mode = black" mirror inversion | Lazy theme generation | Dark mode is its own design. Linear's dark is not the inverse of any light mode -- the saturation, hue shifts, and component elevations are independently authored. Use `light-dark()` CSS function and tune both |
| C17 | One-color-fits-all primary in marketing AND product | Single brand color used for CTAs, links, charts, and notifications | Marketing brand color is a beacon; product accent should be quieter. Linear's purple in marketing -> almost no purple in the product UI |
| C18 | Neon / colored glow: a large-spread `box-shadow` in a saturated accent (`box-shadow: 0 0 40px 6px rgba(168,85,247,.6)`), often decoupled from any dark-mode need | The v0/AI "glow for emphasis" reflex on buttons, cards, and hero elements | Reserve glow for genuine emphasis and tune it to the brand, or drop the saturated halo entirely. Empirically low false-positive per file 02 ("Dark mode + unprompted neon glow", 0.7%, Confirmed -- the glow itself, not dark mode). Severity HIGH (see section 18) |

**Detection cues (color):** flag any color in the **AI purple family** -- OKLCH hue **255-325 at chroma >= 0.15** -- used as primary, accent, or a hero gradient stop, or an indigo+teal combination. The measured hues of the classes AI reaches for are `indigo-500 #6366f1` 277.1, `indigo-600 #4f46e5` 277.0, `violet-500 #8b5cf6` 292.7, `purple-500 #a855f7` 303.9, `purple-600 #9333ea` 302.3, `fuchsia-500 #d946ef` 322.1 and `blue-500 #3b82f6` 259.8, so grep the class names (`indigo-*`, `violet-*`, `purple-*`, `fuchsia-*`) and those hexes as well as computing the hue: a narrower window silently clears the purple-to-fuchsia arc that carries most of the complaint. Also check hero sections for purple-pink or blue-teal gradients; count distinct category colors (>4 is a smell); count six-digit hex values vs OKLCH values in the stylesheet; count `backdrop-filter` instances relative to UI surface area; compare neutral tones across light and dark surfaces (identical = un-tuned); check status-color contrast against the *actual* surface, not the nominal swatch; modal overlay color should be brand-tinted, not `rgba(0,0,0,...)`. Flag a large-spread saturated-accent `box-shadow` (neon glow) applied without a brand reason, especially when it is decoupled from any dark-mode need.

### Concrete OKLCH replacements for common AI defaults

When you find a hashtag-purple in a codebase, replace it with one of these instead. Each pairing has a deliberate reason for existing.

**The 30-degree constraint (binding on every cell).** Section 19's "Override-by-checkbox" row sets the bar: a replacement must sit **at least 30 OKLCH hue degrees from the default it replaces**, or the override is cosmetic and the result still reads as the default. The `Delta` column below states the measured distance so the table is checkable rather than asserted. The only sanctioned way to land inside 30 degrees is to **drop chroma below 0.06**, at which point the color reads as a tuned neutral rather than the same accent renamed; those three cells are annotated `neutral, c<0.06`. Any future edit to this table recomputes its deltas.

Reference hues of the defaults, measured in OKLCH: indigo-500 277.1, teal-500 182.5, violet-500 292.7, pink-500 354.3, blue-500 259.8, emerald-500 162.5, amber-500 70.1.

| AI default (banned) | Replacement A (warm) | Delta | Replacement B (cool) | Delta | Replacement C (neutral-bold) | Delta |
|---------------------|----------------------|------:|----------------------|------:|------------------------------|------:|
| `#6366f1` indigo-500 | `oklch(0.58 0.16 40)` burnt-orange | 122.9 | `oklch(0.5 0.14 235)` deep-prussian | 42.1 | `oklch(0.42 0.04 277)` graphite-iris (neutral, c<0.06) | 0.1 |
| `#14b8a6` teal-500 | `oklch(0.65 0.13 60)` honey | 122.5 | `oklch(0.5 0.14 245)` steel-ink | 62.5 | `oklch(0.55 0.12 130)` field-green | 52.5 |
| `#8b5cf6` violet-500 | `oklch(0.55 0.18 25)` brick | 92.3 | `oklch(0.52 0.13 235)` slate-prussian | 57.7 | `oklch(0.4 0.045 293)` graphite-violet (neutral, c<0.06) | 0.3 |
| `#ec4899` pink-500 | `oklch(0.68 0.16 45)` apricot | 50.7 | `oklch(0.55 0.16 315)` orchid-deep | 39.3 | `oklch(0.5 0.12 30)` russet | 35.7 |
| `#3b82f6` blue-500 | `oklch(0.6 0.15 45)` copper | 145.2 | `oklch(0.58 0.11 205)` deep-cyan | 54.8 | `oklch(0.45 0.045 260)` dust-blue (neutral, c<0.06) | 0.2 |
| `#10b981` emerald-500 | `oklch(0.68 0.14 75)` ochre | 87.5 | `oklch(0.55 0.11 215)` harbor-blue | 52.5 | `oklch(0.52 0.09 110)` olive | 52.5 |
| `#f59e0b` amber-500 | `oklch(0.6 0.16 30)` ember | 40.1 | `oklch(0.55 0.13 145)` moss-signal | 74.9 | `oklch(0.5 0.1 20)` oxide | 50.1 |

Self-check for anyone editing the table: hue distance is the shorter arc on a 360-degree circle, `min(|a-b|, 360-|a-b|)`. Every chromatic cell must clear 30; a cell under 30 must carry chroma below 0.06 and say so.

### How to derive a coherent palette without picking colors

Pick one base accent. Derive everything else with `oklch(from var(--accent) ...)`. The math handles consistency.

```css
:root {
  --accent: oklch(0.62 0.15 25);
  --accent-hover: oklch(from var(--accent) calc(l + 0.05) c h);
  --accent-pressed: oklch(from var(--accent) calc(l - 0.05) c h);
  --accent-soft: oklch(from var(--accent) 0.92 calc(c * 0.3) h);
  --accent-border: oklch(from var(--accent) calc(l - 0.1) calc(c * 0.6) h);
  --accent-secondary: oklch(from var(--accent) l c calc(h + 30));
}
```

If the team can defend why each derived value differs, the system has integrity. If the values were picked by eye, drift will appear within 3 sprints. See `references/design/01-color-oklch.md` for the full color reference.

## 2. Typography Tells (14)

| # | Pattern | Why AI does it | What humans do |
|---|---------|----------------|----------------|
| T1 | Inter as primary font | The most-trained font in the LLM corpus, free, ships with shadcn, Vercel uses it | Banned as primary in distinctive design. Use only as utility/UI label fallback. Pick a font with personality: GT America, Söhne, ABC Diatype, Author, Switzer, Inter Display Variable for technical character, IBM Plex Sans for editorial-warm |
| T2 | Roboto / Helvetica / Arial as primary | Default system fonts, zero risk in training | Banned. Same reasoning as Inter. If you must use a system font, use it deliberately as an aesthetic statement (Notion-style "system as honesty"), not as a fallback |
| T3 | Newsreader + JetBrains Mono pairing | Recognizable AI output; named verbatim in the maintainer's standing rejection list | Banned by user. The fix is NOT another mono pairing (that swaps one default for another). Pick fresh sans-led pairings: Söhne + Geist, Author + Switzer, Editorial New + GT America, Instrument Serif + Söhne Buch -- mono stays in code blocks |
| T4 | Geist Sans + Geist Mono unmodified | Vercel's distribution makes this a tell now -- every Vercel-deployed AI project ships with it | Geist is fine if it suits the project; just override the font feature settings, weights, and tracking so it doesn't read as default. Or pick something else |
| T5 | All-caps tracking-wide subtitles `text-xs uppercase tracking-wider` | Overlines on table headers, section labels | Use sparingly and with intent. If used: tighter tracking (`tracking-wide` not `tracking-widest`), small-caps via `font-feature-settings: 'smcp'` instead of `text-transform: uppercase` (better letter-spacing) |
| T6 | Display serif numerals (large `01`, `02`, `03`) | Was distinctive in 2022 (Stripe Press, Linear changelog), now generic | Skip unless integral to the brand. Numbers as section markers read as decoration; use functional headers instead |
| T7 | Two-weight stack (regular + bold only) | AI specifies `font-weight: 400` and `font-weight: 700` | Variable fonts allow fluid range. Use 350 for body, 500 for emphasis, 650 for display. Subtle weight differences feel intentional; bold/regular feels mechanical |
| T8 | Default `letter-spacing: 0` on display headlines | AI never tunes tracking | Display type needs negative tracking: `letter-spacing: -0.02em` at 48px+, `-0.03em` at 72px+. Body type at 16px keeps `0` to `-0.005em`. Caps want positive: `+0.05em`. Floor: never tighten below `-0.04em`, and never tighten body or UI text at all -- letterforms that touch cost legibility for dyslexic and low-vision readers, and the tell is untuned tracking on *display* type, not loose tracking everywhere |
| T9 | `<em>` italic for emphasis when small-caps or weight shift would do | Default emphasis pattern | Pick one emphasis system per project. Small-caps for inline labels, weight shift (450 -> 550) for editorial, italic only when typeface has a real italic (not slanted) |
| T10 | Centered hero copy in a narrow column | The Tailwind hero template | Asymmetric hero: left-aligned headline taking 60% of width, right-side meta column with secondary info, or full-bleed single statement. Center-aligned hero copy is the strongest formula tell |
| T11 | Single-line product tagline as one giant headline | "Build better, faster" 96px centered | Real headlines are sentences. Three-line headline at 56px reads more confident than one line at 120px. Or skip the giant headline entirely for editorial layout |
| T12 | Body type at 14px to fit more on screen | Density obsession, dashboard reflex | 16px body minimum for accessibility (browsers respect user font-size when units are `rem`). 15-18px is the comfortable range. Density should come from line-height tuning, not shrinking type |
| T13 | Monospace on human-readable UI text -- mono kickers, mono stat/price/timestamp readouts, mono labels or body ("terminal cosplay") | Mono accents were adopted as a de-AI-ing move to escape the Inter tell, then over-corrected into a new house tell | Banned by maintainer directive (2026-07-17) on user-facing surfaces. Mono only for genuine code, logs, raw payloads, hex/IDs, and terminal UIs. Human-readable text gets the platform system face (SF Pro / system stack) or brand sans; hierarchy via weight + color; digit alignment via `tabular-nums` (web) / `.monospacedDigit()` (SwiftUI), which are the sans -- not a mono family |
| T14 | Stepped type scale: a fixed px or fixed `text-*` size per breakpoint, with the size jumping at 640/768/1024 and holding flat in between (`text-4xl sm:text-5xl lg:text-6xl`, or `font-size: 32px` + `@media (min-width: 768px) { font-size: 48px }`) | Breakpoint variants are the first thing every Tailwind and CSS tutorial teaches, and a stepped ramp is the lowest-risk way to satisfy "make it responsive" without reasoning about the range between the steps | Ship a **fluid ramp** so every viewport width in the range gets a size chosen for it, not the size of the nearest step down. One `clamp()` per step of the scale: `--step-0: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);` `--step-3: clamp(2rem, 1.2rem + 3.2vw, 4.5rem);`. Read it as `clamp(min, preferred, max)` where `preferred` is a `rem` base plus a `vw` term, so it scales with the viewport but never collapses below `min` or runs past `max`. Keep the T8 tracking rule attached to the ramp (`letter-spacing: -0.02em` at 48px+, `-0.03em` at 72px+) so display type stays tuned at every size, and keep `min` at or above 16px on body text so T12 still holds. This tell is about *how* the scale is expressed, not about being responsive: a fluid ramp is the fix, never a single fixed size |

**Detection cues (typography):** check `font-family` declarations for Inter / Roboto / Helvetica / Arial / Geist / the Newsreader+JetBrains pairing; search for any mono face (`font-mono`, `ui-monospace`, `.monospaced()`, JetBrains/Berkeley/Martian/IBM Plex Mono) applied to non-code text -- labels, kickers, stats, prices, timestamps, prose (T13); search for the `uppercase` + `tracking-wider` combo on overlines and table headers; check font-weight variety (only 400 + 700 present = mechanical stack); check display headlines for negative tracking (absence is a tell); check hero text alignment and column width; check the minimum `font-size` on body text (rem units, >= 16px); count `clamp(` occurrences in the type scale against the number of breakpoint font-size variants (T14 -- zero `clamp()` plus a full set of `sm:`/`md:`/`lg:` size variants is the stepped ramp).

**A stepped ramp is a tell; being responsive is not.** T14 and Strongest-10 #9 both flag *how* a scale is expressed. Neither is satisfied by deleting the responsive behaviour. A single fixed `font-size: 48px` heading is a worse answer than the stepped ramp it replaced, and a reviewer who writes "remove the responsive sizes" has produced a regression, not a fix. The only correct remediation is the fluid `clamp()` ramp in T14.

### Distinctive font stacks ranked by POV match

Use this table when the user asks "what font?" Don't suggest Inter unless the project specifically calls for invisible utility type.

| POV | Display | Body | Mono | Why this stack works |
|-----|---------|------|------|---------------------|
| Tactical Operator | Söhne Variable / Geist / a condensed grotesque (600-650, tight tracking) | Söhne Buch / Inter Display Variable | Berkeley Mono (code/log panes only) | Weight + negative tracking + density signals operator-tool; digits align via `tabular-nums`, mono never leaves code panes |
| Editorial Magazine | GT Sectra / Editorial New / Tiempos Headline | Source Serif / Charter / Tiempos Text | ABC Diatype Mono | Distinctive serif carries editorial weight; sans-mono only in code blocks |
| Workshop / Crafted | GT Walsheim / Söhne Buch / Untitled Sans | system-ui (well-tuned) / Inter Variable | Söhne Mono | Humanist warm sans pairs with system-honesty body |
| Brutalist-Warm | ABC Monument Grotesk / Pangram Sans / Druk | Söhne Breit / GT Pressura | ABC Diatype Mono (code only) | Heavy display + functional body; weight contrast does the accent work, mono stays in code |
| Spatial / visionOS | SF Pro Display (native only) | SF Pro Text (native only) | SF Mono | Apple-licensed; web fallback to Inter Display Variable |

Banned-as-primary list (with reason): Inter (training-corpus median), Roboto (Google's invisible default), Helvetica (cliché since 2008), Arial (system fallback only), Open Sans (over-used SaaS sans), Newsreader (when paired with JetBrains Mono -- verbatim AI fingerprint), Lora (over-used "warm serif"), Playfair Display (over-used "luxury display" -- and now a cream-serif-sage marker), Montserrat (Bootstrap reflex), Source Sans (Adobe ubiquity), DM Sans (every shadcn dashboard). See `references/design/02-typography.md`.

**House font doctrine (maintainer directive 2026-07-17, outranks the generic guidance above):** SF Pro / the platform system stack is the fleet's main go-to for UI and information-dense text -- a deliberate house voice, not a fallback (differentiation via weight, optical size, tracking, color, density). **Poppins is maintainer-approved** for modern-elegant display areas (previously listed banned for ubiquity -- rescinded; use it deliberately at display weights, not as default body everywhere). Distinctive brand faces stay available when a project defines one.

**Mono discipline (standing maintainer directive, 2026-07-17):** the Mono column above exists for genuine code, log, and raw-payload content only. A monospace face on any human-readable surface -- headings, body, labels, kickers, stats, prices, timestamps, nav, buttons -- is tell T13, regardless of how premium the face is. The sanctioned replacement for "mono numerals" is tabular figures on the system/brand sans (`font-variant-numeric: tabular-nums` on web, `.monospacedDigit()` in SwiftUI -- both render SF Pro/the sans, not a mono family). Modern system faces (SF Pro on Apple platforms, the system stack or brand sans on web) with weight + color hierarchy are the default voice for UI text.

## 3. Layout Tells (13)

| # | Pattern | Why AI does it | What humans do |
|---|---------|----------------|----------------|
| L1 | Generic SaaS scaffold: hero -> CTA -> 3-col features -> testimonials -> CTA -> footer | The most-trained landing page sequence | Let the content drive the structure. A portfolio leads with work. A restaurant leads with the menu. A dev tool leads with code. The page sequence should match the user's intent, not a template |
| L2 | Centered everything (text, buttons, sections) | Easiest to compose, looks "balanced" | Asymmetry. Left-aligned text in editorial, content offset to one side, intentional negative space on the opposite. Center is the lazy answer to composition |
| L3 | Bento grid as the only layout | Hot since 2024, AI overuses it | Use bento when the data has natural rectilinear chunks of varying importance (Apple-style product spec page). Don't use it because "bento looks modern." Mixed sizes need real reasoning. (Note: bento is a weak real tell per the corpus -- do not lead with it) |
| L4 | Equal-width 3-col or 4-col feature grid | The Tailwind `grid-cols-3` reflex | Vary widths: golden-ratio split (1:1.618), asymmetric (2:1:1), or no grid (long-form alternation). Equal columns flatten the hierarchy |
| L5 | Cards everywhere -- every container is `Card` with `rounded-lg border` | shadcn `<Card>` is the default container | Recompose. Sections separated by whitespace, color, or subtle rule. Cards should be reserved for genuinely interactive grouped content. Don't card-wrap the entire page |
| L6 | Floating frosted nav `bg-white/80 backdrop-blur-md sticky` | Strongest single-component AI fingerprint | Vary nav height. Skip the blur if it doesn't serve the design. Sidebar nav, mega-menu, or static header all valid. Not every site needs a sticky nav |
| L7 | Section padding overload (`py-24` on every section) | The default section spacing | Vary section padding by content density. Editorial sections breathe with `py-32`; functional sections compress to `py-12`. Mechanical regularity is a tell |
| L8 | Marquee scrolling logo wall | "Trusted by" social proof reflex | Skip unless you actually have logos worth showing. If you do: static grid with subtle hover, not perpetual motion. Static respects the user's attention |
| L9 | Stat counters animating from 0 | "Engagement" decoration | Static stats with sparkline context if the trend matters. Animation steals attention from the number itself |
| L10 | Generic dashboard: sidebar (`w-64`) + topbar + 4 KPI cards + chart + table | shadcn dashboard demo verbatim | Custom sidebar width based on nav depth. Stats relevant to actual domain. Real empty states. Custom chart styling matching brand. Read your dashboard against the shadcn demo -- if it's the same, restart |
| L11 | Alternating left-right feature sections (text-image, image-text, repeating) | Mechanical alternation pattern | Vary section layouts. Some features deserve full-width demos, some only text, some grids. Let content choose, not pattern |
| L12 | SVG wave / curved section dividers | Decorative separator on every section | Use background color shifts, generous whitespace, or a thin rule. If sections are well-designed they don't need decorative dividers |
| L13 | Fixed-pixel shell that cannot resize: a `width: 1200px` (not `max-width`) container, a hardcoded `grid-template-columns: repeat(3, 320px)`, a `height: 100vh` full-bleed surface, and often no `<meta name="viewport">` at all | The model composes for the one canvas it is imagining, usually a 1440px desktop screenshot, and fixed pixels are the shortest path to a layout that looks right in that single frame | Size from the content and the container, not from a remembered screen. `width: min(100% - 2rem, 72rem)` instead of a fixed width. `grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr))` so the column count falls out of the available space instead of being asserted. `100dvh` (or `100svh` for a fixed bar) instead of `100vh`, which on mobile is measured against the *largest* viewport and pushes content behind the browser chrome. `padding-bottom: max(1rem, env(safe-area-inset-bottom))` on any bar pinned to the bottom edge. `@container` for component-level adaptation, since a component in a 280px sidebar and the same component in a 900px main column see identical viewport widths and must not be laid out by `@media`. And `<meta name="viewport" content="width=device-width, initial-scale=1">` in the head, without `user-scalable=no` (P4). **Severity: HIGH** -- a shell that cannot resize is a functional break at every width the author did not picture, not a taste preference |

**Detection cues (layout):** compare the page sequence against the SaaS template regardless of product type; measure the share of sections using `text-align: center` + `mx-auto` (>80% is centered-everything); check whether a bento/grid is content-justified or decorative; look for varied column widths (all equal = a tell); count `Card` containers vs alternative grouping devices; match the nav against `bg-white/80 backdrop-blur-md border-b sticky`; check for identical section padding on every section; look for auto-scrolling logo bars, counter animations, an L-R-L-R alternation pattern, and wave/curve SVGs between sections. For L13, grep the stylesheet for `width:` with a `px` value on a layout container (as opposed to `max-width`), a `repeat(<n>, <fixed>)` grid template, `100vh` anywhere, `position: fixed` on a bottom bar with no `env(safe-area-inset-bottom)`, and the absence of a `<meta name="viewport">` tag; then check whether any `@media` rule is restyling a *component* rather than the page shell, which is the P1 container-query failure.

### Layout compositions to consider instead of the SaaS scaffold

When the brief says "build a landing page", the AI default is the eight-section vertical scroll: nav, hero, logo bar, features, alternating L-R, testimonials, pricing, footer. Resist. Pick a composition that matches the product, not the template.

| Composition | When to use | Reference |
|-------------|-------------|-----------|
| Editorial single-column | Long-form story, manifesto, founder letter | Stripe Press, Robin Sloan, Paul Graham essays |
| Documentary horizontal scroll | Visual narrative (case study, product story) | Apple product pages, Pitch presentation |
| Dispatch board / dashboard-as-marketing | Product itself is the demo | Linear (issue board screenshot is the hero) |
| Product-spec vertical bento | Hardware-style detail walkthrough | Apple iPhone product page |
| Asymmetric magazine grid | News-publication or portfolio | Vercel Conf, FT.com, Apple Newsroom |
| Single-frame interactive | Tool that works in one viewport | tldraw, Excalidraw, Figma marketing |
| Two-column documentation | Reference content with permanent nav | Stripe API docs, Tailwind docs |
| Calendar / time-rhythm | Time-series product | Cron, Linear roadmap |

If the brief doesn't fit any of these, design the composition before designing the components. The composition decision is upstream of every other layout decision.

## 4. Component / shadcn Tells (12)

| # | Pattern | Why AI does it | What humans do |
|---|---------|----------------|----------------|
| S1 | Default `border-input` color | shadcn default token, never overridden | Override `--input` to brand-specific. `oklch(0.92 0.005 250)` light or `oklch(0.25 0.01 280)` dark. Borders are 30% of the visual texture; tune them |
| S2 | `rounded-md` everywhere | shadcn default radius | Pick a radius identity and commit: `rounded-none` (tactical/technical), `rounded-sm` 2px (precise), `rounded-2xl` 16px (soft/playful). Mixed radii within one component reads as accident |
| S3 | Default `<Card>` with `border + p-6 + shadow-sm` | shadcn primitive unmodified | Recompose: borderless with a subtle bg shift, full-bleed within section, or borderless with hairline divider. Cards are not the only grouping device |
| S4 | Lucide icons unchanged across the entire app | shadcn ships with Lucide, AI never replaces | Vary or replace. Phosphor (variable weight), Tabler, Carbon, Iconoir, Heroicons all distinctive. Or commission a custom 20-icon set for the product. Lucide is fine for utility; don't let it carry the brand |
| S5 | Button labeled "Button" or "Submit" or "Click" | Placeholder copy from demos | Real product copy: "Save changes", "Send invite", "Start trial". Verb + noun. Action-oriented. Never ship "Submit" as the literal label |
| S6 | Floating-label input or placeholder-as-label | Material-Design holdover from 2017 | Visible label above input, placeholder for example value or format hint, optional helper text below. Placeholder-as-label fails accessibility and disappears on focus |
| S7 | Default toast styling (Sonner/shadcn) | `<Toaster />` mounted with no theme override | Restyle to brand: position (bottom-center vs top-right based on app density), animation (slide vs fade), surface treatment (elevated vs inline). Default toast is a recognizable shadcn fingerprint |
| S8 | Default browser scrollbar | No scrollbar styling | Tune `scrollbar-color` to the surface tone. Leave the width alone: `scrollbar-width: thin` shrinks a drag target that motor-impaired and trackpad users rely on, so use it only on a secondary inner pane, never on the page scroller or on a coarse-pointer device (`@media (pointer: coarse) { scrollbar-width: auto; }`). Color is the polish; width is a hit target |
| S9 | DropdownMenu with default arrow indicator | shadcn primitive default | Match indicator to the rest of the icon system (Phosphor caret if Phosphor, custom chevron if branded). Or remove entirely and let position cue the dropdown |
| S10 | Skeleton loader on content that loads in <300ms | Loading-state reflex | Skeletons are for content that takes 300ms+ to arrive. Sub-300ms loads should use direct render or a brief opacity-fade. Skeletons on fast loads add perceived latency |
| S11 | "Most Popular" floating badge on middle pricing tier | Pricing-card formula | Vary tier emphasis: lead with the recommended plan at full size, deemphasize others. Or use comparison table layout. The floating badge is a top-3 AI tell |
| S12 | Stats card with `$45,231.89 +20.1% from last month` | Verbatim from shadcn dashboard demo | Real stats. Real numbers. Real comparison context (vs last week, vs target, vs benchmark). The exact value `$45,231.89` is in the model's training data as a fingerprint |

**Detection cues (component):** compare `--input`, `--radius`, the `<Card>` composition, `<Button>` sizing, and toast styling against the shadcn defaults (unchanged = a tell); check whether Lucide is the *only* icon library; search for generic button labels ("Button", "Submit", "Click"); check input label patterns for placeholder-as-label; check scrollbar styling; check skeleton usage against actual load time; look for floating pricing badges; grep for the known demo value `$45,231.89`.

### shadcn defaults that MUST be overridden

The shadcn/ui community joke is that every site looks the same because nobody overrides the defaults. The list below is what you must change for shadcn to stop reading as shadcn.

| shadcn default | What to change |
|----------------|----------------|
| `--background: 0 0% 100%` (HSL `#fff`) | OKLCH off-white per surface (see C2) |
| `--foreground: 222.2 84% 4.9%` (near-black ink) | Tuned ink-tone matching the warm/cool brand temperature |
| `--primary: 222.2 47.4% 11.2%` | Brand accent -- never the navy default |
| `--radius: 0.5rem` (8px = `rounded-md`) | Radius identity per POV (see S2) |
| Inter as `--font-sans` | POV-appropriate stack (see typography section) |
| Lucide as the icon library | Phosphor / Tabler / Carbon / custom (see S4) |
| `<Card>` default `border + bg-card + shadow-sm + p-6` | Recompose to surface-aware variant (see S3) |
| `<Button>` default size `h-10 px-4 py-2 rounded-md` | POV radius + tuned padding for content density |
| `<Input>` default `border-input bg-background px-3 py-2 rounded-md` | Hairline bottom-border or recessed surface variant |
| `<Dialog>` default `bg-background border rounded-lg shadow-lg` | Position, sizing, and overlay tint per POV |

If a project ships shadcn without overriding any of these, the design-quality bar has not been met -- leaving shadcn at default undermines the entire point of a distinctive design. See `references/design/06-shadcn-customization.md`.

## 5. Copy + Content Tells (10)

| # | Pattern | Why AI does it | What humans do |
|---|---------|----------------|----------------|
| W1 | Lorem ipsum or "the future of X" tagline | Placeholder content shipped | All content real or marked `[PLACEHOLDER]`. Lorem ipsum in production is a CRITICAL bug |
| W2 | Vague benefit copy: "Streamline your workflow", "Unlock the power of..." | SaaS-speak from training corpus | Specific verbs and objects. "Cut deploy time from 12 minutes to 90 seconds" beats "streamline deploys" |
| W3 | "Built for teams of every size" | Trained-in inclusivity hedge | Pick the team size you serve. "For teams of 5-50 engineers" is honest and disqualifies wrong leads |
| W4 | "Powered by AI" everywhere | The 2024 SaaS reflex | Show what the AI does, not that it exists. "Categorizes invoices automatically" beats "AI-powered invoicing" |
| W5 | Generic SaaS-speak ("collaborate seamlessly", "leverage", "supercharge") | Median tone of marketing corpus | Plain, specific verbs. "Edit the same doc together" beats "collaborate seamlessly" |
| W6 | Three-bullet feature description: title -> verb-the-noun | Template copy structure | One sharp sentence each. Vary the structure -- some bullets short, some long, some skip the bullet entirely |
| W7 | "Trusted by [logos]" with no real logos | Social proof reflex | Show real logos with permission, with quote, with metric. Or skip entirely. Fake logos are a credibility kill |
| W8 | Fake testimonials with stock-photo headshots and "CEO at TechCorp" | Pulled from training data | Real testimonials with names, real photos, real titles, real company. Or skip. "Sarah Johnson, CEO at TechCorp" is a known AI fingerprint |
| W9 | "Get started in seconds" with no actual onboarding | Speed reflex | Be honest about time cost. "5-minute setup, no credit card" with the actual signup form one click away |
| W10 | "Welcome back!" on every dashboard | Generic personalization | Show the user something only they would see. "Your last build deployed 3 hours ago" or "2 PRs await review". Recognition is data, not a greeting |

**Detection cues (copy):** search for lorem ipsum and "the future of X"; flag non-specific value propositions; measure "Powered by AI" / "AI-powered" density; scan for SaaS-speak verbs ("leverage", "supercharge", "seamless", "streamline"); grep for the known fake-testimonial names ("Sarah Johnson", "Michael Chen", "CEO at TechCorp"); flag "Welcome back!" and "Get started today!" microcopy. Additional generic microcopy AI reuses on every project: "Get started today!", "Unlock the power of...", "Join thousands of satisfied users", "We're here to help", "Stay in the loop", "Transform the way you...". And marketing-speak leaking into functional UI: "Supercharge your workflow" on a settings page, "Experience seamless integration" on connection settings -- write "Connect your GitHub account", not "Seamlessly integrate with GitHub."

## 6. Motion Tells (7)

| # | Pattern | Why AI does it | What humans do |
|---|---------|----------------|----------------|
| M1 | Every element fades-in on scroll | Framer Motion + Intersection Observer reflex | Reserve scroll-triggered motion for content that benefits from progressive reveal (case studies, long-form). Default to no motion |
| M2 | Spring-bounce on serious confirms ("Are you sure you want to delete?") | Single global motion preset | Match motion energy to message gravity. Destructive actions: minimal motion, slight scale-up, no bounce. Playful actions: more energy. One-size motion is a tell |
| M3 | Page transitions 600ms+ | "Cinematic" reflex | Snappy transitions: 150-300ms for page changes, 100-200ms for component state, 50-100ms for hover. Over 400ms feels broken |
| M4 | Marquee that scrolls forever | Logo wall, banner news, "what's new" bar | Scroll on demand or pause on hover. Perpetual motion is a battery + attention tax |
| M5 | Hover scale-1.05 on every card | Default Framer Motion preset | Hover should communicate affordance. Scale on cards that lift to a new state; underline-grow on links; brightness shift on buttons. Same hover everywhere is a tell |
| M6 | All animations ignore `prefers-reduced-motion` | Default Motion config | Wrap every decorative animation in `@media (prefers-reduced-motion: reduce)`. Functional motion (loading, drag) can degrade to instant; decorative motion must disable cleanly |
| M7 | Animating layout-triggering properties (`width`, `height`, `top`, `left`) | AI doesn't know the GPU pipeline | Animate `transform`, `opacity`, `filter` only on hot paths. Layout-triggering animations cause jank at 60fps, especially on mobile |

**Detection cues (motion):** look for Framer Motion + IntersectionObserver on every section; a single global motion preset applied to all interactions; route-transition duration over 400-600ms; auto-scroll without pause-on-hover; identical hover treatment on all cards; missing `@media (prefers-reduced-motion: reduce)`; animation of `width` / `height` / `top` / `left` on hot paths. Timing budget: micro-interactions (hover, focus, toggle) under 200ms; medium transitions (panels, dropdowns) 200-300ms; full-screen up to 400ms; over 500ms feels sluggish. See `references/design/04-motion.md`.

## 7. Image / Asset Tells (7)

| # | Pattern | Why AI does it | What humans do |
|---|---------|----------------|----------------|
| I1 | Stock photography (smiling team in office) | Free/cheap content | Real product screenshots, custom photography, illustration, or skip the image entirely. Stock kills credibility |
| I2 | Generic 3D blob shapes from Spline/Blender | "Modern 3D" reflex | Skip unless the product is genuinely about 3D (visualization, design tool). 3D blobs are 2024's gradient-blobs |
| I3 | Hand-drawn arrows pointing at CTA | "Conversion optimization" gimmick | Trust the design. If a CTA needs an arrow to be found, the layout is broken |
| I4 | Unsplash gradient photos as section backgrounds | Free, looks "premium" | Custom photography, brand textures, solid color, or generative art. Unsplash gradients are recognizable |
| I5 | Placeholder avatars: initials in a colored circle | Default fallback | Real photos when available; abstract identicons (Boring Avatars) or geometric monograms when not. Initials-in-circle is fine in product UI but a tell on marketing |
| I6 | "AI-generated" looking imagery (uncanny faces, six-fingered hands, melted text) | Lazy fal.ai or Midjourney use | Hand-curate every generated asset. Reject the first three results. Edit visible defects. Or use real photography |
| I7 | Generic flat-vector illustrations: unDraw / Storyset / Humaaans / Blush, or the flat "corporate Memphis" style (floating limbs, oversized props, blob people, one monochrome accent) | Free, permissively licensed, and drop-in -- the default when a section needs a graphic and no real asset exists | Commission or draw brand-specific illustration, use real product screenshots or photography, or use nothing. The unDraw / corporate-Memphis look is instantly recognizable and completely brandless. Severity MEDIUM (see section 18) |

**Detection cues (image):** reverse-searchable stock images; Spline/Blender blobs with no content relationship; conversion-arrow elements; generic stock-photo section backgrounds; `bg-muted rounded-full` initials as the only avatar treatment; AI-artifact imagery (six-fingered hands, melted text); image `src` matching undraw / storyset / humaaans / blush, or the flat "corporate Memphis" illustration style (monochrome-accent floating limbs and blob figures). A related structural tell from the corpus: **no real images at all.** One of the most-cited specific complaints is that every section is icon-cards and abstract shapes with zero screenshots, photos, or product shots ("most good websites are like 50% images if not more"). AI defaults to icon-in-a-box because an icon needs no asset pipeline. If the product is visual, the page should be too -- show the real product.

## 8. Micro Tells (12)

| # | Pattern | Why AI does it | What humans do |
|---|---------|----------------|----------------|
| U1 | Trailing colons on every form label ("Email:") | 1990s convention from training corpus | Drop the colon. "Email" is enough. Colons add visual noise and have no semantic value |
| U2 | "Enter your email" placeholder | Stock placeholder copy | "you@company.com" gives format hint without redundant label-restate. Or skip placeholder entirely if label is clear |
| U3 | Default focus ring (browser blue or `outline: none`) | AI removes focus ring for "aesthetics" | Custom `:focus-visible` ring matched to brand: 2px solid `oklch(0.65 0.18 250)` with 2px offset. Distinct from `:focus` (mouse) and `:hover`. WCAG 2.4.7 |
| U4 | No `:focus-visible` distinction from `:focus` | AI conflates the two | Mouse-focus: minimal or none. Keyboard-focus: prominent ring. `:focus-visible` is the modern selector |
| U5 | `cursor: pointer` on non-interactive elements | Trained-in habit | Cursor signals interaction. Static text, decorative icons, and disabled controls should not get pointer cursor |
| U6 | Tooltip on hover-only (no keyboard equivalent) | Default Radix Tooltip behavior | Tooltips must show on `:focus-visible` too. Use `<button aria-describedby>` pattern, not `title=` attribute |
| U7 | Modal with X in top-right AND "Close" button in bottom-right | Pattern-stacking from multiple training sources | Pick one close affordance. Either chrome X (with `aria-label="Close"`) or content-area button. Two close buttons is decision-paralysis design |
| U8 | Loading spinner without context label | Default `<Spinner />` | Always paired with text: "Loading invoices...", "Saving changes...". Spinner alone fails screen readers and creates anxiety |
| U9 | Error and success messages styled identically except color | Color-only-meaning failure | Different icon (alert vs check), different bg tint, different border weight, different copy structure. Red-vs-green is not enough |
| U10 | Date format ambiguity (`1/2/26` -- is that Jan 2 or Feb 1?) | Locale-naive default | Explicit format: `Jan 2, 2026` or `2026-01-02` or `2 days ago`. Never numeric-ambiguous |
| U11 | Numeric ranges without thousands separator (`12345`) | Raw `Number.toString()` | `Intl.NumberFormat` with locale: `12,345` or `12 345` based on user locale. Tabular nums for alignment in tables |
| U12 | Singular/plural unhandled ("1 items remaining") | Naive interpolation | `Intl.PluralRules`: "1 item", "2 items", "0 items" or "Nothing remaining". Pluralization bugs are a credibility kill |

**Detection cues (micro):** search for `:` in label text; redundant placeholder label-restate; `outline: none` without a `:focus-visible` replacement; mouse and keyboard focus treated identically; `cursor: pointer` on static content; tooltips without a `:focus-visible` trigger or that use `title=`; two close affordances on one modal; a `<Spinner />` with no text; color-only state differentiation; locale-naive numeric dates; raw `Number.toString()` output without thousands separators; naive singular/plural string interpolation.

## 9. Specific Visual Tells (user-flagged) (11)

These were surfaced by users flagging concrete on-screen shapes -- several restate the user's verbatim rejection list (colored-left-border sections, emoji indicators, decorative serif numerals). They overlap with the component fingerprints in section 11 but are catalogued here as discrete, screenshot-detectable patterns with a severity each.

| # | Pattern | Description | Detection | Severity |
|---|---------|-------------|-----------|----------|
| V1 | Oval/pill icon backgrounds | Icons wrapped in `rounded-full bg-primary/10 p-3` or `bg-muted rounded-lg p-2.5`, creating identical tinted ovals/pills behind every icon in a feature grid | Search for `rounded-full` / `rounded-lg` wrapping icon components with tinted backgrounds | HIGH (this is Strongest-10 fingerprint #6) |
| V2 | Edge highlight line on one side | Subtle gradient or solid strip on one edge of a card/section (`border-l-4 border-primary`, or a CSS gradient making a light highlight along the top/left edge) | Search for `border-l-*` / `border-t-*` with accent colors, or gradient borders creating one-sided highlights | MEDIUM |
| V3 | Colored left border on sections | `border-l-4 border-blue-500` or similar colored left border on info boxes, callouts, quotes -- the user-banned "colored-left-border section" pattern | Search for `border-l-*` with color classes | MEDIUM (user-banned by default) |
| V4 | Badge pill above hero heading | Small colored pill `rounded-full px-3 py-1 text-sm bg-primary/10` above the headline reading "Introducing...", "New", "AI-Powered" | Check hero sections for small pill badges above the h1 | MEDIUM |
| V5 | Gradient text on hero words | `bg-gradient-to-r bg-clip-text text-transparent` on select words in the headline | Search for the `bg-clip-text text-transparent` pattern | HIGH (a v0/Claude signature) |
| V6 | Two-button CTA group | One filled + one ghost button side by side, always "Get Started" + "Learn More" | Check hero CTAs for this exact dual-button pattern | MEDIUM |
| V7 | Social-proof notification toast | "John from NYC just signed up 2 minutes ago" fake-activity popup | Search for timed notification toasts with activity messages | HIGH (dark pattern + fabricated data) |
| V8 | Chat widget bubble | `fixed bottom-4 right-4 rounded-full w-14 h-14` with a chat icon, no real chat system behind it | Check for fixed bottom-right circular buttons | HIGH (demo-ware when non-functional) |
| V9 | Dot/grid background pattern | `radial-gradient(circle, #e5e7eb 1px, transparent 1px)` behind the hero | Search for radial-gradient dot patterns as backgrounds | LOW |
| V10 | Identical testimonial cards | 3 cards, 5 yellow stars, 2-3 sentence quotes, circular avatar, "CEO at TechCorp" | Check testimonial structure for template uniformity | MEDIUM |
| V11 | Pulsing "Live" badge | Animated/pulsing dot next to "LIVE"/"Live" text (pulse-ring span, `animate-pulse` dot, SwiftUI `.symbolEffect(.pulse, options: .repeating)` on a status dot) on anything real-time. Liveness should be content-borne (rows arriving, timestamps updating) -- the ornament is reflexive AI decoration | Search for `animate-pulse`/pulse-ring markup or repeating pulse symbol effects adjacent to live/online/connected labels | HIGH (user-banned by default, 2026-07-18 -- allowed only when the user explicitly requests a live badge) |

## 10. Platform-Specific Tells (Web 15 / Apple 10 / Android 10)

Platform overlays. The base catalogue above is largely web-and-design-agnostic; these 35 tells are what marks native or web output as AI-generated *on a specific platform*. Full platform reasoning lives in `references/platform/01-web-overlay.md`, `references/platform/02-apple-overlay.md`, and `references/platform/03-android-overlay.md`; the accessibility overlaps are detailed in `references/accessibility/01-wcag-2-2.md`.

### Web (15)

| # | Pattern | Severity |
|---|---------|----------|
| P1 | Viewport media queries for component layout (use container queries) | MEDIUM |
| P2 | Fixed pixel breakpoints when `clamp()` works | MEDIUM |
| P3 | `100vh` on mobile causing content behind browser chrome (use `100dvh`) | MEDIUM |
| P4 | Disabling zoom (`user-scalable=no`) | CRITICAL (a11y) |
| P5 | `float` for layout (non-text-wrap use) | MEDIUM |
| P6 | `!important` overrides instead of fixing specificity | MEDIUM |
| P7 | Excessive CSS nesting (`.page .content .section .card .header .title span`) | LOW |
| P8 | `div onclick` instead of `button` (breaks keyboard + screen readers) | CRITICAL (a11y) |
| P9 | Heading levels skipped for size (h1 to h3) | HIGH |
| P10 | Missing `lang` attribute on `<html>` | HIGH |
| P11 | No skip navigation link | HIGH |
| P12 | `tabindex` > 0 (breaks natural tab order) | HIGH |
| P13 | CSS `order` breaking tab order without a `tabindex` fix | HIGH |
| P14 | `title` attribute used instead of `aria-label` for tooltips | MEDIUM |
| P15 | Dynamic content inserted without an `aria-live` announcement | HIGH |

**Remediation for the responsive trio (P1, P2, P3).** These three are the most frequently mis-fixed tells in the catalogue, because the naive "fix" for each is to delete the responsive behaviour entirely. Each has exactly one correct answer:

| Tell | What is actually wrong | The fix (and the wrong fix) |
|---|---|---|
| P1 viewport media queries for component layout | The component asks the *window* how wide it is when what matters is how wide its *container* is. The same card in a 280px sidebar and in a 900px main column both see `min-width: 900px` as true, so one of them is laid out wrong at every window size | `.card-host { container-type: inline-size; }` then `@container (min-width: 28rem) { .card { grid-template-columns: 8rem 1fr; } }`. The component now responds to the space it was actually given. **Wrong fix:** removing the query and shipping one fixed layout |
| P2 fixed pixel breakpoints where `clamp()` works | A value that should vary continuously is being quantised into two or three steps, so every width between the steps gets a value chosen for a different width | `font-size: clamp(2rem, 1.2rem + 3.2vw, 4.5rem)`, `padding: clamp(1rem, 0.5rem + 2vw, 3rem)`, `width: min(100% - 2rem, 72rem)`. Keep breakpoints for genuine *layout changes* (a sidebar appearing, a nav collapsing) -- those are discrete and belong in a media query. **Wrong fix:** replacing the ramp with a single fixed value |
| P3 `100vh` on mobile | `vh` is resolved against the largest possible viewport, so with browser chrome visible the last `~60-100px` of a `100vh` surface sits under the toolbar and any bar pinned to its bottom edge is unreachable | `100dvh` for a surface that should track the visible viewport, `100svh` for a full-height surface that must not reflow as the toolbar hides, plus `padding-bottom: max(1rem, env(safe-area-inset-bottom))` on the bottom bar itself and `viewport-fit=cover` in the viewport meta so the inset resolves to a real value. **Wrong fix:** a fixed `height: 800px` |

### Apple (10)

| # | Pattern | Severity |
|---|---------|----------|
| A1 | Custom navigation bar instead of NavigationStack | MEDIUM |
| A2 | Non-system fonts without Dynamic Type support | HIGH |
| A3 | Hard-coded colors instead of semantic system colors | HIGH |
| A4 | Tap targets below 44pt | HIGH |
| A5 | Custom tab bar without proper accessibility traits | HIGH |
| A6 | Missing VoiceOver labels on interactive controls | CRITICAL (a11y) |
| A7 | No `@Environment(\.accessibilityReduceMotion)` check | HIGH |
| A8 | Phone layout stretched to iPad without adaptation | MEDIUM |
| A9 | Missing haptic feedback on significant interactions | LOW |
| A10 | Custom modal overlay instead of `.sheet()` / `.fullScreenCover()` | MEDIUM |

### Android / Material (10)

| # | Pattern | Severity |
|---|---------|----------|
| AM1 | Phone-only layout with no adaptive behavior for tablets/foldables | MEDIUM |
| AM2 | Bottom navigation on expanded window widths (should be rail/drawer) | MEDIUM |
| AM3 | Touch targets below 48dp | HIGH |
| AM4 | Custom components replacing Material defaults without preserving semantics | MEDIUM |
| AM5 | Ignoring window size class changes on configuration change | MEDIUM |
| AM6 | No Compose accessibility semantics on custom composables | CRITICAL (a11y) |
| AM7 | Configuration change causing state loss or crash | CRITICAL (bug) |
| AM8 | Standard Material components with semantics stripped | HIGH |
| AM9 | Bottom sheet without proper gesture/keyboard/back handling | HIGH |
| AM10 | FAB for non-primary actions | LOW |

## 11. AI Component Fingerprints (composition-level)

The catalogue above indexes tells by property (color, type, layout). This section indexes the *repeatable component compositions* AI produces identically every time -- the specific badge, hero, footer, and dashboard shapes. Each one maps to tell IDs above where they agree (agreement across catalogues is signal). Each can be used when appropriate; using ALL of them together on one page is what creates the "AI-generated" look. Unless the user requests the specific pattern, vary the approach.

**Badge pill above hero headings** (= V4). A small colored pill (`rounded-full px-3 py-1 text-sm bg-primary/10`) above the main headline with "Introducing...", "New", "AI-Powered", or a sparkle icon. *Instead:* skip the badge unless there is a real announcement; if announcing, use a less formulaic treatment (a colored underline, a sidebar callout, an inline label). **MEDIUM.**

**Gradient text on hero headings** (= V5). `bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent` applied to one or two words ("Build **Better** Faster"). The gradient-text span is a v0/Claude signature. *Instead:* size contrast, weight contrast, a single flat accent on one word, or serif/sans mixing within the headline. The typography should be the design, not a CSS gradient trick. **HIGH.**

**Decorative blur blobs** (= C11). `absolute -z-10 w-72 h-72 bg-purple-300 rounded-full blur-3xl opacity-20` scattered behind sections. Purely decorative, adds no information. *Instead:* solid color blocks between sections, subtle texture/grain at 2-5% opacity, real photography, or white space. **LOW.**

**The frosted-glass navigation bar** (= L6, Strongest-10 #2). `bg-white/80 backdrop-blur-md border-b sticky top-0 z-50` with `h-16`, 4-6 nav links, and a top-right CTA. The strongest single-component AI fingerprint. *Instead:* vary the nav height, skip the blur when it doesn't serve the design, use dropdowns/mega-menus for complex sites, or try a sidebar. **HIGH.**

**Two-button CTA group** (= V6). Always one filled primary ("Get Started") + one ghost/outline secondary ("Learn More"), centered below the subtitle. AI never generates a single CTA, never three. *Instead:* sometimes one CTA is enough, sometimes none; vary button styles, sizes, and placement to fit the page. **MEDIUM.**

**Stats row** (= S12, L10). 3-4 cards with a big number, a label, and a green/red percentage change ("$45,231.89", "+20.1% from last month"). The exact value "$45,231.89" originates from shadcn/ui's dashboard example. *Instead:* stats relevant to the actual product; vary the treatment (sparklines, gauges, contextual benchmarks); skip the percentage change if the number tells the story. **HIGH** -- rated on the L10 basis (a generic-dashboard stats row is HIGH in section 18); a lone S12 stat-card value in isolation is LOW per section 18, so this HIGH applies to the full verbatim stats-row composition, not a single number.

**The "alternating left-right" feature rows** (= L11). Feature sections alternating text-left/image-right, then image-left/text-right, repeating -- same structure, just flipped. *Instead:* vary section layouts; some features deserve a full-width demo, some only text, some a grid. **MEDIUM.**

**Wave / curved section dividers** (= L12). SVG wave or curved shape between sections, usually light gray or primary at low opacity. *Instead:* background color changes, horizontal rules, generous white space, or no divider at all. **LOW.**

**Identical footer structure** (= Strongest-10 #10). 4 columns: Brand + description + social icons, then "Product", "Company", "Legal" link groups; dark background (`bg-gray-900`); always "All rights reserved"; always the same 4 social icons (Twitter, GitHub, LinkedIn, Discord). Appears in 80%+ of AI sites. *Instead:* match footer tone to the design (light footers exist); vary column count and grouping to the real sitemap; include newsletter signup, addresses, or trust badges when relevant; skip "All rights reserved" (legally redundant). **HIGH.**

**Dashboard layout trinity** (= L10, Strongest-10 #3). `w-64` dark sidebar + `h-16` header with search + bell + avatar + 4 stats cards + Recharts chart + "Recent Orders" table. This exact layout appears across every AI dashboard generation. *Instead:* custom sidebar width based on nav depth; collapsible icon-only mode; stats relevant to the actual domain; a chart library matching brand colors; real empty states when data is absent. **HIGH.**

**Uniform spacing scale.** AI uses the same spacing everywhere: `p-6` card bodies, `gap-8` between cards, `py-20` section padding, `mt-2`/`mt-4`/`mt-6`/`mt-8` between elements. The mechanical regularity is a tell (see also L7, D12). *Instead:* base spacing on a deliberate scale (4px grid) but vary by context -- dense data sections tighter, spacious hero sections more generous. **MEDIUM.**

**Identical testimonial cards** (= V10). Always 3 cards, 5 yellow stars, 2-3 sentence hyperbolic quotes, circular `w-10 h-10` avatar, names from a small pool ("Sarah Johnson", "Michael Chen"), always "CEO at TechCorp." *Instead:* mix star ratings (4.5, 4.8) for authenticity; real photos; one large testimonial with supporting smaller ones; embedded real tweets or third-party reviews; specific metrics ("Saved 40 hours/month") over generic praise. **MEDIUM.**

**Pricing table convention** (= S11). Always 3 tiers; middle one highlighted with a "Most Popular" floating badge (`absolute -top-3 rounded-full`); monthly/annual toggle saving "20%"; checkmark feature lists. *Instead:* vary tier count to the real product (2 or 4 work too); use a comparison table for detailed differences; lead with the recommended plan; use non-round pricing ($27, $147). **HIGH.**

**Skeleton / loading defaults** (= S10, D9). CSS border spinner (`animate-spin border-4 border-t-primary`) or `animate-pulse bg-gray-200` skeletons with fractional widths (`w-3/4`, `w-1/2`). The stepped-fraction pattern is a strong tell. *Instead:* custom branded loaders; shimmer/gradient skeletons over pulse; progressive loading; context-specific skeleton shapes matching the actual content layout. **MEDIUM.**

**404 / error page formula.** Giant gray "404" (`text-8xl text-gray-200`), "Page not found", "Sorry, we couldn't find...", "Go home" + "Go back" buttons, no illustration, no personality. *Instead:* a custom illustration or animation; brand-consistent messaging with personality; contextual suggestions (search, popular pages); an error-reporting mechanism. **MEDIUM.**

**Social-proof notification toasts** (= V7). "John from NYC just signed up 2 minutes ago" popups in the bottom-left, auto-dismissing after 3-5s. A dark pattern borrowed from Fomo/UseProof and reproduced as a default "engagement" element. *Instead:* skip entirely unless the product genuinely benefits from real-time activity signals; if used, show real data, not fabricated names. **HIGH.**

**Chat widget bubble** (= V8). A circular button (`fixed bottom-4 right-4 rounded-full w-14 h-14 bg-indigo-600 shadow-lg`) with a chat icon, always bottom-right, often with a subtle bounce on load, and no chat system behind it. *Instead:* only add it if there is an actual chat system; a non-functional chat bubble is demo-ware. **HIGH.**

**Dot/grid background patterns** (= V9). CSS `radial-gradient(circle, #e5e7eb 1px, transparent 1px)` with `background-size: 20px 20px` behind hero sections; decorative, adds no information. *Instead:* a solid background, a photograph, a subtle texture, or white space; use a grid pattern only when it serves a purpose (graph-paper aesthetic for a data tool). **LOW.**

**The SaaS landing-page sequence** (= L1). AI produces pages in this exact order regardless of project type: nav, hero, logo bar, stats row, feature grid, alternating L-R features, testimonials, pricing, FAQ accordion, CTA repeat, footer. A restaurant, portfolio, e-commerce store, and SaaS product all get the same structure. *Instead:* let the content determine the structure -- a portfolio leads with work samples, a restaurant with the menu or a reservation CTA, an e-commerce site with products. **CRITICAL when the scaffold is unmodified (per section 18); HIGH when partially customized.**

## 12. The Missing States Problem

AI generates only the "happy path" view. Production interfaces need all of these, and the empty and error states should be designed *first*:

- **Empty states:** what the dashboard shows with zero data. Guide the user to their first action; give it product voice (see D20). Design this before the populated view.
- **Error states:** what happens when the API fails. Show degraded or offline experiences with recovery actions, not a blank screen.
- **Loading states:** beyond a spinner -- skeleton screens matching the actual layout, or progressive loading where content appears as it arrives.
- **Edge cases:** very long names, very short content, empty strings, extreme values, unusual/missing optional data.
- **Onboarding:** how a new user understands the interface -- the first-use experience with contextual guidance, not just the populated veteran view.
- **Responsive intermediates:** not just desktop and phone; also tablet, split-screen, and unusual viewports (see `references/review/03-viewport-matrix.md`, and `references/responsive/01-fluid-and-intrinsic-sizing.md` for the fluid and intrinsic sizing method). The states above have to hold at every width in the range, not only at the two the design was drawn at: an empty state that reads well at 1440px and clips at 380px is still a missing state.

**Rule:** design the empty state and error state before the populated state. If they don't exist, the design is incomplete. **Severity: HIGH** for any production interface shipping happy-path-only.

## 13. Dark Mode: Bias and Failures

**Dark-mode bias.** AI disproportionately generates dark mode because dark screenshots look more "modern" and the purple-blue gradient aesthetic works better against dark backgrounds. The result: dark mode delivered without light mode, or light mode as a broken afterthought. *Rule:* if the project needs theming, design both modes intentionally -- neither is a derivative of the other (see C16). **MEDIUM.**

**Dark-mode implementation failures** (the UI-visible subset of the frontend engineering tells; the framework-level detail lives in anti-slop's domain):

- Hardcoded hex colors instead of CSS variables -- components become invisible when the theme changes. **HIGH** (functional break).
- Pure black `#000000` backgrounds cause halation on OLED (use `#0f172a` to `#1e293b`, or the OKLCH warm/cool darks from C1). **MEDIUM.**
- No `prefers-color-scheme` detection; a toggle-only implementation that ignores the OS setting. **MEDIUM.**
- Flash of the wrong theme on page load (theme read from `localStorage` too late). **MEDIUM.**

## 14. Design System Integration Drift

The UI-visible half of the "AI ignores the design system" problem. When a token system exists, hardcoded values are a tell that the output was generated in isolation.

- **Hardcoded values vs tokens.** AI writes `padding: 12px` when the system defines `--space-200: 8px` / `--space-300: 12px`. One project found 418 hardcoded values across 28 files. Use the design tokens; audit with automated checks. **HIGH** when a token system exists and is bypassed.
- **Cross-session drift.** Each AI session starts fresh: session 1 picks `#2563EB` for links, session 5 picks `#3B82F6`, and by session 10 the prototype has five different blues. Define tokens in a single source file and reference them everywhere. **HIGH.**
- **Component-library defaults.** Unmodified shadcn/ui, Material UI, or Ant Design produce instantly recognizable interfaces -- the same dialog, popover, dropdown, toast, and data table across thousands of projects. Customize border colors, radii, shadows, and transitions so the interface doesn't look like the library's documentation site (see section 4). **HIGH.**
- **Icon inconsistency.** AI mixes Lucide, Heroicons, FontAwesome, and Material Icons in the same project, creating mismatched stroke weights, corner radii, and visual density. Standardize on one set (see S4). **MEDIUM.**

## 15. Demo-ware and Happy-Path UX

AI produces interfaces that look complete but collapse under use. These are functional defects, not aesthetic preferences.

- **Demo-ware:** buttons with empty `onClick` handlers, forms that display "Success!" without sending data, toggles that animate but don't persist state, search bars without search logic, pagination without page switching. Test every interactive element for actual functionality, not just visual presence. **HIGH** (the UI is a facade).
- **Forms without validation states:** markup with no error states, required-field indicators, success messages, or loading states -- the "happy path only" problem. A production form must include required-field indicators, inline validation with `aria-describedby` linking errors to inputs, error-state styling, a submit-button loading state, success/failure feedback via an `aria-live` region, `autocomplete` on personal-data fields, and `fieldset`/`legend` for grouped controls. **HIGH.**
- **Forms that lose state:** AI forms lose data on browser back/forward, refresh, and login redirects. Persist multi-step form state to `sessionStorage`; preserve input on validation failure. **MEDIUM.**
- **Modal overuse:** modals interrupt context. Use them only when the user must finish a task before continuing; for content viewing, navigation, or multi-step flows use a page or slide-over. When using modals: move focus in on open, trap focus, close on Escape, return focus to the trigger on close, prefer the native `<dialog>` element, and prevent background scroll without CLS (`scrollbar-gutter: stable`). **MEDIUM.**
- **Search without debounce:** AI fires an API call on every keystroke. Add a 300ms debounce, an AbortController for race conditions, and handle empty results with suggestions rather than a blank page. **MEDIUM.**
- **Toast/notification failures:** the `aria-live` container must exist in the DOM at render (not created dynamically); use `polite` for routine updates and `assertive` for urgent alerts; don't auto-dismiss toasts containing interactive elements; position toasts to avoid covering content or overlapping the mobile keyboard. **MEDIUM.**

## 16. Deep Cuts: Subtle Tells That Catch Out Even Careful Teams (D1-D20)

The catalog above covers the obvious. The list below catches teams that overrode the defaults but still left fingerprints in the second-order details. (Each "why" carries its own remediation inline.)

| # | Pattern | Why it reads as AI |
|---|---------|--------------------|
| D1 | Border-radius `8px` on every interactive control | The shadcn `--radius: 0.5rem` default. Pick `0`, `2`, `6`, or `12` deliberately |
| D2 | Hover transitions all `transition-all duration-200` | Animates everything including padding/border, causing layout twitches. Specify properties: `transition: background-color 150ms, transform 100ms` |
| D3 | Shadow scale `shadow-sm`, `shadow-md`, `shadow-lg` used in arithmetic progression | Tailwind defaults. Tune your own elevation scale matched to surface tone |
| D4 | Every divider is `border-t border-border` (1px solid) | Vary: hairline gradient, dotted, or whitespace-only |
| D5 | Every `<Avatar>` is a perfect circle with initials in `bg-muted` | Square with rounded-corner (4-6px), or hexagon, or asymmetric crop, or actual photo |
| D6 | Tooltip transition fades in over 200ms with no offset | Tooltips should snap (50-100ms) or rise on a slight Y-translate. Default fade reads as Radix-default |
| D7 | All cards have the same hover treatment (slight shadow lift + scale) | Cards that lead to different actions should have different hover states |
| D8 | Form errors all appear below input in red text | Vary: inline icon + tooltip for inline errors, panel for form-level errors, modal for blocking errors |
| D9 | Loading spinner is the Lucide `Loader2` with `animate-spin` | Custom branded loader, or shimmer skeleton, or progressive content reveal. The Loader2 spinner is a top-20 fingerprint |
| D10 | All section h2 are the same size with the same `mb-4` to subhead | Vary section openings -- some lead with quote, some with image, some with stat. Mechanical "h2 + subhead + content" is a tell |
| D11 | Content max-width is `max-w-7xl` (the Tailwind constant) | Custom max-width matched to type scale. Editorial: `65ch`. Dashboard: full-bleed minus sidebar. Marketing: `1240px` or whatever your hero design needs. Express it as `width: min(100% - 2rem, 65ch)` so the gutter survives narrow viewports without a media query |
| D12 | Container padding is always `px-4 sm:px-6 lg:px-8` | Tailwind responsive container reflex: three quantised steps standing in for a value that should vary continuously. Replace it with one fluid expression, `padding-inline: clamp(1rem, 0.5rem + 2vw, 3rem)`, and use container queries for component-level adjustments. Do not "fix" this by collapsing to a single fixed padding -- that trades three widths that work for one |
| D13 | Every page section ends with a centered CTA button | Marketing reflex from training data. Some sections lead to action; some lead to the next section. Vary |
| D14 | Hero subhead is `text-xl text-muted-foreground max-w-2xl mx-auto` | Centered narrow-column subhead is the strongest hero formula tell. Left-align it; let it break the column width |
| D15 | Footer has 4 columns with `Product / Company / Resources / Legal` headers | This footer structure appears in 80%+ of AI sites. Match footer to the actual sitemap |
| D16 | Navigation logo on left, links centered, CTA on right | The Tailwind nav template. Left-aligned logo + left-aligned links + right CTA is one valid alternative |
| D17 | Search input with `<Search />` icon on the left, placeholder "Search..." | Vary placeholder ("Find an issue", "Search invoices") and consider a keyboard-shortcut hint (`Cmd K`) instead of a permanent input |
| D18 | Settings page is a `Tabs` component with sections inside | Sidebar nav with detail-pane is denser; vertical scroll with section anchors is more scannable. Pick what fits |
| D19 | Date picker is a calendar grid in a popover | If users always pick "today" or "next week", offer those as buttons before showing the calendar |
| D20 | Empty state is `<EmptyState icon={...} title="No X yet" description="..." action={<Button>Create X</Button>} />` | Empty state should have voice. Tactical: minimal. Editorial: copy. Workshop: illustration. Default-EmptyState component is a tell |

## 17. The Strongest 10 AI Fingerprints (Ranked)

The patterns most reliably marking output as AI-generated. All three source catalogues (typescript-ui, anti-slop, ui-review) independently ranked *the same ten fingerprints in the same order* -- that convergence is itself strong evidence of what to look for first. None are wrong individually; together with no variation they create the "AI house style." The CSS/code signature and detection method are merged in from the ui-review detection column.

Every row carries an **Instead** column. A Strongest-10 row is presence-flaggable (see "How to apply" above), which makes a missing remediation dangerous: a reviewer who can only name the offence will reach for deletion, and for several of these rows deleting the construct is worse than shipping it. Never write one of these findings without naming the row's Instead.

| Rank | Fingerprint | CSS / code signature | How to detect | Instead |
|------|-------------|----------------------|---------------|---------|
| 1 | `rounded-xl shadow-sm border` on every Card | `rounded-xl shadow-sm border` on every `Card` | Count Card components with identical border+shadow+radius treatment | Pick one grouping device per surface type: borderless with a background shift, a hairline divider, or a full-bleed section. Reserve border + elevation for genuinely interactive grouped content (S3) |
| 2 | Frosted-glass sticky navigation bar | `bg-white/80 backdrop-blur-md border-b sticky top-0 z-50` | Check nav for `backdrop-filter` + sticky + opacity combo | Vary the nav height; drop the blur unless it is doing real work keeping type legible over moving content; a static header, a sidebar, or a mega-menu are all valid. Not every site needs a sticky nav (L6) |
| 3 | Dashboard sidebar + header template | `w-64` dark sidebar + `h-16` header + search + bell + avatar | Compare layout against the shadcn dashboard demo | Sidebar width from actual nav depth, collapsible icon rail, stats drawn from the real domain, chart styling matched to brand, real empty states (L10) |
| 4 | All-caps tracking-wide subtitles / overlines | `text-xs uppercase tracking-wider` on table headers, section labels | Search for the `uppercase tracking-wider` pattern | Small-caps via `font-feature-settings: 'smcp'` at `tracking-wide` (not `widest`), which keeps screen-reader pronunciation intact where `text-transform: uppercase` on an already-capitalised string does not, or drop the overline and let the heading carry the section (T5) |
| 5 | "Most Popular" pricing badge | `absolute -top-3 rounded-full` badge on the middle tier | Check pricing sections for floating badges | Lead with the recommended plan at full size and de-emphasise the others, or use a comparison table; vary tier count to the real product (S11) |
| 6 | Icon in tinted oval/square background | `bg-primary/10 w-12 h-12 rounded-lg` (or `rounded-full`) icon containers | Count colored background containers wrapping icons | Unwrapped icons at a consistent optical size, aligned to the type baseline; if the icon needs emphasis, put it in the stroke weight or the accent color, not in a tinted container behind it (V1) |
| 7 | Pulse skeleton with fractional widths | `animate-pulse bg-gray-200 w-3/4` stepped fractions | Search for `animate-pulse` with `w-1/2`, `w-3/4` | Skeleton shapes that match the real content geometry, shimmer instead of pulse, or direct render for anything under 300ms. Honour `prefers-reduced-motion` on the shimmer (S10, M6) |
| 8 | Black-overlay modal | `bg-black/50` overlay + `max-w-md p-6 rounded-xl` dialog | Check modal/dialog overlay opacity and style | Brand-tinted overlay such as `oklch(0.05 0.01 280 / 0.6)`; the native `<dialog>` element so focus trapping and Escape come for free; size the panel to its content instead of `max-w-md` (C13, section 15) |
| 9 | The verbatim Tailwind hero triplet | The exact unmodified run `text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight` on the hero `h1` | Grep the hero `h1` for that exact class run: all of `text-4xl`, `sm:text-5xl`, `lg:text-6xl`, `font-bold`, `tracking-tight`, unchanged and in that order. A scale using different steps, a fluid `clamp()`, or any tuned tracking is NOT this fingerprint | Replace the stepped ramp with a fluid one and tune the tracking: `font-size: clamp(2rem, 1.2rem + 3.2vw, 4.5rem); letter-spacing: -0.025em;` or a project scale in `--step-*` custom properties (T14, T8). **Never by removing the responsive sizing:** a single fixed heading size is a worse result than the triplet, and `references/responsive/01-fluid-and-intrinsic-sizing.md` carries the full ramp method |
| 10 | Four-column footer with standard sections | "Product / Company / Legal" + "All rights reserved" | Check footer column structure and text | Match footer columns and grouping to the real sitemap; light footers exist; add newsletter, address, or trust content when it is real; skip "All rights reserved" (D15) |

**What row 9 is and is not.** It is a *genericness* signal: the presence of the untouched copy-paste string that ships with every Tailwind hero example. It is not a rule against responsive type. The catalogue's positive prescription for heading scale is T14 (fluid `clamp()` ramp) and its position on fixed alternatives is P2 and L13, all of which require the size to keep varying with the viewport. If a review of a hero heading ends with less responsive behaviour than it started with, the review was wrong.

## 18. Severity Classification

Used by the taste-checklist (`references/aesthetic/03-taste-checklist.md`) and the pre-ship audit. Anything CRITICAL blocks ship; anything HIGH blocks launch.

| Severity | Tells |
|----------|-------|
| **CRITICAL (block ship)** | C15 hex-not-OKLCH, T1/T2/T3 Inter/Roboto/Newsreader+JBM as primary, S1/S2/S3 default shadcn unmodified, S5 "Button" copy, W1 lorem ipsum, S4 Lucide everywhere, U3 default focus ring, M6 ignored prefers-reduced-motion, U8 spinner without label, L1 generic SaaS scaffold, icon-only buttons without accessible labels, the top 3 of the Strongest-10 unmodified; platform: P4 disabled zoom, P8 div-onclick, A6 missing VoiceOver labels, AM6 missing Compose semantics, AM7 config-change crash |
| **HIGH (fix before launch)** | Cream+serif+sage combination, C1/C2 pure black/white, C3/C4 AI-purple-family primary + indigo/teal pairing, L13 fixed-pixel shell that cannot resize, C5/C6 default gradients, C18 neon/colored-glow shadow, T4 Geist unmodified, T8 untuned letter-spacing, T10 centered hero, L2 centered everything, L4 equal-column grid, L6 frosted nav verbatim, L10 generic dashboard, S6 placeholder-as-label, S11 "Most Popular" badge, W2/W5 SaaS-speak, U7 double-close-button, missing empty/error states, demo-ware non-functional controls, hardcoded-values-vs-tokens drift, V1 oval icon backgrounds, V5 gradient hero text, V7 social-proof toast, V8 non-functional chat widget, the rest of the Strongest-10; platform: P9/P10/P11/P12/P13/P15 web a11y, A2/A3/A4/A5/A7 Apple, AM3/AM8/AM9 Android |
| **MEDIUM (taste improvements)** | C7 untuned neutrals, C9 glassmorphism (only when everywhere/without purpose), C12 uniform shadow, C16 mirror dark mode, T5 all-caps overlines, T6 display numerals, T7 two-weight stack, T11 single-line giant headline, T12 14px body, T14 stepped type scale where a fluid ramp belongs, L3 bento-as-default, L7 padding overload, L11 alternating L-R features, M1 fade-on-scroll, M2 wrong-energy motion, S7 default toast, U10 ambiguous dates, dark-mode bias, uniform spacing scale, V2/V3 edge/left-border highlights, V4 badge pill, V6 two-button CTA, V10 testimonial cards, I7 flat-vector illustrations, 404 formula, skeleton defaults, form-loses-state, modal overuse, search-without-debounce; platform: P1/P2/P3/P5/P6/P14, A1/A8/A10, AM1/AM2/AM4/AM5 |
| **LOW (depends on context)** | C11 blur blobs, C13 black overlay, L8 logo marquee, L9 stat counters, L12 wave dividers, M3 slow page transitions, M5 hover-scale-everywhere, S10 skeleton-on-fast-load, S12 demo stats, U1 trailing colons, I1-I6 image tells (heavily project-dependent), V9 dot/grid background; platform: P7, A9, AM10 |

## 19. How AI Design Fails Slip Past Taste Audits

Even teams that read this file ship work with visible AI tells. The failure modes are predictable.

| Failure mode | What happens | Counter |
|--------------|--------------|---------|
| Override-by-checkbox | Team overrides every shadcn token but picks values close enough to the defaults that the result is indistinguishable. `--primary` set to `oklch(0.55 0.18 280)` is still hashtag-purple | Compare your tokens against the OKLCH replacement table above. Be at least 30 hue degrees from the AI default |
| POV inheritance from the prompt | "Make it modern and clean" -- the AI's interpretation is the median of its corpus = AI default. The team accepts the first output | Write the POV brief BEFORE prompting. Constrain hard ("no purple, no Inter, dense like Linear") |
| Accept-then-tweak | First pass is shadcn-default. Team tweaks colors and ships. The structure (composition, copy formulas, component arrangement) is still AI default | Restructure the page composition first. Don't tweak -- recompose |
| Component-by-component aesthetic | Each component looks fine on its own. Together they don't share DNA | Coherence audit: print all components on one sheet. Do they look like a system? |
| Marketing matches product POV but flatter | A Tactical Operator product gets a Tactical Operator marketing site. Marketing usually wants more breath | Marketing/product split. Two POVs in one company is normal (Stripe, Vercel) |
| Copy gets a final pass that adds SaaS-speak | Designer ships, marketer "improves" the copy, "leverage" appears | Lock copy in the design phase. Revisions go through the designer |
| Lucide stays because "we don't have time to swap icons" | The fastest single-component AI fingerprint to fix | Replacing 20 Lucide icons with Phosphor takes 30 minutes. Always worth it |
| Designer accepts AI output verbatim because "it's good enough" | The "good enough" bar is the problem | Ship "different from AI default" not "good enough" |
| Reviewer doesn't know the tells | Code review approves visible tells because the reviewer hasn't read this file | Make this file required reading for any UI PR review |
| Tasteful-default swap | Team drops purple, reaches for cream + serif + sage, ships "tasteful" | That is now a faster tell than purple. Anchor to a real brand/reference, not the current tasteful average |

## 20. The "Show This to a Designer" Test

The final filter before shipping. Find a working designer (not a developer) who has built brand-shaping work for a real product. Show them three screenshots of your design with no context. Ask:

| Question | What a pass looks like |
|----------|------------------------|
| "What is this product?" | They guess the category correctly from visual signals |
| "Who is this for?" | They infer audience density, expertise level, tone |
| "What three words describe the design?" | They pick adjectives, not "modern" or "clean" |
| "Anything that looks AI-generated?" | They name nothing, or name only deliberate choices you can defend |
| "What's the one thing you'd change?" | Their answer reveals what's weakest in the POV |

If the designer can't answer most of these confidently, the design hasn't earned identity. Restart from the POV worksheet (`references/aesthetic/01-point-of-view.md`) and rebuild from the brief. The cheaper standing version of the same filter is the **logo-swap test**: cover the logo and ask whether the page could belong to any other product. If yes, it has no identity.

## Cross-References

| Need | File |
|------|------|
| Which tells the corpus data actually supports (and which it cleared) | `references/catalogue/02-empirical-evidence.md` |
| How to fix the underlying problem (commit to a point-of-view) | `references/aesthetic/01-point-of-view.md` |
| Distinctive systems to study (and not over-imitate) | `references/aesthetic/02-distinctive-systems.md` |
| Pre-ship audit checklist | `references/aesthetic/03-taste-checklist.md` |
| Color / OKLCH deep reference | `references/design/01-color-oklch.md` |
| Typography deep reference | `references/design/02-typography.md` |
| Motion heuristics and spring params | `references/design/04-motion.md` |
| shadcn customization | `references/design/06-shadcn-customization.md` |
| WCAG 2.2, touch targets, per-platform a11y comparison | `references/accessibility/01-wcag-2-2.md` |
| Web / Apple / Android platform overlays | `references/platform/01-web-overlay.md`, `references/platform/02-apple-overlay.md`, `references/platform/03-android-overlay.md` |
| Core Web Vitals and perf-degrading design choices | `references/performance/01-core-web-vitals.md` |
| Viewport matrix for responsive intermediates | `references/review/03-viewport-matrix.md` |
| Fluid and intrinsic sizing method (`clamp()` ramps, container queries, `dvh`, safe-area insets, intrinsic grids) -- the positive prescription behind T14, L13 and P1-P3 | `references/responsive/01-fluid-and-intrinsic-sizing.md` |

The framework-engineering anti-patterns that used to be cross-referenced out of this catalogue (React `useEffect` misuse, z-index stacking, font-loading mechanics, bundle/tree-shaking) are intentionally out of scope here -- they belong to code review, not the visual-tell catalogue. Their UI-visible consequences (dark-mode failures, demo-ware, design-system drift) are folded into sections 12-15 above.
