# Changelog

## 0.6.1 — 2026-09-22

The first real-site run of 0.6.0 (a four-page data product reviewed read-only,
four specialists plus the verifier over pre-captured 390/1440/1920/2560 renders)
found the doctrine doing its job and two of the measurement scripts not doing
theirs. The reviewers corrected both by eye against the renders, which is the
fallback the references prescribe, but a number that has to be corrected by eye
is not the number the substance floor was built on. Both defects are fixed at
the root and pinned.

**`scripts/measure_substance.js` reads every computed-colour notation.** Chrome
serialises a colour in the notation it was declared in, and relative colour
syntax or `color-mix()` over an oklch token comes back as `lab()`. The parser
handled `rgb()`, `oklch()`, `oklab()` and `color(srgb)` and returned null for
everything else, so on the reviewed landing page the brand fill on the primary
call to action (`lab(71.18 10.51 64.19)`, the gold token exactly) was invisible
to the S1 row, which then reported a 4px quality-colour dot as the page's
accent. The parser now converts `lab()`, `lch()`, `color(srgb-linear)` and
`color(display-p3)` exactly, falls back to a 1x1 canvas read-back for any other
form (the format-proof path `review/06-measurement-traps.md` section 1 already
prescribed), and lists whatever it still could not read in a new
`unparsedColors` row so a null is visible instead of a silent pass. Re-run on
the same page the accent reads as gold in three roles with a fill, matching the
render. `tests/harness/measure-colour.selftest.mjs` (18 cases) pins every
notation and the values it must produce; the release gate runs it.

**`scripts/measure_density.js` never takes a third-party slot's own link as the
primary.** The first `a[href]` inside `main` on three of eight runs was the ad
unit's "Report Ad" anchor, so `primarySelector` resolved to it and
`wordsBeforePrimary` reported 0 on exactly the loads where the unit filled,
while the other width on the same page reported 53. Slot wrappers (matched by
class, id or `aria-label` against a strict advert vocabulary, and by the iframe
they contain) are now chrome: never the first control, never running prose.
The broad embed-and-widget vocabulary still feeds only the reflow-risk row, so
a content component with "widget" in its class name cannot hide the page's
real primary.

**A reserved slot between the H1 and the primary content is now a measured
row.** `design/12` section 5 says a slot never sits between the identity block
and the primary content; the static check previously saw only the reflow half
(an unreserved slot) and reported nothing on a 280px reservation that put the
reviewed pages' first screen as a heading, a void and two paragraphs. The
script now reports `slotsAbovePrimary` (selector and reserved pixels, 120px or
more, in flow, after the H1 and before the primary) and files it as a MEDIUM
finding with the move-below-the-first-instrument fix. Documented in
`review/05` and `design/12`.

Nothing in the doctrine, the catalogue, the corpus or the agents changed; the
blind baseline, the dogfood counts and the freedom ceilings are untouched.

## 0.6.0 — 2026-09-22

The substance-and-placement overhaul (owner directive 2026-09-22, after six
review-and-fix campaigns on one data product each rendered it flatter, greyer
and more text-heavy, and after the same product's rebuild audit named five
places in 0.5.3 that pushed it there). Every rule the plugin shipped before was
a rule against excess, and a model clears every such rule fastest by removing
the device: grey neutrals, one hairline at 8% alpha for every boundary, no
elevation, badges and edges stripped, the accent reduced to status colour, the
system stack at default weights everywhere, and paragraphs dropped wherever the
cursor was. This release adds the other direction, with measurements, and binds
it on every path. It also re-audits Anthropic's `frontend-design` guidance and
folds the behavioural steps that had stayed outside the architect's process
into it, adds the app-shell and content-layout reference the owner asked for,
and closes the wide-display gap (narrow centred columns on 1920 and 2560).

**The five pointers from the site audit, and what changed at each.**

- `references/aesthetic/01-point-of-view.md` house-font paragraph (the system
  stack as the house default, applied sitewide): the system stack is now a base
  for UI text only when `design/02` § 2's checkable rule holds (a distinct display
  face, explicit weights and tracking, at least three weights in use); applied
  sitewide at default weights it has made no type decision (T2) and fails
  substance check S7. Poppins or the brand's display face carries headline and
  hero moments. The mono directive is untouched.
- `references/aesthetic/01-point-of-view.md` Template A (a review classified the
  product as this template and concluded nothing needed changing): templates are
  worked examples, never a classification target. The visual reviewer's `POV
  detected:` line never classifies a product into a template; a product whose
  rendering matches Template A without an owner-named reference is reported as
  "subtraction-only (V13)", and `aesthetic/02`'s "POV template fit" field is now
  "Closest worked example (never a classification or routing target)". Template
  A's own Decoration and Card rows are rewritten two-sided so the example itself
  clears the substance floor, and a fourth template, "Restrained Premium
  Reference" (the owner's taste as a worked example: boxed panels with real
  edges, a gold accent over the chroma floor, identity colours at full
  saturation, three measured surface levels, a rim in dark), sits beside it.
- `references/catalogue/01-ai-tells.md` C12 ("Most surfaces should be flat"):
  rewritten. The tell is an identical shadow everywhere, not the presence of
  shadow; the fix is a three-level elevation scale with measured boundaries, a
  rim in dark, and a findable boundary on every resting surface.
- `references/catalogue/01-ai-tells.md` Strongest-10 #1 (a card with border,
  shadow and radius flagged on a single instance): rows 1, 4 and 6 are
  uniformity fingerprints and fire only on their repeated signature (row 1 on
  every card of a surface with two or more, or three or more anywhere; row 4 on
  an overline above three or more headings or every table header and label;
  row 6 at three or more identical tinted icon wrappers). One framed card, one
  deliberate uppercase label, one framed icon is a choice, and framed panels
  with real edges are named as the reference for data products. The corpus
  pins this with the new `framed-panels-clean.html` control.
- `references/catalogue/01-ai-tells.md` Strongest-10 #4 (uppercase overlines
  banned on presence, outside the concentration escape hatch): same rescope;
  the remediation keeps the label's information (small-caps or weight), never
  removes it.

**New references (57 to 60).**

- `references/aesthetic/06-substance-floor.md`: the seven substance checks with
  thresholds (S1 accent presence in two roles with a fill; S2 accent chroma at
  least 0.10; S3 three surface levels with boundaries measured as ratios, tint
  1.15:1 or edge 1.3:1, in pixels where a shadow or rim is involved; S4 real
  edges on data panels, a hairline at 0.10 alpha or less on dark is not an
  edge; S5 a focal visual per screen; S6 imagery per section and icons on
  entity rows; S7 hierarchy in three channels and identity colours at full
  strength), the severity rule that keeps measured flatness out of TASTE, the
  stranger's word test, the ornament-versus-substance earning test, the
  dark-mode rim rule (a token refresh once measured 1.0015:1 in dark), and the
  pairing table that names a replacement device for every removable tell.
- `references/design/12-copy-placement-and-volume.md`: every paragraph has a
  headed home at a measure; the product comes first with one lede above it (25
  words on product and marketing surfaces, 40 on content and reference pages);
  per-surface budgets that replace the marketing and documentation exemption in
  `design/08` § 4b and `review/05`; no text-only runs; the layout never depends
  on a third-party slot rendering; a word-count floor in a test or lint is a
  padding generator and is itself a finding; the copy map.
- `references/usability/05-app-shells-and-content-layout.md`: researched
  against current platform and design-system guidance. The shell contract (what
  a top bar and a left rail each own; the two-primary-menus defect), choosing
  and sizing the shell with the published bands and the named disagreements,
  collapse and the icon-rail penalty, in-page navigation, entity-page anatomy
  (identity and key facts inside the first viewport), canonical panes, list vs
  table vs card, first-viewport contents by page type, reading measures (with
  Material named as the 40-60ch outlier), text-to-control placement and the
  no-prose-between-controls rule, chunking for the scan, promo and embed
  slotting, § 3b spending the width on wide displays, detection snippets,
  severity anchors.

**Catalogue.** Six new tells, all with corpus fixtures: V13 flat-terminal
subtraction-only system (HIGH, presence), W11 prose blob above the primary
content (HIGH, presence), W12 orphan paragraph (MEDIUM), L14 text-only section
run (MEDIUM), T15 template chrome strings and the single accented word (middle
dot meta strings, `WORD — fragment` labels, `→` on links, one accented headline
word; MEDIUM), I8 no real imagery on a visual product (HIGH, presence). The
terracotta accent near `#D97757` is named in the Tasteful Default section with
its reason. Remediation floor rule 3: a fix never leaves the surface flatter,
and every removal names its replacement from the pairing table. C5 and C6 name
a replacement instead of "a flat colour". The V5 fingerprint no longer
prescribes a single accented word as the fix. The section-9 intro states that
a device encoding selection, severity, rarity or category is substance, not a
tell. The intro names the 2026 second face of the default.

