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
to RED, which fails the CI gate, rather than YELLOW, which ships with its open findings
recorded.

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

The CI artifact carries these tokens as written: 1st token GREEN, 2nd YELLOW, 3rd and 4th
RED. Under the gate's default blocking policy (`ci/README.md`, Verdict policy) RED and any
CRITICAL or HIGH finding block the merge, and a YELLOW passes when the MEDIUM, LOW and TASTE
findings behind it are listed in `evidence.open_findings`. After two fix rounds on one change,
the remaining findings are recorded there and the change ships on the verifier's real tokens;
each pass over a changed tree finds a fresh set of MEDIUM and LOW findings, so another pass to
reach the 1st token does not terminate. A 2nd token earned by static evidence alone has no
finding to record, so it fails the gate until that dimension has driven or measured evidence.

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

- Claim pixel-level precision from screenshots alone (the geometry evidence rule in `references/review/02-evidence-pipeline.md`)
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

### Scanner merge (judgment first, detector second)

1. **The scanner runs at the orchestrator, and its output waits.** The orchestrator runs
   `${CLAUDE_PLUGIN_ROOT}/scripts/scan_tells.mjs --format json --fail-on none --surface <surface type>`
   over the files in scope, writes the output to `<run dir>/evidence/scan_tells.json`, and keeps
   it out of every judgment reviewer's prompt (`ui-anti-slop-auditor`, `ui-visual-reviewer`)
   until they return. Detector output anchors judgment even when it is right: an auditor that
   starts from a regex list confirms the list instead of walking the catalogue.
2. **The merge point.** On `improve-ui` it is the verifier, before deduplication. On `review-ui`
   it is the coordinator's Step 7, which writes the four lines below on the report's Merge notes
   line. On `design-ui` it is the Step 6 criterion-6 gate, which applies the same cases and
   writes no Verification Notes lines.
3. **The cases, keyed per (file, tellRef).**
   - (a) Both found it: one finding, in the specialist's wording, evidence and remediation, with
     `Scanner: <rule> at line N` appended to its Evidence line.
   - (b) Scanner only, `heuristic: false`: kept in the scanner's shape after the merge point
     reads the cited line. Its confidence comes from the rule and its severity is the class
     catalogue section 18 gives its tellRef (the rule's own severity only where section 18 is
     silent). A hit inside a comment, inside a string that never renders, or on a construct the
     rule's own exemption should clear is a scanner false positive: removed and recorded.
   - (c) Scanner only, `heuristic: true`: a candidate, kept when the merge point confirms it in
     source or a specialist filed the same tell, and otherwise listed as not confirmed.
   - (d) Specialist only: it stays.
   - (e) The two disagree on one span (the specialist reads Inter as the primary face, the
     scanner saw a system stack first): settled by reading the source, never by counting votes.
   - (f) Lines the scanner skipped for an `anti-slop-allow` marker (`summary.suppressed`) are
     stated decisions and go on the existing `Stated decisions honoured:` line.

   The measurement scripts' severity-tagged `findings` arrays
   (`${CLAUDE_PLUGIN_ROOT}/scripts/measure_substance.js`,
   `${CLAUDE_PLUGIN_ROOT}/scripts/measure_density.js`) are held at the orchestrator the same way
   and merge by the same rule. The specialists receive the reports' metric fields (the accent,
   `surfaceLevels`, `imagesPerSection`, utilisation, `wordsBeforePrimary` and the rest) as
   evidence, without `findings` or `verdict`, because a substance or placement finding has to
   quote the numbers.
4. **What the merge records.** Four Verification Notes lines, each `none` when empty:
   `Scanner-confirmed: N` (case a), `Scanner-only kept: <rule> at <file:line>` (case b kept),
   `Scanner false positive: <rule> at <file:line> -- <reason>` (case b removed) and
   `Scanner candidate not confirmed: <rule> at <file:line>` (case c dropped).
5. **What the corpus measures.** The auditor's blind run over the fixtures is the judgment
   half; the pipeline number is that run merged with the scanner by
   `tests/harness/merge-findings.mjs`. The tool applies (a), (b) without the source read, (c)
   and (d), so its precision is a lower bound on what the verifier's merge produces.

