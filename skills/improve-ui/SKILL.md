---
name: improve-ui
description: |-
  Use this skill when the user wants the full UI treatment: a comprehensive multi-specialist pass covering visual + usability/flow + accessibility + responsive + motion + performance + type safety + anti-AI aesthetics in one review, plus (for improvement asks) a prioritized fix plan. Triggers: "improve this UI", "make this better", "make this god tier", "polish these components", "refactor the UI", "level up the design", "make this look like a human team built it", "full UI pass", "comprehensive UI review", "thorough UI audit", "improve everything". Dispatches the ui-craft:ui-team-lead orchestrator, which coordinates every applicable specialist in parallel plus a dedicated verifier, deduplicates findings, and produces a unified per-dimension-verdict report ordered by impact. This is the heavy-hitter, and the only skill that writes the CI verdict artifact.
argument-hint: '[path | file | directory | url | screenshot | "staged" | "diff" | "pr" | "all"]'
allowed-tools: Bash, Read, Grep, Glob, Edit, Write, TodoWrite, Agent, Artifact
---

# Improve UI

You are coordinating a comprehensive multi-specialist UI pass. This is the plugin's flagship skill: it dispatches the team lead, who orchestrates all applicable specialist agents plus a verifier. It doubles as the full-coverage review: when the user only wants a thorough audit (no changes), present the report and skip the apply step.

**Read-only until the user picks.** The reviewers never modify the project. This skill writes three things: the run directory (Step 4), the review ledger (Step 5), and, only when the user accepts, the CI verdict artifact and the applied fixes. The `Edit`/`Write` grant in the frontmatter exists so those steps are executable.

## Execution mode

Two legal paths, and both pin a model explicitly:

1. **Dispatched (default).** The team lead runs as a `general-purpose` subagent pinned `model: "opus"` (Step 4). Subagents cap at Opus 5, and an omitted `model` inherits the session model, which the model-policy guard denies. Its specialists are pinned `model: "opus"` too, the coding/review floor (owner directive 2026-07-24).
2. **Inline.** If the session model is already the strongest tier and the pass is important or complex, run the team lead's process yourself in the main context (foreground). This is the only path on which the session model conducts the merge.

The specialist reviewers stay read-only on either path; the verifier pass is never skipped.

## Finding vocabulary (single source, do not restate)

The finding template, the severity scale, and the confidence classes live in `${CLAUDE_PLUGIN_ROOT}/references/review/01-universal-rubric.md`. The per-dimension verdict families and blocker flags live in `${CLAUDE_PLUGIN_ROOT}/references/review/04-verdicts-and-verification.md`. Nothing in this skill redefines either. When the improvement plan is applied to working code, the application follows the non-destructive method in `${CLAUDE_PLUGIN_ROOT}/references/review/07-surgical-visual-upgrade.md`: Sacred-vs-Slop classification first, tokens before components, override stylesheet over in-place rewrites, functionality checks before visual ones.

- Confidence is exactly one of `Hard defect`, `Quality defect`, `Pattern smell`, `Taste note`. `ci/ui-craft-gate.sh` and `ci/verdict-artifact-schema.json` hard-reject anything else.
- **There is no "Possible issue" confidence class.** Missing geometry or runtime evidence is an evidence status: keep the canonical confidence class, append `[unverified: geometry measurement needed]` (or `[unverified: runtime measurement needed]`) to the finding's `Evidence:` line, and cap that finding at MEDIUM until the measurement exists.
- Every finding carries `id`, `dimension`, `file`, `line`. `id` is `<dimension>-<kebab-slug of the title>`, which is what the ledger delta and the CI artifact match on.

## Step 1: Determine scope

Same resolution rules as `review-ui` / `optimize-ui`:

| Argument | Meaning |
|---|---|
| (empty) or `diff` | Uncommitted + staged |
| `staged` | Only staged files |
| `pr` | Diff vs `main`/`master` |
| `<file>` / `<directory>` | Specific target |
| `<url>` | A running app or preview deployment. Highest-evidence mode; can be combined with a path |
| `<screenshot>` | Screenshot file(s) for screenshot-only review |
| `all` | Entire project |

