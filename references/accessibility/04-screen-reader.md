---
topic: accessibility
role: reference
scope: screen-reader
audience: ui-engineer
---

# Screen Readers, Semantic HTML, ARIA — Reference for UI Engineers

Screen readers traverse the accessibility tree, which the browser derives from semantic HTML and ARIA. Get the tree right, and screen reader users get a coherent experience. Source material: MDN ARIA, W3C WAI-ARIA APG, the W3C Accessible Name and Description Computation, web.dev.

## 1. Semantic HTML first

The first ARIA rule is: don't use ARIA. Native elements have roles, states, and keyboard behavior built in. ARIA is a fallback for when no native element matches.

| Intent | Native | Custom fallback (last resort) |
|---|---|---|
| Clickable action | `<button>` | `<div role="button" tabindex="0">` + keyboard handlers |
| Link | `<a href>` | `<span role="link" tabindex="0">` + handlers (rarely justified) |
| Checkbox | `<input type="checkbox">` | `<div role="checkbox" tabindex="0" aria-checked>` + handlers |
| Dropdown | `<select>` | `<div role="combobox">` + listbox pattern (only for styled combobox) |
| Progress | `<progress>` | `<div role="progressbar" aria-valuenow>` |
| Navigation | `<nav>` | `<div role="navigation">` |
| Main content | `<main>` | `<div role="main">` |
| Article | `<article>` | `<div role="article">` |
| Complementary | `<aside>` | `<div role="complementary">` |
| Heading | `<h1>`-`<h6>` | `<div role="heading" aria-level="2">` |
| List | `<ul><li>` / `<ol><li>` | `<div role="list"><div role="listitem">` |
| Table | `<table><tr><td>` | `<div role="table">` (painful; use native) |
| Dialog | `<dialog>` or `<div role="dialog" aria-modal>` | Same |

The native `<button>` gets: focus, Enter/Space activation, disabled state, submit behavior in a form, SR announcement as "button", and Windows High Contrast compatibility — all free. A `<div role="button" tabindex="0">` needs all of that re-implemented.

## 2. Heading hierarchy

| Rule | Detail |
|---|---|
| Exactly one `<h1>` per page | The page's primary subject |
| No skipped levels | `<h1>` -> `<h3>` with no `<h2>` breaks the outline |
| Headings form the table of contents | SR users navigate by heading (H in NVDA, Rotor in VO) |
| Heading level = semantic hierarchy, NOT visual size | A small heading can be `<h2>`; a big heading can be `<h3>` if that's what it is semantically |
| Never use `<p class="heading">` | SR user can't jump to it |
| Never use `<br>` + bold for visual heading | Same |

### Common bug

```html
<!-- WRONG: visually styled <p> that looks like a heading -->
<p class="text-2xl font-bold">Account settings</p>

<!-- RIGHT -->
<h2 class="text-2xl font-bold">Account settings</h2>
```

### Skipped-level bug

```html
<!-- WRONG: skips h2 -->
<h1>Dashboard</h1>
<h3>Recent activity</h3>

<!-- RIGHT -->
<h1>Dashboard</h1>
<h2>Recent activity</h2>
```

## 3. Landmarks

Landmarks are page regions SR users jump between with a single keystroke. Use the native semantic elements; they produce landmarks automatically.

| Native element | Landmark role | Purpose |
|---|---|---|
| `<header>` (top-level, child of `<body>`) | `banner` | Site-wide header — logo, primary nav |
| `<nav>` | `navigation` | Set of navigation links |
| `<main>` | `main` | Primary content — exactly one per page |
| `<aside>` | `complementary` | Sidebar, related content |
| `<footer>` (top-level) | `contentinfo` | Site-wide footer |
| `<form>` with `aria-label` or `aria-labelledby` | `form` | Major form (not small ones) |
| `<section>` with `aria-label` or `aria-labelledby` | `region` | Named region |
| `[role="search"]` | `search` | Site search form |

