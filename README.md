# ui-craft

Consolidated UI engineering team for Claude Code. One plugin that designs, reviews, improves, and optimizes UI on any surface: TypeScript/React/Tailwind v4 in depth, with Apple and Android review overlays for cross-platform work. Ten specialist agents (each dispatched on the model the session chooses; the invoking session orchestrates, gates, and applies approved fixes) backed by a reference library that ships inside the plugin. Four user-invoked skills. Findings are advisory: nothing in your source tree is edited until you approve it. Reviews do write their own state under `.claude/ui-craft/` in the reviewed repo without asking, and say so: the run-over-run ledger, the run evidence (the scanner output on every `review-ui` and `improve-ui` run, the captures on a browser run), plus a merged report on a full pass (see **Review ledger** below). A labeled regression corpus, a CI gate, and that ledger keep the catalogue and the auditor honest as they evolve (see **Toolkit** below).

## What ui-craft is

ui-craft is the merge of two plugins that had grown into overlapping territory plus a distilled slice of a third:

- **typescript-ui** (0.3.0): the TS/React/Tailwind design-and-build team: aesthetic point-of-view, OKLCH token systems, the anti-AI-tells catalogue, Core Web Vitals, and TS6/7 strict typing verified with the TypeScript 7 type gate.
- **ui-review** (1.0.1): the universal cross-platform review team: visual/responsive/motion/accessibility/runtime specialists plus a verifier, built explicitly to cover what typescript-ui (TS-only) and apple-ui-craft (iOS-only) don't.
- **anti-slop** (1.6.0, UI-only subset): the corpus-backed empirical layer: a 3.2M-post study of what AI design tells actually get called out versus what clears review, plus the component-fingerprint and frontend-pattern catalogues.

These three had real, quantifiable overlap. typescript-ui's anti-slop auditor already carried a 108-tell catalogue; ui-review's anti-pattern catalogue documented the same 108 base tells as duplicates and cross-referenced both typescript-ui and anti-slop by filesystem path. Reviewing a TypeScript project meant picking between two review paths that each covered part of the ground, and every catalogue citation was a live cross-plugin path that broke if the other plugin's cache version drifted. ui-craft replaces all three (for UI purposes) with one plugin, one canonical catalogue, and zero cross-plugin path coupling. See **Provenance** below for the itemized merge.

Apple/iOS-specific engineering stays out of scope; `apple-ui-craft` and `ios-code-review` remain the dedicated iOS plugins; ui-craft's Apple overlay is for reviewing iOS/SwiftUI surfaces from a cross-platform lens, not native iOS craft work.

## Installation

### From GitHub (recommended)

Add this repository as a marketplace, then install the plugin from it. The repo
ships its own single-plugin `.claude-plugin/marketplace.json` with `source: "./"`,
so no separate marketplace index is required:

```
/plugin marketplace add TheMizeGuy/ui-craft-public
/plugin install ui-craft@ui-craft-public
```

### From a local clone

Clone the repo and point the marketplace at your clone's absolute path:

```
git clone https://github.com/TheMizeGuy/ui-craft-public.git
/plugin marketplace add <absolute-path-to-your-clone>
/plugin install ui-craft@ui-craft-public
```

Alternatively, enable it directly in the `enabledPlugins` object of
`~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "ui-craft@ui-craft-public": true
  }
}
```

Restart Claude Code. A fresh session is required after any settings change.

### Direct plugin directory (testing, single session)

```bash
claude --plugin-dir <path-to-your-clone-of-ui-craft>
```

### Verify installation

```
/ui-craft:design-ui
/ui-craft:review-ui
/ui-craft:improve-ui
/ui-craft:optimize-ui
```

If these appear in the skill list with their trigger descriptions, the plugin is loaded.

## Quick start

See [USAGE.md](USAGE.md) for worked walkthroughs of each skill: typed input, what happens step by step, and a full sample output block.

### Which skill?

| What you want | Skill | Specialists | Verifier | CI gate artifact |
|---|---|---|---|---|
| New UI built from a brief | `design-ui` | 1 (`ui-craft-architect`) | no; the taste checklist gates instead | no |
| A quick, targeted check on one file or directory | `review-ui` | 3-5 by rank: visual, accessibility and responsive always; anti-slop on aesthetic-bearing scope; motion, perf and TypeScript when the scope calls for them | no separate agent; the skill applies the verifier's rules inline | no, points at `improve-ui` |
| "Is this actually good?" before shipping | `improve-ui` | up to 7, plus `ui-verifier` last | yes, a dedicated pass | yes, offered after the report |
| Performance only: LCP/INP/CLS, bundle, rendering | `optimize-ui` | 1 (`ui-perf-engineer`) | no | no |

`improve-ui` is the right default whenever the question is "is this good". `review-ui` is the cheaper subset: it dispatches 3-5 specialists by rank, so any dimension it did not dispatch went unreviewed. Its report header names which ones, and only `improve-ui` produces an artifact the CI gate will accept.

### Get the strongest first run

Two setup facts change what a review can tell you:

- **Geometry evidence.** Without Playwright MCP on web, or a running app with an accessibility-tree snapshot on native, the reviewers have no bounding boxes to measure. Every unmeasured spatial claim (alignment, spacing, target size, overflow) then carries an `[unverified: geometry measurement needed]` modifier on its Evidence line and is capped at MEDIUM severity, however bad it looks. A code-only run is the default, so this is what a first run looks like unless you provide one of those.
- **The TypeScript 7 typecheck gate.** The real gate runs TypeScript 7 by path, resolving the compiler by version (the first of `node_modules/ts7/bin/tsc`, `node_modules/@typescript/native/bin/tsc`, `node_modules/typescript/bin/tsc` whose `--version` prints `Version 7.`), so both the fleet's `"ts7": "npm:typescript@~7.0.2"` alias and Microsoft's documented `@typescript/native` plus `@typescript/typescript6` (`tsc6`) layout pass (see `references/typescript/01-ts6-essentials.md`). Where no compiler prints `Version 7.` the skills fall back to the TypeScript 6 compiler for the review and report the missing TS7 gate; where none exists they report the gate as skipped rather than pretending it passed.

