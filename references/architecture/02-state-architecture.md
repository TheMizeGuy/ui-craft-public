---
topic: architecture
role: reference
scope: state-architecture
audience: ui-engineer
---

# State Architecture

Where each kind of state lives, and the right library for each. React 19 + TypeScript 6 strict. Cross-ref: `references/architecture/01-component-patterns.md` (compound-component state), `references/architecture/03-styling-architecture.md` (theme state).

## 1. Four kinds of UI state

Pick the tool from the kind, not from the framework already in the repo. Mixing kinds is the most common bug source — see § 2.

| Kind | Examples | Right tool | Persistence |
|---|---|---|---|
| **URL state** | filters, sort, tab, page, dialog open, search query, selected row | `nuqs` (React/Next), TanStack Router search params, framework router | URL — bookmarkable, shareable, back-button works |
| **Server state** | fetched lists, single-record reads, mutations, pagination, infinite scroll | TanStack Query v5, SWR, RTK Query, oRPC/tRPC client (Query under the hood) | Cache — invalidate on event |
| **Form state** | field values, dirty/touched, validation, submission state, async validators | React Hook Form + Zod (default), TanStack Form (cross-framework), Conform (RSC + progressive) | Component lifetime; persist on save |
| **Client state** | theme, sidebar collapsed, transient UI flags, in-flight wizard step | `useState`/`useReducer` for local; Zustand for cross-tree; Jotai for fine-grained atoms | Memory (`localStorage` via `persist` if needed) |

Decision sketch:

```text
Should this state survive a hard refresh? -- yes -> URL state OR persisted store
Is it the result of a fetch? -- yes -> server state library
Is it tied to a single form's submit? -- yes -> form library
Is only this component (or one parent) reading it? -- yes -> useState / useReducer
Cross-tree, cross-route, no-fetch? -- yes -> Zustand (or Jotai for atomic)
```

## 2. Why mixing kinds in `useState` causes bugs

Concrete failure modes — every one is a real production incident pattern:

| Wrong placement | Symptom | Right placement |
|---|---|---|
| Server data in `useState` from `useEffect(fetch, [])` | No background refresh; stale on focus; double-fetch in StrictMode dev; race conditions on rapid prop changes | TanStack Query — owns cache, dedupes, refocuses, cancels |
| Filter/sort in `useState` | Back button does nothing useful; share-link drops state; hard refresh resets | `nuqs` `useQueryState` |
| Field values in `useState` per field | Re-renders entire form on every keystroke; no `dirty`/`touched`/`isValid`; manual validation glue | React Hook Form (uncontrolled inputs) |
| Dialog open in `useState` | Deep link doesn't open the dialog; analytics can't read which modal is open | URL state (`?dialog=upgrade`) |
| Cross-route theme in `useContext` | Provider re-renders force the whole app to re-render on toggle | Zustand selector + `data-theme` attribute on `<html>` |
| Selected row in `useState` lifted to page | Refresh loses selection; cannot link to selected | URL state |

## 3. TanStack Query patterns (v5)

Five things to actually know: `queryOptions` for type-safe sharing, `select` for per-component shape, `useSuspenseQuery` for Suspense, `useMutation` with optimistic cache writes, dependent queries via `enabled`.

`queryOptions` is the v5-blessed way to define a query in one place and reuse it from `useQuery`, `useSuspenseQuery`, `prefetchQuery`, `setQueryData`, `getQueryData` without retyping the data shape:

```tsx
import { queryOptions, useQuery, useMutation, useQueryClient, useSuspenseQuery, useInfiniteQuery, QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

interface User { id: string; name: string; email: string; }

const userQuery = (id: string) =>
  queryOptions({
    queryKey: ["users", id] as const,
    queryFn: ({ signal }): Promise<User> =>
      fetch(`/api/users/${id}`, { signal }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<User>;
      }),
    staleTime: 60_000,
  });

// Read with normal hook (returns isPending/error)
function Profile({ id }: { id: string }) {
  const { data, isPending, error } = useQuery(userQuery(id));
  if (isPending) return <Skeleton />;
  if (error) return <ErrorState error={error} />;
  return <p>{data.name}</p>;
}

// Suspense mode — `data` is non-nullable; fallbacks live in <Suspense>
function ProfileSuspense({ id }: { id: string }) {
  const { data } = useSuspenseQuery(userQuery(id));
  return <p>{data.name}</p>;
}

// Reuse the same spec for prefetch (route loader, hover prefetch, RSC)
async function prefetchProfile(qc: ReturnType<typeof useQueryClient>, id: string) {
  await qc.prefetchQuery(userQuery(id));
}
```

Always pass `signal` to the fetch — Query cancels in-flight requests on unmount/key change.

| Error path | Pattern |
|---|---|
| Component-local recoverable | `if (error) return <Inline ... />` |
| Page/route fallback | `useQuery({ throwOnError: true })` + `<QueryErrorResetBoundary>` + `<ErrorBoundary>` |
| Suspense (RSC) | `useSuspenseQuery` always throws — wrap in `<ErrorBoundary>` upstream |

```tsx
<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary fallbackRender={({ resetErrorBoundary }) =>
      <Failed onRetry={() => { resetErrorBoundary(); reset(); }} />}>
      <Profile id={id} />
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>
```

Optimistic mutation via cache write (use `useOptimistic` § 9 for in-form overlay):

```tsx
const qc = useQueryClient();
const renameUser = useMutation({
  mutationFn: (vars: { id: string; name: string }) =>
    fetch(`/api/users/${vars.id}`, { method: "PATCH", body: JSON.stringify(vars) }).then(r => r.json() as Promise<User>),
  onMutate: async (vars) => {
    await qc.cancelQueries({ queryKey: ["users", vars.id] });
    const previous = qc.getQueryData<User>(["users", vars.id]);
    qc.setQueryData<User>(["users", vars.id], (old) => old ? { ...old, name: vars.name } : old);
    return { previous };
  },
  onError: (_e, vars, ctx) => ctx?.previous && qc.setQueryData(["users", vars.id], ctx.previous),
  onSettled: (_d, _e, vars) => qc.invalidateQueries({ queryKey: ["users", vars.id] }),
});

// Dependent query
const project = useQuery(projectQuery(projectId));
const tasks = useQuery({ ...tasksByProjectQuery(projectId), enabled: project.data?.status === "active" });

// Infinite scroll
const messages = useInfiniteQuery({
  queryKey: ["messages", channelId] as const,
  queryFn: ({ pageParam, signal }) =>
    fetch(`/api/channels/${channelId}/messages?cursor=${pageParam}`, { signal })
      .then(r => r.json() as Promise<{ items: Msg[]; nextCursor: string | null }>),
  initialPageParam: null as string | null,
  getNextPageParam: (last) => last.nextCursor,
});
```

RSC hydration: `prefetchQuery` into a `QueryClient` on the server, dehydrate, ship to client; `<HydrationBoundary state={...}>` rehydrates without re-fetching. The `QueryClient` must be created per request on the server (a module-level singleton leaks one user's cache into another's response) and once per browser session on the client.

## 4. URL state with nuqs

`nuqs` (React/Next-aware) puts state in the URL with typed parsers, defaults, history mode, SSR-safe hydration. URL becomes the source of truth.

```tsx
import { useQueryState, useQueryStates, parseAsString, parseAsInteger, parseAsArrayOf, parseAsBoolean } from "nuqs";

function Filters() {
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [tags, setTags] = useQueryState("tags", parseAsArrayOf(parseAsString).withDefault([]));
  const [open, setOpen] = useQueryState("open", parseAsBoolean.withDefault(false));
  // setX(null) clears the param from the URL
  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value || null)} />
      <TagChips selected={tags} onToggle={(t) => setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t])} />
      <button onClick={() => setOpen(true)}>Open</button>
      <Pagination page={page} onChange={setPage} />
    </>
  );
}
```

