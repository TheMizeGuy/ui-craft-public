# ui-craft CI gate

A required-status-check gate for UI-adjacent pull requests. ui-craft's specialists (visual,
responsive, motion, accessibility, runtime, anti-AI aesthetic, plus optional TypeScript and
usability) cannot run headlessly on a hosted CI runner: there is no Claude bridge there. This kit
instead requires a JSON verdict artifact, committed on the branch, before a UI-adjacent change may
merge.

The artifact is **self-attested, not signed**. Nothing here is cryptographic. The verdict is a
claim written by the same agent whose work is being gated, and the gate's only independent
cross-checks are the two below:

1. **Reviewed-sha binding.** The artifact names the commit it was reviewed against, and the gate
   recomputes that commit from the diff. Push more UI changes and the artifact goes stale.
2. **Self-contradiction.** A GREEN artifact that carries a CRITICAL finding, or any entry at all in
   `blocker_findings`, fails. Deleting the finding to pass is a lie the reviewer has to tell on
   purpose, which is a different thing from an omission nobody notices.

Files in this directory:

| File | What it is |
|---|---|
| `verdict-artifact-schema.json` | JSON Schema (Draft-07) for the artifact shape, schemaVersion 3. Parsed and enforced at runtime, not decorative |
| `ui-craft-gate.sh` | The gate itself: detects UI-adjacent changes, requires + validates the artifact |
| `selftest.sh` | Runs the gate end to end against a throwaway repo and asserts the exit code of every documented path |

Zero dependencies: `ui-craft-gate.sh` is a plain bash script; its embedded validator is `python3`
stdlib only (no `jsonschema`, no `pip install`). Runs anywhere `bash` + `python3` + `git` exist.

Verify the kit works before adopting it:

```bash
bash ci/selftest.sh
# -> 28 passed, 0 failed (exit 0)
```

## Which sha the artifact names

This is the part that used to make the gate unpassable, so it comes before the walkthrough.

**The artifact binds to the REVIEWED SHA: the last commit that touched a UI-adjacent path, walked
back from `HEAD_REF`. Not `HEAD`.**

Binding to `HEAD` cannot work, and the reason is worth stating once because it is not obvious.
Committing the artifact is itself a commit. The moment you `git commit` the file, `HEAD` moves to a
sha that did not exist when you wrote it, so an artifact naming `HEAD` can never name the commit it
is committed into. There is no local git sequence that closes that loop: amending re-hashes the
tree again, and a prefix collision is a brute-force problem. Prior versions of this gate bound to
`HEAD` and were therefore unpassable via their own documented flow; the only sequence that ever
worked was leaving the artifact uncommitted in the working tree, which CI never sees.

The reviewed sha does not move when the artifact lands, because the artifact directory is excluded
from UI-adjacent matching. That makes the documented flow terminate. It also keeps the security
property that matters: push a new UI commit and the reviewed sha advances, the artifact goes stale,
and the gate fails until the review is redone.

The same binding handles `pull_request`-event checkouts without special cases. `GITHUB_SHA` is
deliberately **not** read: on those events it names the ephemeral merge commit GitHub synthesizes
for the check run, a sha no artifact can have been written against. Walking the diff with a
pathspec makes git's history simplification step through the merge to the real commit that touched
the UI file, which is the one the reviewer saw.

## How the artifact gets produced

Run `/ui-craft:improve-ui` against the PR's branch, preview deployment, or local dev server.
improve-ui is the pass that dispatches `ui-team-lead`'s full specialist fleet and always finishes
with `ui-verifier`, so it is the only skill that produces every verdict this gate requires.

`/ui-craft:review-ui` is **not** an alternative here. Its adaptive pass dispatches 3-5
specialists by design, so it cannot fill the six required verdicts, and a hand-completed artifact
claiming dimensions nobody reviewed is worse than no artifact.

Write the resulting per-dimension verdicts and any CRITICAL/HIGH findings into a JSON file matching
`verdict-artifact-schema.json`, saved at:

```
.claude/ui-craft-artifacts/<PR_NUMBER-or-reviewed-short-sha>.json
```

(directory configurable via `ARTIFACT_DIR`; see below). The gate prints the exact reviewed sha and a
filled-in template when it fails, so the fastest path is to run it once and copy what it says.
Commit and push the artifact on the same branch:

```bash
mkdir -p .claude/ui-craft-artifacts
# ... write the artifact, naming the reviewed sha the gate printed ...
git add .claude/ui-craft-artifacts/
git commit -m "ui-craft verdict: GREEN"
git push
```

A minimal all-GREEN artifact:

```json
{
  "schemaVersion": 3,
  "pr": "142",
  "sha": "a1b2c3d",
  "timestamp": "2026-07-27T12:00:00Z",
  "reviewer": "ui-team-lead",
  "scope": "https://pr-142.preview.example.com",
  "verdicts": {
    "visual": "GREEN",
    "responsive": "GREEN",
    "motion": "GREEN",
    "accessibility": "GREEN",
    "runtime": "GREEN",
    "antiAiAesthetic": "GREEN"
  },
  "overall": "GREEN",
  "blocker_findings": [],
  "high_findings": []
}
```

`reviewer` and `scope` are required (unlike the LemonGames v1 predecessor, where both were
optional): a GREEN verdict with no attribution or no stated scope is not admissible evidence. `pr`
is optional; `sha` is the field the gate binds to the reviewed commit, so a stale hand-written GREEN
artifact naming an older ref is rejected even if `pr` still matches.

### verdicts keys vs. finding.dimension values

The two vocabularies are deliberately not identical strings. `verdicts` mirrors the CI-gate
convention inherited from the LemonGames predecessor (`visual` / `responsive` / `motion` /
`accessibility` / `runtime`), while a finding's `dimension` field uses the plugin's own 8-value
enum. The mapping:

| `verdicts` key | `finding.dimension` value | Required? |
|---|---|---|
| `visual` | `visual` | required |
| `responsive` | `responsive` | required |
| `motion` | `motion` | required |
| `accessibility` | `accessibility` | required |
| `runtime` | `performance` | required |
| `antiAiAesthetic` | `anti-ai` | **required since schemaVersion 3** |
| `typescriptSafety` | `typescript` | optional: omit on non-TypeScript projects |
| `usability` | `usability` | optional: omit until the usability specialist runs on every pass |

An omitted optional key means "not reviewed"; a present key is a claim the gate enforces. Do not
include a key with a placeholder value.

`antiAiAesthetic` was optional through schemaVersion 2, and that was a hole rather than a
convenience. Every UI surface can be judged for AI-default aesthetics, so "the auditor did not run"
is a gap to fix, not a reason to omit the key, and while it was optional the path of least
resistance for a failing anti-AI pass was to delete the key and pass. Only `typescriptSafety` and
`usability` can be genuinely inapplicable, so only those two stay optional.

## Pre-push hook wiring

Add a step to your repo's pre-push hook (or equivalent) so a UI-adjacent push without a fresh
artifact fails locally, before it ever reaches CI:

```bash
#!/usr/bin/env bash
# .git/hooks/pre-push (or wherever your hook manager -- husky, lefthook,
# the LemonGames-style .githooks/pre-push -- installs from)
set -euo pipefail

echo "Running ui-craft-gate..."
bash ci/ui-craft-gate.sh --base origin/main
```

If your project vendors ui-craft's `ci/` directory somewhere other than the repo root, pass
`--schema` explicitly or just invoke the script by its actual path: it resolves the schema file
relative to its own location by default, so copying the whole `ci/` directory as a unit is the
simplest setup.

## GitHub Actions job example

