# Apple Platform Overlay

Additional review expectations when reviewing Apple platform UIs (SwiftUI, UIKit, iOS, iPadOS, macOS, watchOS, visionOS).

This overlay is self-contained: every threshold a reviewer needs to judge an Apple UI is stated here in numbers, not delegated elsewhere. The web-side WCAG math and severity vocabulary live in `references/accessibility/01-wcag-2-2.md`; this file supplies the Apple expression of it.

## Design philosophy

| Principle | Meaning | What to check |
|---|---|---|
| Clarity | Text legible at every size; icons precise; focus on functionality | SF Pro/Compact, SF Symbols, generous whitespace, readable contrast |
| Deference | Interface never competes with content | Content fills screen, minimal chrome, translucent materials |
| Depth | Visual layers convey hierarchy and vitality | Translucent backgrounds, spring animations, layered sheets |

## Liquid Glass (iOS 26+)

| Check | Expectation |
|---|---|
| System bars use glass materials | TabBar, NavigationBar, ToolBar adopt Liquid Glass |
| Custom bars integrate with system glass | Match system material, don't fight it |
| Content readable behind glass | Sufficient contrast and vibrancy |
| Not overused on every surface | Glass is for system chrome and prominent surfaces, not everything |
| Degrades under Reduce Transparency | With `accessibilityReduceTransparency` on, the system substitutes opaque materials. Custom glass built from `.ultraThinMaterial` plus manual blur does NOT degrade automatically and must be branched by hand |
| Text over glass has a contrast floor | Glass is unbounded background: whatever scrolls under it. Text over a custom glass surface needs an opaque or high-opacity scrim beneath it, or it will fail 4.5:1 over some content |

## Typography and Dynamic Type

### The size ladder

Dynamic Type has twelve categories. The last five are the accessibility sizes, and they are where layouts break. Body text (`.body`) resolves as:

| Category | `DynamicTypeSize` | Body point size | Notes |
|---|---|---|---|
| Extra Small | `.xSmall` | 14pt | |
| Small | `.small` | 15pt | |
| Medium | `.medium` | 16pt | |
| **Large** | `.large` | **17pt** | System default. Design comps are drawn here |
| Extra Large | `.xLarge` | 19pt | |
| Extra Extra Large | `.xxLarge` | 21pt | |
| Extra Extra Extra Large | `.xxxLarge` | 23pt | End of the non-accessibility range |
| Accessibility Medium | `.accessibility1` (AX1) | 28pt | First accessibility size. Two-column layouts usually break here |
| Accessibility Large | `.accessibility2` (AX2) | 33pt | |
| Accessibility Extra Large | `.accessibility3` (AX3) | 40pt | |
| Accessibility Extra Extra Large | `.accessibility4` (AX4) | 47pt | |
| Accessibility Extra Extra Extra Large | `.accessibility5` (AX5) | 53pt | Ceiling. 3.1x the default |

The other text styles at the default Large size: `.largeTitle` 34pt, `.title` 28pt, `.title2` 22pt, `.title3` 20pt, `.headline` 17pt semibold, `.body` 17pt, `.callout` 16pt, `.subheadline` 15pt, `.footnote` 13pt, `.caption` 12pt, `.caption2` 11pt.

Review rule: **verify the layout at AX5, not at Large.** A screen that only ever gets looked at in the default size has not been reviewed for Dynamic Type. In Xcode, Editor > Canvas > Dynamic Type variants, or the Environment Overrides panel while running, or `.environment(\.dynamicTypeSize, .accessibility5)` on a preview.

### Checks

