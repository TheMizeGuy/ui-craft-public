---
topic: performance
role: reference
scope: bundle-loading
audience: ui-engineer
---

# Bundle and Loading: Code Splitting, Images, Fonts, Hints, bfcache

Companion files: engine-level allocation and retention costs are in `07-runtime-engine-patterns.md`; how the resulting wait is staged for the user is in `06-perceived-performance.md`. Every claim here is sourced to a public URL inline or in the canonical table at the foot of the file.

## Bundle budgets

| Resource | Budget (initial load) | Per-route budget |
|----------|-----------------------|------------------|
| JavaScript | <= 300KB compressed | <= 150KB additional |
| CSS | <= 80KB compressed | <= 30KB additional |
| Fonts | <= 80KB (2 weights, 1 family) | n/a |
| Images above the fold | <= 400KB total | n/a |
| Third-party scripts | <= 150KB compressed | n/a |
| Total page weight (mobile) | <= 1.5MB | n/a |
| HTTP requests | <= 50 on initial load | n/a |

Enforce in CI with `@next/bundle-analyzer` + `lighthouse-ci` assertions; fail the build when a budget is exceeded. Budgets are per-compressed-byte, not per-raw.

## Code splitting strategy

| Strategy | When to use | Tools |
|----------|-------------|-------|
| Route-level splitting | Always (default in Next.js App Router, Remix, TanStack Router, React Router v7) | Built-in |
| Component-level splitting | Heavy widgets used on one route (charts, rich-text editors, maps, video players) | `next/dynamic`, `React.lazy` + `<Suspense>` |
| Library-level splitting | Heavy library used only in one component (recharts, mapbox, tiptap, monaco) | Dynamic `import()` inside the component; or a dynamic-imported wrapper |
| Conditional splitting | Feature flags, role-based UI, internal-only tooling | Ship the feature chunk only when the flag flips |
| Vendor chunk splitting | React, framework runtime, shared deps | Bundler does this automatically; verify with bundle analyzer |

```tsx
"use client";
// Next.js component-level splitting.
// `ssr: false` is only legal inside a Client Component. From a Server Component
// (the App Router default) it is a hard build error, so wrap the dynamic import
// in a small "use client" entrypoint and render that instead.
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // the lib is not SSR-safe: it touches window/document at import time
});

// Library-level splitting inside a component
export async function handleExport() {
  const { saveAs } = await import("file-saver");
  const { default: jsPDF } = await import("jspdf");
  // ... use them
}
```

TypeScript `target` matters here: raising `target: "ES5"` to `"ES2020"` commonly shaves 15-30% off dist size before minification, because the compiler stops downlevelling async/await, classes, generators, and spread into helper-heavy ES5. Turn on `"importHelpers": true` + `tslib` if you must target pre-ES2017. The UI baseline this plugin prescribes is `target: "es2022"`; see `references/typescript/01-ts6-essentials.md` § Required tsconfig for UI projects.

Avoid:

| Anti-pattern | Fix |
|--------------|-----|
| `import _ from "lodash"` | `import debounce from "lodash/debounce"` (or `lodash-es` with tree-shaking) |
| Barrel files (`export * from "./x"`) on the hot import path | Direct imports |
| `moment` (huge locale chunks) | `date-fns` / `dayjs` with explicit plugins |
| `core-js` polyfills for modern browsers | `browserslist: "last 2 versions, not dead"` + no core-js needed |

Sources: https://webpack.js.org/guides/code-splitting, https://vitejs.dev/guide/features.html#dynamic-import.

## Image optimization

Priority ladder: AVIF → WebP → JPG/PNG. Serve the first the browser accepts.

```html
<picture>
  <source type="image/avif" srcset="hero-800.avif 800w, hero-1600.avif 1600w, hero-2400.avif 2400w" sizes="(min-width: 1024px) 50vw, 100vw">
  <source type="image/webp" srcset="hero-800.webp 800w, hero-1600.webp 1600w, hero-2400.webp 2400w" sizes="(min-width: 1024px) 50vw, 100vw">
  <img
    src="hero-1600.jpg"
    alt="Product hero"
    width="1600"
    height="900"
    fetchpriority="high"
    decoding="async"
  >
</picture>
```