### Design a new UI: `/ui-craft:design-ui`

```
/ui-craft:design-ui a settings page for a developer tool: dark theme, dense, keyboard-first
```

Dispatches `ui-craft-architect`, which grounds the design in the subject's own world, drafts a compact plan (named colours with roles, type roles, an ASCII wireframe, the opening) and runs the twin test on it, writes down the task flow before any token exists, commits to a distinctive aesthetic point-of-view, builds a full OKLCH token system that clears the substance floor (a visible saturated accent, three measured surface levels, real edges, a focal visual, imagery), places every paragraph on a copy map, and produces production-grade TS + React + Tailwind v4 code (or the equivalent for whatever stack the project uses) plus a self-contained static preview. It runs the taste checklist on its own output; then the skill gates that output against twelve mechanical acceptance criteria (a four-part responsive floor, a six-part substance floor, the copy map), renders the preview at three widths and looks at it when a browser tool exists (the stranger's word test plus the density and substance measurement scripts), and puts the fresh design through a read-only visual, anti-slop, responsive and accessibility audit before you see it. Generated code is code: it gets reviewed before it is presented, not after it ships.

### Review existing UI: `/ui-craft:review-ui`

```
/ui-craft:review-ui src/components/
```

Detects scope and platform, then dispatches specialists by rank, three to five per run: `ui-visual-reviewer`, `ui-accessibility-reviewer` and `ui-responsive-reviewer` always (responsive is excused only on screenshot-only scope), `ui-anti-slop-auditor` on any aesthetic-bearing surface, and `ui-motion-reviewer`, `ui-perf-engineer` and `ui-typescript-engineer` when the scope calls for them (animation present, a performance concern or a measurable runtime, a TypeScript project). Above five, the first five by rank run and the uncovered dimensions are named, with `improve-ui` recommended for the full pass. Returns merged, deduplicated, severity-tagged findings under a verdict table carrying one row per dispatched dimension, verified inline against the verifier's rules before presentation. The header names the dimensions it did not review and why. For every applicable dimension plus a dedicated verifier pass, use `improve-ui`.

### Full improvement pass: `/ui-craft:improve-ui`

```
/ui-craft:improve-ui all
```

Dispatches `ui-team-lead`, which coordinates up to 7 specialists (visual and usability, anti-slop, accessibility, motion, responsive, perf, typescript), then the verifier (always last, never in parallel), deduplicates across all of them, and returns a per-dimension verdict table plus a priority-ordered fix plan (quick wins, flow pass, design pass, motion + responsive pass, performance pass, type-safety pass). This is the full team-mode treatment, the one `/ui-craft:review-ui` runs a subset of, and the only path that can write a gate-valid CI artifact.

### Optimize performance: `/ui-craft:optimize-ui`

```
/ui-craft:optimize-ui src/app/page.tsx
```

Dispatches `ui-perf-engineer` for a Core Web Vitals + bundle + rendering + hydration audit (web primary path, with SwiftUI/Compose rendering notes for cross-platform runtime concerns). Every finding carries quantified impact ("+800ms LCP", "+120KB JS"). It measures before it claims: the TypeScript 7 gate (the compiler resolved by version, never bare `tsc`), the project build, and Lighthouse when the project has it configured.

The three review skills (`review-ui`, `improve-ui`, `optimize-ui`) accept the same scope argument: empty/`diff` (uncommitted + staged changes), `staged`, `pr` (diff vs main), a specific `<file>` or `<directory>`, or `all`. `review-ui` and `improve-ui` also accept a screenshot; `optimize-ui` needs source. `design-ui` takes a design brief instead: describe what to build, not where to look.

## Agents reference

Neither the agent frontmatter nor the skills' dispatches pin a model or effort; the session chooses the model per dispatch, and the invoking session orchestrates. No agent carries `Edit`, and only `ui-team-lead` carries `Write`, for one file: `.claude/ui-craft/runs/<timestamp>/merged-report.md` in the reviewed repo. A seven-specialist report with code extracts routinely exceeds the ~60KB at which a subagent's final message truncates, so the file is the deliverable and the message is the pointer. Only `ui-team-lead` carries the `Agent` tool, needed to dispatch its own sub-specialists. No agent ever edits the reviewed project: applying findings or generated code is always done by the invoking session (the skill orchestrator) itself, and only after explicit user approval.

