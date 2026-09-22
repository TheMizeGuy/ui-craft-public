---
topic: aesthetic
role: reference
scope: taste-checklist
audience: ui-designer
---

# Taste Checklist: Pre-Ship Audit

The single dense checklist for pre-ship taste audit. Run it before any UI ships. Every item: question + how to verify + severity if failed. CRITICAL items block ship; HIGH items block launch; MEDIUM items are taste improvements; LOW items depend on context.

## How to Run This

| Step | Action |
|------|--------|
| 0 | Two evidence classes. Rows whose Verify column is a grep, a token read, or a code inspection are answerable from source. Rows that need a rendered page (resize, zoom, tab order, hover, throttled network, Lighthouse, OS reduce-motion, an end-to-end walk) are NOT ASSESSED in any code-only pass. Report them as `NOT ASSESSED (needs browser: <what>)`, never PASS. A section with any NOT ASSESSED row cannot be reported as a section PASS; report `PASS (code checks) / NOT ASSESSED (browser rows: <list>)`. Every Verify cell below opens with `[code]` or `[browser]` so the class is mechanical; a cell carrying both markers has a code half and a browser half, reported separately. Where a `[code]` cell says walk, inspect or trigger, read the component, its tokens and its strings. Steps 1 and 1b are the browser pass; when they are skipped, every `[browser]` row is NOT ASSESSED |
| 1 | Open the URL or local dev server in browser. Walk every page, every modal, every empty/error/loading state. Evaluate `scripts/measure_substance.js` in the page on the way through: every browser half of section 1b quotes its numbers (`accentRoles`, `accentArea`, `surfaceLevels`, `firstViewportVisual`, `imagesPerSection`, `textOnlySections`, `hueCount`, `weightCount`) |
| 1b | Walk it again at 320px, 390px, 768px, 1440px, 1920px and 2560px wide, plus one landscape phone (844x390) and one 400% browser zoom pass. Section 3b is unanswerable from a single desktop window, and the wide-display half of it (3b.10) is unanswerable below 1920 |
| 2 | For each section below, answer every question. Note severity of any failure |
| 3 | Tally: any CRITICAL = block ship. Any HIGH = block launch. Show user the CRITICAL/HIGH list before merging |
| 4 | The "Smell Tests" at the end are the final pass. If any of those fail, the design needs more iteration |
| 5 | Document fixed items in commit message; document deferred items in `design/known-debt.md` with severity |

## 1. Color Audit (8)

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| 1.1 | All colors expressed in OKLCH? | [code] `grep -r "#[0-9a-fA-F]\{3,8\}" src/` returns no hex in component tokens. `oklch(...)` everywhere | CRITICAL |
| 1.2 | Background not pure black (`#000`) or pure white (`#fff`)? | [code] Inspect root background tokens. Should be `oklch(0.13 ...)` warm-graphite or `oklch(0.985 ...)` warm-paper, never `0` or `1` lightness | HIGH |
| 1.3 | Accent color is NOT default Tailwind (`indigo-500`, `purple-500`, `teal-500`, `blue-500`)? | [code] Compute the accent's OKLCH hue and chroma. Hue 255-325 at chroma >= 0.15 is the AI purple family (catalogue C3) regardless of the name on the swatch; hue ~182 at chroma >= 0.1 is teal-500 (C4). Tailwind class names `indigo-*`, `violet-*`, `purple-*`, `fuchsia-*`, `blue-500`/`blue-600` and `teal-*` are hits by name | HIGH |
| 1.4 | Contrast clears BOTH the APCA size/weight ladder and the WCAG floor? | [code] Two sub-checks, each failing independently. (a) **APCA Lc**, computed with `apca-w3` or `apcach`, never eyeballed: `90+` small and regular-weight body text, `75+` larger or bold body text, `60+` headlines and large UI text, `45+` icons, borders and focus rings. Contrast requirements go UP as text gets smaller and thinner, never down. (b) **WCAG 2.x floor**, computed the same way: every text pair at least `4.5:1`, or at least `3:1` for large text (24px regular / 18.66px bold and above). A pair that passes APCA and fails WCAG still fails this row, because that is the bar most external audits use. Table source of truth: `references/design/01-color-oklch.md` §6. Copy the values from there, never paraphrase them, so the two tables cannot drift | CRITICAL (a11y) |
| 1.5 | Each surface has its own neutral tuned to its background lightness? | [code] Cards on dark bg should not have the same gray as cards on light bg. Surface-1, surface-2 each should be derived from base | MEDIUM |
| 1.6 | Dark mode uses `light-dark()` CSS function or `@media (prefers-color-scheme)`, not a class-toggle hack? | [code] Dark mode uses `light-dark()` under `color-scheme: light dark`, with `prefers-color-scheme` as the default and any manual override as a `[data-theme]`/class variant layered on top (design/01 §5, design/05 §8). Fail only when the toggle ignores the OS setting (catalogue §13, MEDIUM) or when colors are duplicated per theme instead of resolved by `light-dark()` | MEDIUM (catalogue §13) when the OS setting is ignored; LOW otherwise |
| 1.7 | No more than 2 accent colors on a screen, and no fewer than one doing real work? | [code] Walk the page. Count distinct accent uses (excluding semantic green/red/yellow). If >2, you have palette drift. The floor is the same row read from the other side: an accent that does not appear on the primary action AND on the current or selected state has failed substance check S1, and no accent at all on first paint is palette absence, not discipline | HIGH |
| 1.8 | Destructive color distinct from warning color? | [code] Destructive should be saturated red/blood (`oklch(0.62 0.22 25)`), warning should be amber/honey (`oklch(0.75 0.16 70)`) -- not both red-ish | MEDIUM |

