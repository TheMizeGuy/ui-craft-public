#!/usr/bin/env node
/**
 * scan_tells.mjs -- a deterministic, zero-dependency scan for the subset of
 * `references/catalogue/01-ai-tells.md` that source text can honestly decide on
 * its own.
 *
 * WHAT THIS IS NOT. It is not the auditor. The catalogue's base tells, platform
 * rows, deep cuts, fingerprints and Strongest-10 rows mostly need a reading of
 * the surface that no static scan has. This file covers the rows whose signature
 * IS in the source -- a verbatim library class run, a banned literal, a fixed
 * geometry value, a missing attribute, a colour pair whose ratio can be computed
 * from declared CSS -- and stays silent on the rest. A green run here means
 * "none of the mechanical tells matched", never "this surface is clean".
 * `agents/ui-anti-slop-auditor.md` still walks the catalogue.
 *
 * PROVENANCE. The rule table, the four confidence classes, the presence and
 * concentration firing modes, the per-line `suppress` and per-file `requires` /
 * `unless` guards and the `anti-slop-allow` escape hatch are ported from the
 * `anti-slop` plugin (same owner, MIT). The parsing, the comment blanking, the
 * class-set reader, the colour maths and the shared detectors live in
 * `lib/design-detect.mjs`, vendored from anti-slop byte for byte; its head
 * carries the third-party notice for the rules it re-expresses. Every rule here
 * is keyed to the ui-craft catalogue code it reports, its severity comes from
 * catalogue section 18, and its threshold from the catalogue's "How to apply:
 * presence vs concentration".
 *
 * SEVERITY. From catalogue section 18, for the tell the rule reports. Where a
 * rule matches the exact signature of a Strongest-10 row, section 18's escalation
 * for that row applies.
 *
 * CONFIDENCE. The four classes of `references/review/01-universal-rubric.md`.
 *
 * WHAT A RULE READS. Every rule reads the file with its comments blanked (and,
 * in markup, the contents of <code> and <pre>), so a commented-out declaration
 * is not on the page; line numbers are unchanged. The copy rules read only the
 * text a user would see. The escape hatch is read from the raw line, where the
 * marker lives: `anti-slop-allow` (or `unslop-ignore`) on a line or the line
 * above suppresses every rule there, and `anti-slop-allow: <rule or code>[, ...]
 * -- <reason>` suppresses only the rules it names.
 *
 * REMEDIATION FLOOR. Every rule here is narrow enough that the cheapest way to
 * clear it is not to delete responsive, accessible or motion-preference
 * behaviour (catalogue "The remediation floor").
 *
 * Usage:
 *   node scripts/scan_tells.mjs <file...> [--format text|json]
 *                               [--fail-on any|high|medium|low|none]
 *                               [--surface control|content|marketing|article]
 *
 * A path that cannot be scanned (missing, a directory, an unsupported type,
 * unreadable) is listed under `skipped` and the rest are scanned. Exit 0 clean,
 * 1 findings at or above the fail level (default `any`), 2 on a usage error or
 * when no file could be scanned.
 */

import { readFileSync, statSync } from 'node:fs';
import { extname, basename, dirname, relative, resolve } from 'node:path';

import {
  makeContext, matchingClassSets, tailwindToken, isResting, isStateVariant,
  parseWaiver, waiverCovers, classFreeLines, lineRegexHits,
  glowHits, creamLegHits, creamCombination, framedCardSets, framedCardTrio,
  primaryFamilyBlocks, familyKey,
  lowContrastHits, sideStripeHits, textSizeFloorHits, tightLeadingHits, wideTrackingHits,
  justifiedNarrowHits, crushedTrackingHits, bounceEasingHits, pulsingDotHits, marqueeHits,
  backgroundPatternHits, radialHaloHits, grayOnColorHits, skippedHeadingHits,
  findDesignMd, readDesignSystem, purpleMatchExempt, tailwindPurpleColour, parseColor,
  designSystemFontHits, decl, lengthPx, resolveVars, isControlSelector,
} from './lib/design-detect.mjs';

// --- constants ----------------------------------------------------------------

export const CONFIDENCE = Object.freeze({
  HARD: 'Hard defect',
  QUALITY: 'Quality defect',
  SMELL: 'Pattern smell',
  TASTE: 'Taste note',
});

export const PRESENCE = 'presence';
export const CONCENTRATION = 'concentration';

export const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'TASTE'];

// A line carrying this marker is a deliberate choice the catalogue tells every
// reviewer to honour. The marker counts on the line itself OR on the line above
// it, so it can sit on a comment over the construct as well as beside it.
export const ESCAPE_HATCH = /(?:anti-slop-allow|unslop-ignore)\b/i;

const MARKUP_EXT = new Set(['.html', '.htm', '.vue', '.svelte', '.astro']);
const SCRIPT_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts']);
const STYLE_EXT = new Set(['.css', '.scss', '.less']);
const DOC_EXT = new Set(['.md', '.mdx']);
// Files that hold elements: the markup rules (U13, V12, T15) run on these.
const MARKUP_SURFACE_EXT = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.mdx']);

// Surfaces this scan reads. Markdown is included because the plugin dogfoods
// itself: a reference file's fenced examples are the same markup the rules read.
const SUPPORTED_EXT = new Set([...MARKUP_EXT, ...SCRIPT_EXT, ...STYLE_EXT, ...DOC_EXT]);

// The lede budget above the primary content, per surface, from
// `references/design/12-copy-placement-and-volume.md` section 3. A control
// surface takes the product lede of 25 words; "one line or none" in that table
// is the aim, not a second bar. An article has no bar, so W11 never fires there.
const LEDE_BUDGET = { control: 25, content: 40, marketing: 25, article: Infinity };

// Families that are the platform's own voice rather than a chosen face. Used by
// the V13 candidate: a stated brand face is evidence the system chose something.
const SYSTEM_FAMILIES = new Set([
  'system-ui', '-apple-system', 'blinkmacsystemfont', 'ui-sans-serif',
  'ui-serif', 'ui-monospace', 'sans-serif', 'serif', 'monospace', 'cursive',
  'sf pro text', 'sf pro display', 'sf pro', 'sf mono', 'segoe ui', 'inherit',
  'initial', 'unset', 'system', 'apple-system',
]);

// A token whose NAME says "status" is not an accent. V13's signature is colour
// reserved for status with the accent stripped, so the status legs are part of
// the pattern and must not clear it.
const STATUS_TOKEN = /^--(?:ok|bad|good|err|error|success|warn|warning|danger|alert|info|positive|negative|critical|status|online|offline|up|down)\b/i;

// --- small helpers ------------------------------------------------------------

function globalize(re) {
  return re.flags.includes('g') ? re : new RegExp(re.source, re.flags + 'g');
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ');
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeFromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeFromCodePoint(Number(d)));
}

function safeFromCodePoint(cp) {
  if (!Number.isInteger(cp) || cp < 0 || cp > 0x10ffff) return '';
  try { return String.fromCodePoint(cp); } catch { return ''; }
}

function wordCount(text) {
  const words = decodeEntities(text).trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  return words.length;
}

function snippet(text, max = 160) {
  const one = String(text).replace(/\s+/g, ' ').trim();
  return one.length > max ? one.slice(0, max - 3) + '...' : one;
}

function blankRange(chars, start, end) {
  for (let i = start; i < end; i++) if (chars[i] !== '\n') chars[i] = ' ';
}

function memoOf(ctx, key, fn) {
  if (!ctx.memo.has(key)) ctx.memo.set(key, fn());
  return ctx.memo.get(key);
}

// One hit per regex match on each line, with the column and the matched text.
function matchHits(lines, re) {
  const g = globalize(re);
  const hits = [];
  lines.forEach((line, i) => {
    g.lastIndex = 0;
    for (const m of line.matchAll(g)) {
      hits.push({ line: i + 1, column: m.index + 1, match: m[0], evidence: snippet(line) });
    }
  });
  return hits;
}

// --- the text a reader sees (copy rules) ----------------------------------------
// Copy rules match words a user reads, not identifiers, attribute values or
// script. Markup keeps the text between tags outside <script> and <style>;
// script files keep string literals and JSX text; a stylesheet keeps its quoted
// strings; markdown keeps its prose (fenced blocks are examples). Positions are
// preserved, so a line and column here are a line and column in the file.

// Elements whose content never reaches the page a reader sees on first paint:
// script (JSON-LD included), style, an inert template, and the no-script fallback.
const NON_RENDERED = ['script', 'style', 'template', 'noscript'];

function blankNonRendered(text) {
  const chars = text.split('');
  const lower = text.toLowerCase();
  const open = new RegExp(`<(${NON_RENDERED.join('|')})\\b[^>]*>`, 'gi');
  for (const m of text.matchAll(open)) {
    const close = lower.indexOf(`</${m[1].toLowerCase()}`, m.index + m[0].length);
    const end = close === -1 ? text.length : text.indexOf('>', close) + 1 || text.length;
    blankRange(chars, m.index, end);
  }
  return chars;
}

// The page as rendered: markup files with their non-rendered elements blanked,
// positions kept. W11 and T15 read this, so a paragraph in a template or a
// middot run in a script string is not on the page.
function pageText(ctx) {
  return memoOf(ctx, 'pageText', () => (MARKUP_EXT.has(ctx.ext) ? blankNonRendered(ctx.text).join('') : ctx.text));
}

function renderedMarkupText(text, ext) {
  const chars = blankNonRendered(text);
  if (ext === '.astro') {
    const fm = /^---[ \t]*\r?\n[\s\S]*?\r?\n---/.exec(text);
    if (fm) blankRange(chars, 0, fm[0].length);
  }
  for (const m of text.matchAll(/<\/?[A-Za-z!?][^>]*>/g)) blankRange(chars, m.index, m.index + m[0].length);
  return chars.join('');
}

const JSX_TEXT = /(?:<[A-Za-z][\w.:-]*(?:\s+(?:[^<>{}"']|"[^"\n]*"|'[^'\n]*'|\{(?:[^{}]|\{[^{}]*\})*\})*)?\s*>|<\/[A-Za-z][\w.:-]*\s*>|<>|<\/>)([^<>{}]+)/g;

function quotedSpans(text, keep) {
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      let depth = 0;
      while (j < text.length) {
        const d = text[j];
        if (d === '\\') { j += 2; continue; }
        if (c === '`' && d === '$' && text[j + 1] === '{') { depth += 1; j += 2; continue; }
        if (c === '`' && depth > 0) {
          if (d === '{') depth += 1;
          else if (d === '}') depth -= 1;
          j += 1;
          continue;
        }
        if (d === c) break;
        if (d === '\n' && c !== '`') break;
        keep[j] = 1;
        j += 1;
      }
      i = j + 1;
      continue;
    }
    i += 1;
  }
}

function scriptCopyText(text) {
  const keep = new Uint8Array(text.length);
  quotedSpans(text, keep);
  for (const m of text.matchAll(JSX_TEXT)) {
    const start = m.index + m[0].length - m[1].length;
    for (let k = start; k < m.index + m[0].length; k++) keep[k] = 1;
  }
  let out = '';
  for (let i = 0; i < text.length; i++) out += keep[i] || text[i] === '\n' ? text[i] : ' ';
  return out;
}

function quotedText(text) {
  const keep = new Uint8Array(text.length);
  quotedSpans(text, keep);
  let out = '';
  for (let i = 0; i < text.length; i++) out += keep[i] || text[i] === '\n' ? text[i] : ' ';
  return out;
}

function proseText(text) {
  let fenced = false;
  return text.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return ' '.repeat(line.length); }
    return fenced ? ' '.repeat(line.length) : line;
  }).join('\n');
}

function copyLines(ctx) {
  return memoOf(ctx, 'copyLines', () => {
    let out = ctx.text;
    if (MARKUP_EXT.has(ctx.ext)) out = renderedMarkupText(ctx.text, ctx.ext);
    else if (SCRIPT_EXT.has(ctx.ext)) out = scriptCopyText(ctx.text);
    else if (STYLE_EXT.has(ctx.ext)) out = quotedText(ctx.text);
    else if (DOC_EXT.has(ctx.ext)) out = proseText(ctx.text);
    return out.split('\n');
  });
}

// --- class sets ---------------------------------------------------------------
// Utility-class order is arbitrary, so a fingerprint matches the token SET of one
// class source (class=, className=, cn()/clsx()/cva() and kin, over several
// lines), never a sequence, and each element counts once: a complete base set
// once, otherwise each ternary arm with the base added.

function tokenSetHas(tokens, req) {
  return typeof req === 'string' ? tokens.includes(req) : tokens.some((t) => req.test(t));
}

function restingBases(tokens) {
  return tokens.map(tailwindToken).filter(isResting).map((t) => t.base);
}

function classSetHits(ctx, test) {
  return matchingClassSets(ctx.shared.classSets, test).map((set) => ({
    line: set.line, offset: set.start, evidence: snippet(set.tokens.join(' ')),
  }));
}

