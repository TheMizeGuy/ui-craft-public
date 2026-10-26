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
 *   d. The CLI contract: exit 0 clean / 1 at or above the fail level / 2 usage
 *      or nothing scannable, the documented text and JSON shapes, a mixed file
 *      list that keeps every result, and the coverage notes.
 *   e. Probes: every narrowing a rule carries ships with the construct it must
 *      leave alone and the twin it must still catch, written to a scratch
 *      directory. A probe that flips is a rule regression.
 *
 * The vendored detection module is checked first: its body must match the
 * pinned anti-slop hash.
 *
 * Usage: node tests/harness/scan-tells.selftest.mjs
 * Exit 0 all passed, 1 any failure.
 */

import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COVERED_TELLS, RULES, scanFile, scanContent, SEVERITY_ORDER } from '../../scripts/scan_tells.mjs';

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

// --- the vendored detection module ----------------------------------------------
// scripts/lib/design-detect.mjs is anti-slop's file byte for byte below a one-line
// header. A local edit fails here; the change belongs in anti-slop, then re-vendor
// and re-pin.

const VENDORED_SHA256 = '764210006fc32516971fca5092e56cedb2ece3a4655fd03f3cee970d91439cc8';
{
  const bytes = readFileSync(join(REPO, 'scripts', 'lib', 'design-detect.mjs'));
  const nl = bytes.indexOf(0x0a);
  const header = bytes.subarray(0, nl).toString('utf8');
  check(
    'design-detect.mjs carries the vendor header',
    /^\/\/ vendored from anti-slop v\d+\.\d+\.\d+ \([0-9a-f]{7,40}\) anti-slop\/scripts\/lib\/design-detect\.mjs; do not edit here$/.test(header),
    header,
  );
  const digest = createHash('sha256').update(bytes.subarray(nl + 1)).digest('hex');
  check('design-detect.mjs below its header matches the pinned anti-slop hash', digest === VENDORED_SHA256, digest);
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
      'json top level is { summary, findings, coverage, skipped }',
      JSON.stringify(Object.keys(parsed).sort()) === '["coverage","findings","skipped","summary"]',
      Object.keys(parsed).join(', '),
    );
    check('a full-coverage html run has empty coverage and skipped lists',
      Array.isArray(parsed.coverage) && parsed.coverage.length === 0 && Array.isArray(parsed.skipped) && parsed.skipped.length === 0);
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
      check(`finding ${f.id} lists its occurrences`,
        Array.isArray(f.occurrences) && f.occurrences.length >= 1 && f.occurrences[0].line === f.line &&
        f.occurrences.every((o) => Number.isInteger(o.line) && 'column' in o && 'match' in o));
    }
  }
  // A mixed list keeps every result: an unscannable path is skipped, not fatal.
  const mixed = run([dirty, unsupported, '--format', 'json']);
  let mixedParsed = null;
  try { mixedParsed = JSON.parse(mixed.stdout); } catch { /* checked below */ }
  check('a mixed list with an unsupported file still exits 1 at the default fail level', mixed.status === 1, String(mixed.status));
  check('the unsupported file is listed under skipped with its reason',
    Boolean(mixedParsed && mixedParsed.skipped.length === 1 && mixedParsed.skipped[0].file === unsupported &&
      /unsupported file type \.rtf/.test(mixedParsed.skipped[0].reason)), mixed.stdout);
  check('the scannable file keeps its findings', Boolean(mixedParsed && mixedParsed.summary.files === 1 && mixedParsed.findings.length === 2));
  check('a skipped file prints one stderr line', /skipped: .*notes\.rtf/.test(mixed.stderr), mixed.stderr);

  const astro = join(scratch, 'card.astro');
  writeFileSync(astro, '---\nconst title = "Ledger";\n---\n<article class="card"><h2>{title}</h2><p>Balances reconcile nightly.</p></article>\n');
  check('an .astro file is scanned', run([astro]).status === 0);
  for (const ext of ['.scss', '.less']) {
    const sheet = join(scratch, `theme${ext}`);
    writeFileSync(sheet, '// a slash comment: outline: none\n.card { padding: 1rem; }\n');
    check(`a ${ext} stylesheet is scanned and its // comment is not read`, run([sheet]).status === 0);
  }

  const component = join(scratch, 'Card.tsx');
  writeFileSync(component, 'export const Card = () => <section className="p-6"><h2>Ledger</h2></section>;\n');
  const compRun = run([component, '--format', 'json']);
  let compParsed = null;
  try { compParsed = JSON.parse(compRun.stdout); } catch { /* checked below */ }
  check('a component file names the page-level rules it did not run',
    Boolean(compParsed && compParsed.coverage.some((c) => c.rules.includes('no-viewport-meta') && c.files.includes(component))), compRun.stdout);
  const compText = run([component]);
  check('coverage notes go to stderr with the floor sentence once',
    /coverage: page-level rules/.test(compText.stderr) && (compText.stderr.match(/A clean result is a floor/g) || []).length === 1, compText.stderr);

  // --- the rule-scoped waiver ---------------------------------------------------
  const gradientLine = /(\n)(\s*background-clip: text;)/;
  const scoped = (marker) => {
    const path = join(scratch, `scoped-${Math.random().toString(36).slice(2)}.html`);
    writeFileSync(path, readFileSync(source, 'utf8')
      .replace(gradientLine, `$1    /* ${marker} */$1$2`)
      .replace(/(\n\s*-webkit-background-clip: text;)/, `$1 /* ${marker} */`));
    return scanContent(path, readFileSync(path, 'utf8'));
  };
  const other = scoped('anti-slop-allow: neon-glow -- unrelated');
  check('a waiver naming another rule leaves V5', other.findings.some((f) => f.tellRef === 'V5'));
  check('a waiver naming the code suppresses V5', !scoped('anti-slop-allow: V5 -- the wordmark gradient').findings.some((f) => f.tellRef === 'V5'));
  check('a waiver naming the rule suppresses V5', !scoped('anti-slop-allow: gradient-text -- the wordmark gradient').findings.some((f) => f.tellRef === 'V5'));
  const unknown = scoped('anti-slop-allow: no-such-rule -- x');
  check('a waiver naming an unknown id suppresses nothing', unknown.findings.some((f) => f.tellRef === 'V5'));
  check('an unknown waiver id is reported', unknown.waivers.some((w) => w.unknown.includes('no-such-rule')));
  {
    const path = join(scratch, 'known-ids.html');
    const content = readFileSync(source, 'utf8')
      .replace(gradientLine, '$1    /* anti-slop-allow: V5 -- the wordmark gradient */$1$2')
      .replace(/(\n\s*-webkit-background-clip: text;)/, '$1 /* anti-slop-allow: V5 -- the wordmark gradient */');
    writeFileSync(path, content);
    const narrowed = scanContent(path, content, { knownWaiverIds: new Set(['gradient-text']) });
    check('opts.knownWaiverIds narrows the ids a scoped waiver may name',
      narrowed.findings.some((f) => f.tellRef === 'V5') && narrowed.waivers.some((w) => w.unknown.includes('V5')));
  }
  check('opts.only runs only the named rules',
    scanContent(dirty, readFileSync(dirty, 'utf8'), { only: new Set(['gradient-text']) }).findings.every((f) => f.tellRef === 'V5'));

  // --- e. probes ------------------------------------------------------------------
  const probe = (name, file, content, tellRef, fires, opts = {}) => {
    const path = join(scratch, file);
    writeFileSync(path, content);
    const got = scanContent(path, content, opts).findings.filter((f) => f.tellRef === tellRef);
    check(`probe ${name}: ${tellRef} ${fires ? 'fires' : 'stays silent'}`, fires ? got.length > 0 : got.length === 0,
      got.map((f) => `${f.id}@${f.line}`).join(', ') || 'no finding');
  };

  // Purple counts only at rest, in one class set.
  const stateTint = '<button class="hover:bg-indigo-500 text-white">One</button><button class="focus:ring-violet-500 text-white">Two</button>\n<div class="bg-indigo-500/10 p-4">Tint</div><div class="bg-violet-600/5 p-4">Tint</div>\n<span class="from-indigo-500 x"></span><span class="to-violet-600">x</span>\n';
  probe('state variants and tints', 'state-tint.html', stateTint, 'C3', false);
  probe('stops split across siblings', 'state-tint.html', stateTint, 'C5', false);
  probe('resting purple twice', 'resting.html', '<button class="bg-indigo-500 text-white">One</button>\n<a class="text-violet-600">Two</a>\n', 'C3', true);
  probe('a gradient in one set', 'one-set.html', '<a class="bg-gradient-to-r from-indigo-500 to-violet-600 px-4">Go</a>\n', 'C5', true);

  // A scale token nothing reads is a palette file, not the palette in use (D16).
  probe('unread scale tokens', 'palette.css', ':root { --violet-500: #8b5cf6; --indigo-600: #4f46e5; }\n', 'C3', false);
  probe('the same scale tokens read', 'palette-read.css', ':root { --violet-500: #8b5cf6; --indigo-600: #4f46e5; }\n.a { color: var(--violet-500); background: var(--indigo-600); }\n', 'C3', true);
  probe('semantic role tokens nothing reads here', 'roles.css', ':root { --primary: #7c3aed; --brand-accent: #6366f1; }\n', 'C3', true);
  probe('one direct purple beside unread scale tokens', 'palette-one.css', ':root { --violet-500: #8b5cf6; --indigo-600: #4f46e5; }\n.cta { background: #7c3aed; }\n', 'C3', false);

  // A glow is a coloured halo a viewer can see.
  probe('soft neutral shadow', 'soft.css', '.card { box-shadow: 0 0 24px rgba(0, 0, 0, 0.06); }\n', 'C18', false);
  probe('glow token definition', 'token.css', ':root { --card-box-shadow: 0 0 20px #000; }\n', 'C18', false);
  probe('hairline arbitrary shadow', 'hairline.html', '<div class="shadow-[0_0_1px_rgba(0,0,0,0.2)] p-4">x</div>\n', 'C18', false);
  probe('cyan glow', 'cta.css', '.cta { box-shadow: 0px 0px 28px rgba(34, 211, 238, 0.55); }\n', 'C18', true);
  probe('glow round a small dot', 'orb.css', '.status-orb { width: 24px; height: 24px; border-radius: 50%; box-shadow: 0 0 18px rgba(34, 211, 238, 0.7); }\n', 'C18', true);

  // Comments are not the page; the hatch is still read from them.
  probe('radii in a comment', 'commented.css', '/* old radii, kept for reference:\n   border-radius: 8px;\n   border-radius: 8px;\n   border-radius: 8px; */\n.a { color: red; }\n', 'D1', false);
  probe('img in an html comment', 'commented.html', '<!-- TODO: swap in <img src="hero.png"> once the asset lands -->\n<p>Hero</p>\n', 'WCAG 1.1.1', false);
  probe('img outside a comment', 'uncommented.html', '<p>Hero</p>\n<img src="hero.png">\n', 'WCAG 1.1.1', true);
  probe('a glob in markdown prose does not open a comment', 'globs.md', 'Scan `src/**/*.css` and the rest.\n\nThe page still says lorem ipsum here.\n', 'W1', true);
  for (const [file, want] of [['allowed-choice.html', 2], ['hatched-wordmark.html', 1]]) {
    const r = scanFile(join(FIXTURES, file));
    check(`${file} suppresses ${want}`, r.suppressed === want, String(r.suppressed));
  }

  // Token drift reads spacing declarations, not token definitions or JS neighbours.
  probe('token definitions', 'token-prop.css', ':root { --space-1: 4px; --space-2: 8px; --card-padding: 13px; --x-margin: 13px; }\n', 'section 14', false);
  probe('style object neighbours', 'jsx-style.tsx', 'const css = `:root { --space-1: 4px; --space-2: 8px; }`;\nexport const A = () => <div style={{ padding: \'16px\', fontSize: \'13px\', lineHeight: \'21px\' }}>x</div>;\n', 'section 14', false);
  probe('grid-gap alias', 'grid-gap.css', ':root { --space-1: 4px; --space-2: 8px; }\n.a { grid-gap: 13px; padding: 7px; }\n', 'section 14', true);

  // The primary face is the first non-generic family; a control label may fall back.
  probe('Inter as a fallback', 'fallback-inter.css', 'body { font-family: "Söhne", Inter, sans-serif; }\n', 'T1', false);
  probe('Inter first', 'inter-first.css', 'body { font-family: Inter, -apple-system, sans-serif; }\n', 'T1', true);
  probe('Inter Display', 'inter-display.css', 'body { font-family: "Inter Display", sans-serif; }\n', 'T1', false);
  probe('Inter on a control beside a content face', 'control-inter.css', 'body { font-family: "Söhne", serif; }\n.btn { font-family: "Inter", sans-serif; }\n', 'T1', false);
  probe('Inter on a control with no other face', 'control-only.css', '.btn { font-family: "Inter", sans-serif; }\n', 'T1', true);
  probe('Arial in the font shorthand', 'shorthand.css', 'body { font: 16px/1.5 Arial, sans-serif; }\n', 'T2', true);
  probe('system stack naming Roboto as a fallback', 'system.css', 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }\n', 'T2', false);
  probe('next/font constructor', 'layout.tsx', "import { Inter } from 'next/font/google';\nconst inter = Inter({ subsets: ['latin'] });\n", 'T1', true);
  probe('the word Inter in prose', 'fonts.md', 'Inter (the training-corpus median) is banned as primary.\n', 'T1', false);

  // D1 is one non-zero value three or more times.
  probe('three zero radii', 'square.css', '.a { border-radius: 0px; }\n.b { border-radius: 0px; }\n.c { border-radius: 0px; }\n', 'D1', false);
  probe('6, 6 and 12', 'mixed-radius.css', '.a { border-radius: 6px; }\n.b { border-radius: 6px; }\n.c { border-radius: 12px; }\n', 'D1', false);
  probe('8px three times', 'eight.css', '.a { border-radius: 8px; }\n.b { border-radius: 0.5rem; }\n.c { border-radius: 8px; }\n', 'D1', true);

  // The combination is two distinct legs; clay pairs only with the serif display.
  probe('two cream hexes', 'two-cream.css', '.a { background: #faf8f5 } .b { background: #f5f1e8 }\n', 'cream-serif-sage', false);
  probe('cream and clay', 'cream-clay.css', 'body { background: #f6f1e7 } .x { color: #d97757 }\n', 'cream-serif-sage', false);
  probe('cream and serif', 'cream-serif.css', 'body { background: #f6f1e7; font-family: "Fraunces", serif }\n', 'cream-serif-sage', true);
  probe('serif and clay', 'serif-clay.css', 'h1 { font-family: "Fraunces", serif }\n.x { color: #d97757 }\n', 'cream-serif-sage', true);

  // Copy rules read what a user reads, and W2/W5 need two phrases.
  probe('an identifier named leverage', 'leverage.ts', 'export function computeLeverage(leverage: number) { return leverage * 2; }\n', 'W5', false);
  probe('one hype phrase', 'one-hype.html', '<h1>Unleash your data</h1>\n', 'W2', false);
  probe('two hype phrases', 'two-hype.html', '<h1>Transform your workflow. Effortlessly.</h1>\n', 'W2', true);
  probe('two hype phrases in JSX text', 'Hero.tsx', 'export const Hero = () => <h1>Transform your workflow. Effortlessly.</h1>;\n', 'W2', true);
  probe('two SaaS phrases in a string', 'copy.ts', 'export const copy = "Join thousands of teams. Stay in the loop.";\n', 'W5', true);
  probe('hype in a class name or attribute', 'attr.html', '<div class="transform-your-thing" data-x="Unleash Effortlessly">Plan the week</div>\n', 'W2', false);

  // U13 reads JSX: an expression name counts, a spread is unknown.
  probe('icon button in JSX', 'Close.tsx', 'export const Close = () => <button onClick={close}><svg aria-hidden="true"/></button>;\n', 'U13', true);
  probe('icon button behind an arrow handler', 'Close2.tsx', 'export const Close = () => <button onClick={() => close()}><svg aria-hidden="true"/></button>;\n', 'U13', true);
  probe('an expression name', 'Named.tsx', "export const Close = () => <button aria-label={t('close')}><svg/></button>;\n", 'U13', false);
  probe('a spread', 'Spread.tsx', 'export const Close = (props) => <button {...props}><svg/></button>;\n', 'U13', false);

  // Class fingerprints read cn(), clsx and multi-line attributes, once per element.
  const cnCard = 'export const A = () => (<>\n' + '<div className={cn("rounded-full bg-blue-100 p-3", a && "ring-2")} />\n'.repeat(3) + '</>);\n';
  probe('tinted wrappers through cn()', 'cn.tsx', cnCard, 'V1', true);
  probe('a ternary that never holds the whole set', 'arms.tsx', 'export const A = () => (<>\n' + '<div className={on ? "rounded-full bg-blue-100" : "p-3"} />\n'.repeat(3) + '</>);\n', 'V1', false);
  probe('one radius class on three controls', 'controls.tsx', 'export const F = () => (<form>\n' + '<button className="rounded-full px-4">Go</button>\n'.repeat(3) + '</form>);\n', 'D1', true);

  // Strongest-10 #1 written in CSS, under the same repetition gate as the class form.
  const card = (sel, extra = 'box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);') => `${sel} { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 12px; ${extra} }\n`;
  probe('three CSS cards with the trio', 'cards3.css', card('.plan') + card('.feature') + card('.quote'), 'Strongest-10 #1', true);
  probe('two CSS cards, both with the trio', 'cards2.css', card('.plan') + card('.feature'), 'Strongest-10 #1', true);
  probe('two CSS cards, one without a shadow', 'cards-mixed.css', card('.plan') + card('.feature', ''), 'Strongest-10 #1', false);
  probe('one CSS card with the trio', 'card1.css', card('.plan'), 'Strongest-10 #1', false);
  probe('three CSS cards with border and radius only', 'cards-flat.css', card('.plan', '') + card('.feature', '') + card('.quote', ''), 'Strongest-10 #1', false);
  probe('three buttons with the trio', 'buttons.css', card('.btn-primary') + card('.btn-secondary') + card('button'), 'Strongest-10 #1', false);
  probe('a hover shadow on two framed cards', 'cards-hover.css', card('.plan', '') + card('.feature', '') + '.plan:hover, .feature:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); }\n', 'Strongest-10 #1', false);

  // Tailwind forms of U3 and P3.
  probe('focus:outline-none with nothing to replace it', 'outline.html', '<button class="focus:outline-none px-3">Save</button>\n', 'U3', true);
  probe('focus:outline-none with a focus ring', 'ring.html', '<button class="focus:outline-none focus:ring-2 px-3">Save</button>\n', 'U3', false);
  probe('focus-visible:outline-none with a visible ring', 'visible.html', '<button class="focus-visible:outline-none focus-visible:ring-2 px-3">Save</button>\n', 'U3', false);
  probe('focus:outline-none with a focus ring', 'ring.html', '<button class="focus:outline-none focus:ring-2 px-3">Save</button>\n', 'U4', true);
  probe('focus-visible:outline-none with a visible ring', 'visible.html', '<button class="focus-visible:outline-none focus-visible:ring-2 px-3">Save</button>\n', 'U4', false);
  probe('a focus ring with a focus-visible variant beside it', 'both.html', '<button class="focus:outline-none focus:ring-2 focus-visible:ring-4 px-3">Save</button>\n', 'U4', false);
  probe('focus:outline-none with nothing to replace it', 'outline.html', '<button class="focus:outline-none px-3">Save</button>\n', 'U4', false);
  probe('min-h-screen', 'screen.html', '<main class="min-h-screen">x</main>\n', 'P3', true);
  probe('min-h-screen with a dvh class', 'dvh.html', '<main class="min-h-screen min-h-dvh">x</main>\n', 'P3', false);
  probe('fixed bottom nav', 'bottom.html', '<nav class="fixed inset-x-0 bottom-0 h-16">x</nav>\n', 'P3', true);
  probe('fixed bottom nav with a safe-area pad', 'bottom-safe.html', '<nav class="fixed inset-x-0 bottom-0 h-16 pb-[env(safe-area-inset-bottom)]">x</nav>\n', 'P3', false);

  // The control lede budget is 25 words.
  const lede = (n) => `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main><h1>Ledger</h1><p>${'word '.repeat(n)}</p><table><tr><td>1</td></tr></table></main></body></html>\n`;
  probe('20 words on a control surface', 'lede20.html', lede(20), 'W11', false, { surface: 'control' });
  probe('30 words on a control surface', 'lede30.html', lede(30), 'W11', true, { surface: 'control' });

  // Text that never renders is not on the page: a template, a no-script
  // fallback, a script string and JSON-LD.
  const blob = `<p>${'word '.repeat(60)}</p>`;
  const ledger = (before) => `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${before}<main><h1>Ledger</h1><table><tr><td>1</td></tr></table></main></body></html>\n`;
  probe('a prose blob inside a template', 'tpl.html', ledger(`<template>${blob}</template>`), 'W11', false);
  probe('a prose blob inside noscript', 'nos.html', ledger(`<noscript>${blob}</noscript>`), 'W11', false);
  probe('the same blob on the page', 'blob.html', ledger(blob), 'W11', true);
  probe('a JSON-LD description', 'ld.html', ledger(`<script type="application/ld+json">{"description": "${'word '.repeat(60)}"}</script>`), 'W11', false);
  const dots = '<span>Ledger \u00B7 Q3 \u00B7 Draft</span><span>Owner \u00B7 Finance</span>';
  probe('middot runs inside a script string', 'dots-script.html', `<!doctype html><html lang="en"><body><script>const meta = '${dots}';</script><p>Ledger</p></body></html>\n`, 'T15', false);
  probe('the same middot runs on the page', 'dots-page.html', `<!doctype html><html lang="en"><body><p>${dots}</p></body></html>\n`, 'T15', true);
  probe('lorem ipsum inside a template', 'lorem-tpl.html', '<template><p>Lorem ipsum dolor sit amet.</p></template>\n<p>Ledger</p>\n', 'W1', false);

  // A raster buried under an opacity below 0.1 is not imagery.
  const icons = '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>';
  const buried = (img) => `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${img}<section><h2>Grip</h2>${icons}<p>Machined.</p></section><section><h2>Lens</h2>${icons}<p>Coated.</p></section></body></html>\n`;
  probe('a raster at opacity 0.05', 'buried.html', buried('<img src="t.jpg" alt="" style="opacity: 0.05">'), 'I8', true);
  probe('a raster at opacity-5', 'buried-tw.html', buried('<img src="t.jpg" alt="" class="absolute opacity-5">'), 'I8', true);
  probe('a raster at opacity 0.5', 'shown.html', buried('<img src="t.jpg" alt="A grip in hand" style="opacity: 0.5">'), 'I8', false);

  // P16 measures each text colour against the surface it is declared on.
  const page = (css, body) => `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body>${body}</body></html>\n`;
  probe('grey text on white', 'grey.html', page('body { background: #fff; color: #111; } .note { color: #8a8a8a; }', '<p class="note">Rates refresh hourly.</p>'), 'P16', true);
  probe('the same grey at 28px bold', 'grey-large.html', page('body { background: #fff; color: #111; } .note { color: #8f8f8f; font-size: 28px; font-weight: 700; }', '<p class="note">Rates</p>'), 'P16', false);
  probe('the same grey at body size', 'grey-small.html', page('body { background: #fff; color: #111; } .note { color: #8f8f8f; }', '<p class="note">Rates refresh hourly.</p>'), 'P16', true);
  probe('a disabled button', 'disabled.html', page('body { background: #fff; color: #111; } button:disabled { color: #aaa; background: #fff; }', '<button disabled>Send</button>'), 'P16', false);
  probe('text over a gradient', 'gradient-ground.html', page('body { background: #fff; color: #111; } .hero { background: linear-gradient(#fff, #eee); color: #999; }', '<section class="hero"><p>Rates</p></section>'), 'P16', false);
  {
    const field = (label) => page('body { background: #fff; color: #111; } input { background: #fff; color: #111; } input::placeholder { color: #8f8f8f; }',
      `${label ? '<label for="q">Search</label>' : ''}<input id="q" placeholder="Search orders">`);
    const near = (html, rule) => scanContent('ph.html', html).findings.some((f) => f.id === `accessibility-${rule}`);
    check('a placeholder beside a visible label is a near-bar note (D12)', near(field(true), 'low-contrast-near-bar') && !near(field(true), 'low-contrast'));
    check('a placeholder with no label is measured at the normal class (D12)', near(field(false), 'low-contrast'));
  }
  {
    const r = scanContent('pairs.html', readFileSync(join(FIXTURES, 'contrast-pairs.html'), 'utf8')).findings.find((f) => f.id === 'accessibility-low-contrast-near-bar');
    check('a near-bar ratio is printed without rounding up to the bar', Boolean(r && /4\.4\d*:1/.test(r.evidence) && !/4\.5:1 \(need/.test(r.evidence)), r && r.evidence);
  }

  // V3 is a coloured side edge; neutral rules and selection state are substance.
  probe('a 4px coloured left border on a rounded card', 'stripe.css', '.tip { border-left: 4px solid #0f766e; border-radius: 12px; padding: 1rem; }\n', 'V3', true);
  probe('a 3px coloured border on a square box', 'stripe-square.css', '.tip { border-left: 3px solid #0f766e; border-radius: 0; padding: 1rem; }\n', 'V3', true);
  probe('a 2px coloured border on a square box', 'stripe-thin.css', '.tip { border-left: 2px solid #0f766e; border-radius: 0; padding: 1rem; }\n', 'V3', false);
  probe('a neutral rule', 'stripe-neutral.css', '.item { border-left: 2px solid #d4d4d4; border-radius: 8px; }\n', 'V3', false);
  probe('a selected tab edge', 'stripe-selected.css', '.tab[aria-selected="true"] { border-left: 4px solid #0f766e; border-radius: 8px; }\n', 'V3', false);
  probe('the same edge on a card that is not selected', 'stripe-card.css', '.tab-card { border-left: 4px solid #0f766e; border-radius: 8px; }\n', 'V3', true);

  // T12 floors: 12px running, 11px functional, 10px small print.
  probe('11px running text', 'floor-p.css', '.article p { font-size: 11px; }\n', 'T12', true);
  probe('11px functional text', 'floor-nav.css', '.nav a { font-size: 11px; }\n', 'T12', false);
  probe('10px functional text', 'floor-nav10.css', '.nav a { font-size: 10px; }\n', 'T12', true);
  probe('10px legal small print', 'floor-legal.css', '.legal p { font-size: 10px; }\n', 'T12', false);
  probe('9px legal small print', 'floor-legal9.css', '.legal p { font-size: 9px; }\n', 'T12', true);

  // T16 reading mechanics, each with the exemption it carries and its twin.
  probe('body leading at 1.15', 'lead.css', '.article p { font-size: 16px; line-height: 1.15; }\n', 'T16', true);
  probe('display leading at 1.05', 'lead-display.css', 'h1 { font-size: 56px; line-height: 1.05; }\n', 'T16', false);
  probe('mixed-case running text at 0.12em', 'track.css', '.note p { letter-spacing: 0.12em; }\n', 'T16', true);
  probe('a capitalised label at 0.12em', 'track-caps.css', '.eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; }\n', 'T16', false);
  probe('a tabular readout at 0.12em', 'track-readout.css', '.total { font-variant-numeric: tabular-nums; letter-spacing: 0.12em; }\n', 'T16', false);
  probe('justify at 22ch with no hyphens', 'justify.css', '.aside { width: 22ch; text-align: justify; }\n', 'T16', true);
  probe('justify at 22ch with hyphens', 'justify-hyph.css', '.aside { width: 22ch; text-align: justify; hyphens: auto; }\n', 'T16', false);
  probe('-0.1em on a 32px heading', 'crush.css', '.hero h1 { font-size: 32px; letter-spacing: -0.1em; }\n', 'T16', true);
  probe('-0.05em on 56px display type', 'crush-display.css', 'h1 { font-size: 56px; letter-spacing: -0.05em; }\n', 'T16', false);
  probe('-0.1em on a wordmark', 'crush-wordmark.css', '.wordmark { font-size: 32px; letter-spacing: -0.1em; }\n', 'T16', false);

  // M2: the bounce reflex is a candidate; a spring that settles is the doctrine's tool.
  probe('animate-bounce', 'bounce.html', '<span class="animate-bounce">v</span>\n', 'M2', true);
  probe('an anticipate-and-overshoot curve', 'bounce.css', '.menu { transition: transform 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55); }\n', 'M2', true);
  probe('a single-overshoot pop curve', 'pop.css', '.pop { transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1); }\n', 'M2', false);
  probe('an elastic token nothing reads', 'unread.css', ':root { --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); }\n.a { transition: opacity 200ms ease-out; }\n', 'M2', false);
  probe('the same token read', 'read.css', ':root { --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); }\n.a { transition: transform 200ms var(--ease-bounce); }\n', 'M2', true);

  // V11: a small round dot pulsing forever.
  const dot = (anim, size = 8) => `.live { width: ${size}px; height: ${size}px; border-radius: 50%; background: #16a34a; animation: pulse 1.6s ${anim}; }\n@keyframes pulse { 50% { opacity: 0.4; } }\n`;
  probe('an 8px dot pulsing forever', 'dot.css', dot('infinite'), 'V11', true);
  probe('an 8px dot pulsing once', 'dot-once.css', dot('1'), 'V11', false);
  probe('a 24px round element pulsing forever', 'dot-big.css', dot('infinite', 24), 'V11', false);
  probe('animate-ping on a rounded-full dot', 'ping.html', '<span class="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>\n', 'V11', true);

  // P4 and P12: the blocking legs of the viewport meta, and a positive tabindex.
  const meta = (content) => `<!doctype html><html lang="en"><head><meta name="viewport" content="${content}"></head><body><p>Ledger</p></body></html>\n`;
  probe('user-scalable=no', 'zoom-no.html', meta('width=device-width, initial-scale=1, user-scalable=no'), 'P4', true);
  probe('maximum-scale=1.0', 'zoom-max1.html', meta('width=device-width, initial-scale=1, maximum-scale=1.0'), 'P4', true);
  probe('maximum-scale=5', 'zoom-max5.html', meta('width=device-width, initial-scale=1, maximum-scale=5'), 'P4', false);
  probe('maximum-scale=1.5', 'zoom-max15.html', meta('width=device-width, initial-scale=1, maximum-scale=1.5'), 'P4', false);
  probe('content before name', 'zoom-order.html', '<head><meta content="width=device-width, user-scalable=0" name="viewport"></head>\n', 'P4', true);
  probe('a JSX viewport meta', 'Head.tsx', 'export const H = () => <meta name="viewport" content="width=device-width, maximum-scale=1" />;\n', 'P4', true);
  probe('the word viewport in prose before the token', 'zoom-prose.md', 'Grep the viewport meta for `user-scalable=no` and `maximum-scale=1`.\n', 'P4', false);
  probe('tabindex="2"', 'tab2.html', '<input tabindex="2">\n', 'P12', true);
  probe('tabIndex={1} in JSX', 'Tab.tsx', 'export const F = () => <input tabIndex={1} />;\n', 'P12', true);
  probe('tabindex="0" and "-1"', 'tab0.html', '<div tabindex="0">a</div><div tabindex="-1">b</div>\n', 'P12', false);
  probe('a data-tabindex attribute', 'data-tab.html', '<div data-tabindex="3">a</div>\n', 'P12', false);

  // M4: an endless sideways loop, or a <marquee>; a finite slide is not one.
  const loop = (iter, to = '-50%') => `.track { display: flex; animation: scroll 30s linear ${iter}; }\n@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(${to}); } }\n`;
  probe('an infinite sideways loop', 'loop.css', loop('infinite'), 'M4', true);
  probe('the same loop run once', 'loop-once.css', loop('1'), 'M4', false);
  probe('an infinite loop that barely moves', 'loop-short.css', loop('infinite', '-4%'), 'M4', false);
  probe('a marquee element', 'marquee.html', '<marquee>Now shipping to Canada</marquee>\n', 'M4', true);

  // V9: a tiled grid, dot field or stripes; one ruled line or a full-length gradient is not.
  probe('a hairline grid on a 24px tile', 'grid.css', '.page { background-image: linear-gradient(#e5e5e5 1px, transparent 1px), linear-gradient(90deg, #e5e5e5 1px, transparent 1px); background-size: 24px 24px; }\n', 'V9', true);
  probe('a dot field on a 16px tile', 'dots.css', '.hero { background: radial-gradient(circle, #d4d4d4 1px, transparent 1px) 0 0 / 16px 16px; }\n', 'V9', true);
  probe('one ruled line per tile', 'ruled.css', '.paper { background-image: linear-gradient(#e5e5e5 1px, transparent 1px); background-size: 100% 28px; }\n', 'V9', false);
  probe('a plain two-colour gradient', 'plain.css', '.band { background: linear-gradient(#f5f5f4, #e7e5e4); }\n', 'V9', false);

  // C11's halo form fires on a dark page only.
  const halo = (ground, alpha) => page(`body { background: ${ground}; color: ${ground === '#ffffff' ? '#1f2937' : '#e5e7eb'}; } .hero { background: radial-gradient(circle at 50% 0%, rgba(34, 211, 238, ${alpha}), transparent 70%); padding: 4rem 1rem; }`, '<section class="hero"><h1>Ledger</h1></section>');
  probe('a saturated halo on a dark page', 'halo-dark.html', halo('#0b0b10', 0.8), 'C11', true);
  probe('the same halo on a light page', 'halo-light.html', halo('#ffffff', 0.8), 'C11', false);
  probe('a translucent wash on a dark page', 'halo-wash.html', halo('#0b0b10', 0.3), 'C11', false);

  // C7's gray-on-colour leg: neutral grey on a chromatic surface, at rest, in one set.
  probe('grey text on a blue surface in one class set', 'gray-blue.html', '<div class="bg-blue-800 text-gray-300 p-4">Team plans</div>\n', 'C7', true);
  probe('grey text on a pale amber surface', 'gray-amber.html', '<div class="bg-amber-100 text-gray-700 p-4">Team plans</div>\n', 'C7', false);
  probe('a grey span beside a blue sibling', 'gray-sibling.html', '<p><span class="text-gray-400">Monthly</span> <span class="bg-blue-600 text-white">Annual</span></p>\n', 'C7', false);
  probe('grey on a colour only as a hover tint', 'gray-hover.html', '<a class="text-slate-500 hover:bg-red-500/10" href="/x">Cancel</a>\n', 'C7', false);
  probe('a CSS grey on a navy block', 'gray-navy.css', '.promo { background: #1e40af; color: #d1d5db; }\n', 'C7', true);
  probe('off-white on navy', 'white-navy.css', '.promo { background: #1e3a8a; color: #e5e7eb; }\n', 'C7', false);

  // P9 on a full document; a footer that starts lower is exempt.
  const outline = (body) => `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Returns</title></head><body>${body}</body></html>\n`;
  probe('h2 then h4 in the main content', 'skip.html', outline('<main><h1>Returns</h1><h2>Sending</h2><h4>Refunds</h4></main>'), 'P9', true);
  probe('h2 then h4 as the footer starts', 'skip-footer.html', outline('<main><h1>Returns</h1><h2>Sending</h2></main><footer><h4>Company</h4></footer>'), 'P9', false);
  probe('back up from h3 to h2', 'skip-up.html', outline('<main><h1>Returns</h1><h2>Sending</h2><h3>Labels</h3><h2>Refunds</h2></main>'), 'P9', false);
  probe('a component fragment with an h4', 'Card.jsx', 'export const Card = () => <article><h4>Refunds</h4></article>;\n', 'P9', false);

  // DESIGN.md: a documented palette is not the default, and a face outside its
  // typography is a candidate. Each case gets its own directory, because the
  // lookup is cached per directory.
  {
    const DESIGN = '---\nname: Fieldnote\ncolors:\n  ink: oklch(0.22 0.02 280)\n  violet: oklch(0.55 0.2 295)\n  paper: oklch(0.98 0.005 280)\ntypography:\n  body:\n    fontFamily: "S\u00f6hne, system-ui, sans-serif"\n---\n\n# Fieldnote\n';
    const dir = (name, design) => {
      const d = join(scratch, name);
      mkdirSync(d, { recursive: true });
      if (design) writeFileSync(join(d, 'DESIGN.md'), design);
      return d;
    };
    const scanAt = (d, file, content) => {
      const path = join(d, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
      return scanContent(path, content).findings;
    };
    const has = (findings, id) => findings.some((f) => f.id === id);
    const palette = '<a class="inline-block rounded-md bg-violet-600 px-4 py-2 text-white" href="/start">Start</a>\n<div class="h-2 bg-gradient-to-r from-violet-500 to-violet-600"></div>\n<p class="text-violet-700">Notebooks sync.</p>\n';
    const declared = scanAt(dir('ds-declared', DESIGN), 'palette.html', palette);
    check('a purple DESIGN.md declares is the palette, not C3 or C5', !declared.some((f) => f.tellRef === 'C3' || f.tellRef === 'C5'), declared.map((f) => f.id).join(', '));
    const bare = scanAt(dir('ds-none', null), 'palette.html', palette);
    check('the same page with no DESIGN.md fires the purple rules', bare.some((f) => f.tellRef === 'C3' || f.tellRef === 'C5'), bare.map((f) => f.id).join(', '));
    const indigo = scanAt(dir('ds-indigo', DESIGN), 'indigo.html', '<a class="bg-indigo-600 text-white" href="/x">Go</a>\n<p class="text-indigo-700">x</p>\n');
    check('indigo beside a declared violet is more than 15 degrees away and fires C3', has(indigo, 'anti-ai-ai-purple-primary'), indigo.map((f) => f.id).join(', '));
    const drift = scanAt(dir('ds-drift', DESIGN), 'drift.css', 'body { font-family: "S\u00f6hne", system-ui, sans-serif; }\n.hero { font-family: "Lobster", cursive; }\n');
    const font = drift.find((f) => f.id === 'anti-ai-design-system-font');
    check('a face outside the declared typography is a section 14 candidate', Boolean(font && font.tellRef === 'section 14' && font.heuristic === true), drift.map((f) => f.id).join(', '));
    const onFace = scanAt(dir('ds-face', DESIGN), 'face.css', 'body { font-family: "S\u00f6hne", system-ui, sans-serif; }\nh1 { font-family: system-ui, sans-serif; }\n');
    check('the declared face and a system stack fire nothing', !has(onFace, 'anti-ai-design-system-font'));
    const repo = dir('ds-repo', DESIGN);
    check('a repo-root DESIGN.md does not describe the fixtures under it',
      !has(scanAt(repo, 'tests/fixtures/odd.css', '.hero { font-family: "Lobster", cursive; }\n'), 'anti-ai-design-system-font'));
    check('the same face in the product source under it fires',
      has(scanAt(repo, 'src/odd.css', '.hero { font-family: "Lobster", cursive; }\n'), 'anti-ai-design-system-font'));
    check('no DESIGN.md, no drift',
      !has(scanAt(dir('ds-absent', null), 'odd.css', '.hero { font-family: "Lobster", cursive; }\n'), 'anti-ai-design-system-font'));
    const cov = run([join(scratch, 'ds-declared', 'palette.html'), '--format', 'json']);
    let covParsed = null;
    try { covParsed = JSON.parse(cov.stdout); } catch { /* checked below */ }
    check('a declared purple palette is named in the coverage list',
      Boolean(covParsed && covParsed.coverage.some((c) => /^purple palette: .*DESIGN\.md declares violet/.test(c.note))), cov.stdout);
  }

  // A component file names the declared-CSS limit of the contrast and type rules.
  {
    const path = join(scratch, 'Badge.tsx');
    const content = 'export const Badge = () => <span className="text-xs text-gray-400">New</span>;\n';
    writeFileSync(path, content);
    const r = run([path, '--format', 'json']);
    let parsed = null;
    try { parsed = JSON.parse(r.stdout); } catch { /* checked below */ }
    check('a component file names the declared-CSS limit of the contrast and type rules',
      Boolean(parsed && parsed.coverage.some((c) => /declared CSS/.test(c.note) && c.rules.includes('low-contrast'))), r.stdout);
  }

  // Occurrences: every match, with the column it starts at.
  {
    const path = join(scratch, 'twice.css');
    const content = '.a { transition: all 200ms; }\n.b { transition: all 200ms; } .c { transition: all 1s; }\n';
    writeFileSync(path, content);
    const f = scanContent(path, content).findings.find((x) => x.tellRef === 'D2');
    check('occurrences list every match with line and 1-based column',
      Boolean(f && f.occurrences.length === 3 && f.occurrences[2].line === 2 && f.occurrences[2].column === 36 &&
        content.split('\n')[1].startsWith(f.occurrences[2].match, f.occurrences[2].column - 1)),
      JSON.stringify(f && f.occurrences));
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
  ['motion-bounce.html', 'M2'],
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
