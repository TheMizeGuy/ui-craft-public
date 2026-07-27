---
topic: typescript
role: reference
scope: component-typing
audience: ui-engineer
---

# Component Typing Patterns (React 19 + TS 6)

Function components, compound components, polymorphic `as` props, slots, render props, refs in React 19, CVA variants, and the higher-order patterns 2026 UI code should never use. Every example compiles under TS 6.0 strict + `@types/react@^19`.

Baseline assumed: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `verbatimModuleSyntax: true`, `jsx: "react-jsx"`. See `references/typescript/01-ts6-essentials.md` for the full tsconfig.

## Function components in TS 6

Banned: `React.FC`, `React.VFC`, arrow with explicit `React.ReactElement` annotation. Required: plain function with explicit `Props` interface.

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

export function Button({ variant = "primary", loading, children, ...rest }: ButtonProps) {
  return (
    <button data-variant={variant} disabled={loading || rest.disabled} {...rest}>
      {loading ? "..." : children}
    </button>
  );
}
```

Why not `React.FC`:

| Problem with `React.FC<P>` | Effect |
|---|---|
| Pre-React-18 silently added `children?: ReactNode` | Components that should reject children accepted them; lost in React 19 but the muscle memory remains harmful |
| Cannot express call-signature generics: `const Select: React.FC<Props<T>>` is not legal | Forces wrapper-cast hacks for any list/select/combobox |
| Hardcoded return type `ReactElement \| null` | Cannot return `string`, `number`, `Iterable<ReactNode>` directly even though React permits them |
| Loses inference on default-prop destructuring | Default values widen instead of narrowing |

React 19 removed the implicit `children` from `React.FC`, but none of the other three problems went away, so the recommendation is unchanged: declare a plain function.

### `interface` vs `type` for props

Use `interface` for component props (declaration merging is harmless on a closed Props shape, error messages are slightly cleaner, extends is symmetrical with `extends React.ButtonHTMLAttributes<...>`). Use `type` for unions/tuples/utility compositions:

```tsx
interface CardProps { title: string; children?: React.ReactNode }

type Variant = "primary" | "secondary" | "ghost"; // union, so it must be a type
type WithLoading<P> = P & { loading?: boolean };  // generic util, so it must be a type
```

### `children` typing reference

| Declared as | Accepts |
|---|---|
| `children?: React.ReactNode` | Everything renderable: JSX, strings, arrays, `null`, `false`, numbers, fragments |
| `children: React.ReactElement` | Exactly one JSX element |
| `children: React.ReactElement<SpecificProps>` | One element with those props (`Children.map` wrappers, slot enforcement) |
| `children: React.ReactElement[]` | Array of elements only: no strings, no `null` |
| `children: (ctx: T) => React.ReactNode` | Render-prop / function-as-children |
| `children: string` | Text only |

React 19 narrowed `ReactNode` so `{}` no longer matches; if a 5.x→6.x upgrade surfaces "type `{}` is not assignable to ReactNode", tighten the upstream return.

## Compound components

Tabs example with shared discriminated-union state via context. The `kind`-tagged state means the `assertNever` in `useTabsContext` enforces every variant is handled if you switch on it.

```tsx
import { createContext, useContext, useMemo, useState, useId } from "react";

type TabsState =
  | { kind: "uncontrolled"; value: string; setValue: (v: string) => void }
  | { kind: "controlled"; value: string; onValueChange: (v: string) => void };

const TabsCtx = createContext<TabsState | null>(null);

function useTabsContext(): TabsState {
  const ctx = useContext(TabsCtx);
  if (ctx === null) throw new Error("Tabs.* must be used inside <Tabs.Root>");
  return ctx;
}

