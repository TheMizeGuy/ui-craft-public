---
topic: performance
role: reference
scope: cwv
audience: ui-engineer
---

# Core Web Vitals: Thresholds, Budgets, Playbooks

Google ranks on p75 field data (CrUX). Lab runs are debugging aids only. Every claim below is sourced to a public URL in the per-section source lines and the canonical table at the foot of this file; there is no off-machine companion document.

Companion files in this domain: `02-react-19-perf.md` (framework), `03-css-perf.md` (rendering), `04-bundle-loading.md` (payload), `05-measurement.md` (RUM, lab, CI budgets), `06-perceived-performance.md` (how the wait is staged), `07-runtime-engine-patterns.md` (engine-level causes).

## The 2026 thresholds (p75 field data)

| Metric | Good | Needs Improvement | Poor | Measures |
|--------|------|-------------------|------|----------|
| LCP (Largest Contentful Paint) | <= 2.5s | 2.5-4.0s | > 4.0s | Render time of largest visible element |
| INP (Interaction to Next Paint) | <= 200ms | 200-500ms | > 500ms | Delay from input to next paint (replaced FID Mar 2024) |
| CLS (Cumulative Layout Shift) | <= 0.1 | 0.1-0.25 | > 0.25 | Unexpected layout movement during session |
| TTFB (foundational) | <= 0.8s | 0.8-1.8s | > 1.8s | Server response / HTML start; prerequisite for LCP |

TTFB is not a Core Web Vital but acts as a hard ceiling on LCP; if TTFB > 800ms the 2.5s LCP target is effectively unreachable.

## Field vs lab

| Axis | Field (CrUX) | Lab (Lighthouse / PSI lab / WebPageTest) |
|------|-------------|------------------------------------------|
| Source | Anonymised Chrome users meeting opt-in criteria | Emulated device, throttled network, single run |
| Used for ranking | Yes | No |
| Captures INP | Yes (all interactions across the session) | No. Lab cannot simulate real user input |
| Use when | Monitoring regressions, release gate, ranking signal | Reproducing, root-causing, regression bisection |

Lighthouse 100 with bad CrUX = ranked badly. A page can score 100 in the lab and fail CWV in the field because lab runs one cold load, one scripted interaction, on emulated hardware. Field aggregates every navigation type, every device, every third-party, every auth state. Trust CrUX.

## Pass rates (2025-2026 Web Almanac)

| Metric | Mobile pass | Desktop pass |
|--------|-------------|--------------|
| LCP | ~62% | higher |
| INP | ~90% | ~95% |
| CLS | ~85% | ~90% |
| All three | ~47-48% | ~55% |

LCP is the hardest to pass and the single highest-leverage metric to fix. If you have one week to spend, spend it on LCP.

## Performance budgets to declare

Commit these to the repo as `performance-budget.json` and gate CI on them. Values reflect the 2026 doctrine.

```
LCP_TARGET=2200ms
INP_TARGET=180ms
CLS_TARGET=0.05
JS_BUDGET=300KB compressed
CSS_BUDGET=80KB
IMG_ABOVE_FOLD=400KB
FONT_BUDGET=80KB  (2 weights, 1 family)
THIRD_PARTY_BUDGET=150KB
TTFB_TARGET=600ms
HTML_REQUESTS=<=50 initial load
```

Targets sit inside the "Good" thresholds to leave margin for noise and field variance. Break the build when the budget is exceeded rather than warning.

### LCP budget breakdown

```
TTFB:           <= 600ms    (server + CDN + edge cache)
Resource load:  <= 800ms    (LCP image download)
Render delay:   <= 500ms    (CSS parse, layout, paint)
Margin:         <= 300ms    (noise, field variance)
────────────────────────────
Total:           2200ms      (below 2.5s "Good" threshold)
```

Every ms you borrow from one bucket is a ms you must cut from another.

## LCP optimization playbook

