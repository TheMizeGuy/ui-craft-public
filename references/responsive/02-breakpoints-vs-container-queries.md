---
topic: responsive
role: reference
scope: query-selection
audience: ui-engineer, ui-reviewer
---

# Breakpoints versus Container Queries

A media query asks how wide the **window** is. A container query asks how wide
the **box this component landed in** is. Most components care about the second
question and are written against the first, which is why a card that looks right
in the main column looks broken in a 320px sidebar on the same 1440px display.

This file supplies the decision rule, the syntax, the containment gotchas that
bite on first use, and the review procedure for catching the wrong choice.

## 1. The decision rule

Ask one question: **can this thing appear at more than one width while the
viewport stays the same?**

- No, it is the window itself or a direct function of it: media query.
- Yes, it is a component that gets placed: container query.

| Decision | Query | Why |
|---|---|---|
| Page shell: one column, sidebar plus main, three-pane | Media | The shell defines the containers. Nothing above it to query |
| Navigation mode: bottom bar, top bar, drawer, rail | Media | Navigation belongs to the window, not to a box inside it |
| Page chrome: sticky header height, gutters, whether a detail pane exists at all | Media | Chrome is a property of the window |
| Modal presentation: full-screen sheet versus centred dialog | Media | Depends on the viewport, not on any parent box |
| Card, tile, list row, stat block, media object | **Container** | Appears in grids, sidebars, drawers, modals, all at one viewport width |
| Form field group, filter panel, comment thread | **Container** | Reused at wildly different widths within one page |
| Table that switches to stacked rows | **Container** | The available width is the table's wrapper, not the window |
| Chart that drops its legend or axis labels when cramped | **Container** | A chart in a dashboard tile and the same chart full-bleed are the same viewport |
| Anything shipped in a component library | **Container** | You cannot know the consumer's layout, so you cannot know the viewport-to-width mapping |
| Print layout, dark mode, reduced motion, coarse pointer | Media | These are not sizes. `@container` cannot express them |

The tell that the wrong one was used: a component's breakpoints only make sense
if you assume one specific page layout. `@media (min-width: 1024px) { .card
{ grid-template-columns: 8rem 1fr } }` is silently asserting that at 1024px the
card is wide. Put that card in a 300px rail and it lays out a 128px image beside
a 172px column of text.

## 2. Container query syntax

```css
/* 1. Declare the host as a query container. The COMPONENT does not query itself. */
.card-host {
  container-type: inline-size;
  container-name: card;
  /* shorthand: container: card / inline-size; */
}

/* 2. Author the narrow layout as the default, no query at all. */
.card {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-s);
}

/* 3. Add capability as the container earns it. */
@container card (width >= 24rem) {
  .card { grid-template-columns: 8rem 1fr; }
}

@container card (width >= 40rem) {
  .card { grid-template-columns: 12rem 1fr 8rem; }
  .card .meta { display: block; }
}

/* Unnamed form matches the nearest ancestor container of the right type. */
@container (width >= 30rem) { .card .subtitle { display: block; } }
```

```html
<aside class="card-host"><!-- 300px: single column --></aside>
<main  class="card-host"><!-- 900px: three columns --></main>
```

Both instances are on the same page at the same viewport width and lay out
differently. That is the entire point, and it is not expressible with media
queries at any level of effort.

| `container-type` | Contains | Cost |
|---|---|---|
| `normal` (default) | Nothing. Style queries only | None |
| `inline-size` | Layout, style, and **inline-size** containment | The element's inline size stops depending on its contents |
| `size` | Layout, style, and both axes | The element collapses unless you give it an explicit block size |

## 3. The containment gotchas, in the order people hit them

1. **A container cannot query itself.** Styles inside `@container` apply to
   descendants. If you size the container from within its own query, you create a
   loop the spec forbids, and the rule is simply ignored. Always use a host
   wrapper plus an inner element.
2. **`container-type: inline-size` makes the element stop hugging its content.**
   Inline-size containment means the box's inline size is computed without
   looking at its children. A `width: max-content` container collapses. If a
   float or shrink-to-fit box needs its content to size it, do not make it the
   container; wrap it.
3. **`container-type: size` collapses to zero height** unless the block size is
   set some other way (an explicit `block-size`, a grid track, `position:
   absolute` with insets). Reach for `size` only when you genuinely query height,
   which is rare.
4. **Container units with no container resolve against the small viewport.**
   `1cqi` in a subtree with no query container ancestor is `1svi`. This produces
   a component that appears to work in isolation and changes behaviour once
   someone wraps it. Always pair `cq` units with a declared container.
