# ui-craft regression corpus

Labeled UI fixtures for scoring ui-craft's tell detection. Ground truth is
`labels.json`; the scorer and runbook are in `../harness/`.

- `fixtures/*.html` -- 10 small (`< 60` line) HTML fixtures, each with deliberately
  planted AI-tells or, for the two clean controls, none. Tell IDs live only in
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

See `../harness/README.md` for how to produce a findings file and score it.
