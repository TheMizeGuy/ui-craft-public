---
topic: design
role: reference
scope: depth
audience: ui-designer
---

# Depth, Shadows, Overlays, and Control Geometry

Shadow tuning, elevation logic, text-over-image overlays (gradient scrim, progressive blur), icon sizing, ghost buttons, and button padding ratios. Reference for every depth or image-legibility decision and the geometry of small controls.

Cross-ref: `references/design/01-color-oklch.md` § Dark-mode surface craft for elevation on dark surfaces; `references/aesthetic/06-substance-floor.md` § 5 for the dark-mode rim rule and the floor an elevation system has to clear; `references/performance/03-css-perf.md` for the cost of `backdrop-filter`.

## 1. Shadow tuning

Most shipped shadows are too strong. The two-move fix: **reduce opacity, raise blur**. A shadow at `0 4px 8px rgb(0 0 0 / 0.25)` announces itself, while `0 12px 32px -8px rgb(0 0 0 / 0.10)` shapes depth without being seen.

| Rule | Detail |
|---|---|
| Strength scales with layer distance | Cards resting on the page take the weakest shadows; content floating *above* content — popovers, dropdowns, context menus, command palettes — takes visibly stronger ones. The shadow encodes how far the surface is from what's beneath it |
| Opacity down, blur up | High-opacity tight shadows read as outlines; low-opacity wide-blur shadows read as ambient depth |
| Negative spread keeps edges clean | `-8px` spread pulls the penumbra in from card corners so wide blur doesn't halo siblings |
| Elevation floor: three levels, every boundary measured | Resting (content on the page), raised (cards, panels, a sticky header), floating (popovers, menus, modals). Every boundary between adjacent levels is perceivable and checked: a tint step of at least `1.15:1`, or an edge -- border, rim or shadow -- of at least `1.3:1` against the surface it sits on, measured in pixels wherever a shadow does the work, because computed style cannot see a shadow (`references/aesthetic/06-substance-floor.md` S3, S4) |
| Litmus test, both ends | **If the shadow is the first thing you notice, it's wrong** -- shadow is felt, not seen. And the inverse: **if you cannot tell a panel from its page without reading the border, the elevation is under-built.** Same defect from the other side, and since 2026 the more common one. Both ends are judged on a render, never from the token file |

```css
:root {
  /* Elevation scale — tuned, not Tailwind's arithmetic defaults */
  --shadow-card:    0 1px 2px rgb(0 0 0 / 0.05), 0 8px 24px -12px rgb(0 0 0 / 0.10);
  --shadow-popover: 0 4px 12px rgb(0 0 0 / 0.08), 0 16px 48px -12px rgb(0 0 0 / 0.18);
  --shadow-modal:   0 8px 24px rgb(0 0 0 / 0.12), 0 32px 80px -16px rgb(0 0 0 / 0.28);
}
```

### Tactile (raised) buttons

Inner + outer shadow combine into a pressable, physical surface: a faint light inner highlight on the top edge plus a soft outer drop below. Reserve it for primary actions where the raised feel earns attention.

```css
.button-raised {
  background: var(--accent-default);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),   /* top inner highlight */
    inset 0 -1px 0 rgb(0 0 0 / 0.12),        /* bottom inner shade  */
    0 2px 6px -1px rgb(0 0 0 / 0.25);        /* soft outer drop     */
}
.button-raised:active {
  box-shadow:
    inset 0 1px 2px rgb(0 0 0 / 0.20);        /* pressed: depth inverts */
  transform: translateY(0.5px);
}
```

**Dark mode: the rim, not the drop.** Shadows barely register on dark backgrounds, so the lightness step carries part of the elevation — but the step on its own shipped at `1.0015:1` on a real screenshot while its tokens read as a clean `0.04` delta, so it is verified in pixels and never in tokens. The rest is the tactile button's inset top highlight generalised into a surface treatment: a raised panel in dark is found by the light it catches on its **top edge**.

```css
.panel-raised-dark {
  background: var(--surface-2);                 /* the tint step: >= 1.15:1 against the page */
  box-shadow:
    inset 0 1px 0 oklch(0.55 0.02 85 / 0.30),   /* top rim — the light the panel catches */
    0 2px 8px -2px oklch(0 0 0 / 0.55);         /* ambient contact, not a drawn box */
}
```

The rim measured `1.446:1` where a `1.40:1` border had been, one-sided so it never reads as an outline; macOS, Linear and Figma all light the top edge in dark and reserve drop shadows for light. Rasterise the boundary and scan across it to confirm. Full rule with the measurements behind it: `references/aesthetic/06-substance-floor.md` § 5. Ramp derivation: `references/design/01-color-oklch.md` § Dark-mode surface craft.

## 2. Text over images (overlays)

A botched overlay ruins both the image and the text. The escalation ladder:

| Treatment | Verdict |
|---|---|
| Text straight on the photo | Never ships. Legibility depends on whatever pixels happen to sit behind each glyph |
| Full-surface dim (`rgb(0 0 0 / 0.5)` over everything) | Readable but dulls the entire image — "doesn't do the image justice." Acceptable only when the image is genuinely background texture |
| **Linear gradient scrim** | The default answer. Transparent where the image should display, smoothly converging into a text-readable dark zone behind the copy |
| **Progressive blur + gradient** | The modern premium: blur ramps up toward the text zone on top of the gradient, so the transition zone keeps color while shedding detail |