Include all UI-relevant files: components, pages, layouts, styles, theme config, tsconfig. Exclude standard patterns (node_modules, dist, build, .build, Pods, DerivedData).

Warning thresholds:
- >100 files: "This is a large scope. The team lead will dispatch several agents in parallel, which will take several minutes. Continue or narrow the scope?"
- 0 files: tell the user and suggest alternatives.

### Check for a prior ledger

Before pre-flight context gathering, check for `.claude/ui-craft/last-review.json` in the target repo. If present and its `scope` overlaps the resolved scope, load it and pass its findings into the team lead prompt (Step 3) as the delta baseline; otherwise ignore it.

## Step 2: Pre-flight context (parallel, comprehensive)

This is the full treatment, so gather everything. Detect platform (web/iOS/Android/screenshot-only), then:

1. **package.json**: framework, React version, Tailwind version, ALL relevant deps.
2. **tsconfig.json**: ALL strictness flags.
3. **Token system**: full read of `globals.css`, `tailwind.config.*`, `:root` blocks.
4. **Linter config**: eslint / biome config.
5. **Component structure**: Glob `**/components/**/*.tsx` (or the platform equivalent) and count + list.
6. **Page structure**: Glob `**/app/**/page.tsx` or `**/pages/**/*.tsx`.
7. **Font usage**: Grep for font-family, @font-face, next/font, Google Fonts.
8. **Icon usage**: Grep for lucide-react, @heroicons, @tabler/icons, @phosphor-icons.
9. **Image usage**: Grep for `<img`, `<Image`, `next/image`.
10. **Perf tooling**: Glob for lighthouse, web-vitals, analytics configs.
11. **Workspace root**: `git rev-parse --show-toplevel`.
12. **Commit sha**: `git rev-parse --short HEAD`. The CI artifact in Step 5 requires it.

### Step 2a: Establish the evidence level (do not guess it)

Run the same three checks `review-ui` Step 3a defines, here rather than by reference:

| Check | How |
|---|---|
| Browser available? | Is a Playwright browser tool present in this session's tool list? |
| Running app available? | Was a URL supplied, or does a dev-server/preview URL resolve? |
| Source available? | Did the scope resolve to source files, or only to images? |

Browser + URL + source is `code + browser`; source without a reachable app is `code-only`; images only is `screenshot-only`. Pass the level into the team lead prompt verbatim. It is what decides which specialists the team lead may dispatch at all.

### Step 2b: Map the flows in scope

Enumerate the entry points (routes, `NavigationStack` roots, `NavHost` destinations, or reachable URLs), name the 1-3 primary tasks the scope serves, and list each task's ordered steps with the file that owns each. Emit as a `FLOWS IN SCOPE` block; the team lead passes it to every specialist. Without it, no specialist can see a defect that lives between two files, which is where most flow defects live.

```
FLOWS IN SCOPE:
- Task: <what the user is trying to finish>
  Entry: <route / screen / URL>
  Steps: 1. <step> (<file>) -> 2. <step> (<file>) -> 3. <step> (<file>)
  Success: <what the user sees when it works>
(or "single component, no multi-step flow in scope")
```

## Step 3: Construct the team lead prompt

The team lead needs FULL context because it dispatches every applicable specialist, each of which needs a complete briefing.

