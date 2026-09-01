---
topic: responsive
role: reference
scope: fluid-and-intrinsic-sizing
audience: ui-engineer, ui-reviewer
---

# Fluid and Intrinsic Sizing

How a layout adapts to a size it was never authored against. Breakpoints tell a
layout what to do at six widths. Fluid and intrinsic sizing tell it what to do at
all of them, including the ones nobody tested.

This file is written for two readers. An implementer uses the CSS. A reviewer
uses the **Detect** block that follows every technique: what to grep for, what to
measure at runtime, and what number makes it a finding.

Adjacent files: `references/responsive/02-breakpoints-vs-container-queries.md`
decides which query type is correct;
`references/responsive/03-zoom-orientation-and-adaptive.md` covers zoom, reflow,
orientation and safe areas. Token-authoring detail for the design side lives in
`references/design/02-typography.md` (type scale) and
`references/design/03-spacing-rhythm.md` (space scale, subgrid, logical
properties).

## 1. The failure this file exists to catch

A layout that only changes at breakpoints is correct at the widths its author
opened and approximately wrong everywhere else. The symptoms are always the same
three:

| Symptom | Mechanism |
|---|---|
| Type and spacing jump at a breakpoint, then sit still for 500px | Stepped `font-size` per media query, no interpolation between the steps |
| Something is comically large or cramped between two breakpoints | The value was tuned at 1440 and 390, never at 900 |
| The layout is fine at every tested width and wastes half a 2560px display | Fixed `max-width` with no plan for surplus space (`references/review/05-density-and-economy.md`) |

The fix is not more breakpoints. Every breakpoint added is another width that is
right and two ranges that are interpolated by nothing.

## 2. clamp(), with the actual math

`clamp(MIN, PREFERRED, MAX)` returns `PREFERRED` clamped into the range. It
becomes fluid sizing when `PREFERRED` is a straight line through two anchor
points: a value at a small viewport and a value at a large one.

Given a minimum of `vMin` px at viewport `wMin` px, and `vMax` px at `wMax` px:

```
slope     = (vMax - vMin) / (wMax - wMin)      // px of value per px of viewport
intercept = vMin - slope * wMin                // px, the value at viewport 0
preferred = intercept + slope * 100vw
```

The CSS form expresses `intercept` in `rem` and `slope` as `vw` (multiply the
slope by 100 because `1vw` is one percent of the viewport, not one pixel).

Worked example, 16px at a 360px viewport growing to 20px at 1440px:

```
slope     = (20 - 16) / (1440 - 360) = 0.0037037 px per px  ->  0.370vw
intercept = 16 - 0.0037037 * 360     = 14.667px             ->  0.917rem
```

```css
/* 16px @ 360  ->  20px @ 1440 */
font-size: clamp(1rem, 0.917rem + 0.370vw, 1.25rem);
```

Check it: at 360px, `14.667 + 0.370% * 360 = 16.0`. At 1440px,
`14.667 + 0.370% * 1440 = 20.0`. Both anchors land exactly, and the clamp holds
the ends flat outside them.

Generator (paste into any console, no dependencies):

```js
const fluid = (minPx, maxPx, minVw = 360, maxVw = 1440, root = 16) => {
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const intercept = minPx - slope * minVw;
  return `clamp(${(minPx / root).toFixed(3)}rem, ` +
         `${(intercept / root).toFixed(3)}rem + ${(slope * 100).toFixed(3)}vw, ` +
         `${(maxPx / root).toFixed(3)}rem)`;
};

fluid(16, 20);   // clamp(1.000rem, 0.917rem + 0.370vw, 1.250rem)
fluid(24, 40);   // clamp(1.500rem, 1.167rem + 1.481vw, 2.500rem)
fluid(32, 56);   // clamp(2.000rem, 1.500rem + 2.222vw, 3.500rem)
```

A negative first term in the output means the range is too aggressive for the
anchors: `fluid(24, 120)` returns `clamp(1.5rem, -0.5rem + 8.889vw, 7.5rem)`,
which is legal CSS and a warning sign. The rem term is what survives zoom (next
section), so a negative one leaves the value entirely at the mercy of the
viewport. Widen the anchor range or reduce the size jump.

