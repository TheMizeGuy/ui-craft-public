---
topic: typescript
role: reference
scope: state-typing
audience: ui-engineer
---

# UI State Typing (Discriminated Unions, Reducers, Boundaries)

The single most common UI bug pattern is **impossible state combinations**: `isLoading && isError`, modal `isOpen` with no payload, form `isValid && hasErrors`. TypeScript's discriminated unions plus `noUncheckedIndexedAccess` plus `useUnknownInCatchVariables` (`useUnknownInCatchVariables` is part of `strict`, on by default in TS 6.0; `noUncheckedIndexedAccess` must be enabled explicitly, see `references/typescript/01-ts6-essentials.md` § Strictness ladder) eliminate the entire class.

Baseline: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `useUnknownInCatchVariables: true` (see `references/typescript/01-ts6-essentials.md`).

Schema baseline for this whole domain: **Zod 4.x**. Zod 4 moved the string format validators to top-level functions, so `z.email()`, `z.uuid()`, `z.url()`, `z.iso.datetime()` are the current forms and the `z.string().email()`-style methods are deprecated and slated for removal. `references/architecture/02-state-architecture.md` and `references/typescript/04-branded-primitives.md` use the same forms; a codebase that mixes both eras is itself a finding.

## Why discriminated unions for UI state

Booleans multiply. Three booleans mean eight possible states, of which the renderer typically handles three.

```tsx
// BAD: boolean explosion -- 2^3 = 8 possible state combinations, only 4 are valid
interface UserPanelState {
  isLoading: boolean;
  isError: boolean;
  data: User | null;
  errorMsg: string | null;
}

// Renderer must defend against impossible combos every call site:
function render(s: UserPanelState) {
  if (s.isLoading && s.isError)        return /* impossible */;
  if (s.isLoading && s.data)           return /* stale data while reloading? */;
  if (!s.isLoading && !s.data && !s.isError) return /* what is this? */;
  if (s.isError && !s.errorMsg)        return /* error without message */;
  // ...
}
```

Five impossible states, every renderer must guess what to do. The fix is making the impossible unrepresentable.

```tsx
// GOOD: discriminated union -- 4 states, all valid, renderer covers them all
type UserPanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; error: Error };

declare function load(): Promise<void>; // the fetch action, owned by the caller

function render(s: UserPanelState) {
  switch (s.status) {
    case "idle":    return <button onClick={() => void load()}>Load</button>;
    case "loading": return <Spinner />;
    case "success": return <Profile user={s.data} />;
    case "error":   return <Alert>{s.error.message}</Alert>;
    default: { const _: never = s; throw new Error(_); }
  }
}
```

Add `{ status: "stale"; data: User; refetching: true }` and the switch fails to compile until the renderer handles it.

The discriminant is doing the work here, not the field types: it is what lets the compiler prove which fields exist in which branch.

## Async data states

Use a tagged union for any fetch lifecycle. Combine with `useReducer` once the state has 3+ related fields, because `useState` chains stop scaling.

```tsx
type Async<T, E = Error> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error";   error: E };

function assertNever(x: never): never {
  throw new Error(`Unhandled state: ${JSON.stringify(x)}`);
}

type Action<T> =
  | { type: "fetch" }
  | { type: "ok"; data: T }
  | { type: "fail"; error: Error }
  | { type: "reset" };

function reducer<T>(state: Async<T>, action: Action<T>): Async<T> {
  switch (action.type) {
    case "fetch": return { status: "loading" };
    case "ok":    return { status: "success", data: action.data };
    case "fail":  return { status: "error",   error: action.error };
    case "reset": return { status: "idle" };
    default: return assertNever(action);
  }
}

function useUser(id: string): Async<User> {
  const [state, dispatch] = useReducer(reducer<User>, { status: "idle" });
  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "fetch" });
    fetchUser(id)
      .then((u) => { if (!cancelled) dispatch({ type: "ok", data: u }); })
      .catch((e: unknown) => {
        if (cancelled) return;
        dispatch({ type: "fail", error: e instanceof Error ? e : new Error(String(e)) });
      });
    return () => { cancelled = true; };
  }, [id]);
  return state;
}

function UserPanel({ id }: { id: string }) {
  const state = useUser(id);
  switch (state.status) {
    case "idle":
    case "loading": return <Spinner />;
    case "success": return <Profile user={state.data} />;
    case "error":   return <Alert>{state.error.message}</Alert>;
    default: return assertNever(state);
  }
}
```

