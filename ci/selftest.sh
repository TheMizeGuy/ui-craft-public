#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# selftest.sh -- runs ui-craft-gate.sh end to end against a throwaway git repo
# and asserts the exit code of every documented path, including the happy path
# from ci/README.md ("write the artifact, commit it, push it").
#
# This exists because the gate's happy path was unpassable for its entire life
# before 0.2.4: the artifact bound to HEAD, and committing the artifact moved
# HEAD, so the two could never agree. Nothing caught it because nothing ever
# ran the documented sequence. Now something does.
#
# Zero dependencies: bash + git + python3, the same three the gate needs.
#
#   bash ci/selftest.sh          # quiet, prints one line per case
#   VERBOSE=1 bash ci/selftest.sh  # also prints each case's gate output
#
# Exit 0 when every case matches its expected exit code, 1 otherwise.
# ---------------------------------------------------------------------------

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$SCRIPT_DIR/ui-craft-gate.sh"
SCHEMA="$SCRIPT_DIR/verdict-artifact-schema.json"
VERBOSE="${VERBOSE:-}"

[ -f "$GATE" ] || { echo "selftest: gate not found at $GATE" >&2; exit 2; }
[ -f "$SCHEMA" ] || { echo "selftest: schema not found at $SCHEMA" >&2; exit 2; }

SANDBOX="$(mktemp -d)"
trap 'rm -rf "$SANDBOX"' EXIT

PASS=0
FAIL=0

# run_case <name> <expected-exit> -- <command...>
# MUST_SAY=<text> run_case ...  also requires <text> in the gate's output.
run_case() {
  local name="$1" expect="$2"; shift 3
  local out status said=1
  out="$("$@" 2>&1)"; status=$?
  if [ -n "${MUST_SAY:-}" ]; then
    printf '%s' "$out" | grep -qF -- "$MUST_SAY" || said=0
  fi
  if [ "$status" -eq "$expect" ] && [ "$said" -eq 1 ]; then
    PASS=$((PASS + 1))
    printf '  ok    %-46s exit %s\n' "$name" "$status"
  else
    FAIL=$((FAIL + 1))
    printf '  FAIL  %-46s exit %s (want %s)\n' "$name" "$status" "$expect"
    [ "$said" -eq 1 ] || printf '          output does not name: %s\n' "$MUST_SAY"
    printf '%s\n' "$out" | sed 's/^/          /'
    return 0
  fi
  if [ -n "$VERBOSE" ]; then printf '%s\n' "$out" | sed 's/^/          /'; fi
}

# Build a repo with one committed UI change on a branch off main.
REPO="$SANDBOX/repo"
mkdir -p "$REPO"
git -C "$REPO" init -q -b main
git -C "$REPO" config user.email selftest@example.invalid
git -C "$REPO" config user.name "ui-craft selftest"
mkdir -p "$REPO/src"
echo "# fixture" > "$REPO/README.md"
git -C "$REPO" add -A && git -C "$REPO" commit -qm "base"
BASE_SHA="$(git -C "$REPO" rev-parse HEAD)"

git -C "$REPO" checkout -qb feature
printf '.card { width: 1200px; }\n' > "$REPO/src/card.css"
git -C "$REPO" add -A && git -C "$REPO" commit -qm "ui: card"
UI_SHA_SHORT="$(git -C "$REPO" rev-parse --short HEAD)"

# GATE_POLICY sets the gate's UI_CRAFT_GATE_POLICY for one case; empty (the
# default blocking policy) otherwise, whatever the caller's shell exports.
gate() { ( cd "$REPO" && BASE_REF="$BASE_SHA" SCHEMA_FILE="$SCHEMA" UI_CRAFT_GATE_POLICY="${GATE_POLICY:-}" bash "$GATE" "$@" ); }

# mutate <python-statement>: edits the current artifact in place (d = its JSON).
mutate() {
  python3 - "$REPO/.claude/ui-craft-artifacts/${NEW_SHORT}.json" "$1" <<'PY'
import json, sys
p, mutation = sys.argv[1], sys.argv[2]
d = json.load(open(p))
exec(mutation)
json.dump(d, open(p, "w"))
PY
}

