# ui-craft: Architecture

Internal map of files, responsibilities, and cross-references.

**This file is read at runtime.** `ui-team-lead` reads it in Phase 1 (step 2 of its operating manual) and `improve-ui` reads it as TASK step 1, both for the **Reference to agent mapping** table below, which they use to brief specialists. That table is therefore authoritative, not descriptive: if it drifts from an agent's own Knowledge Sources section, the team lead briefs specialists to read files those agents do not list. Regenerate it from the agent bodies whenever an agent's reference table changes. Everything else here is human-facing prose.

## Mission

One team of specialists (every dispatched agent pinned to Opus 5 at dispatch, thinking always on; the invoking session orchestrates) that designs, reviews, improves, and optimizes UI on any surface: TypeScript/React/Tailwind v4 in full depth, plus web/Apple/Android review overlays for cross-platform work. Distinctive aesthetic point-of-view, not a recycled template. Evidence-backed findings with severity tags and per-dimension verdicts. Read-only on the reviewed project's source: nothing is edited without explicit approval. Three things are written into the reviewed repo without asking, all under `.claude/ui-craft/`: the review ledger, the browser evidence captures on a browser run, and, on a full pass, the team lead's `runs/<timestamp>/merged-report.md` (see **Data contracts**).

## Layout

```
ui-craft/
├── .claude-plugin/{plugin.json, marketplace.json}
├── README.md / ARCHITECTURE.md / CHANGELOG.md / CLAUDE.md
├── skills/                    4 user-invoked entry points
│   ├── design-ui/SKILL.md     "design a [thing]"
│   ├── review-ui/SKILL.md     "review my UI / check this component"
│   ├── improve-ui/SKILL.md    "improve / make this god tier / full UI pass"
│   └── optimize-ui/SKILL.md   "optimize for Core Web Vitals / fix LCP"
├── agents/                    10 agents: 9 specialists + ui-team-lead, all pinned to Opus 5 at dispatch
│   ├── ui-craft-architect.md       greenfield design + token systems + code
│   ├── ui-visual-reviewer.md       visual/POV/affordance/state audit + usability and task flow
│   ├── ui-anti-slop-auditor.md     internal AI-tell catalogue walker
│   ├── ui-accessibility-reviewer.md WCAG 2.2 + APCA + keyboard + screen reader
│   ├── ui-motion-reviewer.md       animation timing/purpose/reduced-motion
│   ├── ui-responsive-reviewer.md   viewport/overflow/safe-area/reflow
│   ├── ui-perf-engineer.md         CWV + bundle + rendering + hydration
│   ├── ui-typescript-engineer.md   TS6/7 strictness + TS7 type gate
│   ├── ui-verifier.md              evidence check, dedup, severity re-validation
│   └── ui-team-lead.md             adaptive orchestrator, up to 7 specialists, verifier always last
├── references/                 57 self-contained knowledge files, 12 domains
│   ├── catalogue/{01-ai-tells, 02-empirical-evidence}.md
│   ├── review/{01-universal-rubric, 02-evidence-pipeline, 03-viewport-matrix, 04-verdicts-and-verification, 05-density-and-economy, 06-measurement-traps, 07-surgical-visual-upgrade}.md
│   ├── platform/{01-web-overlay, 02-apple-overlay, 03-android-overlay}.md
│   ├── accessibility/{01-wcag-2-2, 02-keyboard-focus, 03-motion-reduce, 04-screen-reader}.md
│   ├── usability/{01-task-flows-and-journeys, 02-forms-and-error-recovery, 03-navigation-and-information-architecture, 04-states-feedback-and-affordances}.md
│   ├── responsive/{01-fluid-and-intrinsic-sizing, 02-breakpoints-vs-container-queries, 03-zoom-orientation-and-adaptive}.md
│   ├── design/{01-color-oklch, 02-typography, 03-spacing-rhythm, 04-motion, 05-tailwind-v4, 06-shadcn-customization, 07-depth-and-overlays, 08-ux-writing, 09-token-drift-and-retints, 10-hero-and-section-architectures, 11-image-to-code-replication}.md
│   ├── aesthetic/{01-point-of-view, 02-distinctive-systems, 03-taste-checklist, 04-style-taxonomy, 05-brand-direction-and-reference-generation}.md
│   ├── dataviz/{01-choosing-a-form, 02-color-jobs-and-validation, 03-marks-interaction-figures, 04-anti-patterns}.md
│   ├── performance/{01-core-web-vitals, 02-react-19-perf, 03-css-perf, 04-bundle-loading, 05-measurement, 06-perceived-performance, 07-runtime-engine-patterns}.md
│   ├── typescript/{01-ts6-essentials, 02-component-typing, 03-state-typing, 04-branded-primitives}.md
│   └── architecture/{01-component-patterns, 02-state-architecture, 03-styling-architecture}.md
├── scripts/                    zero-dependency measurement tools (node CLI + browser module)
│   ├── validate_palette.js     chart-palette validator (four computable checks plus the normal-vision floor; checks 1 and 6 are structural and reported as not evaluated) (0.2.0)
│   └── measure_density.js      viewport utilisation / width distribution / page length (0.2.3)
├── tests/                      regression corpus + scoring harness (0.1.2)
│   ├── corpus/                 21 labeled fixtures (5 anti-slop MIT-corpus, 16 authored, five clean controls) + ground-truth findings
│   └── harness/score-review.mjs    scores an auditor findings file against the corpus labels, gates recall and precision >= 0.8
└── ci/                          CI gate (0.1.2): artifact schema + ui-craft-gate.sh + selftest.sh + adoption guide
```

