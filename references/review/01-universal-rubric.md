# Universal Review Rubric

## Layer 1: Dimensions (apply to every UI)

| Dimension | What to judge | Defect signals |
|---|---|---|
| Layout and alignment | Grid logic, invisible axes, consistent margins, element alignment, balance, visual weight distribution. Inspect repeating rows in their WRAPPED (multi-line) state, not just the single-line case | Off-axis elements, ragged edges, unintentional drift, inconsistent gutters, broken grid relationships; a leading marker (chip/icon/bullet/avatar) `align-*: center`-ed against a wrappable block, which sits right on one-liners and drifts to mid-block the moment a row wraps (pin it to the first text line instead) |
| Spacing and grouping | Proximity, separation, rhythm, whitespace hierarchy, breathing room | Groups collapsing, arbitrary gaps, padding drift, dense/noisy clusters, uneven vertical rhythm |
| Typography and readability | Type scale, hierarchy, line length, line height, truncation, emphasis, font loading | Body text < 16px mobile, weak hierarchy, lines > 75ch, clipped labels, color-only emphasis, FOIT/FOUT |
| Color and visual hierarchy | Contrast, semantic color use, interactive emphasis, theme consistency, CTA priority | Low-contrast text, too many accents, decorative-only saturation, unclear CTA priority, broken dark mode |
| Component coherence | Reuse, consistency, system fit, token discipline, variant logic | Same component styled 3 ways, library defaults unmodified, inconsistent radii/shadows/borders |
| State completeness | Empty, loading, error, success, disabled, validation, extreme content. Per-control minimums: every button ships default + hover + active/pressed + disabled (+ loading with spinner when async); every input ships focus + error (border and message) and a warning state where non-blocking issues exist | Only happy-path exists; blank/broken fallback states; no skeleton/spinner; missing validation feedback; buttons with fewer than the four base states; inputs without a visible focus or error treatment |
| Content quality | Clarity, microcopy, placeholder leakage, scannability, action language | Lorem ipsum, generic marketing filler in product UI, labels that don't explain actions, truncation hiding meaning |
| Affordance and feedback | Can users tell what's interactive? What happened after acting? The UI must teach itself through signifiers (containers group and mark selection, gray means inactive, press/hover/active-nav states and tooltips declare what each control affords), never through instructions. Every user action gets a response; actions whose outcome is invisible (copy, save) need an outcome confirmation, not just a pressed state | Clickable text with no affordance, weak focus/pressed states, silent failures, ambiguous cursors, UI that needs explanatory copy to be operable, actions that complete with no visible response |
| Task flow and journey | Whether the primary task can be COMPLETED, not whether its screens render. Name the task and its observable success condition, then judge step sequencing, what state carries between steps, entry from a deep link rather than the front door, exit and abandonment, dead ends, wizard requirements (named steps, back that preserves input, save-and-exit past 3 steps), progressive disclosure, search and filter behaviour, and cognitive load by count rather than impression (method, thresholds and the break tests: `references/usability/01-task-flows-and-journeys.md`) | No observable success condition; typed input lost on back or refresh; a step re-asking for data the system holds (WCAG 3.3.7); a screen with no onward action (success with no next step, error with no retry, zero results with no relaxation, permission denied with no request path); more than 3 steps for a returning user's primary task; a wizard past 3 steps with no save-and-exit; a disclosure hiding required input or a warning; more than one primary decision on a screen; more than 9 peer options at one level |
| Information architecture and navigation | The structure itself, not the nav widget and not keyboard order. Which navigation model is in use (flat, hub-and-spoke, hierarchical, tabbed, hybrid, search-first) and whether it fits; depth against breadth; whether every screen states where the user is; breadcrumbs, back semantics, deep-link and refresh survival; grouping and labelling in user vocabulary (models, thresholds and the audit procedure: `references/usability/03-navigation-and-information-architecture.md`) | No current-location indicator, or more than one; two navigations competing for the same region; hierarchy deeper than 3 levels (4 for tooling) or more than 9 ungrouped peers; a detail view with no route back to its list; list state (scroll, filter, sort, page) lost on back; state a user would share absent from the URL; label drift between nav item, document title, H1 and breadcrumb; breadcrumbs showing history instead of path; "Misc"/"Other"/"More" as a group name; actions inside a `<nav>` landmark |
| Error recovery and state integrity | What happens when something fails, and whether the person's work survives it. Validation timing; whether every error names the cause AND the next action; inline plus summary with focus moved on submit failure; the confirmation-versus-undo decision keyed on reversibility and blast radius; bulk counts; partial-failure reporting; data loss on navigation, reload, session expiry and conflict; recovery from each failure in the inventory (network, timeout, 5xx, auth, permission, conflict, rate limit, quota, crash) (`references/usability/02-forms-and-error-recovery.md`, `references/usability/04-states-feedback-and-affordances.md`) | An irreversible action with neither confirmation nor undo; a bulk action that does not state its count; "some items failed" instead of naming which; an error with no next action; input cleared by a failed submit or a navigation guard that never fires; undo that recreates rather than restores, or expires under 8 seconds; silent optimistic rollback; silent last-write-wins on a conflict; `type="number"` on card/phone/OTP fields; paste blocked on password or OTP; missing `autocomplete` on personal-data fields |
| Accessibility fundamentals | Semantics, keyboard/focus, target size, labels, announcements, reduced motion | WCAG failures, hidden focus, tiny targets, unlabeled controls, motion with no opt-out |
| Density and economy | Whether the UI EARNS the space and time it takes: viewport utilisation, internal width distribution, page length against what the operator came for, copy length in front of controls, and how far an action sits from the thing it acts on. Every other row on this table is a rule against EXCESS; this is the only one against WASTE, and a UI can pass all of them while wasting half the display (thresholds and measurement recipes: `references/review/05-density-and-economy.md`) | Content under 60% of viewport width with no second column or reading-measure reason; any box sized by the LEFTOVER (`margin-*:auto`, unsized column in a `table-layout:fixed`, bare `1fr` beside fixed siblings) whose content has a known maximum; the same entity list rendered three times on one screen; a non-primary section over 40% of page height; a page over 2x viewport with nothing disclosed; visible paragraphs over 30 words in a control surface; a row action over 800px from its row identity; controls scoping the same object separated by 400px of nothing; dead space answered with `margin-inline:auto`, which arranges the waste symmetrically rather than spending it |
| Data visualization (when charts/stats present) | Form matches the data's job, one axis, color assigned by job (identity/magnitude/polarity/status) in fixed slot order, validated palette, legend for 2+ series, table-view twin, tooltips that enhance rather than gate (full method: `references/dataviz/01-choosing-a-form.md` through `04-anti-patterns.md`) | Dual y-axes, rainbow or cycled hues, recolor-on-filter, value-ramp on nominal categories, a number on every point, tooltip-gated values, pie comparing close values, missing table view, eyeballed colorblind-safety |