| Agent | Purpose |
|---|---|
| `ui-craft-architect` | Greenfield design: grounds in the subject, plans and twin-tests, commits to a POV, generates the token system against the substance floor, maps every paragraph, produces production-grade code and a static preview |
| `ui-visual-reviewer` | Visual quality, POV coherence, affordances, state completeness, anti-pattern detection, measured visual substance and copy placement, density on every surface, and usability: task flow, navigation, error recovery, cognitive load. Usability has no separate agent; it is this one's second lens, which is why it is briefed with the flow map |
| `ui-anti-slop-auditor` | Walks the internal canonical AI-tell catalogue (both catalogue files) for shipped-default detection, including the flat-terminal subtraction-only system and the text-placement tells; every finding names its replacement device and the report lists what the surface needs added |
| `ui-accessibility-reviewer` | Semantics, keyboard, focus, contrast, touch targets, WCAG 2.2 + APCA |
| `ui-motion-reviewer` | Animation timing and purpose, interruptibility, reduced motion, compositor-safe properties |
| `ui-responsive-reviewer` | Fluid and intrinsic sizing, breakpoints vs container queries, viewports, overflow and clipping, zoom and reflow, orientation, safe areas |
| `ui-perf-engineer` | Core Web Vitals, bundle size, rendering, hydration (web primary, with cross-platform rendering notes) |
| `ui-typescript-engineer` | TS6/7 strictness verified via the TS7 type gate, component/state typing, branded primitives |
| `ui-verifier` | Evidence sufficiency (density, elevation and substance claims need their measurement), false-positive filtering, deduplication, severity re-validation; a removal with no named replacement is returned as an open question |
| `ui-team-lead` | Inlined `general-purpose` orchestrator; runtime grants and nesting depth govern Agent access. Dispatches up to 7 specialists (visual + usability, anti-slop, accessibility, motion, responsive, perf, typescript), then the verifier (always last, never in parallel), and merges into one report written to the run directory |

## Knowledge base

The reference library spans 12 domains, all of it inside the plugin. Every path an agent is told to read resolves under `${CLAUDE_PLUGIN_ROOT}`; no agent reads a machine-local note, a sibling plugin's cache, or any path outside this repo, so a fresh install on a new machine has the same depth as the author's. GoodMem, Context7 and Playwright are optional accelerants covered under **Requirements**, not sources the reference library leans on.

### catalogue/ (2 files): the canonical AI-tell corpus

| File | Covers |
|---|---|
| `01-ai-tells.md` | The single merged AI-tell catalogue: typescript-ui's 88 base tells across 8 categories plus 20 deep cuts and the Strongest-10, ui-review's 10 user-flagged visual tells plus 15 web/10 Apple/10 Android platform-specific tells, and anti-slop's component fingerprints, Strongest-10 fingerprints, logo-swap test, and demo-ware/happy-path patterns, deduped by tell identity, every entry keeping its severity and remediation |
| `02-empirical-evidence.md` | anti-slop's corpus-backed evidence: the 3.2M-post study's cited-vs-cleared clearance rates (bento-grid at 0.1% clearance, mesh-gradient artifact data), plus the drift spot-check and refresh contract tying this file to anti-slop's quarterly rankings refresh |

### review/ (7 files): rubric, evidence, verdicts

| File | Covers |
|---|---|
| `01-universal-rubric.md` | 14 review dimensions (incl. conditional data-visualization), platform overlays, severity scale, confidence classes, finding format |
| `02-evidence-pipeline.md` | Run setup shared by the review skills (scope arguments, prior ledger, evidence level), artifact bundle schema, capture strategies, the canonical geometry evidence rule |
| `03-viewport-matrix.md` | Web/iOS/Android viewport families, failure classes, deduplication rules |
| `04-verdicts-and-verification.md` | Per-dimension verdict vocabularies plus the verifier's evidence-sufficiency, dedup, and severity re-validation rules |
| `05-density-and-economy.md` | The waste dimension: viewport utilisation, width distribution, page length, copy length in front of controls, action-to-target distance, with measurement recipes. Paired with `scripts/measure_density.js`, a browser-side measurement that returns percentages and pixel counts, because "this feels empty" gets dismissed as taste and a number does not |
| `06-measurement-traps.md` | Evidence that looks collected and is wrong: the traps that produce confident, plausible, false measurements, and the verification each one needs before a finding leans on it |
| `07-surgical-visual-upgrade.md` | The non-destructive application method: Sacred-vs-Slop classification, audit before prescription, tokens-first surgery in layers, the override-stylesheet strategy with a one-import rollback, framework variants, functionality-before-visuals post-op checks, defect-to-cure table |

### platform/ (3 files): cross-platform overlays

| File | Covers |
|---|---|
| `01-web-overlay.md` | CSS architecture, modern layout, typography, OKLCH color, CWV thresholds, frameworks |
| `02-apple-overlay.md` | Clarity/Deference/Depth, Liquid Glass, SF Symbols, Dynamic Type, haptics, adaptive iPad |
| `03-android-overlay.md` | Window size classes, adaptive layout, Compose accessibility, Material 3 |

### accessibility/ (4 files)

| File | Covers |
|---|---|
| `01-wcag-2-2.md` | 9 new 2.2 criteria, AA conformance checklist, APCA vs WCAG contrast, ARIA patterns, plus the Apple-HIG/Material/WCAG touch-target comparison table |
| `02-keyboard-focus.md` | Focus-visible, focus traps, skip links, roving tabindex |
| `03-motion-reduce.md` | prefers-reduced-motion detection and substitution patterns |
| `04-screen-reader.md` | Semantic HTML, heading hierarchy, landmarks, ARIA states, live regions |

### usability/ (5 files): whether a person can actually get through it

