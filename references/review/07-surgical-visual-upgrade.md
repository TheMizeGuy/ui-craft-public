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

**Upgrade means replace, not delete.** Slop is upgraded aggressively, and
"aggressively" means the defect's device is replaced, never merely stripped.
Every device removed in a layer leaves a named successor in the same layer: the
card frame that goes becomes a heading plus spacing or a measured edge, the
uniform `shadow-sm` becomes a three-level elevation scale, the tinted icon oval
becomes icons at line height in one chosen family. Section 7's cure column is
mandatory, not illustrative -- an upgrade whose net effect is subtraction lands
on the flat default, which is a worse place than the generic default it started
from. The working list of replacement devices is
`references/aesthetic/06-substance-floor.md` section 6; when the replacement
cannot be named, the removal is not made and it goes to the owner as an open
question.

## 2. Audit before prescription

Read every file first. Per file, record: sacred elements, slop elements, and a risk level -- Low (mostly presentational; restyle aggressively), Medium (mixed; restyle carefully, test after), High (state/effects/API interwoven with presentation; touch only class values and styles, test every change). Then catalog the specific aesthetic defects with their current values -- generic font stack, framework-default accent, default shadows, pure-black-on-pure-white, cramped padding, no hover states, no entry motion, ad-hoc spacing, mixed radius languages. "Looks bad" is not a diagnosis; `#0d6efd on 4px radius with 0 2px 4px rgb(0 0 0 / 0.1)` is.

Extract the current values across seven layers -- tokens, typography, spacing, color usage, components, atmosphere, motion -- as the "before" sheet. The gap between that sheet and the target is the whole work order, and it keeps the upgrade honest: every change traces to a named defect.

## 3. Prescription: tokens first

