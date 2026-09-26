---
name: design-ui
description: |-
  Use this skill when the user asks to design new UI: a screen, flow, page, component, or full product. Triggers: "design a [thing]", "build me a [screen/page/flow]", "create the UI for", "design the [dashboard/settings/onboarding/landing]", "make this screen look [distinctive/professional/not AI]". Dispatches the ui-craft:ui-craft-architect agent, which grounds the design in the subject's own world, drafts a plan and runs the twin test on it, commits to a distinctive aesthetic POV, generates a token system (OKLCH + variable fonts + modular spacing + spring motion) that clears the substance floor (a visible saturated accent, three measured surface levels, real edges, a focal visual, imagery), places every paragraph on a copy map, and produces production-grade UI code that does not look AI-generated and does not look like the flat grey opposite; the orchestrator then renders the architect's preview when a browser tool exists and audits the fresh design with the visual, anti-slop, responsive and accessibility reviewers before it is presented. TypeScript + React + Tailwind v4 is the primary output path; the design principles (POV, tokens, catalogue floor, taste gate) apply to any stack. Uses the internal anti-AI-tells catalogue as a hard floor and the taste checklist as a pre-ship gate.
argument-hint: '<brief description of what to design>'
allowed-tools: Bash, Read, Grep, Glob, Edit, Write, TodoWrite, Agent
---

# Design UI

You are coordinating new UI design on the user's behalf. Your job is to gather project context, construct a self-contained prompt, dispatch the `ui-craft:ui-craft-architect` agent, audit what comes back, and only then offer to write files.

**Nothing is written until the user approves.** The `Edit`/`Write` grant in the frontmatter exists for Step 7, where the user has explicitly asked to apply the design. Generation and audit are read-only.

## Execution mode

The `ui-craft-architect` and the Step 5 audit reviewers are dispatched as subagents by default: the architect gets a fresh context for the full design process, and the orchestrator keeps its own for building the prompt, gating the output, and applying approved files. For a small brief, or where no Agent tool exists, the session may run the architect's process itself (read `${CLAUDE_PLUGIN_ROOT}/agents/ui-craft-architect.md` and work from its Knowledge sources table and process) and says so in the output header; the Step 5 audit runs either way. The dispatch templates in this skill set no model or effort; the session may choose a model per dispatch, and effort is never set.

## Core principle: do no harm

This skill must never make a design worse than the model would have made it unaided. Every rule and criterion below is a floor under a failure this plugin watched happen — flat grey output, paragraphs with no home, a 2560 display half empty, a POV routed from the product category. A floor is not the brief and it is not a look.

If a rule would make this particular design worse for this particular brief, it is skipped: the architect names the rule and the reason on an `anti-slop-allow: <reason>` line where the decision lives and repeats it under Open questions, and you carry that to the user instead of spending the re-dispatch on it. The brief's own words and the owner's visual reference win over every rule here (`${CLAUDE_PLUGIN_ROOT}/references/aesthetic/01-point-of-view.md` section 2), including when they ask for something this plugin lists as a tell.

Rigid compliance is its own detectable pattern: the cream-and-serif page that replaced the purple one, and the flat terminal that replaced the card kit, each cleared every rule in front of it and each was rejected on sight. So a criterion cleared by a stated reason is a pass, not a defect, and a design that clears all twelve and says nothing is not the goal.

The substance floor and the accessibility floors keep their protective intent even when a style rule yields — a rule yields to something named, never to a deletion. The deliverables are fixed; the order the architect reasons in is its own.

## Stack awareness

TypeScript + React + Tailwind v4 is the primary, default output path, and the acceptance criteria below assume it. The design invariants are stack-agnostic: a committed POV, an OKLCH-based token system, the anti-AI-tells catalogue floor, the responsive floor, and the taste gate apply whether the target is React, Svelte, Vue, or plain HTML/CSS. For a non-TS/React web stack, the architect keeps those invariants and adapts the code target (design tokens, component structure, responsive strategy, and taste audit still ship); the OKLCH-only and TS-strict rules relax only where the platform cannot express them. For native iOS or Android UI design, use `apple-ui-craft` instead: this skill's scope stops at web and cross-platform-web stacks.

## Step 1: Parse the brief