Rules:

| Rule | Why |
|------|-----|
| AVIF first, WebP fallback, JPG/PNG last | AVIF 25-50% smaller than JPG, 15-25% smaller than WebP |
| Always set `width` + `height` (or `aspect-ratio`) | Zero CLS |
| `srcset` + `sizes` for responsive | Browser picks the smallest file that fits the viewport |
| `loading="eager"` + `fetchpriority="high"` on LCP image | Ensures LCP candidate is prioritised |
| `loading="lazy"` below the fold | Saves bandwidth |
| `decoding="async"` everywhere | Non-blocking decode |
| `<picture>` only when art-directing (different crops per breakpoint) | Otherwise `<img srcset>` is enough |
| Compress AVIF with Q 60-70, WebP with Q 75-80 | Visually lossless, much smaller than JPG |
| Never lazy-load the LCP image | LCP regression is severe |

Next.js: `<Image>` component handles most of this automatically: AVIF, WebP, `srcset`, lazy, `fetchPriority`, blur placeholder. Set `priority` on the LCP image.

```tsx
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1600}
  height={900}
  priority  // → fetchpriority="high", loading="eager"
  sizes="(min-width: 1024px) 50vw, 100vw"
/>
```

**Dimension handoff.** Everything above is the *byte* half of responsive images: which format, which compression, which file the browser downloads, whether the box is reserved. The *sizing* half belongs to `references/responsive/` and the responsive reviewer: whether the `sizes` attribute actually describes the rendered layout width at each breakpoint (a wrong `sizes` picks a wrong `srcset` entry and no byte audit catches it), whether the crop needs `<picture>` art direction because the composition breaks in portrait, whether the fluid image pairs `aspect-ratio` with `width: 100%; height: auto`, whether `object-fit`/`object-position` are right on constrained media, and whether background images ship `image-set()` for DPR. Do not treat either lens as covering the other.

Sources: https://nextjs.org/docs/app/api-reference/components/image, https://web.dev/articles/serve-images-webp.

## Font loading

```html
<!-- Preload exactly the critical font file, matching format -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

<style>
  @font-face {
    font-family: "Inter";
    src: url("/fonts/inter-var.woff2") format("woff2-variations");
    font-weight: 100 900;  /* variable font: one file covers all weights */
    font-style: normal;
    font-display: swap;
    size-adjust: 107%;
    ascent-override: 90%;
    descent-override: 22%;
    line-gap-override: 0%;
  }
</style>
```

Rules:

| Rule | Why |
|------|-----|
| Self-host (don't use `fonts.googleapis.com` CDN) | Saves DNS + connection to a third-party origin; more reliable cache |
| `font-display: swap` | Show fallback immediately, swap when font loads; no invisible text (FOIT) |
| Subset to language (only needed glyphs) | Latin subsets can be 15-30KB vs 150KB+ full |
| Variable fonts when possible | One file for all weights/widths; ~50% smaller than serving 4 static weights |
| Metric overrides match fallback | Zero CLS during the font swap |
| `crossorigin` on preload | Required even for same-origin fonts |
| Limit to 2 weights per family in the critical path | Each weight is a request if not variable |

Frameworks: `next/font` does preload + self-hosting + metric-override generation + subsetting automatically, including for Google Fonts and local files. Source: https://nextjs.org/docs/app/api-reference/components/font.

### Font metric override calculator

Use `https://seek-oss.github.io/capsize/font-metrics` or the browser-measured values from a reference implementation. Without metric overrides, `font-display: swap` visibly reflows when the custom font loads, which is visible CLS. With correct overrides, the swap is pixel-perfect.

Source: https://web.dev/articles/css-size-adjust, https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/size-adjust.

## Resource hints

| Hint | Purpose | Limit |
|------|---------|-------|
| `<link rel="preconnect" href="https://cdn...">` | DNS + TLS handshake for an origin you'll definitely use | <= 3 origins (each one costs connection memory) |
| `<link rel="dns-prefetch" href="...">` | DNS only; cheap; use for low-priority third-parties | No hard limit, but don't spray |
| `<link rel="preload" as="image" href="hero.avif" fetchpriority="high">` | Fetch a critical above-fold resource ASAP | Only for genuine LCP / critical path |
| `<link rel="preload" as="font" type="font/woff2" crossorigin href=...>` | Same, for fonts | 1-2 critical fonts max |
| `<link rel="modulepreload" href="/chunks/app.js">` | ESM modules: fetches AND parses AND compiles ahead of use | For next-route code-split chunks |
| `<link rel="prefetch" href="/products">` | Idle-priority fetch for likely next navigation | Cap based on device / network conditions |

Rule: `preload` for this-page critical; `prefetch` / `modulepreload` for next-page; `preconnect` only where you control the origin and will definitely hit it.

Sources: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload, https://web.dev/articles/preconnect-and-dns-prefetch.

## Speculation Rules API

Declarative prefetch / prerender for likely-next navigations. Browser rate-limits automatically; you declare intent, browser decides when to execute.

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "source": "list",
      "urls": ["/products", "/pricing"]
    },
    {
      "where": { "href_matches": "/product/*" },
      "eagerness": "moderate"
    }
  ],
  "prefetch": [
    {
      "where": { "selector_matches": "a[data-prefetch]" },
      "eagerness": "conservative"
    }
  ]
}
</script>
```

| Key | Values |
|-----|--------|
| `source` | `"list"` (explicit URLs), `"document"` (match via where/selector) |
| `eagerness` | `"conservative"` (on interaction), `"moderate"` (on hover + ~200ms), `"eager"` (as soon as possible), `"immediate"` (right now) |
| `where.href_matches` | URL pattern |
| `where.selector_matches` | CSS selector on the current page |

Prerender is expensive: the browser renders the full page in a hidden tab. Use sparingly (2-3 URLs with high confidence). Prefetch is cheap; use more liberally. Sources: https://developer.chrome.com/docs/web-platform/prerender-pages, https://developer.chrome.com/docs/web-platform/implementing-speculation-rules.

## bfcache eligibility: treat as a release gate

Back/forward cache restores a fully-rendered page with near-zero cost. A page that fails bfcache pays a full reload on every back/forward navigation.

Rules:

| Rule | Detail |
|------|--------|
| No `unload` event listeners | Use `pagehide` instead |
| No `Cache-Control: no-store` on the main HTML | Use `no-cache` or `max-age=0, must-revalidate` if you need revalidation |
| No open WebSocket that persists forever | Close on `pagehide`, reopen on `pageshow` |
| No open `IndexedDB` transaction | Close transactions synchronously |
| No active MediaStream / getUserMedia | Stop tracks on `pagehide` |
| No active `BroadcastChannel` / `SharedWorker` holding references | Close on `pagehide` |
| No `beforeunload` listener (except to prompt about unsaved changes) | Use sparingly |

Inspect failure reasons in the PerformanceObserver:

```ts
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === "navigation" && (entry as PerformanceNavigationTiming).notRestoredReasons) {
      const reasons = (entry as any).notRestoredReasons;
      console.warn("bfcache miss:", reasons);
      // report to RUM
    }
  }
}).observe({ type: "navigation", buffered: true });
```

Chrome DevTools > Application > Back/forward cache also shows failure reasons directly. Sources: https://web.dev/articles/bfcache, https://developer.mozilla.org/docs/Glossary/bfcache, https://developer.mozilla.org/en-US/docs/Web/API/NotRestoredReasons.

## Third-party scripts

| Strategy | When | Tool |
|----------|------|------|
| `<script defer>` | Script runs after parsing but before `DOMContentLoaded`, in order | Default for non-critical scripts |
| `<script async>` | Script runs as soon as downloaded, out of order | Analytics, independent trackers |
| Web Worker (Partytown) | Heavy analytics, GTM, ad scripts, run on the worker thread | Analytics that don't need the main thread |
| IntersectionObserver-triggered | Load when component scrolls near viewport | Chat widgets, video embeds, social embeds |
| `afterInteractive` / `lazyOnload` | Framework-scheduled | `next/script` |
| Facade pattern | Show a static preview, swap to the real widget on interaction | YouTube embeds, Maps, chat widgets |

Next.js `<Script>`:

```tsx
import Script from "next/script";

