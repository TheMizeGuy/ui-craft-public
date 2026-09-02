---
name: design-ui
description: |-
  Use this skill when the user asks to design new UI: a screen, flow, page, component, or full product. Triggers: "design a [thing]", "build me a [screen/page/flow]", "create the UI for", "design the [dashboard/settings/onboarding/landing]", "make this screen look [distinctive/professional/not AI]". Dispatches the ui-craft:ui-craft-architect agent (pinned to Opus 5 at dispatch) which commits to a distinctive aesthetic POV, generates a token system (OKLCH + variable fonts + modular spacing + spring motion), and produces production-grade UI code that does not look AI-generated, then audits the fresh code with the responsive and accessibility reviewers before it is presented. TypeScript + React + Tailwind v4 is the primary output path; the design principles (POV, tokens, catalogue floor, taste gate) apply to any stack. Uses the internal anti-AI-tells catalogue as a hard floor and the taste checklist as a pre-ship gate.
argument-hint: '<brief description of what to design>'
allowed-tools: Bash, Read, Grep, Glob, Edit, Write, TodoWrite, Agent
---

# Design UI

You are coordinating new UI design on the user's behalf. Your job is to gather project context, construct a self-contained prompt, dispatch the `ui-craft:ui-craft-architect` agent, audit what comes back, and only then offer to write files.

**Nothing is written until the user approves.** The `Edit`/`Write` grant in the frontmatter exists for Step 7, where the user has explicitly asked to apply the design. Generation and audit are read-only.

## Execution mode

Design work is dispatched, never done inline in the orchestrating session. The `ui-craft-architect` and the Step 5 audit reviewers run as Opus 5 subagents: pin `model: "opus"` on every call, the coding/review floor (owner directive 2026-07-24). Never omit `model` (an omitted model inherits the session model, which a policy-gated harness denies) and never use a dated model ID. The orchestrator conducts on the session model: it builds the prompt, gates the output, and applies approved files. Run the architect's process inline only when no Agent tool exists in the current context (read `${CLAUDE_PLUGIN_ROOT}/agents/ui-craft-architect.md` and follow its Knowledge sources table and process steps verbatim), and say so in the output header; the Step 5 audit runs either way.

## Stack awareness

TypeScript + React + Tailwind v4 is the primary, default output path, and the acceptance criteria below assume it. The design invariants are stack-agnostic: a committed POV, an OKLCH-based token system, the anti-AI-tells catalogue floor, the responsive floor, and the taste gate apply whether the target is React, Svelte, Vue, or plain HTML/CSS. For a non-TS/React web stack, the architect keeps those invariants and adapts the code target (design tokens, component structure, responsive strategy, and taste audit still ship); the OKLCH-only and TS-strict rules relax only where the platform cannot express them. For native iOS or Android UI design, use `apple-ui-craft` instead: this skill's scope stops at web and cross-platform-web stacks.

## Step 1: Parse the brief

The user passed a description (may be empty). Extract:
- What to design (screen, page, flow, component family, full product)
- Any stated constraints ("dark theme", "minimal", "dense dashboard")
- Any stated POV ("like Linear", "editorial", "tactical")
- Any stated framework/platform (React, Next.js, Svelte, SwiftUI, static HTML, etc.)
- The **display range** the design must survive. If the user did not say, take the default from `${CLAUDE_PLUGIN_ROOT}/references/review/03-viewport-matrix.md`: the narrowest width (320, the WCAG 1.4.10 reflow target), a modern mobile width (390), **900** (the width nobody designs at, where fluid failures live and nowhere else), a laptop width (1440), the most common desktop width (1920, where the density thresholds are calibrated), and the widest the product will realistically see (2560, where dead space becomes measurable). Plus any width where the product's existing breakpoints already fire.

If the brief is empty or too vague to act on, ask one focused question: "What screen or flow should I design? Any aesthetic direction?" Do NOT proceed without knowing what to build.

## Step 2: Pre-flight context (run in parallel)

If working in an existing repo:

1. **package.json**: Read it. Note framework, React version, Tailwind version, existing design libraries.
2. **Token system**: Read `app/globals.css`, `tailwind.config.*`, or any `theme.ts`/`:root` blocks. Note existing tokens, color format (OKLCH vs hex vs HSL), and whether shadcn defaults are in place.
3. **Existing components**: Glob `**/components/ui/*.tsx` or similar. List what primitives exist.
4. **Existing sizing strategy**: Grep for `clamp(`, `@container`, `dvh`, `svh`, and for fixed widths (`w-[`, `max-w-[`, `width:` with a px literal). This tells the architect whether it is joining a fluid system or introducing one.
5. **Workspace root**: `git rev-parse --show-toplevel` for absolute paths.

If no repo, greenfield is assumed.

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
1. Read every Always row of your Knowledge sources table (it includes usability/01-03,
   accessibility/01-04, responsive/*, aesthetic/*, design/*, architecture/01+03 and the
   catalogue), plus the conditional rows this brief triggers (dataviz/01-03 for charts, stats or
   a dashboard; design/10 for a landing page; design/11 for an image spec; the platform overlay
   for the target stack), and review/03-viewport-matrix.md for the display range.
2. Inspect existing repo components and tokens if applicable.
3. Commit to a POV. Write the 3-4 sentence statement.
4. Generate the full token system (OKLCH color, font stack, fluid type scale, spacing, motion,
   radius). The type and space scales are fluid: every step is a clamp() with a real minimum,
   a viewport-relative middle term, and a real maximum.
5. Design each requested component/screen with production-grade code (TypeScript + JSX on the
   primary path; the target stack's idiom otherwise).
6. Run the taste audit (${CLAUDE_PLUGIN_ROOT}/references/aesthetic/03-taste-checklist.md) and
   report PASS / FAIL / NOT ASSESSED (needs browser: <what>) per section; a code-only pass never
   reports PASS on a browser-only row.
7. State the RESPONSIVE BEHAVIOR of every component you produced: what governs its width, what
   happens to it at each width in the DISPLAY RANGE, and which sizing decisions are deliberate
   fixed caps rather than fluid values. One short paragraph or table per component.
8. Output the POV, tokens, components, composition, responsive behavior, taste audit, and open
   questions.

HARD RULES:
- No AI-default aesthetic. The internal anti-AI-tells catalogue
  (${CLAUDE_PLUGIN_ROOT}/references/catalogue/01-ai-tells.md) is the floor.
- OKLCH colors only (no hex, no HSL in the token system).
- Distinctive font stack (no Inter/Roboto/Helvetica/Arial as primary).
- Production code that compiles under TS6 strict on the primary path. No // TODO, no placeholders.
- Real product copy. No lorem ipsum, no "Submit", no "Get started in seconds".
- prefers-reduced-motion honored on all decorative animation.
- APCA contrast clears the size/weight ladder, computed not eyeballed: `90+` small and
  regular-weight body text, `75+` larger or bold body text, `60+` headlines and large UI text,
  `45+` icons, borders and focus rings. Requirements go UP as text gets smaller and thinner.
  Every text pair must also clear the WCAG floor (`4.5:1`, or `3:1` for large text). Source of
  truth: `${CLAUDE_PLUGIN_ROOT}/references/design/01-color-oklch.md` section 6 (the APCA ladder and the WCAG 2.x floor).
- FLUID BY DEFAULT. No fixed pixel width or height on a layout container unless it is a
  deliberate, stated cap (a reading measure, a fixed-width sidebar rail, an icon box). Type and
  space come from the clamp() scale, not from per-breakpoint overrides.
- CONTAINER QUERIES OVER VIEWPORT QUERIES on any component that can appear in more than one
  slot. A portable component sized by `sm:`/`md:`/`lg:` is wrong by construction: it responds to
  the window rather than to the space it was given.
- `svh` by default, `lvh` on heroes and decorative fills, `dvh` only on modals and drawers that must track the visible area (responsive/01 section 7); never `100vh`/`h-screen` on any full-height surface. `100vh` is taller than the
  visible area on mobile browsers with dynamic toolbars, so the last row is cut off.
- No emojis, no AI slop, no trailing summary.

ACCEPTANCE CRITERIA (output is rejected if any fails):
1. POV statement present, 3-4 sentences, names what the design does NOT do.
2. Token block present; every color value is oklch(...); states derived via relative color syntax or `color-mix()`.
3. Every requested component has a file path + complete code (no elided bodies).
4. At least one full composition example in real code.
5. Taste audit table present with PASS / FAIL / NOT ASSESSED per checklist section (NOT ASSESSED is the honest value for a browser-only row on a code-only pass).
6. Zero hits for: #6366f1, #14b8a6, #000000, #ffffff, "lorem", "Get started", a visible control label reading exactly "Submit" (match `>Submit<` or `label="Submit"`; JSX props such as `onSubmit` do not count), "TODO".
7. RESPONSIVE FLOOR, all four parts:
   a. A stated behavior for every component at every width in the DISPLAY RANGE, and no
      horizontal overflow of primary content at the narrowest width.
   b. Zero fixed pixel widths or heights on layout containers except those explicitly named as
      deliberate caps in the responsive-behavior section.
   c. Zero `100vh` / `h-screen` on full-height surfaces (`svh`/`lvh`, or `dvh` on modals and drawers, instead).
   d. Zero viewport-breakpoint variants (`sm:`/`md:`/`lg:`) on portable components; those use
      `@container`. Page-level layout may still use viewport queries.
```

## Step 4: Dispatch the agent

Use the Agent tool:
- `subagent_type`: `"ui-craft:ui-craft-architect"`
- `model`: `"opus"` (mandatory, see Execution mode; an omitted model inherits the session model, which a policy-gated harness denies)
- `description`: `"Design <brief summary>"`
- `prompt`: the prompt from Step 3
- Foreground (NOT `run_in_background: true`)

## Step 5: Audit the fresh code before showing it

Generated code is code. It gets reviewed before it is presented, not after it ships. Dispatch two reviewers in parallel on the architect's output, both `model: "opus"`, both read-only:

```
Agent({ subagent_type: "ui-craft:ui-responsive-reviewer", model: "opus",
  prompt: "<the generated component code verbatim, the DISPLAY RANGE, the stated responsive behavior>",
  description: "Responsive audit of generated UI" })

Agent({ subagent_type: "ui-craft:ui-accessibility-reviewer", model: "opus",
  prompt: "<the generated component code verbatim, the token values, the platform>",
  description: "Accessibility audit of generated UI" })
```

Both reviewers use the canonical finding format in `${CLAUDE_PLUGIN_ROOT}/references/review/01-universal-rubric.md`. Confidence is one of the four canonical classes; there is no "Possible issue" class. Because there is no running app at this point, spatial claims are code-level: they keep their canonical confidence class and carry the `[unverified: geometry measurement needed]` modifier on the Evidence line, capped at MEDIUM.

Any CRITICAL or HIGH finding from either reviewer goes back to the architect in the single re-dispatch allowed by Step 6, named explicitly. Skip this step only when the architect produced no code (a pure token or direction pass).

## Step 6: Present results

1. Gate the output against the ACCEPTANCE CRITERIA from Step 3 (all seven, mechanically) and against the Step 5 audit. Any failure means ONE re-dispatch naming the exact failed criterion and any CRITICAL/HIGH audit finding. A second failure means present anyway, flagging the gap explicitly.
2. Display the agent's output verbatim. Do not summarize or reformat.
3. Show the audit findings below it, under a `## Pre-ship audit` heading, with the reviewers' verdict lines.
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
3. Report any breakage with the fix, and offer to iterate. Code that does not compile is not applied work.
4. Offer to run `review-ui` on the new components for a full second-opinion audit, or `improve-ui` for the complete pass.

This skill never writes a CI verdict artifact. `improve-ui` is the only producer.

## When to skip parts

- **No repo**: Skip pre-flight. Greenfield is fine.
- **User gave strong constraints**: Don't re-ask what they already said. Pass through to the prompt.
- **Simple component request** (for example "design a button"): Still dispatch the architect. Even a single button should carry the project's POV, and it still gets the Step 5 audit.

## Anti-patterns to avoid

- Don't dispatch without a brief; ask first.
- Don't dispatch without project context if there IS a repo; the architect needs it.
- Don't dispatch without `model: "opus"`; never an omitted model.
- Don't ship a design whose only tested width is the one you imagined.
- Don't summarize the agent output; show it raw.
- Don't auto-apply; wait for explicit user approval.
- Don't apply without running the typecheck and lint gates afterwards.
- Don't run in background; the user wants to watch progress.