The user passed a description (may be empty). Extract:
- What to design (screen, page, flow, component family, full product)
- Any stated constraints ("dark theme", "minimal", "dense dashboard")
- Any stated POV ("like Linear", "editorial", "tactical")
- Any stated framework/platform (React, Next.js, Svelte, SwiftUI, static HTML, etc.)
- The **visual reference**: a screenshot, a named product, or the repo's existing identity that the owner approved as the target. With none, and no `design/POV.md` in the repo, the POV is grounded in the subject instead: the architect's step 3b five-things list plus a named non-UI anchor (a material, a place, a print tradition, an artefact), two or three concrete candidate directions it chooses between, and the one it took marked `reference proposed` for you to confirm at Step 6. What Step 6 rejects is a POV routed from the product category — dense data, an expert audience or a dark existing theme selecting a look — never a POV with no screenshot behind it (owner directive 2026-09-16).
- The **surface type** for the copy budgets (`${CLAUDE_PLUGIN_ROOT}/references/design/12-copy-placement-and-volume.md` § 3): control (dashboard, settings, form, admin), content or reference (entity page, database page, guide index), marketing, or article. A page can hold two; name both.
- The **subject, audience and job**, when the brief states them. When it does not, the architect proposes them (marked `proposed`) and you confirm at Step 6; nothing here blocks the dispatch.
- The **display range** the design must survive. If the user did not say, take the default from `${CLAUDE_PLUGIN_ROOT}/references/review/03-viewport-matrix.md`: the narrowest width (320, the WCAG 1.4.10 reflow target), a modern mobile width (390), **900** (the width nobody designs at, where fluid failures live and nowhere else), a laptop width (1440), the most common desktop width (1920, where the density thresholds are calibrated), and the widest the product will realistically see (2560, where dead space becomes measurable). Plus any width where the product's existing breakpoints already fire.

If the brief is empty or too vague to act on, ask one focused question: "What screen or flow should I design? Any aesthetic direction?" Do NOT proceed without knowing what to build. If the brief names the screen but carries no visual reference and the repo has no `design/POV.md`, ask once: "Which screenshot or product should this look like, or should I derive the look from the subject itself?" If the user names one, that is the VISUAL REFERENCE. If they have none, ask you to choose, or do not answer, dispatch with `VISUAL REFERENCE: propose` and carry the reference question under Open questions; the architect then names two or three concrete candidates from the subject's own world, commits to one, and marks the POV statement `reference proposed` so you confirm it at Step 6 alongside the proposed subject, audience and job. A POV derived from the product category alone is still rejected at Step 6, proposed or not.

## Step 2: Pre-flight context (run in parallel)

If working in an existing repo:

1. **package.json**: Read it. Note framework, React version, Tailwind version, existing design libraries.
2. **Token system**: Read `app/globals.css`, `tailwind.config.*`, or any `theme.ts`/`:root` blocks. Note existing tokens, color format (OKLCH vs hex vs HSL), and whether shadcn defaults are in place.
3. **Existing components**: Glob `**/components/ui/*.tsx` or similar. List what primitives exist.
4. **Existing sizing strategy**: Grep for `clamp(`, `@container`, `dvh`, `svh`, and for fixed widths (`w-[`, `max-w-[`, `width:` with a px literal). This tells the architect whether it is joining a fluid system or introducing one.
5. **Workspace root**: `git rev-parse --show-toplevel` for absolute paths.
6. **Owner vetoes and must-haves**: read `design/POV.md` (its `## Banned (concrete)` and `## Must be present` lists), the UI section of the repo's `CLAUDE.md` or `AGENTS.md`, and `.claude/ui-craft/vetoes.md` if present. Distil them into an `OWNER VETOES` block (standing decisions, not taste) and a `MUST BE PRESENT` block. With no repo none of these lists has a source: emit `OWNER VETOES` as "none recorded" and put this operator's standing preferences in a second block, `HOUSE DEFAULTS (rebuttable)`: no emoji as a UI indicator, no pill or bubble chips as ornament, no rainbow or segmented bars, mono for code, logs, raw payloads and terminal UIs only (catalogue T13), no pulse dot on "Live", no decorative per-row keylines. These are defaults, not decisions about this brief: a brief clause, the VISUAL REFERENCE or the subject's world that names one of these devices converts it to a stated decision, emitted with an `anti-slop-allow: <the brief clause>` line. Vetoes read from a repo file are the owner's recorded decisions and carry no hatch.
7. **Assets on hand**: Glob for icon sets, product imagery, logos and illustrations (`**/icons/**`, `**/public/**/*.{png,jpg,webp,svg}`, `**/assets/**`) so the architect plans real imagery from what exists and names what must be produced.

If no repo, greenfield is assumed; items 6 and 7 still produce the HOUSE DEFAULTS block and an "assets to produce" note.