| File | Covers |
|---|---|
| `01-task-flows-and-journeys.md` | The dimension that lives between screens: naming the task, flow maps, step and effort budgets, state that carries forward, dead ends, progressive disclosure, cognitive load with counts rather than vibes, wizards, search and filter, the break tests, severity anchors |
| `02-forms-and-error-recovery.md` | Validation timing, error message content, inline errors vs summaries and where focus goes, required/optional marking, input types and autofill, data-loss prevention, destructive actions (confirm, undo, or both), partial failure, submission state |
| `03-navigation-and-information-architecture.md` | Navigation models and when each fails, depth vs breadth, wayfinding, breadcrumbs, back behaviour, deep links and refresh survival, grouping and labelling, overflow on small viewports |
| `04-states-feedback-and-affordances.md` | The complete state set and why a missing empty or error state is HIGH rather than MEDIUM, skeleton vs spinner vs progress vs nothing, feedback latency budgets, signifiers, disabled-state anti-patterns, optimistic UI and rollback, procedures for forcing every state |
| `05-app-shells-and-content-layout.md` | The shell contract (what a top bar and a left rail each own, and the two-primary-menus defect), choosing and sizing the shell with the published bands and the named disagreements, collapse and the icon-rail penalty, in-page navigation, entity-page anatomy, canonical panes, list vs table vs card, first-viewport contents by page type, reading measures, text-to-control placement (no prose between controls), promo and embed slotting, detection snippets, severity anchors |

### responsive/ (3 files): fluid sizing and adaptive context

| File | Covers |
|---|---|
| `01-fluid-and-intrinsic-sizing.md` | `clamp()` with the actual math, `min()`/`max()` as one-line media queries, intrinsic sizing, grid that reflows with no media query at all, `aspect-ratio`, why `100vh` is wrong on mobile, responsive images as a sizing decision, anti-pattern table |
| `02-breakpoints-vs-container-queries.md` | The decision rule between the two, container query syntax and containment gotchas, container units, when a media query is still right, migrating a viewport-styled component, severity guide, style and scroll-state queries |
| `03-zoom-orientation-and-adaptive.md` | WCAG 1.4.4 resize-to-200% and 1.4.10 Reflow with their real numbers, page vs text-only zoom, orientation as an aspect ratio, multi-window/foldable/split-screen width, density and pixel ratio, the two-part safe-area rule |

### design/ (12 files)

| File | Covers |
|---|---|
| `01-color-oklch.md` | OKLCH syntax, 3-tier token system, semantic hue meanings, dark-mode surface craft, APCA contrast, Display P3 fallbacks |
| `02-typography.md` | Variable fonts, banned defaults, type scales, size-count caps, display tightening, fluid clamp() |
| `03-spacing-rhythm.md` | Modular scale, proximity grouping, grids-as-guidelines, logical properties, container queries, subgrid |
| `04-motion.md` | Spring physics including the physics-derived `linear()` spring palette (snappy/smooth/bouncy) and the three-curve maximum, View Transitions, stagger lanes, reduced motion, the compositor-safe property list, and the anti-pattern severity table |
| `05-tailwind-v4.md` | @theme directive, OKLCH tokens, container queries, migration from v3 |
| `06-shadcn-customization.md` | Default tells to override, token replacement, recomposition |
| `07-depth-and-overlays.md` | Shadow tuning, elevation logic, text-over-image scrims + progressive blur, icon sizing, ghost buttons, padding ratios |
| `08-ux-writing.md` | Voice rules, error/empty-state direction, copy-carries-POV, content formatting, the copy review checklist |
| `09-token-drift-and-retints.md` | Why a palette change ships half-applied: literals that shadow tokens, the drift audit, and keeping a retint coherent end to end |
| `10-hero-and-section-architectures.md` | Six named hero architectures, hero typography/palette/atmosphere specs, the objection sequence, per-type section architectures, and the visual-rhythm rules that prevent the wall-of-same page |
| `11-image-to-code-replication.md` | Seven-layer extraction for screenshot-to-code work: proportional grid measurement, font identification by letterform, color sampling from compressed sources, radius language, atmosphere fidelity, responsive inference, the artistic-asset rule, the replication diff |
| `12-copy-placement-and-volume.md` | Where words go and how many: every paragraph has a headed home at a measure, the product comes first (one lede above it), per-surface budgets for every surface type, text-only runs, slot independence, the copy map, and the three placement tells |

### aesthetic/ (6 files)

| File | Covers |
|---|---|
| `01-point-of-view.md` | POV discovery worksheet with its substance and copy-map fields, the visual-reference rule, the six-look AI-default calibration (including the flat-terminal second face), 4 worked-example templates with complete token sets (never a routing target) |
| `02-distinctive-systems.md` | 12 case studies (Linear, Vercel, Stripe, Apple, Things, Arc, Figma, Notion, Raycast, Bear, Cron, Stripe Press) |
| `03-taste-checklist.md` | The pre-ship taste gate: per-section audit questions (including a responsive and adaptive audit and a flow audit), each row tagged code-checkable or browser-only so a code-only pass can report NOT ASSESSED, plus smell tests |
| `04-style-taxonomy.md` | Seed vocabulary: 10 style families, domain conventions, the eight landing structures, font-pairing seeds, icon discipline, motion intensity ladder, AI-surface patterns |
| `05-brand-direction-and-reference-generation.md` | The two pre-design lanes: implementation-ready reference-image generation (one image per section, composition-anchor variety, negative prompting) and brand-mark direction (symbol from meaning, the reduction ladder, the hard constraints, generated-logo bans, frozen geometry) |
| `06-substance-floor.md` | The floor under every ban: seven measured checks (accent presence and chroma floor, surface ladder with boundary ratios, edges on data panels, a focal visual per screen, imagery and icons, hierarchy in three channels), the severity rule that keeps measured flatness out of TASTE, the stranger's word test, the ornament-versus-substance earning test, the dark-mode rim rule, and the pairing table that names a replacement for every removable tell |

### dataviz/ (4 files + validator script)