## 1b. Substance Audit (7)

Every other section here fails a design for excess. This one fails a design for
having too little, which is the failure six consecutive review campaigns on one
data product had no row to catch. `references/aesthetic/06-substance-floor.md`
§ 1 is the source of truth for these seven checks and this section copies it,
thresholds and severities included; where the two ever disagree, that file wins.
A failure without a stated reason is a finding at the severity in the last column.

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| S1 | Accent presence: is the brand accent visible on first paint in at least two roles (primary action, current or selected nav item, focus ring, key figure, section marker, link colour), with at least one of them a fill rather than text? | [code] Read the token map and the first-viewport markup. [browser] `scripts/measure_substance.js` reports `accentRoles` and `accentArea` | HIGH on a product or marketing surface; MEDIUM on a document |
| S2 | Accent chroma floor: is the primary accent at OKLCH chroma `0.10` or more at its rendered lightness (`0.12`+ is the working range)? | [code] Read the accent token. The dark-scheme value may sit below the light one by at most `0.03` -- dark-surface craft dims a chip, it does not grey it. Below the floor is a muted brand, which carries `anti-slop-allow: muted brand <reason>` or it is a finding | HIGH |
| S3 | Surface ladder: does a product or data surface carry at least three surface levels (base, raised, overlay or hover) with every adjacent boundary perceivable -- a tint step of at least `1.15:1`, or an edge (border, rim, shadow) of at least `1.3:1` against the surface it sits on? | [code] Compute the tint steps from tokens. [browser] Rasterise each boundary and measure it in pixels, since computed style cannot see a shadow. OKLCH delta-L is not a measurement: the same `0.04` delta is `1.04:1` at `L 0.13` and `1.11:1` at `L 0.23` | HIGH when no boundary is perceivable at all; MEDIUM when one level is missing |
| S4 | Edges and containment: do panels, cards, grouped controls and data tables have a findable boundary at 100% zoom on the target display? | [code] Read the border and shadow tokens with their alpha: a hairline at `<= 0.10` alpha of white on a near-black ground computes to roughly `1.1:1` and is not an edge, it is the flat-terminal signature. [browser] Measure the edge against both surfaces it separates | HIGH on data surfaces; MEDIUM elsewhere |
| S5 | Focal visual per screen: does every screen carry one element that holds the eye and belongs to the subject (a photograph, a product shot, a commissioned illustration, a chart, a large figure with context, an entity list with its real icons, a typographic poster hero)? | [code] Inspect the first-viewport markup for `img`, non-icon `svg`, `figure`, `canvas`, `video` or a display-scale heading. [browser] `scripts/measure_substance.js` reports `firstViewportVisual`. A first viewport that is only text fails on any surface that is not an article template | HIGH on marketing and product; MEDIUM on settings and admin |
| S6 | Imagery and iconography: at least one real image or figure per two sections on marketing and content pages, and an icon, thumbnail, logo or avatar on every entity row whose domain has one? | [code] Count `img` / `picture` / `figure` per `section`, and icons per entity row. [browser] `scripts/measure_substance.js` reports `imagesPerSection` and `textOnlySections` | HIGH when a marketing or content page carries zero images; MEDIUM below the ratio |
| S7 | Hierarchy in more than one channel, and identity colour at full strength: is hierarchy carried by at least three of weight, size, colour, containment, space and iconography, and where the domain owns a colour vocabulary (item quality, class or faction, tier, brand line) do those colours render at their canonical saturation? | [code] Read the type scale (at least three distinct weights or optical sizes in use), the neutral ramp, and any identity palette. A system where every element sits under chroma `0.03` with no containment is monochrome by accident, and a desaturated identity colour is a defect rather than restraint. [browser] `scripts/measure_substance.js` reports `hueCount` and `weightCount` | HIGH when only one channel carries hierarchy; MEDIUM when identity colours are muted |

