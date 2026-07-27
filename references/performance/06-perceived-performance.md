---
topic: performance
role: reference
scope: perceived-performance
audience: ui-engineer
---

# Perceived Performance and Loading Choreography

Every other file in this domain measures machine time. This one measures how the wait is
staged for a person. A page can pass LCP 2.1s, INP 140ms, CLS 0.03 and still feel broken:
content pops in out of order, a spinner flashes for 80ms, the list jumps to the top after a
filter, the back button loses your place. None of those is a Core Web Vitals failure, and
all of them are the reason a user says "this feels janky".

Scope: this file owns the *staging* of waits. The metric budgets live in
`references/performance/01-core-web-vitals.md`; the code-splitting and streaming mechanics
live in `04-bundle-loading.md` and `02-react-19-perf.md`. Motion timing and easing live in
`references/design/04-motion.md`; this file only says *when* a state change may be shown,
not how it eases.

## The response-time budget ladder

Four tiers. Each one has a different obligation, and the obligation is not optional: a wait
in tier 2 with tier-1 UI (nothing) reads as a dead click.

| Tier | Duration | What the user perceives | Required UI |
|---|---|---|---|
| 1 | <= 100ms | Direct manipulation. The result feels caused by the click | Nothing extra. Just paint the result. Any spinner here is a defect |
| 2 | 100ms - 1s | Noticeable delay, but thought is unbroken | Immediate local acknowledgement: pressed/active state, disabled submit, optimistic value. No spinner, no skeleton |
| 3 | 1s - 10s | Attention starts to wander; the user checks whether it is broken | Indeterminate progress that is clearly attached to the thing being waited on. Skeleton if the result shape is known, spinner if it is not |
| 4 | > 10s | Attention is gone. The user switches tabs | Determinate progress with a real percentage or item count, plus a cancel affordance. If you cannot produce a real percentage, the operation belongs in the background with a completion notification |

