---
topic: usability
role: reference
scope: navigation-and-information-architecture
audience: ui-designer
---

# Navigation and Information Architecture

**Scope note.** This file is about navigation as a user journey: how the product
is organized, how someone knows where they are, and how they get back. It is not
about keyboard navigation (`references/accessibility/02-keyboard-focus.md`) and
not about a platform's navigation widget (`references/platform/02-apple-overlay.md`,
`references/platform/03-android-overlay.md`). Those cover the mechanics of moving
focus and the correct component to use. This covers whether the structure those
components express is the right one.

Before this file existed, every navigation reference in the plugin was one of
those two things, which meant a reviewer could confirm that a `NavigationStack`
was used correctly while the app was six levels deep, gave no indication of the
current section, and stranded anyone who arrived from a shared link. IA defects
are the most expensive class to fix after launch, because fixing them moves URLs,
breaks bookmarks, and retrains users.

## 1. Navigation models

Pick the model from the content's shape and the user's task, not from the
component library.

| Model | Shape | Fits when | Fails when | Typical |
|---|---|---|---|---|
| Flat | 2 to 5 peer destinations, no nesting | The whole product is a handful of equal surfaces | Growth adds a sixth, then a seventh, and the bar becomes a menu of menus | Small utility apps, marketing sites |
| Hub and spoke | A center the user always returns to; spokes are self-contained tasks | Tasks are discrete, done one at a time, and the hub is genuinely useful | Users need to move spoke to spoke, and every move costs two navigations | Banking apps, settings hubs, admin consoles |
| Hierarchical (tree) | Sections containing subsections containing items | Content has genuine parent and child relationships people already understand | Depth grows past 3 or 4, or the hierarchy reflects the org chart instead of the content | Documentation, file systems, catalogues, most B2B products |
| Tabbed or faceted | One data set, several views or filters over it | The user's mental model is "the same thing, seen differently" | Tabs hold unrelated destinations, which makes them a nav bar in disguise | Analytics, inboxes, product listings |
| Global plus contextual (hybrid) | A persistent global nav plus a local nav scoped to the current section | Large products where users live inside one section for long stretches | The two navs compete for the same region, or the local nav is a second copy of the global | Cloud consoles, IDEs, large SaaS |
| Search-first | Search is the primary way in; browse is secondary | The item count is large and users know what they want by name | Users do not know the vocabulary, so they cannot form a query | Large catalogues, log tools, knowledge bases |

**The model must be one of these and stated.** A product where three of them are
half-implemented is the most common structural defect: a sidebar tree, a top
tab bar, and an in-page tab set, all changing the same content region, none of
them clearly primary. **One nav owns the primary region.** Everything else is
scoped underneath it and looks subordinate.

Search-first is a decision with a cost that is routinely underestimated: it
requires the user to already know what things are called. When the domain
vocabulary is the product's own invention, browse has to be good too.

## 2. Depth and breadth

| Measure | Threshold | Severity past it |
|---|---|---|
| Levels from the entry point to the deepest routine destination | 3 for consumer, 4 for admin or tooling | MEDIUM at one over, HIGH at two over |
| Peer items at any one level | 7 comfortable, 9 maximum | MEDIUM past 9, HIGH past 15 with no grouping or search |
| Items in a group | 2 minimum | A group of one is not a group. Promote it |
| Clicks to the most frequent destination for a returning user | 1 | MEDIUM at 3, HIGH at 4 or more |
| Levels of hover or flyout menu | 2 | HIGH at 3, and it is also a motor-accessibility defect |
| Routes reachable only by typing a URL | 0 for anything a user is expected to use | HIGH |

Depth and breadth trade against each other and both have costs. Each extra level
costs a decision and an opportunity to guess wrong; each extra peer costs scan
time. The practical rule is to keep the top level narrow enough to scan (about
7) and the tree shallow enough to hold in the head (3), then use search and
recents to shortcut the rest, rather than deepening the tree to keep the top tidy.

