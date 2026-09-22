---
topic: usability
role: reference
scope: app-shells-and-content-layout
audience: ui-designer, ui-reviewer
---

# App Shells and Content Layout

The structure and geometry of a shell and a page: what a top bar owns and what a
left rail owns, how wide each is and when it collapses, how a detail page is
built, when a collection is a table and when it is a list, what must be inside
the first viewport, and where prose sits relative to controls. This is the file
that answers "why is this site hard to navigate and why is there text between
the buttons" when every screen is individually correct.

What it is not. Navigation MODELS, depth and breadth counts, wayfinding,
breadcrumbs and back behaviour stay in `references/usability/03-navigation-and-information-architecture.md`.
Task flows and progressive disclosure stay in `usability/01`. Signifiers stay in
`usability/04`. The spacing scale stays in `design/03`. Word counts and copy
budgets stay in `design/08` and `design/12`. Marketing page and section
structure stay in `design/10` and `aesthetic/04` § 3. Waste, utilisation and
page economy stay in `review/05`.

Where the published sources disagree this file says so and gives the band;
where no source publishes a number the rule is marked **house convention**.

## 1. The shell contract: four regions and what each owns

A shell has at most four regions, and each owns one kind of navigation. The
defect behind "hard to navigate" is almost always two regions owning the same
kind.

| Region | Owns | Never owns |
|---|---|---|
| Top bar | Identity (the logo, left-aligned: people reach home in one click six times more often than with a centred logo), global search, account and sign-in, cross-product or cross-version switching, the one primary action of the current view | Primary destinations when a rail exists; local navigation |
| Left rail | Primary destinations, and in a tree IA the local navigation of the current area, at most two levels deep | Utility items; anything that acts on the current view |
| Main | The content and its in-page navigation (tabs, section nav, jump links) | Global navigation |
| Supporting pane (right) | Metadata of the current entity, OR a table of contents; never both, never navigation to elsewhere | Advertising beside the content it supports (§ 14) |

Two rules that follow:

- **Never two primary menus.** A vertical and a horizontal menu both holding
  primary destinations, or a rail whose items duplicate the top bar, is the
  competing-primaries defect. Pick one owner per destination.
- **Local never outranks global.** A rail or section nav more salient than the
  top bar reads as the global navigation and strands people one level down.

The cleanest published statement of the division of labour is a platform
toolbar rule: leading edge carries back or the sidebar toggle, then the title;
the centre carries common controls and collapses into an overflow as the window
narrows; the trailing edge carries the inspector, search, More, and the single
primary action, visible at every width. Titles under 15 characters, at most
three control groups, one primary action. A tab bar moves between areas;
anything acting on the current view lives in the toolbar.

## 2. Choosing the shell

| Shell | Right when | Wrong when |
|---|---|---|
| Top bar only | Shallow, content-led sites; five or six destinations or fewer | An IA that is broad or will grow; more than six top-level items strains a bar |
| Rail plus top bar | Broad or growing IAs (data products, enterprise, government, reference sites); a tree two levels deep | Every rail item also appears in the top bar (§ 1) |
| Drawer (hidden rail) | Narrow viewports only, or a rail the person collapsed | The desktop default (§ 5) |
| No rail: mega menu plus breadcrumb plus on-page facets | Reference databases whose depth lives in filters rather than a tree; the closest analogue to a game-data site ships this shape | Tool suites where people move between areas many times per session |

Real IAs average about 7.6 top-level items (median six to seven), so a top-only
bar is at its limit on most products. Platforms disagree on the tablet case: one
prefers a tab bar first even on a tablet and treats the sidebar as the route to
less-frequent content; the other forbids a bottom bar on desktop and routes
everything at 840dp and above to a rail. Both survive as stated decisions; a
rail duplicating a top bar does not.

## 3. Shell geometry

Published widths disagree, so the rule is a band with the systems named.

