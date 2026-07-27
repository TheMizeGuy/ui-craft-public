#!/usr/bin/env node
// score-review.mjs -- score a ui-craft review's findings against the labeled
// regression corpus (tests/corpus/labels.json).
//
// Usage:
//   node score-review.mjs <findings.json> [--fixture <name>] [--format text|json]
//                         [--min-recall <0..1>] [--min-precision <0..1>]
//                         [--labels <path>]
//
//   <findings.json>   A canonical finding array (whole corpus or one fixture),
//                     or an object { "findings": [ ... ] }. Each finding:
//                     { id, dimension, severity, confidence, file, line?, title, evidence? }
//                     An optional "tellRef" (or "fixture") field, when present,
//                     makes matching deterministic.
//   --fixture <name>  Score only this fixture (basename, e.g. gradient-hero.html).
//   --format          text (default) or json.
//   --min-recall      Pass threshold for recall (default 0.8; must be > 0).
//   --min-precision   Pass threshold for precision (default 0.8).
//   --labels <path>   Override the labels file (default ../corpus/labels.json).
//
// Matching: by tellRef first (explicit finding.tellRef, or the label's tell code
// mentioned in the finding's id/title/evidence), else by (fixture, dimension) with
// fuzzy title overlap. Either way the finding must carry substance: a title with
// at least MIN_TITLE_TOKENS meaningful tokens. Without that floor the gate is
// satisfiable by naming catalogue codes and nothing else, which measures whether
// the auditor memorized the codes rather than whether it located the defects.
//
// Precision is gated, not just printed. Recall alone rewards spraying findings,
// and over-flagging is exactly what the catalogue's presence-vs-concentration
// rules exist to prevent, so a regression there has to be visible here.
//
// Exit codes: 0 = pass (recall >= threshold AND precision >= threshold AND every
// clean control within tolerance), 1 = fail, 2 = usage error or malformed input.
// Zero dependencies.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_MIN_RECALL = 0.8;
const DEFAULT_MIN_PRECISION = 0.8;
const FUZZY_THRESHOLD = 0.34; // overlap coefficient on title tokens
// A finding whose title carries fewer than this many meaningful tokens is not
// a located defect, whatever tell code it cites. The shipped example's thinnest
// title has 4; the committed blind baseline's has 7.
const MIN_TITLE_TOKENS = 3;
// The canonical finding id, kept identical to ci/verdict-artifact-schema.json's
// finding.id pattern. Both must move together when a dimension is added.
const ID_PATTERN = /^(visual|anti-ai|accessibility|motion|responsive|performance|typescript|usability)-[a-z0-9]+(-[a-z0-9]+)*$/;
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'not', 'per', 'via', 'from',
  'onto', 'into', 'every', 'each', 'all', 'any', 'one', 'its', 'has', 'have',
  'ui', 'ai', 'css', 'html'
]);

function die(msg, code) {
  process.stderr.write(`score-review: ${msg}\n`);
  process.exit(code);
}

function usage(code) {
  process.stderr.write(
    'Usage: node score-review.mjs <findings.json> [--fixture <name>] ' +
    '[--format text|json] [--min-recall <0..1>] [--min-precision <0..1>] [--labels <path>]\n'
  );
  process.exit(code);
}

