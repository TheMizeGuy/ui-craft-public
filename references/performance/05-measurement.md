---
topic: performance
role: reference
scope: measurement
audience: ui-engineer
---

# Measurement: Field, Lab, RUM, LoAF, CI Budgets

Every tool, field, and threshold below is sourced to a public URL inline or in the canonical table at the foot of the file. Once a measurement points at a cause, `07-runtime-engine-patterns.md` maps symptoms to engine-level causes.

## Field data sources

Field data is what Google ranks on. Trust it over lab.

| Source | Scope | Access | Granularity |
|--------|-------|--------|-------------|
| CrUX (Chrome User Experience Report) | All sites with sufficient Chrome traffic | Public (BigQuery + CrUX API + PSI) | Origin + URL; p75 + percentile histograms |
| CrUX API | Programmatic CrUX | REST API, key-gated | URL or origin, form factor, network |
| PageSpeed Insights (PSI) | Lab + field combined per URL | Free UI, API | URL, form factor |
| Google Search Console CWV report | Your verified sites only | GSC UI | URL group aggregations |
| Your own RUM (web-vitals + analytics endpoint) | Your traffic, your segments | Self-hosted / SaaS | Any segment you capture (navigation type, route, auth state, device) |
| SaaS RUM (Vercel Analytics, SpeedCurve, DebugBear, Calibre) | Your traffic | Paid | Any segment + pre-built dashboards |

Rule: monitor CrUX for ranking signal, self-hosted RUM for debugging + attribution. CrUX updates monthly; RUM is real-time.

Sources: https://developer.chrome.com/docs/crux, https://developer.chrome.com/docs/crux/api, https://pagespeed.web.dev.

## `web-vitals` JavaScript library

Install `web-vitals` 6.x. Ships two bundles: base (small) and `attribution` (adds source-element / phase info per metric).

Two major-version changes that matter if you are reading older setup code: **v5 removed `onFID`** (FID was replaced by INP in March 2024 and is no longer reported at all), and **v6 added soft-navigation support** behind `reportSoftNavs: true`.

```bash
npm install web-vitals
```

```ts
// src/lib/rum.ts
import { onLCP, onINP, onCLS, onTTFB, onFCP } from "web-vitals/attribution";

function send(name: string, metric: any) {
  const body = JSON.stringify({
    name,
    value: metric.value,
    rating: metric.rating,         // "good" | "needs-improvement" | "poor"
    id: metric.id,                 // unique per page load
    navigationType: metric.navigationType, // "navigate" | "reload" | "back-forward" | "back-forward-cache" | "prerender" | "restore" | "soft-navigation"
    attribution: metric.attribution,
    url: location.href,
    route: /* your route key */ null,
  });

  if ("sendBeacon" in navigator) {
    navigator.sendBeacon("/rum", body);
  } else {
    fetch("/rum", { method: "POST", body, keepalive: true });
  }
}

export function initRUM() {
  // reportSoftNavs: true is safe to set unconditionally. The library ignores it
  // when the browser does not support the soft-navigation entry type.
  const opts = { reportAllChanges: false, reportSoftNavs: true };
  onLCP((m) => send("LCP", m), opts);
  onINP((m) => send("INP", m), opts);
  onCLS((m) => send("CLS", m), opts);
  onTTFB((m) => send("TTFB", m));
  onFCP((m) => send("FCP", m), opts);
}
```

Call `initRUM()` once at app boot. `reportAllChanges: false` is the default and reports the final session value, not intermediate updates.

Key attribution fields:

| Metric | Attribution contains |
|--------|-----------------------|
| LCP | `element`, `url`, `timeToFirstByte`, `resourceLoadDelay`, `resourceLoadDuration`, `elementRenderDelay` |
| INP | `interactionTarget`, `interactionType` (`"pointer"` or `"keyboard"` only), `inputDelay`, `processingDuration`, `presentationDelay`, `longAnimationFrameEntries`, `longestScript` |
| CLS | `largestShiftTarget`, `largestShiftTime`, `largestShiftValue`, `loadState` |
| TTFB | `waitingDuration`, `cacheDuration`, `dnsDuration`, `connectionDuration`, `requestDuration` |
| All (v6, opt-in) | `metric.navigationType === "soft-navigation"` plus a per-navigation id, when `reportSoftNavs: true` is passed and the browser supports the `soft-navigation` entry type. This is the only way to attribute CWV to individual client-side route changes; without it every soft navigation folds into the initial page load, which is exactly wrong for the client-routed React apps this plugin mostly produces |

