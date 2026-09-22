---
topic: design
role: reference
scope: shadcn-custom
audience: ui-designer
---

# shadcn/ui Customization

Replacing the AI-tell defaults — tokens, typography, recompositions, dropping to Radix, distinctive icons, custom motion, and a taste audit. Reference for any project built on shadcn primitives.

Verified against shadcn's Tailwind v4 theming docs ([ui.shadcn.com/docs/theming](https://ui.shadcn.com/docs/theming)) and the Tailwind v4 theme reference ([tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme)).

## 1. shadcn defaults are AI-tells

Every AI-built site converges on the same shadcn shell. Pattern-recognizable in seconds:

| Default | Tell |
|---|---|
| `--radius: 0.5rem` everywhere | `rounded-md` on cards, buttons, inputs, dialogs — uniform medium radius |
| `bg-background text-foreground` | Generic semantic tokens with no point-of-view |
| Same neutral gray ramp | The default zinc/slate. Identical across thousands of v0/Lovable sites |
| Lucide icon set | One specific stroke weight, one specific style. Instant tell |
| Default fonts left at whatever the starter shipped (`Inter`, or an unexamined system stack) | Nobody made a type decision. A system stack chosen on purpose is a different thing; §3 states the test |
| Card with `rounded-lg border bg-card text-card-foreground shadow-sm` | The most-cloned component in the index |
| Default `Button` with no transition | Static feel, no character |
| `Tabs`, `Select`, `DropdownMenu` with default chevrons + spacing | Same composition as every demo |
| Hero -> CTA -> 3-feature grid -> testimonials -> footer | The default landing structure |

**Goal of this reference**: replace every default with a project-specific decision. Below, in order of impact.

## 2. Replace the theme tokens

shadcn ships a token set in `app/globals.css`. Replace the values, keep the file's **shape**. See `references/design/01-color-oklch.md` for ramp generation.

The shape is not optional, and getting it wrong is the single most expensive mistake in this file. shadcn's globals.css has three distinct parts and they are not interchangeable:

1. `@custom-variant dark (&:is(.dark *));` makes `dark:` follow the `.dark` class, which is what `next-themes` and every shadcn theme toggle set.
2. `:root { ... }` and `.dark { ... }` hold the **raw** token values (`--background`, `--card`, `--radius`, ...). These are plain custom properties in a selector. They are not theme tokens and they generate no utilities.
3. `@theme inline { --color-background: var(--background); ... }` is the mapping that turns those raw values into Tailwind utilities.

Only part 3 generates classes. Tailwind creates utilities from its documented theme namespaces (`--color-*`, `--radius-*`, `--font-*`, and so on), so `--background` declared inside a bare `@theme` block produces no `bg-background` class at all. Every unmodified shadcn component ships with `bg-background`, `text-card-foreground`, `border-border`, `rounded-lg`. Put the semantic names in `@theme` instead of `@theme inline` over `:root`, and those classes are never generated: cards, dialogs, inputs and buttons render transparent, borderless, and at default radii, with no build error to tell you.

Two rules follow from part 3, and they are why the primitive ramp below also lives in `:root` rather than `@theme`:

- A theme token whose `var()` target is re-declared in a scope (`.dark`, `[data-theme]`) must be declared with `@theme inline`, or Tailwind resolves it at the point of definition rather than the point of use, and nested theme scopes get the wrong value. A root-only reference (`--font-display: "Poppins", var(--font-sans)` in §3, both on `:root`) works either way.
- `@theme inline` does not emit its own CSS custom property. Its value is inlined into the generated utility. So anything you want to reference from another declaration (as `--primary: var(--brand-500)` does) has to exist as a raw property in `:root`, not only as a theme token.

