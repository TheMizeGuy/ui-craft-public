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
| **A Wowhead-tier game database** | Reference database built like a premium tool. Boxed panels with real edges over a warm-dark ground, three surface levels you can find without squinting, the game's own rarity and class colours at full saturation because the domain owns that vocabulary, an item icon on every entity row, one gold accent reserved for the primary action and the selected row, a display face with a voice over a workhorse sans for the data. Restrained and rich at once: the chrome is furniture, the items are the product |

Every one of those POVs determines hundreds of downstream decisions: button radii, dialog dimensions, error tone, empty-state copy, loading patterns, dark-mode hue shifts. The POV does not micromanage these decisions; it lets you derive them.

The POV test: if you removed the logo, would users know which product this is? If no, the POV is too weak.

## 2. How to Find the POV for a Project

POV is found in conversation with the user before any pixels are pushed. The questions below produce a brief that constrains design without dictating decisions.

| # | Question | Why it matters | Example answer |
|---|----------|----------------|----------------|
| 1 | What 3 adjectives describe the product? | Forces concreteness. "Modern" and "clean" are not adjectives, they are filler | "Tactical, restrained, dense", "Editorial, warm, generous" or "Solid, saturated, structured" |
| 2 | Which existing products inspire? Be specific about which aspect | Anchors aesthetic gravity | "Linear's keyboard model + Stripe's typographic warmth" not "modern SaaS" |
| 3 | What to AVOID? Concrete | Calls out the no-go zone | "No purple gradients, no glass cards, no centered hero, no Lucide icons" |
| 4 | Density target: information-dense vs spacious? | Drives typography scale, padding, line-height | "Dense like Linear" or "spacious like Apple's product pages" |
| 5 | Tone of voice: instructional, peer, expert, friendly, terse? | Drives microcopy, error messages, empty states | "Terse-expert, like Stripe API docs" |
| 6 | Brand temperature: warm or cool? | Drives neutral palette tuning, accent hue | "Warm with one cool accent for status" |
| 7 | Marketing vs product: same POV or split? | Drives whether to design two systems | "Marketing is editorial; product is tactical. Split" |
| 8 | Motion philosophy: invisible-functional, expressive, none? | Drives transition tokens, easing, durations | "Invisible-functional except onboarding" |
| 9 | Decoration tolerance: functional-only / expressive / zero (needs a stated reason)? | Drives texture, illustration, gradient, blob policy. "Zero" is the answer that rendered one product flatter on six consecutive campaigns, so it is a decision carrying a reason, never the safe default | "Functional-only: framed panels, item icons, one saturated brand accent, a three-level surface ladder" |
| 10 | What should be screenshot-shareable? | Identifies the one component that needs to be the strongest | "The dispatch board itself" or "The pricing comparison" |
| 11 | What must be present? The devices this design cannot ship without: accent roles, surface ladder, edges, focal visual, imagery, identity colours (`references/aesthetic/06-substance-floor.md` § 1) | A brief made only of refusals converges on the flat default, because deletion clears every rule at once. The floor is stated as an input, not discovered in review | "Gold on the primary action and the selected row, three surface levels, a measured 1px edge on every panel, an item icon on every entity row" |
| 12 | Where does prose live? The copy map (`references/design/12-copy-placement-and-volume.md` § 6): product first, one lede above it, explanation below or behind a disclosure | Placement is a design decision. Paragraphs nobody placed land at the top of the layout, above the thing the person came for | "One 22-word lede above the table; methodology in a headed section below it" |

The answers form the POV brief. Every component decision later is checked against the brief. If a button needs a gradient and the brief says "zero decoration", the button doesn't get a gradient -- the brief gets revisited.

One input is not optional: the **visual reference**. Question 2 answered in the abstract ("Linear's keyboard model") is not enough to design from; the brief carries a screenshot, a named product page, or the product's own existing identity that the owner has approved as the target. Without it, every POV produced by a model collapses toward the same few defaults regardless of subject, so a missing reference is asked for before any token is written, never inferred from the product category.

### Anti-questions (banned)

