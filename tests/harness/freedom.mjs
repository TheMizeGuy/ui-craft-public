#!/usr/bin/env node
// Prohibition-load budget for the files that steer the design model.
//
// WHY THIS IS A GATE. The 0.6.0 freedom pass found 47 verified over-restrictions
// in the plugin's own instructions: bans that fired regardless of the brief,
// twelve rejection criteria, a 24-row zero-hit self-check, house preferences
// injected as non-negotiable vetoes. Each had been added one at a time, each
// with a reason, and no number ever said the total had crossed from "a floor
// under a documented failure" into "a compliance checklist that crowds out
// judgment". This test is that number.
//
// WHY THIS SHAPE. The over-restriction was measured on the generation side, so
// the architect and the design skill keep a ceiling each, and the design
// skill's acceptance criteria keep theirs. The five review-side files share one
// budget: a rule moved between them is not a rule added, and per-file zero
// headroom made every such move a two-ceiling edit that pushed authors toward
// hatch-word gaming rather than judgment. The pool still caps their total, so a
// net new ban anywhere on the review side fails.
//
// What is counted, per file: lines carrying an absolute prohibition (`never`,
// `must not`, `do not`, `zero hits`, `is rejected`, `rejected if`, `forbidden`,
// `banned`), minus the lines that carry a hatch on the same line (`anti-slop-allow`,
// `stated reason`, `stated decision`, `the brief's own words`, `unless`, `n/a`,
// `except`), and the count of numbered acceptance criteria in the design skill.
// Lower a ceiling or the pool when its total falls; raise one only with a reason
// in the commit that does it.
//
// Usage: node tests/harness/freedom.mjs [--list]   exit 0 within budget, 1 over.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const PROHIBITION = /\b(never|must not|do not|don't|zero hits|is rejected|rejected if|forbidden|banned)\b/i;
const HATCH = /anti-slop-allow|stated reason|stated decision|brief's own words|the brief|\bunless\b|\bn\/a\b|\bexcept\b|\bproposed\b|\bassumed\b/i;

// Generation-side ceilings, committed 2026-09-22 after the freedom pass.
const CEILINGS = {
  'agents/ui-craft-architect.md': { prohibitions: 37 },
  'skills/design-ui/SKILL.md': { prohibitions: 26, criteria: 12 },
};

// Review-side pool, committed 0.7.0: the sum of the five 0.6.8 ceilings
// (32 + 24 + 25 + 32 + 20). The team lead joined on 2026-10-02.
const POOL = {
  budget: 133,
  files: [
    'agents/ui-anti-slop-auditor.md',
    'agents/ui-visual-reviewer.md',
    'skills/improve-ui/SKILL.md',
    'skills/review-ui/SKILL.md',
    'agents/ui-team-lead.md',
  ],
};

function countFile(file) {
  const lines = readFileSync(join(REPO, file), 'utf8').split('\n');
  const prohibitions = lines.filter((l) => PROHIBITION.test(l) && !HATCH.test(l)).length;
  let criteria = null;
  if (file.endsWith('design-ui/SKILL.md')) {
    const start = lines.findIndex((l) => l.startsWith('ACCEPTANCE CRITERIA'));
    criteria = 0;
    if (start >= 0) {
      for (let i = start + 1; i < lines.length && !lines[i].startsWith('```'); i += 1) {
        if (/^\d+\.\s/.test(lines[i])) criteria += 1;
      }
    }
  }
  return { prohibitions, criteria };
}

const list = process.argv.includes('--list');
let failed = 0;
const out = [];
for (const [file, ceiling] of Object.entries(CEILINGS)) {
  const { prohibitions, criteria } = countFile(file);
  const over = prohibitions > ceiling.prohibitions || (criteria !== null && criteria > ceiling.criteria);
  if (over) failed += 1;
  const crit = criteria === null ? '' : `  criteria ${criteria}/${ceiling.criteria}`;
  out.push(`${over ? 'OVER ' : 'ok   '} ${file.padEnd(36)} prohibitions ${String(prohibitions).padStart(3)}/${ceiling.prohibitions}${crit}`);
}
let pooled = 0;
const poolRows = [];
for (const file of POOL.files) {
  const { prohibitions } = countFile(file);
  pooled += prohibitions;
  poolRows.push(`      ${file.padEnd(36)} prohibitions ${String(prohibitions).padStart(3)}`);
}
const poolOver = pooled > POOL.budget;
if (poolOver) failed += 1;
out.push(`${poolOver ? 'OVER ' : 'ok   '} ${'review-side pool'.padEnd(36)} prohibitions ${String(pooled).padStart(3)}/${POOL.budget}`);
if (list || poolOver) out.push(...poolRows);

process.stdout.write(`${out.join('\n')}\n`);
if (failed) {
  process.stdout.write(`\n${failed} budget(s) exceeded. A new absolute rule needs a hatch on its line (anti-slop-allow, a stated reason, the brief's own words), a deletion elsewhere, or a reason in the commit that raises the budget.\n`);
  process.exit(1);
}
process.stdout.write(`freedom: generation-side files within their ceilings, review-side pool within its budget${list ? '' : ' (run with --list for the per-file counts)'}\n`);