// Analytics: defer past hydration, still runs on every page view
<Script src="/analytics.js" strategy="afterInteractive" />

// Chat widget: load only after everything else settles
<Script src="/chat.js" strategy="lazyOnload" />

// Consent-aware third-party: gate on consent state
{hasConsent && <Script src="/tracker.js" strategy="afterInteractive" />}
```

Budget the whole third-party surface: <= 150KB compressed combined. Flag any sync third-party script in `<head>` as a defect. Partytown (`https://partytown.builder.io/`) offloads GTM/GA/Hotjar to a Worker; main thread stays free for interaction.

Sources: https://nextjs.org/docs/app/api-reference/components/script, https://partytown.builder.io.

## Anti-patterns

| Anti-pattern | Why it hurts | Fix |
|--------------|--------------|-----|
| Sync `<script>` in `<head>` | Blocks HTML parser and paint | `defer` / `async` / move to bottom |
| Blocking analytics | Inflates LCP, TBT, INP | `next/script strategy="afterInteractive"` or Partytown |
| `import _ from "lodash"` | Ships 70KB+ instead of 2KB for one function | `import debounce from "lodash/debounce"` |
| `import { fn } from "@my/huge-barrel"` on a hot route | Imports the whole barrel unless the bundler can re-export-link | Direct imports from the module; set `"sideEffects": false` |
| `core-js` polyfills targeting ES5 | Modern browsers don't need them; legacy browsers don't visit modern sites | `browserslist: "supports es6-module"`; ship ES2020+ |
| `loading="lazy"` on the LCP image | LCP regression, commonly +1s | Remove; add `fetchpriority="high"` |
| Fonts from `fonts.googleapis.com` | Extra DNS + connection + no preload control | Self-host via `next/font`, or `fontaine` on a non-Next stack |
| `Cache-Control: no-store` on HTML | Disqualifies bfcache | `no-cache` or `max-age=0, must-revalidate` |
| `unload` event listener | Disqualifies bfcache | `pagehide` |
| Prerender too many URLs with `"eagerness": "eager"` | Browser aborts speculations; wastes bandwidth | 2-3 URLs max, or use `"moderate"` |
| Preloading everything | Browser can't prioritise what's truly critical | Preload only the LCP image + critical font |

## Sources (canonical)

| Topic | URL |
|-------|-----|
| Image component (Next.js) | https://nextjs.org/docs/app/api-reference/components/image |
| Font component (Next.js) | https://nextjs.org/docs/app/api-reference/components/font |
| Script component (Next.js) | https://nextjs.org/docs/app/api-reference/components/script |
| Serve WebP/AVIF | https://web.dev/articles/serve-images-webp |
| size-adjust | https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/size-adjust |
| preload / preconnect | https://web.dev/articles/preconnect-and-dns-prefetch |
| Speculation Rules | https://developer.chrome.com/docs/web-platform/implementing-speculation-rules |
| Prerender | https://developer.chrome.com/docs/web-platform/prerender-pages |
| bfcache | https://web.dev/articles/bfcache |
| NotRestoredReasons | https://developer.mozilla.org/en-US/docs/Web/API/NotRestoredReasons |
| Partytown | https://partytown.builder.io |
| Next.js lazy loading (`ssr: false` rules) | https://nextjs.org/docs/app/guides/lazy-loading |
| fontaine (metric overrides outside Next) | https://github.com/unjs/fontaine |
| Tree-shaking and side effects (webpack) | https://webpack.js.org/guides/tree-shaking |
| Runtime cost of the shipped code | `references/performance/07-runtime-engine-patterns.md` (in-plugin) |
