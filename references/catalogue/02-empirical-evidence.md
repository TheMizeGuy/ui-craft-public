---
topic: catalogue
role: reference
scope: empirical-evidence
audience: ui-reviewer, ui-designer
last-distilled: 2026-07-03
---

# Empirical Evidence: Which UI Tells People Actually Name

The companion to `references/catalogue/01-ai-tells.md`. The catalogue lists what *can* read as AI; this file grounds it in data -- which tells real people actually cite, ranked by evidence instead of intuition. It tells reviewers which rules to weight heavily, which to apply only when they cluster, and which popular "AI tells" the evidence does not support. Distilled from the anti-slop empirical-rankings corpus (UI/design slice only).

## Where the data comes from

An independent corpus study mined public Reddit discussion (2020-2026, via the Arctic Shift archive) for the patterns people cite when something "looks AI-generated," then hand-audited a sample to separate what humans actually *flag* from what a keyword search merely *matches*.

| Domain | Posts scanned | On-topic set | Verification |
|--------|--------------|--------------|--------------|
| UI/design | 3,214,533 | 46,971 posts + 3,033 comments | each tell verified by an independent agent |

Source: the `vibecoded-design-tells` project by JCarterJohnson (MIT-licensed analysis code; Reddit text not redistributed). Treat the **relative ordering and gap sizes** as the signal, not the absolute percentages -- this is a proxy for vocal, online developers, not a representative sample of all output. **Trust comment share over post share when they diverge:** comments are 100% on-topic, while post bodies inflate generic words like "cards" and "dark mode."

## Four findings that shape how to use the catalogue

1. **Flag the unspecified default, not the value.** A tell is an unchosen default, not a banned token. Purple is a tell when the model reached for it because nothing was specified; it is fine as a stated brand decision. Swapping one default for another (purple to cream-and-serif) is not a fix -- it resets the clock. The escape hatch (`anti-slop-allow: <reason>` on the line) exists so a deliberate choice is never nagged.
2. **Concentration is the signal, not lone hits.** One `rounded-lg` card, one gradient, one glassmorphism panel is almost never a tell. Weight by density (repeated identical treatment across a surface) and let a single low-confidence hit read as clean. The catalogue operationalizes this split in its "How to apply: presence vs concentration" rule (`references/catalogue/01-ai-tells.md`): the section-11 component fingerprints and the Strongest-10 are presence-flaggable (a single instance is a finding), while the property-level color/type/copy/micro rows need concentration -- and a lone utility-class hit (one `text-slate-600`) on an otherwise clean surface is explicitly not a finding.
3. **The loudest tells are structural and a regex cannot see them.** "All looks the same" / cookie-cutter is the top finding and no keyword matches it. A clean scanner pass means the lexical layer is clean, not that the output reads human; the semantic read (a reviewer agent, or a careful human) is where the real signal lives.
4. **Banning the old tells creates the new tell (the moving target).** As people learned the 2024 markers, a "tasteful" default appeared (cream background, serif display, sage accent) that now reads as AI just as fast. Apply the rules with judgment; mechanical over-correction is itself detectable.

## UI/design: verified ranking

Comment share (100% on-topic) with false-positive risk and verdict.

| Tell | Comment share | FP risk | Verdict |
|------|------:|---------|---------|
| "All looks the same" / cookie-cutter (umbrella) | 6.1% | low | Top finding |
| Default shadcn / Tailwind kit, un-themed | 2.5% | medium | #1 concrete cause |
| AI purple (indigo/violet/purple/fuchsia primary) | 2.3% | low | Top color tell |
| Gradients / gradient hero text | 2.0% | low | Confirmed (share understates it) |
| Too many animations / Framer fade-ins | 1.1% | high | Minor, noisy signal |
| Rounded corners / pill buttons everywhere | 0.8% | medium | Confirmed |
| Dark mode + unprompted neon glow | 0.7% | low | Confirmed (the glow, not dark mode) |
| Emoji as icons / sparkles / rockets | 0.5% | medium | Confirmed (emoji *as UI*, not in copy) |
| Generic sans (Inter / Geist) | 0.4% | low | Confirmed (share understates it) |
| Symmetric hero + 3 feature cards + CTA | 0.4% | medium | Confirmed, thin |
| **Cream + serif + sage "tasteful default"** | rising | n/a | The current top emerging tell (see catalogue file 01) |

