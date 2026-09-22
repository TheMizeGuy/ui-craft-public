#!/usr/bin/env node
/**
 * check_references.mjs -- link integrity for the plugin's own citations.
 *
 * ui-craft is a content plugin: every agent, skill and reference file routes the
 * reader to another file by path, and often to a numbered section inside it
 * ("`references/aesthetic/06-substance-floor.md` section 1"). Nothing compiles,
 * so a renamed file or a renumbered heading breaks silently and the reader finds
 * out at review time. This walks every citation and resolves it.
 *
 * What counts as a citation:
 *
 *   1. `${CLAUDE_PLUGIN_ROOT}/<path>`            -- the runtime form agents use
 *   2. `references/<domain>/<NN>-<slug>.md`      -- the long form
 *   3. `<domain>/<NN>` and `<domain>/<NN>-<slug>` -- the short form the prose
 *      uses inline (`aesthetic/06`, `design/12`, `review/05`), plus the range
 *      form (`usability/01-03`), which resolves every file in the range
 *   4. `scripts/<file>` and `tests/<path>`       -- the tooling citations
 *
 * A citation carrying `§ N`, `§ N.N`, `§ Nb`, `section N` or `section Nb`
 * immediately after it also has its target checked for a heading that begins
 * with that number, so a renumbered section is caught as well as a renamed file.
 *
 * It reads files only. It never edits, and it never guesses a correction: a
 * broken citation is reported with its source file and line for a human to fix.
 *
 * Usage:
 *   node scripts/check_references.mjs [repo-root] [--format text|json]
 *
 * Exit 0 when every citation resolves, 1 when any does not, 2 on a usage error.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// --- arguments ------------------------------------------------------------------

const argv = process.argv.slice(2);
let root = resolve(HERE, '..');
let format = 'text';
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--format') {
    const value = argv[i + 1];
    i += 1;
    if (value !== 'text' && value !== 'json') {
      process.stderr.write('--format must be text or json\n');
      process.exit(2);
    }
    format = value;
  } else if (a === '-h' || a === '--help') {
    process.stderr.write('Usage: node scripts/check_references.mjs [repo-root] [--format text|json]\n');
    process.exit(2);
  } else if (a.startsWith('--')) {
    process.stderr.write(`unknown flag: ${a}\n`);
    process.exit(2);
  } else {
    root = resolve(a);
  }
}
if (!existsSync(join(root, 'references'))) {
  process.stderr.write(`not a ui-craft checkout (no references/ under ${root})\n`);
  process.exit(2);
}

// --- what to walk ----------------------------------------------------------------

const REFERENCE_ROOT = join(root, 'references');
const DOMAINS = readdirSync(REFERENCE_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

function walk(dir, match, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, match, out);
    else if (match(entry.name, full)) out.push(full);
  }
  return out;
}

const sources = [
  ...walk(join(root, 'agents'), (n) => n.endsWith('.md')),
  ...walk(join(root, 'skills'), (n) => n.endsWith('.md')),
  ...walk(REFERENCE_ROOT, (n) => n.endsWith('.md')),
  ...['README.md', 'ARCHITECTURE.md', 'USAGE.md', 'CLAUDE.md', join('ci', 'README.md')]
    .map((p) => join(root, p))
    .filter((p) => existsSync(p)),
  ...walk(join(root, 'tests'), (n) => n === 'README.md'),
].filter((p, i, all) => all.indexOf(p) === i);

// --- citation extraction -----------------------------------------------------------

const PLUGIN_ROOT_CITATION = /\$\{CLAUDE_PLUGIN_ROOT\}\/([A-Za-z0-9_./-]*)/g;
const DOMAIN_CITATION = new RegExp(
  String.raw`(?:references/)?(${DOMAINS.join('|')})/(\d{2})(?:-(\d{2}))?(?:-([a-z0-9][a-z0-9-]*))?(\.md)?`,
  'g',
);
// The lookbehind keeps this repo-relative. a home-relative tooling path (`~/tools/<x>.sh`) and
// `anti-slop/anti-slop/scripts/test/` are fleet and sibling-repo paths that a
// ui-craft checkout cannot resolve and must not be asked to.
const TOOLING_CITATION =
  /(?<![\w/.~-])(?:scripts\/[A-Za-z0-9_.-]+|tests\/[A-Za-z0-9_./-]+[A-Za-z0-9_])/g;

// A section marker sits immediately after the citation, separated at most by a
// closing backtick, bracket or comma. Anything longer is a new sentence, and
// attaching it to the previous citation invents a reference nobody wrote.
const SECTION_TAIL =
  /^[\s`)\],;:"'*]{0,6}((?:(?:\u00A7\s*|[Ss]ections?\s+)\d+[a-z]?(?:\.\d+)?(?:\s*(?:,|and)\s*)?)+)/;
const SECTION_ID = /(?:\u00A7\s*|[Ss]ections?\s+)(\d+[a-z]?(?:\.\d+)?)/g;

function sectionsAfter(line, endIndex) {
  const tail = line.slice(endIndex, endIndex + 80);
  const m = tail.match(SECTION_TAIL);
  if (!m) return [];
  const ids = [];
  const re = new RegExp(SECTION_ID.source, 'g');
  let s;
  while ((s = re.exec(m[1])) !== null) ids.push(s[1]);
  return ids;
}

/** Blank a span, keeping the line's length so later offsets stay valid. */
function blank(line, start, end) {
  return line.slice(0, start) + ' '.repeat(end - start) + line.slice(end);
}

