---
topic: aesthetic
role: reference
scope: style-taxonomy
audience: ui-designer
---

# Style Taxonomy: Seed Vocabulary for Direction-Setting

A named vocabulary of style families, domain conventions, landing structures, pairing seeds, icon discipline, and motion intensity. Use it to *seed* a point of view, never to substitute for one: the POV method (`references/aesthetic/01-point-of-view.md`) decides; this file supplies candidates and names for the conversation. The anti-AI-tells catalogue always wins on conflict — several entries below are one lazy application away from being a tell, and the hazard column says so.

## 1. Style Families

Distilled from the ~85 named web/mobile style archetypes in circulation. Pick a family as gravity, then commit via the POV worksheet; never ship a family as-is.

| Family (representative names) | Reaches for | Right when | Wrong when | Hazards |
|---|---|---|---|---|
| Structural minimal (Minimalism, Swiss/Swiss 2.0, Exaggerated Minimalism, E-Ink/Paper) | Grid, white space, restrained palette, type-led hierarchy | Enterprise tools, docs, dashboards, editorial, luxury | Playful brands, children, high-energy entertainment | Defaults to "generic clean" without one distinctive anchor; precision in spacing/type is the whole game |
| Depth and material (Glassmorphism, Neumorphism, Claymorphism, Liquid Glass, Soft UI, Dimensional Layering) | Blur, translucency, soft shadows, embossed surfaces | Premium SaaS moments, overlays/nav, wellness, kids (clay) | Data-heavy views, low-end devices, accessibility-critical flows | Contrast failures are structural (translucent surfaces); glass panels everywhere is an AI tell; neumorphism's low contrast fails WCAG by default |
| Bold and raw (Brutalism, Neubrutalism, Memphis, Gen-Z chaos, Anti-polish) | Hard borders, unpolished type, stark contrast, asymmetry | Portfolios, creative agencies, counter-culture, Gen-Z commerce | Trust-critical domains (finance, health, legal, gov), elderly audiences | Needs real conviction; half-committed brutalism reads as broken, and the style eats readability budgets fast |
| Retro and nostalgic (Y2K, Vaporwave, Retro-futurism, Pixel art, Vintage analog) | Period palettes, chrome/neon, grain, bitmap type | Music, gaming, fashion, nostalgia marketing | B2B, healthcare, finance, elderly users | Novelty decays quickly; period accuracy matters (a vague "retro wash" is decoration, not direction) |
| Immersive and dimensional (3D/Hyperrealism, Spatial UI, HUD/Sci-Fi FUI, Cyberpunk) | WebGL/3D, parallax depth, glowing chrome | Gaming, product configurators, space/defense/security theater | Text-heavy content, low bandwidth, accessibility-critical | Heavy perf cost; motion sickness risk; HUD chrome buries data (dashboards want recessive chrome, file `references/dataviz/03-marks-interaction-figures.md`) |
| Organic and calm (Biophilic, Nature Distilled, Biomimetic, Soft pastels) | Earth tones, rounded organic shapes, texture, generous air | Wellness, sustainability, food/artisan, meditation, care | Tech-forward tools, urgent/critical workflows | Sage-green-on-cream sits inside the "tasteful default" AI tell; earn it with subject-specific materials, not a palette swap |
| Editorial (Magazine grids, Kinetic typography, Parallax storytelling, Bento) | Column grids, mixed serif/sans, large display type, scroll choreography | Publications, brand stories, marketing, annual reports | Dashboards, forms, real-time data, SEO-critical long-form (heavy scroll effects) | Bento-as-default is a tell; kinetic/scrolljacking needs reduced-motion parity and a reading-order fallback |
| Utility dashboard (Data-dense, Executive summary, Real-time monitoring) | Density, tabular numerals, status color, recessive chrome | BI, ops/monitoring, finance internals, admin | Marketing surfaces, consumer onboarding | Density is a discipline, not a look: spacing rhythm and type caps (`references/design/02-typography.md`) or it collapses into noise |
| Dark-native (OLED dark, Terminal/CLI, Cinema dark) | True-dark surfaces, luminous status color, tabular numerals in data | Dev tools, media/streaming, trading, night-use apps | Print-first content, outdoor/high-brightness use, warmth-critical brands | Dark mode is designed, not inverted (`references/design/01-color-oklch.md` dark-surface craft); pure-black + neon everywhere is a tell; Terminal/CLI: mono stays inside the actual terminal pane; mono + uppercase + tracking on chrome, labels or stats is catalogue T13 (maintainer-banned) |
| AI-native (Conversational, streaming-first) | Chat/command surfaces, streaming output, suggestion chips | Copilots, assistants, generative tools | Traditional forms, data-entry-heavy work | The "AI purple gradient" is the single most-cited tell; see §7 for the interaction patterns that actually matter |

