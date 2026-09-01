---
topic: architecture
role: reference
scope: styling-architecture
audience: ui-engineer
---

# Styling Architecture

Token cascade, source-of-truth choice, Tailwind v4 + design tokens, the responsive token layer, CVA, theming, and the cascade-layer rules that make all of it predictable. Cross-ref: `references/architecture/01-component-patterns.md` § CVA, `references/design/06-shadcn-customization.md`, `references/responsive/` (breakpoint and container-query depth).

## 1. The token cascade

Six value layers plus one sizing axis that cuts across them. Each value layer consumes the layer above; don't skip layers, because the value of the cascade is that a rebrand or theme swap touches one layer.

```text
Primitive tokens     (color.blue.500 = oklch(0.62 0.18 245))
       v
Semantic tokens      (color.accent.default = {color.blue.500})
       v
Component tokens     (button.primary.bg = {color.accent.default})
       v
CSS custom props     (--button-primary-bg: oklch(0.62 0.18 245);)
       v
Tailwind utilities   (bg-button-primary, text-on-accent)
       v
Component classes    (cn(button({intent:"primary"}), className))

Responsive axis      (--breakpoint-*, --container-*, clamp() token values)
  crosses every layer above: any dimensional token may be fluid,
  and every layout decision states whether it keys off the
  container or the viewport.
```

| Layer | Lives in | Who reads it | Rebrand impact |
|---|---|---|---|
| Primitive | Token JSON / Style Dictionary / `@theme` | Only semantic layer | Never touched on rebrand |
| Semantic | Token JSON / `@theme` | Component layer | Single edit per token re-points an entire brand |
| Component | Token JSON / `@theme` | CSS / Tailwind | Override per component if needed |
| CSS custom property | `:root` / `[data-theme]` / `[data-brand]` | Tailwind, raw CSS | Generated from layers above |
| Tailwind utility | `tailwind.config` / `@theme` | JSX className | Generated; do not handwrite |
| Component class | Component file | DOM | The only place name-collision is forgivable |
| **Responsive axis** | `--breakpoint-*` / `--container-*` in `@theme`; `clamp()` inside any dimensional token | Layout CSS and every component that sizes itself | Untouched by a rebrand; touched by every density or platform change |

The responsive axis is not optional. A token system that declares only fixed `rem` values has no answer for what happens at 1920px or inside a 320px sidebar, and the components built on it will render identically at every width. Section 4 defines it.

## 2. Source-of-truth options

Pick by where the design lives and how many platforms ship it.

| Source | When | Pipeline | Cost |
|---|---|---|---|
| **Tailwind v4 `@theme`** | Tailwind-first project, web-only, design lives in code | CSS in the repo, no transformer | Lowest setup; coupled to Tailwind |
| **Style Dictionary** | Multi-platform (web + iOS + Android + Compose) | YAML/JSON in -> emits CSS, SCSS, Swift, Kotlin, JS | Build step; widely battle-tested |
| **Terrazzo** | Want W3C DTCG spec compliance, multi-platform | DTCG JSON in -> CSS/JS/Swift/Compose | Newer; spec-compliant |
| **Tokens Studio (Figma plugin)** | Design-led handoff, designers control the source | Figma -> JSON commit -> Style Dictionary | Designer training; CI sync |
| **DTCG W3C JSON** | Standardize across teams or vendor-neutral | Any compliant tool consumes | Format only; needs a transformer |
| **Figma Variables (alone)** | Pure design exploration, no engineering handoff yet | None | Drift the moment code is written |

W3C DTCG (Design Tokens Community Group) format released 2025.10, the first stable one ([CG-FINAL-format-20251028](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)). What "stable" buys you: `$type`/`$value`/`$description` are fixed, aliasing is `{group.token}`, and the composite types (`shadow`, `typography`, `gradient`, `transition`) are specified, so a transformer written against one compliant tool reads another's export. It does not standardize file layout or naming; that stays your convention.

## 3. Three-tier token example

Full code: three raw layers plus the `@theme inline` mapping that turns them into utilities, isolated rebrand. Tailwind v4 syntax.

