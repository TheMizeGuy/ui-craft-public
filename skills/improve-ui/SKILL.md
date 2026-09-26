---
name: improve-ui
description: |-
  Use this skill when the user wants the full UI treatment: a comprehensive multi-specialist pass covering visual + usability/flow + accessibility + responsive + motion + performance + type safety + anti-AI aesthetics in one review, plus (for improvement asks) a prioritized fix plan. Triggers: "improve this UI", "make this UI better", "make this god tier", "polish these components", "refactor the UI", "level up the design", "make this look like a human team built it", "full UI pass", "comprehensive UI review", "thorough UI audit", "improve the whole interface". Dispatches the ui-craft:ui-team-lead orchestrator, which coordinates every applicable specialist in parallel plus a dedicated verifier, deduplicates findings, and produces a unified per-dimension-verdict report ordered by impact. This is the heavy-hitter, and the only skill that writes the CI verdict artifact.
argument-hint: '[path | file | directory | url | screenshot | "staged" | "diff" | "pr" | "all"]'
allowed-tools: Bash, Read, Grep, Glob, Edit, Write, TodoWrite, Agent, Artifact
---

# Improve UI

You are coordinating a comprehensive multi-specialist UI pass. This is the plugin's flagship skill: it dispatches the team lead, who orchestrates all applicable specialist agents plus a verifier. It doubles as the full-coverage review: when the user only wants a thorough audit (no changes), present the report and skip the apply step.

**Read-only until the user picks.** The reviewers never modify the project. This skill writes three things: the run directory (Step 4), the review ledger (Step 5), and, only when the user accepts, the CI verdict artifact and the applied fixes. The `Edit`/`Write` grant in the frontmatter exists so those steps are executable.

## Execution mode

By default the team lead runs as a `general-purpose` subagent in Step 4 and dispatches the specialists and the verifier itself. The session may instead run the team lead's process in its own context, dispatching the specialists and the verifier directly, when the scope is small or nested dispatch is unavailable; the report header says which path ran, and the merged report still lands in the run directory. Where no Agent tool exists at all, the session runs each applicable specialist's process and then the verifier's (`${CLAUDE_PLUGIN_ROOT}/agents/ui-verifier.md`, last) itself, and the header says so. The dispatch templates in this skill set no model or effort; the session may choose a model per dispatch, and effort is never set.

The specialist reviewers stay read-only; the verifier pass is never skipped.

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

Before pre-flight context gathering, check for `.claude/ui-craft/last-review.json` in the target repo. If present and its `scope` overlaps the resolved scope, load it and pass its findings into the team lead prompt (Step 3) as the delta baseline; otherwise do not use it as a baseline, but Step 5 still carries its entries forward.

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