### The rem term is the only part that survives zoom

This is the single most important fact about `clamp()` and it is why a pure `vw`
font size is a defect rather than a style choice.

Page zoom at factor `Z` divides the CSS-pixel viewport: a 1280px window at 200%
zoom reports a 640px viewport. So the computed value becomes
`intercept + slope * (W / Z)`, and the browser then paints it at `Z` device
pixels per CSS pixel:

```
visual size = Z * (intercept + slope * W / Z)
            = Z * intercept + slope * W
```

The `intercept` (the `rem` term) is multiplied by the zoom. The `slope` (the `vw`
term) is completely unaffected. Rearranged, with `remShare` being the rem term's
fraction of the total value at the current width:

```
growth at zoom Z = 1 + remShare * (Z - 1)
```

| Declaration at a 1280px viewport | rem share | Visual growth at 200% zoom |
|---|---|---|
| `font-size: 1.5625vw` (equals 20px at 1280) | 0 | **1.00x, no growth at all** |
| `clamp(1rem, 0.902rem + 0.435vw, 1.25rem)` | 0.72 | 1.72x |
| `font-size: 1.25rem` | 1.0 | 2.00x |

A pure-`vw` font size does not get larger when a user zooms. It is a WCAG 1.4.4
failure by construction (`references/responsive/03-zoom-orientation-and-adaptive.md`
section 2). Keep the rem term at or above roughly 60% of the value at your widest
anchor so a 200% zoom still yields at least 1.6x.

**Detect (clamp)**

- Grep for viewport-only sizing: `rg -n 'font-size:\s*[\d.]+(vw|vmin|vmax)' src/`
  and `rg -n 'clamp\([^)]*\)' src/ | rg -v 'rem|em|px'`. Any `clamp()` whose
  middle argument contains no absolute term is the zoom bug above.
- Runtime, no tooling: read the value at two window widths and check it moved.

```js
// Paste at 1280 wide, then at 400 wide. A fixed number at both = stepped, not fluid.
getComputedStyle(document.querySelector('h1')).fontSize;
```

- Finding threshold: a heading whose computed size is identical at 390px and
  1440px, in a design that has fluid space elsewhere, is a MEDIUM inconsistency.
  A `vw`-only text size at any zoom level is HIGH (accessibility, not taste).

### Type and space scales, briefly

The full authored scales live in `references/design/02-typography.md` (six-step
fluid type scale) and `references/design/03-spacing-rhythm.md` (nine-step fluid
space scale). Reviewers do not need to re-derive them. What matters here:

- One clamp per **step**, not per component. A component computing its own
  `clamp()` inline is how two headings end up on different curves.
- Pick one anchor pair and use it for every step in the system. Anchors that
  drift from step to step (one value done growing at 800px, the next still
  growing at 1280px) make the ratio between two sizes change across the range, so
  a heading and its body text are in proportion at one width and not at another.
  Solve each step from the same `wMin` and `wMax` and the whole scale moves
  together.
- Line height is a ratio, never a clamped px value. `line-height: 1.5` already
  scales with whatever the font size resolved to.

## 3. min() and max(), the two-line versions of a media query

`min()` picks the smallest of its arguments, so it is a cap. `max()` picks the
largest, so it is a floor.

```css
/* Cap: fill the container, but never exceed a reading measure */
.prose { inline-size: min(100%, 65ch); }

/* Floor: fluid gutter that never drops below the safe area on a notched phone */
.bar { padding-inline: max(1rem, env(safe-area-inset-left)); }

/* Fluid width with both ends pinned, no clamp needed */
.panel { inline-size: clamp(20rem, 40vw, 34rem); }

/* Guard a grid track so it can never exceed its own container */
.grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); }
```

That last `min(100%, 18rem)` is not decoration. Without it, a 18rem minimum
track inside a 250px container overflows: `minmax()` treats the minimum as a hard
floor. `min(100%, 18rem)` says "18rem, or the whole container if that is
narrower", which is what the author always meant.

**Detect (min/max)**