| Parser | Use for |
|---|---|
| `parseAsString` / `parseAsInteger` / `parseAsFloat` / `parseAsBoolean` | primitives |
| `parseAsStringEnum([...])` | constrained text values |
| `parseAsArrayOf(parser)` | multi-select |
| `parseAsJson<T>(schema)` | complex shapes (keep URL small) |
| `parseAsIsoDateTime` | timestamps |

Options: `.withDefault(v)` (omitted from URL when equal), `.withOptions({ history: "push" \| "replace", shallow: true, throttleMs: 200 })` — replace by default to avoid flooding history; `useQueryStates` batches multi-key updates into a single push.

When **not** to use nuqs: high-frequency state (slider drag, mouse position). URL update throttle lags user intent — keep in `useState`, commit to URL on `pointerup`/blur.

## 5. Form state with React Hook Form + Zod

RHF (uncontrolled by default) + Zod via `@hookform/resolvers/zod`. Wins on per-field render isolation, single source of truth, async validators, native `FormData`.

```tsx
import { useForm, SubmitHandler, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const Schema = z.object({
  email: z.email(),
  // Not z.coerce.number(): under Zod 4 the INPUT type of z.coerce.* is `unknown`,
  // not `string`, so z.input<> stops being useful and every default needs a cast.
  // Register the field with valueAsNumber and keep the schema honest instead.
  age: z.number().int().min(18).max(120),
  contacts: z.array(z.object({ name: z.string().min(1), phone: z.string().regex(/^\+?[0-9 ]+$/) })).min(1),
  role: z.enum(["admin", "user"]).default("user"),
});
type FormValues = z.input<typeof Schema>;    // what the form holds
type Submitted  = z.output<typeof Schema>;   // what the API receives (defaults applied)

function SignUp() {
  const { register, handleSubmit, control, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { email: "", age: 18, contacts: [{ name: "", phone: "" }], role: "user" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const contacts = useFieldArray({ control, name: "contacts" });
  const onSubmit: SubmitHandler<FormValues> = async (raw) => api.signUp(Schema.parse(raw));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input {...register("email")} aria-invalid={!!errors.email} />
      {errors.email && <p role="alert">{errors.email.message}</p>}
      <input type="number" {...register("age", { valueAsNumber: true })} />
      {contacts.fields.map((f, i) => (
        <fieldset key={f.id}>
          <input {...register(`contacts.${i}.name`)} />
          <input {...register(`contacts.${i}.phone`)} />
          <button type="button" onClick={() => contacts.remove(i)}>Remove</button>
        </fieldset>
      ))}
      <button type="button" onClick={() => contacts.append({ name: "", phone: "" })}>Add</button>
      {/* Non-native input — wrap in Controller */}
      <Controller name="role" control={control}
        render={({ field }) => <RoleSelect value={field.value} onChange={field.onChange} />} />
      <button disabled={!isDirty || isSubmitting}>Submit</button>
    </form>
  );
}
```

| Pattern | Use |
|---|---|
| `register("name")` | Native inputs (text/number/checkbox/radio/file/select) |
| `Controller` | Headless component libs (shadcn, MUI, Mantine) where you don't control the input |
| `useFieldArray` | Dynamic lists (line items, contacts) |
| `useFormContext` | Deep child fields without prop-drilling `register` |
| `setValue("a.b.c", v, { shouldDirty: true })` | Programmatic edit; path-safe via template literals |
| `watch("field")` | Subscribe to a field; avoid for high-frequency, it re-renders the form root |
| `mode` / `reValidateMode` | Validation timing. See the timing matrix below; `onBlur` + `onChange` is the correct pair |

Why uncontrolled wins: a 50-field form re-renders the form root **zero times** on keystroke; controlled (`useState` per field) re-renders on every keystroke.

`z.coerce.*` belongs at the parse boundary, not in the form schema. In Zod 4 a coercing schema accepts `unknown` as input, so `z.input<typeof Schema>` degrades to `unknown` for that field, `defaultValues` stops typechecking, and the usual "fix" is `18 as never`. That is a double cast: it suppresses genuine type errors on every field default and is a review blocker under `references/typescript/01-ts6-essentials.md`. Either type the field natively and let `valueAsNumber` do the conversion at the input (above), or keep coercion in a separate schema you call in the submit handler against `z.output`.

