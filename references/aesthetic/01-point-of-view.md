---
topic: aesthetic
role: reference
scope: point-of-view
audience: ui-designer
---

# Point of View: The Coherent Set of Decisions That Makes a Product Recognizable

The fix for AI tells is not "better CSS on the same structure" -- it's a coherent set of decisions about color, type, motion, layout, copy, density, and decoration that distinguishes this product from every other product. That coherent set is the point of view (POV). Without one, you ship a hashtag-purple SaaS template with someone's logo on it. With one, the design is inseparable from the brand and content.

## 1. What Design Point of View Means

POV is not a moodboard. It is not a color palette. It is not a font pairing. It is the set of decisions, made deliberately and applied consistently, that someone could describe in one paragraph and predict the rest of the product from. Examples:

| Product | POV (one paragraph) |
|---------|---------------------|
| **Linear** | Keyboard-first dispatch console for engineering work. Dark warm-graphite background, tight density, monospace numerals, custom Inter Display, single restrained brand purple in marketing and almost none in product. Motion is precise and short. Every interaction has a keyboard shortcut. The chrome gets out of the way of the work |
| **Stripe** | Technical-warm financial infrastructure. Restrained palette (Stripe purple as accent, never gradient), generous whitespace, tabular numerals everywhere money appears, mixed sans (Camphor) and serif on press, motion as functional confirmation (never decoration), distinctive checkout that signals trust |
| **Things 3** | Calm, sentence-case task manager. Avenir Next, soft pastels (one perfect Things-yellow), generous spacing, animation as feedback, sentence case throughout (no Title Case), no decorative chrome. The serenity is the brand |
| **Notion** | Document-as-canvas. Calm gray-on-paper, slash-command first, restrained color (one accent per workspace), functional templates, sidebar that breathes. Color and chrome are subordinated to the user's content |
| **Arc Browser** | Playful chrome that earns its presence. Söhne everywhere, command-bar-first navigation, custom color-mix accents, Spaces concept replaces tabs, peek/Boost states feel toy-like in a serious tool. The chrome is the product |

Every one of those POVs determines hundreds of downstream decisions: button radii, dialog dimensions, error tone, empty-state copy, loading patterns, dark-mode hue shifts. The POV does not micromanage these decisions; it lets you derive them.

The POV test: if you removed the logo, would users know which product this is? If no, the POV is too weak.

## 2. How to Find the POV for a Project

POV is found in conversation with the user before any pixels are pushed. The questions below produce a brief that constrains design without dictating decisions.

| # | Question | Why it matters | Example answer |
|---|----------|----------------|----------------|
| 1 | What 3 adjectives describe the product? | Forces concreteness. "Modern" and "clean" are not adjectives, they are filler | "Tactical, restrained, dense" or "Editorial, warm, generous" |
| 2 | Which existing products inspire? Be specific about which aspect | Anchors aesthetic gravity | "Linear's keyboard model + Stripe's typographic warmth" not "modern SaaS" |
| 3 | What to AVOID? Concrete | Calls out the no-go zone | "No purple gradients, no glass cards, no centered hero, no Lucide icons" |
| 4 | Density target: information-dense vs spacious? | Drives typography scale, padding, line-height | "Dense like Linear" or "spacious like Apple's product pages" |
| 5 | Tone of voice: instructional, peer, expert, friendly, terse? | Drives microcopy, error messages, empty states | "Terse-expert, like Stripe API docs" |
| 6 | Brand temperature: warm or cool? | Drives neutral palette tuning, accent hue | "Warm with one cool accent for status" |
| 7 | Marketing vs product: same POV or split? | Drives whether to design two systems | "Marketing is editorial; product is tactical. Split" |
| 8 | Motion philosophy: invisible-functional, expressive, none? | Drives transition tokens, easing, durations | "Invisible-functional except onboarding" |
| 9 | Decoration tolerance: zero / functional-only / expressive? | Drives texture, illustration, gradient, blob policy | "Zero decoration. Information density is the visual" |
| 10 | What should be screenshot-shareable? | Identifies the one component that needs to be the strongest | "The dispatch board itself" or "The pricing comparison" |

The answers form the POV brief. Every component decision later is checked against the brief. If a button needs a gradient and the brief says "zero decoration", the button doesn't get a gradient -- the brief gets revisited.

### Anti-questions (banned)

