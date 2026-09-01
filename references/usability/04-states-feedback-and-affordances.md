---
topic: usability
role: reference
scope: states-feedback-and-affordances
audience: ui-engineer
---

# States, Feedback, and Affordances

What a screen shows when there is nothing, when it is working, when it failed,
and how a person can tell what any of it does.

## 1. The complete state set

Every data-bearing surface has these states. Shipping only the populated one is
not an unfinished polish pass, it is an unfinished screen.

| State | Occurs when | Must contain | Common failure |
|---|---|---|---|
| Empty, first run | The user has never created anything | What lives here, why it is worth having, the one action that starts it | A blank panel, or "No data" |
| Empty, zero results | A query or filter matched nothing | The query echoed back, and at least one relaxation (clear a filter, clear all, widen, create) | Same message as first-run empty, which tells the user to create something when they need to clear a filter |
| Empty, cleared | The user deleted or completed everything | An acknowledgement, not the first-run pitch | "Get started" shown to someone who just finished |
| Loading, initial | No prior content exists | Section 3's choice of indicator, plus what is loading | An unlabelled spinner on a white page |
| Loading, refresh | Content exists and is being updated | Keep the old content visible, mark it stale | Replacing a full table with a skeleton on every poll |
| Partial | Some data arrived, some has not or failed | Label what is partial, and what is missing or still coming | A total that looks final while three sources are still counting |
| Error | The operation failed | What failed, why if known, and the next action (retry, alternative, support) | "Something went wrong" with no retry |
| Success | The operation completed | The outcome, named, and the next likely action | Silence, or a toast that appears after the user has already navigated away |
| Offline or degraded | The network is gone or a dependency is down | Which capabilities still work, what is queued, and what happens on reconnect | A generic error implying the user's data is lost |
| Permission denied | The user lacks access | What is needed, and how to get it or who has it | A 403 page with no path forward |
| Not found | The object is gone or the id is wrong | Whether it never existed or was deleted, and where to go instead | A bare 404 with no navigation |
| Stale or conflicted | Someone else changed it | What changed, and the choice: overwrite, merge, discard | Silent last-write-wins |

The distinction that gets missed most: **"no data yet" and "no matching data"
are different states with different copy and different actions.** One offers
creation, the other offers relaxation. Shipping one message for both is a
guaranteed dead end for whichever case it does not fit.

## 2. Why missing empty and error states are HIGH, not MEDIUM

Reviewers reflexively rank a missing empty state as polish, because the screen
"works" once there is data. That calibration is wrong, and here is the argument
to use in the finding:

- **The empty state is the FIRST state every new user sees.** It is not an edge
  case, it is the universal onboarding surface. A blank panel is the product's
  first impression for 100% of new accounts, and it is the moment they decide
  whether they understand the product.
- **The error state is what they see when they are already frustrated.** Its
  quality is inversely correlated with the user's patience at that moment.
- **Both are the states with no other path.** A cluttered populated screen is
  still usable. An empty screen with no action and an error with no retry are
  dead ends (`references/usability/01-task-flows-and-journeys.md` section 5),
  and a dead end is not a polish defect.
- **Absence is invisible to every static review.** Nobody screenshots the state
  that was never built, so it survives every visual pass by default. That is
  precisely why the severity has to be set deliberately rather than by feel.

**Calibration.** A screen that can be empty or can fail and renders neither is
HIGH. It is CRITICAL when the missing state is on the primary path (the main
list of the product, the checkout error, the search that everyone uses). It
drops to MEDIUM only when the state is genuinely rare and the fallback is still
navigable and informative.

## 3. Skeleton, spinner, progress, or nothing

Choose by expected duration (p75 of real usage, not the happy path) and by
whether the shape of the result is known before it arrives.

| Expected duration | Shape known? | Show | Why |
|---|---|---|---|
| Under 100ms | Either | Nothing | The result arrives inside the perceptual "instant" window. Any indicator here is guaranteed to flash |
| 100ms to 1s | Either | Local acknowledgement on the control the user touched: pressed state, busy mark, `aria-busy` | A skeleton or full-region spinner reads as a bigger event than the wait actually is |
| 100ms to 1s | Yes, and the mutation is safe to assume | Optimistic update, see section 7 | Turns the wait into an instant response, with a rollback contract |
| 1s to 10s | Yes | Skeleton tracing the real layout, plus what is loading | Reserves the exact box, so the swap causes no shift and the eye does not re-scan |
| 1s to 10s | No | One labelled indeterminate indicator in the destination container: "Loading invoices..." | A skeleton of the wrong shape teaches a layout that then shifts. An unlabelled spinner fails screen readers and creates anxiety |
| Over 10s | Either | Determinate progress with a real count or percentage, a cancel, and notification on completion | Nobody watches a bar for 10 seconds. Let them leave and tell them when it lands |
| Refresh of content already on screen | Yes | Keep the content, mark it stale, no skeleton | Replacing content with a skeleton throws away what the user was reading |

