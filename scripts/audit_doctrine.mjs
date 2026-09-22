#!/usr/bin/env node
/**
 * Audit a reviewed repository's OWN rules for anything that enforces flatness
 * or text volume, and print the findings in the plugin's canonical shape.
 *
 * WHY THIS IS A SCRIPT. On one product, six review-and-fix campaigns each
 * rendered the site flatter because the repository's own design doctrine
 * ("one hairline, no elevation, colour only for status"), a 20,000-line CSS
 * pin-test suite that froze the flat literals, and word-count floor tests
 * (`expect(words).toBeGreaterThan(300)`) forced every later fix back to the
 * flat, padded default. A review that never reads those files proposes fixes
 * that CI reverts. `review-ui` Step 3b and `improve-ui` Step 2c run this and
 * carry its output as the DOCTRINE CONSTRAINTS block every specialist receives.
 *
 * What it looks for (each hit is one finding, dimension `visual`, id
 * `visual-doctrine-<slug>`, severity MEDIUM, title beginning "Doctrine:"):
 *
 *   - text-volume floors in tests: a minimum on words, paragraphs, headings,
 *     sentences or description length (`toBeGreaterThan`, `toBeGreaterThanOrEqual`,
 *     `>=`, `assert ... >`), the padding generator
 *   - CSS pin tests: assertions that freeze a visual literal (`toHaveStyle`,
 *     `toMatchInlineSnapshot` or `toMatchSnapshot` over a stylesheet, equality on
 *     `box-shadow`, `border-radius`, `border`, `background`, `color`, `font-*`
 *     read from `getComputedStyle`), which make every later design change fight
 *     the previous one
 *   - doctrine lines in docs and rule files that ban a substance device outright
 *     (no shadows, no elevation, hairline only, no badges, no borders, no
 *     gradients as a blanket rule, flat panels, colour only for status, the
 *     terminal look) without naming a replacement
 *   - lint rules that forbid a visual property outright (stylelint
 *     `declaration-property-value-disallowed-list` or `property-disallowed-list`
 *     on shadow, radius, border or background)
 *
 * It reads files only. It never edits, and it never decides keep-or-retire:
 * that is the owner's call, made one finding at a time.
 *
 * Usage:
 *   node scripts/audit_doctrine.mjs <repo-root> [--format text|json] [--max 200]
 *
 * Exit 0 always (it reports; the reviewer decides). Exit 2 on a usage error.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';

const argv = process.argv.slice(2);
if (!argv[0] || argv[0].startsWith('--')) {
  process.stderr.write('Usage: node scripts/audit_doctrine.mjs <repo-root> [--format text|json] [--max N]\n');
  process.exit(2);
}
const root = argv[0];
const format = argv.includes('--format') ? argv[argv.indexOf('--format') + 1] : 'text';
const max = argv.includes('--max') ? Number(argv[argv.indexOf('--max') + 1]) : 200;

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', 'Pods', 'DerivedData', 'vendor', 'target', 'out', 'CHANGELOG.md']);
// Every dot-directory is skipped too (.git, .next, .claude, .audit-artefacts, .serena): archives and tooling, never the repo's live rules.
const DOC_EXT = new Set(['.md', '.mdx', '.txt']);
const CODE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.rb', '.go', '.swift', '.kt']);
const RULE_FILES = /^(\.stylelintrc.*|stylelint\.config\..*|\.eslintrc.*|eslint\.config\..*|biome\.jsonc?)$/;
const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(__tests__\/)|(\/tests?\/)|(_test\.(py|go|rb)$)/;

const findings = [];
const slugSeen = new Map();
function slug(text) {
  const s = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);
  const n = (slugSeen.get(s) || 0) + 1;
  slugSeen.set(s, n);
  return n === 1 ? s : `${s}-${n}`;
}
function add(kind, file, line, title, evidence, why) {
  if (findings.length >= max) return;
  findings.push({
    id: `visual-doctrine-${slug(title)}`,
    dimension: 'visual',
    severity: 'MEDIUM',
    confidence: 'Quality defect',
    file,
    line,
    title: `Doctrine: ${title}`,
    evidence: evidence.trim().slice(0, 240),
    kind,
    why,
  });
}

// --- patterns ----------------------------------------------------------------
const VOLUME_WORD = /\b(words?|wordCount|word_count|paragraphs?|sentences?|headings?|h[1-6]|description|body|copy|text)\b/i;
const FLOOR_ASSERT = /(toBeGreaterThan(OrEqual)?\s*\(\s*\d+|\.length\s*\)?\s*>=?\s*\d{2,}|assert\w*\s*\(.*>=?\s*\d{2,}|expect\([^)]*\)\.to(Be)?(AtLeast|GreaterThan)|minWords|min_words|MIN_WORDS|minLength\s*[:=]\s*\d{2,})/;
const CSS_PROP = /\b(box-shadow|boxShadow|border-radius|borderRadius|border(?:-(?:top|left|right|bottom))?(?:-color|-width)?|background(?:-color)?|backgroundColor|color|font-(?:family|weight|size)|fontFamily|fontWeight|letter-spacing|letterSpacing|opacity|text-transform)\b/;
const PIN_ASSERT = /(toHaveStyle\s*\(|toMatchInlineSnapshot|toMatchSnapshot\s*\(|getComputedStyle\([^)]*\)\.(?:[a-zA-Z]+)\s*\)?\s*\.?\s*(?:toBe|toEqual|===|==)\s*['"`]|expect\(\s*(?:css|style|styles|theme|tokens)[\w.\[\]'"]*\s*\)\.(?:toBe|toEqual|toContain|toMatch)\s*\(\s*['"`])/;
const FLAT_DOCTRINE = [
  [/\b(no|never|zero|without)\s+(drop[- ]?)?shadows?\b/i, 'bans shadows outright'],
  [/\b(no|never|zero|without)\s+elevation\b/i, 'bans elevation outright'],
  [/\bhairlines?\s+(only|everywhere|for every)\b|\b(only|single)\s+(a\s+)?hairline\b/i, 'hairline as the only boundary device'],
  [/\b(no|never|remove(d)?( all)?|strip(ped)?( all)?)\s+(badges?|chips?|pills?)\b/i, 'bans badges outright'],
  [/\b(no|never|zero)\s+(borders?|framed panels?|frames?\s+(on|around)\s+(cards?|panels?|rows?|tables?)|accent edges?|panel edges?)\b/i, 'bans borders or frames outright'],
  [/\b(no|never|zero)\s+gradients?\b(?!.*(hero|slop|purple|pink|default))/i, 'bans gradients as a blanket rule'],
  [/\b(flat\s+(panels?|surfaces?|cards?|by default)|everything\s+flat|keep\s+it\s+flat)\b/i, 'prescribes flat panels'],
  [/\bcolou?r\s+(only|reserved)\s+(for|as)\s+status\b|\bstatus[- ]only\s+colou?r\b/i, 'reserves colour for status only'],
  [/\b(terminal|tactical operator)\s+(look|aesthetic|style|template)\b/i, 'prescribes the terminal look'],
  [/\b(no|never|zero)\s+(decoration|ornament)\b/i, 'bans decoration without naming what must be present'],
  [/\b(mono(space)?)\s+(for|on)\s+(all|every|numbers|numerals|labels|stats)\b/i, 'prescribes monospace on human-readable text'],
  [/\b(remove|strip)\s+(the\s+)?(slop|ai tells|decorative chrome)\b/i, 'a removal sweep with no replacement named'],
];
const VOLUME_DOCTRINE = [
  [/\b(at least|minimum( of)?|no fewer than|>=)\s*\d{2,4}\s*words?\b/i, 'sets a word-count floor'],
  [/\b(at least|minimum( of)?|no fewer than)\s*\d+\s*(paragraphs?|h2s?|headings?|sections?|faqs?|sentences?)\b/i, 'sets a structural minimum on prose'],
  [/\b(seo|intro(duction)?|explainer)\s+(copy|text|paragraphs?|block)\s+(above|at the top|before)\b/i, 'places explanatory copy above the product'],
];
const LINT_RULE = /(declaration-property-value-disallowed-list|property-disallowed-list|declaration-property-disallowed-list|no-restricted-syntax)/;
const LINT_PROP = /(box-shadow|border-radius|border|background|gradient|shadow|radius)/i;

// --- walk ---------------------------------------------------------------------
function* walk(dir, depth = 0) {
  if (depth > 12) return;
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) yield* walk(join(dir, e.name), depth + 1); continue; }
    if (!e.isFile()) continue;
    yield join(dir, e.name);
  }
}

let filesScanned = 0;
for (const abs of walk(root)) {
  const rel = relative(root, abs);
  const ext = extname(abs);
  const name = basename(abs);
  const isDoc = DOC_EXT.has(ext);
  const isRule = RULE_FILES.test(name) || name === '.stylelintrc' || name === 'stylelint.config.js';
  const isCode = CODE_EXT.has(ext);
  if (!isDoc && !isRule && !isCode) continue;
  let size = 0;
  try { size = statSync(abs).size; } catch { continue; }
  if (size > 2_000_000) continue;
  let text = '';
  try { text = readFileSync(abs, 'utf8'); } catch { continue; }
  filesScanned += 1;
  const lines = text.split('\n');
  const isTest = TEST_FILE.test(rel) || /\.(test|spec)\./.test(name);

  lines.forEach((ln, i) => {
    const line = i + 1;
    const isComment = /^\s*(\*|\/\/|\/\*|#)/.test(ln);
    if (!isComment && (isTest || (isCode && /expect\(|assert/.test(ln)))) {
      const floorNumber = Number((ln.match(/(?:toBeGreaterThan(?:OrEqual)?\s*\(|>=?\s*|minWords\s*[:=]\s*|min_words\s*[:=]\s*|MIN_WORDS\s*[:=]\s*|minLength\s*[:=]\s*)(\d+)/) || [])[1] || 0);
      const geometryOrExistence = /\b(left|top|right|bottom|width|height|offset|rect|geometry|bounding|scroll|versions|status|count\s*\(|\.length,\s*['"`][^'"`]*empty)/i.test(ln);
      // A floor under 10 is an existence check ("the h1 is not empty"), not a padding generator.
      if (FLOOR_ASSERT.test(ln) && VOLUME_WORD.test(ln) && floorNumber >= 10 && !geometryOrExistence) {
        add('volume-floor', rel, line, `text-volume floor in a test (${name}:${line})`, ln,
          'A minimum on words, paragraphs or headings is a padding generator: every attempt to cut copy turns the gate red (design/12 § 3). Retire it or turn it into a ceiling.');
      }
      if (PIN_ASSERT.test(ln) && CSS_PROP.test(ln)) {
        add('css-pin', rel, line, `visual literal pinned by a test (${name}:${line})`, ln,
          'A test that freezes a shadow, radius, border, colour or font literal makes the next design pass fight the last one. Keep contrast, focus-ring, forced-colors and reduced-motion guards; retire literal pins.');
      }
    }
    if (isDoc || /\.(md|mdx)$/.test(name) || /(CLAUDE|AGENTS|README|DESIGN|STYLE|THEME)/i.test(name)) {
      for (const [re, label] of FLAT_DOCTRINE) {
        if (re.test(ln) && !/replace|instead|becomes|in its place|substance|floor|fail|reject|tell\b|directive|is not a|never ship|anti-pattern|smell/i.test(ln)) {
          add('flat-doctrine', rel, line, `${label} (${name}:${line})`, ln,
            'A doctrine line that removes a substance device without naming its replacement is how a product converges on the flat 2026 default (aesthetic/06 § 6). Keep it only with the replacement named beside it.');
        }
      }
      for (const [re, label] of VOLUME_DOCTRINE) {
        if (re.test(ln)) {
          add('volume-doctrine', rel, line, `${label} (${name}:${line})`, ln,
            'Copy volume is a ceiling, never a floor, and explanatory copy sits below the product (design/12 § 2, § 3).');
        }
      }
    }
    if (isRule && LINT_RULE.test(ln)) {
      const window = lines.slice(i, i + 6).join(' ');
      if (LINT_PROP.test(window)) {
        add('lint-ban', rel, line, `lint rule forbids a visual property (${name}:${line})`, window,
          'A lint rule that forbids shadows, radius, borders or backgrounds outright enforces flatness at commit time. Scope it to the AI-default signature, not the device.');
      }
    }
  });
}

// --- output -------------------------------------------------------------------
const summary = {
  root,
  filesScanned,
  findings: findings.length,
  byKind: findings.reduce((acc, f) => { acc[f.kind] = (acc[f.kind] || 0) + 1; return acc; }, {}),
  truncated: findings.length >= max,
};
if (format === 'json') {
  process.stdout.write(JSON.stringify({ summary, findings }, null, 2) + '\n');
} else {
  process.stdout.write(`doctrine audit: ${filesScanned} files scanned, ${findings.length} finding(s)${summary.truncated ? ` (truncated at ${max})` : ''}\n`);
  for (const [k, n] of Object.entries(summary.byKind)) process.stdout.write(`  ${k}: ${n}\n`);
  for (const f of findings) {
    process.stdout.write(`\n[${f.severity}] ${f.title}\n  ${f.file}:${f.line}\n  evidence: ${f.evidence}\n  why: ${f.why}\n`);
  }
  if (!findings.length) process.stdout.write('no doctrine constraints found: nothing in the repo\'s own rules enforces flatness or text volume\n');
}
