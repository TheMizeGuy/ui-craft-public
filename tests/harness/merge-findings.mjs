#!/usr/bin/env node
// merge-findings.mjs -- the mechanical half of the scanner merge, for scoring.
//
// Since 0.7.0 the anti-slop auditor reviews without the scanner's output, and
// the orchestrator merges the two afterwards (references/review/04-verdicts-and-
// verification.md § Scanner merge). A blind auditor run over the corpus is
// therefore the judgment half of the pipeline, not the pipeline. This script
// produces the pipeline's findings from the two halves so score-review.mjs can
// put a number on each:
//
//   node tests/harness/merge-findings.mjs <specialist.json> <scan_tells.json> [--keep-heuristic]
//       Prints the merged canonical findings array on stdout. Keyed per
//       (basename(file), tellRef), with tellRef compared after the scorer's own
//       normalisation (lowercase, every non-alphanumeric run collapsed), so
//       `WCAG 1.1.1` and `wcag-1.1.1` are one key. A specialist finding wins its
//       key and gains `Scanner: <id> at line <n>` on its evidence; a scanner
//       finding with heuristic false and no specialist twin is added as is; a
//       heuristic candidate is dropped unless --keep-heuristic. A specialist
//       finding with no tellRef field is matched when its id, title or evidence
//       names the scanner's tellRef, the way the scorer matches it.
//
//       The verifier's merge also reads each scanner-only hit's line and removes
//       the ones a comment or a non-rendering string produced. This script does
//       not, so the precision it yields is a lower bound on the verifier's.
//
//   node tests/harness/merge-findings.mjs judgment <findings.json> <out-dir> [--labels <path>]
//       Writes <out-dir>/labels.json (the corpus labels without every label whose
//       tellRef the scanner covers; a former positive left with no label gets
//       maxIncidentalFindings 99, so only real clean controls keep a tolerance)
//       and <out-dir>/findings.json (the findings whose tellRef the scanner does
//       not cover). Score them with
//       `score-review.mjs <out-dir>/findings.json --labels <out-dir>/labels.json`.
//       The labels file is never edited; the view is a derived copy.
//
//   node tests/harness/merge-findings.mjs --selftest
//
// Either input may be a bare array or an object with a "findings" array, so the
// scanner's `{ summary, findings, ... }` JSON is read directly.
// Exit 0 ok, 1 selftest failure, 2 usage error or malformed input.
// Zero dependencies (node >= 18 stdlib).

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const DEFAULT_LABELS = resolve(HERE, '..', 'corpus', 'labels.json');
const USAGE =
  'Usage: node tests/harness/merge-findings.mjs <specialist.json> <scan_tells.json> [--keep-heuristic]\n' +
  '       node tests/harness/merge-findings.mjs judgment <findings.json> <out-dir> [--labels <path>]\n' +
  '       node tests/harness/merge-findings.mjs --selftest\n';

class UsageError extends Error {}

function basename(p) {
  if (typeof p !== 'string') return '';
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1];
}

// Kept identical to score-review.mjs canonTokens.
function canonTokens(s) {
  if (typeof s !== 'string') return [];
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}

function canon(s) {
  return canonTokens(s).join(' ');
}

function containsSeq(hay, needle) {
  if (!needle.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

function findingsOf(doc, label) {
  const arr = Array.isArray(doc) ? doc : doc && Array.isArray(doc.findings) ? doc.findings : null;
  if (!arr) throw new UsageError(`${label} must be a JSON array or an object with a "findings" array`);
  for (const f of arr) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) throw new UsageError(`${label} holds a non-object finding`);
  }
  return arr;
}

