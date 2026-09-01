---
name: optimize-ui
description: |-
  Use this skill when the user asks to optimize UI performance: Core Web Vitals (LCP, INP, CLS), bundle size, rendering performance, runtime smoothness, font loading, image optimization, or framework-specific patterns (React compiler, RSC, Suspense, hydration; SwiftUI/Compose re-render stability). Triggers: "optimize my UI", "make the page faster", "fix LCP", "reduce bundle size", "optimize for Core Web Vitals", "UI performance audit", "speed up the page", "reduce CLS", "fix INP", "the UI feels janky", "dropped frames". Dispatches the ui-craft:ui-perf-engineer agent (pinned to the Fable 5.1 lane at dispatch) which measures first (Lighthouse / tsc / bundle analysis if available), then produces severity-tagged findings with estimated metric impact and concrete code fixes.
argument-hint: '[path | file | directory | url | "staged" | "diff" | "pr" | "all"]'
allowed-tools: Bash, Read, Grep, Glob, Edit, Write, TodoWrite, Agent
---

# Optimize UI

You are coordinating a performance review and optimization of UI code. Your job is to gather context, dispatch the perf engineer, and present actionable results.

For a multi-dimension review use `review-ui`; for the full pass with the verifier use `improve-ui`. This skill is performance-only.

**Read-only until the user picks.** The only file this skill writes unasked is the review ledger (Step 6). The `Edit`/`Write` grant in the frontmatter exists for that and for the Step 5 apply step.

## Scope of the perf engineer

`ui-craft:ui-perf-engineer` owns two adjacent dimensions in one agent: (1) load and delivery performance, meaning Core Web Vitals, bundle size, font/image loading, hydration; and (2) runtime and rendering stability, meaning jank, dropped frames, layout thrash, unnecessary re-renders. On web this is the full CWV + bundle + rendering picture. On native, it also covers rendering stability: SwiftUI body re-computation and `@State`/`@Observable` churn, Compose recomposition scope and `remember`/`derivedStateOf` misuse. Include those angles in the prompt when the platform is Apple/Android.

Both halves report under one dimension, `Runtime smoothness`, whose verdict family is RESPONSIVE / ACCEPTABLE / SLUGGISH / UNSTABLE. The CI artifact key for it is `runtime`; the finding `dimension` value is `performance`.

## Execution mode

The review is dispatched, never run inline in the orchestrating session. The `ui-perf-engineer` runs as a Fable 5.1 subagent: pin `model: "fable"` and put the attestation line `FABLE-ESCALATION: ui-ux-frontend -- <one-line reason>` first in its prompt (the standing lane for UI/UX, frontend, and design work, owner directive 2026-09-01; a policy-gated harness checks for that line, and it costs nothing where nothing checks). If the harness rejects the `fable` alias, re-dispatch the same prompt with `model: "opus"` (Opus 5), the floor for UI work. Never omit `model` (an omitted model inherits the session model, which a policy-gated harness denies) and never use a dated model ID. The orchestrator conducts on the session model: scope, context, the prompt, gating, and the ledger. Run the perf engineer's measurement-first process inline only when no Agent tool exists in the current context, say so in the report header, and keep it read-only.

## Finding vocabulary (single source, do not restate)

The finding template, the severity scale, and the confidence classes live in `${CLAUDE_PLUGIN_ROOT}/references/review/01-universal-rubric.md`. Confidence is exactly one of `Hard defect`, `Quality defect`, `Pattern smell`, `Taste note`; `ci/ui-craft-gate.sh` hard-rejects anything else. **There is no "Possible issue" confidence class.** An unmeasured runtime claim keeps its canonical confidence class, carries `[unverified: runtime measurement needed]` on its `Evidence:` line, and is capped at MEDIUM until it is measured. That cap is the whole reason this skill measures first.

Every finding carries `id` (`performance-<kebab-slug>`), `dimension` (`performance`), `file`, and `line`.

## Step 1: Determine scope

Same resolution rules as `review-ui`:

| Argument | Meaning |
|---|---|
| (empty) or `diff` | Uncommitted + staged, filtered to UI files |
| `staged` | Only staged files |
| `pr` | Diff vs `main`/`master` |
| `<file>` / `<directory>` | Specific target |
| `<url>` | A running app or preview deployment. The only scope on which LCP, INP, and CLS can be measured rather than estimated; can be combined with a path |
| `all` | Entire project |

Include: components, pages, layouts, styles, configs (next.config, vite.config, tailwind.config, package.json). Exclude: node_modules, dist, build, .build, .next, Pods, DerivedData.

### Check for a prior ledger

Check for `.claude/ui-craft/last-review.json` in the target repo. If present and its `scope` overlaps, load it: any prior `performance`-dimension finding is this run's baseline, and Step 5 reports the delta.

## Step 2: Pre-flight context (parallel)

1. **package.json**: framework, React version, bundler (webpack / Vite / Turbopack).
2. **next.config.ts / vite.config.ts**: any perf-relevant config (images, fonts, experimental flags).
3. **tsconfig.json**: strict flags, target, module.
4. **Existing perf tooling**: Glob for `lighthouserc.*`, `.lighthouseci/`, `web-vitals`, `@vercel/analytics`.
5. **Bundle analysis**: check if `@next/bundle-analyzer` or `rollup-plugin-visualizer` is installed.

For native targets, note SwiftUI vs UIKit / Compose vs XML split and whether Instruments or a profiler trace is available.

### Step 2a: Establish the evidence level

| Result | Evidence level | What it permits |
|---|---|---|
| Browser tool + URL + source | `code + browser` | Measured CWV, real traces, verified findings at natural severity |
| Source only | `code-only` | Static analysis and cited reference impacts; every runtime claim carries the unverified modifier |
| Neither | Refuse | Say so and ask for a URL or a build |

Pass the level into the agent prompt and print it in the report header. Never claim measured numbers on a `code-only` run.

## Step 3: Construct the agent prompt

```
SCOPE: review these files for performance:
<absolute path list, plus the URL when one was supplied>

PLATFORM: <web / iOS / Android>
EVIDENCE LEVEL: <code + browser / code-only>

PROJECT CONTEXT:
- Root: <absolute path>
- Framework: <react/next/vite/remix/astro; or SwiftUI/Compose>
- React version: <version>
- Bundler: <webpack/vite/turbopack>
- Tailwind: <v3/v4/none>
- Image optimization: <next/image / manual / none>
- Font loading: <next/font / manual preload / Google Fonts CDN / none>
- Perf tooling installed: <web-vitals / vercel-analytics / lighthouse-ci / none>
- Bundle analyzer: <available / not installed>

PRIOR PERFORMANCE FINDINGS: <performance-dimension entries from the ledger, or "none">

PLUGIN REFERENCES: ${CLAUDE_PLUGIN_ROOT}/references/performance/ (7 files, 01 through 07). Read every one of them BEFORE reviewing.
Also read: ${CLAUDE_PLUGIN_ROOT}/references/design/05-tailwind-v4.md for Tailwind v4 perf, and
${CLAUDE_PLUGIN_ROOT}/references/review/01-universal-rubric.md for the finding format.

TASK:
1. Read all files in scope.
2. Read all seven performance reference files.
3. If available: run the TypeScript 7 gate by path, resolving the compiler by version (the first of
   `node_modules/ts7/bin/tsc`, `node_modules/@typescript/native/bin/tsc`, `node_modules/typescript/bin/tsc`
   whose `--version` prints `Version 7.`; never bare `tsc`; read the exit code from a log, never the
   output), the build command, and Lighthouse.
4. Identify the likely LCP element per page (web) or the most re-render-prone view (native).
5. Review all perf angles per your system prompt: load/delivery AND runtime/rendering stability.
6. Quantify estimated impact for each finding ("+800ms LCP", "+0.15 CLS", "+120KB JS",
   "dropped frames on scroll").
7. Output in the canonical finding format, with the impact line, plus `id`/`dimension`/`file`/`line`.
8. Severity: CRITICAL (CWV threshold breach or visible jank), HIGH (significant cost),
   MEDIUM (material), LOW (minor), TASTE (micro). Any unmeasured runtime claim carries
   `[unverified: runtime measurement needed]` on its Evidence line and is capped at MEDIUM.
9. End with perf budget check table + raw tooling output.

HARD RULES:
- Measure first. Run tooling if available.
- Quantify impact. "This is slow" becomes "This adds ~Xms to Y."
- Show the fix. Current code, then reworked code.
- Cite references.
- Confidence is one of the four canonical classes. There is no "Possible issue" class.
- No AI slop.

ACCEPTANCE CRITERIA (report is rejected if any fails):
1. Summary block present: scope, evidence level, likely LCP element / hottest view, tooling
   status, budget check, finding counts, and a `**Verdict:**` line whose value is one of
   RESPONSIVE / ACCEPTABLE / SLUGGISH / UNSTABLE. A canonical token, not prose.
2. Every finding has a quantified impact line ("+Xms LCP" / "+X KB JS" / "+0.0X CLS" /
   "N dropped frames"), measured or cited from a reference.
3. Every finding: current code + verbatim-applicable fix + reference citation + machine fields.
4. Tooling section states what ran and what was unavailable. No silent skips.
5. The `runtime_instability` blocker flag is set, or explicitly stated as not set.
```