Three runtime artifacts are written outside this tree, in the *reviewed* repo rather than in ui-craft's own: the review ledger (`.claude/ui-craft/last-review.json`, written unprompted on every review run), the team lead's `runs/<timestamp>/merged-report.md` on a full pass (with the browser evidence captures under `runs/<timestamp>/evidence/` on a browser run), and, when the user accepts the offer, the CI gate artifact (default `.claude/ui-craft-artifacts/`). All three are covered in **Data contracts** below.

## Skill to agent mapping

| Skill | Agents dispatched | Mode |
|---|---|---|
| `design-ui` | `ui-craft-architect` | Single |
| `review-ui` | 3-5 specialists by rank: `ui-visual-reviewer`, `ui-accessibility-reviewer` and `ui-responsive-reviewer` always (responsive excused only on screenshot-only scope); `ui-anti-slop-auditor` on any aesthetic-bearing surface; `ui-motion-reviewer`, `ui-perf-engineer`, `ui-typescript-engineer` by what the scope contains; capped at five per run with uncovered dimensions named | Parallel, skill merges |
| `improve-ui` | `ui-team-lead` to up to 7 specialists (visual + usability, anti-slop, accessibility, motion, responsive, perf, typescript), then the verifier, always last and never in parallel | Team lead orchestrates (RUNTIME DISPATCH NOTE applies, see below) |
| `optimize-ui` | `ui-perf-engineer` | Single |

## Reference to agent mapping

Regenerated from each agent's own Knowledge Sources section. `*` means every file in the domain.