```css
/* tokens/primitives.css — raw values, never used by components */
@layer base {
  :root {
    --color-blue-500: oklch(0.62 0.18 245);
    --color-blue-600: oklch(0.55 0.19 245);
    --color-blue-700: oklch(0.48 0.20 245);
    --color-red-500:  oklch(0.62 0.22 25);
    --color-gray-50:  oklch(0.98 0   0);
    --color-gray-900: oklch(0.18 0   0);
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-4: 1rem;
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
  }
}

/* tokens/semantic.css — intent layer; rebrand re-points these */
@layer base {
  :root {
    --accent:        var(--color-blue-500);
    --accent-hover:  var(--color-blue-600);
    --accent-active: var(--color-blue-700);
    --danger:        var(--color-red-500);
    --surface:       var(--color-gray-50);
    --fg:            var(--color-gray-900);
    --on-accent:     var(--color-gray-50);
  }
  [data-theme="dark"] {
    --surface: var(--color-gray-900);
    --fg:      var(--color-gray-50);
  }
}

/* tokens/component.css — component-scoped bindings */
@layer base {
  :root {
    --button-primary-bg:        var(--accent);
    --button-primary-bg-hover:  var(--accent-hover);
    --button-primary-fg:        var(--on-accent);
    --button-radius:            var(--radius-md);
  }
}
```

```css
/* tokens/theme.css: the ONLY block that generates utilities. Top level; inline because every value is a var(). */
@theme inline {
  --color-accent:       var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-on-accent:    var(--on-accent);
  --color-surface:      var(--surface);
  --color-fg:           var(--fg);
}
```

```tsx
// Component reads via Tailwind utility (preferred) or var()
<button className="bg-accent text-on-accent rounded-md hover:bg-accent-hover">
  Save
</button>
```

Why isolate: change `--color-accent-default` once; every primary button, accent link, focus ring, and brand chip updates. No grep-and-replace through the codebase.

## 4. Responsive token layer

Everything above is scheme-aware and brand-aware but width-blind. This layer is what makes the same token system produce a legible 360px phone view and a composed 2560px desktop view. It has four parts, and a token system missing any of them ships a design that renders identically at every width.

### 4a. Declare the size scales as tokens

Tailwind v4 has two dimensional namespaces, and they are theme tokens exactly like `--color-*`:

| Namespace | Generates | Keys off |
|---|---|---|
| `--breakpoint-*` | `sm:`, `md:`, `lg:`, `xl:`, `2xl:` viewport variants | The viewport |
| `--container-*` | `@sm:`, `@md:`, ... container variants, plus `max-w-*` / `w-*` size utilities | The nearest `@container` ancestor |

v4 defaults, which are the baseline you inherit unless you replace them:

```css
@theme {
  /* Viewport breakpoints (v4 defaults, shown for reference) */
  --breakpoint-sm:  40rem;   /*  640px */
  --breakpoint-md:  48rem;   /*  768px */
  --breakpoint-lg:  64rem;   /* 1024px */
  --breakpoint-xl:  80rem;   /* 1280px */
  --breakpoint-2xl: 96rem;   /* 1536px */

  /* Container-query sizes (v4 ships 3xs..7xl; the middle of the range) */
  --container-xs: 20rem;     /*  320px */
  --container-sm: 24rem;     /*  384px */
  --container-md: 28rem;     /*  448px */
  --container-lg: 32rem;     /*  512px */
  --container-xl: 36rem;     /*  576px */
}
```

To replace a scale rather than extend it, clear the namespace first. Otherwise your custom names sit alongside the five defaults and reviewers cannot tell which are real:

```css
@theme {
  --breakpoint-*: initial;    /* drop sm/md/lg/xl/2xl entirely */
  --breakpoint-compact: 45rem;
  --breakpoint-wide:    75rem;
}
```

`--breakpoint-*` values must be a plain length. A `--breakpoint-md: 48rem` becomes `@media (width >= 48rem)`, so `calc()` and `var()` are not usable there; author the number.

### 4b. Make dimensional tokens fluid, with a stated anchor pair

Any token that is a length can carry its own responsive ramp via `clamp()`, so the value scales without a single media query. Every fluid token in one system must share the same min and max viewport anchors, or the ratios between steps distort in the middle of the range.

