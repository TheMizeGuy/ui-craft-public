# ui-craft regression corpus

Labeled UI fixtures for scoring ui-craft's tell detection. Ground truth is
`labels.json`; the scorer and runbook are in `../harness/`.

- `fixtures/` -- small (mostly `< 60` line) fixtures, each with deliberately
  planted AI-tells, responsive or accessibility defects or, for the clean controls, none. Tell IDs live only in
  `labels.json`, never in the fixture markup, so a reviewer never sees the answer.
  **Not every fixture is HTML.** Since the 2026-09-22 port the corpus also holds four
  raw stylesheets (`bootstrap-unthemed.css`, `legacy-theme.css`, `chosen-border-gray.css`,
  `tokens-clean.css`), one TSX component (`media-control-glyph.tsx`) and one CSS-in-TS module
  (`mono-readouts.ts`), because several catalogue rows target raw CSS and component source
  rather than markup. A run that globs `fixtures/*.html` silently scores every non-HTML
  fixture as missed.
- `labels.json` -- expected findings per fixture in the canonical shape, each citing
  a `tellRef` from `references/catalogue/01-ai-tells.md`. Its `meta` block documents
  per-tell translation notes and the deliberately dropped tells.
- Label severities are not a free choice: `../harness/label-contract.mjs` parses the
  catalogue's section 18 and fails on any label whose severity disagrees with the class
  that table gives its `tellRef` (a code section 18 does not list defaults to MEDIUM).
  The catalogue is the source of truth; a reported mismatch is fixed in the label.

## Provenance

Fixtures whose `labels.json` source reads `copied` are **copied verbatim** from anti-slop's
design corpus (`anti-slop/anti-slop/scripts/test/corpus/design/`), same owner (TheMizeGuy),
MIT licensed. Five came with the first release:

| Fixture | Labels today (ui-craft IDs) |
|---|---|
| `gradient-hero.html` | V5, C5 |
| `shadcn-card-kit.html` | S3, Strongest-10 #1 |
| `frosted-nav-neon.html` | L6, C18 |
| `legacy-marketing-page.html` | cream-serif-sage, T1, W2, I7 |
| `small-avatar-clean.html` | clean control (0 expected, tolerance 1) |

That table is the label set as it stands, not as it was ported: C3 left
`gradient-hero.html` in 0.2.4, D1 left `frosted-nav-neon.html` in 0.2.4 and V1 left it on
2026-09-22, each because a ui-craft rule said the fixture does not contain the tell at the
instance count it carries. The fixtures themselves were never edited for it. The other
fourteen arrived on 2026-09-22 and are listed below.

Their labels are anti-slop's ground truth translated to ui-craft catalogue IDs; the
translation is documented in `labels.json` `meta.translationNotes`.

Five fixtures are **new**, authored for ui-craft to cover gaps the copied set left:

| Fixture | Targets |
|---|---|
| `presence-single.html` | exactly one presence-flaggable fingerprint (V5), otherwise clean |
| `cream-serif-sage.html` | the full cream + serif + sage tasteful-default combination, and since the 2.5.0 correction Inter on the hero line beside the serif display (T1) |
| `token-drift.html` | hardcoded values bypassing an in-file design-token system (section 14) |
| `missing-states.html` | data UI with no empty/loading/error states + a dead control (sections 12, 15) |
| `clean-intentional.html` | second clean control, distinctive non-shadcn POV (0 expected) |

Five more fixtures were authored in 0.3.0 for the responsive dimension and one
deep-cut tell, so the corpus exerts pressure on the sizing doctrine as well as
the aesthetic catalogue:

| Fixture | Targets (label tellRefs) |
|---|---|
| `fixed-desktop-shell.html` | fixed-pixel shell, fixed grid tracks, no viewport meta (L13 x3) |
| `viewport-query-card.html` | viewport media query on a portable component (P1) |
| `vh-bottom-bar.html` | 100vh shell and a bottom bar with no safe-area inset (P3 x2) |
| `uncommitted-radius.html` | the uncommitted-radius deep cut (D1) |
| `fluid-adaptive-clean.html` | responsive clean control, every prescribed fluid construct (0 expected) |

