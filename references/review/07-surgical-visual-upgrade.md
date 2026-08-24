---
topic: review
role: reference
scope: surgical-visual-upgrade
audience: ui-reviewer
---

# Surgical Visual Upgrade

Non-destructive method for taking functional-but-generic UI (framework defaults, ad-hoc CSS, unthemed component kits) to designed quality WITHOUT touching the behavior underneath. The operating rule: JavaScript logic is sacred; the visual layer is the patient. A beautiful app that no longer works is a failed upgrade, so functionality checks always precede visual ones.

Adapted from [VibeCurb](https://github.com/Yu-369/VibeCurb) (MIT, Copyright (c) 2026 Yu-369), curated and merged with this library's conventions. Applies inside `improve-ui` when the ask is "make this look better" on working code; greenfield design is `design-ui` territory.

## 1. Sacred vs Slop classification

Before any edit, classify every element of the target:

**Sacred (never modified):** state declarations and updates, effect/callback/memo bodies, API calls and data fetching, event-handler LOGIC (what happens on click -- not how the button looks), conditional rendering (ternaries, `&&` chains), router/navigation, form validation, context providers/consumers, custom hooks, data transforms, error handling, prop interfaces, third-party integration logic.

**Slop (upgrade aggressively):** class strings, inline styles, stylesheet contents, framework utility classes, color values, font stacks and sizes, spacing values, radii, shadows, transition/animation declarations, z-index values, flex/grid configuration, and wrapper nesting that exists purely for layout.

**The gray zone** -- elements that are both, handled by editing only the style half:

| Element | Rule |
|---|---|
| `className={isActive ? 'a' : 'b'}` | Keep the ternary; change only the class name VALUES |
| `style={{ display: isOpen ? ... }}` | State-driven inline style is LOGIC -- leave it; style alongside |
| `.map()` with `key=` | The map, key, and data flow are sacred; style the child's internals |
| `ref=` / `aria-*` / `data-*` / `id` | Never remove or rename -- refs drive JS, aria is functional, data/id may be selector targets |
| Wrapper div around conditional content | May exist for rendering reasons; confirm purely presentational before touching |

Golden rule of the gray zone: when unsure whether something is logic or style, leave it and style alongside it. A less elegant CSS solution that cannot break the app beats an elegant refactor that might. The #1 way an upgrade breaks an app is JSX restructuring for aesthetic reasons -- a lost conditional wrapper, a moved key, a reordered child that depended on DOM position. Add CSS to the existing structure; never reshape structure to fit CSS preferences.

## 2. Audit before prescription

Read every file first. Per file, record: sacred elements, slop elements, and a risk level -- Low (mostly presentational; restyle aggressively), Medium (mixed; restyle carefully, test after), High (state/effects/API interwoven with presentation; touch only class values and styles, test every change). Then catalog the specific aesthetic defects with their current values -- generic font stack, framework-default accent, default shadows, pure-black-on-pure-white, cramped padding, no hover states, no entry motion, ad-hoc spacing, mixed radius languages. "Looks bad" is not a diagnosis; `#0d6efd on 4px radius with 0 2px 4px rgb(0 0 0 / 0.1)` is.

Extract the current values across seven layers -- tokens, typography, spacing, color usage, components, atmosphere, motion -- as the "before" sheet. The gap between that sheet and the target is the whole work order, and it keeps the upgrade honest: every change traces to a named defect.

## 3. Prescription: tokens first

For every recorded defect, prescribe the replacement BEFORE editing, as a token system (this library's token discipline: `design/09-token-drift-and-retints.md`; palette construction: `design/01-color-oklch.md`). Tokens are the highest-leverage change -- every component referencing them upgrades at once. Prescription rules:

- Internal consistency: warm background with warm near-black text and warm borders -- never mixed temperatures.
- The accent is chosen from brand context, never another framework default (swapping Bootstrap blue for Tailwind indigo resets the clock, per `catalogue/01-ai-tells.md`).
- Display face for headings, body face for body (`design/02-typography.md` owns selection).
- Atmosphere additions stay subtle (grain under ~0.05, gradients under ~0.3 opacity).
- Component prescriptions keep the same DOM: class-value changes only.
- Motion additions are new CSS classes plus at most one new self-contained script (e.g. an IntersectionObserver reveal) -- zero existing JS modified. Curves come from the motion palette (`design/04-motion.md`), never keyword easings.

## 4. The override strategy

Ship the upgrade as ONE new stylesheet loaded LAST in the cascade (conventionally `gold.css`), containing the full prescription: tokens, typography, components, atmosphere, motion. Existing stylesheets are not deleted -- they are the safety net, and the new file overriding them means one removed import reverts the entire upgrade. Do not delete the old CSS until the owner confirms the override stable.

Framework variants of the same move:
- **Tailwind:** override the theme in the config (colors, fonts, radii, shadows) -- the design system changes at config level, not per component file.
- **CSS-in-JS:** a token layer on `:root` + a global-style override file; never edit existing styled-component definitions inline.
- **MUI/Chakra/Ant:** the theme provider IS the override surface; work within its theming system rather than fighting component internals.
- **Vanilla:** `gold.css` last in `<head>`; matching `!important` only where the existing sheet already forced it.

## 5. Surgical order and rules

Apply in layers, testing between each: tokens -> typography -> color -> spacing -> components -> atmosphere -> motion.

| Rule | Why |
|---|---|
| One layer at a time | Simultaneous layer changes make breakage un-attributable |
| Run the app after each layer | Routes load, forms submit, API data renders -- or the layer reverts |
| Search before renaming any class | `document.querySelector('.btn-primary')` makes that class name sacred |
| New files over modified files | Rollback stays trivial |
| High-risk files: class VALUES only | Read the whole file first; map which classes JS references; never touch state-driven inline styles |

Adding reveal animations non-destructively: `data-*` attributes on existing JSX (inert to React reconciliation) observed by the standalone script; stagger via a CSS custom property in the style prop. Handlers, refs, and children order untouched.

## 6. Post-op verification

Functionality first, and any failure blocks all visual assessment: every route, every form, every state toggle, every handler, auth flow, console clean, no undefined-property errors, all conditional renders (loading/error/empty) intact. Then the visual pass: no framework-default accent anywhere, no pure `#000`-on-`#FFF`, display face on headings with negative tracking and compressed leading, body text constrained to a readable measure, generous card padding, consistent radius language, hover + active + focus-visible on all interactive elements, background atmosphere present, motion tokens (not keyword easings), reduced-motion respected. Then the responsive pass at the standard widths (`review/03-viewport-matrix.md`). Last, the rollback check: removing the override import reverts cleanly; no existing CSS was deleted; no JSX structure changed -- the owner can accept or reject the upgrade as one unit.

Scope discipline: "make the hero look good" upgrades the hero, not the site. Respect the ask; upgrading more than asked adds risk with no mandate.

## 7. Quick defect-to-cure table

The recurring generic-default defects and their cures (framework-default examples; the catalogue owns tell status):

| Defect | Cure |
|---|---|
| Body face as display font | Real display face for headings (`design/02-typography.md`) |
| Pure `#000` on `#FFF` | Near-black on warm off-white, temperature-matched |
| Framework-default accent (`#0d6efd`, un-themed indigo) | Brand-derived accent via the token layer |
| Default shadow on everything, same depth | Elevation scale; shadow communicates interactivity |
| One radius everywhere by default | A radius language: token-stated, varied by control class |
| `transition: all .15s ease-in-out` | Named properties, palette curves (`design/04-motion.md`) |
| Cramped card padding, tight heading gaps | Spacing scale from `design/03-spacing-rhythm.md`; spacing is the highest-impact single change |
| Zebra-striped tables | Subtle hover row highlight |
| No hover/entry states | Lift + shadow on hover, press feedback, staggered entry -- reduced-motion gated |
| Flat dead background | Subtle warmth: radial tint or grain under 0.05 |

## See also

- `references/design/09-token-drift-and-retints.md` -- token-system integrity during the retint
- `references/design/01-color-oklch.md` -- constructing the replacement palette
- `references/design/04-motion.md` -- the motion palette the new states draw from
- `references/catalogue/01-ai-tells.md` -- what the upgrade must not land on (including the tasteful-default trap)
- `references/review/04-verdicts-and-verification.md` -- verdict discipline for the post-op report