```css
/* Anchors for this system: 360px (min) -> 1440px (max). Every clamp below uses them. */
@theme {
  --text-body:      clamp(1rem,      0.9583rem + 0.1852vw, 1.125rem);  /* 16 ->  18px */
  --text-display:   clamp(2rem,      1.3333rem + 2.963vw,  4rem);      /* 32 ->  64px */
  --spacing-section: clamp(3rem,     1.3333rem + 7.4074vw, 8rem);      /* 48 -> 128px */
}
```

Derivation, so the numbers are auditable rather than copied. For a token that goes `minPx` at `minVW` to `maxPx` at `maxVW`:

```text
slopeVw   = (maxPx - minPx) / (maxVW - minVW) * 100
interceptRem = (minPx - (slopeVw / 100) * minVW) / 16
preferred = interceptRem rem + slopeVw vw
```

For `--text-display` (32px at 360px, 64px at 1440px): `slopeVw = 32 / 1080 * 100 = 2.963`; `interceptRem = (32 - 0.02963 * 360) / 16 = 21.333 / 16 = 1.3333`. Hence `clamp(2rem, 1.3333rem + 2.963vw, 4rem)`. Check it at both ends: at 360px the preferred term is `21.333 + 10.667 = 32px`; at 1440px it is `21.333 + 42.667 = 64px`.

Two rules that keep fluid tokens honest:

- Always keep a `rem` term in the preferred value. A pure `vw` preferred (`clamp(2rem, 4vw, 4rem)`) ignores the user's browser font size, which breaks text resize under [WCAG 2.2 SC 1.4.4](https://www.w3.org/TR/WCAG22/#resize-text). The `interceptRem + slopeVw` shape always has one.
- Check where each token hits its max. A slope steeper than the formula freezes the token early: a display step that reaches its max at 700px is static across every laptop and desktop, which is the most common way "fluid" type turns out not to be.

### 4c. Container-query first; viewport queries only at the page shell

The rule, stated once so both the architect and the reviewer can apply it:

| Thing being sized | Keys off | Syntax |
|---|---|---|
| A reusable component (card, media object, stat tile, form row) | Its container | `@container` on the host, `@md:` / `@xl:` on children |
| Page shell: sidebar-vs-drawer, column count of the top-level grid, global nav mode | The viewport | `md:` / `lg:` variants, or a `@media` block |
| A value that should change continuously rather than in steps | Neither; the token | `clamp()` per 4b |

```css
/* Component: sizes to whatever slot it lands in */
.stat-tile-host { container-type: inline-size; container-name: tile; }
```

```html
<!-- Same component, three slots, three layouts, zero viewport queries -->
<aside class="stat-tile-host"><StatTile/></aside>
<main  class="stat-tile-host"><StatTile/></main>

<!-- Shell keys off the viewport, because there is no meaningful container above it -->
<div class="grid grid-cols-1 lg:grid-cols-[16rem_1fr]">…</div>
```

A component that carries `sm:` / `md:` / `lg:` classes is asserting that it will only ever be laid out at page width. That is nearly always false in a design system, and it is the defect that makes a card look correct on the dashboard and broken in the sidebar. Depth on container-query authoring, the viewport matrix, and the breakpoint audit lives in `references/responsive/`.

### 4d. Dynamic viewport units for anything full-height

`100vh` resolves to the *large* viewport, so a full-height element overflows by roughly the height of the mobile URL bar whenever that bar is showing.

| Unit | Resolves to | Use for |
|---|---|---|
| `dvh` / `dvi` / `dvb` | The viewport as it currently is, recalculated as chrome shows and hides | Default for modals, drawers, sticky app shells |
| `svh` | The *small* viewport (browser chrome visible) | Conservative minimum height that can never overflow |
| `lvh` | The *large* viewport (chrome retracted) | Only when the design wants to fill once bars retract |
| `vh` | Always the large viewport | Avoid on any surface a phone will render |

```css
.app-shell { block-size: 100dvh; }
.hero      { min-block-size: 100svh; }   /* never overflows, even with the URL bar up */
```

## 5. Tailwind v4 + design tokens