The choreography detail behind this table (the flash-avoidance delay and minimum
display window, reveal order for streamed content, and the stale-while-revalidate
presentation contract) is canonical in
`references/performance/06-perceived-performance.md`. This file governs whether
the state exists and what it must contain; that one governs how it is timed.

Rules that follow:

- **Skeletons match the real content's shape.** Three grey bars at 3/4, 1/2 and
  5/6 width in front of a table is a generated-UI tell
  (`references/catalogue/01-ai-tells.md`), and it also mis-sets the expectation.
  If the shape is unknown, do not use a skeleton.
- **Never a skeleton for content that usually loads under 300ms.** Measure
  before adding one.
- **Every indeterminate indicator has a timeout and a failure path.** An
  infinite spinner is the most trust-destroying state in software, because it is
  indistinguishable from a hang and offers nothing. Cap it (10 to 30 seconds
  depending on the operation) and fall through to the error state with retry.
- **Reserve the space.** A loading state that occupies different geometry from
  the loaded state causes layout shift on arrival (a CLS defect, see
  `references/performance/01-core-web-vitals.md`).
- **Announce.** `aria-busy` on the region, and a polite live region for
  completion when the change is not obvious visually.

## 4. Feedback latency budgets

These numbers are the oldest stable result in interaction research and they have
not moved. The full four-tier ladder is canonical in
`references/performance/06-perceived-performance.md`; the same boundaries are
restated here because they decide whether a state is a defect, not just whether
it is slow. Attach them to findings.

| Budget | Meaning | UI obligation |
|---|---|---|
| 100ms | The limit for feeling instantaneous, and the point at which a response feels caused by the user's action | Every press, tap, toggle and keystroke produces a visible change within 100ms, even if the real work has not started. A press state counts; nothing does not |
| 200ms | The Interaction to Next Paint "good" threshold | The measured version of the rule above, see `references/performance/01-core-web-vitals.md` |
| 1s | The limit for uninterrupted flow of thought | Past 1s, show progress or the system has gone quiet on the user. Under 1s, no explanatory indicator is needed |
| 10s | The limit of attention on one task | Past 10s, let them leave and notify on completion. Also the point at which a determinate estimate stops being optional |

Two failures these numbers name precisely:

- A submit button that does nothing visible for 800ms while the request runs is
  a **HIGH**, not a nit: the user cannot distinguish it from a dead control and
  clicks again, which is how duplicate records get created.
- A 4-second operation with a spinner and no step naming is a MEDIUM: it is
  inside the attention limit but past the flow limit, so the user is left
  guessing whether it is stuck.

## 5. Affordances and signifiers

An **affordance** is what a thing can do. A **signifier** is what tells a person
it can do it. Interfaces fail on signifiers, almost never on affordances: the
button works, but nothing said it was a button.

| Rule | Detail |
|---|---|
| Interactive is distinguishable at rest | Without hovering, without focusing, without trying. Hover-revealed affordances do not exist on touch, and are invisible to anyone scanning |
| Text that acts does not look like text that reads | A link inside body copy carries a persistent signifier (underline, or a weight and color difference that survives a colorblind check). Color alone fails WCAG 1.4.1 |
| The cursor is a last-resort signifier | `cursor: pointer` is not an affordance. It is invisible on touch and requires the user to already be hovering the thing they were meant to notice |
| A clickable card contains a real control | Wrap the title in the link (or use a full-card overlay anchored to a real link) so it is focusable, announced, and openable in a new tab. A `div` with `onClick` is a top-20 generated-UI tell and an accessibility failure |
| Icon-only controls carry a name | Visible label where space allows, `aria-label` always, plus a tooltip on hover and focus |
| Grouping is a signifier | A container, a border, or a shared background says "these belong together and act on the same object". Related controls scattered across a screen force the user to infer the relationship |
| Selection is visible without color alone | Border, check, weight or background, not only a hue change |
| Disabled reads as disabled, and enabled reads as enabled | The most common failure is the reverse pair: a disabled control with normal contrast, or a low-contrast enabled control that looks disabled and never gets clicked |
| Drag targets say they are draggable | A grip signifier, plus a keyboard alternative for every drag interaction |
| Nothing requires instructions to operate | If a paragraph is needed to explain a control, the control is the defect. This is the single best test of signifier quality |