| Lever | Impact | How |
|-------|--------|-----|
| Preload LCP image | CRITICAL | `<link rel="preload" as="image" href="hero.avif" fetchpriority="high">` in `<head>` |
| `fetchpriority="high"` on LCP `<img>` | CRITICAL | `<img fetchpriority="high" src=...>`. One of highest-impact single optimizations |
| Never lazy-load the LCP image | CRITICAL | Remove `loading="lazy"`; explicit `loading="eager"` is fine |
| Inline critical CSS (above-the-fold) | HIGH | 10-20KB of hand-picked rules in `<style>`; load the rest with `rel="preload" as="style" onload=...` |
| SSR or SSG the LCP element | HIGH | Never put likely-LCP content behind client-only rendering or post-hydration DOM assembly |
| Modern image formats | HIGH | AVIF first, WebP fallback, JPG last. AVIF is typically 25-50% smaller than JPEG |
| Compress with Brotli | HIGH | Brotli 4 for dynamic HTML, Brotli 11 for static assets. ~15-20% smaller than gzip |
| TTFB <= 600ms | HIGH | Edge cache HTML, CDN, server tuning, DB denormalisation for hot reads, 103 Early Hints where applicable |
| Remove render-blocking scripts | HIGH | `defer` / `async` on `<script>`; inline only true-critical JS |
| Preconnect to required origins | MEDIUM | `<link rel="preconnect" href="https://cdn...">`, capped at 3 origins to avoid connection contention |
| Minimize redirects | MEDIUM | Each hop is one round-trip |
| Right-size images | MEDIUM | `srcset` + `sizes` per breakpoint; never ship a 3000px image to a 400px viewport. Bytes are this file's concern; whether `sizes` actually matches the rendered layout width is a SIZING defect owned by `references/responsive/` |
| Fetch priority on CSS/JS | MEDIUM | `fetchpriority="high"` on critical CSS; `fetchpriority="low"` on analytics |

Sources: https://web.dev/articles/lcp, https://web.dev/articles/fetch-priority, https://web.dev/articles/top-cwv, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority.

## INP optimization playbook

INP aggregates the slowest interactions across the whole session (p98 of observed interactions, reported at p75 of sessions). Fixing one slow click matters.

| Lever | Impact | How |
|-------|--------|-----|
| Break long tasks (> 50ms) | CRITICAL | `await scheduler.yield()` (Chromium 129+), `scheduler.postTask(fn, {priority: 'user-blocking'})`, or `setTimeout(fn, 0)` as fallback |
| Defer / async non-critical JS | CRITICAL | `<script defer>` / `<script async>`; nothing synchronous in `<head>` |
| Web workers for CPU-heavy work | HIGH | Parsing, sorting, data transforms, crypto. Main thread stays free for input |
| DOM size <= 1500 elements | HIGH | Virtualise lists (TanStack Virtual, react-window); `content-visibility: auto` for offscreen sections |
| Move expensive handlers to `requestIdleCallback` | HIGH | Analytics, logging, non-visible computation |
| Batch DOM reads then writes | HIGH | Read-then-write pattern; never read → write → read → write (layout thrash) |
| Defer hydration of non-critical islands | HIGH | Lazy-hydrate below-fold components; server-only render static islands |
| `useDeferredValue` for typing → filter | MEDIUM | Urgent input update + deferred list render (React 19) |
| Debounce input handlers | MEDIUM | 50-100ms window for typeahead; 150-250ms for server-hit |
| Avoid forced synchronous layout | MEDIUM | `offsetHeight` / `getBoundingClientRect` inside a write loop triggers full layout |

Sources: https://web.dev/articles/inp, https://web.dev/articles/optimize-long-tasks, https://web.dev/articles/off-main-thread, https://web.dev/blog/responsiveness.

## CLS optimization playbook

| Lever | Impact | How |
|-------|--------|-----|
| `width` + `height` on every image | CRITICAL | `<img src=... width="1200" height="600">`, so the browser reserves the box before the image lands |
| `aspect-ratio` for fluid images | CRITICAL | `img { aspect-ratio: 16 / 9; width: 100%; height: auto; }` |
| Reserve space for ad/embed slots | CRITICAL | `.ad-slot { min-height: 250px; }` regardless of whether the ad loads |
| `font-display: swap` + metric overrides | HIGH | `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` on `@font-face` to match fallback metrics exactly |
| No layout-shifting transitions on input | HIGH | Accordions that push content below them are fine; banners that push content on click are not |
| Avoid inserting content above viewport | HIGH | No "cookie consent banner pushes page down after 500ms". Overlay, never push |
| Set dimensions on iframes | MEDIUM | Twitter embeds, YouTube embeds, Maps iframes. Set `width` + `height` or `aspect-ratio` |
| Preload the exact font file | MEDIUM | `<link rel="preload" as="font" type="font/woff2" crossorigin href=...>`, which prevents the swap flash |