function classAllHits(ctx, required, suppress) {
  return classSetHits(ctx, (tokens) => required.every((req) => tokenSetHas(tokens, req)))
    .filter((h) => !(suppress && suppress.test(ctx.lines[h.line - 1] || '')));
}

// --- colour helpers (the V13 candidate) --------------------------------------

function collectTokens(text) {
  const tokens = new Map();
  for (const m of text.matchAll(/(--[a-z0-9_-]+)\s*:\s*([^;{}]+)/gi)) {
    tokens.set(m[1].toLowerCase(), m[2].trim());
  }
  return tokens;
}

function resolveValue(value, tokens, depth = 0) {
  if (depth > 4) return value;
  return value.replace(/var\(\s*(--[a-z0-9_-]+)[^)]*\)/gi, (whole, name) => {
    const found = tokens.get(name.toLowerCase());
    return found === undefined ? whole : resolveValue(found, tokens, depth + 1);
  });
}

/** Alpha of a colour value, or 1 when the value states none. */
function alphaOf(value) {
  const oklch = value.match(/oklch\(\s*[^)/]*\/\s*([0-9.]+%?)\s*\)/i);
  if (oklch) return oklch[1].endsWith('%') ? parseFloat(oklch[1]) / 100 : parseFloat(oklch[1]);
  const rgba = value.match(/rgba?\([^)]*[,/]\s*([0-9.]+%?)\s*\)/i);
  if (rgba && /,/.test(value.slice(value.indexOf('(')))) {
    const parts = value.slice(value.indexOf('(') + 1, value.lastIndexOf(')')).split(/[,/]/);
    if (parts.length === 4) {
      const a = parts[3].trim();
      return a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
    }
  }
  const hexa = value.match(/#([0-9a-f]{8})\b/i);
  if (hexa) return parseInt(hexa[1].slice(6), 16) / 255;
  const hexa4 = value.match(/#([0-9a-f]{4})\b/i);
  if (hexa4) return parseInt(hexa4[1][3].repeat(2), 16) / 255;
  return 1;
}

// --- rule table ---------------------------------------------------------------
// Each rule declares:
//   name       kebab id, also the finding's id slug
//   tellRef    the catalogue code this rule reports (labels.json convention)
//   dimension  the review dimension
//   severity   catalogue section 18
//   confidence review/01-universal-rubric.md
//   mode       PRESENCE, or CONCENTRATION + minCount
//   title      the finding title
//   why        the remediation, so no finding can be closed by deletion
//   pattern | classAll | count | fileHits   how it matches
//   copy       the pattern reads only the text a user sees
//   gate       fileHits(hits) after waivers: a combination or repetition
//              decides on the hits that survive the hatch
//   suppress   per-line guard: a line matching it is a correct use
//   requires / requiresMinCount / unless    per-file guards
//   supersededBy  rule names whose hit on the SAME LINE silences this one
//                 (catalogue "One finding per span")
//   surface    'markup' (files that hold elements) or 'document' (an HTML page);
//              elsewhere the rule does not run and the coverage list says so
//   heuristic  the rule states a candidate, not a match

const PURPLE_UTILITY = /^(?:bg|text|from|via|to|border|ring|fill|stroke|decoration|outline)-(?:indigo|violet|purple|fuchsia)-(?:400|500|600|700|800)$/;
const PURPLE_UTILITY_TEXT = /(?<![\w:/-])(?:bg|text|from|via|to|border|ring|fill|stroke|decoration|outline)-(?:indigo|violet|purple|fuchsia)-(?:400|500|600|700|800)(?![\w/-])/gi;
const PURPLE_GRADIENT_TEXT = /from-(?:indigo|purple|violet|fuchsia)-\d+\s+(?:via-[a-z]+-\d+\s+)?to-(?:blue|indigo|purple|violet|pink|fuchsia|cyan|sky|teal)-\d+/gi;
const PURPLE_HEX_GRADIENT = /linear-gradient\([^)]*#(?:6366f1|7c3aed|8b5cf6|a855f7|9333ea|d946ef|ec4899)[^)]*\)/gi;
// Hue 255-325 at chroma >= 0.15 is the catalogue's window; these are the measured
// hexes that land inside it.
const AI_PURPLE_HEX = /#(?:6366f1|4f46e5|818cf8|7c3aed|6d28d9|8b5cf6|a855f7|9333ea|7e22ce|c026d3|d946ef|3b82f6|0d6efd|0b5ed7|0a58ca)\b/gi;
// A from-/via-/to- stop paints nothing unless its element also carries a gradient.
const GRADIENT_DIRECTION = /^bg-(?:gradient|linear|radial|conic)(?:-|$)/;

// A DESIGN.md palette exempts purple per match, never per rule: a match is the
// documented palette when every purple colour in it sits within 6 per channel of
// a declared colour or within 15 degrees of hue of a declared purple.
const PURPLE_BASE_TEXT = /(?:bg|text|from|via|to|border|ring|fill|stroke|decoration|outline)-(?:indigo|violet|purple|fuchsia)-[4-8]00/gi;

function purpleColoursIn(text) {
  const s = String(text);
  return [
    ...[...s.matchAll(globalize(AI_PURPLE_HEX))].map((m) => parseColor(m[0])),
    ...[...s.matchAll(PURPLE_BASE_TEXT)].map((m) => tailwindPurpleColour(m[0])),
  ].filter(Boolean);
}

function undeclaredPurple(ctx) {
  const ds = ctx.shared.designSystem;
  return (h) => {
    if (!ds) return true;
    const colours = purpleColoursIn(`${h.match ?? ''} ${h.evidence ?? ''}`);
    return colours.length === 0 || !colours.every((c) => purpleMatchExempt(ds, c));
  };
}

function purpleGradientHits(ctx) {
  const from = /^from-(?:indigo|purple|violet|fuchsia)-\d+$/;
  const to = /^to-(?:blue|indigo|purple|violet|pink|fuchsia|cyan|sky|teal)-\d+$/;
  const sets = classSetHits(ctx, (tokens) => {
    const bases = restingBases(tokens);
    return bases.some((b) => from.test(b)) && bases.some((b) => to.test(b));
  });
  return [
    ...sets,
    ...matchHits(classFreeLines(ctx.shared), PURPLE_GRADIENT_TEXT),
    ...matchHits(ctx.lines, PURPLE_HEX_GRADIENT),
  ].filter(undeclaredPurple(ctx));
}

function aiPurpleHits(ctx) {
  const bases = new Map();
  for (const set of ctx.shared.classSets) if (set.arm === null) bases.set(set.group, set.tokens);
  const hits = [];
  for (const set of ctx.shared.classSets) {
    const element = set.arm === null ? set.tokens : [...(bases.get(set.group) || []), ...set.tokens];
    const gradient = restingBases(element).some((b) => GRADIENT_DIRECTION.test(b));
    for (const raw of set.tokens) {
      const t = tailwindToken(raw);
      if (!isResting(t) || !PURPLE_UTILITY.test(t.base)) continue;
      if (/^(?:from|via|to)-/.test(t.base) && !gradient) continue;
      hits.push({ line: set.line, evidence: raw, match: raw });
    }
  }
  return [
    ...hits,
    ...matchHits(classFreeLines(ctx.shared), PURPLE_UTILITY_TEXT),
    ...purpleHexHits(ctx),
  ].filter(undeclaredPurple(ctx));
}

// A tokens file that declares a whole palette is not the palette in use: a hex in
// an unread scale-named property (`--violet-500`) is skipped. A semantic role
// (`--primary`, `--brand-accent`, `--link-hover`) counts where it is declared,
// because the file that reads it is often another one.
const SEMANTIC_TOKEN = /(?:^|-)(?:primary|brand|accent|cta|action|link|highlight)(?:-|$)/i;
const SCALE_TOKEN = /^--[a-z]+-\d{2,3}$/i;

function purpleHexHits(ctx) {
  return matchHits(ctx.lines, AI_PURPLE_HEX).filter((h) => {
    const def = /(--[\w-]+)\s*:\s*[^;{}]*$/.exec(ctx.lines[h.line - 1].slice(0, h.column - 1));
    if (!def) return true;
    const name = def[1];
    const read = new RegExp(`var\\(\\s*${name.replace(/-/g, '\\-')}(?![\\w-])`).test(ctx.text);
    return SEMANTIC_TOKEN.test(name.slice(2)) || !SCALE_TOKEN.test(name) || read;
  });
}

// The primary face is the first non-generic family of a block's font-family or
// font shorthand; a system stack is never a face, and a family named only as a
// fallback never fires. A reflex face on a control (a button, a field, its label)
// is the UI label fallback and is permitted when the page sets another face for
// its content. The next/font constructor is read in script files.
function primaryFaceHits(ctx, faces, constructor) {
  const blocks = primaryFamilyBlocks(ctx.shared);
  const hits = [];
  for (const b of blocks) {
    if (b.kind !== 'face' || !faces.has(familyKey(b.name))) continue;
    if (b.control && blocks.some((o) => !o.control && o.kind !== 'none' && o.name !== b.name)) continue;
    hits.push({ line: b.line, evidence: `${b.selector}: ${b.name}` });
  }
  if (SCRIPT_EXT.has(ctx.ext)) hits.push(...matchHits(ctx.lines, constructor));
  return hits;
}

const contrastHits = (ctx) => lowContrastHits(ctx.shared);

const OUTLINE_KILL_CSS = /\boutline\s*:\s*(?:none|0)\b/gi;
const FOCUS_REPLACEMENT = /^(?:ring(?:-\d+|-\[[^\]]+\])?|outline(?:-\d+|-solid|-dashed|-double|-\[[^\]]+\])|shadow-\[.+\]|(?:border|outline)-[a-z]+-\d{2,3})$/;

// A class set that removes the outline: { set, kill, focusRing, visibleVariant }.
function outlineKills(ctx) {
  return memoOf(ctx, 'outlineKills', () => {
    const out = [];
    for (const set of ctx.shared.effectiveSets) {
      const toks = set.tokens.map(tailwindToken);
      const kill = toks.find((t) => /^outline-(?:none|hidden)$/.test(t.base) && !t.variants.includes('focus-visible'));
      if (!kill) continue;
      out.push({
        set,
        kill: [...kill.variants, kill.base].join(':'),
        focusRing: toks.some((t) => t.variants.includes('focus') && FOCUS_REPLACEMENT.test(t.base)),
        visibleRing: toks.some((t) => t.variants.includes('focus-visible') && FOCUS_REPLACEMENT.test(t.base)),
        visibleVariant: toks.some((t) => t.variants.includes('focus-visible')),
      });
    }
    return out;
  });
}

function outlineNoneHits(ctx) {
  const hits = matchHits(ctx.lines, OUTLINE_KILL_CSS);
  for (const k of outlineKills(ctx)) {
    if (!k.focusRing && !k.visibleRing) hits.push({ line: k.set.line, offset: k.set.start, evidence: k.kill });
  }
  return hits;
}

// The outline is replaced on :focus, so pointer focus paints the keyboard ring.
function focusRingNotVisibleHits(ctx) {
  return outlineKills(ctx)
    .filter((k) => k.focusRing && !k.visibleVariant)
    .map((k) => ({ line: k.set.line, offset: k.set.start, evidence: `${k.kill} with a focus: ring and no focus-visible: variant` }));
}

const VH_SHELL_CSS = /\b(?:height|min-height)\s*:\s*100vh\b/gi;

function vhShellHits(ctx) {
  const hits = matchHits(ctx.lines, VH_SHELL_CSS);
  for (const set of ctx.shared.classSets) {
    for (const raw of set.tokens) {
      const t = tailwindToken(raw);
      if (/^(?:min-)?h-screen$/.test(t.base) && !t.variants.some(isStateVariant)) hits.push({ line: set.line, evidence: raw, match: raw });
    }
  }
  return hits;
}

// D1, the literal form: one non-zero radius value three or more times. Values
// are compared in px (rem at 16px); the most repeated value is the finding.
function literalRadiusHits(ctx) {
  return matchHits(ctx.lines, /border-radius\s*:\s*(\d+(?:\.\d+)?)(px|rem)\b/gi)
    .map((h) => {
      const m = /(\d+(?:\.\d+)?)(px|rem)/i.exec(h.match);
      return { ...h, px: Number(m[1]) * (m[2].toLowerCase() === 'rem' ? 16 : 1) };
    })
    .filter((h) => h.px > 0);
}

// D1, the utility form: one radius class on three or more controls.
const CONTROL_TAG = /^(?:button|input|select|textarea|a)$/;
const RADIUS_UTILITY = /^rounded-(?:full|3xl|2xl|xl|lg|md)$/;

function utilityRadiusHits(ctx) {
  const hits = [];
  for (const set of matchingClassSets(ctx.shared.classSets, (tokens) => restingBases(tokens).some((b) => RADIUS_UTILITY.test(b)))) {
    if (!set.tag || !CONTROL_TAG.test(set.tag)) continue;
    const radius = restingBases(set.tokens).find((b) => RADIUS_UTILITY.test(b));
    hits.push({ line: set.line, offset: set.start, evidence: `<${set.tag}> ${radius}`, px: radius });
  }
  return hits;
}