## Step 2.5: Seed candidates (optional, advisory)

From the brief's product type and mood/tone cues, pull up to 3 candidate directions out of the internal style taxonomy (`${CLAUDE_PLUGIN_ROOT}/references/aesthetic/04-style-taxonomy.md`): a style family, a domain convention row (color/type mood + standing cautions), and a font-pairing seed, each as a short name/identifier, not a copied description. Fold these into the architect's dispatch prompt (Step 3) under a `SEED CANDIDATES (advisory)` heading. A landing-page brief also names its structural pattern from the taxonomy's landing table.

Seeds are advisory only: they are raw material for the architect's point-of-view, never a substitute for it, and the internal anti-AI-tells catalogue always wins if a seed conflicts with it (the taxonomy's hazard columns flag the collisions).

Two brief shapes route to dedicated references in the same dispatch prompt: a landing/marketing brief names its hero and section architectures from `${CLAUDE_PLUGIN_ROOT}/references/design/10-hero-and-section-architectures.md` (one committed architecture per section, the objection sequence, the visual-rhythm rules). Precedence between the two landing references is fixed: the taxonomy's §3 picks the page structure (Step 2.5 above), and design/10 supplies the per-section architecture and rhythm rules inside it -- design/10 never overrides the chosen structure with a section order of its own. A brief that ships a screenshot or design image as the target switches the architect into translator mode per `${CLAUDE_PLUGIN_ROOT}/references/design/11-image-to-code-replication.md` (seven-layer extraction before any code, the reference wins over preference). A pre-design ask for brand direction or reference imagery routes through `${CLAUDE_PLUGIN_ROOT}/references/aesthetic/05-brand-direction-and-reference-generation.md` before this skill's normal flow.

## Step 3: Construct the agent prompt

Build a self-contained prompt for the design architect. It has zero conversation context, so everything it needs goes in the prompt.