| Agent | Reads (must) |
|---|---|
| `ui-craft-architect` | catalogue/01, aesthetic/*, design/*, usability/01-03, responsive/*, accessibility/*, architecture/01, architecture/03, platform overlay for the target, dataviz/01-03 when the design contains charts or stats |
| `ui-visual-reviewer` | catalogue/01-02, review/01, review/02, review/04, review/05, review/06, review/07, usability/* (this agent owns usability and task flow), design/01-04, design/06-08, design/10, aesthetic/01-03, accessibility/*, architecture/01, architecture/03, platform overlay for scope, dataviz/01+02+04 when charts are present |
| `ui-anti-slop-auditor` | catalogue/01 (primary), catalogue/02 (primary), review/01, aesthetic/03 (high), aesthetic/01-02 (context), design/06 (context) |
| `ui-accessibility-reviewer` | review/01, review/02, review/06, accessibility/*, platform overlay for scope |
| `ui-motion-reviewer` | review/01, review/02, review/04, design/04, accessibility/03, platform overlay for scope |
| `ui-responsive-reviewer` | review/01, review/02, review/03 (viewport matrix), review/05, responsive/*, design/02, design/03, accessibility/01, platform overlay for scope |
| `ui-perf-engineer` | performance/*, design/05, review/01, review/02, platform/01-03 |
| `ui-typescript-engineer` | typescript/*, architecture/*, review/01 |
| `ui-verifier` | review/01, review/02, review/04 (verdict vocabularies, blocker flags, verifier rules), review/06 |
| `ui-team-lead` | review/01 (finding format + severity scale), review/03 (viewport matrix, for the one browser capture it owns), review/04 (verdicts + blocker flags), and this file for the mapping above. It routes to specialists rather than reading deep-dive references itself |

## The orchestrator / specialist / verifier pattern

Every multi-agent path follows the same three-layer shape, inherited from ui-review's design (which deliberately mirrored Claude Code's own review architecture): an **orchestrator** (`ui-team-lead`, or the skill body itself for the lighter `review-ui` path) that detects scope and platform and picks which specialists apply; **specialists** that each own one review dimension and never trespass into another's verdict (the one deliberate pairing is usability and task flow, which ride with `ui-visual-reviewer` rather than getting an eleventh agent, and which is why that agent is briefed with the flow map); and a **verifier** (`ui-verifier`) that runs last (evidence sufficiency, false-positive filtering, dedup, severity re-validation) before anything reaches the user. `design-ui` and `optimize-ui` are single-specialist paths and skip the orchestrator/verifier layers; there's nothing to deduplicate across.

## Per-dimension verdict vocabularies (summary)

Each review dimension gets its own independent verdict so a strong visual score can't bury a real accessibility gap:

| Dimension | Verdict set |
|---|---|
| Visual quality | STRONG / ADEQUATE / WEAK / BROKEN |
| Anti-AI aesthetic | DISTINCTIVE / ADEQUATE / GENERIC / AI-DEFAULT |
| Responsive quality | ROBUST / ADEQUATE / FRAGILE / BROKEN |
| Motion quality | FLUID / ADEQUATE / STIFF / HARMFUL |
| Accessibility | INCLUSIVE / ADEQUATE / GAPS / EXCLUDING |
| Runtime smoothness | RESPONSIVE / ACCEPTABLE / SLUGGISH / UNSTABLE |
| TypeScript safety | SOUND / ADEQUATE / LEAKY / UNSOUND |

One family per specialist: visual, anti-slop, accessibility, motion, responsive, perf, typescript. A verdict row appears only for a specialist that actually ran, on every path including a full `improve-ui` pass; an undispatched dimension is named in the report's coverage line and gets no row. A row invented to fill the table would manufacture confidence the run never earned, which is the failure the coverage line exists to prevent. Findings carry a severity tag (CRITICAL/HIGH/MEDIUM/LOW/TASTE) and, on review paths, a confidence class (Hard defect / Quality defect / Pattern smell / Taste note).

`references/review/04-verdicts-and-verification.md` is the canonical source for this vocabulary and for the verifier's blocker flags and dedup/severity-revalidation rules; this table is a summary only, and each family name must match it exactly, since the CI artifact keys derive from these names. A verdict is only as good as the defect signals behind it, and those live in different places per family: visual, accessibility and the content/density/dataviz lenses in `references/review/01-universal-rubric.md` Layer 1; responsive in `references/responsive/` plus `references/review/03-viewport-matrix.md` and the Web overlay row of Layer 2; motion in `references/design/04-motion.md`; runtime in `references/performance/`; anti-AI in `references/catalogue/`; type safety in `references/typescript/`.

**`usability` is a finding dimension without a verdict family, deliberately.** The visual reviewer files flow, navigation and error-recovery defects under `dimension: usability`, and `ci/verdict-artifact-schema.json` reserves an optional `usability` verdict key. But `04-verdicts-and-verification.md` lists no usability row today, so the visual reviewer, the team lead and the verifier all omit the verdict rather than invent tokens, and let `core_task_blocker` plus the findings themselves carry the signal. An invented family would be unmappable to the gate, which is the exact drift this rule exists to prevent. Adding the row to the canonical file is what turns the key on, and it must land there first.

## Evidence pipeline (summary)

No spatial or numeric-precision claim (alignment, distances, target sizes, contrast ratios) ships without real geometry data backing it; screenshot estimation alone is insufficient confidence. This canonical **geometry evidence rule**, plus the artifact-bundle schema and capture strategies (viewport manifests, DOM snapshots, accessibility-tree dumps), live in `references/review/02-evidence-pipeline.md`. Screenshot-only mode is flagged as lower-confidence, never treated as equivalent to full evidence capture.

## Data contracts

Three schemas, shared across the harness, the ledger, and the CI gate so a finding never needs reshaping as it crosses from one surface to another.

**Finding (canonical, used everywhere a finding is represented: harness output, ledger entries, CI artifact `findings[]`):**

```json
{
  "id": "<dimension>-<kebab-slug>",
  "dimension": "visual|anti-ai|accessibility|motion|responsive|performance|typescript|usability",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|TASTE",
  "confidence": "<class per references/review/01-universal-rubric.md>",
  "file": "<repo-relative path or fixture name>",
  "line": 12,
  "title": "<short>",
  "evidence": "<optional>"
}
```

`line` and `evidence` are optional; when `line` is present the CI schema requires an integer >= 1, so omit the key rather than writing 0. `confidence` is one of the four classes in `references/review/01-universal-rubric.md` (Hard defect / Quality defect / Pattern smell / Taste note).

`ci/verdict-artifact-schema.json` is canonical for the `dimension` enum and `ci/ui-craft-gate.sh` parses that schema at runtime, rejecting an artifact carrying any value outside it. The enum above is a copy; never extend it here first.

The enum is deliberately coarser than the rubric: it names review dimensions (who reviewed it), while the rubric's Layer 1 names defect classes (what is wrong). Several Layer 1 rows have no enum value of their own, including content quality, density and economy, and data visualization. A finding in one of those takes the enum value of the specialist that raised it, in practice `visual`, and names the rubric row in its `title` so the class is still readable. That keeps it in the ledger delta and in the gate instead of dropping it, at the cost of not being filterable by rubric row on its own.

Widening the enum is a schema change, not an edit. `ci/ui-craft-gate.sh` hardcodes nothing about the enum: it reads the schema file, so the schema's `id` pattern must be widened alongside its `dimension` enum or every finding with the new value fails on the `id` slug instead. Bump `schemaVersion` (the gate reads the `const` and hard-rejects any other value) and update the three surfaces that restate the shape (this file, `ci/verdict-artifact-schema.json`, `tests/harness/README.md`) in the same commit. Adding `usability` in v3 is the worked example.

**Review ledger, schema v2 (`.claude/ui-craft/last-review.json`, written in the reviewed repo by `review-ui`, `improve-ui` and `optimize-ui`, on every run, without asking; `design-ui` writes none):**

```json
{
  "schemaVersion": 2,
  "timestamp": "<ISO-8601 timestamp>",
  "scope": "<the resolved scope that produced this run>",
  "commit": "<git sha if available>",
  "dimensions": [ /* each dimension actually reviewed this run */ ],
  "findings": [ /* canonical finding shape, each with "status": "open" */ ]
}
```

A ledger is the union of prior findings across runs; the delta compares this run against the entries whose dimension it reviewed. The next run against that same scope matches its fresh findings against this file on `id` + `file` to produce the delta report: absent from the ledger is **NEW**; present in the ledger, absent now, and re-verified as actually fixed is **RESOLVED**; present in both at the same severity is **STILL OPEN**; higher severity now is **REGRESSED**; lower severity now is **IMPROVED**. `dimensions` is what keeps a narrow run from erasing a wide one: a prior finding whose dimension is not in this run's `dimensions` is carried forward unchanged rather than counted RESOLVED. A missing or unreadable ledger is treated as an empty prior run (everything reports NEW), never an error.

Nothing outside the plugin parses this file, so its `schemaVersion` is informational rather than enforced, unlike the CI artifact's, which the gate hard-rejects on mismatch. Both skills must still write the same shape: a ledger written by one and read by the other is the whole point.

**CI gate artifact, schema v3 (`ci/verdict-artifact-schema.json` is canonical and the gate parses that file at runtime rather than reimplementing it; written to the configurable artifact directory, default `.claude/ui-craft-artifacts/<short-sha-or-pr>.json`):**

```json
{
  "schemaVersion": 3,
  "sha": "<git sha, lowercase hex 7-40 chars, REQUIRED: the gate's binding key>",
  "pr": "<pr number, optional convenience for file lookup, never a substitute for sha>",
  "timestamp": "<ISO-8601 timestamp>",
  "reviewer": "ui-team-lead",
  "scope": "<resolved scope>",
  "verdicts": {
    "visual": "GREEN|YELLOW|RED",
    "responsive": "GREEN|YELLOW|RED",
    "motion": "GREEN|YELLOW|RED",
    "accessibility": "GREEN|YELLOW|RED",
    "runtime": "GREEN|YELLOW|RED",
    "antiAiAesthetic": "GREEN|YELLOW|RED",
    "typescriptSafety": "<optional: omit on non-TypeScript projects>",
    "usability": "<optional while the usability specialist is adaptive>"
  },
  "overall": "GREEN|YELLOW|RED",
  "blocker_findings": [ /* canonical finding shape, CRITICAL findings */ ],
  "high_findings": [ /* canonical finding shape, HIGH findings */ ]
}
```

The `verdicts` keys deliberately follow the CI-gate naming, not the finding `dimension` enum: `performance` findings map to the `runtime` key, `anti-ai` to `antiAiAesthetic`, `typescript` to `typescriptSafety`. `ci/README.md` holds that mapping table. Six verdicts are required (v3 promoted `antiAiAesthetic` from optional, since every UI surface can be judged for AI-default aesthetics and omitting the key was a free way to drop the plugin's headline dimension from the gate). Only `typescriptSafety` and `usability` may be omitted, because only those two can be genuinely inapplicable.

Verdict derivation: per dimension, the four-point family's best token maps to **GREEN**, second to **YELLOW**, third or fourth to **RED**. Worked example on the visual family: STRONG is GREEN, ADEQUATE is YELLOW, WEAK and BROKEN are RED.

The gate (`ci/ui-craft-gate.sh`) passes only when a schema-valid artifact bound to the reviewed sha exists, every present verdict plus `overall` is GREEN, and `blocker_findings` is empty. The reviewed sha is the last commit that touched a UI-adjacent path, deliberately not `HEAD`: an artifact can never name the commit it is committed into, so binding to `HEAD` made the documented happy path (write the artifact, commit it, push) unsatisfiable. Binding to the last UI-touching commit means committing the artifact does not invalidate it, while the next real UI change does. There is no soft pass: YELLOW fails, as do a missing artifact, a malformed one, a `schemaVersion` other than the const, and a sha mismatch. A CRITICAL finding fails the gate whichever array it was filed in, because a GREEN verdict shipped alongside a blocker is a self-contradicting artifact rather than a judgment call. The required-verdict set is why the artifact is only written from a full `improve-ui` pass and never from a partial `review-ui` pass; `review-ui` points the user at `improve-ui` rather than writing a padded one.

**The corpus-harness feedback loop:** `references/catalogue/01-ai-tells.md` and `agents/ui-anti-slop-auditor.md` are the two files most likely to silently regress detection quality (a tell definition tightened for one false positive can blind the auditor to a real one). `tests/harness/score-review.mjs` closes that loop, but it does not close it automatically: the script is a pure comparator that reads a findings JSON array and scores it against `tests/corpus/labels.json`. It never opens a fixture and never invokes an agent. Closing the loop is two steps, documented in `tests/harness/README.md` § The two-step loop: dispatch `ui-anti-slop-auditor` over `tests/corpus/fixtures/`, capture its findings as a canonical array, then score that array. Any change to the two catalogue files, the auditor or visual-reviewer bodies, the finding shape, or a dispatching skill (the canonical list is `tests/harness/README.md` § When to run this) is expected to re-run both steps before shipping; a run scoring below 0.8 recall or 0.8 precision, or tripping a clean control, fails, and the change does not land until the catalogue or the auditor prompt is corrected, not until the corpus is quietly relabeled to fit. Re-scoring the committed baseline without re-running the auditor verifies nothing about the change.

## RUNTIME DISPATCH NOTE (inherited, both prior team leads)

Dispatch via `subagent_type: "general-purpose"` with the agent body inlined and every `${CLAUDE_PLUGIN_ROOT}` occurrence replaced with the resolved absolute plugin root. This is the plugin's established orchestration contract; `Agent` access depends on runtime tool grants and nesting depth. The canonical contract is at the top of `agents/ui-team-lead.md`.

## Design decisions

- **Single canonical catalogue, not three.** `catalogue/01-ai-tells.md` is the one place any AI-tell lookup resolves to; `catalogue/02-empirical-evidence.md` is the one place clearance-rate evidence resolves to. Every agent and reference that used to point at a sibling plugin's catalogue now points here.
- **No filesystem path leaves the plugin root.** The prior architecture had catalogue citations hardcode a sibling plugin's cache path, which broke silently on version drift; the same failure mode applied to machine-local notes, which simply do not exist on anyone else's machine. Every path an agent or reference is told to read is now plugin-root-relative (`${CLAUDE_PLUGIN_ROOT}/references/catalogue/01-ai-tells.md#section`). No agent body, reference file, or skill cites a personal vault, a sibling plugin's cache, or an absolute user path, and a finding may only cite a path that ships in this repo or exists in the reviewed project. Optional MCPs (goodmem, serena, context7, playwright) are named by capability, never by a stored identifier, so a machine without them degrades rather than breaking.
- **No `model:` field in any agent frontmatter.** Every dispatched agent is pinned at dispatch to `model: "opus"` (Opus 5, the coding/review floor); the invoking session orchestrates. The pin is a runtime instruction carried by the skills, never baked into the agent files, so the tier can move without touching them.
- **Merged, not just co-located.** `ui-visual-reviewer`, `ui-perf-engineer`, and `ui-team-lead` are true merges of two prior agents each: one set of tools, one prompt, one dispatch path, not two agents kept side by side under new names.