| Check | Expectation | Anti-pattern |
|---|---|---|
| System fonts (SF Pro, SF Compact, SF Mono, New York) | Used for text unless brand requires custom | Non-system font loaded at a fixed size, so it never scales |
| Custom font still scales | `Font.custom("Name", size: 17, relativeTo: .body)` or `UIFontMetrics(forTextStyle:).scaledFont(for:)` | `Font.custom("Name", size: 17)` with no `relativeTo:`, which pins the size forever |
| Text styles, not point sizes | `.font(.body)`, `.font(.headline)` | `.font(.system(size: 15))` anywhere in a view that displays content |
| Spacing and icon sizes scale too | `@ScaledMetric(relativeTo: .body) private var gutter: CGFloat = 16` | Fixed `padding(16)` around text that triples in size |
| Layout reflows at accessibility sizes | `ViewThatFits { HStack { ... }; VStack { ... } }` or `AnyLayout(dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout()) : AnyLayout(HStackLayout()))` | Fixed `HStack` of label plus value that collides at AX3 |
| No upper clamp on user text | Let text reach AX5 | `.dynamicTypeSize(...DynamicTypeSize.large)` or `...(.xxxLarge)` on content. This silently caps the user's setting and is the single most common Dynamic Type defect |
| No shrink-to-fit on body copy | Text wraps or the container grows | `.minimumScaleFactor(0.5)` on body text: it "fixes" the layout by making text smaller for the user who asked for bigger text |
| No fixed line limits on content | `.lineLimit(nil)` for body copy | `.lineLimit(1)` on a title that is 53pt at AX5 |
| Fixed heights are suspect | Height driven by content | `.frame(height: 44)` on a row containing scaling text |

Clamping is legitimate in exactly two places: a fixed-geometry chrome element where scaling would push the control off-screen (a compact toolbar), and content on watchOS where the ladder is shorter. Both need the content itself reachable at full size some other way (a detail sheet, the Large Content Viewer). Clamping content text is always a defect.

## Colors and contrast

| Check | Expectation | Threshold |
|---|---|---|
| Semantic system colors | `Color.primary`, `.secondary`, `Color(.label)`, `.secondaryLabel`, `.systemBackground` | These already meet Apple's contrast targets in both themes and under Increase Contrast |
| Asset catalog colors with variants | Named colors with Any/Dark plus High Contrast variants | Missing a High Contrast variant means Increase Contrast does nothing |
| No hard-coded color literals in views | Tokens only | A `Color(red:green:blue:)` in a view body cannot be varied per theme |
| Body text contrast | Against the actual backing surface, not the window background | **4.5:1** |
| Large text (>= 24pt regular, or >= 19pt semibold/bold) | | **3:1** |
| Icons, control borders, focus rings, chart marks | Against every adjacent color | **3:1** |
| Both themes verified | Light AND dark, at both contrast settings | A palette that passes in light often fails in dark, because dark surfaces are elevated with tonal lightening |
| Increase Contrast honored | `@Environment(\.colorSchemeContrast)` returns `.increased` | Strengthen borders and separators; do not just darken text |
| Never color alone | `@Environment(\.accessibilityDifferentiateWithoutColor)` | This is the iOS face of WCAG 1.4.1. A red/green status dot with no shape or label change fails |
| Invert Colors handled | `@Environment(\.accessibilityInvertColors)`, `.accessibilityIgnoresInvertColors()` on photos and logos | Otherwise images render as negatives |

Apple's own guidance uses the same numbers as WCAG (4.5:1 body, 3:1 large and non-text), so a contrast finding on an Apple surface cites both the HIG and the WCAG criterion. Compute the ratio with the math in `references/accessibility/01-wcag-2-2.md` section 5 against the RESOLVED color: sample the rendered pixel or read the asset catalog value for the specific appearance, never the token name.

## SF Symbols

| Check | Expectation |
|---|---|
| SF Symbols used for system concepts | Consistent with platform vocabulary |
| Appropriate rendering mode | Monochrome, hierarchical, palette, or multicolor |
| Symbol effects for state changes | `.symbolEffect(.bounce)`, `.pulse`, `.variableColor` |
| Proper sizing with text | `.imageScale(.medium)` or `.font(.body)` so the symbol scales with Dynamic Type |
| Availability gated | Symbols added in a later OS need an availability check or a fallback name |
| Symbol is not the only label | An icon-only control still needs `.accessibilityLabel`. The symbol name is not an accessible name |

## Navigation

