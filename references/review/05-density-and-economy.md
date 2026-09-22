# Density and Economy

The dimension that catches WASTE rather than BREAKAGE.

## Why this file exists

Every other row in the universal rubric is a rule against excess: lines longer
than 75ch, text that clips, controls that overlap, contrast that fails, motion
that will not stop. All of them describe a UI doing too much of something.

None of them describes a UI doing too little with what it was given. A page can
pass every one of those rows and still waste half the display, take three
screens to say what fits on one, and put a button two thousand pixels from the
row it acts on. Nothing overlaps. Nothing clips. Nothing scrolls sideways. Every
check is green, and the interface is still bad.

That gap is not hypothetical. It shipped: an admin dashboard cleared eight
parallel specialist reviews, 121 pull-request findings, and three independent
automated reviewers, then the owner opened it and asked, in order, why it did
not use the window, why the URLs looked amateur, why there were walls of text,
why the pages were endless with nothing collapsible, and why the buttons were
where they were. Five defects, none of them subtle, none of them caught. The
measurements in this file are from that page.

**A review that only looks for breakage will approve any amount of waste.**

## The four failures, with the numbers that were actually observed

| Failure | Observed | Why every existing row missed it |
|---|---|---|
| Viewport waste | 1552px shell centred on a 2560px display: 1008px unused, 39% of the window | Nothing was broken. The page rendered correctly at every width in the matrix |
| Internal waste | `table-layout:fixed` with a width on every column but one; the unsized column took 1408px for a 25-character login, leaving a ~1200px hole between each row's name and its own figures | The table did not overflow, clip, or misalign. It was "correct" |
| Page economy | 2171px of page for nine rows, of which 985px (45%) was the third rendering of the same nine channels, nothing collapsible | Each section was individually well-formed |
| Action distance | Nine identical "Pause collection" buttons at x=2380, their row identity at x=290, so 2090px apart | Proximity guidance covers visual GROUPING, not action-to-object distance |

Note the pattern in column three. In each case the component was locally
correct and globally wasteful. Local correctness is what a dimension-by-dimension
review measures.

## Thresholds

These are review thresholds, not design law. A finding needs a measurement, and
these say which measurements are worth reporting.

**Every number on this page is a ceiling, and this is the only place that needs
saying it.** There is no minimum word count, no minimum paragraph length, no
minimum section count anywhere in this file or in the script that implements it.
A floor is a padding generator: a test, a lint or a doctrine line demanding a
minimum turns every attempt to cut copy red, and four independent fix lanes in
one wave rediscovered the same floors (`references/design/12-copy-placement-and-volume.md`
section 3). Where long-form copy is genuinely needed it lives in its own section
below the primary content or on its own route, and it is measured there.

### Viewport utilisation

Measure at the widest viewport in the matrix, and at 1920px.

| Condition | Severity |
|---|---|
| Content occupies < 60% of viewport width with no second column, sidebar, or deliberate reading-measure justification | HIGH |
| 60-75% with no justification | MEDIUM |
| Capped at a reading measure (~65-75ch) and the content IS prose | Not a finding. Correct |
| Capped, content is tabular/dashboard/data, remaining space unused | HIGH |

The prose exception is the whole subtlety. A reading measure is right for an
article and wrong for a table, and the failure above happened because ONE token
served both: a `--measure` sized like prose was capping a ledger. When a page
holds both, they need separate measures. The widening is only safe because the
sentences have their own cap and do not ride it.

**Centring is not a fix.** Splitting 1008px of dead space into two 504px gutters
is the same waste, symmetrically arranged. If a review's recommendation for dead
space is `margin-inline: auto`, the finding was misdiagnosed.

### Internal distribution

| Condition | Severity |
|---|---|
| One column/child absorbs > 40% of a container's width without needing it | HIGH |
| Any element sized by the LEFTOVER (`auto` margin, unsized track in a fixed table, lone `1fr` beside fixed siblings) whose content has a known maximum | HIGH. Flag the mechanism, not just the pixels |