Sources: https://github.com/GoogleChrome/web-vitals, https://github.com/GoogleChrome/web-vitals#attribution-build.

## Sample code: full Next.js RUM setup

Segment by `navigationType` so bfcache restores and prerenders don't pollute averages.

```tsx
// app/rum.tsx: client component, loaded once
"use client";
import { useReportWebVitals } from "next/web-vitals";

export function RUM() {
  useReportWebVitals((metric) => {
    const body = {
      name: metric.name,                // "LCP" | "INP" | "CLS" | "FCP" | "TTFB" | "Next.js-*"
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      attribution: (metric as any).attribution ?? null,
      url: location.pathname,
      route: document.querySelector<HTMLMetaElement>('meta[name="x-route"]')?.content ?? null,
      connection: (navigator as any).connection?.effectiveType ?? null,
      deviceMemory: (navigator as any).deviceMemory ?? null,
    };
    navigator.sendBeacon?.("/api/rum", JSON.stringify(body)) ||
      fetch("/api/rum", { method: "POST", body: JSON.stringify(body), keepalive: true });
  });
  return null;
}
```

```tsx
// app/layout.tsx
import { RUM } from "./rum";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RUM />
      </body>
    </html>
  );
}
```

Server handler:

```ts
// app/api/rum/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  // Drop prerender-origin entries: they inflate LCP and mean nothing
  if (body.navigationType === "prerender") return Response.json({ ok: true });
  // Push to InfluxDB / ClickHouse / Postgres / Vercel
  await storeRUM(body);
  return Response.json({ ok: true });
}
```