| Check | Expectation | Anti-pattern |
|---|---|---|
| NavigationStack/NavigationSplitView | System navigation with proper back behavior | Custom navigation replacing system patterns |
| TabView for top-level destinations | Standard tab bar | More than 5 tabs without More |
| Sheets for modal content | `.sheet()`, `.fullScreenCover()` | Custom modal overlays |
| Toolbar items for contextual actions | `.toolbar { }` | Floating action buttons (non-Apple pattern) |
| iPad adaptive layout | NavigationSplitView with two/three columns | Phone layout stretched to iPad |
| Back gesture preserved | Interactive pop from the left edge works | A full-width `DragGesture` on the root view that swallows it |

## Touch and pointer targets

| Platform | Minimum | Notes |
|---|---|---|
| iOS / iPadOS | 44x44pt | HIG minimum. This is the TAP AREA, not the glyph. A 20pt icon needs 12pt of padding on each side |
| watchOS | 44x44pt | Same floor on a much smaller screen, which is why watch layouts are single-column |
| visionOS | 60x60pt | Eye-tracking needs a larger target; also keep 16pt of separation between adjacent targets |
| macOS (pointer) | 28x28pt for standalone controls | Pointer precision allows smaller, but menu and toolbar items still need a comfortable hit area |
| Any platform, spacing | Adjacent targets separated so a 44pt (60pt on visionOS) region does not overlap the neighbour | Rows of small toolbar buttons are the usual offender |

Extending a hit area without changing the visual: `.contentShape(Rectangle())` on a padded container, or `.frame(minWidth: 44, minHeight: 44)` around the glyph. `.contentShape` also fixes the common bug where the tappable area is only the glyph inside a larger row.

## Haptics

| Interaction | Expected haptic |
|---|---|
| Toggle/switch | `.impact(.light)` or `.selection` |
| Delete/destructive | `.notification(.warning)` |
| Success/completion | `.notification(.success)` |
| Error | `.notification(.error)` |
| Selection change | `.selection` |
| Drag threshold | `.impact(.medium)` at snap points |

Haptics are feedback, not decoration. A haptic on every scroll tick or every keystroke is noise. Haptics also must never be the ONLY signal for a state change, since they are unavailable on iPad, on Mac, and to users who disable System Haptics.

## Accessibility (Apple-specific)

### Naming, value, and role

| Check | SwiftUI implementation | What a defect looks like |
|---|---|---|
| Every interactive element has a label | `.accessibilityLabel("Delete draft")` | An icon-only button announced as "button" or by its symbol name |
| Label does NOT restate the role | `.accessibilityLabel("Delete")`, trait supplies "button" | "Delete button" announced as "Delete button button" |
| Label starts with a capital, has no trailing period | `"Add to cart"` | `"add to cart."` |
| Controls with a value announce it | `.accessibilityValue("\(count) items")` | A `Slider` or `Stepper` with a custom look that announces the label and no number. VoiceOver users cannot tell what they set |
| Non-obvious actions get a hint | `.accessibilityHint("Opens the sharing sheet")` | Hints are LAST resort. If the label needs a hint to make sense, fix the label |
| Traits describe what it is | `.accessibilityAddTraits(.isButton)`, `.isHeader`, `.isSelected`, `.isLink`, `.isModal`, `.updatesFrequently`, `.isToggle` | A custom card that acts as a button but announces as static text |
| Wrong traits removed | `.accessibilityRemoveTraits(.isImage)` when a decorative image carries a label | An element announced as "image" that is really a control |
| Headers marked | `.accessibilityAddTraits(.isHeader)` | VoiceOver rotor Headings list is empty, so users cannot skim the screen |

### Grouping and traversal

