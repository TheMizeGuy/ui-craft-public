#!/usr/bin/env node
// selftest.mjs -- asserts what score-review.mjs itself must do.
//
// The scorer is the plugin's only mechanical regression gate, so its own
// failure modes need a gate too. Before 0.2.4 the gate was satisfiable by a
// file of stubs that named catalogue codes and located nothing (recall 1.000,
// precision 1.000, exit 0), and precision was printed but never enforced, so a
// reviewer that sprayed 200 findings scored the same as a precise one.
//
// SCOPE: this tests the SCORER, not the corpus. Every deterministic case runs
// against a synthetic labels file built in a scratch directory, so adding
// fixtures to ../corpus/labels.json can never turn these red. Corpus health
// (is the committed baseline still above threshold?) is a separate question,
// answered by running the scorer against the corpus, and it is supposed to go
// red when the corpus grows past what the baseline covers.
//
//   node tests/harness/selftest.mjs
//
// Zero dependencies (node >= 18 stdlib). Exit 0 when every case holds.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCORER = join(HERE, 'score-review.mjs');
const REPO = join(HERE, '..', '..');
const SCRATCH = mkdtempSync(join(tmpdir(), 'ui-craft-harness-'));

let pass = 0;
let fail = 0;

function run(args) {
  const r = spawnSync(process.execPath, [SCORER, ...args], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function check(name, args, expectCode, assertOut) {
  const { code, out } = run(args);
  const problems = [];
  if (expectCode !== null && code !== expectCode) problems.push(`exit ${code}, want ${expectCode}`);
  if (assertOut) {
    const problem = assertOut(out, code);
    if (problem) problems.push(problem);
  }
  if (problems.length === 0) {
    pass++;
    console.log(`  ok    ${name.padEnd(48)} exit ${code}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name.padEnd(48)} ${problems.join('; ')}`);
    console.log(out.split('\n').map(l => '          ' + l).join('\n'));
  }
}

function metric(out, label) {
  const m = out.match(new RegExp(`^${label}\\s+([0-9.]+)`, 'm'));
  return m ? Number(m[1]) : null;
}

function scratch(name, data) {
  const p = join(SCRATCH, name);
  writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}

// --- synthetic corpus: 4 labels on 2 tell fixtures + 1 clean control -------
const LABELS = scratch('labels.json', {
  fixtures: [
    {
      file: 'alpha.html',
      source: 'selftest',
      expected: [
        { id: 'anti-ai-alpha-one', dimension: 'anti-ai', severity: 'HIGH', confidence: 'Pattern smell', title: 'Gradient text on the hero heading', tellRef: 'X1' },
        { id: 'anti-ai-alpha-two', dimension: 'anti-ai', severity: 'MEDIUM', confidence: 'Pattern smell', title: 'Uniform card radius across the kit', tellRef: 'X2' }
      ]
    },
    {
      file: 'beta.html',
      source: 'selftest',
      expected: [
        { id: 'responsive-beta-one', dimension: 'responsive', severity: 'HIGH', confidence: 'Hard defect', title: 'Fixed pixel shell cannot resize below 1280', tellRef: 'X3' },
        { id: 'anti-ai-beta-two', dimension: 'anti-ai', severity: 'LOW', confidence: 'Taste note', title: 'Emoji used as section iconography', tellRef: 'X4' }
      ]
    },
    { file: 'clean.html', expected: [], maxIncidentalFindings: 1 }
  ]
});

const finding = (over) => ({
  id: 'anti-ai-alpha-one', dimension: 'anti-ai', severity: 'HIGH', confidence: 'Pattern smell',
  file: 'alpha.html', line: 7, title: 'Gradient text on the hero heading',
  evidence: 'bg-clip-text text-transparent on the h1', tellRef: 'X1', ...over
});

const PERFECT = [
  finding({}),
  finding({ id: 'anti-ai-alpha-two', title: 'Uniform card radius across the kit', tellRef: 'X2' }),
  finding({ id: 'responsive-beta-one', dimension: 'responsive', file: 'beta.html', title: 'Fixed pixel shell cannot resize below 1280', tellRef: 'X3' }),
  finding({ id: 'anti-ai-beta-two', file: 'beta.html', title: 'Emoji used as section iconography', tellRef: 'X4' })
];

console.log('score-review selftest');
console.log('='.repeat(60));

// --- baseline behaviour on a known-good input -----------------------------
check('perfect run scores 1.0 / 1.0', [scratch('perfect.json', PERFECT), '--labels', LABELS], 0, out => {
  const r = metric(out, 'recall'), p = metric(out, 'precision');
  return r === 1 && p === 1 ? null : `recall ${r} precision ${p}, want 1 / 1`;
});

check('one miss still clears the 0.8 recall gate', [scratch('three.json', PERFECT.slice(0, 3)), '--labels', LABELS], 1,
  out => metric(out, 'recall') === 0.75 ? null : `recall ${metric(out, 'recall')}, want 0.75`);

// --- the substance floor ---------------------------------------------------
// This is the hole that let a content-free run score a perfect gate.
const STUBS = PERFECT.map((f, i) => ({
  id: `visual-stub-${i}`, dimension: 'visual', severity: 'LOW', confidence: 'Taste note',
  file: f.file, line: 1, title: `off ${f.tellRef}`
}));
check('tellRef stubs score below threshold', [scratch('stubs.json', STUBS), '--labels', LABELS], 1, out => {
  const r = metric(out, 'recall');
  return r === 0 ? null : `recall ${r}, want 0 (stubs must not match)`;
});
check('substance exclusions are reported', [scratch('stubs.json', STUBS), '--labels', LABELS], 1,
  out => out.includes('excluded from matching') ? null : 'no substance line in the summary');

// The shipped degenerate file must stay below threshold against the real corpus.
check('shipped tellref-stubs.json fails the real corpus', [join(HERE, 'examples', 'tellref-stubs.json')], 1,
  out => {
    const r = metric(out, 'recall');
    return r !== null && r < 0.8 ? null : `recall ${r}, want < 0.8`;
  });

// --- precision is gated, not just printed ---------------------------------
const sprayed = [...PERFECT];
for (let i = 0; i < 50; i++) {
  sprayed.push({
    id: `visual-sprayed-noise-${i}`, dimension: 'visual', severity: 'LOW',
    confidence: 'Taste note', file: 'alpha.html', line: i + 1,
    title: `Spacing rhythm feels slightly uneven in region ${i}`,
    evidence: 'no measurement taken, impression only'
  });
}
check('50 false positives fail on precision', [scratch('sprayed.json', sprayed), '--labels', LABELS], 1, out => {
  const r = metric(out, 'recall'), p = metric(out, 'precision');
  if (r !== 1) return `recall ${r} should still be perfect`;
  return p !== null && p < 0.8 ? null : `precision ${p}, want < 0.8`;
});

check('clean control still bounds false positives', [scratch('dirty-clean.json', [
  ...PERFECT,
  { ...finding({ id: 'anti-ai-clean-one', file: 'clean.html', title: 'Rounded corners on the avatar chip', tellRef: 'Z9' }) },
  { ...finding({ id: 'anti-ai-clean-two', file: 'clean.html', title: 'Slate body text on a white surface', tellRef: 'Z8' }) }
]), '--labels', LABELS], 1,
  out => out.includes('CLEAN-FAIL') ? null : 'clean control did not fail');

// --- input-shape validation ------------------------------------------------
check('duplicate finding ids rejected', [scratch('dupes.json', [...PERFECT, finding({})]), '--labels', LABELS], 2,
  out => out.includes('repeats') ? null : 'no duplicate-id message');
check('malformed finding id rejected', [scratch('badid.json', [finding({ id: 'NOT A VALID ID!!' })]), '--labels', LABELS], 2,
  out => out.includes('kebab-slug') ? null : 'no id-pattern message');
check('empty findings array rejected', [scratch('empty.json', []), '--labels', LABELS], 2,
  out => out.includes('no findings') ? null : 'no empty-run message');
// The usability dimension is new in schemaVersion 3. The scorer's id pattern
// and the schema's finding.id pattern have to move together, so a usability
// finding must score as a hit rather than being rejected as malformed input.
const USABILITY_LABELS = scratch('usability-labels.json', {
  fixtures: [{
    file: 'gamma.html',
    source: 'selftest',
    expected: [{
      id: 'usability-refresh-dead-control', dimension: 'usability', severity: 'HIGH',
      confidence: 'Hard defect', title: 'Refresh control never reloads anything', tellRef: 'X9'
    }]
  }]
});
check('usability dimension scores as a hit', [scratch('usability.json', [{
  id: 'usability-refresh-dead-control', dimension: 'usability', severity: 'HIGH',
  confidence: 'Hard defect', file: 'gamma.html', line: 20, tellRef: 'X9',
  title: 'Refresh control is wired to an empty handler and never reloads',
  evidence: 'onclick handler body is empty'
}]), '--labels', USABILITY_LABELS], 0, out => {
  const r = metric(out, 'recall'), p = metric(out, 'precision');
  return r === 1 && p === 1 ? null : `recall ${r} precision ${p}, want 1 / 1`;
});

// --- flag handling ---------------------------------------------------------
const P = scratch('perfect.json', PERFECT);
check('--fixture with no value errors', [P, '--fixture'], 2,
  out => out.includes('requires a value') ? null : 'no missing-value message');
check('--labels with no value errors', [P, '--labels'], 2,
  out => out.includes('requires a value') ? null : 'no missing-value message');
check('--min-recall with no value errors', [P, '--min-recall'], 2,
  out => out.includes('requires a value') ? null : 'no missing-value message');
check('--min-recall 0 rejected', [P, '--labels', LABELS, '--min-recall', '0'], 2,
  out => out.includes('disable the gate') ? null : 'no gate-disable message');
check('--min-precision 0 rejected', [P, '--labels', LABELS, '--min-precision', '0'], 2,
  out => out.includes('disable the gate') ? null : 'no gate-disable message');
check('lowered threshold prints a warning', [P, '--labels', LABELS, '--min-recall', '0.5'], 0,
  out => out.includes('WARNING: thresholds lowered') ? null : 'no lowered-threshold warning');
check('unknown flag errors', [P, '--nope'], 2,
  out => out.includes('unknown option') ? null : 'no unknown-option message');
check('--fixture scoping works', [P, '--labels', LABELS, '--fixture', 'alpha.html'], 0,
  out => out.includes('alpha.html') && !out.includes('beta.html') ? null : 'fixture scoping did not narrow');
check('--fixture rejects an unknown fixture', [P, '--labels', LABELS, '--fixture', 'nope.html'], 2,
  out => out.includes('not in the corpus') ? null : 'no unknown-fixture message');
check('--format json emits parseable json', [P, '--labels', LABELS, '--format', 'json'], 0, out => {
  try {
    const doc = JSON.parse(out);
    return doc.summary && doc.summary.minPrecision === 0.8 ? null : 'summary missing minPrecision';
  } catch (e) { return `not json: ${e.message}`; }
});

// --- corpus smoke checks: relations only, never absolute numbers ----------
// These use the real corpus, so they must not assert a specific recall: the
// corpus grows, and a growing corpus legitimately moves every score.
const SAMPLE = join(HERE, 'examples', 'sample-findings.json');
// The current blind baseline ships with the release; older baseline-*.json files
// are frozen history and may carry findings the corpus has since relabelled, so
// the newest file by name is the one the shipped-input checks hold to precision 1.
const BASELINE = join(REPO, 'tests', 'corpus',
  readdirSync(join(REPO, 'tests', 'corpus')).filter((f) => /^baseline-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop());
const sampleOut = run([SAMPLE]).out;
const baselineOut = run([BASELINE]).out;
check('shipped inputs emit no false positives', [SAMPLE], null, () => {
  const sp = metric(sampleOut, 'precision'), bp = metric(baselineOut, 'precision');
  // The answer key is derived from the labels and must be precision 1. The blind
  // baseline is a measurement: a correct reading no label may cite (a tell with no
  // catalogue row, a fixture that genuinely carries an unlabelled tell) is not a
  // regression, so it holds to the gate threshold, not to 1.
  return sp === 1 && bp !== null && bp >= 0.8 ? null : `sample precision ${sp}, baseline precision ${bp}, want 1 / >= 0.8`;
});
check('answer key scores at or above the blind run', [SAMPLE], null, () => {
  const sr = metric(sampleOut, 'recall'), br = metric(baselineOut, 'recall');
  return sr !== null && br !== null && sr >= br ? null : `sample ${sr} < baseline ${br}`;
});

rmSync(SCRATCH, { recursive: true, force: true });

console.log('='.repeat(60));
console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