| File | Covers |
|---|---|
| `01-choosing-a-form.md` | Is-it-even-a-chart, job-to-type mapping, series-count ladder, the extended form kit, library selection |
| `02-color-jobs-and-validation.md` | The five color jobs, the six checks, the validator workflow, snap-to-passing for any design system, the reference palette instance |
| `03-marks-interaction-figures.md` | Mark specs, surface gap/ring spacers, labels/legend, stat tile/meter/hero figures, texture, tooltips, filters |
| `04-anti-patterns.md` | The chart failure catalog: dual axes, recolor-on-filter, rainbow ramps, tooltip-gated values, and the rest |
| `scripts/validate_palette.js` (repo root) | Runnable validator for the four computable palette checks plus the normal-vision floor (checks 1 and 6 are structural and reported as not evaluated): lightness band, chroma floor, CVD separation (Machado 2009), normal-vision floor, surface contrast; node CLI or in-page module |

### performance/ (7 files)

| File | Covers |
|---|---|
| `01-core-web-vitals.md` | LCP/INP/CLS thresholds, budgets, optimization playbooks, folded-in perf-degrading-design-choices table |
| `02-react-19-perf.md` | React Compiler, RSC vs client, Suspense, useDeferredValue, useOptimistic |
| `03-css-perf.md` | content-visibility, CSS containment, GPU compositing, scroll-driven animations |
| `04-bundle-loading.md` | JS/CSS/font budgets, code splitting, image optimization, bfcache |
| `05-measurement.md` | web-vitals JS, CrUX, Lighthouse CI, INP attribution |
| `06-perceived-performance.md` | How the wait is staged for a person: response-time budget ladder, spinner vs skeleton vs optimistic vs nothing, the sub-100ms flash problem, reveal order for streamed content, scroll and focus restoration, stale-while-revalidate presentation |
| `07-runtime-engine-patterns.md` | One layer below the framework: hidden classes and shape stability, monomorphic vs megamorphic inline caches, allocation pressure in render and scroll paths, closure retention and detached DOM, deoptimization triggers, the honest Web Worker boundary, mapping an engine cause to a measurable symptom |

### typescript/ (4 files)

| File | Covers |
|---|---|
| `01-ts6-essentials.md` | TS6/7 defaults, the TypeScript 7 typecheck gate, strictness ladder |
| `02-component-typing.md` | Function components, compound, polymorphic, slot, ref forwarding, CVA variants |
| `03-state-typing.md` | Discriminated unions for UI state, useReducer patterns, exhaustiveness |
| `04-branded-primitives.md` | Nominal primitives, smart constructors, Zod brand parsing |

### architecture/ (3 files)

| File | Covers |
|---|---|
| `01-component-patterns.md` | Pattern selection matrix, compound, slot/asChild, polymorphic, headless hooks |
| `02-state-architecture.md` | The 4 kinds of UI state, TanStack Query, nuqs, Zustand, derived state |
| `03-styling-architecture.md` | 3-tier token cascade, CVA, CSS Modules, cascade layers |

## Toolkit

Three operational surfaces added in 0.1.2 that keep the catalogue, the auditor, and the review pipeline honest as they evolve. None of them change what the ten agents or four skills do: they validate and gate the plugin's own output. The design hook (0.7.0) is the exception: it runs in your own sessions, and only in a project that opts in.

### Regression corpus

`tests/corpus/` holds labeled fixtures from anti-slop's MIT-licensed design corpus and authored ones, clean and near-miss controls among them (counts live in `labels.json`), each pairing an HTML, CSS, TS or TSX surface with its ground-truth findings. Scoring is a deliberate two-step loop, not an automatic run: dispatch `ui-anti-slop-auditor` over the comment-stripped copy of the fixtures that `tests/harness/blind-copy.mjs` writes, capture its findings as a canonical JSON array, then run `node tests/harness/score-review.mjs <findings.json>` to compare that array against the labels and compute recall; `tests/harness/merge-findings.mjs` merges it with the scanner for the pipeline number the release gates. The script is a pure comparator; it never opens a fixture or invokes an agent. A run fails below 0.8 recall, below 0.8 precision, or when a clean control exceeds its tolerance. The loop is meant to run on every change to the two catalogue files, the auditor or visual-reviewer bodies, the finding shape, or a dispatching skill (the canonical trigger list is `tests/harness/README.md` § When to run this); `tests/harness/README.md` § The two-step loop is the runbook. Zero-dependency (Node >=18, no npm packages).

### Measurement scripts

