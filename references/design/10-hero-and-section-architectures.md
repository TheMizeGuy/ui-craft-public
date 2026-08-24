---
topic: design
role: reference
scope: hero-section-architectures
audience: ui-designer
---

# Hero and Section Architectures

Named, committable layout architectures for heroes and every below-the-fold section type, with the typography, palette, and atmosphere specifications that separate award-tier landing pages from template output. Reference for structuring any marketing or landing surface; product/app UI is out of scope.

Adapted from [VibeCurb](https://github.com/Yu-369/VibeCurb) (MIT, Copyright (c) 2026 Yu-369), curated and merged with this library's conventions. Where a value here disagrees with a core reference (`design/02-typography.md`, `design/03-spacing-rhythm.md`, `catalogue/01-ai-tells.md`), the core reference wins.

## 1. The rule of one committed architecture

Pick ONE architecture per surface and commit. Blended architectures read as indecision; the generated look is five half-architectures on one page. The same rule governs the page: sections vary in architecture BETWEEN each other (see §5) while each section commits internally.

## 2. Hero architectures (pick one)

| Architecture | Structure | Best for |
|---|---|---|
| **Cinematic Center** | Full-viewport visual behind centered heading + one CTA; scrim gradient if text readability suffers | Dark cinematic brands, immersive launches |
| **Asymmetric Split** | Massive heading one side (55-65% width), support content vertically OFFSET on the other -- deliberate baseline tension, `grid-cols-[1.2fr_1fr]` | Bold agency, statement launches |
| **Full-Bleed Subject** | The photograph IS the hero; type overlaid bottom-left or bleeding across the bottom edge; scrim or `mix-blend-mode: difference` | Personal brands, fashion, editorial |
| **Typographic Poster** | No hero image; the heading at viewport-bleeding scale IS the graphic; lines positioned left/right for diagonal flow; mixed weights/italics inside one heading | Studios, portfolios, type-led editorial |
| **Inline-Image Typography** | Small pill-shaped images embedded BETWEEN words at x-height, as visual punctuation (`width: clamp(3rem, 5vw, 5rem); border-radius: 9999px; vertical-align: middle`) | Agency personality, editorial homepages |
| **Layered Depth** | 3-5 cards on a `perspective: 1200px` shelf: ONE focal card front-center at full opacity, supports receding symmetrically (`rotateY(±25deg) translateZ(-200px) scale(0.85)`) | Portfolio showcases, product demos |

Layered Depth failure mode: 8-10 cards scattered at random rotations. The shelf needs one focal card and symmetric recession -- Apple TV shelf, not a card explosion. Drop all 3D transforms below the tablet breakpoint; stack or show only the focal card.

## 3. Hero typography, palette, atmosphere

**Heading spec.** Display face (never a body face -- `design/02-typography.md` owns selection), fluid size, negative tracking, compressed leading:

```css
.hero-heading {
  font-size: clamp(2.5rem, 7vw, 8rem);
  letter-spacing: -0.03em;
  line-height: 0.95;
  text-wrap: balance;
  max-width: 18ch;   /* blocks 4+ line wraps */
}
.hero-heading--short { /* 1-3 word headings go bigger */
  font-size: clamp(4rem, 14vw, 18rem);
  letter-spacing: -0.05em;
  line-height: 0.85;
}
```

Support hierarchy: eyebrow at `0.75rem / letter-spacing 0.12em / uppercase / muted`; subtext at most ~20 words, `max-width: 45ch`, muted; ONE CTA (a second "Learn more" link halves the first CTA's weight and is a catalogue tell).

**Palette: three hues, hard cap.** Dark heroes: off-black `#0a0a0a` ground (pure `#000` is a dead surface that cannot hold atmosphere) + warm off-white text + one accent on at most 1-2 small elements. Light heroes: warm off-white ground + near-black `#1a1a1a` text + one accent -- and note the cream+serif+warm-accent combination is itself the current top emerging tell (`catalogue/01-ai-tells.md`), so a light hero needs its palette anchored to the brand, not to "tasteful."

**Atmosphere: never flat.** Two recipes that register without being seen:

```css
/* Ambient glow -- a light source, not a gradient */
.hero-dark::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 50% 40%, rgb(255 255 255 / 0.03) 0%, transparent 70%);
}
/* Film grain -- fixed so it never repaints on scroll; 0.04 = felt, not seen */
.grain::after {
  content: ''; position: fixed; inset: 0; pointer-events: none; opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

Atmosphere is additive texture on a committed palette -- distinct from the decorative blur-blob tell (a `rounded-full` + `blur-3xl` element standing in for design).

**Fit.** The whole composition (nav + heading + subtext + CTA + focal visual) fits one 1440x900 viewport. `min-height: 100dvh`, never `100vh` (`responsive/03` owns the viewport-unit rule). Entry animation per `design/04-motion.md` -- staggered fade-up, whole entry under 800ms, reduced-motion gated.

## 4. The persuasion sequence

A landing page is a persuasion sequence, not a parts bin. Section ORDER answers visitor objections in the order they arise:

```
HERO -> WHAT (features/value) -> PROOF (logos/testimonials/metrics) -> HOW (process)
     -> RESULTS (case studies/stats) -> PRICE -> OBJECTIONS (FAQ) -> FINAL CTA -> FOOTER
```

Not every page needs every section; the order is fixed. CTA appears 2-3 times total (hero, final, optionally one mid-page). The final CTA is its own section, never the footer. Before choosing sections, read the page: conversion goal, top three visitor objections in order, what the hero already established (palette, type, mood) -- sections continue the hero's system, never restart it.

## 5. Visual rhythm rules

The "wall of same" is the page-level tell -- every section `py-20`, centered heading, three-card grid, repeat. Rules that prevent it:

- No two adjacent sections share a layout direction (both centered, both split-left).
- Background tone shifts every 2-3 sections (`#0a0a0a -> #111 -> #0a0a0a`, or border-y separators) -- never five sections on one flat ground.
- One visual break per page: a full-bleed image, one giant stat, or a CSS marquee strip. Nothing else in it.
- Heading scale varies section to section; a monotone scale is a monotone page.
- Max two grid-based sections in a row; the third must break the pattern (asymmetric split, full-width, single column).
- Vertical padding varies by role: content-heavy sections generous, proof strips tight, visual breaks near-zero. One uniform `py-24` everywhere is `catalogue` territory (`uniform-section-padding`).

## 6. Section architectures by type

Pick one per section; the notes carry only what is specific to the type.

**Feature/value** -- (a) *Bento*: asymmetric grid where the primary cell spans 2x2 and cells vary in content type (visual in one, stat in another, quote in a third); uniform same-size icon-heading-text cells are the #1 layout tell. (b) *Stacked feature rows*: 2-3 features, each a full-width alternating split -- alternation must be visual (`lg:order-*`), DOM stays text-first for reading order; mechanical alternation down a long page is itself a tell, so cap it. (c) *Single spotlight*: one massive product visual, minimal text above.

**Proof** -- (a) *Logo strip*: one quiet row, grayscale at ~40% opacity, color on hover, band separators; no large "Trusted by" heading. (b) *Testimonial cascade*: 2-3 cards, ONE visually dominant (span 2 columns, larger quote); identical uniform cards are the proof-section tell; real names, roles, faces. (c) *Metric bar*: 3-4 large numbers with `font-variant-numeric: tabular-nums` (no layout shift under count-up), tiny labels, generous space. Specific numbers beat round ones ("12,847 teams" over "10,000+").

**Process** -- numbered vertical steps joined by a hairline for anything past 3 steps; the horizontal 3-box-with-arrows flow is the highest-slop-risk architecture and earns its place only for genuinely simple 3-step flows.

**Case studies** -- card gallery with VARIED aspect ratios (one tall, one wide) and client + one-line result on a scrim; or a single deep-dive (challenge | results-with-metrics split).

**Pricing** -- 2-3 tiers, recommended plan visually elevated, 6-8 features per card maximum (lead with differentiators, not shared features); comparison matrix only when the product genuinely has many differentiating features.

**FAQ** -- accordion, `grid-template-rows: 0fr -> 1fr` for the height animation (no JS measurement).

**Final CTA** -- one heading, one button. A CTA banner with three buttons, a form, and social links converts nothing.

**Footer** -- minimal strip (logo | links | social) for single-goal pages; the 4-column Product/Company/Legal dark footer is a fingerprint (`catalogue/01-ai-tells.md` Strongest-10 #10) -- match footer tone to the page and structure to the actual site.

## 7. Content floor

No placeholder text, no "[Feature Name]", no lorem. Copy specific over generic: "Process 10k API calls/sec" not "Lightning fast performance". Microcopy and banned-vocabulary rules are owned by `design/08-ux-writing.md` and the catalogue; this file adds only the structural rule that every section answers exactly one visitor question -- a section doing features AND testimonials AND pricing is three sections.

## See also

- `references/aesthetic/01-point-of-view.md` -- the POV commitment that makes any architecture distinctive
- `references/aesthetic/04-style-taxonomy.md` -- landing structures by style family and domain
- `references/design/02-typography.md` -- display-face selection, fluid scales
- `references/design/03-spacing-rhythm.md` -- the spacing scale the rhythm rules draw from
- `references/design/04-motion.md` -- entry choreography, spring palette, stagger
- `references/design/07-depth-and-overlays.md` -- scrims and text-over-image contracts
- `references/catalogue/01-ai-tells.md` -- the tells every architecture here must clear