## 2. Typography Audit (10)

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| 2.1 | Primary font is a deliberate choice, not an unconsidered default (Inter/Roboto/Helvetica/Arial as fallback)? | [code] Check `font-family` token. House default (2026-07-17): SF Pro / the platform system stack used deliberately -- weight + optical size differentiate. Poppins approved for modern-elegant display areas. Other sans/serif with personality (Söhne, Author, Switzer, GT America) fine when the brand defines them. A mono face is never the primary; Inter only as utility fallback | CRITICAL |
| 2.2 | Variable font with multiple weight stops in use? | [code] Check `font-variation-settings` or `wght` axis. If only `400` and `700`, you're not using the variable axis | MEDIUM |
| 2.3 | Type scale is a modular ratio (1.2, 1.25, 1.333, 1.5)? | [code] Check tokens. 12 -> 14 -> 17 -> 20 (1.2) or 16 -> 20 -> 25 -> 31 (1.25). Random sizes (13, 18, 22) are a tell | HIGH |
| 2.4 | Display headlines have tuned `letter-spacing` (negative on large, positive on small caps)? | [code] Inspect headline CSS. `letter-spacing: 0` on a 64px headline is untuned. Should be `-0.02em` to `-0.04em` | HIGH (T8 per catalogue §18) |
| 2.5 | Body text uses optical sizing where the font supports it? | [code] Check `font-optical-sizing: auto;` on body or specific sizes for `opsz` axis | LOW |
| 2.6 | Tabular nums (`font-feature-settings: 'tnum'`) on tables and money? | [code] Inspect any table with numbers. Numerals should align by column | HIGH |
| 2.7 | `text-wrap: balance` on headlines? | [code] Inspect h1, h2 CSS. Should have `text-wrap: balance` to avoid orphan words | LOW |
| 2.8 | No all-caps tracking-wide subtitles unless intentional? | [code] Search for `text-transform: uppercase` or `tracking-widest`. If used, is it a deliberate small-caps design choice? Or default Tailwind reflex? | MEDIUM |
| 2.9 | No monospace face on human-readable text (headings, body, labels, kickers, stats, prices, timestamps)? | [code] Search `font-family` for mono faces outside genuine code/log/identifier surfaces. Digit alignment must come from `tabular-nums` on the sans, not a mono family. The mono+uppercase+tracked "terminal" kicker is a standing maintainer-rejected pattern (2026-07-17) | CRITICAL (T13 per catalogue §18) |
| 2.10 | Three weights or optical sizes in use, and a display face distinct from the sans? | [code] The checkable type rule (`references/design/02-typography.md` § 2): a `--font-display` distinct from `--font-sans`, an explicit heading weight and tracking, and at least three weights or optical sizes actually rendered on the surface. One system-stack family at 400 and 700 is the stack at its defaults, which is no type decision and fails substance check S7 | MEDIUM |

## 3. Layout Audit (8)

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| 3.1 | Layout deliberately broken from grid where intended? | [code] Walk the page. Is there asymmetry, content offset, intentional negative space? Or is everything centered in equal-width columns? | HIGH (marketing), MEDIUM (product) |
| 3.2 | Container queries (`@container`) used for components, not viewport queries? | [code] Search for `@container` usage. Components that change layout based on parent width should use `@container`, not `@media` | MEDIUM |
| 3.3 | Logical properties (`padding-inline`, `margin-block`) used for i18n? | [code] Search for `padding-left`, `margin-right`. If used in flow content, consider replacing with logical properties | HIGH (i18n) |
| 3.4 | Spacing on a modular scale (4-8-12-16-24-32-48), not magic numbers? | [code] Search for `padding: 17px`, `margin: 23px`. Magic numbers are a tell | MEDIUM |
| 3.5 | Asymmetric composition where appropriate? | [code] Marketing pages and editorial content should not be all centered. Hero left-aligned, content offset, intentional one-side weight | MEDIUM (marketing) |
| 3.6 | No bento grid unless it's the right answer? | [code] If using bento, verify the data has natural rectilinear chunks of varying importance. If it's just "we wanted a grid", it's wrong | MEDIUM (L3 bento-as-default per catalogue §18) |
| 3.7 | No 3-column equal-width feature grid on marketing? | [code] If you have 3 cards in a row with `grid-cols-3`, ask why. Equal columns flatten hierarchy | HIGH (marketing) |
| 3.8 | Section padding varies by content density? | [code] Editorial sections breathe (96px+); functional sections compress (32px). Mechanical `py-24` everywhere is a tell | MEDIUM |

