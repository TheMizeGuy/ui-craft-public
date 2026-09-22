# Verdicts and Verification

Reference documentation for two related parts of the review contract: the per-dimension
verdict vocabulary every specialist and lead report against, and the verifier's rule set --
the quality gate that runs after specialist reviews and before any report reaches a user.

## Per-dimension verdict vocabularies

Every review dimension gets its own verdict, on its own four-point scale. Verdicts are
never averaged or folded into one score -- a strong visual verdict must never bury a
failing accessibility verdict.

| Dimension | Verdict set (best -> worst) |
|---|---|
| Visual quality | STRONG / ADEQUATE / WEAK / BROKEN |
| Responsive quality | ROBUST / ADEQUATE / FRAGILE / BROKEN |
| Motion quality | FLUID / ADEQUATE / STIFF / HARMFUL |
| Accessibility | INCLUSIVE / ADEQUATE / GAPS / EXCLUDING |
| Runtime smoothness | RESPONSIVE / ACCEPTABLE / SLUGGISH / UNSTABLE |
| Anti-AI aesthetic | DISTINCTIVE / ADEQUATE / GENERIC / AI-DEFAULT |
| TypeScript safety | SOUND / ADEQUATE / LEAKY / UNSOUND |

### Blocker flags (checked before verdicts)

