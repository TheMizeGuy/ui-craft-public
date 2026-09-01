---
topic: design
role: reference
scope: token-drift
audience: ui-designer
---

# Token Drift: Why a Palette Change Ships Half-Applied

A design token exists so one edit reaches every surface. It only does that where the surface
*references* the token. Every place a value was written as a literal instead is a silent copy, and
copies do not move when the token does. The failure is invisible until someone retints — and then it
ships as "half the site changed".

Field-tested on a 14-page marketing site retinted from a near-white paper to a warmer, dimmer one.
The first sweep updated every `:root` block, all 14 of them, and still shipped **17 stale values**.

## 1. Where copies hide

Ranked by how well they hide, worst first.

| Hiding place | Why the sweep misses it | Real example |
|---|---|---|
| **Literal + alpha** | A search for the token's triple does not match it | `oklch(0.49 0.18 296 / 0.35)` survives a grep for `oklch(0.49 0.18 296)` |
| **Standalone/fallback pages** | Not in the shared-chrome page list, by design | An outage page served when the app backend is down carries its own inlined palette |
| **A second language** | The value lives outside CSS entirely | An OG-card generator that draws in sRGB; a `theme-color` meta tag hard-coding hex |
| **Derived tints** | Reads as a one-off, not a token | `box-shadow: … oklch(<ink triple> / 0.42)` |
| **Comments** | Documents a ratio, not a colour, so nobody updates it | `--ink-3: …; /* 5.0:1 — floor for meta text */` after the surface moved |

The alpha case is the important one. It is the same colour, it is invisible to the obvious search,
and it is extremely common — borders, underlines, shadows and focus rings all want the accent at
partial opacity.

## 2. Derive, never re-pin

When you find a stale literal, the tempting repair is to update its value. **That leaves it a
copy** — it will drift again on the next retint, and now with a comment implying someone checked it.

Derive it from the token instead:

```css
/* was: border: 1px solid oklch(0.49 0.18 296 / 0.35);   ← copy of --accent */
border: 1px solid color-mix(in oklab, var(--accent) 35%, transparent);
```

Deriving often fixes a second, latent bug for free. In the case above, `.vtag` already took
`background` and `color` from the token and only its border was frozen — so inside a dark section
where the token set is remapped, the component's border stayed the *light-surface* accent while
everything around it followed the dark one. Nobody had reported it; it was simply wrong.

Use `color-mix(in oklab, …)` rather than `oklch(<triple> / a)` for alpha variants. `in oklab`
interpolates perceptually and, more importantly, the value is a *reference*.
`oklch(from var(--accent) l c h / 35%)` is the equivalent relative-colour form; both are references,
and the design-ui gate accepts either.

## 3. Retinting a surface: solve, do not guess

Darkening a light surface reduces its contrast with dark text. Every ink token has a ratio budget,
and the smallest one sets the wall.

Procedure that works:

1. **Find the wall.** Compute the contrast of every ink against candidate surface values, and find
   where the *lowest* one crosses your floor. Do not eyeball this; the wall is often much closer
   than it feels. In the field case, `--ink-3` sat at 4.97:1 against a 4.5:1 AA floor — the surface
   could not move more than a few percent before breaking it.
2. **Decide whether you are spending margin or preserving it.** Moving the surface alone spends
   accessibility headroom on aesthetics. Usually wrong.
3. **Solve the inks back.** For each ink, binary-search its lightness for the ratio it had. Then the
   surface can move as far as the *design* wants, and every documented ratio is preserved rather
   than consumed.
4. **Shift the whole surface family by the same delta** (`--paper`, `--paper-2`, `--rule`,
   `--rule-strong`) so card/border relationships are unchanged.
5. **Re-measure in the browser, not in the spreadsheet** (see `review/06-measurement-traps.md`).

Field result — surface moved 4 points of lightness, ratios held to within 0.03:

| token | before | after |
|---|---|---|
| ink | 14.78:1 | 13.24:1 |
| ink-2 | 6.75:1 | 6.74:1 |
| ink-3 | 4.97:1 | 4.94:1 |
| accent | 6.12:1 | 6.11:1 |

Borders landed marginally *better* (1.32 → 1.34), because the family shifted together.

## 4. Guards that survive the next retint

A guard that hard-codes the current palette fails on every deliberate change, and the obvious repair
— re-pin it to whatever the code now emits — **validates a regression instead of catching one**. Two
guards that do not have this problem:

**No literal may equal a token.** Parse the token block, then scan the rest of the stylesheet for
colour literals whose components match any token. Anything that matches is a hand-copy and should be
a `var()`. This finds the alpha cases, because you compare the *triple* and ignore the alpha.

```
for each colour literal outside the token blocks:
    assert literal.components not in {token.components}
```

**Colour-space conversion pinned to external anchors.** If you have a converter (OKLCH → sRGB for an
OG card, say), do not pin it to your palette's outputs. Pin it to values that are correct
independently of your design: black, white, a neutral, and the published coordinates of the sRGB
primaries. That guard never needs touching again.

**Standalone surfaces pinned to the shared ones.** A fallback page that cannot reference the tokens
must still be *checked* against them: assert its inlined literals equal the current token values.
This makes the comment "colours mirror the design system" enforceable instead of aspirational.

## 5. Checklist before declaring a retint done

- [ ] Every `:root`/token block updated
- [ ] Literals **with alpha** searched separately from bare literals
- [ ] Non-CSS copies: image generators, `theme-color`, manifest/PWA colours, email templates
- [ ] Standalone/fallback/error pages that carry their own palette
- [ ] Ratio comments next to tokens updated to the new numbers
- [ ] Contrast re-measured in a browser across every page
- [ ] A guard added for whichever class you just found — you will retint again