### Validation timing

Timing is the part of form UX that markup review cannot see, and getting it wrong is the most common way a technically-correct form feels hostile. The rules:

| Moment | Behaviour | Why |
|---|---|---|
| While typing, before the field has ever been left | **Never validate.** No error, no red border, no icon | "Not a valid email" after `b@` is the classic. The user is not done |
| First blur of a field | Validate that field | The user has declared they are finished with it |
| After a field has errored once | Re-validate on every change | This is the only way the error clears as the user fixes it. In RHF: `mode: "onBlur"` plus `reValidateMode: "onChange"` |
| Submit | Validate the whole form, move focus to the first invalid field, and announce the count | Otherwise a long form scrolls the user nowhere and screen-reader users get no signal at all. RHF: `shouldFocusError` is on by default; keep it |
| While submitting | Disable the submit control and reflect a pending state on it | An enabled submit on an in-flight request is a double-charge waiting to happen. Server-side idempotency keys are the real fix; the disabled state is the UI half |
| After a failed submit | **Keep every field value.** Never clear the form | A wiped 14-field form after one server error is the single most expensive form defect there is |

Two more that belong to the same decision:

- **Mark required fields before submit**, in the label, not by revealing an error later. `aria-required` plus a visible marker; "optional" labelling instead is fine if most fields are required.
- **Persist a draft** for any form over roughly ten fields or one that spans steps. Write to `localStorage` (or the URL, per § 4) on a debounced change and clear it on successful submit, so a reload or an accidental back navigation is not a total loss. Multi-step forms additionally need each completed step to be re-enterable without redoing the earlier ones.

Error markup, so the timing above actually reaches the user: put the message in an element referenced by the input's `aria-describedby` (not only adjacent to it), set `aria-invalid` on the input, and give the message `role="alert"` only for errors raised by submit. A `role="alert"` on a blur-triggered message interrupts a screen-reader user mid-form on every field. The example above does both: `aria-invalid={!!errors.email}` on the input, `<p role="alert">` for the message.

```tsx
<input
  {...register("email")}
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : "email-hint"}
/>
<p id="email-hint">We only use this for receipts.</p>
{errors.email && <p id="email-error">{errors.email.message}</p>}
```

Flow-level review checks for forms (task completion, step resumability, error recovery) belong to the usability domain: `references/usability/`.

## 6. Client state with Zustand

Default cross-cutting client store. ~1 KB, selector-based subscriptions, composable middleware, devtools + persist built in. Slice pattern for a growing store; `useShallow` to prevent re-renders on object-identity changes.

```tsx
import { create, type StateCreator } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

interface UISlice    { sidebarCollapsed: boolean; toggleSidebar(): void; }
interface ThemeSlice { theme: "light" | "dark" | "system"; setTheme(t: ThemeSlice["theme"]): void; }
type AppStore = UISlice & ThemeSlice;

const createUISlice: StateCreator<AppStore, [], [], UISlice> = (set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
});
const createThemeSlice: StateCreator<AppStore, [], [], ThemeSlice> = (set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
});

export const useAppStore = create<AppStore>()(
  devtools(persist(
    (...a) => ({ ...createUISlice(...a), ...createThemeSlice(...a) }),
    {
      name: "app-store",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme }),  // don't persist transient UI
      migrate: (persisted, version): AppStore => {
        let s = persisted as Record<string, unknown>;
        if (version < 2 && "darkMode" in s) s = { ...s, theme: s.darkMode ? "dark" : "light" };
        return s as AppStore;
      },
    },
  ), { name: "AppStore" }),
);

// Single value — re-renders only when that slice changes
const collapsed = useAppStore((s) => s.sidebarCollapsed);
// Multi-value — useShallow prevents re-render when object identity changes but values don't
const { theme, setTheme } = useAppStore(useShallow((s) => ({ theme: s.theme, setTheme: s.setTheme })));
```