```css
/* Gradient scrim: image shows, text zone converges to readable */
.image-card { position: relative; }
.image-card .scrim {
  position: absolute; inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    oklch(0.15 0.02 260 / 0.35) 55%,
    oklch(0.12 0.02 260 / 0.82) 100%   /* brand-tinted, not pure black */
  );
}
.image-card .copy { position: absolute; inset-block-end: 0; color: oklch(0.98 0 0); }
```

```css
/* Progressive blur: stack a masked backdrop-filter over the scrim */
.image-card .blur-layer {
  position: absolute; inset: 0;
  backdrop-filter: blur(16px);
  mask-image: linear-gradient(to bottom, transparent 40%, black 85%);
}
```

Rules: tint the scrim toward the brand or image palette rather than pure black; verify the text zone passes contrast against the *darkest converged region*, not the average; keep the gradient's start far enough up that the transition never bands across a face or focal subject. Reserve `backdrop-filter` for surfaces that earn it — a blur layer on every card is a performance and taste defect (see `references/performance/03-css-perf.md`).

## 3. Icon sizing and alignment

Most icons ship too large next to their text. Rule: **match the icon's box to the text's line-height, then tighten the gap**. A 15-16px label with 24px line-height takes a 24px icon. The icon fills the line box exactly, so rows align optically with no vertical fudging.

```css
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;              /* em: tracks the text size */
  font-size: 0.9375rem;    /* 15px */
  line-height: 1.6;        /* 24px line box */
}
.nav-link svg { inline-size: 1.5rem; block-size: 1.5rem; }   /* 24px = the line height */
```

Icons can also *replace* relational words: two location rows joined by a dotted connector say "from → to" without either label. Prefer icon + alignment over label text when the relationship is spatial or directional.

## 4. Ghost buttons and padding ratios

Sidebar and nav links are **ghost buttons**: buttons with no background until hover. Isolate one, center its content, give it a visible border or background, and it is the standard secondary CTA. In dialogs, forms and toolbars, primary (filled) + secondary (ghost) side by side is the standard two-action pattern. In a hero it is catalogue V6: one CTA (`references/design/10-hero-and-section-architectures.md` §3).

| Rule | Detail |
|---|---|
| Padding ratio, padding-authored buttons | Target **inline padding = 2x block padding**: `padding: 0.75em 1.5em`, or `padding: 16px 32px`. Square-ish padding reads cramped; the 2:1 ratio gives a button its pill proportions with or without an icon |
| Padding ratio, fixed-height buttons | At a fixed height the block padding is implied, not declared, so compute it before judging: **effective block padding = (height - line-box) / 2**. The floor is **inline padding >= 1.5x effective block padding**; 2:1 is still the target. A 40px button with a 20px line box has 10px effective block padding, so 16px inline is 1.6:1, which passes |
| Ghost hover | The hover state restores the background the ghost hides: same geometry, surface fades in. Never underline-only |
| One geometry per system | Filled, ghost, and destructive variants share identical padding, radius, and type size; only surface treatment changes |

Both idioms are legitimate; what is not legitimate is a system that mixes them without checking. The plugin's own Tailwind button ladder (`references/design/05-tailwind-v4.md` § 7) is fixed-height and lands at 2.0x / 1.6x / 2.0x across `sm` / `md` / `lg`, all inside the contract. Work the arithmetic before filing a padding finding against a `h-*` button, because the vertical padding is not in the class list.

```css
.button        { padding: 0.75em 1.5em; border-radius: var(--radius-control); }
.button-ghost  { background: transparent; }
.button-ghost:hover { background: oklch(0 0 0 / 0.06); }
```

## 5. Anti-patterns

| Anti-pattern | Why | Replace with |
|---|---|---|
| `shadow-md` on everything | Uniform shadow = no elevation information | Tuned scale; shadow strength tracks layer distance |
| Shadow as decoration on flat layouts | Noise; nothing is actually elevated | Flat surfaces + borders; reserve shadow for genuinely floating layers |
| White text directly on a hero photo | Legibility is luck | Gradient scrim converging behind the text zone |
| `rgb(0 0 0 / 0.6)` full-card dim as the default | Kills the image the design paid for | Bottom-weighted gradient; dim-everything only for background-texture imagery |
| 32px icons beside 14px labels | Icon shouts, baseline misaligns | Icon box = text line-height, then tighten the gap |
| `padding: 12px 14px` near-square buttons (1.17:1) | Cramped, non-pill proportions | Inline padding at 1.5x block padding minimum, 2x as the target |
| Judging a fixed-height button's padding from `px-*` alone | Vertical padding is implied by `h-*` minus the line box, so the ratio is not in the markup | Compute `(height - line-box) / 2` first, then apply the 1.5x floor |
| Blur layers on every card | GPU cost + glassmorphism-everywhere tell | Blur only on the one or two surfaces that earn it |
| Flat by default: no boundary anywhere clears `1.15:1` in tint or `1.3:1` in edge | Nothing is grouped and nothing is above anything; the surface reads as one grey field, which is the flat-terminal default rather than restraint | Build the three-level scale above and measure each boundary on the render (`references/aesthetic/06-substance-floor.md` S3) |
| A hairline at `0.10` alpha or less as the only boundary on a near-black ground | Computes to roughly `1.1:1` -- invisible at 100% zoom on anything but a calibrated display, and the single most recognisable part of the flat-terminal signature | Raise the border until it clears `1.3:1` against both surfaces it separates, or drop it in favour of the tint step plus the dark-mode rim above |