## UI: low-evidence or unsupported by the data (never lead with these; the catalogue class still applies when the pattern is concentrated or decorative)

The stereotypical "AI design" memes sit near the bottom or were rejected outright. Do not lead a review with any of these.

| Pattern | Verdict |
|---------|---------|
| Mesh / blob / aurora backgrounds | **Rejected as evidence**: keyword artifact -- most matches were GitHub `/blob/` URLs, not design complaints. The data is silent on C11 blur blobs, which stay LOW |
| Bento grid | Dead last (0.1%); people defend it. Not a tell on presence; L3 (bento as the only, decorative layout) stays MEDIUM |
| Glassmorphism / frosted glass | 0.2%, contested. Low signal. Flag only "everywhere, without purpose," never on presence |
| shadcn / Tailwind / dark mode themselves | The *un-themed defaults* are the tell, not the tools. A themed shadcn site is invisible to the complaint |

## 2026-07 drift spot-check

A bounded check of the ranking's top claims against public discussion from mid-2025 through mid-2026. Records status only; any rule change goes through the anti-slop measure harness first.

| Claim | Status | Evidence |
|-------|--------|----------|
| Cream + serif + sage as the emerging design tell | Confirmed as now-mainstream; accent detail drifting | Chayka (2026-06-29) describes beige/cream backgrounds with large italicized serif display as the recognizable generic AI web style, naming rusty-orange accents where the ranking says sage. FP risk rising: human 2026 design trends converge on the same palette |
| AI purple / un-themed shadcn as the #1 concrete cause | Confirmed; NOT superseded by cream/serif | Still the leading concrete complaint for vibe-coded app UI; Adam Wathan's 2025-08 apology for `bg-indigo-500` drew 1M+ views. Cream/serif is a second parallel default, not a replacement |
| Emoji as UI, sparkles, rockets | Confirmed | Emoji-dense output is used operationally as a detection signal (Netcraft 2025); the tell is emoji *as interface chrome*, not emoji in prose |
| Loudest tells are structural and regex-blind | Confirmed with new evidence | arXiv 2601.21276 (2026-01) measures AI output ignoring reuse opportunities while reviewers rate it positively -- surface plausibility masks exactly what a regex cannot see |

## How to use this file

- **Severity follows the data, but share never lowers a catalogue severity.** Top-ranked, low-FP tells (cookie-cutter sameness, un-themed shadcn, AI purple, gradients, cream-serif-sage) carry weight in a review verdict. Inflated / high-FP tells (too-many-animations, glassmorphism) only count when they cluster. The share column is *evidence of how loudly people complain*, not a severity scale: where a row's verdict already reads "share understates it" (generic sans at 0.4%, gradients at 2.0%), the low share is a measurement artifact of how people phrase complaints, and the binding severity stays the one in `references/catalogue/01-ai-tells.md` section 18. T1 (Inter as primary) is CRITICAL there and stays CRITICAL here despite the row's 0.4% comment share; Geist unmodified is T4, HIGH.
- **Route regex-blind tells to a semantic read.** "All looks the same," coherence, and taste need a reviewer agent or a human, not a scanner.
- **Honor the escape hatch.** A flagged construct on a line marked `anti-slop-allow:` is a deliberate choice. Skip it.
- **A clean scan is not the finish line.** It clears the cheap layer; the structural read is where the real signal lives.

## Sync contract

This file is a distillation, not a primary source. The numbers, rankings, cleared list, and drift spot-check above are reproduced from the anti-slop empirical-rankings corpus and must stay in step with it.

- **Refresh trigger:** re-distill this file whenever the **anti-slop quarterly Rankings Refresh runbook** runs and updates the source rankings. That runbook is on a quarterly cadence (source last refreshed 2026-07-03; next due 2026-10).
- **Do not hand-edit the figures.** Any change to a share, ranking, cleared verdict, or drift status must originate in the anti-slop ranking (which itself goes through the anti-slop measure harness) and then be copied here -- never the reverse.
- **On refresh:** update `last-distilled` in the frontmatter, re-copy the UI/design ranking, the cleared list, and the UI rows of the drift spot-check, and reconcile any newly cited or newly cleared tell with the catalogue in `references/catalogue/01-ai-tells.md`.
