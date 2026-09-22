# ui-craft regression harness

A labeled corpus plus a zero-dependency scorer that measures how many of a UI
review's known tells ui-craft actually catches. It turns "the catalogue looks
good" into two numbers: recall and precision against ground truth, both gated at
`>= 0.8`.

- Corpus: `../corpus/fixtures/*` (HTML, CSS and TSX fixtures) + `../corpus/labels.json` (ground truth).
- Scorer: `score-review.mjs` (node >= 18, stdlib only, no installs).
- Worked example of a findings file: `examples/sample-findings.json`.
- Degenerate input the gate must reject: `examples/tellref-stubs.json`.
- The scorer's own tests: `selftest.mjs` (`node tests/harness/selftest.mjs`).
- The substance script's colour parser: `measure-colour.selftest.mjs`
  (`node tests/harness/measure-colour.selftest.mjs`), one case per computed-colour
  notation Chrome can emit, because a notation the parser cannot read makes the
  accent row report the wrong colour and the surface row miss a level.

Fixture and label counts are deliberately not quoted here: the corpus grows, and
a number written into prose goes stale the first time it does. Read the current
shape out of `labels.json`.

## Do not tune the auditor to the corpus

This is the harness's single most important operating constraint, so it goes
first. The corpus is a sample of known tells, not the definition of a good
review. Raising a score by teaching an agent the answers, by naming catalogue
codes more often, or by relabeling a fixture until a miss becomes a hit,
produces a green number and a worse plugin. The only legitimate way to raise
recall is to make detection genuinely better; the only legitimate reason to edit
`labels.json` is that a label was wrong about the fixture.

## When to run this

Run the harness (produce a findings file, then score it) whenever you change:

1. `references/catalogue/01-ai-tells.md` or `02-empirical-evidence.md` (a tell added, removed, re-severitied, or re-worded),
2. `agents/ui-anti-slop-auditor.md` or `agents/ui-visual-reviewer.md` (how tells are detected or emitted),
3. the finding shape (`ci/verdict-artifact-schema.json` definitions.finding), or
4. any skill that dispatches those agents.

That four-item list is canonical. Where another file gives a shorter one, this
file wins; the narrower two-item version leaves visual-reviewer and
`02-empirical-evidence.md` edits shipping unscored.

A catalogue edit that quietly drops a tell shows up here as a recall regression.
Green means the corpus still catches what it used to; a drop means a fixture's
expected tell stopped being found. A rise in noise shows up as a precision
regression, which is the failure mode the catalogue's presence-vs-concentration
rules exist to prevent.

## The two-step loop

### 1. Produce a findings file

Run a ui-craft review over the corpus and capture its findings as a JSON array.
Two ways:

- **Dispatch the auditor directly** (fastest, single-dimension). Dispatch
  `ui-anti-slop-auditor` (a `general-purpose` agent with the auditor body inlined)
  and point it at `tests/corpus/fixtures/`. Instruct it, verbatim:

  > Audit every file in `tests/corpus/fixtures/` (HTML, CSS and TSX) against the internal
  > catalogue (`references/catalogue/01-ai-tells.md`). Emit a single JSON array of
  > findings and nothing else. Each finding object uses the canonical shape:
  > `{ "id": "<dimension>-<kebab-slug>", "dimension": "anti-ai", "severity": "...",
  > "confidence": "...", "file": "<fixture filename>", "line": <n>, "title": "...",
  > "evidence": "...", "tellRef": "<catalogue code, e.g. V5, L6, section 12>" }`.
  > Set `file` to the fixture's filename and `tellRef` to the catalogue code the
  > finding maps to. Do not read `labels.json`.

- **Run the skill** `/ui-craft:review-ui` against `tests/corpus/fixtures/` and have
  the run write its merged findings array to a file in the same canonical shape.

Save the array to e.g. `/tmp/run.json`. Keep `labels.json` out of the reviewer's
context so the score reflects real detection, not the answer key.