Rules:
- One `banner`, one `main`, one `contentinfo` per page.
- Multiple `<nav>` on one page need `aria-label` to distinguish ("Primary", "Footer").
- Don't add `role="main"` to `<main>` — redundant, and in some screen readers causes double-announcement.

```html
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <header>                              <!-- banner -->
    <nav aria-label="Primary">...</nav>
  </header>
  <main id="main" tabindex="-1">        <!-- main -->
    <h1>Page title</h1>
    <article>...</article>
  </main>
  <aside aria-label="Related">...</aside>  <!-- complementary -->
  <footer>                              <!-- contentinfo -->
    <nav aria-label="Footer">...</nav>
  </footer>
</body>
```

## 4. ARIA roles vs native — required / redundant / wrong

| Case | Example | Verdict |
|---|---|---|
| Custom combobox (styled autocomplete) | `<div role="combobox">` | REQUIRED — no native equivalent with the right behavior |
| Custom slider | `<div role="slider" aria-valuemin aria-valuemax aria-valuenow>` | REQUIRED if not using `<input type="range">` |
| `<button role="button">` | Applying role to native button | REDUNDANT; native already has the role. Not harmful but noise |
| `<nav role="navigation">` | Role on `<nav>` | REDUNDANT |
| `<span role="link">` on a span instead of `<a>` | Span styled as link | WRONG — use `<a href>` |
| `<div role="button">` on a div with onclick | Div styled as button | WRONG — use `<button>` |
| `role="presentation"` on a meaningful table | Strips semantics from a data table | WRONG — only use on purely-layout tables (and avoid layout tables entirely) |
| `aria-label` on a `<button>` with visible text different from the label | "View details" button with `aria-label="Expand"` | WRONG — 2.5.3 Label in Name requires the accessible name contain the visible text |
| `aria-label` on a `<div>` with no role | Label with no role | IGNORED — ARIA label only applies to elements that take a name |

Rules of ARIA:

| # | Rule |
|---|---|
| 1 | Prefer native HTML. Don't use ARIA if you can use semantic HTML |
| 2 | Don't change native semantics unless you really have to (`<h1 role="button">` is a bug) |
| 3 | All interactive ARIA controls must be keyboard-usable |
| 4 | Don't use `role="presentation"` or `aria-hidden="true"` on a focusable element — creates a ghost focus |
| 5 | All interactive elements must have an accessible name |

## 5. ARIA states

States are dynamic — they change as the user interacts.

| State | Values | When | Example |
|---|---|---|---|
| `aria-expanded` | `true` / `false` | Disclosure-style (accordion, menu trigger, combobox) | Toggle button for a collapsible panel |
| `aria-pressed` | `true` / `false` / `mixed` | Toggle button (two-state) | Bold button in a rich-text toolbar |
| `aria-checked` | `true` / `false` / `mixed` | Checkbox, switch, radio custom widgets | Custom toggle with role="switch" |
| `aria-selected` | `true` / `false` | Listbox option, tab, tree item, grid cell | Active tab |
| `aria-current` | `page` / `step` / `location` / `date` / `time` / `true` / `false` | Navigation, pagination, breadcrumb | Current page in nav |
| `aria-disabled` | `true` / `false` | Programmatically disabled (not using `disabled` attr) | Button that looks disabled but is focusable for SR announcement |
| `aria-hidden` | `true` / `false` | Hide from accessibility tree (decorative only) | Decorative icon inside an otherwise-labeled button |
| `aria-busy` | `true` / `false` | Region loading | Live region updating in progress |
| `aria-invalid` | `true` / `false` / `grammar` / `spelling` | Form field error state | Input with invalid email |

Critical: `aria-disabled="true"` keeps focus on the element (so SR announces it) but `disabled` attribute removes focus. Use `aria-disabled` when you need the element to be announced but non-functional (e.g., a button that gates on a subscription).

## 6. ARIA properties

Properties are static relationships — they rarely change.