```css
/* app/globals.css: the correct shape */
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

/* Part 2a: raw primitive ramp. Plain custom properties, one hue drives all of it. */
:root {
  --brand-hue: 95;   /* derive from the POV brief. See the hue note below */

  --brand-50:   oklch(0.97 0.02 var(--brand-hue));
  --brand-100:  oklch(0.93 0.04 var(--brand-hue));
  --brand-300:  oklch(0.78 0.12 var(--brand-hue));
  --brand-500:  oklch(0.58 0.20 var(--brand-hue));
  --brand-600:  oklch(0.48 0.20 var(--brand-hue));
  --brand-900:  oklch(0.20 0.10 var(--brand-hue));

  --neutral-50:  oklch(0.98 0.005 var(--brand-hue));  /* tinted toward brand hue */
  --neutral-200: oklch(0.92 0.008 var(--brand-hue));
  --neutral-500: oklch(0.55 0.010 var(--brand-hue));
  --neutral-900: oklch(0.16 0.012 var(--brand-hue));

  --feedback-error:   oklch(0.62 0.24 25);
  --feedback-success: oklch(0.65 0.18 145);
  --feedback-warn:    oklch(0.78 0.18 80);

  /* Part 2b: raw semantic values, shadcn's own names. Still NOT in @theme. */
  --radius: 0;                        /* sharp, editorial */
  /* OR --radius: 0.125rem;              subtle softening, still architectural */
  /* OR --radius: 1rem;                  friendly, marketing-forward */

  --background:           var(--neutral-50);
  --foreground:           var(--neutral-900);
  --card:                 oklch(0.995 0.003 var(--brand-hue));   /* brand-tinted near-white, one step above --neutral-50 */
  --card-foreground:      var(--neutral-900);
  --popover:              oklch(0.995 0.003 var(--brand-hue));
  --popover-foreground:   var(--neutral-900);
  --primary:              var(--brand-500);
  --primary-foreground:   var(--neutral-50);
  --secondary:            var(--neutral-200);
  --secondary-foreground: var(--neutral-900);
  --muted:                var(--neutral-200);
  --muted-foreground:     oklch(0.45 0 0);
  --accent:               var(--brand-500);
  --accent-foreground:    var(--neutral-50);
  --destructive:          var(--feedback-error);
  --border:               oklch(0.90 0 0);
  --input:                oklch(0.90 0 0);
  --ring:                 var(--brand-500);
}

.dark {
  --background:           var(--neutral-900);
  --foreground:           var(--neutral-50);
  --card:                 oklch(0.21 0 0);
  --card-foreground:      var(--neutral-50);
  --popover:              oklch(0.21 0 0);
  --popover-foreground:   var(--neutral-50);
  --primary:              var(--brand-300);
  --primary-foreground:   var(--neutral-900);
  --secondary:            oklch(0.30 0 0);
  --secondary-foreground: var(--neutral-50);
  --muted:                oklch(0.30 0 0);
  --muted-foreground:     oklch(0.66 0 0);
  --accent:               var(--brand-300);
  --accent-foreground:    var(--neutral-900);
  --destructive:          oklch(0.70 0.19 22);
  --border:               oklch(1 0 0 / 10%);
  --input:                oklch(1 0 0 / 15%);
  --ring:                 var(--brand-300);
}

/* Part 3: the mapping that actually generates the utilities. */
@theme inline {
  --color-brand-50:  var(--brand-50);
  --color-brand-100: var(--brand-100);
  --color-brand-300: var(--brand-300);
  --color-brand-500: var(--brand-500);
  --color-brand-600: var(--brand-600);
  --color-brand-900: var(--brand-900);

  --color-background:           var(--background);
  --color-foreground:           var(--foreground);
  --color-card:                 var(--card);
  --color-card-foreground:      var(--card-foreground);
  --color-popover:              var(--popover);
  --color-popover-foreground:   var(--popover-foreground);
  --color-primary:              var(--primary);
  --color-primary-foreground:   var(--primary-foreground);
  --color-secondary:            var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted:                var(--muted);
  --color-muted-foreground:     var(--muted-foreground);
  --color-accent:               var(--accent);
  --color-accent-foreground:    var(--accent-foreground);
  --color-destructive:          var(--destructive);
  --color-border:               var(--border);
  --color-input:                var(--input);
  --color-ring:                 var(--ring);

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}
```

**On the brand hue.** `--brand-hue: 95` is a worked example, not a recommendation: it sits outside the 250-285 indigo/purple band and away from the ~180 teal band that `references/aesthetic/03-taste-checklist.md` flags as unconsidered defaults. Derive the real number from the POV brief. Changing that one line re-hues the entire ramp, both schemes, because every stop reads it.