### 2. Score it

```bash
node tests/harness/score-review.mjs /tmp/run.json
```

Exit `0` = pass (recall `>= 0.8` AND precision `>= 0.8` AND every clean control
within tolerance), `1` = fail, `2` = usage error or malformed input. CI can gate
on the exit code.

```
node score-review.mjs <findings.json> [--fixture <name>] [--format text|json]
                      [--min-recall <0..1>] [--min-precision <0..1>]
                      [--labels <path>]
```

| Flag | Meaning |
|---|---|
| `--fixture <name>` | Score one fixture only (basename, e.g. `gradient-hero.html`). |
| `--format text\|json` | `text` (default) prints a per-fixture table; `json` emits a machine-readable object. |
| `--min-recall <0..1>` | Override the `0.8` recall threshold. Must be `> 0`. |
| `--min-precision <0..1>` | Override the `0.8` precision threshold. Must be `> 0`. |
| `--labels <path>` | Use a different labels file (default: `../corpus/labels.json`). |

Every value-taking flag errors (exit `2`) when its value is missing, rather than
swallowing the omission: `--fixture "$UNSET_VAR"` used to silently widen the
scope from one fixture to all ten and still print PASS. `0` is rejected for both
thresholds because it turns the gate into an unconditional pass with nothing in
the output saying so; any threshold below the default prints a loud
`WARNING: thresholds lowered` line so a relaxed run is never mistaken for a
default-gate run.

Exit `2` also covers three input-shape problems, all of which mean "this file is
not a review" rather than "this review scored badly": a duplicate finding `id`
on the same fixture, an `id` that is not `<dimension>-<kebab-slug>`, and an
empty findings array when the corpus expects tells.

Try it now against the shipped example:

```bash
node tests/harness/score-review.mjs tests/harness/examples/sample-findings.json
```

### Which number is the baseline

Five findings files ship. Two of them are live -- the answer key and the current
blind baseline -- and they measure different things, so neither on its own is "the"
recall of the plugin. The other three are frozen history and gate nothing. Do not
conflate them.

| File | What it is |
|---|---|
| `examples/sample-findings.json` | The **answer-key ceiling**: a hand-authored findings file written against `labels.json`. It is the best score the labels permit, and its misses are label-granularity artifacts, not detection failures. No agent produced it, so it is not evidence of detection. |
| `../corpus/baseline-2026-09-22.json` | The **current committed blind baseline**: a real run of the `ui-anti-slop-auditor` body over every fixture in the 0.6.0 corpus with every answer key kept out of context. This is the measured number, and the one a detection regression is judged against. It clears both thresholds and fails one clean control, on purpose: that failure is a live over-fire report against a detection rule, not a corpus defect. Its score and readings are in the dated section below. |
| `../corpus/baseline-2026-09-01.json` | **Superseded, kept as history.** The 0.5.0 blind run over 21 fixtures, which scored recall 0.828 / precision 0.960 against the 29-label corpus of its day. It predates everything added in 0.6.0, so against the current 46-label corpus it reads 0.500 / 0.920. That drop is the corpus growing, not detection getting worse. Do not gate on it. |
| `../corpus/baseline-2026-07-27.json` | **Superseded, kept as history.** The 0.3.0 blind run over 15 fixtures. It scored recall 0.917 / precision 0.957 against the 24-label corpus after the 2026-09-01 label split (0.900 / 0.783 before it) and predates every fixture added since, so against the current corpus it reads 0.457 / 0.913. Do not gate on it. |
| `../corpus/baseline-0.1.2.json` | **Superseded, kept as history.** The 0.1.2 blind run, captured against an 18-label corpus. It reads 0.304 / 0.933 against the current corpus, well below threshold, only because it predates thirty fixtures, the 2026-09-01 label split and everything added in 0.6.0. Do not read that as a regression and do not gate on it. |