5. **`@container` does not accept non-size features.** No `prefers-reduced-motion`,
   no `pointer: coarse`, no `print`. Those stay in `@media` even for a component
   that is otherwise fully container-driven.
6. **Nesting matters.** An unnamed `@container` binds to the nearest ancestor with
   any `container-type`, which may not be the one you meant once a colleague adds
   a container in between. Name containers in any codebase with more than a few.

## 4. Container units, and fluid sizing inside a component

| Unit | 1% of the query container's |
|---|---|
| `cqw` | Width |
| `cqh` | Height |
| `cqi` | Inline size (use this one; it is writing-mode-aware) |
| `cqb` | Block size |
| `cqmin` / `cqmax` | Smaller / larger of `cqi` and `cqb` |

Everything in `references/responsive/01-fluid-and-intrinsic-sizing.md` about
`clamp()` works with `cqi` substituted for `vw`, and the substitution is usually
the correct one for a component. The same math applies: value at container width
A, value at container width B, solve for slope and intercept.

```css
.card-host { container-type: inline-size; container-name: card; }

.card__title {
  /* 18px at a 280px container, 28px at a 720px container */
  /* slope = 10 / 440 = 0.02273 -> 2.273cqi ; intercept = 18 - 0.02273*280 = 11.64px */
  font-size: clamp(1.125rem, 0.727rem + 2.273cqi, 1.75rem);
}

.card { padding: clamp(0.75rem, 0.4rem + 2cqi, 1.5rem); }
```

The zoom rule from file 01 carries over unchanged: only the `rem` term grows when
a user zooms, so keep it dominant. A `cqi`-only font size fails WCAG 1.4.4 in
exactly the way a `vw`-only one does.

## 5. When a media query is still the right answer

Media queries are not legacy. They are the correct tool for the window, and the
shell that establishes every container is a window-level decision.

```css
/* Shell: the one place viewport breakpoints belong */
@media (width >= 48rem) {
  .app { grid-template-columns: 16rem 1fr; }
}
@media (width >= 80rem) {
  .app { grid-template-columns: 16rem 1fr 20rem; }
}
```

Four practices that separate a considered breakpoint set from a copied one:

- **Use range syntax.** `@media (width >= 48rem)` and
  `@media (40rem <= width < 64rem)` read as what they are and remove the
  off-by-one `max-width: 47.99rem` folklore.
- **Author mobile-first**, so the base styles are the narrow case and every query
  adds capability. A `max-width` query that removes capability leaves the narrow
  case defined by subtraction, which is where forgotten overrides accumulate.
- **Prefer `rem` over `px` in media query conditions.** A media query in `px` is
  affected by page zoom but ignores the browser's default font-size setting. In
  `rem` it responds to both, so a user who set their default font to 20px gets
  the layout that matches their text size. See
  `references/responsive/03-zoom-orientation-and-adaptive.md` section 3.
- **Derive breakpoints from where the content breaks**, not from device names.
  Widen the browser slowly and stop where the layout stops looking right; that
  width is the breakpoint. Device-named breakpoints go stale the moment a device
  ships at a new width, and the device matrix in
  `references/review/03-viewport-matrix.md` exists to test the result, not to
  generate the values.

Height also matters and is almost always forgotten: `@media (height <= 32rem)` is
the query that keeps a landscape phone or a short desktop window from losing a
modal's action row. Details in
`references/responsive/03-zoom-orientation-and-adaptive.md` section 5.

## 6. Migrating a viewport-styled component

Before. Correct in the main column of one specific page, wrong everywhere else:

```css
.media-object { display: grid; grid-template-columns: 1fr; gap: .5rem; }
@media (min-width: 768px)  { .media-object { grid-template-columns: 6rem 1fr; } }
@media (min-width: 1200px) { .media-object { grid-template-columns: 10rem 1fr 12rem; } }
```

After. Correct in a rail, a modal, a grid cell and full bleed, with no knowledge
of the page:

```css
.media-object-host { container: media / inline-size; }

.media-object { display: grid; grid-template-columns: 1fr; gap: .5rem; }
@container media (width >= 30rem) { .media-object { grid-template-columns: 6rem 1fr; } }
@container media (width >= 48rem) { .media-object { grid-template-columns: 10rem 1fr 12rem; } }
```

The migration in five steps:

1. Find the component's real breakpoints by measuring **its own width** at the
   viewport widths where the old queries fired. A `min-width: 768px` query on a
   page with a 16rem sidebar and 2rem gutters fires when the component is about
   480px wide, so `30rem` is the honest container threshold. Do not copy the
   viewport numbers across.
