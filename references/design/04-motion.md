---
topic: design
role: reference
scope: motion
audience: ui-designer
---

# Motion

Spring physics, native CSS easing, View Transitions API, scroll-driven animations, performance budgets, reduced motion, micro-interactions, stagger orchestration, review heuristics, and platform-specific motion APIs (Web/SwiftUI/Compose). Reference for every animated decision and every motion review.

Primary sources cited inline: MDN, web.dev, Chrome developer docs, and the scroll-driven-animations reference site.

## 1. What good motion looks like

| Principle | What to look for |
|---|---|
| Purposeful | Motion communicates state change, spatial relationship, or feedback — not decoration |
| Fast enough | Micro-interactions: 150-300ms. Page transitions: 200-500ms. Longer often feels sluggish |
| Natural curves | Spring physics > cubic-bezier for interactive elements. Ease-out for enter, ease-in for exit |
| Interruptible | User input can cancel or reverse in-flight motion |
| Non-blocking | UI remains usable during transitions; content accessible before animation completes |
| Property choice | Prefer `transform`/`opacity`/`filter`/`clip-path` (compositor-safe) over layout-affecting properties |
| Reduced-motion aware | Decorative motion disabled or softened when user asks for less motion |
| Consistent | Similar interactions produce similar motion across the product |

## 2. Spring physics over duration-based easing

Springs are described by physical parameters (stiffness, damping, mass), not a duration. They overshoot, settle, and inherit velocity from gestures — they feel alive in a way no cubic-bezier ever will.

