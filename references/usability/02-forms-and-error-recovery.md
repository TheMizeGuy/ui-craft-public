---
topic: usability
role: reference
scope: forms-and-error-recovery
audience: ui-engineer
---

# Forms and Error Recovery

Forms are where usability is won or lost, and error recovery is where trust is.
This file covers both because they are the same subject: everything below is
about what happens when a person's input meets a system that can refuse it.

## 1. Validation timing

Timing is the decision that makes a form feel helpful or hostile, and it is
almost always made by accident (whatever the form library defaults to).

The governing rule is **reward early, punish late**: tell people something is
right as soon as you can prove it, and tell them something is wrong as late as
you can without wasting their work.

| Timing | Correct for | Wrong when | Failure it causes |
|---|---|---|---|
| On blur | Format and shape checks on a field the user has finished with: email syntax, date format, minimum length | Applied to a field the user tabbed through without typing | "Required" errors on empty fields the user has not reached yet |
| On submit | Cross-field rules, server truth, anything expensive: password confirmation, date range order, uniqueness, payment authorization | Used as the ONLY timing on a long form | The user finds out about field 3 after filling field 22 |
| Live, per keystroke | Constraints with a live budget: character counters, password strength, availability checks (debounced), format masks | Used for correctness on a partially typed value | "Invalid email" while typing the fifth character of an address |
| On input, after the field has already errored | Always. Once a field is in an error state, revalidate as they type so the error clears the moment it is fixed | Never wrong | Without it, the user fixes the value and the error stays, so they assume the fix failed |
| Async, debounced | Uniqueness, existence, coupon validity | Debounce under 300ms, or without a pending state | Request storm, and an error that flashes between keystrokes |

Concrete defaults that work:

- Text and email: validate on blur, revalidate on input once errored.
- Password strength: live meter, but the pass or fail verdict on blur.
- Async uniqueness: debounce 400 to 600ms, show a pending state on the field,
  never block submit while pending (queue the check into the submit). A search
  box is the opposite case, 150 to 250ms per
  `references/usability/01-task-flows-and-journeys.md` section 9: results are
  what the user asked for, while a uniqueness check is a side effect they did
  not.
- Cross-field (confirm password, end date after start date): on submit, and on
  blur of the SECOND field once both have values.
- Never validate a field the user has not interacted with, until submit. A form
  that greets a new user with six red errors has told them they failed before
  they started.

**Detection.** Load the form, tab from the first field to the last without
typing, and watch. Errors appearing on untouched empty fields is a MEDIUM (HIGH
if it happens on page load). Then type one character in each field and watch for
errors on partial values. Then submit empty, and see whether the errors arrive
all at once with focus moved.

## 2. Error message content

Every error answers three things: what happened, why, and what to do. Missing
the third is the most common failure and the most expensive.

| Rule | Do | Not |
|---|---|---|
| Name the actual constraint with its actual value | "Password needs at least 12 characters. You have 8." | "Password too short" |
| Say what to do next | "Card declined. Try another card, or contact your bank." | "Payment failed" |
| Speak from the field, not from the stack | "Enter a date on or after today." | "ValidationError: date.min" |
| Never blame the user | "That email is already registered. Sign in, or reset your password." | "You entered an invalid email" |
| Never apologize instead of informing | "Upload failed: the file is 34MB, the limit is 25MB." | "Oops! Something went wrong." |
| Be specific about which of several | "Rows 4 and 9 have no amount." | "Some rows are invalid" |
| Preserve the input, always | The bad value stays in the field so it can be edited | Clearing the field so the user retypes it |
| Match the field's own vocabulary | Label "Account holder", error "Enter the account holder's name" | Label "Account holder", error "Name is required" |

Server errors get the same treatment. A 500 shown as "Internal server error" is
a raw stack trace with better manners. The user-facing version names the
operation and the next action: "Could not save the invoice. Your changes are
still here. Try again, or copy them somewhere safe if this keeps happening."

