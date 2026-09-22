#!/usr/bin/env node
// label-contract.mjs -- check that every severity in tests/corpus/labels.json
// agrees with the class references/catalogue/01-ai-tells.md section 18 gives
// that label's tellRef.
//
// Usage:
//   node label-contract.mjs [--labels <path>] [--catalogue <path>] [--format text|json]
//
// The catalogue is the source of truth. A label that disagrees is a wrong
// label, never a wrong table: the corpus records what the catalogue says a tell
// is worth, and a corpus that quietly re-rates a tell makes the harness measure
// its own opinion instead of the plugin's. Severity is informational to
// score-review.mjs (it never enters a match), which is exactly why nothing else
// catches a drifted label, and why this check exists.
//
// Exit codes: 0 = every label agrees, 1 = at least one disagrees,
// 2 = usage error or a malformed input. Zero dependencies.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CLASSES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
// A tell section 18 does not list defaults to MEDIUM. That rule is the
// auditor's (agents/ui-anti-slop-auditor.md section 14, "A tell that section 18
// does not list defaults to MEDIUM"), and the corpus follows it so a label and
// a finding on the same unlisted tell land in the same class.
const UNLISTED_DEFAULT = 'MEDIUM';

// Catalogue codes are one or two letters plus one or two digits: C15, T5, L13,
// S12, U3, V13, D1, I8, W12, M3, P15, A10, AM7. `AM` is listed first so the
// alternation does not consume it as a bare `A`.
const CODE_RE = /\b(AM\d{1,2}|[CTLSWMUVDIPA]\d{1,2})\b/g;
// An explicit carve-out inside a parenthetical, e.g. "(T5 MEDIUM, skeleton
// defaults MEDIUM, C13 LOW)" in the HIGH row, which hands those codes back to
// their own class rather than claiming them for HIGH.
const CARVE_OUT_RE = /\b(AM\d{1,2}|[CTLSWMUVDIPA]\d{1,2})\s+(CRITICAL|HIGH|MEDIUM|LOW)\b/g;

// Rows of section 18 that name a tell in prose rather than by code. Each maps
// the phrase to the tellRef convention labels.json uses (catalogue section
// numbers and the emerging tell's slug).
const PHRASE_ALIASES = [
  { phrase: 'cream+serif+sage combination', codes: ['cream-serif-sage'] },
  { phrase: 'missing empty/error states', codes: ['section 12'] },
  { phrase: 'hardcoded-values-vs-tokens drift', codes: ['section 14'] },
  { phrase: 'demo-ware non-functional controls', codes: ['section 15'] },
  {
    phrase: 'strongest-10 rows 1-10',
    codes: Array.from({ length: 10 }, (_, i) => `Strongest-10 #${i + 1}`)
  }
];

function die(msg, code) {
  process.stderr.write(`label-contract: ${msg}\n`);
  process.exit(code);
}

function usage(code) {
  process.stderr.write(
    'Usage: node label-contract.mjs [--labels <path>] [--catalogue <path>] [--format text|json]\n'
  );
  process.exit(code);
}

function parseArgs(argv) {
  const opts = { labels: null, catalogue: null, format: 'text' };
  const takeValue = (flag, i) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) die(`${flag} requires a value`, 2);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage(0);
    else if (a === '--labels') { opts.labels = takeValue(a, i); i++; }
    else if (a === '--catalogue') { opts.catalogue = takeValue(a, i); i++; }
    else if (a === '--format') { opts.format = takeValue(a, i); i++; }
    else die(`unknown option: ${a}`, 2);
  }
  if (opts.format !== 'text' && opts.format !== 'json') {
    die(`--format must be text or json, got: ${opts.format}`, 2);
  }
  return opts;
}

function read(path, kind) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    die(`cannot read ${kind} file '${path}': ${e.code || e.message}`, 2);
  }
}

// ---- section 18 -----------------------------------------------------------
// Returns Map<code, Set<class>>. A code can legitimately land in two classes:
// section 18 rates U3 CRITICAL as `outline: none` with no `:focus-visible`
// replacement and MEDIUM as an untouched browser-default ring, and it names
// S12 and L10 in the HIGH row's stats-row scoping clause while rating S12 LOW
// in its own row. Both readings are real, so the contract accepts either and
// prints the code as ambiguous rather than resolving it silently in labels.json.
function parseSeverityTable(markdown, cataloguePath) {
  const start = markdown.indexOf('## 18. Severity Classification');
  if (start === -1) die(`'${cataloguePath}' has no '## 18. Severity Classification' heading`, 2);
  const rest = markdown.slice(start + 1);
  const end = rest.indexOf('\n## ');
  const section = end === -1 ? rest : rest.slice(0, end);

  const map = new Map();
  const add = (code, cls) => {
    if (!map.has(code)) map.set(code, new Set());
    map.get(code).add(cls);
  };

  let rows = 0;
  for (const line of section.split('\n')) {
    const m = /^\|\s*\*\*(CRITICAL|HIGH|MEDIUM|LOW)\b[^|]*\|(.*)\|\s*$/.exec(line);
    if (!m) continue;
    rows++;
    const cls = m[1];
    let tells = m[2];

    // Carve-outs first: a parenthetical that hands a code to another class wins
    // over the row it sits in, then the whole parenthetical is removed so the
    // generic scan below cannot claim those codes for this row.
    for (const c of tells.matchAll(CARVE_OUT_RE)) add(c[1], c[2]);
    tells = tells.replace(/\([^)]*\)/g, ' ');

    for (const c of tells.matchAll(CODE_RE)) add(c[1], cls);

    const lower = tells.toLowerCase();
    for (const alias of PHRASE_ALIASES) {
      if (lower.includes(alias.phrase)) for (const code of alias.codes) add(code, cls);
    }
  }
  if (rows !== CLASSES.length) {
    die(
      `'${cataloguePath}' section 18 parsed ${rows} severity rows, expected ${CLASSES.length} `
      + `(${CLASSES.join(', ')}); the table shape changed and this parser must move with it`,
      2
    );
  }
  return map;
}