The current standard JS library is [Motion](https://motion.dev) (formerly Framer Motion, now framework-agnostic).

```ts
import { animate } from "motion";

// Spring (no duration; physics decides)
animate("#card", { x: 100, opacity: 1 }, {
  type: "spring",
  stiffness: 300,   // higher = stiffer/snappier
  damping: 30,      // higher = less oscillation
  mass: 1,          // higher = more inertia
});

// React: framer-motion / motion/react
import { motion } from "motion/react";
<motion.div
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ type: "spring", stiffness: 320, damping: 28 }}
/>
```

| Easing model | Strength | Weakness |
|---|---|---|
| `cubic-bezier(...)` | Deterministic, 1-line CSS, perfect for predictable UI transitions | Always feels mechanical past ~300ms |
| `linear()` (CSS) | Multi-stop curves in pure CSS — approximate spring without JS | Verbose; no velocity inheritance |
| Spring (Motion / WAAPI) | Natural feel, gesture-velocity continuity, interruptible | JS dependency, harder to reason about timing |
| `spring(...)` (Safari TP / proposal) | Native CSS spring | Not yet baseline |

| Use | Pick |
|---|---|
| Tooltip, popover, dropdown reveal | `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quint) at 180ms |
| Button press, hover lift | `cubic-bezier(0.3, 0, 0, 1)` at 120ms |
| Card or panel that follows pointer/gesture | Spring with velocity inheritance |
| Page transition (FLIP/morph) | View Transitions API (see §4) |
| Scroll progress indicator | Scroll-driven animation (see §5) |
| Confirmation (toast), success animation | Spring `stiffness: 200, damping: 18` for satisfying overshoot |
| Destructive confirmation modal | Linear or ease — never bouncy |

### Spring physics reference (by use case)

Response/damping notation (0-1 scale) as an alternative mental model to stiffness/damping/mass, with duration-equivalents for quick calibration:

| Use case | Response | Damping | Duration equivalent |
|---|---|---|---|
| Micro-interaction (button press) | 0.6-0.8 | 0.6-0.8 | 100-200ms |
| Component enter/exit | 0.4-0.6 | 0.5-0.7 | 200-400ms |
| Page transition | 0.3-0.5 | 0.7-0.9 | 300-500ms |
| Drag release/snap | Variable | 0.5-0.7 | Context-dependent |

## 3. Native CSS easing functions

| Function | Use |
|---|---|
| `ease` | Default — start fast, end slow. Generic |
| `ease-in` | Exits — element leaves the viewport |
| `ease-out` | Entrances — element settles into place (default for most UI) |
| `ease-in-out` | Round trips, looping animations |
| `linear` | Progress bars, spinners, scroll-driven, anything that should not slow at the end |
| `cubic-bezier(x1, y1, x2, y2)` | Custom — pick from [easings.net](https://easings.net) |
| `linear(0, 0.25 30%, 0.75 70%, 1)` | Multi-stop curves; approximate spring shapes |
| `spring(mass stiffness damping initialVelocity)` | Safari TP — native spring with no JS |

```css
/* Recommended baseline tokens */
:root {
  --ease-out-quart:    cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-quint:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-expo:     cubic-bezier(0.19, 1, 0.22, 1);
  --ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
  --ease-overshoot:    linear(0, 0.5 40%, 1.04 65%, 0.98 80%, 1);

  --motion-fast:   140ms;
  --motion-base:   220ms;
  --motion-slow:   360ms;
}

button {
  transition: transform var(--motion-fast) var(--ease-out-quart),
              background-color var(--motion-fast) linear;
}
```

CSS suffices when: animation is deterministic, no gesture velocity, no choreography across many elements. Reach for JS (Motion) when you need orchestration, springs from gesture, or animating non-CSS values (canvas, SVG path morphs).

### Physics-derived spring curves in pure CSS

Beyond the single `--ease-overshoot` above, full spring character is expressible in CSS `linear()` today: plot a simulated spring's position at discrete stops and let the browser interpolate. Three curves generated from named physics (mass 1 throughout), with the durations that match their settle -- adapted from [VibeCurb](https://github.com/Yu-369/VibeCurb) (MIT, Copyright (c) 2026 Yu-369):

```css
:root {
  /* SNAPPY -- stiffness 400, damping 30: explosive start, ~2% overshoot, soft settle.
     The default arrival curve: entries, reveals, modal opens. */
  --spring-snappy: linear(
    0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938 16.7%,
    1.017 19.4%, 1.067 22.5%, 1.089 26%, 1.079 30.3%, 1.049 36%,
    1.024 42.6%, 1.011 50.3%, 1.004 59.2%, 1.001 69.3%, 1);
  --spring-snappy-duration: 0.55s;

  /* SMOOTH -- stiffness 200, damping 24: gentle acceleration, ~5% overshoot,
     two-phase settle. Position changes: tab switches, carousels, panel moves. */
  --spring-smooth: linear(
    0, 0.004, 0.016 2.3%, 0.063 4.7%, 0.141 7.2%, 0.25 9.9%,
    0.601 16.5%, 0.815 21%, 0.929 25.2%, 0.987 29%, 1.025 33.5%,
    1.042 38%, 1.04 43.5%, 1.027 50%, 1.013 57.5%, 1.005 67%, 1.001 79%, 1);
  --spring-smooth-duration: 0.7s;

  /* BOUNCY -- stiffness 500, damping 18: ~12% overshoot, visible bounce-settle.
     Sparingly: toggles, reactions, small badges. Never large surfaces,
     never destructive confirms (see §10). */
  --spring-bouncy: linear(
    0, 0.014, 0.055 1.8%, 0.218 3.7%, 0.867 8.5%, 1.085 10.7%,
    1.212 12.9%, 1.264 15%, 1.262 17%, 1.217 19.5%, 1.098 24%,
    1.035 28.5%, 0.993 33%, 0.981 38%, 0.988 45%, 0.998 55%, 1.001 68%, 1);
  --spring-bouncy-duration: 0.5s;
}
```

Motion (JS) equivalents when the same feel needs velocity inheritance: snappy `{ stiffness: 400, damping: 30 }`, smooth `{ stiffness: 200, damping: 24 }`, bouncy `{ stiffness: 500, damping: 18 }`. GSAP approximations: `power3.out`, `power2.inOut`, `back.out(1.7)`.

Curve-to-job guidance: springs carry things with mass (arrivals, position changes, press feedback); cubic-bezier carries what has none (color, opacity, background shifts); the `linear` keyword only on constant-rate loops (marquees, spinners). Spring overshoot on hover reads as jitter -- hovers stay on the fast bezier tokens above.

### The three-curve maximum and motion personality

Cohesion is the strongest single predictor of whether motion reads as designed. Lock ONE motion personality per product -- surgical (fast, zero overshoot: dev tools, dashboards), physical (spring-based, tactile: consumer product, native-adjacent), or cinematic (dramatic, slow-build: marketing narrative) -- and pick at most THREE curves for the whole surface: one primary (entries/reveals), one secondary (state changes), one utility (hover/feedback). Every animation uses one of the three, declared once as tokens. Reaching for a fourth curve means one of the three was chosen wrong. A page where fade-ups, bouncy springs, and slide-lefts coexist reads as committee-built even when each animation is individually fine -- and grep makes the palette auditable: a curve literal at a call site instead of a token is the drift.

## 4. View Transitions API

Native cross-fade or FLIP-style morphing across same-document state changes (SPA) and across navigations (MPA). GPU composited, off-main-thread. Support is stated once, in the § 4 status table below; the two halves of the API do not ship together, so check which one you are using.

### Same-document (SPA-style)

```ts
// Wrap any DOM update — old + new state are snapshotted, browser cross-fades
if (!document.startViewTransition) {
  applyUpdate();
} else {
  document.startViewTransition(() => applyUpdate());
}
```

### Cross-document (MPA / Astro / Next App Router)

```css
@view-transition { navigation: auto; }
```

That single line opts the entire site into cross-document transitions. The user navigates `/foo` -> `/bar` and the browser cross-fades automatically.

### Named transitions for FLIP morphing

Give matching elements the same `view-transition-name` and the browser morphs position, size, and opacity between them.

```css
/* Persistent header that morphs across pages */
.site-header { view-transition-name: site-header; }

/* Article hero image expands into next page hero */
article-card .hero  { view-transition-name: var(--hero-id); }
article-page .hero  { view-transition-name: var(--hero-id); }

/* Tune the morph */
::view-transition-old(site-header),
::view-transition-new(site-header) {
  animation-duration: 300ms;
  animation-timing-function: var(--ease-out-quint);
}

/* Different motion for back navigation */
:root:active-view-transition-type(backwards) {
  &::view-transition-old(root) { animation-name: slide-out-right; }
  &::view-transition-new(root) { animation-name: slide-in-left; }
}
```

| Pseudo-element | Selects |
|---|---|
| `::view-transition` | Root overlay |
| `::view-transition-group(name)` | Container holding old + new for one named element |
| `::view-transition-image-pair(name)` | Holds the actual snapshots |
| `::view-transition-old(name)` | Outgoing snapshot |
| `::view-transition-new(name)` | Incoming snapshot |

### Modern CSS motion feature status

This table is the single statement of support for the features in this file. Sections 4 and 5 reference it rather than restating versions.

| Feature | Chrome | Safari | Firefox | Notes |
|---|---|---|---|---|
| View Transitions, same-document (`document.startViewTransition`) | 111+ | 18+ | 144+ | Feature-detect with `if (!document.startViewTransition)` |
| View Transitions, cross-document (`@view-transition { navigation: auto }`) | 126+ | 18.2+ | Not shipped | Degrades to a normal navigation, so it is safe to ship unguarded |
| Scroll-driven animations (`animation-timeline`, `scroll()`, `view()`) | 115+ | 26+ (Sept 2025) | 144+ | **Safari 18.x has no support.** Guard with `@supports (animation-timeline: view())` |
| CSS `@starting-style` | 117+ | 17.5+ | 129+ | Entry animations for elements coming out of `display: none` |
| CSS Anchor Positioning | 125+ | Not shipped | Not shipped | Tooltip and popover positioning; needs a JS fallback today |

References: [MDN View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), [Chrome view-transition-types](https://developer.chrome.com/docs/web-platform/view-transitions).

## 5. Scroll-driven animations

Animation timeline driven by scroll position, fully native CSS, runs on the compositor. Zero JS, zero main-thread cost. Support: see the § 4 status table. The one number worth repeating is that **Safari 18.x does not support this**, so every reveal-on-scroll must degrade to the visible state rather than to `opacity: 0`.

```css
/* Reading-progress bar — scroll() ties to page scroll */
.progress {
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  block-size: 3px;
  background: var(--accent);
  transform-origin: 0 50%;
  animation: progress linear;
  animation-timeline: scroll(root block);
}
@keyframes progress {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* Reveal-on-scroll: view() ties to the element entering the scrollport.
   Authored fill-safe: the element is visible by default and the hidden state
   only exists where animation-timeline is supported. Without the @supports
   guard, Safari 18.x renders .reveal at opacity 0 forever, because `both`
   applies the from-state and the timeline never advances. */
.reveal { opacity: 1; translate: 0 0; }

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal {
      animation: reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 30%;
    }
  }
}
@keyframes reveal {
  from { opacity: 0; translate: 0 2rem; }
  to   { opacity: 1; translate: 0 0; }
}

