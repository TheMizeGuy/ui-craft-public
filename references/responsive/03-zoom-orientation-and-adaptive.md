---
topic: responsive
role: reference
scope: zoom-orientation-adaptive
audience: ui-engineer, ui-reviewer
---

# Zoom, Orientation, and Adaptive Contexts

Width is the axis everyone tests. The failures that actually reach users come
from the other four: how far the page is zoomed, how short the window is, how
many windows the app is sharing the screen with, and what physically covers the
display.

All of it belongs in the responsive lens rather than only in the accessibility
one. WCAG 1.4.10 Reflow is defined as a layout requirement at 320 CSS pixels; it
is the responsive contract with a conformance number attached. A reviewer who
tests reflow without the layout vocabulary can say it broke but not why; a
reviewer who tests widths without zoom never sees the most common fluid-sizing
bug there is.

Companion files: `references/responsive/01-fluid-and-intrinsic-sizing.md` (why
the rem term is what survives zoom) and
`references/responsive/02-breakpoints-vs-container-queries.md` (why media query
units matter here). Conformance wording for every criterion cited below is in
`references/accessibility/01-wcag-2-2.md`.

## 1. The four modes, and what each one actually tests

| Mode | Setting | Tests |
|---|---|---|
| Page zoom 200% | Browser zoom on a 1280px window | Whether anything is lost at 2x. Layout viewport becomes 640px |
| Page zoom 400% | Browser zoom on a 1280x1024 window | Reflow: 320 CSS px wide, 256 CSS px tall |
| Text-only zoom 200% | Firefox "Zoom text only", or a raised browser default font size | Whether the layout is in relative units at all. Boxes do **not** grow, only text |
| Text spacing overrides | The 1.4.12 CSS block in section 4 | Whether text containers have room to breathe |

Run all four. They fail independently and for different reasons: page zoom
catches fixed viewports and overflow traps, text-only zoom catches `px` sizing,
and text spacing catches fixed heights.

## 2. WCAG 1.4.4, resize text to 200%

**Requirement:** text can be resized up to 200% with no loss of content or
functionality, without assistive technology.

**Test:** open at 1280x1024, zoom until the browser's indicator reads 200%, then
walk the primary task end to end. Everything that was readable and operable must
still be readable and operable.

**What breaks, in descending order of frequency:**

| Break | Root cause | Fix |
|---|---|---|
| Button labels clip or ellipsis out | Fixed `height` or `width` in px on a text-bearing control | `min-block-size` plus `padding-block` in `em` |
| Two-line label overlaps the row below | `height` set, `overflow: hidden` | Let the box grow; cap with `-webkit-line-clamp` only where truncation is intended and the full text is reachable |
| Nav items collapse into each other | Horizontal nav on a fixed track with no wrap | `flex-wrap: wrap` plus a defined wrapped state, or switch to the narrow nav mode |
| Text stops growing entirely | `font-size` in `vw` or `cqi` with no `rem` term | See file 01, section 2. This is a hard 1.4.4 failure |
| Modal action row moves off-screen | `height: 100vh` on the dialog with internal `overflow: hidden` | `max-block-size: 100dvh` with the body scrollable and the footer outside the scroll area |
| Sticky header eats the viewport | Header height in `px`, content offset by the same px, header grows with the text | Offset with the measured header height, or make the header non-sticky under a height threshold |

**Detect:**

```js
// Elements whose text overflows their own box. Run at 100%, then at 200% zoom.
const sel = 'button, a, label, h1, h2, h3, td, th, li';
[...document.querySelectorAll(sel)]
  .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
  .map((el) => ({ el: el.className || el.tagName,
                  text: el.textContent.trim().slice(0, 30),
                  box: `${Math.round(el.clientWidth)}x${Math.round(el.clientHeight)}`,
                  content: `${el.scrollWidth}x${el.scrollHeight}` }));
```

An element that passes at 100% and appears in this list at 200% is a 1.4.4
finding with its own evidence attached.

## 3. Page zoom versus text-only zoom

