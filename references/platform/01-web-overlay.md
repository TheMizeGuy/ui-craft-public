# Web Platform Overlay

Additional review expectations when reviewing web UIs (HTML/CSS/JS frameworks).

## Layout fundamentals

Structural choices. The sizing and fluidity rows moved into `## Responsive checks` below,
where they belong and where they now carry detection procedures.

| Check | Expectation | Anti-pattern | How to detect |
|---|---|---|---|
| Grid vs Flexbox | Grid for 2D page/section layout; Flexbox for 1D alignment | Flexbox for card grids, Grid for single-row nav | Grep `flex-wrap` on a container whose children are equal-width cards: that is a grid written in flexbox, and its last row will not align. Grep `display: grid` / `grid` with a single implicit row and no `grid-template-columns`: that is flexbox written in grid |
| Subgrid | Use when nested elements need shared tracks (card grids, forms) | Nested Grid without subgrid when tracks should align | Render 3+ cards with different title lengths. If the metadata rows do not sit on a shared baseline across cards, the inner grid needs `grid-template-rows: subgrid` and the card needs to span the parent's rows |
| Logical properties | `padding-inline`, `margin-block`, `max-inline-size` for i18n | Physical properties (`padding-left`) when layout should flip for RTL | Only a defect when the product ships RTL. Confirm first (locale list, `dir` handling), then grep `padding-left`, `padding-right`, `margin-left`, `margin-right`, `left:`, `right:`, `text-align: left` in components. In Tailwind that is `pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`, `text-left` versus the logical `ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start` |

## Typography (web-specific)

| Check | Expectation |
|---|---|
| Body text >= 16px on mobile | Prevents iOS auto-zoom on inputs |
| Line length 45-75 characters | Readability standard |
| Variable fonts over multiple statics | One file replaces 6-12 |
| Subset to Latin when possible | Reduces font payload |
| `font-display: swap` or `optional` | Controls FOIT/FOUT |
| System font fallback stack | Prevents blank text on font failure |
| Tabular figures for data columns | Prevents jumping numbers |

## Color (web-specific)

| Check | Expectation |
|---|---|
| OKLCH for core tokens | Perceptually uniform, P3 gamut |
| Three-tier token system | Primitive -> semantic -> component |
| `light-dark()` for theme | CSS-native dark mode |
| `color-mix()` for variants | Derived shades from base tokens |
| No hard-coded hex in components | Use token references |

## CSS architecture

| Check | Expectation |
|---|---|
| `@layer` for cascade control | Predictable specificity |
| Design tokens in CSS custom properties | Or DTCG format compiled to CSS vars |
| `content-visibility: auto` for long pages | Skips render work for offscreen subtrees; the gain scales with how much of the page starts offscreen |
| No `!important` outside reset/utility | Cascade smell |
| `@property` only when needed | Typed/animatable custom properties |

## Responsive checks (web-specific additions)

The responsive dimension itself, including the viewport matrix, fluid type and space scales,
container-query patterns, and media sizing, is owned by `references/responsive/` and the
responsive reviewer. This section is the web-platform overlay on top of it: the checks that
only exist because the platform is the browser. Every row states what to run or grep, and
what result counts as a defect. Do not report a row from this table without having done its
detection step.