| Element | Band | Named values |
|---|---|---|
| Rail, expanded | 240 to 320px | 240 (Polaris, Primer at 768px+), 256 (Carbon, Primer at 1012px+), 280 (Linear docs), 320 (Atlassian default, with a 240 floor and a 50% viewport cap); Material expanded rail 220 to 360dp |
| Rail, collapsed | 56 to 72px | Carbon 48px is the floor and survives only with 16px icons; Material collapsed rail 96dp (80dp narrow), 24dp icon, 64dp item height |
| Drawer (narrow viewports) | 280 to 360dp | Material's spec and its Compose tokens say 360dp; its own Android component doc says 280dp maximum. Use 360dp and note the conflict |
| Top bar | 48 to 64px | Carbon 48, Atlassian 56, Material small app bar 64dp (medium 112dp, large 120dp, compressing to small on scroll) |
| Content-to-chrome | Chrome under about one thirteenth of the page | 13:1 is reasonable; 2:1 is a defect (sticky-header research) |
| Rail groups | 5 to 7 top-level groups | Material's collapsed rail: three to no more than seven; a rail earns its place at more than five secondary items; a drawer or expanded rail at five or more destinations or two hierarchy levels |
| Rail depth | Two levels | Local nav supports two or three tiers before it eats content; one system states its left panel does not support three tiers; one platform caps a sidebar at two levels and sends deeper structures to a three-column split view |

Subcategory routing when a group grows: under six items becomes an accordion in
the menu, six to fifteen a dedicated section menu, over fifteen a category
landing page.

## 3b. Spending the width on wide displays

The owner's most repeated complaint after flatness: a page that looks fine at
1440 and, on a 1920 or 2560 display, becomes a narrow column in the middle of
nothing, or an oddly proportioned page where one region grew and the rest did
not. Every one of those pages passed a review, because nothing clipped and
nothing overlapped. `review/05` owns the thresholds (under 60% utilisation with
no reason is HIGH; centring is not a fix); this section owns the design of the
surplus so there is something to measure.

| Rule | Detail |
|---|---|
| The shell spends the width | On control, content, reference and dashboard surfaces the shell uses at least 75% of the viewport at 1920 and 2560. A shell capped at `max-w-7xl` (1280px) and centred uses 67% of 1920 and 50% of 2560; a 1552px cap used 61% of a 2560 display and shipped through eight reviews. Marketing and article surfaces may cap, and say why |
| Name the device that spends it | Extra grid columns via `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` (four cards at 1920, five at 2560); a supporting pane (§ 7) that opens at 1440 and carries key facts or the table of contents; a wider table that gains its secondary columns back; a two-column prose-plus-figure layout; the rail staying expanded. "The main column gets wider" is not a device unless the main column is a table or a grid |
| The measure sits on the prose, not on the shell | `max-inline-size: 65ch` to `75ch` on the prose block; the shell around it is fluid so tables, grids and figures beside the prose still use the width (§ 10). One `--measure` token serving both is the failure that capped a ledger at a paragraph's width |
| Nothing is sized by the leftover | `margin-inline: auto` as the width strategy, a lone `1fr` beside fixed siblings, an unsized column in a `table-layout: fixed`, and `justify-content: space-between` with exactly two children all look deliberate at the authoring width and paint the whole surplus as one gap or one hole at 2560 (`review/05` § Internal distribution). `align-content: center` on a viewport-floored column paints a band above the content that grows with the viewport |
| Proportions hold across the range | The rail, the main column and the pane keep a stated ratio band across 1440 to 2560 (a rail of `clamp(15rem, 18vw, 20rem)`, a pane of `clamp(18rem, 22vw, 26rem)`, the main column taking the rest); a region that grows without limit while its siblings stay fixed is the odd-looking page |
| Design the widest width, not only the narrowest | The architect's responsive contract names 1920 and 2560 per component with the expected utilisation; the reviewer measures at 1920 and the widest width with `scripts/measure_density.js`. A layout nobody drew at 2560 is a layout the browser drew |

## 4. Collapse, persistence and the icon-rail penalty

- **Pick one collapse breakpoint in the 1024 to 1056px band and state it.**
  Carbon collapses below 1056, Atlassian below 1024, Primer stacks panes below
  768; Material's classes are compact under 600dp, medium to 839, expanded to
  1199, large to 1599, extra-large above, switching rail to bottom bar below
  600dp with three to five destinations there.
- **An icon-only rail as the desktop default is the most expensive navigation
  decision available.** Hidden navigation cuts content discoverability by more
  than 20%, adds five to seven seconds to first use, and makes desktop tasks at
  least 39% slower. One platform states it directly: do not hide the sidebar by
  default. Collapse is user-initiated, persisted, and animates in 200 to 300ms.
- **Current location is the field's most common defect**, not an edge case: 95%
  of measured e-commerce sites fail to highlight the current scope. Combine at
  least two signals: `aria-current`, weight, and a selected-state rail (Carbon
  uses a 4px edge). This is the one place a coloured edge encodes something
  (`aesthetic/06-substance-floor.md` § 4).