v4 (released January 2025; current 4.3.x) reads `@theme` directly in CSS, with no JS config. Tokens defined in `@theme` become both CSS custom properties **and** Tailwind utilities.

```css
/* app.css */
@import "tailwindcss";

@theme {
  /* Colors -> bg-accent / text-accent / border-accent / ring-accent */
  --color-accent:        oklch(0.62 0.18 245);
  --color-accent-hover:  oklch(0.55 0.19 245);
  --color-on-accent:     oklch(0.98 0   0);
  --color-surface:       oklch(0.98 0   0);
  --color-subtle:        oklch(0.95 0   0);
  --color-fg:            oklch(0.18 0   0);
  --color-border:        oklch(0.88 0   0);
  --color-danger:        oklch(0.62 0.22 25);

  /* Spacing -> the whole integer scale, generated from one multiplier */
  --spacing: 0.25rem;

  /* Radius -> rounded-sm / rounded-md */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;

  /* Typography -> font-sans / text-base */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

Multiplier namespaces vs enumerated namespaces. The distinction matters, and getting it wrong silently deletes most of your scale:

- `--spacing` is a **multiplier**. One declaration generates every `p-N`, `m-N`, `gap-N`, `w-N`, `h-N` for any positive number: `p-3` compiles to `padding: calc(var(--spacing) * 3)`, and so do `p-17` and `pr-29`. You never enumerate spacing steps. Declaring `--spacing-1`, `--spacing-2`, `--spacing-4` and nothing else gives a design system with exactly three usable steps; every `p-3`, `gap-6`, `mt-10` an engineer writes afterwards resolves to nothing, with no build error and no lint failure. Enumerated `--spacing-<name>` keys are only for named non-multiple values (`--spacing-gutter: 1.375rem`).
- `--color-*`, `--radius-*`, `--font-*`, `--text-*`, `--shadow-*`, `--ease-*`, `--breakpoint-*`, `--container-*` are **enumerated**. Only the keys you declare exist, so `rounded-md` requires a `--radius-md`.

Best practice: define **semantic** tokens in `@theme` (so `bg-accent` reads as intent, not `bg-blue-500`); reference primitives only from `@theme inline`. Components touch the semantic utility class. This means a designer renaming the brand color in Figma maps to one CSS edit.

| Pattern | Do | Don't |
|---|---|---|
| Component className | `bg-accent` | `bg-blue-600` |
| `@theme` value | `--color-accent: oklch(0.62 0.18 245)` | `--color-accent: var(--color-blue-500)` in a plain `@theme`. A token that references another variable needs `@theme inline`, or it resolves at the point of definition rather than the point of use |
| Theme override | `[data-theme="dark"] { --color-accent: ... }` outside `@theme` | Branch inside `@theme`. Theme variables must be declared top level; Tailwind does not compile selectors or media queries nested inside `@theme`, so a nested block is silently ignored |

If you keep a separate primitive layer (recommended for multi-brand), define primitives in regular `:root {}` and map them in a top-level `@theme inline`.

## 6. CVA for variant management

CVA when a component has 3+ variant axes; raw Tailwind utilities for one-offs.

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const card = cva(
  "rounded-lg ring-1 ring-border bg-surface text-fg",
  {
    variants: {
      padding:  { none: "p-0", sm: "p-3", md: "p-5", lg: "p-8" },
      tone:     { default: "", subtle: "bg-subtle", accent: "bg-accent text-on-accent ring-accent" },
      interactive: { false: "", true: "transition-shadow hover:shadow-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2" },
    },
    compoundVariants: [
      // accent + interactive needs higher contrast hover
      { tone: "accent", interactive: true, class: "hover:bg-accent-hover" },
    ],
    defaultVariants: { padding: "md", tone: "default", interactive: false },
  },
);

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof card> {}

function Card({ padding, tone, interactive, className, ...rest }: CardProps) {
  return <div className={cn(card({ padding, tone, interactive }), className)} {...rest} />;
}
```

