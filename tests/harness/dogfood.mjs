#!/usr/bin/env node
/**
 * dogfood.mjs -- run the plugin's own tools over the plugin's own shipped
 * markdown, and fail when a per-file count moves.
 *
 * WHY THE EXPECTED COUNTS ARE NOT ZERO. This repo's job is to describe AI tells,
 * so its reference files quote them verbatim: `references/catalogue/01-ai-tells.md`
 * names the banned hexes, the shadcn class run, the Tailwind hero triplet and the
 * generic microcopy, and `references/aesthetic/01-point-of-view.md` writes
 * doctrine lines about removing devices. A scanner that reported zero on those
 * files would be broken. The gate is therefore a PIN, not a floor: the numbers
 * below are what the tools report today, and any movement -- up or down -- is a
 * failure that names the file, because it means either the prose changed or a
 * rule changed, and both want a human to look.
 *
 * WHAT MOVEMENT MEANS, in order of likelihood:
 *
 *   - a reference file gained or lost a quoted example    -> update the count
 *   - a rule in `scripts/scan_tells.mjs` widened or narrowed -> check the corpus
 *     selftest first (`tests/harness/scan-tells.selftest.mjs`), then update
 *   - a rule started firing on the plugin's own PROSE rather than on a quoted
 *     example -> that is a precision defect in the rule, and the rule is what
 *     gets fixed, never this table
 *
 * Usage: node tests/harness/dogfood.mjs [--list]
 *   --list  print the current counts in table form and exit 0, for updating the
 *           table after a deliberate content change.
 *
 * Exit 0 when every count matches, 1 on any drift, 2 on a usage error.
 */

import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanFile } from '../../scripts/scan_tells.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

// The shipped markdown: what a user of the plugin actually reads. `CHANGELOG.md`
// is release history and `CLAUDE.md` is not shipped, so neither is dogfooded.
const SHIPPED_DIRS = ['agents', 'skills', 'references'];
const SHIPPED_FILES = ['README.md', 'ARCHITECTURE.md', 'USAGE.md'];

// --- the committed table -------------------------------------------------------
// Per shipped file, the number of findings each tool reports. A file absent from
// a table reports zero. Captured 2026-09-22 against the 0.6.0 tree.

const EXPECTED_SCAN = {
  'agents/ui-anti-slop-auditor.md': 4,               // S1, W1, C3, S12
  'agents/ui-craft-architect.md': 3,                 // W1, C3, W9
  'agents/ui-visual-reviewer.md': 2,                 // W1, W5
  'references/accessibility/04-screen-reader.md': 1, // WCAG 1.1.1
  'references/aesthetic/03-taste-checklist.md': 5,   // W1, W2, W5, W9, W10
  'references/architecture/03-styling-architecture.md': 1, // L13
  'references/catalogue/01-ai-tells.md': 19,         // the catalogue quotes its own tells
  'references/design/02-typography.md': 3,           // T1, cream-serif-sage, W5
  'references/design/05-tailwind-v4.md': 1,          // WCAG 1.1.1
  'references/design/06-shadcn-customization.md': 1, // cream-serif-sage
  'references/design/08-ux-writing.md': 3,           // W1, W2, W5
  'references/design/11-image-to-code-replication.md': 2, // W1, S12
  'references/performance/01-core-web-vitals.md': 3, // WCAG 1.1.1, T1, W5
  'references/performance/04-bundle-loading.md': 2,  // WCAG 1.1.1, T1
  'references/review/01-universal-rubric.md': 1,     // W1
  'references/review/07-surgical-visual-upgrade.md': 3, // C3, W5
  'references/typescript/04-branded-primitives.md': 1,  // WCAG 1.1.1
  'skills/design-ui/SKILL.md': 0,                    // W1, W9
};

const EXPECTED_DOCTRINE = {
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

function collectScan() {
  const counts = {};
  const detail = {};
  for (const file of shipped) {
    const rel = posix(relative(REPO, file));
    const { findings } = scanFile(file);
    if (!findings.length) continue;
    counts[rel] = findings.length;
    detail[rel] = findings.map((f) => `${f.tellRef}@${f.line}`);
  }
  return { counts, detail };
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
    process.stderr.write('audit_doctrine.mjs truncated its findings; raise --max before pinning\n');
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

// --- comparison ---------------------------------------------------------------------

function compare(label, expected, actual, detail) {
  const files = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  const rows = [];
  for (const file of files) {
    const want = expected[file] || 0;
    const got = actual[file] || 0;
    if (want !== got) rows.push({ label, file, want, got, detail: (detail[file] || []).join(', ') });
  }
  return rows;
}

function printTable(title, counts, detail) {
  process.stdout.write(`${title}\n`);
  const files = Object.keys(counts).sort();
  if (!files.length) {
    process.stdout.write('  (none)\n');
    return;
  }
  const width = Math.max(...files.map((f) => f.length));
  for (const file of files) {
    process.stdout.write(
      `  ${file.padEnd(width)}  ${String(counts[file]).padStart(3)}   ${(detail[file] || []).join(', ')}\n`,
    );
  }
  process.stdout.write(
    `  total ${Object.values(counts).reduce((a, b) => a + b, 0)} over ${files.length} file(s)\n`,
  );
}

// --- main --------------------------------------------------------------------------

const argv = process.argv.slice(2);
const listOnly = argv.includes('--list');
for (const a of argv) {
  if (a !== '--list') {
    process.stderr.write(`Usage: node tests/harness/dogfood.mjs [--list]\n`);
    process.exit(2);
  }
}

const scan = collectScan();
const doctrine = collectDoctrine();

if (listOnly) {
  printTable('scan_tells.mjs', scan.counts, scan.detail);
  printTable('audit_doctrine.mjs', doctrine.counts, doctrine.detail);
  process.exit(0);
}

const drift = [
  ...compare('scan_tells', EXPECTED_SCAN, scan.counts, scan.detail),
  ...compare('audit_doctrine', EXPECTED_DOCTRINE, doctrine.counts, doctrine.detail),
];

if (drift.length) {
  process.stdout.write('DOGFOOD DRIFT -- a per-file count moved:\n');
  for (const row of drift) {
    process.stdout.write(
      `  ${row.label}  ${row.file}: expected ${row.want}, got ${row.got}` +
      (row.detail ? `  [${row.detail}]` : '') + '\n',
    );
  }
  process.stdout.write('\ncurrent state:\n');
  printTable('scan_tells.mjs', scan.counts, scan.detail);
  printTable('audit_doctrine.mjs', doctrine.counts, doctrine.detail);
  process.stdout.write(
    `\n${drift.length} file(s) moved. Fix the rule if it started firing on prose; ` +
    'otherwise update the table in this file (node tests/harness/dogfood.mjs --list).\n',
  );
  process.exit(1);
}

const scanTotal = Object.values(scan.counts).reduce((a, b) => a + b, 0);
const doctrineTotal = Object.values(doctrine.counts).reduce((a, b) => a + b, 0);
process.stdout.write(
  `dogfood: ${shipped.length} shipped markdown file(s); ` +
  `scan_tells ${scanTotal} finding(s) over ${Object.keys(scan.counts).length} file(s), ` +
  `audit_doctrine ${doctrineTotal} finding(s) over ${Object.keys(doctrine.counts).length} file(s); ` +
  'all counts match the committed table\n',
);
process.exit(0);