- `rg -n 'minmax\(\s*\d' src/` and check each hit for the `min(100%, ...)` guard.
  A bare `minmax(18rem, 1fr)` overflows any container narrower than 18rem plus
  the gap. Reproduce by shrinking to 320px and looking for horizontal scroll.
- `rg -n 'max-width:\s*\d+px' src/` where the same element also sets a percentage
  padding. Mixed absolute cap plus relative padding is where the "correct at
  1440, cramped at 900" class lives.

## 4. Intrinsic sizing: let the content state its own size

| Keyword | Resolves to | Correct when |
|---|---|---|
| `min-content` | The largest unbreakable chunk (longest word, widest cell) | A column that must never force a word to break; a chip row measuring its narrowest legal state |
| `max-content` | Everything on one line, ignoring the container | Tags, chips, badges, table cells that must not wrap. Dangerous on prose: it will overflow |
| `fit-content` | `max(min-content, min(available, max-content))` | Hug the content, but yield to the container when there is not room. The right default for buttons, sidebars, popovers |
| `fit-content(20rem)` | Same, capped at 20rem | A sidebar that hugs its labels up to a limit |
| `auto` | Context dependent (flow, grid and flex all differ) | Only when you can state which of the three algorithms is running |
| `stretch` | Fill the containing block, margins subtracted (the margin box stretches) | Newer than the rest; verify support before relying on it |

```css
/* Sidebar that is as wide as its longest label, capped at 16rem and at half the
   parent, whichever is smaller. The math function goes INSIDE fit-content();
   fit-content() is a sizing function and cannot be an argument to min(). */
.sidebar { inline-size: fit-content(min(16rem, 50%)); }

/* A tag that never wraps its own text */
.tag { inline-size: max-content; }

/* A table column that shrinks to its widest number and no further */
.col-figure { inline-size: min-content; }

/* Inputs that grow with what is typed (Chromium ships this; harmless elsewhere) */
textarea, select { field-sizing: content; }
```

Two rules that catch most intrinsic-sizing bugs:

1. **`width: 100%` everywhere defeats intrinsic sizing.** A block element in
   normal flow is already the width of its container. Writing `width: 100%` adds
   nothing and breaks the moment the element gains padding under
   `box-sizing: content-box`, or sits in a flex row where `100%` means "100% of
   the flex base", not "all of it".
2. **A box sized by the leftover is a bug with a delayed fuse.** An unsized
   column in a `table-layout: fixed`, a lone `1fr` beside fixed siblings, a
   `margin-inline-start: auto`: each looks deliberate at the width it was
   authored against and grows without limit at every larger one. The measured
   case and its severity are in `references/review/05-density-and-economy.md`
   under "Internal distribution".

**Detect (intrinsic sizing)**

- `rg -n 'width:\s*100%' src/` and count. A file where most boxes declare it is
  a system-level smell, not one finding.
- `rg -n 'table-layout:\s*fixed' -A 20 src/` and check every column has a width.
- Runtime: find any child taking a disproportionate share of its parent.

```js
// Children over 40% of their parent's width whose content does not need it
[...document.querySelectorAll('main *')].flatMap((el) => {
  const p = el.parentElement; if (!p) return [];
  const w = el.getBoundingClientRect().width, pw = p.getBoundingClientRect().width;
  if (!pw || w / pw < 0.4) return [];
  const probe = el.cloneNode(true);
  probe.style.cssText = 'position:absolute;visibility:hidden;width:max-content';
  document.body.append(probe);
  const need = probe.getBoundingClientRect().width; probe.remove();
  return need < w * 0.6 ? [{ el: el.className || el.tagName, has: Math.round(w),
                             needs: Math.round(need), share: Math.round(w / pw * 100) + '%' }] : [];
});
```

## 5. Grid that reflows without a single media query

```css
/* Repeat, auto-fit, minmax: the whole responsive card wall in one line */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: var(--space-m);
}
```

`auto-fill` and `auto-fit` differ in exactly one way, and picking the wrong one
is a real defect rather than a preference:

| Keyword | With enough room for 4 tracks but only 2 items |
|---|---|
| `auto-fill` | Creates 4 tracks. Two are empty. The two items stay their minimum width, left-aligned, with a hole to the right |
| `auto-fit` | Creates 4 tracks then collapses the 2 empty ones to zero. The `1fr` maximum lets the two items expand to fill the row |

Use `auto-fit` when items should absorb surplus width (dashboards, media walls,
anything where a hole reads as a bug). Use `auto-fill` when the grid must keep a
stable rhythm regardless of item count, for example a calendar or a stepper where
column three should stay in the same place whether or not it is populated.

Two more patterns worth memorising:

```css
/* Sidebar plus content that wraps to one column with no query.
   The sidebar holds 20rem until the main column would drop under half the row,
   at which point the flex container wraps them into a single column. */
.shell {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-m);
}
.shell > .side { flex-grow: 1;   flex-basis: 20rem; }
.shell > .main { flex-grow: 999; flex-basis: 0; min-inline-size: 50%; }

/* Full-bleed grid: content sits on a capped measure, anything can break out */
.layout {
  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--space-m), 1fr)
    [content-start] min(100% - (2 * var(--space-m)), 68ch) [content-end]
    minmax(var(--space-m), 1fr) [full-end];
}
.layout > *          { grid-column: content; }
.layout > .bleed     { grid-column: full; }
```

**Detect (grid reflow)**

- `rg -n 'grid-template-columns:\s*repeat\(\s*\d' src/`. A hard-coded track count
  (`repeat(3, 1fr)`) with no container or media query is a fixed grid pretending
  to be responsive: at 320px it produces three 80px columns.
- Runtime, at your widest review viewport:

```js
// Column count and track widths of every grid on the page
[...document.querySelectorAll('*')]
  .filter((el) => getComputedStyle(el).display.includes('grid'))
  .map((el) => ({ el: el.className || el.tagName,
                  tracks: getComputedStyle(el).gridTemplateColumns }));
```

- Finding threshold: any grid whose resolved `gridTemplateColumns` is identical
  at 390px and 1440px, and whose tracks therefore squeeze rather than reflow.

## 6. aspect-ratio

```css
.thumb  { aspect-ratio: 16 / 9; inline-size: 100%; object-fit: cover; }
.avatar { aspect-ratio: 1; inline-size: clamp(2rem, 4vw, 3rem); }
.card   { aspect-ratio: 4 / 3; }
/* Supported across every evergreen browser; the padding-top percentage hack
   it replaced is now a maintenance liability, not a fallback. */
```

Rules that matter:

- `aspect-ratio` only applies when the other dimension is not otherwise
  determined. If both `inline-size` and `block-size` are set, the ratio is
  ignored. If content is taller than the ratio allows, the box grows unless you
  add `min-block-size: 0` (in grid or flex contexts) or `overflow: hidden`.
- On `<img>`, set the `width` and `height` **attributes** as well. The browser
  derives the ratio from them before CSS loads, which is what actually prevents
  layout shift. `aspect-ratio` in a stylesheet arrives too late for the first
  paint in a render-blocking-CSS-free setup.
- A media box with no reserved ratio is a CLS defect, not only an aesthetic one
  (`references/performance/01-core-web-vitals.md`).

**Detect (aspect-ratio)**

```js
// Images and iframes with no reserved space: the CLS and reflow suspects
[...document.querySelectorAll('img, iframe, video')]
  .filter((el) => !(el.getAttribute('width') && el.getAttribute('height')) &&
                  getComputedStyle(el).aspectRatio === 'auto')
  .map((el) => el.currentSrc || el.src || el.tagName);
```

## 7. Viewport units, and exactly why 100vh is wrong on mobile

`vh` is defined against the **large** viewport: the height the page would have if
every retractable browser bar were hidden. On a mobile browser the bars are
usually visible, so `100vh` is taller than the visible area from the first paint
onward, typically by 60 to 90 CSS px on iOS Safari and a similar amount on
Chrome for Android.

The consequences are concrete: a `100vh` hero pushes its call to action under the
address bar; a `100vh` modal puts its confirm button off-screen with no way to
scroll to it because the modal also has `overflow: hidden`; a `min-height: 100vh`
page body gains a scrollbar that has nothing to scroll to.