| Banned question | Why |
|-----------------|-----|
| "What's your favorite color?" | Color flows from POV, not preference |
| "Should we use shadcn?" | Implementation choice, not POV |
| "Light or dark mode?" | Both, designed independently |
| "Should it look modern?" | "Modern" is the AI default. Useless |
| "What competitor should we copy?" | Aesthetic theft is not POV. Steal principles, not pixels |

### Calibration: the current AI-default looks

AI-generated design currently clusters around six looks: (1) a warm cream background (near `#F4F1EA`) with a high-contrast serif display and a terracotta or sage accent (the "tasteful default," dissected in `references/catalogue/01-ai-tells.md`; Templates B and C below each sit within one axis of it, see the collision notes in section 3) -- the terracotta variant most often lands near `#D97757`, the Claude-interaction accent, so on a user's brief it reads as a tell twice over and is caught by hue (OKLCH hue 25-50 at chroma 0.12 or more on a cream ground) as well as by hex; (2) a near-black background with a single bright acid-green or vermilion accent; (3) a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper columns; (4) the SaaS-card kit: identical rounded cards, one radius regardless of hierarchy, the same soft grey `rgba(0,0,0,.1)` shadow under every one of them, and gradient washes standing in for a composition; (5) template chrome: a tracked ALL-CAPS eyebrow above every heading, `A · B · C` middle-dot meta strings, `WORD — fragment` labels with a spaced em dash, a shelf-picked near-black (`#0B0B0B`, `#111`) where a dark derived from the brand hue belongs, mono on small data labels, and `→` appended to link text (catalogue T15, T5, T13); (6) the flat-terminal subtraction-only system (catalogue V13), the second face of the 2026 default and the one looks 1 to 5 land on when they are cleared by deletion: no elevation, one hairline for every boundary, the accent stripped back to status colour, the system stack at default weights everywhere. All six are legitimate for some briefs, but they are defaults rather than choices and appear regardless of subject. Where the brief pins down a direction, the brief's own words always win, including when it asks for one of these looks; where an axis is left free, do not spend that freedom on a default. Looks 1 to 5 fail by excess and look 6 fails by absence, so escaping one by moving toward the other is not escaping anything (`references/aesthetic/06-substance-floor.md` § 1).

The plan-stage self-test: before building, work through a *similar* brief in your head. If the plan you drafted for this brief would come out roughly the same for that one, the plan is a default wearing this project's name; revise the generic part and say what changed and why. The subject's own world (its materials, instruments, artifacts, vernacular) is where distinctive choices come from, so if the brief does not pin down the subject, pin it yourself: name the concrete subject, its audience, and the page's single job before designing.

## 3. Four POV Templates (worked examples, never a routing target)

