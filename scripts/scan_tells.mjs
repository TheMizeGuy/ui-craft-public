#!/usr/bin/env node
/**
 * scan_tells.mjs -- a deterministic, zero-dependency scan for the subset of
 * `references/catalogue/01-ai-tells.md` that a regular expression can honestly
 * decide on its own.
 *
 * WHAT THIS IS NOT. It is not the auditor. The catalogue is 99 base tells plus
 * the platform, deep-cut, fingerprint and Strongest-10 rows, and most of them
 * need a reading of the surface that no regex has. This file covers the rows
 * whose signature IS a string -- a verbatim library class run, a banned literal,
 * a fixed geometry value, a missing attribute -- and stays silent on the rest.
 * A green run here means "none of the mechanical tells matched", never "this
 * surface is clean". `agents/ui-anti-slop-auditor.md` still walks the catalogue.
 *
 * PROVENANCE. The design-rule table, the four confidence classes, the
 * presence/concentration firing modes, the unordered class-token matcher, the
 * per-line `suppress` and per-file `requires` / `unless` guards, and the
 * `anti-slop-allow` escape hatch are ported from the `anti-slop` plugin
 * (same owner, MIT): `scripts/lib/rules.mjs` (DESIGN_PATTERNS) and
 * `scripts/lib/scan.mjs`. Every ported rule is re-keyed here to the ui-craft
 * catalogue code it maps to, re-severitied against catalogue section 18, and
 * re-thresholded against the catalogue's own "How to apply: presence vs
 * concentration" rules -- including the 0.6.0 rescope of Strongest-10 rows 1, 4
 * and 6, which fire on a repeated signature rather than on one instance.
 *
 * SEVERITY. From catalogue section 18, for the tell the rule reports. Where a
 * rule matches the exact CSS signature of a Strongest-10 row, section 18's
 * escalation for that row applies. A row section 18 does not name (D2, W9, W10)
 * takes MEDIUM, the class its neighbours carry.
 *
 * CONFIDENCE. The four classes of `references/review/01-universal-rubric.md`:
 * Hard defect (missing alt, dead control, icon-only control with no name, lorem
 * ipsum), Quality defect (D1, D2, U3, L13, P3, the copy literals, token drift),
 * Pattern smell (most), Taste note (the hero scroll hint).
 *
 * REMEDIATION FLOOR. Every rule here is narrow enough that the cheapest way to
 * clear it is not to delete responsive, accessible or motion-preference
 * behaviour (catalogue "The remediation floor"). `tailwind-hero-triplet` matches
 * only the verbatim unmodified run; `vh-viewport-shell` is silenced by a
 * `100dvh`/`100svh` fallback anywhere in the file; `outline-none` is silenced by
 * a `:focus-visible` ring anywhere in the file.
 *
 * Usage:
 *   node scripts/scan_tells.mjs <file...> [--format text|json]
 *                               [--fail-on any|high|medium|low|none]
 *                               [--surface control|content|marketing|article]
 *
 * Files only: a directory argument is a usage error. Exit 0 clean, 1 findings at
 * or above the fail level (default `any`), 2 usage error.
 */

import { readFileSync, statSync } from 'node:fs';
import { extname, basename } from 'node:path';

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
// reviewer to honour ("honor any line marked `anti-slop-allow: <reason>`"). The
// marker counts on the line itself OR on the line above it, so it can sit on a
// comment over the construct as well as beside it.
export const ESCAPE_HATCH = /(?:anti-slop-allow|unslop-ignore)\b/i;

// Surfaces this scan reads. Markdown is included because the plugin dogfoods
// itself: a reference file's fenced examples are the same markup the rules read.
const SUPPORTED_EXT = new Set([
  '.html', '.htm', '.css', '.jsx', '.tsx', '.js', '.ts', '.mjs', '.cjs',
  '.mts', '.cts', '.svelte', '.vue', '.md', '.mdx',
]);

// The lede budget above the primary content, per surface, from
// `references/design/12-copy-placement-and-volume.md` section 3. "One line or
// none" on a control surface is read as 15 words. An article has no bar, so W11
// never fires there.
const LEDE_BUDGET = { control: 15, content: 40, marketing: 25, article: Infinity };

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

function lineOfIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) if (content[i] === '\n') line += 1;
  return line;
}

function snippet(text, max = 160) {
  const one = String(text).replace(/\s+/g, ' ').trim();
  return one.length > max ? one.slice(0, max - 3) + '...' : one;
}

