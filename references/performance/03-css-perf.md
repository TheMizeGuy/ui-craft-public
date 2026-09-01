---
topic: performance
role: reference
scope: css-perf
audience: ui-engineer
---

# CSS Performance: Containment, Compositing, Scroll-Driven Animation

Every claim here is sourced to a public URL, either inline or in the canonical table at the foot of the file.

## `content-visibility: auto`, the highest-impact CSS optimization in 2026

Skips rendering (layout, paint, and style) for offscreen subtrees until the browser needs them.

```css
.article-section,
.card-grid-row,
.comment-thread {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px;
}
```

| Property | What it does |
|----------|--------------|
| `content-visibility: auto` | Skips rendering subtree when offscreen; full rendering when scrolled near viewport |
| `contain-intrinsic-size: auto 500px` | Placeholder size used while subtree is skipped; `auto` learns the real size after first render |

Characteristics:

| Axis | Detail |
|------|--------|
| Browser support | Baseline Newly Available Sept 2024 (all major evergreen browsers) |
| Impact | Order-of-magnitude initial-render reductions on long-scroll pages. web.dev's demo measures roughly 7x (hundreds of milliseconds down to tens). The gain is proportional to how much of the page starts offscreen, so measure your own page rather than quoting a number: a long article or feed sees most of it, a single-viewport landing page sees almost none |
| Pitfall | Scroll-jump if `contain-intrinsic-size` estimate is wrong; use `auto 500px` (not a hard number) to let the browser learn |
| When to use | Long scrolling lists, articles, comment threads, card grids below the fold |
| When NOT to use | Content that affects `scrollIntoView`, find-in-page behavior, or fragment links relying on offscreen layout; anchor-link targets below fold (Chromium has improved this but still not 100%) |
| Debugging | DevTools > Rendering > "Show content-visibility bounds" highlights skipped subtrees |

Source: https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility, https://web.dev/articles/content-visibility.

## CSS containment (`contain` property)

Tells the browser a subtree is isolated from the rest of the page, unlocking layout/paint optimizations.

```css
.widget { contain: layout style paint; }
.card   { contain: content; } /* shorthand for layout style paint + size if children don't reflow */
```

| Value | Effect |
|-------|--------|
| `layout` | Element's layout doesn't affect the rest of the page; children's changes don't escape |
| `style` | CSS counter increments and `content` don't leak out |
| `paint` | Nothing outside the element's box is painted; acts as a clipping boundary |
| `size` | Element can be sized without examining descendants; caller must supply dimensions |
| `strict` | All of the above |
| `content` | `layout style paint` together, the usual recommendation |

Use on isolated widgets (cards, sidebars, chat bubbles, list items). Browsers can skip work outside the box when the inside changes.

Source: https://developer.mozilla.org/en-US/docs/Web/CSS/contain.

## GPU compositing rules

The only CSS properties that animate off the main thread without triggering layout or paint:

| Property | Compositor-only? | Notes |
|----------|-------------------|-------|
| `transform` (translate, rotate, scale, skew) | Yes | Prefer `translate`/`scale`/`rotate` individual properties (spec, cleaner) |
| `opacity` | Yes | |
| `filter` | Yes | Composited; still GPU-expensive on low-end devices |
| `backdrop-filter` | Yes | Very GPU-heavy; measure on mid-range mobile |
| `clip-path` | Partial | Composited when shape is simple (inset, circle); complex paths trigger paint |
| Anything else (`width`, `height`, `top`, `left`, `margin`, `padding`) | No | Triggers layout, so jank risk |

`will-change` is a promotion hint, not a free win:

```css
/* Good: promote only what will actually animate, and only for the duration */
.card:hover { will-change: transform; }

/* Bad: always promoted, costs layer memory forever */
.card { will-change: transform; }
```

Each promoted layer costs GPU memory (~4 bytes per pixel). Hundreds of `will-change` layers will exhaust memory on low-end devices.

Source: https://developer.mozilla.org/en-US/docs/Web/CSS/will-change, https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count.

## Scroll-driven animations

