# ui-craft regression harness

A labeled corpus plus a zero-dependency scorer that measures how many of a UI
review's known tells ui-craft actually catches. It turns "the catalogue looks
good" into two numbers: recall and precision against ground truth, both gated at
`>= 0.8`.

- Corpus: `../corpus/fixtures/*.html` + `../corpus/labels.json` (ground truth).
- Scorer: `score-review.mjs` (node >= 18, stdlib only, no installs).
- Worked example of a findings file: `examples/sample-findings.json`.
- Degenerate input the gate must reject: `examples/tellref-stubs.json`.
- The scorer's own tests: `selftest.mjs` (`node tests/harness/selftest.mjs`).

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

  > Audit every `.html` file in `tests/corpus/fixtures/` against the internal
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

Two findings files ship, they measure different things, and neither is "the"
recall of the plugin. Do not conflate them.

| File | What it is |
|---|---|
| `examples/sample-findings.json` | The **answer-key ceiling**: a hand-authored findings file written against `labels.json`. It is the best score the labels permit, and its misses are label-granularity artifacts, not detection failures. No agent produced it, so it is not evidence of detection. |
| `../corpus/baseline-2026-07-27.json` | The **current committed blind baseline**: a real run of the `ui-anti-slop-auditor` body over all 15 fixtures with every answer key kept out of context. This is the measured number, and the one a detection regression is judged against. Recall 0.900; see the dated baseline section below for why its precision reads 0.783. |
| `../corpus/baseline-0.1.2.json` | **Superseded, kept as history.** The 0.1.2 blind run, captured against an 18-label corpus. It scores 0.750 today only because it predates five fixtures. Do not read that as a regression and do not gate on it. |

At the 0.1.2 corpus (18 labels across 10 fixtures) the answer key scored 0.889
and the blind run scored 0.833. Quoting 0.889 as "the" recall overstated measured
detection by a full label and hid that the auditor's real `gradient-hero`
performance was 1 of 3, not 2 of 3.

**Both files go stale when the corpus grows, and staleness looks exactly like a
regression.** Adding fixtures or labels adds expectations neither file was
written against, so both recalls drop through no fault of the auditor. Widening
the corpus therefore carries an obligation: extend `baseline-0.1.2.json` with a
fresh blind run over the new fixtures (or commit a new dated baseline and retire
the old one), and extend `sample-findings.json` to cover the new labels. Until
that happens, a sub-threshold score on either file means "the baseline is out of
date", not "detection got worse", and the two must not be confused.

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

**Clean controls** (`expected: []`, `maxIncidentalFindings: 1`) invert the test:
any finding is an incidental, and the control fails if incidentals exceed the
tolerance. Exit `0` requires recall AND precision AND every clean control within
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

### The tellRef gap

`tellRef` is not emitted by any shipped agent. The harness's dispatch
instructions above ask for it explicitly, which is why the measured runs score
deterministically, but a production `review-ui` or `improve-ui` pass produces
findings without it and therefore scores on the fuzzy path alone. Two
consequences worth knowing before reading any number:

- The scored artifact is not quite the shipped artifact. The 0.889 and 0.833
  figures describe a dispatch that hand-injects a field no production run emits.
- Because the fuzzy path is dimension-gated, a cross-producer claim like "the
  visual reviewer would catch the same issue under its own dimension, and
  tellRef-first scoring counts it either way" only holds while `tellRef` is
  present. Without it, a `visual` finding cannot match an `anti-ai` label at all.

Closing the gap means adding one line to the finding template in
`agents/ui-anti-slop-auditor.md` and `agents/ui-visual-reviewer.md`
(`tellRef`: the catalogue code this maps to, or omit when the finding has no
catalogue home). The CI artifact schema already permits the field
(`definitions.finding` sets `additionalProperties: true`).

## Adding a fixture + label pair

1. Drop a small (`< 60` line) `*.html` fixture in `../corpus/fixtures/`. Plant the
   tell(s) deliberately and keep the rest of the page clean. **Do not** write the
   tell ID anywhere in the fixture: the reviewer must not see the answer.
2. Add an entry to `../corpus/labels.json` under `fixtures`:
   - a tell fixture: `{ "file": "...", "source": "authored", "expected": [ { id, dimension, severity, title, tellRef, confidence } ] }`;
   - a clean control: `{ "file": "...", "expected": [], "maxIncidentalFindings": 1 }`.
   Every expected finding cites a `tellRef` from `references/catalogue/01-ai-tells.md`
   (a code like `V5`/`C18`, a ranked `Strongest-10 #N`, the `cream-serif-sage`
   emerging tell, or a `section N` number).
3. Re-run the loop and confirm the new tell is caught (and that a clean control
   still produces zero real findings).

Keep fixtures single-purpose. A fixture with one clear planted tell scores cleanly;
a busy fixture makes misses ambiguous.

## Corpus provenance

Five fixtures (`gradient-hero`, `shadcn-card-kit`, `frosted-nav-neon`,
`legacy-marketing-page`, `small-avatar-clean`) are copied verbatim from
`anti-slop`'s design corpus (same owner, MIT); their labels are that corpus's
ground truth translated to ui-craft catalogue IDs. Five (`presence-single`,
`cream-serif-sage`, `token-drift`, `missing-states`, `clean-intentional`) are new,
covering gaps the copied set left: a single-fingerprint presence test, the full
cream+serif+sage combination, design-token drift, missing states + demo-ware, and a
second clean control with a non-shadcn committed point of view. See
`labels.json` `meta` for the per-tell translation notes and the one deliberately
dropped tell (anti-slop's `z-index-escalation` has no ui-craft home: the catalogue
scopes z-index stacking out to code review, `01-ai-tells.md` section 19).

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

## Blind baseline, 2026-07-27 (0.3.0 corpus)

`../corpus/baseline-2026-07-27.json` is a fresh blind run of the
`ui-anti-slop-auditor` body over all 15 fixtures, captured with `labels.json`,
`sample-findings.json` and the prior baseline all withheld from the reviewer.
It supersedes `baseline-0.1.2.json` as the current detection measurement;
the 0.1.2 file is kept as a historical record and scores 0.750 against the
grown corpus purely because it predates five of its fixtures.

Scored against the 0.3.0 corpus:

| Metric | Value | Reading |
|---|---|---|
| recall | **0.900** (18/20) | Up from 0.833 at 0.1.2. This is the detection signal. |
| precision | 0.783 (18/23) | Below the 0.8 line, but **label-granularity, not hallucination**. |
| clean controls | all three at zero | Includes `fluid-adaptive-clean.html`. |

The run therefore exits 1 on precision. That is understood and is not a
detection regression. Four of the five unmatched findings are real defects that
a fixture's own `note` field describes but its `expected` array does not
enumerate: `fixed-desktop-shell.html` is labeled with one expectation while its
note documents a missing viewport meta, a fixed `width: 1200px` and a fixed
`repeat(3, 360px)` grid, and the blind reviewer correctly reported all three.
Scoring counts the two it has no label for as false positives.

**Known follow-up:** split the compound labels so ground truth enumerates what
the fixture notes already describe, then re-score. Until that lands, judge
detection on recall and read precision with this caveat. Do not "fix" the
number by deleting correct findings from the baseline.

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