- **Menus open on click, not hover** (the 2024 guidance supersedes the 2017
  hover guidance). Where hover survives: 0.5s dwell before open, under 0.1s to
  appear, 0.5s outside before close; two cascade tiers maximum; mega menus two
  or three tiers with grouped headers alphabetised vertically.

## 5. In-page navigation

| Device | Rule |
|---|---|
| Tabs on a detail page | One row only; labels of one or two words; no ALL CAPS; two selection indicators; the tab list sits directly above its panel. Must-see content never lives behind a non-default tab: people fixate the default and ignore the rest. A nine-tab strip that wraps to a second row is the failure case |
| Expanded sections instead of tabs | For entity and product pages the field data is blunter: about 29% of sites still use horizontal tabs and people miss them entirely, so ship expanded sections on desktop and accordions on mobile. Tabs are also wrong for sequential reading or cross-tab comparison |
| Table of contents | In a rail: sticky. In the body: not sticky, because it collides with the global nav. Right-rail placement suffers from banner blindness (§ 14). A worked example: a 250px right aside, `position: sticky; top: 96px`, about 14 entries over two heading levels |
| Sticky section bar | Five items maximum, a 300 to 400ms reveal, `scroll-padding-top` set so anchors clear the bar |
| Jump links | Only on long, chunked pages; on short pages they are clutter |

Breadcrumb rules stay in `usability/03` § 4; this file only places the
breadcrumb in the shell, above the identity block (§ 6).

## 6. Entity and detail page anatomy

The order is near-universal across game databases, wikis and code hosts:

1. Breadcrumb.
2. Identity block: the entity's icon, the H1, its type or tier chips, and the
   primary actions.
3. Key facts, beside or right of the lead: a floated facts table inside the
   main column, a right metadata pane (a code host uses about 320px), or an
   infobox. This is the supporting pane's job; a table of contents is the
   alternative, never both.
4. Data: tables, stats, the tool.
5. Prose: guides, methodology, interpretation.
6. Community and contribute, last.

**The identity block and the key facts are complete inside the first
viewport.** About 57% of page-viewing time is spent above the fold and 42%
inside the top fifth of the page; the identity block itself fits in roughly the
first 160px (house convention for the number; the research is the attention
split). The only prose above the data is the lede (`design/12` § 2).

## 7. Canonical panes

| Layout | Rule |
|---|---|
| List-detail | Two panes from 840dp up. The back affordance exists only in the single-pane form; selection state only in the two-pane form. URL state rules stay in `usability/03` § 6 |
| Supporting pane | The spec says a fixed 360dp pane at expanded width and 412dp at large; the same vendor's implementation guidance says 50/50 at medium and 70/30 at expanded for the same layout. Treat 360dp as the design rule and the percentages as implementation guidance, and record which one a product follows |
| Feed | An adaptive grid with a 180dp minimum column |
| Any layout | Never more than three panes; margins 16dp at compact, 24dp at medium and above, with a 24dp pane spacer |

## 8. Collection rendering: list, table, card, grid

| Render as | When | Never when |
|---|---|---|
| Table | People compare across columns, sort or filter many fields, or look for patterns; nested or multi-select data | The rows are heterogeneous summaries people browse rather than compare |
| Structured list | Flat items acted on one at a time; at most about three short lines per row | Comparison across fields is the task |
| Cards | Browsing heterogeneous items, each a linked summary with an image | Search results, comparison, or homogeneous items (those are a list); cards force spatial re-orientation per item and make comparison slow |
| Grid | Visual items where the image is the identity (an item catalogue, media) | Text-first items |

No source publishes a numeric card-versus-table cutoff; do not invent one. Route
by intent instead: act on objects means an index or resource list, analyse means
a data table, and paginate past about 50 items. Table rules: column order by
importance, related columns adjacent, the header row and the key column frozen,
row banding or a hover band, one or two row actions before an overflow menu.
Entity rows carry their icon or thumbnail wherever the domain has one
(`aesthetic/06` S6).

## 9. Content zones and the first viewport, by page type

| Page type | The first viewport holds | The first viewport never holds |
|---|---|---|
| Reference or entity page | Breadcrumb, identity block, key facts, the start of the first data table | A paragraph run; a hero image that pushes the data below the fold |
| Dashboard | The primary metric or table | A greeting; a filter bar consuming the fold; explanatory prose |
| Index or category page | The subcategory grid | A hero banner pushing subcategories below the fold, named in field studies as the single most common and most damaging mistake, present on about 76% of sites |
| Tool page | The tool, with its controls and their labels | The guide to the tool (that goes below it, § 12) |
| Marketing page | Owned by `design/10` § 3: the focal visual, the headline, one action | A paragraph in the hero |