They are different mechanisms and they catch different bugs. A page can pass one
and fail the other.

| | Page zoom | Text-only zoom / raised default font size |
|---|---|---|
| What scales | Everything. The CSS pixel itself gets bigger | Only lengths expressed in `rem`, `em`, `ch`, `ex` |
| Effect on the viewport | Layout viewport shrinks by the zoom factor | Unchanged |
| Effect on media queries | `px` conditions fire at the new smaller viewport | `px` conditions do not react at all; `em`/`rem` conditions do |
| Catches | Overflow, fixed widths, unreachable content | `px` sizing, fixed heights, hard-coded root font size |

How users reach text-only zoom: Firefox has an explicit "Zoom text only" mode
under View, Zoom. Chrome, Edge and Firefox each expose a default-font-size
setting (Appearance in Chromium, Fonts in Firefox) which changes what `1rem`
means, commonly to 20px or 24px; Safari exposes a minimum font size rather than a
default, which produces the same class of failure on small text.

**The bug that defeats all of it, in two lines of CSS:**

```css
html { font-size: 16px; }   /* pins the root: the user's font setting now does nothing */
html { font-size: 62.5%; }  /* the "1rem = 10px" trick: also pins it, in percent clothing */
```

Setting the root font size in `px` overrides the user's preference outright. The
`62.5%` variant is relative so it does technically follow the setting, but it
silently rescales every token in the system by 0.625 and encourages authors to
write `1.6rem` meaning "16px", which is `px` thinking with `rem` syntax. The safe
root is no declaration at all, or `font-size: 100%`.

**Detect:**

```
rg -n 'html\s*\{[^}]*font-size' src/
rg -n ':root\s*\{[^}]*font-size' src/
rg -c 'px' src/**/*.css   # then read the hits: px on borders and shadows is fine,
                          # px on font-size, line-height, min-height and container caps is not
```

Runtime check, no browser settings required:

```js
// Simulate a user whose default font is 24px. Anything that does not move is px-sized.
document.documentElement.style.fontSize = '24px';
// ...inspect, screenshot, then:
document.documentElement.style.fontSize = '';
```

A layout that is visually identical before and after that line is a layout in
`px`, and the finding is systemic rather than per-component.

## 4. WCAG 1.4.10 Reflow, the responsive requirement with a number

**Requirement:** content is presented without loss of information or
functionality and without requiring scrolling in two dimensions at a width
equivalent to 320 CSS px for vertically scrolling content, or a height equivalent
to 256 CSS px for horizontally scrolling content. Parts that genuinely require
two-dimensional layout are exempt: data tables, maps, diagrams, code with
meaningful indentation, and interfaces where a toolbar must stay adjacent to a
canvas.

Where the numbers come from: 1280 CSS px at 400% zoom is 320 CSS px, and 1024 at
400% is 256. That is why the target is 320 rather than the width of any
particular phone.

**Test, two equivalent routes:**

1. Window at 1280x1024, browser zoom to 400%. This is the literal criterion.
2. Viewport resized to 320x256 at 100% zoom. Faster in a headless run and
   equivalent for layout purposes, though it does not reproduce zoom-specific
   rounding.

**What breaks:**

| Break | Cause |
|---|---|
| Horizontal scrollbar on the document | A fixed `min-width` in px on the shell, a `minmax()` track with no `min(100%, ...)` guard (file 01, section 3), or an overflowing image |
| Sticky header plus sticky footer leave a two-line gap of content | Chrome heights fixed in px while the available height is 256 |
| The primary action is off the right edge | A toolbar laid out in a single non-wrapping row |
| Content is there but the page scrolls in both directions | Something wider than the viewport, usually one element. Find it with the snippet below |
| A modal is 600px wide inside a 320px viewport | Fixed dialog width with no `max-inline-size: min(90vw, 32rem)` |

**Detect the exact offending element:**