| Check | Detection procedure | Defect threshold |
|---|---|---|
| **Fluid spacing** | Grep the section- and page-level spacing declarations: `padding:`, `padding-block`, `gap:`, `margin-block`, and in Tailwind `p-`, `py-`, `gap-`, `space-y-` on layout containers. Count how many are a fixed token versus a `clamp()`/`min()`/`max()` expression or a fluid custom property | A page whose section rhythm is entirely fixed tokens with breakpoint overrides is the defect. The tell is a jump: at 767px the section pads 24px, at 768px it pads 96px, and nothing in between adapts. Fluid spacing means one `clamp(1.5rem, 5vw, 6rem)` covers the range with no jump |
| **Intrinsic sizing** | Two greps in opposite directions. (a) Fixed extents on layout containers: `width: <number>px`, `height: <number>px`, `w-[NNNpx]`, `h-[NNNpx]` on anything that is not an icon, avatar, or deliberately fixed control. (b) `width: 100%` / `w-full` on elements whose content should define their size: buttons, badges, chips, tags, inline labels, table cells, dropdown triggers | (a) is a defect when the element must survive a narrower viewport than its fixed width plus its parent's padding. (b) is a defect when the element visibly stretches past its content on a wide viewport, where `fit-content`, `min-content`, or `max-content` was meant. Confirm by resizing to 320px and to 1920px: the first breaks (a), the second exposes (b) |
| **Container queries for reusable components** | Grep each portable component (card, list item, media object, stat tile, form row) for `@media`. A viewport query inside a component that can be placed in a sidebar, a modal, and a full-width region is the defect | Any `@media` inside a component that has more than one placement context. Prove it by rendering the same component in a 320px container and a 1200px container at the same viewport width: if both look identical when they should not, the component is querying the wrong thing. The fix is `container-type: inline-size` on the wrapper and `@container` on the component |
| **Modern viewport units** | Grep `100vh`, `h-screen`, `min-h-screen`, `vh` in any height or offset | Any `vh` used for a full-height region on a page that scrolls, without a `dvh`/`svh`/`lvh` counterpart. Verify on a real mobile browser or a device-emulated viewport with browser chrome: content sits behind the URL bar, or the layout jumps as the bar hides. `100dvh` follows the visible viewport; `100svh` sizes to the smallest (chrome shown); `100lvh` to the largest |
| No `float` for layout | Grep `float:` outside of text-wrap-around-image cases | Any `float` used to place layout blocks side by side. It escapes containment and wraps unpredictably at narrow widths |
| No `user-scalable=no` | Grep the viewport meta for `user-scalable=no`, `maximum-scale=1`, `minimum-scale=1` | Any hit. WCAG 2.2 SC 1.4.4 requires zoom to 200%. This is a hard accessibility defect, not a preference |
| Form inputs don't trigger zoom on iOS | Grep computed input font sizes: `input`, `select`, `textarea` rules with `font-size` under 16px, and Tailwind `text-sm`/`text-xs` on form controls | Any input under 16px. Safari on iOS zooms the page on focus, which then leaves the layout mis-scrolled after blur. Verify in a real iOS Safari or the responsive-design mode |
| Sticky elements don't obscure focused content | Tab through the page top to bottom with any sticky header or footer present. Watch whether a focused control ends up under the sticky element | A focused element partly or fully hidden behind sticky chrome. WCAG 2.2 SC 2.4.11 Focus Not Obscured. The fix is `scroll-margin-top` on focusable content equal to the sticky element's height, or `scroll-padding-top` on the scroll container |
| Horizontal overflow at the narrow end | At a 320px viewport, run `document.querySelectorAll('*')` and report any element whose `scrollWidth` exceeds `document.documentElement.clientWidth`, or check `document.documentElement.scrollWidth > window.innerWidth` | Any page-level horizontal scrollbar at 320px. The usual causes are a fixed-width child, an unbroken long string (`overflow-wrap: anywhere` fixes it), a negative margin without a matching parent overflow, or a table without a scroll wrapper |

## Performance-aware design

| Signal | Threshold | Why the reviewer cares |
|---|---|---|
| LCP | < 2.5s | Slow first impression |
| INP | < 200ms | Interactions feel immediate |
| CLS | < 0.1 | Layout instability users experience as jank |

### Design choices worth flagging

- Autoplay hero video on primary path
- Heavy glass/blur/shadow on dense screens
- Large images without optimization (format, sizing, loading)
- Content that shifts during load
- Runtime-loaded styles that restack the interface
- Unvirtualized huge lists or tables
- Long transitions that block interaction feedback

No metric detects the choreography defects, so check them separately: a loading affordance
wired to a raw pending boolean (it flashes), no acknowledgement within 100ms of a click that
starts async work, a route change that neither moves focus nor restores scroll, and a
background refresh that blanks data already on screen. Thresholds, detection cues, and fixes
are in `references/performance/06-perceived-performance.md`.

## Hover/focus parity

Web UIs must work for both mouse and keyboard users:

| Mouse state | Keyboard equivalent |
|---|---|
| `:hover` | `:focus-visible` |
| Click | Enter/Space |
| Right-click | Context menu key |
| Drag | Arrow keys or accessible alternative |

## Modern CSS features to check for

| Feature | Status | Notes |
|---|---|---|
| Container queries | Baseline 2023 | Use for component responsiveness |
| `@layer` | Baseline 2022 | Use for cascade control |
| `oklch()` / `color-mix()` | Baseline 2023 | Use for color tokens |
| `:has()` | Baseline 2023 | Enables parent selection |
| View Transitions | Baseline late 2025 | SPA + MPA transitions |
| Scroll-driven animations | Baseline Sept 2025 | No-JS scroll effects |
| `@starting-style` | Baseline 2024 | Entry animations |
| Popover API | Baseline 2024 | No-JS popovers |
| `content-visibility` | Baseline Sept 2025 | Rendering performance |

## Frameworks to consider

| Category | Current leaders |
|---|---|
| CSS framework | Tailwind CSS v4 (OKLCH, CSS-only config) |
| Component library | shadcn/ui (Radix + Tailwind, full ownership) |
| Headless primitives | React Aria, Base UI |
| Design tokens | Style Dictionary, Tokens Studio, Terrazzo |
| Animation | Motion (WAAPI-backed), CSS native |
| Meta-frameworks | Next.js, Nuxt, SvelteKit, Astro |
