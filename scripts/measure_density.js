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
 * The same mechanism applies to copy PLACEMENT, which this script also measures.
 * "There is a wall of text at the top" reads as a writing preference until the
 * number sits beside it: 312 words of running prose above the table, four of
 * them orphan paragraphs under no heading.
 *
 * Thresholds and the reasoning behind each: references/review/05-density-and-economy.md
 * Placement doctrine and the per-surface budgets: references/design/12-copy-placement-and-volume.md
 *
 * Covers: viewport utilisation (HIGH and MEDIUM bands), page economy (screens vs
 * disclosures, section share), copy VOLUME against the calling surface's budget,
 * copy PLACEMENT (words before the primary content, paragraphs in the hero, orphan
 * paragraphs, text-only section runs, third-party slot reflow), the SHELL rows
 * from usability/05 (prose wedged between two controls, tab strips wrapping to a
 * second row, destinations held by both the top bar and the rail), row-action
 * distance, and slack-hoarding CANDIDATES (pointers, never verdicts). Checked by
 * hand, not here: duplicate entity lists, controls more than 400px apart,
 * administrative content above the task, primary/destructive action rank.
 *
 * EVERY NUMBER HERE IS A CEILING. There is no minimum word count, no minimum
 * paragraph length and no minimum section count anywhere in this file. A floor is
 * a padding generator: every attempt to cut copy turns the gate red (design/12
 * section 3). A section with zero words is never a finding.
 *
 * Usage (Playwright / CDP / devtools console) — evaluate this file's contents,
 * then call it. It returns a plain object and also prints a readable report.
 *
 *   const report = measureDensity();                        // control surface, whole page
 *   const report = measureDensity({ surface: 'content' });  // entity / reference page
 *   const report = measureDensity({ root: '#app', surface: 'marketing' });
 *
 * `surface` selects the design/12 section 3 budget and defaults to 'control':
 *   control   — dashboard, settings, form, admin. Lede 25 words, paragraph 30.
 *   content   — entity page, database page, guide index. Lede 40, paragraph 60.
 *   marketing — landing and campaign pages. Lede 25, paragraph 50.
 *   article   — documentation and long-form. No volume bar; placement still binds.
 *
 * Usage (Playwright MCP):
 *   browser_evaluate with function: () => { <paste file>; return measureDensity(); }
 *
 * It reads the DOM only. Nothing is mutated, nothing is navigated.
 */

// design/12 section 3. `lede` is the ceiling on running prose above the primary
// content; `paragraph` is the ceiling on any one visible paragraph. `Infinity`
// means the surface has no volume bar, never that it has no placement rules.
const DENSITY_SURFACE_BUDGETS = {
  control: { lede: 25, paragraph: 30, label: 'control surface' },
  content: { lede: 40, paragraph: 60, label: 'content or reference page' },
  marketing: { lede: 25, paragraph: 50, label: 'marketing page' },
  article: { lede: Infinity, paragraph: Infinity, label: 'article or documentation' },
};

