#!/usr/bin/env node
// blind-copy.mjs -- a neutral copy of the corpus fixtures for a blind auditor run.
//
// Several fixtures explain themselves in comments ("Positive control for ...",
// "the ONLY planted tell is ..."), and the scorer matches a finding to a label
// when the tell code appears anywhere in its text. An auditor dispatched over
// tests/corpus/fixtures/ therefore reads part of the answer key. This writes
// every fixture to a directory outside the repository with every comment
// removed, so the run measures judgment rather than reading:
//
//   node tests/harness/blind-copy.mjs <out-dir>
//   node tests/harness/blind-copy.mjs --selftest
//
// What is removed: HTML comments, CSS block comments, and JS/TS line and block
// comments (a JSX `{/* */}` container goes with its comment), each read in its
// own language inside <style> and <script>. Strings, template literals and
// regex literals are left alone, so `https://` in a string survives. A comment
// that carries `anti-slop-allow` or `unslop-ignore`, and any line carrying one,
// is kept verbatim: it is a stated decision the auditor is meant to honour.
// A line left blank by a removal is dropped. File names are kept, because the
// scorer buckets findings by fixture basename; it never reads `line`.
//
// <out-dir> must resolve outside the repository and be missing or empty.
// Exit 0 ok, 1 selftest failure, 2 usage error.
// Zero dependencies (node >= 18 stdlib).

import { readdirSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, realpathSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative, extname, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const REPO = resolve(HERE, '..', '..');
const FIXTURES = join(REPO, 'tests', 'corpus', 'fixtures');
const MARKER = /anti-slop-allow|unslop-ignore/i;

const HTML_EXT = new Set(['.html', '.htm', '.vue', '.svelte', '.astro']);
const CSS_EXT = new Set(['.css', '.scss', '.less']);
const JS_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts']);

class UsageError extends Error {}

function newlinesOf(s) {
  return s.replace(/[^\n]/g, '');
}

// A `/` starts a regex literal, not division, after one of these (or at the start).
const REGEX_PREV = /[(,=:[!&|?{};+\-*%<>~^]$|^$|\breturn$|\btypeof$/;

/**
 * Strip comments from one stretch of source in one language. `stats` collects
 * { removed, kept }. Returns the text with each removed comment replaced by its
 * newlines, so line positions stay aligned with the original.
 */
function stripLang(src, lang, stats) {
  let out = '';
  let i = 0;
  const keepOrDrop = (comment) => {
    if (MARKER.test(comment)) { stats.kept += 1; return comment; }
    stats.removed += 1;
    return newlinesOf(comment);
  };
  while (i < src.length) {
    const c = src[i];
    const two = src.slice(i, i + 2);
    if (lang !== 'css' && lang !== 'js' && src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4);
      const stop = end < 0 ? src.length : end + 3;
      out += keepOrDrop(src.slice(i, stop));
      i = stop;
      continue;
    }
    if (lang === 'html') {
      const open = /^<(style|script)\b[^>]*>/i.exec(src.slice(i, i + 400));
      if (open) {
        const tag = open[1].toLowerCase();
        const bodyStart = i + open[0].length;
        const close = src.toLowerCase().indexOf(`</${tag}`, bodyStart);
        const bodyEnd = close < 0 ? src.length : close;
        out += open[0] + stripLang(src.slice(bodyStart, bodyEnd), tag === 'style' ? 'css' : 'js', stats);
        i = bodyEnd;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    // css and js share strings and block comments
    if (c === '"' || c === "'" || (lang === 'js' && c === '`')) {
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') j += 1;
        else if (c !== '`' && src[j] === '\n') break;
        j += 1;
      }
      out += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (two === '/*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      const comment = src.slice(i, stop);
      if (lang === 'js' && !MARKER.test(comment) && /\{\s*$/.test(out) && /^\s*\}/.test(src.slice(stop))) {
        const brace = out.lastIndexOf('{');
        const between = out.slice(brace + 1);
        const after = /^\s*\}/.exec(src.slice(stop))[0];
        out = out.slice(0, brace) + newlinesOf(between) + newlinesOf(comment) + newlinesOf(after);
        stats.removed += 1;
        i = stop + after.length;
        continue;
      }
      out += keepOrDrop(comment);
      i = stop;
      continue;
    }
    if (lang === 'js' && two === '//') {
      const end = src.indexOf('\n', i);
      const stop = end < 0 ? src.length : end;
      out += keepOrDrop(src.slice(i, stop));
      i = stop;
      continue;
    }
    if (lang === 'js' && c === '/' && REGEX_PREV.test(out.replace(/\s+$/, ''))) {
      let j = i + 1;
      let inClass = false;
      while (j < src.length && src[j] !== '\n') {
        if (src[j] === '\\') j += 1;
        else if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        else if (src[j] === '/' && !inClass) break;
        j += 1;
      }
      out += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/** Strip a whole file's comments. Returns { text, removed, kept }. */
export function stripComments(text, ext) {
  const e = ext.toLowerCase();
  const lang = HTML_EXT.has(e) ? 'html' : CSS_EXT.has(e) ? 'css' : JS_EXT.has(e) ? 'js' : null;
  if (!lang) return { text, removed: 0, kept: 0 };
  const stats = { removed: 0, kept: 0 };
  const stripped = stripLang(text, lang, stats);
  const before = text.split('\n');
  const after = stripped.split('\n');
  const lines = [];
  for (let n = 0; n < after.length; n++) {
    const orig = before[n] ?? '';
    if (MARKER.test(orig)) { lines.push(orig); continue; }
    if (after[n] === orig) { lines.push(orig); continue; }
    if (!after[n].trim() && orig.trim()) continue;
    lines.push(after[n].replace(/\s+$/, ''));
  }
  return { text: lines.join('\n'), ...stats };
}

function insideRepo(target) {
  let probe = resolve(target);
  while (!existsSync(probe)) probe = dirname(probe);
  const real = realpathSync(probe);
  const repo = realpathSync(REPO);
  const rel = relative(repo, real);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function blindCopy(outDir, fixturesDir = FIXTURES) {
  if (insideRepo(outDir)) throw new UsageError(`${outDir} is inside the repository; write the blind copy outside it`);
  if (existsSync(outDir)) {
    if (!statSync(outDir).isDirectory()) throw new UsageError(`${outDir} exists and is not a directory`);
    if (readdirSync(outDir).length) throw new UsageError(`${outDir} is not empty; use a fresh directory`);
  }
  mkdirSync(outDir, { recursive: true });
  const totals = { files: 0, removed: 0, kept: 0 };
  for (const name of fixtureFiles(fixturesDir)) {
    const from = join(fixturesDir, name);
    // A subdirectory keeps its relative path: the scanner reads a DESIGN.md
    // from the directory above a file, so the pair must stay together.
    mkdirSync(dirname(join(outDir, name)), { recursive: true });
    const { text, removed, kept } = stripComments(readFileSync(from, 'utf8'), extname(name));
    writeFileSync(join(outDir, name), text);
    totals.files += 1;
    totals.removed += removed;
    totals.kept += kept;
  }
  return totals;
}

// Every fixture file under a directory, as sorted paths relative to it, with
// subdirectories walked and dot-files skipped.
export function fixtureFiles(dir, prefix = '') {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) out.push(...fixtureFiles(full, rel));
    else if (statSync(full).isFile()) out.push(rel);
  }
  return out;
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
      console.log(`  FAIL  ${name.padEnd(52)} ${problem}`);
    } else {
      pass += 1;
      console.log(`  ok    ${name}`);
    }
  };
  const eq = (got, want) => (got === want ? null : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

  check('html comments removed, a marker comment kept', () => eq(
    stripComments('<p>a</p>\n<!-- Positive control\n  for x -->\n<h1><!-- anti-slop-allow: lockup -->Name</h1>\n<p>b<!-- note --></p>', '.html').text,
    '<p>a</p>\n<h1><!-- anti-slop-allow: lockup -->Name</h1>\n<p>b</p>'));
  check('css comments removed, strings and marker lines kept', () => eq(
    stripComments('/* Clean control */\na { content: "/* not a comment */"; }\nb { c: d; } /* trailing */\ne { f: g; } /* anti-slop-allow: brand */', '.css').text,
    'a { content: "/* not a comment */"; }\nb { c: d; }\ne { f: g; } /* anti-slop-allow: brand */'));
  check('js comments removed, strings, templates and regexes kept', () => eq(
    stripComments("// planted here\nconst u = 'https://x.dev'; // why\nconst t = `a // b`;\nconst r = /https?:\\/\\//;\n/* block */ const z = 1;", '.ts').text,
    "const u = 'https://x.dev';\nconst t = `a // b`;\nconst r = /https?:\\/\\//;\n const z = 1;"));
  check('style and script blocks read in their own language', () => eq(
    stripComments('<style>\n/* the ONLY planted tell */\nh1 { color: red; }\n</style>\n<script>\n// note\nlet a = "//x";\n</script>', '.html').text,
    '<style>\nh1 { color: red; }\n</style>\n<script>\nlet a = "//x";\n</script>'));
  check('a JSX comment container goes with its comment', () => eq(
    stripComments('<div>\n  {/* Positive control */}\n  <span>x</span>\n</div>', '.tsx').text,
    '<div>\n  <span>x</span>\n</div>'));
  check('refuses an out-dir inside the repository', () => {
    const r = spawnSync(process.execPath, [SELF, join(REPO, 'tests', 'blind-out-should-not-exist')], { encoding: 'utf8' });
    return r.status === 2 && !existsSync(join(REPO, 'tests', 'blind-out-should-not-exist')) ? null : `exit ${r.status}`;
  });
  check('refuses a non-empty out-dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ui-craft-blind-'));
    try {
      writeFileSync(join(dir, 'stale.html'), 'x');
      const r = spawnSync(process.execPath, [SELF, dir], { encoding: 'utf8' });
      return r.status === 2 ? null : `exit ${r.status}`;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  check('the corpus copy keeps every name and no answer comment', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'ui-craft-blind-')), 'out');
    try {
      const totals = blindCopy(dir);
      const names = fixtureFiles(FIXTURES);
      const copied = fixtureFiles(dir);
      if (copied.join() !== names.join()) return 'file names differ from the fixtures';
      if (!names.some((n) => n.includes('/'))) return 'no fixture subdirectory was walked';
      const leaks = copied.filter((n) => /positive control|clean control|planted/i.test(readFileSync(join(dir, n), 'utf8')));
      if (leaks.length) return `answer text left in ${leaks.join(', ')}`;
      const markers = copied.filter((n) => MARKER.test(readFileSync(join(dir, n), 'utf8'))).length;
      const sourceMarkers = names.filter((n) => MARKER.test(readFileSync(join(FIXTURES, n), 'utf8'))).length;
      if (markers !== sourceMarkers) return `${markers} files keep a marker, ${sourceMarkers} carry one`;
      return totals.files === names.length && totals.removed > 0 ? null : 'nothing removed';
    } finally {
      rmSync(dirname(dir), { recursive: true, force: true });
    }
  });

  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) return selftest();
  if (args.length !== 1 || args[0].startsWith('-')) throw new UsageError('need exactly one <out-dir>');
  const totals = blindCopy(args[0]);
  process.stdout.write(
    `blind-copy: ${totals.files} fixture(s) written to ${args[0]}; ` +
    `${totals.removed} comment(s) removed, ${totals.kept} kept for an anti-slop-allow or unslop-ignore marker\n`,
  );
}

try {
  main();
} catch (e) {
  if (e instanceof UsageError) {
    process.stderr.write(`blind-copy: ${e.message}\nUsage: node tests/harness/blind-copy.mjs <out-dir> | --selftest\n`);
    process.exit(2);
  }
  throw e;
}
