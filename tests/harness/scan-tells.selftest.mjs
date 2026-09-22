#!/usr/bin/env node
/**
 * scan-tells.selftest.mjs -- verifies `scripts/scan_tells.mjs` against the
 * regression corpus.
 *
 * Four things are checked, and the first two are the ones that matter:
 *
 *   a. Every clean control in `tests/corpus/labels.json` (expected == []) yields
 *      ZERO findings from the scanner. A clean control's tolerance in the scorer
 *      is for a reviewing agent's judgement, not for a regex: a deterministic
 *      rule that fires on `framed-panels-clean.html` or `allowed-choice.html` is
 *      the 0.6.0 regression those fixtures exist to catch, never noise.
 *   b. Every label whose tellRef the scanner CLAIMS to cover (COVERED_TELLS) is
 *      actually found on its fixture. If one is not, the rule is wrong and gets
 *      fixed; the label is ground truth and is never edited to match a rule. A
 *      tell a rule cannot honestly decide is removed from COVERED_TELLS instead.
 *   c. A line carrying `anti-slop-allow` is suppressed, counted under
 *      `summary.suppressed`, and never emitted as a finding. The corpus is read
 *      only: the marked copy is written to a scratch directory.
 *   d. The CLI contract: exit 0 clean / 1 at or above the fail level / 2 usage,
 *      and the documented text and JSON shapes.
 *
 * Usage: node tests/harness/scan-tells.selftest.mjs
 * Exit 0 all passed, 1 any failure.
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COVERED_TELLS, RULES, scanFile, SEVERITY_ORDER } from '../../scripts/scan_tells.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const SCANNER = join(REPO, 'scripts', 'scan_tells.mjs');
const FIXTURES = join(REPO, 'tests', 'corpus', 'fixtures');
const LABELS = JSON.parse(readFileSync(join(REPO, 'tests', 'corpus', 'labels.json'), 'utf8'));

const DIMENSIONS = new Set([
  'visual', 'anti-ai', 'accessibility', 'motion', 'responsive', 'performance',
  'typescript', 'usability',
]);
const CONFIDENCES = new Set(['Hard defect', 'Quality defect', 'Pattern smell', 'Taste note']);

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) passed += 1;
  else failures.push(detail ? `${name}: ${detail}` : name);
}

function run(args) {
  const r = spawnSync(process.execPath, [SCANNER, ...args], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// --- a. clean controls --------------------------------------------------------

const cleanControls = LABELS.fixtures.filter((f) => (f.expected || []).length === 0);
check('corpus has clean controls', cleanControls.length >= 5, `found ${cleanControls.length}`);
for (const fixture of cleanControls) {
  const { findings } = scanFile(join(FIXTURES, fixture.file));
  // A control's own tolerance (maxIncidentalFindings) admits that many LOW or TASTE
  // notes, which is the corpus contract; anything MEDIUM or above is a regression.
  const tolerance = fixture.maxIncidentalFindings || 0;
  const serious = findings.filter((f) => f.severity !== 'LOW' && f.severity !== 'TASTE');
  check(
    `clean control ${fixture.file} scans clean`,
    serious.length === 0 && findings.length <= tolerance,
    findings.map((f) => `${f.tellRef} ${f.title} (line ${f.line})`).join('; '),
  );
}

// --- b. covered labels are found ----------------------------------------------

const covered = new Set(COVERED_TELLS);
let coveredLabelCount = 0;
for (const fixture of LABELS.fixtures) {
  const expected = fixture.expected || [];
  if (!expected.length) continue;
  const wanted = [...new Set(expected.map((e) => e.tellRef).filter((t) => covered.has(t)))];
  if (!wanted.length) continue;
  const { findings } = scanFile(join(FIXTURES, fixture.file));
  const got = new Set(findings.map((f) => f.tellRef));
  for (const tellRef of wanted) {
    coveredLabelCount += 1;
    check(
      `${fixture.file} reports ${tellRef}`,
      got.has(tellRef),
      `got [${[...got].join(', ') || 'nothing'}]`,
    );
  }
}
check('covered labels were exercised', coveredLabelCount >= 20, `${coveredLabelCount} exercised`);

// Every tell the scanner claims is emitted by at least one rule, and the list is
// a deduplicated, sorted set so a reader can diff it between releases.
check('COVERED_TELLS is non-empty', COVERED_TELLS.length > 0);
check(
  'COVERED_TELLS is sorted and unique',
  JSON.stringify(COVERED_TELLS) === JSON.stringify([...new Set(COVERED_TELLS)].sort()),
);
const emitted = new Set(RULES.map((r) => r.tellRef));
check(
  'every COVERED_TELLS entry has a rule',
  COVERED_TELLS.every((t) => emitted.has(t)),
  COVERED_TELLS.filter((t) => !emitted.has(t)).join(', '),
);
// The three labelled tells the scanner deliberately does NOT claim: section 12
// (missing states), W12 (orphan paragraphs) and L14 (text-only section run) are
// judgements about what a surface is missing or where a paragraph belongs, which
// a regex cannot decide. They stay with the auditor and the substance script.
for (const notClaimed of ['section 12', 'W12', 'L14']) {
  check(`COVERED_TELLS excludes ${notClaimed}`, !covered.has(notClaimed));
}

// --- c. the anti-slop-allow escape hatch ---------------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'ui-craft-scan-tells-'));
try {
  const source = join(FIXTURES, 'presence-single.html');
  const baseline = scanFile(source);
  check(
    'presence-single.html reports V5 unmarked',
    baseline.findings.some((f) => f.tellRef === 'V5'),
  );
  check('presence-single.html suppresses nothing unmarked', baseline.suppressed === 0);

  // Mark the gradient-text span. The corpus file is never edited: the marker
  // goes onto a scratch copy. Both halves of the contract are exercised -- the
  // standard leg carries a marker on the line ABOVE it, the `-webkit-` leg a
  // marker ON the line -- so a same-line-only reader fails here.
  const marked = readFileSync(source, 'utf8')
    .replace(
      /(\n)(\s*background-clip: text;)/,
      '$1    /* anti-slop-allow: the wordmark gradient from the identity guide */$1$2',
    )
    .replace(
      /(\n\s*-webkit-background-clip: text;)/,
      '$1 /* anti-slop-allow: same wordmark gradient, prefixed */',
    );
  check('scratch copy carries both markers', (marked.match(/anti-slop-allow/g) || []).length === 2);
  const markedPath = join(scratch, 'presence-single.html');
  writeFileSync(markedPath, marked);
  const suppressedRun = scanFile(markedPath);
  check(
    'marked line yields no V5 finding',
    !suppressedRun.findings.some((f) => f.tellRef === 'V5'),
    suppressedRun.findings.map((f) => f.tellRef).join(', '),
  );
  check(
    'marked line is counted under summary.suppressed',
    suppressedRun.suppressed >= 1,
    `suppressed=${suppressedRun.suppressed}`,
  );

  // --- d. CLI contract ---------------------------------------------------------

  const control = join(FIXTURES, 'framed-panels-clean.html');
  const dirty = join(FIXTURES, 'gradient-hero.html');
  const lowOnly = join(FIXTURES, 'slow-page-transition.html');

  check('exit 0 on a clean file', run([control]).status === 0);
  check('exit 1 on findings with the default fail level', run([dirty]).status === 1);
  check('exit 0 with --fail-on none', run([dirty, '--fail-on', 'none']).status === 0);
  check('exit 1 with --fail-on high on a HIGH finding', run([dirty, '--fail-on', 'high']).status === 1);
  check('exit 0 with --fail-on high on a LOW-only file', run([lowOnly, '--fail-on', 'high']).status === 0);
  check('exit 1 with --fail-on low on a LOW-only file', run([lowOnly, '--fail-on', 'low']).status === 1);
  check('exit 2 on a directory argument', run([FIXTURES]).status === 2);
  check('exit 2 on a missing file', run([join(FIXTURES, 'no-such-fixture.html')]).status === 2);
  check('exit 2 on no arguments', run([]).status === 2);
  check('exit 2 on an unknown flag', run([control, '--nope']).status === 2);
  check('exit 2 on a bad --format value', run([control, '--format', 'yaml']).status === 2);
  check('exit 2 on a missing --format value', run([control, '--format']).status === 2);
  check('exit 2 on a bad --surface value', run([control, '--surface', 'poster']).status === 2);
  check('exit 2 on a bad --fail-on value', run([control, '--fail-on', 'sometimes']).status === 2);

  const unsupported = join(scratch, 'notes.rtf');
  writeFileSync(unsupported, 'plain text');
  check('exit 2 on an unsupported file type', run([unsupported]).status === 2);

  // Text output: one line per finding, then exactly one summary line.
  const textRun = run([dirty, '--fail-on', 'none']);
  const textLines = textRun.stdout.trimEnd().split('\n');
  check('text output has one line per finding plus a summary', textLines.length === 3, textRun.stdout);
  check(
    'text finding line is [SEVERITY] tellRef file:line title',
    /^\[(CRITICAL|HIGH|MEDIUM|LOW|TASTE)\] \S+ gradient-hero\.html:\d+ \S/.test(textLines[0]),
    textLines[0],
  );
  check(
    'text summary line reports files, findings and suppressed',
    /^1 file\(s\), 2 finding\(s\), 0 suppressed/.test(textLines[2]),
    textLines[2],
  );
  check('text output goes to stdout only', textRun.stderr === '');

  // JSON output: the documented shape, and the canonical finding shape.
  const jsonRun = run([dirty, lowOnly, '--format', 'json', '--fail-on', 'none']);
  check('exit 0 with --fail-on none on the json run', jsonRun.status === 0);
  let parsed = null;
  try {
    parsed = JSON.parse(jsonRun.stdout);
  } catch (err) {
    check('json output parses', false, String(err));
  }
  if (parsed) {
    check('json output parses', true);
    check(
      'json top level is { summary, findings }',
      JSON.stringify(Object.keys(parsed).sort()) === '["findings","summary"]',
      Object.keys(parsed).join(', '),
    );
    check(
      'summary carries files, findings, suppressed, bySeverity, byTell',
      JSON.stringify(Object.keys(parsed.summary).sort()) ===
        '["bySeverity","byTell","files","findings","suppressed"]',
      Object.keys(parsed.summary).join(', '),
    );
    check('summary.files counts the inputs', parsed.summary.files === 2, String(parsed.summary.files));
    check(
      'summary.findings matches the array length',
      parsed.summary.findings === parsed.findings.length,
    );
    check(
      'bySeverity totals the findings',
      Object.values(parsed.summary.bySeverity).reduce((a, b) => a + b, 0) === parsed.findings.length,
    );
    check(
      'byTell totals the findings',
      Object.values(parsed.summary.byTell).reduce((a, b) => a + b, 0) === parsed.findings.length,
    );
    for (const f of parsed.findings) {
      check(`finding ${f.id} uses <dimension>-<kebab-slug>`,
        new RegExp(`^${f.dimension}-[a-z0-9]+(?:-[a-z0-9]+)*$`).test(f.id), f.id);
      check(`finding ${f.id} has a known dimension`, DIMENSIONS.has(f.dimension), f.dimension);
      check(`finding ${f.id} has a known severity`, SEVERITY_ORDER.includes(f.severity), f.severity);
      check(`finding ${f.id} has a known confidence`, CONFIDENCES.has(f.confidence), f.confidence);
      check(`finding ${f.id} has an integer line >= 1`, Number.isInteger(f.line) && f.line >= 1, String(f.line));
      check(`finding ${f.id} carries file, title, tellRef`,
        Boolean(f.file && f.title && f.tellRef));
      check(`finding ${f.id} carries a boolean heuristic flag`, typeof f.heuristic === 'boolean');
      check(`finding ${f.id} names its remediation`, typeof f.remediation === 'string' && f.remediation.length > 20);
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// --- the heuristic flag ---------------------------------------------------------
// The catalogue rows whose scan is a candidate rather than a match must say so,
// or a reader takes a measurement the scanner never made.
for (const [file, tellRef] of [
  ['prose-blob-top.html', 'W11'],
  ['icon-cards-no-imagery.html', 'I8'],
  ['flat-terminal.html', 'V13'],
]) {
  const { findings } = scanFile(join(FIXTURES, file));
  const f = findings.find((x) => x.tellRef === tellRef);
  check(`${tellRef} on ${file} is flagged heuristic`, Boolean(f && f.heuristic === true));
}
// T15 on fixed-desktop-shell is carried by middle-dot meta runs, not by the
// single-word accent leg, so the finding is a match rather than a candidate.
{
  const { findings } = scanFile(join(FIXTURES, 'fixed-desktop-shell.html'));
  const f = findings.find((x) => x.tellRef === 'T15');
  check('T15 on fixed-desktop-shell is not flagged heuristic', Boolean(f && f.heuristic === false));
}

// --- report ------------------------------------------------------------------

for (const failure of failures) process.stdout.write(`FAIL ${failure}\n`);
process.stdout.write(`${passed} passed, ${failures.length} failed\n`);
process.exit(failures.length ? 1 : 0);