```
BRIEF:
<what to design, from the user>

CONSTRAINTS:
<aesthetic direction, brand, framework/platform, existing tokens, any stated POV>

VISUAL REFERENCE:
<the screenshot path, named product, "the product's existing identity as of <commit>" in the
owner's words, or "propose" when the owner has none; this is where the POV comes from, never from
the product category>

SURFACE TYPE: <control / content / marketing / article, one or two>

SUBJECT, AUDIENCE, JOB: <from the brief, or "propose them">

OWNER VETOES (standing decisions read from the repo or stated by the user; not taste):
<the Step 2 block, or "none recorded"; check every device you emit against it; a reference recipe
that lands on a veto is replaced with another remedy and the conflict goes under Open questions>

HOUSE DEFAULTS (rebuttable; this operator's standing preferences, no source in this brief):
<the Step 2 block>
Reach for one of these only when the brief, the VISUAL REFERENCE or the subject's world calls for
it; name the one you used and why under Open questions.

MUST BE PRESENT: <the Step 2 block, or "none recorded; the substance floor applies">

ASSETS ON HAND: <icon set, imagery, logos found in Step 2, or "none; name what must be produced">

DISPLAY RANGE: <the widths from Step 1, default 320 / 390 / 900 / 1440 / 1920 / 2560>

SEED CANDIDATES (advisory, only if Step 2.5 produced any, omit this block entirely otherwise):
- Style family: <name from aesthetic/04-style-taxonomy.md>
- Domain convention: <cluster name + its standing cautions>
- Font pairing: <seed name>
These are raw material for your POV, not a POV. The catalogue floor always wins on conflict.

PROJECT CONTEXT (if existing repo):
- Root: <absolute path>
- Framework: <react/next/vite/svelte/none>
- React version: <version>
- Tailwind: <v3/v4/none>
- Existing tokens: <OKLCH/shadcn default/hex/none>
- Existing sizing strategy: <fluid (clamp + container queries) / fixed px / mixed / none>
- Existing component count: <N>
- Key deps: <zod, tanstack-query, etc.>

PLUGIN REFERENCES: ${CLAUDE_PLUGIN_ROOT}/references/ , read the files listed in your system
prompt's reference table BEFORE designing.

TASK:
1. Read the Always rows of your Knowledge sources table, plus the conditional rows this brief
   triggers (usability/02 when the surface takes input; usability/03 when there is more than one
   screen; responsive/03 for a full-height surface, sheet or modal; dataviz/01-03 for charts,
   stats or a dashboard; design/10 for a landing page; design/11 for an image spec; the platform
   overlay for the target stack), and review/03-viewport-matrix.md for the display range. Your
   table owns which rows are Always and this prompt does not widen it; read aesthetic/03 at the
   audit, not before.
2. Inspect existing repo components and tokens if applicable.
3. Commit to a POV. Write the 3-4 sentence statement, naming the VISUAL REFERENCE or the subject
   anchor it derives from, and the subject-world device it carries.
3b. Ground in the subject (propose subject, audience and job when the brief leaves them open),
   draft the design plan (four to six named colours with roles and the accent's chroma band and
   first-paint roles; one or two type families with roles and what the treatment does; an ASCII
   wireframe per screen with alignment, the focal element and the surface ladder; the opening;
   three to five principles), then run the twin test and write its `Changed X to Y because Z`
   and `Kept X because <what fixes it>` lines. No token and no code before this exists.
4. Generate the full token system (OKLCH color, font stack, fluid type scale, spacing, motion,
   radius). The type and space scales are fluid: every step is a clamp() with a real minimum,
   a viewport-relative middle term, and a real maximum. The accent clears the 0.10 chroma floor;
   neutrals are cast toward the brand hue (0.004 to 0.02, never 0); the surface ladder as your
   step 5 states it (three levels on a product, data or control surface; every boundary the
   design draws measured on any surface) with the ratios recorded (tint 1.15:1, edge 1.3:1) and
   dark elevation found by a device that measures in pixels.
5. Design each requested component/screen with production-grade code (TypeScript + JSX on the
   primary path; the target stack's idiom otherwise).
6. Run the taste audit (${CLAUDE_PLUGIN_ROOT}/references/aesthetic/03-taste-checklist.md) and
   report PASS / FAIL / NOT ASSESSED (needs browser: <what>) per section, section 1b (substance)
   included, with an explicit line each for smell tests 9.3, 9.9 and 9.10; a code-only pass
   never reports PASS on a browser-only row.
7. State the RESPONSIVE BEHAVIOR of every component you produced: what governs its width, the
   widths in the DISPLAY RANGE where its behaviour changes (or one line saying it is fluid end to
   end, or deliberately fixed geometry), and which sizing decisions are deliberate fixed caps
   rather than fluid values. One short paragraph or table per component.
7b. State the SUBSTANCE CONTRACT per screen (${CLAUDE_PLUGIN_ROOT}/references/aesthetic/06-substance-floor.md
   § 1): accent roles on first paint and its chroma, surface levels with ratios, containment on
   every data panel, the focal visual, imagery and icons, hierarchy channels. Numbers, not
   adjectives.
7c. Write the COPY MAP (${CLAUDE_PLUGIN_ROOT}/references/design/12-copy-placement-and-volume.md
   § 6): one row per paragraph with its headed section, position relative to the primary
   content, word count and measure. At most one row above the primary content, within the
   SURFACE TYPE's lede budget; on a marketing or landing surface that row is the hero subtext and
   nothing else sits in the hero, on every other surface nothing sits in the hero at all; nothing
   between data panels. On an article or long-form surface the body is one row and the map covers
   the prose outside it.
7d. Emit preview.html: one self-contained static file with the tokens inlined on :root (both
   schemes via light-dark()), the primary composition as plain HTML and CSS with the real copy
   and image boxes at final size, fluid across the DISPLAY RANGE, no build step. It is rendered
   and looked at before the design is presented.
8. Output the POV, design plan, flow map, tokens, components, composition, responsive behavior,
   substance contract, copy map, preview, taste audit, and open questions.

HARD RULES:
- Your system prompt binds in full on this dispatch: step 7's responsive contract, step 7b's
  substance contract, step 7c's copy map and step 10's hard rules. They are not restated here.
- Two additions to them. Every text pair clears the WCAG floor (`4.5:1`, or `3:1` for large
  text) as well as the APCA ladder in
  `${CLAUDE_PLUGIN_ROOT}/references/design/01-color-oklch.md` section 6. `svh` is the default
  unit, `lvh` belongs on heroes and decorative fills, `dvh` only on modals and drawers that must
  track the visible area.
- OWNER VETOES bind: a device on that list never appears, whatever a reference recipe suggests.
  HOUSE DEFAULTS are defaults, not decisions about this brief — the brief, the VISUAL REFERENCE
  or the subject's world can override one; name the device and the reason under Open questions.
- Brief-specific bindings, above: VISUAL REFERENCE, OWNER VETOES, HOUSE DEFAULTS, MUST BE
  PRESENT, SURFACE TYPE budgets, DISPLAY RANGE.
- These are a floor. Clearing them is not the work; the design is. Where the brief pins a
  direction, the brief's own words win
  (`${CLAUDE_PLUGIN_ROOT}/references/aesthetic/01-point-of-view.md` section 2) — name the rule it
  overrides and quote the brief on an `anti-slop-allow: <reason>` line. Take aesthetic risk where
  the brief justifies it.

ACCEPTANCE CRITERIA (the floor, not the brief: clearing them is not the work, the design is.
Output is rejected if any fails). Where the brief, the VISUAL REFERENCE or a recorded OWNER VETO
pins a direction, its own words win over any criterion below
(`${CLAUDE_PLUGIN_ROOT}/references/aesthetic/01-point-of-view.md` section 2): the criterion is
then satisfied by an `anti-slop-allow: <reason>` line quoting that source, repeated under Open
questions. Your own preference is not a source, and 3, 7a-d and 11 take no hatch — no brief asks
for elided code, `100vh` or a missing preview.
1. POV statement present, 3-4 sentences, names the VISUAL REFERENCE or the subject anchor it
   derives from and what the design does NOT do; a statement that could be summarised as a list
   of removals fails.
2. Token block present; every color value is oklch(...); states derived via relative color syntax or `color-mix()`.
3. Every requested component has a file path + complete code (no elided bodies).
4. At least one full composition example in real code.
5. Taste audit table present with PASS / FAIL / NOT ASSESSED per checklist section (NOT ASSESSED is the honest value for a browser-only row on a code-only pass).
6. The tells scanner reports clean on the emitted code and on `preview.html`:
   `node ${CLAUDE_PLUGIN_ROOT}/scripts/scan_tells.mjs <every emitted file> preview.html --format json`
   returns zero presence-flaggable findings, and every remaining finding carries an
   `anti-slop-allow: <reason>` on its line or the line above naming the brief clause, the VISUAL
   REFERENCE, the owner-supplied brand value or the repo string that makes it right. Concentration
   tells (template chrome, uppercase eyebrows, middle-dot meta strings, link arrows) fire at the
   catalogue's own thresholds, never on a single deliberate instance; `#000000`, `#ffffff` and a
   bare "Get started" are hits without a reason line and decisions with one (catalogue C1, C2).
