/**
 * Measure the density-and-economy dimension on a live page, and grade it.
 *
 * WHY THIS IS A SCRIPT AND NOT A CHECKLIST. Waste renders perfectly. Nothing
 * clips, nothing overlaps, nothing scrolls sideways — so a reviewer reading for
 * an impression has nothing to point at, and "this feels empty" is dismissed as
 * taste, which is exactly how five defects of this class cleared eight
 * specialist reviews and 121 pull-request findings on one dashboard. A
 * percentage and a pixel count cannot be waved off. Paste the output into the
 * finding.
 *
 * Thresholds and the reasoning behind each: references/review/05-density-and-economy.md
 *
 * Covers: viewport utilisation (HIGH and MEDIUM bands), page economy (screens vs
 * disclosures, section share), copy length, row-action distance, and slack-hoarding
 * CANDIDATES (pointers, never verdicts). Checked by hand, not here: duplicate entity
 * lists, controls more than 400px apart, prose above the primary data, administrative
 * content above the task, primary/destructive action rank.
 *
 * Usage (Playwright / CDP / devtools console) — evaluate this file's contents,
 * then call it. It returns a plain object and also prints a readable report.
 *
 *   const report = measureDensity();            // whole page
 *   const report = measureDensity({ root: '#app', proseLimit: 30 });
 *
 * Usage (Playwright MCP):
 *   browser_evaluate with function: () => { <paste file>; return measureDensity(); }
 *
 * It reads the DOM only. Nothing is mutated, nothing is navigated.
 */