| Property | Purpose | Notes |
|---|---|---|
| `aria-label` | Provide accessible name when no visible text exists | Icon-only buttons; icons with no label |
| `aria-labelledby` | Point to existing visible text as the name | Multi-word sections, dialogs with visible title |
| `aria-describedby` | Point to additional descriptive text | Form help text, error messages, tooltip targets |
| `aria-errormessage` | Point to the error message element | Pair with `aria-invalid="true"`; newer than `aria-describedby` for errors |
| `aria-haspopup` | Trigger opens a popup | Values: `menu`, `listbox`, `tree`, `grid`, `dialog`, `true` (equiv menu) |
| `aria-controls` | Trigger relates to controlled element by id | Disclosure trigger -> panel id; tab -> tabpanel id |
| `aria-owns` | Parent/child relationship that isn't in DOM | Rare; prefer DOM nesting |
| `aria-live` | Live region priority | `polite` / `assertive` / `off` |
| `aria-atomic` | Announce the whole region or just changes | `true` = whole region |
| `aria-relevant` | Which changes announce | `additions text removals all` |
| `aria-roledescription` | Custom role name (use sparingly) | Override how SR announces role |
| `aria-keyshortcuts` | Declare shortcuts for SR | `"Alt+Shift+P"` |
| `aria-autocomplete` | Combobox autocomplete behavior | `inline` / `list` / `both` / `none` |
| `aria-activedescendant` | Focus-via-id pattern | Combobox, complex widgets — id of currently "active" descendant |

### Accessible name precedence

The browser computes an accessible name per the W3C Accessible Name and Description Computation (accname). First non-empty step wins:

| # | Source | Notes |
|---|---|---|
| 1 | `aria-labelledby` | Collates the text of every referenced element, in the order the ids are listed. Wins whenever the referenced text is non-empty; if every referenced element is empty or missing, the algorithm falls through to `aria-label`, then the native label, then contents |
| 2 | `aria-label` | Only applies to elements that support naming. On a bare `<div>` or `<span>` with no role, it is ignored |
| 3 | Native host-language label | `<label for>` / wrapping `<label>` on a form control, `<legend>` for a `<fieldset>`, `<caption>` for a `<table>`, `alt` on `<img>`, `<title>` child of an inline `<svg>` |
| 4 | Element contents (subtree text) | Only for roles whose name comes from content: button, link, heading, cell, menuitem, option, tab, tooltip, treeitem, and similar. NOT for `<input>`, `<textarea>`, `<select>`, or landmark/region roles |
| 5 | `title` attribute | LAST-RESORT fallback only. It is checked AFTER element contents |
| 6 | Nothing | Element is unnamed. Screen readers announce bare role ("button", "edit text") |

Two consequences reviewers get wrong constantly:

- `<button title="Expand row">Details</button>` has the accessible name **"Details"**, not "Expand row". Contents beat `title`. Filing a 2.5.3 Label in Name violation here is a false positive.
- `title` can legitimately surface as the name on `<input type="text">` because a text input has no contents to fall back to, so step 4 produces nothing. That is the ONLY common case where `title` wins, and it is still a defect: `title` is mouse-only, does not appear on touch, is unreliable across screen readers, and is not translated by many tooling paths. Treat a `title`-only name as a finding, not a solution.

Put `aria-label` ONLY when there is no visible text. If there IS visible text, use `aria-labelledby` to point to it so they match (2.5.3 Label in Name).

Verifying rather than reasoning: open Chrome DevTools, Elements, Accessibility pane, and read the computed Name plus the "from" source it names. That is the evidence to paste into a naming finding.

```html
<!-- RIGHT: icon-only button needs aria-label -->
<button aria-label="Close">×</button>

<!-- WRONG: aria-label fights visible text -->
<button aria-label="Dismiss">Close</button>

<!-- RIGHT: labelledby uses the visible heading as the name -->
<section aria-labelledby="sec-1">
  <h2 id="sec-1">Recent activity</h2>
  ...
</section>
```

## 7. Live regions

A live region announces changes to SR users without moving focus. Use it for status updates, form-save confirmations, errors, incoming messages.

