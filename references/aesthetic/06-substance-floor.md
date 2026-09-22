---
topic: aesthetic
role: reference
scope: substance-floor
audience: ui-designer, ui-reviewer
---

# The Substance Floor: What a Surface Must HAVE

Every other file in this library tells you what to take away. The catalogue lists
tells to avoid, the taste checklist fails you for excess, the mirror pass removes
one accessory, the density dimension catches waste. All of that is one-directional:
a rule against too much. Nothing in the library, before this file, failed a design
for having too little. So a model following the library converged on the cheapest
way to clear every rule at once: remove everything. Grey neutrals at chroma zero,
one hairline at 8% alpha, no elevation, badges and edges stripped, colour only for
status, the system stack at default weights on every surface. It passes every
audit and it is the 2026 AI default (owner directive 2026-09-16, after six site-wide
campaigns on one data product each rendered it flatter than the last).

This file is the other direction. It is a floor, expressed as measurements a
reviewer can quote and a designer can design to, and it binds every path in the
plugin: the architect emits a substance contract, the taste checklist carries a
substance section, the visual reviewer measures it, the anti-slop auditor never
files a device that passes it as a tell without the concentration test, and no
improvement plan removes a device without naming what replaces it.

**The brief outranks the floor's picture of a pass.** Where the brief or the
owner's visual reference pins down a direction, the brief's own words win
(`references/aesthetic/01-point-of-view.md` § 2), including when they ask for a
monochrome editorial page, an ink-on-paper reference product or a single-colour
brand. What the brief cannot waive is that each of the seven rows is answered: the
answer is either the number or a stated reason recorded in the substance contract,
and a row answered by a reason passes. A floor is a floor, not a look.

**The calibration, where the brief leaves the axis free.** The target is not
decoration, and it is not a look. The owner's taste, recorded across every project,
is restrained premium-tool: Robinhood, Linear, a Wowhead-tier game database,
Apple's product pages. Those four are cited because they are restrained and still
not flat: boxed panels with real edges, a saturated brand colour that means
something and is visibly present, item icons and imagery wherever the domain has
them, three or more surface levels you can find without squinting, and type that
carries a voice. That presence is what transfers to any brief. Their palettes,
densities and type voices do not: where the brief or the visual reference names a
different world, that world wins outright, and what survives is the seven checks,
not the reference (Template D in `references/aesthetic/01-point-of-view.md` § 3 is
the same taste and is opt-in only; this file does not opt in for you). Ornament for
its own sake (per-row coloured keylines, rainbow segmented bars, decorative blobs, a
pulse dot on "Live") still reads as slop to the same owner. The test that separates
the two is in section 3.

**Other pictures of a pass.** A monochrome editorial page passes with weight, size,
space and containment carrying the hierarchy, imagery drawn from the subject itself,
and one ink doing the accent's two jobs. An image-led marketing page passes when the
photography is the material and the accent lives in a single fill on the one action
that matters. A text-first documentation product passes on the article surface's own
rules: no volume bar, a type scale that makes the structure legible at a glance, and
figures, tables and code where the content has them. Each of those answers all seven
rows; none of them looks like the calibration.

## 1. The seven substance checks

Each check names what to verify, how, and the severity when it fails without a
stated reason. `[code]` rows are answerable from source; `[browser]` rows need a
render, and on a code-only pass they are NOT ASSESSED, never PASS.