Three properties of this design:

| Property | Cause |
|---|---|
| `state.data` is unreachable when `state.status !== "success"` | The discriminant narrowing is type-level proof |
| Adding a new variant breaks every renderer that doesn't handle it | `assertNever` in the default branch |
| The `catch (e: unknown)` narrowing is forced | `useUnknownInCatchVariables` (TS 6 default in strict mode; see `references/typescript/01-ts6-essentials.md` § Required tsconfig for UI projects) |

Note on tooling: TanStack Query, SWR, Apollo, and Zustand each ship typed `Async`-equivalent hooks. Use them in real projects; the reducer above is the shape they encode internally.

## Form state

`isValid + hasErrors + isSubmitting + isPristine` is the same boolean-explosion trap. Encode the form's lifecycle as a discriminated union; the submit button's disabled state becomes provable.

```tsx
type FieldState<T> =
  | { kind: "pristine";       value: T }
  | { kind: "dirty-valid";    value: T }
  | { kind: "dirty-invalid";  value: T; errors: readonly string[] }
  | { kind: "submitting";     value: T }
  | { kind: "submitted-ok";   value: T }
  | { kind: "submitted-fail"; value: T; error: Error };

function canSubmit<T>(s: FieldState<T>): s is { kind: "dirty-valid"; value: T } {
  return s.kind === "dirty-valid";
}

function SignupForm() {
  const [email, setEmail] = useState<FieldState<string>>({ kind: "pristine", value: "" });

  function onChange(next: string) {
    if (next === "")              return setEmail({ kind: "pristine", value: next });
    if (!next.includes("@"))      return setEmail({ kind: "dirty-invalid", value: next, errors: ["Invalid email"] });
    return setEmail({ kind: "dirty-valid", value: next });
  }

  async function onSubmit() {
    if (!canSubmit(email)) return;            // type-safe gate
    setEmail({ kind: "submitting", value: email.value });
    try {
      await api.signup(email.value);
      setEmail({ kind: "submitted-ok", value: email.value });
    } catch (e: unknown) {
      setEmail({
        kind: "submitted-fail",
        value: email.value,
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}>
      <input value={email.value} onChange={(e) => onChange(e.target.value)} />
      {email.kind === "dirty-invalid" && email.errors.map((m) => <p key={m}>{m}</p>)}
      <button disabled={!canSubmit(email)}>
        {email.kind === "submitting" ? "Sending..." : "Sign up"}
      </button>
      {email.kind === "submitted-fail" && <Alert>{email.error.message}</Alert>}
    </form>
  );
}
```

Why this prevents the classic "submit button enabled while form is invalid" bug: `disabled={!canSubmit(email)}` is the **only** way to enable the button, and `canSubmit` is a type predicate. There's no boolean to forget to AND together.

For real forms reach for React Hook Form + Zod (`zodResolver` infers `FormValues` from the schema; `formState.errors` is typed per field). Source: https://react-hook-form.com/docs/useform and https://zod.dev.

## Modal / drawer / overlay state

The classic anti-pattern: `isOpen: boolean` plus `payload: T | null`. Every reader must defend against `isOpen && !payload` and `!isOpen && payload`. Replace with a tagged union where `payload` only exists in the open variant.

**Rule, and it is the real lesson of this section: never read the narrowed union field
across an `await`.** Narrowing is a compile-time fact about one render. Inside an async
callback the component can re-render and the modal can close or re-target before the
`await` resolves, so `modal.state.target` after the `await` is whatever state exists then,
not the one the user confirmed. On a destructive confirm dialog that means deleting the
wrong record. Capture the value once, at render time, and pass it down as a plain prop.