At the 0.1.2 corpus (18 labels across 10 fixtures) the answer key scored 0.889
and the blind run scored 0.833. Quoting 0.889 as "the" recall overstated measured
detection by a full label and hid that the auditor's real `gradient-hero`
performance was 1 of 3, not 2 of 3.

**Both live files go stale when the corpus grows, and staleness looks exactly like a
regression.** Adding fixtures or labels adds expectations neither file was
written against, so both recalls drop through no fault of the auditor. Widening
the corpus therefore carries a three-part obligation: commit a fresh dated blind
baseline over the whole corpus (retiring the previous one to history in this file),
extend `sample-findings.json` to cover the new labels, and re-run
`node tests/harness/label-contract.mjs` so no new label carries a severity the
catalogue's section 18 disagrees with. Until that happens, a sub-threshold score on
either live file means "the baseline is out of date", not "detection got worse", and
the two must not be confused.

**Retiring a label has the mirror effect, and it lands on the frozen files.**
When a catalogue change makes a label wrong about its fixture and the label is
removed, every findings file that already reported that tell keeps a finding
with nothing left to match, so its precision drops by one. That is the correct
reading of a retired label, not a hallucination in an old run, and a frozen
historical baseline is never edited to hide it (see "never delete correct
findings from the baseline" under the 2026-09-01 label split). The answer key is
the exception: it is regenerated against the current labels, so it is the one
file that is kept at precision 1.

#### Blind baseline, 2026-09-22 (0.6.0 corpus, 40 fixtures)

> 0.6.2 added a 41st fixture, `mono-readouts.ts` (T13), after this run. It was scored
> by a separate blind dispatch of the auditor the same day (one finding, T13 at
> CRITICAL, line 13, no false positives) and appended to `baseline-2026-09-22.json`,
> which now scores 46 of 48 labels (recall 0.958, precision 0.92). The next full
> blind run replaces the file; until then the numbers below describe the 40-fixture
> pass and the appended row describes the 41st.

`../corpus/baseline-2026-09-22.json` is a blind run of the shipped
`ui-anti-slop-auditor` body (with the deterministic pre-pass it now runs itself,
`scripts/scan_tells.mjs`) over all 40 fixtures of the 0.6.0 corpus, captured
with `labels.json`, `sample-findings.json`, every prior baseline, both corpus
READMEs, the scorer, the selftest and the label contract withheld from the
reviewer. It supersedes `baseline-2026-09-01.json` as the current detection
measurement. Two earlier runs were captured on the same date and overwritten at
the same filename: one over the 26-fixture corpus before the anti-slop design
port (0.882 / 1.000 against 34 labels), and one over the 40-fixture corpus
before three auditor defects that run exposed were fixed (0.830 / 0.886, with
`near-miss-controls.html` tripping on a capped width inside a `min-width` query
that the auditor read as L13, D2 firing at two `transition-all` declarations
against the D rows' three, and an absent viewport meta cited as P4 instead of
L13). This run is the one after those fixes.

| Metric | Value | Reading |
|---|---|---|
| recall | **0.957** (45/47) | The detection signal against the 47-label corpus. Not comparable with 0.882 against 34 labels: that run predates every ported fixture. |
| precision | 0.918 (45/49) | Forty-nine findings, four unmatched, every one a correct reading the labels cannot cite (below). |
| clean controls | 13 of 13 within tolerance | Every near-miss control drew nothing above its tolerance, including `near-miss-controls.html` at 0 after the L13 fix. |

**The two misses.** The second `section 14` label on `token-drift.html` (the
same-span folding documented at 2026-09-01: one finding covering several
enumerated labels) and M6 on `motion-rhythm.html`, a genuine miss of an absence
(decorative transitions with no `prefers-reduced-motion` handling in either
direction) worth watching at the next run.

**The four unmatched findings, all correct.** T1 on `cream-serif-sage.html`
(the fixture declares Inter as its only sans face; the copied label set never
enumerated it); alternative text on `gallery-unlabelled.html` (a real defect the
auditor files under `accessibility` with WCAG 1.1.1, which no catalogue row
names, so no label can cite it); D1 on `legacy-theme.css` (repeated literal
radii with no radius identity; the port dropped that label because the literals
are 6px and 12px rather than the row's 8px and 10px example, and the auditor read
the row by its rule, not its example); and the same-span fold's other half. None
is noise: a finding a label cannot cite lowers precision without lowering the
review's value, which is why the selftest holds the blind baseline to the gate
threshold rather than to 1.


### Verify the scorer itself

```bash
node tests/harness/selftest.mjs
# -> 23 passed, 0 failed (exit 0)
```

`selftest.mjs` tests the **scorer**, not the corpus. Every deterministic case
runs against a synthetic labels file built in a scratch directory, so adding
fixtures can never turn it red: it asserts that `examples/tellref-stubs.json`
scores below threshold, that sprayed false positives fail on precision, that
clean controls still bound incidentals, and that every flag and input-shape error
returns the documented exit code. Its only corpus-dependent checks are relations
that hold at any corpus size (the shipped inputs carry no false positives; the
answer key scores at or above the blind run). Run it after touching
`score-review.mjs`.

## How matching works

For each expected label the scorer looks, within the same fixture, for a finding
that matches by:

0. **Substance floor (gate on both paths).** The finding's `title` must yield at
   least 3 meaningful tokens (length `>= 3`, not a stopword). A finding below the
   floor is excluded from matching entirely, so it lands in the false-positive
   column instead of counting as a detection. Without it the gate is satisfiable
   with zero analysis: 18 stubs reading `{"title": "off V5"}` scored recall 1.000
   and precision 1.000, beating the real blind baseline while locating nothing.
   `examples/tellref-stubs.json` is that exact input, kept so the hole stays
   closed; it now scores 0.111 and fails. The shipped example's thinnest title has
   4 meaningful tokens and the blind baseline's has 7, so the floor costs a real
   run nothing.
1. **tellRef (primary).** The finding's explicit `tellRef` field equals the
   label's `tellRef`, or the label's tell code (`V5`, `section 12`, `cream-serif-sage`)
   appears as a token run in the finding's `id` / `title` / `evidence`. tellRef
   matching is **dimension-agnostic**: a finding tagged `visual` still matches an
   `anti-ai` label if the tellRef lines up. This is why an auditor that emits
   `tellRef` scores deterministically.
2. **Fuzzy fallback.** No tellRef signal, but same `dimension` and a title-token
   overlap coefficient `>= 0.34`. This lets a reviewer that never emits tellRef
   still score, at the cost of some precision. Note the asymmetry: the fuzzy path
   IS dimension-gated even though the tellRef path is not, so a producer that
   files the same defect under a different dimension and omits `tellRef` cannot
   match at all.

Matching is greedy, best-quality-first, one finding per label. Leftover labels are
misses; leftover findings are false positives. Severity is informational only,
never a match key, so an auditor calling a tell one class higher or lower still
counts as a hit.

**Precision is gated, not just reported.** Recall alone rewards spraying
findings, and since naming tell codes lifts recall, a recall-only gate points the
incentive gradient at emitting more findings rather than better ones. False
positives used to fail a fixture only on the `expected: []` clean controls, a
small minority of the corpus; a run with 200 junk findings on a tell fixture
scored precision 0.07 and still exited 0. Both thresholds now enter the pass
expression.

**Clean controls** (`expected: []` plus a per-fixture `maxIncidentalFindings`)
invert the test: any finding is an incidental, and the control fails if
incidentals exceed the tolerance. The three older controls carry tolerance 1;
`reduced-motion-opt-in.html` and `allowed-choice.html` (2026-09-01) carry 0,
because the single plausible incidental on each is exactly the regression the
control exists to catch. Exit `0` requires recall AND precision AND every clean control within
tolerance, so a flood of false positives on `small-avatar-clean.html` or
`clean-intentional.html` fails the gate even at perfect recall.

## The finding shape

The one canonical shape used everywhere in ui-craft (harness input, review ledger,
CI artifact finding arrays). It is normative in
`ci/verdict-artifact-schema.json` under `definitions.finding`; this block is a
copy for reading convenience, and the two must move together:

```json
{
  "id": "<dimension>-<kebab-slug>",
  "dimension": "visual|anti-ai|accessibility|motion|responsive|performance|typescript|usability",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|TASTE",
  "confidence": "Hard defect|Quality defect|Pattern smell|Taste note",
  "file": "<repo-relative path or fixture filename>",
  "line": 12,
  "title": "<short>",
  "evidence": "<optional>",
  "tellRef": "<optional but recommended: catalogue code, e.g. V5, section 12>"
}
```

`confidence` classes are defined in `references/review/01-universal-rubric.md`
(Layer 3). The scorer enforces the `id` pattern and rejects duplicates on the
same fixture, so a producer that drifts from this shape fails loudly (exit `2`)
rather than scoring a number that means nothing.

### The tellRef field

Since 0.5.0 both catalogue-walking agents emit `tellRef` as a machine field:
`agents/ui-anti-slop-auditor.md` carries the catalogue code on a `Tell:` line
and in `tellRef`, and `agents/ui-visual-reviewer.md` carries `tellRef` whenever
its catalogue scan matched a code. Before 0.5.0 no shipped agent emitted it, so
the 0.1.2 and 0.3.0 baselines describe a dispatch that hand-injected a field no
production run carried; the 2026-09-01 baseline is the first one scored against
the shipped template. Two consequences still worth knowing before reading any
number:

- A finding with no catalogue home has no `tellRef` and scores on the fuzzy
  path alone, which is dimension-gated. That is by design: the fuzzy path
  exists for non-catalogue defects, not as a second chance for a tell the
  auditor failed to name.
- A producer that does not walk the catalogue (the accessibility, motion,
  responsive, perf and TypeScript reviewers) never emits `tellRef`, so its
  findings can only match labels in its own dimension. Cross-producer credit
  ("the visual reviewer would catch the same issue under its own dimension")
  holds only because the visual reviewer now carries the code.

The CI artifact schema permits the field (`definitions.finding` sets
`additionalProperties: true`).

## Adding a fixture + label pair

1. Drop a small (`< 60` line) `*.html` fixture in `../corpus/fixtures/`. Plant the
   tell(s) deliberately and keep the rest of the page clean. **Do not** write the
   tell ID anywhere in the fixture: the reviewer must not see the answer.
2. Add an entry to `../corpus/labels.json` under `fixtures`:
   - a tell fixture: `{ "file": "...", "source": "authored", "expected": [ { id, dimension, severity, title, tellRef, confidence } ] }`;
   - a clean control: `{ "file": "...", "expected": [], "maxIncidentalFindings": 1 }` (use `0` when the one plausible incidental is the regression the control guards against).
   Every expected finding cites a `tellRef` from `references/catalogue/01-ai-tells.md`
   (a code like `V5`/`C18`, a ranked `Strongest-10 #N`, the `cream-serif-sage`
   emerging tell, or a `section N` number).
3. Re-run the loop and confirm the new tell is caught (and that a clean control
   still produces zero real findings).

Keep fixtures single-purpose. A fixture with one clear planted tell scores cleanly;
a busy fixture makes misses ambiguous.

## Corpus provenance

Nineteen fixtures are copied verbatim from `anti-slop`'s design corpus (same owner,
MIT), and their labels are that corpus's ground truth re-derived against
`references/catalogue/01-ai-tells.md`. Five came first (`gradient-hero`,
`shadcn-card-kit`, `frosted-nav-neon`, `legacy-marketing-page`,
`small-avatar-clean`); the remaining fourteen were ported on 2026-09-22. Seven of
those carry tells (`hero-triplet-verbatim`, `uniform-control-radius`,
`bootstrap-unthemed.css`, `marketing-defaults`, `motion-rhythm`,
`gallery-unlabelled`, `legacy-theme.css`) and seven are clean controls: six
near-miss controls at tolerance 0 (`near-miss-controls`, `chosen-border-gray.css`,
`tokens-clean.css`, `hatched-wordmark`, `responsive-type-clean`,
`media-control-glyph.tsx`) and `hero-scroll-poster` at tolerance 1, whose planted
tell has no ui-craft catalogue home. Everything else is authored
for ui-craft: `presence-single`, `cream-serif-sage`, `token-drift`, `missing-states`
and `clean-intentional` cover gaps the first copied set left, five more came with the
0.3.0 responsive work, six with the 2026-09-01 catalogue review, and five with the
0.6.0 substance and copy-placement rows. `../corpus/README.md` carries the
fixture-by-fixture tables.