/* Parallax hero — slower than scroll */
.hero img {
  animation: parallax linear;
  animation-timeline: view();
  animation-range: cover 0% cover 100%;
}
@keyframes parallax { to { translate: 0 -20%; } }
```

| Timeline function | What it ties to |
|---|---|
| `scroll(<scroller>)` | Position of a scroll container |
| `scroll(root)` | Document scroll |
| `view(<axis> <inset>)` | Element's intersection with its scrollport |
| `view-timeline-name: --foo` (decl) + `animation-timeline: --foo` (consumer) | Named timelines for cross-element coordination |

| Range keyword | Where animation runs |
|---|---|
| `entry` | Element entering scrollport (0% just below, 100% bottom edge crossed top) |
| `exit` | Element leaving scrollport |
| `cover` | Element fully in view |
| `contain` | Scrollport fully inside element (long elements) |

References: [MDN scroll-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-timeline), [scroll-driven-animations.style](https://scroll-driven-animations.style).

Scope rule: scroll-driven animation is polish, never a correctness mechanism. Nothing the user needs in order to read, understand, or operate the page may depend on a scroll timeline having advanced, because three things can independently stop it: an unsupported browser, `prefers-reduced-motion: reduce`, and a scroll container that never scrolls (short viewport, zoomed-in user, printed page). Always author the visible state as the default and add the animation under both an `@supports` guard and a reduced-motion guard, as above.

## 6. Animation performance budget & compositor-safe properties

Stay on the compositor. 16.7ms per frame at 60fps; 8.3ms at 120fps.

| Tier | Properties | Cost |
|---|---|---|
| Compositor only (prefer these) | `transform` (`translate()`, `scale()`, `rotate()`), `opacity`, `filter` (blur, brightness, etc.), `clip-path`, `backdrop-filter` | GPU only — free at scale |
| Paint | `background-color`, `box-shadow`, `border-color`, `color` | Repaint, no layout |
| Layout (avoid animating) | `width`, `height`, `min-*`, `max-*`, `top`, `right`, `bottom`, `left`, `margin`, `padding`, `border-width`, `font-size` | Full layout recalc per frame |

```css
/* DO — composite-only */
.card:hover { transform: translateY(-4px); opacity: 0.96; }