## 3b. Responsive and Adaptive Audit (11)

Sections 1 to 3 can all pass on a design that is unusable on a phone, unreadable at 400% zoom,
and dead space on a 2560px display. This section is the part of the gate that fails those.
Every item is verifiable from the browser or from a grep, so there is no judgement call about
whether it passed. Depth on each technique: `references/responsive/01-fluid-and-intrinsic-sizing.md`,
`references/responsive/02-breakpoints-vs-container-queries.md`,
`references/responsive/03-zoom-orientation-and-adaptive.md`.

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| 3b.1 | Renders at 320px CSS width with no horizontal overflow of primary content? | [browser] Resize to 320px. `document.documentElement.scrollWidth <= document.documentElement.clientWidth` on every page and modal. A deliberate horizontally-scrolled data table is exempt only if it has a visible affordance and its controls stay reachable | CRITICAL |
| 3b.2 | Reflows at 400% zoom without loss of content or function (WCAG 2.2 1.4.10)? | [browser] 1280px viewport at 400% zoom equals 320 CSS px. Nothing may require scrolling in two directions, nothing may be clipped, and every control that exists at 100% must still be reachable | CRITICAL (a11y) |
| 3b.3 | Interactive targets meet the platform minimum? | [browser] Measure the smallest tap target. Web: 24x24 CSS px is the WCAG 2.2 2.5.8 floor and 44x44 is the touch recommendation. iOS: 44x44pt. Android: 48x48dp. Spacing counts toward the floor only where 2.5.8's exception applies | HIGH (a11y) |
| 3b.4 | Type scale is fluid, not a fixed step ladder? | [code] Every display and heading step is `clamp(min, rem-intercept + vw-slope, max)` with the viewport pair recorded, or carries a written reason for being fixed. Per-breakpoint `md:text-5xl` overrides are the stepped anti-pattern. `grep -rn "clamp(" src/` must hit the type scale | HIGH for the verbatim Strongest-10 #9 triplet, MEDIUM otherwise (T14 per catalogue §18) |
| 3b.5 | No fixed px widths on layout containers? | [code] `grep -rEn "width:\s*[0-9]+px\|w-\[[0-9]+px\]" src/`. Layout containers use `minmax(min(100%, 20rem), 1fr)`, `fit-content`, `min()`/`max()`, or a capped measure (`max-inline-size: 68ch`). Fixed px is correct only for icon boxes, hairlines, and control heights | HIGH |
| 3b.6 | No component styled by viewport when it lives in a variable container? | [code] Any component that can appear in a sidebar, a modal, and a full-width section queries `@container` with `cqi` thresholds. Global `sm:/md:/lg:` on a portable card couples it to the page instead of its slot | MEDIUM |
| 3b.7 | Tables, nav, and sidebars have a defined narrow-viewport restructure? | [code] At 360px each one must have a real answer (stacked cards, a disclosure, a drawer), not `overflow-x: auto` standing in for a design decision | HIGH |
| 3b.8 | Full-height surfaces use `svh`/`dvh` and edge-anchored bars use `env(safe-area-inset-*)`? | [code] `grep -rn "100vh" src/` returns zero. [browser] Check the bottom bar on a notched phone in both orientations | MEDIUM |
| 3b.9 | Landscape phone and open keyboard survive the vertical budget? | [browser] At 844x390, fixed chrome (header plus bottom bar plus safe areas) must leave usable content height; with the keyboard open the budget drops to roughly 180 to 200px. Modals and sheets scroll internally rather than pushing the primary action off-screen | HIGH |
| 3b.10 | Content adapts above 1600px instead of dead-spacing? | [browser] At 1920px and 2560px, measure content width as a percentage of viewport. Under 60% with no second column, sidebar, or reading-measure reason is a failure. Centring is not the fix: two 500px gutters waste what one 1000px gutter did. On a control, content, reference or dashboard surface the shell spends the width (75% or more used, through extra columns, a supporting pane or a wider table; `references/usability/05-app-shells-and-content-layout.md` § 3b) and the reading measure sits on the prose block, never on the shell | HIGH under 60% with no reason (`references/review/05-density-and-economy.md`); MEDIUM at 60-75% |
| 3b.11 | Orientation is not locked, and orientation-sensitive layout keys off aspect ratio? | [code] No `screen.orientation.lock()` and no manifest orientation lock unless essential (WCAG 1.3.4). Layout that must differ by orientation uses `@media (orientation: landscape)` or an aspect-ratio query, never a width breakpoint: a 568px width cannot tell a landscape phone from a small tablet | MEDIUM |