```yaml
# .github/workflows/ui-craft-gate.yml
name: ui-craft gate

on:
  pull_request:
    branches: [main]

jobs:
  ui-craft-gate:
    # TheMizeGuy repos never use GitHub-hosted labels: self-hosted fleet first,
    # Namespace as the fallback -- e.g. `runs-on: nscloud-ubuntu-22.04-arm64-2x4`.
    # The placeholder below is for adopters outside that fleet; swap in
    # whatever hosted or self-hosted runner your org actually uses.
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history so BASE_REF...HEAD_REF resolves

      - name: Run ui-craft gate
        env:
          BASE_REF: origin/${{ github.event.pull_request.base.ref }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: bash ci/ui-craft-gate.sh
```

Mark this job as a required status check on the branch protection rule for `main`. There is no
env-var or CLI-flag bypass built into the script, so a failing required check blocks the merge
button regardless of admin override settings for other checks.

**ui-craft does not run this gate on its own repository.** This kit is adoption guidance for the
repos ui-craft reviews, not a check on ui-craft itself. Nothing in this repo enforces it, so read
the sentences above as "wire this up in your project", never as "this is already enforced here".

## Configuration reference

Every variable has a CLI flag twin; the flag wins. `bash ci/ui-craft-gate.sh --help` prints the
same table plus the live default pattern list.

| Variable | Flag | Default | Purpose |
|---|---|---|---|
| `BASE_REF` | `--base` | `origin/main` | Ref to diff against. Falls back to `HEAD_REF^`, then all tracked files (`git ls-files`), when unresolvable: keeps the gate runnable on a shallow or fresh clone |
| `HEAD_REF` | `--head` | `HEAD` | Ref treated as the change under review. Verified with `git rev-parse --verify`; an unresolvable value is exit 2, never a pass |
| `ARTIFACT_DIR` | `--artifact-dir` | `.claude/ui-craft-artifacts` | Where committed verdict artifacts live. Excluded from UI-adjacent matching so committing the artifact cannot move the reviewed sha |
| `SCHEMA_FILE` | `--schema` | `verdict-artifact-schema.json` next to the script | The schema the artifact is validated against. Parsed at runtime, so editing it changes what the gate accepts |
| `UI_PATHS_FILE` | `--ui-paths` | unset (built-in defaults) | Path to a file of glob patterns, one per line, `#` comments and blank lines ignored. Overrides the built-in pattern set entirely (not additive). A file yielding zero patterns is exit 2, not a silent pass |
| `PR_NUMBER` | `--pr` | unset | PR number; artifact lookup tries `$ARTIFACT_DIR/$PR_NUMBER.json` before the sha-named file, and (when the artifact carries a `pr` field) is checked against it |

`GITHUB_SHA` is no longer read at all. See "Which sha the artifact names" above.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | No UI-adjacent change, or a UI change plus a valid all-GREEN artifact |
| `1` | UI change with a missing, malformed, sha-mismatched, non-GREEN, or self-contradicting artifact |
| `2` | Usage or configuration error: unknown flag, missing flag value, unresolvable `HEAD_REF`, missing or unparseable schema, a `UI_PATHS_FILE` with no usable patterns, or a failed `git` invocation |

The `2` row is the important one. A gate that cannot tell "no UI files changed" apart from "the
diff command failed" is a gate that reports success when it is broken, which is worse than no gate.
Every detection failure above is now exit 2 with a message, and none of them can produce a pass.

### Default UI-adjacent patterns

Used whenever `UI_PATHS_FILE` is unset:

```
**/*.css      **/*.scss     **/*.less     **/*.styl
**/*.tsx      **/*.jsx      **/*.ts       **/*.svelte
**/*.vue      **/*.astro    **/*.html     **/*.mdx
**/*.svg      **/tailwind.config.*        **/theme*
**/theme*/**  static/**     public/**
```

`**` matches any depth including zero directories (`**/*.css` matches both `theme.css` at the repo
root and `src/components/Button/Button.css`); a bare `*` never crosses a `/`, which is why
`**/theme*` needs the companion `**/theme*/**` to reach files inside a `themes/` directory.