// ---- main -----------------------------------------------------------------
function main() {
  const opts = parseArgs(process.argv.slice(2));
  const labelsPath = opts.labels
    ? opts.labels
    : fileURLToPath(new URL('../corpus/labels.json', import.meta.url));
  const cataloguePath = opts.catalogue
    ? opts.catalogue
    : fileURLToPath(new URL('../../references/catalogue/01-ai-tells.md', import.meta.url));

  const table = parseSeverityTable(read(cataloguePath, 'catalogue'), cataloguePath);

  let labelsDoc;
  try {
    labelsDoc = JSON.parse(read(labelsPath, 'labels'));
  } catch (e) {
    die(`labels file '${labelsPath}' is not valid JSON: ${e.message}`, 2);
  }
  if (!labelsDoc || !Array.isArray(labelsDoc.fixtures)) {
    die(`labels file '${labelsPath}' must have a "fixtures" array`, 2);
  }

  const mismatches = [];
  const unlisted = new Set();
  const ambiguousUsed = new Set();
  let checked = 0;

  for (const fx of labelsDoc.fixtures) {
    const file = typeof fx.file === 'string' ? fx.file : '(no file)';
    const expected = Array.isArray(fx.expected) ? fx.expected : [];
    for (const label of expected) {
      const tellRef = typeof label.tellRef === 'string' ? label.tellRef : '';
      const severity = typeof label.severity === 'string' ? label.severity : '';
      if (!tellRef) {
        mismatches.push({
          file, id: label.id || '(no id)', tellRef: '(none)',
          labelSeverity: severity, catalogueSeverity: '(a label must cite a tellRef)'
        });
        continue;
      }
      checked++;
      const classes = table.get(tellRef);
      if (!classes) {
        unlisted.add(tellRef);
        if (severity !== UNLISTED_DEFAULT) {
          mismatches.push({
            file, id: label.id || '(no id)', tellRef,
            labelSeverity: severity,
            catalogueSeverity: `${UNLISTED_DEFAULT} (not listed in section 18; defaults to MEDIUM)`
          });
        }
        continue;
      }
      if (classes.size > 1) ambiguousUsed.add(tellRef);
      if (!classes.has(severity)) {
        mismatches.push({
          file, id: label.id || '(no id)', tellRef,
          labelSeverity: severity,
          catalogueSeverity: [...classes].join(' or ')
        });
      }
    }
  }

  const result = {
    catalogue: cataloguePath,
    labels: labelsPath,
    codesInSection18: table.size,
    labelsChecked: checked,
    mismatches,
    unlistedTellRefs: [...unlisted].sort(),
    ambiguousTellRefsUsed: [...ambiguousUsed].sort(),
    pass: mismatches.length === 0
  };

  if (opts.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(`label-contract: ${checked} labels checked against section 18 `
      + `(${table.size} codes parsed)\n`);
    if (result.unlistedTellRefs.length) {
      process.stdout.write(`  not listed in section 18, defaulted to ${UNLISTED_DEFAULT}: `
        + `${result.unlistedTellRefs.join(', ')}\n`);
    }
    if (result.ambiguousTellRefsUsed.length) {
      for (const code of result.ambiguousTellRefsUsed) {
        process.stdout.write(`  ambiguous in section 18, any of its classes accepted: `
          + `${code} -> ${[...table.get(code)].join(' or ')}\n`);
      }
    }
    for (const m of mismatches) {
      process.stdout.write(`  MISMATCH ${m.file} ${m.id} [${m.tellRef}]: `
        + `label says ${m.labelSeverity || '(none)'}, section 18 says ${m.catalogueSeverity}\n`);
    }
    process.stdout.write(mismatches.length === 0
      ? 'PASS: every label agrees with the catalogue\n'
      : `FAIL: ${mismatches.length} label(s) disagree with the catalogue; fix the LABEL, not the table\n`);
  }

  process.exit(mismatches.length === 0 ? 0 : 1);
}

main();