## 4. Component Audit (11)

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| 4.1 | All shadcn defaults overridden (theme tokens, radius, font, icons, border colors)? | [code] Compare against shadcn unmodified. If `Card`, `Button`, `Input`, `Dialog` look like the shadcn demo, ship is blocked | CRITICAL |
| 4.2 | Lucide icons NOT the only icon set? | [code] Check icon imports. If `lucide-react` is the only source, either replace the whole set with one deliberately chosen family (Phosphor / Tabler / Carbon / custom) or keep Lucide with a stated reason (`anti-slop-allow: <reason>`); never mix families at one hierarchy level (aesthetic/04 §5, catalogue §14) | CRITICAL (S4 per catalogue §18) |
| 4.3 | Every Button has product-specific copy (not "Button", "Submit", "Click")? | [code] Walk every button. Real verbs: "Save changes", "Send invite", "Start trial". "Submit" is a CRITICAL fail | CRITICAL |
| 4.4 | Form fields have visible labels (not placeholder-as-label)? | [code] Inspect every form. Label above input, placeholder for example/format. A floating label that remains a persistent `<label>` clears the accessibility half of this row but is still catalogue S6 (Material-holdover tell) and needs `anti-slop-allow` if kept | HIGH (a11y) |
| 4.5 | Keyboard focus shows a custom `:focus-visible` ring (2px+, brand-tuned, 2px offset)? | [browser] Tab through the page | CRITICAL (a11y, U3 per catalogue §18) |
| 4.5b | Pointer focus does not paint the keyboard ring? | [browser] Click a button | MEDIUM (U4, taste) |
| 4.6 | Hover states are functional (not decoration)? | [browser] Hover every card/button. Hover should communicate affordance change, not be decorative scale-up | MEDIUM |
| 4.7 | Loading state has context label (not just spinner)? | [browser] Trigger every loading state. "Loading invoices..." not just a spinning circle | CRITICAL (U8 per catalogue §18) |
| 4.8 | Empty states are designed (not "No data" or blank page)? | [code] Trigger every empty state. Should have illustration or specific copy + action ("No invoices yet. Send your first one") | HIGH (missing empty/error states, catalogue §12 and §18) |
| 4.9 | Error states have actionable next steps? | [code] Trigger every error. Should explain what failed AND what the user can do. "Network error" is a fail; "Couldn't load. [Retry]" is a pass | HIGH |
| 4.10 | No skeleton loaders on content that loads in <300ms? | [browser] Throttle network and time the loads. If skeleton flashes for <300ms, drop it -- adds perceived latency | LOW (S10 per catalogue §18) |

## 5. Motion Audit (5)

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| 5.1 | All decorative motion respects `prefers-reduced-motion: reduce`? | [browser] Set OS to reduce motion. Walk the page. All decorative animations should disable cleanly | CRITICAL (a11y) |
| 5.2 | Only `transform`, `opacity`, `filter` animated in hot paths (scroll, drag, hover)? | [browser] DevTools Performance tab while scrolling and dragging. Layout-triggering animations (`width`, `height`, `top`, `left`) cause jank | HIGH (perf) |
| 5.3 | Spring physics used on tactile micro-interactions (toggles, drag, snap)? | [code] Toggle a switch. Drag a card. Should feel physical where the POV's motion tier calls for it (aesthetic/04 §6); a Tactical Operator toggle is instant by design | MEDIUM |
| 5.4 | No bounce on serious confirms (delete, payment, sign-out)? | [code] Trigger destructive confirms. Motion should be subtle/serious, not bouncy | MEDIUM |
| 5.5 | Page transitions <400ms (and use View Transitions API where supported)? | [code] Time page transitions. Over 400ms feels broken | LOW (M3 per catalogue §18) |