7. RESPONSIVE FLOOR, all four parts:
   a. Every component states its width source once and names the widths in the DISPLAY RANGE
      where its behaviour changes (a container threshold fires, a pane opens, the column count
      changes, it reaches its cap); a component that is fluid or intrinsic end to end, or
      deliberately fixed geometry, says so in one line and that is a pass. No horizontal overflow
      of primary content at the narrowest width.
   b. Zero fixed pixel widths or heights on layout containers except those explicitly named as
      deliberate caps in the responsive-behavior section.
   c. Zero `100vh` / `h-screen` on full-height surfaces (`svh`/`lvh`, or `dvh` on modals and drawers, instead).
   d. Zero viewport-breakpoint variants (`sm:`/`md:`/`lg:`) on portable components; those use
      `@container`. Page-level layout may still use viewport queries.
   e. The width is spent, and the responsive contract names the device that spends it (extra
      `auto-fit` columns, a supporting pane, a wider table, a two-column prose-plus-figure
      layout, an expanded rail). The floor is 75% of the viewport at 1920 and 2560 on any
      surface whose content can fill it — a list, table, board, grid, dashboard, entity page or
      reference index — and a reading measure is never the reason a table or a board is capped.
      A surface caps instead only with the reason stated in the contract, and the reason is one
      of: the brief or the VISUAL REFERENCE asked for it (quote it), the repo's existing shell
      already caps, the surface's whole job is one task (sign-in, a single form or settings
      pane, one wizard step, a focused dialog, a reading or focus mode), the block is running
      prose, or the surface is marketing or article. "It looks better centred" is not a reason,
      and a cap with none stated is a fail. A prose-dominant content or reference surface may
      land between 60% and 75% when the rest of the width carries real content — a nav rail, a
      contents rail, figures, code panes — and not gutters; under 60% with no second column,
      supporting rail or stated reading-measure justification fails on every surface type. At
      every width the reading measure sits on the prose block and never on the shell, no
      `max-w-7xl mx-auto` or equivalent is the shell's width strategy, and nothing is sized by
      the leftover (`margin-inline: auto` as the plan, a lone `1fr` beside fixed siblings, a
      two-child `space-between`). Utilisation is a measurement, not a claim: on a code-only pass
      the contract names the device and writes `utilisation not measured`, and Step 5a's
      `measure_density.js` supplies the number and applies the 60%/75% thresholds.
