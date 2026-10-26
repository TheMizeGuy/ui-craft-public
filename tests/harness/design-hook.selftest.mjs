#!/usr/bin/env node
// Selftest for scripts/design_hook.mjs: the hook's stdin/stdout contract as
// cases. Each case runs the real script in a throwaway project with its own
// plugin data directory, so nothing touches this repo or the user's state.
//
// Usage: node tests/harness/design-hook.selftest.mjs   exit 0 all pass, 1 any fail.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { RULES } from '../../scripts/scan_tells.mjs';
import { PER_EDIT_RULES, MAX_CHARS, STOP_MAX_CHARS, MAX_LINES } from '../../scripts/design_hook.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(HERE, '..', '..', 'scripts', 'design_hook.mjs');
const FOOTER_START = 'Triage each finding and say in your reply';
const FOOTER_SHORT = 'Triage: fix real problems;';

let passed = 0;
let failed = 0;
const scratch = [];

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    process.stdout.write(`ok    ${name}\n`);
  } else {
    failed += 1;
    process.stdout.write(`FAIL  ${name}${detail ? `\n      ${String(detail).slice(0, 600)}` : ''}\n`);
  }
}

/** A throwaway project; `config` is written to .claude/ui-craft/hook.json unless null. */
function project(config = { enabled: true }) {
  const dir = mkdtempSync(join(tmpdir(), 'ui-craft-hook-test-'));
  scratch.push(dir);
  if (config !== null) {
    mkdirSync(join(dir, '.claude', 'ui-craft'), { recursive: true });
    writeFileSync(join(dir, '.claude', 'ui-craft', 'hook.json'), typeof config === 'string' ? config : JSON.stringify(config));
  }
  return { dir, data: join(dir, '..', `${dir.split('/').pop()}-data`), session: `s-${Math.random().toString(36).slice(2)}` };
}

function run(p, event, payload, env = {}) {
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const childEnv = { ...process.env, CLAUDE_PROJECT_DIR: p.dir, CLAUDE_PLUGIN_DATA: p.data, ...env };
  delete childEnv.UI_CRAFT_HOOK_DEBUG;
  if (!('UI_CRAFT_HOOK' in env)) delete childEnv.UI_CRAFT_HOOK;
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [HOOK, event], { input, env: childEnv, encoding: 'utf8', timeout: 20000 });
  const ms = Date.now() - t0;
  let json = null;
  if (r.stdout.trim()) {
    try { json = JSON.parse(r.stdout); } catch { json = undefined; }
  }
  const text = json && json.hookSpecificOutput ? json.hookSpecificOutput.additionalContext : '';
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json, text, ms };
}

