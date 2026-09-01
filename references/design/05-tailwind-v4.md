---
topic: design
role: reference
scope: tailwind-v4
audience: ui-designer
---

# Tailwind CSS v4

CSS-first config, OKLCH defaults, container queries first-class, native cascade layers, dynamic utilities, subgrid, performance, and migration path. Reference for any Tailwind decision in a 2026 codebase.

Verified against [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme) and [tailwindcss.com/docs/functions-and-directives](https://tailwindcss.com/docs/functions-and-directives). v4.0.0 shipped 2025-01-21; the current line is 4.3.x.

## 1. Why v4 over v3

| Area | v3 | v4 |
|---|---|---|
| Config | `tailwind.config.{js,ts}` | CSS-first via `@theme { --... }` |
| Color space | RGB defaults | OKLCH defaults, P3 gamut |
| Cascade isolation | Manual `@layer` discipline | Native `@layer theme, base, components, utilities` injected automatically |
| Container queries | Plugin (`@tailwindcss/container-queries`) | First-class — `@container`, `@max-md:`, `@min-2xl:` core |
| Dynamic values | Arbitrary value `[var(--foo)]` | `bg-(--foo)`, `mt-(--space-base)` |
| Custom property animation | Plugin | Native `@property` registration |
| Build engine | PostCSS + Tailwind CLI | Oxide engine — Rust-backed, ~5x faster cold, ~100x incremental |
| Bundle size | ~15-30 KB typical | Often single-digit KB after tree-shake |
| Browser baseline | ES2017, broad | Modern only — Safari 16.4+, Chrome 111+, Firefox 128+ |

Trade: drop legacy browser support, get a smaller, faster, less-config Tailwind. Default for any new 2026 project.

## 2. The `@theme` directive

Replaces `tailwind.config.ts`. Every CSS variable in `@theme` becomes both a runtime CSS variable *and* a generator for utility classes.

```css
@import "tailwindcss";

@theme {
  /* Color tokens: generate bg-brand, text-brand, border-brand, etc.
     The hue is a project decision; 95 here is a worked example chosen outside
     the 250-285 indigo/purple and ~180 teal bands that read as unconsidered
     defaults (references/aesthetic/03-taste-checklist.md item 1.3). */
  --color-brand:       oklch(0.58 0.20 95);
  --color-brand-50:    oklch(0.97 0.02 95);
  --color-brand-500:   oklch(0.58 0.20 95);
  --color-brand-900:   oklch(0.20 0.10 95);
  --color-surface:     oklch(0.98 0 0);
  --color-text:        oklch(0.18 0 0);

  /* Font families: generate font-display, font-body, font-mono.
     Pick the faces from the project's POV brief; see references/design/02-typography.md § 2. */
  --font-display: "<DISPLAY-FACE>", system-ui, sans-serif;
  --font-body:    "<BODY-FACE>", system-ui, sans-serif;
  --font-mono:    "<MONO-FACE>", ui-monospace, monospace;   /* code and log surfaces only */

  /* Spacing base — every gap-*, p-*, m-* is a multiple of this */
  --spacing: 0.25rem;

  /* Type scale */
  --text-2xs:  0.6875rem;
  --text-xs:   0.75rem;
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.5rem;
  --text-3xl:  1.875rem;
  --text-4xl:  2.25rem;
  --text-5xl:  3rem;

  /* Breakpoints — generates sm:, md:, lg:, xl:, 2xl:, 3xl: variants */
  --breakpoint-3xl: 120rem;

  /* Radii */
  --radius-xs:  0.125rem;
  --radius-sm:  0.25rem;
  --radius-md:  0.375rem;
  --radius-lg:  0.5rem;
  --radius-xl:  0.75rem;
  --radius-2xl: 1rem;

  /* Easing tokens — usable as `ease-(--ease-out-quart)` */
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-quint: cubic-bezier(0.16, 1, 0.3, 1);
}
```

| Theme namespace | Generates |
|---|---|
| `--color-*` | `bg-`, `text-`, `border-`, `outline-`, `ring-`, `from-`, `to-`, `via-`, `divide-`, `accent-`, `caret-`, `decoration-` |
| `--font-*` | `font-` |
| `--text-*` | `text-` (size) |
| `--font-weight-*` | `font-` (weight) |
| `--leading-*` | `leading-` |
| `--tracking-*` | `tracking-` |
| `--breakpoint-*` | `sm:`, `md:`, ... variants |
| `--container-*` | `@sm:`, `@md:`, ... container variants |
| `--spacing` | All `gap-N`, `p-N`, `m-N`, `w-N`, `h-N` (any positive number multiplier) |
| `--radius-*` | `rounded-` |
| `--shadow-*` | `shadow-` |
| `--ease-*` | `ease-` |
| `--blur-*` | `blur-` |
| `--animate-*` | `animate-` |

Three rules about `@theme` that fail silently when broken:

| Rule | What happens when broken |
|---|---|
| Theme variables must be declared **top level**. Never nest `@theme` inside `@media`, `:root`, or any selector | Tailwind hoists the nested declarations into `:root` and drops the media query or selector, so the nested value overwrites the top-level token unconditionally: a dark `@theme` inside `@media (prefers-color-scheme: dark)` puts the dark colour in `:root` for every user, with no error |
| A token whose `var()` target is re-declared in a scope (`.dark`, `[data-theme]`) needs `@theme inline`; a root-only reference works either way | The value resolves at the point of definition, not of use, so a nested theme scope yields the wrong colour |
| `@theme inline` does **not** emit a CSS custom property; it inlines the value into the generated utility | `var(--color-foo)` written by hand elsewhere resolves to nothing. Keep raw values in `:root` if other declarations must read them |

`--spacing` is the one **multiplier** namespace: declare it once and every integer utility generates itself (`p-3` compiles to `padding: calc(var(--spacing) * 3)`, and so does `p-17`). Every other namespace is enumerated, so only the keys you declare exist. `--spacing()` is also available as a function inside your own CSS: `margin: --spacing(4)`.

### Companion directives

| Directive | Use |
|---|---|
| `@theme` / `@theme inline` | Declare tokens; generate utilities |
| `@utility name { ... }` | Author a custom utility that works with every variant (`hover:`, `lg:`, `dark:`). This is the v4 replacement for hand-rolled classes in `@layer utilities` |
| `@custom-variant name (...)` | Author a variant, e.g. `@custom-variant dark (&:is(.dark *));` |
| `@variant dark { ... }` | Apply an existing variant to a rule inside your own CSS |
| `@source "path"` | Point Tailwind at source files it will not auto-discover (a linked package, a template dir outside the project root) |

```css
/* Custom utility that still composes with variants: hover:tab-4, lg:tab-4 */
@utility tab-4 {
  tab-size: 4;
}
```

## 3. OKLCH theme tokens

Authoritative pattern: primitives in a plain `@theme` (so they are emitted as CSS variables *and* generate `bg-brand-500`-style utilities), semantics in `@theme inline` (because their values reference those variables). Tailwind v4 uses OKLCH as the default colorspace; sRGB-only browsers get a fallback automatically.

```css
@import "tailwindcss";

/* Primitives: plain @theme. Emitted as CSS vars, so the semantics below can read them.
   Hue 95 is the section-2 worked example, not a recommendation: derive it from the POV brief. */
@theme {
  --color-brand-50:  oklch(0.97 0.02 95);
  --color-brand-100: oklch(0.93 0.04 95);
  --color-brand-200: oklch(0.86 0.08 95);
  --color-brand-300: oklch(0.78 0.12 95);
  --color-brand-500: oklch(0.58 0.20 95);
  --color-brand-600: oklch(0.48 0.20 95);
  --color-brand-900: oklch(0.20 0.10 95);

  --color-gray-50:  oklch(0.98 0 0);
  --color-gray-100: oklch(0.95 0 0);
  --color-gray-200: oklch(0.92 0 0);
  --color-gray-500: oklch(0.55 0 0);
  --color-gray-900: oklch(0.18 0 0);
}

/* Semantics: @theme inline, because every value contains var(). */
@theme inline {
  --color-surface:        light-dark(var(--color-gray-50),  var(--color-gray-900));
  --color-surface-2:      light-dark(var(--color-gray-100), oklch(0.22 0 0));
  --color-text:           light-dark(var(--color-gray-900), var(--color-gray-50));
  --color-text-muted:     light-dark(oklch(0.45 0 0),       oklch(0.65 0 0));
  --color-border:         light-dark(var(--color-gray-200), oklch(0.30 0 0));
  --color-accent:         light-dark(var(--color-brand-500), var(--color-brand-300));
  --color-accent-hover:   light-dark(var(--color-brand-600), var(--color-brand-200));
}

:root { color-scheme: light dark; }
.theme-light { color-scheme: light; }
.theme-dark  { color-scheme: dark; }
```

Every `var()` in that block resolves to a primitive declared above it. Referencing an undefined theme variable is the easiest mistake to make when hand-authoring a ramp, and it fails silently: the utility emits a value the browser cannot parse, so the property falls back to its inherited or initial value and the surface renders unstyled.

Alternative for what `light-dark()` cannot express (shadows, images, opacities, lengths). Note what is *not* here: no `@theme` nested inside the media query. Theme variables must be top level. Tailwind hoists the nested declarations into `:root` and drops the media query or selector, so the nested value overwrites the top-level token unconditionally: a dark `@theme` inside `@media (prefers-color-scheme: dark)` puts the dark colour in `:root` for every user, with no error.

```css
/* Raw values, scoped. These are plain custom properties, not theme tokens. */
:root {
  --surface:       oklch(0.98 0 0);
  --text:          oklch(0.18 0 0);
  --card-shadow:   0 8px 24px -12px oklch(0 0 0 / 0.14);
}
@media (prefers-color-scheme: dark) {
  :root {
    --surface:     oklch(0.16 0 0);
    --text:        oklch(0.92 0 0);
    --card-shadow: 0 8px 24px -12px oklch(0 0 0 / 0.55);
  }
}

/* One top-level mapping. Now bg-surface and text-text exist and follow the scheme. */
@theme inline {
  --color-surface: var(--surface);
  --color-text:    var(--text);
  --shadow-card:   var(--card-shadow);   /* raw name differs; a token cannot reference itself */
}
```

## 4. Container query utilities

First-class in v4 — no plugin. Mark an element as a container, use `@<size>:` variants on children.

```html
<article class="@container">
  <div class="grid grid-cols-1 gap-4 @md:grid-cols-2 @xl:grid-cols-[12rem_1fr_8rem]">
    <img src="..." class="rounded-lg @md:row-span-2">
    <h2 class="text-lg @md:text-xl @xl:text-2xl">Title</h2>
    <p class="text-sm text-(--color-text-muted)">Body…</p>
  </div>
</article>
```

| Syntax | Meaning |
|---|---|
| `@container` | Mark as containment context |
| `@container/foo` | Named container `foo` |
| `@sm:`, `@md:`, `@lg:`, `@xl:`, `@2xl:` | Min-width container variants |
| `@max-md:` | Max-width container variants |
| `@min-[24rem]:` | Arbitrary container breakpoint |
| `@sm/foo:` | Apply only when named container `foo` matches |

Default container breakpoints (override via `--container-*` in `@theme`):
| Name | Default |
|---|---|
| `@xs` | `20rem` (320px) |
| `@sm` | `24rem` (384px) |
| `@md` | `28rem` (448px) |
| `@lg` | `32rem` (512px) |
| `@xl` | `36rem` (576px) |
| `@2xl` | `42rem` (672px) |
| `@3xl` | `48rem` (768px) |

## 5. Dynamic utilities

`bg-(--my-var)` reads a custom property. Replaces v3's `bg-[var(--my-var)]` arbitrary syntax for variable-driven values.

```html
<!-- Reads --color-accent from the cascade (theme, component, inline) -->
<button class="bg-(--color-accent) text-(--color-surface)">Save</button>

<!-- Spacing token -->
<section class="py-(--space-2xl) px-(--space-l)">…</section>

<!-- Per-card accent override via inline custom property -->
<article class="bg-(--card-tint)" style="--card-tint: oklch(0.95 0.04 30)">…</article>

<!-- Arbitrary value still works for one-offs -->
<div class="bg-[oklch(0.7_0.18_140)]">…</div>
```

| Syntax | Use |
|---|---|
| `bg-(--var)` | Read a CSS variable from the cascade |
| `bg-(color:--var)` | Disambiguate when the property accepts multiple types |
| `bg-[oklch(...)]` | Arbitrary value (one-off) |
| `bg-(length:--var)` | Length-typed variable |

## 6. Subgrid

Both axes available as utilities.

```html
<section class="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-6">
  <article class="grid grid-rows-subgrid row-span-4 gap-2">
    <img src="...">
    <h3>Title</h3>
    <p>Body</p>
    <footer>Actions</footer>
  </article>
  <!-- repeat -->
</section>
```

`grid-rows-subgrid` and `grid-cols-subgrid` propagate parent tracks, eliminating the need for content-length JS or hand-tuned heights. Use whenever cards must align across rows.

## 7. Performance tips

| Tip | Detail |
|---|---|
| `@utility` for repeated patterns that need variants | `@utility card-pad { padding: --spacing(6) }` composes with `hover:`, `lg:`, `dark:`. `@layer components` still works for classes that never take a variant, and stays below utilities so a one-off `mt-4` wins |
| Avoid `@apply` in components | Defeats tree-shake — utility CSS is duplicated per component instead of reused. Use CSS variables or component classes via `@layer` |
| Use [CVA](https://cva.style) or [tailwind-variants](https://www.tailwind-variants.org) | Variant logic in TS; ships only the classes you use |
| `cn()` helper | Standard pattern: `import { clsx } from "clsx"; import { twMerge } from "tailwind-merge";` then `cn(...inputs) = twMerge(clsx(inputs))`. Resolves conflicting Tailwind classes deterministically |
| Group selectors over many utilities | `[&:has(input:checked)>span]:bg-accent` keeps logic in one rule |
| `not-prose` to escape Typography plugin scope | When a `<div>` inside `prose` contains a chart or app UI |
| Audit utility usage | `npx @tailwindcss/cli -i ./src/app.css -o ./out.css --minify` then check size. The CLI moved to the `@tailwindcss/cli` package in v4 and there is no `--content` flag any more; source discovery comes from `@source` in your CSS. The Oxide engine emits far less output than v3 for the same markup |

```ts
// cn helper — ship in lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

```ts
// Variant logic with tailwind-variants
import { tv } from "tailwind-variants";

export const button = tv({
  base: "inline-flex items-center justify-center font-medium rounded-md " +
        "transition-transform duration-150 ease-out " +
        "focus-visible:outline-2 focus-visible:outline-offset-2 " +
        "focus-visible:outline-(--color-accent) " +
        "active:scale-[0.97] disabled:opacity-55 disabled:pointer-events-none",
  variants: {
    intent: {
      primary:  "bg-(--color-accent) text-(--color-surface) hover:bg-(--color-accent-hover)",
      neutral:  "bg-(--color-surface-2) text-(--color-text) hover:bg-(--color-border)",
      ghost:    "bg-transparent text-(--color-text) hover:bg-(--color-surface-2)",
      danger:   "bg-(--color-feedback-error) text-(--color-surface)",
    },
    size: {
      // Geometry: inline padding >= 1.5x effective block padding.
      // Block padding = (height - line-box) / 2. sm: (32-20)/2=6 vs 12 => 2.0x.
      // md: (40-20)/2=10 vs 16 => 1.6x. lg: (48-24)/2=12 vs 24 => 2.0x.
      // See references/design/07-depth-and-overlays.md § 4.
      sm: "text-sm h-8 px-3 gap-1.5",
      md: "text-sm h-10 px-4 gap-2",
      lg: "text-base h-12 px-6 gap-2",
    },
  },
  defaultVariants: { intent: "primary", size: "md" },
});
```

## 8. Migration from v3

Run `npx @tailwindcss/upgrade` for a mostly-mechanical migration. Manual checklist for the remaining work:

| Change | v3 | v4 |
|---|---|---|
| Config file | `tailwind.config.ts` | `@theme` block in CSS |
| Import | `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` |
| PostCSS plugin | `tailwindcss` + `autoprefixer` | `@tailwindcss/postcss` (no separate autoprefixer) |
| `bg-opacity-50` style | `bg-blue-500/50` already encouraged | Old `bg-opacity-*` removed |
| `content` paths | `content: ["./src/**"]` in config | Auto-discovered via `@source` directive in CSS or default heuristics |
| `theme.extend` | Inside config | Just declare `@theme` — every var is an extension; remove with `--color-foo: initial` |
| `safelist` | `safelist: [...]` in config | `@source inline("class-1 class-2")` |
| `darkMode: "class"` | Config | `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` |
| Plugin API | JS | Some plugins not yet ported; check before upgrading |
| Browser support | IE11 in v2; ES2017 in v3 | Modern only (Safari 16.4+) |

```css
/* v4 starter */
@import "tailwindcss";

@source "./src/**/*.{ts,tsx,html}";   /* if outside auto-discovered roots */

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme {
  --color-brand: oklch(0.58 0.20 95);   /* hue from the POV brief; 95 = the worked example in section 2 */
}
```

`cn()` and CVA/tailwind-variants work unchanged. ESLint plugin `eslint-plugin-tailwindcss` v4-aware as of v3.18+.

## 9. Anti-patterns

| Anti-pattern | Why | Replace with |
|---|---|---|
| Liberal `@apply` in component CSS | Ships duplicated bytes; defeats v4 tree-shake | Inline utilities in markup, or use `@layer components` |
| Design tokens defined in TS / JS theme object | Doesn't ship to CSS; can't be used outside React; forks design system | Declare in `@theme` so tokens are CSS variables and utility generators |
| `sm:`, `md:`, `lg:` viewport variants on a portable component | Couples to viewport, not to its container | `@container` + `@sm:`, `@md:` container variants |
| Hex literals in markup | Bypasses theming, dark mode, multi-brand | `bg-brand`, `bg-(--color-brand)`, or `bg-[oklch(...)]` for one-offs only |
| Ignoring container queries | Component layout breaks when reused in narrow contexts | `@container` host + `@<size>:` variants |
| `text-[16px]` everywhere | Bypasses scale; inconsistent | `text-base`, `text-lg`, ... from `--text-*` |
| Custom shadow per component as arbitrary value | Drift across the app | Define `--shadow-*` in `@theme`, use `shadow-md` |
| Plugin sprawl in v4 | v4's core swallows old plugins (forms, typography stays useful) | Remove `@tailwindcss/container-queries`, autoprefixer, nesting plugins |
| `transition-all duration-300` | Animates layout/colors during theme switch (jank) | List explicit properties: `transition-[transform,background-color]` |
| Class string >300 chars on a single element | Unreadable; impossible to diff | Extract to a `tv()` variant or component class |
| Forgetting `darkMode` strategy in v4 | Default is `prefers-color-scheme`; class-based needs custom variant | Define `@custom-variant dark` once |
| `@theme` nested inside `@media` or a selector | Theme variables must be top level; Tailwind hoists the nested declarations into `:root` and drops the media query or selector, so the nested value overwrites the top-level token unconditionally: a dark `@theme` inside `@media (prefers-color-scheme: dark)` puts the dark colour in `:root` for every user, with no error | Raw values in the scoped selector, one top-level `@theme inline` mapping |
| `@theme` (not `inline`) whose `var()` target a scope re-declares | Resolves at the point of definition rather than of use; wrong values in nested theme scopes (a root-only reference is fine either way) | `@theme inline` for any token built from scoped variables |
| A `var(--color-...)` in a theme block that is never defined | The declaration is invalid at computed-value time; the surface renders unstyled with no error | Define every primitive the semantics read, above them in the file |
| `npx tailwindcss --content ...` | v3 invocation: wrong package, and `--content` no longer exists | `npx @tailwindcss/cli -i in.css -o out.css`, sources via `@source` |
| Custom classes hand-written into `@layer utilities` | Variants do not compose with them | `@utility name { ... }` |

### Framework landscape (where v4 sits, 2026)

| Approach | Shape | Picks it up when | Cost |
|---|---|---|---|
| **Tailwind v4** | Utility-first, CSS-first config, Oxide build | Product UI with a design system; team of any size; AI-assisted codegen (class names map 1:1 to intent) | Verbose markup; utility literacy required |
| **CSS Modules** | Scoped `.module.css`, plain CSS | Bespoke art direction, marketing sites, heavy keyframe work | No design-system enforcement; per-route CSS |
| **vanilla-extract** | TypeScript-authored CSS, zero runtime | You want tokens and variants type-checked at build time | Build integration; smaller ecosystem |
| **Panda CSS** | Type-safe tokens + build-time atomic CSS | Want vanilla-extract's types with atomic output | Newer; another codegen step |
| **StyleX** | Atomic CSS from JS, Meta-scale determinism | Very large codebases needing strict style merging semantics | Opinionated; sparse third-party components |
| **CSS-in-JS runtimes (styled-components, Emotion)** | Runtime style injection | Legacy codebases only | Runtime cost, RSC-hostile, both projects effectively in maintenance |
| **Plain modern CSS** (nesting, `@layer`, container queries, `light-dark()`) | No tooling at all | Small sites, embeds, anything that must not carry a build step | You rebuild the design-system guardrails yourself |

The 2026 default for a product UI is Tailwind v4 plus CVA or `tailwind-variants`; the honest exception is a one-off art-directed marketing page, where CSS Modules or plain modern CSS costs less than fighting utilities.
