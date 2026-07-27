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

A verdict cannot be assigned STRONG/ROBUST/FLUID/INCLUSIVE/RESPONSIVE-tier while its
matching blocker flag is set. Blocker flags are the gate; verdicts are the nuance layered
on top:

- `accessibility_blocker`
- `responsive_blocker`
- `core_task_blocker`
- `runtime_instability`

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
| Pixel-precision alignment claim | Layout metrics, bounding box data, or DOM geometry | Downgrade to "possible -- needs geometry measurement" or remove |
| Motion claim (sluggish/excessive) | Code timing analysis, video, or trace | Downgrade to "code suggests -- verify at runtime" |
| Accessibility violation | WCAG criterion + code/DOM evidence or automated scan result | Keep if code evidence is clear; soften if screenshot-only |
| Contrast failure | Computed color values + contrast ratio | Remove if based on screenshot color estimation only |
| Responsive failure | Evidence at specific viewport width(s) | Keep if code analysis or screenshot at that width exists |
| Performance claim | Metric measurement, code analysis, or trace data | Downgrade to "likely -- measure to confirm" |

### False-positive filters

Remove or downgrade findings that:

- Claim pixel-level precision from screenshots alone (Anthropic documents limited spatial reasoning)
- Assert a platform convention on a product not targeting that platform
- Flag customization of library defaults as a defect (customization is usually the goal)
- Report working responsive behavior as broken because it looks different from desktop
- Escalate pure taste preferences to HIGH or CRITICAL severity
- Flag intentional asymmetry as misalignment
- Criticize a design system for not following a different design system

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
| Pattern smell at CRITICAL | Downgrade to MEDIUM unless evidence supports objective failure |
| Quality defect without user impact | Downgrade to LOW |

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
- Removed: "header alignment off by 2px" -- no geometry evidence, screenshot-only assertion
- Downgraded: "generic color palette" from MEDIUM to TASTE -- no objective quality impact
- Merged: contrast findings from visual + accessibility into finding #3
```