### Step 2c: Doctrine audit and owner vetoes

Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/audit_doctrine.mjs <repo-root> --format json` first and carry its findings verbatim; the manual read below adds what the script cannot see.

Two blocks the team lead forwards verbatim to every specialist. Both exist because the full pass has been beaten by the reviewed repo itself: one product stayed flat through six campaigns because its own doctrine files, CSS pin tests and word-count floor tests enforced the flatness and the padding (owner directive 2026-09-22), and a technically correct remediation violated a recorded owner veto because no dispatch carried the veto.

**The doctrine audit.** On the full pass this is a repo-wide read, not a spot check. Read:

- the UI sections of `CLAUDE.md` and `AGENTS.md`;
- `design/*.md`, in particular a `POV.md` and a `known-debt.md`;
- the theme or token README;
- stylelint / eslint / biome rules that constrain visual properties: a banned `box-shadow`, a forbidden `border`, a capped radius scale, an accent allow-list, a "no decorative colour" rule;
- tests that pin visual values or text volume. Grep the whole test tree for `toHaveStyle`, `toMatchInlineSnapshot` over CSS, `box-shadow`, `border-radius`, `.css.snap`, `wordCount`, and `toBeGreaterThan(` applied to a word, heading or paragraph count.

Each rule that enforces **flatness** (bans edges, badges, elevation, or accent use) or **text volume** (a word-count or heading-count FLOOR, a padding generator by construction: `${CLAUDE_PLUGIN_ROOT}/references/design/12-copy-placement-and-volume.md` § 3 keeps the ceiling and bans the floor) becomes a finding: `id` `visual-doctrine-<slug>`, `dimension: visual`, title beginning `Doctrine: `, severity MEDIUM, `file:line` at the rule, and a Recommended change stating the keep-or-retire choice for the owner rather than making it. No schema change is needed: `${CLAUDE_PLUGIN_ROOT}/ARCHITECTURE.md` § Data contracts already routes a rubric row with no enum value of its own to `visual`.

Emit both blocks for Step 3:

```
DOCTRINE CONSTRAINTS:
- <rule, one line> (<file:line>) -- enforces <flatness | text volume>; a fix that <does X> gets reverted by it
(or "none found")
```

**Owner vetoes.** Standing decisions about this product that no remediation may land on. Source them in this order, taking the first that exists and merging in anything a later source adds: the reviewed repo's `design/POV.md` (`## Banned (concrete)` and `## Must be present`), the UI section of its `CLAUDE.md` or `AGENTS.md`, then `.claude/ui-craft/vetoes.md` if present.

```
OWNER VETOES (standing decisions, not taste; a finding does not re-litigate them):
- banned: <device, in the owner's words>
- required: <device, in the owner's words>
Check every Recommended change against this list. A remediation that lands on a veto is replaced
with another device from the same tell's replacement column in
references/aesthetic/06-substance-floor.md section 6, or filed as an open question naming the
conflict. Never propose a vetoed device with a justification attached.
(or "none recorded")
```

## Step 3: Construct the team lead prompt

**Deterministic pre-pass.** The team lead runs `node ${CLAUDE_PLUGIN_ROOT}/scripts/scan_tells.mjs <the UI files in scope> --format json --fail-on none` (files only; pipe a list for a large scope) in Phase 1 and passes its `findings` array to `ui-craft:ui-anti-slop-auditor` as a `SCANNER FINDINGS` block. The auditor confirms, dedupes and extends them with the structural tells no regex can see; it never re-derives what the scanner already found, and a suppressed hit (an `anti-slop-allow` reason on the line) is a stated decision listed under Scope, never a finding. The scanner's `heuristic: true` candidates (T15 single-word accents, W11, I8, V13) are pointers for the auditor to verify, not findings in their own right.

**Scope and sampling on large inputs.** A 200-file scope does not get 200 equally shallow reviews. Above about 40 UI files, prioritise in this order: the routes and screens named in FLOWS IN SCOPE, then the shell and token files, then files with the most changed lines, then the rest; say which files were read and why, and mark everything unread NOT ASSESSED in the summary block. An undisclosed sample reported as a verdict is itself a finding against the review. The team lead carries the rule into every specialist prompt.

The team lead needs FULL context because it dispatches every applicable specialist, each of which needs a complete briefing.

```
SCOPE: comprehensive UI pass on these files:
<absolute path list, URL, or screenshot paths>

PLATFORM: <web / iOS / Android / screenshot-only>
EVIDENCE LEVEL: <code + browser / code-only / screenshot-only>
RUN DIRECTORY: <absolute path to .claude/ui-craft/runs/<ISO timestamp>/>

FLOWS IN SCOPE:
<the block from Step 2b, verbatim>

DOCTRINE CONSTRAINTS:
<the block from Step 2c, verbatim. Forward it to EVERY specialist, unchanged, so a specialist
reports a repo rule that would revert its fix instead of proposing a fix CI will undo.>

OWNER VETOES:
<the block from Step 2c, verbatim. Forward it to EVERY specialist, unchanged. These are standing
decisions, not taste; a Recommended change that lands on one is replaced or filed as an open
question naming the conflict.>

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
1. Read ${CLAUDE_PLUGIN_ROOT}/ARCHITECTURE.md for the reference-to-agent mapping.
2. Dispatch every applicable specialist in parallel, skipping any whose dimension the
   PLATFORM or EVIDENCE LEVEL makes unreviewable (your Phase 2 matrix states which):
   - ui-visual-reviewer: visual quality, usability and task flow, affordance, state completeness
   - ui-anti-slop-auditor: AI-tell detection against the internal catalogue
   - ui-accessibility-reviewer: WCAG / platform a11y
   - ui-responsive-reviewer: viewport matrix (web + adaptive native)
   - ui-motion-reviewer: motion quality (when animation is in scope)
   - ui-perf-engineer: CWV + bundle + runtime/rendering stability
   - ui-typescript-engineer: TS6/7 strictness, the TS7 type gate, component typing (TS projects only)
3. If a browser and a URL are both available, capture the default viewport set ONCE yourself
   (1920 is pinned in it: the density thresholds are calibrated there), then evaluate
   ${CLAUDE_PLUGIN_ROOT}/scripts/measure_density.js and
   ${CLAUDE_PLUGIN_ROOT}/scripts/measure_substance.js and call measureDensity() and
   measureSubstance() at 1920 AND at the widest width you opened. Write both outputs under
   <RUN DIRECTORY>/evidence/ and pass the numbers into every specialist prompt. Without them,
   every substance and density finding sits at TASTE.
4. Each specialist gets the full PROJECT CONTEXT, FLOWS IN SCOPE, DOCTRINE CONSTRAINTS and
   OWNER VETOES above, plus the measured numbers from step 3.
5. Wait for all specialists.
6. Run ui-verifier LAST on the merged findings. It returns the verified findings, the four
   blocker flags, and one canonical verdict token per dimension.
7. Merge: deduplicate, re-rank by impact, number sequentially.
8. Present the unified report with per-dimension verdicts, copying the verifier's verdict
   tokens rather than deriving your own. Its header carries `Widths viewed` (the renders a
   reviewer actually opened, not the ones captured) and `Substance` (accent chroma, surface
   levels, focal visual, image count, or NOT ASSESSED). When DOCTRINE CONSTRAINTS is not
   "none found", add a `### Doctrine constraints` section above the improvement plan, each
   rule with its file:line and the keep-or-retire choice for the owner. If PRIOR LEDGER is
   not "none", open with the delta section (see DELTA SEMANTICS below) before the verdict table.
9. Write the merged report to <RUN DIRECTORY>/merged-report.md before returning, and return
   its absolute path as the first line of your final message. Subagent final messages
   truncate; the file is the deliverable, the message is the pointer.
10. End with the structured improvement plan (quick wins / design pass / flow pass /
   motion + responsive pass / perf pass / type-safety pass), including only passes with findings.

DELTA SEMANTICS (match on `id` + `file`):
- NEW: id+file absent from the prior ledger
- RESOLVED: in the prior ledger, absent now, and re-verified as actually fixed
- STILL OPEN: in both at the SAME severity
- REGRESSED: in both at a HIGHER severity now
- IMPROVED: in both at a LOWER severity now
- SUBSTANCE REGRESSED: the prior ledger's `measurements` for a width this run also measured show
  a lower accentChroma, accentRoles, surfaceLevels or imagesPerSection, a higher wordsBeforePrimary,
  orphanParagraphs or textOnlySections, or utilisation under 60%; report both numbers and file a
  `visual` finding titled `Substance: regressed since <prior timestamp>` at HIGH
- Carried forward: prior entry whose dimension was not reviewed this run (never RESOLVED)

HARD RULES: the Hard rules section of the team-lead body above binds in full; it is not restated here.

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
8. Every removal names the device that replaces it (a frame becomes a heading plus spacing, a
   badge becomes an inline status word, an accent edge becomes a selected-state fill) -- in
   EVERY finding in the merged list and EVERY pass of the plan, quick wins included, not only
   the design pass. The canonical rule is
   ${CLAUDE_PLUGIN_ROOT}/references/review/01-universal-rubric.md section Finding format; the
   working list of replacement devices is
   ${CLAUDE_PLUGIN_ROOT}/references/aesthetic/06-substance-floor.md section 6. A removal whose
   replacement cannot be named is an open question for the owner, and a pass that is only
   removals is rejected (owner directive 2026-09-16; taste smell test 9.10).
9. On a browser run (EVIDENCE LEVEL `code + browser`): `Widths viewed` is non-empty, and the
   substance and density numbers at 1920 are present in the report. Captures nobody opened do
   not count as viewed, and a run with no numbers at 1920 has not measured waste or flatness.
10. No Recommended change in the merged report lands on a device the OWNER VETOES block bans.
   One that does is replaced from the same tell's replacement column, or carried as an open
   question naming the conflict.
```

## Step 4: Dispatch the team lead

`ui-team-lead` is dispatched as `general-purpose` with its body inlined, not by its plugin-namespaced agent type, because it needs the `Agent` tool, and `Agent` access depends on runtime tool grants and nesting depth (`${CLAUDE_PLUGIN_ROOT}/agents/ui-team-lead.md` § How this agent is dispatched).

Do the placeholder substitution mechanically, in this order:

1. Resolve the plugin root ONCE: the absolute directory this skill was loaded from (its installed cache directory, e.g. `~/.claude/plugins/cache/<marketplace>/ui-craft/<version>/`). Call it `ROOT`.
2. Read `${CLAUDE_PLUGIN_ROOT}/agents/ui-team-lead.md` and take its body (everything after the frontmatter).
3. Replace EVERY literal `${CLAUDE_PLUGIN_ROOT}` in that body with `ROOT`. Do the same for any specialist body the lead will inline.
4. Create the run directory: `mkdir -p <repo>/.claude/ui-craft/runs/<ISO timestamp>/`.
5. Before sending, grep the assembled prompt for the literal string `${CLAUDE_PLUGIN_ROOT}`. If any survives, the substitution failed and every reference read inside the subagent will fail. Fix it before dispatching.

```
Agent({
  subagent_type: "general-purpose",
  description: "Full UI pass: N files",
  prompt: <substituted ui-team-lead body> + "\n\n" + <the Step 3 prompt>
})
```

Foreground.

## Step 5: Present results

1. Read `<RUN DIRECTORY>/merged-report.md` from disk. Do not rely on the returned message, which truncates around 60KB and will silently cut the tail of a large pass. If the file is missing or under 100 bytes, treat the run as failed and re-dispatch once.
2. Gate the merged report against the ACCEPTANCE CRITERIA from Step 3. Any failure means ONE re-dispatch naming the failed criterion; a second failure means you apply the verifier's rules (`${CLAUDE_PLUGIN_ROOT}/agents/ui-verifier.md`, or `${CLAUDE_PLUGIN_ROOT}/references/review/04-verdicts-and-verification.md`) to the raw specialist findings directly and present the result flagged. Never present an unverified report.
3. Show the merged report verbatim. Then, when the doctrine audit (Step 2c) or a specialist found any, list the **Doctrine constraints** below it: each repo rule that would revert an accepted fix, with its `file:line`, the finding it would revert, and the keep-or-retire choice, stated as a choice for the owner rather than a decision you made. Applying a fix against a live rule that reverts it is how a product stayed flat through six campaigns.
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
5. If the user picks, apply each finding's suggested rework using Edit/Write, following the non-destructive method in `${CLAUDE_PLUGIN_ROOT}/references/review/07-surgical-visual-upgrade.md`: classify Sacred (logic) vs Slop (visual) before touching a file, prescribe tokens before components, prefer an override stylesheet over in-place rewrites, apply one layer at a time, and never reshape JSX structure for aesthetic reasons. Do not re-dispatch a reviewer. Apply only the findings the user named, each with its stated replacement; never turn the report into a "remove the slop" sweep, never apply a removal whose replacement the user has not seen, and never apply a device the OWNER VETOES block bans, even when the report proposed it -- substitute another device from the same tell's replacement column in `${CLAUDE_PLUGIN_ROOT}/references/aesthetic/06-substance-floor.md` § 6, or tell the user about the conflict and leave the finding open. **The doctrine gate:** before applying a finding, check its rework against the Step 2c doctrine constraints (re-run `node ${CLAUDE_PLUGIN_ROOT}/scripts/audit_doctrine.mjs <repo-root> --format json` if the tree changed). If an open constraint would revert the rework (a pin test on the literal the fix changes, a word-count floor the cut copy would trip, a doctrine line that bans the device the fix adds), apply the fix and the constraint's retirement in the same change with the user's say-so on the retirement, or hold the fix and say which constraint blocks it. Never apply a fix that CI or the repo's own rules will undo: that is how six campaigns produced the same flat page.
6. If the harness provides an Artifact tool, offer to render the merged report (verdict table + numbered findings) as a shareable HTML artifact. If no Artifact tool is available, skip this offer silently and don't mention its absence.
7. Refresh the ledger: write (or overwrite) `.claude/ui-craft/last-review.json` in the reviewed repo.

   ```json
   {"schemaVersion": 3, "timestamp": "<ISO 8601>", "scope": "<resolved scope, URL verbatim if supplied>",
    "commit": "<git sha>",
    "dimensions": ["<each dimension actually reviewed this run>"],
    "findings": [{"id": "<dimension>-<kebab-slug>", "dimension": "...", "severity": "...",
                  "confidence": "...", "file": "...", "line": 1, "title": "...", "status": "open"}],
    "measurements": {"1920": {"utilisation": "78%", "accentChroma": 0.14, "accentRoles": 3, "surfaceLevels": 3,
                            "imagesPerSection": 0.6, "wordsBeforePrimary": 22, "orphanParagraphs": 0, "textOnlySections": 0}}}
   ```

   `measurements` is optional and keyed by width: on a browser run, the numbers the team lead's measurement scripts printed at 1920 (and the widest width when it differs), verbatim; a code-only run omits the key. The next run compares against it to report SUBSTANCE REGRESSED. Carry forward, unchanged and whether or not Step 1 loaded the ledger as a baseline, any prior entry whose dimension is absent from `dimensions` this run, so a narrow pass never erases a wider one. This is the one file the skill writes without asking; note it happened in one line.

8. **The CI verdict artifact: this skill is its only producer.** `review-ui` and `optimize-ui` never write one, because the gate schema requires six verdicts and neither of those runs a full pass with a verifier. `${CLAUDE_PLUGIN_ROOT}/ci/verdict-artifact-schema.json` is canonical for the shape; `ARCHITECTURE.md` § Data contracts explains it. Read the schema rather than trusting the sketch below if the two ever disagree. Offer, don't force:

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

   `schemaVersion` is the const in the schema (3 at time of writing); the gate hard-rejects any other value, so read it from `${CLAUDE_PLUGIN_ROOT}/ci/verdict-artifact-schema.json` rather than assuming. `sha` is mandatory and is the gate's binding key; `pr` is optional and additional, never a substitute. SIX `verdicts` keys are required: `visual`, `responsive`, `motion`, `accessibility`, `runtime`, `antiAiAesthetic`. Only `typescriptSafety` and `usability` may be omitted, because only those two can be genuinely inapplicable. Finding arrays use the canonical finding shape (`id`, `dimension`, `severity`, `confidence`, `file`, `title`, optional `line`/`evidence`).

   Map each dimension's four-point verdict token to a gate token: best token to GREEN, second to YELLOW, third or fourth to RED. Worked example for the visual family (STRONG / ADEQUATE / WEAK / BROKEN): STRONG is GREEN, ADEQUATE is YELLOW, WEAK and BROKEN are RED. The dimension-name mapping (`performance` to `runtime`, `anti-ai` to `antiAiAesthetic`, `typescript` to `typescriptSafety`) is in `ci/README.md`. `overall` is GREEN only when every present verdict is GREEN, and a CRITICAL finding fails the gate whichever array it sits in.

## Step 6: Post-application verification

After applying any fixes, run `${CLAUDE_PLUGIN_ROOT}/references/review/07-surgical-visual-upgrade.md` § 6 first -- functionality before visuals, and any functional failure blocks the visual assessment -- then:
1. If TypeScript: run the TypeScript 7 gate by path, resolving the compiler by version rather than by alias name: try `node_modules/ts7/bin/tsc`, `node_modules/@typescript/native/bin/tsc`, then `node_modules/typescript/bin/tsc`, and use the first whose `--version` prints `Version 7.` (Microsoft's side-by-side layout keeps TypeScript 6 at `node_modules/typescript/bin/tsc6`). Never bare `tsc`, because with two compilers installed the `.bin/tsc` link is arbitrary; redirect the output to a log and read the exit code, never infer the result from the output. Do this to verify compilation.
2. Run the project's lint command.
3. If Tailwind: check that `@theme` tokens are valid.
4. If a browser is available: re-run `${CLAUDE_PLUGIN_ROOT}/scripts/measure_substance.js` and `${CLAUDE_PLUGIN_ROOT}/scripts/measure_density.js` at 1920 and report the before/after numbers side by side -- accent chroma, surface levels and their boundary ratios, focal visual, image count, viewport utilisation, `wordsBeforePrimary`. A fix that was supposed to add substance and moved no number did not land, and a fix that removed a device without its replacement shows up here as a number going the wrong way.
5. Report any breakage with the fix, and offer to iterate.
6. Offer to re-run the full pass to verify the fixes, or an individual skill (`review-ui`, `optimize-ui`) on a specific area. Write a learning to the goodmem Learnings space, if goodmem is configured in this session, when a non-obvious pattern came up.

## Anti-patterns

- Don't dispatch the team lead for a single-dimension review. Use `review-ui` (quality), `optimize-ui` (perf), or `design-ui` (new UI).
- Don't dispatch without comprehensive project context; the team lead needs it for every sub-agent.
- Don't dispatch by the plugin-namespaced `ui-craft:ui-team-lead` type.
- Don't trust the returned message over the run directory's merged report.
- Don't summarize the report; show it verbatim.
- Don't auto-apply.
- Don't run in background, because the user wants real-time progress.
