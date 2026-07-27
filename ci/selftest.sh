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
run_case() {
  local name="$1" expect="$2"; shift 3
  local out status
  out="$("$@" 2>&1)"; status=$?
  if [ "$status" -eq "$expect" ]; then
    PASS=$((PASS + 1))
    printf '  ok    %-46s exit %s\n' "$name" "$status"
  else
    FAIL=$((FAIL + 1))
    printf '  FAIL  %-46s exit %s (want %s)\n' "$name" "$status" "$expect"
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

gate() { ( cd "$REPO" && BASE_REF="$BASE_SHA" SCHEMA_FILE="$SCHEMA" bash "$GATE" "$@" ); }

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
write_artifact "$NEW_SHORT" "$NEW_SHORT" YELLOW
run_case "overall YELLOW" 1 -- gate
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
schema_case "finding id pattern enforced" 'd["high_findings"] = [{"id": "NOT A VALID ID!!", "dimension": "visual", "severity": "HIGH", "confidence": "Hard defect", "file": "a.css", "title": "t"}]'
schema_case "finding file must be non-empty" 'd["high_findings"] = [{"id": "visual-x", "dimension": "visual", "severity": "HIGH", "confidence": "Hard defect", "file": "", "title": "t"}]'
schema_case "line true is not an integer" 'd["high_findings"] = [{"id": "visual-x", "dimension": "visual", "severity": "HIGH", "confidence": "Hard defect", "file": "a.css", "title": "t", "line": True}]'
schema_case "schemaVersion 2 rejected" 'd["schemaVersion"] = 2'

# usability is the dimension v3 added; it must now validate.
write_artifact "$NEW_SHORT" "$NEW_SHORT" GREEN
python3 - "$REPO/.claude/ui-craft-artifacts/${NEW_SHORT}.json" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
d["verdicts"]["usability"] = "GREEN"
d["high_findings"] = [{
    "id": "usability-checkout-dead-end", "dimension": "usability", "severity": "HIGH",
    "confidence": "Hard defect", "file": "src/card.css", "line": 1,
    "title": "Checkout flow has no way back from the payment step"}]
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
