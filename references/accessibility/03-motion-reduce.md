---
topic: accessibility
role: reference
scope: motion-reduce
audience: ui-engineer
---

# Reduced Motion — Reference for UI Engineers

`prefers-reduced-motion` is the OS-level signal that a user wants less animation. Honoring it is not optional. Source material: MDN, web.dev, W3C WAI.

## 1. Why `prefers-reduced-motion` matters

| Group | Symptom when motion is ignored |
|---|---|
| Vestibular disorders (benign paroxysmal positional vertigo, Meniere's, migraine-vestibular) | Parallax and large transforms trigger vertigo, nausea, disorientation |
| Motion sensitivity / motion sickness | Continuous scroll-driven animation, zoom-on-scroll, autoplay video |
| Photosensitive epilepsy | Already covered by 2.3.1 (no flash >3Hz); reduced-motion is a further signal |
| ADHD, autism, anxiety | Animated distractors on focus target; auto-scrolling carousels |
| Screen reader users | Animated content that shifts DOM mid-read is disorienting |
| Older devices / low battery | Motion is a user preference AND a power drain |

~1.5% of users have the OS preference set. Ignoring it breaks their session — vertigo-class symptoms can last hours.

### Which criterion to cite

Honoring `prefers-reduced-motion` is a platform expectation that sits ABOVE the AA floor, not an AA success criterion. Cite it honestly:

| What the motion is | Cite | Level |
|---|---|---|
| Auto-playing, blinking, or scrolling content that runs longer than 5s | 2.2.2 Pause, Stop, Hide | A |
| Anything flashing more than 3 times per second | 2.3.1 Three Flashes or Below Threshold | A |
| Non-essential motion triggered BY a user interaction (parallax on scroll, hover parallax, expanding view transitions) | 2.3.3 Animation from Interactions | AAA |
| Motion required to operate a control (shake to undo, tilt to steer) | 2.5.4 Motion Actuation | A |
| Motion that breaks the layout or hides content when it plays | 1.3.2 Meaningful Sequence / 1.4.10 Reflow, depending on the failure | A / AA |

Write the finding severity from user impact (a parallax hero that reliably triggers vertigo is CRITICAL regardless of level), but never label a AAA criterion as an AA obligation. A misstated conformance level lets a client dismiss a real defect as optional. When no A or AA criterion fits, say so: "no AA criterion; 2.3.3 (AAA) plus WAI guidance and platform convention".

## 2. How to detect

### CSS

```css
@media (prefers-reduced-motion: reduce) {
  /* user wants less motion */
}

@media (prefers-reduced-motion: no-preference) {
  /* user has not asked for reduced motion — motion OK */
}
```

Default to "no motion" and layer motion inside `no-preference` — progressive enhancement is safer than trying to strip motion after the fact.

### JS (with live update)

```ts
const query = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduced = query.matches;

query.addEventListener('change', (e) => {
  reduced = e.matches;
  // re-run any animation logic
});
```

### React hook

```tsx
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    q.addEventListener('change', onChange);
    return () => q.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
```

Framer/Motion exposes its own hook: `import { useReducedMotion } from 'motion/react'`.

## 3. Default block (global safety net)

Include this as a floor ONLY where nothing below substitutes motion. `!important` here beats every per-component rule regardless of specificity, so a substitute that must survive it needs its own `!important` (`animation: fade-in 50ms linear both !important`), and any loader that must keep spinning must be excluded from the selector: `*:not([data-motion="keep"]), *:not([data-motion="keep"])::before, *:not([data-motion="keep"])::after`. Prefer the token approach in section 7 without this block when substitution is the design.

```css
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

Why `0.01ms` and not `0ms`: some libraries (including older Motion, some CSS-transitions-based toggles) short-circuit when the duration is literally 0. `0.01ms` is perceptually instant but keeps `transitionend`/`animationend` events firing so state machines still advance. `!important` overrides inline-style-set durations from animation libraries.

This is a safety net, not a design decision. Prefer substituting (section 4).

## 4. Better than blocking — substituting

Blocking motion leaves a jarring snap. Substituting keeps continuity with a simpler, shorter, non-spatial transition.

```css
/* Default: a slide-in */
.card {
  animation: slide-in 400ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

@keyframes slide-in {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Reduced-motion variant: instant crossfade, no translate.
   !important so the section 3 floor cannot flatten it to 0.01ms */
@media (prefers-reduced-motion: reduce) {
  .card {
    animation: fade-in 50ms linear both !important;
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
}
```

| Motion | Reduced-motion substitute |
|---|---|
| Slide from offscreen | 50ms opacity fade |
| Scale-in (popover, modal) | Opacity-only, no scale |
| Drawer slide | Opacity fade, optional 4px translate max |
| Page transition (View Transitions) | Skip the morph, cross-fade or direct swap |
| Scroll-driven parallax | Static layout, no parallax |
| Infinite spinner (loader) | OK to keep — necessary feedback. Prefer shorter loop |
| Shake on error | Color/border flash only |
| Autoplay hero video | Static poster image |
| Carousel auto-advance | Pause auto-advance; user controls only |
| Toast slide-in | Fade-only |

## 5. What MUST be reduced (must-respect)

These categories are unambiguous triggers for vestibular symptoms. Always gate behind `no-preference`.

| Category | Example | Why |
|---|---|---|
| Page transitions with spatial motion | Slide between routes, expanding view transitions | Users expect the page to be static |
| Scroll-driven parallax | Hero moves at different speed than body on scroll | Classic vertigo trigger |
| Autoplay video or looping animation | Hero video background, looping GIF explainer | Continuous motion in peripheral vision |
| Marquees / tickers | Price tickers, news scrolls | Continuous horizontal motion |
| Large translate / scale animations | Card zoom, Ken Burns pans | Simulates physical motion |
| Infinite loops | Endlessly bouncing arrow, pulsing heartbeat | Peripheral distraction |
| Particle effects, sparkles, floating elements | Decorative particle backgrounds | Distracting continuous motion |
| Scroll-hijacking / scroll-snap with long durations | "Scrollytelling" with cinematic pans | Takes control from the user |
| 3D transforms simulating depth | Card flip, perspective tilt | Strong spatial motion |

Every item above: default OFF, opt IN via `(prefers-reduced-motion: no-preference)`.

## 6. What MAY stay

Motion that is purely functional feedback, small, short, and non-spatial is fine to keep on under reduced-motion.

| OK to keep | Why |
|---|---|
| Focus ring appearing / dissolving | <100ms, non-spatial, necessary feedback |
| Button color / background-color changes | Non-spatial |
| Opacity-only hover / fade | No displacement |
| Tooltip fade <100ms | Small, short, non-spatial |
| Loading spinners | Necessary feedback; prefer pulse-in-place over rotation |
| Caret blink | OS-controlled; short |
| Very small indicators (<4px move, <120ms) | Below perceptual motion threshold |
| Disabled-state transition (opacity) | State, not motion |

Rule of thumb: no spatial displacement and <150ms is safe.

## 7. Motion library handling

### Motion (Framer Motion)

```tsx
import { motion, useReducedMotion } from 'motion/react';

function Card() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced
        ? { duration: 0.05 }
        : { type: 'spring', stiffness: 300, damping: 30 }
      }
    >
      ...
    </motion.div>
  );
}
```

Or set the global default:

```tsx
<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

Options: `"user"` (respect OS), `"always"` (force reduce), `"never"` (ignore OS — avoid).

### CSS-only (vanilla)

Handle in design tokens so the preference cascades:

```css
:root {
  --duration-fast: 150ms;
  --duration-med: 250ms;
  --duration-slow: 400ms;
  --ease-spring: cubic-bezier(0.32, 0.72, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0.01ms;
    --duration-med: 0.01ms;
    --duration-slow: 50ms; /* optional: keep a tiny cross-fade */
    --ease-spring: linear;
  }
}

.card { transition: opacity var(--duration-med) var(--ease-spring); }
```

### GSAP

```js
import { gsap } from 'gsap';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

gsap.to('.card', {
  y: reduced ? 0 : -24,
  opacity: 1,
  duration: reduced ? 0.05 : 0.4,
  ease: reduced ? 'none' : 'power3.out',
});
```

### Tailwind

Tailwind v3.3+ supports the `motion-reduce:` and `motion-safe:` variants out of the box:

```html
<div class="transition-[transform,opacity] duration-200 motion-reduce:duration-75 motion-reduce:transform-none">
  ...
</div>
```

`motion-safe:` applies only when `no-preference`. Prefer `motion-safe:` for opt-in motion.

## 8. Autoplaying video / animation

| Rule | Detail |
|---|---|
| No autoplay >5s without controls | Fails 2.2.2 Pause, Stop, Hide |
| Under `prefers-reduced-motion: reduce`, DO NOT autoplay at all | Show poster image or first frame |
| Provide play/pause control always | Visible, keyboard-accessible, target >=24x24 CSS px (WCAG 2.5.8 is a MINIMUM); design to 44x44. See `references/accessibility/01-wcag-2-2.md` section 12 |
| Muted autoplay is still animation | Reduced-motion users are harmed by visual motion, not just audio |

```tsx
import { useRef, useState } from 'react';

function HeroVideo({ src, poster }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  if (reduced) return <img src={poster} alt="" />;

  return (
    <>
      {/* Decorative background: hidden from assistive tech, no aria-label */}
      <video
        ref={ref}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {/* The 2.2.2 mechanism: visible, keyboard-reachable, >= 24x24 CSS px (design to 44x44).
          The label changes with the state, so no aria-pressed (a toggle's label must not change). */}
      <button
        type="button"
        className="hero-video-toggle"
        onClick={() => {
          if (playing) ref.current?.pause();
          else void ref.current?.play();
        }}
      >
        {playing ? 'Pause background video' : 'Play background video'}
      </button>
    </>
  );
}
```

## 9. Reduced-motion-friendly View Transitions

The View Transitions API morphs between DOM states with a spatial transition. Under reduced motion, skip the morph and just swap.

```ts
async function navigate(newUrl: string) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!document.startViewTransition || reduced) {
    await renderTo(newUrl);
    return;
  }

  const transition = document.startViewTransition(async () => {
    await renderTo(newUrl);
  });

  await transition.finished;
}
```

Or via CSS, neutralize the default transition under reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

## 10. Anti-patterns

| Anti-pattern | Why it breaks | Fix |
|---|---|---|
| Animation always on, no `prefers-reduced-motion` gate | Vestibular users harmed | Wrap motion in `@media (prefers-reduced-motion: no-preference)` |
| `html { scroll-behavior: smooth }` without reduce check | Smooth-scroll anchors can trigger vertigo; also impacts `element.scrollIntoView()` | Inside `@media (prefers-reduced-motion: no-preference)` block, OR the global-block `scroll-behavior: auto !important` |
| Autoplay hero video on landing | Users can't escape continuous motion | Gate on `no-preference`; provide poster fallback |
| Scroll-driven parallax | Classic vertigo trigger | Disable under reduced; use static layout |
| Infinite looping decorative animation | Peripheral distraction; power drain | Gate on `no-preference`; pause on blur |
| "Scroll to reveal" that waits for motion to finish before content is readable | Layout looks broken if motion is skipped | Content visible immediately; motion is decoration, not delivery |
| Rely on JS media query but not CSS fallback | SSR / no-JS users get animation | Always have a CSS `@media (prefers-reduced-motion: reduce)` block |
| `MotionConfig reducedMotion="never"` | Explicitly overrides the user | Use `"user"` (default) |
| Scale-in modal (0.9 -> 1.0) without reduce check | Small scale still hurts sensitive users | Swap to opacity-only under reduced |
| Carousel auto-advance | Continuous motion; hard to read | User-controlled only; or pause button; or gate on `no-preference` |
| Toast with 600ms slide-in across viewport | Spatial motion + long duration | Fade-only under reduced; <150ms duration |
| Animated loaders that count from 0-100% linearly for >5s | Tedious, implies animation is progress signal | Use real progress; if indeterminate, small pulse, not large motion |
| iOS-style bouncy spring on every hover | Spatial motion, over-stimulating under reduced | Linear or ease under reduced |
| View Transitions API with default cross-fade, no reduce handling | Spatial morph for image-to-image | Neutralize `::view-transition-*` animation under reduced |

## Sources

- MDN `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- web.dev — prefers-reduced-motion: https://web.dev/articles/prefers-reduced-motion
- WCAG 2.3.3 Animation from Interactions: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- WCAG 2.2.2 Pause, Stop, Hide: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- MDN View Transition API: https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- Motion docs — useReducedMotion: https://motion.dev/docs/react-use-reduced-motion
- Tailwind motion-safe / motion-reduce: https://tailwindcss.com/docs/hover-focus-and-other-states#motion
- Pope Tech — Design Accessible Animation: https://pope.tech/blog/accessible-animation
