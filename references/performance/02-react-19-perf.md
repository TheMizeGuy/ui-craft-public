---
topic: performance
role: reference
scope: react-19
audience: ui-engineer
---

# React 19 Performance: Compiler, RSC, Suspense, Concurrent Hooks

Anchor version: **React 19.2** (released 2025-10-01), the current stable line. 19.0 shipped Dec 2024, 19.1 in March 2025, 19.2 in October 2025. React Compiler did not ship stable alongside 19.0: it reached **1.0 in October 2025**, roughly ten months later, and remains a separate opt-in build-time package. Install `@types/react@^19` + `@types/react-dom@^19`.

Anything below that names a version has been checked against react.dev. If a project is on an older 19.x, the `19.1 / 19.2 surfaces` section marks what is not available to it.

## React Compiler (1.0+)

| Aspect | Detail |
|--------|--------|
| What it does | Auto-memoizes components, hooks, and derived values. Generates the equivalent of `React.memo` / `useMemo` / `useCallback` at compile time, guided by React's Rules of React |
| Why it exists | Manual memoisation is error-prone (missing deps, stale closures, over-memoising). Compiler is correct by construction and typically outperforms hand-tuned memos |
| Opt-in | Babel plugin `babel-plugin-react-compiler@latest` (Next.js 16+: top-level `reactCompiler: true` in `next.config.ts`, stable; Next.js 15: `experimental.reactCompiler: true`; Vite: plugin from `babel-plugin-react-compiler`) |
| Disable a component | `"use no memo"` directive at the top of the function body. Reserved for components with impure code or unusual patterns |
| Healthcheck | Install `eslint-plugin-react-hooks@latest` (7+) and enable its `recommended` preset (flat config: `reactHooks.configs.flat.recommended`; `recommended-latest` is deprecated). That preset carries the compiler's diagnostics: it reports any component the compiler would refuse to compile, with the reason, and it works before the compiler is adopted. There is no separate `eslint-plugin-react-compiler` package to install; the one on npm is an abandoned release candidate |
| When to disable manually | Rare. Only when profiling shows the compiler-memoised component is slower than a hand-tuned variant (effectively never in app code; can happen in hot virtualised-list inner components) |

`babel.config.js`:

```js
module.exports = {
  plugins: [
    ["babel-plugin-react-compiler", {
      // Strictest mode: fail the build on rule violations
      panicThreshold: "all_errors",
      // target: "19" (default)
    }],
    "@babel/plugin-transform-react-jsx",
  ],
};
```

Rules of React enforcement (`eslint-plugin-react-hooks`, `recommended` preset):

| Rule | Violation means |
|------|-----------------|
| Components and hooks must be pure | No mutation of captured variables during render |
| Props / state / context are immutable | Don't write to them |
| Setting state during render is only allowed for derived-state pattern | Otherwise it is a side effect. Move it to an effect or an event |
| Hooks called at the top level | No conditional hook calls |
| Refs mutated only inside effects or event handlers | Never during render |

Compiler output preserves existing `React.memo` / `useMemo` / `useCallback`, so they are safe to leave or progressively remove. The Compiler skips files with `"use no memo"` at the top.

Source: https://react.dev/learn/react-compiler.

## Server Components vs Client Components

RSC is the default in Next.js App Router. A Server Component:

| Dimension | Server Component | Client Component |
|-----------|------------------|------------------|
| Where it runs | Server (once, per request or per build) | Server (SSR) + client (hydration + updates) |
| JS shipped to client | None for its own code | Its code + React runtime + deps |
| Async allowed | `async function Component()` | No (use `use()` hook for promises) |
| State / effects / refs | No | Yes |
| Event handlers | No (`onClick` is a client boundary) | Yes |
| Browser APIs (`window`, `localStorage`) | No | Yes (guard for SSR) |
| Directive | Default (no marker needed in App Router) | `"use client"` at top of file |
| Prop restrictions | Can pass serializable values + Client Components | n/a |