## Step 4: Dispatch

- `subagent_type`: `"ui-craft:ui-perf-engineer"`
- `model`: `"fable"` (mandatory, see Execution mode; `"opus"` only when the harness rejects the alias; never omitted)
- `prompt`: `FABLE-ESCALATION: ui-ux-frontend -- <one-line reason>` on the first line, then the prompt from Step 3
- `description`: `"Perf review of N files"`
- Foreground

## Step 5: Present results

1. Gate the report against the ACCEPTANCE CRITERIA from Step 3. Any failure means ONE re-dispatch naming the failed criterion; a second failure means present it flagged.
2. Show it verbatim, under a header carrying the scope, evidence level, the `Runtime smoothness` verdict token, and the `runtime_instability` flag state.
3. If a prior ledger was loaded, prepend the performance delta using the same buckets the other skills use, matched on `id` + `file`: NEW, RESOLVED (re-verified), STILL OPEN (same severity), REGRESSED (higher severity), IMPROVED (lower severity), Carried forward (every prior entry whose dimension is not performance).
4. Prompt:
   ```
   Apply any of these optimizations? Tell me which:
   - "all CRITICAL" / "all CRITICAL and HIGH"
   - "finding 3 and 7"
   - "everything in <filename>"
   - "skip"
   ```
5. If the user picks, apply with Edit/Write. After applying:
   - Run the TypeScript 7 gate by path (resolve the compiler by version as in Step 3; never bare `tsc`; read the exit code) to verify fixes compile.
   - Run build if possible to check bundle size delta.
   - Re-measure if a URL is available. A perf fix with no after-number is an assertion.
   - Offer to run `review-ui` if design quality wasn't checked yet, or `improve-ui` for the full team treatment.

## Step 6: Refresh the ledger

Perf findings must survive into the run-over-run story, and a later `review-ui` pass must not erase them. Write (or overwrite) `.claude/ui-craft/last-review.json`:

- Emit this run's `performance`-dimension findings in the canonical shape, each with `"status": "open"`.
- Set `"dimensions": ["performance"]` for this run.
- **Carry forward, unchanged, every prior entry whose dimension is not `performance`.** The ledger is a union across runs, not a snapshot of the last one. Without this, a perf-only pass silently deletes the visual, accessibility, and responsive history.

Note in one line that the ledger was refreshed.

## Step 7: No CI verdict artifact here

This skill never writes the machine-readable CI gate artifact. The gate schema requires verdicts for all six base dimensions and this is a single-dimension pass, so anything written here would either fail schema validation or assert GREEN on dimensions nobody reviewed. `improve-ui` is the only producer. If the repo has `ci/ui-craft-gate.sh` or a `.claude/ui-craft-artifacts/` directory, say that and point at `/ui-craft:improve-ui`.

## Anti-patterns

- Don't skip tooling. If build/Lighthouse is available, run it.
- Don't guess metric impact; measure or cite the reference's documented impact.
- Don't dispatch without `model: "fable"` and its attestation line (or the `opus` fallback); never an omitted model.
- Don't overwrite the ledger's other dimensions.
- Don't summarize agent output.
- Don't auto-apply.