**Detection.** Take a screenshot, then desaturate it and squint. Everything a
user is expected to click should still be identifiable. Then walk the page with
a keyboard only: any element that receives focus but has no visible focus style,
or that is clickable but never receives focus, is a finding
(`references/accessibility/02-keyboard-focus.md`).

```js
// Clickable elements that are not focusable, and pointer-cursor fakes
[...document.querySelectorAll('*')].filter((el) => {
  const clickable = el.onclick || getComputedStyle(el).cursor === 'pointer';
  const focusable = el.matches('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  return clickable && !focusable;
}).map((el) => ({ tag: el.tagName, cls: el.className, text: el.textContent.trim().slice(0, 40) }));
```

## 6. Disabled state anti-patterns

Disabled is overused because it looks like safety. It is usually a way of
withholding information.

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| Disabled submit until the form is valid | The user cannot discover what is missing, and disabled controls are skipped by keyboard, so they cannot even reach it to ask | Keep it enabled, validate on submit, move focus to the error summary (`references/usability/02-forms-and-error-recovery.md` section 3) |
| Disabled with no reason given | The user is told no and not told why. This is the most common cause of support tickets on permission-gated UI | State the blocker adjacent, or via `aria-describedby`, or in a tooltip that also works on focus |
| Disabled and unfocusable when the reason matters | `disabled` removes it from the tab order, so screen-reader and keyboard users cannot even find the thing they cannot use | `aria-disabled="true"` plus blocking the action in the handler, keeping it focusable and announceable |
| Disabled contrast below readability | It becomes invisible rather than inactive, so the option is not known to exist | Keep disabled text legible (aim 3:1 or better even when non-interactive) |
| Disabled as the permanent state of an unimplemented feature | A control that is never enabled is a promise the product does not keep | Remove it, or label it clearly as unavailable and say when |
| Disabled to prevent double submit, left disabled after failure | The user cannot retry | Re-enable on failure, always |
| A tooltip as the only carrier of the reason | Tooltips do not appear on touch and often not on focus | Text, or a tooltip that is also reachable by keyboard AND duplicated in the error path |

## 7. Optimistic UI and rollback

Optimistic updates buy back the 100ms budget, and they buy it with a promise the
UI has to keep.

**Allowed when** all three hold: the success probability is high (a like, a
rename, a toggle, a reorder), rollback is cheap and exact, and the blast radius
is local to the user's own view.

**Never optimistic for:** money movement, irreversible destruction, anything
another user sees immediately, anything with a server-side validation the client
cannot replicate, or anything where being wrong for two seconds has a
consequence.

Requirements when it is used:

- **Rollback restores the exact prior state**, including list position,
  selection, scroll and any dependent counters. A rollback that reorders the
  list is a second defect on top of the first.
- **Failure is stated, never silent.** A value that quietly reverts teaches the
  user their input is unreliable, and they will start double-checking
  everything. Show what failed and offer the retry.
- **The optimistic item is distinguishable while pending** for anything that
  takes more than a moment: reduced opacity, a pending mark, `aria-busy`. Not
  for a like button; yes for a row that was just created.
- **Reconciliation actually happens.** The most common bug in optimistic code is
  a value that is never replaced by the server's truth, so a stale client value
  survives until reload.
- **Concurrent optimistic updates do not clobber each other**, and a failure of
  one does not roll back the others.

Implementation in React 19 is `useOptimistic`
(`references/performance/02-react-19-perf.md`), or a query-cache mutation with
`onError` rollback (`references/architecture/02-state-architecture.md`).

## 8. Progress, partial, and streaming

- **Partial data is labelled partial.** A dashboard where one of five panels
  failed must say so on that panel, not render a zero. A zero is a fact; a
  failed fetch rendered as a zero is a lie the user will act on.
- **Counting totals are marked as counting.** "1,204 and counting" or a pending
  mark, never a number that looks settled and then changes.
- **Streaming output has a stop control**, and the stop leaves the partial
  result intact and labelled as stopped.
- **Long operations report the step, not just the percentage.** "Uploading 3 of
  12" tells the user whether the operation is progressing; a bar at 34% for
  eleven seconds does not.