`scripts/` holds three zero-dependency browser or Node scripts the reviewers paste numbers from, because a number cannot be dismissed as taste: `validate_palette.js` (chart palettes, Node CLI), `measure_density.js` (viewport utilisation, page economy, copy volume and placement: words before the primary content, orphan paragraphs, text-only sections, slot reflow risk, a reserved slot between the H1 and the primary content; evaluated in the browser) and `measure_substance.js` (the substance floor: accent presence and chroma, surface levels and boundary ratios, the hairline-alpha trap, the focal visual, imagery per section, hierarchy channels; evaluated in the browser, reading every computed-colour notation Chrome emits with a canvas read-back fallback and listing what it still could not read, with the shadow and rim boundaries it cannot see listed for a pixel read-back). `measure_density.js` also prints the shell rows from the app-shells reference (prose wedged between controls, tab strips wrapping to a second row, destinations held by both the top bar and the rail). A fourth, `audit_doctrine.mjs`, is a Node CLI that scans a reviewed repository's own docs, lint rules and tests for anything that enforces flatness or text volume (word-count floors, CSS pin tests, blanket bans on shadows, borders or badges) and prints them as canonical findings for the owner to keep or retire; `review-ui` and `improve-ui` run it in their doctrine-audit step. A fifth, `scan_tells.mjs`, is the deterministic first pass ported from the anti-slop plugin's design rules and mapped to this catalogue's codes: it finds the exact-signature tells a regex can see in milliseconds, applies presence versus concentration per file, and marks its heuristic candidates as such. Since 0.7.0 it also measures what declared CSS decides: text contrast against the surface it is declared on (P16), coloured side stripes (V3), the type floors and reading mechanics (T12, T16), zoom lock and positive tabindex (P4, P12), a focus ring with no `focus-visible:` variant (U4), the bounce candidate and pulsing dots (M2, V11), a marquee with no pause control (M4), dot, grid or stripe background patterns (V9), a saturated radial halo on a dark page (C11), neutral grey text on a chromatic surface (C7), a heading level skipped for size (P9), and, where the project carries a `DESIGN.md`, a face outside its typography (section 14, a candidate), while a purple it declares is read as the palette. It reads HTML, Vue, Svelte and Astro, JSX, TSX and other script files, CSS, SCSS and Less with their comments blanked, keeps scanning when a path in the list cannot be read (it is listed under `skipped`), and names in a `coverage` list the rules that did not run on a file's surface, such as the page-level rules on a component file. `anti-slop-allow` on a line or the line above waives every rule there, and `anti-slop-allow: <rule or code> -- <reason>` waives only the ones it names. It runs at the orchestrator, and its findings merge with the auditor's after the auditor has formed its own read (`references/review/04-verdicts-and-verification.md` § Scanner merge); it never stands in for that read. A sixth, `check_references.mjs`, verifies that every citation and section reference in the plugin's own agents, skills and references resolves, because an unresolved pointer degrades an agent silently.

### Design hook (opt-in)

`hooks/hooks.json` registers a two-tier design hook that stays off in every project until `.claude/ui-craft/hook.json` holds `{"enabled": true}`; a project without that file never starts a node process. After each Edit or Write of an `.html`, `.htm`, `.css`, `.jsx`, `.tsx`, `.vue` or `.svelte` file, the per-edit pass runs eleven mechanical scanner rules (U13 and V12 on files that hold markup, L13's viewport meta on HTML documents only, and U3 only where nothing replaces the focus ring) and tells the agent about the findings it has not been shown yet. When the agent stops, the deep pass runs every rule over the files edited this session and marks each finding `new`, `grew` or `attribution unknown` against the file's content before its first edit this session, so a finding that predates the session is counted but not listed. It never blocks a tool call or a stop, honours `anti-slop-allow` lines, and keeps each message to about 1,000 characters per edit and 2,500 at Stop, six finding lines each. Its session state lives in the plugin data directory (a system temp folder when that is unset), never in your repo, and `UI_CRAFT_HOOK=off` in the environment silences it everywhere. [USAGE.md](USAGE.md) § Design hook has the configuration keys and example messages; the agent triages a hook finding by `references/review/07-surgical-visual-upgrade.md` § 8.

### CI gate

`ci/` ships the CI artifact schema, `ui-craft-gate.sh`, `selftest.sh`, and an adoption guide for wiring the gate into a pipeline. Only a full `improve-ui` pass can produce a gate-valid artifact, because the schema requires six verdicts (visual, responsive, motion, accessibility, runtime, anti-AI aesthetic) and `review-ui` dispatches an adaptive 3-5 subset with no verifier. `improve-ui` offers the write after presenting its report, never automatically, to a configurable directory (default `.claude/ui-craft-artifacts/`); `review-ui` points at `improve-ui` instead of writing a partial one. `ui-craft-gate.sh` then exits non-zero unless a schema-valid artifact bound to the reviewed sha exists, no verdict is RED, `blocker_findings` is empty, no CRITICAL or HIGH finding sits in any array, and every YELLOW is backed by the MEDIUM, LOW and TASTE findings recorded in `evidence.open_findings` (the default blocking policy; `UI_CRAFT_GATE_POLICY=strict` requires every verdict GREEN). The reviewed sha is the last commit that touched a UI-adjacent path rather than `HEAD`, so committing the artifact does not invalidate it while the next real UI change does. `ci/selftest.sh` runs the gate end to end against a throwaway repo and asserts the exit code of every documented path, including that happy path. A YELLOW with nothing recorded fails, as does a missing, malformed, or sha-mismatched artifact. After two fix rounds on one change, the remaining findings are recorded and the change ships YELLOW rather than going through another pass to chase GREEN. `ci/README.md` has the full policy. See **Data contracts** in [ARCHITECTURE.md](ARCHITECTURE.md) for the artifact schema.

### Review ledger

`.claude/ui-craft/last-review.json`, written in the *reviewed* repo (not in ui-craft itself), persists the prior run's findings and the list of dimensions that run actually covered. All three review skills read and refresh it, and each carries forward every prior entry whose dimension it did not review, so a perf-only `optimize-ui` pass cannot delete the visual and accessibility history. The next run against the same scope opens with a delta rather than a cold re-listing: **NEW**, **RESOLVED** (absent now and re-verified as fixed, not merely unreported), **STILL OPEN**, **REGRESSED** (severity up), **IMPROVED** (severity down), **SUBSTANCE REGRESSED** (since 0.6.0 the ledger stores the substance and density numbers measured at 1920 on a browser run, and a later run whose accent chroma, surface levels or imagery fell, or whose words above the product rose, files a HIGH finding with both numbers, so a campaign that strips the previous campaign's substance is caught by the number), and carried forward (a prior finding whose dimension this run did not cover, so a narrow review cannot erase a wider one).

