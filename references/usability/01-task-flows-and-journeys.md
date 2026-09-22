---
topic: usability
role: reference
scope: task-flows-and-journeys
audience: ui-designer
---

# Task Flows and Journeys

The dimension that lives BETWEEN screens, where no screenshot can show it.

## Why this file exists

Every other review dimension in this plugin is judgeable from a single rendered
frame. Alignment, contrast, spacing, type scale, component coherence, motion,
density: open one screenshot and the evidence is there.

A flow defect is not in any frame. A three-step invite flow whose step 2
discards the addresses typed in step 1 when the user presses back renders
identically, at every viewport, in every theme, to one that preserves them.
Both screenshots are correct. The defect is in the sequence, and the sequence
was never opened.

That is why a product can pass eight specialist reviews with every screen
pixel-correct and still be a product nobody can finish a task in. **A review
that only ever looks at one frame at a time can approve any amount of broken
flow.**

## 1. Name the task before reviewing anything

No flow can be judged against nothing. Fill this in first, from the product, not
from a design doc that may not exist:

```text
Actor:      who they are and what they already know
Trigger:    what makes them start
Task:       one sentence, in their words, with a verb
Success:    the observable condition that ends the task
Entry:      every route or surface the task can start from
Exit:       every way out: completion, abandonment, error, timeout, expiry
Frequency:  once ever / daily / per incident / per purchase
```

**If Success cannot be filled with something observable, that is finding number
one and it outranks everything visual.** "The user is engaged" is not a success
condition. "The invitation appears in the pending list and the invitee receives
an email" is. A flow with no stated success condition will ship a final screen
that does not confirm anything, because nobody could say what to confirm.

Frequency changes every other judgement in this file. A once-ever task (account
setup, tax onboarding) can afford explanation, a review step, and a slower
sequence. A per-incident task (acknowledge an alarm, refund a charge) can afford
none of it, and the same explanatory paragraph that helps in the first is pure
cost in the second.

Entry matters as much as the happy start. Most real users do not arrive at step 1
from the marketing page. They arrive from a search result, a shared link, an
email, or a browser restore, and they arrive at step 3. A flow designed only
from its own front door breaks for everyone who came in a window.

## 2. Write the flow map

Half of all flow defects are visible in this table before the app is even
opened, because a cell is empty.

| Step | Entry condition | Input required | State carried in | State produced | Failure modes | Exit paths |
|---|---|---|---|---|---|---|

Worked example, a real three-step invite flow with two defects the map exposes:

| Step | Entry condition | Input required | State carried in | State produced | Failure modes | Exit paths |
|---|---|---|---|---|---|---|
| 1. Add addresses | Admin on team page | 1 to 50 emails | Team id | Address list | Malformed address, already a member, over seat limit | Next, Cancel |
| 2. Choose role | Step 1 valid | Role per address | (empty) | Role map | None listed | Next, Back |
| 3. Confirm and send | Step 2 valid | None | Role map | Invitations | Partial send failure | Send, Back |

Two findings fall straight out of the table:

- Step 2 carries in nothing, so the addresses typed in step 1 are not in scope
  at step 2, which means Back cannot restore them and a refresh loses them. That
  is the defect from the opening paragraph, and it was found by reading a table.
- Step 2 lists no failure modes. That is never true. It means nobody designed
  the failure, not that failure cannot happen (a role can be revoked between
  steps, the seat limit can be consumed by another admin mid-flow).

What an empty cell means:

| Empty cell | What it actually means |
|---|---|
| State carried in | The step will re-ask for data the system already has (WCAG 3.3.7 Redundant Entry) or will silently lose it |
| Failure modes | Failure was not designed, so it will surface as a generic error or a blank screen |
| Exit paths | Dead end. See section 5 |
| State produced | The step does nothing the flow needs. Ask why it exists |
| Two steps producing the same state | One of them can be merged away |

## 3. Step and effort budgets

Budgets, not laws. A finding needs the count, and these say which counts are
worth reporting.