| Role / attribute | Politeness | Use for |
|---|---|---|
| `aria-live="polite"` | Waits for SR to finish current speech | Form save result, "3 items added" |
| `aria-live="assertive"` | Interrupts SR immediately | Errors, urgent alerts |
| `role="status"` | Polite live region (semantic shortcut) | Status messages |
| `role="alert"` | Assertive live region | Errors, urgent alerts |
| `role="log"` | Polite, log-style (chat, tickers) | Ongoing streams |
| `role="timer"` | Countdown announcements | Rare |

### Critical pitfall: initially empty live region

Browsers announce changes INTO a live region. If the element is added to the DOM with content already inside, some SRs don't announce it (they think it was always there).

```tsx
// WRONG: element created with content already in it -> may not announce
{message && <div role="status">{message}</div>}

// RIGHT: live region always exists; content is updated inside it
<div role="status" aria-live="polite">
  {message /* changes to this string will announce */}
</div>
```

### Patterns

```tsx
// Pair one polite + one assertive region at the root of the app.
<div role="status" aria-live="polite">{statusMessage}</div>
<div role="alert"  aria-live="assertive">{errorMessage}</div>
```

### Rules

| Rule | Detail |
|---|---|
| Render the live region in the initial DOM, then update its content | Don't add and remove the region |
| Use `polite` by default | `assertive` only for truly interruptive content |
| Don't put interactive elements inside a live region | SRs read children; buttons get read but users can't interact well |
| Keep messages short | A 300-word live region is a usability disaster |
| Don't use `alert()` or `confirm()` | Use modal dialogs + `role="alertdialog"` |
| Debounce updates | Rapid changes (typing) flood the SR |

## 8. Hidden patterns

### Visually hidden but announced

Content for screen readers only. Standard utility class:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

Tailwind ships `sr-only` and `not-sr-only` built in.

```html
<!-- SR-only label alongside decorative icon -->
<button>
  <svg aria-hidden="true">...</svg>
  <span class="sr-only">Delete item</span>
</button>

<!-- aria-hidden on icon; button has visible text -->
<button>
  <svg aria-hidden="true">...</svg>
  Save
</button>
```

### Hiding strategies reference

| Technique | Hides visually | Hides from SR | Focusable | Use for |
|---|---|---|---|---|
| `.sr-only` (CSS above) | Yes | No | Yes (if interactive) | SR-only labels |
| `aria-hidden="true"` | No | Yes | Yes (bug — avoid combining) | Decorative icons/text |
| `hidden` attribute | Yes | Yes | No | Fully hidden |
| `display: none` / `visibility: hidden` | Yes | Yes | No | Same as `hidden` |
| `inert` attribute | No | Yes | No | Modal siblings |

### `inert` for modal siblings

When a modal is open, mark siblings `inert` so SR and keyboard can't reach them:

```tsx
<>
  <div inert={modalOpen ? '' : undefined}>{pageContent}</div>
  {modalOpen && <Modal>{modalContent}</Modal>}
</>
```

Don't mix: DO NOT put both `aria-hidden="true"` AND focusable children on the same subtree. SR announces a "ghost" focus. Use `inert` instead.

## 9. Form patterns

### Labels

Every input MUST have a programmatic label.

```html
<!-- Preferred: <label for> -->
<label for="email">Email</label>
<input id="email" type="email">

<!-- Acceptable: wrapping label -->
<label>
  Email
  <input type="email">
</label>

<!-- Fallback: aria-label (no visible label) -->
<input type="search" aria-label="Search products">

<!-- Fallback: aria-labelledby (visible label is elsewhere) -->
<h2 id="filter-header">Filter by price</h2>
<input id="price" aria-labelledby="filter-header">
```

### Required

```html
<label for="name">Name *</label>
<input id="name" required aria-required="true">
```

Both `required` (native) and `aria-required="true"` — some SRs only announce one.

### Errors