`.html` and `.ts` are in the set deliberately, and they cost some over-matching. `.html` is the
format of this plugin's own corpus fixtures, and `.ts` carries CSS-in-TS, Lit templates, style
objects, and design tokens in most codebases, so leaving them out meant a literal fixed-width
responsive defect in the two most common non-JSX UI file types was invisible to the gate. The
tradeoff is asymmetric: over-matching costs one artifact write, under-matching costs the entire
gate.

These defaults are a starting point for a typical web frontend, not a universal fit. Most adopters
will want a `UI_PATHS_FILE` scoped to their actual component and asset directories (the LemonGames
predecessor is an example of a project-specific, deeply-scoped pattern list keyed to one app's
directory layout, which fits a large monorepo better than the loose defaults here).

## Schema versioning policy

`schemaVersion` is a hard gate, not documentation. `ui-craft-gate.sh` reads the `const` out of the
schema file's `schemaVersion` property and rejects any artifact that does not match it, so the
script has no hardcoded version to drift from the schema.

Any field addition, rename, or type change to the artifact shape bumps `schemaVersion` in the same
change. Never reshape the artifact contract in place under the same version number: a consumer
(this gate, or any other tooling that reads these artifacts) keys off `schemaVersion` to decide
whether it understands the file at all.

### Migrating a schemaVersion 2 artifact

v2 artifacts are rejected, and the gate's failure message says exactly this. Two edits:

1. `"schemaVersion": 2` becomes `"schemaVersion": 3`.
2. Add `"antiAiAesthetic": "<verdict>"` to `verdicts`, which v3 requires.

Nothing else in the shape changed. v3 also adds the `usability` finding dimension and its optional
verdict, and both are additive: an artifact that never mentions usability is a valid v3 artifact.

### The schema is the validator

`ui-craft-gate.sh` parses `verdict-artifact-schema.json` and enforces what it declares:
`type`, `required`, `additionalProperties: false`, `enum`, `const`, `pattern`, `minLength`,
`minimum`, `format: date-time`, `items`, and local `$ref`s into `definitions`. Editing the schema
changes what the gate accepts, which is the point of shipping a schema.

Two deliberate choices in that validator:

- **`format: date-time` is an assertion, not an annotation.** Draft-07 treats `format` as advisory;
  this gate treats an unparseable timestamp as a shape error, because a timestamp nobody can parse
  is not evidence of when the review ran.
- **An unimplemented keyword is a fatal error, not a shrug.** If the schema grows a constraint the
  validator does not implement, the gate exits 2 and names the keyword rather than silently
  ignoring it. Silent ignoring is how a validator and its schema drift apart, and this one already
  did once: the previous hand-rolled version diverged on six constraints, accepting unknown
  top-level keys, string `evidence`, unparseable timestamps, malformed finding ids, empty `file`
  values, and `"line": true` (Python booleans are ints, so an `isinstance` check passed).

## Relationship to LemonGames' `ui-review-gate.sh`

`LemonGames/scripts/ci/ui-review-gate.sh` is this kit's predecessor and proof of concept. It has
been running in production there since before ui-craft existed, gating `ui-review`-era verdicts
(`schemaVersion: 1`, 5 fixed required dimensions, `pr` required, `reviewer`/`scope` optional) for
one specific monorepo's directory layout. This kit generalizes the same pattern: configurable paths
and artifact directory, `reviewer`/`scope` required and `pr` optional, three more verdict
dimensions, a schema that is actually enforced, reviewed-sha binding instead of HEAD binding, and
pointers at `/ui-craft:improve-ui` instead of the retired `/ui-review:review-ui-full`.

Migrating LemonGames (or any other `ui-review-gate.sh` adopter) onto this kit is optional, not
required. Both scripts validate a committed verdict artifact and both work. A project already green
on the v1 gate has no obligation to move; a new project, or one already picking up `ui-craft`,
should start here directly rather than adopting the retired predecessor.