// ---- CLI parsing ----------------------------------------------------------
function parseArgs(argv) {
  const opts = {
    format: 'text', minRecall: DEFAULT_MIN_RECALL, minPrecision: DEFAULT_MIN_PRECISION,
    fixture: null, labels: null, loweredThreshold: false
  };
  const positional = [];
  // Every value-taking flag is read the same way. `--fixture` used to swallow
  // a missing value and silently widen the scope from one fixture to all ten
  // while still printing PASS, which is what an unset shell variable does.
  const takeValue = (flag, argvRef, i) => {
    const v = argvRef[i + 1];
    if (v === undefined || v.startsWith('--')) die(`${flag} requires a value`, 2);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage(0);
    else if (a === '--fixture') { opts.fixture = takeValue(a, argv, i); i++; }
    else if (a === '--format') { opts.format = takeValue(a, argv, i); i++; }
    else if (a === '--labels') { opts.labels = takeValue(a, argv, i); i++; }
    else if (a === '--min-recall') { opts.minRecall = Number(takeValue(a, argv, i)); i++; }
    else if (a === '--min-precision') { opts.minPrecision = Number(takeValue(a, argv, i)); i++; }
    else if (a.startsWith('--')) die(`unknown option: ${a}`, 2);
    else positional.push(a);
  }
  if (positional.length !== 1) usage(2);
  opts.findingsPath = positional[0];
  if (opts.format !== 'text' && opts.format !== 'json') die(`--format must be text or json, got: ${opts.format}`, 2);
  // 0 is rejected: it turns the only gate into an unconditional pass with
  // nothing in the output saying so, which is the bypass ci/ui-craft-gate.sh
  // refuses to build for itself.
  for (const [flag, value] of [['--min-recall', opts.minRecall], ['--min-precision', opts.minPrecision]]) {
    if (!Number.isFinite(value) || value <= 0 || value > 1) {
      die(`${flag} must be a number in (0,1]; 0 would disable the gate entirely`, 2);
    }
  }
  opts.loweredThreshold = opts.minRecall < DEFAULT_MIN_RECALL || opts.minPrecision < DEFAULT_MIN_PRECISION;
  return opts;
}

// ---- text normalization ---------------------------------------------------
function basename(p) {
  if (typeof p !== 'string') return '';
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1];
}

// Collapse any non-alphanumeric run to a single space, lowercase, trim.
function canonTokens(s) {
  if (typeof s !== 'string') return [];
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}

