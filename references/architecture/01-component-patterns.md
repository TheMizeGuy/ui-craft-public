---
topic: architecture
role: reference
scope: component-patterns
audience: ui-engineer
---

# Component Patterns

Concrete patterns for React 19 + TypeScript 6 strict, with the typing boilerplate that actually works in 2026. Cross-ref: `references/architecture/02-state-architecture.md` (where state lives), `references/architecture/03-styling-architecture.md` (CVA, tokens).

## 1. Pattern selection matrix

| Pattern | When | Avoid when |
|---|---|---|
| **Props-based** | <5 configurable aspects, simple shape, leaf component (Button, Badge, Avatar) | Prop bloat at scale; `boolean` flags multiplying; conflicting combinations |
| **Compound** (`Tabs.Root + Tabs.List + Tabs.Trigger`) | Flexible composition with shared state; caller controls ordering and DOM structure | One-off non-reusable widget; no shared state to coordinate |
| **Slot** (`asChild`) | Caller wants to swap the underlying element (link in a button, custom trigger) | Behavior is fundamentally tied to the element (don't `asChild` an `<input>` into a `<div>`) |
| **Render props** (children-as-function) | Caller controls render of internal data (virtualized lists, measurement consumers) | A hook returning the same data is enough — hooks usually win in 2026 |
| **Polymorphic** (`as` prop) | Same component, multiple HTML tags (`<Box as="a">`, `<Heading as="h2">`) | Behavior changes meaningfully with the tag (don't make `<Button as="a">` lose button semantics — make a `<LinkButton>`) |
| **Hook-only headless** (`useDisclosure`, `useCombobox`) | Logic without a UI opinion (counters, timers, async state) | UI state needs DOM coordination (focus trap, portal positioning) — pair the hook with a primitive |

Rule of thumb: start props-based, refactor to compound when callers reach for `Comp.subPart` shapes, add `asChild` when callers `cloneElement` your trigger.

## 2. Compound components — full implementation

Internal context shares state; subcomponents read it. Discriminated state, `assertNever` exhaustive guard, no `forwardRef` (React 19 ref-as-prop).

```tsx
import { createContext, use, useId, useMemo, useState } from "react";

type TabsState =
  | { status: "uncontrolled"; activeId: string; setActiveId(id: string): void }
  | { status: "controlled"; activeId: string; setActiveId(id: string): void };

const TabsCtx = createContext<TabsState | null>(null);

function useTabs(): TabsState {
  const ctx = use(TabsCtx);
  if (!ctx) throw new Error("Tabs.* must render inside <Tabs.Root>");
  return ctx;
}

function assertNever(x: never): never {
  throw new Error(`Unhandled tabs state: ${JSON.stringify(x)}`);
}

interface RootProps {
  children: React.ReactNode;
  defaultId: string;
  value?: string;
  onValueChange?(id: string): void;
}

function Root({ children, defaultId, value, onValueChange }: RootProps) {
  const [internal, setInternal] = useState(defaultId);
  const state = useMemo<TabsState>(() => {
    if (value !== undefined) {
      return { status: "controlled", activeId: value, setActiveId: (id) => onValueChange?.(id) };
    }
    return { status: "uncontrolled", activeId: internal, setActiveId: setInternal };
  }, [value, internal, onValueChange]);

  // Exhaustiveness for any future state variant
  switch (state.status) {
    case "uncontrolled":
    case "controlled":
      return <TabsCtx value={state}>{children}</TabsCtx>; // React 19 shorthand
    default:
      return assertNever(state);
  }
}

function List({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>;
}

interface TriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "id"> {
  id: string;
}

function Trigger({ id, children, ...rest }: TriggerProps) {
  const { activeId, setActiveId } = useTabs();
  const panelId = `tabpanel-${id}`;
  const selected = activeId === id;
  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      onClick={() => setActiveId(id)}
      {...rest}
    >
      {children}
    </button>
  );
}

interface ContentProps {
  id: string;
  children: React.ReactNode;
}

function Content({ id, children }: ContentProps) {
  const { activeId } = useTabs();
  if (activeId !== id) return null;
  return (
    <div role="tabpanel" id={`tabpanel-${id}`} aria-labelledby={`tab-${id}`}>
      {children}
    </div>
  );
}

export const Tabs = { Root, List, Trigger, Content };

// Usage
<Tabs.Root defaultId="overview">
  <Tabs.List>
    <Tabs.Trigger id="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger id="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content id="overview">...</Tabs.Content>
  <Tabs.Content id="settings">...</Tabs.Content>
</Tabs.Root>
```

Notes: `use(Context)` (React 19) is legal in conditionals/loops; the hook variant returns the discriminated union so callers can narrow if they need to. Group the parts on a single namespace export for IDE discoverability — do **not** ship `TabsRoot` / `TabsList` as flat names.

## 3. Slot pattern — `asChild`

The caller passes their own element; your component clones it, merges props (yours + theirs), and forwards the ref. Standard pattern: `@radix-ui/react-slot`.

```tsx
import { Slot } from "@radix-ui/react-slot";
import { Tooltip } from "@/components/tooltip";

<Tooltip.Trigger asChild>
  <Button onClick={() => analytics.track("opened")}>Open</Button>
</Tooltip.Trigger>;
```

Implementation, using `Slot`:

```tsx
import { Slot, type SlotProps } from "@radix-ui/react-slot";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

function Button({ asChild, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp {...rest} />;
}
```

How props merge with `Slot`:

| Prop kind | Behavior |
|---|---|
| `className` | Concatenated (`yours ++ caller's`); pair with `tailwind-merge` for dedup |
| `style` | Shallow merged; caller's keys win |
| Event handlers (`onClick`, `onPointerDown`, ...) | Both run; caller's first, then yours, unconditionally. Check `event.defaultPrevented` in your own handler if the caller must be able to cancel it (Radix primitives do this in `composeEventHandlers`, not in Slot) |
| `ref` | Composed via `useComposedRefs` — both refs receive the node |
| Other props | Caller wins (last-write) |

Roll-your-own minimal Slot when you can't take the dep:

```tsx
type AnyProps = Record<string, unknown>;
function Slot({ children, ...slotProps }: { children: React.ReactNode } & AnyProps) {
  if (!React.isValidElement<AnyProps>(children)) return null;   // React 19 types: name the props type, or cloneElement only accepts Partial<unknown>
  const childProps = children.props;
  return React.cloneElement(children, {
    ...slotProps,
    ...childProps,
    onClick: (e: React.MouseEvent) => {
      (childProps["onClick"] as ((e: React.MouseEvent) => void) | undefined)?.(e);
      (slotProps["onClick"] as ((e: React.MouseEvent) => void) | undefined)?.(e);
    },
  });
}
```

**Avoid** `asChild` on form-control wrappers (`<Input asChild>`) — losing the underlying `<input>` breaks `name`/`value`/`form` semantics and validation.

## 4. Polymorphic components — full typed example

Same component, multiple tags, with native props of the chosen tag inferred and ref correctly typed.

```tsx
type PolymorphicProps<C extends React.ElementType, P = object> = P & {
  as?: C;
  ref?: React.ComponentPropsWithRef<C>["ref"];
} & Omit<React.ComponentPropsWithoutRef<C>, keyof P | "as">;

interface BoxOwnProps {
  padding?: 0 | 1 | 2 | 4 | 8;
  tone?: "neutral" | "subtle" | "loud";
  children?: React.ReactNode;
}

function Box<C extends React.ElementType = "div">({
  as,
  padding = 0,
  tone = "neutral",
  className,
  children,
  ...rest
}: PolymorphicProps<C, BoxOwnProps>) {
  const Comp = (as ?? "div") as React.ElementType;
  return (
    <Comp
      className={cn(`p-${padding}`, toneClass[tone], className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}

const toneClass = { neutral: "bg-surface", subtle: "bg-subtle", loud: "bg-accent text-on-accent" } as const;

// Each forces the right native prop surface
<Box padding={4}>plain div</Box>
<Box as="a" href="/docs">href required, click handlers correctly typed</Box>
<Box as="button" type="submit" onClick={(e) => e.currentTarget.blur()}>submit</Box>
```

| Challenge | Fix |
|---|---|
| `C` must default to a valid element | `C extends React.ElementType = "div"` |
| `as` must not leak into the rest spread | `Omit<ComponentPropsWithoutRef<C>, "as" \| keyof P>` |
| Ref typed for the chosen element | `ComponentPropsWithRef<C>["ref"]` (React 19: ref is a prop) |
| Generic + legacy `forwardRef` | Module-augment `forwardRef` to preserve generics, or upgrade to React 19 and drop `forwardRef` |

When a polymorphic component would change behavior with the tag (focus management, keyboard nav, ARIA defaults), **stop and split**. `<LinkButton>` and `<Button>` are clearer than one `<Button as="a">`. The test is behavioural, not cosmetic: a `<button>` fires on Space and Enter and is focusable by default, an `<a href>` fires on Enter only and navigates, and an `<a>` without `href` is not focusable at all. A single component that has to branch on `as` to get any of that right is two components wearing one name.

## 5. Headless hook pattern

Hook returns state + ARIA prop bundles. Caller wires UI. No DOM opinion shipped.

```tsx
interface UseDisclosureOptions {
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
}

interface UseDisclosureReturn {
  open: boolean;
  setOpen(value: boolean): void;
  toggle(): void;
  triggerProps: Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-expanded" | "aria-controls" | "onClick">;
  contentProps: Pick<React.HTMLAttributes<HTMLElement>, "id" | "hidden">;
}

function useDisclosure({ defaultOpen = false, onOpenChange }: UseDisclosureOptions = {}): UseDisclosureReturn {
  const [open, setOpenInternal] = useState(defaultOpen);
  const id = useId();
  const setOpen = useCallback((v: boolean) => {
    setOpenInternal(v);
    onOpenChange?.(v);
  }, [onOpenChange]);
  return {
    open,
    setOpen,
    toggle: useCallback(() => setOpen(!open), [open, setOpen]),
    triggerProps: {
      "aria-expanded": open,
      "aria-controls": id,
      onClick: () => setOpen(!open),
    },
    contentProps: { id, hidden: !open },
  };
}

// Caller wires whatever DOM they want
function Disclosure() {
  const { triggerProps, contentProps } = useDisclosure();
  return (
    <>
      <button {...triggerProps}>Toggle</button>
      <section {...contentProps}>...</section>
    </>
  );
}
```

Other canonical headless hooks: `useCombobox` (Downshift), `useMenu`/`useDialog` (React Aria), `useTable`/`useReactTable` (TanStack Table), `useVirtualizer` (TanStack Virtual).

## 6. Render props (rare, but useful)

Children-as-function still wins for two cases: **measurement consumers** that need the parent's render to depend on a measured value, and **virtualized list items** where the row index drives rendering.

```tsx
interface MeasureProps {
  children(rect: DOMRect | null): React.ReactNode;
}

function Measure({ children }: MeasureProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => { if (entry) setRect(entry.contentRect); }); // noUncheckedIndexedAccess: entry is T | undefined
    ro.observe(el);
    return () => ro.disconnect(); // React 19 ref cleanup
  }, []);
  return <div ref={ref}>{children(rect)}</div>;
}

<Measure>{(rect) => rect ? <p>{rect.width}px wide</p> : null}</Measure>
```

When a hook (`useResizeObserver`) returns the same value, prefer the hook — it composes better.

## 7. Variants with CVA + Tailwind

`class-variance-authority` (CVA) gives you typed variant props with autocomplete and exhaustive defaults. Pairs with `tailwind-merge` for dedup. Cross-ref: `references/architecture/03-styling-architecture.md` § CVA.

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      intent: {
        primary: "bg-accent text-on-accent hover:bg-accent-hover focus-visible:outline-accent",
        secondary: "bg-surface text-fg ring-1 ring-border hover:bg-subtle",
        destructive: "bg-danger text-on-danger hover:bg-danger-hover focus-visible:outline-danger",
        ghost: "text-fg hover:bg-subtle",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
      tone: {
        loud: "shadow-sm",
        quiet: "",
      },
    },
    compoundVariants: [
      // destructive ghost reads weak — bump weight
      { intent: "destructive", tone: "quiet", class: "bg-transparent text-danger hover:bg-danger/10" },
      // link buttons ignore size padding
      { intent: "link", class: "h-auto px-0" },
    ],
    defaultVariants: { intent: "primary", size: "md", tone: "loud" },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

function Button({ intent, size, tone, className, asChild, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(button({ intent, size, tone }), className)} {...rest} />;
}
```

Why this beats `clsx({ "bg-blue-600": intent === "primary", ... })`:

| Concern | `clsx({...})` | CVA |
|---|---|---|
| Variant types in IDE | None | `VariantProps<typeof button>` infers them |
| Defaults | Manual `??` chains | `defaultVariants` |
| Special combinations | Nested ternaries | `compoundVariants` |
| Refactor a variant | Find/replace strings | Rename one key |
| Storybook/MDX surface | Hand-written prop list | Auto from variants |

One caveat on `VariantProps`: it types every variant key as optional, including keys with a `defaultVariants` entry. If a downstream consumer must always pass one, intersect it back to required (`VariantProps<typeof button> & { intent: NonNullable<VariantProps<typeof button>["intent"]> }`) rather than relying on the default.

## 8. Composition over configuration

Decision rule: a *prop* expresses identity (this component is X), *children/slots* express composition (X contains Y).

| Need | Prop | Children / Slot |
|---|---|---|
| Static label or text content | `label="Save"` | — |
| Single optional decorator (icon) | `icon={<IconSave/>}` | — |
| Multiple optional decorators with order | — | `children` (caller composes order) |
| Custom layout inside a panel | — | `children` |
| Custom trigger that swaps the element | — | Slot (`asChild`) |
| Variant of appearance | `intent="primary"` | — |
| One-of-two semantic roles | `as="a" \| as="button"` (or two components) | — |
| Conditional secondary section (rare, optional) | `footer={...}` slot prop | `children` if multi-line |

Smell: more than ~3 named slot props (`header`, `body`, `footer`, `aside`, `actions`) — switch to a compound API.

## 9. Public API stability

For component libraries (and shared internal design systems), treat React props the same as a public TypeScript API. SemVer maps to:

| Change | Bump |
|---|---|
| Add optional prop with safe default | minor |
| Add required prop | **major** |
| Remove a prop | **major** |
| Narrow a prop type (`string` → `"a" \| "b"`) | **major** |
| Widen a prop type (`"a" \| "b"` → `string`) | minor |
| Rename a prop | **major** (or minor with a deprecation alias for one cycle) |
| Change default value | **major** if observable (color, size, behavior) |
| Add a slot subcomponent (`Comp.Header`) | minor |
| Remove a slot subcomponent | **major** |
| Change ARIA role / keyboard behavior | **major** (consumers may rely on it) |
| Change rendered DOM element of a leaf | minor (unless it changes selectors used in the wild) |
| Change CSS class names | minor for utility classes, **major** for selector-targeted hooks |

Document the API in TSDoc on the props interface. Re-export types (`export type ButtonProps = ...`) so consumers can extend.

## 10. Common smells

| Smell | Fix |
|---|---|
| Boolean prop explosion (`primary`, `secondary`, `destructive`, `large`, `small`, `disabled`, `loading`) | Discriminated union: `intent: "primary" \| "secondary" \| "destructive"` + `size: "sm" \| "md" \| "lg"` + states stay boolean |
| Generic `type` prop (`type="primary"`, `type="link"`) | Rename to a semantic axis (`intent`, `variant`, `appearance`); `type` collides with native `<button type>` |
| Every component is a Card-with-border (`<Card><Card.Header><Card.Body>...`) wrapping every leaf | Recompose: leaves render bare; only one outer container has the chrome |
| Manual `forwardRef` + `displayName` boilerplate on React 19 | Drop `forwardRef`; accept `ref` as a prop directly |
| `React.FC<Props>` everywhere | Explicit function signature: `function Card(props: CardProps) { ... }` (no implicit `children`, generics work) |
| `useState` for derived state (`fullName` from `firstName`/`lastName`) | Compute in render; `useMemo` only if it's actually expensive |
| Provider value rebuilt every render | `useMemo` the value; or split state-context from dispatch-context |
| Spreading unknown `...props` straight to the DOM | Type the rest with `ComponentPropsWithoutRef<"div">` and `Omit` your handled keys |
| Inline arrow handlers in lists breaking memo | Lift handler up; pass `data-id` and read in handler |
| Polymorphic component whose behavior changes with `as` | Split into named components (`<LinkButton>` vs `<Button>`) |

## References

- `references/architecture/02-state-architecture.md` — where compound-component state lives
- `references/architecture/03-styling-architecture.md` — CVA + tokens + theming
- React 19 release notes — `https://react.dev/blog/2024/12/05/react-19`
- Radix Slot — `@radix-ui/react-slot`
- CVA — `class-variance-authority` 0.7+