/* DON'T — triggers layout every frame */
.card:hover { margin-top: -4px; padding: 1.05rem; }
```

`will-change` opts an element into compositor promotion *before* the animation starts. Apply briefly:

A `will-change` declared on the same selector that triggers the change is a no-op: `:hover` and the transition it starts land in the same frame, so the browser gets no lead time to promote the layer, which is the entire purpose of the property. All it buys is layer-promotion churn on every pointer pass.

Give the browser actual lead time. Either hint from an ancestor or precursor state:

```css
/* Pointer is in the grid, so a card hover is imminent. Promotion happens now. */
.card-grid:hover .card { will-change: transform; }
.card { transition: transform 180ms var(--ease-out-quint); }
.card:hover { transform: translateY(-2px); }
```

or set it imperatively and clear it when the animation ends:

```ts
el.style.willChange = "transform";
el.addEventListener("transitionend", () => { el.style.willChange = "auto"; }, { once: true });
```

Permanent `will-change` allocates GPU memory forever. Apply `will-change: transform` to 50 cards = 50 layers = stutter. The ancestor form above has the same problem at scale, so scope it to a grid that holds tens of cards, not hundreds, or use the imperative form.

References: [csstriggers.com](https://csstriggers.com), [web.dev animation perf](https://web.dev/articles/animations-overview).

## 7. `prefers-reduced-motion`

Vestibular disorders and motion sensitivity affect 35%+ of users to some degree. Always honor the preference. Default: motion off; opt in for users who accept it. Correct mental model: motion as progressive enhancement, not a bolt-on kill switch.

```css
/* Default-safe — no decorative motion */
.card { opacity: 1; transform: none; }

/* Add motion only for users who didn't opt out */
@media (prefers-reduced-motion: no-preference) {
  .card {
    animation: fade-in 0.3s var(--ease-out-quart) both;
    animation-timeline: view();
  }
}

/* Last-resort kill switch (never the only line of defense) */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Better than disabling: replace movement with a crossfade. Replace springs with linear opacity. Reference: [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).

### What "reduced motion" means for different animation types

| Animation type | Reduce to |
|---|---|
| Decorative entrance | Remove entirely |
| Functional transition (page/state) | Instant crossfade or simple opacity |
| Loading/progress indicator | Keep, but simplify |
| Scroll-driven parallax | Remove |
| Micro-interaction feedback | Keep if < 100ms, remove if longer |

## 8. Micro-interaction patterns

