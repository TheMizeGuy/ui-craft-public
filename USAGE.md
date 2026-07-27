# ui-craft Usage Guide

A walkthrough of each skill: what to type, what happens, and what you get back. For the
agent/reference file map, see [`README.md`](README.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Quickstart

1. **Install**: see [Installation](README.md#installation) in the README (`ui-craft-public`
   marketplace, or this repo's own single-plugin marketplace manifest).
2. **Pick the skill**: `review-ui` for a quick targeted check, `improve-ui` when the question
   is "is this actually good" (it is the one that runs every applicable specialist, the
   verifier, and the per-dimension verdict table), `design-ui` to build something new,
   `optimize-ui` for performance alone. The comparison table is
   [Which skill?](README.md#which-skill) in the README.
3. **First invocation**: from any project with UI code, run:
   ```
   /ui-craft:review-ui
   ```
   With no argument, this reviews your uncommitted + staged changes filtered to UI-relevant
   files. Pass a path, a screenshot, `staged`, `pr`, or `all` to target something else.
4. **What to expect**: agents are pinned to Opus 5 at dispatch (thinking always on) and never
   modify files themselves; the invoking session applies findings or generated code only after
   you explicitly approve. The exception to read-only is the plugin's own state, all of it under
   `.claude/ui-craft/` in the reviewed repo and all of it announced in one line: the three review
   skills write `last-review.json` on every run without asking (it is what makes the second
   run a delta instead of a cold re-listing), and a full `improve-ui` pass also writes
   `runs/<timestamp>/merged-report.md`, because a seven-specialist report exceeds the ~60KB at
   which a subagent's reply truncates. Add `.claude/ui-craft/` to `.gitignore` if your repo runs
   a clean-tree check, but do not ignore `.claude/` wholesale: gate artifacts under
   `.claude/ui-craft-artifacts/` are meant to be committed.
5. **Strongest first run**: a code-only run has no geometry data, so every unmeasured spatial
   claim (alignment, spacing, target size, overflow) comes back marked
   `[unverified: geometry measurement needed]` and capped at MEDIUM, however bad it looks.
   Provide Playwright MCP on web, or a running app with an accessibility-tree snapshot on
   native, and those findings arrive at their real severity. On a
   TypeScript project, `"ts7": "npm:typescript@~7.0.2"` in devDependencies is what makes the
   typecheck gate run for real instead of falling back or reporting a skip.

## Walkthrough: `/ui-craft:design-ui`: design new UI

**You type:**
```
/ui-craft:design-ui a settings page for a developer tool: dark theme, dense, keyboard-first
```

**What happens:**

1. The skill parses the brief: what to design (a settings page), stated constraints (dark
   theme, dense, keyboard-first), any stated framework (here, none, so it checks the repo), and
   the display range the design must survive (default 320 / 390 / 900 / 1440 / 2560).
2. If an existing repo is present, it reads `package.json` (framework, React/Tailwind
   versions), the token system (`globals.css` / `tailwind.config.*`: color format, whether
   shadcn defaults are still in place), existing `components/ui/*` primitives, and the
   workspace root. A greenfield project skips this.
3. It pulls up to three advisory seeds from the internal style taxonomy: a style family, a
   domain convention row, and a font pairing. Seeds are raw material for the architect's
   point-of-view, never a substitute for it, and the anti-AI-tells catalogue wins on conflict.
4. It builds a self-contained prompt (the architect has zero conversation context) and
   dispatches `ui-craft:ui-craft-architect`.
5. The architect reads the aesthetic, design, usability, responsive, accessibility and
   architecture references (catalogue/01 as the hard floor) before writing anything, writes the
   task flow down before any token exists, commits to a point-of-view, builds the full OKLCH
   token system, designs each requested component in production-grade code, then runs the
   taste-checklist audit against its own output before returning.
6. Generated code is code, so it gets reviewed before you see it: the skill dispatches
   `ui-craft:ui-responsive-reviewer` and `ui-craft:ui-accessibility-reviewer` in parallel over
   the fresh output, read-only. Any CRITICAL or HIGH finding goes back to the architect in the
   one re-dispatch allowed.

**You get:**

```
## UI Design

### Point of view
A dense, keyboard-first control surface for people who live in it eight hours a day, not a
marketing-site settings page. [...full 3-4 sentence POV statement, including what it explicitly
does NOT do.]

### Token system
```css
@theme {
  --color-accent: oklch(0.62 0.14 250);
  --color-accent-hover: oklch(from var(--color-accent) calc(l + 0.05) c h);
  ...
}
```

### Components
`components/settings/settings-nav.tsx`
```tsx
[full component code, no elided bodies]
```
[one file block per requested component]

### Composition example
```tsx
[a full page assembling the components above]
```

### Taste audit
| Section | Result |
|---|---|
| Color has a POV | PASS |
| Typography is distinctive | PASS |
| ... | ... |

### Open questions
- Should the danger-zone actions (reset, delete) get a confirmation modal or inline expand?
```

The skill gates this output against seven mechanical acceptance criteria before showing it to
you: POV present and naming what the design does NOT do, every color value `oklch(...)`, no
elided component bodies, at least one full composition, taste audit table present, zero hits for
tells like `#6366f1`, `lorem`, `"Get started"`, and a four-part responsive floor (a stated
behavior at every width in the display range with no horizontal overflow at the narrowest, no
fixed pixel sizing on layout containers, no `100vh`/`h-screen` on full-height surfaces, and
`@container` rather than `sm:`/`md:`/`lg:` on portable components). The pre-ship audit findings
print below the design under a `## Pre-ship audit` heading. Then it asks what to apply:

```
Apply this design to the project? Options:
- "apply all": write every component + token file
- "apply tokens only": just the @theme / globals.css changes
- "apply settings-nav": specific components
- "revise typography": adjust POV/colors/typography/layout/sizing
- "skip": take the output and apply yourself
```

Nothing is written until you pick one; the orchestrating session applies the files itself with
`Edit`/`Write`, and the architect agent never writes to disk. After applying, the skill runs the
typecheck gate, lint, and (on Tailwind v4) an `@theme` token resolution check on the paths it
touched, then reports any breakage with the fix. Code that does not compile is not applied work.

## Walkthrough: `/ui-craft:review-ui`: standard review

**You type:**
```
/ui-craft:review-ui src/components/CheckoutForm.tsx
```

**What happens:**

1. The skill resolves the scope to that one file and detects the platform from surrounding
   project files (`package.json` with react/vue/svelte/next → Web; `*.swift` with
   `import SwiftUI` → iOS/Apple; `build.gradle` or Compose `*.kt` → Android; screenshots only →
   screenshot-only mode).
2. It maps the flows the scope sits in before reviewing any of it: entry points, the 1-3
   primary tasks in the user's language ("complete a checkout"), and each task's ordered steps
   with the file that owns each one. A defect like "input lost on the step-2 back button" lives
   between files and is invisible to a per-file pass. A single leaf component with no task says
   so and skips the step.
3. It gathers project context in parallel: for web, the framework, `tailwind.config.*` or
   `globals.css` token system, and `tsconfig.json` strictness. It then establishes the evidence
   level explicitly rather than assuming one: code + browser, code-only, or screenshot-only.
4. It decides which 2-3 specialists to dispatch. A web component always gets
   `ui-craft:ui-visual-reviewer` and `ui-craft:ui-accessibility-reviewer`; web also defaults in
   `ui-craft:ui-responsive-reviewer` (3 agents total here). `ui-craft:ui-motion-reviewer` joins
   if animation is in scope, `ui-craft:ui-anti-slop-auditor` if the user asked whether it looks
   AI-generated, `ui-craft:ui-perf-engineer` if performance is a stated concern, and
   `ui-craft:ui-typescript-engineer` on TS projects.
5. If a browser and a URL are both available, the skill captures the viewport matrix itself
   (one screenshot plus one geometry dump per width) before dispatching, and hands those files
   to every specialist as read-only evidence. Specialists share one browser, so letting them
   each resize would invalidate each other's measurements.
6. All chosen specialists run in parallel, each reading its own reference files (the universal
   rubric, the internal catalogue where relevant, the evidence pipeline, plus the platform
   overlay for scope) before reviewing.
7. There is no dedicated verifier agent in this standard path; the coordinator applies the
   verifier's rules directly during the merge: deduplicate using the grouping rules in
   `references/review/04-verdicts-and-verification.md`, validate severities (taste never at
   HIGH/CRITICAL; accessibility blockers never below HIGH), mark every unmeasured spatial claim
   `[unverified: geometry measurement needed]` and cap it at MEDIUM, set the blocker flags, then
   re-rank and number the findings.

**You get:**

```
## UI Quality Review

**Scope:** src/components/CheckoutForm.tsx
**Platform:** Web
**Specialists:** ui-visual-reviewer, ui-accessibility-reviewer, ui-responsive-reviewer
**Dimensions not reviewed:** motion (no animation in scope), runtime and type safety (not requested)
**Evidence level:** code-only
**Flows reviewed:** complete a checkout (3 steps)

### Dimension Verdicts

| Dimension | Verdict | Blockers | Key finding |
|---|---|---|---|
| Visual quality | ADEQUATE | 0 | CTA priority unclear against the secondary action |
| Accessibility | GAPS | 1 | Submit button has no accessible name |
| Responsive quality | ADEQUATE | 0 | Summary column drops to one line at 375px |

**Blocker flags set:** accessibility_blocker (finding 1)

**Findings:** 0 CRITICAL, 1 HIGH, 2 MEDIUM, 1 LOW, 1 TASTE
**Verdict:** fix the HIGH before shipping

1. [HIGH] [Hard defect] Accessibility -- submit button has no accessible name
Surface: CheckoutForm.tsx:88
Issue: <button><IconArrow /></button> with no aria-label or visible text
Why it matters: screen reader users hear "button" with no indication of what it does
Evidence: rendered markup has no accessible name in the code path
Recommended change: add aria-label="Place order" or visible button text
...
```

Every finding carries a severity tag, one of the four canonical confidence classes, the
affected surface, why it matters, the evidence behind it, and a recommended fix. The verdict
table gets a row per dispatched dimension only, and the header names every dimension that went
unreviewed and why, so a clean report never hides a dimension nobody looked at. If you pick
findings to apply ("all HIGH", "finding 1 and 3"), the orchestrating session applies them
with `Edit`/`Write`: the reviewer agents themselves never touch the filesystem.

**Second run, same scope:** if `.claude/ui-craft/last-review.json` already holds a prior run
for `src/components/CheckoutForm.tsx`, the report opens with a delta section before the full
findings list:

```
### Delta since 2026-07-05T14:02:11Z
NEW: 1 -- [HIGH] Accessibility -- submit button has no accessible name
RESOLVED: 2 -- both LOW spacing findings from the prior run, re-verified as fixed
STILL OPEN: 1 -- [MEDIUM] Color -- CTA priority unclear vs secondary action
REGRESSED: 0
IMPROVED: 1 -- prior HIGH contrast finding now MEDIUM
Carried forward: 2 -- motion findings, dimension not reviewed this run
```

RESOLVED means re-verified as actually fixed, not merely unreported. A prior finding whose
dimension this run did not cover is carried forward untouched rather than silently resolved,
so a narrow review can never erase a wider one.

A missing or unreadable ledger is silent: the report just runs cold, as above. The ledger is
refreshed with this run's findings either way, so the next run has something to diff against.

`review-ui` does not offer to write a CI gate artifact. The gate schema requires six verdicts
(visual, responsive, motion, accessibility, runtime, anti-AI aesthetic) and this pass dispatched
three specialists, so any artifact it wrote would either be missing required keys or carry
invented verdicts for dimensions nobody reviewed. When the reviewed repo has a
`.claude/ui-craft-artifacts/` directory or the gate script wired in, the report says so and
points at `/ui-craft:improve-ui`, which runs the full set and offers the write. See **CI gate**
and **Review ledger** in [README.md](README.md#toolkit) for the artifact and ledger schemas.

## Walkthrough: `/ui-craft:improve-ui`: full team pass

**You type:**
```
/ui-craft:improve-ui all
```

**What happens:**

1. Same scope resolution as `review-ui`, but `all` reviews the entire project (excluding
   `node_modules`, `dist`, `.build`, `Pods`, `DerivedData`). Above 100 files the skill warns
   that this will take several minutes before proceeding.
2. Pre-flight context gathering is comprehensive: every dependency, every `tsconfig` strictness
   flag, the full token system, component/page counts, font and icon usage, existing perf
   tooling.
3. Instead of dispatching specialists directly, the skill dispatches `ui-craft:ui-team-lead`.
   Because plugin-namespaced dispatch silently strips the `Agent` tool a sub-orchestrator needs
   (the RUNTIME DISPATCH NOTE at the top of `agents/ui-team-lead.md`), this happens via
   `subagent_type: "general-purpose"` with the team lead's full agent body inlined as the
   prompt prefix, where every `${CLAUDE_PLUGIN_ROOT}` occurrence in that body is substituted with
   the resolved absolute plugin root before dispatch, never routed through the plugin
   namespace directly.
4. The team lead dispatches every applicable specialist in parallel, up to 7 of them (visual
   and usability, anti-slop, accessibility, motion, responsive, perf, typescript, whichever apply
   to the platform and evidence level), waits for all of them, then runs `ui-craft:ui-verifier`
   last, always last, never in parallel: evidence sufficiency, false-positive filtering,
   deduplication, severity re-validation. It deliberately skips inapplicable specialists rather
   than dispatching them for completeness, because an undispatched dimension is an honest gap
   while a speculative verdict row manufactures confidence the run never earned.
5. The team lead merges everything into one report with a per-dimension verdict table, so an
   accessibility gap can never get buried under an otherwise-strong visual score, and writes it
   to `.claude/ui-craft/runs/<timestamp>/merged-report.md` before returning. That file, not the
   returned message, is the deliverable: a seven-specialist report with code extracts routinely
   exceeds the ~60KB at which a subagent's reply truncates.

**You get:**

```
## UI Quality + Improvement Report

**Scope:** entire project (142 files)
**Platform:** Web
**Specialists dispatched:** visual + usability, anti-slop, accessibility, responsive, motion, perf, typescript (7 of 7) + Verifier
**Dimensions not reviewed:** none
**Evidence level:** code + browser
**Widths exercised:** 320, 375, 430, 768, 1024, 1440
**Flows reviewed:** complete a checkout (4 steps), invite a teammate (3 steps)
**Token system:** shadcn default
**Primary font:** Inter, FAIL
**CWV estimate:** LCP ~3.1s, INP ~180ms, CLS ~0.04
**TS strictness:** partial
**POV:** none detected

### Delta since 2026-07-19T09:41:02Z
- **NEW** (4)
- **RESOLVED** (6), re-verified
- **STILL OPEN** (7), same severity
- **REGRESSED** (1), higher severity now
- **IMPROVED** (2), lower severity now
- **Carried forward** (0), dimension not reviewed this run

### Dimension Verdicts

| Dimension | Verdict | Blockers | Key finding |
|---|---|---|---|
| Visual quality | ADEQUATE | 0 | Inconsistent card radii across 3 components |
| Anti-AI aesthetic | GENERIC | 1 | Default shadcn token fingerprint shipped untouched in globals.css |
| Accessibility | GAPS | 2 | Two icon-only buttons have no accessible name |
| Motion quality | ADEQUATE | 0 | Modal transition ignores prefers-reduced-motion |
| Responsive quality | FRAGILE | 1 | Checkout summary clips the pay button below 430px |
| Runtime smoothness | ACCEPTABLE | 0 | Hero image not responsive-sized |
| TypeScript safety | SOUND | 0 | -- |

**Blocker flags:** accessibility_blocker=set by #2, responsive_blocker=set by #3, core_task_blocker=not set, runtime_instability=not set

### Summary

**Findings:** 1 CRITICAL, 3 HIGH, 5 MEDIUM, 4 LOW, 2 TASTE
**Verdict:** fix blockers before shipping

### All Findings
[numbered list, CRITICAL first, TASTE last, each retaining its dimension tag]

### Verification Notes
[findings the verifier removed, downgraded, capped, reclassed, upgraded, or merged, each with a
one-line reason. Never omitted: "none" when there were none]

## Improvement plan (ordered by impact)

### Quick wins (under 30 min each)
### Flow pass (task completion, recovery, navigation)
### Design pass (requires creative decisions)
### Performance pass (measurement needed)
### Type safety pass (mechanical)
[passes with zero findings are omitted]
```

Use `improve-ui` for pre-launch quality gates, a full-project audit, or any time the honest
question is "is this good": it is the only path that runs every applicable specialist, the only
one with a dedicated verifier, and the only one that can produce a gate-valid CI artifact (it
offers the write after the report, and refuses to write a partial one if a base dimension was
skipped). Use `review-ui` for a quick, targeted check where the team lead's extra coordination
overhead isn't worth it. If you only wanted an audit (no changes), the skill stops after
presenting; otherwise it prompts for which findings to apply, then runs the typecheck gate and
lint after applying.

## Walkthrough: `/ui-craft:optimize-ui`: performance audit

**You type:**
```
/ui-craft:optimize-ui src/app/page.tsx
```

**What happens:**

1. Same scope resolution as `review-ui`, performance-only.
2. Pre-flight context: framework, bundler, `tsconfig` strictness, existing perf tooling
   (`lighthouserc.*`, `web-vitals`, `@next/bundle-analyzer`).
3. The skill dispatches a single agent, `ui-craft:ui-perf-engineer`: no orchestrator, no
   verifier. On web this agent owns both load/delivery performance (Core Web Vitals, bundle
   size, font/image loading, hydration) and runtime/rendering stability (jank, dropped frames,
   unnecessary re-renders); on native platforms it also covers SwiftUI body-recomputation and
   Compose recomposition-scope issues.
4. It measures first, rather than guessing at impact: the typecheck gate
   (`node node_modules/ts7/bin/tsc --noEmit`, falling back to
   `node node_modules/typescript/bin/tsc --noEmit` where the `ts7` alias is absent, and never
   bare `tsc`, since both packages declare that bin), the project's build, and Lighthouse when
   the project has it configured. The real TS7 gate needs `"ts7": "npm:typescript@~7.0.2"` as a
   devDependency (`references/typescript/01-ts6-essentials.md` § The TypeScript 7 typecheck
   gate); without it the tooling line below reads as a fallback or a skip, never a silent pass.

**You get:**

```
## Performance Review

**Scope:** src/app/page.tsx
**Platform:** Web
**Evidence level:** code + build
**Likely LCP element:** hero <Image> (no `priority`, no explicit width/height)
**Tooling:** TS7 gate OK, build OK, Lighthouse unavailable (no lighthouserc.* found)
**Runtime smoothness:** SLUGGISH
**runtime_instability:** not set

**Findings:** 1 CRITICAL, 2 HIGH, 1 MEDIUM, 0 LOW, 0 TASTE
**Verdict:** fix the CRITICAL before shipping

1. [CRITICAL] Core Web Vitals -- hero image not marked as LCP candidate
File: src/app/page.tsx:22
Impact: +800ms LCP on 4G (estimated from unoptimized <img> vs next/image with priority)
Current:
```tsx
<img src="/hero.jpg" alt="Product hero" />
```
Fix:
```tsx
<Image src="/hero.jpg" alt="Product hero" priority width={1600} height={900} />
```
Reference: references/performance/01-core-web-vitals.md
...

### Perf budget check
| Metric | Budget | Estimated | Status |
|---|---|---|---|
| LCP | < 2.5s | ~3.3s | FAIL |
| JS bundle | < 170KB | 142KB | PASS |
```

Every finding carries a quantified impact line ("+800ms LCP", "+120KB JS"), measured when
tooling is available, cited from the reference when it isn't; the tooling section states
plainly what ran and what didn't, never a silent skip. After applying any fix, the skill
re-runs the typecheck gate and build to confirm the change compiles, then re-measures when a
URL is available. A perf fix with no after-number is an assertion.

This pass refreshes the same ledger the other review skills use, recording `performance` as the
only dimension it covered and carrying every other dimension's prior findings through untouched.
A second `optimize-ui` run on the same scope therefore opens with a perf delta, and a later
`review-ui` pass does not erase the perf history. Like `review-ui`, it never writes a CI gate
artifact: a single-dimension pass cannot fill six required verdicts.

## Charts, dashboards and stat tiles

Data visualization is a first-class dimension, not an afterthought, and it is the one place
the plugin ships a runnable check instead of a judgement. Nothing extra to type: a brief or a
scope containing charts pulls in `references/dataviz/01-choosing-a-form.md` through
`04-anti-patterns.md` automatically.

**Designing one.** A brief that mentions charts routes the architect through the dataviz
references before it picks a form:

```
/ui-craft:design-ui an ops dashboard: 8 service health tiles, a 7-day latency trend,
and a per-region error breakdown. Dark, dense, glanceable at 3 feet.
```

The architect chooses the form from the data's job rather than from a chart-type menu (a
7-day trend is a line, a per-region breakdown with 6+ regions is a sorted bar, not a pie),
assigns color by job in fixed slot order (identity, magnitude, polarity, status), ships a
legend for anything with 2+ series and a table view twin, and returns the palette as concrete
hex values so the next step can check them.

**Validating the palette.** The six checks live in
`references/dataviz/02-color-jobs-and-validation.md`. Four of the six are computable from hex
values alone, and the script measures those four plus a normal-vision separation floor. Zero
dependencies, Node 18 or later, no install. Run it on the palette the design returned:

```bash
node scripts/validate_palette.js "#2a78d6,#008300,#e87ba4,#eda100,#1baf7a" --mode light
```

```
Palette (light, surface #fcfcfb, categorical): 5 slots
  [PASS] Lightness band         all 5 inside L 0.43-0.77
  [PASS] Chroma floor           all 5 >= 0.1
  [PASS] CVD separation         worst adjacent #1baf7a↔#eda100 ΔE 9.1 (protan) · tritan 5.8
  [PASS] Normal-vision floor    worst adjacent #eda100↔#e87ba4 ΔE 19.6 (normal)
  [WARN] Contrast vs surface    below 3:1 -- relief required (visible labels or table view): [["#e87ba4",2.62],["#eda100",2.11],["#1baf7a",2.74]]

  → ALL COMPUTABLE CHECKS PASS  (CVD in the 6-8 floor band is legal ONLY with secondary encoding: direct labels, gaps, or texture)
  not evaluated: check 1 (fixed hue order) and check 6 (values come from the documented palette).
```

Exit code is 0 unless a check hard-fails, so it drops straight into a pre-commit hook or a CI
step. WARN bands do not fail the run: they are legal only with the secondary encoding the line
names. Checks 1 and 6 (fixed hue order, values drawn from the documented palette) are structural
and unmeasurable from hex alone, which is why the report says so on every run: a PASS line means
the computable checks passed, never that the palette is approved. Pass
`--mode dark --surface "#1a1a19"` for a dark chart surface, `--ordinal` for a sequential ramp,
and `--pairs all` for scatter, bubble and map palettes where any two slots can end up adjacent.

**Reviewing one.** Chart defects come back in the data-visualization dimension of a normal
`review-ui` or `improve-ui` pass, in the same finding shape as everything else:

```
4. [HIGH] [Hard defect] Data visualization -- second y-axis makes an invented correlation
Surface: src/components/LatencyPanel.tsx:61
Issue: latency (ms) on the left axis and error rate (%) on the right, independently scaled
Why it matters: the crossing point is an artifact of two arbitrary scales, not a relationship
  in the data; rescaling either axis moves it anywhere you like
Evidence: <YAxis yAxisId="right" orientation="right" domain={[0, 5]} /> alongside the default
  left axis with domain={[0, 400]}
Recommended change: split into two stacked panels sharing the x-axis, or plot the error rate
  as a shaded band behind the latency line with one axis and a direct label
Reference: references/dataviz/04-anti-patterns.md
```

The rest of the catalogue behind that dimension is dual axes, rainbow or cycled hues,
recolor-on-filter, value ramps on nominal categories, a number printed on every point,
tooltip-gated values, pies comparing close values, missing table views, and eyeballed
colorblind-safety.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `improve-ui` seems to hang or never dispatches its specialists | The team lead was invoked via the plugin namespace (`ui-craft:ui-team-lead`), which silently strips the `Agent` tool it needs | Dispatch via `subagent_type: "general-purpose"` with the team lead's full agent body inlined, substituting `${CLAUDE_PLUGIN_ROOT}` for the resolved plugin root (see the RUNTIME DISPATCH NOTE at the top of `agents/ui-team-lead.md`) |
| A finding carries `[unverified: geometry measurement needed]` and sits at MEDIUM when it looks worse than that | No DOM bounding-box or layout-bounds data was available for that spatial claim, so the geometry evidence rule in `references/review/02-evidence-pipeline.md` capped it | Provide Playwright MCP (web) or a running app with an accessibility-tree snapshot so the specialist measures instead of estimating. Taking the measurement removes the modifier and restores the finding's natural severity |
| "Screenshot-only review covers visual quality and estimated accessibility..." message, fewer specialists than expected | Only screenshot files matched scope -- no code, no running app | Expected behavior. Point the skill at source files or a running app to unlock responsive, motion, and runtime review |
| Report is missing a dimension you expected (for example no motion findings on a static page) | `review-ui` dispatches 2-3 specialists; anything else is conditional on scope. This is never silent: the report header carries a **Dimensions not reviewed** line naming each one and why | Ask for that dimension explicitly, or use `improve-ui`, which runs every applicable specialist plus the verifier |
| Findings cite a reference file that seems out of date | Cache split-brain: the plugin cache was not re-synced after a source edit | Re-sync the plugin cache from source and start a fresh session (directory-source plugins do not auto-refresh on edits) |
| `improve-ui` returns a truncated report, or the tail of a long pass is missing | A subagent final message truncates around 60KB and a seven-specialist pass exceeds it | Read `.claude/ui-craft/runs/<timestamp>/merged-report.md` in the reviewed repo. That file is the deliverable; the returned message is the pointer |
| The CI gate fails on a run whose report looked GREEN | The gate needs a schema-valid artifact bound to the reviewed sha, six GREEN verdicts, GREEN `overall`, and an empty `blocker_findings`. YELLOW does not soft-pass, and `review-ui` never writes an artifact at all | Run `/ui-craft:improve-ui`, accept the artifact write, commit the artifact, and read `ci/README.md` for the full policy |
| "Entire project" (`all`) scope times out or reviews too much | No path filter applied; large repos exceed the file-count warning threshold | Scope to a directory or `diff`/`staged`/`pr` instead of `all` on large repos |
