---
topic: design
role: reference
scope: image-to-code-replication
audience: ui-designer
---

# Image-to-Code Replication

Structured extraction method for reproducing a screenshot, mockup, or design export in code with exact fidelity. The reference image is the specification; the code is a translation. The replicator is a translator, not a designer -- every visual decision (size, spacing, color, radius, shadow, proportion) comes from the image, never from preference. Small extraction errors compound into "it looks off," so the method front-loads measurement before any code exists.

Adapted from [VibeCurb](https://github.com/Yu-369/VibeCurb) (MIT, Copyright (c) 2026 Yu-369), curated and merged with this library's conventions.

## 1. Intake: classify before extracting

State what the image is before reading it: image type (full page / section / component / mobile / desktop / design-tool export), sections visible top-to-bottom, estimated target viewport width, fidelity (high-res export vs compressed screenshot -- compression artifacts are not design decisions), theme. Then write a 3-5 line extraction summary in structured prose naming layout, palette, type direction, and component language. If something is unreadable -- nav links too compressed, ambiguous font -- ask for a closer crop or the live URL rather than guessing. Do not invent sub-pixel detail from a blurry source.

## 2. The seven extraction layers

Run all seven; each is a sheet filled with measured values, not assumptions.

**Layer 1 -- Layout grid.** Container max-width (measure by proportion against viewport edges -- the most common replication error; `max-w-[1200px]` vs `max-w-[1440px]` changes every whitespace relationship), column system and ratios (`1.5fr 1fr` when one column reads 1.5x the other), horizontal padding, section heights, per-section alignment, z-axis overlaps. Proportion heuristics: a heading occupying ~60% of a 1440 viewport is roughly `max-w-[54rem]`; empty space above a heading at ~2x its cap height is ~`2em` relative padding.

**Layer 2 -- Typography (the highest-stakes layer).** Fill family/weight/size/line-height/tracking/transform/color for EVERY visible text role (nav, eyebrow, h1, h2, card title, body, caption, CTA, footer). Identify faces by their distinguishing characters:

| Character | What it discriminates |
|---|---|
| lowercase `a` | single-story (Geist, Helvetica) vs double-story (Outfit, Satoshi, DM Sans) |
| lowercase `t` | curved crossbar (humanist) vs straight (geometric) |
| capital `R` | straight leg (grotesque) vs curved leg (geometric) |
| capital `Q`, numerals `1 4 6 9` | strongly face-specific shapes |
| lowercase `e` | high crossbar (geometric) vs centered (humanist) |

Below confident identification, state the top 2-3 candidates with the discriminating character, default to the closest available face, and structure the CSS so one `--font-display` swap corrects it. Never assume a heading is `700` because headings are bold -- premium designs often set display faces at `500`-`600`; judge stem thickness against counter space.

**Layer 3 -- Color.** Extract hex per role (bg primary/secondary, text primary/secondary/tertiary, accent + hover, border, shadow tint). From compressed screenshots: sample the largest flat area, never edges; snap to common web values (`#0b0b0b` sampled is almost certainly `#0a0a0a`); verify text/bg pairs against WCAG AA afterward as a sanity check on the sampling. The gap between `#FFFFFF` and a warm `#F5F0EB` is the gap between two different designs -- do not default to pure values unless the reference genuinely shows them.

**Layer 4 -- Spacing.** Base unit (smallest repeated gap), button padding both axes, card internal padding, grid gaps, heading-to-subtext and subtext-to-CTA gaps, nav height. Measure section padding top and bottom INDEPENDENTLY -- optical balance frequently makes them unequal (`pt-20 pb-28`), and assuming symmetry is a systematic drift source.

**Layer 5 -- Component inventory.** Per component (buttons, cards, inputs, badges, avatars, nav, dividers): radius, border, shadow, background, visible states, icon style. Identify the radius LANGUAGE (sharp / subtle 4-8px / rounded 12-16px / pill / deliberately mixed) -- radius mismatches are detected by eye faster than color or spacing errors.

**Layer 6 -- Atmosphere.** Grain (sampled grain usually reads 0.03-0.05; anything above that is more likely a compression artifact than a design decision, and 0.05 is this library's ceiling either way -- `design/10-hero-and-section-architectures.md` §3), ambient glows (position, spread), backdrop blur (which elements, how much), gradients (direction, stops), tinted shadows, scrims, background patterns. Extract only what the reference shows -- adding atmosphere it does not have is interpretation, not replication, and so is omitting what it has.

**Layer 7 -- Responsive and interaction inference.** A static image still declares behavior: multi-column implies single-column collapse; a sticky-looking nav implies `position: fixed` + blur; elements composed "mid-landing" imply an entry stagger; bordered cards imply border/background hover shifts; dot rows imply carousels. Write the inferences down so they are implemented deliberately.

## 3. Build order

Tokens first (all Layer 2-5 values as custom properties), then layout skeleton (Layer 1 boxes, no content), then the typography pass, components, spacing verification, atmosphere, responsive collapse, and interaction states last. Each step depends on the previous; spacing errors found late usually trace to a skeleton built before the grid was measured. Do not round extracted values to convenient ones -- `15px` body text is `0.9375rem`, not `1rem`; rounding accumulates across a page. Interactive states the image cannot show still ship: hover, focus-visible, active on every interactive element, per this library's standing rules.

## 4. Artistic assets: classify, never approximate

The #1 replication failure: CSS standing in for art. Classify every visual element:

| Element | CSS-reproducible? | If not |
|---|---|---|
| Flat color, gradients, geometric shapes, icons | Yes | -- |
| Photographs | No | Source or generate a mood/palette/composition-matched image |
| Hand-drawn illustration, brush strokes | No | Generate or source in matching style -- a diagonal CSS gradient is not a brush stroke |
| Organic textures (marble, fabric, water) | No | Real image asset, scale-matched |
| 3D renders | No | Matching render or placeholder with similar lighting/angle |

An imperfect stand-in image is closer to the reference than any CSS approximation of art; geometric CSS has a fundamentally different visual quality than photography and the eye detects it instantly. Place assets with `object-fit: cover` + an `object-position` matched to the reference's focal point, radius inherited from the container.

## 5. The replication diff

Before delivery, walk the implementation against the reference category by category -- layout (count, order, proportions, alignment), typography (face rendering, size against viewport, weight, leading, tracking), color (per-role match, no unexpected shifts), components (radius language, padding, state styling), spacing (each measured gap, top/bottom independence), atmosphere (present exactly where the reference shows it) -- plus the standing technical floor: zero console errors, fonts loaded, no horizontal overflow at any width, hover/focus states, viewport units per `responsive/01-fluid-and-intrinsic-sizing.md` §7 (not bare `vh`), reduced-motion respected. Any category that fails blocks delivery; "close" compounds.

Evidence discipline for review findings on a replication is owned by `review/02-evidence-pipeline.md` -- claims of pixel divergence need geometry, not squinting.

## 6. Edge cases

- **Multiple references:** extract each independently, confirm one design system spans them; on conflict ask which is authoritative. Desktop + mobile pairs: desktop owns the system, mobile owns the breakpoints.
- **Recognizable component library:** say so ("this is shadcn/ui"), ask library-vs-manual, and if library, theme it to match rather than fighting it (`design/06-shadcn-customization.md`).
- **Dynamic content in the shot:** reproduce appearance with realistic static data -- real-sounding names, organic numbers, no placeholder literals. The catalogue supplies the greppable ones: lorem ipsum (W1, CRITICAL), the fake-testimonial name pool ("Sarah Johnson", "Michael Chen", "CEO at TechCorp"), and the shadcn demo value `$45,231.89` (`catalogue/01-ai-tells.md`). Reproducing the reference's *shape* of data is the job; reproducing the corpus's stock names is a tell the reference never had.
- **The one sanctioned override:** an apparent `100vh` becomes `100svh` (conservative) or `100lvh` (backgrounds and full-bleed fills), per `responsive/01-fluid-and-intrinsic-sizing.md` §7 -- a browser-behavior correction, not a design deviation. Everything else defers to the reference, including where the reference contradicts the replicator's taste.

## See also

- `references/design/02-typography.md` -- face identification feeds this library's pairing/scale rules
- `references/design/06-shadcn-customization.md` -- when the reference IS a themed component library
- `references/design/09-token-drift-and-retints.md` -- keeping the extracted token system coherent
- `references/review/02-evidence-pipeline.md` -- geometry evidence for divergence claims
- `references/review/03-viewport-matrix.md` -- verifying the inferred responsive behavior