`@font-face` metric override example:

```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter.woff2") format("woff2");
  font-display: swap;
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
```

Generate precise values with `https://github.com/seek-oss/capsize`, or let `next/font` do it automatically (it self-hosts, subsets, preloads, and emits the metric overrides). Outside Next.js, `fontaine` generates the same overrides as a Vite/Nuxt/webpack plugin.

Sources: https://web.dev/articles/optimize-cls, https://web.dev/articles/css-size-adjust.

**Dimension handoff for media.** This file owns `srcset`/`sizes`, `<picture>`, and
`aspect-ratio` as *byte budget and layout-stability* concerns only: is the file too large,
is the box reserved before the image lands. Whether the media actually sizes to its display
is a separate SIZING dimension owned by `references/responsive/`: does the `sizes` attribute
match the real rendered width at each breakpoint, does the crop need `<picture>` art
direction by orientation, does the fluid image pair `aspect-ratio` with
`width: 100%; height: auto`, is `object-fit`/`object-position` correct on constrained media,
does a background image ship `image-set()` for DPR. Both lenses must run. Neither may assume
the other covered it: a perf review that only checks bytes will pass an image that is
correctly compressed and still visually wrong at 390px.

## INP attribution

`web-vitals` 6.x ships an attribution build that tells you which element and which phase was slow. Use it in production RUM, not just locally. (v5 removed `onFID`; v6 added soft-navigation support behind `reportSoftNavs: true`, which is the only way to get per-navigation CWV on a client-routed SPA. See `05-measurement.md`.)

```ts
import { onINP } from "web-vitals/attribution";

onINP(
  (metric) => {
    const a = metric.attribution;
    fetch("/rum/inp", {
      method: "POST",
      body: JSON.stringify({
        value: metric.value,
        rating: metric.rating,
        // Which element the user interacted with
        target: a.interactionTarget,
        // Interaction type: "pointer" | "keyboard". INP has no scroll bucket
        type: a.interactionType,
        // Phase breakdown (ms)
        inputDelay: a.inputDelay,
        processingDuration: a.processingDuration,
        presentationDelay: a.presentationDelay,
        // Long animation frame data (LoAF)
        loafScripts: a.longAnimationFrameEntries?.flatMap((f) =>
          f.scripts.map((s) => ({
            source: s.sourceURL,
            fn: s.sourceFunctionName,
            duration: s.duration,
          })),
        ),
        // Next-paint navigation type (so bfcache restores don't pollute)
        navigationType: metric.navigationType,
      }),
      keepalive: true,
    });
  },
  { reportAllChanges: false },
);
```

Phase breakdown guide:

| Phase | What it is | Typical culprit |
|-------|-----------|-----------------|
| `inputDelay` | Time from user input to handler start | Long task already running on main thread (hydration, third-party) |
| `processingDuration` | Time inside the event handler | Your JS. Profile it |
| `presentationDelay` | Time from handler end to next paint | Style recalc, layout, large DOM, forced sync layout |

`interactionType` is only ever `"pointer"` or `"keyboard"`. INP excludes scrolling by definition, so a scroll-jank complaint will never appear in INP data no matter how bad it gets. Diagnose scroll separately via long-animation-frame entries and DevTools Rendering > Frame Rendering Stats (`05-measurement.md`, `07-runtime-engine-patterns.md`).

Source: https://github.com/GoogleChrome/web-vitals#attribution-build.

## Anti-patterns flagged as CRITICAL

| Anti-pattern | Why it's critical |
|--------------|-------------------|
| Lazy-loading the LCP image | Single most common 2026-era regression; can add 1000ms+ to LCP |
| Trusting Lighthouse score over CrUX | Google ranks on CrUX; 100 in lab + red in field = ranked red |
| Synchronous third-party scripts in `<head>` | Blocks HTML parser, blocks LCP, blocks hydration |
| `unload` event listeners | Disqualifies the page from bfcache; restore cost becomes a full page load |
| Client-only rendering of likely-LCP content | Hydration delay stacks on top of network delay; often doubles LCP |
| Missing `aspect-ratio` on responsive images | Guarantees CLS when the image arrives |
| `Cache-Control: no-store` on main HTML | Also disqualifies from bfcache |
| Carousel above the fold | LCP target is ambiguous, CLS risk, JS overhead. A static hero wins |
| Custom fonts with 4+ weights | Each weight is a separate network request; variable font + subsetting is 1 file |
| CSS-in-JS runtime injection | Styles land after React boots; forces extra paint; measurable LCP hit |
| No declared performance budget | You cannot regress below a threshold you never set |

