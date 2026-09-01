---
topic: performance
role: reference
scope: runtime-engine
audience: ui-engineer
---

# JavaScript Runtime and Engine Patterns

The engine-level model behind INP, long animation frames, and scroll jank. Every other file
in this domain works at the framework layer: fewer components, smaller bundles, better
boundaries. This one works one layer down, at the level where the JIT decides whether your
hot handler compiles to a few machine instructions or to a hash-table lookup per property
access.

Scope discipline first, because this lens is easy to misuse. Engine-level findings are
**only worth raising when a measurement already points at them**: a LoAF entry blaming a
specific function, a Performance-panel flame chart with a fat self-time frame, a heap
snapshot showing retained detached nodes. Absent that evidence, an engine claim is a guess
dressed as expertise. Keep the canonical confidence class (usually `Pattern smell`), append
`[unverified: runtime measurement needed]` to the `Evidence:` line, and cap the finding at
MEDIUM until a captured profile backs it.

The numbers below are V8's (Chrome, Edge, Node, Electron). JavaScriptCore and SpiderMonkey
use the same families of optimization with different thresholds, so the *shapes* of the
advice transfer even where the exact counts do not.

## Hidden classes and shape stability

V8 does not store object properties in a hash map when it can avoid it. Each object points
at a hidden class (internally a Map) describing its layout, and a property read compiles to
"check the hidden class, then load at a fixed offset". Two objects that were built the same
way share a hidden class; two that were not, do not.

Every property addition creates a *transition* to a new hidden class. Order matters, so
these two objects have different final hidden classes despite identical contents:

```js
const a = {}; a.x = 1; a.y = 2;   // {} -> {x} -> {x,y}
const b = {}; b.y = 2; b.x = 1;   // {} -> {y} -> {y,x}
// a and b now have different hidden classes. Any function reading .x from both
// sees two shapes instead of one.
```

| Pattern | Effect on shape | Fix |
|---|---|---|
| Properties added conditionally after construction (`if (x) obj.extra = ...`) | Two shapes for what is conceptually one type | Initialize every field in one object literal; use `null`/`undefined` for absent values |
| Property added in a different order in a second code path | Divergent transition chains for the same logical type | One factory function or one constructor per type |
| `delete obj.key` | Drops the object to dictionary mode (hash-map properties), permanently for that object | Set to `undefined`, or rebuild the object without the key |
| Objects assembled by spreading a variable number of sources | Shape depends on runtime data | Normalize to a fixed shape at the boundary, which is what a Zod/valibot parse already gives you |
| Numeric-keyed object used as a sparse map | Falls into dictionary elements | Use `Map` |

The UI-relevant version: **normalize API payloads into one fixed shape at the network
boundary**, and construct list-row objects from a single factory. A list of 5,000 rows built
by three different code paths gives the row renderer three shapes instead of one, and the
next section explains what that costs.

The `references/typescript/` domain already prescribes the mechanism: a Zod parse at the
edge produces objects with identical key sets in identical order, which is shape stability
for free. That is the strongest practical argument for boundary validation that has nothing
to do with types.

## Inline caches: monomorphic, polymorphic, megamorphic

Every property access site in optimized code carries an inline cache recording which hidden
classes it has seen.

| State | Shapes seen at that site | Cost per access |
|---|---|---|
| Monomorphic | 1 | Fastest: a shape check plus a fixed-offset load, a handful of instructions |
| Polymorphic | 2 to 4 | A short linear scan of the cached shapes, then the load |
| Megamorphic | 5 or more | Falls back to a global stub cache lookup, and misses there fall through to the full runtime lookup. Roughly an order of magnitude slower than monomorphic in tight loops |

V8's polymorphic limit is 4 (`kMaxPolymorphicMapCount`); the fifth distinct shape at a site
tips it megamorphic, and the site does not recover when the extra shapes stop appearing.

Where this actually bites in UI code:

| Site | Why it goes megamorphic | Fix |
|---|---|---|
| A generic `renderCell(row, column)` used across several tables | Each table's row objects have a different shape | One row type per table, or a normalized `{ id, values }` shape |
| A shared `formatValue(x)` called with strings, numbers, dates, nulls and objects | The property loads inside see every shape | Split into per-type formatters and dispatch once at the call site |
| Event delegation handlers reading `.dataset.*` off arbitrary elements | DOM element subtypes are distinct shapes | Read once into a plain local object at the top of the handler |
| A `props`-walking utility (`pick`, `omit`, deep-merge) applied to every component's props | Every component's props object is its own shape | Keep such utilities off hot paths; do the work at module scope or at parse time |

Measurement: you cannot see IC state from DevTools. `node --allow-natives-syntax` with
`%HaveSameMap()` or `d8 --trace-ic` can, and that is a targeted debugging exercise, not a
review step. In a review, the observable is a function with high self time in the flame
chart that does nothing but read properties. That combination is the tell.