**On `light-dark()` here.** Do not use it in a shadcn recipe. `light-dark()` follows `color-scheme`, not the class. With next-themes at its default (`enableColorScheme: true`, which writes `style="color-scheme: dark"` on `<html>`) the two happen to agree; a toggle that only adds `.dark`, next-themes with `enableColorScheme={false}`, or a forced theme on a subtree moves the `dark:` variant and leaves every `light-dark()` token behind. Pick one mechanism and state it. If you want `light-dark()`, you are also giving up class-based toggling and the `dark:` variant, and you should say so in the project's design notes.

**Pick exactly one radius scale per project** and commit to it. `--radius` is one number; the `@theme inline` block derives the whole `rounded-*` family from it, so the scale stays proportional whichever value you pick. Mixing `rounded-sm` on inputs, `rounded-md` on buttons, `rounded-lg` on cards by hand is the default, and the tell.

## 3. Replace the typography stack

shadcn's default `--font-sans` is the system stack or Inter. The house doctrine and the full banned/approved list live in `references/design/02-typography.md` § 2; that file is the single statement of the policy, including what the system stack actually resolves to on each OS and when it is a deliberate choice rather than a leftover. This section only shows the wiring.

`--font-*` is a real Tailwind theme namespace, so these belong in `@theme` (unlike the semantic colour tokens in §2, which do not).

```css
@theme {
  /* System-stack house voice. Resolves to SF Pro on Apple, Segoe UI Variable on
     Windows, Roboto on Android. See design/02 § 2 for why that is acceptable
     here and what the self-hosted alternative is. Never self-host SF Pro on web. */
  --font-sans:    -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text",
                  "Segoe UI", Roboto, sans-serif;
  --font-display: "Poppins", var(--font-sans);        /* modern-elegant display moments */
  --font-mono:    "Berkeley Mono", ui-monospace, monospace;   /* code/log content only */
}
```

The one thing that turns this from "left at the default" into a decision is that the display face, the weights, and the tracking are chosen. A project that ships `--font-sans` untouched *and* no display face *and* default weights has made no type decision at all, which is what §1's tell row is about.

Pairing rules (`--font-mono` exists for code blocks and log panes only -- it never styles headers, labels, or data cells):
| Goal | Pair |
|---|---|
| Editorial product | Instrument Serif (display) + Söhne or DM Sans (body) + Berkeley Mono (code blocks only) |
| Tactical / data app | Söhne or Söhne Schmal throughout -- weight range (500-650) for functional headers, `tabular-nums` on data tables; mono only inside literal code cells |
| Friendly SaaS | GT Walsheim (display + body) + Commit Mono (code) |
| Technical platform | IBM Plex Sans (body) + IBM Plex Mono (code) + Migra (display) |
| Warm product with one voice | Plus Jakarta Sans alone, 400/500/700, display cut on headings |

Tracking:
```css
.h-display {
  font-family: var(--font-display);
  font-weight: 540;
  letter-spacing: -0.02em;     /* tighten display headlines */
  text-wrap: balance;
}
body { letter-spacing: 0; }    /* never track body */
.eyebrow {
  font-family: var(--font-sans);  /* never the mono face -- system/brand sans with weight doing the work */
  font-weight: 600;
  font-feature-settings: 'smcp';   /* small caps, never text-transform: uppercase (catalogue T5) */
  font-size: 0.6875rem;
  letter-spacing: 0.05em;      /* small caps need less air than shouted caps */
}
```

## 4. Recompose components, don't accept defaults

Three before/after examples. The pattern: identify what's generic, pick one element to over-invest in.

### Card

Before (shadcn default):
```tsx
<Card>
  <CardHeader>
    <CardTitle>Revenue</CardTitle>
    <CardDescription>Last 30 days</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$12,430</div>
  </CardContent>
</Card>
```

After (no border, custom shadow, asymmetric padding, tabular-nums metric on the sans):
```tsx
<article className="bg-(--card) p-6 pb-8
                    shadow-[0_1px_0_var(--border),0_24px_48px_-32px_oklch(0_0_0_/_0.18)]">
  <header className="flex items-baseline justify-between mb-4">
    <span className="text-[0.6875rem] font-semibold [font-feature-settings:'smcp'] tracking-[0.05em]
                     text-(--muted-foreground)">Revenue, last 30 days</span>
    <DeltaPill value={+0.12} />
  </header>
  <div className="text-4xl font-medium tabular-nums tracking-tight">
    $12,430
  </div>
</article>
```

### Button