| Unit | Resolves against | Use for |
|---|---|---|
| `svh` | Small viewport, all dynamic bars **shown**. Never changes during scroll | The conservative default. Full-height panels that must never overflow |
| `lvh` | Large viewport, bars **hidden**. Never changes during scroll | Backgrounds and decorative fills that should cover when bars retract |
| `dvh` | Dynamic, the current state. Changes as bars slide | Modals and sticky drawers that must track the visible area. Costs re-layout on every change, so do not put it on a scroll container's children |
| `vh` | Same as `lvh` | Desktop-only surfaces, or never |
| `svi/lvi/dvi`, `svb/lvb/dvb` | Inline and block axis equivalents | Writing-mode-aware layouts |

```css
/* Conservative: never overflows, may leave a strip when bars retract */
.sheet { block-size: 100svh; }

/* Tracks the visible area exactly; accept the re-layout */
.modal { position: fixed; inset: 0; block-size: 100dvh; }

/* Fill the paint area, size the content to the safe area */
.hero  { min-block-size: 100lvh; padding-block-end: max(2rem, env(safe-area-inset-bottom)); }
```

**Detect (viewport units)**

- `rg -n '\b\d+vh\b' src/` is the whole audit. Every hit is either desktop-only
  or a bug. Rank a `100vh` on a modal, sheet, drawer or full-height form as HIGH
  (content can be unreachable); a `100vh` decorative hero as MEDIUM.
- Runtime proof for a finding: `innerHeight` versus `visualViewport.height`
  versus the element box.

```js
({ layoutViewport: innerHeight,
   visual: Math.round(visualViewport.height),
   el: Math.round(document.querySelector('.modal').getBoundingClientRect().height) });
```

## 8. Responsive images are a sizing decision, not only a performance one

An image is the one element that can be simultaneously too big to download and
too small to look sharp. Both failures are sizing failures, and both are caught
with the same measurement.

```html
<!-- Fluid image: width descriptors plus a sizes hint that matches the LAYOUT -->
<img
  src="/hero-800.jpg"
  srcset="/hero-400.jpg 400w, /hero-800.jpg 800w, /hero-1600.jpg 1600w, /hero-2400.jpg 2400w"
  sizes="(min-width: 64rem) 640px, (min-width: 40rem) 50vw, 100vw"
  width="1600" height="900"
  alt="..." >

<!-- Fixed-size image: density descriptors, no sizes needed -->
<img src="/logo.png" srcset="/logo.png 1x, /logo@2x.png 2x, /logo@3x.png 3x"
     width="120" height="32" alt="..." >

<!-- Art direction: a different CROP, not merely a different size -->
<picture>
  <source media="(min-width: 48rem)" srcset="/scene-wide.avif" type="image/avif">
  <source media="(min-width: 48rem)" srcset="/scene-wide.jpg">
  <source srcset="/scene-square.avif" type="image/avif">
  <img src="/scene-square.jpg" width="800" height="800" alt="..." >
</picture>
```

The rule people get wrong: **`sizes` describes the width the image will occupy in
the layout, not the width of the file.** `sizes="100vw"` on an image that renders
in a 400px column at a 1600px viewport tells the browser to fetch the 1600w file
for a 400px slot. Nothing looks broken. The page is four times heavier than it
needs to be, and the `sizes` value silently rots every time the layout changes.

Recent Chromium and Firefox support `sizes="auto"` on `loading="lazy"` images,
which lets the browser use the real laid-out width and removes the rot entirely.
Ship an explicit `sizes` alongside it when you cannot verify support in your
target browsers.

Related sizing controls:

- `object-fit: cover` plus `object-position` decides what gets cropped when the
  box ratio and image ratio disagree. Without it, `width: 100%; height: 200px`
  distorts the image.
- `image-set()` is the CSS-background equivalent of `srcset` density
  descriptors: `background-image: image-set("bg.avif" type("image/avif") 1x, "bg@2x.avif" 2x);`
- Icons and logos belong in SVG. A raster logo has no correct `2x` on a 3x
  display and no correct size in a fluid header at all.

**Detect (responsive images)**