Decision tree:

```
Does this component need state / effects / browser APIs / event handlers?
├── No → Server Component (default). Ship zero JS.
└── Yes → Client Component. Push the `"use client"` boundary as low as possible.
          Let server components render the heavy static surrounding tree.
```

RSC payload size matters for INP: every byte of RSC payload is parsed before hydration can begin. Prefer plain HTML where interactivity isn't needed. Heavy third-party UI kits imported into an RSC tree still ship if any client descendant re-exports them.

Anti-pattern:

```tsx
// BAD: boundary at the route root forces the whole subtree to the client
"use client";
export default function Page() { /* 50 components */ }
```

Correct:

```tsx
// page.tsx (Server Component)
import { ServerHeavyChart } from "./server-heavy-chart";
import { InteractiveFilters } from "./interactive-filters"; // client component, small

export default async function Page() {
  const data = await db.query.metrics.findMany();
  return (
    <main>
      <h1>Dashboard</h1>
      <ServerHeavyChart data={data} />
      <InteractiveFilters />
    </main>
  );
}
```

Source: https://react.dev/reference/rsc/server-components, https://nextjs.org/docs/app/getting-started/server-and-client-components.

## Suspense boundaries

Place boundaries near uncached data, not at the route root. Each boundary streams independently, so slow data never blocks fast data.

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";
import { RevenueCard, OrdersCard, ActivityFeed } from "./cards";
import { Skeleton } from "@/ui/skeleton";

export default function Dashboard() {
  return (
    <main>
      <h1>Dashboard</h1>
      {/* Fast: paints immediately with the shell */}
      <QuickStats />

      {/* Three independent streams */}
      <Suspense fallback={<Skeleton lines={3} />}>
        <RevenueCard />
      </Suspense>
      <Suspense fallback={<Skeleton lines={3} />}>
        <OrdersCard />
      </Suspense>
      <Suspense fallback={<Skeleton lines={8} />}>
        <ActivityFeed />
      </Suspense>
    </main>
  );
}
```

Anti-pattern (one giant Suspense at the route root):

```tsx
// BAD: slowest query blocks every card
<Suspense fallback={<FullPageSkeleton />}>
  <RevenueCard />
  <OrdersCard />
  <ActivityFeed />
</Suspense>
```

Source: https://react.dev/reference/react/Suspense.

## `useDeferredValue`

For derived values that don't need urgent updates. Canonical use: filter a 10k-row list as the user types.

```tsx
"use client";
import { useDeferredValue, useMemo, useState } from "react";

export function SearchableList({ items }: { items: Row[] }) {
  const [query, setQuery] = useState("");
  // Urgent: the input re-renders immediately
  // Deferred: the expensive filter runs when React has bandwidth
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(
    () => items.filter((row) => row.name.includes(deferredQuery)),
    [items, deferredQuery],
  );

  const isStale = query !== deferredQuery;
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul style={{ opacity: isStale ? 0.6 : 1 }}>
        {filtered.map((row) => <li key={row.id}>{row.name}</li>)}
      </ul>
    </>
  );
}
```

Source: https://react.dev/reference/react/useDeferredValue.

## `useTransition`

For state updates that don't need to block input. Canonical use: tab switch that triggers a data fetch.

```tsx
"use client";
import { useTransition, useState } from "react";