Before:
```tsx
<Button variant="default">Save</Button>
```

After (custom transition, animated icon, inset press shadow):
```tsx
<button className="group inline-flex items-center gap-2 h-10 px-4
                   bg-(--primary) text-(--primary-foreground)
                   transition-[transform,box-shadow,background-color] duration-120 ease-out
                   hover:bg-brand-600
                   active:scale-[0.97]
                   active:shadow-[inset_0_1px_2px_oklch(0_0_0_/_0.25)]
                   focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-(--ring)">
  Save
  <ArrowUpRight className="size-4 transition-transform duration-150
                          group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/>
</button>
```

Geometry check on that button: `h-10` with `text-sm` gives a 20px line box, so effective block padding is `(40 - 20) / 2 = 10px` against 16px inline. That is 1.6:1, inside the contract in `references/design/07-depth-and-overlays.md` § 4. Fixed-height buttons hide their vertical padding, so compute it before judging the ratio.

### Dialog

Before: shadcn's default centered dialog with overlay fade.

After (slide from edge, named view-transition for morph):
```tsx
<Dialog.Root>
  <Dialog.Trigger asChild><Button>Open</Button></Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-(--background)/70
                               backdrop-blur-sm
                               data-[state=open]:animate-in
                               data-[state=open]:fade-in-0
                               data-[state=closed]:animate-out
                               data-[state=closed]:fade-out-0" />
    <Dialog.Content className="fixed inset-y-0 right-0 w-full max-w-md
                               bg-(--card) p-8 shadow-2xl
                               border-l border-(--border)
                               data-[state=open]:animate-in
                               data-[state=open]:slide-in-from-right
                               data-[state=closed]:animate-out
                               data-[state=closed]:slide-out-to-right
                               duration-220 ease-[cubic-bezier(0.25,1,0.5,1)]">
      <Dialog.Title className="font-display text-2xl mb-2">Settings</Dialog.Title>
      <Dialog.Description className="text-(--muted-foreground) mb-6">
        Configure preferences.
      </Dialog.Description>
      {/* … */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

## 5. Reach for Radix primitives directly

When shadcn's wrapper closes off the prop you need, drop down. shadcn ships generated Radix wrappers — they are not blessed black boxes.

Pattern: re-export typed Radix primitives, build the styled layer yourself.

```tsx
// components/ui/dialog.tsx — fully custom on Radix
import * as DialogPrimitive from "@radix-ui/react-dialog";
// React 18 form. On React 19 take `ref` as a plain prop and drop forwardRef + displayName
// (references/typescript/02-component-typing.md, the forwardRef note); the wrapper still compiles there.
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn } from "@/lib/utils";

export const Dialog        = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal  = DialogPrimitive.Portal;
export const DialogClose   = DialogPrimitive.Close;

export const DialogOverlay = forwardRef<
  ComponentRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-(--background)/70 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = forwardRef<
  ComponentRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: "right" | "center" }