**TS gotcha**: always use the **curried** `create<State>()(...)` form. Non-curried fails inference once middleware wraps it, because TypeScript cannot partially apply type arguments: writing `create<AppStore>(devtools(persist(fn)))` forces you to annotate the middleware's own generics too, and the inner `StateCreator` mutator tuple is not inferable from the outside. The curried call splits the two inference sites.

| Need | Pick |
|---|---|
| Theme, locale, auth — infrequent changes, route-scoped | React Context |
| Cross-route, frequent updates, many consumers | Zustand |
| Atoms with derive graph, fine-grained reactivity | Jotai |
| State machines / wizards / 5+ states | XState v5 |
| Server cache | TanStack Query (not Zustand) |
| Complex normalized state, time-travel, middleware | Redux Toolkit |

The dividing line: Context re-renders every consumer when the value identity changes, with no way to subscribe to part of it. An external store (Zustand, Jotai) subscribes per selector. Context is right when the value changes rarely; a store is right when it changes often or has many independent readers.

## 7. `useReducer` over `useState`

Move to `useReducer` when (a) 3+ related fields update together, (b) state transitions matter (a state change is invalid in some states), or (c) you want auditable actions for logging/replay.

```tsx
import { useReducer, type Reducer } from "react";

interface State { items: Item[]; selectedId: string | null; status: "idle" | "saving" | "error"; }
type Action =
  | { type: "select"; id: string } | { type: "deselect" }
  | { type: "add"; item: Item }    | { type: "remove"; id: string }
  | { type: "save:start" } | { type: "save:ok" } | { type: "save:err" };

function assertNever(x: never): never { throw new Error(`Unhandled: ${JSON.stringify(x)}`); }

const reducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case "select":     return { ...state, selectedId: action.id };
    case "deselect":   return { ...state, selectedId: null };
    case "add":        return { ...state, items: [...state.items, action.item] };
    case "remove":     return { ...state, items: state.items.filter(i => i.id !== action.id), selectedId: state.selectedId === action.id ? null : state.selectedId };
    case "save:start": return { ...state, status: "saving" };
    case "save:ok":    return { ...state, status: "idle" };
    case "save:err":   return { ...state, status: "error" };
    default:           return assertNever(action);
  }
};

const [state, dispatch] = useReducer(reducer, { items: [], selectedId: null, status: "idle" });
```

`assertNever` in the default branch is what makes the reducer exhaustive: add an action variant without a case and the build fails at that line instead of silently falling through.

## 8. Derived state — derive, don't store

Test: *"if I delete this state, can I derive it on render?"* If yes, delete it.

```tsx
// Bad — two sources of truth, drift on edit
const [first, setFirst] = useState("");
const [last, setLast] = useState("");
const [full, setFull] = useState("");
useEffect(() => setFull(`${first} ${last}`), [first, last]); // re-render storm

// Good — single source of truth
const [first, setFirst] = useState("");
const [last, setLast] = useState("");
const full = `${first} ${last}`;
```

For genuinely expensive derivations (filter+sort 10k rows) wrap in `useMemo`. For server-derived shapes use TanStack Query's `select`:

```tsx
const onlyAdmins = useQuery({ ...usersQuery(), select: (users) => users.filter(u => u.role === "admin") });
```

Re-renders only when `select`'s output identity changes (Query memoizes).

## 9. Optimistic UI with React 19 `useOptimistic`

For mutation feedback while the network round-trip is pending. Server-state libraries' `onMutate` is fine for cache-level optimism; `useOptimistic` is for **in-form** optimism (typing a comment, hitting send, seeing it appear instantly).