These are worked examples of what a complete, coherent POV looks like, kept so the token discipline below has something concrete to point at. They are not a menu, and no product category selects one: dense data does not imply Template A, marketing does not imply Template B, a small team does not imply Template C, an entity database does not imply Template D. The POV comes from the § 2 worksheet and from the visual reference the owner supplied (a screenshot, a named product, or the product's own existing identity); a template is reached for only when the brief asks for it by name. Never ship a template-rendered POV. Each carries a complete token set, **both schemes**, so the downstream coherence is automatic.

**Owner directive 2026-09-16.** The dark, flat, chrome-less "terminal" rendering of Template A had become the default answer for every data-dense product, and the owner rejected it. It is not a default anywhere in this library. A POV whose every rule is a removal (one hairline, no frames, no badges, no elevation, colour only for status) is not a POV: it is the 2026 AI default, and the taste audit's smell test 9.10 fails it.

**Collision notes.** Templates B and C each satisfy the catalogue's two-of-three Tasteful Default rule (cream/paper + serif; cream + moss). They stay legitimate only as a stated decision: when a design lands within one axis of either template, change one axis (cool paper for B, a subject-derived accent for C) or mark the token block `anti-slop-allow: <reason>` so the auditor grades it as a choice.

**Both schemes, authored independently.** Every template below gives a light value and a dark value per token. That is not decoration: a template that covers one scheme means the second scheme gets improvised late, which is how the mirrored dark mode `references/design/01-color-oklch.md` warns about gets shipped. The counterpart column is *derived by the rules in that file's Dark-mode surface craft section* (borders get their own contrast floor against both surfaces they separate, elevation is measured in pixels rather than asserted from a lightness delta, bright chips are dimmed and their text relationship flipped but never greyed, the dark ramp is picked from the brand hue), not by inverting L. Wire the two columns once, at the root:

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

Templates B, C and D use the same wiring; only the values differ.

**Contrast is stated, not asserted.** Every text token below carries its computed WCAG 2.x ratio against that scheme's base surface, so the claim is checkable rather than trusted. Text tiers clear 4.5:1. Tokens that do not clear it are labelled non-text and must not carry body copy, helper text, timestamps, metadata, or disabled labels.

**Typeface discipline (applies to every template, maintainer directive 2026-07-17):** monospace faces are reserved for genuine code, logs, raw payloads, and literal identifiers -- never for headings, body, labels, kickers, or numerals on product or marketing surfaces. Digit alignment comes from tabular figures (`font-variant-numeric: tabular-nums` / `'tnum'`) on the sans, not from a mono family. Hierarchy comes from weight and color, not typeface switching. The "terminal look" (mono + uppercase + tracking on UI chrome) is itself a house cliché now, not a de-AI-ing move.

**House font defaults (same directive):** the platform system stack is the base voice for UI and information-dense TEXT, and it counts as a type decision only where the checkable rule in `references/design/02-typography.md` § 2 holds: a `--font-display` distinct from `--font-sans`, an explicit heading weight and tracking, and at least three weights or optical sizes actually in use. The system stack applied sitewide at default weights has made no type decision (catalogue T2) and fails substance check S7 (`references/aesthetic/06-substance-floor.md` § 1); it is the type half of the flat-terminal default, not the house style. **Poppins**, or the brand's own display face, carries headline and hero moments. Template font rows below are options for when a project defines its own brand voice -- absent that, reach for the house defaults first, and still declare the display face.

### Template A: Tactical Operator

POV: Linear / Things / Arc / Things-Mac. Dense, keyboard-first, restrained accent, no decoration. The chrome serves the work. The user is an operator, not an audience.

**Opt-in only.** This template is used when the brief names it or the owner's reference imagery is this look. Nothing about a product's density, data volume, audience, or an existing dark theme selects it (owner directive 2026-09-16).

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
| Accent | `oklch(0.7 0.16 60)` amber-signal -- 7.2:1; single accent, used sparingly for active state and primary action | `oklch(0.52 0.12 60)` -- 5.2:1; darkened and slightly desaturated so it does not glare on paper |
| Status alert | `oklch(0.62 0.22 25)` blood-red -- 5.0:1; destructive confirms and outage only | `oklch(0.52 0.20 25)` -- 5.5:1 |
| Status ok | `oklch(0.7 0.13 145)` muted forest -- 7.9:1; desaturated to not compete | `oklch(0.50 0.12 145)` -- 5.1:1 |
| Display font | Söhne Variable / a condensed grotesque -- weight (600-650) + tight negative tracking as the brand statement, never a mono face | same |
| Body font | Söhne Variable, or DM Sans / Plus Jakarta Sans where a commercial licence is not available (450-550 range, never 400/700; DM Sans only with its weights and tracking tuned, never at the unmodified shadcn dashboard defaults the catalogue bans). **Never a display cut** -- display faces carry tighter default spacing and higher stroke contrast, which degrades at the 14px body floor this template specifies (12-13px only for secondary metadata, the scale's bottom step; catalogue T12 asks for 16px, so a dense-operator body below 16px is a stated decision carrying `anti-slop-allow: dense operator UI` and never goes below 14px) | same |
| Numeric font | Same as body with `font-feature-settings: 'tnum'` | same |
| Modular scale | 1.2 (12 -> 14 -> 17 -> 20 -> 24 -> 29 -> 35) |
| Spacing scale | 4-8-12-16-24-32-48-72 (8px grid with 4 for tight inline) |
| Radius | `0` (sharp) or `2px` (precise). Never `rounded-md` |
| Motion | 100-180ms, ease-out (instantaneous feel). No bounce. Spring only on drag |
| Density | Tight: 32px row height in tables, 12-14px gap between sections |
| Decoration | Refuses: gradients, blobs, decorative icons, tinted icon ovals, a coloured keyline on every row. Requires: a measured 1px edge on every panel that groups work (clearing 1.3:1 against both surfaces it separates), the three-level surface ladder above with each step verified in pixels rather than read off the lightness delta, the amber accent carried in at least two roles -- the primary action AND the current row or selected tab, one of them a fill -- and icons at line height in one family. The refusals are the style; the requirements are the material, and a template that ships only the refusals is the flat-terminal default wearing this name (`references/aesthetic/06-substance-floor.md` § 1, § 4) |

Component recompositions:
- **Button**: borderless filled, sharp corners, `font-feature-settings: 'tnum'`, no shadow, hover = brightness shift only
- **Card**: the surface-2 tint carries the panel and a real edge closes it -- a 1px border measuring at least 1.3:1 against both the panel and the page, not a 10%-alpha hairline that computes to 1.1:1, plus an `inset 0 1px 0` warm rim along the top edge in dark. No rounded corners, no drop shadow, no per-card accent border. A panel a reader can only find by reading its border is under-built (`references/design/07-depth-and-overlays.md` § 1)
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
| Body serif (for long-form) | Source Serif 4 / Charter / Tiempos Text |
| Body sans (for UI) | GT America / ABC Diatype / Söhne Buch |
| Caps / overline | `font-feature-settings: 'smcp'` small-caps, never `text-transform: uppercase` |
| Modular scale | 1.333 (perfect fourth -- editorial standard) |
| Spacing scale | Generous: 16-24-40-64-96-144 (margins generally 80px+ on section breaks) |
| Radius | `0` for editorial, or `4px` for non-content surfaces (cards if needed). Never `rounded-md` for editorial content |
| Motion | View Transitions API for page transitions, 200-300ms ease-in-out. No element-level motion in body |
| Density | Spacious: 1.6 line-height on body, 1.1 on display, 65ch max content width |
| Decoration | One distinctive element used sparingly: a custom drop-cap, a colored sidebar margin, a page-number marker. Must be present: a real image or figure every two sections, the terracotta accent visible on first paint in at least two roles, and a focal visual inside the first viewport -- an editorial page that is only type is a text blob with a serif on it (`references/aesthetic/06-substance-floor.md` S1, S5, S6) |

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
| Decoration | Functional details only: subtle inner-shadow on inputs, hairline divider gradients, hand-tuned focus rings. Must be present: the three-surface ladder above (base, paper, recess) with every boundary measured, the moss accent on the primary action and on the selected item, and the honey secondary doing real work on chips and rules -- warm neutrals alone are not a design (`references/aesthetic/06-substance-floor.md` § 1) |

Component recompositions:
- **Button**: subtle drop-shadow on hover (1px translate-y), warm border
- **Toggle**: spring-animated thumb, warm color, slight inner shadow on track
- **Card**: surface-2 background (recessed feel), 6px radius, hairline border
- **Input**: paper bg with inner shadow on focus, accent border at 2px

### Template D: Restrained Premium Reference

POV: Robinhood / Linear's product surface / a Wowhead-tier game database / Apple's product pages. Restrained and rich at the same time: boxed panels with real edges, a saturated brand colour that is visibly present and means something, the domain's own identity colours at full strength, an icon on every entity, three surface levels a person can find. The user is a returning expert who came for the data and stays because the tool feels built.

**Opt-in only, exactly like A to C.** Nothing about a product's density, its subject, its entity rows or its dark theme selects this template. It is reached when the brief names it, or when the owner's approved reference imagery is a boxed-panel product (the visual-reference requirement in section 2).

Dark is this template's primary scheme; the light column is its authored counterpart, not an inversion.

| Token | Dark (primary) | Light (counterpart) |
|-------|----------------|---------------------|
| Background base | `oklch(0.16 0.012 75)` warm-dark, hue carried from the accent, never a shelf-picked `#0B0B0B` | `oklch(0.94 0.006 85)` warm paper ground |
| Surface 1 (panel) | `oklch(0.21 0.013 75)` -- 1.16:1 against base, measured in pixels | `oklch(0.985 0.004 85)` -- 1.12:1 against base, under the tint floor on its own; the panel edge below carries the boundary |
| Surface 2 (raised, hover, popover) | `oklch(0.26 0.014 75)` -- 1.18:1 against surface 1 | `oklch(0.995 0.003 85)` plus the tuned contact shadow from `references/design/07-depth-and-overlays.md` § 1 |
| Panel edge | `oklch(0.30 0.012 75)` 1px -- 1.36:1 against the panel, 1.58:1 against the page | `oklch(0.84 0.009 85)` 1px -- 1.31:1 against the page, 1.47:1 against the panel |
| Top rim (dark only) | `inset 0 1px 0 oklch(0.55 0.02 85 / 0.30)` on raised panels -- measures 1.45:1 against the panel it tops, one-sided so it never reads as a drawn box | not used; light mode gets the drop instead |
| Text primary | `oklch(0.95 0.008 85)` -- 13.0:1 | `oklch(0.20 0.014 75)` -- 11.3:1 |
| Text secondary | `oklch(0.72 0.012 85)` -- 6.9:1 | `oklch(0.38 0.012 75)` -- 6.0:1 |
| Text tertiary | `oklch(0.60 0.012 85)` -- 4.7:1 | `oklch(0.45 0.012 75)` -- 4.6:1 |
| Accent (gold) | `oklch(0.78 0.15 85)` -- 8.2:1; chroma 0.15, well clear of the 0.10 floor | `oklch(0.6 0.13 85)` -- 3.1:1, **non-text**: fills, rules, the selected-row edge. Dark ink sits on the gold fill; gold text never sits on paper |
| Accent roles (not optional) | Primary action fill, current tab or selected row, focus ring, the screen's key figure -- at least two of the four on first paint, at least one of them a fill | same |
| Identity ramp (rarity, class, tier, category) | Four or more hues at chroma 0.15-0.20 rendered at canonical saturation: `oklch(0.72 0.17 145)`, `oklch(0.70 0.15 250)`, `oklch(0.65 0.20 305)`, `oklch(0.72 0.17 60)` -- 5.5:1 to 6.9:1 | the same hues at L 0.42-0.46 and the same chroma -- 4.5:1 to 5.2:1. Moved by lightness, never greyed |
| Status | Red `oklch(0.62 0.22 25)` -- 5.0:1, green `oklch(0.7 0.13 145)` -- 7.9:1; reserved for state and never borrowed by the identity ramp | `oklch(0.52 0.20 25)` -- 5.5:1, `oklch(0.50 0.12 145)` -- 5.1:1 |
| Item icon frame | 28px icon inside a 1px frame whose colour IS the entity's identity hue at full chroma, 4px radius, on surface 2. The frame encodes identity, which is what separates it from the tinted-oval tell (catalogue V1) | same, identity hue at its light value |
| Display font | A display face distinct from the body sans: Poppins for the elegant register, Plus Jakarta Sans or Söhne Breit for the tool register. Three weights in use -- 600 page title, 550 section and panel headings, 500 table headers | same |
| Body font | Platform system stack or a licensed workhorse sans (DM Sans, ABC Diatype) at 450 body / 550 emphasis, `font-feature-settings: 'tnum'` on every numeric column | same |
| Modular scale | 1.25 (major third), and the screen's primary figure or heading sits at 2.5x the body step or more (`references/design/02-typography.md` § 3) |
| Spacing scale | 4-8-12-16-20-24-32-48 |
| Radius | `6px` on panels, controls and the icon frame; `8px` on the outer page card. Committed, and paired with the edge and elevation steps above -- never a stock `rounded-md` left at its default |
| Motion | 120-200ms ease-out; the raised button drops 0.5px on press; no scroll-triggered fades |
| Density | Medium-tight: 34px entity rows around a 28px icon, 20px panel padding, 32px between sections |
| Decoration | Refuses: gradient washes, blur blobs, pulse dots, per-row coloured keylines, tinted icon ovals, a rainbow applied to a list with no vocabulary behind it. Requires: the panel edge, the dark rim, the three-level ladder, the accent in at least two roles with one a fill, the identity ramp at full chroma, and an icon or thumbnail on every entity row the domain has one for. The refusals are the style; the requirements are the material, and a pass that only removes has not shipped this template (`references/aesthetic/06-substance-floor.md` § 1, § 4) |

Component recompositions:
- **Framed panel**: surface 1, the 1px panel edge on all four sides, 6px radius, the inset top rim in dark and one tuned contact shadow in light. A panel a reader can only find by reading its border is under-built (`references/design/07-depth-and-overlays.md` § 1)
- **Entity row**: 34px tall, the entity's own icon in its identity frame at the inline start, the name set in the identity hue, numeric columns on tabular figures, and a selected state carrying a gold fill plus a 2px gold inline-start edge -- the one coloured keyline this template allows, because it encodes selection rather than repeating a category on every row
- **Primary button**: the tactile raised recipe from `references/design/07-depth-and-overlays.md` § 1 applied to the gold accent (inset top highlight, inset bottom shade, soft outer drop; depth inverts on `:active`), with dark ink on the fill in both schemes
- **Tabbed section header**: the tabs sit on the panel's top edge and the active tab joins the panel it opens -- same surface, the edge broken under the active tab, a 2px gold underline. Never a row of pills floating above an unrelated box

Data-dense and reference products usually get this direction **when the owner's named reference is a boxed-panel site**, and only then; being data-dense reaches for nothing on its own.

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
| Focal budget: spend it in one place | The signature element is the one memorable thing; everything around it stays quiet and disciplined. Cut any decoration that does not serve the brief -- and remember that not taking a risk is itself a risk |
| Material: full strength by default, never stripped for restraint | The surface ladder, the panel edges, the accent's roles and the icon treatment are the material the product is made of, not entrants competing for the focal budget. Full strength on every surface is the default. A surface that quiets the material -- a reading or focus view, a full-bleed media or map canvas, a print stylesheet -- says so in the design notes and names what carries grouping and hierarchy there instead; when that replacement cannot be named, the material stays (`references/aesthetic/06-substance-floor.md` § 6). "Restraint" is never the reason on its own: quieting the material to be restrained is exactly how a POV becomes the flat default (`references/aesthetic/06-substance-floor.md` § 4) |
| Substance floor | The design states what must be present before it is audited for excess: accent roles, the surface ladder with its ratios, edges, the focal visual, the imagery plan, identity colours. Seven checks with thresholds and severities: `references/aesthetic/06-substance-floor.md` § 1 |
| Copy has a home | Every paragraph is placed before it is written -- a headed section, a container of its own kind, a measure -- and the product sits above the prose, never underneath it (`references/design/12-copy-placement-and-volume.md`) |

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

## Visual reference (required, owner-approved)
[screenshot path | named product page | "the product's existing identity as of <commit>"]

## Aesthetic anchors (specific products + which aspect)
- [Product]: [aspect we're stealing]
- [Product]: [aspect we're stealing]

## Banned (concrete)
- [no X]
- [no Y]

## Must be present (substance floor: references/aesthetic/06-substance-floor.md section 1)
- Accent roles: [primary action | current or selected | focus ring | key figure], at least one a fill
- Surface ladder: [how many levels, and the measured ratio at each boundary]
- Edges: [which containers carry a real edge, and what it measures]
- Focal visual per screen: [what it is on each screen]
- Imagery and entity icons: [what the domain has, and where it renders]
- Identity colours: [the vocabulary and its canonical values, or "none"]

## Copy map (where prose lives: references/design/12-copy-placement-and-volume.md section 6)
- Lede above the primary content: [word count, or none]
- Everything else: [headed section below | behind a disclosure | its own route]
- Measure: [45-75ch on every prose block]

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