`review-ui`, `improve-ui` and `optimize-ui` all write this file on every run without asking, and say so in one line when they do. `design-ui` does not write one. If your repo runs a clean-tree check or a pre-commit hook, add `.claude/ui-craft/` to `.gitignore`. Do not blanket-ignore `.claude/`: gate artifacts under `.claude/ui-craft-artifacts/` are meant to be committed, since `ui-craft-gate.sh` reads them out of the tree it is gating. See **Data contracts** in [ARCHITECTURE.md](ARCHITECTURE.md) for the ledger schema.

## Requirements

- Claude Code with plugin support and a model capable of the design and review work. The session chooses the model per dispatch; nothing in the plugin pins a model or effort.
- The toolkit surfaces (`tests/harness/`, `ci/`, `scripts/`) need Node >= 18; the CI gate additionally needs `bash`, `python3` and `git`. No npm packages, ever. The four skills and ten agents need none of this.
- The opt-in design hook needs `node` on `PATH` and a POSIX shell; the four skills and ten agents do not depend on it.
- Optional: **GoodMem MCP** for cross-run learnings, written to the goodmem Learnings space when goodmem is configured. Without it, agents work entirely from the reference library.
- Optional: **Context7 MCP** for live library documentation (Tailwind v4, React 19, Motion, TanStack Query) when a finding depends on current API surface.
- Optional: **Playwright MCP** for web evidence capture (screenshots, DOM, accessibility scans, traces) backing the geometry evidence rule.

No agent fails without any of these, and none of them supply knowledge the reference library lacks. Playwright is the one whose absence you will notice in the output: with no geometry data, unmeasured spatial findings (alignment, spacing, target size, overflow) are capped at MEDIUM and flagged `[unverified: geometry measurement needed]`, however bad they look.

## Provenance

ui-craft was built 2026-07-07 following a feasibility audit of the non-Apple UI plugin fleet: typescript-ui, ui-review, and anti-slop's UI research. The audit found that typescript-ui's 108-tell catalogue and ui-review's 118-tell base catalogue were substantially the same corpus cross-referenced two ways, and that anti-slop's UI-only research (component fingerprints, empirical clearance-rate data) had never been formally merged into either. ui-craft is the consolidation:

- **From typescript-ui (0.3.0):** the design architect, the TypeScript engineer and its type gate, the perf engineer's React/CWV depth, the base 88-tell + 20-deep-cuts catalogue, the OKLCH/typography/spacing/motion/Tailwind-v4/shadcn design references, the POV/distinctive-systems/taste-checklist aesthetic references, and all typescript/ and architecture/ references: ported.
- **From ui-review (1.0.1):** the universal rubric, the evidence pipeline and its geometry evidence rule, the viewport matrix, the accessibility checklist, the web/Apple/Android platform overlays, the verifier, the responsive and motion reviewers, and the runtime reviewer (merged into `ui-perf-engineer`): ported and merged.
- **From anti-slop (1.6.0, UI-only subset):** the AI Component Fingerprints, the Strongest-10 Fingerprints, the logo-swap test, the empirical 3.2M-post clearance-rate study: distilled into the two catalogue files, leaving anti-slop's prose/code-quality rules untouched in anti-slop itself.

0.6.0 re-audited the retired `frontend-design` guidance against the plugin and folded the behavioural steps that had stayed outside the architect's process into it (subject grounding, the plan-first pass with the twin test, the template-chrome and single-accented-word tells, the terracotta accent, self-critique on a render), and added the substance floor and the copy-placement doctrine as the counterweight to the catalogue.

0.2.0 extended the same consolidation to three external UI surfaces that 0.1.x had left installed alongside: the bundled `dataviz` chart method (now `references/dataviz/` plus `scripts/validate_palette.js`), the `frontend-design` direction-setting guidance (folded into `aesthetic/01`, `aesthetic/03` and `design/08-ux-writing.md`), and the `ui-ux-pro-max` style/domain/pairing database (distilled into `aesthetic/04-style-taxonomy.md`). Those plugins are retired rather than integrated: ui-craft has no third-party plugin integration point, and `design-ui` seeds its advisory style candidates from the internal taxonomy file. `CHANGELOG.md` § 0.2.0 itemizes what came from where.