function measureDensity(options = {}) {
  const {
    // The element that holds the page's own content. `main` is the usual
    // answer; pass a selector when the app puts its content elsewhere.
    root = 'main',
    // A visible paragraph in a control surface. See 05-density-and-economy.md.
    proseLimit = 30,
    // Utilisation below this, with no second column, is a HIGH finding.
    utilisationFloor = 60,
    // Utilisation between the floor and this, with no justification, is MEDIUM.
    utilisationMedium = 75,
    // A row action further than this from its row's identity is HIGH.
    actionGapLimit = 800,
  } = options;

  const px = (n) => Math.round(n);
  const box = (el) => el.getBoundingClientRect();
  const visible = (el) => el.offsetParent !== null || el === document.body;

  const content =
    document.querySelector(root) ||
    document.querySelector('main') ||
    document.body;
  const contentWidth = px(box(content).width);
  const viewport = window.innerWidth;
  const utilisation = Math.round((contentWidth / viewport) * 100);
  const pageHeight = document.documentElement.scrollHeight;
  const screens = +(pageHeight / window.innerHeight).toFixed(1);

  // --- sections, by share of the document -----------------------------------
  const sections = [...content.querySelectorAll('section, article')]
    .map((s) => ({
      label: s.id || s.className || s.tagName.toLowerCase(),
      height: px(box(s).height),
      pctOfPage: Math.round((box(s).height / pageHeight) * 100),
    }))
    .filter((s) => s.height > 8)
    .sort((a, b) => b.height - a.height);

  const disclosures = document.querySelectorAll('details').length;
  const disclosuresOpen = document.querySelectorAll('details[open]').length;

  // --- copy: visible paragraphs, disclosure bodies excluded -----------------
  // Excluded on purpose: the bar is not "this page may never explain itself at
  // length", it is "the explanation must not be in the way by default".
  const prose = [...document.querySelectorAll('p, li > span, dd')]
    .filter((p) => !p.closest('details') && visible(p))
    .map((p) => ({
      words: (p.textContent || '').trim().split(/\s+/).filter(Boolean).length,
      cls: p.className || p.tagName.toLowerCase(),
      text: (p.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 64),
    }))
    .filter((p) => p.words > proseLimit)
    .sort((a, b) => b.words - a.words);

  // --- action distance ------------------------------------------------------
  const actionGaps = [...document.querySelectorAll('tr, [role="row"]')]
    .flatMap((row) => {
      const identity = row.querySelector('th, td:first-child, [role="rowheader"]');
      const action = row.querySelector(
        'button, a.btn, [type="submit"], [role="button"]',
      );
      if (!identity || !action || !visible(action)) return [];
      const gap = px(box(action).x - box(identity).x);
      return [
        {
          row: (identity.textContent || '').trim().slice(0, 24),
          gap,
          action: (action.textContent || '').trim().slice(0, 24),
        },
      ];
    })
    .filter((r) => r.gap > actionGapLimit)
    .sort((a, b) => b.gap - a.gap);

  // --- slack hoarding: a child taking most of a container it does not need ---
  // Reported as a candidate list, not a verdict: the script cannot know a
  // column's maximum content. It points; a human checks the content maximum.
  const hoarders = [...content.querySelectorAll('table')].flatMap((table) => {
    const cells = [...table.querySelectorAll('thead th, thead td')].filter(
      (c) => box(c).width > 0,
    );
    const total = cells.reduce((sum, c) => sum + box(c).width, 0);
    if (!total) return [];
    return cells
      .map((c) => ({
        column: (c.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24),
        width: px(box(c).width),
        pctOfTable: Math.round((box(c).width / total) * 100),
      }))
      .filter((c) => c.pctOfTable > 40);
  });

  // --- grading --------------------------------------------------------------
  const findings = [];
  if (utilisation < utilisationFloor) {
    findings.push({
      severity: 'HIGH',
      what: `Viewport utilisation ${utilisation}% — ${viewport - contentWidth}px of ${viewport}px unused`,
      note: 'Correct only with a second column, a sidebar, or prose at a reading measure. For tabular or dashboard content the cap itself is the defect. Centring is not a fix.',
    });
  } else if (utilisation < utilisationMedium) {
    findings.push({
      severity: 'MEDIUM',
      what: `Viewport utilisation ${utilisation}% — ${viewport - contentWidth}px of ${viewport}px unused`,
      note: 'Unjustified 60-75%. A second column, a sidebar, or prose at a reading measure justifies it; tabular or dashboard content does not.',
    });
  }
  if (screens > 2 && disclosures === 0) {
    findings.push({
      severity: 'MEDIUM',
      what: `Page is ${screens} viewports tall with zero disclosures`,
      note: 'Reference and administrative content should be folded below the primary read.',
    });
  }
  for (const s of sections.filter((x) => x.pctOfPage > 40).slice(0, 3)) {
    findings.push({
      severity: 'HIGH',
      what: `Section "${s.label}" is ${s.pctOfPage}% of the page (${s.height}px)`,
      note: 'If this is not what the operator came for, fold it.',
    });
  }
  if (prose.length) {
    findings.push({
      severity: prose.length >= 3 ? 'HIGH' : 'MEDIUM',
      what: `${prose.length} visible paragraph(s) over ${proseLimit} words, worst ${prose[0].words}`,
      note: 'Lead stays visible, qualifications move into a named disclosure. Destructive-action warnings are exempt and stay whole.',
    });
  }
  for (const a of actionGaps.slice(0, 3)) {
    findings.push({
      severity: 'HIGH',
      what: `Row action "${a.action}" sits ${a.gap}px from its row identity ("${a.row}")`,
      note: 'Cap the table or move the action; a person cannot hold the association across that distance.',
    });
  }
  for (const h of hoarders) {
    findings.push({
      severity: 'CANDIDATE',
      what: `Column "${h.column}" takes ${h.pctOfTable}% of its table (${h.width}px)`,
      note: 'Check against the maximum content it can hold. An unsized column in a table-layout:fixed absorbs all remaining width.',
    });
  }

  const report = {
    viewport,
    contentWidth,
    utilisation: `${utilisation}%`,
    unusedPx: viewport - contentWidth,
    pageHeight,
    screens,
    disclosures: `${disclosuresOpen} open / ${disclosures} total`,
    tallestSections: sections.slice(0, 5),
    longParagraphs: prose.slice(0, 8),
    actionGaps: actionGaps.slice(0, 8),
    slackHoarders: hoarders,
    findings,
    verdict: findings.some((f) => f.severity === 'HIGH')
      ? 'HIGH findings present'
      : findings.length
        ? 'MEDIUM findings present'
        : 'no density findings at this viewport',
  };

  if (typeof console !== 'undefined' && console.table) {
    console.log(
      `density @ ${viewport}px — utilisation ${utilisation}%, ${screens} screens, ${findings.length} finding(s)`,
    );
    if (findings.length) console.table(findings);
  }
  return report;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { measureDensity };
}