function setTabValue(state: TabsState, next: string): void {
  switch (state.kind) {
    case "uncontrolled": return state.setValue(next);
    case "controlled":   return state.onValueChange(next);
    default: {
      const _exhaustive: never = state;        // compile error if kind grows
      throw new Error(`Unhandled Tabs state: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

interface RootProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
}

function Root({ defaultValue, value, onValueChange, children }: RootProps) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const state = useMemo<TabsState>(
    () => value !== undefined && onValueChange
      ? { kind: "controlled", value, onValueChange }
      : { kind: "uncontrolled", value: internal, setValue: setInternal },
    [value, onValueChange, internal],
  );
  return <TabsCtx.Provider value={state}>{children}</TabsCtx.Provider>;
}

function List({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>;
}

interface TriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string;
}
function Trigger({ value, ...rest }: TriggerProps) {
  const state = useTabsContext();
  const active = state.value === value;
  return (
    <button role="tab" aria-selected={active} data-state={active ? "active" : "inactive"}
            onClick={() => setTabValue(state, value)} {...rest} />
  );
}

interface ContentProps {
  value: string;
  children: React.ReactNode;
}
function Content({ value, children }: ContentProps) {
  const state = useTabsContext();
  if (state.value !== value) return null;
  return <div role="tabpanel">{children}</div>;
}

export const Tabs = { Root, List, Trigger, Content } as const;
```

Use:

```tsx
<Tabs.Root defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">...</Tabs.Content>
  <Tabs.Content value="settings">...</Tabs.Content>
</Tabs.Root>
```

The `setTabValue` switch is the proof: add `{ kind: "external"; ... }` to `TabsState` and the `default` branch fails to compile. That is the whole value of the discriminant: adding a variant turns "did I update every consumer?" into a build-time question. `references/typescript/03-state-typing.md` applies the same shape to async, form, and modal state.

## Polymorphic components (`as` prop)

A `Box` that renders as any element/component and forwards the right native props.

```tsx
type PolymorphicProps<C extends React.ElementType, P = Record<never, never>> =
  P & { as?: C } & Omit<React.ComponentPropsWithoutRef<C>, "as" | keyof P>;

interface BoxOwnProps {
  padding?: number;
  color?: string;
  children?: React.ReactNode;
}

export function Box<C extends React.ElementType = "div">(
  props: PolymorphicProps<C, BoxOwnProps>,
) {
  const { as, padding = 0, color, children, ...rest } = props as BoxOwnProps & { as?: C };
  const Comp: React.ElementType = as ?? "div";
  return (
    <Comp style={{ padding, color }} {...rest}>
      {children}
    </Comp>
  );
}

// Use sites
<Box padding={8}>div</Box>
<Box as="a" href="https://example.com">anchor: href required by HTMLAnchorElement</Box>
<Box as="button" type="submit" onClick={(e) => e.currentTarget.blur()}>button</Box>
```

| Constraint | Encoding |
|---|---|
| `C` defaults to a valid HTML tag | `C extends React.ElementType = "div"` |
| `as` itself must not leak into the DOM rest props | `Omit<React.ComponentPropsWithoutRef<C>, "as" \| keyof P>` |
| Own-prop names override forwarded props of the same name | `P & ... & Omit<..., keyof P>` |
| Ref forwarding (when needed) | Use `React.ComponentPropsWithRef<C>["ref"]` |

React 19 simplification: `ref` is now a regular prop. The legacy `forwardRef` wrapper around polymorphic components (with its module-augmentation hack to preserve generics) is no longer needed. Declare `ref?: React.ComponentPropsWithRef<C>["ref"]` on `BoxOwnProps` if you want explicit typing, or just let `ComponentPropsWithoutRef<C>` flow through.

Source: https://react.dev/blog/2024/12/05/react-19 (ref as a prop).

## Slot-based components (Radix-style `asChild`)

A `Slot` merges its incoming props into a single child element instead of adding a wrapper. Used by Radix and shadcn/ui to let consumers swap the rendered element without a polymorphic `as` prop.

```tsx
import { cloneElement, isValidElement, Children } from "react";

type AnyProps = Record<string, unknown>;

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const out: AnyProps = { ...slotProps, ...childProps };
  for (const key of Object.keys(slotProps)) {
    const slot = slotProps[key];
    const child = childProps[key];
    if (key.startsWith("on") && typeof slot === "function" && typeof child === "function") {
      out[key] = (...args: unknown[]) => {
        (child as (...a: unknown[]) => unknown)(...args);
        (slot  as (...a: unknown[]) => unknown)(...args);
      };
    } else if (key === "className" && typeof slot === "string" && typeof child === "string") {
      out[key] = `${child} ${slot}`;
    } else if (key === "style" && slot && child) {
      out[key] = { ...(child as object), ...(slot as object) };
    }
  }
  return out;
}

interface SlotProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

export function Slot({ children, ...slotProps }: SlotProps) {
  if (!isValidElement(children)) return null;
  const only = Children.only(children) as React.ReactElement<AnyProps>;
  return cloneElement(only, mergeProps(slotProps, only.props));
}

// Consumer
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "primary" | "ghost";
}
export function Button({ asChild, variant = "primary", className, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-variant={variant} className={className} {...rest} />;
}

// Use
<Button asChild>
  <a href="/docs">Read docs</a>
</Button>
```

`asChild` keeps the `Button`'s style, event-merging, and ARIA but renders an `<a>`, which is what you want when a router `<Link>` must own the element. The merge helper layers child handlers under slot handlers and concatenates `className`/`style`.

## Render prop / function-as-children

Headless lists, comboboxes, popovers: any component whose ownership is split between layout (the consumer) and behavior (the component).

```tsx
interface ComboboxState<T> {
  query: string;
  setQuery: (q: string) => void;
  selected: T | null;
  setSelected: (v: T | null) => void;
  options: readonly T[];
  visible: readonly T[];
}

interface ComboboxProps<T> {
  options: readonly T[];
  getLabel: (item: T) => string;
  initialSelected?: T | null;
  children: (state: ComboboxState<T>) => React.ReactNode;
}

export function Combobox<T>({
  options, getLabel, initialSelected = null, children,
}: ComboboxProps<T>) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<T | null>(initialSelected);
  const visible = useMemo(
    () => options.filter((o) => getLabel(o).toLowerCase().includes(query.toLowerCase())),
    [options, query, getLabel],
  );
  return <>{children({ query, setQuery, selected, setSelected, options, visible })}</>;
}

// Use
<Combobox options={users} getLabel={(u) => u.name}>
  {({ query, setQuery, visible, setSelected }) => (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {visible.map((u) => (
          <li key={u.id}>
            <button onClick={() => setSelected(u)}>{u.name}</button>
          </li>
        ))}
      </ul>
    </div>
  )}
</Combobox>
```

The `T` generic is inferred from `options`; consumers don't write `<Combobox<User>>` unless `options` is an empty literal.

## Refs (React 19)

React 19 lets you pass `ref` as a regular prop; `forwardRef` is legacy.

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  ref?: React.ComponentPropsWithRef<"input">["ref"];
}

export function Input({ label, ref, ...rest }: InputProps) {
  return (
    <label>
      <span>{label}</span>
      <input ref={ref} {...rest} />
    </label>
  );
}

// Caller
const r = useRef<HTMLInputElement>(null);
<Input ref={r} label="Email" />;
r.current?.focus();
```

For forwarding to an internal element of a custom component, expose `ref` as a typed prop and pass it down. `ComponentPropsWithRef<T>["ref"]` extracts the right `Ref` shape for any element type, and works equally for intrinsic tags, polymorphic `as`, and other components.

Useful helpers:

| Helper | Produces |
|---|---|
| `React.ComponentPropsWithRef<"button">` | All `<button>` props **including** `ref: Ref<HTMLButtonElement>` |
| `React.ComponentPropsWithoutRef<"button">` | Same, **excluding** `ref` (use when the component owns the ref internally) |
| `React.ElementRef<typeof Button>` | Element type the ref points to (useful when wrapping third-party components) |
| `React.ComponentRef<typeof Button>` | Same, newer name in React 19 types |

Legacy cleanup: every `React.forwardRef<E, P>(...)` wrapper can be deleted; expose `ref?: Ref<E>` on `P` and pass it through. The generic-`forwardRef` cast hack and the `declare module "react"` augmentation override become unnecessary.

`forwardRef` still works and is not deprecated, so existing code need not churn; new code should not reach for it. Source: https://react.dev/reference/react/forwardRef.

## Variants with CVA

`class-variance-authority` (`cva`) + `clsx`/`tailwind-merge` is the canonical 2026 pattern for typed component variants.

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const button = cva(
  "inline-flex items-center justify-center rounded font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:   "bg-slate-900 text-white hover:bg-slate-800",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost:     "bg-transparent hover:bg-slate-100 text-slate-900",
        danger:    "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
      fullWidth: { true: "w-full", false: "" },
    },
    compoundVariants: [
      // Design constraint: ghost+danger combo doesn't exist in the system
      { variant: "ghost", size: "lg", className: "tracking-wide" },
    ],
    defaultVariants: { variant: "primary", size: "md", fullWidth: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({ variant, size, fullWidth, className, ...rest }: ButtonProps) {
  return <button className={cn(button({ variant, size, fullWidth }), className)} {...rest} />;
}
```

What `VariantProps` gives you: `variant?: "primary" | "secondary" | "ghost" | "danger"`, `size?: "sm" | "md" | "lg"`, `fullWidth?: boolean | "true" | "false"`, all auto-derived from the `cva` definition. Renaming a variant in one place updates every component prop and editor autocomplete.

`compoundVariants` encodes design-system constraints. The "ghost+lg gets wider tracking" rule is enforced by the CSS recipe, not memorized by every component author.

`cn(button(...), className)` merges variant classes with caller-supplied `className` via `tailwind-merge`, which cancels conflicting Tailwind utilities (`bg-red-600` from `cva` is overwritten by `bg-blue-600` from `className` instead of both shipping).

## Higher-order patterns to AVOID in 2026

| Old pattern | Modern replacement | Why retire |
|---|---|---|
| `withRouter`, `withTheme`, `withAuth` HOC wrappers | Custom hooks: `useRouter()`, `useTheme()`, `useAuth()` | HOCs swallow `displayName`, mangle props, break `forwardRef` chains, and stack into "wrapper hell" in DevTools |
| `<ThemeContext.Consumer>{ctx => ...}</ThemeContext.Consumer>` render-prop consumer | `const ctx = useContext(ThemeContext)` (or `use(ThemeContext)` in React 19) | Consumer pattern blocks early returns, conditionals, and inline composition |
| `Component.defaultProps = { variant: "primary" }` on function components | `function Component({ variant = "primary" }: Props)` destructuring default | React 18 deprecated `defaultProps` on function components; removed in React 19 |
| `componentDidCatch` class boundary as the only error-boundary option | Same class API for boundaries (still required), but `react-error-boundary` package gives a hook-friendly wrapper | The error-boundary class itself is unavoidable; just don't reach for classes elsewhere |
| `class MyComponent extends React.Component` for new components | `function MyComponent` + hooks | Classes don't get `use()`, action hooks, server components, or future React features |
| Generic `withGeneric<T>(Component)` HOC | Plain generic function component | HOCs strip generics by default; the workarounds (cast back to a generic call signature) cost more than just writing a function |
| `connect(mapStateToProps, mapDispatchToProps)(Component)` (Redux 4-) | `const x = useSelector(s => s.x)`, `useDispatch()` | Same wrapper-hell rationale; modern Redux Toolkit ships hook-first |

Every row above has the same root cause: a wrapper that the type system cannot see through. Prefer a hook, which returns typed values, over a HOC, which rewrites a component's type.

## Cross-references

| File | Covers |
|---|---|
| `references/typescript/01-ts6-essentials.md` | tsconfig, strictness ladder, TS 6→7 deprecations, banned syntax under `erasableSyntaxOnly` |
| `references/typescript/03-state-typing.md` | Discriminated-union state (the pattern used by Tabs/Combobox above), reducer typing, async-data state, form state |
| `references/typescript/04-branded-primitives.md` | Branded IDs and units that flow through component props (`UserId`, `Pixels`, `OklchColor`) |
| `references/architecture/01-component-patterns.md` | Which pattern to reach for (compound vs slot vs polymorphic vs headless hook), public API stability, common structural smells. It does **not** cover where components live in the project tree or barrel-file rules; the plugin ships no reference for project layout |

## Sources (canonical)

| Topic | URL |
|---|---|
| TypeScript with React | https://react.dev/learn/typescript |
| React 19 release notes (ref as a prop) | https://react.dev/blog/2024/12/05/react-19 |
| forwardRef | https://react.dev/reference/react/forwardRef |
| useImperativeHandle | https://react.dev/reference/react/useImperativeHandle |
| Compiler options reference | https://www.typescriptlang.org/tsconfig/ |
| class-variance-authority | https://cva.style/docs |