Every previously cross-plugin catalogue reference (hardcoded paths into either source plugin's own directory tree) is now an internal, plugin-root-relative path. Both source plugins carry deprecation notices pointing here and are uninstalled locally; their public mirrors are archived.

## Third-party material

ui-craft 0.7.0 re-expresses methods, thresholds and doctrine from impeccable by Paul Bakaus (https://github.com/pbakaus/impeccable), licensed under the Apache License, Version 2.0 (https://www.apache.org/licenses/LICENSE-2.0), studied at commit 3671d50f0 (2026-10-26). No impeccable file is copied: each item is rewritten in this plugin's words or code, and the place it lands names its impeccable source.

| ui-craft surface | impeccable source |
|---|---|
| The opt-in design hook and its session attribution (`hooks/hooks.json` and the hook script it runs) | `plugin/hooks/hooks.json`, `crates/hook/src/hook.rs`, `crates/hook/src/stop_baseline.rs`, `skill/reference/hooks.md` |
| Judgment before detector output, `references/review/04-verdicts-and-verification.md` § Scanner merge | `skill/reference/critique.md` |
| The finish pass and its four dispositions, `references/review/04-verdicts-and-verification.md` § Finish pass | `skill/reference/new-work.md` (section 7), `skill/agents/impeccable-finish-reviewer.md` |
| Drift classes and the triage order, `references/review/07-surgical-visual-upgrade.md` § 2 and § 5; the per-control state set, `references/review/01-universal-rubric.md` Layer 1 | `skill/reference/polish.md` |
| Browser-drawn surfaces themed from the palette, `references/aesthetic/03-taste-checklist.md` row 4.11 and `references/design/01-color-oklch.md` § 4; the display ceiling, `references/design/02-typography.md` § 3; secondary text on a coloured surface, `references/design/01-color-oklch.md` § 6 | `skill/reference/craft-floor.md` |
| Interrupted gestures, `references/usability/04-states-feedback-and-affordances.md` § 5b; evidence provenance and capture validity, `references/review/02-evidence-pipeline.md` | `skill/reference/harden.md`, `adapt.md`, `audit.md` |
| The removal, squint and skeleton, and neighbour-swap tests, `references/aesthetic/03-taste-checklist.md` rows 9.9, 9.13 and 9.14 | `skill/reference/layout.md`, `bolder.md`, `overdrive.md`, `delight.md`, `docs/STYLE.md` |
| Reading PRODUCT.md and DESIGN.md, `references/review/02-evidence-pipeline.md` § Product context files | `skill/reference/init.md`, `document.md` |
| Classifying the surface rather than the product, `references/design/12-copy-placement-and-volume.md` § 3 | `skill/SKILL.src.md` (Modes) |
| The triage rule for scanner and hook findings on code just written, `references/review/07-surgical-visual-upgrade.md` § 8 | the hook's directive footer, `crates/hook/src/hook_lib.rs` |
| Controls that name the outcome, whole-sentence messages, and errors that claim only what the system knows, `references/design/08-ux-writing.md` § 1 and § 2 | `skill/reference/clarify.md` |

The deterministic scanner's design-detection rules that follow impeccable's detector re-express its rules the same way, in this plugin's thresholds and words, and the CHANGELOG entry that adds each one names the impeccable rule it follows. The scanner's shared detection module, `scripts/lib/design-detect.mjs`, is vendored byte for byte from the anti-slop plugin (MIT) after a one-line header naming the anti-slop version and commit it was taken from; its own head names the impeccable rules it re-expresses. The scanner rules built on it follow these impeccable detector rules: P16 contrast (`low-contrast`), the V3 side stripe (`side-tab`), the T12 floors (`tiny-text`, `undersized-ui-text`), the T16 reading mechanics (`tight-leading`, `wide-tracking`, `justified-text`, `extreme-negative-tracking`), the M2 bounce candidate (`bounce-easing`), the V11 pulsing dot (`pulsing-dot`), the M4 marquee (`marquee`), the V9 background patterns (`codex-grid-background`, `repeating-stripes-gradient`), the C11 radial halo (`radial-halo`), C7's gray on colour (`gray-on-color`), the P9 skipped heading (`skipped-heading`), the `DESIGN.md` reader with its palette exemption and the section-14 face check (`design-system-font`), and the narrowed C18 glow and Strongest-10 #1 card readings (`dark-glow`, `gpt-thin-border-wide-shadow`).

impeccable's own NOTICE credits ehmo's platform-design-skills (MIT) for its iOS and Android references; ui-craft takes nothing from those two files.

## Troubleshooting

### Skills not appearing

1. Verify the plugin is in the cache: `ls ~/.claude/plugins/cache/<marketplace>/ui-craft/<version>/`
2. Verify it's enabled: `grep ui-craft ~/.claude/settings.json`
3. Restart Claude Code; settings changes require a fresh session.

### Team-lead dispatch fails or the Agent tool is missing mid-run

The team lead is dispatched via `subagent_type: "general-purpose"` with the agent body inlined and every `${CLAUDE_PLUGIN_ROOT}` occurrence replaced with the resolved absolute plugin root. The lead needs the Agent tool, and `Agent` access depends on runtime tool grants and nesting depth; the full note is at the top of `agents/ui-team-lead.md` (§ How this agent is dispatched). If the team lead reports that it lacks `Agent`, check grants, nesting depth, and the skill's dispatch path before retrying; where nested dispatch is unavailable, the session can run the team lead's process itself and dispatch the specialists directly (`skills/improve-ui/SKILL.md` § Execution mode).

### Agent dispatch is slow or hits rate limits

The team lead can fan out up to 7 specialists (visual and usability, anti-slop, accessibility, motion, responsive, perf, typescript) in parallel, then the verifier, always last and never in parallel. On constrained plan tiers this can hit concurrency limits. Narrow the scope argument (a file or directory instead of `all`) to reduce fan-out.

### An `improve-ui` report looks truncated

A subagent's final message truncates around 60KB, which a seven-specialist pass with code extracts exceeds routinely. The full report is on disk at `.claude/ui-craft/runs/<timestamp>/merged-report.md` in the reviewed repo, and its absolute path is the first line of the team lead's reply. Read the file, not the message.

### Context7 quota exceeded

Agents fall back to the plugin's reference files. Quality remains high; Context7 is supplementary, not required.

### Findings cite a reference file that doesn't exist in the cache

Reference paths resolve relative to the plugin root at runtime. If the cache copy is stale, pull the current release and restart Claude Code:

```
/plugin marketplace update ui-craft-public
/plugin update ui-craft@ui-craft-public
```

### Empty scope

If no files match the scope filter, the skill reports it and suggests alternatives. Check that the working directory actually contains UI-relevant files (`.tsx`, `.jsx`, `.swift`, `.kt`, `.css`, etc.) for the target platform.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full skill-to-agent-to-reference map, the orchestrator/specialist/verifier pattern, per-dimension verdict vocabularies, and the design decisions behind the single canonical catalogue.