2. Add the host wrapper. If the component already has a positioning wrapper, use
   it. Do not put `container-type` on the component itself.
3. Swap `@media` for `@container <name>`, keeping the mobile-first direction.
4. Replace any `vw` units inside the component with `cqi`.
5. Verify by rendering the same component at three container widths on one page,
   which is also the review procedure in section 7.

Feature detection when a legacy browser is in scope:

```css
@supports not (container-type: inline-size) {
  /* Ship the single-column default; do not attempt to emulate. */
}
```

## 7. Review procedure

**Step 1: is any component styled by viewport?** One grep, read the results by
file path, not by count.

```
rg -n '@media' --glob '!**/*global*' --glob '!**/*layout*' src/components/
```

Any `@media (min-width: ...)` inside a component file is a candidate finding. It
is only correct if that component appears in exactly one container in the entire
product, and that claim needs a usage count to back it.

**Step 2: is the component actually reused at more than one width?** Count its
call sites and record the container width at each.

```
rg -l '<MediaObject' src/ | wc -l
```

**Step 3: the sidebar test, which takes about a minute and proves the finding.**
Render the component at a wide viewport inside a narrow box and look at it.

```js
// Paste in the console on any page containing the component.
const el = document.querySelector('.media-object').closest('*');
const probe = document.createElement('div');
probe.style.cssText = 'width:320px;resize:horizontal;overflow:auto;outline:2px dashed red;position:fixed;top:0;right:0;z-index:9999;background:canvas';
probe.append(el.cloneNode(true));
document.body.append(probe);
// Drag the resize handle. If the layout never changes, it is viewport-styled.
```

**Step 4: inventory the containers that do exist.**

```js
[...document.querySelectorAll('*')]
  .map((el) => [el, getComputedStyle(el).containerType])
  .filter(([, t]) => t && t !== 'normal')
  .map(([el, t]) => ({ el: el.className || el.tagName, type: t,
                       name: getComputedStyle(el).containerName || '(unnamed)',
                       width: Math.round(el.getBoundingClientRect().width) }));
```

An empty result on a product with reusable components is itself the finding: the
codebase has no container queries at all, so every component is coupled to one
assumed page layout.

**Step 5: check for the units trap.** `rg -n '\dcq[iwbh]' src/` and confirm each
hit has a `container-type` ancestor. A `cqi` with no container silently means
`svi`.

## 8. Severity guide for query-selection findings

| Condition | Severity |
|---|---|
| Component styled by viewport and demonstrably rendered at two or more container widths, with a visible layout defect at one of them | HIGH |
| Same, but no visible defect yet (it lays out acceptably in both) | MEDIUM. It is a latent break that fires on the next layout change |
| `cq` units with no query container ancestor | MEDIUM. Behaviour changes when anyone adds a container |
| `container-type: size` on an element with no determinate block size, collapsing it | HIGH if content is lost, otherwise MEDIUM |
| Breakpoints named for devices (`$iphone`, `$ipad`) with no content-derived justification | LOW, or MEDIUM as a system-wide pattern |
| Media query used for `prefers-reduced-motion`, `print`, `pointer` | Not a finding. Correct by definition |
| Shell layout using media queries | Not a finding. Correct by definition |

Every finding carries the three geometry contexts required by
`references/review/02-evidence-pipeline.md`: the viewport, the container width,
and the component's own box. For this dimension specifically, the container width
is the whole argument, so a finding without it is not reportable.

## 9. Beyond size: style and scroll-state queries

Two newer container features solve problems that used to require JavaScript.
Verify support against your target browsers before shipping either as the only
path.

```css
/* Style query: react to a custom property set by an ancestor */
.panel { container-name: panel; }
@container panel style(--tone: critical) {
  .panel__icon { color: var(--color-danger); }
}

/* Scroll-state query: style a sticky header's contents only while it is stuck.
   The sticky element is the container, so the rule targets a CHILD: the
   self-styling restriction from gotcha 1 applies here too. */
.header { container-type: scroll-state; position: sticky; top: 0; }
@container scroll-state(stuck: top) {
  .header__bar { box-shadow: var(--shadow-sm); background: var(--surface-raised); }
}
```

Style queries on custom properties ship in Chromium and Safari; scroll-state
queries are Chromium-first. Both degrade to the unqueried default, so they are
safe as progressive enhancement and unsafe as the only way to see a state. A
sticky header that only becomes legible via `scroll-state` needs a base style
that is legible without it.
