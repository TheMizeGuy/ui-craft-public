---
topic: aesthetic
role: reference
scope: brand-direction-reference-generation
audience: ui-designer
---

# Brand Direction and Reference Generation

Art-direction method for two pre-design lanes: generating design-reference imagery (section mockups a builder can code from) and directing brand identity output (logo systems, brand boards). Both lanes exist to force committed, specific direction BEFORE any UI is built -- an unspecified generation request returns the median of the training data, and everyone's median is identical. Image generation only; no lane here writes code.

Adapted from [VibeCurb](https://github.com/Yu-369/VibeCurb) (MIT, Copyright (c) 2026 Yu-369), curated and merged with this library's conventions. The POV commitment this feeds is owned by `aesthetic/01-point-of-view.md`; style families and pairings by `aesthetic/04-style-taxonomy.md`.

## 1. The commitment engine

Both lanes run the same discipline: for each axis, pick ONE option from a small set and commit -- no blending, no hedging. Picks must be internally consistent (a quiet-premium-neutral theme with compressed-industrial display type is a contradiction, not versatility). Declare the committed direction in 2-3 lines before generating anything, exactly as `aesthetic/01` demands a POV sentence before designing. Where the brief is silent, pick decisively from context rather than splitting the difference; where it is genuinely ambiguous, ask one question that pins the subject: brand name, one-line value prop, and the concrete world the product lives in (its materials, instruments, audience). Do not offer an aesthetic menu; derive dark/light and editorial/cinematic from the answer.

## 2. Design-reference generation

**One horizontal image per section, always.** A landing page brief means one image per section, generated separately and announced ("Section 3 of 7: Features"), never one tall page image. Each image must be implementation-ready: a developer (or the replication method in `design/11-image-to-code-replication.md`) can read layout, hierarchy, spacing, type scale, and palette from it. Random mood art fails the lane's purpose.

**Composition variety is mandatory.** The left-text/right-image split is the most overused generated layout; it is allowed but never the default and never twice in a row. Assign each section a composition anchor -- centered statement, top-left lead, bottom-left over image, centered-low, off-grid editorial offset, stacked center, image-as-canvas -- with at least three distinct anchors across a page and no anchor repeated on adjacent sections. Background modes vary the same way (solid + inline asset, texture, full-bleed + tonal overlay, editorial side-image, duotone, color-blocked diptych). One palette threads every section: the accent in section 1 is the accent in section 5.

**Negative constraints do the heavy lifting.** Every generation prompt carries a WHAT-THIS-IS-NOT block naming the defaults to break, because generation collapses into the same five: purple/blue AI-glow heroes, floating translucent blobs, generic dashboard-card spam, centered-text-over-gradient, stock-photo business imagery. Add the specific bans for the brief ("NOT a purple gradient hero. NOT floating glass orbs. NOT a dashboard screenshot."). The same tells that mark generated UI mark generated reference imagery -- `catalogue/01-ai-tells.md` applies to the image, and an image that would fail the catalogue must not be handed to a builder as a target.

**Every section has a conversion job** -- hook, prove, educate, or convert -- and the sections together answer the objection sequence in `design/10-hero-and-section-architectures.md` §4, in whatever order the chosen landing structure puts them (`aesthetic/04-style-taxonomy.md` §3). A reference image that is beautiful but implies no reading order or action has failed as a reference.

## 3. Brand direction: the mark

**Symbol from meaning, never from a grab bag.** Derive the mark from the product's core verb: build -> scaffold/frame/cursor; protect -> boundary/iris/seal; connect -> node/bridge/thread; analyze -> lens/trace/spectrum; automate -> loop/relay/rhythm; speak -> waveform/pulse; organize -> grid/index/dial. A logo that does not connect to the brand idea is a clip-art icon with a name next to it.

**The reduction ladder.** Meaning sentence -> 3-5 candidate shapes (each tied to a word in the sentence) -> compress the strongest until only essential geometry remains -> optional letter integration (the letter must modify the shape, not sit beside it; a pure symbol beats a forced monogram) -> system test. Generated marks fail by ADDING elements; the ladder forces removal.

**Hard constraints -- all must pass:**

| Test | Pass condition |
|---|---|
| 3-primitive cap | Constructible from at most 3 geometric primitives |
| Favicon test | Recognizable and distinct at 16x16 |
| One-sentence geometry | "It's a [shape] [operation] a [shape]" -- no comma splice |
| Inversion test | Identical read black-on-white and white-on-black; no color-dependent form |
| Wordmark pairing | Sits cleanly beside the name in the chosen face |
| Pattern tile | Tiles as a repeating pattern without collapsing into noise |

**Hard bans** -- the generated-logo defaults, each an automatic fail: brain/neuron networks (the single most common), globe-with-swoosh, shield-with-wings, interlocking rings, infinity symbols, sparkle bursts, metallic/chrome 3D rendering (logos are flat), gradient-dependent marks, hairline strokes that vanish small, crests past 3 elements, arbitrary letterform distortion, clip-art-style icons.

**Consistency across a board: freeze the geometry.** Multi-panel brand output drifts -- the mark gains petals between panels. Write one exact geometric sentence ("exactly four identical rounded squares in a plus formation, overlapping at corners, top-left and bottom-right in #FF7A00") and repeat it verbatim in every panel assignment, with an explicit global identical-in-every-panel instruction. Exact counts ("exactly 4"), named arrangement, hex-coded colors. Vague descriptions invite per-panel reinterpretation.

## 4. Brand boards

A brand board is a visual argument, not a moodboard: one committed direction explored across applications, never a comparison of options. Five rhetorical roles, all present: **Anchor** (the mark at rest, maximum negative space -- exactly one panel, position one), **Proof** (the brand on real surfaces: screen, card, packaging -- 2-3 panels), **System** (the visible rules: color relationships, type hierarchy -- 1-2 panels), **World** (atmosphere -- exactly one), **Signal** (one piece of language in the brand's voice -- exactly one). Panel rhythm varies (never two quiet panels adjacent); premium detail is discovered, not announced -- 3-5 small details across the whole board (page numbers, small-caps or weight-differentiated section labels, low-opacity construction lines), no more.

Palette discipline mirrors the UI rule: one or two accents maximum, repeated across panels (one appearance is not a system), hex-specified, and no default purple-blue glow unless the strategy genuinely earns it. Tagline under 8 words, no corporate filler -- the banned-vocabulary list applies to brand copy exactly as to UI copy.

## 5. Handoff

The output of either lane feeds forward: reference images go to `design/11-image-to-code-replication.md` for faithful implementation; the committed direction (palette hexes, converted to OKLCH at the token boundary, type character, mood) seeds the token system via `design/01-color-oklch.md` and `design/02-typography.md`; and the POV sentence the direction implies gets recorded per `aesthetic/01-point-of-view.md` so every later decision can be checked against it.

## See also

- `references/aesthetic/01-point-of-view.md` -- the POV contract this lane front-loads
- `references/aesthetic/02-distinctive-systems.md` -- what committed systems look like at case-study depth
- `references/aesthetic/04-style-taxonomy.md` -- style families, domain conventions, pairing seeds
- `references/design/10-hero-and-section-architectures.md` -- the section grammar reference images should depict
- `references/design/11-image-to-code-replication.md` -- turning an approved reference image into code
- `references/catalogue/01-ai-tells.md` -- the tells generated imagery must clear before it becomes a target