```tsx
type ConfirmModal<T> =
  | { kind: "closed" }
  | { kind: "open"; target: T };

function useConfirmModal<T>() {
  const [state, setState] = useState<ConfirmModal<T>>({ kind: "closed" });
  return {
    state,
    open:  (target: T) => setState({ kind: "open", target }),
    close: ()           => setState({ kind: "closed" }),
  };
}

function DeleteUserList({ users }: { users: readonly User[] }) {
  const modal = useConfirmModal<User>();
  return (
    <>
      <ul>{users.map((u) => (
        <li key={u.id}>
          {u.name} <button onClick={() => modal.open(u)}>Delete</button>
        </li>
      ))}</ul>

      {modal.state.kind === "open" && (
        // Inside this branch modal.state.target is User, not User | null.
        // Hand it down as a plain prop so the async handler captures the value
        // that was on screen, not whatever state exists when the await resolves.
        <ConfirmDelete target={modal.state.target} onClose={modal.close} />
      )}
    </>
  );
}

function ConfirmDelete({ target, onClose }: { target: User; onClose: () => void }) {
  return (
    <Dialog onClose={onClose}>
      Delete {target.name}?
      <button onClick={async () => {
        await api.deleteUser(target.id); // plain User, captured at render time
        onClose();
      }}>Confirm</button>
    </Dialog>
  );
}
```

If extracting a component is overkill, the same capture works inline: read
`const target = modal.state.target;` into a local before the handler is created, and use
`target` inside it. What must not happen is `modal.state.target` appearing after an `await`.

Three impossible bugs the union forbids:

| Impossible bug | Why the union forbids it |
|---|---|
| Modal opens with no target | `kind: "open"` requires a `target: T` |
| Modal closes but the target lingers in state | `kind: "closed"` has no `target` field |
| Renderer accesses `target` while closed | TS narrows `target` only inside the `kind === "open"` branch |

## Reducer pattern with full type safety

When state has 3+ related fields, switch to `useReducer`. Type both `State` and `Action` as discriminated unions. Use `assertNever` in the default to block silent missed cases.

```tsx
import { useReducer, type Reducer } from "react";

interface State {
  selected: ReadonlySet<string>;
  filter: "all" | "active" | "done";
  query: string;
}

type Action =
  | { type: "select"; id: string }
  | { type: "deselect"; id: string }
  | { type: "selectAll"; ids: readonly string[] }
  | { type: "clearSelection" }
  | { type: "filter"; value: State["filter"] }
  | { type: "query"; value: string };

function assertNever(x: never): never { throw new Error(JSON.stringify(x)); }

const reducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case "select": {
      const next = new Set(state.selected); next.add(action.id);
      return { ...state, selected: next };
    }
    case "deselect": {
      const next = new Set(state.selected); next.delete(action.id);
      return { ...state, selected: next };
    }
    case "selectAll":      return { ...state, selected: new Set(action.ids) };
    case "clearSelection": return { ...state, selected: new Set() };
    case "filter":         return { ...state, filter: action.value };
    case "query":          return { ...state, query: action.value };
    default:               return assertNever(action);
  }
};

const initial: State = { selected: new Set(), filter: "all", query: "" };
const [state, dispatch] = useReducer(reducer, initial);
```

Add `{ type: "invertSelection" }` to `Action` and the reducer fails to compile (`assertNever` rejects the now-non-`never` action). The exhaustiveness anchor turns "did I update every consumer?" into a build-time question.

Source: https://react.dev/reference/react/useReducer.

## URL state vs server state vs client state

Stuffing all three into `useState` is the root cause of stale-modal-after-back-button, refetch-storm, and "two tabs see different filters" bugs. Each has a tool.

| State kind | Examples | Tool | Why |
|---|---|---|---|
| **URL state** | Filters, pagination, selected tab, modal-open flag, sort order | `nuqs`, `next/navigation` `useSearchParams`, TanStack Router search params | Survives reloads, deep-linkable, sharable, browser back/forward works |
| **Server state** | User profile, feature flags, search results, paginated lists | TanStack Query, SWR, Apollo, RTK Query | Cache, dedupe, refetch policy, stale-while-revalidate, optimistic updates, none of which `useState` can model |
| **Client state (transient)** | Form drafts mid-edit, hover/focus, accordion open/close, drag position | `useState`, `useReducer` | Local to component or feature; doesn't need to outlive the route |
| **Global client state** | Theme, locale, "command palette open", current org | Zustand, Jotai, `useReducer` + Context | Cross-cutting but not server-owned |