### Three of these rows cannot be judged from one frame

Every dimension above except **Task flow and journey**, **Information
architecture and navigation**, and **Error recovery and state integrity** is
decidable from a single rendered artifact. Those three are decidable only from a
SEQUENCE: two consecutive screens, a back press, a reload, a forced failure.

That asymmetry is why flow defects survived every earlier version of this rubric.
A checkout whose every screen is pixel-correct and whose step 2 discards step 1's
input scored clean on ten dimensions, because the defect is not in any frame.

The consequence for reviewers:

- **Driven review** (browser or device available): walk the flow, then run the
  break tests in `references/usability/01-task-flows-and-journeys.md` section 10
  (back, refresh, deep link, interrupt, invalid, abandon, double submit, slow,
  sideways entry). Findings on these three rows are direct observations.
- **Source available, no runtime**: reconstruct from the route inventory, submit
  handlers, redirects and error branches. Label every runtime claim as inferred
  and cite the line that supports it.
- **Screenshots only**: the correct verdict on these three rows is **not
  assessed**, never clean. Reporting them clean from static frames is a false
  negative on exactly the class the frames cannot contain.

## Layer 2: Platform overlays (apply when detected)

| Overlay | Applies when | Extra expectations |
|---|---|---|
| Web | DOM/CSS/browser UI detected | Responsive layout, hover/focus parity, reflow, non-text contrast, CLS/INP-aware design, container queries |
| Apple | SwiftUI/UIKit or Apple-style apps | System nav patterns, Dynamic Type, semantic colors, SF Symbols, 44pt targets, Liquid Glass, platform feel |
| Material/Android | Compose/Material or Android-style apps | 48dp targets, adaptive layouts, window size classes, Material component/state behavior, canonical layouts |
| Design file/mockup | Static Figma/export-only review | Visual + IA critique valid; runtime/a11y claims softened unless corroborated |

## Layer 3: Confidence classes

| Class | Meaning | When to use |
|---|---|---|
| Hard defect | Objective, should be fixed | Clipped text, absent focus ring, target below standard, WCAG AA failure, broken state |
| Quality defect | Strongly justified, alternatives exist | Weak hierarchy, noisy spacing, unclear action priority, inconsistent component treatments |
| Pattern smell | Commonly correlated with poor output | Unmodified library defaults, generic gradient hero, template card grid, AI-generated fingerprints |
| Taste note | Advisory only | Different visual direction might fit better; palette feels safe; more distinctive treatment possible |