# Two open findings of the kind a YELLOW leaves behind.
OPEN_MEDIUM='{"id": "visual-card-rhythm-uneven", "dimension": "visual", "severity": "MEDIUM", "confidence": "Quality defect", "file": "src/card.css", "title": "Card padding drifts between 12 and 16px"}'
OPEN_LOW='{"id": "visual-shadow-heavy", "dimension": "visual", "severity": "LOW", "confidence": "Quality defect", "file": "src/card.css", "title": "Card shadow heavier than the surface needs"}'

write_artifact() {
  # write_artifact <name> <sha> <overall> <extra-json-or-empty>
  local name="$1" sha="$2" overall="$3" extra="${4:-}"
  mkdir -p "$REPO/.claude/ui-craft-artifacts"
  cat > "$REPO/.claude/ui-craft-artifacts/${name}.json" <<JSON
{
  "schemaVersion": 3,
  "sha": "${sha}",
  "timestamp": "2026-07-27T12:00:00Z",
  "reviewer": "ui-team-lead",
  "scope": "src/card.css",
  "verdicts": {
    "visual": "GREEN",
    "responsive": "GREEN",
    "motion": "GREEN",
    "accessibility": "GREEN",
    "runtime": "GREEN",
    "antiAiAesthetic": "GREEN"
  },
  "overall": "${overall}",
  "blocker_findings": [],
  "high_findings": []${extra:+,
${extra}}
}
JSON
}

echo "ui-craft-gate selftest"
echo "============================================================"

run_case "no UI change in diff" 0 -- \
  bash -c "cd '$REPO' && BASE_REF='$BASE_SHA' HEAD_REF='$BASE_SHA' SCHEMA_FILE='$SCHEMA' bash '$GATE'"

run_case "UI change, no artifact" 1 -- gate

# --- the documented happy path, exactly as ci/README.md writes it ----------
write_artifact "$UI_SHA_SHORT" "$UI_SHA_SHORT" GREEN
run_case "artifact present, uncommitted" 0 -- gate
git -C "$REPO" add .claude/ui-craft-artifacts/
git -C "$REPO" commit -qm "ui-craft verdict: GREEN"
run_case "artifact committed (README happy path)" 0 -- gate

# A second unrelated commit must not invalidate it; a new UI commit must.
echo "unrelated" >> "$REPO/README.md"
git -C "$REPO" add -A && git -C "$REPO" commit -qm "docs"
run_case "later non-UI commit keeps it valid" 0 -- gate

printf '.card { width: 100%%; }\n' > "$REPO/src/card.css"
git -C "$REPO" add -A && git -C "$REPO" commit -qm "ui: card again"
run_case "later UI commit invalidates it" 1 -- gate
NEW_SHORT="$(git -C "$REPO" rev-parse --short HEAD)"
write_artifact "$NEW_SHORT" "$NEW_SHORT" GREEN
git -C "$REPO" add -A && git -C "$REPO" commit -qm "ui-craft verdict: GREEN"
run_case "fresh artifact revalidates" 0 -- gate

# --- verdict policy --------------------------------------------------------
# A YELLOW with nothing recorded behind it still fails under the default
# blocking policy, so this case keeps its pre-0.6.7 intent with no open
# findings and no policy override.
write_artifact "$NEW_SHORT" "$NEW_SHORT" YELLOW
run_case "overall YELLOW, nothing recorded" 1 -- gate
write_artifact "$NEW_SHORT" "$NEW_SHORT" GREEN
python3 - "$REPO/.claude/ui-craft-artifacts/${NEW_SHORT}.json" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
d["verdicts"]["responsive"] = "RED"
json.dump(d, open(p, "w"))
PY
run_case "one RED verdict" 1 -- gate

write_artifact "$NEW_SHORT" "$NEW_SHORT" GREEN
python3 - "$REPO/.claude/ui-craft-artifacts/${NEW_SHORT}.json" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
d["blocker_findings"] = [{
    "id": "anti-ai-purple-gradient", "dimension": "anti-ai", "severity": "CRITICAL",
    "confidence": "Pattern smell", "file": "src/card.css",
    "title": "Banned purple-to-blue gradient hero"}]
json.dump(d, open(p, "w"))
PY
run_case "GREEN verdicts + CRITICAL blocker" 1 -- gate

write_artifact "$NEW_SHORT" "$NEW_SHORT" GREEN
python3 - "$REPO/.claude/ui-craft-artifacts/${NEW_SHORT}.json" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
d["high_findings"] = [{
    "id": "responsive-fixed-width", "dimension": "responsive", "severity": "CRITICAL",
    "confidence": "Hard defect", "file": "src/card.css",
    "title": "1280px fixed width breaks below 1280"}]