## Allocation pressure in render and scroll paths

V8 splits the heap into a young generation collected by the Scavenger and an old generation
collected by Mark-Compact. Young-generation collection is cheap per object but not free per
event: the semi-space is small (a few MB, sized adaptively), so a handler that allocates
aggressively can trigger a minor GC inside a frame budget of 16.7ms.

The failure signature is characteristic and easy to recognize in the Performance panel: an
evenly spaced sawtooth in the memory track, and short GC blocks landing between frames
during a scroll or a drag.

Allocation sources that matter in UI code:

| Source | Allocates per call | Fix |
|---|---|---|
| Array methods chained in a scroll or `pointermove` handler (`.map().filter().slice()`) | One intermediate array per link in the chain | Single pass with a `for` loop on the hot path only; leave the readable chain elsewhere |
| `getBoundingClientRect()` in a loop | A fresh `DOMRect` object per call, plus a forced layout (see `03-css-perf.md`) | Read once, cache, invalidate on resize |
| Template literals or `JSON.stringify` inside `requestAnimationFrame` | New string per frame; long strings go straight to old space | Precompute; mutate style properties directly instead of rebuilding `cssText` |
| Object/array literals passed as props on every render | New object per render, which also breaks `memo` identity checks | Hoist to module scope, `useMemo`, or let the React Compiler handle it (`02-react-19-perf.md`) |
| `new Date()`, `new Intl.NumberFormat()`, `new RegExp()` per row | `Intl` formatter construction is expensive well beyond the allocation itself | Hoist the formatter to module scope and reuse it across all rows |
| Closures created per item in a large list | One function object per item per render | Hoist the handler and use event delegation, or pass the id via a data attribute |

The `Intl` case is worth calling out because it is common and large: constructing a
`NumberFormat` or `DateTimeFormat` inside a row renderer for a 1,000-row table constructs
1,000 formatters. Hoisting it to module scope is a one-line change that routinely removes a
visible chunk of a table's render time.

## Closure retention and detached DOM

Long-lived closures keep everything in their enclosing scope alive, including DOM nodes that
have been removed from the document. The result is a heap that grows across navigations
while the UI looks fine, which surfaces later as slow GC pauses and, on low-memory devices,
as a tab crash.

| Leak | Mechanism | Fix |
|---|---|---|
| `addEventListener` on `window`, `document`, or `visualViewport` without removal | The listener closure retains the component's scope, including its DOM refs | Remove in the effect cleanup, or pass `{ signal }` from an `AbortController` and abort in cleanup |
| `IntersectionObserver` / `ResizeObserver` / `MutationObserver` never disconnected | The observer retains its targets | `disconnect()` in cleanup |
| `setInterval` never cleared | The callback closure survives the component | `clearInterval` in cleanup |
| A module-scope `Map` or array keyed by DOM node or component id | Strong reference, never collected | `WeakMap`/`WeakRef`, or explicit removal |
| A cached callback holding an entire large payload to read one field | Retains the whole response | Destructure the field you need before capturing |

One `AbortController` cleans up every listener a component added:

```ts
useEffect(() => {
  const ac = new AbortController();
  window.addEventListener("resize", onResize, { signal: ac.signal });
  window.addEventListener("scroll", onScroll, { signal: ac.signal, passive: true });
  document.addEventListener("keydown", onKey, { signal: ac.signal });
  return () => ac.abort();
}, []);
```

Detection, and this one a reviewer really can run: DevTools > Memory > Heap snapshot, then
filter the class list for `Detached`. Navigate away from the screen, force a collection,
snapshot again. Detached nodes still present after collection are retained by something, and
the retainers pane names it. Repeating a navigation five times and watching the detached
count climb linearly is proof, not inference.

## Deoptimization triggers

TurboFan compiles a function on the assumption that its inputs keep the types it has already
seen. When that assumption breaks the function deoptimizes back to the interpreter, and
frequent deopt-reopt cycles cost more than never optimizing at all.

| Trigger | What breaks | Fix |
|---|---|---|
| A variable that holds a number, then a string, then an object | Type feedback invalidated | One type per variable; TypeScript makes this the default outcome, so this is mostly a JS-interop problem |
| Arrays that change element kind | `PACKED_SMI` -> `PACKED_DOUBLE` -> `PACKED` are one-way transitions and never go back | Keep numeric arrays numeric; do not push `null` or a string into an array of numbers |
| Holey arrays (`new Array(n)`, `arr[100] = x` on a length-3 array, `delete arr[i]`) | Element access must check for holes on every read | `Array.from({ length: n }, ...)`, `push`, or `fill` |
| `arguments` leaked out of a function | Blocks several optimizations | Rest parameters (`...args`) |
| Reading `.length` off a value that is sometimes a string and sometimes an array | Polymorphic load on a hot path | Narrow before the loop |
| `eval` or `with` in scope | Disables scope analysis for the whole enclosing function | Never, in application code |