export function Tabs() {
  const [tab, setTab] = useState<"home" | "reports" | "settings">("home");
  const [isPending, startTransition] = useTransition();

  const select = (next: typeof tab) => {
    startTransition(() => {
      setTab(next); // re-render happens in the background; old tab stays visible
    });
  };

  return (
    <div>
      <nav style={{ opacity: isPending ? 0.5 : 1 }}>
        <button onClick={() => select("home")}>Home</button>
        <button onClick={() => select("reports")}>Reports</button>
        <button onClick={() => select("settings")}>Settings</button>
      </nav>
      <TabPanel tab={tab} />
    </div>
  );
}
```

The key difference from `useDeferredValue`: `useTransition` wraps the *setter*, giving you `isPending`. `useDeferredValue` wraps the *value*, giving you a lagging copy.

Source: https://react.dev/reference/react/useTransition.

## `useOptimistic`

For instant feedback on mutations. Canonical use: like button, save indicator, optimistic add-to-cart.

```tsx
"use client";
import { useOptimistic, startTransition } from "react";
import { likePost } from "./actions";

export function LikeButton({ post }: { post: Post }) {
  const [optimisticCount, addOptimistic] = useOptimistic(
    post.likes,
    (state, delta: number) => state + delta,
  );

  const onClick = () => {
    startTransition(async () => {
      addOptimistic(1);        // shown for the length of the transition
      await likePost(post.id); // real state arrives; the optimistic value is discarded
    });
  };

  return <button onClick={onClick}>Like {optimisticCount}</button>;
}
```

Automatically reverts when the surrounding transition rejects. Only legal inside an async action or transition.

Source: https://react.dev/reference/react/useOptimistic.

## `use()` hook

Read promises / context conditionally. Replaces the `useMemo(() => promise, [])` + `Suspense` dance.

```tsx
"use client";
import { use } from "react";

export function Product({ productPromise }: { productPromise: Promise<Product> }) {
  // Suspends until the promise resolves; unlike other hooks, `use` may be called conditionally
  const product = use(productPromise);
  return <h1>{product.name}</h1>;
}
```

The parent renders on the server, starts the fetch, passes the unresolved promise into the client boundary. The client `use()` suspends until it resolves, streaming HTML along the way.

Source: https://react.dev/reference/react/use.

## React 19.1 / 19.2 surfaces

Three additions that matter for performance and flow, all stable in 19.2 (2025-10-01). On an older 19.x none of them exist, so check the installed version before recommending one.

### `<Activity>` (19.2)

Hides and restores a subtree while preserving its internal state. `mode="hidden"` applies `display: none`, cleans up the subtree's Effects (so subscriptions and intervals stop), and keeps the state; `mode="visible"` restores the state and re-creates the Effects. Hidden content is also pre-rendered at a lower priority, so the first reveal has nothing left to do.

```tsx
// Before: unmount on tab switch. State, scroll offset, and in-flight data are destroyed;
// coming back refetches and re-scrolls to the top.
{tab === "reports" && <ReportsPanel />}

// After: state, scroll position, and form drafts survive the round trip.
<Activity mode={tab === "reports" ? "visible" : "hidden"}>
  <ReportsPanel />
</Activity>
```

Rule: **any panel a user can leave and come back to inside the same route uses `<Activity>`, not conditional rendering.** Tabs, wizard steps, filter drawers, master/detail panes, and the previous route in a back-navigable flow all qualify. The complaints this fixes ("switching tabs loses my scroll position", "it refetches every time", "my half-typed filter is gone") have no fix at the metric layer, which is why they survive an otherwise green performance pass. Loading choreography for the same class of problem: `06-perceived-performance.md`.

Cost: hidden subtrees stay in memory and in the DOM. Use it for a bounded set of panels, not for an unbounded list of previously-visited routes.

### `useEffectEvent` (19.2)

Extracts the non-reactive part of an Effect. The extracted function always sees the latest props and state but is not itself a dependency, so the Effect stops re-running for values it only reads.

```tsx
function ChatRoom({ roomId, theme }: { roomId: string; theme: Theme }) {
  // theme is read, not reacted to. Without useEffectEvent, either theme goes in the
  // dep array (reconnecting the socket on every theme change) or it is omitted
  // (a stale closure that notifies with last render's theme).
  const onConnected = useEffectEvent(() => {
    showNotification("Connected!", theme);
  });

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.on("connected", () => onConnected());
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);
}
```

This is the correct fix for the two classic dependency-array failure modes: an Effect that tears down and rebuilds an expensive resource because an unrelated value changed, and an Effect suppressed with a lint disable that then reads stale values. Do not reach for a ref-mirroring hack; that pattern existed only because this hook did not.

### `cacheSignal` (19.2, Server Components only)

Gives an `AbortSignal` tied to the lifetime of a `cache()` scope, so work started for a request can be aborted when its cached results can no longer be used.

```tsx
import { cache, cacheSignal } from "react";