json.dump(d, open(p, "w"))
PY
run_case "CRITICAL misfiled in high_findings" 1 -- gate

# --- the blocking policy (default since 0.6.7) -----------------------------
# Only RED and CRITICAL/HIGH findings block; a YELLOW ships when the open
# MEDIUM/LOW/TASTE findings behind it are recorded in evidence.open_findings.
write_artifact "$NEW_SHORT" "$NEW_SHORT" YELLOW
mutate "d['verdicts']['visual'] = 'YELLOW'; d['evidence'] = {'open_findings': [$OPEN_MEDIUM, $OPEN_LOW]}"
run_case "YELLOW + open findings recorded passes" 0 -- gate

GATE_POLICY=strict MUST_SAY="strict" run_case "strict policy fails that same YELLOW" 1 -- gate
GATE_POLICY=lenient run_case "any other policy value means blocking" 0 -- gate

# strict passes an all-GREEN artifact and still fails a HIGH finding: strict is
# never weaker than the default, which fails every CRITICAL or HIGH finding.
write_artifact "$NEW_SHORT" "$NEW_SHORT" GREEN
GATE_POLICY=strict MUST_SAY="strict" run_case "strict passes all GREEN" 0 -- gate
mutate "d['high_findings'] = [{'id': 'visual-high-beside-green', 'dimension': 'visual', 'severity': 'HIGH', 'confidence': 'Hard defect', 'file': 'a.css', 'title': 't'}]"
GATE_POLICY=strict MUST_SAY="HIGH" run_case "strict fails a HIGH finding beside all-GREEN verdicts" 1 -- gate

write_artifact "$NEW_SHORT" "$NEW_SHORT" YELLOW
mutate "d['verdicts']['visual'] = 'YELLOW'"
MUST_SAY="evidence.open_findings" run_case "YELLOW without open findings fails" 1 -- gate

write_artifact "$NEW_SHORT" "$NEW_SHORT" YELLOW
mutate "d['verdicts']['visual'] = 'YELLOW'; d['evidence'] = {'open_findings': []}"
MUST_SAY="evidence.open_findings" run_case "YELLOW with an empty open_findings fails" 1 -- gate

write_artifact "$NEW_SHORT" "$NEW_SHORT" YELLOW
mutate "d['verdicts']['visual'] = 'YELLOW'; d['evidence'] = {'open_findings': [$OPEN_MEDIUM, dict($OPEN_LOW, severity='HIGH')]}"
run_case "open finding at HIGH fails" 1 -- gate

write_artifact "$NEW_SHORT" "$NEW_SHORT" YELLOW
mutate "d['verdicts']['visual'] = 'YELLOW'; d['evidence'] = {'open_findings': [dict($OPEN_MEDIUM, title='')]}"
run_case "malformed open finding rejected" 1 -- gate

write_artifact "$NEW_SHORT" "$NEW_SHORT" RED
mutate "d['verdicts']['responsive'] = 'RED'; d['evidence'] = {'open_findings': [$OPEN_MEDIUM]}"
run_case "RED fails with open findings recorded" 1 -- gate

write_artifact "$NEW_SHORT" "$NEW_SHORT" GREEN
mutate "d['verdicts']['visual'] = 'YELLOW'; d['evidence'] = {'open_findings': [$OPEN_MEDIUM]}"
MUST_SAY="overall is GREEN over" run_case "overall GREEN over a YELLOW dimension" 1 -- gate

write_artifact "$NEW_SHORT" "$NEW_SHORT" GREEN
mutate "d['high_findings'] = [dict($OPEN_MEDIUM, severity='HIGH')]"
run_case "HIGH finding beside all-GREEN verdicts" 1 -- gate

# --- schema enforcement (each was silently accepted before 0.2.4) ----------
schema_case() { # schema_case <name> <python-mutation>
  write_artifact "$NEW_SHORT" "$NEW_SHORT" GREEN
  python3 - "$REPO/.claude/ui-craft-artifacts/${NEW_SHORT}.json" "$2" <<'PY'
import json, sys
p, mutation = sys.argv[1], sys.argv[2]
d = json.load(open(p))
exec(mutation)
json.dump(d, open(p, "w"))
PY
  run_case "$1" 1 -- gate
}