| Measure | Budget | Severity past it |
|---|---|---|
| Steps from entry to success, returning user, primary task | 3 | 4 to 5 MEDIUM, 6 or more HIGH |
| Steps before a first-run user sees any value | 5 | HIGH past 5 with no skip |
| Screens for a task that collects 3 fields or fewer | 1 | MEDIUM at 2, HIGH at 3 |
| Fields collected before the first useful output | Only those the output needs | HIGH for each field the output does not need |
| Primary decisions per screen (choices that change the path) | 1 | MEDIUM at 2 to 3, HIGH past 3 |
| Data the user must re-enter that the system already holds | 0 | HIGH, and a WCAG 3.3.7 failure |
| Facts shown on step N and needed on step N+1 but not displayed there | 0 | HIGH |
| Steps whose only content is a confirmation of readiness | 0 | MEDIUM |

Count clicks or taps and keystrokes along the primary path and put the numbers in
the finding. A budget without a count is an opinion, and opinions lose triage.

Counting recipe for a driven review:

```js
// Paste before walking the flow. Reports taps, keystrokes and route changes.
window.__flow = { taps: 0, keys: 0, routes: [location.pathname] };
addEventListener('pointerdown', () => window.__flow.taps++, true);
addEventListener('keydown', (e) => { if (e.key.length === 1) window.__flow.keys++; }, true);
const push = history.pushState;
history.pushState = function (...a) { push.apply(this, a); window.__flow.routes.push(location.pathname); };
// After finishing the task: window.__flow
```

## 4. State that carries forward

The single highest-yield question in a flow review: what does the user have, at
this moment, that the next moment must not destroy?

| State | Must survive | Mechanism | How to test |
|---|---|---|---|
| Typed input, step to step | Always | Flow-level form state, or a draft record | Type, advance, go back |
| Typed input, browser or system back | Always | Same, plus history entries that do not remount clean | Back at every step |
| Typed input, refresh | Any flow over 2 minutes of work, and every multi-step flow | Draft persistence (server draft, or `sessionStorage` with an explicit expiry) | Refresh at every step |
| Filters, sort, query, page | Always | URL state | Filter, open a detail, go back |
| Scroll position returning to a list | Always | Scroll restoration keyed to the list route | Scroll far, open row 40, go back |
| Selection across a bulk action | Always | URL or flow state, never component state | Select 6, act, observe the survivors |
| Uploaded files after an unrelated validation failure | Always, or say plainly they must be re-attached | Retain the upload reference server-side | Attach, break another field, submit |
| Auth expiry mid-flow | Return to the same step with input intact | Post-auth redirect carrying the target and the draft id | Expire the session at step 3 |
| Partially completed record | Either resumable or never created | Draft state, not a half-built real record | Abandon at step 2, return tomorrow |

Cross-reference `references/architecture/02-state-architecture.md` for which tool
owns which kind of state. The failures above are almost always the same root
cause: flow state living in a component that unmounts.

**The refresh test.** At every step, press reload. Anything the user typed that
does not come back is HIGH, and it is HIGH even when the flow is short, because
a reload is not an exotic event: it is what a phone does when memory is
reclaimed, what a browser does on update, and what a user does when a page looks
stuck.

## 5. Dead ends

A dead end is a screen from which the user's task cannot progress and no onward
action is offered. It is the most common flow defect and the easiest to detect.

Every screen answers four questions. Missing the fourth is the dead end:

1. What is this?
2. What can I do here?
3. How do I go back?
4. How do I get out, or on, when what I came for is not possible?

| Dead end | Where it shows up | Fix |
|---|---|---|
| Success screen with no onward action | End of a wizard, after a purchase | Name the next likely task and link it, plus a route back to the object created |
| Error with no retry and no support path | Any failed mutation | Retry control, plus a stated alternative (contact, status page, come back later) |
| Empty state with no create action | First-run lists | The primary action lives in the empty state, not only in a toolbar |
| Zero results with no relaxation | Search, filtered tables | Clear one filter, clear all, widen scope, or create the missing thing |
| Permission denied with no request path | Shared links, role-gated pages | Name the permission needed and offer the request, or name who can grant it |
| Terminal modal | Modal with a disabled action, no close, escape swallowed | Escape and a visible close always work, unless the action is legally mandatory |
| Completed wizard returning to step 1 | Poor post-submit routing | Route to the result, never to the start |
| Expired session landing on home | Auth redirect that drops the target | Carry the target through auth and return to it |
| External redirect with no return | Payment, OAuth, doc signing | A return URL that lands on the flow step, not the app root |
| "Contact your administrator" | Enterprise permission walls | Name the administrator, or link the request. An instruction the user cannot act on is a dead end with extra words |

