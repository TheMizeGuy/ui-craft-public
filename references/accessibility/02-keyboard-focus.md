---
topic: accessibility
role: reference
scope: keyboard-focus
audience: ui-engineer
---

# Keyboard and Focus — Reference for UI Engineers

Focus management is where most UI-engineering accessibility bugs live. Source material: W3C WAI-ARIA APG, MDN, web.dev.

## 1. Why keyboard navigation is non-negotiable

| Audience | Why they rely on it |
|---|---|
| Screen reader users | Screen readers drive navigation via the keyboard, not the mouse |
| Motor-impairment users | Cannot aim at small targets with a pointer |
| RSI / injured / temporarily impaired | Typing is safer than mousing for some |
| Power users | Keyboard > mouse for speed in forms, lists, IDEs |
| Switch control users | Switches map to Tab/Enter |
| SEO crawlers | Traverse tabbable order; unreachable content isn't indexed fully |
| Automated tests | Playwright `page.keyboard.press('Tab')` relies on correct tab order |

If the keyboard flow breaks, the app breaks for roughly everyone in categories 1-4 — well over 15% of users in the aggregate.

## 2. Native focusable elements

Focus is built in — do NOT re-implement these as divs.

| Element | Focusable by default | Notes |
|---|---|---|
| `<a href>` | Yes | Only with `href`; `<a>` without `href` is not focusable |
| `<button>` | Yes | Best default for any click action |
| `<input>` (not `type="hidden"`) | Yes | All form inputs |
| `<select>` | Yes | Native dropdown |
| `<textarea>` | Yes | |
| `<details>` / `<summary>` | `<summary>` yes | Native disclosure |
| `[contenteditable]` | Yes | |
| Element with `tabindex="0"` | Yes | Opt in for custom widgets |
| Element with `tabindex="-1"` | Programmatically only | `element.focus()` works; Tab skips it |
| `<iframe>` | Focusable; its content has its own tab order | |
| `<div>`, `<span>`, etc. | NO | Add `tabindex="0"` AND a role AND keyboard handlers |

Rule: if a user can click it, a user must be able to keyboard-activate it. Native first; `tabindex="0"` only as last resort.

## 3. `tabindex` usage rules

| Value | Meaning | Use when |
|---|---|---|
| (absent) | Native default — focusable if element is natively focusable | Default for native elements |
| `0` | In normal tab order, follows DOM | Custom widget that needs to be reachable via Tab |
| `-1` | Focusable programmatically via `.focus()`, skipped by Tab | Modals' root (for focus restoration), items in a roving-tabindex group, hidden-but-focusable elements |
| Positive integer | In tab order, ranked BEFORE `0` items by value | **FORBIDDEN.** Breaks intuitive order, fights with DOM, fragile to DOM changes |

```html
<!-- OK: custom toggle -->
<div role="switch" tabindex="0" aria-checked="false"
     onkeydown="if (e.key === ' ' || e.key === 'Enter') toggle()">
</div>

<!-- OK: roving tabindex within a listbox -->
<ul role="listbox">
  <li role="option" tabindex="0">First (active)</li>
  <li role="option" tabindex="-1">Second</li>
  <li role="option" tabindex="-1">Third</li>
</ul>

<!-- FORBIDDEN -->
<button tabindex="1">First</button>
<button tabindex="2">Second</button>
```

## 4. `:focus-visible` vs `:focus`

`:focus` fires on ANY focus (click, tap, keyboard). `:focus-visible` fires only when the browser heuristic says focus was keyboard-driven. Use `:focus-visible` for the visible ring; users who clicked don't need it.

```css
/* Remove native ring, then put it back for keyboard */
button,
[role="button"],
a,
input,
select,
textarea,
[tabindex] {
  outline: none;
}

button:focus-visible,
[role="button"]:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Fallback for old browsers (all modern browsers support :focus-visible since 2022) */
@supports not selector(:focus-visible) {
  button:focus { outline: 2px solid var(--ring); outline-offset: 2px; }
}
```

Never ship `button:focus { outline: none }` without a `:focus-visible` replacement. That fails 2.4.7 Focus Visible (Level AA).

## 5. Focus ring design

### Requirements

| Spec | Minimum | Better |
|---|---|---|
| Thickness (2.4.13) | >= 2px perimeter | 2-3px |
| Contrast (1.4.11) vs BOTH element and surrounding bg | >= 3:1 | APCA Lc 45+ |
| Area | At least the area a 2px solid perimeter would cover | 2px solid or dashed |
| Offset | 0 allowed | 2-3px `outline-offset` so ring sits outside the element |

### Implementation