Segment dashboards by `navigationType`. `"navigate"` and `"reload"` are your real LCP; `"back-forward-cache"` is near-zero (that's the bfcache win); `"prerender"` should be near-zero too and can be excluded from LCP averages.

Source: https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals.

## Lab tools (debugging)

| Tool | Use when |
|------|----------|
| Lighthouse (DevTools) | Local repro; simulates mid-tier mobile + slow 4G by default; one cold run |
| PageSpeed Insights (PSI) | Lab + field combined per URL; public-facing sanity check |
| WebPageTest | Multi-run median, waterfall, film strip, custom scripts, global locations |
| Chrome DevTools > Performance | Frame-by-frame profile; flame chart; layout events; INP attribution |
| Chrome DevTools > Rendering | Paint flashing, layout shift regions, `content-visibility` bounds, FPS meter |
| DebugBear | Continuous lab monitoring; regression alerts; per-deploy diffs |
| Calibre | Similar to DebugBear |
| SpeedCurve | Continuous + synthetic + RUM combined |
| Unlighthouse | Site-wide Lighthouse; full-site reports |

Lab runs are for reproducing and root-causing, not for declaring pass/fail. Always cross-check against field.

Sources: https://developer.chrome.com/docs/lighthouse, https://pagespeed.web.dev, https://www.webpagetest.org, https://www.debugbear.com.

## Long-Animation-Frame API (LoAF)

Replaces the older Long Tasks API with frame-level attribution. Available Chromium 123+.

```ts
// Capture any animation frame that took >50ms
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries() as PerformanceLongAnimationFrameTiming[]) {
    if (entry.duration < 50) continue;
    for (const script of entry.scripts) {
      console.warn(
        "LoAF",
        entry.duration,
        script.invoker,          // e.g. "onclick", "setTimeout", "Promise.then"
        script.sourceURL,        // origin of the script that caused the delay
        script.sourceFunctionName,
        script.duration,         // how long this script ran
        script.forcedStyleAndLayoutDuration,
      );
    }
  }
});
observer.observe({ type: "long-animation-frame", buffered: true });
```

Key fields per script entry:

| Field | What |
|-------|------|
| `invoker` | Type of callback (event type, setTimeout, Promise, classic) |
| `invokerType` | `"user-callback"` | `"event-listener"` | `"resolve-promise"` | ... |
| `sourceURL`, `sourceFunctionName`, `sourceCharPosition` | Best-effort origin of the script |
| `duration` | Script duration |
| `forcedStyleAndLayoutDuration` | How much of that was forced style/layout |

LoAF beats the older `longtask` API because it tells you *which script* caused the slowdown, not just that a slowdown occurred. Use for INP root-cause in production. Sources: https://developer.chrome.com/docs/web-platform/long-animation-frames, https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming.

**Scroll jank is diagnosed here, not through INP.** INP's `interactionType` is only `"pointer"` or `"keyboard"`, and scrolling is excluded from the metric by definition, so a page can have a perfect INP and still stutter under every scroll. Use the LoAF stream above (long frames during a scroll, with the responsible script named), plus DevTools > Rendering > Frame Rendering Stats for the dropped-frame count, and DevTools > Performance for the flame chart. Engine-level causes for what those two surface are in `07-runtime-engine-patterns.md`.

## INP attribution debugging

Dashboard breakdown of a P75 INP issue:

| Phase | Meaning | Common offenders |
|-------|---------|------------------|
| Input delay (large) | Main thread was busy when user input arrived | Hydration, third-party script boot, heavy animation, synchronous fetch |
| Processing duration (large) | Your event handler is too slow | Synchronous work, heavy state update, forced sync layout inside the handler |
| Presentation delay (large) | Rendering the result is slow | Large DOM, expensive CSS (complex `:has()`, large box-shadows), layout thrash, non-GPU-composited animation |

Triage order:

1. Group INP events by `attribution.interactionType` (`"pointer"` or `"keyboard"`, the only two values). INP excludes scrolling by definition, so there is no scroll bucket to look for.
2. Group by `attribution.interactionTarget`: is one component disproportionately slow?
3. For the top offenders, inspect `attribution.longAnimationFrameEntries` and `attribution.longestScript`: which script?
4. Reproduce in Chrome DevTools Performance panel with the Interactions lane enabled.
5. Fix, confirm in lab, deploy, confirm in RUM.

Source: https://web.dev/articles/find-slow-interactions-in-the-field.

## Performance budgets in CI

Enforce budgets at every PR. Fail the build when exceeded.

### Lighthouse CI assertion config

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/", "http://localhost:3000/pricing"],
      "numberOfRuns": 5
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2200 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 200 }],
        "interactive": ["warn", { "maxNumericValue": 3500 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 1500 }],
        "speed-index": ["warn", { "maxNumericValue": 2500 }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 300000 }],
        "resource-summary:stylesheet:size": ["error", { "maxNumericValue": 80000 }],
        "resource-summary:font:size": ["error", { "maxNumericValue": 80000 }],
        "resource-summary:third-party:size": ["warn", { "maxNumericValue": 150000 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

### `budget.json` (Lighthouse standalone format)

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script",     "budget": 300 },
      { "resourceType": "stylesheet", "budget": 80 },
      { "resourceType": "image",      "budget": 400 },
      { "resourceType": "font",       "budget": 80 },
      { "resourceType": "third-party","budget": 150 },
      { "resourceType": "total",      "budget": 1500 }
    ],
    "resourceCounts": [
      { "resourceType": "third-party", "budget": 10 },
      { "resourceType": "total",       "budget": 50 }
    ],
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2200 },
      { "metric": "cumulative-layout-shift",  "budget": 0.05 },
      { "metric": "total-blocking-time",      "budget": 200 }
    ]
  }
]
```

Budgets are all in KB (sizes) or ms (timings). Fail the CI job when exceeded. Sources: https://github.com/GoogleChrome/lighthouse-ci, https://web.dev/articles/use-lighthouse-for-performance-budgets.

### Bundle-size gates

```jsonc
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "size-check": "size-limit"
  },
  "size-limit": [
    { "path": ".next/static/chunks/main-*.js", "limit": "120 KB" },
    { "path": ".next/static/chunks/framework-*.js", "limit": "60 KB" }
  ]
}
```

`size-limit` runs in CI; fails the job if a chunk exceeds the limit. Pair with `@next/bundle-analyzer` for root-cause. Source: https://github.com/ai/size-limit.

## Real-time perf dashboards

| Dashboard | Model |
|-----------|-------|
| Grafana + InfluxDB / ClickHouse (self-hosted) | Full control; RUM POSTs feed your time-series DB; dashboards per segment |
| Vercel Analytics | Frictionless on Vercel; p75 CWV, route segmentation, deploy overlays |
| SpeedCurve | Lab + field + synthetic unified; deploy diffs |
| DebugBear | Lab + field; good at trend detection |
| Calibre | Similar; strong synthetic + budgets |
| Sentry Performance | Combined with error monitoring; weaker on field CWV |
| Datadog RUM | Good for ops teams already on Datadog |

Pick one field dashboard + one synthetic monitor. Don't spread across five tools.

## Synthetic testing schedule

| Cadence | Purpose |
|---------|---------|
| On every PR | Lighthouse CI single-run per route; gate on assertions |
| Daily | Lighthouse CI 5-run median per route; track trend |
| Weekly | WebPageTest 9-run median (multi-location, real devices); full film strip and waterfall |
| Monthly | Competitor comparison: run your site + top 3 competitors on WebPageTest |
| On deploy (prod) | Lighthouse CI against the deployed URL + RUM freshness sanity check |

## When perf degrades after a deploy: playbook

| Step | Action |
|------|--------|
| 1. Confirm the regression is real | Check CrUX (slow), RUM (latest 24h), and lab reproduction. Exclude one-off spikes |
| 2. Bisect the deploy | Identify the last-good deploy; run Lighthouse on both; diff |
| 3. Check the waterfall | WebPageTest film strip + network waterfall. Look for: new blocking request, new third-party, enlarged LCP image, changed priority |
| 4. Profile JS execution | Chrome DevTools Performance; compare Main thread time, flame chart; look for new long tasks |
| 5. Check third-party versions | Did analytics / chat / A-B tool auto-update? Roll back if yes |
| 6. Check bundle size diff | `@next/bundle-analyzer` on both deploys; diff `.next/static/chunks/*`; identify new / grown chunks |
| 7. Check route-level size | Next: `analyze` build; Vite: `rollup-plugin-visualizer`. Did a new dependency land in the main chunk? |
| 8. Check LCP image attribution | RUM `attribution.element` + `attribution.resourceLoadDelay`: did the LCP image change? |
| 9. Check font changes | New weight? New family? Metric-override regressed? |
| 10. Check INP attribution | `attribution.interactionTarget` + LoAF `sourceURL`: which script caused it? |
| 11. Fix + deploy + verify in RUM | 24h observation before declaring resolved |

Keep the diff small: smaller deploys, smaller perf regressions, faster bisects.

## Sources (canonical)

| Topic | URL |
|-------|-----|
| web-vitals library | https://github.com/GoogleChrome/web-vitals |
| web-vitals attribution | https://github.com/GoogleChrome/web-vitals#attribution-build |
| web-vitals v5 upgrade notes (FID removal) | https://github.com/GoogleChrome/web-vitals/blob/main/docs/upgrading-to-v5.md |
| Soft navigations | https://developer.chrome.com/docs/web-platform/soft-navigations-experiment |
| Frame Rendering Stats (DevTools) | https://developer.chrome.com/docs/devtools/rendering/performance |
| CrUX overview | https://developer.chrome.com/docs/crux |
| CrUX API | https://developer.chrome.com/docs/crux/api |
| PageSpeed Insights | https://pagespeed.web.dev |
| useReportWebVitals (Next.js) | https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals |
| Long Animation Frames (Chrome) | https://developer.chrome.com/docs/web-platform/long-animation-frames |
| PerformanceLongAnimationFrameTiming | https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming |
| Find slow interactions | https://web.dev/articles/find-slow-interactions-in-the-field |
| Debug perf in the field | https://web.dev/articles/debug-performance-in-the-field |
| Lighthouse CI | https://github.com/GoogleChrome/lighthouse-ci |
| Performance budgets w/ Lighthouse | https://web.dev/articles/use-lighthouse-for-performance-budgets |
| size-limit | https://github.com/ai/size-limit |
| WebPageTest | https://www.webpagetest.org |
| DebugBear | https://www.debugbear.com |