// True if `needle` token sequence appears as a consecutive run inside `hay`.
function containsSeq(hay, needle) {
  if (needle.length === 0) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

function findingText(f) {
  return [f.id, f.title, f.evidence, f.tellRef, f.category].filter(v => typeof v === 'string').join(' ');
}

// Does the finding mention the label's tellRef (explicit field, or embedded in text)?
function mentionsTell(f, tellRef) {
  const needle = canonTokens(tellRef);
  if (needle.length === 0) return false;
  if (typeof f.tellRef === 'string') {
    const ft = canonTokens(f.tellRef);
    if (ft.length === needle.length && needle.every((t, i) => t === ft[i])) return 'explicit';
  }
  const hay = canonTokens(findingText(f));
  return containsSeq(hay, needle) ? 'embedded' : false;
}

function titleTokens(s) {
  return canonTokens(s).filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

// Does the finding say anything beyond naming a tell? The primary matcher is
// dimension-agnostic and searches id/title/evidence for the tell code, so
// without this floor a file of `{"title": "something is off V5"}` stubs scores
// recall 1.000 while locating nothing. Findings that fail it are excluded from
// matching entirely, so they land in the false-positive column and drag
// precision down rather than quietly counting as detections.
function hasSubstance(finding) {
  return titleTokens(finding.title).length >= MIN_TITLE_TOKENS;
}

function overlapCoeff(a, b) {
  const A = new Set(titleTokens(a));
  const B = new Set(titleTokens(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.min(A.size, B.size);
}

// ---- scoring --------------------------------------------------------------
// Match a fixture's findings against its expected labels. Greedy, best-quality-first.
function scoreFixture(labels, findings) {
  const candidates = [];
  for (let li = 0; li < labels.length; li++) {
    for (let fi = 0; fi < findings.length; fi++) {
      const label = labels[li];
      const finding = findings[fi];
      if (!hasSubstance(finding)) continue;
      let quality = 0, overlap = 0, via = null;
      const m = label.tellRef ? mentionsTell(finding, label.tellRef) : false;
      if (m === 'explicit') { quality = 3; via = 'tellRef'; }
      else if (m === 'embedded') { quality = 2; via = 'tellRef'; }
      else if (finding.dimension && label.dimension && finding.dimension === label.dimension) {
        overlap = overlapCoeff(finding.title, label.title);
        if (overlap >= FUZZY_THRESHOLD) { quality = 1; via = 'fuzzy'; }
      }
      if (quality > 0) candidates.push({ li, fi, quality, overlap, via });
    }
  }
  candidates.sort((a, b) => (b.quality - a.quality) || (b.overlap - a.overlap));

  const labelTaken = new Array(labels.length).fill(false);
  const findingTaken = new Array(findings.length).fill(false);
  const hits = [];
  for (const c of candidates) {
    if (labelTaken[c.li] || findingTaken[c.fi]) continue;
    labelTaken[c.li] = true;
    findingTaken[c.fi] = true;
    hits.push({ label: labels[c.li], finding: findings[c.fi], via: c.via, overlap: c.overlap });
  }
  const misses = labels.filter((_, i) => !labelTaken[i]);
  const fps = findings.filter((_, i) => !findingTaken[i]);
  return { hits, misses, fps };
}

// ---- load inputs ----------------------------------------------------------
function loadJson(path, kind) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    die(`cannot read ${kind} file '${path}': ${e.code || e.message}`, 2);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    die(`${kind} file '${path}' is not valid JSON: ${e.message}`, 2);
  }
}

function extractFindings(parsed, path) {
  let arr;
  if (Array.isArray(parsed)) arr = parsed;
  else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.findings)) arr = parsed.findings;
  else die(`findings file '${path}' must be a JSON array or an object with a "findings" array`, 2);
  const clean = [];
  let skipped = 0;
  for (const el of arr) {
    if (el && typeof el === 'object' && !Array.isArray(el)) clean.push(el);
    else skipped++;
  }
  if (skipped > 0) process.stderr.write(`score-review: warning: skipped ${skipped} non-object finding entr${skipped === 1 ? 'y' : 'ies'}\n`);

  // Input-shape validation. A findings file is a claim about what a reviewer
  // found; a duplicate id or a malformed one means the producer is not
  // emitting the canonical shape, and scoring it would put a number on
  // something that is not a review. Both are exit 2 (malformed input), never
  // a low score, so the two failure modes stay distinguishable.
  const seen = new Map();
  const dupes = [];
  const badIds = [];
  for (const f of clean) {
    const id = typeof f.id === 'string' ? f.id : '';
    if (!ID_PATTERN.test(id)) badIds.push(id || JSON.stringify(f.title ?? '(no id, no title)'));
    const key = `${basename(f.fixture || f.file || '')}::${id}`;
    if (seen.has(key)) dupes.push(id); else seen.set(key, true);
  }
  if (badIds.length) {
    die(
      `findings file '${path}' has ${badIds.length} finding(s) whose id is not '<dimension>-<kebab-slug>': `
      + `${badIds.slice(0, 5).join(', ')}${badIds.length > 5 ? ', ...' : ''}\n`
      + `  the dimension prefix must be one of visual|anti-ai|accessibility|motion|responsive|performance|typescript|usability`,
      2
    );
  }
  if (dupes.length) {
    die(
      `findings file '${path}' repeats ${dupes.length} finding id(s) on the same fixture: `
      + `${[...new Set(dupes)].slice(0, 5).join(', ')}${dupes.length > 5 ? ', ...' : ''}\n`
      + `  ids are the stable handle a delta is computed from, so they must be unique per fixture`,
      2
    );
  }
  return clean;
}