```css
:root {
  /* Focus ring token — pick a hue that contrasts both surfaces and page bg */
  --ring: oklch(55% 0.25 250);
}

.btn:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

/* Dark-surface variant */
.btn-dark:focus-visible {
  outline: 2px solid oklch(85% 0.15 250);
  outline-offset: 2px;
}

/* Inside a card with border — move ring outside */
.card:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 4px;
}

/* color-mix fallback for dynamic contrast */
.btn:focus-visible {
  outline: 2px solid color-mix(in oklch, var(--ring) 100%, var(--surface) 0%);
}
```

Avoid the browser default — it looks inconsistent across browsers, often fails contrast, and is blue on blue for blue buttons.

## 6. Focus management in SPAs

When the DOM changes in place (route change, content swap), the browser doesn't move focus. You must.

### Route change

```tsx
// Next.js App Router example
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function RouteFocusManager({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    // On route change, move focus to <main> so SR users hear the new context
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <main ref={mainRef} tabIndex={-1} id="main">
      {children}
    </main>
  );
}
```

### After a modal closes

```tsx
function Dialog({ open, onClose, children }: Props) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      // Remember what opened us
      triggerRef.current = document.activeElement as HTMLElement;
    } else if (triggerRef.current) {
      // Restore focus on close
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [open]);

  return open ? <div role="dialog" aria-modal="true">{children}</div> : null;
}
```

### After an async action completes

```tsx
async function saveForm() {
  await api.save();
  // Move focus to the success region so SR reads it
  document.getElementById('save-result')?.focus();
}
```

## 7. Focus traps in modals

A modal must cycle Tab inside itself and return focus on close. Prefer a battle-tested library — do NOT roll your own in production. Edge cases (iframes, `inert` support, stacked modals, portal order) are numerous.

| Library | Notes |
|---|---|
| `focus-trap` / `focus-trap-react` | Well-tested; handles inert siblings, iframes, edge cases |
| `@react-aria/focus` / `FocusScope` | Adobe React Aria; handles auto-focus, restore, trap |
| Radix UI `Dialog` | Built on React Aria patterns; zero-config trap + restore |
| Headless UI `Dialog` | Tailwind team's modal primitive |

Minimal manual trap (when you genuinely cannot add a dependency):

```tsx
const focusableSel = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useFocusTrap(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const list = () => Array.from(el.querySelectorAll<HTMLElement>(focusableSel));
    list()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = list(); if (!items.length) return;
      const [first, last] = [items[0], items[items.length - 1]];
      const active = document.activeElement;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [ref]);
}
```

Also set `inert` on siblings of the modal (section 8 in the screen-reader reference).

## 8. Skip links

Skip links let keyboard/SR users jump past nav to the main content. Place them FIRST in the DOM. Visible on focus.

```html
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <header>...nav...</header>
  <main id="main" tabindex="-1">...</main>
</body>
```

```css
.skip-link {
  position: absolute;
  inset-inline-start: -9999px;
  top: 0;
  padding: 0.5rem 1rem;
  background: var(--surface);
  color: var(--text);
  z-index: 1000;
}

.skip-link:focus {
  inset-inline-start: 0;
}

/* Tailwind alternative using sr-only */
/* <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2">Skip to main content</a> */
```

Needed on every page layout (root layout in Next.js / Remix / SvelteKit).

## 9. Roving tabindex

For compound widgets (tabs, listbox, toolbar, menu, tree, grid), the entire widget is ONE tab stop. Arrow keys move within it. Tab moves past it.

| State | tabindex | Why |
|---|---|---|
| Active item | `0` | Reachable via Tab |
| Non-active items | `-1` | Programmatically focusable via arrow keys; not in tab order |

### Tabs example

```tsx
function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const max = tabs.length - 1;
    let next = active;
    switch (e.key) {
      case 'ArrowRight': next = active === max ? 0 : active + 1; break;
      case 'ArrowLeft':  next = active === 0 ? max : active - 1; break;
      case 'Home':       next = 0; break;
      case 'End':        next = max; break;
      default: return;
    }
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div role="tablist" onKeyDown={onKey}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={el => { tabRefs.current[i] = el; }}
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={i === active}
          aria-controls={`panel-${t.id}`}
          tabIndex={i === active ? 0 : -1}
          onClick={() => setActive(i)}
        >
          {t.label}
        </button>
      ))}
      {tabs.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={i !== active}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
```

Alternative for complex cases: `aria-activedescendant` pattern (focus stays on the container; `aria-activedescendant` points to the "active" child by id). Preferred for comboboxes where focus must stay on the input.

## 10. Custom keyboard shortcuts

### Rules