Native, off-main-thread. Zero JS, no jank. Chromium 115+ and Safari 26+; NOT Baseline as of 2026-09 (Firefox still gates it behind a preference). Wrap in `@supports (animation-timeline: view())` and keep the observer path, or accept a no-motion fallback that leaves the end state visible.

```css
/* Progress bar tied to document scroll */
.progress-bar {
  animation: progress linear;
  animation-timeline: scroll(root);
}

@keyframes progress {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* Fade-in when element enters viewport */
.reveal {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 40%;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

| Timeline | Tied to |
|----------|---------|
| `scroll(root)` | Document scroll position |
| `scroll(nearest)` / `scroll(self)` / `scroll(<axis>)` | Nearest ancestor scroll container |
| `view()` | Element's position in viewport (entry, cover, contains, exit ranges) |

Replaces `IntersectionObserver` + `requestAnimationFrame` for reveal-on-scroll, parallax hero, progress indicators, carousel auto-advance where supported; keep the observer path for Firefox until it ships. Source: https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline, https://developer.chrome.com/docs/css-ui/scroll-driven-animations.

## View Transitions

Cross-fade between DOM states with one CSS rule; GPU-composited, off main thread.

```js
// Same-document view transition (Baseline Newly Available Oct 2025; feature-detect for older Firefox)
async function updatePhoto(newSrc) {
  if (!document.startViewTransition) {
    photo.src = newSrc;
    return;
  }
  const t = document.startViewTransition(() => {
    photo.src = newSrc;
  });
  await t.finished;
}
```

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
}

/* Named morph between two different elements */
.hero-img { view-transition-name: hero; }
```

Cross-document (MPA) view transitions shipped Chrome 126+. `@view-transition { navigation: auto; }` in CSS enables cross-document transitions between same-origin pages. Source: https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API, https://developer.chrome.com/docs/web-platform/view-transitions.

## `@layer` cascade order

Predictable cascade reduces specificity wars. Smaller stylesheet, fewer `!important` escalations, fewer overrides.

```css
@layer reset, base, components, utilities;

@layer reset {
  * { box-sizing: border-box; margin: 0; }
}

@layer base {
  :root { --fg: hsl(0 0% 10%); }
  body { color: var(--fg); }
}

@layer components {
  .btn { padding: 0.5rem 1rem; }
}

@layer utilities {
  .p-0 { padding: 0; } /* wins over components by layer order */
}
```

Earlier-declared layers lose to later ones regardless of selector specificity. Unlayered styles are higher priority than any layer. Tailwind v4 uses this natively (`@layer theme, base, components, utilities`). Source: https://developer.mozilla.org/en-US/docs/Web/CSS/@layer.

## `@property` typed custom properties