function loadJson(path, label) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    throw new UsageError(`cannot read ${label} '${path}': ${e.code || e.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new UsageError(`${label} '${path}' is not valid JSON: ${e.message}`);
  }
}

function sameTell(specialist, scanTell) {
  const want = canonTokens(scanTell);
  if (!want.length) return false;
  if (typeof specialist.tellRef === 'string' && specialist.tellRef.trim()) {
    return canon(specialist.tellRef) === want.join(' ');
  }
  const text = [specialist.id, specialist.title, specialist.evidence].filter((v) => typeof v === 'string').join(' ');
  return containsSeq(canonTokens(text), want);
}

/**
 * Merge a specialist findings array with a scanner findings array.
 * Returns { findings, stats }.
 */
export function mergeFindings(specialist, scanner, { keepHeuristic = false } = {}) {
  const merged = specialist.map((f) => ({ ...f }));
  const stats = { specialist: specialist.length, scanner: scanner.length, confirmed: 0, scannerOnlyKept: 0, heuristicDropped: 0 };
  const idsByFile = new Map();
  const noteId = (f) => {
    const key = basename(f.file || f.fixture || '');
    if (!idsByFile.has(key)) idsByFile.set(key, new Set());
    idsByFile.get(key).add(f.id);
  };
  merged.forEach(noteId);

  for (const s of scanner) {
    const file = basename(s.file || s.path || '');
    const twin = merged.find((m) => !m.fromScanner && basename(m.file || m.fixture || '') === file && sameTell(m, s.tellRef));
    if (twin) {
      const note = `Scanner: ${s.id} at line ${s.line}`;
      twin.evidence = typeof twin.evidence === 'string' && twin.evidence ? `${twin.evidence}; ${note}` : note;
      stats.confirmed += 1;
      continue;
    }
    if (s.heuristic === true && !keepHeuristic) {
      stats.heuristicDropped += 1;
      continue;
    }
    const { path: _absolute, ...rest } = s;
    const added = { ...rest, file, fromScanner: true };
    const taken = idsByFile.get(file) || new Set();
    if (taken.has(added.id)) {
      let candidate = `${added.id}-scan`;
      for (let n = 2; taken.has(candidate); n++) candidate = `${added.id}-scan-${n}`;
      added.id = candidate;
    }
    noteId(added);
    merged.push(added);
    stats.scannerOnlyKept += 1;
  }
  return { findings: merged.map(({ fromScanner, ...f }) => f), stats };
}

/** The judgment-only view: labels and findings with every scanner-covered tell removed. */
export function judgmentView(labelsDoc, findings, coveredTells) {
  const covered = new Set(coveredTells.map(canon));
  const isCovered = (tellRef) => typeof tellRef === 'string' && covered.has(canon(tellRef));
  const fixtures = labelsDoc.fixtures.map((fx) => {
    const expected = Array.isArray(fx.expected) ? fx.expected : [];
    const kept = expected.filter((l) => !isCovered(l.tellRef));
    const out = { ...fx, expected: kept };
    if (expected.length && !kept.length) out.maxIncidentalFindings = 99;
    return out;
  });
  return {
    labels: { ...labelsDoc, meta: { ...(labelsDoc.meta || {}), view: 'judgment-only: labels whose tellRef scan_tells covers are removed' }, fixtures },
    findings: findings.filter((f) => !isCovered(f.tellRef)),
  };
}

// --- CLI ---------------------------------------------------------------------------

async function runJudgment(args) {
  let labelsPath = DEFAULT_LABELS;
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--labels') {
      if (!args[i + 1]) throw new UsageError('--labels needs a path');
      labelsPath = args[++i];
    } else if (args[i].startsWith('--')) throw new UsageError(`unknown option ${args[i]}`);
    else pos.push(args[i]);
  }
  if (pos.length !== 2) throw new UsageError('judgment needs <findings.json> <out-dir>');
  const findings = findingsOf(loadJson(pos[0], 'findings file'), 'findings file');
  const labelsDoc = loadJson(labelsPath, 'labels file');
  if (!labelsDoc || !Array.isArray(labelsDoc.fixtures)) throw new UsageError(`labels file '${labelsPath}' has no "fixtures" array`);
  const { COVERED_TELLS } = await import('../../scripts/scan_tells.mjs');
  const view = judgmentView(labelsDoc, findings, COVERED_TELLS);
  mkdirSync(pos[1], { recursive: true });
  writeFileSync(join(pos[1], 'labels.json'), `${JSON.stringify(view.labels, null, 2)}\n`);
  writeFileSync(join(pos[1], 'findings.json'), `${JSON.stringify(view.findings, null, 2)}\n`);
  const labelCount = view.labels.fixtures.reduce((n, fx) => n + fx.expected.length, 0);
  process.stderr.write(`merge-findings judgment: ${labelCount} label(s) and ${view.findings.length} finding(s) outside the scanner's coverage, written to ${pos[1]}\n`);
}

