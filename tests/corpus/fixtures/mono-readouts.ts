// A talent-calculator stylesheet as a CSS-in-TS string, the shape a game-data
// site ships. The monospace family sits on the human-readable readouts (the
// level value, the preset buttons, the point totals, the rank badge, the table
// cells) even though every one of those rules already carries tabular-nums,
// which is what actually aligns the digits. Mono on the build-code textarea and
// the readonly share link is correct: those are raw payloads.
export const TALENT_TOKENS =
  ':root{--font-sans:system-ui,sans-serif;--font-mono:"JetBrains Mono",ui-monospace,monospace;' +
  '--text-sm:0.875rem;--text-xl:1.25rem;--font-weight-emphasis:600;' +
  '--color-text-primary:oklch(0.96 0.02 70);--color-text-secondary:oklch(0.78 0.02 70)}';

export const TALENT_CSS =
  '[data-component="talent-level-value"]{min-inline-size:2ch;font-family:var(--font-mono);' +
  'font-size:var(--text-xl);font-weight:var(--font-weight-emphasis);font-variant-numeric:tabular-nums}' +
  '[data-component="talent-level-preset"]{font-family:var(--font-mono);font-size:var(--text-sm);' +
  'font-variant-numeric:tabular-nums;padding-inline:0.5rem;min-block-size:44px}' +
  '[data-component="talent-tree-points"]{font-family:var(--font-mono);font-variant-numeric:tabular-nums;' +
  'color:var(--color-text-secondary)}' +
  '[data-component="talent-points-spent"]{font-family:var(--font-mono);font-weight:var(--font-weight-emphasis);' +
  'font-variant-numeric:tabular-nums;color:var(--color-text-primary)}' +
  '[data-component="talent-node-rank"]{font-family:var(--font-mono);font-size:var(--text-sm);' +
  'font-variant-numeric:tabular-nums}' +
  '[data-component="talent-table"] td.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums;' +
  'text-align:end}' +
  // Raw payloads: the build code and the share link keep the mono face.
  '[data-component="talent-field"] textarea{min-block-size:9rem;resize:vertical;font-family:var(--font-mono);' +
  'font-size:var(--text-sm);line-height:1.5;white-space:pre}' +
  '[data-component="talent-field"] input[readonly]{font-family:var(--font-mono);font-size:var(--text-sm)}';