const dedupedFetch = cache(fetch);

async function Component() {
  // The fetch is aborted if the cache lifetime ends before it resolves.
  await dedupedFetch(url, { signal: cacheSignal() });
}
```

Use it for anything expensive and cancellable inside an RSC render: upstream fetches, database queries with cancellation support, streaming reads. Without it an aborted render leaves its network work running to completion.

### React Performance Tracks (19.2)

React 19.2 emits its own tracks into the Chrome DevTools Performance panel: a Scheduler track showing what React was working on at each priority, and a Components track showing which components rendered and which Effects ran. Record a trace with the panel open and the tracks appear automatically, no extension needed.

For a performance review this is the fastest way to answer "which component caused this long task", and it composes with the LoAF and INP attribution data in `05-measurement.md`. Prefer it over inference from the source.

Sources: https://react.dev/blog/2025/10/01/react-19-2, https://react.dev/reference/react/Activity, https://react.dev/reference/react/useEffectEvent.

## Form actions

Server Actions + `useFormStatus` + `useActionState`. Less client JS, server-validated by default.

```tsx
// actions.ts (server)
"use server";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function subscribe(_: unknown, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid email" };
  await db.subscribers.create({ data: parsed.data });
  return { ok: true, error: null };
}
```

```tsx
// subscribe-form.tsx (client)
"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { subscribe } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "..." : "Subscribe"}</button>;
}

