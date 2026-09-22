---
topic: design
role: reference
scope: copy-placement-and-volume
audience: ui-designer, ui-reviewer
---

# Copy Placement and Volume: Where Words Go, and How Many

`design/08-ux-writing.md` governs how copy reads and, in its section 4b, how long a
paragraph may run in a control surface. Neither it nor any other file governed
WHERE a paragraph may sit, and section 4b exempted marketing, documentation and
onboarding from any length bar at all. That gap has a shipping history: a
four-paragraph, 300-word introduction above the product on a reference page; prose
dropped between a card grid and a table with no heading over it; paragraphs that
jumped position when a third-party slot beside them failed to render; pages the
owner described as huge random blocks of text everywhere, unformatted and hard to
navigate. Every sentence in them was clear, correctly toned and accurate, and every
copy review passed them, because the rules only asked how the words read.

This file is the placement doctrine. It applies to every surface type, including
the ones section 4b exempts, and it is a design input as much as a review rule: the
architect decides where every paragraph lives before writing one.

## 1. Every paragraph has a home

A paragraph is placed, never dropped. Its home has three parts:

| Part | Rule |
|---|---|
| A headed section | The paragraph's nearest `section`, `article` or `aside` ancestor carries a heading (or an `aria-labelledby`) that names what the prose is about. A `p` whose nearest sectioning ancestor has no heading is an **orphan paragraph** |
| A container of its own kind | Prose sits with prose. A paragraph whose siblings are a card grid, a table, a form, a toolbar or a chart is text dropped between components; it moves into a headed prose block above or below the component group, or into the component it describes (a caption, a helper, an empty state) |
| A measure | Prose renders inside `45ch` to `75ch` (`max-inline-size` on the prose block, never on the page shell, so tables and grids beside it can still use the width: `review/05-density-and-economy.md` § Viewport utilisation) |

Text that is part of a component is not a paragraph in this sense: a field label,
helper text, a placeholder, an empty-state message, a table caption, a card's
one-line description, a toast, a tooltip. Those are governed by `design/08` and by
the component's own state rules. This file is about running prose.

## 2. The product comes first

On first paint, above the primary content (the tool, the data, the entity, the
product, the hero visual), the page carries at most:

- the page's identity block: H1, and where the domain has it the entity's icon,
  key facts and status;
- one lede of at most **25 words** on a product or marketing surface, **40 words**
  on a content or reference page;
- the primary action or the in-page navigation.

Nothing else. Explanatory prose, background, methodology, SEO copy, "how to use
this page" and "about this data" all go **below** the primary content in a headed
section, behind a `details` disclosure whose summary names what is inside, or on
their own route. A reference page is a tool with a guide underneath it, never a
guide with a tool at the bottom. A product-first landing page that pins "no hero
text above the preview" as an invariant is the model.

Two rules follow:

- **Never in the hero, with one exception: the statement that is the hero.** A hero
  carries a headline, a subtext of at most about 20 words
  (`design/10-hero-and-section-architectures.md` § 3), one action and its focal
  visual; a paragraph added to that set is the blob at the top of the page. Where
  the prose IS the surface's primary content and nothing below it is being pushed
  down (a studio manifesto, an essay or press opening, a type-led portfolio), one
  paragraph may take the headline's slot: set at display or intermediate scale so it
  reads as the focal element (`aesthetic/06-substance-floor.md` S5, the typographic
  poster hero), inside the measure, and the only prose above the fold. A second hero
  paragraph, or a page that ships a tool, a table, a product or an entity below that
  statement, is the blob under another name. Section 6's copy map records the
  exception and its reason; without that row the tell fires.
- **Never between data panels.** Prose does not sit between two components of
  different kinds (a grid and a table, a chart and a form). If two panels need an
  explanation between them, the explanation is a heading, a caption on the panel,
  or a helper line inside the panel that needs it.

## 3. Budgets by surface type

`design/08` § 4b keeps its 30-word paragraph bar for control surfaces. The other
surfaces are no longer exempt; each has its own bar, chosen so the page stays
scannable at the measure it renders in.

| Surface | Lede above the primary content | Any visible paragraph | Per section | First viewport |
|---|---|---|---|---|
| Control surface (dashboard, settings, form, admin) | One line or none | 30 words (existing rule) | One paragraph, or a helper per control | Prose under 10% of the viewport height |
| Content or reference page (entity page, database page, guide index) | 40 words | 60 words | Two paragraphs, then a heading, list, table or figure | Prose under 25% of the first viewport; the primary content starts inside it |
| Marketing page | 25 words (the hero subtext) | 50 words | Two paragraphs; sections answer one question each (`design/10` § 7) | The focal visual is inside the first viewport |
| Article, documentation, long-form guide | Not applicable | No bar; the template is for reading | A heading every 250 to 350 words; lists and tables for enumerations | Its own route or template, measure 60 to 75ch |

Rules that hold across the table:

- **Lead and detail, not deletion.** Over the bar, the load-bearing fact stays
  visible and the qualifications move behind a disclosure whose summary names what
  is inside ("How the 24 hours are counted"), never "More". Destructive-action
  warnings stay whole (`design/08` § 4b carve-outs).
- **Accuracy outranks the count.** If the short version is not true, keep the long
  one and record the exemption.
- **Count on the rendered page, disclosure bodies excluded.** The impression test is
  what passed a page carrying a 121-word hint.