// ---- main -----------------------------------------------------------------
function main() {
  const opts = parseArgs(process.argv.slice(2));

  const labelsPath = opts.labels
    ? opts.labels
    : fileURLToPath(new URL('../corpus/labels.json', import.meta.url));
  const labelsDoc = loadJson(labelsPath, 'labels');
  if (!labelsDoc || !Array.isArray(labelsDoc.fixtures)) {
    die(`labels file '${labelsPath}' must have a "fixtures" array`, 2);
  }

  const findingsDoc = loadJson(opts.findingsPath, 'findings');
  const allFindings = extractFindings(findingsDoc, opts.findingsPath);

  // Bucket findings by fixture basename.
  const byFixture = new Map();
  for (const f of allFindings) {
    const key = basename(f.fixture || f.file || '') || '(unassigned)';
    if (!byFixture.has(key)) byFixture.set(key, []);
    byFixture.get(key).push(f);
  }

  let fixtures = labelsDoc.fixtures;
  if (opts.fixture) {
    const want = basename(opts.fixture);
    fixtures = fixtures.filter(fx => basename(fx.file) === want);
    if (fixtures.length === 0) die(`--fixture '${opts.fixture}' is not in the corpus`, 2);
  }

  const knownFixtureNames = new Set(labelsDoc.fixtures.map(fx => basename(fx.file)));

  const rows = [];
  let totalHits = 0, totalExpected = 0, totalMatchedFindings = 0, totalFindings = 0;
  const cleanFailures = [];

  for (const fx of fixtures) {
    const name = basename(fx.file);
    const expected = Array.isArray(fx.expected) ? fx.expected : [];
    const found = byFixture.get(name) || [];
    const { hits, misses, fps } = scoreFixture(expected, found);

    const isClean = expected.length === 0;
    const tolerance = Number.isInteger(fx.maxIncidentalFindings) ? fx.maxIncidentalFindings : 0;
    let cleanOk = true;
    if (isClean) {
      cleanOk = fps.length <= tolerance;
      if (!cleanOk) cleanFailures.push({ name, incidental: fps.length, tolerance });
    }

    totalHits += hits.length;
    totalExpected += expected.length;
    totalMatchedFindings += hits.length;
    totalFindings += found.length;

    rows.push({
      name, source: fx.source || '', isClean, tolerance,
      expected: expected.length, hits, misses, fps, cleanOk
    });
  }

  // Findings placed against fixtures not in the current scoring scope.
  const unassigned = [];
  if (!opts.fixture) {
    for (const [name, list] of byFixture) {
      if (!knownFixtureNames.has(name)) unassigned.push({ name, count: list.length, findings: list });
    }
  }
  const unassignedCount = unassigned.reduce((n, u) => n + u.count, 0);
  totalFindings += unassignedCount; // count toward precision denominator

  // An empty findings file against a corpus that expects tells is not a score
  // of zero, it is a run that never happened (an agent that returned nothing,
  // a redirect that captured stderr, a wrong path). Reporting recall 0 would
  // be honest; reporting PASS at --min-recall 0 would not, and either way the
  // useful signal is "this input is not a review".
  if (totalFindings === 0 && totalExpected > 0) {
    die(
      `findings file '${opts.findingsPath}' contains no findings, but the corpus expects ${totalExpected}. `
      + `An empty run is a broken dispatch, not a score.`,
      2
    );
  }

  const thinFindings = allFindings.filter(f => !hasSubstance(f)).length;
  const recall = totalExpected > 0 ? totalHits / totalExpected : 1;
  const precision = totalFindings > 0 ? totalMatchedFindings / totalFindings : 1;
  const cleanControlsPass = cleanFailures.length === 0;
  const pass = recall >= opts.minRecall && precision >= opts.minPrecision && cleanControlsPass;

  const summary = {
    pass,
    exitCode: pass ? 0 : 1,
    minRecall: opts.minRecall,
    minPrecision: opts.minPrecision,
    thresholdsLowered: opts.loweredThreshold,
    recall: round3(recall),
    precision: round3(precision),
    totalExpected, totalHits,
    totalMisses: totalExpected - totalHits,
    totalFindings,
    totalFalsePositives: totalFindings - totalMatchedFindings,
    findingsBelowSubstanceFloor: thinFindings,
    cleanControlsPass,
    cleanControlFailures: cleanFailures,
    unassignedFindings: unassignedCount
  };

  if (opts.format === 'json') emitJson(rows, summary, unassigned);
  else emitText(rows, summary, unassigned);

  process.exit(summary.exitCode);
}

function round3(n) { return Math.round(n * 1000) / 1000; }

