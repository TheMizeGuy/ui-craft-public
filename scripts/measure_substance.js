/**
 * Measure the substance floor on a live page, and grade it.
 *
 * WHY THIS IS A SCRIPT AND NOT A CHECKLIST. Flatness renders perfectly. Nothing
 * clips, nothing overlaps, every contrast pair passes, and a reviewer reading
 * for an impression writes "feels grey", which is dismissed as taste. A chroma
 * value, a surface-level count, a boundary ratio and an image count cannot be
 * waved off. Paste the output into the finding.
 *
 * Thresholds and the reasoning behind each: references/aesthetic/06-substance-floor.md
 *
 * Covers, for the first viewport and the whole page: accent presence (roles and
 * painted area at chroma >= 0.08), the primary accent's chroma against the
 * 0.10 floor, the count of distinct surface levels and the contrast ratio
 * between adjacent levels, container boundaries (border contrast and the
 * hairline-alpha trap), the focal-visual check, imagery per section and
 * text-only sections, and how many hierarchy channels the type system uses.
 *
 * What it cannot see, stated so nobody trusts it further than it reaches
 * (references/review/06-measurement-traps.md): a box-shadow or an inset rim is
 * reported as PRESENT from computed style, and its rendered contrast needs a
 * pixel read-back of the boundary. `boundaryNeedsPixels` lists those elements.
 *
 * Usage (Playwright / CDP / devtools console): evaluate this file's contents,
 * then call it. It returns a plain object and prints a readable report.
 *
 *   const report = measureSubstance();                 // whole page, main as root
 *   const report = measureSubstance({ root: '#app', accentFloor: 0.10 });
 *
 * Usage (Playwright MCP):
 *   browser_evaluate with function: () => { <paste file>; return measureSubstance(); }
 *
 * It reads the DOM only. Nothing is mutated, nothing is navigated.
 */