Measure it, do not estimate it:

```bash
# Deepest route segment count, file-based routers
find . -path ./node_modules -prune -o -name 'page.tsx' -print \
  | sed 's|^\./||' | awk -F/ '{print NF-1, $0}' | sort -rn | head
```

```js
// Peer counts per navigation level, live page
[...document.querySelectorAll('nav')].map((n) => ({
  label: n.getAttribute('aria-label') || n.className,
  topLevel: n.querySelectorAll(':scope > ul > li').length,
  totalLinks: n.querySelectorAll('a').length,
  current: n.querySelectorAll('[aria-current]').length,
}));
```

## 3. Wayfinding: knowing where you are

Every screen answers four questions, and the answers must agree with each other.

| Question | Answered by | Failure |
|---|---|---|
| Where am I? | Exactly one active nav indicator, plus the page heading | No active state, or two active states, or an active state on a parent only |
| What is this place? | An H1 naming the same thing the nav item did | Nav says "Billing", heading says "Subscription management" |
| Where else can I go? | Visible peers, or one gesture away | Peers hidden behind a menu on desktop where there is room |
| How do I get back? | Browser back, plus an in-product path (breadcrumb or an explicit back on detail views) | Detail view with no route back to its list |

Requirements:

- **One current indicator per navigation.** Marked with `aria-current="page"`
  (or `step`, `location` as appropriate), not by color alone, and visually
  distinct enough to find without hunting. A bold weight plus a background plus
  a rail is not excessive here; this is the single most-read state in the UI.
- **Label consistency across four surfaces.** The nav item, the page title
  (`document.title`), the H1, and the breadcrumb leaf all use the SAME words for
  the same destination. Drift between them is what makes a product feel like it
  was built by four teams, and it is trivially detectable.
- **The document title carries the location**, most specific first:
  "Invoice 1042 | Billing | Acme". Browser tabs, history, and bookmarks are all
  navigation surfaces, and they only get the title.
- **A detail view names its parent** and offers a route to it, whether or not
  the user arrived from there. Half of arrivals are deep links.

```js
// Wayfinding audit, live page
({
  title: document.title,
  h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
  current: [...document.querySelectorAll('[aria-current]')].map((e) => e.textContent.trim()),
  navs: document.querySelectorAll('nav').length,
  landmarks: [...document.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label')),
});
```
Findings: an empty `current` array, more than one entry in it per nav, more than
one H1, several `nav` landmarks with no distinguishing labels, or a title that
does not contain the H1.

## 4. Breadcrumbs

| Question | Answer |
|---|---|
| When required | Hierarchies 3 levels or deeper, and anywhere users routinely arrive by deep link or search |
| When wrong | Flat products (it implies a hierarchy that does not exist), and inside a linear flow (a step indicator is the right control there) |
| What it shows | The PATH to the item, not the history of how the user got here. A path is stable and shareable; a history trail differs per visitor and is not a location |
| The last crumb | The current item, not a link, marked `aria-current="page"` |
| Truncation | Collapse the middle, keep the root and the last two levels, and make the collapsed section expandable |
| Markup | An `<ol>` inside `<nav aria-label="Breadcrumb">`. The order matters semantically |
| What it does not replace | The back affordance in a modal or a flow, and the parent link on a detail view when the parent is not in the path |

A breadcrumb that shows history rather than hierarchy is a common generated-UI
tell: two users on the same page see different crumbs, and neither can share
their location.

## 5. Back behaviour

Back is the most-used control in any interface and the least-designed one.