```html
<label for="email">Email</label>
<input
  id="email"
  type="email"
  required
  aria-required="true"
  aria-invalid="true"                <!-- dynamic: flip on error -->
  aria-errormessage="email-error"    <!-- points to error element -->
  aria-describedby="email-help"      <!-- static help text -->
/>
<small id="email-help">We'll never share your email.</small>
<p id="email-error" role="alert">Enter a valid email address.</p>
```

Pair `aria-invalid="true"` with `aria-errormessage`. If `aria-errormessage` isn't supported (older SRs), fall back to `aria-describedby`.

### Fieldsets for groups

Related radios / checkboxes must be grouped with `<fieldset><legend>`:

```html
<fieldset>
  <legend>Account type</legend>
  <label><input type="radio" name="type" value="personal"> Personal</label>
  <label><input type="radio" name="type" value="business"> Business</label>
</fieldset>
```

`<legend>` is announced as the group name before each radio label.

## 10. Data tables

A data table without header semantics is a wall of unattributed values. A sighted user reads "1,240" and knows it is the March figure for the EU region because they can see the row and column. A screen reader user gets "1,240" and nothing else unless the markup says which header cells govern that cell. This is WCAG 1.3.1 Info and Relationships, rated HIGH in the severity map (`references/accessibility/01-wcag-2-2.md` section 11), and it is the single most common failure on dashboards and admin UIs, which is exactly what this plugin produces.

### The required markup

```html
<table>
  <caption>Revenue by region, Q1 2026 (USD thousands)</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">January</th>
      <th scope="col">February</th>
      <th scope="col">March</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">EU</th>
      <td>980</td>
      <td>1,105</td>
      <td>1,240</td>
    </tr>
  </tbody>
</table>
```

With this markup a screen reader announces the March EU cell as "EU, March, 1,240". Without `scope`, it announces "1,240".

### Rules

| Rule | Detail |
|---|---|
| Every data table has a `<caption>` | It is the table's accessible name and the first thing announced. A visible `<h3>` above the table is NOT a substitute; if the heading must be visible and the caption must not repeat it, use `aria-labelledby` pointing at the heading, or `.sr-only` styling on the caption rather than deleting it |
| Column headers are `<th scope="col">` | In `<thead>` |
| Row headers are `<th scope="row">` | The first cell of each `<tbody>` row when that cell identifies the row (name, date, SKU, region) |
| `<td>` is for data only | A `<td>` styled bold to look like a header is a defect: it carries no header semantics |
| Irregular tables use `headers` / `id` | When a cell is governed by more than one header, or headers span (`colspan`/`rowspan`), `scope` is not enough: give each `<th>` an `id` and each `<td>` a `headers="id1 id2"` list |
| Sortable headers carry `aria-sort` | `aria-sort="ascending" \| "descending" \| "none"` on the currently-sorted `<th>` only, never on more than one at once. The control itself is a `<button>` INSIDE the `<th>`, so it is focusable and has a role |
| Announce the result of a sort | Changing sort order silently rewrites the whole table under a screen reader user. Push a short message into a `role="status"` live region: "Sorted by March, descending" |
| Never `role="presentation"` on a data table | That strips the semantics deliberately. It is only valid on a pure layout table, and layout tables should not exist in new code |
| No layout tables | Use CSS grid or flexbox for layout |
| Empty cells are still cells | Use `<td></td>`, not a missing cell. A missing cell shifts every subsequent column's header association |
| Summary rows are marked | A totals row is still a row: `<th scope="row">Total</th>` plus `<tfoot>` |

### CSS-grid and div-based tables

A `<div>` grid styled to look like a table has no table semantics at all. If a native `<table>` is genuinely impossible (usually because of virtualization or sticky-column layout), the full role set is mandatory and none of it is optional:

```html
<div role="table" aria-label="Revenue by region" aria-rowcount="4820">
  <div role="rowgroup">
    <div role="row" aria-rowindex="1">
      <div role="columnheader" aria-colindex="1">Region</div>
      <div role="columnheader" aria-colindex="2" aria-sort="descending">March</div>
    </div>
  </div>
  <div role="rowgroup">
    <div role="row" aria-rowindex="412">
      <div role="rowheader" aria-colindex="1">EU</div>
      <div role="cell" aria-colindex="2">1,240</div>
    </div>
  </div>
</div>
```