// Keep the hits of the most repeated value (`px`), or none below three.
function mostRepeated(hits) {
  const groups = new Map();
  for (const h of hits) {
    if (!groups.has(h.px)) groups.set(h.px, []);
    groups.get(h.px).push(h);
  }
  const best = [...groups.values()].sort((a, b) => b.length - a.length)[0] || [];
  return best.length >= 3 ? best : [];
}

// The ui-craft radius leg of the framed-card trio is any rounded token; the
// border leg is a real border width (a colour-only class draws nothing).
function framedCards(ctx) {
  return framedCardSets(ctx.shared).map((c) => ({
    ...c, trio: c.devices.rounded && c.devices.border && c.devices.shadow,
  }));
}

// The same trio written in CSS: a padded block with a full border of 1px or
// more, a non-zero radius and an outer shadow. A state or pseudo-element rule,
// a control and the page root are not cards; one selector is one card.
const VISIBLE_BORDER = /\b(?:solid|dashed|dotted|double|groove|ridge|inset|outset)\b/;

function borderLeg(block, props) {
  const shorthand = decl(block, 'border');
  const value = shorthand !== undefined ? resolveVars(String(shorthand), props).toLowerCase() : null;
  const style = value ?? String(resolveVars(String(decl(block, 'border-style') ?? ''), props)).toLowerCase();
  if (!VISIBLE_BORDER.test(style)) return false;
  const width = value ? (/(?:^|\s)(\d*\.?\d+)px\b/.exec(value) || [])[1] : lengthPx(decl(block, 'border-width'), props);
  return width === undefined || Number(width) >= 1;
}

function outerShadow(block, props) {
  const v = decl(block, 'box-shadow');
  if (v === undefined) return false;
  const value = resolveVars(String(v), props).trim().toLowerCase();
  if (value === 'none') return false;
  return value.split(/,(?![^(]*\))/).some((s) => !/\binset\b/.test(s) && /[1-9]/.test(s));
}

function framedCardBlocks(ctx) {
  return memoOf(ctx, 'framedCardBlocks', () => {
    const props = ctx.shared.props;
    const bySelector = new Map();
    for (const block of ctx.shared.css.blocks) {
      const sel = String(block.selector || '');
      if (!sel || /:(?:hover|focus|active|visited|focus-visible|focus-within)|::?(?:before|after)/i.test(sel)) continue;
      if (/^(?:html|body|:root|\*)$/i.test(sel.trim()) || isControlSelector(sel)) continue;
      const padded = block.decls.some((d) => /^padding/.test(d.prop) && lengthPx(String(d.value).trim().split(/\s+/)[0], props) !== 0);
      if (!padded) continue;
      const radius = lengthPx(String(decl(block, 'border-radius') ?? '').trim().split(/\s+/)[0], props);
      const devices = { rounded: radius !== undefined && radius > 0, border: borderLeg(block, props), shadow: outerShadow(block, props) };
      if (!devices.rounded && !devices.border && !devices.shadow) continue;
      const trio = devices.rounded && devices.border && devices.shadow;
      const prev = bySelector.get(sel);
      if (!prev || (trio && !prev.trio)) bySelector.set(sel, { line: block.line, trio, devices, evidence: `${sel}: ${trio ? 'border + radius + shadow' : Object.keys(devices).filter((k) => devices[k]).join(' + ')}` });
    }
    return [...bySelector.values()].sort((a, b) => a.line - b.line);
  });
}