| Pattern | CSS / behaviour |
|---|---|
| Button press | `transform: scale(0.96)` on `:active`, 80ms ease-out |
| Card hover lift | `transform: translateY(-2px)`, 180ms `--ease-out-quint`, optional shadow grow |
| Focus ring | `outline: 2px solid var(--accent); outline-offset: 2px;` on `:focus-visible` only |
| Loading shimmer | Linear gradient + `background-position` animation; only if data takes >500ms |
| Disabled state | `opacity: 0.55; cursor: not-allowed;` plus `pointer-events: none` if non-interactive |
| Toggle / switch | Spring with `stiffness: 700, damping: 32` — snappy with slight settle |
| Checkbox check-mark draw | `stroke-dashoffset` animation 220ms |
| Toast slide-in | Translate from off-screen, spring `stiffness: 320, damping: 28` |
| Outcome confirmation ("Copied!") | Hover/press states confirm the *input*; a chip that slides up over the control confirms the *outcome*. Copy buttons, save actions, and add-to-list controls need this second layer — translate up 4-8px + fade, auto-dismiss ~1.2s. Without it the user cannot tell the action landed |
| Skeleton placeholder | Avoid if data is fast (<300ms). Use a delayed reveal, not a perpetual shimmer |
| Modal entry | Backdrop fade 160ms linear; dialog scale `0.95 -> 1` + opacity, 220ms `--ease-out-quart` |

```css
button {
  transition: transform 80ms cubic-bezier(0.3, 0, 0, 1),
              background-color 120ms linear;
}
button:active { transform: scale(0.96); }

.card {
  transition: transform 180ms var(--ease-out-quint),
              box-shadow 220ms var(--ease-out-quint);
}
.card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -12px rgb(0 0 0 / 0.18); }

button:focus-visible,
[role="link"]:focus-visible {
  outline: 2px solid color-mix(in oklch, var(--accent), white 12%);
  outline-offset: 2px;
  border-radius: inherit;
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--accent) 22%, transparent);
}
```

## 9. Stagger and orchestration

Staggered entries communicate hierarchy. Cap at 30-50ms per item; >80ms feels slow.

CSS-only stagger via `--i` custom property + `animation-delay`:

```css
.list-item {
  animation: fade-up 240ms var(--ease-out-quart) both;
  animation-delay: calc(var(--i, 0) * 40ms);
}
@keyframes fade-up {
  from { opacity: 0; translate: 0 12px; }
  to   { opacity: 1; translate: 0 0; }
}
```

```html
<li class="list-item" style="--i: 0">…</li>
<li class="list-item" style="--i: 1">…</li>
```

Motion's `stagger()` for choreography across many items, gestures, or springs:

```ts
import { animate, stagger } from "motion";

animate(".list-item", { opacity: 1, y: 0 },
  { delay: stagger(0.04, { from: "first" }), type: "spring", stiffness: 320, damping: 30 }
);
```

| Pick | When |
|---|---|
| CSS `animation-delay` | Static lists, no gesture, no interruption |
| Motion `stagger()` | Gesture-driven lists, springs, or where order may change at runtime |

System rules for any stagger: order by VISUAL HIERARCHY (container, primary content, supporting text, actions, decoration), never by DOM order; stagger at most 6-8 items individually and bring the remainder in as one batch (a 12-step stagger is a forced 1+ second wait); the whole entry sequence completes inside ~800ms; a stagger plays once per arrival, never on every state refresh. The 30-50ms increment above is the product-UI lane; a cinematic marketing page can stretch to ~80-120ms per item where the reveal IS the content, and no further -- past that it reads as buffering.

## 10. Motion anti-patterns