Sources: https://web.dev/articles/bfcache, https://developer.mozilla.org/docs/Glossary/bfcache, https://developer.mozilla.org/en-US/docs/Web/API/NotRestoredReasons.

## Performance-degrading design choices (reviewer flags)

Folded in from the universal-review overlay. The LCP/INP/CLS threshold table and playbooks above already cover the metric-level optimizations; these are design-level choices a reviewer should flag on sight because they predict a CWV failure before any measurement is taken. Distinct from the anti-pattern table above (which is implementation-level), this list is judgment calls made at design/spec time:

| Design choice | Why it's flagged |
|---|---|
| Autoplay hero video on the primary path | Competes with the LCP image/text for bandwidth and main-thread decode time; often the actual LCP candidate ships blocked behind video buffering |
| Heavy glass/blur/shadow on dense screens | `backdrop-filter` and large `box-shadow` are GPU-expensive per the CSS anti-pattern list; stacking them across a dense screen (many cards/rows) multiplies the cost |
| Large images without optimization (format, sizing, loading) | The most common root cause of LCP failures; see the LCP optimization playbook above |
| Content that shifts during load | CLS in the field; see the CLS optimization playbook above |
| Runtime-loaded styles that restack the interface | Same failure mode as CSS-in-JS runtime injection (anti-pattern table above), but framed as a visible design symptom: the layout visibly reflows after paint |
| Unvirtualized huge lists or tables | Same failure mode as the INP "DOM size <= 1500 elements" lever above, framed as a design review flag: a data-dense screen that renders every row eagerly instead of virtualizing |
| Long transitions that block interaction feedback | A transition/animation that delays the user's next input from registering is an INP risk masquerading as a motion-design choice |

### Choreography flags (no metric detects these)

The rows above all predict a metric failure. These predict the complaint "it feels broken"
on a page whose metrics are green, which is the other half of what a reviewer is for. Full
detection cues, thresholds, and fixes are in `references/performance/06-perceived-performance.md`;
these are the sight-flags.

| Design choice | Why it's flagged |
|---|---|
| Loading affordance wired straight to a raw pending boolean | Flashes for 50-250ms on a fast connection. Needs the 200ms delay-before-show plus 400ms minimum-display pair, or nothing at all |
| No acknowledgement inside 100ms of a click that starts async work | Below the perceptual threshold for "the click caused this". The click reads as dead even when INP is fine |
| A skeleton that is not a tracing of the loaded component | Turns the loading state into the CLS event it was meant to prevent |
| Route change with no focus move and no scroll restoration | Keyboard and screen-reader users land nowhere; back navigation loses the reading position. No CWV covers either |
| Filter, sort, or search change that jumps the list to the top | Loses the reading position on every refinement |
| A background refresh that blanks data already on screen | Destroys a usable view to show a spinner. Distinguish "nothing yet" from "refreshing" |
| Content arriving above the current reading position without reserved height | Moves what the user is reading. CLS may not even record it if it happens after the 5s window or off the initial viewport |
| Reveal stagger totalling more than ~300ms | The user watches the interface assemble itself, which feels slower than showing it all at once |

## Sources (canonical)

| Topic | URL |
|-------|-----|
| LCP guide | https://web.dev/articles/lcp |
| INP guide | https://web.dev/articles/inp |
| CLS guide | https://web.dev/articles/optimize-cls |
| TTFB | https://web.dev/articles/ttfb |
| Responsiveness overview | https://web.dev/blog/responsiveness |
| Top CWV techniques | https://web.dev/articles/top-cwv |
| Long tasks | https://web.dev/articles/optimize-long-tasks |
| Off main thread | https://web.dev/articles/off-main-thread |
| Fetch priority (MDN) | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority |
| Fetch priority (web.dev) | https://web.dev/articles/fetch-priority |
| bfcache | https://web.dev/articles/bfcache |
| NotRestoredReasons | https://developer.mozilla.org/en-US/docs/Web/API/NotRestoredReasons |
| Performance budgets 101 | https://web.dev/articles/performance-budgets-101 |
| Debug in the field | https://web.dev/articles/debug-performance-in-the-field |
| web-vitals library | https://github.com/GoogleChrome/web-vitals |
