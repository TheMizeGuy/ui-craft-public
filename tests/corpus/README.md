# ui-craft regression corpus

Labeled UI fixtures for scoring ui-craft's tell detection. Ground truth is
`labels.json`; the scorer and runbook are in `../harness/`.

- `fixtures/*.html` -- 21 small (`< 60` line) HTML fixtures, each with deliberately
  planted AI-tells or responsive defects or, for the five clean controls, none. Tell IDs live only in
  `labels.json`, never in the fixture markup, so a reviewer never sees the answer.
- `labels.json` -- expected findings per fixture in the canonical shape, each citing
  a `tellRef` from `references/catalogue/01-ai-tells.md`. Its `meta` block documents
  per-tell translation notes and the one deliberately dropped tell.

## Provenance

Five fixtures are **copied verbatim** from anti-slop's design corpus
(`anti-slop/anti-slop/scripts/test/corpus/design/`), same owner (TheMizeGuy), MIT
licensed:

| Fixture | Planted tells (ui-craft IDs) |
|---|---|
| `gradient-hero.html` | V5, C5, C3 |
| `shadcn-card-kit.html` | S3, Strongest-10 #1 |
| `frosted-nav-neon.html` | V1, L6, C18, D1 |
| `legacy-marketing-page.html` | cream-serif-sage, T1, W2, I7 |
| `small-avatar-clean.html` | clean control (0 expected) |

Their labels are anti-slop's ground truth translated to ui-craft catalogue IDs; the
translation is documented in `labels.json` `meta.translationNotes`.

Five fixtures are **new**, authored for ui-craft to cover gaps the copied set left:

| Fixture | Targets |
|---|---|
| `presence-single.html` | exactly one presence-flaggable fingerprint (V5), otherwise clean |
| `cream-serif-sage.html` | the full cream + serif + sage tasteful-default combination |
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

Three of the tell fixtures carry more than one label because their notes
describe more than one defect; the labels were split on 2026-09-01 so ground
truth enumerates what the fixtures really contain (see `../harness/README.md`,
"Label split, 2026-09-01").

See `../harness/README.md` for how to produce a findings file and score it.