// --- class-attribute token sets (ported from anti-slop scan.mjs) --------------
// Utility-class order inside a `class=` attribute is arbitrary, so a fingerprint
// rule matches the token SET, not a sequence, and is scoped to one attribute
// value so it can never span two sibling elements.

const CLASS_ATTR = /\b(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*`([^`]*)`\s*\}|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\})/g;

function classTokenSets(line) {
  const sets = [];
  const re = globalize(CLASS_ATTR);
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(line)) !== null) {
    const value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '';
    sets.push(value.split(/\s+/).filter(Boolean));
  }
  return sets;
}

function tokenSetHas(tokens, req) {
  return typeof req === 'string' ? tokens.includes(req) : tokens.some((t) => req.test(t));
}

function countClassAll(line, required) {
  let hits = 0;
  for (const tokens of classTokenSets(line)) {
    if (required.every((req) => tokenSetHas(tokens, req))) hits += 1;
  }
  return hits;
}

// --- colour helpers (the V13 candidate) --------------------------------------

function collectTokens(content) {
  const tokens = new Map();
  for (const m of content.matchAll(/(--[a-z0-9_-]+)\s*:\s*([^;{}]+)/gi)) {
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
//   dimension  the review dimension (labels.json: L13/P1/P3 are responsive,
//              WCAG rows are accessibility, catalogue rows are anti-ai)
//   severity   catalogue section 18
//   confidence review/01-universal-rubric.md
//   mode       PRESENCE, or CONCENTRATION + minCount
//   title      the finding title
//   why        the remediation, so no finding can be closed by deletion
//   pattern | classAll | count | fileHits   how it matches
//   suppress   per-line guard: a line matching it is a correct use
//   requires / requiresMinCount / unless    per-file guards
//   supersededBy  rule names whose hit on the SAME LINE silences this one
//                 (catalogue "One finding per span")
//   markupOnly    skip on files that are not an HTML document
//   heuristic     the rule states a candidate, not a match

export const RULES = [
  // ---- colour -----------------------------------------------------------------
  {
    name: 'purple-gradient-default', tellRef: 'C5', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    pattern: /from-(?:indigo|purple|violet|fuchsia)-\d+\s+(?:via-[a-z]+-\d+\s+)?to-(?:blue|indigo|purple|violet|pink|fuchsia|cyan|sky|teal)-\d+|linear-gradient\([^)]*#(?:6366f1|7c3aed|8b5cf6|a855f7|9333ea|d946ef|ec4899)[^)]*\)/i,
    title: 'Banned default gradient (purple/indigo to pink, blue or teal)',
    why: 'C5: use one committed brand hue with depth -- a photograph, a product shot or a subject artefact behind it -- or a rare pairing the brand can defend. Never a flat grey field.',
  },
  {
    name: 'ai-purple-primary', tellRef: 'C3', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 2,
    // Hue 255-325 at chroma >= 0.15 is the catalogue's window; these are the
    // measured hexes and the Tailwind class names that land inside it. Property
    // level, so one stray declaration does not establish "indigo IS the palette".
    pattern: /#(?:6366f1|4f46e5|818cf8|7c3aed|6d28d9|8b5cf6|a855f7|9333ea|7e22ce|c026d3|d946ef|3b82f6|0d6efd|0b5ed7|0a58ca)\b|\b(?:bg|text|from|via|to|border|ring|fill|stroke|decoration|outline)-(?:indigo|violet|purple|fuchsia)-(?:400|500|600|700|800)\b/i,
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
    pattern: /shadow-\[0_0_|drop-shadow-\[0_0_|box-shadow\s*:[^;]*\b0\s+0\s+\d{2,}px/i,
    title: 'Neon/coloured glow shadow',
    why: 'C18: reserve glow for genuine emphasis and tune it to the brand, or drop the saturated halo. Keep the elevation step it was standing in for (design/07 section 1).',
  },
  {
    name: 'blur-blob', tellRef: 'C11', dimension: 'anti-ai',
    severity: 'LOW', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    classAll: [/^blur-(?:2xl|3xl)$/, 'rounded-full'],
    title: 'Decorative blur blob behind a section',
    why: 'C11: a solid block, a real photograph, a 2-5% grain texture, or the whitespace. The blob carries no information.',
  },
  {
    name: 'cream-serif-default', tellRef: 'cream-serif-sage', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 2,
    // "The signal is the combination -- any two of {cream background, serif
    // display, sage green}. One alone may be a real decision." minCount 2 is
    // that sentence, enforced. The accent leg carries both the sage and the
    // 2026 rusty-orange/terracotta drift the catalogue records.
    pattern: /#(?:faf8f5|f5f1e8|f3eee3|f7f3ec|faf6ef|f6f1e7|fbf7f0|f4efe4)\b|\bbg-(?:stone|amber|orange)-(?:50|100)\b|\b(?:Instrument\s*Serif|Fraunces|Playfair\s*Display|Cormorant|Spectral|DM\s*Serif)\b|\b(?:text|bg|border|ring|decoration)-(?:orange|amber)-(?:600|700|800)\b|#(?:15573a|b7410e|c2410c|9a3412|a0522d|d97757)\b/i,
    title: 'Cream + serif + sage "tasteful default" combination',
    why: 'The top emerging tell: anchor colour and type to the real brand or a named reference. If warm-editorial cream-and-serif is a stated decision, keep it and mark the line `anti-slop-allow: <reason>`.',
  },

  // ---- typography ---------------------------------------------------------------
  {
    name: 'inter-as-primary', tellRef: 'T1', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // Only the `font-family:` declaration and the next/font constructor call, so
    // the word in body copy stays clean. `'Inter Tight'` is the same family.
    pattern: /font-family\s*:\s*(?:[^;{}]*[,\s])?['"]?Inter\b|\bInter(?:_Tight)?\s*\(/,
    title: 'Inter as the declared primary face',
    why: 'T1: Inter is the training-corpus median. Use it only as utility/UI fallback; pick a face with personality (GT America, Soehne, ABC Diatype, Author, Switzer, IBM Plex Sans) or the platform system stack as a deliberate house voice.',
  },
  {
    name: 'system-default-face-as-primary', tellRef: 'T2', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    pattern: /font-family\s*:\s*['"]?(?:Roboto|Helvetica(?:\s*Neue)?|Arial)\b|\b(?:Roboto|Helvetica_Neue)\s*\(/,
    title: 'Roboto / Helvetica / Arial as the declared primary face',
    why: 'T2: zero-risk defaults read as no decision. If a system font is the point, state it as an aesthetic position (system-as-honesty) via the platform stack, not via Arial as a fallback.',
  },
  {
    name: 'geist-unmodified', tellRef: 'T4', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    pattern: /font-family\s*:\s*['"]?Geist\b|\bGeist(?:_Mono|_Sans)?\s*\(/,
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
    name: 'framed-card-trio', tellRef: 'Strongest-10 #1', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE,
    // Threshold logic lives in `fileHits` because the row is a UNIFORMITY
    // fingerprint at its 0.6.0 rescope: it fires when the border+shadow+radius
    // trio sits on every card of a surface with two or more cards, or on three
    // or more cards anywhere. One framed card is a choice, not this tell.
    fileHits: framedCardTrioHits,
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
    // both correct responsive code and both reached this rule before the paren
    // was excluded. >= 600px means a content shell rather than a control.
    // A backtick means the declaration is being QUOTED, not written: this
    // plugin's own responsive/02 discusses "a `min-width: 768px` query" and is
    // not shipping a fixed shell.
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
    markupOnly: true,
    fileHits: missingViewportMetaHits,
    title: 'No viewport meta tag in the document head',
    why: 'L13: `<meta name="viewport" content="width=device-width, initial-scale=1">`, without `user-scalable=no` (P4). Without it every mobile browser renders at a 980px canvas and scales down.',
  },
  {
    name: 'vh-viewport-shell', tellRef: 'P3', dimension: 'responsive',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    // File-scoped, not line-scoped: the progressive-enhancement idiom writes its
    // fallback on the NEXT line (`height: 100vh; height: 100dvh;`).
    pattern: /\b(?:height|min-height)\s*:\s*100vh\b/i,
    unless: /100dvh|100svh/i,
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
    // A file that names a radius identity is silenced outright: there is no
    // "uncommitted default" where a token states the decision.
    unless: /border-radius\s*:\s*var\(|--radius[-_a-z0-9]*\s*:/i,
    pattern: /border-radius\s*:\s*\d+(?:\.\d+)?(?:px|rem)\b/i,
    title: 'Repeated literal radius with no stated radius identity',
    why: 'D1: pick a radius identity and commit it as a token -- 0 (tactical), 2px (precise), 12px+ (soft) -- and reference it everywhere. The tell is the unexamined 8px/10px shadcn default on every control.',
  },
  {
    name: 'uniform-utility-radius', tellRef: 'D1', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: CONCENTRATION, minCount: 3,
    // The utility-class form of D1: one radius class (rounded-full, rounded-lg, ...)
    // on three or more controls in a file that states no radius identity anywhere
    // (no --radius token, no rounded-[var(...)] reference). A committed language
    // names its radius; the tell is the maximal or default class on every control.
    unless: /--radius[-_a-z0-9]*\s*:|rounded-\[var\(|border-radius\s*:\s*var\(/i,
    pattern: /<(?:button|input|select|textarea|a)\b[^>]*\bclass="[^"]*\brounded-(?:full|3xl|2xl|xl|lg|md)\b/i,
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
    pattern: /\boutline\s*:\s*(?:none|0)\b/i,
    unless: /:focus-visible|focus-visible:/,
    title: 'outline: none in a file that defines no :focus-visible ring',
    why: 'U3: replace the ring, never remove it (WCAG 2.4.7) -- a 2px `:focus-visible` ring in a brand colour at 2px offset, distinct from `:focus` and `:hover`.',
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
    name: 'icon-only-control-no-name', tellRef: 'U13', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.HARD, mode: PRESENCE,
    markupOnly: true,
    fileHits: iconOnlyControlHits,
    title: 'Icon-only control has no accessible name',
    why: 'U13: `aria-label="Close"` on the control, or visually hidden text inside it, with `aria-hidden="true"` on the decorative `<svg>`. WCAG 4.1.2 Name, Role, Value.',
  },
  {
    name: 'emoji-as-interface-chrome', tellRef: 'V12', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    markupOnly: true,
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

  // ---- copy ---------------------------------------------------------------------------
  {
    name: 'lorem-ipsum', tellRef: 'W1', dimension: 'anti-ai',
    severity: 'CRITICAL', confidence: CONFIDENCE.HARD, mode: PRESENCE,
    // The "the future of X" leg is scoped to the TAGLINE position -- the whole
    // text of a heading -- because the bare phrase is ordinary English: this
    // plugin's own `## 6. APCA -- the future of contrast` is not a tell, and a
    // rule that says it is teaches people to ignore the scanner.
    pattern: /\blorem ipsum\b|(?:<h[1-3]\b[^>]*>|^\s*#{1,3}\s+)\s*(?:["'\u201C]?)[Tt]he future of\b/i,
    title: 'Placeholder or "the future of X" copy',
    why: 'W1: all content real, or marked `[PLACEHOLDER]`. Lorem ipsum in production is a CRITICAL bug.',
  },
  {
    name: 'hype-copy', tellRef: 'W2', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    pattern: /\bTransform your\b|\bSupercharge\b|\bUnleash\b|\bEffortlessly\b|take your [^.]{0,30}to the next level/i,
    title: 'Vague benefit copy / marketing hype in the UI',
    why: 'W2: specific verbs and objects. "Cut deploy time from 12 minutes to 90 seconds" beats "streamline deploys".',
  },
  {
    name: 'saas-speak-microcopy', tellRef: 'W5', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    pattern: /\bJoin thousands of\b|\bStay in the loop\b|\bWe['\u2019]re here to help\b|\bUnlock the power of\b|\bTransform the way you\b|\bcollaborate seamlessly\b|\bleverage\b|\bsupercharge your\b/i,
    title: 'Generic SaaS-speak microcopy (says nothing about the product)',
    why: 'W5: plain, specific verbs. "Edit the same doc together" beats "collaborate seamlessly"; "Connect your GitHub account" beats "Experience seamless integration".',
  },
  {
    name: 'onboarding-speed-copy', tellRef: 'W9', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    pattern: /\bGet started (?:today|in seconds|in minutes)\b/i,
    title: 'Speed-reflex onboarding copy with no actual onboarding',
    why: 'W9: be honest about the time cost -- "5-minute setup, no credit card" with the actual signup form one click away.',
  },
  {
    name: 'generic-dashboard-greeting', tellRef: 'W10', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.QUALITY, mode: PRESENCE,
    pattern: /\bWelcome back[!,]/i,
    title: 'Generic dashboard greeting instead of the user\'s own data',
    why: 'W10: show the user something only they would see -- "Your last build deployed 3 hours ago", "2 PRs await review". Recognition is data, not a greeting.',
  },
  {
    name: 'hero-scroll-hint', tellRef: 'design/10 section 3', dimension: 'anti-ai',
    severity: 'LOW', confidence: CONFIDENCE.TASTE, mode: PRESENCE,
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

  // ---- the 0.6.0 rows ---------------------------------------------------------------------
  {
    name: 'template-chrome-strings', tellRef: 'T15', dimension: 'anti-ai',
    severity: 'MEDIUM', confidence: CONFIDENCE.SMELL, mode: CONCENTRATION, minCount: 3,
    markupOnly: true,
    fileHits: templateChromeHits,
    title: 'Template chrome strings (middot meta runs, dashed labels, arrowed links, one accented word)',
    why: 'T15: meta fields separated by space, a vertical-rule token or a list; labels as plain phrases; links that say where they go; headline emphasis carried by the whole line, never by one accented word.',
  },
  {
    name: 'prose-blob-above-primary', tellRef: 'W11', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.QUALITY, mode: PRESENCE, heuristic: true,
    markupOnly: true,
    fileHits: proseBlobHits,
    title: 'Prose blob above the primary content',
    why: 'W11: the product first -- H1, identity block, one lede, one action. Explanation, methodology and search copy move below the primary content into a headed section, behind a `details` whose summary names its content, or onto their own route.',
  },
  {
    name: 'no-real-imagery', tellRef: 'I8', dimension: 'anti-ai',
    severity: 'HIGH', confidence: CONFIDENCE.SMELL, mode: PRESENCE, heuristic: true,
    markupOnly: true,
    fileHits: noRealImageryHits,
    title: 'No real imagery on a page built from icon cards',
    why: 'I8: show the real product -- screenshots, photography, the domain\'s own icons on every entity row, commissioned illustration. Floor: one real image or figure per two sections (aesthetic/06 S6).',
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

/** Off-4px-grid spacing (the `count` predicate for token-drift-spacing). */
export function countOffScaleSpacing(line) {
  const declarations = /\b(?:padding|margin|gap|row-gap|column-gap|inset)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?\s*:\s*([^;{}]*)/gi;
  let hits = 0;
  let declaration;
  while ((declaration = declarations.exec(line)) !== null) {
    const value = declaration[1];
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

function missingViewportMetaHits(ctx) {
  if (!/<head[\s>]/i.test(ctx.content)) return [];
  if (/<meta\s[^>]*name\s*=\s*["']viewport["']/i.test(ctx.content)) return [];
  const idx = ctx.content.search(/<head[\s>]/i);
  return [{ line: lineOfIndex(ctx.content, idx), evidence: '<head> with no <meta name="viewport">' }];
}

function fixedBottomBarHits(ctx) {
  const hits = [];
  // A CSS rule block that pins itself to the bottom edge. The block, not the
  // line: `position: fixed` and `bottom: 0` are usually separate declarations.
  for (const m of ctx.content.matchAll(/\{([^{}]*)\}/g)) {
    const block = m[1];
    if (!/position\s*:\s*fixed/i.test(block)) continue;
    if (!/\bbottom\s*:\s*0\b/i.test(block)) continue;
    if (/env\(\s*safe-area-inset-bottom/i.test(block)) continue;
    hits.push({
      line: lineOfIndex(ctx.content, m.index),
      evidence: snippet(block),
    });
  }
  // The inset may also be handled once, globally, on the same element's padding.
  if (hits.length && /env\(\s*safe-area-inset-bottom/i.test(ctx.content)) return [];
  return hits.slice(0, 1);
}

function viewportQueryForComponentHits(ctx) {
  // A file that already uses container queries has made the distinction; the
  // remaining media queries are the page-shell ones the catalogue keeps.
  if (/container-type\s*:/i.test(ctx.content)) return [];
  const hits = [];
  const re = /@media\s*\(([^)]*(?:min|max)-width[^)]*)\)\s*\{/gi;
  let m;
  while ((m = re.exec(ctx.content)) !== null) {
    if (/prefers-/i.test(m[1])) continue;
    const block = braceBlock(ctx.content, m.index + m[0].length - 1);
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
      line: lineOfIndex(ctx.content, m.index),
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

const RADIUS_TOKEN = /^rounded(?:-(?:sm|md|lg|xl|2xl|3xl|full|none))?$/;
const BORDER_TOKEN = /^border(?:-[a-z]+-\d+|-\d)?$/;
const SHADOW_TOKEN = /^shadow(?:-(?:sm|md|lg|xl|2xl))?$/;
const PADDING_TOKEN = /^p[xy]?-\d/;

function framedCardTrioHits(ctx) {
  let cards = 0;
  const trio = [];
  for (let i = 0; i < ctx.lines.length; i++) {
    for (const tokens of classTokenSets(ctx.lines[i])) {
      const hasRadius = tokens.some((t) => RADIUS_TOKEN.test(t));
      const hasBorder = tokens.some((t) => BORDER_TOKEN.test(t));
      const hasShadow = tokens.some((t) => SHADOW_TOKEN.test(t));
      const hasPadding = tokens.some((t) => PADDING_TOKEN.test(t));
      // A card candidate: a padded container that carries at least one framing
      // device. Counting these is what makes "every card of the surface"
      // checkable rather than asserted.
      if (!hasPadding || !(hasRadius || hasBorder || hasShadow)) continue;
      cards += 1;
      if (hasRadius && hasBorder && hasShadow) {
        trio.push({ line: i + 1, evidence: snippet(tokens.join(' ')) });
      }
    }
  }
  // Catalogue "How to apply", 0.6.0 rescope: every card of a surface with two or
  // more, or three or more cards anywhere.
  if (!(trio.length >= 3 || (trio.length >= 2 && trio.length === cards))) return [];
  return trio;
}

function iconOnlyControlHits(ctx) {
  const hits = [];
  const re = /<(button|a)\b([^>]*)>([\s\S]{0,600}?)<\/\1\s*>/gi;
  let m;
  while ((m = re.exec(ctx.content)) !== null) {
    const [, , attrs, inner] = m;
    if (!/<(?:svg|i|use|img)\b/i.test(inner)) continue;
    const text = decodeEntities(stripTags(inner)).trim();
    if (text.length) continue;
    if (/\b(?:aria-label|aria-labelledby|title)\s*=\s*["'][^"']+["']/i.test(attrs)) continue;
    if (/<title\b/i.test(inner)) continue;
    if (/\b(?:sr-only|visually-hidden|visuallyhidden|screen-reader-text)\b/i.test(inner)) continue;
    if (/\balt\s*=\s*["'][^"']+["']/i.test(inner)) continue;
    hits.push({
      line: lineOfIndex(ctx.content, m.index),
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
  const chrome = ctx.content.replace(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi, (whole) =>
    whole.replace(/[^\n]/g, ' '));
  const re = new RegExp(EMOJI_ATOM, 'gu');
  const hits = [];
  chrome.split('\n').forEach((line, i) => {
    const rendered = line.replace(/&#x([0-9a-f]+);/gi, (_, h) => safeFromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => safeFromCodePoint(Number(d)));
    re.lastIndex = 0;
    const found = rendered.match(re);
    if (found) hits.push({ line: i + 1, evidence: snippet(line) });
  });
  return hits;
}

function countSectionsAndImagery(content) {
  const sections = (content.match(/<section\b/gi) || []).length;
  const imagery = (content.match(/<(?:img|picture|figure|video|canvas)\b/gi) || []).length;
  const inlineIcons = (content.match(/<svg\b/gi) || []).length;
  return { sections, imagery, inlineIcons };
}

function noRealImageryHits(ctx) {
  const { sections, imagery, inlineIcons } = countSectionsAndImagery(ctx.content);
  // The catalogue row is "every section is icon-cards, abstract shapes and type,
  // with zero screenshots, photographs, product shots or commissioned
  // illustration". The icon leg is load-bearing: two prose-and-data sections
  // with no imagery is a reference page, not the icon-card page this row names,
  // and firing on one is the false positive `fluid-adaptive-clean.html` exists
  // to catch.
  if (sections < 2 || imagery > 0 || inlineIcons < 1) return [];
  const idx = ctx.content.search(/<section\b/i);
  return [{
    line: lineOfIndex(ctx.content, idx),
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
  const primary = firstPrimaryElement(ctx.content);
  if (primary === null) return [];
  let words = 0;
  let firstLine = null;
  for (const m of ctx.content.slice(0, primary.index).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)) {
    if (insideTag(ctx.content, m.index, 'nav')) continue;
    const n = wordCount(stripTags(m[1]));
    if (n === 0) continue;
    if (firstLine === null) firstLine = lineOfIndex(ctx.content, m.index);
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
  const hits = [];
  let accentOnly = true;
  const push = (index, evidence, isAccent) => {
    if (!isAccent) accentOnly = false;
    hits.push({ line: lineOfIndex(ctx.content, index), evidence });
  };

  // 1. ` A - B - C ` middle-dot meta runs, literal or as a character reference.
  for (const m of ctx.content.matchAll(/(?:\s|>)(?:&middot;|&#183;|&#xB7;|\u00B7)(?:\s|<)/gi)) {
    push(m.index, 'middle-dot separator between meta fields', false);
  }
  // 2. A spaced em dash inside a short label (not inside running prose).
  for (const m of ctx.content.matchAll(/<(span|button|a|dt|th|li|h[1-6])\b[^>]*>([^<]{0,80}?\s(?:\u2014|&mdash;)\s[^<]{0,80}?)<\/\1\s*>/gi)) {
    push(m.index, snippet(`spaced em dash inside <${m[1]}>: ${m[2]}`), false);
  }
  // 3. An arrow appended to link or button text.
  for (const m of ctx.content.matchAll(/<(a|button)\b[^>]*>([^<]*(?:\u2192|&rarr;|&#8594;|&#x2192;)[^<]*)<\/\1\s*>/gi)) {
    push(m.index, snippet(`arrow inside <${m[1]}> text: ${m[2]}`), false);
  }
  // 4. A span/em wrapping ONE word of an h1/h2 with its own class. Heuristic:
  //    the catalogue makes this leg presence-flaggable on a hero headline, but a
  //    regex cannot tell a brand wordmark from template chrome, so it is counted
  //    toward the concentration bar instead and never fires alone. The auditor
  //    still applies the presence leg by eye.
  let h;
  const headingRe = globalize(HEADING_ACCENT);
  headingRe.lastIndex = 0;
  while ((h = headingRe.exec(ctx.content)) !== null) {
    for (const s of h[2].matchAll(/<(span|em|strong|b|i)\b[^>]*\bclass\s*=\s*["'][^"']+["'][^>]*>([^<]+)<\/\1\s*>/gi)) {
      if (wordCount(s[2]) !== 1) continue;
      push(h.index, snippet(`one accented word in <${h[1]}>: ${s[2]}`), true);
    }
  }
  if (!hits.length) return [];
  hits.sort((a, b) => a.line - b.line);
  hits.accentOnly = accentOnly;
  return hits;
}

function flatTerminalHits(ctx) {
  if (!ctx.hasStyles) return [];
  const tokens = ctx.tokens;

  // 1. Every boundary is a hairline at alpha 0.10 or below, and there are at
  //    least two of them (one border is not a boundary system).
  const borders = [];
  for (const m of ctx.content.matchAll(/(?:^|[;{\s])border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?\s*:\s*([^;{}]+)/gi)) {
    const value = m[1].trim();
    if (/^(?:none|0|0px|unset|initial|inherit)$/i.test(value)) continue;
    borders.push({ index: m.index, value });
  }
  if (borders.length < 2) return [];
  for (const b of borders) {
    if (alphaOf(resolveValue(b.value, tokens)) > 0.10) return [];
  }

  // 2. No elevation and no rim anywhere.
  if (/box-shadow\s*:\s*(?!none\b)[^;]/i.test(ctx.content)) return [];
  if (/\binset\b/i.test(ctx.content)) return [];

  // 3. Only the platform's own families: a stated brand face is a decision.
  const families = [...ctx.content.matchAll(/font-family\s*:\s*([^;{}]+)/gi)];
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
  for (const m of ctx.content.matchAll(/(--[a-z0-9_-]+\s*:\s*)?oklch\(\s*[0-9.]+%?\s+([0-9.]+)/gi)) {
    const declared = m[1] ? m[1].match(/--[a-z0-9_-]+/)[0] : null;
    if (declared && STATUS_TOKEN.test(declared)) continue;
    if (Number(m[2]) > 0.10) return [];
  }

  return [{
    line: lineOfIndex(ctx.content, borders[0].index),
    evidence: `every boundary a hairline at alpha <= 0.10 (${borders.length} borders), no elevation or rim, system stack only, no accent above chroma 0.10`,
  }];
}

// --- the scan ---------------------------------------------------------------------

function escaped(lines, lineNumber) {
  const here = lines[lineNumber - 1] ?? '';
  const above = lines[lineNumber - 2] ?? '';
  return ESCAPE_HATCH.test(here) || ESCAPE_HATCH.test(above);
}

function fileGuardOk(rule, content) {
  if (rule.unless && rule.unless.test(content)) return false;
  if (rule.requires) {
    const found = content.match(globalize(rule.requires));
    if (!found || found.length < (rule.requiresMinCount || 1)) return false;
  }
  return true;
}

function rawHits(rule, ctx) {
  if (rule.fileHits) return rule.fileHits(ctx);
  const hits = [];
  const g = rule.pattern ? globalize(rule.pattern) : null;
  for (let i = 0; i < ctx.lines.length; i++) {
    const line = ctx.lines[i];
    if (rule.suppress && rule.suppress.test(line)) continue;
    let n = 0;
    if (rule.classAll) n = countClassAll(line, rule.classAll);
    else if (rule.count) n = rule.count(line);
    else {
      g.lastIndex = 0;
      const m = line.match(g);
      n = m ? m.length : 0;
    }
    for (let k = 0; k < n; k++) hits.push({ line: i + 1, evidence: snippet(line) });
  }
  return hits;
}

function buildContext(path, content, surface) {
  const ext = extname(path).toLowerCase();
  const isHtmlDoc = ext === '.html' || ext === '.htm' || /<html[\s>]/i.test(content);
  return {
    path,
    ext,
    content,
    lines: content.split('\n'),
    surface,
    isHtmlDoc,
    hasStyles: ext === '.css' || /<style[\s>]/i.test(content),
    tokens: collectTokens(content),
  };
}

/**
 * Scan one file's content. Returns `{ findings, suppressed }`.
 * Exported so the harness can scan without shelling out.
 */
export function scanContent(path, content, opts = {}) {
  const surface = opts.surface || 'content';
  const ctx = buildContext(path, content, surface);
  const findings = [];
  let suppressed = 0;

  // Pass 1: raw hits per rule, so `supersededBy` can drop a hit that another
  // rule already reports on the same line (catalogue "One finding per span").
  const hitsByRule = new Map();
  for (const rule of RULES) {
    if (rule.markupOnly && !ctx.isHtmlDoc) { hitsByRule.set(rule.name, []); continue; }
    if (!fileGuardOk(rule, content)) { hitsByRule.set(rule.name, []); continue; }
    hitsByRule.set(rule.name, rawHits(rule, ctx));
  }

  // Pass 2: escape hatch, supersession, thresholds.
  for (const rule of RULES) {
    let hits = hitsByRule.get(rule.name) || [];
    if (!hits.length) continue;

    const before = hits.length;
    hits = hits.filter((h) => !escaped(ctx.lines, h.line));
    suppressed += before - hits.length;
    if (!hits.length) continue;

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
    const heuristic = rule.name === 'template-chrome-strings'
      ? Boolean(hits.accentOnly)
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
    });
  }

  findings.sort((a, b) =>
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.line - b.line);
  return { findings, suppressed };
}

/** Scan one file from disk. Throws a usage Error for anything unreadable. */
export function scanFile(path, opts = {}) {
  let st;
  try {
    st = statSync(path);
  } catch {
    throw usageError(`no such file: ${path}`);
  }
  if (st.isDirectory()) throw usageError(`not a file (directories are not scanned): ${path}`);
  if (!st.isFile()) throw usageError(`not a regular file: ${path}`);
  const ext = extname(path).toLowerCase();
  if (!SUPPORTED_EXT.has(ext)) {
    throw usageError(`unsupported file type ${ext || '(none)'}: ${path} (supported: ${[...SUPPORTED_EXT].join(', ')})`);
  }
  return scanContent(path, readFileSync(path, 'utf8'), opts);
}

export function scanFiles(paths, opts = {}) {
  const findings = [];
  let suppressed = 0;
  for (const p of paths) {
    const r = scanFile(p, opts);
    findings.push(...r.findings);
    suppressed += r.suppressed;
  }
  return { summary: summarise(paths.length, findings, suppressed), findings };
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

function usageError(message) {
  const err = new Error(message);
  err.usage = true;
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
  if (format === 'json') return JSON.stringify(result, null, 2) + '\n';
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
  let result;
  try {
    result = scanFiles(opts.files, { surface: opts.surface });
  } catch (err) {
    if (err.usage) {
      process.stderr.write(`${err.message}\n`);
      return 2;
    }
    throw err;
  }
  process.stdout.write(render(result, opts.format));
  const failing = new Set(FAIL_LEVELS[opts.failOn]);
  return result.findings.some((f) => failing.has(f.severity)) ? 1 : 0;
}

const invokedDirectly = process.argv[1] && /scan_tells\.mjs$/.test(process.argv[1]);
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