Blocker flags are the gate; verdicts are the nuance layered on top. The verifier is the only
producer: it sets each flag from the VERIFIED findings, names the finding number that set it,
and reports every flag explicitly, set or not (silence is indistinguishable from "not
checked"). On the `review-ui` path, which runs no verifier, the coordinator applies the same
table during the merge.

| Flag | Set when a verified finding shows |
|---|---|
| `accessibility_blocker` | Users are excluded: no keyboard path to a control, focus not visible or obscured, unlabeled core control, body-text contrast failure, motion with no reduce-motion path |
| `responsive_blocker` | Primary content scrolls horizontally at 320px, or a control is clipped, overlapped, or unreachable at any width in the default matrix |
| `core_task_blocker` | A task named in FLOWS IN SCOPE cannot be completed: dead end, lost input across a step, no recovery from an error state, a non-functional control on the path |
| `runtime_instability` | Verified jank, dropped frames, layout thrash, or a Core Web Vitals threshold breach |

A set flag caps its dimension at the 3rd token of its family, never the 1st or 2nd: a
blocker means users excluded or a path broken, which is what the 3rd token names, and it maps
to RED at the CI gate rather than YELLOW.

| Flag | Dimension it caps |
|---|---|
| `accessibility_blocker` | Accessibility (INCLUSIVE and ADEQUATE barred; GAPS at best) |
| `responsive_blocker` | Responsive quality (ROBUST and ADEQUATE barred; FRAGILE at best) |
| `runtime_instability` | Runtime smoothness (RESPONSIVE and ACCEPTABLE barred; SLUGGISH at best) |
| `core_task_blocker` | Visual quality, the family whose specialist files the usability findings (STRONG and ADEQUATE barred; WEAK at best) |

Motion quality, Anti-AI aesthetic and TypeScript safety carry no flag; their tokens come from
the derivation table alone.

### Verdict derivation

One row per dimension that had a dispatched specialist, derived mechanically from that
dimension's verified findings, then capped by its flag:

| Verified findings in that dimension | Verdict tier (from that dimension's four-token family) |
|---|---|
| Any CRITICAL | 4th token (worst) |
| Any HIGH, no CRITICAL | 3rd token |
| Only MEDIUM / LOW | 2nd token |
| Only TASTE, or none, with driven or measured evidence | 1st token (best) |
| None, in static-analysis or screenshot-only evidence mode | 2nd token, with `(evidence: static, <what was not exercised>)` appended; a clean automation run never earns the 1st token |

A deviation from the mechanical derivation is stated in Verification Notes with its reason; a
silent deviation makes two runs on the same findings disagree.

### Report usage

A unified report separates dimensions explicitly rather than compressing them into one
score:

```
### Dimension Verdicts

| Dimension | Verdict | Blockers | Key finding |
|---|---|---|---|
| Visual quality | STRONG / ADEQUATE / WEAK / BROKEN | N | <worst issue> |
| Responsive quality | ROBUST / ADEQUATE / FRAGILE / BROKEN | N | <worst issue> |
| Motion quality | FLUID / ADEQUATE / STIFF / HARMFUL | N | <worst issue> |
| Accessibility | INCLUSIVE / ADEQUATE / GAPS / EXCLUDING | N | <worst issue> |
| Runtime smoothness | RESPONSIVE / ACCEPTABLE / SLUGGISH / UNSTABLE | N | <worst issue> |
| Anti-AI aesthetic | DISTINCTIVE / ADEQUATE / GENERIC / AI-DEFAULT | N | <worst issue> |
| TypeScript safety | SOUND / ADEQUATE / LEAKY / UNSOUND | N | <worst issue> |
```

Only after the dimension table does an optional one-line overall summary belong -- it
never replaces the blocker flags or the verdict table.

## Verifier rule set

The verifier is the mandatory pass between specialist output and the final report: it
checks evidence sufficiency for every finding, removes false positives, downgrades weak
claims, deduplicates cross-dimension findings, and re-validates severity. No finding
reaches a user without passing through this gate.

### Evidence sufficiency

The canonical geometry evidence rule lives in `references/review/02-evidence-pipeline.md`
("Geometry evidence rule") -- single source of truth for spatial/numeric precision claims.
The table below applies it per finding type:

| Finding type | Minimum evidence required | Action if missing |
|---|---|---|
| Pixel-precision alignment claim | Layout metrics, bounding box data, or DOM geometry | Keep the confidence class; add `[unverified: geometry measurement needed]` to the Evidence line; cap at MEDIUM; or remove when nothing supports it |
| Motion claim (sluggish/excessive) | Code timing analysis, video, or trace | Keep the class; add `[unverified: runtime measurement needed]`; cap at MEDIUM |
| Accessibility violation | WCAG criterion + code/DOM evidence or automated scan result | Keep if code evidence is clear; soften if screenshot-only |
| Contrast failure | Computed color values + contrast ratio | Remove if based on screenshot color estimation only |
| Responsive failure | Evidence at specific viewport width(s) | Keep if code analysis or screenshot at that width exists |
| Performance claim | Metric measurement, code analysis, or trace data | Keep the class; add `[unverified: runtime measurement needed]`; cap at MEDIUM |
| Density or waste claim, including a claim that space IS well used | `${CLAUDE_PLUGIN_ROOT}/scripts/measure_density.js` output at 1920 and at the widest width in the matrix | Keep the class; add `[unverified: geometry measurement needed]`; cap at MEDIUM. This row is symmetric on purpose: "the layout uses its width well" asserted without the numbers is recorded as not assessed, not as clean |
| Elevation, depth or boundary claim, including a claim that shadows carry hierarchy | The computed surface colours for the two adjacent levels plus the calculated contrast ratio between them; a shadow or rim boundary needs a pixel read-back across the edge (`references/review/06-measurement-traps.md`: computed style cannot see a shadow) | Keep the class; add `[unverified: geometry measurement needed]`; cap at MEDIUM. An OKLCH delta-L is not a ratio and does not satisfy this row -- the same 0.04 delta measures 1.04:1 at one lightness and 1.11:1 at another, which is how a shipped elevation system measured 1.0015:1 in dark while its tokens read as correct |
| Substance claim (flat, grey, no accent, no imagery) | `${CLAUDE_PLUGIN_ROOT}/scripts/measure_substance.js` output, or the code-level token reading with the numbers quoted: accent chroma, surface levels and the ratio between adjacent ones, images per section, hue and weight counts | Without numbers it is TASTE and is routed there. With them it keeps the severity `references/aesthetic/06-substance-floor.md` section 2 assigns, and the taste-downgrade row below does not touch it |
| Copy placement claim | The `measure_density.js` placement numbers: words before the primary content with the element taken as primary, the orphan count, the longest text-only section run | Keep the class; add `[unverified: measurement needed]`; cap at MEDIUM (`references/design/12-copy-placement-and-volume.md` section 7) |

### False-positive filters

Remove or downgrade findings that:

- Claim pixel-level precision from screenshots alone (Anthropic documents limited spatial reasoning)
- Assert a platform convention on a product not targeting that platform
- Flag customization of library defaults as a defect (customization is usually the goal)
- Report working responsive behavior as broken because it looks different from desktop
- Escalate pure taste preferences to HIGH or CRITICAL severity
- Flag intentional asymmetry as misalignment
- Criticize a design system for not following a different design system
- Flag a device that encodes selection, severity, rarity or category as ornament. Substance encodes; ornament repeats (`references/aesthetic/06-substance-floor.md` section 4). An accent fill on the current nav item, a coloured edge on the selected row, an identity colour on an item tier: each is doing a job, and stripping it is a regression filed as a fix
- Flag one framed card, one deliberate uppercase label, or one framed icon under a uniformity fingerprint. Strongest-10 rows 1, 4 and 6 fire only on their repeated signature -- the trio on every card of a surface that has two or more, the overline above three or more headings, three or more icons in the identical tinted container (`references/catalogue/01-ai-tells.md` section How to apply). One instance is a choice, not a tell
- Flag a device the owner has stated a decision about. A stated decision is one of: an `anti-slop-allow: <reason>` on the line; a `## Must be present` or `## Banned (concrete)` entry in the reviewed repo's `design/POV.md`, the UI section of its `CLAUDE.md` or `AGENTS.md`, or `.claude/ui-craft/vetoes.md`; or a device the dispatch's `OWNER VETOES` block names as required. Record it on a `Stated decisions honoured:` line in Verification Notes with the source quoted, and do not file it. The decision clears only the device it names, and never a hard defect, an accessibility row, or a set blocker flag. The model never supplies the decision itself: with no such source, the finding stands

The last row only works if the gate can see the decision, so the `OWNER VETOES` block travels into verification with the findings, not only into the specialist prompts.

### Cross-dimension deduplication

Findings rules -- collapsing the same underlying issue when multiple specialists flag it:

- If two specialists flag the same element for the same reason, keep the more specific finding
- If visual + accessibility reviewers both flag low contrast, merge into one finding with both dimensions cited
- If responsive + visual reviewers both flag clipping, group into the responsive finding (it's the root cause)
- If motion + accessibility reviewers both flag missing reduced-motion, merge into one finding citing both motion quality and accessibility

Grouping rules -- collapsing repeated instances of the same finding within one dimension:

- Multiple viewport failures from the same root cause -> one finding with a viewport range
- Multiple components with the same anti-pattern -> one finding listing affected components
- Multiple states missing the same treatment -> one finding listing missing states

### Severity re-validation

| Check | Action |
|---|---|
| Taste comment at HIGH/CRITICAL | Downgrade to TASTE |
| Accessibility blocker at MEDIUM/LOW | Upgrade to HIGH/CRITICAL |
| Core task blocked at any width in the default matrix, or primary content scrolling horizontally at 320px, at MEDIUM/LOW | Upgrade to HIGH |
| Pattern smell at CRITICAL | Downgrade to MEDIUM unless evidence supports objective failure |
| Quality defect without user impact | Downgrade to LOW |
| A substance or placement finding carrying a measurement from `references/aesthetic/06-substance-floor.md` or `references/design/12-copy-placement-and-volume.md` | Never downgraded to TASTE for lack of objectivity. It keeps the severity its measurement earns; the taste-comment row above applies only to a finding with no number attached. A stated decision does not downgrade it either -- it clears it under the stated-decision filter above, which is how `06-substance-floor.md` section 1 already scopes its severities to a check that fails `without a stated reason` |
| A `Recommended change:` that removes a device and names no replacement | Return the finding as an open question for the owner rather than passing it through (`references/review/01-universal-rubric.md` section Finding format). Record it on the "Returned:" line in Verification Notes |

The accessibility-blocker upgrade rule is the one direction severity re-validation always
moves toward stricter, never looser: any finding that represents a genuine accessibility
blocker (excludes users, breaks a core interaction path) must never survive verification
sitting at MEDIUM or LOW -- it is upgraded to HIGH or CRITICAL regardless of which
specialist originally filed it.

### Verified output format

The verifier's output is a re-ranked, deduplicated findings list, not a raw pass-through:

1. Sequential numbering (1..N)
2. Unified severity ranking (CRITICAL first -> TASTE last)
3. Each finding retains its original dimension tag
4. Removed/downgraded findings listed separately as "Verification notes" with explanation
5. `Widths viewed:` in Verification Notes, naming the screenshots actually opened and examined, by file

```
## Verified Findings (N total)

### CRITICAL (N)
1. [finding in standard format]

### HIGH (N)
2. [finding]

### MEDIUM (N)
...

### LOW (N)
...

### TASTE (N)
...

## Verification Notes
- Capped: "header alignment off by 2px" held at MEDIUM -- [unverified: geometry measurement needed], screenshot-only assertion
- Downgraded: "generic color palette" from MEDIUM to TASTE -- no objective quality impact
- Merged: contrast findings from visual + accessibility into finding #3
- Returned: "remove the coloured left border from every table row" returned as an open question -- the recommendation names no device that takes over the border's job (`references/review/01-universal-rubric.md` section Finding format; replacement devices: `references/aesthetic/06-substance-floor.md` section 6)
- Widths viewed: 320 (evidence/320.png), 900 (evidence/900.png), 2560 (evidence/2560.png). 1440 captured, not opened
```

`Widths viewed:` is not the responsive verdict's widths-exercised line. Exercised
means the browser was resized to that width; viewed means a screenshot at that
width was opened and looked at. Name the files, and name the captured widths
nobody opened -- an unopened screenshot is not evidence.

**On a run with a browser, Visual quality cannot take the 1st token of its family
with an empty `Widths viewed:`.** STRONG on screenshots nobody opened is an
unearned verdict, and the derivation table's 1st-token row already requires driven
or measured evidence: this line is the proof of it. With no widths viewed, the run
is a static-evidence run for that dimension and takes the 2nd token with
`(evidence: static, no screenshot opened)` appended.