Anti-pattern: a `filters` object held in `useState` that controls a TanStack Query key. Result: the URL doesn't change, refresh loses state, the back button is broken. Move `filters` to URL state with `nuqs`; pass to TanStack Query as the `queryKey`. Now URL is the source of truth, query cache reacts automatically.

## Error normalization at boundaries

`useUnknownInCatchVariables` (on under `strict: true` since TS 4.4; default in TS 6.0) makes `catch (e)` an `unknown`. Every fetch boundary must normalize.

```tsx
// BAD: e is implicitly any without useUnknownInCatchVariables
async function loadUser(id: string) {
  try {
    const res = await fetch(`/api/users/${id}`);
    setData(await res.json());
  } catch (e) {              // any -- e.message reads, e.statusCode reads, all silently
    setError(e);
  }
}

// GOOD: e is unknown; narrow via instanceof, schema, or Result wrapper
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

async function loadUser(id: string): Promise<Result<User, Error>> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) return { ok: false, error: new Error(`HTTP ${res.status}`) };
    const json = await res.json() as unknown;
    const parsed = UserSchema.safeParse(json);
    if (!parsed.success) return { ok: false, error: parsed.error };
    return { ok: true, value: parsed.data };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

// Caller never deals with raw exceptions
const result = await loadUser(id);
if (result.ok) renderUser(result.value);
else            renderError(result.error);
```

Why every fetch should return `Result<T, E>` (or be parsed by Zod): `setData(await fetch(...))` followed by `catch { setError(e) }` is the same boolean-explosion problem with `data + error` instead of `isLoading + isError`. The `Async<T>` reducer pattern from earlier sections handles the lifecycle; the `Result<T, E>` shape handles each individual call.

Zod schema as the boundary:

```tsx
import { z } from "zod";

const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: z.enum(["admin", "user", "guest"]),
});
type User = z.infer<typeof UserSchema>;

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return UserSchema.parse(await res.json());     // throws ZodError on shape mismatch
}
```

Three rules at the boundary:

| Rule | Why |
|---|---|
| Validate `unknown` → `T` exactly once, at the network/storage edge | Every layer revalidating duplicates work; every layer trusting a previous layer leaks raw `any` |
| Wrap `catch` in `instanceof Error` or `Result.fromThrowable` | TS 6 defaults `catch (e)` to `unknown`; reading `.message` without narrow is a compile error |
| Don't rethrow with the raw `e: unknown` if upstream callers expect `Error` | `throw e instanceof Error ? e : new Error(String(e))` keeps the contract |

The flag that forces all of this is `useUnknownInCatchVariables`, documented with the rest of the strictness set in `references/typescript/01-ts6-essentials.md`.

## Cross-references

| File | Covers |
|---|---|
| `references/typescript/01-ts6-essentials.md` | tsconfig flags that enable this typing (`strict`, `noUncheckedIndexedAccess`, `useUnknownInCatchVariables`, `exactOptionalPropertyTypes`) |
| `references/typescript/02-component-typing.md` | The component patterns (compound components, render props) that consume this state via context and props |
| `references/typescript/04-branded-primitives.md` | Branded IDs (`UserId`, `OrderId`) that flow through `Action` payloads and `State` shapes. Nominal typing prevents argument-swap bugs in dispatch calls |
| `references/architecture/02-state-architecture.md` | Where each kind of state lives across the app, and the same Zod 4.x boundary schemas |

## Sources (canonical)

| Topic | URL |
|---|---|
| Zod (4.x API, top-level format validators) | https://zod.dev |
| useReducer | https://react.dev/reference/react/useReducer |
| React Hook Form | https://react-hook-form.com/docs/useform |
| TanStack Query | https://tanstack.com/query/latest/docs/framework/react/overview |
| nuqs (URL state) | https://nuqs.dev |
| Compiler options reference | https://www.typescriptlang.org/tsconfig/ |
