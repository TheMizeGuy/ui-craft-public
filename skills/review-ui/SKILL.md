---
name: review-ui
description: |-
  Use this skill when the user asks to review any UI for quality: visual defects, alignment, spacing, typography, color, responsiveness, motion, accessibility, task flow, and AI-generated aesthetic tells. Works across web, iOS, Android, desktop, live URLs, and screenshots. Triggers: "review this UI", "check the UI quality", "review my screen", "is this UI good quality", "check alignment", "review the design", "audit this interface", "does this screen look right", "does this look AI-generated?", "is this accessible?", "can a user actually finish this flow?", "find UI problems", "comprehensive UI review", "thorough UI audit", "review-ui". Standard mode dispatches 3-5 specialists chosen by scope and platform, then merges findings with inline verifier rules. For maximum coverage (all 7 dimensions + verifier + CI artifact), use improve-ui.
argument-hint: '[path | file | directory | url | screenshot | "diff" | "staged" | "pr" | "all"]'
allowed-tools: Bash, Read, Grep, Glob, Edit, Write, TodoWrite, Agent, Artifact
---

# Review UI

Coordinate a UI quality review: determine scope, map the flows in scope, gather context, dispatch specialists, and present a merged report.

**Read-only by default.** The review itself never modifies the reviewed project. The only files this skill writes unasked are the review ledger (Step 8) and, on a browser run, the evidence captures under `.claude/ui-craft/runs/<timestamp>/evidence/` (Step 6). Fixes are applied in Step 11 and only after the user explicitly picks findings. The `Edit`/`Write` grant in the frontmatter exists so that step and the ledger write are executable; it is not licence to edit during review.

## Execution mode

Reviews are dispatched, never run inline in the orchestrating session. Every specialist runs as a subagent on the model the session chooses (Opus 5 is the usual default for design, review and implementation); never add a `model:` pin, a dated model ID, or an effort setting to a dispatch. The orchestrator owns scope, context, prompts, the merge, and the ledger. Run a specialist's process inline only when no Agent tool exists in the current context, say so in the report header, and keep it read-only.

## Finding vocabulary (single source, do not restate)

The finding template, the severity scale, and the confidence classes are defined once, in `${CLAUDE_PLUGIN_ROOT}/references/review/01-universal-rubric.md`. Every specialist prompt cites that file. Nothing in this skill redefines them.

Two rules the merge enforces mechanically:

- Confidence is exactly one of `Hard defect`, `Quality defect`, `Pattern smell`, `Taste note`. `ci/ui-craft-gate.sh` and `ci/verdict-artifact-schema.json` hard-reject any other value.
- **There is no "Possible issue" confidence class.** Missing geometry or runtime evidence is an evidence status, not a confidence class. Keep the canonical confidence class, append `[unverified: geometry measurement needed]` (or `[unverified: runtime measurement needed]`) to that finding's `Evidence:` line, and cap its severity at MEDIUM while the modifier is present. Taking the measurement removes the modifier and restores the finding's natural severity.

Every finding also carries the machine fields the ledger and the CI artifact key on: `id`, `dimension`, `file`, `line`. `id` is `<dimension>-<kebab-slug of the title>` (lowercase, non-alphanumerics collapsed to single hyphens), which is what makes run-over-run matching exact instead of fuzzy.

## Step 1: Determine scope

Resolve the argument to a concrete file, URL, or evidence list:

| Argument | Meaning |
|---|---|
| (empty) or `diff` | Uncommitted + staged changes, filtered to UI-relevant files |
| `staged` | Only staged files |
| `pr` | Diff vs `main`/`master` |
| `<file>` | Single file |
| `<directory>` | All UI files in dir |
| `<url>` | A running app or preview deployment (`http://`, `https://`, or a bare `localhost:PORT`). Highest-evidence mode: geometry, contrast, focus order, and viewport behavior can all be measured rather than inferred |
| `<screenshot>` | Screenshot file(s) for screenshot-only review |
| `all` | Entire project (excluding node_modules, dist, build, .build, Pods, DerivedData) |

A URL and a path can both be supplied. When they are, review the code AND the running app, and record the URL verbatim in the ledger `scope` field alongside the path.

### UI-relevant file extensions