- **A word-count floor is banned.** A test, a lint or a doctrine line that requires
  a minimum number of words, headings or paragraphs on a surface is a padding
  generator: every attempt to cut copy turns the gate red, and four fix lanes in
  one wave rediscovered the same floors independently (`expect(words).toBeGreaterThan(300)`,
  a five-H2 minimum, a description-length floor). The guard is a ceiling, never a
  floor; where search needs long-form copy, that copy lives in its own section
  below the fold or on its own route, and the floor tests it there.

## 4. Text-only runs and the scan

A reader scans before reading. A page holds attention when the eye lands on
something other than a paragraph every screen or so.

- **Text-only runs break the scan.** Three or more consecutive text-only sections
  is a finding (the catalogue's L14 tell). Below that, the default on control,
  content and marketing surfaces is a non-text device every second section: a
  figure, a table, an image, a control, a chart, a list of entities with icons.
  On article, documentation and long-form templates consecutive prose sections
  are the form, and the scan is carried by headings, lists and tables instead. A
  device earns its place by carrying meaning; imagery dropped in only to break a
  run is I4 or I7 filler, and the run is better fixed by cutting or restructuring
  the prose.
- **A text-only first viewport fails** on any surface that is not an article
  template (substance check S5, `aesthetic/06-substance-floor.md`).
- **Chunk for the scan.** Headings every two or three paragraphs on content pages;
  enumerations as lists or tables, never as sentences with commas; the first
  sentence of a paragraph carries its point.
- **Cards hold lines, not paragraphs.** A card's description is at most two lines
  at the card's measure; anything longer belongs on the detail page the card leads
  to.

## 5. Layout never depends on a slot rendering

Third-party content (an advertisement, an embed, a widget, a social feed) either
renders or does not, and the page must read the same either way.

- Reserve the slot with `min-block-size` (and `aspect-ratio` where the slot has a
  known shape) or collapse it with `display: none` when empty; never let the
  surrounding prose reflow into a different position because the slot did not
  fill. A paragraph that sits beside a slot on one load and under the H1 on the
  next is the "randomly placed" paragraph the owner saw.
- Never pad a slot with prose. Copy written to fill the space an ad might occupy
  is a text blob by construction.
- A slot never sits between the identity block and the primary content, and never
  between two panels of the same group.

The reflow half of this rule is a Cumulative Layout Shift defect as well
(`performance/01-core-web-vitals.md`); the placement half is this file's.
`scripts/measure_density.js` reports both: `slotReflowRisk` for an unreserved in-flow
slot, and `slotsAbovePrimary` for a reserved slot of 120px or more that sits between
the H1 and the primary content, with the selector and the pixels it holds. The second
row is the one a single render can see: the slot is an advert on one load and a void on
the next, and the reader's first screen is a title and a band either way.

## 6. The copy map

The architect records where every paragraph lives before writing one, and the
visual reviewer checks the rendered page against it. One row per paragraph on the
surface (component text excluded):

| Paragraph | Section and heading | Position relative to the primary content | Words | Measure | Why it is here |
|---|---|---|---|---|---|
| Lede | Page header | Above, the only prose above | 22 | 45ch | Says what the page is in one sentence |
| Methodology | "How prices are computed", below the table | Below, behind `details` | 84 | 65ch | Needed by a minority, kept out of the way |

A copy map with a row whose position is "above" and whose words exceed the lede
budget, or whose section has no heading, is rejected before code is written. A page
with no copy map has decided its text placement by accident, and the accident is
always a blob at the top.

## 7. Detection

Three tells in `references/catalogue/01-ai-tells.md` carry this doctrine into the
audit:

| Tell | Fires when | Severity |
|---|---|---|
| W11 Prose blob above the primary content | More than the lede budget of running prose sits above the first interactive or data element on first paint, or any paragraph sits inside the hero | HIGH, presence |
| W12 Orphan paragraph | A `p` of running prose whose nearest sectioning ancestor has no heading, or whose siblings are components of another kind; two or more instances, or one over 60 words | MEDIUM, concentration |
| L14 Text-only section run | Three or more consecutive sections with no non-text device, or a text-only first viewport on a non-article surface | MEDIUM |

`${CLAUDE_PLUGIN_ROOT}/scripts/measure_density.js` prints the numbers a finding
quotes: `wordsBeforePrimary`, `orphanParagraphs`, `textOnlySections`,
`longestParagraph` on any surface type, and `proseShareOfFirstViewport`. Paste them
into the `Measurement:` line; a placement finding without a number is TASTE.

## 8. Cross-references

| Need | File |
|---|---|
| How copy reads, the 30-word control-surface bar, the length carve-outs | `references/design/08-ux-writing.md` |
| Hero subtext cap, section rhythm, one question per section | `references/design/10-hero-and-section-architectures.md` |
| Waste thresholds, copy economy measurement | `references/review/05-density-and-economy.md` |
| The focal-visual and imagery floor | `references/aesthetic/06-substance-floor.md` |
| Where prose sits in a task sequence, progressive disclosure | `references/usability/01-task-flows-and-journeys.md` |
| Page shells, content zones, separating prose from controls | `references/usability/05-app-shells-and-content-layout.md` |
| The three tells, their detection cues and severities | `references/catalogue/01-ai-tells.md` § 3, § 5 |
