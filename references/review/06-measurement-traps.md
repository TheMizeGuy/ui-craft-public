---
topic: review
role: reference
scope: measurement-traps
audience: ui-reviewer
---

# Measurement Traps: When the Harness Lies

`review/02-evidence-pipeline.md` says which evidence a finding needs. This file is about evidence
that *looks* collected and is wrong. Every trap below produced a confident, plausible, false result
in real review work — three of them nearly shipped as fixes.

The unifying rule: **a measurement you have not seen fail is not a measurement.** Before trusting a
harness, break the thing it measures and confirm the number moves.

## 1. `getComputedStyle` does not normalise modern colour

Chrome serialises `oklch()` back as `oklch()`. A contrast audit that regex-matches `rgb(...)` out of
computed styles will parse `oklch(0.963 0.009 84)` as `rgb(0.963, 0.009, 84)` — a near-black — and
report **every node on the page at the same wrong ratio**. The number is uniform and plausible,
which is exactly why it survives review.

Cost when this happened: one full audit run, reported as "945 nodes all at 2.74:1".

**Measure the pixels instead.** Paint the resolved colour to a canvas and read it back:

```js
const el = document.querySelector(sel);
const cs = getComputedStyle(el);
// paint fg on bg, read actual sRGB — works for oklch/lab/color-mix/relative colour alike
ctx.fillStyle = cs.backgroundColor; ctx.fillRect(0, 0, 1, 1);
const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;   // un-premultiply if alpha < 255
```

This is the only approach that stays correct as CSS Color 4/5 adoption grows. Applies equally to
`color-mix()`, `lab()`, `lch()`, and relative colour syntax.

## 2. Changing styles after load does not re-run resource selection

To test how an image behaves at an enlarged root font size, the obvious move is to set
`document.documentElement.style.fontSize = '24px'` and re-read `currentSrc`. It will not have
changed — the browser resolved `sizes` and picked a candidate *during parse*, long before your
script ran. Both the "broken" and "fixed" variants then report identically, and you cannot tell them
apart.

**Bake the condition in before parse**: emit a page variant with the root size in a `<style>` in the
head, or use an init script that runs before document scripts. Then compare.

This trap is nastier than it looks because it is *symmetric*: it makes a real bug and a real fix
produce the same reading, so it can convince you a fix works when it does nothing. (In the field
case it did: `rem` units in `sizes` were "confirmed" to fix an upscaling bug and in fact changed
nothing — font-relative units in `sizes` resolve against the initial 16px, because selection can run
before stylesheets apply.)

Same family: `matchMedia` breakpoints, `prefers-*` media queries, and container queries all need the
condition present at load, not injected after.

## 3. Verify the harness is talking to your server

A local preview on a well-known port can collide with something already listening. `curl` will
happily return `200` from the *other* process, and every conclusion drawn from it is about someone
else's content.

Tell: results that make no sense in a specific way — every asset returning `text/html`, or no
headers you configured appearing at all.

```sh
lsof -nP -iTCP:$PORT -sTCP:LISTEN     # confirm the PID is yours before measuring
```

Pick a free port programmatically rather than hard-coding one. Cost when this happened: an entire
round of cache-header conclusions, all wrong.

## 4. Config validators check syntax, not behaviour

`caddy validate`, `nginx -t` and friends prove the file *parses*. They say nothing about which
requests match which rule. A path-matched header directive, for instance, applies at write time
regardless of status — so a long `max-age` scoped to a directory also stamps itself on **404s** from
that directory, and a shared cache can then pin a missing file for the full duration.

**Serve the real config against a fixture tree and curl both a present and a deliberately absent
path**, comparing full response headers. That is the only thing that proves matcher coverage.

## 5. Element rects hide text misalignment

Two flex items can have identical bounding boxes and still render their text on different baselines
— because one child centres its content and the sibling does not. Measuring the *elements* shows
`[44, 44]` and looks fine.

**Measure the text.** A `Range` over the node contents gives the actual glyph box:

```js
const r = document.createRange(); r.selectNodeContents(el);
const top = r.getBoundingClientRect().top;   // compare across siblings
```

Field case: a breadcrumb whose current-page crumb sat **10.1px** above the link beside it, caused by
adding a 44px minimum touch target to *one* of the two items under a default `align-items: stretch`.
Both `<li>` measured 44px tall. Only the text told the truth.

Related: measuring real characters-per-line needs the same technique — a `ch` unit is the width of
`0` in the current face, not the width of an average character. Blocks "capped at 68ch" measured 92,
93 and 107 real characters. Walk the text node character by character with a `Range`, group by rect
top, and count.

## 6. Reviewer-proposed thresholds must be validated against the passing corpus

A reviewer suggesting "fail if the metric exceeds 6" has usually not run it against your data. Check
the threshold against material that is known-good *before* adopting it — otherwise you install a
guard that fails closed on everything.

Field case: a proposed scroll-alignment guard used `> 6.0`, described as generous because clean
captures measured "≤3.5". The actual corpus measured **24 to 49**. Adopting it would have failed
every regeneration, permanently.

## 7. A guard that has never failed is not evidence

The most valuable habit in this list. After writing any check, **restore the defect and confirm the
check fails, naming the right thing** — then restore the fix.

Three separate guards in one project passed while the thing they guarded was broken:

- a literal-absence check that scanned a different region of the file than the one it guarded;
- a fixture test that was skipped in CI because it keyed off an untracked archive, so it passed by
  *absence*;
- an ordering test that asserted only that unrelated files survived, so a fully torn output set
  passed it.

Each looked green. Each proved nothing. Two rules follow:

**Assert the invariant, not a proxy for it.** "The orphan files still exist" is not "the output set
is intact".

**Watch out for the mock that patches the error path too.** Injecting a failure into the same method
the recovery uses means the rollback cannot run, and the test fails against correct code. Fail
*once*, the way a transient actually does.