- **Progress that can go backwards must be honest about it.** A bar that jumps
  back is better than one that sits at 99%, but the best answer is a
  step-based indicator.
- **Background work is discoverable after leaving.** If the user can navigate
  away, there is a place that shows the operation is still running and its
  result when it lands.

## 9. Forcing every state (detection procedures)

A state that was never rendered was never reviewed. These recipes produce each
state without a test harness.

| State | How to force |
|---|---|
| Empty, first run | New account, or clear the store, or intercept the request and return `[]` |
| Zero results | Search for a random string, or apply two mutually exclusive filters |
| Loading, slow | DevTools network throttling to "Slow 3G", or a request-blocking rule with a delay |
| Loading, stuck | Block the endpoint entirely and wait past any timeout |
| Error | Override the response to 500, or take the tab offline mid-request |
| Offline | DevTools offline mode, then attempt every primary action |
| Permission denied | Downgrade the role, or replay the route as a lesser user |
| Not found | Alter an id in the URL to a valid-looking but absent value |
| Conflict | Open the same record in two tabs, save in both |
| Partial failure | Return a mixed-result payload from the interceptor |
| Extreme content | One item, 10,000 items, a 300-character name, an emoji-only name, an RTL string, a 3-digit and a 12-digit number |

```js
// Force failures without a proxy: patch fetch for the tab
const real = window.fetch;
window.fetch = (...a) => (/api\/invoices/.test(String(a[0]))
  ? Promise.resolve(new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }))
  : real(...a));
// 500 instead: new Response('{"error":"boom"}', { status: 500, ... })
// Hang instead: new Promise(() => {})
```

Every state that gets forced also gets captured, because the report needs the
evidence and because the absent states are exactly the ones nobody has a
screenshot of.

## 10. Severity anchors

| Severity | State, feedback and affordance defects |
|---|---|
| CRITICAL | An error state that loses the user's work with no recovery; an infinite loading state with no timeout on the primary path; an interactive element with no signifier at all on a required action; a permission or error screen that is a dead end on the primary path |
| HIGH | Missing empty state on a surface that starts empty; missing error state on an operation that can fail; a control with no feedback within 100ms of a press; unlabelled loading on a full-screen wait; disabled submit with no explanation; clickable elements that are not focusable (CRITICAL for a `div`-with-onClick on a required action, `references/catalogue/01-ai-tells.md` P8); optimistic update that fails silently; partial failure rendered as success; hover-only affordance for a primary action |
| MEDIUM | First-run empty copy shown for zero results; a single loader flashing on a sub-300ms load (systemic absence of a delay wrapper is HIGH, `references/performance/06-perceived-performance.md`); skeleton shape unrelated to the content; a 1 to 10 second operation with no step naming; refresh replacing existing content with a skeleton; disabled state with unreadable contrast; selection conveyed by color alone; a counting total displayed as final |
| LOW | Spinner style inconsistent between surfaces; `aria-busy` missing where the visual state is already clear; empty state without an illustration where the product elsewhere uses them; undo toast timing slightly short |
| TASTE | Illustration style in empty states; wording alternatives that are equally actionable |

## 11. Cross-references

| Need | File |
|---|---|
| Where these states sit in a task sequence, and dead ends | `references/usability/01-task-flows-and-journeys.md` |
| Validation, error copy requirements, undo and confirmation | `references/usability/02-forms-and-error-recovery.md` |
| Not-found, permission-denied and back behaviour as navigation | `references/usability/03-navigation-and-information-architecture.md` |
| Per-control state minimums and the rubric row | `references/review/01-universal-rubric.md` |
| Empty and error microcopy | `references/design/08-ux-writing.md` |
| Skeleton and spinner tells, `div`-onClick, form happy-path tells | `references/catalogue/01-ai-tells.md` |
| INP, CLS, and the measurement of feedback latency | `references/performance/01-core-web-vitals.md`, `references/performance/05-measurement.md` |
| Loading choreography: flash avoidance, minimum display, reveal order, stale-while-revalidate | `references/performance/06-perceived-performance.md` |
| `useOptimistic` and cache rollback | `references/performance/02-react-19-perf.md`, `references/architecture/02-state-architecture.md` |
| Live regions, `aria-busy`, announcement of state change | `references/accessibility/04-screen-reader.md` |
| Focus visibility and keyboard reachability of affordances | `references/accessibility/02-keyboard-focus.md` |
| Reduced-motion handling for loaders and transitions | `references/accessibility/03-motion-reduce.md` |