```js
// Every element wider than the viewport, narrowest ancestor first.
const vw = document.documentElement.clientWidth;
[...document.querySelectorAll('*')]
  .map((el) => ({ el, r: el.getBoundingClientRect() }))
  .filter(({ r }) => r.width > vw + 1 || r.right > vw + 1)
  .map(({ el, r }) => ({ el: el.tagName + '.' + (el.className || ''),
                         w: Math.round(r.width), right: Math.round(r.right), vw }))
  .slice(0, 20);
```

**1.4.12 Text Spacing** belongs to the same test pass. Apply the override and
look for clipping or overlap:

```css
* {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p { margin-block-end: 2em !important; }
```

Any container that clips, overlaps a neighbour, or hides text under this block
has a fixed height it should not have.

**Severity:** loss of content or of a control at 320 CSS px is HIGH, and CRITICAL
when it blocks the primary task. Two-dimensional scrolling on content that does
not need it is HIGH. Cosmetic crowding that stays fully usable is MEDIUM.

## 5. Orientation is an aspect ratio, not a width

`@media (orientation: landscape)` is defined as `width >= height`. It says
nothing about how wide the viewport is. A 1024x768 desktop window is landscape;
a tall narrow desktop window is portrait; a phone in landscape is landscape at
667x375 and a tablet is landscape at 1080x810. Treating "landscape" as a width
band is the modelling error, and it produces a review that resizes to 667px wide,
leaves the height at 900, and tests nothing that landscape actually changes.

**What landscape changes is the height.** A phone in landscape has roughly 375
CSS px of viewport height, and browser chrome plus an open keyboard can take more
than half of that.

```css
/* Short viewport: the query that keeps landscape phones usable */
@media (height <= 32rem) {
  .hero          { min-block-size: auto; padding-block: var(--space-s); }
  .modal         { max-block-size: 100dvh; }
  .modal__body   { overflow-y: auto; }        /* footer stays outside the scroll */
  .site-header   { position: static; }        /* stop spending scarce height on chrome */
}

/* Genuine aspect-ratio decisions: media that must not letterbox */
@media (aspect-ratio < 1) { .player { aspect-ratio: 1; } }
```

**Review criteria for orientation:**

1. Rotate every phone-class viewport to landscape with the **height reduced to
   match** (390x844 becomes 844x390). Resizing only the width proves nothing.
2. Check the primary action is still reachable without scrolling past the fold in
   a task the user is mid-way through.
3. Open a form field so the keyboard appears (or simulate with a 200px viewport
   height) and confirm the focused input and its submit control are both visible.
4. Confirm nothing is locked to one orientation without a stated reason. A web
   app that only works in portrait fails WCAG 1.3.4 Orientation unless the
   orientation is essential, which for a camera or a piano keyboard it can be.
5. Check `100vh` and `100svh` heroes in landscape: a full-height hero on a 390px
   tall viewport shows the headline and nothing else.

## 6. Multi-window, foldables, and split screen: window width is not device width

Every current platform lets an app run at a width unrelated to the hardware:
Android split screen and free-form windows, iPad Split View and Slide Over,
iPadOS windowing where any app can be dragged to an arbitrary size, macOS and
Windows tiling, and browser windows a user simply narrowed.

**The one criterion that covers all of it:** no layout decision may be keyed to a
device model, screen size, or user-agent string. Every decision keys to the
current window or container size, and the layout must survive that size changing
at runtime without a reload.

| Context | Checkable criterion |
|---|---|
| Android split screen | The app is correct at compact width (under 600dp) even on a tablet. Window size classes: compact under 600dp, medium 600 to 839, expanded 840 to 1199, large 1200 to 1599, extra-large 1600 and up |
| iPad Split View and Slide Over | Correct at roughly a third of the screen. A layout keyed to "iPad means wide" fails here first |
| iPadOS and desktop windowing | Resizing the window mid-task keeps state, scroll position and focus. Nothing re-mounts |
| Foldable, unfolded | Content is not bisected by the hinge. Query with `@media (horizontal-viewport-segments: 2)` and offset using `env(viewport-segment-width 0 0)` and `env(viewport-segment-left 1 0)` where supported |
| Foldable, folded | Correct at roughly 360dp, which is the narrow phone case already in the matrix |
| Installed PWA with window controls overlay | `@media (display-mode: window-controls-overlay)` plus `env(titlebar-area-x/y/width/height)` keeps controls out from under the title bar |