(after impeccable's critique method, Apache-2.0; README § Third-party material)

### Severity re-validation

| Check | Action |
|---|---|
| Taste comment at HIGH/CRITICAL | Downgrade to TASTE |
| Accessibility blocker at MEDIUM/LOW | Upgrade to HIGH/CRITICAL |
| Core task blocked at any width in the default matrix, or primary content scrolling horizontally at 320px, at MEDIUM/LOW | Upgrade to HIGH |
| Pattern smell at CRITICAL that catalogue section 18 does not class CRITICAL (a specialist escalation with no catalogue row behind it) | Downgrade to MEDIUM unless evidence supports objective failure. A catalogue tell at the class section 18 gives it keeps that class: section 18 is the severity source for the anti-ai dimension (`references/catalogue/01-ai-tells.md` § 18; `agents/ui-anti-slop-auditor.md` § 14), so T1, T2, T3, T13, S1-S5, C15, L1 and the other CRITICAL rows stay CRITICAL at the Pattern smell class. T2 keeps CRITICAL only for a chosen Roboto, Helvetica or Arial primary; a system stack at default weights is not T2 and is filed under S7 or V13 at its measured class |
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
- Scanner-confirmed: 6
- Scanner false positive: lorem-ipsum at src/Empty.tsx:12 -- the match sits inside a code comment that never renders
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

## Finish pass (after applied fixes)

**When.** After an orchestrator applies the findings the user picked: `improve-ui` Step 6, and
`review-ui` Step 11 when a rendered surface changed and a browser exists. Its four words are also
the outcome vocabulary of `design-ui`'s Step 6 gate.

**Who.** `ui-verifier` in FINISH MODE, dispatched with a fresh context and no forked history.
`review-ui`, which has no verifier in its standard pass, dispatches `ui-craft:ui-verifier` in
FINISH MODE for this pass only. The session that applied the fixes never scores its own work, so
everything the pass needs travels in its packet: the applied findings (id, recommended change,
files touched), the before evidence (the prior ledger findings and `measurements`, the before
captures), the after evidence (recaptured at the same widths and states, written to
`<run dir>/evidence/after/` under the before set's file names, with `measure_substance.js` and
`measure_density.js` re-run at 1920) and the diff.

**The first line is `disposition: <recapture|fix|rebuild|ship>`, exactly one of four words.** A
`recapture` return is that line plus a recapture list naming each file and what a valid capture of
it shows; every other return goes on to the verdict table below.

| Disposition | When | What the orchestrator does |
|---|---|---|
| `recapture` | The after evidence is invalid: a blank or wrong-state capture, a frame caught mid-animation, an overlay or consent banner over the content, a width the before set lacks, numbers measured at a different width (`references/review/02-evidence-pipeline.md` § Capture validity) | Nothing the pass reviewed binds. Recapture, then run the pass again |
| `rebuild` | The fix approach cannot reach the finding: the concept is wrong, not the patch | On `design-ui`, one architect re-dispatch naming the failure. On `review-ui` and `improve-ui`, an open question to the owner that the finding needs a redesign |
| `fix` | At least one applied fix scored partial or unresolved, or the batch introduced a regression | One more batch inside the two-round fix cap |
| `ship` | Every applied fix resolved and no regression found | Present the scored list |

**Then the verdict table.** Each applied finding is scored `resolved`, `partial` or
`unresolved`, tied to what the after evidence shows. A claimed fix the evidence does not show is
unresolved. A fix that moved positions while the quality the finding named is still absent is
partial. A fix that removed a device without its named replacement, or moved a substance or
placement number the wrong way, is a regression. After the table come `regressions` (at most
three, judged by the same rubric) and `remaining` (or `clear`). The pass does not hunt: a finding
it was not given is outside its scope.

**The word is derived, never softened.** `ship` needs every row resolved, and it covers the
scored fixes, not the surface. The orchestrator reports the word verbatim. A partial or
unresolved row still open after the second round becomes an `evidence.open_findings` entry when
the CI artifact is written (Report usage above). The loop stops the moment a round resolves
nothing.

**Without a browser** the after evidence is the diff, the re-run scanner, the TypeScript gate
and lint. The pass says so on the line after the disposition and scores code-level fixes only; a
render-only claim is `unresolved [unverified: runtime measurement needed]`, not resolved.

```
disposition: fix
verdict
| Finding | Score | After evidence |
|---|---|---|
| #2 submit button has no accessible name | resolved | accessible name "Place order" in the after snapshot |
| #5 one surface level across the page | partial | measure_substance: surfaceLevels 2 (was 1), the floor asks for 3 |
| #7 hero headline clamp | unresolved | evidence/after/1920.png shows the old size |
regressions: none
remaining: #5, #7
```

(after impeccable's finish reviewer and its verdict pass, Apache-2.0; README § Third-party material)