## 10. Reading measures by content type

The band is **50 to 75 characters per line with an 80ch hard ceiling**. The
sources: 50 to 75 (usability research), 75 (a government design system,
enforced by a two-thirds column of a 960px grid), 80 or fewer with 40 for CJK
(e-commerce field research, citing the accessibility ceiling). **Material is the
outlier at 40 to 60 characters**, its only published measure number and
narrower than every other source; record it as the dissent, not as consensus.

Measured products: a docs site runs 670px at 15px type, a code host's README
838px, a game database's main column 920px. So: **prose runs 65 to 75ch;
columns carrying tables, icons or code widen to 800 to 920px; the two never
share one measure token.** A single `--measure` sized for prose capping a table
is the failure `review/05` documents. Density and utilisation thresholds stay
there.

## 11. Text-to-control placement

The rules in this section decide WHERE words sit; word counts stay in `design/08`
§ 4b and `design/12` § 3.

| Words | Position |
|---|---|
| Field label | Above the field, so label and field land in one fixation |
| Help text | Persistent, below the field, outside it |
| Critical instruction | In the label. Never in help text, a placeholder or a tooltip: placeholders vanish on focus and tooltips are unreachable on touch |
| Section intro | Under the section heading, before the first control, within the 30-word bar |
| Empty state | Inside the empty region, with exactly one primary action |
| Error | Inline at the field, input preserved (`usability/02`) |

**No prose between controls.** Once a control group has started, nothing but
controls, their labels and their own help text appears until the group ends.
Explanatory prose goes above the group as a section intro, below the tool, or
behind a labelled disclosure. This is the layout counterpart of the word-count
rule, and it is the rule a page can pass every copy check and still break.

Proximity ratios: no research source publishes an inner-to-outer spacing ratio;
the ratios in `design/03` § 8 are house convention and are labelled as such.

## 12. Prose coexisting with a tool

Data first, prose after, community last, which is what every measured reference
site does. The tool or table sits above the fold; below it, in order:
methodology, interpretation, related links and FAQ. Descriptive or search copy
is structured as two to six highlights (image plus short headline plus one
paragraph) rather than a text block, which about 78% of sites get wrong, and
category or search copy sits at the bottom of the page. The volume and placement
rules for that copy are `design/12` § 2 and § 3.

## 13. Chunking for the scan

Only 20 to 28% of a page's words are read; time on page runs about 25 seconds
plus 4.4 seconds per hundred words, so roughly 18 of every extra hundred words
get read. Attention by paragraph runs 81%, 71%, 63%, 32%: the cliff is at the
fourth paragraph. The F-pattern is a symptom of missing subheads, not a target;
prominent, front-loaded headings convert it into the layer-cake pattern, the
most effective scan short of reading every word.

Rules: one idea per paragraph; split sentences over 25 words; at most five
sentences per paragraph; a vertical list at three or more items; bold under 30%
of the text; a heading before any run over about 110 words; front-load every
heading, link and list item (people see about two words per item when scanning,
and an 11-character truncation left 35% of readers with no idea where a link
went).

## 14. Promo, ad and embed slotting

A right rail drew 0.8% of fixations while occupying 25% of the content area,
33 times less than its size warrants. Content is mistaken for advertising when
it is a small rectangle mid-text, sits on a tinted background, is heavily
formatted, or carries text baked into an image; in one study 86% of people
missed the feature holding their answer because it read as promotional.

- **Never mix ads or promos and content in one visual section.** An in-content
  promo inherits body typography and sits at a section boundary, never
  mid-paragraph, never in a right rail beside the content it supports.
- A slot never sits between the identity block and the primary content, and
  never between two panels of one group. It is reserved or collapsed, and no
  prose is positioned by it (`design/12` § 5).

## 15. Detection procedures

Run on a rendered page or on the route's markup; paste the numbers into the
finding's `Measurement:` line.

```js
// Region inventory and duplicate destinations between rail and top bar
const links = (root) => [...root.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
const top = document.querySelector('header nav, [data-region="topbar"] nav');
const rail = document.querySelector('aside nav, [data-region="rail"] nav, nav[aria-label*="primary" i]');
const dup = top && rail ? links(top).filter((h) => links(rail).includes(h)) : [];
({ topBar: !!top, rail: !!rail, duplicateDestinations: dup, railItems: rail ? rail.querySelectorAll('a').length : 0 });
```