```
SCOPE: comprehensive UI pass on these files:
<absolute path list, URL, or screenshot paths>

PLATFORM: <web / iOS / Android / screenshot-only>
EVIDENCE LEVEL: <code + browser / code-only / screenshot-only>
RUN DIRECTORY: <absolute path to .claude/ui-craft/runs/<ISO timestamp>/>

FLOWS IN SCOPE:
<the block from Step 2b, verbatim>

PROJECT CONTEXT:
- Root: <absolute path>
- Commit: <short sha>
- Framework: <name + version>
- React: <version>
- Tailwind: <v3/v4/none>
- tsconfig: strict=<bool>, noUncheckedIndexedAccess=<bool>, exactOptionalPropertyTypes=<bool>, verbatimModuleSyntax=<bool>
- Linter: <eslint flat / legacy / biome / none>
- Token system: <OKLCH / shadcn default / hex / custom>
- Primary font: <name>
- Icon source: <lucide / heroicons / custom / mixed>
- Component count: <N>
- Page/route count: <N>
- Perf tooling: <web-vitals / vercel-analytics / lighthouse-ci / none>

USER GOAL: <user's words verbatim, e.g. "make this god tier", "improve for launch", "thorough audit">

PRIOR LEDGER: <findings from `.claude/ui-craft/last-review.json` if one was loaded in Step 1, else "none">

PLUGIN REFERENCES: ${CLAUDE_PLUGIN_ROOT}/references/ is the full knowledge base.

TASK:
1. Read ARCHITECTURE.md for the reference-to-agent mapping.
2. Dispatch every applicable specialist in parallel, skipping any whose dimension the
   PLATFORM or EVIDENCE LEVEL makes unreviewable (your Phase 2 matrix states which):
   - ui-visual-reviewer: visual quality, usability and task flow, affordance, state completeness
   - ui-anti-slop-auditor: AI-tell detection against the internal catalogue
   - ui-accessibility-reviewer: WCAG / platform a11y
   - ui-responsive-reviewer: viewport matrix (web + adaptive native)
   - ui-motion-reviewer: motion quality (when animation is in scope)
   - ui-perf-engineer: CWV + bundle + runtime/rendering stability
   - ui-typescript-engineer: TS6/7 strictness, the TS7 type gate, component typing (TS projects only)
3. Each specialist gets the full PROJECT CONTEXT and FLOWS IN SCOPE above.
4. Wait for all specialists.
5. Run ui-verifier LAST on the merged findings. It returns the verified findings, the four
   blocker flags, and one canonical verdict token per dimension.
6. Merge: deduplicate, re-rank by impact, number sequentially.
7. Present the unified report with per-dimension verdicts, copying the verifier's verdict
   tokens rather than deriving your own. If PRIOR LEDGER is not "none", open with the delta
   section (see DELTA SEMANTICS below) before the verdict table.
8. Write the merged report to <RUN DIRECTORY>/merged-report.md before returning, and return
   its absolute path as the first line of your final message. Subagent final messages
   truncate; the file is the deliverable, the message is the pointer.
9. End with the structured improvement plan (quick wins / design pass / flow pass /
   motion + responsive pass / perf pass / type-safety pass), including only passes with findings.

DELTA SEMANTICS (match on `id` + `file`):
- NEW: id+file absent from the prior ledger
- RESOLVED: in the prior ledger, absent now, and re-verified as actually fixed
- STILL OPEN: in both at the SAME severity
- REGRESSED: in both at a HIGHER severity now
- IMPROVED: in both at a LOWER severity now
- Carried forward: prior entry whose dimension was not reviewed this run (never RESOLVED)

HARD RULES:
- Dispatch real agents. Don't simulate their output.
- Dispatched specialists pin `model: "opus"` (Opus 5). Never Haiku.
- Foreground execution.
- Deduplicate cross-agent findings; the verifier pass is mandatory.
- Confidence is one of the four canonical classes; there is no "Possible issue" class.
- No AI slop.

ACCEPTANCE CRITERIA (merged report is rejected if any fails):
1. Verdict table present: one row per dispatched dimension, each cell a canonical token from
   that dimension's verdict family, plus a Blockers count sourced from the verifier's flags.
2. Every dispatched specialist accounted for: a report per specialist, or a named failure
   with its error. Dimensions deliberately skipped are named in the header, not given a row.
3. "Verification Notes" section present, listing removed/downgraded/merged findings (or
   explicitly "none").
4. Findings deduplicated, sequentially numbered, severity-ordered (CRITICAL first, TASTE
   last); every finding keeps [SEVERITY] [CONFIDENCE] + `file:line` (or Surface, for
   screenshot-only evidence) + rework + reference, plus `id`/`dimension`. Every unmeasured
   spatial claim carries the `[unverified: ...]` modifier and sits at MEDIUM or below.
5. Improvement plan present with each applicable pass.
6. If PRIOR LEDGER was not "none", a delta section opens the report, above the verdict table.
7. `<RUN DIRECTORY>/merged-report.md` exists and its path is the first line of the reply.
```

## Step 4: Dispatch the team lead