**Architect and design-ui.** Step 3b grounds the design in the subject's own
world (subject, audience and job proposed when the brief leaves them open),
drafts a compact plan (named colours with roles, one or two type families with
roles, an ASCII wireframe per screen with the focal element and the surface
ladder, the opening, principles) and runs the twin test with a paragraph
beginning "Changed". Token rules carry the accent chroma floor, hue-cast
neutrals, the measured surface ladder and the rim in dark. Step 7b is the
substance contract per screen; 7c the copy map; the output gains `### Design
plan`, `### Substance contract`, `### Copy map` and `### Preview`
(`preview.html`, self-contained, tokens inlined, both schemes). The
responsive contract names 1920 and 2560 and carries a surplus-width plan per
screen (at least 75% of the viewport used on control, content, reference and
dashboard surfaces; the reading measure on the prose block, never the shell;
nothing sized by the leftover). The self-check gains rows for all of it plus the
template-chrome strings, the terracotta hex, the family count and owner vetoes;
the hard rules gain their positive half (ship substance; focal budget in one
place, material everywhere; copy has a home; two families; owner vetoes bind).
`design-ui` parses the surface type, sources an OWNER VETOES block and the
assets on hand, carries acceptance criteria 8 to 12 (design plan, substance
floor, copy map, preview, template chrome) and 7e (the width is spent), and
gains Step 5a: when a browser tool exists the preview is served locally,
rendered at 390, 1440, 1920 and the widest width, looked at (the stranger's
word test) and measured with both scripts; Step 5b dispatches the visual
reviewer and the anti-slop auditor alongside the responsive and accessibility
reviewers. Step 7 writes `design/POV.md` and `design/notes.md` on apply.

**Review side.** The rubric's `Recommended change:` field rule is the canonical
source for "a removal names its replacement or is filed as an open question";
"Flatness is not automatically TASTE" sits beside the waste rule; the Colour and
Content rows carry the absence and placement signals. `review/04` gains
evidence rows for density, elevation and substance claims, the never-downgrade
rule for measured findings, the `Widths viewed:` line (a STRONG visual verdict
needs a non-empty one), and false-positive filters for encoding devices and
single framed cards. `review/05` carries per-surface copy budgets and placement
rows; `review/07` says upgrade means replace, adds floors beside its ceilings
and five defect-to-cure rows. The visual reviewer runs density on every surface
and gains lens 18 (visual substance, measured); the anti-slop auditor detects
the new tells, reports substance rows in its summary, runs smell test 9.10 and
the stranger's word test, and ends with "What this surface needs added"; the
verifier returns removals without a replacement as open questions. `review-ui`
and `improve-ui` gain the doctrine audit (the reviewed repo's own docs, lints
and tests that enforce flatness or text volume, reported as `Doctrine:`
findings for the owner to keep or retire), the OWNER VETOES and DOCTRINE
CONSTRAINTS blocks every specialist receives, 1920 pinned in the capture set,
both measurement scripts at 1920 and the widest width, and apply guards (never
a sweep, never an unseen replacement, never a vetoed device). Taste checklist:
section 1b (substance), 1.7's floor clause, 2.10, copy rows 6.6 to 6.9, a
two-sided 9.9, smell tests 9.11 and 9.12, and 3b.10 at HIGH under 60%.

**Scripts.** `scripts/measure_substance.js` (new) measures the floor on a live
page: accent presence and chroma (computed `oklch()`, `oklab()` and `color()`
values parse), surface levels and their ratios, boundaries and the hairline
trap, the focal visual, imagery per section, hierarchy channels; shadow and rim
boundaries it cannot see are listed for a pixel read-back.
`scripts/measure_density.js` gains a `surface` option and the placement numbers
(`wordsBeforePrimary`, `orphanParagraphs`, `textOnlySections`,
`longestParagraph`, `totalVisibleWords`, `slotReflowRisk`). Every number is a
ceiling.

**Doctrine and recurrence guards (added after a Jev confidence pass rated
navigation layout and repo doctrine as rules-only).** `scripts/audit_doctrine.mjs`
(new, Node CLI) scans a reviewed repository's own docs, lint rules and tests for
text-volume floors, CSS pin assertions that freeze visual literals, doctrine lines
that ban a substance device without naming a replacement, and lint rules that
forbid a visual property, and prints them as canonical `Doctrine:` findings; on
the affected site's repository it found 122 pin tests, 19 word-count floors and
57 flat-doctrine lines. `review-ui` Step 3b and `improve-ui` Step 2c run it, and
`improve-ui` gains the doctrine gate: a fix that an open constraint would revert
is applied together with the constraint's retirement or held with the blocker
named. `measure_density.js` prints the shell rows from the app-shells reference
(prose wedged between two controls, tab strips wrapping to a second row,
destinations held by both the top bar and the rail), each graded HIGH. The
review ledger moves to schema v3 with an optional `measurements` block (the
substance and density numbers at 1920 from a browser run), and the delta gains
**SUBSTANCE REGRESSED**: a later run whose accent chroma, surface levels or
imagery fell, or whose words above the product rose, files a HIGH finding with
both numbers, so a campaign that strips the previous campaign's substance is
caught by the number.

**Freedom pass (owner directive: do not over-restrict the model's creativity,
reasoning and freedom).** A 23-agent adversarial audit (six lenses, batched
skeptics defaulting to "not a restriction") verified 47 over-restrictions and
kept 12 rules on purpose. Applied: a "do no harm" core principle in the
architect, the design skill, the anti-slop auditor and the visual reviewer (a
rule that makes this design worse is skipped and named on an `anti-slop-allow`
line; the brief's words and the owner's reference always win; rigid compliance
is its own detectable pattern); the acceptance criteria are declared a floor,
not the brief, with the hatch quoting the brief's source; the substance-floor
criterion is scoped by surface type with `n/a` cells; the visual-reference
question is asked once and, unanswered, the design is grounded in the subject
and only a category-routed POV is rejected; fleet-wide preferences move from
OWNER VETOES to a rebuttable HOUSE DEFAULTS block; the catalogue's presence list
narrows to verbatim-signature fingerprints while convention compositions fire on
generic content or three co-occurring; the verifier honours stated decisions and
records them; hand-grep criteria are replaced by one `scan_tells.mjs` run; the
architect proposes missing facts marked `assumed` or `proposed` instead of
stopping; artifacts scale to the brief; the substance reference shows a passing
monochrome page, an image-led page and a text-first product beside the
boxed-panel example. Kept as written: the chroma floor, the imagery ratio, the
stranger's word test, the two user-banned devices, the twin test. The pass is
held in place by `tests/harness/freedom.mjs`, a release gate with a committed
ceiling on the prohibition load of each steering file (absolute rules with no
hatch on their line, and the count of acceptance criteria): a future edit that
adds a ban without a hatch fails the gate.