| # | Check | Verify | Severity if failed |
|---|---|---|---|
| S1 | **Accent presence.** The brand accent is visible on first paint in at least two roles (primary action, current or selected nav item, focus ring, key figure, section marker, link colour), and at least one of those roles is a fill, not only text | [code] read the token map and the first-viewport markup; [browser] `measureSubstance()` reports `accentRoles` and `accentArea` inside the content root (`main` by default) and the shell's own accent roles on `shellAccent`, so a rail or top-bar accent is never mistaken for one on the content | HIGH on a product or marketing surface; MEDIUM on a document |
| S2 | **Accent chroma floor.** The primary accent's OKLCH chroma is at least `0.10` at its rendered lightness (`0.12` or more is the working range; the library's own worked palettes sit at 0.12 to 0.18). Below `0.10` is a muted brand, which is a stated decision carrying `anti-slop-allow: muted brand <reason>` or it is a finding | [code] read the accent token; the dark-scheme value may sit lower than light by at most `0.03` (design/01 dark-surface craft dims chips, it does not grey them) | HIGH |
| S3 | **Surface ladder.** A product or data surface has at least three surface levels (base, raised, overlay or hover) and every boundary between adjacent levels is perceivable: a tint step of at least `1.15:1` between the two surfaces, or an edge (border, rim, shadow) of at least `1.3:1` against the surface it sits on. Measured as a contrast ratio, in pixels where a shadow or rim is involved. OKLCH delta-L is not a measurement: the same `0.04` delta is `1.04:1` at `L 0.13` and `1.11:1` at `L 0.23` | [code] compute tint steps from tokens; [browser] rasterise the boundary (`review/06-measurement-traps.md`: computed style cannot see a shadow) | HIGH when the surface has no perceivable boundaries at all; MEDIUM when one level is missing |
| S4 | **Edges and containment.** Panels, cards, grouped controls and data tables have a findable boundary at 100% zoom on the target display. A hairline at `<= 0.10` alpha of white on a near-black ground computes to roughly `1.1:1` and is not an edge; it is the flat-terminal signature. Boxed panels with real edges are a legitimate device and the reference for data-heavy products | [code] read border and shadow tokens and their alpha; [browser] measure the edge against both surfaces | HIGH on data surfaces; MEDIUM elsewhere |
| S5 | **Focal visual per screen.** Every screen or page has one element that carries the eye and belongs to the subject: a photograph, a product shot, an illustration drawn for the brand, a chart, a large figure with context, an entity list with its real icons, or a typographic poster hero. A first viewport that is only text on any surface that is not an article template fails | [code] inspect the first-viewport markup for `img`, `svg` (non-icon), `figure`, `canvas`, `video` or a display-scale heading; [browser] `measureSubstance()` reports `firstViewportVisual` | HIGH on marketing and product; MEDIUM on settings and admin |
| S6 | **Imagery and iconography.** Marketing and content pages carry at least one real image or figure per two sections; entity rows (items, classes, products, people, teams) carry their icon, thumbnail, logo or avatar wherever the domain has one. "No real images at all, every section is icon-cards and abstract shapes" is one of the most-cited AI complaints (`catalogue/01-ai-tells.md` § 7 detection cues) and this row gives it a number | [code] count `img` / `picture` / `figure` per `section`; [browser] `measureSubstance()` reports `imagesPerSection` and `textOnlySections` | HIGH when zero images on a marketing or content page; MEDIUM below the ratio |
| S7 | **Hierarchy in more than one channel, and identity colour at full strength.** Hierarchy uses at least three of: weight, size, colour, containment, space, iconography. A system where every element sits under chroma `0.03` with no containment is monochrome by accident. Where the domain owns a colour vocabulary (item quality, class or faction, tiers, brand lines), those colours render at their canonical saturation; a desaturated identity colour is a defect, not restraint | [code] read the type scale (at least three distinct weights or optical sizes in use), the neutral ramp, and any identity palette; [browser] `measureSubstance()` reports `hueCount` and `weightCount` | HIGH when only one channel carries hierarchy; MEDIUM when identity colours are muted |

Section 5 of `references/aesthetic/03-taste-checklist.md` mirrors these rows as
its section 1b; the numbers here are the source of truth and that file copies them.

**What this floor is not.** It is not a quota for decoration. A page can pass all
seven with one accent, one photograph, three surface levels and a type scale, and
that is exactly the restrained premium look. It fails a page that has none of them,
not a page that has few. And it is not a veto over the brief: every row is satisfied
either by its measurement or by a stated reason written on the row
(`anti-slop-allow: <reason>`, the same hatch the catalogue and the anti-slop auditor
honour), and a reason that quotes the brief -- an austerity or legal-notice target, a
monochrome or terminal aesthetic the owner asked for, an e-ink or print surface, a
memorial page where restraint is the message -- is sufficient on its own. The floor
catches flatness nobody chose, never flatness the brief asked for.

## 2. Severity: substance is not TASTE

The universal rubric's severity ladder is anchored on breakage, so a flat page,
which renders perfectly, calibrates to TASTE and vanishes in triage. That is the
mechanism by which `review/05-density-and-economy.md` had to lift waste to HIGH
with a measurement, and the same mechanism applies here. A substance finding
carries a number (the chroma, the boundary ratio, the image count, the hue count)
and is ranked by what the person loses:

- No perceivable surface boundaries on a data surface, accent chroma under the
  floor with no stated reason, or a text-only first viewport on a product or
  marketing page: **HIGH**. These are the three that made an owner reject a
  product on sight.
- One missing surface level, imagery below the ratio, identity colours muted,
  hierarchy carried by two channels: **MEDIUM**.
- "I would have made it richer" with no measurement: **TASTE**, and it belongs
  there. The measurement is what keeps the rest credible.