| Banned question | Why |
|-----------------|-----|
| "What's your favorite color?" | Color flows from POV, not preference |
| "Should we use shadcn?" | Implementation choice, not POV |
| "Light or dark mode?" | Both, designed independently |
| "Should it look modern?" | "Modern" is the AI default. Useless |
| "What competitor should we copy?" | Aesthetic theft is not POV. Steal principles, not pixels |

### Calibration: the current AI-default looks

AI-generated design currently clusters around three looks: (1) a warm cream background (near `#F4F1EA`) with a high-contrast serif display and a terracotta or sage accent (the "tasteful default," dissected in `references/catalogue/01-ai-tells.md`); (2) a near-black background with a single bright acid-green or vermilion accent; (3) a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper columns. All three are legitimate for some briefs, but they are defaults rather than choices and appear regardless of subject. Where the brief pins down a direction, the brief's own words always win, including when it asks for one of these looks; where an axis is left free, do not spend that freedom on a default.

The plan-stage self-test: before building, work through a *similar* brief in your head. If the plan you drafted for this brief would come out roughly the same for that one, the plan is a default wearing this project's name; revise the generic part and say what changed and why. The subject's own world (its materials, instruments, artifacts, vernacular) is where distinctive choices come from, so if the brief does not pin down the subject, pin it yourself: name the concrete subject, its audience, and the page's single job before designing.

## 3. Three POV Templates to Start From

These are starting points -- never ship a template-rendered POV. Use them as gravity wells; deviate intentionally. Each carries a complete token set, **both schemes**, so the downstream coherence is automatic.

**Both schemes, authored independently.** Every template below gives a light value and a dark value per token. That is not decoration: a template that covers one scheme means the second scheme gets improvised late, which is how the mirrored dark mode `references/design/01-color-oklch.md` warns about gets shipped. The counterpart column is *derived by the rules in that file's Dark-mode surface craft section* (dim the borders, elevation as a lightness delta rather than shadow, desaturate bright chips and flip their text relationship, pick the dark ramp from the brand hue), not by inverting L. Wire the two columns once, at the root:

```css
:root {
  color-scheme: light dark;
  --bg-base:   light-dark(oklch(0.965 0.004 270), oklch(0.13 0.005 270));
  --text-1:    light-dark(oklch(0.22  0.010 270), oklch(0.95 0.005  90));
  /* ...one line per token, light value first... */
}
/* Manual override, read by the pre-hydration script */
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"]  { color-scheme: dark; }
```

Templates B and C use the same wiring; only the values differ.

**Contrast is stated, not asserted.** Every text token below carries its computed WCAG 2.x ratio against that scheme's base surface, so the claim is checkable rather than trusted. Text tiers clear 4.5:1. Tokens that do not clear it are labelled non-text and must not carry body copy, helper text, timestamps, metadata, or disabled labels.

**Typeface discipline (applies to every template, maintainer directive 2026-07-17):** monospace faces are reserved for genuine code, logs, raw payloads, and literal identifiers -- never for headings, body, labels, kickers, or numerals on product or marketing surfaces. Digit alignment comes from tabular figures (`font-variant-numeric: tabular-nums` / `'tnum'`) on the sans, not from a mono family. Hierarchy comes from weight and color, not typeface switching. The "terminal look" (mono + uppercase + tracking on UI chrome) is itself a house cliché now, not a de-AI-ing move.

**House font defaults (same directive):** SF Pro / the platform system stack is the main go-to voice for UI and information-dense surfaces; **Poppins** is the approved display face for modern-elegant areas (marketing/hero moments). Template font rows below are options for when a project defines its own brand voice -- absent that, reach for the house defaults first.

### Template A: Tactical Operator

POV: Linear / Things / Arc / Things-Mac. Dense, keyboard-first, restrained accent, no decoration. The chrome serves the work. The user is an operator, not an audience.

Dark is this template's primary scheme; the light column is its authored counterpart, not an inversion.

