#!/usr/bin/env node
// Prohibition-load ceiling for the files that steer the design model.
//
// WHY THIS IS A GATE. The 0.6.0 freedom pass found 47 verified over-restrictions
// in the plugin's own instructions: bans that fired regardless of the brief,
// twelve rejection criteria, a 24-row zero-hit self-check, house preferences
// injected as non-negotiable vetoes. Each had been added one at a time, each
// with a reason, and no number ever said the total had crossed from "a floor
// under a documented failure" into "a compliance checklist that crowds out
// judgment". This test is that number. Every count below is a CEILING: a file
// may carry fewer prohibitions than committed here (update the table when it
// does, so the ceiling follows it down), never more without a deliberate edit
// to this file that says why.
//
// What is counted, per file: lines carrying an absolute prohibition (`never`,
// `must not`, `do not`, `zero hits`, `is rejected`, `rejected if`, `forbidden`,
// `banned`), minus the lines that carry a hatch on the same line (`anti-slop-allow`,
// `stated reason`, `stated decision`, `the brief's own words`, `unless`, `n/a`,
// `except`), and the count of numbered acceptance criteria in the design skill.
//
// Usage: node tests/harness/freedom.mjs [--list]   exit 0 within ceilings, 1 over.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const PROHIBITION = /\b(never|must not|do not|don't|zero hits|is rejected|rejected if|forbidden|banned)\b/i;
const HATCH = /anti-slop-allow|stated reason|stated decision|brief's own words|the brief|\bunless\b|\bn\/a\b|\bexcept\b|\bproposed\b|\bassumed\b/i;

// Ceilings committed 2026-09-22 after the freedom pass. Lower them when a file
// sheds prohibitions; raise one only with a reason in the commit that does it.
const CEILINGS = {
  'agents/ui-craft-architect.md': { prohibitions: 38 },
  'skills/design-ui/SKILL.md': { prohibitions: 30, criteria: 12 },
  'agents/ui-anti-slop-auditor.md': { prohibitions: 32 },
  'agents/ui-visual-reviewer.md': { prohibitions: 24 },
  'skills/improve-ui/SKILL.md': { prohibitions: 31 },
  'skills/review-ui/SKILL.md': { prohibitions: 35 },
};

const list = process.argv.includes('--list');
let failed = 0;
const rows = [];
for (const [file, ceiling] of Object.entries(CEILINGS)) {
  const lines = readFileSync(join(REPO, file), 'utf8').split('\n');
  const prohibitions = lines.filter((l) => PROHIBITION.test(l) && !HATCH.test(l)).length;
  const criteria = file.endsWith('design-ui/SKILL.md')
    ? (() => {
        const start = lines.findIndex((l) => l.startsWith('ACCEPTANCE CRITERIA'));
        if (start < 0) return 0;
        let n = 0;
        for (let i = start + 1; i < lines.length && !lines[i].startsWith('```'); i += 1) {
          if (/^\d+\.\s/.test(lines[i])) n += 1;
        }
        return n;
      })()
    : null;
  const over = prohibitions > ceiling.prohibitions || (criteria !== null && criteria > ceiling.criteria);
  if (over) failed += 1;
  rows.push({ file, prohibitions, ceiling: ceiling.prohibitions, criteria, criteriaCeiling: ceiling.criteria ?? null, over });
}

for (const r of rows) {
  const crit = r.criteria === null ? '' : `  criteria ${r.criteria}/${r.criteriaCeiling}`;
  process.stdout.write(`${r.over ? 'OVER ' : 'ok   '} ${r.file.padEnd(36)} prohibitions ${String(r.prohibitions).padStart(3)}/${r.ceiling}${crit}\n`);
}
if (failed) {
  process.stdout.write(`\n${failed} file(s) over the prohibition ceiling. A new absolute rule needs a hatch on its line (anti-slop-allow, a stated reason, the brief's own words), a deletion elsewhere, or a reason in the commit that raises the ceiling.\n`);
  process.exit(1);
}
process.stdout.write(`freedom: ${rows.length} steering files within their prohibition ceilings${list ? '' : ' (run with --list for the table)'}\n`);