| When | Use |
|---|---|
| 1 variant axis, <4 cases | Tailwind directly; conditional `cn()` is fine |
| 2-3 axes | CVA for typed defaults and prop autocomplete |
| 3+ axes or compound interactions | CVA — required; compound variants are otherwise unmaintainable |
| Slot-based composition (`Tabs.Root` styles `Tabs.Trigger` differently when active) | `tailwind-variants` (slots support) |

`tailwind-variants` is the drop-in when you also need slots; its `tv()` API is CVA's plus a `slots` key, and `VariantProps` works the same way.

## 7. CSS Modules vs Tailwind

| Concern | Tailwind | CSS Modules |
|---|---|---|
| Design-system enforcement | Strong — utilities only exist if defined | Weak — anyone can add any property |
| Bundle | Single CSS, purged | Per-route CSS, code-split |
| AI generation quality | Excellent — class names map 1:1 to design intent | Poor — invents class names that don't exist |
| Animations / keyframes | OK via `@keyframes` in CSS layer | Strong — co-located with the component |
| Complex state-driven styles | Verbose (`data-*` selectors + `data-[state=open]:bg-accent`) | Strong — full CSS at hand |
| Brand sites with bespoke layouts | OK with custom utilities; can feel fighty | Strong — write the CSS you mean |
| Refactor a token | One `@theme` edit | Find/replace across `.module.css` |
| Type safety on class names | Strings, but variants typed via CVA | `typed-css-modules` plugin or `experimental.typedCSSModules` |

Heuristic: design system + product app -> Tailwind + CVA. Marketing site with one-off art direction -> CSS Modules (or vanilla-extract if you want zero-runtime + types).

## 8. `tailwind-merge` + `cn` helper

Tailwind utilities apply in source order; the **last** wins. When you concatenate strings naively, conflicting utilities cohabit and the result is whichever one wins the cascade — usually whatever comes later in the generated CSS, not what you wrote last.

```tsx
// Bad
<button className={`px-2 ${condition && "px-4"}`} /> // Both utilities present; cascade decides

// Good — tailwind-merge dedupes; last wins predictably
<button className={cn("px-2", condition && "px-4")} />
// -> "px-4"
```

The shadcn `cn` helper (use it everywhere):

```tsx
// lib/cn.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

`clsx` joins conditionals (`{"a": true, "b": false}`, `["a", null, "b"]`); `twMerge` then dedupes Tailwind conflict groups (padding, margin, color, font-size, etc.). Configure `extendTailwindMerge` if you've added custom utility prefixes that should also dedupe.

## 9. Cascade layers (`@layer`)

CSS `@layer` gives you a deterministic priority order; later layers beat earlier layers regardless of selector specificity. Tailwind v4 already organizes itself into `theme`, `base`, `components`, `utilities`. Add custom layers safely:

```css
/* Order statement FIRST: layer priority is fixed by first declaration, and @import "tailwindcss"
   already declares theme, base, components, utilities (a later statement only appends new names). */
@layer reset, theme, base, app-base, components, utilities, overrides;
@import "tailwindcss";
/* anything in `overrides` beats utilities, beats components, etc. */

@layer app-base {
  body { background: var(--surface); color: var(--fg); }
}