**Anti-slop ports (selected by a Jev judgment over twelve of the sibling
plugin's mechanisms; the seven rated a high-confidence benefit that adds no
restriction).** `scripts/scan_tells.mjs` (a zero-dependency regex scanner for
the catalogue's exact-signature tells, ported from anti-slop's design rules,
mapped to ui-craft codes, honouring `anti-slop-allow`, presence versus
concentration applied per file, with heuristic candidates for T15, W11, I8 and
V13 marked as such); `scripts/check_references.mjs` (every plugin citation and
section reference resolves, run as a gate, because an unresolved pointer is a
silent capability loss); `tests/harness/dogfood.mjs` (the plugin's own shipped
markdown scanned with its own scanner and doctrine audit, one committed count
per file); fourteen corpus fixtures ported from anti-slop's design corpus (seven
labelled, seven clean controls, six of them near-miss at tolerance zero); a corpus label
contract test (every label's severity agrees with catalogue section 18); a
sampling-disclosure rule for large scopes (prioritise, say what was read, mark
the rest NOT ASSESSED). Not ported, by the same judgment: the UI copy
vocabulary lists (rated as adding restriction), the per-project allowlist
config, the inline self-check reference, and the scan-history dashboard.

**Corpus (21 to 40).** `flat-terminal.html` (V13), `prose-blob-top.html` (W11),
`orphan-paragraphs.html` (W12, L14), `icon-cards-no-imagery.html` (I8), and the
clean control `framed-panels-clean.html` (one framed card, one uppercase label,
one framed icon: the choices the rescope protects). Blind baseline
`tests/corpus/baseline-2026-09-22.json`: recall 0.882 (30 of 34 labels), precision 1.0, all six clean controls at zero. The four misses are the same-span folding documented at the 2026-09-01 baseline (one finding covering several enumerated labels); two longstanding misses closed (C5 on `gradient-hero`, T1 on `legacy-marketing-page`). Two label corrections, both recorded in `labels.json` meta: V1 retired from `frosted-nav-neon.html` (one tinted wrapper; the tell now needs three) and T15 added to `fixed-desktop-shell.html` (three middle-dot meta rows). The answer key carries the six new labels and the harness selftest holds the newest blind baseline, not frozen history, to precision 1.

**References touched for the floor.** `aesthetic/01` (six-look calibration,
worksheet Q11 must-be-present and Q12 copy map, the focal budget split from the
material, `## Must be present` and `## Copy map` worksheet fields),
`aesthetic/04` (structure is not decoration), `design/01` (chroma floor,
identity as a colour job, hue-cast neutrals in every code block, dark-surface
craft measured in pixels), `design/02` (checkable rule part c, the focal-figure
floor), `design/06` (small-caps eyebrow, no middle dot, commitment instead of
"flatten", real category colour allowed), `design/07` (elevation floor, the
inverse litmus, the rim recipe), `design/08` (exemption removed), `design/10`
(text-only sections, the floor beside the three-hue cap).

**Confidence.** Two rounds of TypeSafe Jev judgments (`jev-1.13.0`) over the
described problems, causes, changes and enforcement placed all eight areas
(flat output, text blobs, navigation and layout, wide displays, reviews passing
bad UI, repo doctrine, recurrence, creativity and freedom) at the "addressed and
enforced by something that fails" level, with navigation and layout the weakest
at about 0.77 (rules and density measurements, no corpus fixture yet). Jev also
selected the anti-slop ports above. The judgments read descriptions of the
plugin, not the rendered site: the first design and improve runs on the
affected product with a browser tool present are the real test.

No CI schema change: substance and doctrine findings ride `dimension: visual`.
The review ledger moves to schema v3 (an optional `measurements` block).
Version lockstep across the four manifests; the public mirror regenerated.

## 0.5.3 — 2026-09-16

No POV template is a routing target, and nothing is removed without a
replacement (owner directive 2026-09-16, after a data-dense product was
rendered as a flat dark terminal for the third time). Documentation and
dispatch instructions only: no tell definition changed, no corpus, harness
or CI change.

- `references/aesthetic/01-point-of-view.md`: the § 3 templates are worked
  examples, never a routing target; Template A (Tactical Operator) is opt-in
  only, used when the brief names it or the owner's reference imagery is that
  look; the visual reference (a screenshot, a named product, or the product's
  existing identity, owner-approved) is a required worksheet input and is
  asked for rather than inferred from the product category.
- `agents/ui-craft-architect.md`: the product-category selection tree is
  gone. The POV derives from the brief's VISUAL REFERENCE and the worksheet;
  a missing reference is the one question the architect blocks on; a POV that
  can be written entirely as removals is rejected before any token is
  written. New hard rule "Nothing removed without a replacement". The worked
  example derives its dark ground from an owner-named reference, not from
  "dense data".
- `skills/design-ui/SKILL.md`: VISUAL REFERENCE parsed in Step 1 and asked
  for when absent, carried as its own block in the Step 3 prompt; hard rules
  against template-by-category and against removal without replacement;
  acceptance criterion 1 requires the POV statement to name its reference.
- `skills/improve-ui/SKILL.md` and `agents/ui-team-lead.md`: every removal in
  an improvement plan names the device that replaces it (acceptance criterion
  8, team-lead hard rule 13); the orchestrator applies only the findings the
  user picked, never a "remove the slop" sweep.
- `references/aesthetic/03-taste-checklist.md`: smell test 9.10, a
  subtraction-only system fails; sign-off template row added.
- `references/catalogue/01-ai-tells.md` § How to apply: on an existing
  product the catalogue audits, it does not redesign. No tell definition or
  match rule changed, so the corpus scoring is unaffected.
- `agents/ui-visual-reviewer.md`: the report's POV line no longer offers
  "Tactical Operator-style" as its example value.
- `README.md`: the reference table row for `01-point-of-view.md` matches.

## 0.5.2 -- 2026-09-15

- Correct the delegation rationale: Agent access depends on runtime tool grants and nesting depth. Keep the established orchestration paths, tool grants, and model/effort policy.

## 0.5.1 — 2026-09-02

Withdraws the Fable-lane dispatch that 0.5.0 shipped (owner directive
2026-09-02). Documentation and dispatch instructions only; no reference,
corpus, harness, or CI change.

- **Every dispatched agent pins `model: "opus"` (Opus 5) again**, the nine
  specialists and the dispatched `ui-team-lead` alike, at `xhigh` and with
  thinking always on. The `FABLE-ESCALATION: ui-ux-frontend` attestation line,
  the `model: "fable"` pins, and the "opus only where a harness rejects the
  alias" fallback are gone from every skill, agent, doc, and manifest
  description. Never omit `model`: an omitted model inherits the session model
  and a policy-gated harness denies the dispatch.
- **What 0.5.0 changed and this release keeps.** The session model stays
  orchestrator-only: it constructs prompts, gates output, and applies approved
  fixes, and never runs a specialist's or the team lead's process in its own
  context, the no-Agent-tool case aside. Agent frontmatter still carries no
  `model:` pin, and the pin remains a runtime instruction carried by the skills
  so the tier can move without touching the agent files.

## 0.5.0 — 2026-09-01

A full-plugin review against one standard: nothing the plugin ships may make
the model reason or answer worse than it would without it. Ten reviewers, one
per knowledge domain plus one for the agents and one for the skills and docs,
read every file end to end with the same five lenses (reasoning harm,
contradictions, wrong routing, capability zeroing, stale technical claims). The
conductor gated roughly 230 evidence-backed findings and applied them, checked
every stale technical claim against current documentation before changing it,
and found that the two files every other file cites as canonical were the ones
still carrying the retired rules. This release adds no new capability.

- **Dispatch moves to the Fable 5.1 lane.** Every dispatched agent, the nine
  specialists and the inlined `ui-team-lead` alike, is now pinned `model: "fable"`
  with the attestation line `FABLE-ESCALATION: ui-ux-frontend -- <reason>` first
  in its prompt (standing owner directive 2026-09-01 for UI/UX, frontend and
  design work); `model: "opus"` remains only as the fallback where a harness
  rejects the alias. The inline execution modes are retired: the invoking session
  orchestrates and never runs a specialist's or the team lead's process in its
  own context, except when no Agent tool exists at all, and then the report
  header says so. Agent frontmatter still carries no model pin.
- **Canonical review files caught up with their consumers.**
  `review/02-evidence-pipeline.md`, cited everywhere as the geometry evidence
  rule, still prescribed the "Possible issue" confidence class that the skills,
  the verifier and the CI schema reject; it now states the modifier-plus-MEDIUM-cap
  rule, and the two agents that had copied the old wording (responsive, perf) plus
  `performance/07` were corrected with it. `review/04-verdicts-and-verification.md`
  now holds the blocker-flag definitions, the flag-to-dimension cap mapping (a set
  flag caps its dimension at the 3rd token, never the 1st or 2nd, so a blocker is
  RED at the gate, not YELLOW), the core-task and 320px never-below-HIGH row, and
  the mechanical verdict-derivation table that only the verifier used to carry,
  including its static-mode row: a dimension with no findings in code-only or
  screenshot-only evidence takes the 2nd token, never the 1st. Density thresholds
  are stated once (under 60% HIGH, 60-75% MEDIUM, page over 2x viewport MEDIUM)
  and `scripts/measure_density.js` grades the MEDIUM band it previously skipped
  and reports slack hoarders as candidates rather than HIGH findings.
- **Corpus and catalogue.** The three compound labels (`fixed-desktop-shell`,
  `vh-bottom-bar`, `token-drift`) were split so ground truth enumerates what the
  fixture notes already described, which is what the 2026-07-27 baseline's
  precision reading was waiting on. Six fixtures were added for tells the corpus
  could not see: the current OKLCH shadcn init (`--radius: 0.625rem`, which the
  HSL fingerprint never matched), a reduced-motion opt-in control, a slow page
  transition (M3, now one threshold, 400ms, in the catalogue, the auditor and
  `design/04`), emoji as interface chrome (new V12), an `anti-slop-allow` control,
  and an icon-only button with no accessible name (new U13). The auditor's
  concentration rule is scoped to style rows so single-instance hard defects
  fire, it names one finding per span, honours the escape hatch, emits the
  canonical finding block with the literal catalogue code on a `Tell:` line and
  a `tellRef` machine field (the visual reviewer carries `tellRef` too, so the
  harness README's "tellRef gap" is closed), and its summary block carries the
  DISTINCTIVE / ADEQUATE / GENERIC / AI-DEFAULT verdict token with NOT ASSESSED
  values on its pattern lines. Strongest-10 aliasing no longer gives five
  constructs two severities; the catalogue's own colour prescriptions no longer
  land inside the hue window it bans. A fresh blind baseline over all 21
  fixtures (`tests/corpus/baseline-2026-09-01.json`: recall 0.828, precision
  0.960, all five clean controls at zero, exit 0) supersedes the 2026-07-27 file,
  which stays as history; four of its five misses are same-span folding and the
  harness README records each one.
- **Specialist templates match the machine contract.** All templates now use
  the rubric's field names and carry `id`, `dimension`, `file`, `line`; the perf
  and TypeScript engineers emit their verdict families (RESPONSIVE/... and
  SOUND/...) instead of prose; the accessibility reviewer's flag is
  `accessibility_blocker`, its findings are filed under `Accessibility
  fundamentals`, and specialists propose flags that the verifier confirms. Tool
  lists gained the browser actions the bodies already required (resize, click,
  type, key press, back) and lost the vestigial Obsidian grant. The team lead's
  plan gained the motion and responsive pass that `improve-ui` offers and a
  "not measured" form for the CWV line, and learning candidates go into the
  merged report rather than a memory write.
- **Stale technical claims corrected, each against current docs.**
  - Browser and measurement APIs: Playwright's removed
    `page.accessibility.snapshot()` (now `ariaSnapshot` / `ariaSnapshotJSON`
    with `boxes`); web-vitals LCP attribution `target`; CLS lifetime semantics.
  - Frameworks: `useOptimistic` inside a transition; SWR `keepPreviousData` off
    by default; Next.js 16's top-level `reactCompiler`; Tailwind v4 hoisting a
    nested `@theme` rather than ignoring it; next-themes setting `color-scheme`;
    `tw-animate-css`; the `apca-w3` export name.
  - CSS platform support: scroll-driven animations not Baseline; the
    content-visibility and View Transitions Baseline dates; anchor positioning
    shipped in Safari and Firefox; `text-wrap: pretty` and `hanging-punctuation`
    support.
  - Fonts: Source Serif 4's Adobe build carrying `opsz`; font-metric overrides
    on the fallback face.
  - TypeScript: the TypeScript 7 gate resolved by version (Microsoft's
    `@typescript/typescript6` layout ships `tsc6`) with the exit code read from
    a log, and seven doctrine snippets that failed the plugin's own tsconfig
    under TypeScript 7.0.2 and now compile.
  - WCAG 2.2, re-read from the normative text: 2.5.8 spacing is a two-case rule;
    2.2.1 has no 20-second threshold; 2.4.1 is satisfied by landmarks and
    headings; the 3.3.8 personal-content exception is non-text only;
    `aria-grabbed` is deprecated and a keyboard path alone does not satisfy
    2.5.7; ADA Title II is WCAG 2.1 AA with the 2027 and 2028 dates.
- **Taste gate and design references.** The pre-ship checklist can now say
  NOT ASSESSED on browser-only rows, its purple window matches the catalogue's,
  its severities cite catalogue section 18, and its remediations no longer
  mandate mixing icon families or sanction floating labels. Hero and section
  architectures no longer prescribe the uppercase eyebrow, pure-`vw` clamps,
  sub-floor tracking or hex palettes; the spacing ladder freezes at the same
  anchors as the type ladder; the APCA ladder in `design/01` carries the WCAG 2.x
  floor it was cited for; `light-dark()` guidance names the class-toggle
  exception; the styling-architecture token example generates the utilities it
  uses and its layer order no longer puts a reset above utilities.
- **Skills and docs.**
  - `review-ui`'s stated policy (3-5 specialists by rank) is now what README,
    USAGE, the CI guide and the gate banner describe, and the harness is
    described as recall- and precision-gated.
  - The `Submit` acceptance grep matches visible labels only; the viewport-unit
    rule follows the owner (`svh` default, `lvh` heroes, `dvh` modals); the
    ledger's carry-forward survives a non-overlapping run; the default display
    range includes 1920.
  - Trigger phrases bind to UI nouns, and bare paths handed to agents carry the
    plugin root.
  - ARCHITECTURE's reference-to-agent map is regenerated from the agent bodies,
    and the CI schema's usability description no longer names an undefined
    family (description only, no `schemaVersion` bump).

## 0.4.1 — 2026-08-24

Corrections from an adversarial cohesion review of the 0.4.0 integration
(internal consistency, cross-link validity, dedupe against the existing
library, wiring completeness, and a cross-repo pass against the sibling
plugins that took the same upstream material). No new capability; every change
below either makes a shipped claim true or removes a contradiction with a
reference that already owned the rule. The catalogue and its corpus stay
untouched again: nothing here changes what a tell matches.

- **`design/04-motion.md` — the spring palette is regenerated, not relabelled.**
  0.4.0 shipped `linear()` curves whose stops did not follow from the
  stiffness/damping triads printed beside them, with prose overshoot figures
  that matched neither (snappy claimed ~2% against stops peaking at 8.9%,
  bouncy claimed ~12% against 26.4%). All three curves are now generated from
  their stated physics by sampling the analytical step response, and the
  duration tokens are recomputed from the same settle windows (0.55s/0.7s/0.5s
  become 0.35s/0.4s/0.55s). The characterizations are now mechanically
  checkable — the largest stop in a `linear()` list is that curve's peak
  overshoot — and read ~3% / no visible overshoot / ~25%. `--spring-bouncy`
  moves off toggles and small badges onto the celebration lane only, with the
  cross-platform note that the same triad converts to SwiftUI bounce 0.60,
  above the ceiling native guidance holds production UI under. The Motion (JS)
  equivalents line is now a true equivalence.
- **`design/04-motion.md` — stagger lanes stated once, with one buffering
  threshold.** Web product UI 30-50ms, cinematic marketing ~80-120ms capped at
  4-6 staggered items so the sequence still lands inside the ~800ms entry
  budget, native iOS 40-60ms per tier with a pointer to the Apple overlay, and
  above ~150ms per item any lane reads as buffering. The 12-step parenthetical
  is requalified to cinematic increments, where it is actually true. The
  `linear`-keyword guidance now covers constant-rate motion and confirms
  (matching §2's own rows rather than contradicting them), and the three-curve
  maximum states that the token blocks are a menu a surface selects three
  from, with constant-rate `linear` outside the count.
- **`design/10-hero-and-section-architectures.md` — §4 no longer prescribes the
  scaffold the catalogue grades CRITICAL.** The fixed HERO -> features -> proof
  -> ... -> footer order is gone; §4 is now an objection sequence (the
  visitor's questions, not the page's sections), explicitly subordinate to
  `aesthetic/04-style-taxonomy.md` §3, which owns the eight landing structures,
  and to catalogue L1 / §11. `design-ui` states the precedence in the same
  terms: the taxonomy picks the structure, design/10 supplies the per-section
  architecture. Also corrected: the Tasteful Default is cream + serif +
  **sage**, not "warm-accent"; the invented `uniform-section-padding` slug
  becomes the real L7; "the #1 layout tell" becomes L4 (HIGH) compounded by V1
  (Strongest-10 #6); the Fit rule gains the peek clause, so a hero that
  terminates exactly at the fold is no longer prescribed into the
  scroll-chevron patch.
- **Viewport units, one owner.** `100dvh` heroes contradicted the reference
  that owns the rule. `design/10`, `design/11` and the `review/07` post-op gate
  now say `100svh`/`100lvh` and cite
  `responsive/01-fluid-and-intrinsic-sizing.md` §7 (0.4.0 cited
  `responsive/03`, which owns nothing here).
- **`design/11-image-to-code-replication.md`.** The placeholder-literal cue
  cites the catalogue's real greppable literals (lorem ipsum, the
  fake-testimonial name pool, `$45,231.89`) instead of "John Doe"/"99.99%",
  which the catalogue does not carry; grain is reworded as an extraction
  observation with the library's 0.05 ceiling rather than a 0.06 prescription.
- **`review/07-surgical-visual-upgrade.md`.** `#0d6efd` is labelled Bootstrap
  blue, not indigo. The zebra-table cure gains the row-rule + hover +
  `:focus-visible` wording and the dense-reference-table exception, matching
  the fleet's remediation.
- **Wiring and counts.** `ui-visual-reviewer` gains the `review/07` row it was
  specced for; `improve-ui` binds the surgical method where it applies fixes
  (Step 5) and verifies them (Step 6), not only in the finding-vocabulary
  section. README's per-domain tables — the drift 0.4.0's count sweep could not
  see, since subtotals encode the same fact the total grep misses — go to 7
  review / 11 design / 5 aesthetic with the six missing rows added, and now sum
  to the 57 stated elsewhere in the same document. `.coderabbit.yaml`'s stale
  "~41-file" becomes 57, and its mirror-hygiene rule covers home-relative
  tooling paths rather than vault paths alone.
- **Attribution.** `design/04-motion.md` gains a file-level VibeCurb line
  covering every derived addition (spring palette, three-curve maximum, stagger
  rules, the three anti-pattern rows); 0.4.0's inline line was scoped to the
  curve values only.
- **Recorded omission.** The bouncing-scroll-chevron tell still has no
  `references/catalogue/` home. Adding it requires a corpus fixture in the same
  change under this repo's lockstep rule, which this patch deliberately does
  not open; fleet coverage stands via the sibling scanner rule. Logged here
  rather than left implicit.

## 0.4.0 — 2026-08-24

Four new references and a motion-doctrine extension, adapted from
[VibeCurb](https://github.com/Yu-369/VibeCurb) (MIT, Copyright (c) 2026
Yu-369), deduplicated against the existing library and reconciled to house
doctrine wherever the two disagreed (the reconciliations are called out
below). The anti-AI-tells catalogue and its corpus lockstep are deliberately
untouched: nothing in this release changes what a tell matches.

- **`design/10-hero-and-section-architectures.md` (new).** Six named,
  committable hero architectures with typography/palette/atmosphere specs
  (fluid clamp scale, negative tracking, three-hue cap, glow + grain recipes),
  the below-the-fold persuasion sequence, per-type section architectures, and
  the visual-rhythm rules that prevent the wall-of-same page. Cross-linked to
  the catalogue rather than restating tells.
- **`design/11-image-to-code-replication.md` (new).** Seven-layer extraction
  for screenshot-to-code work: proportional grid measurement, font
  identification by discriminating letterforms, compressed-screenshot color
  sampling, independent top/bottom spacing, radius-language detection,
  atmosphere fidelity, responsive/interaction inference, plus the
  artistic-asset classification rule (never approximate art with CSS) and the
  replication diff.
- **`review/07-surgical-visual-upgrade.md` (new).** The non-destructive
  improve-ui application method: Sacred-vs-Slop classification with the
  gray-zone table, audit -> prescription -> layered surgery, the
  override-stylesheet strategy with a one-import rollback contract,
  framework variants (Tailwind config-level, CSS-in-JS, MUI theming), and
  functionality-before-visuals post-op checks.
- **`aesthetic/05-brand-direction-and-reference-generation.md` (new).** The
  two pre-design lanes: implementation-ready reference-image generation
  (one image per section, composition-anchor variety, WHAT-THIS-IS-NOT
  negative prompting) and brand-mark direction (symbol-from-meaning, the
  reduction ladder, the six hard constraints, the generated-logo bans, the
  frozen-geometry consistency rule).
- **`design/04-motion.md` (extended).** Physics-derived `linear()` spring
  palette with real curve values and Motion/GSAP equivalents; the three-curve
  maximum and motion-personality lock; stagger system rules (hierarchy order,
  6-8 item cap, entry under 800ms); the house 30-50ms increment stands, with
  VibeCurb's 80-120ms framed as the cinematic-marketing lane only; three new
  anti-pattern rows (mixed personalities, scale(0) entrances,
  keyword-easing-only files).
- **Wiring.** Architect gains the three new design/aesthetic rows;
  visual reviewer gains the section-rhythm row; motion reviewer's map names
  the new palette; `design-ui` routes landing briefs, image-spec briefs, and
  brand-direction asks to the new references; `improve-ui` binds application
  to the surgical method. ARCHITECTURE/README/CLAUDE counts corrected to 57
  (the tree was also missing the pre-existing `design/09` and `review/06`
  entries; both restored).

## 0.3.2 — 2026-07-31

Source Serif 4 added to the type policy (user directive). The corpus already
recommended the face across four files -- the editorial POV template, the
style-taxonomy pairing seeds, the catalogue's Editorial Magazine stack, and the
strong-`opsz` list -- while the authoritative approved-defaults table never
listed it, and it appeared under three different names. This resolves both.

- **`design/02-typography.md` § 2.** New approved-defaults row (body,
  long-form) and a house-doctrine paragraph naming it the long-form reading
  serif: Adobe, SIL Open Font License 1.1, variable on `wght` 200-900 and
  `opsz` 8-60, with a true variable italic rather than a synthesised oblique.
  Positioned as the serif counterpart to DM Sans and Plus Jakarta Sans, not as
  a sixth display serif -- every serif already in the table was display-only,
  so long-form had no approved answer. The paragraph also states the deliberate
  asymmetry with **Source Sans**, which stays banned as a primary face: the
  reason for that ban is that the sans is everywhere, which is not true of the
  serif, so the ban does not extend to it.
- **`design/02-typography.md` § 5.** New optical-sizing caveat. The Google
  Fonts build ships one file per style carrying both axes
  (`SourceSerif4[opsz,wght].ttf`); Adobe's own GitHub release ships a
  weight-only variable font plus five *static* optical cuts (Caption, SmText,
  Text, Subhead, Display). Self-host the second and `font-optical-sizing: auto`
  does nothing, with no error and no fallback. Check the axes in the binary you
  ship, not the family name -- optical sizing is a property of the file, not
  the typeface. This makes the pre-existing "fonts with strong `opsz`" line
  conditional, which it always was in practice.
- **`aesthetic/01-point-of-view.md`.** Body-serif row corrected from the stale
  "Source Serif Pro" -- the pre-4 name, retired when version 4 shipped -- to
  Source Serif 4.
- **`aesthetic/04-style-taxonomy.md`.** Editorial-classic pairing seed
  normalised to Source Serif 4.

No new reference files, so the count stays 53. No catalogue edit either: the
banned-as-primary list names Source Sans specifically and never the
superfamily, so no tell changed what it matches and the corpus was not
re-scored.

## 0.3.1 — 2026-07-31

Two references distilled from shipping a real 14-page marketing site end to end
(design system, retint, hero rebuild, five-layer review gate, production
deploy). Both cover ground the library had no file for, and both exist because
the failure they describe actually happened during that work.

### references/review/06-measurement-traps.md (new)

Seven ways a review harness produces a confident, self-consistent, wrong result.
Written after three of them nearly shipped as fixes:

- `getComputedStyle` returns `oklch()` unchanged, so a regex-over-computed-style
  contrast audit parses `oklch(0.963 0.009 84)` as a near-black and reports
  every node on the page at the same wrong ratio. Cost one full audit run.
  Measure through a canvas instead — this only gets more important as CSS
  Color 4/5 adoption grows.
- Changing a style after load does not re-run image `sizes`/`currentSrc`
  selection, so a real bug and a real fix read identically. This one is
  symmetric: it can convince you a no-op fix works.
- A preview server on a busy port silently answers as someone else's process.
- Config validators check syntax, not matcher behaviour.
- Element rects hide text misalignment: two flex items measured 44px tall while
  their text sat 10.1px apart. Measure the text with a `Range`.
- Reviewer-proposed thresholds must be checked against the passing corpus first
  — one proposed a `> 6.0` guard for a corpus that measures 24 to 49.
- The habit that catches all of them: a guard you have not watched fail is not
  evidence. Three guards in that project passed while what they guarded was
  broken, including one skipped in CI so it passed by absence.

Wired into ui-visual-reviewer, ui-accessibility-reviewer (mandatory before any
contrast audit) and ui-verifier (as grounds to downgrade a finding).

### references/design/09-token-drift-and-retints.md (new)

Why a palette change ships half-applied, and how to retint a surface without
spending accessibility margin. A 14-page retint updated every `:root` block and
still shipped 17 stale values — the worst hidden behind alpha, where
`oklch(L C H / 0.35)` survives a search for the bare triple.

- Where copies hide, ranked: literal+alpha, standalone fallback pages, non-CSS
  copies (image generators, `theme-color`), derived tints, ratio comments.
- Derive with `color-mix(in oklab, var(--token) N%, transparent)` rather than
  re-pinning to a new literal. Deriving also fixed a latent bug: a component
  took background and colour from a token but had its border frozen, so it kept
  the light-surface accent inside dark sections.
- Retinting: find the wall (the lowest ink ratio), then solve the inks back
  rather than spending headroom. Field result — surface moved four points of
  lightness with every ratio preserved to within 0.03.
- Guards that survive the next retint, including why pinning a colour converter
  to your own palette's output means the obvious repair validates a regression.

Wired into ui-craft-architect for every token system it emits and before any
palette change.

### Also

Reference count corrected to 53 in CLAUDE.md, ARCHITECTURE.md and README.md.

## 0.3.0 — 2026-07-27

Total-quality pass. A 12-dimension adversarial audit of this plugin produced 205
verified findings (26 P0, 89 P1, 67 P2, 23 P3); this release implements them.
The audit was commissioned because the plugin was producing and passing bad UI:
weak UX, poor flow, and layouts that did not size to the display.

### Root cause: the plugin was not self-contained

Seven of the ten agents cited an external Obsidian vault under "External depth"
for knowledge that was never shipped inside the plugin, across 84 references in
25 files. On the author's machine those notes resolved and the plugin looked
deep. Anywhere else the depth silently vanished, and no agent had any
instruction for what to do when it was missing, so degradation was never
reported. All 84 are gone. The knowledge they pointed at is now written into the
reference library, which grew from 41 files (10,784 lines) to 51 files (15,853
lines) across 12 domains. Five hardcoded memory-space UUIDs from one private
account were removed from agent bodies at the same time.

### Two new reference domains

- **`references/responsive/` (3 files, 1,258 lines).** The plugin taught
  device-width checklists and no fluid sizing at all: a search of the responsive
  reviewer's own reference for `clamp(`, container queries, intrinsic sizing,
  `minmax()` or `auto-fit` returned nothing. New files cover fluid and intrinsic
  sizing with the interpolation math, the breakpoint-versus-container-query
  decision rule, and zoom, orientation and adaptive postures.
- **`references/usability/` (4 files, 1,320 lines).** Usability and flow were
  absent as a discipline. Layer 1 of the universal rubric had ten dimensions and
  every one was judgeable from a single static render, so flow defects were
  structurally invisible. New files cover task flows and journeys, forms and
  error recovery, navigation and information architecture, and states, feedback
  and affordances. The rubric gained matching Layer 1 rows.

### Corrected doctrine that was actively wrong

These did not merely omit guidance, they instructed the wrong thing:

- **The catalogue told designers to strip responsive typography.** Strongest-10
  entry #9 flagged any responsive type scale as a presence-flaggable HIGH tell
  with no remediation. It now flags only the verbatim Tailwind default triplet
  as a genericness signal and carries a remediation pointing at the fluid scale.
  A blind reviewer confirmed the narrowing: it declined to fire #9 on a hero
  carrying `text-5xl font-bold` without the verbatim triplet.
- **The design-time contrast gate inverted APCA**, demanding less contrast for
  small text. The ladder now ascends correctly (`90+` small and regular body,
  `75+` larger or bold, `60+` headlines, `45+` non-text) and `design-ui`'s hard
  rules no longer carry a weaker blanket threshold.
- **The reduced-motion reference specified a play/pause control at most 24x24
  px**, inverting WCAG 2.5.8, which is a minimum.
- **Accessible-name precedence ranked `title` above element contents**,
  inverting the accname spec.
- **The shadcn recipe put semantic tokens in a bare `@theme` block**, which
  generates zero utilities in Tailwind v4, so every stock component rendered
  unstyled.
- The entire WCAG Understandable principle (forms, error identification and
  suggestion, labels, consistent navigation, authentication, help) was missing
  from the accessibility checklist, as were timing and media.

### Functional bugs

- **Every apply path and both ledger writes were unexecutable.** All four skills
  instruct `Edit`/`Write` but declared `allowed-tools` without them. Read-only
  by default is now a behavioural rule in the skill body, where it belongs.
- **The CI gate was unpassable and failed open.** It compared the artifact sha
  to `HEAD`, but committing the artifact changes `HEAD`, so they could never be
  equal; and any git failure or empty pattern list silently reported
  "No UI-adjacent files changed. PASS."
- **`validate_palette.js` failed open on invalid hex**, the exact NaN failure
  its own comment claimed to prevent, because the guard sat outside the exported
  functions.
- Five mutually incompatible finding formats shipped, and the merge gates
  rejected the formats the agents were told to emit. One canonical template now
  lives in `references/review/01-universal-rubric.md`. A fifth confidence class
  mandated by three files but rejected by both the rubric and the CI schema enum
  is resolved.

### Coverage and tooling

- All ten agents grew (1,509 to 2,366 lines). The responsive reviewer went from
  the thinnest agent at 118 lines to 283; motion 103 to 256; accessibility 121
  to 241. The three specialists that emitted no summary block, severity scale or
  verdict, while the gates consuming them required all three, now have them.
- `ui-craft-architect` gained a responsive contract at three enforcement points
  and a mandatory task-flow mapping step; it previously jumped from aesthetic
  point-of-view straight to components and never checked adaptive behaviour.
- The corpus grew from 10 fixtures to 15 and can now detect responsive drift;
  every label had been `anti-ai`. New fixtures cover a fixed-pixel shell, a
  `100vh` bar ignoring `dvh` and safe areas, a component sized by a viewport
  query inside a narrow rail, an uncommitted radius, and a clean fluid control
  that must produce zero findings.
- Both previously-known misses are resolved; both were labelling defects rather
  than detection ceilings.
- New `tests/harness/selftest.mjs` (23 cases) and `ci/selftest.sh` (28 cases).
- Fresh blind baseline `tests/corpus/baseline-2026-07-27.json`: recall 0.900, up
  from 0.833. Its precision reads 0.783 because several fixtures carry one label
  for defects their own notes describe severally; splitting those compound
  labels is a tracked follow-up recorded in the harness README.

### Schema changes (both independently versioned)

- CI verdict artifact **v2 to v3**: adds the `usability` dimension.
- Review ledger **v1 to v2**: adds `dimensions`, which prevents a narrow run
  from erasing a wide one in the delta report.

## 0.2.3 — 2026-07-27

Density and economy (2026-07-27) — the dimension that catches WASTE, added after
a dashboard cleared eight specialist reviews from this plugin, 121 pull-request
findings and three automated reviewers, and then failed on first sight for five
reasons none of them could report.

The owner's five questions were: why does it not use the window, why do the URLs
look amateur, why are there walls of text, why are the pages endless with nothing
collapsible, and why are the buttons where they are. Measured on the page:
1552px of content centred on a 2560px display (1008px unused, 39%); an unsized
column in a `table-layout:fixed` taking 1408px for a 25-character login; 2171px
of page for nine rows, 45% of it the third rendering of the same nine; fifteen
visible paragraphs over three lines, worst 121 words; nine identical row actions
2090px from their own rows' names.

**Root cause — every rubric row was a rule against excess, and none against
waste.** Lines over 75ch were a defect; a layout using 61% of the window was not
a row. Clipped text was a defect; text nobody will read was not. Overlapping
controls were a defect; controls 2090px apart were not. And where waste WAS
named — "excessive dead space on large displays", already in the viewport
matrix — the severity ladder could not lift it: every CRITICAL and HIGH exemplar
described something broken, so a defect that renders perfectly lands on TASTE and
does not survive triage in a 121-finding review. The rubric was one-directional.

- **NEW `references/review/05-density-and-economy.md`.** Thresholds with numbers
  for viewport utilisation, internal width distribution, page economy, copy
  length and action distance; the measurement recipes; the severity calibration
  that lets waste reach HIGH; and the generalisable check — when adding any
  threshold, write the inverse one at the same time or record why it does not
  apply.
- **NEW `scripts/measure_density.js`.** Runs on a live page and grades it. Waste
  renders perfectly, so a reviewer reading for an impression has nothing to point
  at and "this feels empty" gets dismissed as taste; a percentage and a pixel
  count cannot be. Validated by running it against the fixed page and having it
  correctly flag a remaining 1052px action gap the fix had not closed.
- **`references/review/01-universal-rubric.md`.** Tenth Layer-1 dimension,
  "Density and economy". Severity scale gains waste exemplars at HIGH and MEDIUM,
  and states outright that waste is not automatically TASTE.
- **`references/review/03-viewport-matrix.md`.** Dead space promoted from
  "quality defects" to the top of the always-flag list with a 60% threshold, and
  the note that centring is not a fix — two 504px gutters waste what one 1008px
  gutter did. Slack-hoarding mechanisms (`margin-*:auto`, unsized fixed-table
  column, bare `1fr`) named, since a wide viewport is the only place they show.
- **`references/design/08-ux-writing.md`.** New section 4b: a 30-word bar for
  visible paragraphs in control surfaces, lead-plus-disclosure as the fix, and
  two carve-outs (destructive-action warnings stay whole; accuracy outranks the
  count). The file governed how copy reads and said nothing about how much of it
  there is.
- **`agents/ui-visual-reviewer.md`, `agents/ui-responsive-reviewer.md`.** Both
  walk the new dimension, measure rather than eyeball, and are told never to
  recommend `margin-inline:auto` for dead space — that recommendation is what
  closed this finding the last time it was raised.

TypeScript 7 GA correction (2026-07-27). TypeScript 7.0 shipped the Go-native compiler as `typescript@7`
itself on 2026-07-08, with `tsc` as its only binary; the `@typescript/native-preview` preview channel and
its `tsgo` binary were abandoned after `7.0.0-dev.20260707.2` (2026-07-07). Every instruction in this
plugin that told an agent to run `tsgo`, or to install `@typescript/native-preview`, now names the GA gate
instead. The 0.2.0 entry below is left as written — "tsgo gate intact" was true of that port — and is
superseded by this entry.

- **`references/typescript/01-ts6-essentials.md`.** `## tsgo — the typecheck gate` rewritten as
  `## The TypeScript 7 typecheck gate`: the dual-compiler rationale is now "TS 7.0 ships no programmatic
  compiler API (7.1 is expected to), so `typescript` 6.x stays as the API provider" rather than "tsgo is a
  separate binary". Documents the `"ts7": "npm:typescript@~7.0.2"` + `typescript: "^6.0.3"` contract,
  by-path invocation (both packages declare a `tsc` bin and npm's link order on the collision is not
  guaranteed), and the two TS7 hazards — it emits even while reporting a fatal config error, and its
  declaration output differs from TS6's. Command tables and the CI script snippet all invoke by path.
- **`agents/ui-typescript-engineer.md`.** Description and tooling step no longer run `tsgo`; the gate is
  `node node_modules/ts7/bin/tsc --noEmit`, the fallback is the TS6 binary by path, and finding `tsgo` or
  `@typescript/native-preview` in a reviewed project is now itself a HIGH finding.
- **`agents/ui-team-lead.md`, `skills/{review,improve,optimize}-ui/SKILL.md`.** Dispatch rows and
  verification steps name the TS7 gate and invoke it by path.
- **`README.md`, `ARCHITECTURE.md`, `USAGE.md`, plugin/marketplace descriptions.** Capability text and the
  worked example name the gate by role, not by the dead binary.

## 0.2.2 — 2026-07-17

House font doctrine (maintainer directive 2026-07-17, second pass): SF Pro / the platform system stack is the fleet's main go-to voice for UI and information-dense text; Poppins is the approved display face for modern-elegant areas. On web, "SF Pro" means the `-apple-system` system stack (SF Pro files are Apple-licensed and never self-hosted).

- **`design/02-typography.md`.** House-doctrine block atop the banned/approved section; SF Pro/system stack and Poppins rows added to the acceptable-defaults table; "generic typeface" tell reframed as default-vs-deliberate.
- **`catalogue/01-ai-tells.md`.** Poppins removed from the banned-as-primary list (rescinded by directive); house-doctrine note added after the font-stack tables.
- **`aesthetic/01-point-of-view.md` / `03-taste-checklist.md` / `04-style-taxonomy.md`.** House-default line added to the template discipline note, checklist item 2.1 rewritten around deliberate-choice + house default, and a house-default row leads the pairing seeds.
- **`design/06-shadcn-customization.md`.** The @theme example now ships the house tokens (system-stack sans, Poppins display, mono scoped to code).

## 0.2.1 — 2026-07-17

De-terminal doctrine pass (maintainer directive 2026-07-17): monospace faces are for genuine code/log/identifier content only, never for human-readable UI text; digit alignment via tabular figures on the sans; hierarchy via weight + color on modern system faces (SF Pro / system stacks) or the brand sans. Rewrites the 13 passages that recommended mono-as-house-style. No catalogue matching-behavior changes beyond the added tell (corpus re-score not triggered; the new tell adds detection surface, removes none).

- **`catalogue/01-ai-tells.md`.** New tell T13 (monospace on human-readable UI text — "terminal cosplay") with a detection cue; T3's remediation now prescribes sans-led pairings instead of fresh mono pairings; the Tactical Operator font stack drops mono display for weight + tracking + density; a standing mono-discipline note scopes the Mono column to code/log panes; Brutalist-Warm's "mono accent" rationale rescoped.
- **`aesthetic/01-point-of-view.md`.** Template-wide typeface-discipline rule added; Template A (Tactical Operator) display font is now a sans with weight/tracking as the brand statement; Template C's mono token scoped to code/IDs only.
- **`aesthetic/03-taste-checklist.md`.** New CRITICAL item 2.9 (no mono on human-readable text); Berkeley Mono removed from acceptable primary fonts.
- **`aesthetic/04-style-taxonomy.md`.** Dark-native family and dev-tools domain rows no longer prescribe "monospace accents"; the developer/technical pairing seed is sans-led with mono reserved for code blocks.
- **`design/02-typography.md`.** Berkeley Mono and Söhne Mono scoped to code only (Söhne Schmal split out as the condensed display variant); the pairing rule scopes the optional mono to code/log content.
- **`design/06-shadcn-customization.md`.** The .eyebrow recipe is now sans + weight 600; the card worked example's metric drops font-mono (keeps tabular-nums); the tactical/data-app pairing rule is sans-led; the anti-pattern checklist's Newsreader+JetBrains fix prescribes sans-led pairings; the "monospace throughout" approved-direction note is rescinded with the directive recorded.

## 0.2.0 — 2026-07-16

Supersession pass: ui-craft natively absorbs the remaining external UI skills so they can be disabled without losing capability. Provenance per component below. No changes to the ai-tells catalogue's matching behavior or the anti-slop auditor (corpus re-score not triggered).

- **New domain: `references/dataviz/` (4 files) + `scripts/validate_palette.js`.** Ported and adapted from the Claude Code bundled `dataviz` skill: form selection with the is-it-even-a-chart gate and job-to-type mapping (`01-choosing-a-form.md`); the five color jobs, six palette checks, snap-to-passing, themes, and the validated reference palette instance (`02-color-jobs-and-validation.md`); mark specs, surface gap/ring spacers, selective labeling, stat-tile/meter/hero figure contracts, texture, tooltip/hover, and filter composition (`03-marks-interaction-figures.md`); the chart failure catalog (`04-anti-patterns.md`). The runnable six-checks validator (lightness band, chroma floor, Machado-2009 CVD separation, normal-vision floor, surface contrast; node CLI + browser module) ships at `scripts/validate_palette.js`, smoke-tested against the documented reference numbers. The form-selection file extends beyond the source with the specialized-form table (funnel/sankey, waterfall, treemap, box plot, candlestick, bullet, waffle, choropleth, network, confidence bands, the radar caveat) and a web charting library selection table, folding in the useful remainder of ui-ux-pro-max's charts data.
- **New reference: `references/aesthetic/04-style-taxonomy.md`.** Native distillation of the retired `ui-ux-pro-max` plugin's database (85 style archetypes, 161 domain-reasoning rules, 74 font pairings, 35 landing structures, icon/motion/AI-surface guidance) into seed vocabulary subordinate to the POV method: 10 style families with hazard columns, 13 domain-convention clusters (including the trust-domain purple/pink-gradient ban), 8 landing structures, mood-keyed pairing seeds, icon discipline, a motion intensity ladder, and AI-product surface patterns. `design-ui` Step 2.5 now seeds from this file; the external capability-detected integration added in 0.1.2 is removed along with its dependency. Deliberate exclusions: the non-fleet stack CSVs (JavaFX/WPF/UWP/Avalonia/Uno/etc.), GSAP-specific snippets (ui-craft's motion doctrine is springs + View Transitions + scroll-driven CSS), and the raw Google-Fonts index (superseded by 02-typography's curated tables).
- **New reference: `references/design/08-ux-writing.md`.** UX-writing doctrine expanded from Anthropic's `frontend-design` skill: words as design material, user-side naming, active voice, one-name-per-action flows, errors/emptiness as direction, copy-carries-POV, content formatting (dates, numbers, truncation, placeholders), and a copy review checklist wired to the rubric's content-quality dimension.
- **Aesthetic (`01-point-of-view.md`, `03-taste-checklist.md`).** POV finding gains the AI-default-looks calibration (cream+serif+terracotta, near-black+acid accent, broadsheet hairline) with the brief-always-wins rule and the plan-stage generic-default self-test; the committing table gains hero-as-thesis, structure-is-information, and the boldness budget. The taste checklist gains smell test 9.9 (the mirror pass: remove one accessory; quality floor holds unannounced).
- **Typography (`02-typography.md`).** DM Sans and Plus Jakarta Sans join the acceptable defaults; the pairing rule now states that one well-chosen sans-serif is often enough, cross-referenced to the taxonomy's pairing seeds.
- **Review rubric (`references/review/01-universal-rubric.md`).** New conditional dimension: data visualization (form-matches-job, one axis, color-by-job in fixed slot order, validated palette, legend + table-view twin, tooltips-enhance-never-gate), with dual axes, rainbow/cycled hues, recolor-on-filter, and tooltip-gated values as defect signals.
- **Wiring.** Architect and visual reviewer reference tables, design-ui Step 2.5 + prompt template + task list, ARCHITECTURE tree and agent-reference matrix, README knowledge-base tables, CLAUDE.md provenance and layout.

## 0.1.3 — 2026-07-16

UI/UX fundamentals knowledge pass, distilled from a frame-by-frame analysis of Kole Jain's "Every UI/UX Concept Explained in Under 10 Minutes" (canonical analysis: vault `UI Design/13`). New prescriptive craft rules across the design references and the review rubric; no changes to agent scope, skill dispatch, or the ai-tells catalogue's matching behavior (corpus re-score not triggered).

- **New reference: `references/design/07-depth-and-overlays.md`.** Shadow tuning (opacity down / blur up, strength scaled to layer distance, the "if you notice the shadow it's wrong" litmus), tactile inner+outer button shadows, text-over-image overlay ladder (gradient scrim as the default, masked progressive blur as the premium), icon-box-equals-line-height sizing, ghost buttons, and the 2:1 horizontal:vertical button padding ratio. Indexed in the architect's and visual reviewer's reference tables, README, and ARCHITECTURE.
- **Typography (`02-typography.md`).** Size-count caps by surface (≤6 sizes on marketing pages, dashboards capped ~24px with example ladders) and the display-tightening rule (letter-spacing -2%..-3%, line-height 110-120% on 32px+ text), plus two matching anti-pattern rows.
- **Spacing (`03-spacing-rhythm.md`).** New "Column grids are guidelines; white space is the law" section: internal alignment vs page-grid independence, the 12/8/4 responsive column contract for repeating content, flat 32px section rhythm, and proximity-grouping-as-hierarchy with gap ratios; 4pt base unit now states its halving rationale.
- **Color (`01-color-oklch.md`).** One-primary-color entry path (lighten for backgrounds, darken for text = half a ramp), semantic hue meanings (blue trust / red danger / yellow warning / green success) under "color for purpose, not decoration", and a dark-mode surface craft table (border dimming, elevation as lightness delta, chip desaturation with text flip, non-slate dark hues).
- **Motion (`04-motion.md`).** Outcome-confirmation micro-interaction pattern ("Copied!" chip) — press states confirm the input; a second layer must confirm the outcome.
- **Review rubric (`references/review/01-universal-rubric.md`).** Affordance dimension now carries the signifier vocabulary (containers group/select, gray = inactive, UI teaches itself without instructions) and every-action-gets-a-response; state completeness gains per-control minimums (button default/hover/active/disabled + async loading; input focus/error/warning); text-on-raw-photo added to the objective flag list.

## 0.1.2 — 2026-07-07

Toolkit pass: the plugin now validates and gates itself instead of shipping catalogue and agent changes on faith. Five additions, no changes to the ten agents' scope or the four skills' core dispatch behavior.

- **Regression corpus + scoring harness.** `tests/corpus/` ships 10 labeled fixtures (5 drawn from anti-slop's MIT-licensed test corpus, 5 new) with ground-truth findings; `tests/harness/score-review.mjs` runs the anti-slop auditor's rubric against them and computes recall, gating any catalogue or auditor change at recall >= 0.8 before it ships.
- **CI gate.** `ci/` ships the CI artifact schema, `ui-craft-gate.sh` (reads a produced artifact, exits non-zero on RED), and an adoption guide for wiring the gate into a pipeline; `review-ui` and `improve-ui` can produce the artifact as a post-step.
- **Review ledger.** `.claude/ui-craft/last-review.json` in the reviewed repo persists the prior run's findings; the next `review-ui`/`improve-ui` run on the same scope opens with a delta report (NEW / RESOLVED / STILL OPEN / REGRESSED) instead of a cold re-listing.
- **ui-ux-pro-max integration.** `design-ui` capability-detects `ui-ux-pro-max` via the session's skill list (never a hardcoded cache path) and, when present, folds up to 3 seed candidates (style archetype, palette, font pairing) into the architect's dispatch prompt as advisory material: the internal anti-AI-tells catalogue always wins on conflict.
- **Canonical finding-object shape.** Harness output, ledger entries, and CI artifact finding arrays now share one finding shape (`id`/`dimension`/`severity`/`confidence`/`file`/`line`/`title`/`evidence`); CI artifacts additionally carry a top-level `GREEN`/`YELLOW`/`RED` verdict token, independent of the seven per-dimension verdict families used in reports.

## 0.1.1 — 2026-07-07

Quality pass following an adversarial 7-dimension review of the 0.1.0 release (wiring/correctness, content fidelity vs sources, docs truthfulness, agent/skill quality, operational pitfalls, value/excellence, and a dogfood test against anti-slop's labeled test corpus). No new skills or agents; this release tightens and corrects what 0.1.0 shipped.

- **Verdict-vocabulary unification.** `references/review/04-verdicts-and-verification.md` gains the two verdict families it was missing (Anti-AI aesthetic: DISTINCTIVE/ADEQUATE/GENERIC/AI-DEFAULT; TypeScript safety: SOUND/ADEQUATE/LEAKY/UNSOUND), making it the complete canonical source for all seven per-specialist verdict families. Every stray `UNSAFE` reference is corrected to `UNSOUND`, and every stray `NIT` severity tag is corrected to `TASTE` across agents, skills, and docs — one severity scale, one verdict-family set, everywhere.
- **"8 specialists" swept to the canonical 7.** `ui-team-lead` dispatches up to 7 specialists (visual, anti-slop, accessibility, motion, responsive, perf, typescript), then the verifier — always last, never in parallel. This phrasing is now consistent across `agents/ui-team-lead.md`, all four skills, `README.md`, `ARCHITECTURE.md`, and this file.
- **Catalogue additions.** `references/catalogue/01-ai-tells.md` gains tells the initial merge missed: neon-glow/oversaturated-accent treatments, generic-illustration-pack tells, and a presence/concentration rule for weighting repeated tells within a single surface rather than treating each instance as an independent finding.
- **`ui-anti-slop-auditor` plain-HTML branch.** The auditor now handles compiled or plain-HTML/CSS targets with no `globals.css`/`tailwind.config`/JSX to inspect — it falls back to reading inline `style=` attributes, `<style>` blocks, `:root` custom properties, and inline `<svg>` markup, and reports token/icon provenance as lower-confidence when the source tree offers no build-time token system.
- **RUNTIME DISPATCH NOTE substitution fix.** The note previously said to inline `ui-team-lead`'s body without specifying that every `${CLAUDE_PLUGIN_ROOT}` occurrence inside that body must be substituted with the resolved absolute plugin root before dispatch — a `general-purpose` subagent has no shell to expand the variable itself. The full rationale (canonical, single source of truth) now lives only at the top of `agents/ui-team-lead.md`; every other mention (`improve-ui/SKILL.md`, `README.md`, `ARCHITECTURE.md`) is a one-line pointer back to it.
- **Docs corrections.** Fixed the skill-to-agent table (`design-ui` and `optimize-ui` are single-agent dispatches, not sequential with a phantom TypeScript-engineer follow-up), regenerated the reference-to-agent mapping table from each agent's own Knowledge Sources section (`ui-craft-architect` was missing its `architecture/01` and `architecture/03` reads; several review agents were missing their own `review/02` evidence-pipeline and platform-overlay reads), corrected the tools claim in `README.md` (no agent in this plugin carries `Edit`/`Write`; only `ui-team-lead` carries `Agent`; the invoking session applies any change, and only after explicit user approval), fixed the provenance tell-counts (typescript-ui and ui-review both described as carrying a 108-tell base catalogue; ui-review's own catalogue was actually 153 patterns, ~118 of which restated the typescript-ui base and 45 of which were genuinely new), and clarified the mize-plugins install snippet (the entry goes inside the `enabledPlugins` object of `~/.claude/settings.json`, not standalone).
- **`USAGE.md` added.** A new worked-walkthrough guide — for each of the four skills, typed input, what happens step by step, and a full sample output block — complementing `README.md`'s reference tables and `ARCHITECTURE.md`'s component map.

## 0.1.0 — 2026-07-07

Initial release. Consolidates `typescript-ui` (0.3.0), `ui-review` (1.0.1), and the UI-only subset of `anti-slop`'s research (1.6.0) into a single plugin, following a same-day feasibility audit of the non-Apple UI plugin fleet. `typescript-ui` and `ui-review` are deprecated in favor of this plugin and uninstalled locally once ui-craft is verified; `anti-slop` is untouched — only its UI-relevant research was distilled out, its prose/code-quality rules remain there.

### Provenance by component

- **Skills (4):** `design-ui` merges `typescript-ui/typescript-design-ui` (primary source) with platform-awareness for non-TS stacks. `review-ui` merges `ui-review/review-ui` (primary structure: scope+platform detection, adaptive 2-3 specialist dispatch, inline verifier rules) with `typescript-ui/typescript-review-ui`'s TS engineer dispatch option. `improve-ui` merges `typescript-ui/typescript-improve-ui` with `ui-review/review-ui-full` into one full multi-specialist + verifier pass with a prioritized fix plan. `optimize-ui` ports `typescript-ui/typescript-optimize-ui` unchanged in structure, retargeted at the merged `ui-perf-engineer`.
- **Agents (10, from 6 + 7 = 13 source agents):** `ui-craft-architect` ports `typescript-ui/ui-design-architect`. `ui-visual-reviewer` merges `typescript-ui/ui-design-reviewer` + `ui-review/ui-visual-reviewer` (visual + UX + POV + affordance + state-completeness in one specialist). `ui-anti-slop-auditor` ports `typescript-ui/ui-anti-slop-auditor`, retargeted at the internal canonical catalogue. `ui-accessibility-reviewer`, `ui-motion-reviewer`, and `ui-responsive-reviewer` port from `ui-review` unchanged in scope. `ui-perf-engineer` merges `typescript-ui/ui-perf-engineer` + `ui-review/ui-runtime-reviewer` (Core Web Vitals + bundle + rendering + hydration, web primary, with SwiftUI/Compose rendering notes folded in). `ui-typescript-engineer` ports from `typescript-ui` unchanged (tsgo gate intact). `ui-verifier` ports from `ui-review` unchanged. `ui-team-lead` merges both prior team leads (`typescript-ui/ui-team-lead` + `ui-review/ui-review-lead`) into one adaptive orchestrator dispatching up to 7 specialists (visual, anti-slop, accessibility, motion, responsive, perf, typescript), then the verifier — always last, never in parallel — preserving the RUNTIME DISPATCH NOTE workaround for the `Agent`-tool-stripping issue on plugin-namespaced dispatch (internal provenance note).
- **Catalogue unification:** the two prior AI-tell catalogues — `typescript-ui`'s 88 base tells across 8 categories plus 20 Deep Cuts and a Strongest-10 list, and `ui-review`'s 153-pattern catalogue (of which ~118 restated the `typescript-ui` base; its 45 genuinely new platform/user-flagged tells were merged) — are unified into `references/catalogue/01-ai-tells.md`, deduped by tell identity with every entry retaining its severity and remediation. `anti-slop`'s UI-relevant research (AI Component Fingerprints, Strongest-10 Fingerprints, logo-swap test, missing-states and dark-mode-bias patterns from `design-patterns.md`; CSS-architecture tells and demo-ware/happy-path patterns from `frontend-patterns.md`) is folded into the same file rather than kept as a separate cross-referenced catalogue. `anti-slop`'s empirical corpus data (`empirical-rankings.md` — the 3.2M-post study's cited-vs-cleared clearance rates, including the bento-grid 0.1%-clearance finding and mesh-gradient artifact data) becomes `references/catalogue/02-empirical-evidence.md`, with a sync contract tying it to anti-slop's quarterly rankings-refresh runbook.
- **Perf + runtime merge:** `typescript-ui/references/performance/*` (Core Web Vitals, React 19 perf, CSS perf, bundle/loading, measurement) ports verbatim into `references/performance/`, with `ui-review`'s web-overlay perf-degrading-design-choices table folded into `01-core-web-vitals.md` where it added non-duplicate content.
- **Visual + design merge:** `references/design/04-motion.md` merges `typescript-ui`'s spring-physics and View Transitions content with `ui-review`'s motion-heuristics reference (spring params table, anti-pattern severity table, compositor-safe property list), deduped. `references/accessibility/01-wcag-2-2.md` folds `ui-review`'s severity-if-failed column and its Apple-HIG/Material/WCAG touch-target comparison table into `typescript-ui`'s WCAG 2.2 reference.
- **Review infrastructure ported unchanged:** `references/review/01-universal-rubric.md`, `02-evidence-pipeline.md` (including the canonical geometry evidence rule), and `03-viewport-matrix.md` port directly from `ui-review`. `references/review/04-verdicts-and-verification.md` is a new extraction of the per-dimension verdict vocabularies and the verifier's evidence-sufficiency/dedup/severity rules, previously scattered across `ui-review`'s agent files and `ARCHITECTURE.md`.
- **Platform overlays ported unchanged:** `references/platform/01-web-overlay.md`, `02-apple-overlay.md`, `03-android-overlay.md` port directly from `ui-review`'s web/Apple/Material-Android overlays.
- **TypeScript + architecture ported unchanged:** `references/typescript/01-04` and `references/architecture/01-03` port verbatim from `typescript-ui`.
- **Aesthetic references ported and renumbered:** `references/aesthetic/01-point-of-view.md`, `02-distinctive-systems.md`, `03-taste-checklist.md` port from `typescript-ui`'s `02-04` (renumbered to close the gap left by folding the former `01-anti-ai-tells.md` into the catalogue instead); the taste checklist's former cross-plugin path to anti-slop is dropped since that content is internal now.
- **Dropped cross-plugin path coupling.** Every reference and agent that previously hardcoded a sibling plugin's own directory or cache path now resolves internally via plugin-root-relative paths (`references/catalogue/01-ai-tells.md#section`). This was the single largest source of silent breakage in the prior three-plugin arrangement — a cache version bump on one plugin could orphan a citation in another.
- **Model policy carried forward unchanged.** No `model:` field in any agent frontmatter; all ten agents inherit the session model. Thinking always on, per fleet doctrine.