`try`/`catch` and `let`/`const` in loops are **not** deopt triggers in current V8, despite
advice that still circulates. Do not raise them as findings.

## Web Workers: the honest boundary

Moving work off the main thread is the only fix that survives when the work is genuinely
expensive. The cost is the transfer.

| Consideration | Detail |
|---|---|
| Structured clone is a copy | Posting a 10MB array copies 10MB, on both sides. For large binary payloads use `Transferable` (`ArrayBuffer`, `ImageBitmap`, `OffscreenCanvas`) so ownership moves instead |
| Worker startup is not free | A few milliseconds plus module parse. Start it once at app boot, not per interaction |
| The DOM is not available | Workers suit parsing, sorting, filtering, diffing, crypto, image decode, and compression. They do not suit anything that needs layout |
| Comlink or a small request/response protocol | Raw `postMessage` correlation logic is where worker code usually goes wrong |

Rule of thumb: below ~5ms of main-thread work, `scheduler.yield()` or `requestIdleCallback`
is simpler and cheaper than a worker. Above ~50ms, and especially when it repeats, the
worker wins even after the copy.

## Mapping an engine cause to a measurable symptom

The only defensible way to raise a finding from this file.

| Observed symptom | Where it shows up | Engine cause to check |
|---|---|---|
| INP `processingDuration` dominant | web-vitals attribution (`05-measurement.md`) | Handler doing property-heavy work over mixed shapes; per-item allocation; formatter construction per row |
| INP `presentationDelay` dominant | Same | Large DOM, forced synchronous layout, expensive style recalc. This is `03-css-perf.md`, not this file |
| LoAF `forcedStyleAndLayoutDuration` large | LoAF entries (`05-measurement.md`) | Interleaved DOM reads and writes; `getBoundingClientRect` in a loop |
| Flame chart shows one function with high self time and no children | DevTools Performance | Megamorphic property access or per-call allocation inside that function |
| Sawtooth memory track, GC blocks between frames | DevTools Performance, memory track enabled | Allocation pressure in a scroll, drag, or animation handler |
| Heap grows monotonically across repeated navigations | DevTools Memory heap snapshots | Closure retention, undisconnected observers, detached DOM |
| Scroll jank with a healthy INP | DevTools Rendering > Frame Rendering Stats | Scroll is excluded from INP by definition. Diagnose via LoAF and frame stats |

That last row matters and is easy to get wrong: INP's `interactionType` is only `pointer` or
`keyboard`, so a scroll-jank complaint will never appear in INP data no matter how bad it
gets. `05-measurement.md` carries the same warning next to the triage order.

## Reviewer checklist

Ordered by how often each one is the actual cause in real UI code.

1. Are `Intl.*` formatters, `RegExp` literals, and schema objects constructed per row or per
   render instead of at module scope?
2. Does every `addEventListener`, observer, interval, and subscription have a cleanup path?
3. Do scroll, `pointermove`, and resize handlers allocate per event (array chains, rects,
   template literals, new closures)?
4. Are API payloads normalized to one fixed shape at the boundary, or are row objects built
   by several code paths?
5. Is there a generic utility (`formatValue`, `pick`, deep-merge) applied to every item of a
   large list?
6. Are numeric arrays kept dense and numeric, without `new Array(n)` holes?
7. Is any main-thread work over ~50ms that could be a worker, still on the main thread?
8. Is any of the above supported by a captured profile? If not, it keeps its canonical
   class, carries `[unverified: runtime measurement needed]` on its `Evidence:` line, and is
   capped at MEDIUM; it is not a defect.

## Sources (canonical)

| Topic | URL |
|---|---|
| V8 hidden classes and shapes | https://v8.dev/blog/fast-properties |
| Inline caches and shape polymorphism | https://mathiasbynens.be/notes/shapes-ics |
| V8 element kinds (packed vs holey) | https://v8.dev/blog/elements-kinds |
| Trash talk: the Orinoco garbage collector | https://v8.dev/blog/trash-talk |
| Optimize long tasks | https://web.dev/articles/optimize-long-tasks |
| Off the main thread | https://web.dev/articles/off-main-thread |
| Long Animation Frames | https://developer.chrome.com/docs/web-platform/long-animation-frames |
| Fix memory problems (DevTools) | https://developer.chrome.com/docs/devtools/memory-problems |
| Record heap snapshots | https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots |
| AbortSignal on addEventListener (MDN) | https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener |
| Transferable objects (MDN) | https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects |
| scheduler.yield() | https://developer.chrome.com/blog/introducing-scheduler-yield |