schema_case "unknown top-level key rejected" 'd["totallyUnknownTopLevelKey"] = 1'
schema_case "evidence must be an object" 'd["evidence"] = "a string"'
schema_case "timestamp must be a date-time" 'd["timestamp"] = "not-a-date"'
schema_case "antiAiAesthetic may not be omitted" 'del d["verdicts"]["antiAiAesthetic"]'
schema_case "finding id pattern enforced" 'd["high_findings"] = [{"id": "NOT A VALID ID!!", "dimension": "visual", "severity": "MEDIUM", "confidence": "Hard defect", "file": "a.css", "title": "t"}]'
schema_case "finding file must be non-empty" 'd["high_findings"] = [{"id": "visual-x", "dimension": "visual", "severity": "MEDIUM", "confidence": "Hard defect", "file": "", "title": "t"}]'
schema_case "line true is not an integer" 'd["high_findings"] = [{"id": "visual-x", "dimension": "visual", "severity": "MEDIUM", "confidence": "Hard defect", "file": "a.css", "title": "t", "line": True}]'
schema_case "schemaVersion 2 rejected" 'd["schemaVersion"] = 2'

# usability is the dimension v3 added; it must now validate. Since 0.6.7 a
# HIGH finding fails whatever its dimension, so the usability finding rides
# as a recorded MEDIUM behind a YELLOW usability verdict.
write_artifact "$NEW_SHORT" "$NEW_SHORT" YELLOW
python3 - "$REPO/.claude/ui-craft-artifacts/${NEW_SHORT}.json" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
d["verdicts"]["usability"] = "YELLOW"
d["evidence"] = {"open_findings": [{
    "id": "usability-checkout-dead-end", "dimension": "usability", "severity": "MEDIUM",
    "confidence": "Quality defect", "file": "src/card.css", "line": 1,
    "title": "Checkout back link sits below the fold on the payment step"}]}
json.dump(d, open(p, "w"))
PY
run_case "usability dimension accepted (new in v3)" 0 -- gate

# --- fail-closed detection (each reported PASS before 0.2.4) ---------------
write_artifact "$NEW_SHORT" "$NEW_SHORT" GREEN
git -C "$REPO" add -A >/dev/null
git -C "$REPO" commit -qm "restore green artifact" >/dev/null 2>&1 || true

run_case "unresolvable HEAD_REF" 2 -- \
  bash -c "cd '$REPO' && BASE_REF='$BASE_SHA' HEAD_REF=refs/heads/does-not-exist SCHEMA_FILE='$SCHEMA' bash '$GATE'"

printf '# only a comment\n\n' > "$SANDBOX/empty-patterns.txt"
run_case "comment-only UI_PATHS_FILE" 2 -- \
  bash -c "cd '$REPO' && BASE_REF='$BASE_SHA' SCHEMA_FILE='$SCHEMA' UI_PATHS_FILE='$SANDBOX/empty-patterns.txt' bash '$GATE'"

run_case "unknown CLI flag" 2 -- gate --definitely-not-a-flag
run_case "--base with no value" 2 -- gate --base
run_case "missing schema file" 2 -- \
  bash -c "cd '$REPO' && BASE_REF='$BASE_SHA' SCHEMA_FILE='$SANDBOX/nope.json' bash '$GATE'"
run_case "unparseable schema file" 2 -- \
  bash -c "printf 'this is not json at all {{{' > '$SANDBOX/bad.json'; cd '$REPO' && BASE_REF='$BASE_SHA' SCHEMA_FILE='$SANDBOX/bad.json' bash '$GATE'"

# Non-ASCII path: git quotes it under core.quotePath unless -z is used, and a
# quoted path matches no pattern, so this used to report PASS.
git -C "$REPO" checkout -qb unicode
printf '.a{color:red}\n' > "$REPO/src/café.css"
git -C "$REPO" add -A && git -C "$REPO" commit -qm "ui: unicode name"
run_case "non-ASCII filename is detected" 1 -- gate

# .html and .ts are UI now; before 0.2.4 both slipped through untracked.
git -C "$REPO" checkout -q feature
git -C "$REPO" checkout -qb htmlts
printf '<div style="width:1280px">fixed</div>\n' > "$REPO/src/index.html"
printf 'export const css = `.card{width:1200px}`;\n' > "$REPO/src/widget.ts"
git -C "$REPO" add -A && git -C "$REPO" commit -qm "ui: html + ts"
run_case "html/ts change is detected" 1 -- gate

echo "============================================================"
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
