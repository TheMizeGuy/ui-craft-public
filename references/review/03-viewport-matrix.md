# Viewport Matrix and Responsive Review

This file is the **test plan**: which widths to open, which modes to run, which
defects to flag, and how to rank what you find. It deliberately contains no
sizing technique, because a matrix that also taught CSS would be read as a
checklist and skimmed.

The technique lives in the responsive domain, and a reviewer who has not read it
can only report that something broke at width X:

| Lens | File |
|---|---|
| Fluid and intrinsic sizing: `clamp()` math, `min()`/`max()`, `min-content`/`fit-content`, `auto-fit` versus `auto-fill`, `aspect-ratio`, `svh`/`dvh`, responsive images | `references/responsive/01-fluid-and-intrinsic-sizing.md` |
| Choosing the query: when a media query is correct, when a container query is correct, `@container` syntax, `cqi` units, migration recipe | `references/responsive/02-breakpoints-vs-container-queries.md` |
| Zoom, reflow, text scaling, orientation, foldables, multi-window, density, safe areas, keyboard | `references/responsive/03-zoom-orientation-and-adaptive.md` |
| Waste thresholds: viewport utilisation, internal distribution, page economy | `references/review/05-density-and-economy.md` |

## Default web viewport families

| Family | Widths (px) | Why include |
|---|---|---|
| Narrow mobile | 320, 360 | Worst-case wrapping, cramped controls. 320 is also the WCAG 1.4.10 reflow target |
| Modern mobile | 390, 430 | Common iPhone/Android widths; production issues |
| Small tablet / large phone landscape | 568, 667, 768 | Nav changes, stacked layout stress |
| Tablet / compact desktop | 820, 1024 | Breakpoint mistakes, sidebar collapse, split view |
| Between breakpoints | 900 | The width nobody designs at. Fluid failures live here and nowhere else |
| Laptop | 1280, 1440 | Baseline desktop behavior. 1280 is the zoom test width |
| Desktop | 1728, 1920 | 1920 is the most common real desktop width; 1728 is the scaled 16-inch laptop. Dead space becomes measurable here |
| Large and ultrawide | 2560, 3440 | 4K and 5K panels at 100% scaling, and 21:9. A surplus-width plan is mandatory above 1600, not optional |

Do not open all sixteen. Open the narrowest, 900, the widest the product will
realistically see, plus any width where the product's own breakpoints fire. The
rest are for reproducing a family once a defect is found.

Default when the product states nothing: 320, 390, 900, 1440, 1920, 2560. The 1920
measurement is the one the density thresholds are calibrated at
(`references/review/05-density-and-economy.md`), so it stays in even when 2560 is open.

## Required review modes

Widths are one axis. These are the others, and each fails independently. The
zoom and text rows are conformance requirements, not preferences, so they run on
every web review rather than "where the product must support it". Procedures,
what breaks, and detection snippets: `references/responsive/03-zoom-orientation-and-adaptive.md`.

| Mode | Setting | Flags |
|---|---|---|
| Page zoom 200% | 1280px window, zoom 200% | Clipped labels, unreachable controls (WCAG 1.4.4) |
| Reflow 400% | 1280x1024 at 400% zoom, or a 320x256 viewport | Two-dimensional scrolling, lost content (WCAG 1.4.10) |
| Text-only zoom | Root font size forced to 24px, or Firefox text-only zoom | A layout that does not move, which means it is sized in `px` |
| Text spacing | The 1.4.12 override block (line-height 1.5, paragraph 2em, letter 0.12em, word 0.16em) | Fixed heights, clipping, overlap |
| Short viewport | Height reduced to 390px or less, width unchanged | Landscape phones, split-screen windows, open keyboards. Orientation is an aspect ratio, not a width |
| Keyboard open | A focused field on a phone-class viewport | Submit or validation message hidden behind the keyboard |
| Window resize mid-task | Drag the window narrow with a form half filled | State loss and re-mounts from viewport-keyed component logic |
| Dark and light theme | Both, where both exist | Theme-only contrast and border failures |
| Reduced motion | `prefers-reduced-motion: reduce` | Motion with no opt-out on motion-heavy interfaces |

One grep belongs with these modes because it names the root cause the modes only
expose: `rg -n 'font-size:\s*[\d.]+(px|vw)' src/` plus
`rg -n 'html\s*\{[^}]*font-size' src/`. Type, spacing and container caps
expressed in `px` are why zoom and text-scaling reviews fail, and the fix is
systemic rather than per-component.

## Android device matrix (from first-party guidance)

| Device class | Size | Window size class |
|---|---|---|
| Phone compact portrait | ~360dp | Compact |
| Phone compact landscape | ~640dp | Medium |
| Foldable closed | ~360dp | Compact |
| Foldable open/flat | ~670dp portrait, ~840dp landscape | Medium / Expanded |
| 8-inch tablet | ~600dp | Medium |
| 10.5-inch tablet | ~720dp | Expanded |
| 13-inch Chromebook | ~840dp+ | Expanded/Large |