| Token | Dark (primary) | Light (counterpart) |
|-------|----------------|---------------------|
| Background base | `oklch(0.13 0.005 270)` warm-graphite (not pure black) | `oklch(0.965 0.004 270)` cool paper |
| Surface 1 | `oklch(0.16 0.006 270)` | `oklch(0.99 0.003 270)` |
| Surface 2 (elevated) | `oklch(0.19 0.007 270)` -- elevation is a lightness delta | `oklch(0.995 0.002 270)` + a tuned shadow; on light, elevation still needs the shadow |
| Border | `oklch(0.25 0.008 270)` hairline 1px | `oklch(0.88 0.006 270)` hairline 1px |
| Text primary | `oklch(0.95 0.005 90)` warm-paper -- 17.4:1 | `oklch(0.22 0.010 270)` -- 15.7:1 |
| Text secondary | `oklch(0.65 0.01 90)` -- 6.2:1 | `oklch(0.45 0.012 270)` -- 6.7:1 |
| Text tertiary | `oklch(0.58 0.01 90)` -- 4.7:1 | `oklch(0.51 0.012 270)` -- 5.2:1 |
| Accent | `oklch(0.7 0.18 60)` amber-signal -- 7.2:1; single accent, used sparingly for active state and primary action | `oklch(0.52 0.15 60)` -- 5.2:1; darkened and slightly desaturated so it does not glare on paper |
| Status alert | `oklch(0.62 0.22 25)` blood-red -- 5.0:1; destructive confirms and outage only | `oklch(0.52 0.20 25)` -- 5.5:1 |
| Status ok | `oklch(0.7 0.13 145)` muted forest -- 7.9:1; desaturated to not compete | `oklch(0.50 0.12 145)` -- 5.1:1 |
| Display font | Söhne Variable / a condensed grotesque -- weight (600-650) + tight negative tracking as the brand statement, never a mono face | same |
| Body font | Söhne Variable, or DM Sans / Plus Jakarta Sans where a commercial licence is not available (450-550 range, never 400/700). **Never a display cut** -- display faces carry tighter default spacing and higher stroke contrast, which degrades at the 13-14px body sizes this template specifies | same |
| Numeric font | Same as body with `font-feature-settings: 'tnum'` | same |
| Modular scale | 1.2 (12 -> 14 -> 17 -> 20 -> 24 -> 29 -> 35) |
| Spacing scale | 4-8-12-16-24-32-48-72 (8px grid with 4 for tight inline) |
| Radius | `0` (sharp) or `2px` (precise). Never `rounded-md` |
| Motion | 100-180ms, ease-out (instantaneous feel). No bounce. Spring only on drag |
| Density | Tight: 32px row height in tables, 12-14px gap between sections |
| Decoration | None. No gradients, no blobs, no decorative icons. Hairline borders and color-as-status only |

Component recompositions:
- **Button**: borderless filled, sharp corners, `font-feature-settings: 'tnum'`, no shadow, hover = brightness shift only
- **Card**: borderless with hairline divider on top, no rounded corners, no shadow
- **Input**: bottom-border only (1px), focus expands to 2px accent. No default border-input
- **Modal**: full-bleed slide-from-right or centered with hairline border, no rounded corners, no decorative overlay tint

### Template B: Editorial Magazine

POV: Stripe Press / Vercel marketing / Apple product pages / Robin Sloan personal site. Generous whitespace, mixed serif/sans, restrained color, large type, asymmetric composition. The reader is the audience; the page is a publication.

Light is this template's primary scheme; the dark column is its authored counterpart.

| Token | Light (primary) | Dark (counterpart) |
|-------|-----------------|--------------------|
| Background base | `oklch(0.985 0.005 90)` warm-paper | `oklch(0.16 0.004 90)` warm ink, not black |
| Surface 1 (no elevation needed in editorial) | same as base | same as base |
| Border | `oklch(0.85 0.005 90)` hairline only at column edges | `oklch(0.28 0.005 90)` -- dimmed; a light-mode border weight glares on dark |
| Text primary | `oklch(0.18 0.01 280)` ink-cool (not pure black) -- 18.0:1 | `oklch(0.93 0.006 90)` -- 15.8:1 |
| Text secondary | `oklch(0.42 0.01 280)` -- 8.1:1 | `oklch(0.72 0.008 280)` -- 7.8:1 |
| Text tertiary | `oklch(0.52 0.01 280)` -- 5.3:1 | `oklch(0.60 0.008 280)` -- 4.9:1 |
| Accent | `oklch(0.55 0.18 25)` warm terracotta -- 5.1:1; one-color punctuation, not a primary CTA color | `oklch(0.70 0.15 25)` -- 6.8:1; lifted and desaturated for the dark surface |
| Display serif | GT Sectra / Editorial New / Source Serif / Söhne Schmal -- distinctive serif with personality | same |
| Body serif (for long-form) | Source Serif Pro / Charter / Tiempos Text |
| Body sans (for UI) | GT America / ABC Diatype / Söhne Buch |
| Caps / overline | `font-feature-settings: 'smcp'` small-caps, never `text-transform: uppercase` |
| Modular scale | 1.333 (perfect fourth -- editorial standard) |
| Spacing scale | Generous: 16-24-40-64-96-144 (margins generally 80px+ on section breaks) |
| Radius | `0` for editorial, or `4px` for non-content surfaces (cards if needed). Never `rounded-md` for editorial content |
| Motion | View Transitions API for page transitions, 200-300ms ease-in-out. No element-level motion in body |
| Density | Spacious: 1.6 line-height on body, 1.1 on display, 65ch max content width |
| Decoration | One distinctive element used sparingly: a custom drop-cap, a colored sidebar margin, a page-number marker |