@layer overrides {
  /* A one-off that must beat a utility is a real declaration; `all: revert-layer` only restores the lower layers */
  .legacy-widget .price { font-variant-numeric: tabular-nums; }
}
```

| Layer | What lives there | Beats |
|---|---|---|
| `reset` | normalize / preflight | nothing |
| `theme` | token defs (Tailwind v4 puts `@theme` here) | reset |
| `base` | element selectors (`h1`, `body`) | theme |
| `components` | reusable component classes (CVA-generated, `.btn`, `.card`) | base |
| `utilities` | Tailwind utility classes | components |
| `overrides` (custom) | one-off escape hatches | utilities |

Rule: **never** use `!important` in 2026. Layers solve every case `!important` was reaching for, without polluting specificity globally.

## 10. Light / dark mode strategies

Three options, picked by whether the user can override the system preference.

| Option | Mechanism | User toggle? | FOUC risk | Browser support (2026) |
|---|---|---|---|---|
| `light-dark()` + `color-scheme` | `color: light-dark(black, white);` resolved by the computed `color-scheme`; the root's `color-scheme` is settable from JS | Yes, by setting `color-scheme` on `<html>` | Zero for the system default; a pre-script is still needed to restore a stored choice | Chrome 123+, Firefox 120+, Safari 17.5+, universal |
| `prefers-color-scheme` `@media` | `@media (prefers-color-scheme: dark) { :root { --fg: white; } }` | No | Zero | Universal since 2020 |
| `data-theme` / class on `<html>` | `<html data-theme="dark">`; CSS targets `[data-theme="dark"]` | Yes | Yes — needs inline pre-script | Universal |

Recommended default for a two-mode theme: **`light-dark()` driven by `color-scheme`**, with `data-theme` used only as the storage hook the pre-script reads. One declaration per token, no paired override block, and nothing to keep in sync. Reach for a fully duplicated `[data-theme]` token set only when you have three or more modes (light / dark / high-contrast) or a `brand x theme` matrix (see § 11), where `light-dark()`'s two slots genuinely run out.

Exception: projects toggling through a class (shadcn, next-themes with `enableColorScheme` off, `@custom-variant dark (&:is(.dark *))`) keep the duplicated `:root` / `.dark` block; see `references/design/06-shadcn-customization.md` § 2. `light-dark()` cannot follow a class.

```html
<!-- inline pre-hydration script, blocking, in <head> -->
<script>
  (() => {
    const stored = localStorage.getItem("theme");
    const theme = stored ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  })();