Copy rules for the sentence itself (voice, tone, casing) live in
`references/design/08-ux-writing.md` section 2. This file governs whether the
message exists and whether it is actionable.

## 3. Inline errors, summaries, and where focus goes

Both, on any form over about five fields, and always on server rejection.

**Inline, at the field:**

```html
<label for="email">Work email</label>
<input id="email" name="email" type="email" inputmode="email"
       autocomplete="email" required aria-required="true"
       aria-invalid="true" aria-describedby="email-hint email-err">
<p id="email-hint">We use this for sign-in and receipts.</p>
<p id="email-err" class="field-error">
  <svg aria-hidden="true" ...></svg>
  Enter an address that includes an @ and a domain, like name@company.com.
</p>
```

Requirements: `aria-invalid` on the control, the message linked with
`aria-describedby` (hint and error both, space separated), an icon or text marker
so the error is not conveyed by red alone (WCAG 1.4.1), and the message
positioned so it cannot be covered by a sticky footer or a mobile keyboard.

**Summary, on submit failure:**

```html
<div role="alert" tabindex="-1" id="form-errors">
  <h2>3 fields need attention</h2>
  <ul>
    <li><a href="#email">Work email: enter a full address</a></li>
    <li><a href="#seats">Seats: enter a number between 1 and 500</a></li>
    <li><a href="#card">Card: this card expired in 2025</a></li>
  </ul>
</div>
```

Requirements: rendered at the top of the form, focus moved to it programmatically
on failed submit (`role="alert"` announces, `tabindex="-1"` plus `.focus()` puts
the keyboard there), the count stated, and each entry linking to its field. On a
single-field failure the summary is optional; on a multi-field failure it is the
difference between one scan and a hunt.

Never move focus to the first invalid FIELD instead of the summary when there is
more than one error: the user then learns about one problem and discovers the
next only after fixing it.

## 4. Required and optional marking

- Mark the minority. If most fields are required, mark the optional ones with
  the word "Optional" in the label. If most are optional, mark the required ones.
- An asterisk alone needs a legend, and legends are read by nobody. The word
  works at every literacy level and in every locale.
- `required` on the control, plus `aria-required="true"` where the framework
  strips it. Both, because native validation UI and screen-reader announcement
  come from different places.
- Never mark required with color or weight alone.
- Do not ask for anything optional on a first-run flow unless the answer changes
  what happens next. An optional field is a decision imposed on someone who came
  to do something else.

## 5. Input types, keyboards, and autofill

Getting these right removes entire classes of error before validation runs.
Every one is a one-line change and every one is routinely missed.

| Field | type | inputmode | autocomplete |
|---|---|---|---|
| Email | `email` | `email` | `email` (or `username` on sign-in) |
| Password, existing | `password` | | `current-password` |
| Password, new | `password` | | `new-password` |
| One-time code | `text` | `numeric` | `one-time-code` |
| Phone | `tel` | `tel` | `tel` |
| Card number | `text` | `numeric` | `cc-number` |
| Card expiry | `text` | `numeric` | `cc-exp` |
| Card security code | `text` | `numeric` | `cc-csc` |
| Postal code | `text` | `numeric` for numeric-only locales, else `text` | `postal-code` |
| Street address | `text` | | `address-line1` |
| Country | `select` | | `country-name` |
| Name | `text` | | `name`, `given-name`, `family-name` |
| Quantity, seats | `number` with `min`/`max`/`step` | `numeric` | off |
| Search | `search` | `search` | off |
| URL | `url` | `url` | `url` |

Hard rules:

- **Never `type="number"` for card numbers, phone numbers, postal codes, or
  OTPs.** Spinner arrows, scroll-wheel mutation, silent truncation of leading
  zeros, and locale-dependent grouping all apply, and none of them are wanted.
  `inputmode="numeric"` with `type="text"` gives the numeric keypad without the
  numeric semantics.