## 6. Copy Audit (9)

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| 6.1 | No lorem ipsum, "Welcome back!", "Get started today!", "Your future, today"? | [code] `grep -ri "lorem ipsum\|welcome back\|get started today\|the future of" src/` -- any hit blocks ship | CRITICAL |
| 6.2 | No SaaS-speak ("seamless", "leverage", "supercharge", "unlock the power", "streamline")? | [code] `grep -ri "seamless\|leverage\|supercharge\|unlock the power\|unlock the potential\|streamline\|cutting-edge" src/`. Read each hit in context: marketing filler in product chrome is HIGH (W5); an exact product verb ("Unlock account") is not a hit | HIGH |
| 6.3 | Dates have explicit format (not ambiguous `1/2/26`)? | [code] Inspect every date display. Should be `Jan 2, 2026`, `2026-01-02`, or relative (`2 days ago`) | MEDIUM |
| 6.4 | Plurals handled correctly (not "1 items" or "0 item")? | [code] Trigger 0, 1, 2, many counts. Use `Intl.PluralRules` | HIGH |
| 6.5 | Empty states have voice (not "Nothing here" or "No data")? | [code] Walk every empty state. Should have personality matching POV: tactical/editorial/workshop tone | MEDIUM |
| 6.6 | No running prose above the primary content beyond the lede budget? | [code] Identify the primary content element (the first `table`, `form`, entity list, chart root or non-nav control inside `main`) and sum the words of running prose before it: 25 on product and marketing surfaces, 40 on content and reference pages (`references/design/12-copy-placement-and-volume.md` § 3). Any paragraph inside the hero fails regardless of the count | HIGH (W11 per catalogue §18) |
| 6.7 | Does every paragraph sit in a headed section at a 45-75ch measure, with no orphans? | [code] Walk each `p` of running prose up to its nearest `section`, `article` or `aside`: that ancestor carries a heading or an `aria-labelledby`, the paragraph's siblings are prose rather than a card grid, table, form or chart, and the measure is capped on the prose block rather than on the page shell | MEDIUM (W12 per catalogue §18) |
| 6.8 | No text-only run of three sections, and no text-only first viewport off an article template? | [code] Count each `section`'s non-text children (`img`, `picture`, `svg`, `video`, `canvas`, `table`, `form`, `ul`, `ol`, `dl`, `button`, `figure`) and flag a run of three with none. [browser] Confirm the first viewport carries the focal visual. Never fixed by adding prose: the rule is a non-text child, not a word count | MEDIUM (L14 per catalogue §18) |
| 6.9 | No word-count floor in the tests or lints? | [code] Grep the copy assertions for a minimum word, heading or paragraph count (`toBeGreaterThan` on a word count, an H2 minimum, a description-length floor). A floor is a padding generator: every attempt to cut copy turns the gate red. The guard is a ceiling, never a floor (`references/design/12-copy-placement-and-volume.md` § 3) | MEDIUM |

## 7. Accessibility Audit (5 critical baseline)

This is the floor. The full a11y reference lives elsewhere; these are the must-pass items for taste sign-off.

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| 7.1 | Tab through entire page reaches every interactive element in logical order? | [browser] Keyboard-only walkthrough. No traps, no skipped elements, no stranded focus | CRITICAL (a11y) |
| 7.2 | Every interactive non-text element has accessible name? | [code] Inspect icon buttons, links. Should have `aria-label` or visually-hidden text | CRITICAL (a11y) |
| 7.3 | Modal traps focus and returns it on close? | [browser] Open modal, tab through, close. Focus should return to the trigger element | CRITICAL (a11y) |
| 7.4 | Dynamic content announced via `aria-live` (toasts, errors, status)? | [browser] Trigger a toast. Screen reader should announce it | HIGH (a11y) |
| 7.5 | Color is not the only signal of meaning? | [code] Walk error/success/warning states. They should differ in icon, copy, or texture too | CRITICAL (a11y) |

## 8. Performance Audit (5 must-pass)

The full perf reference lives elsewhere; these are the visible-before-ship items.

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| 8.1 | LCP image has explicit `width`/`height` and `fetchpriority="high"`? | [code] Inspect hero / above-fold image. Lighthouse will flag missing dimensions | HIGH (perf) |
| 8.2 | No layout shift (CLS) on font-load, image-load, lazy components? | [browser] Lighthouse run. CLS should be <0.1. Use `font-display: swap` with `size-adjust` matching | HIGH (perf) |
| 8.3 | Images are WebP/AVIF, not PNG/JPG, where applicable? | [browser] Network tab. PNG/JPG fallback only for transparency/photos | MEDIUM (perf) |
| 8.4 | `<Image>` (Next.js) or `loading="lazy"` on below-fold images? | [code] Inspect img tags below fold. Should lazy-load | MEDIUM (perf) |
| 8.5 | Critical fonts preloaded with `<link rel="preload" as="font" crossorigin>`? | [code] Inspect `<head>`. Custom fonts should be preloaded to avoid FOUT | LOW |

## 8b. Flow Audit (9)