Custom properties are strings by default, so they animate as strings (which means they don't animate smoothly, they snap). Typed properties animate as numbers / colors / lengths.

```css
@property --brand-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@property --brand-color {
  syntax: "<color>";
  inherits: true;
  initial-value: hsl(210 100% 50%);
}

.card {
  background: conic-gradient(from var(--brand-angle), var(--brand-color), transparent);
  transition: --brand-angle 400ms ease, --brand-color 400ms ease;
}
.card:hover { --brand-angle: 180deg; --brand-color: hsl(340 100% 60%); }
```

Baseline Newly Available 2024. Without `@property`, `transition: --brand-angle ...` does nothing because the engine can't interpolate an untyped string. Source: https://developer.mozilla.org/en-US/docs/Web/CSS/@property.

## Avoid layout thrash

Pattern: read all DOM measurements first, then write all changes. Never interleave.

Bad:

```js
for (const el of items) {
  const top = el.getBoundingClientRect().top; // forces layout
  el.style.transform = `translateY(${top + 10}px)`; // invalidates layout
  // next iteration reads → forces layout again → O(n) layouts
}
```

Good:

```js
// Batch 1: read
const offsets = items.map((el) => el.getBoundingClientRect().top);

// Batch 2: write
items.forEach((el, i) => {
  el.style.transform = `translateY(${offsets[i] + 10}px)`;
});
```

`FastDOM` or `scheduler.postTask` can enforce this in larger codebases. The DevTools Performance panel flags forced synchronous layouts in purple. Source: https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work.

## Critical CSS

Inline critical above-the-fold CSS into the `<head>`; defer the rest.

```html
<head>
  <style>/* 8-15KB of hand-picked or extracted critical rules */</style>
  <link rel="preload" href="/css/app.css" as="style" onload="this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/css/app.css"></noscript>
</head>
```

Extraction tools:

| Tool | Status | Notes |
|------|--------|-------|
| `beasties` | Active (Google) | Fork of Critters, actively maintained as of 2025 |
| `critters` | Archived (Jan 2024) | Migrate to `beasties` |
| `penthouse` | Active | Headless-Chrome-driven extractor |
| Next.js `experimental.optimizeCss` | Built-in | Uses `beasties` under the hood when enabled |

Source: https://github.com/danielroe/beasties, https://web.dev/articles/extract-critical-css.

## Tailwind v4 performance wins

| Win | Why |
|-----|-----|
| CSS-first config (`@theme` in CSS, no `tailwind.config.js`) | Smaller runtime, no Node config eval |
| No PurgeCSS step | Oxide engine ships only utilities actually used; content-aware at build |
| Dynamic utilities (`mt-[17px]`) | Arbitrary values are first-class; less arbitrary-value churn in the bundle |
| Native cascade layers (`@layer`) | Layer order is deterministic; no `@apply` escalation needed |
| Rust-based Oxide scanner | Typical full-rebuild ~3-10x faster than Tailwind v3 JIT |

Migration warning: `@apply` with large utility chains still inlines every declaration. Prefer component classes for genuinely reusable composition; use `@apply` only for small primitives.

Source: https://tailwindcss.com/docs, https://tailwindcss.com/blog/tailwindcss-v4.

## Anti-patterns

| Anti-pattern | Why it hurts | Fix |
|--------------|--------------|-----|
| Animating `top` / `left` / `width` / `height` | Triggers layout + paint every frame | Use `transform: translate(...)` / `scale(...)` |
| `box-shadow` on every item in a long scrolling list | Shadow = large paint area per item; paint cost scales with visible shadow | Use a CSS filter or SVG shadow on a parent, or `isolation: isolate` + layered approach |
| `:has()` in hot selectors (e.g. `body:has(.modal-open)`) | Forces whole-document style recalc on any match change | Use a class on the root element toggled by JS; or scope `:has()` to a small ancestor |
| `@apply` on large utility chains | Inlines every declaration per selector; bloats CSS | Component classes with hand-written CSS; or Tailwind's real component pattern |
| `position: fixed` on scrolling overlays | Forces repaint of overlapping content on every scroll | `position: sticky` where possible; promote to own layer (`will-change: transform`) |
| `backdrop-filter: blur(...)` on large areas | Very GPU-expensive on mid-range mobile | Use sparingly; consider a pre-blurred background image |
| Per-element `will-change: transform` on hundreds of items | Exhausts GPU layer budget | Promote only the few actively animating |
| Importing entire icon fonts for 3 icons | Downloads thousands of glyphs | Inline SVG or `<svg><use href>` sprite |
| Computed-property transitions on untyped custom props | Transition silently no-ops | Register with `@property` |
| Long-lived `:hover` with expensive filter | Repaints while hovered | Use `transform` / `opacity`; reserve filters for small toggles |

## Sources (canonical)

| Topic | URL |
|-------|-----|
| content-visibility | https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility |
| content-visibility guide | https://web.dev/articles/content-visibility |
| CSS containment | https://developer.mozilla.org/en-US/docs/Web/CSS/contain |
| will-change | https://developer.mozilla.org/en-US/docs/Web/CSS/will-change |
| Compositor-only animation | https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count |
| Scroll-driven animations | https://developer.chrome.com/docs/css-ui/scroll-driven-animations |
| animation-timeline | https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline |
| View Transitions | https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API |
| @layer | https://developer.mozilla.org/en-US/docs/Web/CSS/@layer |
| @property | https://developer.mozilla.org/en-US/docs/Web/CSS/@property |
| beasties | https://github.com/danielroe/beasties |
| Extract critical CSS | https://web.dev/articles/extract-critical-css |
| Tailwind v4 | https://tailwindcss.com/blog/tailwindcss-v4 |
| Browser rendering model | https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work |