Six more fixtures were authored on 2026-09-01 by the catalogue review, each
pinning one detection change the review made (the current-generation shadcn
fingerprint, the single M3 threshold, the new V12 and U13 rows, the M6 rewrite)
or one rule the corpus had never exercised (the `anti-slop-allow` escape hatch):

| Fixture | Targets (label tellRefs) |
|---|---|
| `shadcn-oklch-default.html` | the Tailwind v4 `shadcn init` OKLCH token block untouched (S1) and one unmodified Card (S3) |
| `slow-page-transition.html` | one 650ms cross-document page transition, over the 400ms threshold (M3) |
| `emoji-chrome.html` | emoji as status dots, list bullets and a button icon, written as character references (V12) |
| `icon-only-button.html` | a `<button>` holding only an `<svg>`, no accessible name (U13) |
| `reduced-motion-opt-in.html` | clean motion control: decorative motion gated behind `no-preference`, no `reduce` block (0 expected, tolerance 0) |
| `allowed-choice.html` | clean escape-hatch control: `presence-single.html` with its V5 line marked `anti-slop-allow` (0 expected, tolerance 0) |

Five more fixtures were authored in 0.6.0 for the substance floor and the copy
placement doctrine, so the corpus also exerts pressure in the other direction,
on a review that clears every tell by removing things:

| Fixture | Targets (label tellRefs) |
|---|---|
| `flat-terminal.html` | the flat, chrome-less, accent-stripped data surface six remediation campaigns produced (V13) |
| `prose-blob-top.html` | about 281 words of running prose above the first data element on a reference page, and a paragraph inside the identity block (W11) |
| `orphan-paragraphs.html` | three paragraphs dropped between a tile grid and a table with no heading over them, one of 63 words, plus three consecutive text-only sections (W12, L14) |
| `icon-cards-no-imagery.html` | a physical-product marketing page whose four sections are all icon cards and type, with zero real images (I8) |
| `framed-panels-clean.html` | the rescope control: ONE framed panel with its own elevation, ONE tuned uppercase label, ONE rarity-encoding icon frame, all below the repeated-signature thresholds (0 expected, tolerance 0) |
| `mono-readouts.ts` | a CSS-in-TS talent sheet with the mono family on six human-readable readouts that already carry tabular-nums, plus two exempt raw-payload fields (T13); added 0.6.2 after a real-site re-run lost the tell to file sampling |

Fourteen more were **ported from anti-slop's design corpus on 2026-09-22**, byte-for-byte
with no edit of any kind: the labelled design fixtures ui-craft had never taken. Seven
carry tells; seven are clean controls, six of them near-miss controls -- the first in this
corpus that sit one deliberate step from a rule rather than simply being quiet pages.