- Never disable paste anywhere, and least of all on password and OTP fields.
  Blocking paste breaks password managers and fails WCAG 3.3.8.
- `autocomplete` on personal-data fields is WCAG 1.3.5 (Identify Input Purpose)
  at AA, not a convenience.
- Set `enterkeyhint` on multi-field mobile forms (`next` mid-form, `done` or
  `send` at the end) so the on-screen return key matches the flow.
- Field width is an affordance: a 2-character field for a state code and a
  4-character field for a year tell the user the expected shape. A full-width
  input for a 3-digit code is a small lie about what is wanted.

## 6. Preventing data loss

The rule: **a person's typing is their property and the interface is holding it
in trust.**

| Situation | Requirement |
|---|---|
| In-app navigation away from a dirty form | Router guard that offers Stay or Discard, naming what is unsaved |
| Browser close or reload with a dirty form | `beforeunload` handler, registered only while genuinely dirty and removed on save |
| Failed submit | Everything stays. The form does not clear, reset, or remount |
| Back from a later step | Every earlier step's values restored (see `references/usability/01-task-flows-and-journeys.md` section 4) |
| Session expiry mid-form | Draft preserved, re-auth, return to the same form with values |
| Long-form content (posts, tickets, descriptions) | Autosave draft with a visible "Saved" or "Saving" indicator and a timestamp |
| File uploads | Survive an unrelated field's validation failure, or the form says plainly that files must be re-attached |
| Multi-tab editing | Detect the conflict on save (version or ETag) and offer a choice, never a silent last-write-wins |

`beforeunload` registered unconditionally is its own defect: it prompts users
who changed nothing, they learn to dismiss it, and the one time it mattered they
dismissed that too.

```js
// Register only while dirty; remove on save and on unmount.
const guard = (e) => { e.preventDefault(); e.returnValue = ''; };
isDirty ? addEventListener('beforeunload', guard) : removeEventListener('beforeunload', guard);
```

## 7. Destructive actions: confirm, or undo, or both

The plugin's previous guidance on destruction was a single microcopy rule. The
structural decision comes first: **confirmation and undo are alternatives, and
picking the wrong one is the defect.** A confirmation dialog on a reversible
action is friction that trains people to click through dialogs. No confirmation
on an irreversible one is a data-loss bug.

Decide on two axes: **reversibility** (can the system put it back, exactly?) and
**blast radius** (how much, and whose?).

| Reversible? | Blast radius | Pattern | Detail |
|---|---|---|---|
| Yes, exactly | Own, small | Do it, offer undo | No dialog. Act immediately, show an undo affordance for at least 8 seconds |
| Yes, exactly | Own, bulk | Do it, offer undo, state the count | "Archived 23 conversations. Undo." |
| Yes, with effort | Own | One-click confirm naming the object | "Delete 'Q3 Report'? It moves to Trash for 30 days." |
| No | Own, single object | Explicit confirm naming the object and the consequence | Confirm button repeats the verb: "Delete report" |
| No | Own, bulk | Confirm with the exact count and what is included | "Delete 47 files, including 3 shared with others?" |
| No | Others, or billing, or public | Typed confirmation plus a consequence list | Type the project name; list what breaks (2 integrations, 14 members lose access) |
| No | Irreversible and cross-user | Typed confirmation, consequence list, and a cooling-off or export offer | Account deletion, workspace deletion, data purge |

**Undo requirements** (an undo affordance that fails any of these is not undo):

- Reachable by keyboard and announced to assistive tech. A toast that only
  appears visually, or that steals focus, both fail.
- Alive for at least 8 seconds, longer for bulk operations, and never dismissed
  by an unrelated interaction. Hover or focus pauses the timer.
- Restores the exact prior state: same identifier, same position in the list,
  same relations. An "undo" that creates a new record with a new id, loses the
  ordering, or drops the comment thread is a re-create wearing undo's label.
- Idempotent and honest under failure: if the undo fails, say so and say what
  the current state is.