## Severity scale

| Tag | Use for | Examples |
|---|---|---|
| CRITICAL | Blocks use, accessibility, or basic trust | Hidden focus, unusable viewport, missing labels on core controls, impossible-to-read text, key path broken |
| HIGH | Serious quality regression or likely user friction | Overlapping controls, broken reflow, confusing hierarchy, animation impedes use, color-only status; **and waste at the same scale**: viewport utilisation under 60% with no second column, sidebar or reading-measure reason, or an action a person cannot associate with its object (thresholds and the page-length rule: `references/review/05-density-and-economy.md`) |
| MEDIUM | Noticeable quality gap | Generic visual system, weak emphasis, awkward spacing, missing secondary states, stiff transitions; a section that should be folded and is not; a paragraph in front of a control that should be a sentence |
| LOW | Minor polish issue | Slightly heavy shadow, inconsistent icon weight, minor rhythm drift, subtle alignment offset |
| TASTE | Non-blocking stylistic suggestion | Alternate font pairing, stronger visual personality, more distinctive treatment |

**Waste is not automatically TASTE.** Every example above this line except the
additions describes something BROKEN, and a reviewer calibrating honestly
against them will rank a perfectly-rendered, badly-proportioned page as a
stylistic preference, which does not survive triage in a large review. That is
not hypothetical: it is how a dashboard wasting 1008px of a 2560px display, and
running 2171px long for nine rows of data, passed eight specialist reviews and
121 pull-request findings. Rank waste by the screen and time it costs, and carry
a measurement so it cannot be waved off as opinion. Anything without a
measurement genuinely is TASTE.

## Finding format (canonical)

**This section is the single source of truth for finding format across the
entire plugin.** Every agent, skill, gate, verifier and CI consumer uses exactly
these field names. An agent body that defines its own field names is a bug in
that file, not a local convention: the merge gates key on these names, so a
specialist emitting a variant has its real findings discarded as non-conforming
output. Point at this block, do not restate it.

Every finding answers six questions: what, where in the product, where in the
code, why it matters, how confident, and what to do.

```
[SEVERITY] [CONFIDENCE] <Dimension> -- <short title>
Surface: <screen / component / viewport / state>
Location: <path/to/file.tsx:120-134>   (or: screenshot only)
Issue: <concrete problem>
Why it matters: <user consequence>
Evidence: <measurement, artifact, or quoted code that proves it>
Recommended change: <specific fix, with code when it is short>
```

### Field rules

| Field | Required | Rule |
|---|---|---|
| `[SEVERITY]` | Always | Exactly one of CRITICAL, HIGH, MEDIUM, LOW, TASTE, in square brackets, spelled as in the severity scale above |
| `[CONFIDENCE]` | Review paths | Exactly one of the four Layer 3 classes: Hard defect, Quality defect, Pattern smell, Taste note. Generation and design paths may omit it; review paths may not |
| `<Dimension>` | Always | The Layer 1 row name, verbatim. This is what dedup and per-dimension verdicts key on, so a paraphrase silently creates a new dimension. Specialists whose dimension has no Layer 1 row use their verdict family's name verbatim: `Anti-AI aesthetic`, `Motion quality`, `Responsive quality`, `Runtime smoothness`, `TypeScript safety` (machine `dimension` values `anti-ai`, `motion`, `responsive`, `performance`, `typescript`) |
| `<short title>` | Always | Under ten words. Names the defect, not the fix |
| `Surface:` | Always | Screen, component, viewport or state where it appears. "Settings > Notifications, 390px, error state" |
| `Location:` | Whenever source is in scope | Repo-relative `path:line` or `path:start-end`. When there is no source, one of `screenshot only`, `runtime only`, or the artifact id. This single field satisfies the file:line requirement; never invent a line number to fill it |
| `Issue:` | Always | The concrete problem, in one or two sentences. No fix here |
| `Why it matters:` | Always | The consequence for a person using the product. Restating the issue in other words is the most common failure of this field |
| `Evidence:` | Always | The measurement, the artifact, or the quoted code. "Looks wrong" is not evidence. Geometry and numeric claims follow the geometry evidence rule in `references/review/02-evidence-pipeline.md` |
| `Recommended change:` | Always | A specific direction. Include the code when it is short enough to read inline |

### Optional dimension lines

Added after `Evidence:`, one per line, only when the dimension calls for one.
They are additive; they never replace a required field.