8. DESIGN PLAN present: subject, audience and job (confirmed or proposed); named colours with
   roles; type roles with one or two families; an ASCII wireframe per screen with alignment,
   the focal element and the surface ladder; the opening; principles; and the twin test, where
   every part the plan shares with the twin carries a `Changed X to Y because Z` line or a
   `Kept X because <what fixes it>` line. At least one `Changed` revision is visible in the
   emitted code, unless every shared part is fixed by the VISUAL REFERENCE in translator mode, a
   colour vocabulary the domain owns, a platform norm, an accessibility floor or an owner veto;
   `Kept` lines covering palette, type and composition together fail.
9. SUBSTANCE FLOOR, all six parts, with numbers in the substance contract; a part that
   `${CLAUDE_PLUGIN_ROOT}/references/aesthetic/06-substance-floor.md` section 1 scopes away from
   this SURFACE TYPE is recorded as `n/a: <surface type>` with the reason, never dropped silently:
   a. The accent token is referenced by the primary action AND the current or selected state
      on first paint, at least one of them a fill, and its OKLCH chroma is at least 0.10 in
      both schemes (or an `anti-slop-allow: muted brand <reason>` line).
   b. On control, content, reference, dashboard and marketing surfaces: at least three surface
      tokens with recorded boundary ratios (adjacent tint at least 1.15:1, edge at least
      1.3:1); no boundary that is only a hairline at 0.10 alpha or less on a dark ground; a
      top-edge rim on raised panels in dark. On an article surface that is deliberately one
      ground (S3 is scoped to product and data surfaces): every boundary the design does draw
      clears the same ratios, and the contract names what carries separation instead — a
      measured tone shift, a rule, space, or a type step — with its number.
   c. Every data panel names its containment device.
   d. A focal visual per screen (image, product shot, chart, figure, icon-bearing entity list,
      display-scale heading or typographic poster hero) inside the first viewport; a text-only
      first viewport fails on anything that is not an article.
   e. Imagery and icons planned from ASSETS ON HAND or named as to-produce: at least one real
      image or figure per two sections on marketing and content pages, an icon on every entity
      row where the domain has one.
   f. Hierarchy in at least three of weight, size, colour, containment, space and iconography,
      with at least three weights or optical sizes in use; identity colours at full strength
      wherever the domain owns a colour vocabulary.
10. COPY MAP present with every paragraph of running prose in the code on it and every row in
    the code: zero rows above the primary content beyond the lede budget, zero rows inside the
    hero or between data panels, zero orphan paragraphs, zero visible paragraphs over the
    SURFACE TYPE bar, zero text-only runs of three sections. On an article or long-form surface
    the map covers the prose outside the article body (standfirst, notes, callouts) and the body
    is one row; its lede budget is the standfirst and its bar is design/12 section 3's "no bar".
    The hero, between-panels, orphan and text-only-run clauses hold on every surface.
11. `preview.html` present, self-contained (no imports, no build), tokens inlined, both schemes,
    fluid across the DISPLAY RANGE; and the taste audit reports section 1b and carries an explicit
    verdict line for smell tests 9.3, 9.9 and 9.10: PASS, FAIL naming the device or absence that
    fails it, or NOT ASSESSED with what a browser would settle. An honest FAIL is not a formatting
    failure; it is the first item in the single re-dispatch of Step 6, and only a second pass
    presents it flagged.
12. Zero hits, with no hatch, for any device in a recorded OWNER VETO. A device in HOUSE DEFAULTS
    is rebuttable: a brief clause, the VISUAL REFERENCE or the subject's world that calls for it
    converts it to a stated decision, emitted with an `anti-slop-allow: <the brief clause>` line
    and named under Open questions.