**Web:** `*.tsx`, `*.jsx`, `*.vue`, `*.svelte`, `*.css`, `*.scss`, `*.html`
**iOS:** `*.swift` (containing SwiftUI views), `*.storyboard`, `*.xib`
**Android:** `*.kt` (containing Compose), `*.xml` (layouts)
**Screenshots:** `*.png`, `*.jpg`, `*.jpeg`, `*.webp`

Filter to UI-relevant files: components, pages, layouts, styles. Skip pure utility/API/model files unless they have JSX. If empty scope, tell the user and suggest alternatives. If >50 files, warn and ask.

### Check for a prior ledger

Before gathering context, check for `.claude/ui-craft/last-review.json` in the target repo. If present and its `scope` overlaps the resolved scope, load it as the diff baseline for Step 7's delta section; otherwise do not use it as a baseline, but Step 8 still carries its entries forward.

## Step 2: Detect platform

| Signal | Platform |
|---|---|
| `package.json` with react/vue/svelte/next | Web |
| `*.swift` with `import SwiftUI` | iOS/Apple |
| `build.gradle` or `*.kt` with `@Composable` | Android |
| `*.html` / `*.css` only | Web (static) |
| URL scope | Web (live), unless the page is a native app's web view |
| Screenshot files only | Screenshot-only mode |

## Step 2.5: Map the flows in scope

A review that resolves to a bag of files can only find defects that live inside one file. The defects users actually hit live between files: input lost on a step transition, a back button that abandons progress, step 3 asking for what step 1 already collected. Establish the flow structure before dispatching anything.

1. **Enumerate entry points.** Web: glob `app/**/page.tsx`, `pages/**/*.tsx`, or the router config. iOS: `NavigationStack` / `NavigationSplitView` roots and `@main` scene. Android: `NavHost` destinations. URL scope: the routes reachable from the supplied URL. Screenshot scope: ask the user which screens these are and in what order.
2. **Name the 1-3 primary tasks** the scope serves, in the user's language ("complete a checkout", "invite a teammate", "recover from a failed payment"). If the scope is a single leaf component with no task, say so and skip the rest of this step.
3. **List each task's ordered steps** with the file that owns each step, plus the entry point that starts it and what the user sees when it succeeds.

Emit this as a `FLOWS IN SCOPE` block and pass it verbatim into every specialist prompt in Step 5:

```
FLOWS IN SCOPE:
- Task: <what the user is trying to finish>
  Entry: <route / screen / URL>
  Steps: 1. <step> (<file>) -> 2. <step> (<file>) -> 3. <step> (<file>)
  Success: <what the user sees when it works>
- Task: ...
(or "single component, no multi-step flow in scope")
```

## Step 3: Gather context (parallel)

**Web:**
- `package.json`: framework, Tailwind, design libraries
- `globals.css` / `tailwind.config.*`: token system
- `tsconfig.json`: strictness (needed for the TS engineer)
- Linter config: eslint/biome for existing design lint rules

**iOS:**
- Asset catalog: named colors, images
- Project structure: SwiftUI vs UIKit mix
- Info.plist: supported orientations, scenes

**Android:**
- `build.gradle`: min SDK, Material version
- `themes.xml` / `colors.xml`: design system
- Compose vs XML split

### Step 3a: Establish the evidence level (do not guess it)

Evidence level decides which dimensions are reviewable and how confident any spatial claim is allowed to be. Determine it mechanically, from three checks:

| Check | How |
|---|---|
| Browser available? | Is a Playwright browser tool present in this session's tool list? |
| Running app available? | Was a URL supplied, or does a dev-server/preview URL resolve? |
| Source available? | Did the scope resolve to source files, or only to images? |

| Result | Evidence level |
|---|---|
| Browser tool + URL + source | `code + browser` |
| Source only (no browser, or no URL to point it at) | `code-only` |
| Images only | `screenshot-only` |

Pass the resulting level verbatim into every specialist prompt and print it in the report header. Never write `code + browser` on a run where no browser was opened.

## Step 4: Decide which specialists to dispatch

Dispatch by precedence, not by a flat count. The budget is soft: it exists to keep a routine review cheap, never to silently drop a dimension.

