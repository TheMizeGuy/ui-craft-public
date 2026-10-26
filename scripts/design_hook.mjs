#!/usr/bin/env node
/**
 * design_hook.mjs -- the opt-in ui-craft design hook (registered in hooks/hooks.json).
 *
 * Two tiers. After an Edit or Write of a UI file, a per-edit pass runs the
 * scanner's mechanical rules on that file and names what the edit left behind.
 * When the agent stops, a deep pass runs every rule over the files edited this
 * session and separates what the session introduced from what was already
 * there. It never blocks: every path exits 0, and the only output is context
 * the agent reads (references/review/07-surgical-visual-upgrade.md section 8 is
 * the triage rule it points at).
 *
 * PROVENANCE. Two-tier shape, session attribution and noise budget re-expressed
 * from impeccable (Apache-2.0, https://github.com/pbakaus/impeccable):
 * plugin/hooks/hooks.json, crates/hook/src/hook.rs, crates/hook/src/stop_baseline.rs.
 * No impeccable code is included.
 *
 * CONTRACT.
 *   node scripts/design_hook.mjs post-tool-use|stop   (hook payload JSON on stdin)
 *   Exit code is always 0. Stdout is empty or exactly one JSON object:
 *     {"hookSpecificOutput":{"hookEventName":"PostToolUse"|"Stop","additionalContext":"<text>"}}
 *   Stderr is empty unless UI_CRAFT_HOOK_DEBUG=1. UI_CRAFT_HOOK=off silences it.
 *   Opt-in: <project>/.claude/ui-craft/hook.json with "enabled": true; optional
 *   keys surface, perEdit, stop, quiet, ignore, log. Session state lives under
 *   CLAUDE_PLUGIN_DATA (or the system temp dir), never in the reviewed repo.
 *   Each message is capped at MAX_CHARS characters per edit, STOP_MAX_CHARS at
 *   Stop, and MAX_LINES finding lines at both tiers.
 */

import {
  readFileSync, writeFileSync, renameSync, mkdirSync, statSync, realpathSync,
  readdirSync, unlinkSync, appendFileSync, existsSync,
} from 'node:fs';
import { join, relative, extname, sep, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomBytes } from 'node:crypto';

import { scanContent, RULES, SEVERITY_ORDER } from './scan_tells.mjs';

// Mechanical rules only: presence mode, Hard or Quality defect, never heuristic.
// outline-none fires only when nothing replaces the ring: the scanner files a
// focus: ring with no focus-visible: variant under U4, which is not per edit.
export const PER_EDIT_RULES = Object.freeze([
  'missing-alt', 'icon-only-control-no-name', 'dead-control', 'lorem-ipsum',
  'no-viewport-meta', 'fixed-page-shell', 'fixed-grid-tracks', 'vh-viewport-shell',
  'fixed-bottom-bar-no-safe-area', 'emoji-as-interface-chrome', 'outline-none',
]);

export const PER_EDIT_EXT = Object.freeze(['.html', '.htm', '.css', '.jsx', '.tsx', '.vue', '.svelte']);
export const SCRIPT_EXT = Object.freeze(['.js', '.ts', '.mjs', '.cjs']);

export const MAX_CHARS = 1000;
export const STOP_MAX_CHARS = 2500;
export const MAX_LINES = 6;
const FIX_CHARS = 120;
export const MAX_FILE_BYTES = 131072;
export const MAX_LINE_CHARS = 20000;
export const EDIT_PAUSE_AFTER = 8;
export const STOP_MAX_FILES = 20;

const STDIN_CAP = 5 * 1024 * 1024;
const DEADLINE_MS = { 'post-tool-use': 4000, stop: 25000 };
const STATE_VERSION = 1;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const PRUNE_STAT_LIMIT = 200;
const SURFACES = new Set(['control', 'content', 'marketing', 'article']);