Substance findings are filed by the visual reviewer under `dimension: visual`
with `Substance:` in the title, so they survive the CI schema and the ledger. The
full flat-terminal signature (S3 and S4 failing together with S1 or S2, on a dark
ground, with badges and edges absent) is also the catalogue's V13 tell, filed by
the anti-slop auditor under `dimension: anti-ai`; the verifier merges the two into
one finding with both dimensions cited.

## 3. The stranger's word test

The taste checklist's mirror pass (smell test 9.9) removes one accessory. This is
its pair, and it runs on a render, never on source.

Show the rendered page to someone with no context, or look at it yourself after
looking away for a minute, and write down the first word. If the word is **grey,
flat, empty, plain, unfinished, template, wireframe** or **terminal**, the design
fails, whatever the audit tables said -- unless the brief named that word as its
target, in which case it is a pass, recorded as `stranger's word: terminal (brief
target)`, and the other failing words still fail. If the word is **busy, loud,
gaudy** or **decorated**, the mirror pass has work to do. The target words are the
ones owners use when they share a screenshot unprompted: solid, premium, real,
polished, finished, looks like a product.

The mechanical proxy, when nobody is available to say the word, is the set of
numbers `measureSubstance()` prints for the first viewport: `hueCount >= 2`
(counting the accent, excluding status colours), `surfaceLevels >= 3`,
`firstViewportVisual = true`, `weightCount >= 3`. Three of four failing predicts the
word will be grey.

## 4. Ornament versus substance: the earning test

The owner strips ornament and rejects flatness in the same review. The two are not
in tension; they are separated by one question per device: **what does it encode?**

| The device | Earns its place when | Is ornament when |
|---|---|---|
| A coloured edge or keyline | It marks selection, the current item, an alert, or a category the reader must tell apart | It sits on every row or card in the same colour, encoding nothing |
| An accent fill | It is the primary action, the current nav item, a key figure, a live status | It tints every icon container identically (V1) |
| Elevation | It says which surface is above which, in three measured levels | It is the same `shadow-sm` on everything (C12) |
| A framed panel | It groups interactive or scannable content the reader works inside | Every container is a card because the kit ships one (L5) |
| Identity colour | The domain owns it (item quality, class, tier, brand line) | It is a rainbow applied to a list with no vocabulary behind it |
| Imagery | It shows the product, the subject, the entity | It is a stock gradient, a blob, a corporate-Memphis figure (I4, I7, C11) |
| Motion | It answers the person's action or lands one orchestrated moment | It fades every section on scroll (M1) |
| A pulse, glow or halo | Almost never; liveness is content-borne | A pulse dot beside "Live", a saturated halo on a button (V11, C18) |
| Texture and atmosphere | A light source and grain under `0.05`, felt not seen (design/10 § 3) | A visible gradient wash standing in for a design |

The rule that falls out: **substance encodes; ornament repeats.** A device that
encodes information, identity or depth stays. A device applied identically to
everything regardless of what it marks is noise, and the catalogue's concentration
rule is the same rule seen from the other side.

## 5. Dark mode is not flat mode

Half of the flat renders in the owner's history were dark, because the library's
dark guidance said elevation is a lightness delta and shadows do not register.
Both statements are true and both produced invisible hierarchy when followed in
tokens without checking pixels. Measured on a shipped screenshot: a card boundary
at `1.0015:1` and a top-edge rim at `1.000:1`, an elevation system that did not
paint at all, while the same tokens measured `1.155:1` in light and worked.

The working rules, each measured after the fact:

- A raised surface in dark is found by the light it **catches on its top edge**,
  not by the shadow it casts onto near-black. `inset 0 1px 0 <warm light / alpha>`
  plus a drop for ambient contact. Measured `1.446:1` where a `1.40:1` border had
  been, one-sided so it never reads as a drawn box. This is why macOS, Linear and
  Figma use a rim in dark and reserve drop shadows for light.
- A tint step alone must clear `1.15:1` in pixels. Reason in ratios, never in
  delta-L (S3 above).
- Where the page ground is already near-black there is no room for a recessed
  well; keep the `1px` hairline on list rows at an alpha that measures, and reserve
  the border-free treatment for raised cards.
- Bright accent chips are dimmed and their text relationship flipped
  (`design/01-color-oklch.md` dark-surface craft); they are not greyed. The accent
  keeps its hue and clears S2.
- Verify token changes in pixels. Rasterise the shipped screenshot and scan across
  the boundary. "Reasoned in tokens, never checked pixels" is the whole failure.

## 6. Every subtraction names its replacement