| Rank | Specialist | Dispatch when |
|---|---|---|
| 1 | `ui-craft:ui-visual-reviewer` | Always. Visual quality, UX, task flow, affordance, state completeness |
| 2 | `ui-craft:ui-accessibility-reviewer` | Always |
| 3 | `ui-craft:ui-responsive-reviewer` | Always on any platform with adaptive layout: web, iOS, Android. Only screenshot-only scope excuses it |
| 4 | `ui-craft:ui-anti-slop-auditor` | Any aesthetic-bearing surface (marketing, product chrome, anything a user looks at), not only when the user says "does this look AI" |
| 5 | `ui-craft:ui-motion-reviewer` | Animation/transition present in scope, or motion is the ask |
| 6 | `ui-craft:ui-perf-engineer` | Performance concern raised, or a measurable runtime is available. Owns runtime/rendering stability |
| 7 | `ui-craft:ui-typescript-engineer` | TS project (tsconfig present, `.tsx` in scope, or the user mentions type safety) |

Ranks 1-3 always run. Rank 4 runs on any aesthetic-bearing scope. Ranks 5-7 run when their condition fires. If that would exceed five specialists, dispatch the first five by rank, then tell the user which dimensions are still uncovered and recommend `improve-ui` for the full pass plus verifier. Never silently drop a rank.

### Screenshot-only review

When only screenshots are provided (no code, no running app, no URL):

| Specialist | Notes |
|---|---|
| `ui-craft:ui-visual-reviewer` | Full visual review on screenshots; task-flow, navigation and error-recovery rows reported as not assessed, never clean |
| `ui-craft:ui-accessibility-reviewer` | Limited: contrast, target size estimation, semantic guesses. Findings marked lower confidence. |
| `ui-craft:ui-anti-slop-auditor` | Catalogue tells are visible in a render; dispatch when the surface is aesthetic-bearing |