| Check | Implementation | Why |
|---|---|---|
| Related text combined into one element | `.accessibilityElement(children: .combine)` | A card of five `Text` views is five swipes; combined it is one |
| Container groups its children | `.accessibilityElement(children: .contain)` | Gives the rotor a container to jump to |
| Custom rendering ignores children | `.accessibilityElement(children: .ignore)` plus explicit label and value | For canvas-drawn or heavily composed controls |
| Decorative elements hidden | `.accessibilityHidden(true)` | Background gradients, spacer glyphs, duplicate iconography |
| Reading order corrected only when needed | `.accessibilitySortPriority(1)` (higher reads first within a container) | Use when the visual order and the layout order genuinely disagree. Reordering by priority everywhere is a smell |
| Swipe actions exposed | `.accessibilityAction(named: "Archive") { ... }` | A `.swipeActions` row whose actions exist only as gestures is unreachable by VoiceOver |
| Adjustable controls | `.accessibilityAdjustableAction { direction in ... }` | Lets VoiceOver users swipe up/down to change a custom slider or segmented control |
| Custom rotor for long content | `.accessibilityRotor("Unread") { ForEach(...) { AccessibilityRotorEntry(...) } }` | Long feeds and transcripts become navigable |
| Dynamic changes announced | `AccessibilityNotification.Announcement("Saved").post()`, `.screenChanged`, `.layoutChanged` | A silent success state is invisible to VoiceOver |

### Motor, motion, and vision settings to honor

| Environment value | What the user asked for | Required behavior |
|---|---|---|
| `\.accessibilityReduceMotion` | Less animation | Substitute a cross-fade or no animation for spatial transitions, parallax, `matchedGeometryEffect` hero moves, and auto-playing loops. Do not simply set duration 0 on everything; substitute (`references/accessibility/03-motion-reduce.md` section 4) |
| `\.accessibilityReduceTransparency` | Fewer translucent surfaces | Replace materials and blurs with opaque fills. Re-check contrast, since the reason for the setting is that translucency erodes legibility |
| `\.accessibilityDifferentiateWithoutColor` | Shape and text, not hue | Add a glyph, a pattern, or a text label alongside every color-coded state |
| `\.accessibilityInvertColors` | Smart Invert | `.accessibilityIgnoresInvertColors()` on photos, video, and full-color logos |
| `\.accessibilityShowButtonShapes` | Visible affordances | Give borderless buttons a visible boundary |
| `\.legibilityWeight` (`.bold` when Bold Text is on) | Heavier strokes | Custom fonts must supply a bold face; hairline strokes in custom drawing must thicken |
| `\.colorSchemeContrast` (`.increased`) | Higher contrast | Stronger separators and borders, not just darker text |
| Large Content Viewer | Read a small control without turning on VoiceOver | `.accessibilityShowsLargeContentViewer { Label("Filter", systemImage: "line.3.horizontal.decrease") }` on toolbar and tab items whose glyphs cannot grow |

### Voice Control and keyboard

| Check | Implementation | Why |
|---|---|---|
| The visible label is IN the accessible name | Keep `.accessibilityLabel` a superset of the visible text | Voice Control users say what they see: "Tap Save". If the label is "Submit form" the command fails. This is the iOS face of WCAG 2.5.3 Label in Name |
| Alternate spoken names where useful | `.accessibilityInputLabels(["Save", "Save draft", "Keep"])` | Gives Voice Control several ways to hit the same control |
| Full Keyboard Access works | Every action reachable with Tab and arrow keys; `.focusable()`, `@FocusState`, `.focused($field, equals:)` | On iPad and Mac, keyboard-only users hit the same wall keyboard users hit on the web |
| Focus is visible | System focus ring, or a custom indicator with 3:1 contrast against both the control and the surface | A custom control with no focus appearance is unusable under Full Keyboard Access |
| Escape and Return behave | `.keyboardShortcut(.cancelAction)` / `.defaultAction` on sheet buttons | Dismiss and confirm from the keyboard |

### Verification