| Anti-pattern | Why it's a problem | Severity | Replace with |
|---|---|---|---|
| No `prefers-reduced-motion` fallback | Accessibility requirement, vestibular disorders | CRITICAL | Default-safe + opt-in motion under `no-preference` |
| Motion that delays access to content | Content exists but user can't interact until animation finishes | HIGH | Make content accessible before animation completes |
| Animating `width`/`height`/`top`/`left`/`margin` | Triggers layout recalculation every frame, causes jank | HIGH (perf-sensitive paths) | `transform`, `clip-path`, `inset` with compositor properties |
| Loading spinners without timeout or fallback | Infinite spinners erode trust | HIGH | Timeout + error/retry state |
| Decorative-only animations | Slower, distracting, no information communicated | MEDIUM-HIGH | Animate state changes only; static content stays static |
| Parallax or scroll effects that fight the task / break scroll prediction | Distracts from content, vestibular triggers, fights browser scroll | MEDIUM-HIGH | Subtle (max 10-20% offset), wrap in reduced-motion guard |
| Bouncy spring on destructive confirm | Trivializes serious action; content flashes past edges | MEDIUM | Linear or ease for confirms; springs on celebratory moments only |
| Transitions > 500ms (800ms+) for micro-interactions | Feels sluggish, delays task completion | MEDIUM | Cap UI duration at 360ms; reserve longer for narrative motion |
| Entrance animations on every page load | Repetitive, annoying on repeat visits | MEDIUM | Play once per session, or gate behind first-visit state |
| Animating *everything* | Decoration overload — nothing reads as important | MEDIUM | Animate state changes only; static content stays static |
| Autoplay video without gesture | Bandwidth waste, accessibility violation | MEDIUM | Click-to-play or `<video preload="none" muted>` with intent |
| Permanent `will-change` on every card | Eats GPU memory, 50 layers = stutter | MEDIUM | Apply just before animation, release after |
| `transition: all` | Animates unintended properties (color, layout) on theme switch | MEDIUM | List explicit properties |
| Scroll-jacking carousels | Removes user scroll control | MEDIUM | Native scroll-snap + scroll-driven animation |
| Skeleton screens for sub-300ms loads | Adds perceived latency | LOW-MEDIUM | Just render the data; no shimmer |
| Animations that restart when scrolling back | Performative, not functional | LOW-MEDIUM | Play-once via `animation-play-state` guard or `IntersectionObserver` |
| Hover-only reveals on touch UI | Touch has no hover | LOW-MEDIUM | Tap-to-toggle or always-visible on touch via `(hover: hover)` MQ |
| Mixed motion personalities (springs here, dramatic curves there, snaps elsewhere) | Each fine alone; together the page reads committee-built | MEDIUM | Lock one personality; enforce the three-curve maximum (§3) |
| Entrances from `scale(0)` | Nothing physical appears from nothingness; reads as a render glitch | LOW-MEDIUM | Start at `scale(0.9)`-`scale(0.97)` paired with opacity |
| Only keyword easings (`ease`, `ease-in-out`) across a file | The browser's "nobody decided" curves; no motion was designed | LOW-MEDIUM | Name curves from the token palette; keyword easing kept only as a stated choice |

### Motion tooling

| Job | Tool |
|---|---|
| See which properties a given CSS change triggers (layout / paint / composite) | [csstriggers.com](https://csstriggers.com) |
| Confirm a frame budget claim with real evidence | Chrome DevTools Performance panel: record, then read the Frames track and the Layers panel for unexpected promotions |
| Count composited layers | Chrome DevTools **Layers** panel; **Rendering** panel with "Layer borders" and "Paint flashing" on |
| Verify reduced-motion behaviour without changing OS settings | DevTools Rendering panel: "Emulate CSS media feature prefers-reduced-motion" |
| Author and preview scroll-driven timelines | [scroll-driven-animations.style](https://scroll-driven-animations.style) tool collection |
| Pick or tune a cubic-bezier | [easings.net](https://easings.net), [cubic-bezier.com](https://cubic-bezier.com) |
| Convert a spring to a CSS `linear()` curve | [linear-easing-generator](https://linear-easing-generator.netlify.app) |
| Springs, stagger, gesture velocity in JS | [Motion](https://motion.dev) |

## 11. Evidence requirements for motion findings

| Claim | Minimum evidence |
|---|---|
| "Animation is excessive/sluggish" | Video or trace + timing metadata |
| "Reduced motion is ignored" | Reduced-motion mode run or code/config evidence |
| "Animation causes jank" | Trace/video showing frame drops, or layout-triggering property identification |
| "Animation delays content access" | Trace timing showing content inaccessible during animation |
| "Spring feels wrong" | Compared against reference parameters + subjective assessment |

## 12. Platform-specific motion expectations

### Web
- View Transitions API for page transitions
- `scroll-timeline` for scroll-driven effects
- `@starting-style` for element entry
- Spring physics via Motion library or CSS springs

### Apple (SwiftUI)
- `withAnimation(.spring)` for state changes
- `matchedGeometryEffect` for shared element transitions
- `PhaseAnimator` / `KeyframeAnimator` for complex sequences
- `.sensoryFeedback` for haptic confirmation
- `symbolEffect` for SF Symbol animations

### Android (Compose)
- `animateContentSize()` for layout changes
- `AnimatedVisibility` for enter/exit
- `spring()` spec for physics-based motion
- `Animatable` for custom animations
- Shared element transitions via navigation