Sections 1 to 8 audit screens. This one audits whether a person can finish what they came to
do. A design can pass every other item here and still strand the user, because nothing above
asks about task completion, recovery, or acknowledgement. Answer these against the flow, not
against a screenshot: walk the primary task end to end, then break it on purpose. Method behind
these items: `references/usability/01-task-flows-and-journeys.md`,
`references/usability/02-forms-and-error-recovery.md`,
`references/usability/03-navigation-and-information-architecture.md`.

| # | Question | Verify | Severity if failed |
|---|----------|--------|--------------------|
| 8b.1 | Can the primary task be completed end to end with no external instructions? | [browser] Do it, as a first-time user, without reading docs and without asking the designer. Note every point where you had to guess | CRITICAL |
| 8b.2 | Does every step preserve typed input across validation failure and back-navigation? | [browser] Fill a form, force a server error, press back, return. Anything the user typed and did not choose to discard must still be there | CRITICAL |
| 8b.3 | Does every state have an exit? | [browser] From every modal, error, empty state, permission wall, and success screen: is there a visible way forward and a way back? A screen whose only exit is the browser back button is a dead end | CRITICAL |
| 8b.4 | Is every destructive action either proportionally confirmed or undoable? | [browser] Delete, archive, cancel, sign out, overwrite. Cheap and reversible actions get undo, not a dialog; expensive and irreversible ones get a confirmation that names what is lost. A dialog on every action trains people to dismiss it | CRITICAL |
| 8b.5 | Is the user's current location always visible? | [browser] On every screen, can you tell where you are in the product and in the flow (step 2 of 4, which project, which account)? Deep-link into the middle of the flow and check again | HIGH |
| 8b.6 | Does a first-run user know their next action from the empty state? | [browser] Trigger every empty state with a fresh account. Each one names the next action and offers the control that performs it | HIGH |
| 8b.7 | Is every async action acknowledged inside 100ms, with the right indicator for its latency tier? | [browser] Throttle the network and time each action. `<100ms`: no indicator, the result is the feedback. `100ms to 1s`: immediate acknowledgement (pressed state, disabled control, optimistic update). `1 to 10s`: determinate progress or loading copy naming what is loading. `>10s`: progress plus an estimate plus cancel, and a path to leave the screen without losing the work. A button that looks unchanged for 900ms reads as broken | HIGH |
| 8b.8 | Do optimistic updates roll back visibly and safely? | [browser] Force a failure behind an optimistic update. The UI must revert the exact item, say what failed, and offer retry without the user re-entering anything | HIGH |
| 8b.9 | Are errors recoverable in place? | [browser] Every error offers the next action on the same surface (retry, fix the field, choose another option). Sending the user back to the start to redo work is a failure, not a recovery path | HIGH |

## 9. The Smell Tests (Final Pass)

If any of these fail, the design needs more iteration before ship. These are the gestalt-level questions that catch when the parts are right but the whole still reads as AI.

| # | Smell test | Failure means |
|---|------------|---------------|
| 9.1 | Could a Vercel template have shipped this? | Ship has converged to template. Restart with stronger POV |
| 9.2 | Does this look like every other AI-generated SaaS landing? | The strongest 10 fingerprints (catalogue file 01) are all present. Audit each; replace every one that was not a deliberate, documented choice (9.7) |
| 9.3 | Is there a single component that someone would screenshot and share? | Design lacks a hero -- one component must be visually exceptional, the rest can be quiet |
| 9.4 | If you removed the logo, would users know which product this is? | POV is too weak. Revisit file 01 worksheet, deepen brand-specific decisions |
| 9.5 | Does the design have a clear point-of-view that one paragraph could describe? | If you can't write that paragraph, the team cannot build coherently. Stop, define POV |
| 9.6 | Would a designer at the reference product (Linear, Stripe, etc.) approve this without changes? | If no, identify the specific component that fails the bar and rebuild it |
| 9.7 | Is there a single visible AI tell from the strongest-10 list (catalogue file 01) that we did not deliberately choose to keep? | If yes, fix or document the deliberate exception |
| 9.8 | Have all empty / error / loading states been designed, or just the populated view? | "Happy path only" is the AI default. Production needs all four states for every screen |
| 9.9 | The mirror pass, both directions: one accessory you can remove without losing meaning, AND one device you can add or strengthen so it carries more of the design's job? | Name both and do both in the same pass. A pass that only removes is not a mirror pass, it is the subtraction reflex 9.10 catches one step later. If nothing is removable, verify that is discipline and not emptiness -- the quality floor (responsive to mobile, visible keyboard focus, reduced motion respected, and the substance floor of `references/aesthetic/06-substance-floor.md` § 1) must hold without being announced |
| 9.10 | Subtraction-only: can the whole system be described as a list of things it does not do (one hairline, no frames, no badges, no elevation, colour only for status)? | FAIL. That list is the 2026 AI default, not a point of view (owner directive 2026-09-16). Name what the design adds and what each removed device was replaced with; a removal with no replacement goes back to the owner as an open question |
| 9.11 | The stranger's word test (runs on a render, never on source): show the rendered page to someone with no context, or look at it yourself after a minute away, and write down the first word | "Grey", "flat", "empty", "plain", "unfinished", "template", "wireframe" or "terminal" fails the design whatever the audit tables said. "Busy", "loud", "gaudy" or "decorated" sends it to the mirror pass. The mechanical proxy when nobody is available: `hueCount >= 2`, `surfaceLevels >= 3`, `firstViewportVisual = true`, `weightCount >= 3` on the first viewport; three of four failing predicts the word will be grey (`references/aesthetic/06-substance-floor.md` § 3) |
| 9.12 | Is there a paragraph above the product? | The page leads with prose instead of the thing the person came for. One lede stays (25 words on product and marketing surfaces, 40 on content and reference pages); explanation, methodology and search copy move below the primary content, behind a `details` whose summary names its content, or onto their own route (`references/design/12-copy-placement-and-volume.md` § 2) |