That second row is the generalisable lesson. `margin-right:auto` on a scope
field and an unsized `.c-name` in a `table-layout:fixed` are the same bug: a box
whose size is whatever is left over. It looks deliberate at the width it was
authored against and grows without limit at every larger one. **Grep for the
mechanism**: `margin-*:auto`, `flex:1` beside fixed siblings, unsized columns
in a fixed table, `1fr` with no `minmax`. Check each against the maximum
content it can hold.

### Page economy

| Condition | Severity |
|---|---|
| Same entity list rendered more than twice on one screen | HIGH |
| Any single section > 40% of total page height and not the primary read | HIGH |
| Page > 2x viewport height with zero collapsed/disclosed sections | MEDIUM |
| Reference or administrative content expanded by default above the primary task | MEDIUM |

Ask what the operator came for, and whether it is above the fold. On the page
above, the answer was: they came for the channel figures, and 45% of the
document was an administrative registry listing the same channels a third time.

**A collapse must never hide an alert.** Fault warnings, destructive-action
confirmations and anything time-critical stay outside the fold. A disclosure
that hides a fault is worse than the scroll it saved.

### Copy economy

Volume, by surface. The budgets are
`references/design/12-copy-placement-and-volume.md` section 3; this table is the
review-threshold view of them, and that file is the source of truth for the
numbers.

| Condition | Severity |
|---|---|
| Control surface (dashboard, settings, form, admin): any visible paragraph > 30 words | MEDIUM, or HIGH if there are three or more |
| Content or reference page (entity page, database page, guide index): any visible paragraph > 60 words | MEDIUM, or HIGH if there are three or more |
| Marketing page: any visible paragraph > 50 words | MEDIUM, or HIGH if there are three or more |
| Article, documentation, long-form guide: no volume bar. The template is for reading | Not a finding on volume. Every placement row below still binds |
| A qualifying clause that could sit behind a disclosure without loss | LOW each, MEDIUM as a pattern |

Placement, on every surface type, including the ones with no volume bar.

| Condition | Severity |
|---|---|
| Running prose above the primary content exceeding that surface's lede budget on first paint (25 words on a product or marketing surface, 40 on a content or reference page), or any paragraph inside the hero (W11) | HIGH |
| Orphan paragraphs -- a `p` of running prose whose nearest sectioning ancestor carries no heading, whose parent is `main` or `body`, or whose siblings are components of another kind -- at two or more, or one over 60 words (W12) | MEDIUM |
| Three or more consecutive text-only sections, or a text-only first viewport on a surface that is not an article template (L14) | MEDIUM |
| A paragraph whose position depends on a third-party slot rendering: an unreserved ad, embed, widget or feed with prose as a flow sibling | HIGH |

30 words is about three lines at a 35em measure, and each surface's bar is set
where that surface stops being scannable. **No surface is exempt any more.** The
marketing-and-documentation exemption that used to sit on this line is what let
the blobs through: every review asked how the words read and none asked where
they sat, so a reference page absorbed a four-paragraph, 300-word introduction
above the product and passed. Volume is negotiable by surface; placement is not.

**Where this copy comes from matters for the fix.** Long UI copy is usually not
one bad writer. It is accretion. Each review round that found a figure
potentially misleading answered by ADDING a clause, and no round ever removed
one, because no reviewer was ever scored on the total. Nine hint paragraphs on
one settings form, the worst 121 words, every sentence individually defensible.
The fix is lead-plus-disclosure, not deletion: the qualifications were correct
and hard-won, they just do not belong in front of the control.

### Action placement

| Condition | Severity |
|---|---|
| Row action > 800px from its row's identity at the review viewport | HIGH |
| Controls that scope or act on the same object separated by > 400px of empty space | HIGH |
| Action controls inside a `<nav>` landmark that do not navigate | MEDIUM (also an a11y finding) |
| Primary and destructive actions with no visual rank | MEDIUM |

The distance thresholds are viewport-relative in spirit: what matters is whether
a person can hold the association without tracking across the screen. Report the
measured distance, always.