>(({ className, side = "right", children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 grid gap-4 bg-(--card) p-6 shadow-2xl",
        side === "right" && "inset-y-0 right-0 w-full max-w-md border-l border-(--border)",
        side === "center" && "left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 max-w-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";
```

React 19 note: `ElementRef` is deprecated there in favour of `ComponentRef` (used above), and `ref` arrives as an ordinary prop, so the `forwardRef` wrapper is optional; current shadcn components take `ref` from props and type it with `ComponentProps<typeof DialogPrimitive.Content>`.

Other Radix primitives worth bypassing shadcn for: `Popover`, `Tooltip`, `Tabs`, `Toast`, `NavigationMenu`. Shadcn's wrappers are opinionated about className composition that bites once the design diverges.

## 6. Replace Lucide with a distinctive icon set

Lucide is the AI-default. Pick a different set per project — even a different default *stroke* weight reads differently within the first 100ms.

| Set | Variants | Personality | When |
|---|---|---|---|
| Lucide | one weight | Generic, ubiquitous | Default — therefore the tell |
| [Tabler](https://tabler.io/icons) | filled, outline, two-tone | Clean, broad coverage (4500+) | When you want shadcn-adjacent but not shadcn |
| [Phosphor](https://phosphoricons.com) | thin, light, regular, bold, fill, duotone | Six weights | When the design has rhythm — pair `regular` with `bold` for emphasis |
| [Iconoir](https://iconoir.com) | regular, solid | Friendly, slightly geometric | Marketing, consumer apps |
| [Untitled UI Icons](https://www.untitledui.com/icons) | line + duotone | Premium UI library | When matching the broader Untitled UI visual language |
| [Heroicons](https://heroicons.com) | 24-outline, 24-solid, 20-mini | Vercel/Tailwind-adjacent | Default when the rest is Vercel stack — but a tell in that combo |
| [Lineicons](https://lineicons.com) | line, solid | Distinctive thin strokes | Editorial / SaaS with serif headers |
| Custom drawn (Figma -> SVG -> sprite) | one set, your stroke | Strongest brand differentiator | When >20 icons need to match a specific tone |

Standardize one stroke weight, one corner radius for line-style icons, one set throughout. Ship as a sprite or via [Iconify](https://iconify.design) for tree-shaken on-demand loading.

## 7. Custom motion on shadcn primitives

shadcn's Tailwind v4 template animates via `tw-animate-css` (`@import "tw-animate-css"` in globals.css; `tailwindcss-animate` was deprecated on 2025-03-19 and survives only in un-migrated projects). Replace with explicit transitions or Motion springs for components that touch the user's gesture surface. See `references/design/04-motion.md`.

```tsx
// Replace the default Tabs underline with a morphing pill via View Transitions
function MotionTabs({ tabs, value, onChange }: TabsProps) {
  const handle = (next: string) => {
    if (!document.startViewTransition) return onChange(next);
    document.startViewTransition(() => onChange(next));
  };

  return (
    <Tabs.Root value={value} onValueChange={handle}>
      <Tabs.List className="relative inline-flex gap-1 p-1 bg-(--secondary)
                            rounded-(--radius)">
        {tabs.map((t) => (
          <Tabs.Trigger
            key={t.id}
            value={t.id}
            className="relative z-10 px-3 py-1.5 text-sm
                       data-[state=active]:text-(--primary-foreground)
                       transition-colors duration-150"
          >
            {value === t.id && (
              <span
                className="absolute inset-0 -z-10 bg-(--primary) rounded-[inherit]"
                style={{ viewTransitionName: "tab-pill" }}
              />
            )}
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
```

```css
::view-transition-old(tab-pill),
::view-transition-new(tab-pill) {
  animation-duration: 220ms;
  animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
}
```

For springs (gesture-driven sliders, drag-to-dismiss sheets), wrap with Motion's `<motion.div>` and pass one of the three section-3 triads from `references/design/04-motion.md`: `transition={{ type: "spring", stiffness: 200, damping: 24 }}` (`--spring-smooth`, for sheets and panels that follow the gesture) or `{ stiffness: 400, damping: 30 }` (`--spring-snappy`, for arrivals). A literal outside those three is the drift section 3 of that file warns about.

## 8. Distinctive component patterns to add

Recipes that signal "designed", not "scaffolded":

| Pattern | Implementation sketch |
|---|---|
| Search bar with inline shortcut hint | `<input>` plus an `<kbd className="hidden md:inline-flex">⌘K</kbd>` absolutely-positioned in the input's right padding |
| Button with subtle press inset shadow | `active:shadow-[inset_0_1px_2px_oklch(0_0_0_/_0.25)]` + `active:scale-[0.97]` |
| Card that lifts AND shifts inner content on hover | `.card:hover { transform: translateY(-2px) }` + `.card:hover .card-title { transform: translateY(-1px) }` with a 30ms delay for the title |
| Navigation pill with morphing background | `view-transition-name` on the pill background + `document.startViewTransition` on tab change (see §7) |
| Data table with sticky column + row-hover spotlight | `position: sticky; left: 0` for the first column + `tr:hover { background: color-mix(in oklch, var(--accent) 6%, transparent) }` |
| Empty state with an actionable next step | Replace the generic illustration; ship a button labeled with a verb specific to the page |
| Toast that morphs from the originating button | Apply `view-transition-name: toast-{id}` to both the button and the eventual toast |
| Checkbox with stroke-draw check | `<svg>` with `stroke-dasharray` + `stroke-dashoffset` animation on `data-[state=checked]` |
| Scroll-driven section progress | A 2px bar at the top of the section bound to `animation-timeline: view()` |
| Number that counts up on enter | Motion `animate(count, target, { duration: 0.6 })` triggered by IntersectionObserver |

## 9. Anti-pattern checklist (taste audit)

Run this list before shipping. Each line that's true = one AI-tell to fix. The entries marked "Specifically rejected" come from real design reviews where a shipped candidate was turned down for that exact reason, not from taste theory: the failure mode being caught is a design that reads as "bolted together" from recognizable AI-default parts.

| Tell | Fix |
|---|---|
| Default shadcn left untouched (`rounded-md`, default Inter, default zinc/slate, `bg-background text-foreground` everywhere) | Replace tokens, fonts, and radius. See §2 + §3 |
| Lucide icons everywhere | Pick a different set and a different weight. See §6 |
| Gray-on-gray cards stacked on a gray page | Tint each surface; introduce one accent surface per page; use elevation via shadow not color sameness |
| 6 weights of Inter loaded | One variable font family; remove all Inter usage if other typefaces ship |
| Default border-radius applied uniformly to every primitive | Pick one radius (often 0 or `0.125rem` or `1rem`) and commit, OR vary deliberately by primitive class |
| Generic hero -> CTA -> 3-feature grid -> testimonials -> footer landing | Lead with the product surface (an actual screenshot or live demo). Skip the rote feature grid |
| Newsreader + JetBrains Mono pairing | Specifically rejected as too common in AI output. Pick a sans-led pairing instead: Instrument Serif + Söhne, Author + Switzer, or one variable family carrying both roles. Mono stays inside code blocks, never in the brand pairing |
| Rounded cards left at the kit's default radius | Commit a radius and mean it: `0` architectural, `2px` precise, `6-8px` friendly -- then pair it with a committed border weight and a committed elevation step so the shape belongs to a system. The uncommitted `rounded-md` is the tell; roundness is not, and flattening a committed 6px radius to `0` to look less AI-generated only trades one unexamined default for another |
| Colored-left-border sections (`border-l-4 border-blue-500 pl-4`) | Replace with typographic hierarchy or a true sidebar. The colored left border is a 2023 Notion clone tell |
| Emoji indicators in product UI (status, callouts, headers) | Use icons from your chosen set, or color/typographic differentiation. No emojis in the product surface |
| Large decorative serif numerals (`01 / 02 / 03` at 72-96px) | Specifically rejected. If numbering matters, use functional headers with tabular figures (`tabular-nums`) and small caps |
| Editorial newspaper / "The X Log" masthead aesthetic | Specifically rejected as a default direction; ship it only if the brand is genuinely editorial. The replacement is a product-first header: the page's own name at display weight, the entity's identity block beside it, and the primary action, on a surface with a real edge |
| Per-category color borders | Decorative per-row keylines are specifically rejected (owner directive): a coloured left border on every card, all in the same colour, encodes nothing. A category system is allowed where the categories are real and the colour is what tells them apart -- derive the set from the one accent (`oklch(from var(--accent) l c calc(h + 40))` and so on down the set), keep it to the categories a reader must distinguish, and pair it with a label or icon so colour is not the only signal |
| Expand/collapse cards as the primary disclosure pattern | Specifically rejected. Prefer single-focus mode with sidebar navigation OR a dedicated detail page |
| Skeleton screens for sub-300ms loads | Adds perceived latency. Render the data as soon as it arrives, and where the wait is genuinely long, acknowledge the action in place instead -- a pressed or disabled control, then the content |
| Default Vercel/v0 visual language (Geist + Vercel-blue + black + dotted-grid bg) | Recognizable in seconds. Pick a different palette, and replace the dotted grid with a background that belongs to this product: a committed brand field, one photograph or product shot, or grain under `0.05` |
| Soft gradients everywhere as background filler | Remove. One bold surface beats five gradient washes |
| 3 boxes side-by-side as the dominant page rhythm | Vary cadence — full-bleed feature, asymmetric split, dense list, then a hero |

(Approved directions from the same review history: functional headers treated as data rather than decoration, one accent colour used sparingly, single-report focus with sidebar navigation, warm-dark backgrounds. One element of that direction was later rescinded: "monospace throughout" is out. No mono on human-readable text anywhere. Use the system or brand sans with weight and colour doing the hierarchy, `tabular-nums` for digit alignment, and mono only inside genuine code or log content.)