| Requirement | Why |
|---|---|
| `role="table"` plus `aria-label` or `aria-labelledby` | Replaces `<caption>` |
| `role="rowgroup"` wrappers | Replaces `<thead>` / `<tbody>`. Without them, some screen readers lose the header row |
| `role="row"` on every row | A `role="cell"` whose parent is not a row is dropped from the tree |
| `role="columnheader"` / `role="rowheader"` | Replaces `<th scope>` |
| `aria-rowcount` / `aria-colcount` on the table, `aria-rowindex` / `aria-colindex` on rows and cells | MANDATORY when virtualized. Otherwise the user is told "row 3 of 30" while row 3 is really record 412 of 4,820 |
| Interactive cells make the whole thing a `grid`, not a `table` | `role="grid"` adds keyboard navigation obligations (arrows, Home/End, Ctrl+Home/End). See the Grid row in `references/accessibility/01-wcag-2-2.md` section 8 |

Applying `display: grid` or `display: contents` to a native `<table>` also destroys its semantics in several browsers. If you need grid layout on a real table, set the display on a wrapper, not on the `<table>`, `<tr>`, or `<td>`.

### Table anti-patterns

| Anti-pattern | Why | Fix |
|---|---|---|
| `<td>` with bold styling as a header | No semantics; screen reader announces a value | `<th scope="col">` or `<th scope="row">` |
| No `<caption>` | Table is unnamed; the rotor lists "table" with no clue what it holds | Add `<caption>`, visually hidden if design demands |
| `scope` omitted entirely | Some browsers guess a first-row header, most guess nothing | Explicit `scope` on every `<th>` |
| Sort control is a click handler on the `<th>` | Not focusable, no role, no announcement | `<button>` inside the `<th>` plus `aria-sort` |
| `aria-sort` left on multiple headers | Ambiguous state | Exactly one sorted header at a time |
| Virtualized rows with no `aria-rowindex` | Position announcements are lies | Add `aria-rowcount` plus per-row `aria-rowindex` |
| Chart with no table equivalent | The data exists only as pixels | Ship the table-view twin described in `references/dataviz/03-marks-interaction-figures.md` |

## 11. Image alt text

| Image kind | Alt strategy |
|---|---|
| Informational (chart, diagram, meaningful photo) | `alt="Description of content or data"`; for complex charts, also `aria-describedby` to long text or `<figure><figcaption>` |
| Decorative (shape, spacer, repeat pattern) | `alt=""` (EMPTY, not missing — SR skips it) |
| Functional (icon inside a button) | `aria-hidden="true"` on img; accessible name on the button (`aria-label` or visible text) |
| Icon-only link | `<a href="/profile" aria-label="Your profile"><img src="..." alt=""></a>` (alt="" because aria-label on link is the name) |
| Redundant to adjacent text | `alt=""` so it's not double-announced |
| Photo inside an article | Content-describing alt |
| CAPTCHA | `alt="..."` describing the challenge; must have accessible alternative |

Bad patterns: `alt="IMG_2934.jpg"`, `alt="image"`, `alt="photo"`, missing `alt` entirely, `alt` duplicating an adjacent caption, SVG icon inside button with no accessible name on the button.

SVG inline accessibility:

```html
<!-- Decorative -->
<svg aria-hidden="true" focusable="false">...</svg>

<!-- Meaningful -->
<svg role="img" aria-labelledby="chart-title" focusable="false">
  <title id="chart-title">Monthly revenue chart</title>
  ...
</svg>
```

`focusable="false"` prevents legacy IE/Edge keyboard focus on the SVG itself.

## 12. Testing tools