| Rule | Detail |
|---|---|
| Back undoes the last NAVIGATION | Not the last state change. If it did not change the location, it should not have pushed history |
| Push versus replace | Route changes push. Filter and search keystrokes replace, so back does not step through 14 versions of a query. A committed filter (chip added, facet applied) may push; a keystroke never does |
| Modals and drawers | Push history only if the modal is deep-linkable. Then back closes it and Escape closes it too. If it is not deep-linkable, do not push, and do not let back close the underlying page unexpectedly |
| Never trap back | No `history.pushState` loop that swallows the gesture. On mobile this is a rage-quit defect, because back is a system gesture, not a button they can avoid |
| Never resubmit on back | POST-redirect-GET, or an idempotent submit. Back landing on a "confirm resubmission" dialog is a defect from 2004 that still ships |
| Back to a list restores the list | Scroll position, filters, sort, page, and selection. This is one requirement, not five, and it is the most common list defect in real products |
| In-product back on detail views | A parent link or a back control that goes to the LIST, present even when the browser has no history (deep-link arrival) |
| Forward still works | Back then forward returns to the same state, not a reset |

Test recipe: on a filtered list, scroll to item 40, open it, press back. Pass
requires the same filter, the same scroll offset, and the same page. Then repeat
after a hard reload of the detail view (simulating a deep-link arrival), where
the in-product parent link is now the only route back.

## 6. Deep links and refresh survival

The test is one sentence: **copy the URL of any state a user might want to
return to or share, open it in a clean session, and see what happens.**

State that belongs in the URL (cross-reference
`references/architecture/02-state-architecture.md` section 1, which names the
tools):

| State | In URL | Consequence when it is not |
|---|---|---|
| Current route or section | Always | The product has one shareable page |
| Search query | Always | Results cannot be shared or bookmarked |
| Filters and facets | Always | "Look at this filtered view" is impossible; back loses the work |
| Sort field and direction | Always | Same |
| Page or cursor | Always | Deep links land on page 1 |
| Active tab | Always | Links to a tab open on the default one |
| Selected item in a master-detail | Always | Refresh clears the selection |
| Open dialog that is a destination (upgrade, share, item detail) | Yes | Deep link cannot open it, analytics cannot see it, back cannot close it |
| Transient UI (sidebar collapsed, theme, tooltip) | No | Belongs in local or persisted client state |
| Anything secret | Never | URLs leak through history, referrers, logs, and shoulders |

Failure catalogue worth checking by name: a dialog that is a destination but not
a route; a filtered table whose URL never changes; a tab set whose state resets on
reload; a "restore session" that re-authenticates and then lands on the home page
instead of the requested page; an infinite-scroll list with no addressable
position; a redirect chain that drops the query string.

## 7. Grouping and labelling

**Group by what people are trying to do, not by which system or team owns it.**
The reliable smell of org-chart IA is a top-level section named after an internal
service, or two sections that a user cannot tell apart without opening both.

Labelling rules:

- User vocabulary, not system vocabulary. "Notifications", not "Event bus".
- One term per concept, everywhere: nav, heading, breadcrumb, title, empty
  state, docs, and the error messages. Every synonym is a small betrayal of the
  signposting (`references/design/08-ux-writing.md` section 1).
- No "Misc", "Other", "More", or "General" as a group name. They mean the
  grouping was not finished. "More" is acceptable ONLY as an overflow control
  whose contents are visible on open and stable in order.
- No self-nesting: "Settings > Settings", "Reports > Reports".
- Nouns for destinations, verbs for actions. A nav item that is a verb is
  usually an action that escaped into the nav.
- Length: a nav label that wraps at the default width is too long, and
  truncating it removes the distinguishing end.

**The solo card sort.** For each destination, write down what someone who has
never seen the codebase would call it, and where they would look for it first.
Any item where the answer differs from the current label or location is a
finding. This takes ten minutes and finds more real IA defects than any
heuristic, because the failure mode of IA is always "the builder's model, not
the user's".

**Actions do not live in `<nav>`.** A control that does something rather than
going somewhere inside a navigation landmark is both an IA defect and an
accessibility one (it is announced as navigation).

## 8. Menus, overflow, and small viewports

- Two levels of hover menu maximum, and every hover path also has a click or tap
  path. Hover-only submenus are unusable with touch, and hard with a tremor or a
  trackpad.