| Rule | Detail |
|---|---|
| Use a modifier | Plain `j` / `k` conflicts with screen reader quick-nav. Prefer `Cmd/Ctrl` + key, or `?` to show help |
| Don't remap core keys | Tab, Enter, Space, Esc, Arrow keys — never intercept unless you own the widget |
| Show the shortcut visibly | Keyboard hint pill `<kbd>Cmd</kbd> <kbd>K</kbd>` in the UI |
| Pair with a visible UI affordance | A button that opens the palette AND a shortcut to open it — don't force users to know the shortcut |
| Allow rebind / turn off | Required by 2.1.4 Character Key Shortcuts if single-char |
| Don't trigger in text fields | Check `event.target.tagName` against `INPUT/TEXTAREA/SELECT` and `contenteditable` |

### Library options

| Library | Notes |
|---|---|
| `react-hotkeys-hook` | React hook, handles scoping |
| `tinykeys` | Framework-agnostic, tiny |
| `cmdk` | Command palette with keyboard baked in |

### Safe global handler

```tsx
useEffect(() => {
  const isEditable = (el: EventTarget | null): boolean => {
    if (!(el instanceof HTMLElement)) return false;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return true;
    if (el.isContentEditable) return true;
    return false;
  };

  const onKey = (e: KeyboardEvent) => {
    if (isEditable(e.target)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  };

  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);
```

## 11. Screen reader virtual cursor caveat

In browse/virtual mode, screen readers (NVDA, JAWS, VoiceOver) intercept the keyboard to read the page line-by-line. Tab still reaches focusable elements but arrow keys read content, not navigate widgets. When the user activates a form field, SR enters forms/focus mode and your widget's keyboard handlers run.

| Mode | What happens |
|---|---|
| Browse mode (default) | Arrow keys read, Tab moves to next focusable, shortcuts work |
| Forms/focus mode (auto-entered on input focus) | All keys pass through to your widget |

Implications:

- Custom widgets with arrow-key handlers MUST have `role` set (combobox, listbox, slider, tablist, tree, grid). SRs enter forms mode on these roles.
- Don't rely on single-letter shortcuts in browse mode — NVDA uses them for quick nav (`H` for next heading, `K` for link).
- Test with VoiceOver (`Cmd+F5` on macOS) AND NVDA (Windows) — behaviors diverge.

## 12. Anti-patterns

| Anti-pattern | Why it breaks | Fix |
|---|---|---|
| `outline: none` with no `:focus-visible` replacement | Fails 2.4.7; keyboard users can't see focus | `button:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }` |
| Focus ring only on `:hover` not `:focus` | Hover is mouse; keyboard users see nothing | Use `:focus-visible` |
| `tabindex="1"`, `tabindex="2"` | Fragile, fights DOM order, skips non-numbered elements | Rely on DOM order + `tabindex="0"` only |
| `tabindex="0"` on every div "for SEO" | Bloats tab order; screen readers announce "clickable" on non-interactive content | Only on custom widgets |
| Focus jumping unexpectedly on render | Users lose context; SR re-announces | Don't call `.focus()` on mount unless it's a modal; respect user's current focus |
| Modal without focus trap | Tab escapes into hidden page | Use Radix / react-aria / focus-trap |
| No `aria-modal="true"` or no `inert` on siblings | SR reads hidden page behind modal | Set `role="dialog"` + `aria-modal="true"` AND `inert` attribute on siblings |
| Dropdown that doesn't restore focus to trigger on close | User lands somewhere random | Remember `document.activeElement` on open, `.focus()` it on close |
| Custom button that only responds to click | Keyboard users can't activate | Use `<button>`, or add `onKeyDown` for Enter and Space AND `role="button"` AND `tabindex="0"` |
| No skip link | 2.4.1 Bypass Blocks fail | `<a href="#main" class="skip-link">Skip to main</a>` |
| Route change without focus move | SR users don't know page changed | Move focus to `<main>` or first heading on route change |
| Typing-ahead in listbox broken | Fails APG pattern | Implement type-ahead: key matches first option starting with that char |
| Arrow keys don't move within widget | Tabs/Listbox/Menu should use arrows, not Tab | Roving tabindex or `aria-activedescendant` |
| Single-char shortcut with no disable/remap | Fails 2.1.4 | Require modifier, or provide setting to disable |
| Auto-focus an input on page load that triggers virtual keyboard on mobile | Disorienting, accidental taps | Only autofocus if the ONLY purpose of the page is that field (search) |

## Sources

- W3C WAI-ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- MDN `:focus-visible`: https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible
- MDN `tabindex`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex
- MDN `inert`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert
- web.dev — Control focus with tabindex: https://web.dev/articles/control-focus-with-tabindex
- web.dev — Keyboard: https://web.dev/learn/accessibility/keyboard/
- Radix Dialog (reference implementation): https://www.radix-ui.com/primitives/docs/components/dialog
- React Aria FocusScope: https://react-spectrum.adobe.com/react-aria/FocusScope.html