export function SubscribeForm() {
  const [state, action] = useActionState(subscribe, { ok: false, error: null });
  return (
    <form action={action}>
      <input name="email" type="email" required />
      <Submit />
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

No hand-rolled onSubmit, no fetch, no loading state wiring. Validation runs on the server; the form submits without JS as a baseline and progressively enhances.

Sources: https://react.dev/reference/react-dom/hooks/useFormStatus, https://react.dev/reference/react/useActionState.

## Hydration cost reduction

| Technique | Effect |
|-----------|--------|
| Islands architecture (Astro / Qwik / Next RSC) | Only interactive components hydrate; static content is HTML |
| Defer non-critical components below the fold | `React.lazy()` + `<Suspense>` keeps initial JS small |
| `React.lazy()` for heavy widgets | Charts, editors, maps, date pickers load only when rendered |
| Server-render heavy parts | Shift compute from client to server; client just paints |
| Avoid hydrating pure-static subtrees | Wrap in server components; no `"use client"` descendant |
| Keep client boundaries narrow | Push `"use client"` as deep as possible in the tree |

```tsx
"use client";
// Dynamic import with SSR fallback
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("./markdown-editor"), {
  loading: () => <EditorSkeleton />,
  ssr: false, // editor is client-only; don't pay for SSR pass
});
```

`ssr: false` is only legal inside a Client Component. Used from a Server Component, which is the default in the App Router, it is a hard build error. From server code, wrap the dynamic import in a small `"use client"` entrypoint and render that.

## Render-cost anti-patterns

| Anti-pattern | Why it hurts | Fix |
|--------------|--------------|-----|
| Inline objects / arrays in JSX props | `{{ foo: 1 }}` recreates every render; breaks memo | Hoist to module scope or `useMemo` (or trust the Compiler) |
| Unmemoised context value | `<Ctx.Provider value={{...}}>` every render invalidates all consumers | `useMemo` the value (Compiler does this automatically) |
| Large prop drilling | Every ancestor re-renders when any leaf changes | Lift to context, extract the changing leaf into its own component |
| List keys based on index | Reuses DOM nodes for wrong items; breaks animations, inputs, refs | Use a stable per-item id |
| Derived state in `useState` | Goes stale when inputs change; drift between state and reality | Derive during render: `const filtered = items.filter(...)` |
| `useEffect` for derived values | Extra render cycle + hydration mismatch risk | Compute inline; no effect needed |
| `useEffect` as event handler | `onClick → setState → effect fires` is always an event handler pattern | Move to the event handler |
| Effect re-runs because a value it only *reads* sits in the dep array | Tears down and rebuilds sockets, observers, timers, and subscriptions on unrelated renders | `useEffectEvent` for the read-only part (React 19.2+); keep only genuinely reactive values in deps |
| Effect with a lint-disabled dep array | The suppressed dependency is read through a stale closure | Same fix. A disabled `exhaustive-deps` is a defect, not a style choice |
| Conditional unmount of a panel the user returns to | Destroys state, scroll offset, and in-flight requests; the return trip refetches | `<Activity mode="hidden">` (React 19.2+) |
| Shared state at the route root | Any change in any leaf re-renders the whole subtree | Colocate state with its consumer |
| Creating regex / date / schema per render | Recompiles on every render | Hoist to module scope |

Source: https://react.dev/learn/you-might-not-need-an-effect.

## Component-level perf checklist (per component)

For the `ui-perf-engineer` agent to walk through on every non-trivial component:

1. Is this component server-only? If yes, no `"use client"` and no client-only hooks.
2. Does every list have stable keys (not index)?
3. Are expensive children wrapped in `Suspense` boundaries near their data, not at the route root?
4. Are context provider values stable across renders (memoised or static)?
5. Is heavy computation derived during render (or memoised), not stored in state + effect?
6. Are async children using `use()` or awaited on the server, not `useEffect` + fetch?
7. Are below-fold components lazy-loaded via `dynamic` / `React.lazy`?
8. Are optimistic updates using `useOptimistic`, not manual reducer + rollback logic?

9. If the app is on React 19.2+, is hidden-but-returnable UI wrapped in `<Activity mode="hidden">` instead of being unmounted and refetched?

Run `eslint-plugin-react-hooks` with the `recommended` preset on every PR. It carries both the Rules of Hooks lints and the React Compiler diagnostics, and catches the most common regressions statically.

## Sources (canonical)

| Topic | URL |
|-------|-----|
| React Compiler | https://react.dev/learn/react-compiler |
| Server Components | https://react.dev/reference/rsc/server-components |
| Suspense | https://react.dev/reference/react/Suspense |
| useDeferredValue | https://react.dev/reference/react/useDeferredValue |
| useTransition | https://react.dev/reference/react/useTransition |
| useOptimistic | https://react.dev/reference/react/useOptimistic |
| use() hook | https://react.dev/reference/react/use |
| useActionState | https://react.dev/reference/react/useActionState |
| useFormStatus | https://react.dev/reference/react-dom/hooks/useFormStatus |
| You Might Not Need an Effect | https://react.dev/learn/you-might-not-need-an-effect |
| Next.js RSC | https://nextjs.org/docs/app/getting-started/server-and-client-components |
| Next.js Streaming / loading.tsx | https://nextjs.org/docs/app/api-reference/file-conventions/loading |
| React 19.2 release notes | https://react.dev/blog/2025/10/01/react-19-2 |
| Activity | https://react.dev/reference/react/Activity |
| useEffectEvent | https://react.dev/reference/react/useEffectEvent |
| React Compiler installation (ESLint) | https://react.dev/learn/react-compiler/installation |
| eslint-plugin-react-hooks | https://react.dev/reference/eslint-plugin-react-hooks |
| Next.js lazy loading (`ssr: false` rules) | https://nextjs.org/docs/app/guides/lazy-loading |