function runMerge(args) {
  const keepHeuristic = args.includes('--keep-heuristic');
  const pos = args.filter((a) => a !== '--keep-heuristic');
  const unknown = pos.find((a) => a.startsWith('--'));
  if (unknown) throw new UsageError(`unknown option ${unknown}`);
  if (pos.length !== 2) throw new UsageError('need <specialist.json> <scan_tells.json>');
  const specialist = findingsOf(loadJson(pos[0], 'specialist findings'), 'specialist findings');
  const scanner = findingsOf(loadJson(pos[1], 'scan_tells output'), 'scan_tells output');
  const { findings, stats } = mergeFindings(specialist, scanner, { keepHeuristic });
  process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
  process.stderr.write(
    `merge-findings: ${stats.specialist} specialist + ${stats.scanner} scanner finding(s); ` +
    `confirmed ${stats.confirmed}, scanner-only kept ${stats.scannerOnlyKept}, heuristic dropped ${stats.heuristicDropped}\n`,
  );
}

// --- selftest ------------------------------------------------------------------------

function selftest() {
  let pass = 0;
  let fail = 0;
  const check = (name, fn) => {
    let problem;
    try {
      problem = fn();
    } catch (e) {
      problem = `threw ${e.message}`;
    }
    if (problem) {
      fail += 1;
      console.log(`  FAIL  ${name.padEnd(50)} ${problem}`);
    } else {
      pass += 1;
      console.log(`  ok    ${name}`);
    }
  };
  const spec = (o) => ({ dimension: 'anti-ai', severity: 'HIGH', confidence: 'Pattern smell', title: 'A located defect title', ...o });
  const scan = (o) => ({ dimension: 'anti-ai', severity: 'HIGH', confidence: 'Pattern smell', title: 'Scanner title', evidence: 'x', heuristic: false, line: 3, ...o });

  check('both found it: one finding, scanner noted on evidence', () => {
    const { findings, stats } = mergeFindings(
      [spec({ id: 'anti-ai-inter-primary', file: 'a.html', tellRef: 'T1', evidence: 'font-family: Inter' })],
      [scan({ id: 'anti-ai-inter-as-primary', file: '/abs/a.html', tellRef: 'T1' })]);
    if (findings.length !== 1) return `${findings.length} findings, want 1`;
    if (!findings[0].evidence.includes('Scanner: anti-ai-inter-as-primary at line 3')) return 'no scanner note';
    return stats.confirmed === 1 ? null : 'confirmed count wrong';
  });
  check('scanner only, heuristic false: kept as is', () => {
    const { findings } = mergeFindings([], [scan({ id: 'anti-ai-lorem-ipsum', file: '/abs/b.html', path: '/abs/b.html', tellRef: 'W1' })]);
    if (findings.length !== 1) return `${findings.length} findings, want 1`;
    return findings[0].file === 'b.html' && !('path' in findings[0]) ? null : 'file not reduced to its basename';
  });
  check('scanner only, heuristic true: dropped', () => {
    const { findings, stats } = mergeFindings([], [scan({ id: 'anti-ai-flat', file: 'c.html', tellRef: 'V13', heuristic: true })]);
    return findings.length === 0 && stats.heuristicDropped === 1 ? null : 'heuristic candidate survived';
  });
  check('heuristic kept with --keep-heuristic', () => {
    const { findings } = mergeFindings([], [scan({ id: 'anti-ai-flat', file: 'c.html', tellRef: 'V13', heuristic: true })], { keepHeuristic: true });
    return findings.length === 1 ? null : 'heuristic candidate dropped';
  });
  check('id collision on one fixture gets a -scan suffix', () => {
    const { findings } = mergeFindings(
      [spec({ id: 'anti-ai-radius', file: 'd.html', tellRef: 'D1' })],
      [scan({ id: 'anti-ai-radius', file: 'd.html', tellRef: 'D2' }), scan({ id: 'anti-ai-radius', file: 'd.html', tellRef: 'D3' })]);
    const ids = findings.map((f) => f.id).join(',');
    return ids === 'anti-ai-radius,anti-ai-radius-scan,anti-ai-radius-scan-2' ? null : `ids ${ids}`;
  });
  check('tellRef compared after normalisation', () => {
    const { findings } = mergeFindings(
      [spec({ id: 'accessibility-alt', file: 'e.html', tellRef: 'WCAG 1.1.1' }), spec({ id: 'anti-ai-cream', file: 'e.html', tellRef: 'Cream serif sage' })],
      [scan({ id: 'accessibility-missing-alt', file: 'e.html', tellRef: 'wcag-1.1.1' }), scan({ id: 'anti-ai-cream-serif-default', file: 'e.html', tellRef: 'cream-serif-sage' })]);
    return findings.length === 2 ? null : `${findings.length} findings, want 2`;
  });
  check('a specialist finding without tellRef matches by mention', () => {
    const { findings } = mergeFindings(
      [spec({ id: 'anti-ai-face', file: 'f.html', title: 'T1 Inter set as the primary face' })],
      [scan({ id: 'anti-ai-inter-as-primary', file: 'f.html', tellRef: 'T1' })]);
    return findings.length === 1 ? null : `${findings.length} findings, want 1`;
  });
  check('judgment view drops covered labels and findings', () => {
    const labels = { meta: {}, fixtures: [
      { file: 'p.html', expected: [{ id: 'x', tellRef: 'T1' }, { id: 'y', tellRef: 'ZZ9' }] },
      { file: 'q.html', expected: [{ id: 'z', tellRef: 't1' }] },
      { file: 'r.html', expected: [], maxIncidentalFindings: 1 },
    ] };
    const view = judgmentView(labels, [{ id: 'a', tellRef: 'T1' }, { id: 'b', tellRef: 'ZZ9' }, { id: 'c' }], ['T1']);
    const [p, q, r] = view.labels.fixtures;
    if (p.expected.length !== 1 || p.expected[0].tellRef !== 'ZZ9') return 'covered label kept on p';
    if (q.expected.length !== 0 || q.maxIncidentalFindings !== 99) return 'emptied positive not given tolerance 99';
    if (r.maxIncidentalFindings !== 1) return 'real clean control lost its tolerance';
    if (labels.fixtures[0].expected.length !== 2) return 'labels input was mutated';
    return view.findings.map((f) => f.id).join(',') === 'b,c' ? null : 'covered finding kept';
  });
  check('malformed input exits 2', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ui-craft-merge-'));
    try {
      const bad = join(dir, 'bad.json');
      const ok = join(dir, 'ok.json');
      writeFileSync(bad, '{ not json');
      writeFileSync(ok, '[]');
      const r1 = spawnSync(process.execPath, [SELF, bad, ok], { encoding: 'utf8' });
      const r2 = spawnSync(process.execPath, [SELF, ok, JSON.stringify({})], { encoding: 'utf8' });
      const r3 = spawnSync(process.execPath, [SELF, ok], { encoding: 'utf8' });
      return r1.status === 2 && r2.status === 2 && r3.status === 2 ? null : `exits ${r1.status}, ${r2.status}, ${r3.status}`;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) return selftest();
  if (!args.length || args.includes('-h') || args.includes('--help')) throw new UsageError('no arguments');
  if (args[0] === 'judgment') return runJudgment(args.slice(1));
  return runMerge(args);
}

main().catch((e) => {
  if (e instanceof UsageError) {
    process.stderr.write(`merge-findings: ${e.message}\n${USAGE}`);
    process.exit(2);
  }
  process.stderr.write(`merge-findings: ${e.stack || e}\n`);
  process.exit(2);
});