Do NOT dispatch: responsive (can't resize), motion (can't observe), perf/runtime (can't measure), typescript (no code). Tell the user which dimensions could not be reviewed:
> "Screenshot-only review covers visual quality, estimated accessibility, and AI-tell detection. Task flow, navigation and error recovery are reported as not assessed. Responsive behavior, motion quality, runtime performance, and type safety require code access or a running application."

## Step 5: Construct prompts

Each agent gets a self-contained prompt with:
- Absolute file paths, the base URL, or screenshot paths
- Platform identification
- The `FLOWS IN SCOPE` block from Step 2.5, verbatim
- Project context (framework, tokens, config, tsconfig snapshot for the TS engineer)
- Instruction to read their plugin references BEFORE reviewing
- The evidence level from Step 3a, plus the paths of any pre-captured browser evidence (Step 6)
- Output in the finding format from `${CLAUDE_PLUGIN_ROOT}/references/review/01-universal-rubric.md`, including the `id` / `dimension` / `file` / `line` machine fields

Include these ACCEPTANCE CRITERIA in every specialist prompt, and check them on each returned report before merging:
1. Report opens with the specialist's summary block: scope, evidence level, finding counts by severity, and a `**Verdict:**` line using that dimension's four-point verdict family from `${CLAUDE_PLUGIN_ROOT}/references/review/04-verdicts-and-verification.md` (a canonical token, not prose).
2. Every finding carries: severity tag, one of the four canonical confidence classes, `file:line` (or `Surface:` when the evidence is screenshot-only), current code extract or evidence, concrete rework, reference citation.
3. Read-only respected: the report claims no file modifications.

A report failing any criterion gets ONE re-dispatch naming the failed item; a second failure means including the raw output in the merge, flagged as non-conforming.

## Step 6: Capture browser evidence once, then dispatch in parallel

**Browser evidence has exactly one owner per run: you.** Specialists share a single Playwright browser, and several of them resize the viewport. If they run concurrently, one agent's 320px resize silently invalidates another's geometry measurement, and every spatial finding then trips the unverified-evidence cap.

1. If a browser tool and a URL are both available, capture the matrix yourself BEFORE dispatching: for the default capture set in `${CLAUDE_PLUGIN_ROOT}/references/review/03-viewport-matrix.md` (320, 900, the widest realistic width, plus every width where the product's own breakpoints fire; a family's other widths only to reproduce a defect), one screenshot plus one geometry dump (bounding boxes and computed styles for the primary content), written under `.claude/ui-craft/runs/<ISO timestamp>/evidence/`. Pass those absolute paths into every specialist prompt as read-only evidence, and instruct specialists not to drive the browser themselves.
2. Dispatch all chosen specialists in parallel using the Agent tool. Send multiple Agent calls in a single message:

```
Agent({ subagent_type: "ui-craft:ui-visual-reviewer",
  prompt: "<scope, platform, FLOWS IN SCOPE, context, evidence level, evidence paths>",
  description: "Visual quality review" })

Agent({ subagent_type: "ui-craft:ui-accessibility-reviewer",
  prompt: "<scope, platform, FLOWS IN SCOPE, context, evidence level, evidence paths>",
  description: "Accessibility review" })

Agent({ subagent_type: "ui-craft:ui-responsive-reviewer",
  prompt: "<scope, platform, FLOWS IN SCOPE, context, evidence level, evidence paths>",
  description: "Responsive review" })
```

3. If a specialist genuinely needs live interaction the pre-captured matrix cannot supply (motion timing, focus-order traversal, a multi-step flow walk), dispatch it in a SECOND, serial wave with sole browser access after the parallel wave returns. Truly concurrent browsers need one isolated browser per agent, which is outside this plugin's scope.

Foreground execution. Dispatching stays the default for multi-specialist parallel reviews.

## Step 7: Merge and present report

Standard mode has no dedicated verifier agent, so the coordinator applies the verifier's rules during the merge:

1. Collect findings from all agents.
2. Deduplicate and group using the deduplication and grouping rules in `${CLAUDE_PLUGIN_ROOT}/references/review/04-verdicts-and-verification.md` (same element + same issue = keep the more specific finding; cross-dimension contrast/clipping/reduced-motion overlaps merge into one).
3. Validate severities against the severity-validation table in the same file (taste never at HIGH/CRITICAL; accessibility blockers never below HIGH; a finding that blocks a core task at any width in the default matrix, or scrolls primary content horizontally at 320px, never below HIGH).
4. Enforce the geometry evidence rule (`${CLAUDE_PLUGIN_ROOT}/references/review/02-evidence-pipeline.md`, "Geometry evidence rule"): any spatial claim without geometry evidence keeps its canonical confidence class, gains the `[unverified: geometry measurement needed]` modifier on its Evidence line, and is capped at MEDIUM. Never rewrite its confidence class.
5. Set the blocker flags from the merged findings: `accessibility_blocker`, `responsive_blocker`, `core_task_blocker`, `runtime_instability` (definitions in `04-verdicts-and-verification.md`). A set flag caps its dimension at the 3rd token of its family, never the 1st or 2nd.
5a. Derive each dispatched dimension's verdict token from its merged findings with the table in `04-verdicts-and-verification.md` § Verdict derivation (any CRITICAL: 4th token; any HIGH: 3rd; only MEDIUM/LOW: 2nd; only TASTE or none: 1st, except that a dimension with no findings in code-only or screenshot-only evidence mode takes the 2nd token with `(evidence: static, <what was not exercised>)` appended), then apply the blocker cap. Do not copy a specialist's proposed token.
6. Re-rank by severity (CRITICAL first, TASTE last) and number sequentially.
7. If a prior ledger matches this scope, compute the delta below and prepend it to the report.

### Delta semantics (canonical)

Match a prior finding to a current one on `id` + `file`. Then:

| Bucket | Condition |
|---|---|
| **NEW** | `id`+`file` absent from the prior ledger |
| **RESOLVED** | Present in the prior ledger, absent now, AND re-verified as actually fixed rather than merely unreported |
| **STILL OPEN** | Present in both at the SAME severity |
| **REGRESSED** | Present in both at a HIGHER severity now |
| **IMPROVED** | Present in both at a LOWER severity now |

A prior entry that is absent from this run only because the run did not cover its dimension is neither RESOLVED nor STILL OPEN: list it under "carried forward (dimension not reviewed this run)".

```
## UI Quality Review

[if a prior ledger loaded] ### Delta since <prior timestamp>
- **NEW** (N)
- **RESOLVED** (N)
- **STILL OPEN** (N)
- **REGRESSED** (N)
- **IMPROVED** (N)
- **Carried forward** (N), dimensions not reviewed this run
[end if]

**Scope:** <files, count, and the URL verbatim when one was supplied>
**Platform:** <detected platform>
**Specialists:** <which were dispatched>
**Dimensions not reviewed:** <undispatched specialists and why, or "none">
**Evidence level:** <code + browser / code-only / screenshot-only>
**Flows reviewed:** <task names from Step 2.5 | "single component, no flow" | "not assessed (screenshot-only): task flow, navigation and error recovery cannot be judged from static frames">

### Dimension Verdicts

| Dimension | Verdict | Blockers | Key finding |
|---|---|---|---|
| <one row per DISPATCHED dimension, verdict token from 04-verdicts-and-verification.md> | | N | <worst issue> |

**Blocker flags set:** <accessibility_blocker / responsive_blocker / core_task_blocker / runtime_instability, with the finding number that set each, or "none">

**Findings:** N CRITICAL, N HIGH, N MEDIUM, N LOW, N TASTE
**Verdict:** <one line, below the table, never replacing it>

[numbered findings list]
```

### Before presenting (all must pass)

| Check | Pass condition |
|---|---|
| Finding format | Every finding matches the canonical template in `01-universal-rubric.md` and carries `id`, `dimension`, `file`, `line` |
| Confidence enum | Every confidence value is one of the four canonical classes. No "Possible issue" |
| Evidence present | No finding with an empty or vague Evidence field ("looks off" fails) |
| Geometry rule | Every unmeasured spatial claim carries the `[unverified: ...]` modifier and sits at MEDIUM or below |
| Verdict tokens | Every verdict-table cell is a canonical token, not prose |
| Ordering | Findings numbered sequentially, CRITICAL first, TASTE last |
| Coverage disclosure | Dimensions NOT reviewed named in the header, and flow traversal stated (which tasks were walked, or that none were in scope) |

Fix formatting failures during the merge; if a finding's substance is unverifiable, drop it and record the drop under a "Merge notes" line in the report.

## Step 8: Refresh the ledger

After presenting the report, write (or overwrite) `.claude/ui-craft/last-review.json` in the reviewed repo:

```json
{"schemaVersion": 2, "timestamp": "<ISO 8601>", "scope": "<resolved scope, URL verbatim if supplied>",
 "commit": "<git sha if available>",
 "dimensions": ["<each dimension actually reviewed this run>"],
 "findings": [{"id": "<dimension>-<kebab-slug>", "dimension": "...", "severity": "...",
               "confidence": "...", "file": "...", "line": 1, "title": "...", "status": "open"}]}
```

Carry forward any prior entry whose dimension is absent from `dimensions` this run, unchanged and whether or not Step 1 loaded the ledger as a baseline, so a narrow review never erases a wider one. This is the one file the skill writes without asking; note it happened in one line.

## Step 9: Optional shareable artifact

If the harness provides an Artifact tool, offer to render the report (verdict table + numbered findings) as a shareable HTML artifact. If no Artifact tool is available, skip this offer silently and don't mention its absence.

## Step 10: The CI verdict artifact is NOT written here

`improve-ui` is the only producer of the machine-readable CI gate artifact. This skill never writes one, and never writes a partial or padded one.

The reason is structural, not a policy choice: `ci/verdict-artifact-schema.json` requires six verdicts (`visual`, `responsive`, `motion`, `accessibility`, `runtime`, `antiAiAesthetic`) plus `sha`, and `review-ui` runs an adaptive subset with no dedicated verifier pass. An artifact assembled from a partial pass either fails the gate's schema check or asserts GREEN on a dimension nobody reviewed, which is worse.

When the reviewed repo has a `ci/ui-craft-gate.sh` gate or a `.claude/ui-craft-artifacts/` directory, say exactly that and point at `/ui-craft:improve-ui`.

## Step 11: Apply if requested

If the user picks findings ("all CRITICAL", "finding 3 and 7", "everything in <filename>"), YOU apply them using Edit/Write. Do not re-dispatch a reviewer. This is the only step in which this skill modifies the reviewed project. After applying:
- Offer a re-review on the same scope.
- Offer to run `optimize-ui` if performance wasn't in this pass, or `improve-ui` for the full team treatment.
- If the review surfaced non-obvious patterns, write them to the goodmem Learnings space, if goodmem is configured in this session.

## Anti-patterns

- Don't dispatch without project context.
- Don't dispatch without the `FLOWS IN SCOPE` block when the scope has more than one screen.
- Don't summarize findings; show them verbatim.
- Don't auto-apply; wait for the user pick.
- Don't run in background.
- Don't let specialists share a browser concurrently.