```js
// Over- and under-served images. ratio > 1.5 wastes bytes; < 1.0 renders blurry.
[...document.images].map((img) => {
  const w = img.getBoundingClientRect().width;
  return { src: (img.currentSrc || img.src).split('/').pop(),
           css: Math.round(w),
           natural: img.naturalWidth,
           ratio: +(img.naturalWidth / (w * devicePixelRatio)).toFixed(2),
           hasSizes: img.hasAttribute('sizes') };
}).filter((r) => r.ratio > 1.5 || r.ratio < 1).sort((a, b) => b.ratio - a.ratio);
```

- `rg -n '<img' -A 3 src/ | rg -v 'srcset|width=' ` finds images with neither a
  candidate set nor reserved dimensions.
- Finding threshold: an above-the-fold image served at more than 2x the pixels it
  displays is HIGH on mobile (bytes on a metered connection) and MEDIUM on
  desktop. A `ratio` under 1.0 on any 2x display is a visible-quality HIGH.

## 9. Anti-pattern table

| Anti-pattern | Why it fails | Replace with |
|---|---|---|
| Stepped `font-size` in four media queries | Jumps at four widths, static between them | One `clamp()` per type step |
| `font-size: 4vw` | Does not respond to zoom at all (WCAG 1.4.4) | `clamp()` with a rem term at 60% or more of the value |
| `clamp()` recomputed inline per component | Two headings on two different curves | One token per scale step, consumed everywhere |
| `minmax(18rem, 1fr)` | Overflows any container under 18rem | `minmax(min(100%, 18rem), 1fr)` |
| `repeat(3, 1fr)` as "the responsive grid" | Squeezes to three 80px columns at 320px | `repeat(auto-fit, minmax(min(100%, X), 1fr))` |
| `width: 100%` on every block | Defeats intrinsic sizing, breaks in flex | Default flow width; `max-inline-size` for caps |
| `height: 100vh` on a sheet or modal | Content under browser chrome, unreachable | `100svh` (safe) or `100dvh` (tracks bars) |
| Fixed `px` heights on text-bearing controls | Clips at 200% zoom and at large text settings | `min-block-size` plus padding in `em` |
| `max-width: 1200px` with no plan above it | Dead space on wide displays with no compensating use | A width decision per surface: see the decision list in `references/review/03-viewport-matrix.md` |
| `sizes="100vw"` on a column-constrained image | Fetches 4x the pixels needed | `sizes` that mirrors the actual layout, or `sizes="auto"` with lazy loading |
| Raster logo in a fluid header | No correct density, no correct size | SVG |
| Animating `width`/`height` between fluid values | Layout thrash on every frame | `transform: scale()`, or `interpolate-size: allow-keywords` where supported |

## 10. Review procedure for this file's dimension

Run in this order. Each step is cheap and each produces a number a finding can
quote (the geometry evidence rule in
`references/review/02-evidence-pipeline.md` requires viewport, container and
component box on any spatial claim).

1. **Grep the four smells**: `\d+vh`, `font-size:\s*[\d.]+vw`, `width:\s*100%`,
   `minmax\(\s*\d`. Under a minute, and it usually finds the actual bug.
2. **Read one type step and one space token.** If they are not `clamp()` or not
   token-driven, the whole system is stepped and everything below is a symptom.
3. **Measure at three widths, not six.** The narrowest in the matrix, one width
   between breakpoints (pick 900px, which almost nobody designs at), and the
   widest. The between-breakpoint width is where fluid failures live.
4. **Compare computed values across those widths** with the snippets above. A
   value that never moves in a system that claims to be fluid is the finding.
5. **Check the surplus-width plan at the widest width** against the utilisation
   thresholds in `references/review/05-density-and-economy.md`. Under 60% with no
   second column and no reading-measure justification is HIGH there, and this
   file supplies the mechanism to fix it: widen the measure to its cap, add a
   track with `auto-fit`, or promote a rail.
6. **Zoom to 200% and 400%** before writing the report
   (`references/responsive/03-zoom-orientation-and-adaptive.md`). Fluid sizing
   and zoom fail together often enough that finding one means checking the other.
