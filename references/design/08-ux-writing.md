---
topic: design
role: reference
scope: ux-writing
audience: ui-designer
---

# UX Writing: Words as Design Material

Words appear in an interface for one reason: to make it easier to understand, and therefore easier to use. They are design material, not decoration, and they get the same intentionality as spacing and color. Before writing anything, ask what the design needs to say and how it helps the person navigate; copy can make a design feel as templated as the layout itself.

## 1. Voice Rules

| Rule | Do | Not |
|---|---|---|
| Write from the user's side of the screen | Name things by what people control and recognize: "Manage notifications" | System vocabulary: "Webhook config", "Sync daemon settings" |
| Active voice, exact verbs | A control says what happens: "Save changes", "Publish article" | "Submit", "OK", "Proceed" |
| One name per action, through the whole flow | The "Publish" button produces a "Published" toast | Button "Publish", toast "Your post is live!", history "Deployed" |
| Describe, do not sell | "Exports every board as CSV" | "Supercharge your workflow with powerful exports" |
| Specific beats clever | "Deleted 3 files" | "Poof! All gone" |
| Sentence case, plain verbs, no filler | "Invite your team" | Title Case Everywhere, "Simply click...", "Please note that..." |
| One job per element | A label labels; an example demonstrates; a placeholder shows format | Placeholder doing the label's job (it vanishes on focus) |

Cohesion is how people learn their way around: the interface's vocabulary is signposting, and every synonym is a small betrayal of it. Keep one term per concept across nav, buttons, toasts, empty states, and docs.

## 2. Errors and Emptiness Are Direction, Not Mood

- **Errors state what went wrong and how to fix it,** in the interface's voice rather than a person's. They never apologize and are never vague: "Card declined. Try another card or contact your bank," not "Oops! Something went wrong." Place the message where the failure is (inline at the field, not only a toast), and keep the user's input intact for retry.
- **An empty screen is an invitation to act.** Name what will live here and give the one action that starts it: "No projects yet. Create your first project." First-run empty states may spend more warmth and illustration than the working UI (a justified POV break, `references/aesthetic/01-point-of-view.md` section 5).
- **Confirmations confirm the outcome, not the click.** "Copied", "Saved to Drafts", "Invitation sent to mara@..." (the outcome-confirmation motion pattern lives in `references/design/04-motion.md`).
- **Errors name the next action, always.** "What went wrong" without "what to do
  now" is half a message, and the missing half is the one the user needed. Retry,
  an alternative path, or who to ask: one of them is in every error string.
- **Partial failure names the survivors and the casualties.** "Sent 7 of 9
  invitations. mara@ is already a member; jo@ is not a valid address." Never
  "Some invitations could not be sent."
- **Destructive flows say what is destroyed.** "Delete 'Q3 Report'? This can't be undone." The confirm button repeats the verb ("Delete report"), never "Yes"/"OK".

## 2b. Destructive Actions: the Copy Is Downstream of a Structural Decision

The wording of a delete dialog only matters once the right pattern has been
chosen, and choosing wrong is the bigger defect. A confirmation on a reversible
action is friction that teaches people to click through dialogs, so the one that
mattered gets clicked through too. No confirmation and no undo on an irreversible
one is data loss. The decision rule (reversibility against blast radius), the
undo requirements, and the bulk and partial-failure rules live in
`references/usability/02-forms-and-error-recovery.md` section 7. This file
governs the strings each pattern needs.

| Pattern | Copy contract |
|---|---|
| Undo toast (reversible) | State the outcome in the past tense with the count, then offer undo: "Archived 23 conversations. Undo." Never "Are you sure?" for something already reversible |
| One-click confirm (recoverable with effort) | Name the object and where it goes: "Delete 'Q3 Report'? It moves to Trash for 30 days." |
| Explicit confirm (irreversible, own data) | Name the object AND the consequence in the body, and repeat the verb on the button: "Delete report" |
| Bulk confirm | The exact count, plus anything unusual inside it: "Delete 47 files, including 3 shared with others?" A count is not optional; "Delete selected items" hides the blast radius |
| Typed confirmation (irreversible, affects others or billing) | Say what breaks before asking them to type: "Deleting `acme-prod` removes 2 integrations and revokes access for 14 members. Type `acme-prod` to confirm." |
| Failed destruction | Say what state things are in now: "Could not delete 2 of 47 files. Nothing else changed." |

Three copy rules that hold across all of them:

