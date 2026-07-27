#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ui-craft-gate.sh -- generic CI verdict-artifact gate for UI-adjacent PRs.
#
# Generalized from the proven ui-review-gate.sh pattern in production at
# LemonGames (scripts/ci/ui-review-gate.sh). This script is project-agnostic:
# it detects UI-adjacent changes by glob pattern (configurable), requires a
# committed verdict artifact for the reviewed tree, validates that artifact
# against ci/verdict-artifact-schema.json -- the schema file is PARSED and
# enforced at runtime, stdlib json only, no jsonschema dependency -- and
# enforces that every verdict AND overall is GREEN before the merge proceeds.
#
# The artifact is not signed and this script does not claim it is. It is a
# self-attested verdict whose only independent cross-checks are the sha
# binding below and the CRITICAL-finding check: an artifact that reports
# GREEN while carrying a CRITICAL finding is rejected as self-contradictory.
#
# ui-craft cannot run headlessly in CI (no Claude bridge on hosted/ephemeral
# runners). The gate instead requires a committed JSON artifact at:
#
#   $ARTIFACT_DIR/<pr-or-reviewed-sha>.json   (default: .claude/ui-craft-artifacts/)
#
# produced by an agent-run /ui-craft:improve-ui pass. See ci/README.md.
#
# WHICH SHA THE ARTIFACT NAMES (the thing everyone gets wrong first):
#   The artifact binds to the REVIEWED SHA -- the last commit that touched a
#   UI-adjacent path, walked back from HEAD_REF -- not to HEAD itself.
#   Binding to HEAD is unsatisfiable: committing the artifact is itself a
#   commit, so HEAD moves the instant you record it and the artifact can
#   never name the commit it is committed into. The reviewed sha does not
#   move when the artifact lands (the artifact directory is excluded from
#   UI-adjacent matching), so the documented flow terminates. Push more UI
#   changes and the reviewed sha advances, correctly invalidating the
#   artifact.
#
# Verdict policy (no soft-pass):
#   - Every verdict in the artifact MUST be GREEN, AND overall MUST be
#     GREEN, AND blocker_findings MUST be empty, AND no finding anywhere may
#     carry severity CRITICAL -> exit 0.
#   - Any RED verdict -> exit 1 (blocker, hard fail).
#   - Any YELLOW verdict -> exit 1 (needs full GREEN; YELLOW means a human
#     decision is wanted, not a merge-blocking defect -- rerun the review
#     after addressing the finding and recommit a GREEN artifact).
#
# UI-adjacent detection:
#   Every changed path (BASE_REF...HEAD_REF, or all tracked files on a fresh
#   clone) is matched against a set of glob patterns supporting '**' (any
#   depth, including zero directories) and '*' (any run of non-'/' chars).
#   Patterns come from $UI_PATHS_FILE (one per line, '#' comments and blank
#   lines ignored) when set, else the default set printed by --help.
#
#   No match anywhere in the diff -> exit 0 (no artifact required). A git
#   failure, an unresolvable ref, or a pattern file that yields zero usable
#   patterns is NOT "no match": each exits 2 with a message. This gate has
#   no silent no-op path.
#
# Options (each mirrors an environment variable; the flag wins):
#   --base <ref>          BASE_REF
#   --head <ref>          HEAD_REF
#   --artifact-dir <dir>  ARTIFACT_DIR
#   --schema <file>       SCHEMA_FILE
#   --ui-paths <file>     UI_PATHS_FILE
#   --pr <number>         PR_NUMBER
#   -h, --help            usage + the default pattern set
#
# Environment:
#   BASE_REF        git ref to diff against   (default: origin/main)
#   HEAD_REF        git ref for HEAD          (default: HEAD)
#   ARTIFACT_DIR    artifact directory        (default: .claude/ui-craft-artifacts)
#   SCHEMA_FILE     JSON schema path          (default: verdict-artifact-schema.json next to this script)
#   UI_PATHS_FILE   optional glob-pattern file (default: unset -> built-in defaults)
#   PR_NUMBER       GitHub (or equivalent) PR number (optional; falls back to the reviewed short sha)
#
#   GITHUB_SHA is deliberately NOT read. On pull_request events it names the
#   ephemeral merge commit GitHub synthesizes for the check run, a sha that
#   no artifact can have been written against. The reviewed-sha binding above
#   works on merge-commit checkouts without it, because git's pathspec
#   history simplification walks through the merge to the real commit that
#   touched the UI file.
#
# Exit codes:
#   0 -- no UI-adjacent change, OR UI change + a valid all-GREEN artifact
#   1 -- UI change + missing / malformed / sha-mismatched / non-GREEN artifact
#   2 -- usage or configuration error (bad flag, unresolvable ref, missing or
#        unparseable schema, no usable UI patterns, git failure)
#
# No env-var or CLI-flag bypass. Wire this as a required status check (or a
# pre-push hook step) so a failing gate blocks the merge; nothing here reads
# a "skip" variable by design.
# ---------------------------------------------------------------------------

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BASE_REF="${BASE_REF:-origin/main}"
HEAD_REF="${HEAD_REF:-HEAD}"
ARTIFACT_DIR="${ARTIFACT_DIR:-.claude/ui-craft-artifacts}"
SCHEMA_FILE="${SCHEMA_FILE:-$SCRIPT_DIR/verdict-artifact-schema.json}"
UI_PATHS_FILE="${UI_PATHS_FILE:-}"
PR_NUMBER="${PR_NUMBER:-}"