The 100ms / 1s / 10s boundaries are Miller's 1968 response-time limits, restated for the web
by Nielsen in 1993 and unchanged since; they are perceptual, not technological, so they do
not move with hardware. The 100ms figure is the same threshold Core Web Vitals encodes as
the INP budget (INP's 200ms "good" bar allows one frame of slack on top of it).

Two corollaries a reviewer can check mechanically:

- **Every interactive element acknowledges within 100ms of the input event**, independently
  of when the real work finishes. A button that waits for a 400ms fetch before changing any
  pixel has a 400ms feedback gap even though its INP may look fine.
- **The acknowledgement is on the element the user touched**, not elsewhere on the page. A
  top-of-page progress bar does not acknowledge a click on a row 900px down.

## Spinner, skeleton, optimistic, or nothing

Two inputs decide it: expected duration (p75 of your own RUM, not the happy path) and
whether you know the shape of the result before it arrives.

| Expected p75 | Shape known? | Choose | Why |
|---|---|---|---|
| < 100ms | either | Nothing | The result paints before any loading UI could legibly render. Adding one guarantees a flash |
| 100ms - 1s | either | Local acknowledgement (pressed state, disabled control, `aria-busy`) | The wait is short enough that a full skeleton reads as a bigger event than it is |
| 100ms - 1s | yes, and the mutation is safe to assume | Optimistic update (`useOptimistic`) | Converts a tier-2 wait into a tier-1 one. Only where the server almost always agrees and a rollback is presentable |
| 1s - 10s | yes | Skeleton matching the real layout | Reserves the exact box, so the swap is zero-CLS and the eye does not re-scan |
| 1s - 10s | no | Single centered indeterminate spinner in the destination container | A skeleton that does not match the arriving shape is worse than a spinner: it teaches a wrong layout and then shifts |
| > 10s | either | Determinate progress + cancel | See tier 4 above |
| Any | Re-fetch of data already on screen | Keep the old data, mark it stale | See the stale-while-revalidate contract below. Never blank |

Hard rules:

- **A skeleton must be a tracing of the real component**, same box, same number of lines,
  same radius. A skeleton whose height differs from the loaded content converts a loading
  state into a CLS event, which is the exact defect the skeleton existed to prevent.
- **Never stack a skeleton inside a spinner** or a spinner inside a skeleton. One loading
  affordance per boundary.
- **Never put a spinner in a button that also disables**: the disabled state already
  acknowledges. Replacing the label text with a spinner also changes the button's width,
  which shifts everything after it in the row.

## The flash problem: delay and minimum display

A loading state that appears and disappears inside ~300ms reads as a glitch, not as
feedback. The eye registers the change, cannot resolve what it was, and the interface feels
unstable. Two thresholds fix it, and they must be used together.

| Threshold | Value | Rule |
|---|---|---|
| `DELAY_BEFORE_SHOW` | 200ms | Do not render any loading affordance until the wait has lasted this long. Requests that finish inside it show nothing at all |
| `MIN_DISPLAY` | 400ms | Once shown, keep the affordance on screen at least this long even if the data arrives earlier |

The math: a request that resolves at 250ms with no delay produces a 250ms flash. With
`DELAY_BEFORE_SHOW` alone it produces a 50ms flash, which is worse. Both together mean it
either shows nothing (resolves under 200ms) or shows for a legible 400ms minimum. The total
worst case added by `MIN_DISPLAY` is 400ms, which is bounded and inside tier 3.

```ts
// use-delayed-pending.ts
import { useEffect, useRef, useState } from "react";

const DELAY_BEFORE_SHOW = 200;
const MIN_DISPLAY = 400;

/**
 * Turns a raw `pending` boolean into one that never flashes.
 * Returns false for waits shorter than DELAY_BEFORE_SHOW,
 * and stays true for at least MIN_DISPLAY once it has gone true.
 */
export function useDelayedPending(pending: boolean): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    // Waiting, nothing shown yet: arm the delay.
    if (pending && !visible) {
      const t = setTimeout(() => {
        shownAt.current = performance.now();
        setVisible(true);
      }, DELAY_BEFORE_SHOW);
      return () => clearTimeout(t);
    }

    // Done, but something is on screen: hold it for the rest of MIN_DISPLAY.
    if (!pending && visible) {
      const elapsed = performance.now() - (shownAt.current ?? 0);
      const t = setTimeout(() => {
        shownAt.current = null;
        setVisible(false);
      }, Math.max(0, MIN_DISPLAY - elapsed));
      return () => clearTimeout(t);
    }

    // Steady state (waiting and already shown, or idle and hidden): no timer.
    return undefined;
  }, [pending, visible]);

  return visible;
}
```

The `pending && !visible` guard matters: without it the effect re-arms the delay timer every
time `visible` changes and pushes `shownAt` forward, so the minimum display silently becomes
600ms instead of 400ms. A new request arriving while the affordance is still on screen
correctly keeps it on screen rather than restarting the cycle.

CSS-only equivalent for a Suspense fallback, where no hook can intercept:

```css
/* The fallback exists in the DOM immediately but is invisible for 200ms.
   A boundary that resolves inside 200ms therefore never paints its fallback. */
.suspense-fallback {
  animation: fallback-in 1ms linear 200ms forwards;
  opacity: 0;
}
@keyframes fallback-in { to { opacity: 1; } }
```

There is no motion here, so this does not need a `prefers-reduced-motion` variant. It does
need checking against one: a blanket reset of the form
`@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }`
kills the animation and leaves the fallback permanently at `opacity: 0`, so a reduced-motion
user sees nothing at all while loading. If the project ships that reset, exclude this class
from it or use the hook above instead.

Reviewer cue: grep for `isLoading &&`, `isPending &&`, `{loading ?`. Every hit that renders
a spinner or skeleton directly off a raw boolean, with no delay wrapper and no minimum
display, is a flash defect. On a fast connection it fires on nearly every interaction.

## Reveal order for streamed content

Streaming exists so fast data does not wait on slow data. It becomes a flow defect the
moment settled content moves because a later chunk arrived.

| Rule | Detail |
|---|---|
| A boundary reserves its box before it resolves | `contain-intrinsic-size`, a fixed-height skeleton, or an explicit `min-height`. Otherwise every late boundary pushes everything below it |
| Late data never reorders earlier data | Render into a pre-declared slot keyed by position. Never `list.push(result)` in arrival order for a list the user is already reading |
| One boundary per independently-slow region, not one per element | Ten boundaries in a row that each pop in separately is visual noise; the reveal reads as a stutter rather than as progress |
| Reveal downward, never upward | Content inserted above the current scroll position moves what the user is reading. If a region above the fold can arrive late, reserve its full height at first paint |
| The shell paints first and is never a fallback | Header, nav, and page title come from the static shell. Putting them inside a Suspense boundary means the whole page reads as loading |

React streams Suspense boundaries out of order but inserts each one into its declared
position in the document, so React's own streaming does not reorder settled content. The
reorder defect comes from application code that collects results as they resolve. See
`references/performance/02-react-19-perf.md` for boundary placement.

Staggered reveal is legitimate when the stagger is short and monotone: 30-60ms between
sibling cards, all in the same direction, total under 300ms. Longer than that and the user
watches the interface assemble itself, which is slower-feeling than showing everything at
once even though the last pixel lands at the same time.

## Scroll and focus restoration contract

This is the single most common flow defect in client-routed apps, and no Core Web Vital
detects it.

| Event | Scroll obligation | Focus obligation |
|---|---|---|
| Forward navigation to a new route | Start at the top of the new document | Move focus to the new page's `<h1>` (or a `tabIndex={-1}` landmark) and announce the route in a polite live region. Do not leave focus on the link that is now unmounted |
| Back / forward navigation | Restore the exact previous scroll offset, after the content that determines page height has rendered | Restore focus to the element that triggered the navigation where it still exists |
| Filter, sort, or search change on the current view | Keep the current scroll offset. Do not jump to the top | Keep focus in the control the user is operating. Announce the new result count in a live region |
| Pagination | Scroll to the top of the results region, not the top of the document | Move focus to the results region heading |
| Opening a modal or drawer | Lock body scroll without a width shift (`scrollbar-gutter: stable`) | Trap focus inside; on close return it to the trigger |
| Infinite scroll append | Never change the offset of already-rendered items | Keep focus where it was; expose a real "load more" control for keyboard users |
| Expanding an accordion or "show more" | The clicked header stays where it is on screen | Focus stays on the trigger; `aria-expanded` reflects state |

Restoring scroll before the content exists silently fails: the container is 400px tall at
restore time and 4000px tall a frame later, so the browser clamps to the bottom of what
existed. Restore after the height-determining data has painted, or persist and re-apply the
offset once the list's item count matches the saved one.

```ts
// Manual restoration when the framework does not own it.
// The browser's own restoration only covers full page loads, never client-side routing.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const key = `scroll:${location.pathname}${location.search}`;

// On leaving a route
sessionStorage.setItem(key, String(window.scrollY));

// On returning, after the list has rendered its restored item count
requestAnimationFrame(() => {
  const y = Number(sessionStorage.getItem(key) ?? 0);
  if (y > 0) window.scrollTo(0, y);
});
```

Next.js App Router restores scroll on back/forward automatically; `<Link scroll={false}>`
opts a specific navigation out. TanStack Router and React Router v7 both ship a scroll
restoration component. Check that one of these is actually mounted before assuming the
behaviour exists: a hand-rolled router almost never has it.

## Stale-while-revalidate presentation contract

A re-fetch of data that is already on screen must never blank the screen.

| Rule | Detail |
|---|---|
| Show the stale data | Keep the previous result rendered while the new one is in flight. TanStack Query: `placeholderData: keepPreviousData`. SWR: this is the default |
| Distinguish "no data yet" from "refreshing" | `isPending` (nothing to show) drives the skeleton; `isFetching` (refreshing something already shown) drives a subtle marker only |
| Mark the staleness without moving anything | A thin top-of-region progress bar, a 0.6 opacity on the region, or `aria-busy="true"`. Never a layout change, never a height change |
| Keep interaction alive | Stale rows stay clickable. Disabling the region during a background refresh converts an invisible wait into a blocking one |
| Errors on refresh do not destroy good data | A failed revalidate shows an inline "could not refresh" affordance above the still-valid stale data. Replacing a working table with a full-page error is a downgrade |

Anti-pattern to flag on sight:

```tsx
// BAD: every filter change blanks a table the user was reading
if (isFetching) return <TableSkeleton />;
return <Table rows={data} />;

// GOOD: pending (no data at all) shows the skeleton; fetching marks and keeps
if (isPending) return <TableSkeleton />;
return (
  <div aria-busy={isFetching} style={{ opacity: isFetching ? 0.6 : 1 }}>
    <Table rows={data} />
  </div>
);
```

## Reviewer defect table

These are the perceived-performance findings a review should raise. They pair with the
design-choice flags in `references/performance/01-core-web-vitals.md` and use the same
severity scale.

| Defect | Detection cue | Severity |
|---|---|---|
| Spinner or skeleton rendered off a raw pending boolean | `{isLoading && <Spinner/>}` with no delay wrapper anywhere in the repo | HIGH |
| No feedback at all within 100ms of a click that starts async work | Handler `await`s before any state update or class change | HIGH |
| Skeleton whose height differs from the loaded component | Skeleton and component rendered from different markup with different line counts or padding | HIGH |
| Route change does not move focus | No `focus()` call, no `tabIndex={-1}` target, no route announcement in the router setup | HIGH |
| Back navigation loses scroll position | No scroll restoration component mounted and `history.scrollRestoration` untouched | HIGH |
| Filter or sort change jumps the list to the top | `window.scrollTo(0, 0)` or a `key` change that remounts the scroll container on filter change | MEDIUM |
| Re-fetch blanks data that was already on screen | `isFetching` (not `isPending`) gating a skeleton | MEDIUM |
| Late-arriving content inserted above the current reading position | Any region above the fold rendered without reserved height | MEDIUM |
| Streamed items appended in arrival order into a list being read | Results pushed into an array from a `Promise.all`-less loop | MEDIUM |
| Determinate progress absent on an operation over 10s | Long export, upload, or report with an indeterminate spinner | MEDIUM |
| Reveal stagger longer than 300ms total | Per-item `transition-delay` multiplied by index with no cap | LOW |
| Modal open shifts the page by the scrollbar width | Body `overflow: hidden` without `scrollbar-gutter: stable` | LOW |

## Sources (canonical)

| Topic | URL |
|---|---|
| Response-time limits (Nielsen, restating Miller 1968) | https://www.nngroup.com/articles/response-times-3-important-limits/ |
| INP and interaction responsiveness | https://web.dev/articles/inp |
| Optimize long tasks | https://web.dev/articles/optimize-long-tasks |
| useOptimistic | https://react.dev/reference/react/useOptimistic |
| Suspense | https://react.dev/reference/react/Suspense |
| Next.js loading UI and streaming | https://nextjs.org/docs/app/api-reference/file-conventions/loading |
| Next.js Link scroll behaviour | https://nextjs.org/docs/app/api-reference/components/link |
| TanStack Query placeholderData / keepPreviousData | https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries |
| scrollRestoration (MDN) | https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration |
| scrollbar-gutter (MDN) | https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-gutter |
| WCAG 2.4.3 Focus Order | https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html |
| aria-busy (MDN) | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-busy |