```css
/* Two-pane layout that respects a hinge when there is one */
@media (horizontal-viewport-segments: 2) {
  .shell {
    display: grid;
    grid-template-columns: env(viewport-segment-width 0 0) 1fr;
    column-gap: calc(env(viewport-segment-left 1 0) - env(viewport-segment-width 0 0));
  }
}
```

**Detect:**

- `rg -ni 'ipad|iphone|android|userAgent|navigator\.platform' src/` and read every
  hit. Any layout branch on device identity is a finding of its own, independent
  of whether it currently produces the right result.
- Resize the window during an in-progress task (a form half filled, a list
  scrolled) and confirm nothing resets. A React tree that re-mounts on a
  breakpoint change loses state; a component keyed by a `useMediaQuery` result is
  the usual cause.

Viewport-segment and window-controls-overlay features are Chromium-led. Treat
them as progressive enhancement: the single-pane layout must be correct on its
own, and the segment query only improves it.

## 7. Density and pixel ratio

| Concern | Rule | Detect |
|---|---|---|
| Raster assets | Ship 1x, 2x and 3x through `srcset` density descriptors, or use SVG (file 01, section 8) | Any `<img>` with a single raster candidate and no `srcset` |
| Background images | `image-set()` with density descriptors | `rg -n 'background-image:\s*url' src/` |
| Hairlines | A 1px border is 1 CSS px at every density and looks correct. `0.5px` is a device-pixel trick that renders as 0 or 1 unpredictably | `rg -n '0\.5px' src/` |
| Canvas and charts | Scale the backing store by `devicePixelRatio` and the CSS box separately, or the render is blurry at 2x | Compare `canvas.width` to `rect.width * devicePixelRatio` |
| Density media query | `@media (min-resolution: 2dppx)` for asset swaps only, never for layout | Layout inside a resolution query is a finding |

```js
// Canvases whose backing store does not match their display density
[...document.querySelectorAll('canvas')].map((c) => {
  const r = c.getBoundingClientRect();
  return { el: c.className || 'canvas', css: Math.round(r.width),
           store: c.width, expected: Math.round(r.width * devicePixelRatio),
           blurry: c.width < r.width * devicePixelRatio };
});
```

## 8. Safe areas: a two-part rule, not one property

`env(safe-area-inset-top | right | bottom | left)` resolves to **zero** unless
the document opts into drawing under the device's inset areas. Both parts are
required, and shipping only the CSS half is the most common way this fix gets
marked resolved while changing nothing:

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.action-bar {
  padding-block-end: max(var(--space-s), env(safe-area-inset-bottom));
  padding-inline: max(var(--space-s), env(safe-area-inset-left),
                                      env(safe-area-inset-right));
}
```

Rules that follow from that:

- Wrap every inset in `max()` with the design's own padding. A bare
  `padding-bottom: env(safe-area-inset-bottom)` gives a device without insets
  zero padding, which is worse than what it replaced.
- Landscape matters as much as portrait. On a notched phone rotated sideways the
  inset moves to `left` or `right`, so a bar that only handles `bottom` puts its
  first control under the notch.
- Apply insets to the fixed or sticky element that actually touches the edge, not
  to `body`. Padding on `body` leaves a `position: fixed` bar exactly where it
  was.
- `viewport-fit=cover` is also what lets a background reach the physical edges.
  Without it the page is letterboxed by the safe area and the design looks
  inset for reasons no CSS explains.

**Detect:** `rg -n 'safe-area-inset' src/` and `rg -n 'viewport-fit' src/`. Insets
present with no `viewport-fit=cover` in the document head is a HIGH finding: the
mitigation that shipped is inert. `viewport-fit=cover` with no insets used
anywhere is also a finding, in the other direction, because content is now free
to render under the notch and the home indicator.

### The on-screen keyboard

The keyboard is a viewport change that most layouts never handle. By default a
mobile browser resizes the visual viewport but not the layout viewport, so
`position: fixed` bottom bars stay under the keyboard.

```html
<!-- Chromium: make the keyboard resize the layout viewport too -->
<meta name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover,
               interactive-widget=resizes-content">