- Mega menus need grouping headers and a visible structure. A 40-link panel with
  no headings is a wall, not a menu.
- Overflow ("More") keeps a stable order, so a control does not move between
  visits, and does not hide the primary action at any viewport.
- The narrow-viewport nav is a restructure, not a mirror. Collapsing a four-level
  desktop tree into an accordion of the same four levels produces a scroll of
  disclosure triangles. Promote the frequent destinations, demote or search the
  rest.
- A hamburger on a desktop viewport with room for the peers costs a click for
  nothing and hides the product's shape from a first-time visitor.
- The current-location indicator survives collapse: when the nav is behind a
  menu, the location is still stated on the page (heading, breadcrumb, title).

## 9. Reviewing IA and navigation

1. **Route inventory.** Enumerate every route (see the commands in
   `references/usability/01-task-flows-and-journeys.md` section 10).
2. **Reachability graph.** For each route, list the routes linked FROM it. Then
   invert: routes with no inbound link from anywhere are orphans (reachable only
   by URL); routes with no outbound links are dead ends.
3. **Depth and breadth counts.** Section 2's thresholds, with the actual numbers.
4. **Wayfinding audit.** Section 3's snippet on the five most-visited screens.
5. **Label consistency.** Compare nav label, title, H1, breadcrumb leaf, per
   destination. Any drift is a finding.
6. **Deep-link sweep.** Copy the URL from five states a user would share, open
   each in a private window, record what happens.
7. **Back sweep.** The section 5 recipe on every list-to-detail pair.
8. **Competing navs.** Count `nav` landmarks and in-page tab sets that change
   the same region. More than one primary is a finding.

## 10. Severity anchors

| Severity | Navigation and IA defects |
|---|---|
| CRITICAL | A destination reachable only by typing a URL that users are expected to use; back trapped so the user cannot leave; a deep link that lands on a crash or an empty shell; navigation impossible at a supported viewport |
| HIGH | No current-location indicator anywhere; a detail view with no route back to its list; list state (scroll, filter, sort, page) lost on back; shareable state absent from the URL; three or more levels of hover menu; nav depth two levels past the threshold; two competing primary navigations over the same region; an auth redirect that discards the target |
| MEDIUM | Nav depth one level past the threshold; more than 9 ungrouped peers; label drift between nav, title and heading; breadcrumb showing history instead of path; "Misc" or "Other" as a group name; hamburger on a wide desktop viewport with room for peers; actions inside a `<nav>` landmark |
| LOW | Document title missing the section; breadcrumb missing on a 3-level hierarchy where the parent link exists; overflow menu order that shifts between visits |
| TASTE | Sidebar versus top bar preference; grouping order among equally defensible groupings |

## 11. Cross-references

| Need | File |
|---|---|
| Task sequencing, dead ends, break tests | `references/usability/01-task-flows-and-journeys.md` |
| Forms inside a flow, error recovery, data loss on navigation | `references/usability/02-forms-and-error-recovery.md` |
| Empty, error and permission-denied renderings of a destination | `references/usability/04-states-feedback-and-affordances.md` |
| Which state belongs in the URL, and the library for it | `references/architecture/02-state-architecture.md` |
| Keyboard order, focus management, skip links | `references/accessibility/02-keyboard-focus.md` |
| Landmarks, `aria-current`, announcement | `references/accessibility/04-screen-reader.md` |
| Consistent Help, Consistent Navigation, Redundant Entry | `references/accessibility/01-wcag-2-2.md` |
| Platform navigation components and their conventions | `references/platform/02-apple-overlay.md`, `references/platform/03-android-overlay.md` |
| Nav restructure across viewports | `references/review/03-viewport-matrix.md` |
| Label vocabulary and one-term-per-concept | `references/design/08-ux-writing.md` |
| The rubric rows these findings report against | `references/review/01-universal-rubric.md` |
