#!/usr/bin/env node
// Selftest for the colour parser inside scripts/measure_substance.js.
//
// WHY THIS EXISTS. The substance floor is graded from computed colours, and
// Chrome serialises a colour in the notation it was declared in: an oklch token
// stays oklch(), but relative colour syntax and color-mix() over that token come
// back as lab(). On the first real-site run the brand fill on the primary CTA
// computed to `lab(71.18 10.51 64.19)`, the parser returned null, and the S1
// row reported a 4px quality-colour dot as the page's accent while the gold
// button sat in the first viewport. This file pins every notation the parser
// must read and the values it must produce, so the next unreadable form fails
// here rather than in a review.
//
// The parser is extracted from the browser function without a DOM: everything
// above `const content =` in measureSubstance is pure colour maths.
//
// Usage: node tests/harness/measure-colour.selftest.mjs   exit 0 pass, 1 fail.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(REPO, 'scripts/measure_substance.js'), 'utf8');
const start = src.indexOf('function measureSubstance');
const open = src.indexOf('{', src.indexOf(')', start));
const cut = src.indexOf('  const content =', start);
if (start < 0 || cut < 0) {
  process.stdout.write('measure-colour selftest: could not locate the parser block in measure_substance.js\n');
  process.exit(1);
}
const { parseColor } = new Function('options', src.slice(open + 1, cut) + '\n return { parseColor };')({});

// [input, expected { r, g, b, a?, C?, h? } or null, tolerance in rgb units, note]
const CASES = [
  ['rgb(214, 166, 46)', { r: 214, g: 166, b: 46, a: 1 }, 0, 'sRGB legacy form'],
  ['rgba(214, 166, 46, 0.5)', { r: 214, g: 166, b: 46, a: 0.5 }, 0, 'sRGB with alpha'],
  ['oklch(0.75 0.14 85)', { r: 214, g: 166, b: 46, a: 1, C: 0.14, h: 85 }, 1, 'oklch token (the gold accent)'],
  ['oklch(0.75 0.14 85 / 0.08)', { r: 214, g: 166, b: 46, a: 0.08 }, 1, 'oklch hairline alpha survives exactly'],
  ['oklab(0.75 0.0122 0.1395)', { r: 214, g: 166, b: 46, a: 1 }, 2, 'oklab form of the same gold'],
  ['lab(71.1827 10.5081 64.1928)', { r: 214, g: 166, b: 46, a: 1, C: 0.14, h: 85 }, 2, 'lab(): relative colour syntax over the gold token, as Chrome computes it'],
  ['lab(0.898331 0.548698 1.02572)', { r: 6, g: 3, b: 1, a: 1 }, 2, 'lab(): the near-black text on that button'],
  ['lab(100 0 0)', { r: 255, g: 255, b: 255, a: 1 }, 0, 'lab white'],
  ['lab(53.2408 80.0925 67.2032)', { r: 255, g: 0, b: 0, a: 1 }, 8, 'lab of #ff0000 (D50 constants drift a few units)'],
  ['lch(53.2408 104.5518 39.999)', { r: 255, g: 0, b: 0, a: 1 }, 8, 'lch of #ff0000'],
  ['lch(71.18 65.05 80.7 / 0.5)', { r: 214, g: 166, b: 46, a: 0.5 }, 3, 'lch gold with alpha'],
  ['color(srgb 0.839 0.651 0.18)', { r: 214, g: 166, b: 46, a: 1 }, 1, 'color(srgb)'],
  ['color(srgb-linear 0.214 0.214 0.214)', { r: 127, g: 127, b: 127, a: 1 }, 1, 'color(srgb-linear) mid grey'],
  ['color(display-p3 1 0 0)', { r: 255, g: 0, b: 0, a: 1 }, 1, 'display-p3 red clips to sRGB red'],
  ['color(display-p3 0.5 0.5 0.5)', { r: 128, g: 128, b: 128, a: 1 }, 2, 'display-p3 grey is sRGB grey'],
  ['transparent', null, 0, 'transparent is null, not black'],
  ['', null, 0, 'empty is null'],
];

let failed = 0;
for (const [input, expected, tol, note] of CASES) {
  const got = parseColor(input);
  let ok;
  if (expected === null) ok = got === null;
  else if (!got) ok = false;
  else {
    ok = Math.abs(got.r - expected.r) <= tol && Math.abs(got.g - expected.g) <= tol && Math.abs(got.b - expected.b) <= tol;
    if (expected.a !== undefined) ok = ok && Math.abs(got.a - expected.a) < 0.005;
    if (expected.C !== undefined) ok = ok && Math.abs(got.C - expected.C) < 0.01;
    if (expected.h !== undefined) ok = ok && Math.abs(got.h - expected.h) < 2;
  }
  if (!ok) failed += 1;
  const shown = got ? `rgb(${got.r},${got.g},${got.b}) a=${got.a} C=${got.C.toFixed(3)} h=${got.h.toFixed(0)}` : 'null';
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${input.padEnd(40)} -> ${shown.padEnd(44)} ${note}\n`);
}

// Outside a browser there is no canvas, so an unknown notation must come back
// null rather than throw; in a browser the canvas read-back resolves it.
let threw = false;
try { if (parseColor('hsl(0 100% 50%)') !== null) failed += 1; } catch { threw = true; failed += 1; }
process.stdout.write(`${threw ? 'FAIL' : 'ok  '} ${'hsl(0 100% 50%) without a DOM'.padEnd(40)} -> ${threw ? 'threw' : 'null (canvas fallback needs a document)'}\n`);

process.stdout.write(`\nmeasure-colour selftest: ${CASES.length + 1} cases, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