```

```js
// Portable fallback: track the visual viewport and expose it as a custom property
const sync = () => document.documentElement.style.setProperty(
  '--kb', `${Math.max(0, innerHeight - visualViewport.height)}px`);
visualViewport.addEventListener('resize', sync);
visualViewport.addEventListener('scroll', sync);
sync();
```

```css
.form-actions { padding-block-end: max(var(--kb, 0px), env(safe-area-inset-bottom)); }
```

Review criteria: with a field focused and the keyboard open, the focused input,
its validation message, and the submit control are all visible without the user
dismissing the keyboard. On a landscape phone this is the check that fails most.

### Reach and occlusion

Reach is a viewport-height fraction, which is why it belongs here rather than in
a device table: the bands move with the window, not with the model name.

| Band, measured from the bottom of the viewport | One-handed reach | Put here |
|---|---|---|
| 0 to 33% | Easy | Primary actions, navigation, the control the user came for |
| 33 to 66% | Stretch | Content, secondary controls |
| 66 to 100% | Hard, and partly occluded by the holding hand at the far top corner | Titles, status, back and close (learned positions) |

```js
// Where are the primary actions? Run at a phone-class viewport.
[...document.querySelectorAll('button, [type=submit], a.btn')].map((el) => {
  const r = el.getBoundingClientRect();
  return { label: el.textContent.trim().slice(0, 24),
           fromBottom: Math.round(((innerHeight - r.bottom) / innerHeight) * 100) + '%',
           band: innerHeight - r.bottom < innerHeight * 0.33 ? 'easy'
               : innerHeight - r.bottom < innerHeight * 0.66 ? 'stretch' : 'hard' };
});
```

Finding threshold: on a viewport 430 CSS px wide or narrower, a primary action
sitting in the hard band while the easy band carries only decoration or secondary
content is MEDIUM, and HIGH when the action is the one the screen exists for.
Report the measured percentage, per the geometry evidence rule in
`references/review/02-evidence-pipeline.md`.

## 9. The pass, condensed

Ten checks, roughly fifteen minutes on a web surface, each producing a number:

| # | Check | Fails at |
|---|---|---|
| 1 | Zoom to 200% at 1280 wide, walk the primary task | Any clipped label or unreachable control (HIGH, 1.4.4) |
| 2 | Zoom to 400% at 1280x1024, or resize to 320x256 | Two-dimensional scroll, lost content (HIGH, 1.4.10) |
| 3 | Apply the 1.4.12 text-spacing block | Clipping or overlap (MEDIUM to HIGH) |
| 4 | Set the root font size to 24px and compare | Nothing moves, so the layout is px-based (MEDIUM, systemic) |
| 5 | Rotate phone viewports with the height reduced | Action row off-screen, hero eats the viewport (HIGH) |
| 6 | Focus a field so the keyboard opens | Submit or validation hidden (HIGH on a form-bearing screen) |
| 7 | Narrow the window to a third of the screen mid-task | State loss, re-mount, broken layout (HIGH) |
| 8 | Grep for device-identity branches | Any hit (MEDIUM, latent) |
| 9 | Grep `safe-area-inset` against `viewport-fit` | Insets without the meta, or the meta without insets (HIGH) |
| 10 | Measure primary-action bands at a phone width | Primary action in the hard band (MEDIUM to HIGH) |

Group the results by failure family rather than by mode, the same way the width
matrix is de-duplicated in `references/review/03-viewport-matrix.md`. One entry
reading "fixed px heights clip at 200% zoom and under text spacing overrides, six
components" beats six entries that each name one component.