`catalogue/01-ai-tells.md` § How to apply already forbids a removal without a
replacement and taste smell test 9.10 fails a subtraction-only system. This table
is the working list, so a finding, a fix plan or a POV can name the device by
reference instead of inventing one under pressure. A remediation that leaves the
surface flatter than a human team would ship is the wrong remediation, exactly as a
remediation that leaves it less responsive or less accessible is.

| Removed (tell) | Replacement device, same job |
|---|---|
| Gradient hero (C5, C6, V5) | One committed brand field, a photograph or product shot or subject artefact, and atmosphere under `0.05` (design/10 § 3) |
| Card-everything (L5, S3, Strongest-10 #1) | Sections separated by measured tone shifts, plus ONE framed panel with a real edge where the grouping is interactive |
| Uniform `shadow-sm` (C12, D3) | A three-level elevation scale with measured boundaries; a rim in dark (section 5) |
| Pulsing live dot (V11) | Content-borne liveness: rows arriving, a live timestamp, a count that changes |
| Coloured left border on every row (V3, V2) | A selected-state fill, an icon, or a heading device on the rows that mean something |
| Frosted sticky nav (L6, Strongest-10 #2) | A solid nav on a raised surface with a brand tint, or a sidebar |
| Neon glow (C18) | A rim light plus a tuned drop (design/07 § 1) |
| All-caps tracked eyebrow on every heading (T5, Strongest-10 #4) | Small-caps or weight and colour on the same label; the information stays |
| Icon in a tinted circle (V1, Strongest-10 #6) | Icons at line height in one chosen family, or the domain's real icons |
| Blur blobs (C11) | A photograph, the product, grain under `0.05`, or a solid brand block |
| Counter animating from zero (L9) | The static figure with a sparkline and tabular figures |
| Badge pill above the hero (V4) | The headline itself, and a real "New" state on the thing that is new |
| Bento as the only layout (L3) | A content-justified split; keep one bento where the content has varied importance |
| Marquee logo wall (L8, M4) | A static logo strip at about 40% opacity, colour on hover |
| Wave dividers (L12) | A background tone shift between sections |
| "Most popular" badge (S11, Strongest-10 #5) | The recommended plan elevated by size and position |
| Terminal chrome: mono labels, tracked mono kickers (T13) | The system or brand sans with weight and colour hierarchy; tabular figures on the sans for alignment |
| Default shadcn frame (S1, S2, S3) | The same frame with tuned tokens: a measured edge, a radius language, a brand accent |

When the replacement cannot be named, the removal is not made. It goes under Open
questions for the owner.

## 7. Where the floor enters the pipeline

| Path | What carries it |
|---|---|
| `design-ui` and the architect | A **substance contract** per screen (accent roles, surface ladder with ratios, edges, focal visual, imagery plan, identity colours) recorded before the taste audit; the mechanical self-check carries S1 to S7 rows; the taste audit reports section 1b |
| `review-ui` and the visual reviewer | Lens 18 (Substance) with `measureSubstance()` numbers pasted into the finding; the Visual quality verdict is capped at WEAK when S3 or S4 fails on a data surface with a measurement |
| `improve-ui` and the team lead | Every removal in the improvement plan names its replacement from section 6; a plan whose design pass is only removals is rejected (hard rule 13); the doctrine audit reports repo rules that enforce flatness |
| The anti-slop auditor | A device that passes S1 to S7 is never filed as a tell on presence; the concentration rule applies. The full flat-terminal signature is V13 |
| The verifier | A recommendation that reads "remove X" with no replacement is incomplete and is returned as an open question, not passed through; an elevation or boundary claim without a pixel measurement carries `[unverified: geometry measurement needed]` |

## 8. Cross-references

| Need | File |
|---|---|
| The tells this floor is the counterweight to | `references/catalogue/01-ai-tells.md` (§ How to apply; V13) |
| Subtraction-only smell test, section 1b rows | `references/aesthetic/03-taste-checklist.md` |
| Point of view, the worksheet's substance fields | `references/aesthetic/01-point-of-view.md` § 7 |
| Chroma, ramps, dark-surface craft | `references/design/01-color-oklch.md` |
| Elevation scale, rim light, shadow tuning | `references/design/07-depth-and-overlays.md` |
| Atmosphere recipes, hero focal visual | `references/design/10-hero-and-section-architectures.md` § 3 |
| The type gate that S7 leans on (a display face distinct from the sans, explicit weights) | `references/design/02-typography.md` § 2 |
| Waste, the other floor with a measurement | `references/review/05-density-and-economy.md` |
| Why computed styles cannot see a shadow | `references/review/06-measurement-traps.md` |
| The measurement script | `${CLAUDE_PLUGIN_ROOT}/scripts/measure_substance.js` |