function write(p, rel, content) {
  const abs = join(p.dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  return abs;
}

/** Write a file and build the PostToolUse payload Claude Code sends for a Write create. */
function writeCreate(p, rel, content) {
  const abs = write(p, rel, content);
  return {
    session_id: p.session, cwd: p.dir, hook_event_name: 'PostToolUse', tool_name: 'Write',
    tool_input: { file_path: abs, content }, tool_response: { filePath: abs, type: 'create' },
  };
}

/** Apply an Edit on disk and build its payload; `originalFile` false leaves it out of the response. */
function edit(p, rel, original, oldString, newString, { originalFile = true } = {}) {
  const updated = original.replace(oldString, newString);
  const abs = write(p, rel, updated);
  const response = { filePath: abs, oldString, newString, replaceAll: false, userModified: false, structuredPatch: [] };
  if (originalFile) response.originalFile = original;
  return {
    session_id: p.session, cwd: p.dir, hook_event_name: 'PostToolUse', tool_name: 'Edit',
    tool_input: { file_path: abs, old_string: oldString, new_string: newString, replace_all: false },
    tool_response: response,
  };
}

const stopPayload = (p, active = false) => ({ session_id: p.session, cwd: p.dir, hook_event_name: 'Stop', stop_hook_active: active });

const silent = (r) => r.status === 0 && r.stdout === '' && r.stderr === '';
const shape = (r, event) =>
  r.status === 0 && r.stderr === '' && r.json && Object.keys(r.json).length === 1
  && r.json.hookSpecificOutput && r.json.hookSpecificOutput.hookEventName === event
  && typeof r.json.hookSpecificOutput.additionalContext === 'string'
  && Object.keys(r.json.hookSpecificOutput).length === 2;

const IMG = '<img src="a.png">\n';
const GRADIENT = '<h1 class="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Ship faster</h1>\n';
const CLEAN = '<!doctype html>\n<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Orders</title></head>\n<body><main><h1>Orders</h1><p>Three orders wait for a label.</p></main></body></html>\n';

// --- 1-4: opt-in and input guards -------------------------------------------------
{
  const p = project(null);
  check('1 no config file -> silent', silent(run(p, 'post-tool-use', writeCreate(p, 'a.html', IMG))));
}
{
  const p = project({ enabled: false });
  check('2 enabled:false -> silent', silent(run(p, 'post-tool-use', writeCreate(p, 'a.html', IMG))));
  const q = project('{ not json');
  check('2b unparseable config -> silent', silent(run(q, 'post-tool-use', writeCreate(q, 'a.html', IMG))));
}
{
  const p = project();
  check('3 malformed stdin -> silent', silent(run(p, 'post-tool-use', '{"session_id": "s", ')));
  check('3b non-object JSON -> silent', silent(run(p, 'post-tool-use', '[1,2,3]')));
  check('3c unknown event -> silent', silent(run(p, 'toString', writeCreate(p, 'a.html', IMG))));
  check('3d UI_CRAFT_HOOK=off -> silent', silent(run(p, 'post-tool-use', writeCreate(p, 'a.html', IMG), { UI_CRAFT_HOOK: 'off' })));
  const other = { ...writeCreate(p, 'b.html', IMG), tool_name: 'Read' };
  check('3e a tool other than Edit or Write -> silent', silent(run(p, 'post-tool-use', other)));
}
{
  const p = project();
  check('4 .md target -> silent', silent(run(p, 'post-tool-use', writeCreate(p, 'notes.md', `# Notes\n\n${IMG}`))));
  check('4b .py target -> silent', silent(run(p, 'post-tool-use', writeCreate(p, 'app.py', `HTML = '${IMG.trim()}'\n`))));
  check('4c .swift target -> silent', silent(run(p, 'post-tool-use', writeCreate(p, 'View.swift', `let s = "${IMG.trim()}"\n`))));
  check('4d node_modules path -> silent', silent(run(p, 'post-tool-use', writeCreate(p, 'node_modules/x/a.html', IMG))));
  const outside = project();
  const payload = writeCreate(outside, 'a.html', IMG);
  check('4e file outside the project -> silent', silent(run(p, 'post-tool-use', { ...payload, session_id: p.session })));
}

// --- 5-8: the per-edit pass ---------------------------------------------------------
{
  const p = project();
  const payload = writeCreate(p, 'index.html', IMG);
  const r = run(p, 'post-tool-use', payload);
  check('5 Write of <img> with no alt -> one PostToolUse object naming WCAG 1.1.1 with the full footer',
    shape(r, 'PostToolUse') && r.text.includes('WCAG 1.1.1') && r.text.includes(FOOTER_START) && r.text.startsWith('[ui-craft hook] index.html:'),
    r.stdout || r.stderr);
  check('5b the message carries no decision field and stays under the cap', r.json && !('decision' in r.json) && r.text.length <= MAX_CHARS);
  check('6 the same edit again -> silent (dedupe)', silent(run(p, 'post-tool-use', payload)));
}
{
  const p = project();
  const r1 = run(p, 'post-tool-use', writeCreate(p, 'clean.html', CLEAN));
  check('7 first clean file -> the clean ack', shape(r1, 'PostToolUse') && r1.text.includes('none of the per-edit rules matched') && r1.text.includes('not a design review'), r1.stdout);
  check('7b a second clean file -> silent (one ack per session)', silent(run(p, 'post-tool-use', writeCreate(p, 'clean2.html', CLEAN))));
}
{
  const p = project({ enabled: true, quiet: true });
  const r = run(p, 'post-tool-use', writeCreate(p, 'allowed.html', '<img src="a.png"> <!-- anti-slop-allow: decorative -->\n'));
  check('8 an img line carrying anti-slop-allow -> no finding', silent(r), r.stdout);
}

// --- 9-13: the Stop pass and attribution ---------------------------------------------
{
  const p = project();
  const r1 = run(p, 'post-tool-use', writeCreate(p, 'hero.html', GRADIENT));
  check('9 a Pattern smell only (V5) -> per-edit prints the clean ack', shape(r1, 'PostToolUse') && r1.text.includes('none of the per-edit rules matched') && !r1.text.includes('V5'), r1.stdout);
  const r2 = run(p, 'stop', stopPayload(p));
  check('9b Stop lists V5 as [new] (baseline from the Write create)', shape(r2, 'Stop') && /\[new\] V5 /.test(r2.text) && r2.text.includes('hero.html:L1'), r2.stdout);
  check('12 Stop with stop_hook_active true -> silent', silent(run(p, 'stop', stopPayload(p, true))));
  check('13 a second Stop with nothing new -> silent', silent(run(p, 'stop', stopPayload(p))));
}
{
  const p = project();
  const original = `<main>\n${GRADIENT}</main>\n`;
  write(p, 'page.html', original);
  const payload = edit(p, 'page.html', original, '</main>', `${IMG}</main>`);
  const r1 = run(p, 'post-tool-use', payload);
  check('10 Edit adding an img -> per-edit names WCAG 1.1.1', shape(r1, 'PostToolUse') && r1.text.includes('WCAG 1.1.1'), r1.stdout);
  const r2 = run(p, 'stop', stopPayload(p));
  const freshImgLine = /^- .*WCAG 1\.1\.1/m.test(r2.text);
  check('10b Stop hides the pre-existing V5, counts it, and puts the img on the still-open line',
    shape(r2, 'Stop') && !/\bV5\b/.test(r2.text.replace(/^Still open.*$/m, ''))
    && r2.text.includes("1 finding(s) present before this session's first edit")
    && /^Still open from the per-edit pass: page\.html:WCAG 1\.1\.1/m.test(r2.text) && !freshImgLine,
    r2.stdout);
}
{
  const p = project();
  const original = `<main>\n${GRADIENT}</main>\n`;
  write(p, 'legacy.html', original);
  run(p, 'post-tool-use', edit(p, 'legacy.html', original, '<main>', '<main class="shell">', { originalFile: false }));
  const r = run(p, 'stop', stopPayload(p));
  check('11 Edit with no originalFile -> Stop marks [attribution unknown] and prints the note',
    shape(r, 'Stop') && /\[attribution unknown\] V5 /.test(r.text) && r.text.includes('may predate this session')
    && r.text.length <= MAX_CHARS, r.stdout);
}

// --- 14-16, 18: caps, pause, ignore, quiet ------------------------------------------------
{
  const p = project();
  const many = [
    '<html><head><title>x</title></head><body>',
    ...Array.from({ length: 6 }, (_, i) => `<img src="p${i}.png" class="pic-${i}">`),
    '<button onclick=""><svg viewBox="0 0 1 1"></svg></button>',
    '<p>Lorem ipsum dolor sit amet.</p>',
    '<div style="height: 100vh">shell</div>',
    '<div style="position: fixed; bottom: 0">bar</div>',
    '<div style="width: 1200px">wide</div>',
    '<div style="display:grid; grid-template-columns: 300px 300px 300px">g</div>',
    '<span>\u{1F680} Launch</span>',
    GRADIENT.trim(),
    '<div class="shadow-[0_0_40px_rgba(168,85,247,0.6)]">glow</div>',
    '</body></html>',
  ].join('\n');
  const r1 = run(p, 'post-tool-use', writeCreate(p, 'many.html', `${many}\n`));
  check('14 per-edit with many findings -> under the cap, ends with the footer, says more',
    shape(r1, 'PostToolUse') && r1.text.length <= MAX_CHARS && r1.text.includes('more')
    && r1.text.trimEnd().endsWith('one line.') && r1.text.split('\n').filter((l) => l.startsWith('- L')).length <= MAX_LINES,
    `${r1.text.length} chars\n${r1.text}`);
  const r2 = run(p, 'stop', stopPayload(p));
  check('14b Stop with many findings -> under the Stop cap, ends with the footer, says more',
    shape(r2, 'Stop') && r2.text.length <= STOP_MAX_CHARS && r2.text.includes('more') && r2.text.trimEnd().endsWith('one line.')
    && r2.text.includes(FOOTER_SHORT) && r2.text.split('\n').filter((l) => l.startsWith('- ')).length <= MAX_LINES,
    `${r2.text.length} chars\n${r2.text}`);
  check('14c the Stop pass has its own budget: the many-findings message runs past the per-edit cap',
    r2.text.length > MAX_CHARS, `${r2.text.length} chars`);
}
{
  const p = project();
  let content = IMG;
  write(p, 'busy.css', '');
  const outs = [];
  for (let i = 1; i <= 10; i += 1) {
    const next = `${content}.c${i} { color: red; }\n`;
    outs.push(run(p, 'post-tool-use', edit(p, 'busy.css', content, content, next)));
    content = next;
  }
  const ninth = outs[8];
  check('15 the ninth edit of one file prints the pause notice once',
    shape(ninth, 'PostToolUse') && ninth.text.includes('edited more than 8 times this session'), ninth.stdout);
  check('15b the tenth edit -> silent', silent(outs[9]));
}
{
  const p = project({ enabled: true, ignore: ['legacy/**', '**/**/*.gen.html'] });
  check('16 an ignore glob matching the file -> silent', silent(run(p, 'post-tool-use', writeCreate(p, 'legacy/old/a.html', IMG))));
  check('16b a collapsed **/**/ glob matches at any depth -> silent', silent(run(p, 'post-tool-use', writeCreate(p, 'x/y/z.gen.html', IMG))));
}
{
  const byName = new Map(RULES.map((r) => [r.name, r]));
  const bad = PER_EDIT_RULES.filter((n) => {
    const r = byName.get(n);
    return !r || r.mode !== 'presence' || !['Hard defect', 'Quality defect'].includes(r.confidence) || r.heuristic;
  });
  check('17 PER_EDIT_RULES: every name is a presence-mode Hard or Quality defect rule, never heuristic', bad.length === 0, bad.join(', '));
  check('17b outline-none is in the per-edit list now that the scanner guards a replaced ring', PER_EDIT_RULES.includes('outline-none'));
  check('17c the caps: 1,000 characters per edit, 2,500 at Stop, six finding lines at both tiers',
    MAX_CHARS === 1000 && STOP_MAX_CHARS === 2500 && MAX_LINES === 6);
}
{
  const p = project();
  const ringed = run(p, 'post-tool-use', writeCreate(p, 'ringed.html', `${CLEAN.replace('<p>', '<p><button class="focus:outline-none focus:ring-2">Ship</button>')}`));
  check('17d focus:outline-none with a focus: ring prints no U3 per edit', !ringed.text.includes(' U3 '), ringed.stdout);
  const bare = run(p, 'post-tool-use', writeCreate(p, 'bare.css', '.card:focus { outline: none; }\n'));
  check('17e a bare outline: none with no replacement prints U3 per edit', shape(bare, 'PostToolUse') && bare.text.includes(' U3 '), bare.stdout);
}
{
  const p = project({ enabled: true, quiet: true });
  check('18 quiet:true -> no clean ack', silent(run(p, 'post-tool-use', writeCreate(p, 'clean.html', CLEAN))));
  const r = run(p, 'post-tool-use', writeCreate(p, 'img.html', IMG));
  check('18b quiet:true still prints findings', shape(r, 'PostToolUse') && r.text.includes('WCAG 1.1.1'), r.stdout);
}

// --- 19-22: size, line length, scripts, the still-open line ---------------------------------
{
  const p = project();
  const block = `<section><img src="a.png"><p>Lorem ipsum dolor.</p><div style="height:100vh;width:1200px">x</div><button onclick=""></button></section>\n`;
  let big = '<html><head><title>t</title></head><body>\n';
  while (big.length + block.length < 128000) big += block;
  big += '</body></html>\n';
  const r = run(p, 'post-tool-use', writeCreate(p, 'big.html', big));
  process.stdout.write(`      per-edit on a ${Math.round(big.length / 1024)} KB file with many tells: ${r.ms} ms (process spawn included)\n`);
  check('19 per-edit on a file at the size cap finishes under 4000 ms and reports', shape(r, 'PostToolUse') && r.ms < 4000, `${r.ms} ms ${r.stdout}`);
}
{
  const p = project();
  const oneLine = `.a{color:red}${'.b{margin:0;padding:0;width:1200px}'.repeat(6000)}\n`;
  const r = run(p, 'post-tool-use', writeCreate(p, 'huge.css', oneLine));
  check('20 a 200 KB one-line .css -> silent and fast (size guard)', silent(r) && r.ms < 5000, `${r.ms} ms ${r.stdout}`);
  const longLine = `${IMG}<p>${'word '.repeat(4500)}</p>\n`;
  const r2 = run(p, 'post-tool-use', writeCreate(p, 'long.html', longLine));
  check('20b a file under the size cap with a line over 20000 characters -> silent', silent(r2), r2.stdout);
}
{
  const p = project();
  const ts = 'export const card = (src: string) => html`<img src=${src}>`;\n';
  const r1 = run(p, 'post-tool-use', writeCreate(p, 'card.ts', ts));
  check('21 a .ts file with html`` markup -> not scanned per edit', silent(r1), r1.stdout);
  const generics = 'export async function load(ids: Array<number>): Promise<void> {\n  const leverage: Map<string, number> = new Map();\n  if (ids.length < 3 && ids.length > 0) leverage.set("a", 1);\n}\n';
  run(p, 'post-tool-use', writeCreate(p, 'logic.ts', generics));
  const r2 = run(p, 'stop', stopPayload(p));
  check('21b the html`` .ts file is listed at Stop', shape(r2, 'Stop') && r2.text.includes('card.ts:L1'), r2.stdout);
  check('21c a .ts file with only generics is never listed', !r2.text.includes('logic.ts'), r2.stdout);
}
{
  const p = project();
  run(p, 'post-tool-use', writeCreate(p, 'open.html', IMG));
  const r1 = run(p, 'stop', stopPayload(p));
  check('22 the first Stop names the open per-edit finding on the still-open line',
    shape(r1, 'Stop') && /^Still open from the per-edit pass: open\.html:WCAG 1\.1\.1/m.test(r1.text), r1.stdout);
  check('22b a second Stop with the same open finding -> silent (the line appears once)', silent(run(p, 'stop', stopPayload(p))));
}
{
  const p = project({ enabled: true, perEdit: false });
  check('23 perEdit:false -> silent per edit', silent(run(p, 'post-tool-use', writeCreate(p, 'a.html', IMG))));
  const r = run(p, 'stop', stopPayload(p));
  check('23b perEdit:false -> the Stop pass still lists the file', shape(r, 'Stop') && /\[new\] WCAG 1\.1\.1/.test(r.text), r.stdout);
  const q = project({ enabled: true, stop: false });
  run(q, 'post-tool-use', writeCreate(q, 'a.html', IMG));
  check('23c stop:false -> silent at Stop', silent(run(q, 'stop', stopPayload(q))));
}

{
  const p = project({ enabled: true, log: true });
  run(p, 'post-tool-use', writeCreate(p, 'a.html', IMG));
  run(p, 'stop', stopPayload(p));
  let lines = [];
  try { lines = readFileSync(join(p.data, 'hook-log.ndjson'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)); } catch { lines = []; }
  const keys = ['ts', 'event', 'file', 'findings', 'shown', 'chars', 'ms', 'skipped'];
  check('24 log:true appends one NDJSON line per invocation with the documented keys',
    lines.length === 2 && lines.every((l) => keys.every((k) => k in l)) && lines[0].event === 'post-tool-use' && lines[1].event === 'stop',
    JSON.stringify(lines));
  const projectFiles = readdirSync(p.dir, { recursive: true }).map(String).sort();
  check('24b nothing is written into the reviewed project beyond its own files',
    JSON.stringify(projectFiles) === JSON.stringify(['.claude', '.claude/ui-craft', '.claude/ui-craft/hook.json', 'a.html']), projectFiles.join(', '));
}
{
  const p = project();
  const tmp = mkdtempSync(join(tmpdir(), 'ui-craft-hook-tmpdir-'));
  scratch.push(tmp);
  const r = run(p, 'post-tool-use', writeCreate(p, 'a.html', IMG), { CLAUDE_PLUGIN_DATA: '', TMPDIR: tmp });
  const sessions = (() => { try { return readdirSync(join(tmp, 'ui-craft-hook', 'sessions')); } catch { return []; } })();
  check('25 without CLAUDE_PLUGIN_DATA the state falls back to the system temp dir',
    shape(r, 'PostToolUse') && sessions.length === 1 && /^[0-9a-f]{24}\.json$/.test(sessions[0]), `${sessions.join(', ')} ${r.stdout}`);
}

for (const dir of scratch) {
  rmSync(dir, { recursive: true, force: true });
  rmSync(join(dir, '..', `${dir.split('/').pop()}-data`), { recursive: true, force: true });
}

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