Window size class boundaries: compact under 600dp, medium 600 to 839, expanded
840 to 1199, large 1200 to 1599, extra-large 1600 and up. Review against the
class, never against the device: split screen puts a tablet in the compact class,
and a folded foldable is a 360dp phone.

## Apple device matrix

| Device class | Viewport | Notes |
|---|---|---|
| iPhone SE (2nd/3rd gen) | 375pt | Narrowest width iOS 26 still supports; no longer sold |
| iPhone 16 | 393pt | Standard |
| iPhone 16 Pro Max | 440pt | Large |
| iPad Mini | 744pt | Compact iPad |
| iPad Air/Pro 11" | 820pt | Standard iPad |
| iPad Pro 13" | 1024pt | Largest iPad |

These are full-screen widths. With windowing, Split View and Slide Over, an iPad
app runs at roughly a third of them, so a layout that reads "iPad, therefore
wide" fails on hardware it was designed for. Test the narrow window state, and
confirm a resize mid-task keeps state and scroll position
(`references/responsive/03-zoom-orientation-and-adaptive.md` section 6).

## High-confidence viewport failures (always flag)

- **Content occupying under 60% of the viewport width at 1920px or above**, with
  no second column, sidebar, or reading-measure reason. This sits at the TOP of
  the list deliberately. It used to appear only under "quality defects" below,
  where it competed with a severity ladder anchored entirely on breakage — so a
  page wasting 1008px of a 2560px display cleared every wide-viewport review it
  was given. It is a measurable failure, not a preference: record utilisation as
  a percentage and the unused pixel count. And centring is not the fix; two
  504px gutters waste exactly what one 1008px gutter did
  (`references/review/05-density-and-economy.md`)

- Horizontal scrolling in primary content
- Clipped or truncated critical text
- Overlapping controls or text
- Controls hidden under browser chrome, sticky headers, or bottom bars
- Off-screen dialogs, sheets, or dropdowns
- Touch targets collapsing below usable size
- Broken focus visibility because overlays obscure the target
- Impossible or awkward navigation from layout collapse

## Quality defects (viewport-related)

- Excessive dead space on large displays — see the always-flag list above; it
  was demoted to this section once and that is precisely why it shipped. The
  threshold and the menu of correct fixes are in "Surplus width above 1600px"
  below, because "excessive" with no number and no target behaviour produces a
  finding nobody can act on
- Line lengths > 75ch on wide screens (the same decision as dead space, from the
  other side: see below)
- A single container child absorbing the slack: an unsized column in a
  `table-layout:fixed`, an `auto` margin, a bare `1fr` beside fixed siblings.
  These are invisible at the width they were authored against and grow without
  limit at every larger one, so a wide-viewport pass is the ONLY place they
  surface
- Component proportions comically stretched or cramped
- Awkward breakpoint jumps that feel unstable
- Important actions in hard-to-reach areas without reason
- Poor container behavior inside sidebars, cards, drawers, panels

## Surplus width above 1600px

Above roughly 1600px the question stops being "does it break" and becomes "what
does the design do with the space it was given". Both halves of that question
have answers, and a finding needs both.

**The threshold** is the one already calibrated in
`references/review/05-density-and-economy.md`, not a second one: measure content
width as a share of viewport width at 1920px and at the widest width in the
matrix. Under 60% with no second column, sidebar or reading-measure
justification is HIGH; 60 to 75% unjustified is MEDIUM; a prose surface capped at
a 65 to 75ch measure is correct and not a finding; a tabular, dashboard or data
surface capped like prose is HIGH. Measure with `${CLAUDE_PLUGIN_ROOT}/scripts/measure_density.js` (evaluated through the browser tool) or
the inline snippet in that file, and quote the percentage plus the unused pixel
count.

**The target behaviour** is what turns the finding into a fix. There are exactly
four correct answers, and "centre it" is not among them (two 504px gutters waste
what one 1008px gutter did):

| Answer | When it is right | Mechanism |
|---|---|---|
| Widen the measure to its cap | Prose that is currently capped well below a comfortable measure | `inline-size: min(100%, 68ch)`; stop at 75ch, past which the eye loses the line |
| Add tracks | Repeating content: cards, tiles, results, media | `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` (`references/responsive/01-fluid-and-intrinsic-sizing.md` section 5) |
| Promote a rail or detail pane | There is secondary content currently below the fold or behind a disclosure: filters, metadata, a preview, an activity feed | A third shell column at a shell-level media query, not a component query |
| Cap deliberately, and say why | The content genuinely has a maximum useful width | Record the justification in the finding. Per-surface caps that are not the framework default: editorial 65ch, dashboard full-bleed minus the sidebar, marketing around 1240px (`references/catalogue/01-ai-tells.md`, tell D11) |