**A translated label is re-derived, never carried across.** anti-slop's severities and
confidences are discarded at the boundary; the ui-craft class comes from catalogue
section 18, and a label survives only where the catalogue's presence or concentration
rule actually holds on the file at the instance count that file carries. Nine of the
twenty anti-slop labels on the 2026-09-22 batch did not survive that test, five for a
threshold (two `transition-all` against D2's three, one uppercase overline against
T5's three, and so on) and four for having no ui-craft catalogue row at all. Those
counts are the point of the exercise, not an accounting footnote: a corpus that
imported a sibling tool's thresholds would score this plugin against a rule set it
does not ship.

Translation also runs in the other direction, and the blind run is what finds it. Two
ui-craft labels written during this port were withdrawn the same day for failing the
same test (`cream-serif-sage` on `hero-scroll-poster.html`, one of the combination's
three named markers rather than two; `L7` on `motion-rhythm.html`, three sections but
not three identical paddings), and two were added for defects the files really carry
that the port missed (`M6` on `motion-rhythm.html`, decorative transitions with no
`prefers-reduced-motion` query in either direction; `section 14` on
`bootstrap-unthemed.css`, the whole untouched framework theme layer). Writing a label
and measuring it against a blind run in the same change is the point: a label nobody
has ever scored is an assertion, not ground truth.

**Two porting hazards worth knowing before the next one.** First, a sibling corpus's
*clean control* is clean against that corpus's rules, not against this catalogue, so
every ported control has to be re-read against the larger rule set before it is given
a tolerance; `../corpus/labels.json` records the measurement behind each one.
Second, the ported files are not all HTML: four are raw stylesheets and one is a TSX
component, so any run that globs `fixtures/*.html` scores five fixtures fewer than it
reports. The dispatch instruction in "The two-step loop" above still says `.html` and
should be read as "every file in `tests/corpus/fixtures/`".

Five anti-slop tells are deliberately dropped for having no ui-craft home, and
`labels.json` `meta.droppedTells` states each one: `z-index-escalation` (the catalogue
scopes z-index stacking out to code review, `01-ai-tells.md` section 19), `missing-alt`
and `img-no-dimensions` (no catalogue row names image alt text or intrinsic
dimensions; they belong to the accessibility and performance reviewers),
`hero-scroll-hint` (no row; W2 is vague benefit copy and W5 is SaaS-speak, and neither
describes a scroll affordance), and `media-control-glyph` (bare U+25B6 / U+23F8 /
U+23ED carry `Emoji_Presentation=No`, so a transport sign is typography rather than
the emoji-as-UI chrome V12 names; its fixture became a clean control for exactly that
reason).

## Committed baseline (0.1.2)

`../corpus/baseline-0.1.2.json`, a blind run captured 2026-07-07 against the
0.1.2 corpus, scored **recall 0.833 (15 of 18), precision 1.000**, both clean
controls at zero findings, exit 0.

Its three misses at that corpus:

- **C5 and C3 on `gradient-hero.html`** are a label-granularity artifact. The
  auditor's same-span no-double-counting rule folds them into its single V5
  finding, so the fixture itself is caught; the labels just slice it finer than
  the auditor reports.
- **D1 (uncommitted radius)** is a genuine subtle miss.

Closing the two granularity gaps by teaching the auditor to split one span into
three findings would raise the number and improve nothing, which is exactly what
the do-not-tune rule at the top of this file forbids.

Labels added after 2026-07-07 are outside what this run was measured against, so
its recall against the current `labels.json` is lower by construction. See the
staleness obligation under "Which number is the baseline" before reading a drop
as a detection regression.

## Blind baseline, 2026-09-01 (0.5.0 corpus)

`../corpus/baseline-2026-09-01.json` is a fresh blind run of the shipped
`ui-anti-slop-auditor` body (the 0.5.0 template, which emits `tellRef` itself)
over all 21 fixtures, captured with `labels.json`, `sample-findings.json`, both
prior baselines and this file withheld from the reviewer. It supersedes
`baseline-2026-07-27.json` as the current detection measurement.

| Metric | Value | Reading |
|---|---|---|
| recall | **0.828** (24/29) | The detection signal against the 29-label corpus. Not comparable with 0.917 at 0.3.0: that run predates six fixtures and five labels, and scores 0.759 / 0.957 against the current corpus. |
| precision | 0.960 (24/25) | One unmatched finding, accounted for below. |
| clean controls | all five at zero | Includes the two tolerance-0 controls added the same day, `reduced-motion-opt-in.html` and `allowed-choice.html`. |

25 findings across 16 fixtures; every one of the six fixtures added on
2026-09-01 scored full (S1 and S3 on `shadcn-oklch-default.html`, M3 on
`slow-page-transition.html`, V12 on `emoji-chrome.html`, U13 on
`icon-only-button.html`), and the two new controls drew nothing, so the
`anti-slop-allow` escape hatch and the reduced-motion opt-in pattern are both
honoured by the shipped auditor.

The five misses:

- **Four are same-span folding, not detection failures.** C5 on
  `gradient-hero.html` folds into V5, as at every earlier baseline. On
  `fixed-desktop-shell.html` the reviewer reported one L13 finding naming the
  1200px shell, the 360px tracks and the missing viewport meta together, which
  matches one of the three labels; on `token-drift.html` one finding on the
  Save button covers both the colour drift and the spacing and radius drift,
  matching one of two. The 2026-07-27 reviewer reported those spans as
  separate findings; the 0.5.0 auditor's one-finding-per-span rule folds them.
  Both readings are by the book. The labels enumerate the defects so either
  reporting style scores, and neither the labels nor the auditor is tuned to
  the other.
- **T1 (Inter as the sans companion) on `legacy-marketing-page.html`** is a
  genuine miss, and was missed on 2026-07-27 too. Its headline is again filed
  under W2 correctly this time, so the W5 false positive of the earlier run is
  gone.

The one unmatched finding is C15 (six-digit hex throughout) on
`cream-serif-sage.html`. The fixture's own note accepts that incidental
deliberately, because the catalogue documents the cream-serif-sage tell by its
literal hexes and converting them would weaken the planted signature. The
finding is correct against the catalogue and unlabeled by design; it is the
whole precision gap, and labelling it would make the fixture test two things.

The answer key (`examples/sample-findings.json`) still scores 29/29, so the
ceiling the labels permit is unchanged and the gap between it and this run is
the four folded spans plus T1.

## Blind baseline, 2026-07-27 (0.3.0 corpus, superseded)

`../corpus/baseline-2026-07-27.json` was the blind run of the
`ui-anti-slop-auditor` body over the 15 fixtures of the 0.3.0 corpus, captured
with `labels.json`, `sample-findings.json` and the prior baseline all withheld
from the reviewer. It superseded `baseline-0.1.2.json` and is itself superseded
by the 2026-09-01 run above; it is kept as a historical record and scores below
threshold against the grown corpus purely because it predates six of its
fixtures.

Scored against the 0.3.0 corpus:

| Metric | Value | Reading |
|---|---|---|
| recall | **0.917** (22/24) | Up from 0.833 at 0.1.2. This is the detection signal. Read 0.900 (18/20) against the 0.3.0 labels; see the label split below. |
| precision | 0.957 (22/23) | Read 0.783 (18/23) against the 0.3.0 labels, and that was **label granularity, not hallucination**; see the label split below. |
| clean controls | all three at zero | Includes `fluid-adaptive-clean.html`. |

Against the 0.3.0 labels this run exited 1 on precision, and that was label
granularity, not a detection regression. Four of the five unmatched findings
were real defects that a fixture's own `note` field described but its
`expected` array did not enumerate: `fixed-desktop-shell.html` carried one
expectation while its note documented a missing viewport meta, a fixed
`width: 1200px` and a fixed `repeat(3, 360px)` grid, and the blind reviewer
correctly reported all three; `vh-bottom-bar.html` and `token-drift.html` each
carried one compound label for two distinct defects.

**Label split, 2026-09-01.** Those three compound labels were split so ground
truth enumerates what the fixture notes already described: 20 labels became
24, `sample-findings.json` was extended to cover the new labels (it still scores
24/24), and nothing in the baseline file itself changed. The run now exits 0.
The two remaining misses are genuine auditor misses (T1 on
`legacy-marketing-page.html`, and its headline filed under W5 rather than the
labeled W2), and that W5 finding is the one remaining false positive. This is
the ordinary way to close a label-granularity gap: enumerate the defects the
fixture really contains, never delete correct findings from the baseline and
never relabel a fixture to match a miss.

Two independent results in this run confirm the 0.3.0 responsive work:

- `fluid-adaptive-clean.html` drew zero findings. The reviewer declined to flag
  the `clamp()` ramp, the `@container` query, `100dvh`, `env(safe-area-inset-*)`
  and `repeat(auto-fit, minmax())`. Before 0.3.0 the Strongest-10 #9 entry made
  any responsive type scale a presence-flaggable HIGH tell.
- On `gradient-hero.html` the reviewer explicitly did not fire #9, on the
  grounds that the page carries `text-5xl font-bold` but not the verbatim
  Tailwind triplet. That is exactly the narrowing #9 received.

## Baseline (historical)

The 0.1.1 quality pass ran a dogfood of the `ui-anti-slop-auditor` body against the
anti-slop labeled design set and scored roughly **11.5 / 14 by-the-book recall,
pre-fix** (about 0.82) before the 0.1.1 catalogue fixes landed. That was a manual,
one-off count. This harness generalizes it into a repeatable, scored gate over a
labeled corpus, with the pass line at recall `>= 0.8` and precision `>= 0.8`.
Treat the 11.5/14 figure as the historical starting point, not a target: the point
of the gate is to stop that number from silently sliding backward on future
catalogue and auditor edits.

## What this harness still cannot see

Stated plainly so nobody reads a green run as broader assurance than it is:

- **A narrow slice of dimensions.** The corpus began entirely `anti-ai` and has
  since gained responsive labels. Accessibility, motion, visual, performance,
  typescript and usability still have little or no mechanical regression
  coverage, so a green run says nothing about them.
- **One page at a time.** Every fixture is a single static HTML file, so nothing
  in the corpus can exert pressure on flow, task completion, or navigation. A
  usability regression is invisible here by construction.
- **No unattended runner.** Producing a findings file requires a Claude agent
  dispatch, so this gate is a convention a maintainer runs, not a check that
  fires on its own. `selftest.mjs` is the part that *can* run headlessly, and it
  covers the scorer rather than the plugin's detection quality.