function emitJson(rows, summary, unassigned) {
  const fixtures = rows.map(r => ({
    fixture: r.name,
    source: r.source,
    cleanControl: r.isClean,
    tolerance: r.isClean ? r.tolerance : undefined,
    cleanControlOk: r.isClean ? r.cleanOk : undefined,
    expected: r.expected,
    hits: r.hits.map(h => ({ tellRef: h.label.tellRef, id: h.label.id, via: h.via, matchedFindingId: h.finding.id })),
    misses: r.misses.map(m => ({ tellRef: m.tellRef, id: m.id, title: m.title, severity: m.severity })),
    falsePositives: r.fps.map(f => ({ id: f.id, dimension: f.dimension, title: f.title }))
  }));
  process.stdout.write(JSON.stringify({ summary, fixtures, unassigned: unassigned.map(u => ({ fixture: u.name, count: u.count })) }, null, 2) + '\n');
}

function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function padL(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }

function emitText(rows, summary, unassigned) {
  const out = [];
  out.push('ui-craft review score');
  out.push('='.repeat(60));
  out.push(`${pad('FIXTURE', 28)} ${padL('EXP', 4)} ${padL('HIT', 4)} ${padL('MISS', 5)} ${padL('FP', 4)}  RESULT`);
  out.push('-'.repeat(60));
  for (const r of rows) {
    let result;
    if (r.isClean) result = r.cleanOk ? 'clean-ok' : `CLEAN-FAIL (${r.fps.length}>${r.tolerance})`;
    else result = r.misses.length === 0 ? 'full' : `${r.hits.length}/${r.expected}`;
    out.push(`${pad(r.name, 28)} ${padL(r.expected, 4)} ${padL(r.hits.length, 4)} ${padL(r.misses.length, 5)} ${padL(r.fps.length, 4)}  ${result}`);
  }
  out.push('-'.repeat(60));

  // Detail: misses and false positives.
  const detail = [];
  for (const r of rows) {
    for (const m of r.misses) detail.push(`  MISS  ${pad(r.name, 26)} ${m.tellRef || '(no tellRef)'} -- ${m.title}`);
    for (const f of r.fps) {
      if (r.isClean) detail.push(`  INCID ${pad(r.name, 26)} ${f.dimension || '?'} -- ${f.title || f.id || '(untitled)'}`);
      else detail.push(`  FP    ${pad(r.name, 26)} ${f.dimension || '?'} -- ${f.title || f.id || '(untitled)'}`);
    }
  }
  for (const u of unassigned) detail.push(`  UNPLACED ${u.count} finding(s) on '${u.name}' (not a corpus fixture)`);
  if (detail.length) { out.push('detail:'); out.push(...detail); out.push('-'.repeat(60)); }

  out.push(`recall     ${summary.recall}  (${summary.totalHits}/${summary.totalExpected}, threshold ${summary.minRecall})`);
  out.push(`precision  ${summary.precision}  (${summary.totalHits}/${summary.totalFindings} findings matched, threshold ${summary.minPrecision})`);
  out.push(`clean controls  ${summary.cleanControlsPass ? 'within tolerance' : 'FAILED: ' + summary.cleanControlFailures.map(c => `${c.name} (${c.incidental}>${c.tolerance})`).join(', ')}`);
  if (summary.findingsBelowSubstanceFloor > 0) {
    out.push(
      `substance  ${summary.findingsBelowSubstanceFloor} finding(s) excluded from matching: `
      + `a title needs >= ${MIN_TITLE_TOKENS} meaningful tokens to count as a located defect`
    );
  }
  if (summary.thresholdsLowered) {
    out.push('-'.repeat(60));
    out.push(
      `WARNING: thresholds lowered from the defaults (recall ${DEFAULT_MIN_RECALL}, `
      + `precision ${DEFAULT_MIN_PRECISION}). This run's PASS is not comparable to a default-gate run.`
    );
  }
  out.push('='.repeat(60));
  out.push(`${summary.pass ? 'PASS' : 'FAIL'}  (exit ${summary.exitCode})`);
  process.stdout.write(out.join('\n') + '\n');
}

main();