**Dead space and long lines are one decision, not two.** Widening a shell that
has a single measure token produces 120ch paragraphs, which is the same mistake
inverted. A page carrying both prose and data needs two tokens: a prose measure
that stays at 65 to 75ch and a shell measure that is allowed to grow. The
dashboard measured in the density reference failed precisely because one
`--measure` sized like prose was capping a ledger.

## Geometry evidence contexts

Record three geometry contexts for any flagged issue:

1. **Viewport size** -- the browser/device viewport
2. **Container width** -- the parent container of the affected component
3. **Component box** -- the component's own rendered dimensions

Without all three, a reviewer cannot tell if a component is broken, intentionally constrained, or shown in the wrong parent context.

## Mobile and safe-area heuristics

| Heuristic | Why | How to check |
|---|---|---|
| Safe-area insets are a **two-part** rule | `env(safe-area-inset-*)` resolves to **0** unless the document ships `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Half the fix changes nothing, and the review that recommended it marks the issue resolved | `rg -n 'safe-area-inset' src/` against `rg -n 'viewport-fit' src/`. Insets with no `viewport-fit=cover` is HIGH: the shipped mitigation is inert. `viewport-fit=cover` with no insets consumed is also HIGH, in the other direction: content now renders under the notch and home indicator |
| Wrap every inset in `max()` | A bare `padding-bottom: env(safe-area-inset-bottom)` gives a device with no inset zero padding, which is worse than the padding it replaced | Look for `env(` not inside `max(`: `padding-block-end: max(var(--space-s), env(safe-area-inset-bottom))` |
| Insets go on the edge-touching element | Padding on `body` leaves a `position: fixed` bar exactly where it was, and landscape moves the inset to `left`/`right`, so a bar handling only `bottom` puts its first control under the notch | Check the fixed or sticky element itself, in both orientations |
| Use modern viewport units (`svh`, `dvh`) over `100vh` | `vh` resolves against the **large** viewport, so `100vh` is 60 to 90 CSS px taller than what is visible from the first paint | `rg -n '\b\d+vh\b' src/`. Every hit is desktop-only or a bug (`references/responsive/01-fluid-and-intrinsic-sizing.md` section 7) |
| Keep primary actions in the easy reach band | Reach is a fraction of viewport height, not a device fact: bottom third easy, middle third stretch, top third hard and partly occluded by the holding hand | On a viewport 430px wide or narrower, measure each primary action's distance from the bottom as a percentage of `innerHeight`. Primary action in the top third while the bottom third carries only decoration is MEDIUM, HIGH when it is the action the screen exists for. Snippet in `references/responsive/03-zoom-orientation-and-adaptive.md` section 8 |
| Avoid hover-only interactions | Touch users need an equivalent path | Anything revealed only by `:hover` with no focus, tap or always-visible equivalent |
| Test keyboard-open for forms | The keyboard resizes the visual viewport but not the layout viewport by default, so `position: fixed` action bars sit under it | Focus a field and confirm the input, its validation message and the submit control are all visible without dismissing the keyboard. Landscape phones fail this most |

## De-duplication strategy

Do not report the same defect at six widths. Group by failure family:

```
Overflow family: cart summary clips action buttons from 390px down through 320px.
Worst observed at 320px portrait.
```

## Severity rules for viewport findings

| Condition | Severity |
|---|---|
| Core task blocked on common device width | CRITICAL or HIGH |
| Important content clipped on one common viewport family | HIGH |
| Layout degraded but usable on common viewport family | MEDIUM |
| Cosmetic issue only on fringe width or rare orientation | LOW |
| Under 60% viewport utilisation on a common desktop width | HIGH |
| Page over 2x viewport height with nothing disclosed | MEDIUM (`references/review/05-density-and-economy.md`) |
| A container child hoarding the slack, measurably (>40% of its container, content maximum far below it) | HIGH |
| Content or a control lost at 320 CSS px reflow, or two-dimensional scrolling on content that does not require it | HIGH, CRITICAL when it blocks the primary task (WCAG 1.4.10) |
| Text clipped, truncated or overlapped at 200% page zoom | HIGH (WCAG 1.4.4) |
| Text size expressed only in `vw` or `cqi`, so it does not grow under zoom at all | HIGH. Not a preference: it is 1.4.4 by construction |
| Safe-area insets consumed with no `viewport-fit=cover` in the document, or the reverse | HIGH. The first ships an inert fix, the second puts content under the notch |
| Layout unchanged when the root font size is raised to 24px (a `px`-sized system) | MEDIUM, and reported once as a systemic finding rather than per component |
| Layout renders correctly but wastes a bounded, noticeable amount of space or height | MEDIUM |
| Component styled by viewport that demonstrably renders at two or more container widths | HIGH with a visible defect, MEDIUM as a latent break (`references/responsive/02-breakpoints-vs-container-queries.md`) |
| Pure style preference with no usability impact **and no measurement** | TASTE |