```js
// Tab strip rows (a wrapped strip is a second row)
[...document.querySelectorAll('[role="tablist"]')].map((t) => {
  const tops = new Set([...t.querySelectorAll('[role="tab"]')].map((x) => Math.round(x.getBoundingClientRect().top)));
  return { tabs: t.querySelectorAll('[role="tab"]').length, rows: tops.size };
});
```

```js
// Prose between controls: a p whose previous and next element siblings are both controls
[...document.querySelectorAll('p')].filter((p) => {
  const ctl = (el) => el && el.matches('button, input, select, textarea, fieldset, [role="button"], [role="group"]');
  return ctl(p.previousElementSibling) && ctl(p.nextElementSibling);
}).map((p) => p.textContent.trim().slice(0, 60));
```

```js
// Measure per column: characters per line at the rendered width
[...document.querySelectorAll('p, td, li')].slice(0, 200).map((el) => {
  const cs = getComputedStyle(el);
  const em = parseFloat(cs.fontSize);
  return { tag: el.tagName, ch: Math.round(el.getBoundingClientRect().width / (em * 0.5)) };
}).filter((r) => r.ch > 80);
```

```js
// First viewport contents by kind
[...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().top < innerHeight && el.children.length === 0)
  .reduce((acc, el) => { const k = el.matches('p') ? 'prose' : el.matches('img, svg, canvas, video') ? 'visual' : el.matches('button, a, input, select') ? 'control' : el.matches('td, th') ? 'data' : 'other'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
```

`${CLAUDE_PLUGIN_ROOT}/scripts/measure_density.js` prints the first three of
these as `shell.proseBetweenControls`, `shell.tabStrips` and
`shell.duplicateDestinations` and grades each HIGH, alongside its copy numbers
(words before the primary content, orphan paragraphs, text-only sections); run it and
`${CLAUDE_PLUGIN_ROOT}/scripts/measure_substance.js` (the focal visual, imagery
per section) at 1920 and the widest width.

## 16. Severity anchors

| Finding | Severity |
|---|---|
| Two regions holding primary destinations; a rail duplicating the top bar | HIGH |
| Icon-only rail as the desktop default, or a rail hidden by default | HIGH |
| No current-location signal, or one signal only | HIGH (usability) |
| Must-see content behind a non-default tab; a tab strip wrapping to two rows | HIGH |
| Identity block and key facts not complete in the first viewport of a reference page; a category page whose subcategories sit below a hero | HIGH |
| Prose between controls; the guide above the tool | HIGH (placement, `design/12`) |
| Prose column over 80ch; a table capped at a prose measure | MEDIUM (utilisation stays `review/05`) |
| Shell under 75% of the viewport at 1920 or 2560 on a control, content, reference or dashboard surface with no named device spending the width; a region sized by the leftover | HIGH under 60% (`review/05`), MEDIUM at 60-75% |
| Cards used for comparison or search results | MEDIUM |
| Rail depth over two levels; more than seven rail groups without grouping | MEDIUM |
| Hover-only menus, no dwell delay | MEDIUM |
| A promo inside a content section or mid-paragraph | MEDIUM |

## 17. Cross-references

| Need | File |
|---|---|
| Navigation models, depth and breadth, wayfinding, breadcrumbs, back, deep links | `references/usability/03-navigation-and-information-architecture.md` |
| Task flows, progressive disclosure, cognitive load | `references/usability/01-task-flows-and-journeys.md` |
| Form layout, labels, errors, input preservation | `references/usability/02-forms-and-error-recovery.md` |
| Signifiers and affordances | `references/usability/04-states-feedback-and-affordances.md` |
| Word counts, copy budgets, the copy map | `references/design/08-ux-writing.md`, `references/design/12-copy-placement-and-volume.md` |
| Spacing scale and proximity (house convention) | `references/design/03-spacing-rhythm.md` |
| Marketing page and section structure | `references/design/10-hero-and-section-architectures.md`, `references/aesthetic/04-style-taxonomy.md` |
| Waste, utilisation, page economy, action distance | `references/review/05-density-and-economy.md` |
| The substance floor: edges, focal visual, imagery on entity rows | `references/aesthetic/06-substance-floor.md` |
| Viewport matrix and the 1920 calibration width | `references/review/03-viewport-matrix.md` |