- Never the only recovery for an irreversible action. Undo with a timer plus
  irreversibility means the recovery expires while the user is still reading.

**Confirmation requirements:**

- Name the object, not the type: "Delete 'Q3 Report'", never "Delete item".
- State the consequence, in the dialog, not only in the button.
- The confirm button repeats the verb ("Delete report"), never "Yes" or "OK".
- The destructive button carries the destructive treatment, and the safe choice
  is the default focus target.
- No motion flourish on serious confirms (cross-reference
  `references/aesthetic/03-taste-checklist.md` section 5).
- Typed confirmation is reserved for the cases above. Everywhere else it is
  theatre, and theatre is trained through.
- A confirmation that appears when nothing will be destroyed (deleting an empty
  draft) is noise. Skip it.

**Bulk actions** additionally state the count in the trigger, the confirm, and
the result: "Delete 47", "Delete 47 files?", "Deleted 47 files. Undo." A bulk
action whose selection is invisible at the moment of confirming (selection made
by a filter, then the filter changed) must restate what is included.

## 8. Partial failure

Bulk and multi-item operations succeed partially, and the generic "some items
failed" is the single most useless message a UI can produce.

Requirements:

- State the split with numbers: "Sent 7 of 9 invitations."
- Name what failed and why, per item: "mara@ (already a member), jo@ (invalid
  address)".
- Offer retry for ONLY the failed items, with the successful ones untouched.
- Never re-run the whole batch on retry, and never leave the user to work out
  which succeeded by inspecting the list.
- Make the failure list copyable or exportable past about 10 items.
- If the operation is not atomic, say so before it runs when the blast radius
  warrants it.

## 9. Recovery from every failure state

Every failure gets a named next action. This table is the inventory a reviewer
walks; a form or flow that cannot answer a row has a finding on that row.

| Failure | Required UI | Required next action |
|---|---|---|
| Field validation | Inline error plus summary on multi-error | Fix in place, input preserved |
| Network unreachable | Stated offline or connection state, not a generic error | Retry, plus the assurance that input is held |
| Request timeout | Distinguish from failure: the operation may have succeeded | Check state or retry safely (idempotency key) |
| Server 5xx | Plain-language failure naming the operation | Retry, and an escape (support, status) if it repeats |
| Auth expired | Re-auth without losing the form | Return to the same place with values intact |
| Permission denied | Name the permission and who holds it | Request access, or switch account, or leave without losing work |
| Conflict, stale version | Show that someone else changed it, and what changed if possible | Overwrite, merge, or discard, chosen by the user |
| Rate limited | State the limit and when it resets | Wait with a visible countdown, or an alternative path |
| Quota or seat limit | State the current and the maximum | Upgrade, free a seat, or reduce the request |
| Partial success | Section 8 | Retry the failures only |
| Client crash in a flow | Error boundary that keeps the shell and the draft | Reload the step, not the app |

Two rules that apply to the whole table: **the user's input survives every row**,
and **no row is allowed to be a dead end** (see
`references/usability/01-task-flows-and-journeys.md` section 5).

## 10. Submission state

- Prevent double submit by disabling or busy-marking the control during the
  request, not by trusting the user. Confirm the outcome when it lands.
- Show a busy state on the control itself within 100ms of the click, with the
  label changing to the ongoing verb ("Saving...") or a spinner plus the label.
  A silent 800ms is indistinguishable from a dead button, and the user clicks
  again.
- **Do not disable the submit button until the form is valid.** It is the most
  common form anti-pattern in generated UI: the user has no way to discover what
  is missing, screen-reader users cannot reach it, and the form gives no
  feedback at all. Keep it enabled, validate on submit, move focus to the error
  summary. If a disabled state is genuinely required, keep it focusable with
  `aria-disabled="true"` and explain the blocker in adjacent text.
- Idempotency for anything that creates or charges: a client-generated key sent
  with the request, so a retry after a timeout cannot double-charge.