Component recompositions:
- **Hero**: left-aligned, three-line headline at 56-72px, subhead at 24px, no buttons (CTAs come later in the page)
- **Article body**: 65ch column width, drop-cap on first paragraph, pull-quotes with em-dash attribution
- **Footer**: minimal. Date, attribution, single nav row. No four-column legal grid

### Template C: Workshop / Crafted

POV: Figma / Linear settings / Notion calendar / Bear Notes / Things Mac. Warm neutrals, small functional details, hand-tuned density, system fonts where they fit, tactile interactions. The user is a craftsperson; the tool feels touchable.

Light is this template's primary scheme; the dark column is its authored counterpart.

| Token | Light (primary) | Dark (counterpart) |
|-------|-----------------|--------------------|
| Background base | `oklch(0.97 0.008 80)` warm-cream | `oklch(0.18 0.008 80)` warm-dark, hue kept from the light ramp |
| Surface 1 | `oklch(0.99 0.005 80)` paper | `oklch(0.22 0.008 80)` -- lighter than base, because elevation is lightness on dark |
| Surface 2 | `oklch(0.94 0.01 80)` recess | `oklch(0.15 0.008 80)` recess -- darker than base, inverting the direction |
| Border | `oklch(0.88 0.008 80)` 1px | `oklch(0.30 0.008 80)` 1px |
| Text primary | `oklch(0.22 0.01 60)` warm-ink -- 15.9:1 | `oklch(0.93 0.008 60)` -- 15.3:1 |
| Text secondary | `oklch(0.45 0.01 60)` -- 6.8:1 | `oklch(0.70 0.01 60)` -- 7.0:1 |
| Text tertiary | `oklch(0.52 0.01 60)` -- 5.1:1 | `oklch(0.62 0.01 60)` -- 5.2:1 |
| Accent (moss, not blue/purple) | `oklch(0.5 0.13 145)` workshop-moss -- 5.2:1 | `oklch(0.68 0.12 145)` -- 6.9:1 |
| Accent secondary (warm) | `oklch(0.65 0.16 50)` honey -- **3.1:1, non-text only**: fills, chips, and rules. Never body copy or labels on the base surface | `oklch(0.75 0.14 50)` -- 8.1:1, clears text use on dark |
| Display font | Söhne Buch / GT Walsheim / Untitled Sans (warm humanist sans) | same |
| Body font | System UI stack (`-apple-system, system-ui`) tuned for the OS -- see `references/design/02-typography.md` § 2 for what that resolves to per platform | same |
| Mono (code/IDs only) | Söhne Mono / Berkeley Mono -- never for labels, stats, or any human-readable text |
| Modular scale | 1.25 (major third) |
| Spacing scale | 4-6-8-12-16-24-32-48 (slightly tighter than tactical) |
| Radius | `6px` consistent (not 4, not 8 -- the in-between) |
| Motion | Spring physics on drag and toggle (200ms tension 170 friction 26). Instant on click |
| Density | Medium: 36px row height, 16-24px section gaps |
| Decoration | Functional details only: subtle inner-shadow on inputs, hairline divider gradients, hand-tuned focus rings |

Component recompositions:
- **Button**: subtle drop-shadow on hover (1px translate-y), warm border
- **Toggle**: spring-animated thumb, warm color, slight inner shadow on track
- **Card**: surface-2 background (recessed feel), 6px radius, hairline border
- **Input**: paper bg with inner shadow on focus, accent border at 2px

## 4. Committing to the POV

Once chosen, every component reflects it. Buttons, dialogs, forms, tables, errors, toasts, empty states, loading, settings panels -- all carry the same DNA. The taste audit (file 03) verifies coherence.