## 10. Sign-Off Template

Use at the end of the audit. Save in `design/audit-YYYY-MM-DD.md`.

```markdown
# Pre-ship Taste Audit — [Project] — [Date]

## Critical (block ship)
- [ ] [item] — [status: fixed | deferred with reason]

## High (block launch)
- [ ] [item] — [status]

## Medium (taste improvements)
- [ ] [item]

## Low (context-dependent, accepted)
- [item] — accepted because [reason]

## Section gates
- 1b Substance floor: [pass | fail | not assessed: <rows>]. S1-S7 measured against: [the rendered page | tokens only]
- 3b Responsive and adaptive: [pass | fail | not assessed: <rows>]. Narrowest viewport walked: [320px | ... | none, code-only pass]. 400% zoom reflow: [pass | fail | not assessed]
- 8b Flow: [pass | fail | not assessed]. Primary task completed end to end without instructions: [yes | no | not walked]

## Smell tests
- 9.1 Vercel template? [pass | fail]
- 9.2 Generic SaaS? [pass | fail]
- 9.3 Screenshot-shareable? [pass | fail]
- 9.4 Logo-swap test? [pass | fail]
- 9.5 POV paragraph? [pass | fail]
- 9.6 Reference designer would approve? [pass | fail]
- 9.7 Strongest-10 fingerprints? [count present, deliberately kept: ...]
- 9.8 All four states designed? [pass | fail]
- 9.9 Mirror pass (one accessory removed AND one device added or strengthened)? [pass | fail]
- 9.10 Subtraction-only system? [pass | fail]
- 9.11 Stranger's word test? [the first word: ... | not assessed, no browser pass]
- 9.12 Paragraph above the product? [pass | fail]

## Sign-off
Designer: [name]
Date: [date]
Verdict: [SHIP | NEEDS WORK | NOT ASSESSABLE FROM CODE -- browser pass required before SHIP]
```

## Cross-References

| Need | File |
|------|------|
| The catalog of AI tells (referenced by every audit item) | `references/catalogue/01-ai-tells.md` |
| The APCA and WCAG contrast tables item 1.4 mirrors (source of truth) | `references/design/01-color-oklch.md` §6 |
| Fluid type and intrinsic sizing technique behind 3b.4 and 3b.5 | `references/responsive/01-fluid-and-intrinsic-sizing.md` |
| The container-query decision rule behind 3b.6 | `references/responsive/02-breakpoints-vs-container-queries.md` |
| Zoom, reflow, orientation and adaptive postures behind 3b.2, 3b.9 and 3b.11 | `references/responsive/03-zoom-orientation-and-adaptive.md` |
| Task flows, recovery and wayfinding behind section 8b | `references/usability/01-task-flows-and-journeys.md`, `02-forms-and-error-recovery.md`, `03-navigation-and-information-architecture.md` |
| How to set the POV that the audit is checking against | `references/aesthetic/01-point-of-view.md` |
| Distinctive systems to compare against (smell test 9.6) | `references/aesthetic/02-distinctive-systems.md` |
| Code-level review checklist + component-fingerprint catalog | `references/catalogue/01-ai-tells.md` (component fingerprints) and `references/catalogue/02-empirical-evidence.md` (cited-vs-cleared data) |