RUNTIME DISPATCH NOTE: `ui-team-lead` must NOT be dispatched by its plugin-namespaced agent type. Plugin-namespaced dispatch silently strips the `Agent` tool at runtime, and the lead would then simulate seven specialists instead of dispatching them. Dispatch it as `general-purpose` with its body inlined.

Do the placeholder substitution mechanically, in this order:

1. Resolve the plugin root ONCE: the absolute directory this skill was loaded from (its installed cache directory, e.g. `~/.claude/plugins/cache/<marketplace>/ui-craft/<version>/`). Call it `ROOT`.
2. Read `${CLAUDE_PLUGIN_ROOT}/agents/ui-team-lead.md` and take its body (everything after the frontmatter).
3. Replace EVERY literal `${CLAUDE_PLUGIN_ROOT}` in that body with `ROOT`. Do the same for any specialist body the lead will inline.
4. Create the run directory: `mkdir -p <repo>/.claude/ui-craft/runs/<ISO timestamp>/`.
5. Before sending, grep the assembled prompt for the literal string `${CLAUDE_PLUGIN_ROOT}`. If any survives, the substitution failed and every reference read inside the subagent will fail. Fix it before dispatching.

```
Agent({
  subagent_type: "general-purpose",
  model: "opus",
  description: "Full UI pass: N files",
  prompt: <substituted ui-team-lead body> + "\n\n" + <the Step 3 prompt>
})
```

Foreground. `model: "opus"` is mandatory: an omitted model inherits the session model, which the model-policy guard denies, and the flagship pass then never starts.

## Step 5: Present results

1. Read `<RUN DIRECTORY>/merged-report.md` from disk. Do not rely on the returned message, which truncates around 60KB and will silently cut the tail of a large pass. If the file is missing or under 100 bytes, treat the run as failed and re-dispatch once.
2. Gate the merged report against the ACCEPTANCE CRITERIA from Step 3. Any failure means ONE re-dispatch naming the failed criterion; a second failure means you apply the verifier's rules (`${CLAUDE_PLUGIN_ROOT}/agents/ui-verifier.md`, or `${CLAUDE_PLUGIN_ROOT}/references/review/04-verdicts-and-verification.md`) to the raw specialist findings directly and present the result flagged. Never present an unverified report.
3. Show the merged report verbatim.
4. If the user only wanted an audit, stop here (offer to apply on request). Otherwise prompt:
   ```
   This is the full pass from the specialist team. Apply changes? Options:
   - "all CRITICAL" / "all CRITICAL and HIGH"
   - "quick wins only"
   - "design pass" / "flow pass" / "motion + responsive pass" / "perf pass" / "type safety pass"
   - "finding 3, 7, 12, 15"
   - "everything in <filename>"
   - "skip"
   ```
5. If the user picks, apply each finding's suggested rework using Edit/Write, following the non-destructive method in `${CLAUDE_PLUGIN_ROOT}/references/review/07-surgical-visual-upgrade.md`: classify Sacred (logic) vs Slop (visual) before touching a file, prescribe tokens before components, prefer an override stylesheet over in-place rewrites, apply one layer at a time, and never reshape JSX structure for aesthetic reasons. Do not re-dispatch a reviewer.
6. If the harness provides an Artifact tool, offer to render the merged report (verdict table + numbered findings) as a shareable HTML artifact. If no Artifact tool is available, skip this offer silently and don't mention its absence.
7. Refresh the ledger: write (or overwrite) `.claude/ui-craft/last-review.json` in the reviewed repo.

   ```json
   {"schemaVersion": 2, "timestamp": "<ISO 8601>", "scope": "<resolved scope, URL verbatim if supplied>",
    "commit": "<git sha>",
    "dimensions": ["<each dimension actually reviewed this run>"],
    "findings": [{"id": "<dimension>-<kebab-slug>", "dimension": "...", "severity": "...",
                  "confidence": "...", "file": "...", "line": 1, "title": "...", "status": "open"}]}
   ```

   Carry forward, unchanged, any prior entry whose dimension is absent from `dimensions` this run, so a narrow pass never erases a wider one. This is the one file the skill writes without asking; note it happened in one line.