export const RULES = [
  // ---- colour -----------------------------------------------------------------
  {
    name: 'purple-gradient-default', tellRef: 'C5', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // The from- and to- halves must share one class set and one ternary arm, at
    // rest: two sibling elements are two elements, and a hover stop is a state.
    fileHits: purpleGradientHits,
    title: 'Banned default gradient (purple/indigo to pink, blue or teal)',
    why: 'C5: use one committed brand hue with depth -- a photograph, a product shot or a subject artefact behind it -- or a rare pairing the brand can defend. Never a flat grey field.',
  },
  {
    name: 'ai-purple-primary', tellRef: 'C3', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 2,
    // Property level, so one stray declaration does not establish "indigo IS the
    // palette". A utility counts only at rest: a hover or focus variant and a
    // `/10` tint are states and washes, not the brand.
    fileHits: aiPurpleHits,
    supersededBy: ['purple-gradient-default'],
    title: 'AI purple family as the palette (OKLCH hue 255-325 at chroma 0.15+)',
    why: 'C3: pick a hue outside the 255-325 arc and at least 30 OKLCH degrees from the default it replaces (catalogue replacement table), and document why this hue.',
  },
  {
    name: 'bootstrap-default-blue', tellRef: 'section 14', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 2,
    // Bootstrap 5's compiled literals reach shipped CSS only by leaving the build
    // unthemed. The `requires` gate is what makes "two together" true: the blue
    // is the leg only an unthemed build emits.
    requires: /#(?:0d6efd|0b5ed7)\b/i,
    pattern: /#(?:0d6efd|0b5ed7|dee2e6)\b/i,
    title: 'Unthemed Bootstrap compiled defaults shipped as the theme',
    why: 'Section 14, design-system integration drift: the framework theme layer left untouched. The blue itself is also C3 by hue (#0d6efd measures OKLCH hue 260 at chroma 0.23), which the C3 rule files on its own span. Theme the framework or pick a brand hue at least 30 OKLCH degrees away.',
  },
  {
    name: 'gradient-text', tellRef: 'V5', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    pattern: /bg-clip-text\s[^"']*text-transparent|text-transparent\s[^"']*bg-clip-text|-webkit-background-clip\s*:\s*text|\bbackground-clip\s*:\s*text/i,
    title: 'Gradient text on heading words',
    why: 'V5: carry the emphasis in the typography -- size contrast, weight contrast across the whole headline, or a serif/sans switch. Not one accented word, which is T15, the same reflex without the gradient.',
  },
  {
    name: 'neon-glow', tellRef: 'C18', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // A coloured glow a viewer can see: a soft neutral shadow, a token
    // definition, a hairline ring and a focus halo are not one.
    fileHits: (ctx) => glowHits(ctx.shared, { textShadow: true }),
    title: 'Neon/coloured glow shadow',
    why: 'C18: reserve glow for genuine emphasis and tune it to the brand, or drop the saturated halo. Keep the elevation step it was standing in for (design/07 section 1).',
  },
  {
    name: 'background-pattern', tellRef: 'V9', dimension: 'anti-ai',
    severity: 'LOW', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // A hairline grid or a dot field on a small pixel tile, or repeating stripes
    // that stop short of their length. One ruled line and a gradient that runs
    // its whole length paint once and are not a pattern.
    fileHits: (ctx) => backgroundPatternHits(ctx.shared),
    title: 'Dot, grid or stripe background pattern behind content',
    why: 'V9: let the surface carry the section with a solid tone, real imagery or space; a faint grid, dot field or stripe behind copy is template texture.',
  },
  {
    name: 'blur-blob', tellRef: 'C11', dimension: 'anti-ai',
    severity: 'LOW', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    classAll: [/^blur-(?:2xl|3xl)$/, 'rounded-full'],
    title: 'Decorative blur blob behind a section',
    why: 'C11: a solid block, a real photograph, a 2-5% grain texture, or the whitespace. The blob carries no information.',
  },
  {
    name: 'radial-halo', tellRef: 'C11', dimension: 'anti-ai',
    severity: 'LOW', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // The CSS form of the blob on a dark page: an opaque chromatic first stop
    // fading to transparent. A translucent wash and a 1px spot are not one.
    fileHits: (ctx) => radialHaloHits(ctx.shared),
    title: 'Saturated radial halo behind a section of a dark page',
    why: 'C11: ground the section with a solid or slightly shifted surface; if light must lead the eye, put it on the content rather than a halo behind it.',
  },
  {
    name: 'gray-on-color', tellRef: 'C7', dimension: 'visual',
    severity: 'MEDIUM', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // One colour declaration sets every line of secondary text on that surface,
    // so one instance fires (catalogue, How to apply). A hover tint, a grey
    // beside a coloured sibling and a ternary arm are not the pair.
    fileHits: (ctx) => grayOnColorHits(ctx.shared),
    title: 'Neutral mid-grey text on a chromatic surface',
    why: 'C7: tint the secondary text from the surface hue at lower chroma, or use the surface\'s own ink; neutral grey on colour reads muddy. Keep the contrast it already clears.',
  },
  {
    name: 'cream-serif-default', tellRef: 'cream-serif-sage', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 2,
    // Two distinct legs of the combination: cream + serif, cream + sage, serif +
    // sage, or serif + the warm-clay drift accent. Clay pairs only with the serif
    // display, and two hits of one leg are one leg (catalogue, The Tasteful Default).
    fileHits: (ctx) => creamLegHits(ctx.shared).map((h) => ({ ...h, match: h.evidence.slice(h.leg.length + 1) })),
    gate: creamCombination,
    title: 'Cream + serif + sage "tasteful default" combination',
    why: 'The top emerging tell: anchor colour and type to the real brand or a named reference. If warm-editorial cream-and-serif is a stated decision, keep it and mark the line `anti-slop-allow: <reason>`.',
  },

  // ---- typography ---------------------------------------------------------------
  {
    name: 'inter-as-primary', tellRef: 'T1', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // Inter, Inter Tight and the variable build; not Inter Display, which T1's
    // own Instead column recommends.
    fileHits: (ctx) => primaryFaceHits(ctx, new Set(['inter', 'intertight', 'intervariable', 'intervar']), /\bInter(?:_Tight)?\(\s*[{)]/g),
    title: 'Inter as the declared primary face',
    why: 'T1: Inter is the training-corpus median. Use it only as utility/UI fallback; pick a face with personality (GT America, Soehne, ABC Diatype, Author, Switzer, IBM Plex Sans) or the platform system stack as a deliberate house voice.',
  },
  {
    name: 'system-default-face-as-primary', tellRef: 'T2', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // A chosen Roboto, Helvetica or Arial primary. The platform system stack is
    // never this tell.
    fileHits: (ctx) => primaryFaceHits(ctx, new Set(['roboto', 'helvetica', 'helveticaneue', 'arial']), /\b(?:Roboto|Helvetica_Neue)\(\s*[{)]/g),
    title: 'Roboto / Helvetica / Arial as the declared primary face',
    why: 'T2: zero-risk defaults read as no decision. If a system font is the point, state it as an aesthetic position (system-as-honesty) via the platform stack, not via Arial as a fallback.',
  },
  {
    name: 'geist-unmodified', tellRef: 'T4', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    fileHits: (ctx) => primaryFaceHits(ctx, new Set(['geist', 'geistsans', 'geistmono']), /\bGeist(?:_Mono|_Sans)?\(\s*[{)]/g),
    title: 'Geist shipped unmodified',
    why: 'T4: Geist is fine if it suits the project -- override the font-feature-settings, weights and tracking so it does not read as the Vercel default, or pick something else.',
  },
  {
    name: 'uppercase-overline', tellRef: 'T5', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 3,
    // Strongest-10 row 4 at its 0.6.0 threshold: template chrome above three or
    // more headings, not one deliberate uppercase label. Severity is section
    // 18's escalation for the exact signature; T5's own class is MEDIUM.
    classAll: ['text-xs', 'uppercase', /^tracking-wid(?:er|est)$/],
    title: 'Tracked-out uppercase overline as template chrome (Strongest-10 #4)',
    why: 'T5: small-caps via `font-feature-settings: \'smcp\'` at `tracking-wide`, which keeps screen-reader pronunciation intact, or drop the overline and let the heading carry the section.',
  },
  {
    name: 'text-size-floor', tellRef: 'T12', dimension: 'accessibility',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    // Under 12px for running text, under 11px for functional text (links,
    // buttons, nav, labels, table cells), 10px for legal small print.
    fileHits: (ctx) => textSizeFloorHits(ctx.shared),
    title: 'Text below the 12px running / 11px functional floor',
    why: 'T12: set running text at 12px or more (16px for body) and functional text at 11px or more, 10px for legal small print; subordinate it with weight, colour or caps tracking instead of size.',
  },
  // T16 reading mechanics: one declaration governs every paragraph it styles,
  // so each is a finding on one instance (catalogue "How to apply").
  {
    name: 'tight-leading', tellRef: 'T16', dimension: 'visual',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    fileHits: (ctx) => tightLeadingHits(ctx.shared),
    title: 'Body leading under 1.3',
    why: 'T16: set body leading at 1.4 to 1.6; keep tight leading for display sizes and one-line labels.',
  },
  {
    name: 'wide-tracking', tellRef: 'T16', dimension: 'visual',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    fileHits: (ctx) => wideTrackingHits(ctx.shared),
    title: 'Running text tracked wider than 0.05em',
    why: 'T16: keep running-text tracking between -0.01em and 0.02em; open tracking belongs to short capitalised labels.',
  },
  {
    name: 'justified-narrow-column', tellRef: 'T16', dimension: 'visual',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    fileHits: (ctx) => justifiedNarrowHits(ctx.shared),
    title: 'Justified text in a column under 45 characters',
    why: 'T16: set the narrow column ragged-right, or keep justify with `hyphens: auto` and a `lang` attribute on a measure of 45 characters or more.',
  },
  {
    name: 'crushed-tracking', tellRef: 'T16', dimension: 'visual',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    // A wordmark, logo, brand or monogram selector is exempt.
    fileHits: (ctx) => crushedTrackingHits(ctx.shared),
    title: 'Letter-spacing tight enough that glyphs collide',
    why: 'T16: bring display tracking back onto the T8 ladder (-0.02em at 48px, -0.03em at 72px, never past -0.04em); tighter than -0.07em (-0.09em at 40px and up) the letters touch.',
  },
  {
    name: 'tailwind-hero-triplet', tellRef: 'Strongest-10 #9', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // Genericness signal, NOT a rule against responsive type: only the verbatim
    // unmodified run matches. A different scale, a tuned tracking or a fluid
    // clamp() ramp is a different string and stays clean.
    pattern: /\btext-4xl\s+sm:text-5xl\s+lg:text-6xl\s+font-bold\s+tracking-tight\b/,
    title: 'Verbatim Tailwind default hero type run',
    why: 'Strongest-10 #9: replace the stepped ramp with a fluid one and tune the tracking -- `font-size: clamp(2rem, 1rem + 5vw, 4.5rem); letter-spacing: -0.025em`. Never by removing the responsive sizing.',
  },

  // ---- component / shadcn --------------------------------------------------------
  {
    name: 'shadcn-default-card', tellRef: 'S3', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // The verbatim library class run, both generations of the radius token
    // (`rounded-lg` pre-v4, `rounded-xl` current). Different tell from
    // Strongest-10 #1: that row is the uniformity fingerprint of any framed-card
    // trio repeated across a surface.
    classAll: [/^rounded-(?:lg|xl)$/, 'border', 'bg-card', 'text-card-foreground', 'shadow-sm'],
    title: 'Unmodified shadcn Card primitive',
    why: 'S3: recompose -- borderless with a surface shift, full-bleed within the section, or a hairline divider -- or commit the frame deliberately (aesthetic/06 S3, S4). Do not answer it by removing containment from a data panel.',
  },
  {
    name: 'shadcn-init-tokens', tellRef: 'S1', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 2,
    // Both init generations: the current Tailwind v4 scaffold writes OKLCH
    // neutrals at --radius: 0.625rem, pre-v4 wrote the HSL values at 0.5rem.
    // OKLCH notation is not evidence of a tuned theme; these are the values.
    pattern: /--radius\s*:\s*0\.(?:625|5)rem\b|--(?:background|card|popover)\s*:\s*oklch\(\s*1\s+0\s+0\s*\)|--(?:foreground|card-foreground|popover-foreground)\s*:\s*oklch\(\s*0\.145\s+0\s+0\s*\)|--primary\s*:\s*oklch\(\s*0\.205\s+0\s+0\s*\)|--(?:border|input)\s*:\s*oklch\(\s*0\.922\s+0\s+0\s*\)|--ring\s*:\s*oklch\(\s*0\.708\s+0\s+0\s*\)|--muted-foreground\s*:\s*oklch\(\s*0\.556\s+0\s+0\s*\)|--(?:background|foreground|primary)\s*:\s*(?:0 0% 100%|222\.2 84% 4\.9%|222\.2 47\.4% 11\.2%)\b|"baseColor"\s*:\s*"(?:slate|zinc|gray|neutral|stone)"/i,
    title: 'Untouched shadcn init token block',
    why: 'S1: override --background, --foreground, --primary, --border/--input and --radius to the brand (catalogue "shadcn defaults that MUST be overridden"). Borders are 30% of the visual texture; tune them.',
  },
  {
    name: 'shadcn-stats-magic', tellRef: 'S12', dimension: 'anti-ai',
    severity: 'LOW', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    pattern: /\$45,?231\.89|\+20\.1%\s+from last month/i,
    title: 'shadcn dashboard example literals shipping as product figures',
    why: 'S12: real stats, real numbers, real comparison context (vs last week, vs target, vs benchmark). The exact value is in the model\'s training data as a fingerprint.',
  },
  {
    name: 'stock-illustration', tellRef: 'I7', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    pattern: /\b(?:undraw|storyset|drawkit|humaaans|blush\.design)\b/i,
    title: 'Generic flat-vector stock illustration',
    why: 'I7: commission or draw brand-specific illustration, use real product screenshots or photography, or use nothing. The unDraw / corporate-Memphis look is brandless.',
  },

  // ---- layout / composition ------------------------------------------------------
  {
    name: 'frosted-glass-nav', tellRef: 'L6', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    classAll: [/^backdrop-blur(?:-[a-z0-9]+)?$/, /^bg-(?:white|black|background)\/\d+$/, 'border-b'],
    title: 'Frosted-glass sticky navigation bar',
    why: 'L6: vary the nav height; drop the blur unless it is keeping type legible over moving content. A static header, a sidebar or a mega-menu are all valid -- not every site needs a sticky nav.',
  },
  {
    name: 'icon-in-tinted-container', tellRef: 'V1', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 3,
    // 0.6.0 threshold (Strongest-10 row 6): three or more identical tinted
    // wrappers. One framed icon is a choice, and a frame that encodes rarity,
    // class or state is substance (aesthetic/06 section 4).
    classAll: [
      /^rounded-(?:full|lg|xl|md)$/,
      /^bg-(?:[a-z]+-(?:50|100|200)|primary\/\d+|accent\/\d+|muted|secondary\/\d+)$/,
      /^(?:p-[1-4](?:\.5)?|[wh]-(?:10|12|14))$/,
    ],
    title: 'Identical tinted container behind every icon',
    why: 'V1: unwrapped icons at a consistent optical size aligned to the type baseline; if an icon needs emphasis put it in the stroke weight or the accent colour. The domain\'s own framed icons, where the frame encodes state, stay.',
  },
  {
    name: 'side-stripe-accent', tellRef: 'V3', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // User-banned on one instance. A neutral rule, a selection indicator and a
    // live region's severity edge are substance and stay clean.
    fileHits: (ctx) => sideStripeHits(ctx.shared),
    title: 'Coloured accent stripe on one side of a card',
    why: 'V3: carry the emphasis with a surface tint, a heading or real selection state; a coloured edge on one side of a card reads as the generated default. Keep selection indicators and severity edges, which are substance.',
  },
  {
    name: 'framed-card-trio', tellRef: 'Strongest-10 #1', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // A UNIFORMITY fingerprint at its 0.6.0 rescope: the border+shadow+radius
    // trio on every card of a surface with two or more cards, or on three or more
    // cards anywhere. One framed card is a choice, not this tell.
    fileHits: (ctx) => [...framedCards(ctx), ...framedCardBlocks(ctx)],
    gate: framedCardTrio,
    supersededBy: ['shadcn-default-card'],
    title: 'Border + shadow + radius trio on every card of the surface',
    why: 'Strongest-10 #1: commit the trio instead of deleting it -- a radius the system states, a border colour measured against both surfaces, an elevation step that differs by panel role (aesthetic/06 S3, S4). Removing containment from data panels is the flatter default, not a fix.',
  },

  // ---- fixed geometry (responsive) -------------------------------------------------
  {
    name: 'fixed-page-shell', tellRef: 'L13', dimension: 'responsive',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    // The lookbehind is the whole precision story: `max-width: 1200px` is the
    // CORRECT idiom (a cap, not a floor) and must never match, and an opening
    // paren means the value is a QUERY, not a declaration -- `@media (min-width:
    // 1024px)` and an `<img sizes="(min-width: 1024px) 50vw">` descriptor are
    // both correct responsive code. >= 600px means a content shell rather than a
    // control. A backtick means the declaration is being QUOTED, not written.
    pattern: /(?<![\w(`-])(?:width|min-width)\s*:\s*(?:[6-9]\d{2}|\d{4,})px/i,
    suppress: /@media|@container/i,
    title: 'Fixed-pixel page shell that cannot resize',
    why: 'L13: size from the content and the container -- `width: min(100% - 2rem, 72rem)`. The shell survives exactly the window it was authored against otherwise.',
  },
  {
    name: 'fixed-grid-tracks', tellRef: 'L13', dimension: 'responsive',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    pattern: /grid-template-(?:columns|rows)\s*:[^;{}]*\brepeat\(\s*\d+\s*,\s*\d*\.?\d+px\s*\)/i,
    title: 'Grid asserts fixed pixel column tracks',
    why: 'L13: `grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr))` so the column count falls out of the available space instead of being asserted.',
  },
  {
    name: 'no-viewport-meta', tellRef: 'L13', dimension: 'responsive',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    surface: 'document',
    fileHits: missingViewportMetaHits,
    title: 'No viewport meta tag in the document head',
    why: 'L13: `<meta name="viewport" content="width=device-width, initial-scale=1">`, without `user-scalable=no` (P4). Without it every mobile browser renders at a 980px canvas and scales down.',
  },
  {
    name: 'vh-viewport-shell', tellRef: 'P3', dimension: 'responsive',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    // File-scoped, not line-scoped: the progressive-enhancement idiom writes its
    // fallback on the NEXT line (`height: 100vh; height: 100dvh;`).
    fileHits: vhShellHits,
    unless: /100dvh|100svh|\b(?:min-)?h-(?:dvh|svh)\b/i,
    title: '100vh full-height shell on a mobile surface',
    why: 'P3: `100dvh` for a surface that tracks the visible viewport, `100svh` for one that must not reflow as the toolbar hides. `vh` resolves against the LARGEST viewport, so the last rows sit under the browser chrome.',
  },
  {
    name: 'fixed-bottom-bar-no-safe-area', tellRef: 'P3', dimension: 'responsive',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    fileHits: fixedBottomBarHits,
    title: 'Fixed bottom bar ignores the safe-area inset',
    why: 'P3: `padding-bottom: max(1rem, env(safe-area-inset-bottom))` on the bar, plus `viewport-fit=cover` in the viewport meta so the inset resolves to a real value.',
  },
  {
    name: 'viewport-query-for-component', tellRef: 'P1', dimension: 'responsive',
    severity: 'MEDIUM', confidence: CONFIDENCE.SMELL, mode: PRESENCE, heuristic: true,
    // Heuristic: a width media query that restyles a CLASS with a layout
    // property, in a file that declares no `container-type` anywhere. The same
    // card in a 280px sidebar and a 900px main column both see the window width.
    fileHits: viewportQueryForComponentHits,
    title: 'Component laid out by a viewport media query where a container query belongs',
    why: 'P1: `container-type: inline-size` on the host, then `@container (min-width: 28rem)`. Keep media queries for genuine page-shell changes; never answer this by deleting the query and shipping one fixed layout.',
  },

  // ---- deep cuts -----------------------------------------------------------------
  {
    name: 'uniform-literal-radius', tellRef: 'D1', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: CONCENTRATION, minCount: 3,
    // One non-zero value three or more times. A file that names a radius
    // identity is silenced outright: there is no "uncommitted default" where a
    // token states the decision.
    unless: /border-radius\s*:\s*var\(|--radius[-_a-z0-9]*\s*:/i,
    fileHits: literalRadiusHits,
    gate: mostRepeated,
    title: 'Repeated literal radius with no stated radius identity',
    why: 'D1: pick a radius identity and commit it as a token -- 0 (tactical), 2px (precise), 12px+ (soft) -- and reference it everywhere. The tell is the unexamined 8px/10px shadcn default on every control.',
  },
  {
    name: 'uniform-utility-radius', tellRef: 'D1', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: CONCENTRATION, minCount: 3,
    // The utility-class form of D1: one radius class on three or more controls in
    // a file that states no radius identity anywhere.
    unless: /--radius[-_a-z0-9]*\s*:|rounded-\[var\(|border-radius\s*:\s*var\(/i,
    fileHits: utilityRadiusHits,
    gate: mostRepeated,
    title: 'One radius utility on every control with no radius identity stated',
    why: 'D1: commit a radius as a token (--radius-control) and reference it; the unexamined maximal or default radius class on every control is the tell.',
  },
  {
    name: 'transition-all', tellRef: 'D2', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: CONCENTRATION, minCount: 3,
    pattern: /\btransition-all\b|transition\s*:\s*all[\s;]/i,
    title: 'transition-all animates every property, layout ones included',
    why: 'D2: name the properties -- `transition: background-color 150ms, transform 100ms`. Nothing about prefers-reduced-motion handling is touched by the fix.',
  },

  // ---- controls and accessibility ---------------------------------------------------
  {
    name: 'outline-none', tellRef: 'U3', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    // CSS `outline: none`, or an outline-none/outline-hidden utility whose class
    // set carries no focus ring to replace it. A ring on focus: without a
    // focus-visible: variant is U4 (focus-ring-not-visible), not this.
    fileHits: outlineNoneHits,
    unless: /:focus-visible|focus-visible:/,
    title: 'outline: none in a file that defines no :focus-visible ring',
    why: 'U3: replace the ring, never remove it (WCAG 2.4.7) -- a 2px `:focus-visible` ring in a brand colour at 2px offset, distinct from `:focus` and `:hover`.',
  },
  {
    name: 'focus-ring-not-visible', tellRef: 'U4', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    // `focus:outline-none focus:ring-2` keeps an indicator, so it is not U3;
    // `focus-visible:outline-none focus-visible:ring-2` is the pattern itself.
    fileHits: focusRingNotVisibleHits,
    title: 'Focus ring on :focus with no :focus-visible variant',
    why: 'U4: move the ring onto the focus-visible: variant (`focus-visible:outline-none focus-visible:ring-2`) so keyboard focus stays prominent and pointer focus quiet; keep the ring.',
  },
  {
    name: 'missing-alt', tellRef: 'WCAG 1.1.1', dimension: 'accessibility',
    severity: 'CRITICAL', confidence: CONFIDENCE.HARD, mode: PRESENCE,
    // `alt=""` on a decorative image is correct and deliberately unmatched.
    pattern: /<img\s(?![^>]*\balt\s*=)[^>]*>|\balt\s*=\s*["'](?:image|photo|picture|icon|graphic|img)["']/i,
    title: '<img> with no alt, or a placeholder alt value',
    why: 'WCAG 1.1.1 (accessibility/01-wcag-2-2.md): write what the image conveys; `alt=""` only when it is decorative. The catalogue platform rows do not carry this one -- the a11y reference does.',
  },
  {
    name: 'skipped-heading', tellRef: 'P9', dimension: 'accessibility',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    surface: 'document',
    // A level that drops more than one step below the one before it. A footer
    // whose first heading starts lower is not this tell.
    fileHits: (ctx) => skippedHeadingHits(ctx.shared),
    title: 'Heading level skipped for size',
    why: 'P9: use the next heading level and size it with CSS; the heading outline is how screen-reader users move through the page.',
  },
  // P16 against the surface each text colour is declared on. A pair within 0.3
  // of its bar is a note, below it a defect, and a ratio is never rounded up to
  // the bar. Placeholder text is measured: the near-bar rule reports it when the
  // field has a visible <label>.
  {
    name: 'low-contrast', tellRef: 'P16', dimension: 'accessibility',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    fileHits: (ctx) => contrastHits(ctx).filter((h) => !h.near),
    title: 'Text below WCAG AA contrast on its declared surface',
    why: 'P16: darken the text or the surface until the pair clears 4.5:1 (3:1 at 24px, or 18.66px bold); keep the hue and move only the lightness (WCAG 1.4.3).',
  },
  {
    name: 'viewport-zoom-lock', tellRef: 'P4', dimension: 'accessibility',
    severity: 'CRITICAL', confidence: CONFIDENCE.HARD, mode: PRESENCE,
    // Inside the viewport <meta> tag, in any attribute order: the word viewport
    // in prose before a quoted token is not the tag. Either blocking leg counts
    // once; maximum-scale=5 leaves zoom usable.
    pattern: /<meta\b(?=[^>]*\bname\s*=\s*["']?viewport\b)[^>]*?\bcontent\s*=\s*["'][^"'>]*?(?:user-scalable\s*=\s*(?:no|0)\b|maximum-scale\s*=\s*1(?:\.0+)?(?![\d.]))/i,
    title: 'Viewport meta blocks pinch zoom',
    why: 'P4: delete user-scalable and maximum-scale; `width=device-width, initial-scale=1` is the whole viewport meta (WCAG 1.4.4).',
  },
  {
    name: 'positive-tabindex', tellRef: 'P12', dimension: 'accessibility',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    // The lookbehind keeps `data-tabindex` and other attribute names out.
    pattern: /(?<![\w-])tabindex\s*=\s*[{"']*\s*[1-9]\d*\b/i,
    title: 'Positive tabindex overrides the natural focus order',
    why: 'P12: use `tabindex="0"` or none, and fix the DOM order so focus follows the reading order.',
  },
  {
    name: 'low-contrast-near-bar', tellRef: 'P16', dimension: 'accessibility',
    severity: 'LOW', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    fileHits: (ctx) => contrastHits(ctx).filter((h) => h.near),
    title: 'Text within 0.3 of the AA contrast bar',
    why: 'P16: move the lightness one more step so the pair clears its bar with margin; keep the hue and the surface.',
  },
  {
    name: 'icon-only-control-no-name', tellRef: 'U13', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.HARD, mode: PRESENCE,
    surface: 'markup',
    fileHits: iconOnlyControlHits,
    title: 'Icon-only control has no accessible name',
    why: 'U13: `aria-label="Close"` on the control, or visually hidden text inside it, with `aria-hidden="true"` on the decorative `<svg>`. WCAG 4.1.2 Name, Role, Value.',
  },
  {
    name: 'emoji-as-interface-chrome', tellRef: 'V12', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    surface: 'markup',
    fileHits: emojiChromeHits,
    title: 'Emoji used as interface chrome',
    why: 'V12: status dots, list bullets and button icons belong to the icon set or to a shaped token that also states the state in text. Emoji inside prose is not this tell.',
  },
  {
    name: 'dead-control', tellRef: 'section 15', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.HARD, mode: PRESENCE,
    // A handler with a real body and a comment explaining a deliberate no-op has
    // content after the comment and stays clean.
    pattern: /\bon(?:click|dblclick|change|input|submit|reset|focus|blur|key(?:down|up|press)|mouse(?:down|up|over|out|enter|leave|move)|touch(?:start|end|move)|pointer(?:down|up)|drag(?:start|end)?|drop|scroll|toggle|select|wheel|contextmenu|copy|paste|cut)\s*=\s*(?:"(?:\s|\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\/|\/\/[^"]*)*"|'(?:\s|\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\/)*'|\{\s*\(\s*\)\s*=>\s*(?:null|undefined|void 0|\{\s*(?:\/\/[^\n}]*|\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\/)?\s*\})\s*\})/i,
    title: 'Non-functional control (empty or comment-only handler)',
    why: 'Section 15: wire the control or remove it. A visible affordance that does not act is demo-ware -- the UI is a facade.',
  },

  // ---- motion -----------------------------------------------------------------------
  {
    name: 'slow-page-transition', tellRef: 'M3', dimension: 'anti-ai',
    severity: 'LOW', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    requires: /::view-transition|@view-transition/i,
    count: countSlowViewTransition,
    title: 'Cross-document page transition runs over 400ms',
    why: 'M3: 200-400ms for page changes, 100-200ms for component state, 50-100ms for hover. Over 400ms feels broken. Keep the transition, shorten it.',
  },
  {
    name: 'bounce-easing', tellRef: 'M2', dimension: 'motion',
    severity: 'MEDIUM', confidence: CONFIDENCE.SMELL, mode: PRESENCE, heuristic: true,
    // A candidate the auditor confirms against the action's gravity. A spring
    // token or a single overshoot that settles is the motion doctrine's own tool.
    fileHits: (ctx) => bounceEasingHits(ctx.shared),
    title: 'Bounce or elastic easing (candidate: match energy to the action)',
    why: 'M2: ease out with an exponential curve or a spring token that settles once (design/04); match the motion\'s energy to the action it confirms, and keep the reduced-motion handling as it is.',
  },
  {
    name: 'marquee', tellRef: 'M4', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // A <marquee>, or an infinite keyframes loop that carries a row sideways by
    // a fifth of its width or more. A finite slide-in is not one.
    fileHits: (ctx) => marqueeHits(ctx.shared),
    title: 'Marquee that scrolls forever with no pause control',
    why: 'M4: show the items as a static row, or scroll only on demand with a visible pause control (WCAG 2.2.2); perpetual motion taxes attention and battery.',
  },
  {
    name: 'pulsing-dot', tellRef: 'V11', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    fileHits: (ctx) => pulsingDotHits(ctx.shared),
    title: 'Pulsing status dot',
    why: 'V11: let liveness show in the content (rows arriving, a timestamp updating); if the brief asks for a live badge, mark the line `anti-slop-allow: <reason>`.',
  },

  // ---- copy ---------------------------------------------------------------------------
  // The copy rules read the text a user sees: string literals and JSX text in
  // script, the text between tags in markup, prose in markdown. An identifier
  // (`computeLeverage`) or a class name is not copy.
  {
    name: 'lorem-ipsum', tellRef: 'W1', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.HARD, mode: PRESENCE,
    // The "the future of X" leg is scoped to the TAGLINE position -- the whole
    // text of a heading -- because the bare phrase is ordinary English: this
    // plugin's own `## 6. APCA -- the future of contrast` is not a tell.
    fileHits: loremHits,
    title: 'Placeholder or "the future of X" copy',
    why: 'W1: all content real, or marked `[PLACEHOLDER]`. Lorem ipsum in production is a CRITICAL bug.',
  },
  {
    name: 'hype-copy', tellRef: 'W2', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: CONCENTRATION, minCount: 2,
    copy: true,
    pattern: /\bTransform your\b|\bSupercharge\b|\bUnleash\b|\bEffortlessly\b|take your [^.]{0,30}to the next level/i,
    title: 'Vague benefit copy / marketing hype in the UI',
    why: 'W2: specific verbs and objects. "Cut deploy time from 12 minutes to 90 seconds" beats "streamline deploys".',
  },
  {
    name: 'saas-speak-microcopy', tellRef: 'W5', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: CONCENTRATION, minCount: 2,
    copy: true,
    pattern: /\bJoin thousands of\b|\bStay in the loop\b|\bWe['\u2019]re here to help\b|\bUnlock the power of\b|\bTransform the way you\b|\bcollaborate seamlessly\b|\bleverage (?:your|our|the power of)\b|\bsupercharge your\b/i,
    title: 'Generic SaaS-speak microcopy (says nothing about the product)',
    why: 'W5: plain, specific verbs. "Edit the same doc together" beats "collaborate seamlessly"; "Connect your GitHub account" beats "Experience seamless integration".',
  },
  {
    name: 'onboarding-speed-copy', tellRef: 'W9', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    copy: true,
    pattern: /\bGet started (?:today|in seconds|in minutes)\b/i,
    title: 'Speed-reflex onboarding copy with no actual onboarding',
    why: 'W9: be honest about the time cost -- "5-minute setup, no credit card" with the actual signup form one click away.',
  },
  {
    name: 'generic-dashboard-greeting', tellRef: 'W10', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    copy: true,
    pattern: /\bWelcome back[!,]/i,
    title: 'Generic dashboard greeting instead of the user\'s own data',
    why: 'W10: show the user something only they would see -- "Your last build deployed 3 hours ago", "2 PRs await review". Recognition is data, not a greeting.',
  },
  {
    name: 'hero-scroll-hint', tellRef: 'design/10 section 3', dimension: 'anti-ai',
    severity: 'LOW', confidence: CONFIDENCE.TASTE, mode: PRESENCE,
    copy: true,
    // The suppress guard keeps it off an accessible name, where the stated
    // remediation would delete screen-reader output.
    pattern: /\bScroll to explore\b|\bScroll down to\b/i,
    suppress: /aria-label|alt\s*=/i,
    title: 'Hero scroll-indicator microcopy (the scroll-chevron patch)',
    why: 'design/10 section 3: a hero that terminates exactly at the fold invites the scroll-chevron patch, itself a tell. Size the hero so the next section peeks -- `min-height: min(88svh, 60rem)` -- rather than captioning the scrollbar.',
  },

  // ---- token drift ---------------------------------------------------------------------
  {
    name: 'token-drift-spacing', tellRef: 'section 14', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: CONCENTRATION, minCount: 2,
    // Only fires where there IS a scale to drift from: the file must declare two
    // or more --space tokens. There is no drift without a scale.
    requires: /--space[-_a-z0-9]*\s*:/i, requiresMinCount: 2,
    count: countOffScaleSpacing,
    title: 'Raw spacing values bypass the file\'s own --space token scale',
    why: 'Section 14: use the design tokens. AI writes `padding: 12px` when the system defines `--space-300: 12px`; one project found 418 hardcoded values across 28 files.',
  },
  {
    name: 'design-system-font', tellRef: 'section 14', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE, heuristic: true,
    // A primary face outside the typography the nearest DESIGN.md declares. A
    // system stack never counts, nothing fires without a declared typography,
    // and a test, fixture or story file below the DESIGN.md is not the product.
    fileHits: designSystemFontFindings,
    title: 'Face set outside the typography DESIGN.md declares (candidate)',
    why: 'Section 14: use a family DESIGN.md declares, or add the face to DESIGN.md typography with the reason it was chosen.',
  },

  // ---- the 0.6.0 rows ---------------------------------------------------------------------
  {
    name: 'template-chrome-strings', tellRef: 'T15', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 3,
    surface: 'markup',
    fileHits: templateChromeHits,
    title: 'Template chrome strings (middot meta runs, dashed labels, arrowed links, one accented word)',
    why: 'T15: meta fields separated by space, a vertical-rule token or a list; labels as plain phrases; links that say where they go; headline emphasis carried by the whole line, never by one accented word.',
  },
  {
    name: 'prose-blob-above-primary', tellRef: 'W11', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE, heuristic: true,
    surface: 'document',
    fileHits: proseBlobHits,
    title: 'Prose blob above the primary content',
    why: 'W11: the product first -- H1, identity block, one lede, one action. Explanation, methodology and search copy move below the primary content into a headed section, behind a `details` whose summary names its content, or onto their own route.',
  },
  {
    name: 'no-real-imagery', tellRef: 'I8', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE, heuristic: true,
    surface: 'document',
    fileHits: noRealImageryHits,
    title: 'No real imagery on a page built from icon cards',
    why: 'I8: show the real product -- screenshots, photography, the domain\'s own icons on every entity row, commissioned illustration. Floor: one real image or figure per two sections (aesthetic/06 S6).',
  },
  {
    name: 'mono-on-ui-text', tellRef: 'T13', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 3, heuristic: true,
    // Heuristic: three or more monospace family declarations in one file that
    // are not on code, logs, raw payloads or a readonly field. The catalogue
    // grades the confirmed tell CRITICAL; the scanner files the candidate so a
    // review cannot lose it to which files the auditor happened to read. The
    // auditor confirms which rules sit on human-readable text.
    pattern: /font-family\s*:\s*[^;{}]*?(?:var\(--font-mono\)|\b(?:ui-monospace|monospace|JetBrains Mono|Fira Code|IBM Plex Mono|SF Mono|Source Code Pro|Roboto Mono|Space Mono|Geist Mono|Menlo|Consolas)\b)|class(?:Name)?\s*=\s*["'{`][^"'`}]*\bfont-mono\b/i,
    suppress: /--font-mono\s*:|\b(?:pre|code|kbd|samp|textarea|readonly|logs?|payload|hash|terminal|hljs|prism|shiki)\b/i,
    title: 'Monospace on human-readable UI text (candidate)',
    why: 'T13: mono only for genuine code, logs, raw payloads, hex/IDs and terminal UIs. On readouts, labels, buttons and table cells the sans with `font-variant-numeric: tabular-nums` keeps the digits aligned, and weight and colour carry the hierarchy; delete the family declaration, change nothing else in the rule.',
  },
  {
    name: 'flat-terminal-candidate', tellRef: 'V13', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.SMELL, mode: PRESENCE, heuristic: true,
    fileHits: flatTerminalHits,
    title: 'Flat-terminal subtraction-only system (candidate)',
    why: 'V13: the surface can be described entirely by what it does not do. Restore one device per job from aesthetic/06 section 6 -- a real elevation step, a boundary that measures against both surfaces, a chromatic accent with a second role. `scripts/measure_substance.js` measures the three numbers on a live page; this is the static candidate, not the measurement.',
  },
];

// --- file-level analysers -------------------------------------------------------

// A spacing property must start at a token boundary, so `--card-padding: 13px`
// (a token definition) and `scroll-padding` are not spacing, while the legacy
// `grid-gap` aliases are. A quoted value ends at its closing quote and a bare one
// before the next key of a JS object, so `padding: '16px', fontSize: '13px'`
// reads one value, not three.
const SPACING_DECLARATION =
  /(?<![\w-])(?:grid-)?(?:padding|margin|gap|row-gap|column-gap|inset)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?\s*:\s*(?:(["'`])(.*?)\1|((?:(?!,\s*[A-Za-z_$][\w$-]*\s*:)[^;{}\n])*))/gi;

/** Off-4px-grid spacing (the `count` predicate for token-drift-spacing). */
export function countOffScaleSpacing(line) {
  const declarations = new RegExp(SPACING_DECLARATION.source, SPACING_DECLARATION.flags);
  let hits = 0;
  let declaration;
  while ((declaration = declarations.exec(line)) !== null) {
    if (declaration[0].length === 0) { declarations.lastIndex += 1; continue; }
    const value = declaration[2] ?? declaration[3] ?? '';
    // A value routed through the design system -- var(--space-3), clamp(),
    // calc() on a token -- is the correct idiom and is what the rule wants.
    if (/var\(|clamp\(|calc\(/i.test(value)) continue;
    for (const px of value.matchAll(/(\d+(?:\.\d+)?)px/g)) {
      const n = Number(px[1]);
      // 1px and 2px are on-scale by construction: hairline borders and 2px
      // offsets are not spacing decisions.
      if (n > 2 && n % 4 !== 0) hits += 1;
    }
  }
  return hits;
}

function countSlowViewTransition(line) {
  let hits = 0;
  for (const m of line.matchAll(/animation-duration\s*:\s*(\d+(?:\.\d+)?)(ms|s)\b/gi)) {
    const ms = m[2].toLowerCase() === 's' ? Number(m[1]) * 1000 : Number(m[1]);
    if (ms > 400) hits += 1;
  }
  return hits;
}

const TAGLINE = /(?:<h[1-3]\b[^>]*>|^\s*#{1,3}\s+)\s*(?:["'\u201C]?)[Tt]he future of\b/g;

function loremHits(ctx) {
  return [
    ...matchHits(copyLines(ctx), /\blorem ipsum\b/gi),
    ...matchHits(ctx.lines, TAGLINE),
  ].sort((a, b) => a.line - b.line);
}

function missingViewportMetaHits(ctx) {
  if (!/<head[\s>]/i.test(ctx.text)) return [];
  if (/<meta\s[^>]*name\s*=\s*["']viewport["']/i.test(ctx.text)) return [];
  const idx = ctx.text.search(/<head[\s>]/i);
  return [{ line: ctx.lineOf(idx), evidence: '<head> with no <meta name="viewport">' }];
}

const SAFE_AREA_TOKEN = /^(?:p[by]?-(?:safe|\[[^\]]*env\(safe-area-inset-bottom[^\]]*\])|pb-safe|[\w-]*safe-area[\w-]*)$/;

function fixedBottomBarHits(ctx) {
  // The inset may be handled once, globally, on the same element's padding.
  if (/env\(\s*safe-area-inset-bottom/i.test(ctx.text)) return [];
  const hits = [];
  // A CSS rule block that pins itself to the bottom edge. The block, not the
  // line: `position: fixed` and `bottom: 0` are usually separate declarations.
  for (const m of ctx.text.matchAll(/\{([^{}]*)\}/g)) {
    const block = m[1];
    if (!/position\s*:\s*fixed/i.test(block)) continue;
    if (!/\bbottom\s*:\s*0\b/i.test(block)) continue;
    hits.push({ line: ctx.lineOf(m.index), evidence: snippet(block) });
  }
  // The utility form: `fixed` and `bottom-0` in one class set at rest.
  hits.push(...classSetHits(ctx, (tokens) => {
    const bases = restingBases(tokens);
    return bases.includes('fixed') && bases.includes('bottom-0');
  }));
  if (ctx.shared.classSets.some((s) => s.tokens.some((t) => SAFE_AREA_TOKEN.test(tailwindToken(t).base)))) return [];
  return hits.sort((a, b) => a.line - b.line).slice(0, 1);
}

function viewportQueryForComponentHits(ctx) {
  // A file that already uses container queries has made the distinction; the
  // remaining media queries are the page-shell ones the catalogue keeps.
  if (/container-type\s*:/i.test(ctx.text)) return [];
  const hits = [];
  const re = /@media\s*\(([^)]*(?:min|max)-width[^)]*)\)\s*\{/gi;
  let m;
  while ((m = re.exec(ctx.text)) !== null) {
    if (/prefers-/i.test(m[1])) continue;
    const block = braceBlock(ctx.text, m.index + m[0].length - 1);
    if (block === null) continue;
    // Only a class selector: an element or shell selector (body, main, .page,
    // .app, .shell, .layout, .container) is the page-level case media queries
    // are for.
    const selectors = [...block.matchAll(/(^|[{}])\s*([^{}@]{1,120}?)\s*\{/g)].map((s) => s[2].trim());
    const componentSelectors = selectors.filter(
      (s) => /^\.[a-z]/i.test(s) && !/^\.(?:page|app|shell|layout|container|wrapper|root|grid)\b/i.test(s),
    );
    if (!componentSelectors.length) continue;
    if (!/(?:display|grid-template-columns|grid-template-areas|flex-direction)\s*:/i.test(block)) continue;
    hits.push({
      line: ctx.lineOf(m.index),
      evidence: `@media (${m[1].trim()}) restyles ${componentSelectors.slice(0, 3).join(', ')}`,
    });
  }
  return hits.slice(0, 1);
}

/** The text of the balanced `{...}` block starting at `openIndex`. */
function braceBlock(content, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < content.length; i++) {
    if (content[i] === '{') depth += 1;
    else if (content[i] === '}') {
      depth -= 1;
      if (depth === 0) return content.slice(openIndex + 1, i);
    }
  }
  return null;
}

// The end of the tag that starts at `start` (`<button ...>`), skipping quoted
// values and JSX braces, so `onClick={() => close()}` does not end the tag.
function tagEnd(text, start) {
  let depth = 0;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (depth === 0 && (c === '"' || c === "'")) {
      const j = text.indexOf(c, i + 1);
      if (j === -1) return -1;
      i = j;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0) return i;
  }
  return -1;
}

const ACCESSIBLE_NAME_ATTR = /\b(?:aria-label|aria-labelledby|title)\s*=\s*(?:"[^"]+"|'[^']+'|\{[^}]+\})/i;

function iconOnlyControlHits(ctx) {
  const hits = [];
  const text = ctx.text;
  for (const m of text.matchAll(/<(button|a)\b/gi)) {
    const end = tagEnd(text, m.index);
    if (end === -1) continue;
    const attrs = text.slice(m.index + m[0].length, end);
    if (/\/\s*$/.test(attrs)) continue;
    const close = new RegExp(`</${m[1]}\\s*>`, 'i').exec(text.slice(end + 1, end + 601));
    if (!close) continue;
    const inner = text.slice(end + 1, end + 1 + close.index);
    if (!/<(?:svg|i|use|img)\b/i.test(inner)) continue;
    if (decodeEntities(stripTags(inner)).trim().length) continue;
    if (ACCESSIBLE_NAME_ATTR.test(attrs)) continue;
    // A spread can carry the name; the scan cannot see it, so it does not guess.
    if (/\{\s*\.\.\./.test(attrs)) continue;
    if (/<title\b/i.test(inner)) continue;
    if (/\b(?:sr-only|visually-hidden|visuallyhidden|screen-reader-text)\b/i.test(inner)) continue;
    if (/\balt\s*=\s*["'][^"']+["']/i.test(inner)) continue;
    hits.push({
      line: ctx.lineOf(m.index),
      evidence: snippet(`<${m[1]}${attrs}> with only ${(inner.match(/<(svg|i|use|img)\b/i) || [])[0] || 'an icon'}`),
    });
  }
  return hits;
}

// Unicode's definition of an emoji, not a block list (ported from anti-slop
// rules.mjs EMOJI_ATOM): a character with default emoji presentation, a
// pictograph forced to emoji presentation by U+FE0F, a keycap sequence, or a
// flag. A bare text-presentation glyph (a plain arrow, a copyright sign) is
// typography, not this tell.
const EMOJI_ATOM =
  '(?:(?:\\p{Regional_Indicator}{2}|[0-9#*]\\uFE0F?\\u20E3|\\p{Extended_Pictographic}\\uFE0F|\\p{Emoji_Presentation})\\p{Emoji_Modifier}?)' +
  '(?:\\u200D(?:\\p{Extended_Pictographic}\\uFE0F?|\\p{Emoji_Presentation})\\p{Emoji_Modifier}?)*';

function emojiChromeHits(ctx) {
  // The tell is emoji AS UI, so paragraph bodies are blanked first (emoji in
  // copy is explicitly not this tell). Line count is preserved so line numbers
  // hold, and numeric character references are decoded per line so
  // `&#x1F680;` and the literal glyph are the same finding.
  const chrome = ctx.text.replace(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi, (whole) =>
    whole.replace(/[^\n]/g, ' '));
  const re = new RegExp(EMOJI_ATOM, 'gu');
  const hits = [];
  chrome.split('\n').forEach((line, i) => {
    const rendered = line.replace(/&#x([0-9a-f]+);/gi, (_, h) => safeFromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => safeFromCodePoint(Number(d)));
    re.lastIndex = 0;
    if (re.test(rendered)) hits.push({ line: i + 1, evidence: snippet(line) });
  });
  return hits;
}

// An <img> buried under an opacity below 0.1 is texture, not imagery.
function buriedImage(tag) {
  const style = /\bstyle\s*=\s*["'][^"']*\bopacity\s*:\s*(0?\.\d+|0)\s*(?:[;"'])/i.exec(tag);
  if (style && Number(style[1]) < 0.1) return true;
  const cls = /\bclass(?:Name)?\s*=\s*["']([^"']*)["']/i.exec(tag);
  if (!cls) return false;
  return cls[1].split(/\s+/).some((raw) => {
    const t = tailwindToken(raw);
    if (!isResting(t)) return false;
    const m = /^opacity-(?:(\d+)|\[(0?\.\d+|0)\])$/.exec(t.base);
    if (!m) return false;
    return m[1] !== undefined ? Number(m[1]) / 100 < 0.1 : Number(m[2]) < 0.1;
  });
}

function countSectionsAndImagery(text) {
  const sections = (text.match(/<section\b/gi) || []).length;
  const imgs = text.match(/<img\b[^>]*>/gi) || [];
  const imagery = imgs.filter((tag) => !buriedImage(tag)).length +
    (text.match(/<(?:picture|figure|video|canvas)\b/gi) || []).length;
  const inlineIcons = (text.match(/<svg\b/gi) || []).length;
  return { sections, imagery, inlineIcons };
}

function noRealImageryHits(ctx) {
  const { sections, imagery, inlineIcons } = countSectionsAndImagery(ctx.text);
  // The catalogue row is "every section is icon-cards, abstract shapes and type,
  // with zero screenshots, photographs, product shots or commissioned
  // illustration". The icon leg is load-bearing: two prose-and-data sections
  // with no imagery is a reference page, not the icon-card page this row names.
  if (sections < 2 || imagery > 0 || inlineIcons < 1) return [];
  const idx = ctx.text.search(/<section\b/i);
  return [{
    line: ctx.lineOf(idx),
    evidence: `${sections} sections, ${inlineIcons} inline icons, 0 img/picture/figure/video/canvas`,
  }];
}

function proseBlobHits(ctx) {
  const budget = LEDE_BUDGET[ctx.surface];
  if (!Number.isFinite(budget)) return [];
  // The primary content element: the first table, form, entity list (a ul/ol
  // carrying two or more items), chart root, or non-nav control. `dl` is
  // deliberately excluded -- a definition list is most often the identity/fact
  // block W11's own remediation keeps above the fold.
  const text = pageText(ctx);
  const primary = firstPrimaryElement(text);
  if (primary === null) return [];
  let words = 0;
  let firstLine = null;
  for (const m of text.slice(0, primary.index).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)) {
    if (insideTag(text, m.index, 'nav')) continue;
    const n = wordCount(stripTags(m[1]));
    if (n === 0) continue;
    if (firstLine === null) firstLine = ctx.lineOf(m.index);
    words += n;
  }
  if (words <= budget) return [];
  return [{
    line: firstLine ?? 1,
    evidence: `${words} words of running prose above the first <${primary.tag}> (${ctx.surface} budget: ${budget})`,
  }];
}

function firstPrimaryElement(content) {
  const candidates = [];
  for (const m of content.matchAll(/<(table|form|canvas|select|textarea|button|input)\b/gi)) {
    if (insideTag(content, m.index, 'nav')) continue;
    candidates.push({ index: m.index, tag: m[1].toLowerCase() });
  }
  for (const m of content.matchAll(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)) {
    if (insideTag(content, m.index, 'nav')) continue;
    if ((m[2].match(/<li\b/gi) || []).length < 2) continue;
    candidates.push({ index: m.index, tag: m[1].toLowerCase() });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0];
}

/** Is `index` inside an open `<tag>...</tag>` pair? */
function insideTag(content, index, tag) {
  const before = content.slice(0, index);
  const opens = (before.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
  const closes = (before.match(new RegExp(`</${tag}\\s*>`, 'gi')) || []).length;
  return opens > closes;
}

const HEADING_ACCENT = /<(h[12])\b[^>]*>([\s\S]{0,400}?)<\/\1\s*>/gi;

function templateChromeHits(ctx) {
  const text = pageText(ctx);
  const hits = [];
  const push = (index, evidence, accent) => hits.push({ line: ctx.lineOf(index), evidence, accent });

  // 1. ` A - B - C ` middle-dot meta runs, literal or as a character reference.
  for (const m of text.matchAll(/(?:\s|>)(?:&middot;|&#183;|&#xB7;|\u00B7)(?:\s|<)/gi)) {
    push(m.index, 'middle-dot separator between meta fields', false);
  }
  // 2. A spaced em dash inside a short label (not inside running prose).
  for (const m of text.matchAll(/<(span|button|a|dt|th|li|h[1-6])\b[^>]*>([^<]{0,80}?\s(?:\u2014|&mdash;)\s[^<]{0,80}?)<\/\1\s*>/gi)) {
    push(m.index, snippet(`spaced em dash inside <${m[1]}>: ${m[2]}`), false);
  }
  // 3. An arrow appended to link or button text.
  for (const m of text.matchAll(/<(a|button)\b[^>]*>([^<]*(?:\u2192|&rarr;|&#8594;|&#x2192;)[^<]*)<\/\1\s*>/gi)) {
    push(m.index, snippet(`arrow inside <${m[1]}> text: ${m[2]}`), false);
  }
  // 4. A span/em wrapping ONE word of an h1/h2 with its own class. Heuristic:
  //    a static scan cannot tell a brand wordmark from template chrome, so it is
  //    counted toward the concentration bar and never fires alone. The auditor
  //    still applies the presence leg by eye.
  for (const h of text.matchAll(globalize(HEADING_ACCENT))) {
    for (const s of h[2].matchAll(/<(span|em|strong|b|i)\b[^>]*\bclass(?:Name)?\s*=\s*["'][^"']+["'][^>]*>([^<]+)<\/\1\s*>/gi)) {
      if (wordCount(s[2]) !== 1) continue;
      push(h.index, snippet(`one accented word in <${h[1]}>: ${s[2]}`), true);
    }
  }
  return hits.sort((a, b) => a.line - b.line);
}

function flatTerminalHits(ctx) {
  if (!ctx.hasStyles) return [];
  const text = ctx.text;
  const tokens = ctx.tokens;

  // 1. Every boundary is a hairline at alpha 0.10 or below, and there are at
  //    least two of them (one border is not a boundary system).
  const borders = [];
  for (const m of text.matchAll(/(?:^|[;{\s])border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?\s*:\s*([^;{}]+)/gi)) {
    const value = m[1].trim();
    if (/^(?:none|0|0px|unset|initial|inherit)$/i.test(value)) continue;
    borders.push({ index: m.index, value });
  }
  if (borders.length < 2) return [];
  for (const b of borders) {
    if (alphaOf(resolveValue(b.value, tokens)) > 0.10) return [];
  }

  // 2. No elevation and no rim anywhere.
  if (/box-shadow\s*:\s*(?!none\b)[^;]/i.test(text)) return [];
  if (/\binset\b/i.test(text)) return [];

  // 3. Only the platform's own families: a stated brand face is a decision.
  const families = [...text.matchAll(/font-family\s*:\s*([^;{}]+)/gi)];
  if (!families.length) return [];
  for (const f of families) {
    for (const entry of f[1].split(',')) {
      const name = entry.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
      if (!name || name.startsWith('var(')) continue;
      if (!SYSTEM_FAMILIES.has(name)) return [];
    }
  }

  // 4. No chromatic accent above chroma 0.10. A token whose NAME says status is
  //    excluded: V13's signature is colour reserved for status with the accent
  //    stripped, so the status legs are part of the pattern.
  for (const m of text.matchAll(/(--[a-z0-9_-]+\s*:\s*)?oklch\(\s*[0-9.]+%?\s+([0-9.]+)/gi)) {
    const declared = m[1] ? m[1].match(/--[a-z0-9_-]+/)[0] : null;
    if (declared && STATUS_TOKEN.test(declared)) continue;
    if (Number(m[2]) > 0.10) return [];
  }

  return [{
    line: ctx.lineOf(borders[0].index),
    evidence: `every boundary a hairline at alpha <= 0.10 (${borders.length} borders), no elevation or rim, system stack only, no accent above chroma 0.10`,
  }];
}

const TEST_PATH = /\.(?:test|spec)\.[mc]?[jt]sx?$|(?:^|\/)(?:__tests__|__mocks__|fixtures|e2e)\/|\.stories\.[mc]?[jt]sx?$/i;

// The path is read relative to the DESIGN.md's own directory, so a fixture
// directory that carries its own DESIGN.md is in scope while a repo-root
// DESIGN.md does not describe the fixtures under it.
function designSystemFontFindings(ctx) {
  const ds = ctx.shared.designSystem;
  if (!ds) return [];
  const rel = relative(dirname(ds.path), resolve(ctx.path)).split('\\').join('/');
  if (TEST_PATH.test(rel)) return [];
  return designSystemFontHits(ctx.shared);
}

function designSystemOf(path, opts) {
  if (opts.designSystem !== undefined) return opts.designSystem;
  try {
    return readDesignSystem(findDesignMd(path));
  } catch {
    return null;
  }
}

// --- the scan ---------------------------------------------------------------------

// A scoped waiver may name a rule or its catalogue code.
const KNOWN_WAIVER_IDS = new Set([
  ...RULES.map((r) => r.name),
  ...RULES.map((r) => r.tellRef).filter((t) => !/\s/.test(t)),
]);

function waiverAt(ctx, line, knownIds) {
  const key = `waiver:${line}`;
  return memoOf(ctx, key, () => parseWaiver(ctx.rawLines[line - 1] ?? '', knownIds));
}

function waived(ctx, line, rule, knownIds) {
  for (const n of [line, line - 1]) {
    if (n < 1) continue;
    const w = waiverAt(ctx, n, knownIds);
    if (waiverCovers(w, rule.name) || waiverCovers(w, rule.tellRef)) return true;
  }
  return false;
}

function unknownWaivers(ctx, knownIds) {
  const out = [];
  ctx.rawLines.forEach((raw, i) => {
    if (!ESCAPE_HATCH.test(raw)) return;
    const w = waiverAt(ctx, i + 1, knownIds);
    if (w && w.unknown && w.unknown.length) out.push({ line: i + 1, unknown: w.unknown });
  });
  return out;
}

function fileGuardOk(rule, ctx) {
  if (rule.unless && rule.unless.test(ctx.text)) return false;
  if (rule.requires) {
    const found = ctx.text.match(globalize(rule.requires));
    if (!found || found.length < (rule.requiresMinCount || 1)) return false;
  }
  return true;
}

function rawHits(rule, ctx) {
  if (rule.fileHits) return rule.fileHits(ctx) || [];
  if (rule.classAll) return classAllHits(ctx, rule.classAll, rule.suppress);
  const lines = rule.copy ? copyLines(ctx) : ctx.lines;
  const hits = [];
  if (rule.count) {
    lines.forEach((line, i) => {
      if (rule.suppress && rule.suppress.test(ctx.lines[i] ?? line)) return;
      const n = rule.count(line);
      for (let k = 0; k < n; k++) hits.push({ line: i + 1, evidence: snippet(line) });
    });
    return hits;
  }
  return matchHits(lines, rule.pattern).filter((h) => !(rule.suppress && rule.suppress.test(ctx.lines[h.line - 1] ?? '')));
}

function lineStarts(ctx) {
  return memoOf(ctx, 'lineStarts', () => {
    const starts = [0];
    for (let i = 0; i < ctx.content.length; i++) if (ctx.content.charCodeAt(i) === 10) starts.push(i + 1);
    return starts;
  });
}

// { line, column, match }: where an occurrence starts and the text it matched,
// or nulls where a detector reports a construct rather than a literal span.
function occurrenceOf(ctx, h) {
  if (typeof h.match === 'string' && Number.isInteger(h.column)) return { line: h.line, column: h.column, match: h.match };
  const raw = ctx.rawLines[h.line - 1] ?? '';
  if (Number.isInteger(h.offset)) {
    const start = lineStarts(ctx)[h.line - 1] ?? 0;
    const column = h.offset - start + 1;
    return { line: h.line, column, match: raw.slice(column - 1).trimEnd() || null };
  }
  const literal = typeof h.match === 'string' ? h.match : (typeof h.evidence === 'string' ? h.evidence : '');
  const at = literal ? raw.indexOf(literal) : -1;
  return at >= 0 ? { line: h.line, column: at + 1, match: literal } : { line: h.line, column: null, match: null };
}

function buildContext(path, content, surface, designSystem) {
  const ext = extname(path).toLowerCase();
  const shared = makeContext(content, ext, { designSystem });
  const text = shared.text;
  const isDocument = ext === '.html' || ext === '.htm' || (!DOC_EXT.has(ext) && /<html[\s>]/i.test(text));
  const ctx = {
    path,
    ext,
    content,
    surface,
    shared,
    text,
    rawLines: shared.rawLines,
    isDocument,
    isMarkup: isDocument || MARKUP_SURFACE_EXT.has(ext),
    hasStyles: STYLE_EXT.has(ext) || /<style[\s>]/i.test(text),
    memo: new Map(),
  };
  Object.defineProperty(ctx, 'lines', { get: () => shared.lines });
  Object.defineProperty(ctx, 'lineOf', { get: () => shared.lineOf });
  Object.defineProperty(ctx, 'tokens', { get: () => memoOf(ctx, 'tokens', () => collectTokens(text)) });
  return ctx;
}

function runsOn(rule, ctx) {
  if (rule.surface === 'document') return ctx.isDocument;
  if (rule.surface === 'markup') return ctx.isMarkup;
  return true;
}

// Coverage notes: what a clean result on this file type did not look at.
const COMPONENT_EXT = new Set([...SCRIPT_EXT, '.vue', '.svelte', '.astro']);
const DECLARED_CSS_RULES = new Set([
  'low-contrast', 'low-contrast-near-bar', 'text-size-floor', 'tight-leading',
  'wide-tracking', 'justified-narrow-column', 'crushed-tracking',
]);
const PURPLE_RULES = new Set(['ai-purple-primary', 'purple-gradient-default']);
const COVERAGE_NOTES = {
  document: 'page-level rules run on HTML documents only',
  markup: 'markup rules run on files that hold elements (html, jsx, tsx, vue, svelte, astro, mdx)',
  stylesheet: 'markup rules do not apply to a stylesheet',
  declaredCss: 'contrast and type metrics read declared CSS, inline styles and CSS-in-JS only; Tailwind utilities and cross-file cascades are not resolved',
};

function coverageOf(ctx, active, notRun) {
  const out = [];
  if (!(MARKUP_EXT.has(ctx.ext) || SCRIPT_EXT.has(ctx.ext) || STYLE_EXT.has(ctx.ext))) return out;
  if (STYLE_EXT.has(ctx.ext)) {
    if (notRun.length) out.push({ note: COVERAGE_NOTES.stylesheet, rules: notRun.map((r) => r.name) });
  } else {
    for (const surface of ['markup', 'document']) {
      const rules = notRun.filter((r) => r.surface === surface).map((r) => r.name);
      if (rules.length) out.push({ note: COVERAGE_NOTES[surface], rules });
    }
  }
  if (COMPONENT_EXT.has(ctx.ext)) {
    const rules = active.filter((r) => DECLARED_CSS_RULES.has(r.name)).map((r) => r.name);
    if (rules.length) out.push({ note: COVERAGE_NOTES.declaredCss, rules });
  }
  const ds = ctx.shared.designSystem;
  if (ds && ds.purpleArc && ds.purpleArc.length) {
    const rules = active.filter((r) => PURPLE_RULES.has(r.name)).map((r) => r.name);
    const names = ds.purpleArc.map((c) => `${c.name} (${c.hex})`).join(', ');
    const shown = relative(process.cwd(), ds.path);
    const where = shown && !shown.startsWith('..') ? shown : ds.path;
    if (rules.length) out.push({ note: `purple palette: ${where} declares ${names}; purple within 15 degrees of its hue is the palette`, rules });
  }
  return out;
}

function toSet(value) {
  if (!value) return null;
  return value instanceof Set ? value : new Set(value);
}

/**
 * Scan one file's content. Returns `{ findings, suppressed, coverage, waivers }`.
 * Exported so the harness and the design hook can scan without shelling out.
 * opts.surface      control | content | marketing | article (default content)
 * opts.only         a Set (or array) of rule names: run only these
 * opts.knownWaiverIds  ids a scoped waiver may name (default: every rule name
 *                   and every one-word catalogue code)
 * opts.designSystem the file's DESIGN.md as readDesignSystem() returns it, or
 *                   null for none (default: the nearest DESIGN.md above the file)
 */
export function scanContent(path, content, opts = {}) {
  const empty = { findings: [], suppressed: 0, coverage: [], waivers: [] };
  // Binary read as UTF-8 carries a NUL byte; no rule applies to it.
  if (content.includes('\u0000')) return empty;
  const only = toSet(opts.only);
  const knownIds = toSet(opts.knownWaiverIds) || KNOWN_WAIVER_IDS;
  const ctx = buildContext(path, content, opts.surface || 'content', designSystemOf(path, opts));
  const active = RULES.filter((r) => !only || only.has(r.name));
  const needed = new Set(active.map((r) => r.name));
  for (const r of active) for (const n of r.supersededBy || []) needed.add(n);

  // Pass 1: raw hits per rule, so `supersededBy` can drop a hit that another
  // rule already reports on the same line (catalogue "One finding per span").
  const hitsByRule = new Map();
  const notRun = [];
  for (const rule of RULES) {
    if (!needed.has(rule.name)) continue;
    if (!runsOn(rule, ctx)) {
      if (active.includes(rule)) notRun.push(rule);
      hitsByRule.set(rule.name, []);
      continue;
    }
    hitsByRule.set(rule.name, fileGuardOk(rule, ctx) ? rawHits(rule, ctx).filter((h) => Number.isInteger(h.line)) : []);
  }

  // Pass 2: waivers, gates, supersession, thresholds.
  const findings = [];
  let suppressed = 0;
  for (const rule of active) {
    let hits = hitsByRule.get(rule.name) || [];
    if (!hits.length) continue;

    const before = hits.length;
    hits = hits.filter((h) => !waived(ctx, h.line, rule, knownIds));
    suppressed += before - hits.length;
    if (rule.gate) hits = rule.gate(hits);
    if (!hits.length) continue;
    hits = [...hits].sort((a, b) => a.line - b.line || (a.column ?? 0) - (b.column ?? 0));

    // Supersession removes the REPORTED span, not the evidence of repetition:
    // a card that is already an S3 finding still counts as a framed card when
    // the surface's uniformity is being judged, which is why the count is taken
    // before the filter for concentration rules.
    const count = hits.length;
    let reportable = hits;
    if (rule.supersededBy) {
      const covered = new Set();
      for (const name of rule.supersededBy) {
        for (const h of hitsByRule.get(name) || []) covered.add(h.line);
      }
      reportable = hits.filter((h) => !covered.has(h.line));
    }

    const threshold = rule.mode === CONCENTRATION ? rule.minCount : 1;
    const effective = rule.supersededBy && rule.mode === CONCENTRATION ? reportable.length : count;
    if (effective < threshold) continue;
    if (!reportable.length) continue;

    const first = reportable[0];
    // T15's single-word accent leg is a candidate; a run carried by it alone is
    // reported as one.
    const heuristic = rule.name === 'template-chrome-strings'
      ? reportable.every((h) => h.accent)
      : Boolean(rule.heuristic);
    findings.push({
      id: `${rule.dimension}-${rule.name}`,
      dimension: rule.dimension,
      severity: rule.severity,
      confidence: rule.confidence,
      file: basename(path),
      path,
      line: first.line,
      title: rule.title,
      evidence: count > 1
        ? `${count} occurrences; first at line ${first.line}: ${first.evidence}`
        : first.evidence,
      tellRef: rule.tellRef,
      heuristic,
      remediation: rule.why,
      occurrences: reportable.map((h) => occurrenceOf(ctx, h)),
    });
  }

  findings.sort((a, b) =>
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.line - b.line);
  return { findings, suppressed, coverage: coverageOf(ctx, active, notRun), waivers: unknownWaivers(ctx, knownIds) };
}

/** Scan one file from disk. Throws a usage Error (with `reason`) for anything unreadable. */
export function scanFile(path, opts = {}) {
  let st;
  try {
    st = statSync(path);
  } catch {
    throw usageError(`no such file: ${path}`, 'no such file');
  }
  if (st.isDirectory()) throw usageError(`not a file (directories are not scanned): ${path}`, 'directory');
  if (!st.isFile()) throw usageError(`not a regular file: ${path}`, 'not a regular file');
  const ext = extname(path).toLowerCase();
  if (!SUPPORTED_EXT.has(ext)) {
    throw usageError(
      `unsupported file type ${ext || '(none)'}: ${path} (supported: ${[...SUPPORTED_EXT].join(', ')})`,
      `unsupported file type ${ext || '(none)'}`,
    );
  }
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    throw usageError(`unreadable: ${path}`, 'unreadable');
  }
  return scanContent(path, content, opts);
}

/**
 * Scan a list of files. A path that cannot be scanned is listed under `skipped`
 * with its reason and the rest are scanned. Returns
 * `{ summary, findings, coverage, skipped, waivers }`.
 */
export function scanFiles(paths, opts = {}) {
  const findings = [];
  const skipped = [];
  const waivers = [];
  const coverage = new Map();
  let suppressed = 0;
  let scanned = 0;
  for (const p of [...new Set(paths)]) {
    let r;
    try {
      r = scanFile(p, opts);
    } catch (err) {
      if (!err.usage) throw err;
      skipped.push({ file: p, reason: err.reason || err.message });
      continue;
    }
    scanned += 1;
    findings.push(...r.findings);
    suppressed += r.suppressed;
    for (const w of r.waivers) waivers.push({ file: p, ...w });
    for (const c of r.coverage) {
      const key = `${c.note}|${c.rules.join(',')}`;
      if (!coverage.has(key)) coverage.set(key, { note: c.note, rules: c.rules, files: [] });
      coverage.get(key).files.push(p);
    }
  }
  return { summary: summarise(scanned, findings, suppressed), findings, coverage: [...coverage.values()], skipped, waivers };
}

function summarise(files, findings, suppressed) {
  const bySeverity = {};
  const byTell = {};
  for (const s of SEVERITY_ORDER) bySeverity[s] = 0;
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    byTell[f.tellRef] = (byTell[f.tellRef] || 0) + 1;
  }
  return { files, findings: findings.length, suppressed, bySeverity, byTell };
}

/** Every catalogue code this scan claims to cover. */
export const COVERED_TELLS = Object.freeze([...new Set(RULES.map((r) => r.tellRef))].sort());

function usageError(message, reason) {
  const err = new Error(message);
  err.usage = true;
  if (reason) err.reason = reason;
  return err;
}

// --- CLI -----------------------------------------------------------------------

const FAIL_LEVELS = {
  any: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'TASTE'],
  high: ['CRITICAL', 'HIGH'],
  medium: ['CRITICAL', 'HIGH', 'MEDIUM'],
  low: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
  none: [],
};

const USAGE =
  'Usage: node scripts/scan_tells.mjs <file...> [--format text|json] ' +
  '[--fail-on any|high|medium|low|none] [--surface control|content|marketing|article]';

const COVERAGE_FLOOR = 'A clean result is a floor: a static scan of declared source, not a rendered page.';

export function parseArgs(argv) {
  const opts = { format: 'text', failOn: 'any', surface: 'content', files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--format' || a === '--fail-on' || a === '--surface') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw usageError(`${a} needs a value`);
      i += 1;
      if (a === '--format') {
        if (value !== 'text' && value !== 'json') throw usageError(`--format must be text or json`);
        opts.format = value;
      } else if (a === '--fail-on') {
        if (!(value in FAIL_LEVELS)) throw usageError(`--fail-on must be one of ${Object.keys(FAIL_LEVELS).join(', ')}`);
        opts.failOn = value;
      } else {
        if (!(value in LEDE_BUDGET)) throw usageError(`--surface must be one of ${Object.keys(LEDE_BUDGET).join(', ')}`);
        opts.surface = value;
      }
      continue;
    }
    if (a === '-h' || a === '--help') throw usageError(USAGE);
    if (a.startsWith('--')) throw usageError(`unknown flag: ${a}`);
    opts.files.push(a);
  }
  if (!opts.files.length) throw usageError(USAGE);
  return opts;
}

function render(result, format) {
  if (format === 'json') {
    const { summary, findings, coverage, skipped } = result;
    return JSON.stringify({ summary, findings, coverage, skipped }, null, 2) + '\n';
  }
  const lines = result.findings.map(
    (f) => `[${f.severity}] ${f.tellRef} ${f.file}:${f.line} ${f.title}`,
  );
  const s = result.summary;
  const counts = SEVERITY_ORDER.filter((k) => s.bySeverity[k])
    .map((k) => `${k} ${s.bySeverity[k]}`)
    .join('  ');
  lines.push(
    `${s.files} file(s), ${s.findings} finding(s), ${s.suppressed} suppressed` +
    (counts ? ` -- ${counts}` : ''),
  );
  return lines.join('\n') + '\n';
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return 2;
  }
  const result = scanFiles(opts.files, { surface: opts.surface });
  for (const s of result.skipped) process.stderr.write(`skipped: ${s.file} (${s.reason})\n`);
  if (result.summary.files === 0) {
    process.stderr.write(`no file could be scanned (supported: ${[...SUPPORTED_EXT].join(', ')})\n`);
    return 2;
  }
  for (const w of result.waivers) {
    process.stderr.write(`${w.file}:${w.line}: anti-slop-allow names unknown id(s) ${w.unknown.join(', ')}; the waiver suppresses nothing\n`);
  }
  for (const c of result.coverage) {
    process.stderr.write(`coverage: ${c.note}: ${c.rules.join(', ')} (${c.files.length} file(s))\n`);
  }
  if (result.coverage.length) process.stderr.write(`${COVERAGE_FLOOR}\n`);
  process.stdout.write(render(result, opts.format));
  const failing = new Set(FAIL_LEVELS[opts.failOn]);
  return result.findings.some((f) => failing.has(f.severity)) ? 1 : 0;
}

const invokedDirectly = process.argv[1] && /scan_tells\.mjs$/.test(process.argv[1]);
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