function citationsInLine(line) {
  const found = [];
  let working = line;

  // 1. ${CLAUDE_PLUGIN_ROOT}/<path>, first, so the domain extractor never
  //    re-reports the reference path inside one.
  for (const m of [...working.matchAll(PLUGIN_ROOT_CITATION)]) {
    const end = m.index + m[0].length;
    found.push({ kind: 'plugin-root', text: m[0], target: m[1], sections: sectionsAfter(line, end) });
    working = blank(working, m.index, end);
  }

  // 2 + 3. references/<domain>/<file>.md, and the inline short and range forms.
  for (const m of [...working.matchAll(DOMAIN_CITATION)]) {
    const end = m.index + m[0].length;
    found.push({
      kind: 'reference',
      text: m[0],
      domain: m[1],
      number: m[2],
      rangeEnd: m[3] || null,
      slug: m[4] || null,
      explicit: Boolean(m[5]),
      sections: sectionsAfter(line, end),
    });
    working = blank(working, m.index, end);
  }

  // 4. scripts/<file> and tests/<path>.
  for (const m of [...working.matchAll(TOOLING_CITATION)]) {
    const end = m.index + m[0].length;
    found.push({ kind: 'tooling', text: m[0], target: m[0], sections: sectionsAfter(line, end) });
    working = blank(working, m.index, end);
  }

  return found;
}

// --- resolution --------------------------------------------------------------------

const domainIndex = new Map();
for (const domain of DOMAINS) {
  const files = readdirSync(join(REFERENCE_ROOT, domain)).filter((n) => n.endsWith('.md'));
  const byNumber = new Map();
  for (const name of files) {
    const n = name.match(/^(\d{2})-/);
    if (n) byNumber.set(n[1], join(REFERENCE_ROOT, domain, name));
  }
  domainIndex.set(domain, byNumber);
}

const headingCache = new Map();