**Detection.** Build the route inventory (section 10), then for each screen list
its outbound actions: links, buttons that navigate, form submissions, redirects.
Any screen with zero outbound actions that is not the deliberate terminal state
of the product is a dead end. Then repeat with each screen's FAILURE render, which
is where dead ends actually live: the happy version of an error page usually has
a nav bar, and the error variant is often a bare centered string.

## 6. Progressive disclosure

Disclosure is how a flow serves the majority path without deleting the minority
path. It is also how required information gets hidden from the people who needed
it most, so the rules are strict.

- **Default open what the majority path needs.** If more than half of users open
  a section, it should not have been closed. If nobody opens it, question whether
  it belongs on the screen at all rather than moving it behind one more click.
- **Never hide:** required input, the consequences of the visible action,
  warnings, errors, or anything a user must read to answer the question in front
  of them. A disclosure is the wrong shape for a warning, because the reader who
  needs it is exactly the reader who will not open it.
- **A summary names its contents.** "What pausing does", "How the 24 hours are
  counted". Never "More", never a bare caret, never "Advanced" for something that
  is merely secondary.
- **Disclosure state that matters is URL state.** If a shared link should open
  with the section expanded, the expansion is in the URL. Otherwise the recipient
  of the link sees a different page from the sender.
- **One level deep.** A disclosure inside a disclosure means the information
  architecture is wrong, not that another caret is needed.
- **Disclosure is not a fix for length.** Moving 400 words behind a caret keeps
  400 words. Cross-reference `references/design/08-ux-writing.md` section 4b for
  the lead-plus-detail split and `references/review/05-density-and-economy.md`
  for the copy thresholds.

## 7. Cognitive load, with counts instead of vibes

"This screen feels busy" loses triage. These are countable.

| Signal | How to count | Threshold |
|---|---|---|
| Primary decisions on one screen | Controls whose choice changes the outcome or the path | 1. Two or more means split the screen or rank them |
| Peer options at one level | Items in a menu, tab bar, or nav level | 7 is comfortable, past 9 group them |
| Ungrouped fields in one block | `input`, `select`, `textarea` with no `fieldset` or heading between them | 6 |
| Unexplained domain terms | Nouns on the screen a new user cannot define from the screen itself | 0 on any first-run or public surface |
| Facts to remember between steps | Shown on step N, needed on step N+1, not displayed on N+1 | 0 |
| Words to read before the first action is possible | Word count above the primary control on first paint. Nav links, breadcrumbs, skip links and theme toggles are chrome, not the first control; a page with no qualifying control is measured against its primary content element instead | 50 in a control surface. Other surface types use the per-surface lede budgets in `references/design/12-copy-placement-and-volume.md` section 3: 25 words on a product or marketing surface, 40 on a content or reference page, no volume bar on an article template |
| Competing calls to action | Elements with primary visual weight | 1 |
| Simultaneous states on screen | Loading, error, and empty regions rendered at once | 2 is a smell, 3 is a broken screen composition |

Counting recipe:

```js
// Ungrouped field runs, competing primaries, and pre-action word count
({
  fields: document.querySelectorAll('form input, form select, form textarea').length,
  fieldsets: document.querySelectorAll('form fieldset').length,
  primaries: document.querySelectorAll('[data-variant=primary], .btn-primary, [type=submit]').length,
  wordsBeforeFirstControl: (() => {
    const main = document.querySelector('main') || document.body;
    // Chrome is not the first control. A skip link, a breadcrumb, a nav item or
    // a theme toggle sits above the task on every page, so counting them reports
    // 0 words on exactly the pages with a blob at the top.
    const chrome = (el) => {
      if (el.closest('nav, [role=navigation], [role=search], [aria-label*="breadcrumb" i]')) return true;
      const label = `${el.getAttribute('aria-label') || ''} ${el.textContent || ''}`.trim();
      if (label.length > 40) return false;
      return /^(skip|jump)\s+to\b/i.test(label) ||
             /\b(theme|dark mode|light mode|appearance|language|locale)\b/i.test(label);
    };
    const control = [...main.querySelectorAll(
      'button, input, select, textarea, a[href], [role=button], [role=tab]',
    )].find((el) => el.offsetParent !== null && !chrome(el));
    // No qualifying control: the page's job is its content, so measure against
    // the primary content element rather than reporting a clean 0.
    const primary = control || main.querySelector(
      'table, form, [data-primary], [role=grid], canvas, [data-chart], article',
    );
    if (!primary) return { words: 0, measuredAgainst: 'no primary element found' };
    const r = document.createRange();
    r.setStart(main, 0);
    r.setEndBefore(primary);
    return {
      words: r.toString().trim().split(/\s+/).filter(Boolean).length,
      measuredAgainst: primary.tagName.toLowerCase() + (primary.id ? `#${primary.id}` : ''),
      via: control ? 'first non-chrome control' : 'primary content element',
    };
  })(),
});
```

`measuredAgainst` is part of the finding, not debug output: a word count is only
arguable once the reader knows which element was taken as the thing the words sit
in front of. The per-surface budgets this count is compared against, and the
placement rules that bind even where no budget does, are
`references/design/12-copy-placement-and-volume.md` section 3.

Every cognitive-load finding carries its count. "This screen presents 11 peer
options and 3 competing primary actions" survives triage. The impression does not.

## 8. Multi-step and wizard patterns

**A wizard is right when** the steps have real sequential dependencies, the task
collects more than about 6 fields, the path branches on an early answer, the
endpoint is irreversible (payment, legal agreement, publish, delete), or the task
is done once and the user has no practice.

**A wizard is wrong when** the fields are independent (that is a form with
sections), the user repeats the task daily and wants one dense screen, or the
task is an EDIT of something that already exists. Editing in a wizard forces a
user who wants to change one value to walk four screens.

| Requirement | Applies to | Failure severity |
|---|---|---|
| Step indicator naming the step and the count: "Step 2 of 4: Billing" | Every wizard | MEDIUM if numeric only, HIGH if absent |
| Back that preserves every field | Every wizard | HIGH |
| Validation at the step, not only at final submit | Every wizard | HIGH |
| Save and exit | Over 3 steps, or over 2 minutes of typing | HIGH |
| Resume where the user left off | Any flow with save and exit | HIGH |
| Review step before an irreversible commit | Payment, publish, delete, contract | HIGH |
| Honest step count that does not grow mid-flow | Every wizard | HIGH. "Step 2 of 3" that delivers 6 steps is a trust defect, not a copy defect |
| Direct navigation back to a completed step | 4 steps or more | MEDIUM |
| An optional step that can be skipped without a value | Any step with no required input | MEDIUM |

Anti-patterns worth naming on sight: a progress bar that jumps backwards when a
branch adds steps; a wizard nested inside a modal with no exit; a final step that
submits and then routes to step 1; a "Continue" that is disabled with no
indication of what is missing (see `references/usability/04-states-feedback-and-affordances.md`
section 6).

## 9. Search and filter

Search is a flow, not a widget, and it is reviewed by driving it, not by looking
at the input.

| Requirement | Detail |
|---|---|
| Query and filters live in the URL | A result set a user can reach is a result set they can share and return to |
| Debounce | 50 to 100ms for local filtering, 150 to 250ms when each keystroke hits the server. Under 50ms wastes requests, over 300ms feels broken (validation and availability checks debounce longer: `references/usability/02-forms-and-error-recovery.md` section 1) |
| Result count stated and announced | Visible count plus an `aria-live="polite"` region, so the change is perceivable without sight |
| Zero results names the query | "No results for `invoive`" beats "No results", because it shows the typo |
| Zero results offers a relaxation | Clear one filter, clear all, widen the scope, or create the missing thing. At least one, always |
| Active filters visible and individually removable | Chips with a single clear-all once two or more are active |
| Filters do not destroy the query | Changing a filter never clears the search box, and vice versa |
| Sort, filter, query and scroll survive back from a detail | The single most common list defect in real products |
| Pre-query state is a deliberate choice | Recent searches, suggestions, or the unfiltered list. Not a blank panel by accident |

**Pagination or infinite scroll.** Infinite scroll costs footer reachability,
deep links to a position, back-restore, and any sense of how much exists. Use it
for browse-style feeds where position is meaningless. Use pagination for anything
a user cites, works through, or returns to. A "Load more" button is the middle
option and keeps the footer reachable.

A search review that never triggered the empty-query state and the zero-results
state has not reviewed search.

## 10. How to review a flow rather than a screen

Three modes, mapping onto `references/review/02-evidence-pipeline.md` (its
browser-assisted and full-evidence rows are both Mode A here). State which one
was used, because the confidence differs.

**Mode A, driven (browser or device available).** Walk the flow end to end,
capturing each step, then run the break tests below at every step. Highest
confidence. Flow claims are direct observations.

**Mode B, code reconstruction (source, no runtime).** Build the route inventory
from the router config or file-based routes; find each submit handler and trace
its success and failure branches; list every redirect; grep for the error paths.
Medium confidence. Every runtime claim is labeled as inferred from source, and
the finding says which line supports it.

```bash
# Route inventory, file-based routers
find . -path ./node_modules -prune -o \( -name 'page.tsx' -o -name 'route.ts' \) -print | sort
# Route inventory, config routers
grep -rn "path:\s*['\"]" src | grep -v node_modules
# Every redirect and its target
grep -rn "redirect(\|router.push(\|navigate(\|Response.redirect" src | grep -v node_modules
# Submit handlers and their failure branches
grep -rn "onSubmit\|action=\|useMutation\|useActionState" src | grep -v node_modules
```

**Mode C, screenshots only.** Flow claims are limited to what the frames show in
sequence. The correct conclusion on the three flow rows is "not assessed", never
"clean". Reporting them clean from static frames is a false negative the plugin
will be judged on, because it is exactly the defect class the frames cannot
contain.

### The break tests

Run at every step, not only at the end. This is the whole method.

| Test | Action | Pass condition |
|---|---|---|
| Back | Browser or system back | Previous step, every field intact, no resubmission, no duplicate record |
| Refresh | Reload the page | Same step, or a deliberate restart that says so, with typed input preserved |
| Deep link | Copy the URL, open in a clean session | The same state, or an auth prompt that returns to it after sign-in |
| Interrupt | Go offline, then act | The failure is stated, the input is intact, retry is offered |
| Invalid | Submit garbage, then submit empty | Field-level errors, focus moved to the first one, nothing retyped |
| Abandon and return | Leave the flow, come back later | A resumable draft, or a clean restart. Never a half-created record with no path to finish it |
| Double submit | Double-click the submit control | Exactly one record created |
| Slow | Throttle to slow 3G | Feedback under 100ms, progress indication past 1s, no frozen screen |
| Sideways entry | Enter at step 3 by URL | A redirect to the right step, or a state that makes sense, never a crash or an empty form that will submit |

**A flow review that did not press back is not a flow review.**

## 11. Defect signals and severity anchors

| Severity | Flow defects |
|---|---|
| CRITICAL | The primary task cannot be completed on a supported path; typed input is destroyed with no warning and no recovery; an irreversible action fires with neither confirmation nor undo; a dead end on the primary path |
| HIGH | Input lost on back or refresh; a step re-asks for data the system holds; no way back from a step; the success state does not confirm success; zero results with no relaxation; no save-and-exit past 3 steps; state a user would share is absent from the URL; a half-created record with no path to finish it; running prose above the primary control exceeding the surface's lede budget, or any paragraph inside the hero (`references/design/12-copy-placement-and-volume.md` section 3) |
| MEDIUM | 4 to 5 steps where 3 suffice; unnamed wizard steps; a disclosure hiding what most users need; more than 9 peer options at one level; two competing primary actions; explanatory prose above the primary control that stays inside the surface's lede budget but still delays the task |
| LOW | Step indicator without a count; debounce outside the useful window; no recent-search affordance; a skippable step with no skip |
| TASTE | Step ordering preference with no measured cost |

Flow findings quote the step. "Step 2 of 4 (Choose role) carries no address
state; Back returns to step 1 with an empty field list" is a finding. "The flow
feels disjointed" is not.

## 12. Cross-references

| Need | File |
|---|---|
| Validation timing, error copy, undo, data-loss prevention | `references/usability/02-forms-and-error-recovery.md` |
| Navigation models, wayfinding, back and deep-link contracts | `references/usability/03-navigation-and-information-architecture.md` |
| The complete state set, latency budgets, affordances | `references/usability/04-states-feedback-and-affordances.md` |
| Where each kind of state should live in code | `references/architecture/02-state-architecture.md` |
| Evidence modes and confidence | `references/review/02-evidence-pipeline.md` |
| Copy length, page economy, action distance | `references/review/05-density-and-economy.md` |
| Microcopy for errors, empties, confirmations | `references/design/08-ux-writing.md` |
| Redundant Entry, Error Prevention, Consistent Help | `references/accessibility/01-wcag-2-2.md` |
| The rubric rows these findings report against | `references/review/01-universal-rubric.md` |