const SKIP_DIR = /(^|\/)(node_modules|dist|build|out|coverage|\.next|\.nuxt|\.svelte-kit|\.git|\.claude|vendor)\//;
const GENERATED = /\.(min|generated)\.[a-z]+$|\.d\.ts$/;
// A plain script enters the deep pass only when it carries markup or styles.
const SCRIPT_MARKUP =
  /className=|\bclass=["'{]|style=\{\{|\b(?:html|css)`|styled(?:\.[a-z]+|\([^)]*\))`|<[a-z][\w-]*\s+[\w:@.-]+=/;

const PREFIX = '[ui-craft hook]';
const FOOTER_FULL =
  'Triage each finding and say in your reply what you fixed and what you waived. ' +
  'Real problem: fix it and keep keyboard, contrast, responsive and reduced-motion behaviour; leave the surface no flatter. ' +
  'Confident false positive or a choice the brief or owner made: `anti-slop-allow: <who decided: evidence>` on or above the line, disclosed. ' +
  'Ignore globs and turning the hook off are the user\'s call. Unsure: ask in one line.';
const FOOTER_SHORT =
  'Triage: fix real problems; waive only with an anti-slop-allow reason you disclose; unsure, ask in one line.';
const ATTRIBUTION_NOTE =
  '[attribution unknown] may predate this session: fix it only where it sits in what you changed, or ask first.';

const RULE_BY_ID = new Map(RULES.map((r) => [`${r.dimension}-${r.name}`, r]));
const PER_EDIT_SET = new Set(PER_EDIT_RULES);

// --- small helpers -----------------------------------------------------------------

const debug = (err) => {
  if (process.env.UI_CRAFT_HOOK_DEBUG === '1') process.stderr.write(`ui-craft hook: ${err && err.stack ? err.stack : err}\n`);
};

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function posix(p) {
  return p.split(sep).join('/');
}

function sha(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function writeAtomic(path, text) {
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

/** `**`, `*` and `?`; a run of `**\/` is one segment wildcard, never a nested one. */
export function globToRegExp(glob) {
  let g = String(glob).replace(/\\/g, '/').replace(/^\.\//, '').replace(/(?:\*\*\/)+/g, '**/');
  if (g.endsWith('/')) g += '**';
  let re = '';
  for (let i = 0; i < g.length; i += 1) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') {
      if (g[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

function occurrences(finding) {
  if (Array.isArray(finding.occurrences) && finding.occurrences.length) return finding.occurrences.length;
  if (Number.isInteger(finding.count) && finding.count > 0) return finding.count;
  const m = /^(\d+) occurrences;/.exec(String(finding.evidence || ''));
  return m ? Number(m[1]) : 1;
}

function ruleOf(finding) {
  const rule = RULE_BY_ID.get(finding.id);
  return rule ? rule.name : String(finding.id || '');
}

/** The remediation's first sentence, without its leading "<tellRef>:" label, at most FIX_CHARS characters. */
function fixText(remediation) {
  let text = String(remediation || '').replace(/\s+/g, ' ').trim();
  const label = /^([^:`]{1,60}):\s+/.exec(text);
  if (label) text = text.slice(label[0].length);
  let inCode = false;
  let end = text.length;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '`') inCode = !inCode;
    else if (!inCode && /[.!?]/.test(text[i]) && (i + 1 === text.length || text[i + 1] === ' ')) { end = i + 1; break; }
  }
  text = text.slice(0, end);
  if (text.length > FIX_CHARS) text = `${text.slice(0, FIX_CHARS - 3).replace(/\s+\S*$/, '')}...`;
  return text;
}

function scan(path, content, surface, only) {
  const opts = only ? { surface, only } : { surface };
  return scanContent(path, content, opts).findings;
}

function countsByRule(findings) {
  const counts = {};
  for (const f of findings) counts[ruleOf(f)] = (counts[ruleOf(f)] || 0) + occurrences(f);
  return counts;
}

// --- configuration, eligibility, state ---------------------------------------------

function loadConfig(projectDir) {
  const raw = readJson(join(projectDir, '.claude', 'ui-craft', 'hook.json'));
  if (!isObject(raw) || raw.enabled !== true) return null;
  return {
    surface: SURFACES.has(raw.surface) ? raw.surface : 'content',
    perEdit: raw.perEdit !== false,
    stop: raw.stop !== false,
    quiet: raw.quiet === true,
    ignore: Array.isArray(raw.ignore) ? raw.ignore.filter((g) => typeof g === 'string' && g).map(globToRegExp) : [],
    log: raw.log === true,
  };
}

/**
 * Returns { abs, rel, ext, content, perEdit } when the file belongs to the deep
 * pass, or null. `perEdit` says whether the per-edit rules also run on it.
 */
function eligible(file, projectReal, config) {
  if (typeof file !== 'string' || !isAbsolute(file)) return null;
  let abs;
  try {
    abs = realpathSync(file);
  } catch {
    return null;
  }
  if (abs !== projectReal && !abs.startsWith(projectReal + sep)) return null;
  const rel = posix(relative(projectReal, abs));
  if (!rel || SKIP_DIR.test(rel) || GENERATED.test(rel)) return null;
  if (config.ignore.some((re) => re.test(rel))) return null;
  const ext = extname(abs).toLowerCase();
  const perEdit = PER_EDIT_EXT.includes(ext);
  if (!perEdit && !SCRIPT_EXT.includes(ext)) return null;
  const st = statSync(abs);
  if (!st.isFile() || st.size > MAX_FILE_BYTES) return null;
  const content = readFileSync(abs, 'utf8');
  if (content.split('\n').some((line) => line.length > MAX_LINE_CHARS)) return null;
  if (!perEdit && !SCRIPT_MARKUP.test(content)) return null;
  return { abs, rel, ext, content, perEdit };
}

function stateDir() {
  return process.env.CLAUDE_PLUGIN_DATA || join(tmpdir(), 'ui-craft-hook');
}

function freshState(sessionId, projectDir) {
  return {
    version: STATE_VERSION, sessionId, projectDir, updatedAt: null,
    ackShown: false, footerShown: false, stopShown: [], files: {},
  };
}

function loadState(sessionId, projectDir) {
  const dir = join(stateDir(), 'sessions');
  const path = join(dir, `${sha(sessionId || 'unknown').slice(0, 24)}.json`);
  const raw = readJson(path);
  const ok = isObject(raw) && raw.version === STATE_VERSION && raw.projectDir === projectDir && isObject(raw.files);
  return { dir, path, state: ok ? raw : freshState(sessionId, projectDir), isNew: !ok };
}

function pruneStale(dir, keep) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    if (n >= PRUNE_STAT_LIMIT) break;
    const full = join(dir, name);
    if (full === keep) continue;
    n += 1;
    try {
      if (Date.now() - statSync(full).mtimeMs > STALE_MS) unlinkSync(full);
    } catch (err) {
      debug(err);
    }
  }
}

function saveState(store) {
  mkdirSync(store.dir, { recursive: true });
  store.state.updatedAt = new Date().toISOString();
  writeAtomic(store.path, JSON.stringify(store.state));
  if (store.isNew) pruneStale(store.dir, store.path);
}

function fileEntry(state, abs) {
  if (!isObject(state.files[abs])) {
    state.files[abs] = { edits: 0, capNoticed: false, baselineTried: false, baseline: null, shown: [], deferred: [] };
  }
  const entry = state.files[abs];
  if (!Array.isArray(entry.shown)) entry.shown = [];
  if (!Array.isArray(entry.deferred)) entry.deferred = [];
  return entry;
}

// --- baseline ----------------------------------------------------------------------

/**
 * The file as it stood before this session's first edit, from the tool's own
 * record of that edit, or null. The edit is replayed on it and must reproduce
 * the file on disk byte for byte; a formatter or a concurrent write voids it.
 * Git HEAD is never the baseline: the tree may already be dirty.
 */
function preimage(payload, current) {
  const input = isObject(payload.tool_input) ? payload.tool_input : {};
  const resp = payload.tool_response;
  if (!isObject(resp) || resp.userModified === true) return null;
  if (payload.tool_name === 'Write') {
    let original = null;
    if (resp.type === 'create') original = '';
    else if (resp.type === 'update' && typeof resp.originalFile === 'string') original = resp.originalFile;
    if (original === null) return null;
    const written = typeof resp.content === 'string' ? resp.content : input.content;
    return written === current ? original : null;
  }
  if (payload.tool_name === 'Edit') {
    const original = resp.originalFile;
    const oldString = typeof resp.oldString === 'string' ? resp.oldString : input.old_string;
    const newString = typeof resp.newString === 'string' ? resp.newString : input.new_string;
    const replaceAll = typeof resp.replaceAll === 'boolean' ? resp.replaceAll : input.replace_all === true;
    if (typeof original !== 'string' || typeof oldString !== 'string' || !oldString || typeof newString !== 'string') return null;
    let replayed;
    if (replaceAll) {
      replayed = original.split(oldString).join(newString);
    } else {
      const at = original.indexOf(oldString);
      if (at < 0 || original.indexOf(oldString, at + 1) >= 0) return null;
      replayed = original.slice(0, at) + newString + original.slice(at + oldString.length);
    }
    return replayed === current ? original : null;
  }
  return null;
}

// --- rendering ---------------------------------------------------------------------

function findingLine(f, where, kind) {
  const tag = kind ? ` [${kind}]` : '';
  const note = f.heuristic ? ' (heuristic: confirm in source)' : '';
  return `- ${where} [${f.severity}]${tag} ${f.tellRef} ${f.title}. Fix: ${fixText(f.remediation)}${note}`;
}

/**
 * Join head, as many item lines as fit, a "more" line for the rest, the tail and
 * the footer. Item lines are trimmed from the end to stay under `cap`, never
 * the footer; when the full footer would leave no item line, the short one goes
 * out and the full one waits for the next message.
 */
function fit(state, head, items, moreLine, tail, cap) {
  const capped = items.slice(0, MAX_LINES);
  const build = (k, foot) => {
    const hidden = items.length - k;
    return [...head, ...capped.slice(0, k), ...(hidden ? [moreLine(hidden)] : []), ...tail, foot].join('\n');
  };
  const feet = state.footerShown ? [FOOTER_SHORT] : [FOOTER_FULL, FOOTER_SHORT];
  for (const foot of feet) {
    const least = capped.length && foot === FOOTER_FULL && feet.length > 1 ? 1 : 0;
    for (let k = capped.length; k >= least; k -= 1) {
      const text = build(k, foot);
      if (text.length <= cap) {
        if (foot === FOOTER_FULL) state.footerShown = true;
        return { text, shown: k };
      }
    }
  }
  return { text: build(0, FOOTER_SHORT).slice(-cap), shown: 0 };
}

function emit(event, text) {
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text } })}\n`);
  return text.length;
}

// --- the two passes ----------------------------------------------------------------

function postToolUse(payload, ctx) {
  const { config, store } = ctx;
  if (payload.tool_name !== 'Edit' && payload.tool_name !== 'Write') return { skipped: 'tool', save: false };
  const input = isObject(payload.tool_input) ? payload.tool_input : {};
  const resp = isObject(payload.tool_response) ? payload.tool_response : {};
  const target = eligible(input.file_path || resp.filePath, ctx.projectReal, config);
  if (!target) return { skipped: 'ineligible', save: false };

  const { state } = store;
  const entry = fileEntry(state, target.abs);
  entry.edits += 1;
  if (!entry.baselineTried) {
    entry.baselineTried = true;
    const original = preimage(payload, target.content);
    entry.baseline = original === null ? null : { counts: countsByRule(scan(target.abs, original, config.surface)) };
  }
  const result = { file: target.rel };
  if (!target.perEdit || !config.perEdit) return { ...result, skipped: target.perEdit ? 'perEdit off' : 'stop only' };

  if (entry.edits > EDIT_PAUSE_AFTER) {
    if (entry.capNoticed || config.quiet) {
      entry.capNoticed = true;
      return { ...result, skipped: 'paused' };
    }
    entry.capNoticed = true;
    const text = `${PREFIX} ${target.rel}: edited more than ${EDIT_PAUSE_AFTER} times this session; per-edit checks are paused for this file and the stop pass still covers it.`;
    return { ...result, chars: emit('PostToolUse', text) };
  }

  const findings = scan(target.abs, target.content, config.surface, PER_EDIT_SET)
    .filter((f) => PER_EDIT_SET.has(ruleOf(f)) && !f.heuristic);
  const keyed = findings.map((f) => ({ f, key: `${ruleOf(f)}|${occurrences(f)}` }));
  const current = new Set(keyed.map((k) => k.key));
  const known = new Set([...entry.shown, ...entry.deferred]);
  const fresh = keyed.filter((k) => !known.has(k.key));
  entry.shown = entry.shown.filter((k) => current.has(k));
  entry.deferred = entry.deferred.filter((k) => current.has(k));
  result.findings = findings.length;

  if (!findings.length) {
    if (state.ackShown || config.quiet) return { ...result, skipped: 'clean' };
    state.ackShown = true;
    const text = `${PREFIX} ${target.rel}: none of the per-edit rules matched. That is not a design review: the stop pass runs more rules, and /ui-craft:review-ui is the review.`;
    return { ...result, chars: emit('PostToolUse', text) };
  }
  if (!fresh.length) return { ...result, skipped: 'seen' };

  const head = [`${PREFIX} ${target.rel}: ${fresh.length} design finding(s) from the per-edit rules`];
  const items = fresh.map((k) => findingLine(k.f, `L${k.f.line}`));
  const { text, shown } = fit(state, head, items, (k) => `- and ${k} more in this file; the stop pass lists them`, [], MAX_CHARS);
  entry.shown.push(...fresh.slice(0, shown).map((k) => k.key));
  entry.deferred.push(...fresh.slice(shown).map((k) => k.key));
  return { ...result, shown, chars: emit('PostToolUse', text) };
}

const KIND_ORDER = ['new', 'grew', 'attribution unknown'];

function stop(payload, ctx) {
  const { config, store } = ctx;
  if (payload.stop_hook_active === true) return { skipped: 'stop hook active', save: false };
  if (!config.stop) return { skipped: 'stop off', save: false };
  const { state } = store;
  const stopShown = new Set(Array.isArray(state.stopShown) ? state.stopShown : []);

  const listed = [];
  const stillOpen = [];
  let preExisting = 0;
  let files = 0;
  for (const abs of Object.keys(state.files)) {
    if (files >= STOP_MAX_FILES) break;
    const target = eligible(abs, ctx.projectReal, config);
    if (!target) continue;
    files += 1;
    const entry = fileEntry(state, abs);
    const shownPerEdit = new Set(entry.shown);
    const findings = scan(target.abs, target.content, config.surface)
      .filter((f) => f.confidence !== 'Taste note' && SEVERITY_ORDER.indexOf(f.severity) <= SEVERITY_ORDER.indexOf('MEDIUM'));
    for (const f of findings) {
      const rule = ruleOf(f);
      const count = occurrences(f);
      let kind = 'attribution unknown';
      if (entry.baseline && isObject(entry.baseline.counts)) {
        const before = Number(entry.baseline.counts[rule]) || 0;
        if (count <= before) { preExisting += 1; continue; }
        kind = before === 0 ? 'new' : 'grew';
      }
      const key = `${abs}|${rule}|${count}`;
      if (stopShown.has(key)) continue;
      if (shownPerEdit.has(`${rule}|${count}`)) stillOpen.push({ key, name: `${target.rel}:${f.tellRef}` });
      else listed.push({ key, f, kind, rel: target.rel, order: files });
    }
  }
  if (!listed.length && !stillOpen.length) return { skipped: 'nothing new', files, save: false };

  listed.sort((a, b) =>
    SEVERITY_ORDER.indexOf(a.f.severity) - SEVERITY_ORDER.indexOf(b.f.severity)
    || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
    || a.order - b.order || a.f.line - b.f.line);

  const head = [listed.length
    ? `${PREFIX} deep pass over ${files} file(s) edited this session: ${listed.length} finding(s) to triage`
    : `${PREFIX} deep pass over ${files} file(s) edited this session: nothing new; per-edit findings are still open`];
  if (listed.some((l) => l.kind === 'attribution unknown')) head.push(ATTRIBUTION_NOTE);
  const items = listed.map((l) => findingLine(l.f, `${l.rel}:L${l.f.line}`, l.kind));
  const tail = [];
  if (preExisting) tail.push(`${preExisting} finding(s) present before this session's first edit are not listed.`);
  if (stillOpen.length) {
    const names = stillOpen.slice(0, MAX_LINES).map((s) => s.name);
    const extra = stillOpen.length - names.length;
    tail.push(`Still open from the per-edit pass: ${names.join(', ')}${extra ? `, +${extra} more` : ''}.`);
  }
  const { text, shown } = fit(state, head, items, (k) => `+${k} more: run /ui-craft:review-ui on these files`, tail, STOP_MAX_CHARS);

  for (const l of listed) stopShown.add(l.key);
  for (const s of stillOpen) stopShown.add(s.key);
  state.stopShown = [...stopShown];
  return { files, findings: listed.length, shown, chars: emit('Stop', text) };
}

// --- entry ----------------------------------------------------------------------

export function main(event) {
  const started = Date.now();
  if (!Object.hasOwn(DEADLINE_MS, String(event))) return;
  if (/^(off|0|false|no)$/i.test(process.env.UI_CRAFT_HOOK || '')) return;
  setTimeout(() => process.exit(0), DEADLINE_MS[event]).unref();

  const raw = readFileSync(0, 'utf8');
  if (!raw || raw.length > STDIN_CAP) return;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }
  if (!isObject(payload)) return;

  const projectDir = process.env.CLAUDE_PROJECT_DIR || payload.cwd;
  if (typeof projectDir !== 'string' || !projectDir || !existsSync(projectDir)) return;
  const config = loadConfig(projectDir);
  if (!config) return;
  const projectReal = realpathSync(projectDir);
  const sessionId = typeof payload.session_id === 'string' ? payload.session_id : '';
  const store = loadState(sessionId, projectReal);
  const ctx = { config, store, projectReal };

  const result = event === 'stop' ? stop(payload, ctx) : postToolUse(payload, ctx);
  if (result.save !== false) saveState(store);
  if (config.log) {
    const line = {
      ts: new Date().toISOString(), event, file: result.file ?? null, findings: result.findings ?? 0,
      shown: result.shown ?? 0, chars: result.chars ?? 0, ms: Date.now() - started, skipped: result.skipped ?? null,
    };
    mkdirSync(stateDir(), { recursive: true });
    appendFileSync(join(stateDir(), 'hook-log.ndjson'), `${JSON.stringify(line)}\n`);
  }
}

const invokedDirectly = process.argv[1] && /design_hook\.mjs$/.test(process.argv[1]);
if (invokedDirectly) {
  try {
    main(process.argv[2]);
  } catch (err) {
    debug(err);
  }
  process.exitCode = 0;
}