8. **The CI verdict artifact: this skill is its only producer.** `review-ui` and `optimize-ui` never write one, because the gate schema requires six verdicts and neither of those runs a full pass with a verifier. `ci/verdict-artifact-schema.json` is canonical for the shape; `ARCHITECTURE.md` § Data contracts explains it. Read the schema rather than trusting the sketch below if the two ever disagree. Offer, don't force:

   > "Write a CI verdict artifact to `.claude/ui-craft-artifacts/<short-sha-or-pr>.json` per `ci/verdict-artifact-schema.json` for repos using the ui-craft gate (see `ci/README.md`)?"

   If any REQUIRED dimension was skipped this pass (evidence level or platform), say the artifact would fail the gate schema and offer to run the missing specialists first. Never write a partial or padded artifact.

   If accepted, write:

   ```json
   {"schemaVersion": 3, "sha": "<git sha, lowercase hex, 7-40 chars, REQUIRED>",
    "pr": "<PR number, optional, only in PR context>",
    "timestamp": "<ISO 8601>", "reviewer": "ui-team-lead", "scope": "<resolved scope>",
    "verdicts": {"visual": "...", "responsive": "...", "motion": "...", "accessibility": "...",
                 "runtime": "...", "antiAiAesthetic": "...",
                 "typescriptSafety": "<omit on non-TypeScript projects>",
                 "usability": "<omit unless 04-verdicts-and-verification.md defines a usability family>"},
    "overall": "GREEN|YELLOW|RED", "blocker_findings": [], "high_findings": []}
   ```

   `schemaVersion` is the const in the schema (3 at time of writing); the gate hard-rejects any other value, so read it from the schema rather than assuming. `sha` is mandatory and is the gate's binding key; `pr` is optional and additional, never a substitute. SIX `verdicts` keys are required: `visual`, `responsive`, `motion`, `accessibility`, `runtime`, `antiAiAesthetic`. Only `typescriptSafety` and `usability` may be omitted, because only those two can be genuinely inapplicable. Finding arrays use the canonical finding shape (`id`, `dimension`, `severity`, `confidence`, `file`, `title`, optional `line`/`evidence`).

   Map each dimension's four-point verdict token to a gate token: best token to GREEN, second to YELLOW, third or fourth to RED. Worked example for the visual family (STRONG / ADEQUATE / WEAK / BROKEN): STRONG is GREEN, ADEQUATE is YELLOW, WEAK and BROKEN are RED. The dimension-name mapping (`performance` to `runtime`, `anti-ai` to `antiAiAesthetic`, `typescript` to `typescriptSafety`) is in `ci/README.md`. `overall` is GREEN only when every present verdict is GREEN, and a CRITICAL finding fails the gate whichever array it sits in.

## Step 6: Post-application verification

After applying any fixes, run `${CLAUDE_PLUGIN_ROOT}/references/review/07-surgical-visual-upgrade.md` § 6 first -- functionality before visuals, and any functional failure blocks the visual assessment -- then:
1. If TypeScript: run the typecheck gate by path (`node node_modules/ts7/bin/tsc --noEmit`; `node node_modules/typescript/bin/tsc --noEmit` where the `ts7` alias is absent) to verify compilation. Never bare `tsc`, because both packages declare that bin and npm's link order on the collision is not guaranteed.
2. Run the project's lint command.
3. If Tailwind: check that `@theme` tokens are valid.
4. Report any breakage with the fix, and offer to iterate.
5. Offer to re-run the full pass to verify the fixes, or an individual skill (`review-ui`, `optimize-ui`) on a specific area. Write a learning to the goodmem Learnings space, if goodmem is configured in this session, when a non-obvious pattern came up.

## Anti-patterns

- Don't dispatch the team lead for a single-dimension review. Use `review-ui` (quality), `optimize-ui` (perf), or `design-ui` (new UI).
- Don't dispatch without comprehensive project context; the team lead needs it for every sub-agent.
- Don't dispatch without `model: "opus"`.
- Don't dispatch by the plugin-namespaced `ui-craft:ui-team-lead` type.
- Don't trust the returned message over the run directory's merged report.
- Don't summarize the report; show it verbatim.
- Don't auto-apply.
- Don't run in background, because the user wants real-time progress.