- After success, route somewhere that proves it: the created object, the updated
  list with the row highlighted, or a confirmation naming the outcome.

## 11. Detection procedures

Run these against any form, with no design doc and no spec.

| Test | Expected |
|---|---|
| Submit completely empty | Errors on every required field, summary present, focus moved, nothing retyped |
| Submit with one field invalid | Inline error naming the constraint and the fix |
| Tab through without typing | No errors on untouched fields |
| Type one character in each field | No correctness errors on partial values |
| Fix an errored field | The error clears as they type, not on the next submit |
| Paste into every field | Paste works everywhere, including password and OTP |
| Focus each field on a phone | The correct keyboard appears; the field is not covered by it |
| Autofill from the browser or password manager | Fields fill and the form accepts the result |
| Break the network at submit | Failure is stated, input intact, retry offered |
| Submit twice fast | One record |
| Reload mid-form | Draft or an explicit warning, never silent loss |
| Navigate away mid-form | Guard prompt naming what is unsaved |
| Zoom to 200% | Errors, labels and the submit control all still reachable |
| Screen reader over an errored form | Error count announced, each field's error read with the field |
| Every destructive control | Confirmation or undo per section 7, and the undo actually restores |

```js
// Fast audit of a form's input hygiene
[...document.querySelectorAll('input, select, textarea')].map((el) => ({
  name: el.name || el.id,
  type: el.type,
  inputmode: el.inputMode || null,
  autocomplete: el.autocomplete || null,
  labelled: !!(el.labels?.length || el.getAttribute('aria-label') ||
               el.getAttribute('aria-labelledby')),
  describedBy: el.getAttribute('aria-describedby'),
  required: el.required || el.getAttribute('aria-required') === 'true',
})).filter((f) => !f.labelled || (!f.autocomplete && /mail|name|phone|address|card|zip|postal/i.test(f.name || '')));
```

## 12. Severity anchors

| Severity | Form and recovery defects |
|---|---|
| CRITICAL | Submitted input is destroyed on failure; an irreversible destructive action with neither confirmation nor undo; a form that cannot be submitted by keyboard |
| HIGH | No error message on a rejected submit; errors that do not say how to fix; focus not moved to the error on submit failure; disabled submit with no explanation of what is missing; input lost on reload or back; `type="number"` on a card or OTP field; no undo and no confirm on a bulk delete; partial failure reported as "some items failed"; missing `autocomplete` on personal-data fields (WCAG 1.3.5); no busy state on submit; errors conveyed only by color; paste blocked on a password or OTP field (either of the last two is CRITICAL when it blocks sign-in or the primary task) |
| MEDIUM | Errors on untouched fields; validation on partial values; error that does not clear until resubmit; required marked by asterisk with no legend; no summary on a multi-error submit; confirmation dialog on a trivially reversible action |
| LOW | `enterkeyhint` missing; field width unrelated to expected content; undo window under 8 seconds; hint text that repeats the label |
| TASTE | Placement preference for hints; wording alternatives that are equally clear |

## 13. Cross-references

| Need | File |
|---|---|
| Flow-level state, break tests, multi-step patterns | `references/usability/01-task-flows-and-journeys.md` |
| Where a form sits in a navigation model, back semantics | `references/usability/03-navigation-and-information-architecture.md` |
| Loading, busy, offline and disabled state rendering | `references/usability/04-states-feedback-and-affordances.md` |
| Error and confirmation wording, voice, casing | `references/design/08-ux-writing.md` |
| Error identification, suggestion, prevention, redundant entry | `references/accessibility/01-wcag-2-2.md` |
| Focus management and keyboard reachability | `references/accessibility/02-keyboard-focus.md` |
| Live regions and announcement | `references/accessibility/04-screen-reader.md` |
| Form state ownership in code | `references/architecture/02-state-architecture.md` |
| The rubric rows these findings report against | `references/review/01-universal-rubric.md` |