function headingsOf(file) {
  if (headingCache.has(file)) return headingCache.get(file);
  let list = [];
  try {
    list = [...readFileSync(file, 'utf8').matchAll(/^#{2,6}\s+(.+)$/gm)].map((m) =>
      m[1].replace(/[*_`]/g, '').replace(/^[Ss]ections?\s+/, '').trim());
  } catch {
    list = [];
  }
  headingCache.set(file, list);
  return list;
}

function hasSection(file, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // `## 3.` / `## 3 ` / `### 3.1 ` / `## 4b.` -- the number, then a boundary.
  // The alternation order is what keeps it exact: a trailing dot counts only
  // when a digit does NOT follow it, so `section 1` never resolves to `## 1.5`,
  // and the final class excludes letters and dots so it never resolves to
  // `## 1b.` or `## 18.` either.
  const re = new RegExp(`^${escaped}(?=$|\\.(?!\\d)|[^0-9a-zA-Z.])`);
  return headingsOf(file).some((h) => re.test(h));
}

/** Resolve a citation to { files: [...], missing: [...] }. */
function resolveCitation(citation) {
  if (citation.kind === 'plugin-root' || citation.kind === 'tooling') {
    const target = citation.target.replace(/\/+$/, '');
    if (!target) return { files: [], missing: [] };
    const full = join(root, target);
    if (!existsSync(full)) return { files: [], missing: [citation.text] };
    return { files: statSync(full).isDirectory() ? [] : [full], missing: [] };
  }

  const byNumber = domainIndex.get(citation.domain);
  if (!byNumber) return { files: [], missing: [citation.text] };

  const wanted = [];
  if (citation.rangeEnd) {
    const from = Number(citation.number);
    const to = Number(citation.rangeEnd);
    // A descending or empty range is a typo, not a range.
    if (!(to >= from)) return { files: [], missing: [citation.text] };
    for (let n = from; n <= to; n++) wanted.push(String(n).padStart(2, '0'));
  } else {
    wanted.push(citation.number);
  }

  const files = [];
  const missing = [];
  for (const n of wanted) {
    const file = byNumber.get(n);
    if (!file) { missing.push(`${citation.domain}/${n}`); continue; }
    // The slug, when spelled out, must be the real one: a renamed file that
    // keeps its number is exactly the drift this check exists to find.
    if (citation.slug && !citation.rangeEnd) {
      const expected = `${n}-${citation.slug}.md`;
      if (!file.endsWith(expected)) { missing.push(citation.text); continue; }
    }
    files.push(file);
  }
  return { files, missing };
}

// --- the walk ------------------------------------------------------------------------

const unresolvedFiles = [];
const unresolvedSections = [];
let citationCount = 0;
let sectionCheckCount = 0;

for (const source of sources) {
  const rel = relative(root, source);
  const lines = readFileSync(source, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const citation of citationsInLine(line)) {
      citationCount += 1;
      const { files, missing } = resolveCitation(citation);
      for (const m of missing) {
        unresolvedFiles.push({ source: rel, line: i + 1, citation: citation.text, target: m });
      }
      if (!citation.sections.length) continue;
      for (const file of files) {
        for (const id of citation.sections) {
          sectionCheckCount += 1;
          if (hasSection(file, id)) continue;
          unresolvedSections.push({
            source: rel,
            line: i + 1,
            citation: citation.text,
            target: relative(root, file),
            section: id,
          });
        }
      }
    }
  });
}

// --- output ---------------------------------------------------------------------------

const summary = {
  root,
  sourcesScanned: sources.length,
  citations: citationCount,
  sectionChecks: sectionCheckCount,
  unresolvedFiles: unresolvedFiles.length,
  unresolvedSections: unresolvedSections.length,
};

if (format === 'json') {
  process.stdout.write(JSON.stringify({ summary, unresolvedFiles, unresolvedSections }, null, 2) + '\n');
} else {
  process.stdout.write(
    `references: ${summary.sourcesScanned} source file(s), ${summary.citations} citation(s), ` +
    `${summary.sectionChecks} section check(s)\n`,
  );
  for (const f of unresolvedFiles) {
    const where = f.target === f.citation ? f.citation : `${f.citation} -> ${f.target}`;
    process.stdout.write(`UNRESOLVED FILE     ${f.source}:${f.line}  ${where}\n`);
  }
  for (const s of unresolvedSections) {
    process.stdout.write(
      `UNRESOLVED SECTION  ${s.source}:${s.line}  ${s.citation} section ${s.section} -> ${s.target}\n`,
    );
  }
  process.stdout.write(
    `${summary.unresolvedFiles} unresolved file(s), ${summary.unresolvedSections} unresolved section(s)\n`,
  );
}

process.exit(unresolvedFiles.length || unresolvedSections.length ? 1 : 0);