function measureDensity(options = {}) {
  const {
    // The element that holds the page's own content. `main` is the usual
    // answer; pass a selector when the app puts its content elsewhere.
    root = 'main',
    // Which design/12 section 3 budget applies. See the header comment.
    surface = 'control',
    // A visible paragraph over its surface's budget. Overrides the budget.
    proseLimit,
    // Running prose above the primary content. Overrides the budget.
    ledeLimit,
    // Utilisation below this, with no second column, is a HIGH finding.
    utilisationFloor = 60,
    // Utilisation between the floor and this, with no justification, is MEDIUM.
    utilisationMedium = 75,
    // A row action further than this from its row's identity is HIGH.
    actionGapLimit = 800,
    // One orphan this long is a finding on its own (design/12 section 7, W12).
    orphanWordLimit = 60,
    // A run of this many consecutive text-only sections is L14.
    textOnlyRunLimit = 3,
    // Below this a `p` is component text (a caption, a helper, a card line),
    // not running prose. The placement rules govern prose, not labels.
    proseWordFloor = 12,
  } = options;

  const budget = DENSITY_SURFACE_BUDGETS[surface] || DENSITY_SURFACE_BUDGETS.control;
  const paragraphLimit = proseLimit === undefined ? budget.paragraph : proseLimit;
  const ledeBudget = ledeLimit === undefined ? budget.lede : ledeLimit;

  const px = (n) => Math.round(n);
  const box = (el) => el.getBoundingClientRect();
  const visible = (el) => el.offsetParent !== null || el === document.body;
  const words = (el) =>
    ((el && el.textContent) || '').trim().split(/\s+/).filter(Boolean).length;
  const prefix = (el) =>
    ((el && el.textContent) || '').trim().replace(/\s+/g, ' ').slice(0, 64);
  const describe = (el) => {
    if (!el) return null;
    const tag = el.tagName.toLowerCase();
    if (el.id) return `${tag}#${el.id}`;
    const cls = typeof el.className === 'string' ? el.className.trim() : '';
    return cls ? `${tag}.${cls.split(/\s+/)[0]}` : tag;
  };
  // Document order, without relying on the Node constants being in scope.
  const DOCUMENT_POSITION_FOLLOWING = 4;
  const precedes = (a, b) =>
    !!(a.compareDocumentPosition(b) & DOCUMENT_POSITION_FOLLOWING);
  const earliest = (els) =>
    els
      .filter(Boolean)
      .reduce((best, el) => (!best || precedes(el, best) ? el : best), null);

  const content =
    document.querySelector(root) ||
    document.querySelector('main') ||
    document.body;
  const contentWidth = px(box(content).width);
  const viewport = window.innerWidth;
  const utilisation = Math.round((contentWidth / viewport) * 100);
  const pageHeight = document.documentElement.scrollHeight;
  const screens = +(pageHeight / window.innerHeight).toFixed(1);

  // Chrome is never the primary content and never the first control: nav links,
  // breadcrumbs, skip links and theme toggles sit above the task on every page,
  // and counting them reports a clean 0 on exactly the worst offenders.
  const CHROME_SEL =
    'nav, [role="navigation"], [role="search"], [aria-label*="breadcrumb" i], [data-nav]';
  const isChrome = (el) => {
    if (el.closest(CHROME_SEL)) return true;
    const label = `${el.getAttribute('aria-label') || ''} ${el.textContent || ''}`.trim();
    if (label.length > 40) return false;
    return (
      /^(skip|jump)\s+to\b/i.test(label) ||
      /\b(theme|dark mode|light mode|appearance|language|locale)\b/i.test(label)
    );
  };
  const inContent = (sel) =>
    [...content.querySelectorAll(sel)].filter(
      (el) => visible(el) && !el.closest(CHROME_SEL),
    );

  // --- sections, by share of the document -----------------------------------
  const sectionEls = [...content.querySelectorAll('section, article')].filter(
    (s) => box(s).height > 8,
  );
  const sections = sectionEls
    .map((s) => ({
      label: s.id || s.className || s.tagName.toLowerCase(),
      height: px(box(s).height),
      pctOfPage: Math.round((box(s).height / pageHeight) * 100),
    }))
    .sort((a, b) => b.height - a.height);

  const disclosures = document.querySelectorAll('details').length;
  const disclosuresOpen = document.querySelectorAll('details[open]').length;

  // --- copy: visible paragraphs, disclosure bodies excluded -----------------
  // Excluded on purpose: the bar is not "this page may never explain itself at
  // length", it is "the explanation must not be in the way by default".
  const proseEls = [...content.querySelectorAll('p, li > span, dd')].filter(
    (p) => !p.closest('details') && visible(p),
  );
  const proseCounts = proseEls.map((p) => ({
    el: p,
    words: words(p),
    cls: p.className || p.tagName.toLowerCase(),
    text: prefix(p),
  }));
  const longestParagraph = proseCounts.reduce(
    (max, p) => (p.words > max ? p.words : max),
    0,
  );
  const prose = proseCounts
    .filter((p) => p.words > paragraphLimit)
    .map(({ el, ...rest }) => rest)
    .sort((a, b) => b.words - a.words);
  const totalVisibleWords = ((content.innerText || content.textContent || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)).length;

  // --- placement: what sits above the primary content ------------------------
  // Primary = the thing the page is for. First of: a table, a form, an explicit
  // [data-primary], a grid, a chart root, an entity list, or the first non-chrome
  // interactive control. `article` is taken as primary only on an article surface
  // or when nothing else qualifies, since an <article> wrapper around a dashboard
  // would otherwise report a clean 0 for every page.
  const strongPrimary = earliest(
    [
      'table',
      'form',
      '[data-primary]',
      '[role="grid"]',
      '[role="table"]',
      'canvas',
      '[data-chart]',
      '.recharts-wrapper',
    ].map((sel) => inContent(sel)[0]),
  );
  const entityList = inContent('ul, ol, [role="list"]').find((list) => {
    const items = [...list.children].filter(
      (c) => c.matches && c.matches('li, [role="listitem"]'),
    );
    return (
      items.length >= 3 &&
      items.filter((i) => i.querySelector('a[href], h1, h2, h3, h4, img')).length >= 3
    );
  });
  const firstControl = inContent(
    'button, input, select, textarea, a[href], [role="button"], [role="tab"]',
  ).find((el) => !isChrome(el));
  const articleBody = inContent('article')[0];
  const primary =
    (surface === 'article' && articleBody) ||
    earliest([strongPrimary, entityList, firstControl]) ||
    articleBody ||
    null;
  const primarySelector = primary ? describe(primary) : 'no primary element found';

  // Running prose only: a label, a helper line or a card description is not a
  // paragraph in design/12's sense (section 1).
  const runningProse = proseCounts.filter(
    (p) =>
      p.el.tagName.toLowerCase() === 'p' &&
      p.words >= proseWordFloor &&
      !p.el.closest(
        'figcaption, label, button, td, th, table, form, [role="tooltip"], [role="status"]',
      ) &&
      !isChrome(p.el),
  );
  const proseAbove = primary
    ? runningProse.filter((p) => precedes(p.el, primary) && !primary.contains(p.el))
    : [];
  const wordsBeforePrimary = proseAbove.reduce((sum, p) => sum + p.words, 0);

  const HERO_SEL = '[data-hero], [class*="hero" i], [id*="hero" i]';
  const heroParagraphs = runningProse
    .filter((p) => p.el.closest(HERO_SEL))
    .map((p) => ({ words: p.words, text: p.text }));

  // --- orphan paragraphs (W12) ----------------------------------------------
  // A paragraph with no home: no headed section over it, dropped straight into
  // the shell, or sitting between components of another kind. design/12 names
  // that list exactly: a card grid, a table, a form, a toolbar, a chart. A
  // figure or a list beside a paragraph is prose with its own illustration,
  // which is the composition the doctrine asks for, not a defect.
  const COMPONENT_SIBLING_SEL =
    'table, form, [role="grid"], [role="table"], [role="toolbar"], [role="tablist"], canvas, [data-chart], [class*="chart" i]';
  const isCardGrid = (el) => {
    if (!el.children || el.children.length < 3) return false;
    if (el.getAttribute && el.getAttribute('data-grid') !== null) return true;
    const cls = typeof el.className === 'string' ? el.className : '';
    return /\b(grid|cards|tiles)\b/i.test(cls);
  };
  const headedSection = (sec, p) => {
    if (sec.getAttribute('aria-labelledby')) return true;
    return [...sec.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')].some(
      (h) => precedes(h, p),
    );
  };
  const orphans = runningProse
    .map((p) => {
      const sec = p.el.closest('section, article, aside');
      const parent = p.el.parentElement;
      const parentTag = parent ? parent.tagName.toLowerCase() : '';
      const reasons = [];
      if (sec && content.contains(sec)) {
        if (!headedSection(sec, p.el)) reasons.push('nearest section carries no heading');
      } else if (parentTag === 'main' || parentTag === 'body' || parent === content) {
        reasons.push('dropped straight into the page shell');
      } else {
        reasons.push('no sectioning ancestor');
      }
      if (parent) {
        const siblings = [...parent.children].filter((c) => c !== p.el);
        if (
          siblings.some(
            (c) => (c.matches && c.matches(COMPONENT_SIBLING_SEL)) || isCardGrid(c),
          )
        ) {
          reasons.push('siblings are components of another kind');
        }
      }
      return { words: p.words, text: p.text, reasons };
    })
    .filter((p) => p.reasons.length > 0);

  // --- text-only section runs (L14) -----------------------------------------
  const DEVICE_SEL =
    'img, picture, svg, video, canvas, table, form, ul, ol, dl, button, figure, [role="list"]';
  const sectionRows = sectionEls.map((s) => ({
    label:
      s.id || (typeof s.className === 'string' && s.className) || s.tagName.toLowerCase(),
    words: words(s),
    device: !!s.querySelector(DEVICE_SEL),
  }));
  const wordsPerSection = sectionRows.map(({ label, words: w }) => ({ label, words: w }));
  // A section with zero words is a spacer, never a text-only finding.
  const textOnlySections = sectionRows.filter((s) => !s.device && s.words > 0).length;
  let longestTextOnlyRun = 0;
  let run = 0;
  for (const s of sectionRows) {
    if (!s.device && s.words > 0) {
      run += 1;
      if (run > longestTextOnlyRun) longestTextOnlyRun = run;
    } else {
      run = 0;
    }
  }
  const sectionlessMain = sectionEls.length === 0 && runningProse.length >= 2;

  // --- third-party slot reflow risk (design/12 section 5) --------------------
  const SLOT_RE = /(^|[^a-z])(ads?|advert|promo|embed|widget|sponsor|slot)([^a-z]|$)/i;
  const slotEls = [...content.querySelectorAll('iframe, div, aside, section')].filter(
    (el) => {
      if (el.tagName.toLowerCase() === 'iframe') return true;
      const cls = typeof el.className === 'string' ? el.className : '';
      return SLOT_RE.test(cls) || SLOT_RE.test(el.id || '');
    },
  );
  const slotReflowRisk = slotEls
    // One finding per slot: the wrapper is what reserves space, so an iframe
    // inside a matched wrapper is the same defect, not a second one.
    .filter((el) => !slotEls.some((other) => other !== el && other.contains(el)))
    .map((el) => {
      const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
      const minH = cs ? parseFloat(cs.minHeight) : NaN;
      const ratio = cs ? cs.aspectRatio : '';
      const intrinsic = cs
        ? cs.containIntrinsicSize || cs.containIntrinsicBlockSize || ''
        : '';
      const reserved =
        minH > 0 ||
        (!!ratio && ratio !== 'auto' && ratio !== 'normal') ||
        (!!intrinsic && intrinsic !== 'none' && intrinsic !== 'auto');
      const position = cs ? cs.position : 'static';
      const parent = el.parentElement;
      const textSibling = parent
        ? [...parent.children].some(
            (c) =>
              c !== el &&
              ((c.tagName.toLowerCase() === 'p' && words(c) >= proseWordFloor) ||
                [...c.querySelectorAll('p')].some((p) => words(p) >= proseWordFloor)),
          )
        : false;
      return { selector: describe(el), reserved, position, textSibling };
    })
    // A slot out of flow cannot move its siblings; an unreserved one in flow can.
    .filter((s) => !s.reserved && (s.position === 'static' || s.position === 'relative'));

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

  // --- prose share of the first viewport ------------------------------------
  const proseShareOfFirstViewport = (() => {
    const vh = window.innerHeight;
    if (!vh) return '0%';
    const covered = runningProse.reduce((sum, p) => {
      const r = box(p.el);
      const top = Math.max(r.top, 0);
      const bottom = Math.min(r.bottom, vh);
      return sum + Math.max(bottom - top, 0);
    }, 0);
    return `${Math.round((covered / vh) * 100)}%`;
  })();

  // --- shell and text-to-control placement (usability/05 sections 1, 5, 11) --
  // Three numbers a shell review quotes: prose wedged between two controls,
  // tab strips that wrap to a second row, and destinations a rail and a top bar
  // both hold (the competing-primaries defect).
  const isControl = (el) =>
    !!el && el.matches('button, input, select, textarea, fieldset, [role="button"], [role="group"], [role="tablist"], form');
  const proseBetweenControls = [...content.querySelectorAll('p')]
    .filter((p) => visible(p) && words(p) >= proseWordFloor && isControl(p.previousElementSibling) && isControl(p.nextElementSibling))
    .map((p) => ({ words: words(p), text: prefix(p) }));
  const tabStrips = [...document.querySelectorAll('[role="tablist"]')].map((t) => {
    const tabs = [...t.querySelectorAll('[role="tab"]')].filter(visible);
    const rows = new Set(tabs.map((x) => Math.round(box(x).top)));
    return { tabs: tabs.length, rows: rows.size, label: describe(t) };
  });
  const hrefs = (el) => new Set([...el.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && h !== '#'));
  const topBarNav = document.querySelector('header nav, [data-region="topbar"] nav, [role="banner"] nav');
  const railNav = document.querySelector('aside nav, [data-region="rail"] nav, nav[aria-label*="primary" i], nav[aria-label*="main" i]');
  const duplicateDestinations =
    topBarNav && railNav && topBarNav !== railNav
      ? [...hrefs(topBarNav)].filter((h) => hrefs(railNav).has(h))
      : [];

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
      what: `${prose.length} visible paragraph(s) over the ${budget.label} budget of ${paragraphLimit} words, worst ${prose[0].words}`,
      note: 'Lead stays visible, qualifications move into a named disclosure. Destructive-action warnings are exempt and stay whole.',
    });
  }
  // W11 (HIGH, presence-flaggable): the prose blob above the primary content.
  if (wordsBeforePrimary > ledeBudget) {
    findings.push({
      severity: 'HIGH',
      what: `W11 prose blob: ${wordsBeforePrimary} words of running prose above ${primarySelector}, lede budget ${ledeBudget} on a ${budget.label}`,
      note: 'The product comes first: H1, identity block, one lede, one action. Explanation, methodology and search copy move below the primary content into a headed section, or behind a details whose summary names what is inside.',
    });
  }
  if (heroParagraphs.length) {
    findings.push({
      severity: 'HIGH',
      what: `W11 paragraph inside the hero: ${heroParagraphs.length} (worst ${heroParagraphs[0].words} words)`,
      note: 'A hero carries a headline, a subtext of about 20 words, one action and its focal visual. A paragraph in the hero is the blob at the top of the page.',
    });
  }
  // W12 (MEDIUM): two or more orphans, or one over the word limit.
  if (orphans.length >= 2 || orphans.some((o) => o.words > orphanWordLimit)) {
    findings.push({
      severity: 'MEDIUM',
      what: `W12 orphan paragraph(s): ${orphans.length}, worst ${Math.max(
        ...orphans.map((o) => o.words),
      )} words`,
      note: 'Every paragraph gets a home: a headed section, a container of its own kind, a measure of 45 to 75ch. Prose that explains a component becomes its caption, helper or empty state.',
    });
  }
  // L14 (MEDIUM): the text-only section run.
  if (longestTextOnlyRun >= textOnlyRunLimit) {
    findings.push({
      severity: 'MEDIUM',
      what: `L14 text-only section run: ${longestTextOnlyRun} consecutive sections with no non-text device (${textOnlySections} text-only in total)`,
      note: 'Every second section carries a figure, a table, an image, a control, a chart or an entity list with icons. Never fixed by adding prose: the rule is a non-text child, not a word count.',
    });
  }
  for (const s of slotReflowRisk.slice(0, 3)) {
    findings.push({
      severity: 'HIGH',
      what: `Slot reflow risk: ${s.selector} reserves no space (no min-height, aspect-ratio or contain-intrinsic-size)`,
      note: s.textSibling
        ? 'A text block is a flow sibling, so a paragraph sits beside the slot on one load and under the H1 on the next. Reserve the slot, or collapse it with display:none when empty.'
        : 'No prose sibling found, so this is the CLS half of the same defect (performance/01-core-web-vitals.md). Reserve the slot, or collapse it with display:none when empty.',
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

  if (proseBetweenControls.length) {
    findings.push({
      severity: 'HIGH',
      what: `${proseBetweenControls.length} paragraph(s) wedged between two controls (worst ${proseBetweenControls[0].words} words)`,
      note: 'No prose between controls: a section intro sits above the group, the guide below the tool, or behind a labelled disclosure (usability/05 section 11).',
    });
  }
  for (const t of tabStrips.filter((x) => x.rows > 1).slice(0, 3)) {
    findings.push({
      severity: 'HIGH',
      what: `Tab strip ${t.label} wraps to ${t.rows} rows (${t.tabs} tabs)`,
      note: 'One row only; past that, expanded sections on desktop and an accordion on mobile (usability/05 section 5).',
    });
  }
  if (duplicateDestinations.length) {
    findings.push({
      severity: 'HIGH',
      what: `${duplicateDestinations.length} destination(s) held by both the top bar and the rail: ${duplicateDestinations.slice(0, 4).join(', ')}`,
      note: 'Two regions owning primary destinations is the competing-primaries defect; pick one owner per destination (usability/05 section 1).',
    });
  }

  const report = {
    surface,
    budget: {
      // 'no bar' rather than Infinity: an article template has no volume
      // ceiling, and a null in a pasted measurement reads as a missing number.
      lede: ledeBudget === Infinity ? 'no bar' : ledeBudget,
      paragraph: paragraphLimit === Infinity ? 'no bar' : paragraphLimit,
      label: budget.label,
    },
    viewport,
    contentWidth,
    utilisation: `${utilisation}%`,
    unusedPx: viewport - contentWidth,
    pageHeight,
    screens,
    disclosures: `${disclosuresOpen} open / ${disclosures} total`,
    tallestSections: sections.slice(0, 5),
    longParagraphs: prose.slice(0, 8),
    longestParagraph,
    totalVisibleWords,
    wordsPerSection,
    primarySelector,
    wordsBeforePrimary,
    // design/12 section 7 names this number `wordsAboveFirstPrimary`. Same value.
    wordsAboveFirstPrimary: wordsBeforePrimary,
    proseShareOfFirstViewport,
    heroParagraphs,
    orphanParagraphs: { count: orphans.length, paragraphs: orphans.slice(0, 8) },
    sectionRows: {
      sections: sectionRows.length,
      textOnlySections,
      longestTextOnlyRun,
      sectionlessMain,
    },
    slotReflowRisk,
    shell: {
      proseBetweenControls: proseBetweenControls.slice(0, 6),
      tabStrips,
      duplicateDestinations,
      topBarNav: !!topBarNav,
      railNav: !!railNav,
    },
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
      `density @ ${viewport}px (${budget.label}) — utilisation ${utilisation}%, ${screens} screens, ${wordsBeforePrimary} words before ${primarySelector}, ${findings.length} finding(s)`,
    );
    if (findings.length) console.table(findings);
  }
  return report;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { measureDensity, DENSITY_SURFACE_BUDGETS };
}