```tsx
import { useOptimistic, useTransition } from "react";

function CommentList({ comments, channelId }: { comments: Comment[]; channelId: string }) {
  const [optimistic, addOptimistic] = useOptimistic<Comment[], string>(
    comments,
    (state, newText) => [
      ...state,
      { id: `temp-${Date.now()}`, text: newText, author: "you", pending: true },
    ],
  );
  const [, startTransition] = useTransition();

  async function send(formData: FormData) {
    const text = String(formData.get("text") ?? "");
    if (!text.trim()) return;
    startTransition(async () => {
      addOptimistic(text);
      await api.postComment(channelId, text); // failure rolls back automatically when re-render runs without addOptimistic
    });
  }

  return (
    <>
      <ul>{optimistic.map(c => <li key={c.id} aria-busy={c.pending}>{c.text}</li>)}</ul>
      <form action={send}><input name="text" /><button>Send</button></form>
    </>
  );
}
```

Failure handling: on error, surface a toast and let the next render (without `addOptimistic`) snap state back. For persistent errors, write the failure into your own state and render an "unable to send, retry" badge on the failed item. Note that the snap-back is invisible if it happens faster than the user can perceive, which reads as the action having silently done nothing; hold the optimistic item in a failed visual state instead of removing it.

## 10. State migrations

When `localStorage`/Zustand `persist` schema changes, existing users carry old shapes. Always version + migrate:

```tsx
persist(initializer, {
  name: "app-store",
  version: 3,
  migrate: (persisted, fromVersion) => {
    let s = persisted as Record<string, unknown>;
    if (fromVersion < 2) s = { ...s, theme: (s.darkMode ? "dark" : "light"), darkMode: undefined };
    if (fromVersion < 3) s = { ...s, sidebarCollapsed: false }; // new field default
    return s as AppStore;
  },
});
```

Rules:

| Rule | Why |
|---|---|
| Bump `version` on every breaking shape change | Triggers migrate |
| Migrations are forward-only and idempotent | Re-running on same shape must no-op |
| Default-fill new required fields | Old persisted state is missing them |
| Strip removed fields | Avoid accidentally re-introducing them via spread |
| Test `migrate(oldFixture, oldVersion)` for every old → new pair | Catches drift in CI |
| Don't `JSON.parse` raw localStorage in components | Always go through the store |

Same pattern applies to URL state (`parseAsJson<T>(schema)` — version inside the JSON, migrate on read), and IndexedDB (`onupgradeneeded` per version).

## 11. Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Redux for everything in 2026 | Pick by kind: Query for server, Zustand for client, RHF for forms, nuqs for URL |
| `useContext` for everything that's "global" | Re-render storms on every consumer; use Zustand selectors or split state-from-dispatch context |
| `useState` + `useEffect(fetch)` for server data | Stale-while-focus, no dedupe, no cancel; use TanStack Query |
| Lifting all state to `App.tsx` | "Prop drilling" symptom; co-locate to nearest common parent or extract a Context+hook |
| Prop-drilling 4+ levels | Extract `useFoo()` hook over a Context with a wrapper that throws on missing provider |
| Storing fetched data in Zustand | Cache invalidation is hard; use Query — let Zustand hold UI flags only |
| Storing form values in Zustand | Lose validation/dirty/touched; use RHF |
| Filter/tab/sort in `useState` | URL doesn't reflect; use `nuqs` |
| `useEffect` to derive state | Compute in render; `useMemo` if expensive |
| `useMemo` everywhere "for performance" | Overhead exceeds benefit on cheap values; React Compiler (React 19) handles most cases |
| Provider value rebuilt every render | `useMemo` it, or split state and dispatch contexts |
| Forgetting `signal` in `queryFn` | Stale responses overwrite new ones on rapid key changes |
| Forgetting `enabled` on dependent queries | First render fires the query with `undefined` and crashes the fetcher |
| `useQuery({ onSuccess })` (v4 pattern) | Removed in v5 — handle in `useEffect` on `data`, or move side effect to `useMutation` |

## References

- TanStack Query v5 (`tanstack.com/query/v5`), Zustand v5 (`github.com/pmndrs/zustand` — curried `create<S>()(...)` required with middleware), nuqs (`nuqs.47ng.com`), React Hook Form 7.x (`react-hook-form.com/ts`), Zod 4.x (`zod.dev`), React 19 (`react.dev/blog/2024/12/05/react-19`)