## How to measure

Do not eyeball this. Run it, paste the numbers, and quote them in the finding.
A density claim without geometry is exactly the kind of "the layout feels empty"
note that gets dismissed as taste, which is how this class survived review in
the first place.

`${CLAUDE_PLUGIN_ROOT}/scripts/measure_density.js` (evaluated through the browser tool) prints the utilisation, page-economy, copy, action-distance
and slack-hoarding numbers for a live page. Pass `surface` -- `control` (the default),
`content`, `marketing` or `article` -- so the copy numbers are graded against the right
budget. The placement numbers it prints are `wordsBeforePrimary` alongside the
`primarySelector` it took as the primary content, `orphanParagraphs` with a 64-character
prefix of each, `textOnlySections` and `longestTextOnlyRun`, `longestParagraph`,
`totalVisibleWords` and `wordsPerSection`, and `slotReflowRisk`; paste them onto the
finding's `Measurement:` line. The duplicate-list, 400px control-separation,
admin-above-task and action-rank rows are checked by hand. Or inline:

```js
// Viewport utilisation and page economy
const main = document.querySelector('main') || document.body;
const used = main.getBoundingClientRect().width;
({
  utilisation: `${Math.round((used / innerWidth) * 100)}%`,
  unused: innerWidth - used,
  pageHeight: document.documentElement.scrollHeight,
  screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(1),
  disclosures: document.querySelectorAll('details').length,
  sections: [...document.querySelectorAll('main section')].map((s) => ({
    cls: s.className,
    h: Math.round(s.getBoundingClientRect().height),
    pct: Math.round((s.getBoundingClientRect().height /
      document.documentElement.scrollHeight) * 100),
  })),
});
```

```js
// Action distance: every row action against its row's identity
[...document.querySelectorAll('tr')].flatMap((tr) => {
  const id = tr.querySelector('th, td:first-child');
  const act = tr.querySelector('button, a.btn, [type=submit]');
  if (!id || !act) return [];
  return [{
    row: id.textContent.trim().slice(0, 20),
    gap: Math.round(act.getBoundingClientRect().x - id.getBoundingClientRect().x),
  }];
});
```

```js
// Copy economy: visible paragraphs by word count, disclosures excluded.
// The 30 below is the control-surface bar; swap it for the calling surface's
// budget (60 content, 50 marketing, no bar on an article).
[...document.querySelectorAll('p')]
  .filter((p) => !p.closest('details') && p.offsetParent !== null)
  .map((p) => ({ words: p.textContent.trim().split(/\s+/).length,
                 text: p.textContent.trim().slice(0, 60) }))
  .filter((p) => p.words > 30)
  .sort((a, b) => b.words - a.words);
```

## Severity calibration

The reason this dimension needs its own severity note: the universal rubric's
scale is anchored on breakage at every level. CRITICAL is "blocks use", HIGH's
examples are overlapping controls and broken reflow. A defect that renders
perfectly cannot climb that ladder on its own, and a reviewer honestly applying
it lands on TASTE, which does not survive triage in a large review.

Waste is a quality defect with a measurement, not a stylistic preference. Rank
it by **how much of the operator's screen or time it costs**:

- Utilisation under 60% (the table above), or an action a person cannot associate
  with its object: **HIGH**.
- A noticeable but bounded cost, such as a page over 2x viewport height with nothing
  disclosed, a section that should be folded, or a paragraph that should be two: **MEDIUM**.
- "I would have laid this out differently" with no measurement: **TASTE**, and
  it belongs in the taste bucket. That boundary is what keeps the rest credible.

## The check that generalises

For every rule you add here, ask the inverse of the rule you already have. The
rubric had "lines > 75ch" and no minimum density. It had "text clipped" and no
"space unused". It had "controls overlapping" and no "controls too far apart".

**A one-directional rule catches one direction of failure.** When adding a
threshold to any rubric, write the opposite one at the same time or record why
it does not apply.