</script>
```

```css
/* dark: utilities follow the same toggle as light-dark(); without this variant they follow the OS */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* One declaration per token. The pre-script's colorScheme assignment flips all of them. */
:root {
  color-scheme: light dark;
  --color-surface: light-dark(oklch(0.98 0 0), oklch(0.18 0 0));
  --color-fg:      light-dark(oklch(0.18 0 0), oklch(0.98 0 0));
}
/* The data-theme attribute drives color-scheme; it does not re-declare tokens. */
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"]  { color-scheme: dark; }
```

```tsx
// Toggle from a Zustand slice (see references/architecture/02-state-architecture.md § 6)
function ThemeToggle() {
  const theme = useAppStore(s => s.theme);
  const setTheme = useAppStore(s => s.setTheme);
  return (
    <button onClick={() => {
      const next = theme === "dark" ? "light" : "dark";
      document.documentElement.dataset["theme"] = next; // noPropertyAccessFromIndexSignature
      document.documentElement.style.colorScheme = next;
      setTheme(next);
    }}>
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
```

`light-dark()` being tied to `color-scheme` *is* its override mechanism, not an obstacle to one: the pre-hydration script above already sets `document.documentElement.style.colorScheme = theme`, and that single assignment re-resolves every `light-dark()` in the document. A "force dark" button is the same one-line assignment. The cost of the duplicated-token alternative is real: each semantic token must be declared twice and kept in sync by hand, and a missed pair is exactly how an unreadable chip or a white border in dark mode ships.

Two things `light-dark()` still cannot do, which is where a scoped override block earns its place: it resolves only `<color>` values (no shadows, images, opacities, or lengths), and it offers exactly two slots. For those, scope raw values under `@media (prefers-color-scheme: dark) { :root { ... } }` or `:root[data-theme="dark"] { ... }` and keep the rest of the palette on `light-dark()`.

## 11. Multi-brand theming

Brand = a complete swap of semantic tokens. Component tokens inherit; primitive layer is shared (or per-brand if brands use entirely different palettes).

```css
/* tokens/brands.css */
:root[data-brand="acme"] {
  --color-accent: oklch(0.62 0.18 245);   /* Acme blue */
  --color-accent-hover: oklch(0.55 0.19 245);
  --font-sans: "Inter", sans-serif;
  --radius-md: 0.5rem;
}
:root[data-brand="contoso"] {
  --color-accent: oklch(0.55 0.20 145);   /* Contoso green */
  --color-accent-hover: oklch(0.48 0.21 145);
  --font-sans: "Manrope", sans-serif;
  --radius-md: 0.25rem;                    /* sharper corners */
}
```

```tsx
// Set once at app root, swap by route / subdomain / user setting
<html data-brand={brand} data-theme={theme}>...</html>
```

| Strategy | Pros | Cons |
|---|---|---|
| Selector overrides on `:root[data-brand]` | One CSS bundle; instant runtime swap; no rebuild | All brand CSS shipped to all users |
| Build-time per-brand bundle | Smaller per-brand bundle | Build matrix multiplies; CDN cache fragmentation |
| Token JSON + Style Dictionary per brand | Multi-platform parity (web + native) | More tooling |

Combine `[data-brand]` x `[data-theme]` for `brand x theme` matrices: `:root[data-brand="acme"][data-theme="dark"] { --color-accent: ... }`. Avoid stacking more than two axes — at three you've reinvented Sass mixins poorly.

W3C DTCG `$extensions` field supports brand inheritance (`com.tokens.extends: "Brand A"`), useful when one brand is a tweak of another. `$extensions` is the spec's sanctioned escape hatch: it is a free-form object keyed by reverse-DNS namespace, so a transformer that does not know your key ignores it rather than failing.

## 12. Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Hardcoded hex in components (`color: "#3b82f6"`) | Use a token (`var(--color-accent)` or `bg-accent`) |
| Inline `style={{ color: "..." }}` | Use `className`; reserve `style` for dynamic computed values (positioning, transforms) |
| One giant `theme.ts` JS object consumed via context | CSS custom properties cost zero at runtime and drive both CSS and JS |
| Tailwind v3 `tailwind.config.js` dust on a v4 project | Migrate to `@theme` in CSS; v4 reads CSS, not JS config |
| `!important` to win cascade fights | Use `@layer overrides` instead; `!important` poisons every consumer |
| Primitive tokens used directly in components (`bg-blue-500`) | Add a semantic token (`bg-accent`) and reference that |
| Token names encoding visual values (`color-blue-500` referenced as the brand) | Rename to intent (`color-accent`); rebranding doesn't require rename then |
| Sequence numbers / dates in token names (`color-v2-2025`) | Versioning lives in package version, not token names |
| shadcn defaults shipped to production (the default neutral / accent / radius palette) | Override the theme tokens; cross-ref `references/design/06-shadcn-customization.md` |
| `style.setProperty("--token", value)` for theming | Theme via `[data-theme]` selector; `setProperty` is for genuinely dynamic per-instance values (a user-picked accent on a card) |
| Two sources of truth: tokens in Figma AND tokens hand-written in CSS | Pick one source; sync the other via Tokens Studio or similar |
| Documentation separate from component code | Storybook autodocs + MDX co-located; design docs in Zeroheight reference the same tokens |
| Enumerating `--spacing-1/2/4` instead of declaring `--spacing` | Deletes every step you did not enumerate; `p-3` and `gap-6` compile to nothing, silently | One `--spacing: 0.25rem`; the integer scale generates itself (§ 5) |
| A token system with no `--breakpoint-*`, no `--container-*`, and no `clamp()` anywhere | The design renders identically at 390px and 2560px | Add the responsive token layer (§ 4) |
| `@theme` nested inside `@media` or a selector | Theme variables must be top level; the nested block is ignored and the palette never applies | Declare raw values in the scoped selector, map them once in a top-level `@theme inline` |
| `@theme` (not `inline`) whose values reference other variables | Resolves at the point of definition, not of use, so nested theme scopes get wrong values | `@theme inline` whenever a token's value contains `var()` |

## References

- W3C Design Tokens Specification 2025.10 — `https://design-tokens.github.io/community-group/format/`
- Tailwind v4 docs — `https://tailwindcss.com/docs` (CSS-first config)
- `class-variance-authority` 0.7+ — `https://cva.style`
- `tailwind-merge` — `https://github.com/dcastil/tailwind-merge`
- Style Dictionary — `https://amzn.github.io/style-dictionary/`
- Terrazzo — `https://terrazzo.dev`
- shadcn `cn` helper — `https://ui.shadcn.com/docs/installation`
- `references/architecture/01-component-patterns.md` — CVA in components
- `references/architecture/02-state-architecture.md` — theme-state Zustand slice
- `references/design/06-shadcn-customization.md` — overriding shadcn defaults
- `references/responsive/` — breakpoint strategy, container-query authoring, viewport test matrix