| Line | Used by | Content |
|---|---|---|
| `Tell:` | Anti-AI audit | Catalogue id and name: `S10 skeleton defaults` |
| `WCAG:` | Accessibility | SC number, name, level: `1.4.3 Contrast (Minimum), AA` |
| `Impact:` | Performance | Metric with measured or estimated delta: `INP 420ms -> ~180ms, measured on Slow 3G` |
| `Measurement:` | Density, layout, responsive geometry | The numbers: `content 1552px of 2560px (61%), 1008px unused` |
| `Lens:` | Visual review | Which visual lens produced it |
| `Viewport:` | Responsive | Widths where it reproduces: `320, 360, 768` |
| `Flow step:` | Task flow | Which step of which flow: `Invite teammates, step 2 of 3` |
| `State:` | State and recovery | Which state: `zero results`, `offline`, `partial failure` |

### Worked examples

```
[HIGH] [Hard defect] Task flow and journey -- back at step 2 discards addresses
Surface: Invite teammates flow, step 2 (Choose role), all viewports
Location: src/features/invites/StepRole.tsx:14-31
Issue: Step 2 mounts with its own local form state and does not read the address
list produced by step 1, so browser back returns to an empty step 1.
Why it matters: A user who invites 20 people and goes back to fix one typo
retypes all 20, or abandons the flow.
Evidence: Break test "Back" at step 2; the addresses array is component state in
StepRole.tsx:14 and is never lifted or persisted. Reproduced 3/3.
Flow step: Invite teammates, step 2 of 3
Recommended change: Lift the flow state to the route (or a draft record keyed by
invite id) so every step reads and writes the same object; see
references/usability/01-task-flows-and-journeys.md section 4.
```

```
[MEDIUM] [Pattern smell] Component coherence -- shadcn defaults unmodified
Surface: Dashboard cards, all viewports
Location: src/components/ui/card.tsx:1-24
Issue: Card, Button and Input ship the generated shadcn tokens unchanged
(--radius 0.5rem, default border and shadow), so the product has no component
identity of its own.
Why it matters: The interface reads as a template rather than a product, which
is the single strongest signal users cite when they say something looks
AI-generated.
Evidence: Diff against the shadcn defaults is empty for all three components.
Tell: S1/S2/S3 default shadcn unmodified
Recommended change: Tune radius, border color and shadow against the POV brief;
see references/design/06-shadcn-customization.md.
```

### Gate contract

- A finding missing any required field is non-conforming. Gates report which
  field is missing rather than discarding the finding silently.
- Unknown extra lines are IGNORED, never rejected. A new dimension line can be
  added here without breaking any existing gate.
- One finding per defect. The same defect on nine screens is one finding whose
  `Surface:` and `Evidence:` list all nine, not nine findings.
- The CI artifact and ledger schemas in `ARCHITECTURE.md` carry these same
  fields; a change to the names here is a schema change and bumps
  `schemaVersion` there.

## Objective vs subjective boundaries

### Flag strongly (objective enough)

- Clipped or truncated essential text
- Controls obscured by sticky/fixed elements
- Insufficient focus visibility
- Target sizes below platform/WCAG minimums
- Contrast failures for text or functional non-text
- Missing/broken empty/error/loading states where flow requires them
- Inconsistent/misleading action labels
- Color as sole status indicator
- Inaccessible icon-only controls
- Gesture-only critical actions with no visible alternative
- Horizontal scroll in primary content on common viewports
- Broken keyboard navigation paths (movement mechanics; the navigation MODEL is judged under Information architecture and navigation)
- Text set directly on a photo with no scrim/gradient securing legibility
- A screen with no onward action: success with no next step, error with no retry, zero results with no way to relax the query, permission denied with no request path
- Typed input destroyed by back, reload, a failed submit, or session expiry
- An irreversible action with neither a confirmation naming the object nor an undo that restores it
- A step that re-asks for data the system already holds (WCAG 3.3.7 Redundant Entry)
- No current-location indicator, or more than one active at the same time
- List state (scroll position, filters, sort, page) lost on back from a detail view
- Returnable or shareable state absent from the URL: query, filters, tab, page, selected item
- Partial failure reported without naming which items failed

### Usually quality defects, not hard blockers

- Uneven spacing rhythm
- Hierarchy that doesn't make primary action obvious
- Overly dense or sparse layout
- Inconsistent component treatments across screens
- Unreadable data tables or chart legends
- Decorative motion that distracts from task
- Product UI with vague promotional copy instead of clear action language

### Usually taste-only

- Design feels generic
- Visual language lacks personality
- More distinctive typography could help
- Palette feels safe or over-familiar

These can still be useful findings, but they must not crowd out real defects.

## Key rule

The plugin is opinionated about quality, not dogmatic about style. A distinctive interface that breaks conventions for a reason scores better than a generic but clean template. A technically broken but visually trendy interface scores poorly.