## 2. Domain Conventions

Reader expectations by product domain, distilled from ~160 domain-reasoning rules. These are conventions to honor or deliberately subvert, never a substitute for the POV brief. Recurring hard rule: trust-critical domains (finance, legal, government, medical, insurance) ban decorative purple/pink gradients outright; that pattern now reads as "AI-generated" to their audiences. "Blue" in this table means hue 200-250 at any chroma, or chroma below 0.15 above hue 250 (the catalogue's deep-prussian 235, deep-cyan 205 and dust-blue 260/c0.045 replacements). Tailwind `blue-500`/`blue-600` (hue ~260, chroma 0.19-0.22) sit inside catalogue C3's window and are HIGH regardless of the trust rationale.

| Domain cluster | Structure that converts | Color mood | Type mood | Standing cautions |
|---|---|---|---|---|
| SaaS / B2B / productivity | Hero + features + CTA; interactive demo for tools | Trust blue family + one warm accent | Professional, clear hierarchy | Excessive animation; dark-by-default; hidden pricing |
| Fintech / banking / crypto | Trust-and-authority; visible credentials | Navy/deep blue + restrained gold or green | Trustworthy, tabular numerals | Playful tone; unclear fees; purple/pink gradients |
| Legal / government / insurance | Minimal and direct; plain language | High-contrast professional blue + neutrals | Large, clear, accessible | Ornate decoration; low contrast; motion effects |
| Healthcare / medical / senior care | Social proof + trust; large targets | Calm blue + health green, warm neutrals | Readable, 16px+ body (18px+ senior) | Neon; motion-heavy; small text; dark-first |
| Wellness / meditation / care | Storytelling; soft surfaces | Ultra-calm pastels; at most ONE of {cream surface, sage accent} (two together is the catalogue's Tasteful Default, HIGH) | Soft, humanist | Derive the accent from the subject's materials (linen, clay, water, wood), not from the sage/cream average; a serif display on top makes it three of three |
| Education / kids / habit apps | Feature tour + progress mechanics | Playful primaries, progress green, warm streak colors | Friendly, rounded | Muted "corporate" palettes kill it; dark modes for kids |
| E-commerce / marketplace | Feature-rich catalog; social proof | Brand primary + success green; luxury goes near-monochrome + gold | Engaging or refined by tier | Text walls; flat catalogs without depth cues; low trust signals |
| Food / hospitality / travel | Hero-centric, image-led | Appetizing warm (terracotta/orange/brown) or destination-vibrant | Warm, inviting | Poor photography defeats any style choice; complex booking flows; terracotta is the Tasteful Default's accent variant (aesthetic/01 §2 calibration), so at most one of {cream surface, terracotta accent} without a stated reason |
| Creative / portfolio / agency | Storytelling-driven; the work leads | Bold, artist-controlled; often monochrome + one loud accent | Expressive display type | Corporate templates; hidden work; timidity |
| Media / streaming / music | Dark-native, content-forward | Dark surfaces + content-derived accents | Bold, high-contrast on dark | Pure-white backgrounds; chrome competing with content |
| Dev tools / technical | Dark-native, docs-forward | Editor-dark + syntax accents, blue focus | Functional sans, tabular numerals; mono only inside code/log content | Light-only; slow perceived performance; decoration; mono leaking out of code panes into chrome |
| Community / social | Feature-rich + presence signals | Vibrant, engagement-forward | Modern, bold | Skeuomorphic clutter; ignoring accessibility at scale |
| Internal tools / admin | Data-dense dashboard | Functional neutrals + status colors (reserved, `references/dataviz/02-color-jobs-and-validation.md`) | Clear, tabular numerals | Decoration of any kind; status colors leaking into series colors |

## 3. Landing-Page Structures

Eight structural patterns; pick by what the visitor must decide, then let the POV style it -- then take each section's architecture and the page's rhythm rules from `references/design/10-hero-and-section-architectures.md`, which is subordinate to the order chosen here.

| Pattern | Section order | Primary CTA | Right when | Hazard |
|---|---|---|---|---|
| Hero + features + CTA | hero, value prop, features, CTA | sticky hero + bottom | SaaS/product only when the content genuinely has nothing to lead with | The L1 skeleton. CRITICAL if the section list ships unmodified, HIGH if partially customized (catalogue L1, §11); before choosing it, check the catalogue's "Layout compositions to consider instead of the SaaS scaffold" table |
| Hero + testimonials + CTA | hero, problem, solution, proof, CTA | hero + post-proof | Trust gap to close | L1 plus proof; same rule |
| Product demo + features | hero, live demo/video center, features | beside demo | The product sells itself visually | The demo is the real product; a generated screenshot card beside the hero is the Tasteful Default's companion tell (catalogue § The Tasteful Default) |
| Minimal single column | headline, one paragraph, benefits, CTA | center, large | Indie/consulting/micro-SaaS | A centered narrow column is catalogue T10 / D14 unless the headline is a full-bleed single statement; left-align or break the measure |
| Funnel (3-step) | hero, problem, solution, outcome, CTA | mini-CTA per step, main at end | Considered purchases | The horizontal 3-box-with-arrows process is the highest-slop-risk section architecture (design/10 §6); stack the steps |
| Comparison table + CTA | hero, problem, table, CTA | in table's right column | Switching-cost decisions | Only when the differentiators are real; a matrix of shared features is padding (design/10 §6 pricing note) |
| Lead magnet + form | benefit headline, magnet preview, form | the submit button | Email capture | Visible labels above inputs, never placeholder-as-label or a floating label (catalogue S6, HIGH) |
| Pricing + CTA | pricing headline, tier cards, FAQ | per card + sticky nav | Plan-selection traffic | The floating "Most Popular" badge on the middle tier is Strongest-10 #5 / S11 (HIGH); distinguish the recommended plan by size and position instead |

A page whose section list reproduces the L1 scaffold unmodified is the catalogue's CRITICAL tell regardless of section architecture.

## 4. Font Pairing Seeds

Mood-keyed starting points; the full type system (scale caps, display tightening, loading) lives in `references/design/02-typography.md`, and its overused-defaults table outranks this one. Pairings marked "worn" are recognizable as template choices in 2026: keep the structure, swap the faces.

| Mood | Seed pairing (display + body) | Note |
|---|---|---|
| House default (any mood, 2026-07-17 directive) | SF Pro / system stack throughout; Poppins display for modern-elegant moments | The fleet's main go-to -- reach here first; weight + optical size differentiate. On web, "SF Pro" means the `-apple-system` system stack (never self-host SF Pro files) |
| Tech/startup | Space Grotesk + DM Sans (weights and tracking tuned, never the unmodified shadcn dashboard defaults) | Solid; consider Söhne to sharpen it |
| Minimal Swiss | Single sans throughout (Söhne, Untitled Sans; Geist only with tuned weights and tracking and never the stock Geist Sans + Geist Mono stack -- catalogue T4) | One family, weights and optical sizes do the work |
| Editorial classic | Cormorant Garamond + Source Serif 4 | Serif + serif works when measure and leading are disciplined. Cormorant is on the catalogue's cream-serif-sage serif list: keep the page off cream and sage or mark `anti-slop-allow` |
| Elegant luxury | High-contrast serif + humanist sans (e.g. GT Sectra + Söhne) | Playfair Display + Inter is the worn version of this idea |
| Bold statement | Compressed display (Bebas-like) + neutral sans | Display face for headlines only, never UI chrome |
| Warm/wellness | Source Serif 4 or Recoleta + Raleway or a humanist sans (Lora is catalogue-banned as a primary) | Watch the cream-sage tell; type alone will not save it |
| Developer/technical | IBM Plex Sans or Söhne (display + body, weight range for hierarchy) | System-honest sans throughout; tabular numerals in data; mono reserved for actual code blocks |
| Playful/kids | Rounded display (Fredoka-like) + Nunito | Keep body legibility boring; the display carries the fun |
| Geometric modern | Outfit + Work Sans | Neutral-modern without reaching for Inter |

## 5. Icon Discipline

- **One family, chosen deliberately.** Phosphor and Heroicons are dependable defaults with full-set coverage; Lucide-everywhere is a documented AI tell, so if Lucide, make it a choice with a reason. Never mix families at the same hierarchy level.
- **Consistency contracts:** one stroke width per visual layer (1.5px or 2px); filled vs outline assigned per hierarchy level, not per whim; sizes as tokens (icon-sm/md/lg, md = 24px matching text line-height per `references/design/07-depth-and-overlays.md`); baseline-aligned beside text.
- **Never emoji as structural icons.** Font-dependent, platform-inconsistent, untokenable. Vector only; SVG that themes with `currentColor`.
- **Touch targets:** the icon can be 20-24px, the hit area is 44px minimum (expanded hit area, not a bigger glyph).
- **Brand logos:** official assets, original proportions, required clear space. Never recolor or redraw a third-party mark.
- **Contrast:** 3:1 minimum for meaningful glyphs, 4.5:1 when the icon is small or carries text-equivalent meaning.

## 6. Motion Intensity Ladder

Set the tier in the POV brief, then implement per `references/design/04-motion.md` (springs, View Transitions, scroll-driven animations). Reduced-motion parity is non-negotiable at every tier.

| Tier | Vocabulary | Feels like | Budget |
|---|---|---|---|
| Subtle | Opacity/lift hovers, fade-in reveals, skeleton shimmer | The product is stable and fast | 100-200ms, ease-out; nothing moves more than a few px |
| Standard | Staggered list/grid entrances, slide-up section reveals, route fades | Considered, alive | 200-350ms; stagger 30-50ms/item (design/04 §9 product lane; cinematic marketing 80-120ms with 4-6 items); one choreographed moment per view |
| Complex | Scroll-scrubbed storytelling, shared-element/hero morphs, split-text reveals | A production | Reserved for marketing/storytelling; never product chrome; orchestrate one sequence rather than scattering effects |

## 7. AI-Product Surface Patterns

For AI-native products (§1), the interaction contract matters more than the gradient:

- **Streaming output:** render progressively with a stable layout (no reflow jumps), a visible generation-in-progress affordance, and a stop control.
- **Provenance and disclaimer:** model-generated content is labeled once, quietly, near the output, not as a modal apology.
- **Feedback loop:** lightweight per-output rating (useful/not) placed at the end of the output, wired to something real.
- **Trust chrome:** citations/sources when the product claims facts; visible loading states under 100ms of action.

## 8. Cross-References

| Need | File |
|---|---|
| The POV method this vocabulary feeds | `references/aesthetic/01-point-of-view.md` |
| Complete committed token systems (both schemes, stated ratios) | `references/aesthetic/01-point-of-view.md` §3 |
| Case studies of committed systems | `references/aesthetic/02-distinctive-systems.md` |
| Per-section architectures and visual-rhythm rules | `references/design/10-hero-and-section-architectures.md` |
| Pre-ship taste audit | `references/aesthetic/03-taste-checklist.md` |
| The tells several seeds sit adjacent to | `references/catalogue/01-ai-tells.md` |
| Type scale, loading, overused-defaults table | `references/design/02-typography.md` |
| Chart form/color when the domain is a dashboard | `references/dataviz/01-choosing-a-form.md` |