DEFAULT_UI_PATTERNS=(
  "**/*.css" "**/*.scss" "**/*.less" "**/*.styl"
  "**/*.tsx" "**/*.jsx" "**/*.ts" "**/*.svelte" "**/*.vue" "**/*.astro"
  "**/*.html" "**/*.mdx" "**/*.svg"
  "**/tailwind.config.*" "**/theme*" "**/theme*/**"
  "static/**" "public/**"
)

usage() {
  cat <<EOF
usage: bash ui-craft-gate.sh [--base <ref>] [--head <ref>] [--artifact-dir <dir>]
                             [--schema <file>] [--ui-paths <file>] [--pr <number>]

Requires a committed ui-craft verdict artifact whenever the diff
BASE_REF...HEAD_REF touches a UI-adjacent path. Every flag has an environment
variable twin (BASE_REF, HEAD_REF, ARTIFACT_DIR, SCHEMA_FILE, UI_PATHS_FILE,
PR_NUMBER); the flag wins.

The artifact binds to the REVIEWED SHA -- the last commit touching a
UI-adjacent path -- not to HEAD, so that committing the artifact does not
invalidate it. Full rationale in the header of this script and in ci/README.md.

Default UI-adjacent patterns (replaced wholesale, not extended, by --ui-paths):
$(printf '  %s\n' "${DEFAULT_UI_PATTERNS[@]}")

Exit codes: 0 pass, 1 gate failure, 2 usage or configuration error.
EOF
}

fatal() { echo "[ui-craft-gate] FATAL: $*" >&2; exit 2; }

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --base) [ $# -ge 2 ] || fatal "--base requires a value"; BASE_REF="$2"; shift 2 ;;
    --head) [ $# -ge 2 ] || fatal "--head requires a value"; HEAD_REF="$2"; shift 2 ;;
    --artifact-dir) [ $# -ge 2 ] || fatal "--artifact-dir requires a value"; ARTIFACT_DIR="$2"; shift 2 ;;
    --schema) [ $# -ge 2 ] || fatal "--schema requires a value"; SCHEMA_FILE="$2"; shift 2 ;;
    --ui-paths) [ $# -ge 2 ] || fatal "--ui-paths requires a value"; UI_PATHS_FILE="$2"; shift 2 ;;
    --pr) [ $# -ge 2 ] || fatal "--pr requires a value"; PR_NUMBER="$2"; shift 2 ;;
    *) echo "[ui-craft-gate] unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