function measureSubstance(options = {}) {
  const {
    root = 'main',
    // Primary accent chroma floor (OKLCH C). references/aesthetic/06 S2.
    accentFloor = 0.10,
    // A colour counts as chromatic (accent, identity) at or above this chroma.
    chromaticAt = 0.08,
    // A tint step between adjacent surface levels must clear this ratio. S3.
    tintStep = 1.15,
    // A border or rim against the surface it sits on must clear this ratio. S3, S4.
    edgeStep = 1.3,
    // Product and data surfaces need this many surface levels. S3.
    surfaceLevelsWanted = 3,
    // Marketing and content pages: one real image or figure per this many sections. S6.
    sectionsPerImage = 2,
  } = options;

  const px = (n) => Math.round(n);
  const box = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    if (!(el instanceof Element)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const b = box(el);
    return b.width > 0 && b.height > 0;
  };
  const inFirstViewport = (el) => {
    const b = box(el);
    return b.top < window.innerHeight && b.bottom > 0;
  };

  // --- colour maths: sRGB string -> { r, g, b, a, L (OKLCH), C, h, Y } -------
  // Chrome keeps oklch(), oklab(), lab(), lch() and color() in their own
  // notation in computed values (only sRGB-specified colours serialise to
  // rgb()), so every form is parsed. Relative colour syntax and color-mix()
  // over an oklch token come back as lab(): on a real site the brand fill on
  // the primary CTA computed to `lab(71.18 10.51 64.19)` and an earlier version
  // of this parser returned null for it, which made the S1 row report a tiny
  // quality-colour dot as the page's accent. A colour the parser cannot read is
  // counted in `unparsedColors` so the caller can see the gap instead of a
  // silent pass. `none` reads as 0; percentages are scaled.
  const unparsed = new Map();
  function num(tok, scale) {
    if (tok === 'none') return 0;
    if (tok.endsWith('%')) return (parseFloat(tok) / 100) * scale;
    return parseFloat(tok);
  }
  function make(r, g, b, a) {
    const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
    r = cl(r); g = cl(g); b = cl(b);
    return { r, g, b, a, ...oklch(r, g, b), Y: luminance(r, g, b) };
  }
  function parseColor(str) {
    if (!str || str === 'transparent') return null;
    let m = str.match(/^rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(/[\s,\/]+/).filter(Boolean);
      const [r, g, b] = parts.map((t) => num(t, 255));
      const a = parts.length > 3 ? num(parts[3], 1) : 1;
      if ([r, g, b].some((v) => Number.isNaN(v))) return null;
      return make(r, g, b, a);
    }
    m = str.match(/^oklch\(([^)]+)\)/);
    if (m) {
      const [main, alpha] = m[1].split('/');
      const t = main.trim().split(/\s+/);
      const L = num(t[0], 1), C = num(t[1] || '0', 0.4), h = num(t[2] || '0', 360);
      const rad = (h * Math.PI) / 180;
      return fromOklab(L, C * Math.cos(rad), C * Math.sin(rad), alpha ? num(alpha.trim(), 1) : 1);
    }
    m = str.match(/^oklab\(([^)]+)\)/);
    if (m) {
      const [main, alpha] = m[1].split('/');
      const t = main.trim().split(/\s+/);
      return fromOklab(num(t[0], 1), num(t[1] || '0', 0.4), num(t[2] || '0', 0.4), alpha ? num(alpha.trim(), 1) : 1);
    }
    m = str.match(/^lab\(([^)]+)\)/);
    if (m) {
      const [main, alpha] = m[1].split('/');
      const t = main.trim().split(/\s+/);
      return fromLab(num(t[0], 100), num(t[1] || '0', 125), num(t[2] || '0', 125), alpha ? num(alpha.trim(), 1) : 1);
    }
    m = str.match(/^lch\(([^)]+)\)/);
    if (m) {
      const [main, alpha] = m[1].split('/');
      const t = main.trim().split(/\s+/);
      const L = num(t[0], 100), C = num(t[1] || '0', 150), h = num(t[2] || '0', 360);
      const rad = (h * Math.PI) / 180;
      return fromLab(L, C * Math.cos(rad), C * Math.sin(rad), alpha ? num(alpha.trim(), 1) : 1);
    }
    m = str.match(/^color\((srgb|srgb-linear|display-p3)\s+([^)]+)\)/);
    if (m) {
      const [main, alpha] = m[2].split('/');
      const t = main.trim().split(/\s+/);
      const a = alpha ? num(alpha.trim(), 1) : 1;
      const v = [num(t[0], 1), num(t[1], 1), num(t[2], 1)];
      if (m[1] === 'srgb') return make(v[0] * 255, v[1] * 255, v[2] * 255, a);
      if (m[1] === 'srgb-linear') return fromLinear(v[0], v[1], v[2], a);
      // display-p3: decode the P3 transfer curve (same curve as sRGB), map
      // linear P3 to XYZ D65 and on to linear sRGB.
      const dec = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      const [pr, pg, pb] = v.map(dec);
      const X = 0.4865709486482162 * pr + 0.26566769316909306 * pg + 0.1982172852343625 * pb;
      const Y = 0.2289745640697488 * pr + 0.6917385218365064 * pg + 0.079286914093745 * pb;
      const Z = 0.0 * pr + 0.04511338185890264 * pg + 1.043944368900976 * pb;
      return fromXyz65(X, Y, Z, a);
    }
    // Anything else (hsl(), hwb(), a named colour, a colour space not listed
    // above): paint it on a 1x1 canvas and read the pixel back, which is the
    // format-proof path review/06-measurement-traps.md section 1 prescribes.
    // Exact parsing stays first because the read-back loses precision at low
    // alpha, which is where the hairline trap lives.
    const viaCanvas = paintAndRead(str);
    if (viaCanvas) return viaCanvas;
    unparsed.set(str, (unparsed.get(str) || 0) + 1);
    return null;
  }
  let canvasCtx = null;
  function paintAndRead(str) {
    try {
      if (typeof document === 'undefined') return null;
      if (!canvasCtx) {
        const c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        canvasCtx = c.getContext('2d', { willReadFrequently: true });
      }
      if (!canvasCtx) return null;
      canvasCtx.fillStyle = '#010203';
      canvasCtx.fillStyle = str;
      if (canvasCtx.fillStyle === '#010203') return null; // rejected string, sentinel survived
      canvasCtx.clearRect(0, 0, 1, 1);
      canvasCtx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = canvasCtx.getImageData(0, 0, 1, 1).data;
      return make(r, g, b, a / 255);
    } catch {
      return null;
    }
  }
  // CIELAB (CSS lab() is D50-relative) -> XYZ D50 -> Bradford to D65 -> sRGB.
  function fromLab(L, A, B, a) {
    const k = 24389 / 27, e = 216 / 24389;
    const fy = (L + 16) / 116, fx = fy + A / 500, fz = fy - B / 200;
    const xr = fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k;
    const yr = L > k * e ? fy ** 3 : L / k;
    const zr = fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k;
    const X = xr * 0.9642956764295677, Y = yr, Z = zr * 0.8251046025104602;
    const X65 = 0.9554734527042182 * X - 0.023098536874261423 * Y + 0.0632593086610217 * Z;
    const Y65 = -0.028369706963208136 * X + 1.0099954580058226 * Y + 0.021041398966943008 * Z;
    const Z65 = 0.012314001688319899 * X - 0.020507696433477912 * Y + 1.3303659366080753 * Z;
    return fromXyz65(X65, Y65, Z65, a);
  }
  function fromXyz65(X, Y, Z, a) {
    const R = 3.2409699419045226 * X - 1.537383177570094 * Y - 0.4986107602930034 * Z;
    const G = -0.9692436362808796 * X + 1.8759675015077202 * Y + 0.04155505740717559 * Z;
    const B = 0.05563007969699366 * X - 0.20397695888897652 * Y + 1.0569715142428786 * Z;
    return fromLinear(R, G, B, a);
  }
  function fromLinear(R, G, B, a) {
    const enc = (v) => {
      v = Math.max(0, Math.min(1, v));
      return (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255;
    };
    return make(enc(R), enc(G), enc(B), a);
  }
  function fromOklab(L, A, B, a) {
    const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
    const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
    const s_ = L - 0.0894841775 * A - 1.291485548 * B;
    const l = l_ ** 3, m = m_ ** 3, sv = s_ ** 3;
    const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * sv;
    const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * sv;
    const Bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * sv;
    return fromLinear(R, G, Bl, a);
  }
  function lin(c) {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function luminance(r, g, b) {
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  function oklch(r, g, b) {
    const R = lin(r), G = lin(g), B = lin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    const C = Math.sqrt(A * A + Bb * Bb);
    let h = (Math.atan2(Bb, A) * 180) / Math.PI;
    if (h < 0) h += 360;
    return { L: +L.toFixed(3), C: +C.toFixed(3), h: Math.round(h) };
  }
  // WCAG contrast ratio between two opaque colours.
  const ratio = (c1, c2) => {
    const hi = Math.max(c1.Y, c2.Y), lo = Math.min(c1.Y, c2.Y);
    return +((hi + 0.05) / (lo + 0.05)).toFixed(3);
  };
  // Composite a translucent colour over a background.
  const over = (fg, bg) => {
    if (!fg || !bg) return fg || bg;
    if (fg.a >= 1) return fg;
    const mix = (f, b) => Math.round(f * fg.a + b * (1 - fg.a));
    const r = mix(fg.r, bg.r), g = mix(fg.g, bg.g), b = mix(fg.b, bg.b);
    return { r, g, b, a: 1, ...oklch(r, g, b), Y: luminance(r, g, b) };
  };
  // Nearest painted ancestor background (opaque), for compositing and edges.
  function paintedBg(el) {
    let node = el.parentElement;
    while (node) {
      const c = parseColor(getComputedStyle(node).backgroundColor);
      if (c && c.a >= 0.99) return c;
      node = node.parentElement;
    }
    const body = parseColor(getComputedStyle(document.body).backgroundColor);
    if (body && body.a >= 0.99) return body;
    const r = parseColor(getComputedStyle(document.documentElement).backgroundColor);
    return r && r.a >= 0.99 ? r : { r: 255, g: 255, b: 255, a: 1, ...oklch(255, 255, 255), Y: 1 };
  }

  const content =
    document.querySelector(root) || document.querySelector('main') || document.body;
  const all = [...content.querySelectorAll('*')].filter(visible);
  const firstView = all.filter(inFirstViewport);
  const viewportArea = window.innerWidth * window.innerHeight;

  // --- accent presence and chroma ------------------------------------------
  const roleOf = (el) => {
    const tag = el.tagName.toLowerCase();
    if (el.matches('[aria-current], [aria-selected="true"], .active, .selected')) return 'selected';
    if (tag === 'button' || el.matches('[role="button"], input[type="submit"]')) return 'action';
    if (tag === 'a') return 'link';
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'svg' || tag === 'img') return 'icon-or-image';
    if (el.matches('[class*="badge"], [class*="chip"], [class*="tag"], [class*="pill"]')) return 'badge';
    if (el.matches('[class*="stat"], [class*="figure"], [class*="value"], strong, b')) return 'figure';
    return 'surface';
  };
  const chromatic = []; // { el, role, source, color, area }
  const hues = new Map();
  for (const el of firstView) {
    const cs = getComputedStyle(el);
    const bg = parseColor(cs.backgroundColor);
    const fg = parseColor(cs.color);
    const bc = parseColor(cs.borderTopColor);
    const b = box(el);
    const area = b.width * b.height;
    const push = (source, c, useArea) => {
      if (!c || c.a < 0.2 || c.C < chromaticAt) return;
      const role = roleOf(el);
      chromatic.push({ role, source, C: c.C, L: c.L, h: c.h, area: useArea ? area : 0 });
      const key = Math.round(c.h / 15) * 15; // 15-degree hue buckets
      hues.set(key, (hues.get(key) || 0) + 1);
    };
    push('background', bg, true);
    push('text', fg, false);
    if (parseFloat(cs.borderTopWidth) > 0) push('border', bc, false);
  }
  const accentRoles = [...new Set(chromatic.map((c) => c.role))];
  const accentFillRoles = [...new Set(chromatic.filter((c) => c.source === 'background').map((c) => c.role))];
  const accentArea = +((chromatic.reduce((sum, c) => sum + c.area, 0) / viewportArea) * 100).toFixed(2);
  // The primary accent: the most-used chromatic hue bucket on actions, links and selection.
  const preferred = chromatic.filter((c) => ['action', 'link', 'selected', 'badge', 'heading', 'figure'].includes(c.role));
  const accentCandidates = preferred.length ? preferred : chromatic;
  const byHue = new Map();
  for (const c of accentCandidates) {
    const key = Math.round(c.h / 15) * 15;
    const cur = byHue.get(key) || { n: 0, C: 0, L: 0, h: key };
    cur.n += 1; cur.C = Math.max(cur.C, c.C); cur.L = c.L;
    byHue.set(key, cur);
  }
  const primaryAccent = [...byHue.values()].sort((a, b) => b.n - a.n)[0] || null;
  const hueCount = hues.size;

  // --- surface levels ------------------------------------------------------
  const containerSel = 'main, section, article, aside, nav, header, footer, table, form, dialog, div, li, pre, ul, ol, dl, fieldset, figure, details, tr';
  const surfaces = new Map(); // key: rounded L -> { color, count, example }
  const base = paintedBg(content);
  surfaces.set(base.L.toFixed(2), { L: base.L, C: base.C, h: base.h, Y: base.Y, count: 1, example: 'page ground' });
  const boundaries = [];
  const boundaryNeedsPixels = [];
  const hairlineTraps = [];
  for (const el of all.filter((e) => e.matches(containerSel))) {
    const cs = getComputedStyle(el);
    const bgRaw = parseColor(cs.backgroundColor);
    const b = box(el);
    if (b.width < 48 || b.height < 24) continue;
    const parentBg = paintedBg(el);
    const bg = bgRaw && bgRaw.a > 0.01 ? over(bgRaw, parentBg) : null;
    if (bg) {
      const key = bg.L.toFixed(2);
      const cur = surfaces.get(key) || { L: bg.L, C: bg.C, h: bg.h, Y: bg.Y, count: 0, example: '' };
      cur.count += 1;
      if (!cur.example) cur.example = el.id ? `#${el.id}` : el.className ? `.${String(el.className).split(' ')[0]}` : el.tagName.toLowerCase();
      surfaces.set(key, cur);
    }
    const sides = [['Top', cs.borderTopWidth, cs.borderTopColor], ['Bottom', cs.borderBottomWidth, cs.borderBottomColor], ['Left', cs.borderLeftWidth, cs.borderLeftColor], ['Right', cs.borderRightWidth, cs.borderRightColor]]
      .map(([side, w, c]) => ({ side, w: parseFloat(w) || 0, c: parseColor(c) }))
      .filter((x) => x.w > 0 && x.c && x.c.a > 0)
      .sort((a, b) => b.w - a.w);
    const bw = sides.length ? sides[0].w : 0;
    const bcRaw = sides.length ? sides[0].c : null;
    const shadow = cs.boxShadow && cs.boxShadow !== 'none';
    const label = el.id ? `#${el.id}` : el.className ? `.${String(el.className).split(' ')[0]}` : el.tagName.toLowerCase();
    if (bw > 0 && bcRaw && bcRaw.a > 0) {
      const own = bg || parentBg;
      const edge = over(bcRaw, own);
      const r = ratio(edge, own);
      boundaries.push({ el: label, device: 'border', alpha: +bcRaw.a.toFixed(2), ratio: r });
      if (bcRaw.a <= 0.10 && own.L < 0.25 && r < edgeStep) {
        hairlineTraps.push({ el: label, alpha: +bcRaw.a.toFixed(2), ratio: r });
      }
    }
    if (shadow) boundaryNeedsPixels.push({ el: label, device: 'box-shadow', shadow: cs.boxShadow.slice(0, 80) });
    if (bg && !shadow && bw === 0) {
      boundaries.push({ el: label, device: 'tint', ratio: ratio(bg, parentBg) });
    }
  }
  // Repeated rows (every .row on a list) collapse to one line per label, device and ratio.
  const seen = new Set();
  for (let i = boundaries.length - 1; i >= 0; i -= 1) {
    const k = `${boundaries[i].el}|${boundaries[i].device}|${boundaries[i].ratio}`;
    if (seen.has(k)) boundaries.splice(i, 1); else seen.add(k);
  }
  const seenTrap = new Set();
  for (let i = hairlineTraps.length - 1; i >= 0; i -= 1) {
    const k = `${hairlineTraps[i].el}|${hairlineTraps[i].alpha}|${hairlineTraps[i].ratio}`;
    if (seenTrap.has(k)) hairlineTraps.splice(i, 1); else seenTrap.add(k);
  }
  const levels = [...surfaces.values()].sort((a, b) => a.L - b.L);
  const levelSteps = levels.slice(1).map((lv, i) => ({
    from: levels[i].L, to: lv.L,
    ratio: ratio(levels[i], lv),
  }));
  const perceivableSteps = levelSteps.filter((s) => s.ratio >= tintStep).length;
  const surfaceLevels = perceivableSteps + 1;
  const weakBoundaries = boundaries.filter((b) => (b.device === 'border' ? b.ratio < edgeStep : b.ratio < tintStep));

  // --- focal visual and imagery ---------------------------------------------
  const visualSel = 'img, picture, video, canvas, figure, [role="img"]';
  const bigSvg = (el) => el.tagName.toLowerCase() === 'svg' && box(el).width >= 48 && box(el).height >= 48;
  const displayHeading = (el) => /^h[1-2]$/.test(el.tagName.toLowerCase()) && parseFloat(getComputedStyle(el).fontSize) >= 40;
  const firstViewportVisual = firstView.some((el) => el.matches(visualSel) || bigSvg(el) || displayHeading(el));
  const sections = [...content.querySelectorAll('section, article')].filter(visible);
  const sectionRows = sections.map((s) => ({
    label: s.id || s.className || s.tagName.toLowerCase(),
    images: s.querySelectorAll(visualSel).length + [...s.querySelectorAll('svg')].filter(bigSvg).length,
    nonText: s.querySelectorAll(`${visualSel}, svg, table, form, ul, ol, dl, button, [role="list"], input, select`).length,
  }));
  const textOnlySections = sectionRows.filter((r) => r.nonText === 0).map((r) => r.label);
  const totalImages = sectionRows.reduce((n, r) => n + r.images, 0) + (sections.length ? 0 : content.querySelectorAll(visualSel).length);
  const imagesPerSection = sections.length ? +(totalImages / sections.length).toFixed(2) : null;
  const entityRows = [...content.querySelectorAll('tbody tr, [role="row"], li')].filter(visible);
  const entityRowsWithIcon = entityRows.filter((r) => r.querySelector('img, svg, picture, [role="img"]')).length;

  // --- hierarchy channels ----------------------------------------------------
  const textEls = all.filter((el) => el.children.length === 0 && (el.textContent || '').trim().length > 0);
  const weights = new Set(), sizes = new Set();
  for (const el of textEls) {
    const cs = getComputedStyle(el);
    weights.add(cs.fontWeight);
    sizes.add(Math.round(parseFloat(cs.fontSize)));
  }
  const containment = boundaries.filter((b) => (b.device === 'border' ? b.ratio >= edgeStep : b.ratio >= tintStep)).length > 0;
  const channels = [
    weights.size >= 3 ? 'weight' : null,
    sizes.size >= 3 ? 'size' : null,
    hueCount >= 2 ? 'colour' : null,
    containment ? 'containment' : null,
    firstViewportVisual ? 'iconography-or-image' : null,
  ].filter(Boolean);

  // --- grading --------------------------------------------------------------
  const findings = [];
  if (!primaryAccent) {
    findings.push({ severity: 'HIGH', check: 'S1', what: 'No chromatic colour (chroma >= ' + chromaticAt + ') anywhere in the first viewport', note: 'The brand accent must be visible on first paint in at least two roles, one of them a fill.' });
  } else {
    if (accentRoles.length < 2 || accentFillRoles.length === 0) {
      findings.push({ severity: 'HIGH', check: 'S1', what: `Accent present in ${accentRoles.length} role(s) (${accentRoles.join(', ') || 'none'}), fill roles: ${accentFillRoles.join(', ') || 'none'}`, note: 'At least two roles, at least one a fill.' });
    }
    if (primaryAccent.C < accentFloor) {
      findings.push({ severity: 'HIGH', check: 'S2', what: `Primary accent chroma ${primaryAccent.C} at hue ${primaryAccent.h}, under the ${accentFloor} floor`, note: 'A muted brand is a stated decision carrying anti-slop-allow, or it is a finding.' });
    }
  }
  if (surfaceLevels < surfaceLevelsWanted) {
    findings.push({ severity: surfaceLevels <= 1 ? 'HIGH' : 'MEDIUM', check: 'S3', what: `${surfaceLevels} perceivable surface level(s) (${levels.length} distinct backgrounds, ${perceivableSteps} step(s) over ${tintStep}:1)`, note: 'Base, raised and overlay must differ by a measured ratio, or by an edge that measures. Shadows and rims need a pixel read-back.' });
  }
  if (hairlineTraps.length) {
    findings.push({ severity: 'HIGH', check: 'S4', what: `${hairlineTraps.length} container class(es) whose only boundary is a hairline at <= 0.10 alpha on a dark ground (worst ${hairlineTraps[0].ratio}:1)`, note: 'That is not an edge. Raise the alpha until it measures, add a rim, or step the tint.' });
  }
  if (weakBoundaries.length && !hairlineTraps.length) {
    findings.push({ severity: 'MEDIUM', check: 'S4', what: `${weakBoundaries.length} container boundary(ies) under the floor (edge < ${edgeStep}:1 or tint < ${tintStep}:1)`, note: 'Findable at 100% zoom on the target display, or it is not a boundary.' });
  }
  if (!firstViewportVisual) {
    findings.push({ severity: 'HIGH', check: 'S5', what: 'First viewport carries no focal visual (no image, figure, chart, large icon or display-scale heading)', note: 'Every screen opens with the most characteristic thing in the subject\'s world. Exempt only on an article template.' });
  }
  if (sections.length >= 2 && totalImages === 0) {
    findings.push({ severity: 'HIGH', check: 'S6', what: `Zero real images or figures across ${sections.length} sections`, note: 'On a visual product this is I8. Show the product.' });
  } else if (imagesPerSection !== null && imagesPerSection < 1 / sectionsPerImage) {
    findings.push({ severity: 'MEDIUM', check: 'S6', what: `${totalImages} image(s) over ${sections.length} sections (${imagesPerSection} per section)`, note: `Floor is one per ${sectionsPerImage} sections on marketing and content pages.` });
  }
  if (entityRows.length >= 5 && entityRowsWithIcon === 0) {
    findings.push({ severity: 'MEDIUM', check: 'S6', what: `${entityRows.length} entity rows, none carrying an icon or thumbnail`, note: 'Where the domain has icons (items, classes, products, people), rows carry them.' });
  }
  if (channels.length < 3) {
    findings.push({ severity: 'HIGH', check: 'S7', what: `Hierarchy carried by ${channels.length} channel(s): ${channels.join(', ') || 'none'} (weights ${weights.size}, sizes ${sizes.size}, hues ${hueCount})`, note: 'At least three of weight, size, colour, containment, iconography.' });
  }
  if (textOnlySections.length >= 3) {
    findings.push({ severity: 'MEDIUM', check: 'L14', what: `${textOnlySections.length} text-only section(s): ${textOnlySections.slice(0, 4).join(', ')}`, note: 'Every second section carries a non-text device.' });
  }

  const report = {
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    accent: primaryAccent ? { hue: primaryAccent.h, chroma: primaryAccent.C, lightness: primaryAccent.L } : null,
    accentRoles,
    accentFillRoles,
    accentArea: `${accentArea}% of first viewport`,
    hueCount,
    surfaceLevels,
    surfaceLadder: levels.map((l) => ({ L: l.L, C: l.C, count: l.count, example: l.example })).slice(0, 8),
    levelSteps,
    boundaries: boundaries.slice(0, 12),
    weakBoundaries: weakBoundaries.slice(0, 8),
    hairlineTraps,
    boundaryNeedsPixels: boundaryNeedsPixels.slice(0, 8),
    firstViewportVisual,
    sections: sectionRows.slice(0, 12),
    textOnlySections,
    imagesPerSection,
    entityRows: { total: entityRows.length, withIcon: entityRowsWithIcon },
    hierarchyChannels: channels,
    weightCount: weights.size,
    sizeCount: sizes.size,
    // Computed colours the parser could not read, with counts. Non-empty means
    // the accent and surface rows above may have missed a device; read the
    // render before trusting an S1 or S3 FAIL on this page.
    unparsedColors: [...unparsed.entries()].map(([color, count]) => ({ color, count })).slice(0, 10),
    findings,
    verdict: findings.some((f) => f.severity === 'HIGH')
      ? 'HIGH substance findings present'
      : findings.length
        ? 'MEDIUM substance findings present'
        : 'no substance findings at this viewport',
  };

  if (typeof console !== 'undefined' && console.table) {
    console.log(
      `substance @ ${report.viewport} — accent ${primaryAccent ? `C ${primaryAccent.C} h ${primaryAccent.h}` : 'none'}, ${surfaceLevels} surface level(s), ${hueCount} hue(s), focal visual ${firstViewportVisual}, ${findings.length} finding(s)`,
    );
    if (findings.length) console.table(findings);
  }
  return report;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { measureSubstance };
}