| Tool | Platform | Purpose |
|---|---|---|
| VoiceOver (macOS, iOS) | Apple | macOS: Cmd+F5 to toggle; Ctrl+Opt+A to read all. iOS: Triple-click side button |
| NVDA | Windows | Free, open-source, most-used globally. `NVDA+Down` to read, `H` for next heading |
| JAWS | Windows | Commercial, common in enterprise |
| Narrator | Windows built-in | Improving but less common |
| TalkBack | Android | Swipe right for next, double-tap to activate |
| axe DevTools (Deque) | Browser extension | Automated scan; catches ~35-40% of issues |
| Accessibility Insights | Microsoft | Guided manual assessment |
| Lighthouse | Chrome DevTools | Built-in a11y audit (subset of axe) |
| Chrome DevTools -> Accessibility panel | Chrome | Inspect the accessibility tree directly |
| Firefox Accessibility Inspector | Firefox | Full tree view with contrast check |

Rule: automated tools catch the obvious. SR testing is manual. Before shipping major changes, run through with VoiceOver + NVDA (at minimum one desktop SR).

## 13. Anti-patterns

| Anti-pattern | Why | Fix |
|---|---|---|
| `<div onclick>` instead of `<button>` | Not focusable, no SR role, no keyboard | `<button>` |
| `aria-label` on a button with visible text that differs | Violates 2.5.3 Label in Name; voice control users say visible text and nothing happens | Match aria-label to visible text, or drop the aria-label |
| Missing `alt` on content images | SR announces filename | `alt="..."` with description or `alt=""` if decorative |
| `alt="IMG_2934.jpg"` | Meaningless | Describe the image |
| Placeholder as label | Disappears on focus; low contrast; inconsistent SR support | `<label for>` |
| `role="button"` on a `<button>` | Redundant; some SRs read "button button" | Remove the role |
| `aria-hidden="true"` on a focusable element | "Ghost focus" — focusable but SR doesn't announce | Use `inert`, or hide from both focus and SR |
| Live region added to DOM AFTER the change | Some SRs don't announce | Render the live region first, then mutate its children |
| Live region with huge content dump | User can't interrupt the torrent | Keep messages <2 sentences |
| `<h3>` following `<h1>` with no `<h2>` | Breaks page outline | Use correct level |
| Styled `<p>` where `<h2>` was meant | Not in SR heading list | Use the right element |
| Multiple `<main>` | Confuses SR | Exactly one |
| `<nav>` without `aria-label` when multiple navs exist | SR announces "navigation" ambiguously | `aria-label="Primary"` / `aria-label="Footer"` |
| Custom dropdown that doesn't handle Esc to close | Keyboard trap | Handle Esc |
| `role="link"` on a `<span>` | Can't be opened in new tab, can't be bookmarked | Use `<a href>` |
| CAPTCHA with no alternative | Blocks users | Provide WebAuthn, audio, or logic alternative |
| SVG icon inside link with no accessible name | SR reads nothing or filename | `aria-label` on the link |
| `title` attribute as the only label | Weak, mouse-only, inconsistent SR support | Use `aria-label` or visible text |
| `aria-describedby` pointing to id that doesn't exist | Silent failure | Verify ids match; test in SR |
| Focus jump inside live region | Disorienting | Live regions announce; they don't focus |

## Sources

- W3C WAI-ARIA Authoring Practices (APG): https://www.w3.org/WAI/ARIA/apg/
- MDN ARIA: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA
- MDN Semantics in HTML: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML
- web.dev — Learn Accessibility: https://web.dev/learn/accessibility/
- web.dev — ARIA and HTML: https://web.dev/articles/aria-html
- W3C WAI — Using ARIA: https://www.w3.org/TR/using-aria/
- WCAG 2.5.3 Label in Name: https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html
- WebAIM — Screen Reader Testing: https://webaim.org/articles/screenreader_testing/
- W3C, Accessible Name and Description Computation (accname): https://www.w3.org/TR/accname/
- W3C, HTML Accessibility API Mappings (html-aam): https://www.w3.org/TR/html-aam/
- Deque — Accessible Name Computation: https://www.deque.com/axe/core-documentation/api-documentation/
- W3C WAI, Tables Tutorial: https://www.w3.org/WAI/tutorials/tables/