| Discipline | Detail |
|------------|--------|
| Token-driven | All colors, spacing, type as tokens. Never hardcode `#3b82f6` or `padding: 17px` |
| Component-recomposition | Default shadcn primitives are starting points only. Recompose `Button`, `Card`, `Dialog`, `Input` to carry the POV |
| Pattern propagation | The hover state on cards must match the hover state on buttons. The radius on inputs must match the radius on buttons. Coherence is the entire game |
| Copy carries POV too | A tactical operator product writes "Save and continue", an editorial product writes "Publish article", a workshop product writes "Save changes" (full doctrine: `references/design/08-ux-writing.md`) |
| Empty / error / loading | These are 50% of POV proof. A real POV designs them; AI defaults skip them |
| The hero is a thesis | Open with the most characteristic thing in the subject's world -- a headline, an image, a live demo, an interactive moment. A big number with a small label, supporting stats, and a gradient accent is the template answer; use it only if it is truly the best option |
| Structure is information | Structural devices (numbering, eyebrows, dividers, labels) encode something true about the content, never decorate it. Numbered markers (01 / 02 / 03) are appropriate only when the content actually is a sequence whose order the reader needs |
| Boldness budget: spend it in one place | The signature element is the one memorable thing; everything around it stays quiet and disciplined. Cut any decoration that does not serve the brief -- and remember that not taking a risk is itself a risk |

## 5. When to Break Your Own POV

POV is a default, not a prison. Rare, justified breaks reinforce the system. Document the exception explicitly in the design notes.

| Justified break | Why |
|-----------------|-----|
| Destructive confirm | Higher contrast, larger touch target, more space than usual to slow the user down |
| Marketing pages | May warrant editorial POV even in a tactical product (Stripe homepage vs Stripe dashboard) |
| Onboarding | Friendlier tone, more decoration, more whitespace to reduce intimidation |
| Error pages | Personality and warmth even in restrained products. The 404 is a chance to be human |
| First-run empty state | Generous illustration or copy that wouldn't fit in the working state |
| Marketing modal in product | A "What's new" announcement may visually sit slightly outside the product POV |

Unjustified breaks: a "modern" gradient because it's trendy. A single flashy card to "stand out". Color theming for a holiday. These dilute the POV.

## 6. POV Evolution

POV is not version 1.0. It deepens through iteration as the team learns what the product actually is.

| Stage | Pattern |
|-------|---------|
| v1 | Pick the anchor decisions (dark vs light, density, accent hue, type system). Ship something coherent |
| v2-v5 | Discover edge cases (empty states, errors, undocumented contexts). Each one teaches the POV |
| v6+ | The POV starts derivating itself: new components written by the team naturally carry the DNA without explicit reference |
| Migration | Major shifts (Linear off-white -> deep dark, Notion's gradual warming) happen across multiple versions, never in one sprint |

The anchor decisions are the foundation. Once set, they should rarely change. The expressions of those decisions (specific tokens, exact components) refine continuously.

## 7. POV Worksheet (Use Before Designing)

Fill this before opening Figma / writing JSX. Save it in the project as `design/POV.md`. Reference it in every PR.

```markdown
# Project POV

## Three adjectives
[ , , ]

## Aesthetic anchors (specific products + which aspect)
- [Product]: [aspect we're stealing]
- [Product]: [aspect we're stealing]

## Banned (concrete)
- [no X]
- [no Y]

## Density
[information-dense | medium | spacious]

## Tone
[terse | warm | expert | peer]

## Marketing vs Product
[same POV | split — marketing X, product Y]

## Motion
[invisible-functional | expressive | none]

## Decoration
[zero | functional-only | expressive]

## Screenshot-shareable hero
[the one component that must be the strongest]

## Anchor decisions (the ones we won't change without re-deciding the whole system)
- [decision]
- [decision]
- [decision]
```

## 8. Cross-References

| Need | File |
|------|------|
| The catalog of patterns to avoid | `references/catalogue/01-ai-tells.md` |
| Distinctive systems to study (which POV they exemplify) | `references/aesthetic/02-distinctive-systems.md` |
| Pre-ship audit | `references/aesthetic/03-taste-checklist.md` |
| Token architecture (OKLCH, light-dark, container queries) | `references/design/01-color-oklch.md` + `references/architecture/03-styling-architecture.md` |