| Tool | Invocation | Catches |
|---|---|---|
| XCTest accessibility audit | `try app.performAccessibilityAudit()` in a UI test; scope it with `performAccessibilityAudit(for: [.contrast, .dynamicType, .elementDetection, .hitRegion, .sufficientElementDescription, .textClipped, .trait])` | Clipped text at large sizes, missing labels, undersized hit regions, low contrast. This is the automated gate and it belongs in CI |
| Accessibility Inspector | Xcode > Open Developer Tool > Accessibility Inspector, then the audit tab against a running app | Same class of issues, interactive, plus the element tree |
| Environment Overrides | The panel in the Xcode debug bar while running | Toggle Dynamic Type, Reduce Motion, Reduce Transparency, Increase Contrast, Bold Text, Invert Colors live |
| Preview variants | `.environment(\.dynamicTypeSize, .accessibility5)`, `.environment(\.accessibilityReduceMotion, true)`, `.preferredColorScheme(.dark)` | Cheap per-view regression coverage |
| VoiceOver on device | Triple-click the side button (configure in Settings > Accessibility > Accessibility Shortcut) | Everything the automation misses: reading order, redundancy, hints that make no sense, unreachable actions |

Automation catches roughly a third of real issues on Apple platforms too. Never write "accessible" off a clean `performAccessibilityAudit`.

## Motion (Apple-specific)

| Check | Expectation |
|---|---|
| Spring animations | `withAnimation(.spring)` or `.snappy`/`.smooth`/`.bouncy` over `.easeInOut` |
| `matchedGeometryEffect` for shared elements | Smooth hero transitions |
| Phase/Keyframe animators for complex sequences | Not nested `withAnimation` blocks |
| Gesture-driven interruptible transitions | `DragGesture` plus spring, so the user can catch the animation mid-flight |
| State-change animations | `withAnimation` wrapping state changes, not view modifiers |
| Reduce Motion branch exists | Read `@Environment(\.accessibilityReduceMotion)` and substitute a fade or an instant change. A screen with animation and no branch is a defect, not a preference |
| No motion required to understand state | If the only signal that something saved is a bounce, the state is invisible under Reduce Motion |

## iPad and adaptive layout

| Check | Expectation |
|---|---|
| NavigationSplitView | Two or three-column layout on iPad |
| Keyboard shortcuts | `.keyboardShortcut()` for common actions |
| Context menus | `.contextMenu()` on long-press targets |
| Drag and drop | Support where content can be shared |
| Stage Manager | App works in arbitrary window sizes, including narrow ones |
| Size classes, not device checks | `@Environment(\.horizontalSizeClass)`. A hardcoded `UIDevice.current.userInterfaceIdiom == .pad` branch breaks in Slide Over and Stage Manager |
| Pointer/hover | `.hoverEffect()` on interactive elements |
| Text still scales in every configuration | Dynamic Type at AX5 inside a narrow Stage Manager window is the worst case; check it |

## Severity guidance (Apple overlay)

| Condition | Severity |
|---|---|
| No VoiceOver labels on interactive controls | CRITICAL |
| Control with a value that announces no value (custom slider, stepper, rating) | CRITICAL |
| Swipe or drag action with no `.accessibilityAction` equivalent | CRITICAL |
| No reduced motion support on a screen with spatial animation | CRITICAL |
| Configuration change or accessibility setting causes content loss | CRITICAL |
| No Dynamic Type support (fixed sizes) | HIGH |
| `.dynamicTypeSize` upper clamp on content text | HIGH |
| `.minimumScaleFactor` or fixed `.lineLimit` on body copy | HIGH |
| Content clips, truncates, or overlaps at AX5 | HIGH |
| Hard-coded colors, no dark mode | HIGH |
| Text or icon below the contrast floor in either theme | HIGH |
| Touch targets below 44pt (60pt visionOS) | HIGH |
| Color as the only state signal with no `differentiateWithoutColor` branch | HIGH |
| Visible label not contained in the accessible name (Voice Control breaks) | HIGH |
| Reduce Transparency not handled on custom glass or blurred surfaces | MEDIUM-HIGH |
| Custom navigation replacing system patterns | MEDIUM-HIGH |
| Missing header traits, so the rotor cannot skim the screen | MEDIUM |
| Phone layout on iPad with no adaptation | MEDIUM |
| Large Content Viewer absent on small toolbar or tab items | MEDIUM |
| Missing haptic feedback on significant actions | LOW-MEDIUM |