- **"This can't be undone" is a claim, not a decoration.** If an undo exists, do
  not write it. If it does not, write it plainly and specifically ("The report
  and its 14 comments are permanently deleted"), because "permanently" alone
  does not tell the user what leaves with it.
- **The destructive warning stays whole and visible**, never inside a disclosure
  and never trimmed for length. The reader who needs it is exactly the one who
  will not expand it (section 4b's first carve-out).
- **The undo affordance says what it undoes** when more than one thing just
  happened: "Undo archive", not a bare "Undo" floating next to three toasts.

## 3. Copy Carries the POV

Tone is a POV decision (`references/aesthetic/01-point-of-view.md`), applied consistently:

| POV | The same action reads |
|---|---|
| Tactical operator | "Save and continue" |
| Editorial | "Publish article" |
| Workshop/crafted | "Save changes" |
| Terse-expert (API/docs products) | "Save" with exact object names, zero filler |

What never varies by POV: active voice, user-side naming, outcome-stating confirmations, and error clarity. Personality lives in warmth and rhythm, not in withholding information.

## 4. Content Formatting

| Content | Rule |
|---|---|
| Dates | Human-relative when recent ("2 hours ago", "Yesterday"), absolute with year beyond it ("Mar 14, 2026"); locale-aware; a `title`/tooltip carries the precise timestamp |
| Numbers | Thousands separators; compact only where space demands (12.9K) and consistently; tabular numerals in columns, proportional in prose and hero figures (`references/dataviz/03-marks-interaction-figures.md`) |
| Truncation | Truncate at the end, never mid-identifier; the full value reachable (tooltip, expansion); never truncate the only distinguishing part of a string |
| Placeholders | Demonstrate format ("name@company.com"), never instructions; instructions belong in labels or help text that persists |
| Units and currency | Attached to the value, once per group in dense tables (column header carries the unit) |

## 4b. Length: the rule this file was missing

Everything above governs how copy READS. None of it governs how much of it there
is, and that omission has a shipping history: an admin dashboard accumulated
fifteen visible paragraphs over three lines each (the worst a 121-word hint on
a settings form, a 71-word banner, nine explanatory paragraphs around one form),
and every UX-writing pass over it came back clean, because every individual
sentence was clear, correctly toned and accurate.

**The bar.** In a control surface (dashboard, settings, form, admin panel, any
interface where words sit between a person and their task), a visible paragraph
runs to **30 words**. That is roughly three lines at a 35em measure. Marketing
pages, documentation and onboarding are exempt; they are surfaces people came to
read.

**Lead and detail, not deletion.** Over the bar, split it: the load-bearing
fact stays visible, the qualifications move into a `<details>` with a summary
that says what is inside it ("What pausing does", "How the 24 hours are
counted"), never "More" or a bare caret. Nothing is lost and nothing is in the
way. Two carve-outs:

- **Destructive-action warnings stay whole and visible.** A disclosure is the
  wrong shape for a warning, because the reader who needs it is the one who will
  not open it. A sentence saying which saves discard collected data is complete
  at a glance or it is not doing its job.
- **Accuracy outranks the count.** One rewrite for length turned "changing the
  window" into "widening the window or schedule", which quietly told an operator
  that narrowing the window was free. It is not. If the short version is not
  true, keep the long one and record the exemption.

**Know where the words came from, or you will write them again.** Long UI copy
is rarely one careless author; it is accretion under review pressure. Each round
that found a figure potentially misleading answered by ADDING a qualifying
clause, and no round ever removed one, because no reviewer was scored on the
total. Every sentence was individually justified, and the comments defending them
ran longer than the strings. So the fix is structural (lead plus disclosure) and
the GUARD is a test that counts words on the rendered page, not a note asking
people to be concise.

## 5. Review Checklist

Run over any surface that ships prose (the content-quality dimension of `references/review/01-universal-rubric.md`):

- Every button states its outcome as a verb phrase; no "Submit"/"OK"/"Yes" on consequential actions.
- One vocabulary: grep the surface for synonyms of its core nouns and verbs; collapse them.
- Errors name the cause and the fix, inline, with input preserved. Every error string ends with something the reader can do.
- Empty states invite the starting action; loading states name what is loading when it takes more than a beat. First-run empty and zero-results empty carry different copy: one offers creation, the other offers relaxing the query.
- Every destructive control has the pattern its reversibility calls for (undo toast, confirm, or typed confirm), and the copy contract for that pattern: object named, count stated, consequence stated, verb repeated on the button (section 2b).
- No lorem ipsum, no marketing filler inside product chrome, no label that needs a tooltip to be understood.
- Sentence case throughout unless the POV explicitly commits otherwise; small caps for overlines via `font-feature-settings`, not shouting uppercase body text.
- Copy tone matches the POV brief's stated register, including in errors: a tactical product does not suddenly get whimsical at failure.
- **No visible paragraph in a control surface runs past 30 words** (section 4b). Count them on the RENDERED page with disclosure bodies excluded, rather than reading for a general impression of wordiness. The impression test is what passed a page carrying a 121-word hint.
- Explanatory prose is not the first thing above the primary data on first paint.

## 6. Cross-References

| Need | File |
|---|---|
| POV and tone-of-voice decisions | `references/aesthetic/01-point-of-view.md` |
| Outcome-confirmation motion | `references/design/04-motion.md` |
| Content-quality review dimension | `references/review/01-universal-rubric.md` |
| Type system the copy renders in | `references/design/02-typography.md` |
| Length thresholds, disclosure rules, measurement | `references/review/05-density-and-economy.md` |
| Confirm-versus-undo decision rule, undo requirements, bulk and partial-failure rules | `references/usability/02-forms-and-error-recovery.md` |
| The state set each of these strings belongs to (empty, error, offline, permission denied) | `references/usability/04-states-feedback-and-affordances.md` |
| Nav labels, one term per destination across nav, title, heading and breadcrumb | `references/usability/03-navigation-and-information-architecture.md` |
| Where copy sits in a task sequence, and progressive disclosure | `references/usability/01-task-flows-and-journeys.md` |