| Fixture | Targets (label tellRefs) | Translated from |
|---|---|---|
| `hero-triplet-verbatim.html` | the verbatim unmodified Tailwind hero class run on the `h1` (Strongest-10 #9) | `tailwind-hero-triplet` |
| `uniform-control-radius.html` | five interactive controls all at `rounded-full`, no radius identity stated (D1) | `rounded-everything` |
| `bootstrap-unthemed.css` | the compiled Bootstrap primary and its two darkens, all inside C3's hue window (C3), and the whole untouched theme layer (section 14) | `bootstrap-default-blue` |
| `marketing-defaults.html` | default indigo-to-violet gradient CTA (C5), the blur-blob fingerprint verbatim (C11), the literal shadcn demo stat (S12), "Welcome back!" (W10) | `purple-gradient-default`, `blur-blob`, `shadcn-stats-magic`, `generic-microcopy` |
| `motion-rhythm.html` | decorative hover transitions with no `prefers-reduced-motion` query in either direction (M6) | none; the three anti-slop labels on this file all fall below a ui-craft threshold |
| `gallery-unlabelled.html` | `outline: none` with no `:focus-visible` anywhere in the file (U3) | `outline-none` |
| `legacy-theme.css` | fixed 1180px shell and four fixed 260px tracks (L13 x2), `height: 100vh` (P3) | `fixed-page-shell`, `fixed-grid-tracks`, `vh-viewport-shell` |
| `hero-scroll-poster.html` | clean control, tolerance 1: one cream ground and a rusty-orange drift-variant accent, which is one of the combination's three named markers and not two | `hero-scroll-hint` (dropped; see below) |
| `near-miss-controls.html` | near-miss control, tolerance 0: thirteen constructs one token each from L13, T5, Strongest-10 #4, C11, D2, L7, S12, W10, section 15, P8, D1 and U3 | clean control |
| `chosen-border-gray.css` | near-miss control, tolerance 0: one reused neutral outside C3's window, and both cream-serif-sage legs just under their floors | clean control |
| `tokens-clean.css` | raw-CSS control, tolerance 0: the correct idiom for every geometry row `legacy-theme.css` breaks | clean control |
| `hatched-wordmark.html` | escape-hatch control, tolerance 0: a real V5 gradient-text span marked `anti-slop-allow` | clean control |
| `responsive-type-clean.html` | control, tolerance 0: a fluid `clamp()` ramp AND a stepped ramp on non-default steps, neither of which is Strongest-10 #9 | clean control |
| `media-control-glyph.tsx` | near-miss control, tolerance 0: bare Unicode transport glyphs (one step from V12) on buttons that all carry an `aria-label` (one step from U13) | clean control |

Nine of the twenty anti-slop labels on these files did not survive translation. Five fail a
ui-craft threshold on a file that carries the construct fewer times than the rule needs:
`ai-purple-class` (two purple-family tokens, both on the span C5 already owns, after
`bg-fuchsia-300` measures chroma 0.1322, under C3's 0.15 floor), `uppercase-overline` (one
instance against T5's three), `transition-all` (two against D2's three), `important-overuse`
(two, and its ui-craft row is P6, not "no row at all"), and `uniform-literal-radius` (6px
twice and 12px once, and neither is D1's 8px or 10px). Four have no ui-craft catalogue home
at all: `missing-alt` and `img-no-dimensions` (no row of
`references/catalogue/01-ai-tells.md` names either), `hero-scroll-hint` (no row; W2 is
vague benefit copy and W5 is SaaS-speak, and neither describes a scroll affordance), and
`media-control-glyph`, whose fixture became a clean control for that reason. The tenth,
`generic-microcopy`, translates to W10 rather than to the W2 or W5 it first looked like:
"Welcome back!" is the string W10's row names, and although W10 is a concentration row its
unit of occurrence is one greeting per surface, so a single instance is dominance of the
surface. Every count is recorded in `labels.json` `meta.translationNotes` and
`meta.droppedTells`.

Two ui-craft labels written during the port were withdrawn the same day, before they
shipped, and two were added: the blind run is what caught all four. `cream-serif-sage` left
`hero-scroll-poster.html` and `L7` left `motion-rhythm.html`, each because the catalogue's
own threshold is not met on the file; `M6` was added to `motion-rhythm.html` and
`section 14` to `bootstrap-unthemed.css`, each a defect the fixture really contains that
the first pass missed. `labels.json` `meta.translationNotes` carries the reasoning for all
four, and the two additions follow the same principle as the 2026-09-01 label split: ground
truth enumerates what a fixture contains, and a correct finding that scores as a false
positive only because no label exists yet is a gap in the labels, not in the run.

In 0.7.0 the anti-slop 2.5.0 rule pairs arrived the same way, byte for byte, each positive
with its clean partner one step from it, and the labels re-derived against section 18:

| Fixture | Targets (label tellRefs) | Clean partner |
|---|---|---|
| `contrast-pairs.html` | text under the AA bar on its declared surface, and one pair within 0.3 of it (P16 at HIGH and LOW) | `contrast-clean.html` |
| `contrast-ground.html` | the page ground as the only painted surface (P16) | `contrast-ground-clean.html` |
| `side-stripe-cards.html` | a coloured side stripe in five syntaxes (V3) | `side-stripe-clean.html` |
| `type-floors.html` | running text under 12px and functional text under 11px (T12) | `type-floors-clean.html` |
| `reading-mechanics.html` | tight body leading, wide tracking, a justified narrow column, crushed tracking (T16 x4) | `reading-mechanics-clean.html` |
| `motion-bounce.html` | keyword bounce, an anticipate-and-overshoot curve, `animate-bounce` (M2) | `motion-spring-clean.html` |
| `live-dot.html` | a small round dot pulsing forever (V11) | `live-dot-clean.html` |
| `zoom-lock-tabindex.html` | a viewport meta that blocks zoom, positive tabindex values (P4, P12) | `viewport-clean.html` |
| `marquee-logos.html` | a logo row carried sideways forever with no pause control (M4) | `marquee-clean.html` |
| `pattern-backgrounds.html` | a hairline grid, a dot field and repeating stripes behind content (V9) | `pattern-backgrounds-clean.html` |
| `radial-halo.html` | a saturated radial halo behind the hero of a dark page (C11) | `radial-halo-clean.html` |
| `gray-on-color.html` | neutral mid-grey text on a blue surface, in classes and in CSS (C7) | `gray-on-color-clean.html` |
| `skipped-heading.html` | an h4 straight after an h2 in the main content (P9) | `skipped-heading-clean.html` |

anti-slop's `design-system/` pair (a `DESIGN.md` with `palette-declared.html` and `drift.css`) is not
copied yet: the DESIGN.md reader walks up from each file, so the pair needs its own subdirectory,
which the blind copy does not read yet. The scanner's DESIGN.md readings are pinned by probes in
`../harness/scan-tells.selftest.mjs` until it lands.

One pair is ui-craft's own, because anti-slop stays silent on the pattern: `focus-ring-on-focus.html`
(a `focus:` ring with no `focus-visible:` variant, U4) with `focus-visible-clean.html`. The shared
fixtures anti-slop corrected in 2.5.0 (contrast failures in clean controls and positives, and the
control-face doctrine on `cream-serif-sage.html` and `legacy-marketing-page.html`) were re-copied
in the same release, and the ui-craft-only fixtures that carried a real contrast failure
(`reduced-motion-opt-in.html`, `icon-only-button.html`, `icon-cards-no-imagery.html`) were
corrected here; each note in
`labels.json` records the change with its measured before and after values.

Three of the tell fixtures carry more than one label because their notes
describe more than one defect; the labels were split on 2026-09-01 so ground
truth enumerates what the fixtures really contain (see `../harness/README.md`,
"Label split, 2026-09-01"). `orphan-paragraphs.html` carries two labels for the
same reason: the fixture plants two placement tells, each at its own stated
threshold. `legacy-theme.css` carries three for the third: L13's row names four
constructs and the stylesheet has three of them.

## Pairs, twins and corrections

Every new rule ships with a positive and a clean partner in the same change. Every exemption a
rule carries ships with a should-flag twin the exemption must not swallow, as a probe in
`../harness/scan-tells.selftest.mjs` or as a construct in a fixture: an exemption written without
one fails open, and the first sign is a whole class of real findings gone quiet. A rule cut from
a release has its construct removed from the shared positive in the same commit, or its label kept
and its note naming it a known scanner false negative, so a shared positive never carries an
unlabelled construct. (anti-slop keeps such a label with no severity; ui-craft keeps the section-18
severity, because `../harness/label-contract.mjs` checks every label, and because the auditor is
still expected to find the tell.)

A fixture is corrected, never relabelled, when a new rule proves it carries a real defect: a clean
control gets the computed fix, and a positive planting another tell is tuned so it plants only its
own.

See `../harness/README.md` for how to produce a findings file and score it.
