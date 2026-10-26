#!/usr/bin/env node
/**
 * dogfood.mjs -- run the plugin's own tools over the plugin's own shipped
 * markdown, and fail when a rule fires on prose.
 *
 * WHAT IS CHECKED. This repo's job is to describe AI tells, so its references
 * quote them: the catalogue names the banned hexes, the shadcn class run and the
 * generic microcopy. A scanner that reported nothing on those files would be
 * broken, so the scan_tells half is a precision rule, not a count. Every
 * occurrence a finding reports must sit in example context:
 *
 *   - inside a fenced block (``` or ~~~), or
 *   - on a line carrying the escape hatch (`anti-slop-allow`, `unslop-ignore`), or
 *   - inside a backtick span or a double-quoted string (straight or curly, two
 *     or more characters inside) on its line.
 *
 * A finding's `occurrences` array ({ line, column, match }) is checked when the
 * scanner provides it; the match must start inside the span. Without it, the
 * finding's own line is checked and the span may sit anywhere on that line. A
 * table row is not excused for being a table row: a doctrine table that names a
 * tell puts the name in backticks or quotes.
 *
 * An occurrence outside example context is a precision defect in the rule (it
 * fired on the plugin's own prose), and the rule is what gets fixed. The only
 * exceptions are KNOWN_PROSE_DEFECTS, each a named rule defect waiting on its
 * fix; an entry that no longer occurs also fails, so the list only shrinks.
 *
 * The audit_doctrine half keeps a ceiling per file: a count above its ceiling,
 * or a file that is not in the table, fails; a count below prints a note to
 * lower the ceiling.
 *
 * WHY NOT PINS. Until 0.7.0 every per-file count was pinned, up and down. The
 * pins failed on every doctrine edit that added or removed a quoted example,
 * while the failure the gate exists for (a rule firing on prose) needed no pin.
 *
 * Usage: node tests/harness/dogfood.mjs [--list]
 *   --list  print every finding's occurrences with their context, and the
 *           doctrine counts against their ceilings, then exit 0.
 *
 * Exit 0 clean, 1 on a precision defect or a ceiling exceeded, 2 on a usage error.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanFile, ESCAPE_HATCH } from '../../scripts/scan_tells.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

// The shipped markdown: what a user of the plugin actually reads. `CHANGELOG.md`
// is release history and `CLAUDE.md` is not shipped, so neither is dogfooded.
const SHIPPED_DIRS = ['agents', 'skills', 'references'];
const SHIPPED_FILES = ['README.md', 'ARCHITECTURE.md', 'USAGE.md'];

// Rule defects that fire on prose today, by file and tellRef.
const KNOWN_PROSE_DEFECTS = {};

// audit_doctrine findings per shipped file. Lower a ceiling when its file sheds
// findings; raise one only with a reason in the commit that does it.
const DOCTRINE_CEILINGS = {
  'references/aesthetic/01-point-of-view.md': 8,
  'references/aesthetic/02-distinctive-systems.md': 2,
  'references/aesthetic/06-substance-floor.md': 2,
  'references/architecture/03-styling-architecture.md': 1,
  'references/design/06-shadcn-customization.md': 1,
  'references/design/07-depth-and-overlays.md': 2,
  'skills/design-ui/SKILL.md': 2,
  'skills/review-ui/SKILL.md': 1,
};

// --- collection ------------------------------------------------------------------

function walkMarkdown(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function posix(p) {
  return p.split(sep).join('/');
}

const shipped = [
  ...SHIPPED_DIRS.flatMap((d) => walkMarkdown(join(REPO, d))),
  ...SHIPPED_FILES.map((f) => join(REPO, f)).filter((f) => existsSync(f)),
].sort();

function isShipped(relPath) {
  return SHIPPED_DIRS.some((d) => relPath.startsWith(`${d}/`)) || SHIPPED_FILES.includes(relPath);
}

// --- example context ----------------------------------------------------------------

const SPAN_RES = [/`[^`]+`/g, /"[^"]{2,}"/g, /“[^”]{2,}”/g];

function spansOf(line) {
  const spans = [];
  for (const re of SPAN_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}

function fenceMap(lines) {
  const inFence = new Array(lines.length).fill(false);
  let open = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { inFence[i] = true; open = !open; continue; }
    inFence[i] = open;
  }
  return inFence;
}

// The index the match starts at, from a 1-based column (a 0-based one is
// tolerated), or by searching the line; null when the match cannot be placed.
function matchStart(line, occ) {
  if (typeof occ.match !== 'string' || !occ.match) return null;
  if (Number.isInteger(occ.column)) {
    for (const at of [occ.column - 1, occ.column]) {
      if (at >= 0 && line.startsWith(occ.match, at)) return at;
    }
  }
  const at = line.indexOf(occ.match);
  return at >= 0 ? at : null;
}

function context(lines, inFence, occ) {
  const i = occ.line - 1;
  const line = lines[i] ?? '';
  if (inFence[i]) return 'fence';
  if (ESCAPE_HATCH.test(line)) return 'hatch';
  const spans = spansOf(line);
  const start = matchStart(line, occ);
  if (start === null) return spans.length ? 'span on line' : null;
  return spans.some(([a, b]) => start >= a && start < b) ? 'span' : null;
}

function collectScan() {
  const rows = [];
  for (const file of shipped) {
    const rel = posix(relative(REPO, file));
    const { findings } = scanFile(file);
    if (!findings.length) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    const inFence = fenceMap(lines);
    for (const f of findings) {
      const occurrences = Array.isArray(f.occurrences) && f.occurrences.length ? f.occurrences : [{ line: f.line }];
      for (const occ of occurrences) {
        rows.push({ file: rel, tellRef: f.tellRef, id: f.id, line: occ.line, match: occ.match ?? null, ctx: context(lines, inFence, occ), text: (lines[occ.line - 1] ?? '').trim() });
      }
    }
  }
  return rows;
}

function collectDoctrine() {
  const script = join(REPO, 'scripts', 'audit_doctrine.mjs');
  const run = spawnSync(process.execPath, [script, REPO, '--format', 'json'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (run.status !== 0) {
    process.stderr.write(`audit_doctrine.mjs exited ${run.status}\n${run.stderr}\n`);
    process.exit(2);
  }
  let parsed;
  try {
    parsed = JSON.parse(run.stdout);
  } catch (err) {
    process.stderr.write(`audit_doctrine.mjs did not emit JSON: ${err}\n`);
    process.exit(2);
  }
  if (parsed.summary.truncated) {
    process.stderr.write('audit_doctrine.mjs truncated its findings; raise --max before checking\n');
    process.exit(2);
  }
  const counts = {};
  const detail = {};
  for (const f of parsed.findings) {
    const rel = posix(f.file);
    if (!isShipped(rel)) continue;
    counts[rel] = (counts[rel] || 0) + 1;
    (detail[rel] = detail[rel] || []).push(`${f.kind}@${f.line}`);
  }
  return { counts, detail };
}

// --- main --------------------------------------------------------------------------

const argv = process.argv.slice(2);
const listOnly = argv.includes('--list');
for (const a of argv) {
  if (a !== '--list') {
    process.stderr.write('Usage: node tests/harness/dogfood.mjs [--list]\n');
    process.exit(2);
  }
}

const occurrences = collectScan();
const doctrine = collectDoctrine();

const prose = occurrences.filter((o) => o.ctx === null);
const known = prose.filter((o) => (KNOWN_PROSE_DEFECTS[o.file] || []).includes(o.tellRef));
const defects = prose.filter((o) => !known.includes(o));
const fixedKnown = Object.entries(KNOWN_PROSE_DEFECTS).flatMap(([file, tells]) =>
  tells.filter((t) => !known.some((o) => o.file === file && o.tellRef === t)).map((t) => `${file} ${t}`));

const ceilingRows = [...new Set([...Object.keys(DOCTRINE_CEILINGS), ...Object.keys(doctrine.counts)])].sort().map((file) => ({
  file,
  got: doctrine.counts[file] || 0,
  ceiling: Object.hasOwn(DOCTRINE_CEILINGS, file) ? DOCTRINE_CEILINGS[file] : null,
  detail: (doctrine.detail[file] || []).join(', '),
}));
const over = ceilingRows.filter((r) => (r.ceiling === null ? r.got > 0 : r.got > r.ceiling));
const under = ceilingRows.filter((r) => r.ceiling !== null && r.got < r.ceiling);

const findingCount = new Set(occurrences.map((o) => `${o.file}|${o.id}`)).size;
const fileCount = new Set(occurrences.map((o) => o.file)).size;
const doctrineTotal = Object.values(doctrine.counts).reduce((a, b) => a + b, 0);

if (listOnly) {
  process.stdout.write('scan_tells occurrences (context: fence, hatch, span, span on line, or PROSE)\n');
  for (const o of occurrences) {
    process.stdout.write(`  ${(o.ctx || 'PROSE').padEnd(12)} ${o.file}:${o.line} ${o.tellRef}${o.match ? ` "${o.match}"` : ''}\n`);
  }
  process.stdout.write('audit_doctrine findings against their ceilings\n');
  for (const r of ceilingRows) {
    process.stdout.write(`  ${String(r.got).padStart(3)}/${r.ceiling === null ? '-' : r.ceiling}  ${r.file}  ${r.detail}\n`);
  }
}

const problems = [];
for (const o of defects) problems.push(`  prose  ${o.file}:${o.line} ${o.tellRef} (${o.id})${o.match ? ` "${o.match}"` : ''}: ${o.text.slice(0, 120)}`);
for (const k of fixedKnown) problems.push(`  fixed  ${k}: the known defect no longer occurs; remove its KNOWN_PROSE_DEFECTS entry`);
for (const r of over) problems.push(`  doctrine  ${r.file}: ${r.got} finding(s), ceiling ${r.ceiling === null ? 'none (file not in the table)' : r.ceiling}  [${r.detail}]`);

const summary =
  `dogfood: ${shipped.length} shipped markdown file(s); scan_tells ${findingCount} finding(s), ` +
  `${occurrences.length} occurrence(s) over ${fileCount} file(s), ${occurrences.length - prose.length} in example context, ` +
  `${known.length} known prose defect(s); audit_doctrine ${doctrineTotal} finding(s) within ceilings`;

if (problems.length && !listOnly) {
  process.stdout.write('DOGFOOD FAILED\n');
  process.stdout.write(`${problems.join('\n')}\n\n`);
  process.stdout.write(
    'A rule that fires on prose is a rule precision defect: narrow the rule, or, where the line names the tell ' +
    'as an example, put the name in backticks or double quotes.\n',
  );
  process.exit(1);
}
for (const r of under) {
  process.stdout.write(`note: ${r.file} has ${r.got} doctrine finding(s), under its ceiling of ${r.ceiling}; lower the ceiling\n`);
}
if (problems.length) {
  process.stdout.write(`${problems.join('\n')}\n`);
  process.exit(0);
}
process.stdout.write(`${summary}\n`);
process.exit(0);