For every recorded defect, prescribe the replacement BEFORE editing, as a token system (this library's token discipline: `design/09-token-drift-and-retints.md`; palette construction: `design/01-color-oklch.md`). Tokens are the highest-leverage change -- every component referencing them upgrades at once. Prescription rules:

- Internal consistency: warm background with warm near-black text and warm borders -- never mixed temperatures.
- The accent is chosen from brand context, never another framework default (swapping Bootstrap blue for Tailwind indigo resets the clock, per `catalogue/01-ai-tells.md`).
- Display face for headings, body face for body (`design/02-typography.md` owns selection).
- Atmosphere additions stay subtle and stay PRESENT -- floors as well as ceilings: grain between 0.02 and 0.05, gradients between 0.1 and 0.3 opacity. At zero the surface has no material of its own, and the prescription is not finished until the surface reads as a distinct material from the page it sits on: three surface levels with every adjacent boundary measured at 1.15:1 of tint or 1.3:1 of edge (`references/aesthetic/06-substance-floor.md` section 1, S3 and S4).
- Component prescriptions keep the same DOM: class-value changes only.
- Motion additions are new CSS classes plus at most one new self-contained script (e.g. an IntersectionObserver reveal) -- zero existing JS modified. Curves come from the motion palette (`design/04-motion.md`), never keyword easings.

## 4. The override strategy

Ship the upgrade as ONE new stylesheet loaded LAST in the cascade (conventionally `gold.css`), containing the full prescription: tokens, typography, components, atmosphere, motion. Existing stylesheets are not deleted -- they are the safety net, and the new file overriding them means one removed import reverts the entire upgrade. Do not delete the old CSS until the owner confirms the override stable.

Framework variants of the same move:
- **Tailwind v4:** override the theme tokens in the CSS entry: `@theme { --color-*: ...; --font-*: ...; --radius-*: ...; --shadow-*: ... }` (a v3 project, or a v4 project that still loads `@config`, overrides `theme.extend` in the config instead) -- the design system changes at token level, not per component file.
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

Functionality first, and any failure blocks all visual assessment: every route, every form, every state toggle, every handler, auth flow, console clean, no undefined-property errors, all conditional renders (loading/error/empty) intact. Then the visual pass: no framework-default accent anywhere, no pure `#000`-on-`#FFF`, display face on headings with negative tracking and compressed leading, body text constrained to a readable measure, generous card padding, consistent radius language, hover + active + focus-visible on all interactive elements, background atmosphere present, motion tokens (not keyword easings), reduced-motion respected. Then the substance pass (`references/aesthetic/06-substance-floor.md` section 1): the accent visible on the primary action and on the current or selected state, as a fill and not only as text; three surface levels with every adjacent boundary measured at 1.15:1 of tint or 1.3:1 of edge, in pixels and not in delta-L; a findable edge on every data panel at 100% zoom; one focal visual per screen; and real imagery wherever the product's subject is visual, at one image or figure per two sections and an icon or thumbnail on every entity row the domain has one for. Then the copy placement pass (`references/design/12-copy-placement-and-volume.md`): nothing above the primary content but the identity block, one lede inside that surface's budget and the primary action; no paragraph inside the hero; no orphan paragraph; no run of three text-only sections; and no prose whose position depends on a third-party slot rendering. Then the responsive pass at the standard widths (`review/03-viewport-matrix.md`), including viewport units per `responsive/01-fluid-and-intrinsic-sizing.md` §7 (not bare `vh`). Last, the rollback check: removing the override import reverts cleanly; no existing CSS was deleted; no JSX structure changed -- the owner can accept or reject the upgrade as one unit.

Scope discipline: "make the hero look good" upgrades the hero, not the site. Respect the ask; upgrading more than asked adds risk with no mandate.

## 7. Quick defect-to-cure table

The recurring generic-default defects and their cures (framework-default examples; the catalogue owns tell status):

| Defect | Cure |
|---|---|
| Body face as display font | Real display face for headings (`design/02-typography.md`) |
| Pure `#000` on `#FFF` | Near-black on warm off-white, temperature-matched |
| Framework-default accent (`#0d6efd`, un-themed Bootstrap blue) | Brand-derived accent via the token layer |
| Default shadow on everything, same depth | Elevation scale; shadow communicates interactivity |
| One radius everywhere by default | A radius language: token-stated, varied by control class |
| `transition: all .15s ease-in-out` | Named properties, palette curves (`design/04-motion.md`) |
| Cramped card padding, tight heading gaps | Spacing scale from `design/03-spacing-rhythm.md`; spacing is the highest-impact single change |
| Zebra-striped tables | Row rules (1px bottom border in the border token) plus a hover AND `:focus-visible` row highlight, so the boundary survives touch and keyboard. Striping earns its place only on dense reference tables read row-by-row |
| No hover/entry states | Lift + shadow on hover, press feedback, staggered entry -- reduced-motion gated |
| Flat dead background | Subtle warmth: radial tint or grain between 0.02 and 0.05 |
| Flat panel stack: no elevation, hairline-only boundaries | A three-level elevation scale with each adjacent boundary measured (1.15:1 of tint or 1.3:1 of edge); a top-edge rim in dark, a tuned drop in light (`references/aesthetic/06-substance-floor.md` section 5) |
| No accent on the primary action | The brand accent as a FILL on the primary action and on the current or selected state, at OKLCH chroma 0.10 or above at its rendered lightness |
| Icon-cards standing in for imagery | The real subject: screenshots, product shots, photography, commissioned illustration, the domain's own entity icons. One real image or figure per two sections |
| A hairline at 0.10 alpha or less as the only boundary on dark | Raise the alpha until the edge measures 1.3:1 against both surfaces, or replace it with a one-sided rim light plus a tint step that measures 1.15:1 |
| A prose blob above the tool | The product first: H1, identity block, one lede inside the surface's budget, one action. The explanation moves below the primary content into a headed section, or behind a `details` whose summary names what is inside |

## See also

- `references/design/09-token-drift-and-retints.md` -- token-system integrity during the retint
- `references/design/01-color-oklch.md` -- constructing the replacement palette
- `references/design/04-motion.md` -- the motion palette the new states draw from
- `references/catalogue/01-ai-tells.md` -- what the upgrade must not land on (including the tasteful-default trap)
- `references/aesthetic/06-substance-floor.md` -- the floor the upgraded surface must still clear, and the replacement device for every removal
- `references/design/12-copy-placement-and-volume.md` -- where the surviving copy is allowed to sit
- `references/review/04-verdicts-and-verification.md` -- verdict discipline for the post-op report