# Resolve the schema to an absolute path before cd'ing to the repo root, so a
# relative --schema/SCHEMA_FILE means what the caller typed.
case "$SCHEMA_FILE" in
  /*) : ;;
  *) SCHEMA_FILE="$PWD/$SCHEMA_FILE" ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO_ROOT" ] || fatal "not inside a git work tree"
cd "$REPO_ROOT"

[ -f "$SCHEMA_FILE" ] || fatal "schema file not found at $SCHEMA_FILE"

# ---------------------------------------------------------------------------
# Ref resolution. BASE_REF falls back to HEAD^ then to "all tracked files" so
# the gate stays runnable on a fresh or shallow clone. HEAD_REF gets the same
# --verify treatment BASE_REF has always had: an unresolvable HEAD_REF used to
# make `git diff` fail silently and report "no UI files changed. PASS."
# ---------------------------------------------------------------------------
git rev-parse --verify --quiet "${HEAD_REF}^{commit}" >/dev/null \
  || fatal "HEAD_REF=$HEAD_REF is not a resolvable commit"

if ! git rev-parse --verify --quiet "${BASE_REF}^{commit}" >/dev/null; then
  echo "[ui-craft-gate] BASE_REF=$BASE_REF not resolvable; falling back to ${HEAD_REF}^" >&2
  BASE_REF="${HEAD_REF}^"
  if ! git rev-parse --verify --quiet "${BASE_REF}^{commit}" >/dev/null; then
    echo "[ui-craft-gate] ${HEAD_REF}^ not resolvable (initial commit); scanning all tracked files." >&2
    BASE_REF=""
  fi
fi

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
CHANGED_LIST="$WORK_DIR/changed.z"

# -z makes git emit paths verbatim, NUL-separated: no core.quotePath escaping,
# so non-ASCII and space-bearing paths reach the matcher intact instead of
# arriving as "src/caf\303\251.css" and matching nothing.
if [ -n "$BASE_REF" ]; then
  if ! git diff --name-only --diff-filter=ACMRT -z "${BASE_REF}...${HEAD_REF}" > "$CHANGED_LIST"; then
    fatal "git diff ${BASE_REF}...${HEAD_REF} failed (exit $?); refusing to report PASS on an unknown diff"
  fi
else
  if ! git ls-files -z > "$CHANGED_LIST"; then
    fatal "git ls-files failed (exit $?); refusing to report PASS on an unknown file list"
  fi
fi

# ---------------------------------------------------------------------------
# UI-adjacent path patterns.
# ---------------------------------------------------------------------------
if [ -n "$UI_PATHS_FILE" ]; then
  [ -f "$UI_PATHS_FILE" ] || fatal "UI_PATHS_FILE not found at $UI_PATHS_FILE"
  UI_PATTERNS=()
  while IFS= read -r line || [ -n "$line" ]; do
    trimmed="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [ -z "$trimmed" ] && continue
    case "$trimmed" in \#*) continue ;; esac
    UI_PATTERNS+=("$trimmed")
  done < "$UI_PATHS_FILE"
  # A comment-only or empty pattern file used to match nothing and report
  # "No UI-adjacent files changed. PASS." -- an unadvertised bypass.
  [ ${#UI_PATTERNS[@]} -gt 0 ] \
    || fatal "UI_PATHS_FILE $UI_PATHS_FILE yields zero patterns (only blanks and # comments)"
else
  UI_PATTERNS=("${DEFAULT_UI_PATTERNS[@]}")
fi

# ---------------------------------------------------------------------------
# Shared python3 helper: stdlib-only glob matching (proper '**' handling,
# unlike bash `case`/`[[ ]]` pattern matching which collapses '**' to '*' and
# cannot express "any depth including zero directories") plus a Draft-07
# subset validator driven by the schema FILE. One file, two subcommands, no
# external dependency.
# ---------------------------------------------------------------------------
HELPER="$WORK_DIR/helper.py"

cat > "$HELPER" <<'PYEOF'
"""ui-craft-gate helper: glob-path matching + verdict-artifact validation.

Stdlib only (json, re, argparse, sys). Two subcommands:

  match --exclude-prefix P <pattern...>
      Reads NUL-separated repo-relative paths on stdin, writes the subset
      matching any pattern (NUL-separated) to stdout.
      Exit 0 if at least one path matched, 1 if none, 2 on a usage error.

  validate <artifact> --schema S [--reviewed-full SHA] [--reviewed-short SHA] [--pr N]
      Validates the artifact against the schema file (parsed, not
      reimplemented) and then applies the gate policy the schema cannot
      express: sha binding, all-GREEN verdicts, no CRITICAL findings.
      Exit 0 on pass, 1 on any failure, 2 on a usage error.
"""
import argparse
import json
import re
import sys


ALLOWED_VERDICTS = ("GREEN", "YELLOW", "RED")
# Findings at this severity contradict a GREEN verdict by definition. The
# schema says blocker_findings are "must be fixed before merge"; the gate is
# where that sentence acquires teeth.
BLOCKING_SEVERITY = "CRITICAL"
DATE_TIME_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:?\d{2})$"
)


def err(msg):
    sys.stderr.write("[ui-craft-gate] " + msg + "\n")


def banner(title, lines):
    sys.stderr.write("\n" + "=" * 60 + "\n")
    sys.stderr.write("  ui-craft-gate: {}\n".format(title))
    sys.stderr.write("=" * 60 + "\n\n")
    for line in lines:
        sys.stderr.write(line + "\n")
    sys.stderr.write("\n")


# --------------------------------------------------------------------------
# glob matching
# --------------------------------------------------------------------------
def translate_glob(pattern):
    """Translate a glob pattern to an anchored regex, with '**' handled
    properly ('**/' -> zero or more path segments; a bare trailing '**' ->
    the rest of the string). Plain '*' never crosses a '/'."""
    out = []
    i, n = 0, len(pattern)
    while i < n:
        c = pattern[i]
        if c == "*":
            if pattern[i:i + 3] == "**/":
                out.append("(?:.*/)?")
                i += 3
                continue
            if pattern[i:i + 2] == "**":
                out.append(".*")
                i += 2
                continue
            out.append("[^/]*")
            i += 1
            continue
        if c == "?":
            out.append("[^/]")
            i += 1
            continue
        if c == "[":
            j = pattern.find("]", i + 1)
            if j == -1:
                out.append(re.escape(c))
                i += 1
            else:
                out.append(pattern[i:j + 1])
                i = j + 1
            continue
        out.append(re.escape(c))
        i += 1
    return "^" + "".join(out) + "$"


def cmd_match(argv):
    parser = argparse.ArgumentParser(prog="helper.py match", add_help=False)
    parser.add_argument("--exclude-prefix", action="append", default=[])
    parser.add_argument("patterns", nargs="*")
    args = parser.parse_args(argv)
    if not args.patterns:
        # Zero patterns used to mean "match nothing", which the caller could
        # not tell apart from "this diff has no UI files".
        err("match: no patterns given (a UI_PATHS_FILE with only comments does this)")
        return 2
    regexes = [re.compile(translate_glob(p)) for p in args.patterns]
    raw = sys.stdin.buffer.read().decode("utf-8", "surrogateescape")
    matched = []
    for path in raw.split("\0"):
        if not path:
            continue
        if any(path.startswith(p) for p in args.exclude_prefix):
            continue
        if any(rx.match(path) for rx in regexes):
            matched.append(path)
    out = "".join(p + "\0" for p in matched)
    sys.stdout.buffer.write(out.encode("utf-8", "surrogateescape"))
    return 0 if matched else 1


# --------------------------------------------------------------------------
# JSON Schema (Draft-07 subset) validation, driven by the schema file
# --------------------------------------------------------------------------
class SchemaError(Exception):
    pass


def resolve(node, root, seen=0):
    while isinstance(node, dict) and "$ref" in node:
        if seen > 16:
            raise SchemaError("$ref chain too deep")
        ref = node["$ref"]
        if not ref.startswith("#/"):
            raise SchemaError("unsupported $ref {!r} (only local #/ refs)".format(ref))
        target = root
        for part in ref[2:].split("/"):
            if not isinstance(target, dict) or part not in target:
                raise SchemaError("unresolvable $ref {!r}".format(ref))
            target = target[part]
        node = target
        seen += 1
    return node


def type_name(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return type(value).__name__


def type_ok(value, expected):
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        # JSON booleans are not integers. Python's bool IS an int subclass,
        # so the isinstance-only check let "line": true validate as an
        # integer with minimum 1.
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    raise SchemaError("unsupported type {!r}".format(expected))


SUPPORTED_KEYWORDS = {
    "$schema", "$id", "$ref", "title", "description", "definitions",
    "type", "properties", "required", "additionalProperties", "items",
    "enum", "const", "pattern", "minLength", "maxLength", "minimum",
    "maximum", "minItems", "format",
}


def assert_supported(node, path):
    """Fail loudly on a schema keyword this validator does not implement.
    Silently ignoring one would let a future constraint be added to the
    schema and enforce nothing -- the exact drift this validator exists to
    end."""
    if not isinstance(node, dict):
        return
    unknown = sorted(set(node) - SUPPORTED_KEYWORDS)
    if unknown:
        raise SchemaError(
            "schema at {} uses unsupported keyword(s): {}".format(path or "<root>", ", ".join(unknown))
        )
    for key in ("properties", "definitions"):
        for name, sub in (node.get(key) or {}).items():
            assert_supported(sub, "{}/{}/{}".format(path, key, name))
    if isinstance(node.get("items"), dict):
        assert_supported(node["items"], path + "/items")


def join(path, key):
    return "{}.{}".format(path, key) if path else str(key)


def validate_node(value, schema, root, path, errors):
    schema = resolve(schema, root)
    if not isinstance(schema, dict):
        return

    expected = schema.get("type")
    if expected is not None and not type_ok(value, expected):
        errors.append("{}: expected {}, got {}".format(path or "<root>", expected, type_name(value)))
        return

    if "const" in schema and value != schema["const"]:
        errors.append("{}: must be {}".format(path or "<root>", json.dumps(schema["const"])))
    if "enum" in schema and value not in schema["enum"]:
        errors.append("{}: {} is not one of {}".format(
            path or "<root>", json.dumps(value), " | ".join(json.dumps(v) for v in schema["enum"])))

    if isinstance(value, str):
        pattern = schema.get("pattern")
        if pattern and not re.search(pattern, value):
            errors.append("{}: {} does not match {}".format(path or "<root>", json.dumps(value), pattern))
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append("{}: shorter than minLength {}".format(path or "<root>", schema["minLength"]))
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append("{}: longer than maxLength {}".format(path or "<root>", schema["maxLength"]))
        # Draft-07 leaves `format` as an annotation. This gate treats
        # date-time as an assertion: a timestamp nobody can parse is not
        # evidence of when the review ran.
        if schema.get("format") == "date-time" and not DATE_TIME_RE.match(value):
            errors.append("{}: {} is not an ISO-8601 date-time".format(path or "<root>", json.dumps(value)))

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append("{}: below minimum {}".format(path or "<root>", schema["minimum"]))
        if "maximum" in schema and value > schema["maximum"]:
            errors.append("{}: above maximum {}".format(path or "<root>", schema["maximum"]))

    if isinstance(value, dict):
        props = schema.get("properties") or {}
        for key in schema.get("required", []):
            if key not in value:
                errors.append("{}: missing required field '{}'".format(path or "<root>", key))
        if schema.get("additionalProperties") is False:
            extra = sorted(set(value) - set(props))
            if extra:
                errors.append("{}: unknown field(s): {}".format(path or "<root>", ", ".join(extra)))
        for key, sub in props.items():
            if key in value:
                validate_node(value[key], sub, root, join(path, key), errors)

    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append("{}: fewer than minItems {}".format(path or "<root>", schema["minItems"]))
        items = schema.get("items")
        if isinstance(items, dict):
            for idx, element in enumerate(value):
                validate_node(element, items, root, "{}[{}]".format(path or "<root>", idx), errors)


# --------------------------------------------------------------------------
# validate subcommand
# --------------------------------------------------------------------------
def load_json(path, kind):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh), None
    except (OSError, ValueError) as exc:
        return None, "could not parse {} {}: {}".format(kind, path, exc)


def expected_schema_version(schema):
    node = ((schema.get("properties") or {}).get("schemaVersion") or {})
    return node.get("const")


def verdict_keys(schema):
    node = ((schema.get("properties") or {}).get("verdicts") or {})
    required = list(node.get("required") or [])
    optional = [k for k in (node.get("properties") or {}) if k not in required]
    return required, optional


def cmd_validate(argv):
    parser = argparse.ArgumentParser(prog="helper.py validate", add_help=False)
    parser.add_argument("artifact")
    parser.add_argument("--schema", required=True)
    parser.add_argument("--reviewed-full", default="")
    parser.add_argument("--reviewed-short", default="")
    parser.add_argument("--pr", default="")
    args = parser.parse_args(argv)

    schema, problem = load_json(args.schema, "schema")
    if problem:
        err(problem)
        return 2
    try:
        assert_supported(schema, "")
    except SchemaError as exc:
        err("schema {} is not usable: {}".format(args.schema, exc))
        return 2

    data, problem = load_json(args.artifact, "artifact")
    if problem:
        err(problem)
        return 1

    want_version = expected_schema_version(schema)
    if isinstance(data, dict) and data.get("schemaVersion") != want_version:
        banner("UNSUPPORTED schemaVersion", [
            "Artifact schemaVersion: {}".format(json.dumps(data.get("schemaVersion"))),
            "This gate accepts:      {}".format(json.dumps(want_version)),
            "",
            "schemaVersion {} added the 'usability' finding dimension and made".format(want_version),
            "'antiAiAesthetic' a required verdict. Migrating a v2 artifact means",
            "setting schemaVersion to {} and adding the antiAiAesthetic verdict;".format(want_version),
            "nothing else in the shape changed. See ci/README.md.",
        ])
        return 1

    errors = []
    try:
        validate_node(data, schema, schema, "", errors)
    except SchemaError as exc:
        err("schema {} is not usable: {}".format(args.schema, exc))
        return 2

    if errors:
        banner("ARTIFACT SHAPE INVALID", ["  - " + e for e in errors])
        return 1

    verdicts = data["verdicts"]
    required_dims, optional_dims = verdict_keys(schema)
    overall = data["overall"]

    # --- policy the schema cannot express ---------------------------------
    artifact_sha = data["sha"].strip().lower()
    reviewed_full = args.reviewed_full.strip().lower()
    reviewed_short = args.reviewed_short.strip().lower()
    sha_ok = bool(reviewed_full) and (
        reviewed_full.startswith(artifact_sha) or artifact_sha.startswith(reviewed_full)
    )
    if not sha_ok and reviewed_short:
        sha_ok = artifact_sha == reviewed_short
    if not sha_ok:
        banner("SHA MISMATCH", [
            "Artifact names sha:  {}".format(artifact_sha),
            "Reviewed sha:        {}".format(reviewed_full or "<unresolved>"),
            "",
            "The reviewed sha is the last commit that touched a UI-adjacent path.",
            "This artifact was written against a different one, so UI changed after",
            "the review. Rerun /ui-craft:improve-ui against the current branch and",
            "commit a fresh artifact naming {}.".format(reviewed_short or reviewed_full or "the reviewed sha"),
        ])
        return 1

    if args.pr:
        artifact_pr = data.get("pr")
        if artifact_pr is not None and str(artifact_pr).strip() != args.pr.strip():
            err("artifact 'pr'={!r} does not match expected PR {!r}".format(artifact_pr, args.pr))
            return 1

    non_green = sorted(d for d, v in verdicts.items() if v != "GREEN")
    if non_green or overall != "GREEN":
        lines = []
        for dim in required_dims + [d for d in optional_dims if d in verdicts]:
            lines.append("  - {:18s} {}".format(dim + ":", verdicts.get(dim, "<missing>")))
        lines.append("  - {:18s} {}".format("overall:", overall))
        lines.append("")
        if non_green:
            lines.append("Non-GREEN dimension(s): {}".format(", ".join(non_green)))
        if overall != "GREEN":
            lines.append("Overall is not GREEN.")
        lines += [
            "",
            "YELLOW means the reviewer wants a human decision -- address the",
            "finding, rerun /ui-craft:improve-ui, and replace the artifact with",
            "a GREEN verdict. RED means a blocker; fix the defect before",
            "merging. No bypass -- this gate is unconditional by design.",
        ]
        banner("NON-GREEN VERDICT", lines)
        return 1

    # A GREEN artifact that carries a CRITICAL finding contradicts itself.
    # This is the gate's only check that does not take the reviewer's word
    # for the outcome, so it is not optional.
    criticals = []
    for group in ("blocker_findings", "high_findings"):
        for finding in data[group]:
            if finding.get("severity") == BLOCKING_SEVERITY or group == "blocker_findings":
                criticals.append("{}: [{}] {} ({})".format(
                    group, finding.get("severity", "?"), finding.get("title", "<untitled>"),
                    finding.get("id", "<no id>")))
    if criticals:
        banner("BLOCKING FINDINGS IN A GREEN ARTIFACT", [
            "Every verdict reads GREEN, but the artifact carries findings that",
            "cannot coexist with a GREEN verdict:",
            "",
        ] + ["  - " + c for c in criticals] + [
            "",
            "blocker_findings must be empty and no finding may carry severity",
            "{}. Fix the defects, rerun the review, and commit the".format(BLOCKING_SEVERITY),
            "artifact the fixed tree produces.",
        ])
        return 1

    print("[ui-craft-gate] Artifact valid against {} (schemaVersion {}).".format(
        args.schema.rsplit("/", 1)[-1], want_version))
    print("[ui-craft-gate] Bound to reviewed sha {}.".format(reviewed_short or reviewed_full))
    print("[ui-craft-gate] All verdicts GREEN, overall GREEN, no blocking findings. PASS.")
    return 0


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("usage: helper.py <match|validate> ...\n")
        return 2
    mode, rest = sys.argv[1], sys.argv[2:]
    if mode == "match":
        return cmd_match(rest)
    if mode == "validate":
        return cmd_validate(rest)
    sys.stderr.write("unknown mode: {}\n".format(mode))
    return 2


if __name__ == "__main__":
    sys.exit(main())
PYEOF

# The artifact directory is excluded from UI-adjacent matching. Without this,
# an adopter whose UI_PATHS_FILE happens to match *.json would see the
# artifact commit move the reviewed sha, reopening the unsatisfiable loop.
MATCHED_LIST="$WORK_DIR/matched.z"
set +e
python3 "$HELPER" match --exclude-prefix "${ARTIFACT_DIR%/}/" "${UI_PATTERNS[@]}" \
  < "$CHANGED_LIST" > "$MATCHED_LIST"
MATCH_STATUS=$?
set -e

if [ "$MATCH_STATUS" -ge 2 ]; then
  fatal "UI-adjacent path matching failed; refusing to report PASS"
fi

if [ "$MATCH_STATUS" -eq 1 ]; then
  echo "[ui-craft-gate] No UI-adjacent files changed. PASS."
  exit 0
fi

UI_FILE_LIST=()
while IFS= read -r -d '' path; do
  UI_FILE_LIST+=(":(literal)$path")
done < "$MATCHED_LIST"

echo "[ui-craft-gate] Detected ${#UI_FILE_LIST[@]} UI-adjacent file(s):"
for path in "${UI_FILE_LIST[@]}"; do
  echo "  - ${path#:(literal)}"
done
echo ""

# ---------------------------------------------------------------------------
# Reviewed sha: the last commit touching one of those paths, walked from
# HEAD_REF. Stable across the artifact commit, which is what makes the
# documented "write it, commit it, push it" flow terminate.
# ---------------------------------------------------------------------------
REVIEWED_SHA="$(git rev-list -1 "$HEAD_REF" -- "${UI_FILE_LIST[@]}" || true)"
if [ -z "$REVIEWED_SHA" ]; then
  fatal "no commit reachable from $HEAD_REF touches the detected UI paths (are they committed?)"
fi
REVIEWED_SHORT="$(git rev-parse --short "$REVIEWED_SHA")"

echo "[ui-craft-gate] Reviewed sha: $REVIEWED_SHORT ($(git log -1 --format=%s "$REVIEWED_SHA"))"

# ---------------------------------------------------------------------------
# Artifact lookup.
# ---------------------------------------------------------------------------
CANDIDATE_ARTIFACTS=()
if [ -n "$PR_NUMBER" ]; then
  CANDIDATE_ARTIFACTS+=("$ARTIFACT_DIR/${PR_NUMBER}.json")
fi
CANDIDATE_ARTIFACTS+=("$ARTIFACT_DIR/${REVIEWED_SHORT}.json")

FOUND_ARTIFACT=""
for candidate in "${CANDIDATE_ARTIFACTS[@]}"; do
  if [ -f "$candidate" ]; then
    FOUND_ARTIFACT="$candidate"
    break
  fi
done

if [ -z "$FOUND_ARTIFACT" ]; then
  echo ""
  echo "============================================================"
  echo "  ui-craft-gate: MISSING ARTIFACT"
  echo "============================================================"
  echo ""
  echo "This change touches UI-adjacent paths but no ui-craft verdict"
  echo "artifact was found for reviewed sha $REVIEWED_SHORT."
  echo ""
  echo "Expected location (first match wins):"
  for p in "${CANDIDATE_ARTIFACTS[@]}"; do
    echo "  - $p"
  done
  echo ""
  echo "To unblock:"
  echo ""
  echo "  1. In a Claude Code session, run:"
  echo ""
  echo "       /ui-craft:improve-ui <scope-or-PR-preview-URL>"
  echo ""
  echo "     improve-ui is the pass that dispatches ui-team-lead's full"
  echo "     specialist fleet plus ui-verifier, so it is the only skill that"
  echo "     produces every verdict this gate requires. review-ui runs an"
  echo "     adaptive 2-3 specialist subset and cannot fill the artifact."
  echo ""
  echo "  2. Save the verdict to the expected artifact path, matching"
  echo "     ci/verdict-artifact-schema.json. A minimal GREEN artifact:"
  echo ""
  echo "       {"
  echo '         "schemaVersion": 3,'
  if [ -n "$PR_NUMBER" ]; then
    echo '         "pr": "'"$PR_NUMBER"'",'
  fi
  echo '         "sha": "'"$REVIEWED_SHORT"'",'
  echo '         "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",'
  echo '         "reviewer": "ui-team-lead",'
  echo '         "scope": "<path, preview URL, or '"'"'full'"'"'>",'
  echo '         "verdicts": {'
  echo '           "visual":          "GREEN",'
  echo '           "responsive":      "GREEN",'
  echo '           "motion":          "GREEN",'
  echo '           "accessibility":   "GREEN",'
  echo '           "runtime":         "GREEN",'
  echo '           "antiAiAesthetic": "GREEN"'
  echo '         },'
  echo '         "overall": "GREEN",'
  echo '         "blocker_findings": [],'
  echo '         "high_findings": []'
  echo "       }"
  echo ""
  echo "     The sha is $REVIEWED_SHORT, the last commit that touched a UI"
  echo "     path -- NOT the current HEAD. Committing the artifact does not"
  echo "     change it, which is why this flow terminates."
  echo ""
  echo "  3. Commit + push the artifact on the branch:"
  echo ""
  echo "       git add $ARTIFACT_DIR/"
  echo '       git commit -m "ui-craft verdict: GREEN"'
  echo "       git push"
  echo ""
  echo "No env-var or CLI-flag bypass. See ci/README.md for CI wiring."
  echo "============================================================"
  exit 1
fi

echo "[ui-craft-gate] Using artifact: $FOUND_ARTIFACT"

python3 "$HELPER" validate "$FOUND_ARTIFACT" \
  --schema "$SCHEMA_FILE" \
  --reviewed-full "$REVIEWED_SHA" \
  --reviewed-short "$REVIEWED_SHORT" \
  --pr "$PR_NUMBER"