```

## Step 4: Dispatch the agent

Use the Agent tool:
- `subagent_type`: `"ui-craft:ui-craft-architect"`
- `description`: `"Design <brief summary>"`
- `prompt`: the prompt from Step 3
- Foreground (NOT `run_in_background: true`)

## Step 5: Render it, look at it, then audit it

Generated code is code. It gets reviewed before it is presented, not after it ships. And a design nobody has looked at is not reviewed: a dashboard once passed eight specialist reviews while wasting 39% of the display because every reviewer read source and nobody opened a page.

### Step 5a: Render and look (when a browser tool exists)

If a Playwright browser tool is in this session's tool list:

1. Write the architect's `preview.html` to `.claude/ui-craft/runs/<ISO timestamp>/preview.html` in the reviewed repo (or the scratch directory when there is no repo). Serve that directory over a local HTTP server (`python3 -m http.server <port> --bind 127.0.0.1` from the run directory, stopped when Step 5 ends) and open `http://127.0.0.1:<port>/preview.html`; the browser tool blocks `file:` URLs.
2. Resize to 390, 1440, 1920 and the widest width in the DISPLAY RANGE (2560 by default); take a screenshot at each, saved beside the preview; at 1920 and the widest width, evaluate `${CLAUDE_PLUGIN_ROOT}/scripts/measure_substance.js` (call `measureSubstance()`) and `${CLAUDE_PLUGIN_ROOT}/scripts/measure_density.js` (call `measureDensity({ surface: '<SURFACE TYPE>' })`) and save both reports beside the screenshots.
3. Look at the 1440 screenshot yourself before dispatching anything, and write down the first word that comes to mind. If it is grey, flat, empty, plain, unfinished, template, wireframe or terminal, the design fails the stranger's word test (`${CLAUDE_PLUGIN_ROOT}/references/aesthetic/06-substance-floor.md` § 3) and goes back to the architect with that word and the measurement numbers, using the single re-dispatch of Step 6. If it is busy, loud or gaudy, the mirror pass (taste 9.9) is the note. Record the word in the run directory.
4. Pass the screenshot paths and both reports into the Step 5b prompts as read-only evidence; tell the reviewers not to drive the browser themselves.

Without a browser tool, say so in the Step 6 header (`Evidence level: code-only (no browser in session)`), leave every `[browser]` taste row NOT ASSESSED, and run Step 5b on source alone.

### Step 5b: Dispatch the reviewers in parallel

Four reviewers, all read-only, on the architect's output:

```
Agent({ subagent_type: "ui-craft:ui-visual-reviewer",
  prompt: "<the generated component code and preview.html verbatim, the design plan, the substance contract, the copy map, the SURFACE TYPE, the OWNER VETOES block, the Step 5a screenshot paths and measurement reports (or 'code-only'); scope: lens 18 Visual substance, lens 15 copy placement against the copy map, density and economy, POV coherence, the stranger's word test on the render>",
  description: "Visual and substance audit of generated UI" })

Agent({ subagent_type: "ui-craft:ui-anti-slop-auditor",
  prompt: "<the generated component code and preview.html verbatim, the token values, the OWNER VETOES block, and the brief clause or reference behind every `anti-slop-allow` line in the output; audit against the catalogue including V13, W11, W12, L14, T15 and I8, honour the stated decisions rather than re-flagging them, and list what the surface needs added>",
  description: "Anti-AI aesthetic audit of generated UI" })

Agent({ subagent_type: "ui-craft:ui-responsive-reviewer",
  prompt: "<the generated component code verbatim, the DISPLAY RANGE, the stated responsive behavior, the Step 5a screenshot paths if any>",
  description: "Responsive audit of generated UI" })

Agent({ subagent_type: "ui-craft:ui-accessibility-reviewer",
  prompt: "<the generated component code verbatim, the token values, the platform>",
  description: "Accessibility audit of generated UI" })
```

All four use the canonical finding format in `${CLAUDE_PLUGIN_ROOT}/references/review/01-universal-rubric.md`. Confidence is one of the four canonical classes; there is no "Possible issue" class. Without a render, spatial claims are code-level: they keep their canonical confidence class and carry the `[unverified: geometry measurement needed]` modifier on the Evidence line, capped at MEDIUM. With a render, substance and density findings carry the measurement numbers and are ranked at their measured severity.

Any CRITICAL or HIGH finding from any reviewer, and any Recommended change that removes a device without naming its replacement (returned as an open question, never applied), goes back to the architect in the single re-dispatch allowed by Step 6, named explicitly. Skip Step 5b only when the architect produced no code (a pure token or direction pass); Step 5a still runs on the preview when one exists.

## Step 6: Present results

1. Gate the output against the ACCEPTANCE CRITERIA from Step 3 (all twelve, mechanically), against the Step 5a stranger's word and measurements, and against the Step 5b audit. Criterion 6 is a script, not a read: run `node ${CLAUDE_PLUGIN_ROOT}/scripts/scan_tells.mjs <the emitted files> <the preview> --format json` and read its findings — exit 0 is clean, exit 1 means findings to check against their `anti-slop-allow` lines, exit 2 is a usage error to fix and re-run. A criterion cleared by an `anti-slop-allow` line that quotes the brief, the VISUAL REFERENCE or a recorded veto is a pass; carry the reason to the user instead of spending the re-dispatch on it. A real failure means ONE re-dispatch naming the exact failed criterion, the word and numbers from Step 5a, and any CRITICAL/HIGH audit finding. A second failure means present anyway, flagging the gap explicitly. Confirm any `proposed` subject, audience or job — and any `reference proposed` POV — with the user in the same message.
2. Display the agent's output verbatim. Do not summarize or reformat.
3. Show the Step 5a screenshots (or the code-only note), the stranger's word, and the substance and density numbers, then the audit findings, under a `## Pre-ship audit` heading, with the reviewers' verdict lines and the anti-slop auditor's "What this surface needs added" list.
4. Prompt:
   ```
   Apply this design to the project? Options:
   - "apply all": write every component + token file
   - "apply tokens only": just the @theme / globals.css changes
   - "apply [component name]": specific components
   - "revise [aspect]": adjust POV/colors/typography/layout/sizing
   - "skip": take the output and apply yourself
   ```

## Step 7: Apply and verify

1. If the user asks to apply, YOU (the orchestrator) create the files using Write/Edit. Do not re-dispatch the agent.
2. Then verify what you wrote, on the paths you touched:
   - TypeScript: run the TypeScript 7 gate by path, resolving the compiler by version rather than by alias name: try `node_modules/ts7/bin/tsc`, `node_modules/@typescript/native/bin/tsc`, then `node_modules/typescript/bin/tsc`, and use the first whose `--version` prints `Version 7.` (Microsoft's side-by-side layout keeps TypeScript 6 at `node_modules/typescript/bin/tsc6`). Never bare `tsc`, because with two compilers installed the `.bin/tsc` link is arbitrary; redirect the output to a log and read the exit code, never infer the result from the output.
   - Run the project's lint command.
   - Tailwind v4: check that the new `@theme` tokens resolve.
3. Write `design/POV.md` from the architect's worksheet (three adjectives, the visual reference, anchors, banned list, must-be-present list, density, tone, motion, decoration, the copy map's placement rules) and `design/notes.md` recording the twin test's "Changed X to Y because Z" and every direction tried and rejected, so the next pass starts from a decision instead of re-deriving one. Never write a test that pins a design literal.
4. Report any breakage with the fix, and offer to iterate. Code that does not compile is not applied work.
5. Offer to run `review-ui` on the new components for a full second-opinion audit, or `improve-ui` for the complete pass.

This skill never writes a CI verdict artifact. `improve-ui` is the only producer.

## When to skip parts

- **No repo**: Skip pre-flight. Greenfield is fine.
- **User gave strong constraints**: Don't re-ask what they already said. Pass through to the prompt.
- **Simple component request** (for example "design a button"): the architect's process still applies, dispatched or run by the session itself (see Execution mode). Even a single button should carry the project's POV, and it still gets the Step 5 audit. The artifacts scale to the brief: the POV, the design plan (palette, type, opening, twin test), the tokens or the inherited token reference, the component code, its responsive contract row, its substance row, `preview.html` and the taste audit always ship; the flow map collapses to one line on where the component sits, what it hands off, and what happens when its action fails; the per-screen artifacts (wireframe, copy map, focal visual, imagery ratio) are marked `n/a (no screen in this brief)` with that reason. At Step 6 an `n/a` criterion is a decision, not a failure, and does not spend the re-dispatch.

## Anti-patterns to avoid

- Don't dispatch without a brief; ask first.
- Don't dispatch without project context if there IS a repo; the architect needs it.
- Don't ship a design whose only tested width is the one you imagined.
- Don't present a design nobody rendered when a browser tool exists; open the preview and look.
- Don't accept a design that clears every ban and has no substance: grey, one hairline, no elevation, no imagery is the 2026 default, not restraint.
- Don't let a paragraph land above the product, inside the hero (a marketing hero's one subtext line excepted), or between two panels; the copy map decides placement before code does.
- Don't spend the one re-dispatch on a criterion the architect cleared with an `anti-slop-allow` line that quotes the brief or the reference; report the trade and let the user judge it.
- Don't summarize the agent output; show it raw.
- Don't auto-apply; wait for explicit user approval.
- Don't apply without running the typecheck and lint gates afterwards.
- Don't run in background; the user wants to watch progress.
