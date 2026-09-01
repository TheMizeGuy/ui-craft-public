# Material / Android Platform Overlay

Additional review expectations when reviewing Android platform UIs (Jetpack Compose, Material 3, XML views).

This overlay is self-contained: every threshold and API a reviewer needs is named here. The WCAG math and the severity vocabulary live in `references/accessibility/01-wcag-2-2.md`; this file is the Android expression of it.

## Adaptive quality (core Android expectation)

Android is a multi-form-factor platform: phones, tablets, foldables, desktops (Chromebook), cars, TVs, XR. The plugin evaluates adaptive quality first, Material aesthetics second.

### Window size classes

| Class | Width breakpoint | Typical devices |
|---|---|---|
| Compact | < 600dp | Phones portrait |
| Medium | 600-839dp | Foldable open, small tablet, phone landscape |
| Expanded | 840-1199dp | Tablets, Chromebooks |
| Large | 1200-1599dp | Desktop windows |
| Extra-large | 1600dp+ | Large monitors |

### Adaptive layout checks

| Check | Expectation | Anti-pattern |
|---|---|---|
| Width-class-aware layout | Different layouts for compact vs expanded | Single phone layout at all sizes |
| Canonical layouts | List-detail, supporting pane, feed patterns at appropriate sizes | Ignoring canonical layout guidance |
| Fold/unfold behavior | Core tasks survive fold state changes | Broken layout when foldable opens/closes |
| Multi-window support | App works in split-screen and free-form windows | Crash or broken layout in multi-window |
| Desktop-class windows | Not stranded in phone mode on Chromebook-sized widths | Phone UI with massive empty space |

### Navigation checks

| Check | Expectation | Anti-pattern |
|---|---|---|
| Bottom nav for compact | Standard bottom navigation bar | Rail on phone |
| Navigation rail for expanded | Side rail with labels on tablets/desktop | Bottom nav still on wide screens |
| Drawer for extra-large | Permanent/modal drawer with full labels | Rail persisting at desktop widths |
| Top-level destinations reachable | Primary nav always accessible | Nav hidden behind hamburger on tablet |
| Navigation adapts to width changes | Smooth transition between nav types on resize | Nav breaks on configuration change |

## Text scaling (sp vs dp)

This is the single most common Android accessibility defect and it is invisible on the developer's device, because the developer never changes the font-size setting.

**The rule: every text size and line height is in `sp`. Everything else is in `dp`.** `sp` (scale-independent pixels) tracks the user's font-size setting; `dp` does not. A `fontSize` expressed in `dp` is frozen at the design size forever.

```kotlin
// RIGHT
Text("Total", fontSize = 16.sp, lineHeight = 24.sp)
Spacer(Modifier.height(16.dp))
Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(24.dp))

// WRONG: dp converted to sp at the current density freezes the size
Text("Total", fontSize = with(LocalDensity.current) { 16.dp.toSp() })

// WRONG in XML
android:textSize="16dp"
```

| Check | Expectation | Anti-pattern |
|---|---|---|
| All text sized in `sp` | `fontSize = 16.sp`, `android:textSize="16sp"`, or (better) a `MaterialTheme.typography` role | Any `dp` on a text size, or `dp.toSp()` at the current density |
| Line height in `sp` too | `lineHeight = 24.sp` | `lineHeight` in `dp`, which clamps wrapped text into overlapping lines at large scales |
| Non-text in `dp` | Icons, padding, corner radius, stroke width | `sp` on an icon size, which makes it grow out of its container |
| Typography roles, not literals | `MaterialTheme.typography.bodyLarge` | Ad-hoc `fontSize` values scattered through composables |
| Layout verified at 200% font scale | Nothing clipped, truncated, or overlapping | A `Row` of label plus value that collides once the text doubles |
| No fixed-height text containers | Height driven by content, or `Modifier.heightIn(min = ...)` | `Modifier.height(48.dp)` around scaling text |
| No `maxLines = 1` on content | Wrap or grow | Titles truncated to an ellipsis at every accessibility size |
| No shrink-to-fit | Container grows | `android:autoSizeTextType="uniform"`, which shrinks text for the user who asked for bigger text |
| Custom `Density` overrides are suspect | Leave `fontScale` alone | `CompositionLocalProvider(LocalDensity provides Density(density, fontScale = 1f))`, which globally disables font scaling. This is a CRITICAL finding, not a style preference |

### Non-linear font scaling (Android 14+)

Android 14 (API 34) scales text non-linearly up to 200%: small text grows proportionally more than large text, so headings do not run away while body copy becomes readable. Consequences for review:

- You cannot compute the rendered size as `designSize * fontScale`. Any code doing that arithmetic is wrong on API 34+. Let the platform resolve `sp`.
- `TextUnit.toDp()` and `Density.fontScale` are still linear approximations. Code that round-trips text sizes through `dp` produces the wrong size at high scales.
- The maximum meaningful test point is 200%, not 130%. The Display settings slider historically stopped near 130%; Accessibility settings go to 200%.

### How to test it

| Method | Command or API |
|---|---|
| Device or emulator | Settings > Accessibility > Display size and text > Font size, dragged to maximum |
| ADB, fastest | `adb shell settings put system font_scale 2.0` (restore with `1.0`) |
| Compose preview | `@Preview(fontScale = 2.0f, showBackground = true)` |
| Instrumented test | Set `fontScale` on the test `Configuration`, or use the Espresso Device API |

Reviewing an Android UI without looking at it at `font_scale 2.0` is not a text-accessibility review.

## Motion and reduced motion

Android's reduce-motion signal is the animation duration scales, which users set in Settings > Accessibility > Remove animations, or in Developer options. When they are zero, the system expects apps to stop animating.

```kotlin
// Read once, high in the tree, and expose it
val context = LocalContext.current
val reduceMotion = remember(context) {
    // API 26+: false when ANIMATOR_DURATION_SCALE is 0
    !ValueAnimator.areAnimatorsEnabled()
}

// Or read the scales directly when you need the value, not just the flag
val animatorScale = Settings.Global.getFloat(
    context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f,
)
val transitionScale = Settings.Global.getFloat(
    context.contentResolver, Settings.Global.TRANSITION_ANIMATION_SCALE, 1f,
)

val LocalReduceMotion = staticCompositionLocalOf { false }
```

Substituting, rather than merely zeroing durations:

```kotlin
val spec: FiniteAnimationSpec<Float> =
    if (reduceMotion) snap() else spring(dampingRatio = 0.8f, stiffness = 400f)

AnimatedVisibility(
    visible = expanded,
    enter = if (reduceMotion) EnterTransition.None else fadeIn() + expandVertically(),
    exit  = if (reduceMotion) ExitTransition.None else fadeOut() + shrinkVertically(),
) { Detail() }
```

| Check | Expectation | Anti-pattern |
|---|---|---|
| Reduce-motion branch exists | Every spatial animation reads the flag and substitutes | An app that animates identically regardless of the setting. This is the Android counterpart of ignoring `prefers-reduced-motion` and carries the same CRITICAL severity |
| Shared element transitions gated | Skipped or cross-faded under reduce motion | `SharedTransitionLayout` hero moves that always play |
| List item placement animations gated | `Modifier.animateItem()` disabled or snapped | Rows sliding on every insert while the user asked for stillness |
| `animateContentSize()` gated | Snap to the new size | Continuous size morphs on a screen the user is reading |
| Auto-advancing carousels pause | Pause control present, auto-advance off under reduce motion | A `HorizontalPager` with an infinite `LaunchedEffect` auto-scroll and no control |
| Parallax and scroll-driven effects off | Static layout | Collapsing toolbars with large parallax are the usual case |
| Nothing is communicated by motion alone | State visible statically | A save confirmed only by a bounce |
| Spring specs are intentional | `spring()` with stated stiffness and damping | Default `tween` on everything |
| Deterministic test support | Animations testable with `ComposeTestRule` clock control | Animations that cannot be advanced in tests |
| Jank | No skipped frames on common transitions | Heavy work in a composable body or on the animation frame |

## Color and contrast

| Check | Threshold or expectation | Anti-pattern |
|---|---|---|
| Body text against its surface | **4.5:1** | Secondary text drawn at `onSurfaceVariant` over a custom surface that is not the paired one |
| Large text (>= 24sp regular, >= 19sp bold) | **3:1** | |
| Icons, control boundaries, focus indicators, chart marks | **3:1** | A 1dp `outlineVariant` divider used as a control border |
| Use Material role PAIRS | `primary`/`onPrimary`, `primaryContainer`/`onPrimaryContainer`, `surface`/`onSurface`, `surfaceVariant`/`onSurfaceVariant`, `error`/`onError` | Mixing across pairs, for example `onPrimary` text on a `surface` background. The tonal system guarantees contrast only WITHIN a pair |
| Dark theme verified independently | Both schemes checked | Assuming a palette that passes in light passes in dark. Material 3 dark surfaces are tonally lightened by elevation (`surfaceColorAtElevation`), which moves the background under your text |
| Elevation via tonal color, not white overlay | `surfaceColorAtElevation(8.dp)` | `Color.White.copy(alpha = 0.08f)` layered on a card, which changes contrast unpredictably |
| Dynamic color checked against real wallpapers | `dynamicLightColorScheme(context)` / `dynamicDarkColorScheme(context)` (API 31+) verified with several wallpapers | Hardcoded brand colors composited onto wallpaper-derived surfaces. The tonal palette shifts per wallpaper, so a custom color that passes on one device fails on another. Either use the paired roles or pin a static scheme for that surface |
| Contrast setting honored | `UiModeManager.getContrast()` (API 34) returns 0.0 standard, 0.5 medium, 1.0 high. Ship the medium and high-contrast schemes the Material Theme Builder generates and select on that value | Ignoring the setting, so users who asked for high contrast get the standard palette |
| Never color alone | Icon, text, or shape accompanies every color-coded state | Red/green status dots, a chart series identified only by hue |
| Text over images is scrimmed | Solid or gradient scrim with a known opacity beneath the text | An unscrimmed headline over a photo, where contrast is unbounded |
| Disabled states are still legible enough to identify | Disabled text is exempt from 4.5:1, but the control must still read as a control | Disabled at 12 percent alpha and indistinguishable from background noise |

Compute ratios with the math in `references/accessibility/01-wcag-2-2.md` section 5, against the RESOLVED ARGB value for the specific theme and elevation, never against a role name.

## Touch targets

| Standard | Minimum |
|---|---|
| Material Design 3 | 48x48dp touch target area, independent of the visual size |
| Spacing between targets | 8dp minimum between adjacent targets so a 48dp region does not overlap the neighbour |

| Check | Implementation | Anti-pattern |
|---|---|---|
| Small controls padded to 48dp | `Modifier.minimumInteractiveComponentSize()`, or Material components which apply it themselves | A 24dp `Icon` with a `clickable` directly on it |
| Enforcement not switched off | Leave the default on | `LocalMinimumInteractiveComponentSize provides Dp.Unspecified` (or, on Material3 before 1.3, `LocalMinimumInteractiveComponentEnforcement provides false`). Disabling it globally to tighten a dense layout is a HIGH finding |
| Clickable area matches the visual affordance | `Modifier.clickable` on the row, with a ripple that covers it | A card where only the title text is clickable |
| Ripple bounded correctly | Ripple confined to the target | An unbounded ripple that implies a larger target than exists |

## Compose accessibility

### Semantics

| Check | Implementation | Anti-pattern |
|---|---|---|
| Standard components preserve semantics | Material components carry role, state, and click labels | Replacing a `Switch` with a custom `Box` and no `semantics {}` |
| Custom components expose semantics | `Modifier.semantics { role = Role.Button; contentDescription = "..." }` | Custom composables with no accessibility at all |
| Content descriptions on meaningful graphics | `contentDescription = "Unread messages"` | Icon buttons with no description |
| Decorative graphics explicitly null | `contentDescription = null` | A description on every decorative icon, which floods TalkBack with noise |
| Description does not restate the role | `"Delete"` with `Role.Button` | `"Delete button"`, announced as "Delete button, button" |
| State announced | `stateDescription = if (on) "On" else "Off"` | A custom toggle that announces the label and nothing else |
| Headings marked | `Modifier.semantics { heading() }` | TalkBack heading navigation finds nothing, so users cannot skim |
| Click labels describe the outcome | `Modifier.clickable(onClickLabel = "Open profile") { }` or `semantics { onClick(label = "Open profile") { true } }` | "Double tap to activate" on every element |
| Gesture-only actions also exposed as actions | `customActions = listOf(CustomAccessibilityAction("Archive") { ... })` | A swipe-to-archive row unreachable by TalkBack |
| Composite items merged | `Modifier.semantics(mergeDescendants = true) { }`, or `clearAndSetSemantics {}` when the merged text needs rewriting | A card that costs eight swipes to pass |
| Traversal order corrected where needed | `Modifier.semantics { isTraversalGroup = true; traversalIndex = -1f }` | Illogical TalkBack reading order in overlapping or absolutely-positioned layouts |
| Live updates announced | `Modifier.semantics { liveRegion = LiveRegionMode.Polite }` (`Assertive` only for errors) | Snackbar or inline validation that TalkBack never speaks |
| Focus order and focus visibility | `Modifier.focusRequester`, `focusProperties {}`, visible focus indication for keyboard and D-pad | Keyboard, Chromebook, and TV users stranded |

### Reading order and RTL

| Check | Implementation |
|---|---|
| Layout uses start/end, not left/right | `Modifier.padding(start = 16.dp)`, `TextAlign.Start`, `Arrangement.Start` |
| RTL verified | `adb shell settings put global force_rtl_layout_direction 1`, or `CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl)` in a preview |
| Directional icons mirror | Back and forward chevrons flip in RTL; brand marks and media transport controls do not |

### Testing

| Test type | Official surface |
|---|---|
| Screenshot tests | Compose screenshot testing, Compose Preview tests |
| Accessibility checks | Compose accessibility checks backed by the Accessibility Test Framework (Compose UI test 1.8.0+), Espresso `AccessibilityChecks.enable()` |
| Manual scan on device | Accessibility Scanner (Play Store), which reports contrast, target size, and missing labels on the live screen |
| Manual TalkBack pass | Swipe right for next, double-tap to activate, two-finger swipe to scroll. Automation cannot judge whether the announcement makes sense |
| Configuration changes | Espresso Device API (rotation, fold, multi-window) |
| Font scale | `@Preview(fontScale = 2f)`, `adb shell settings put system font_scale 2.0` |
| Animation tests | `ComposeTestRule` with clock control plus `captureToImage()` |
| Jank detection | Android Studio jank detection, trace-based diagnosis (Macrobenchmark, Perfetto) |

## Material 3 component checks

| Component | What to check |
|---|---|
| Top app bar | Proper scroll behavior (collapse, pin, exit until); title still legible at 200% font scale |
| FAB | Correct placement, appropriate for primary action, accessible label, 48dp minimum |
| Bottom sheet | Handles gestures, keyboard, back navigation; drag handle has an accessible expand/collapse action |
| Snackbar | Accessible timeout (long enough to read at slow reading speeds), action button, dismissible, announced via live region |
| Navigation | Adapts to window size class; labels present, not icon-only, at expanded widths |
| Cards | Proper elevation, clickable area includes the full card |
| Dialogs | Focus trap, back dismisses, centered on screen, content scrolls at large font scales |
| Text fields | Label animation, error state announced, helper text associated, character count; error text is not the only error signal |

## Configuration change handling

| Event | Expectation |
|---|---|
| Rotation | Layout adapts, state preserved |
| Fold/unfold | Layout adapts to new size class |
| Split-screen enter/exit | Layout adapts, no crash |
| Locale change | Layout handles RTL/LTR, translated strings do not clip |
| Font scale change | Layout reflows at up to 200%; nothing clipped, truncated, or overlapping; state preserved through the recreate |
| Contrast setting change | High-contrast scheme applied without restart |
| Dark mode toggle | Colors update, no restart required |

## Severity guidance (Android overlay)

| Condition | Severity |
|---|---|
| Core path breaks on fold, tablet, or multi-window | HIGH; CRITICAL when the broken path is the screen's primary task |
| No accessibility semantics on custom interactive components | CRITICAL |
| Font scaling globally disabled (custom `Density` with `fontScale = 1f`) | CRITICAL |
| Configuration change causes state loss or crash | CRITICAL |
| No reduce-motion handling on a screen with spatial animation | CRITICAL |
| Gesture-only action with no accessibility action equivalent | CRITICAL |
| Text sized in `dp`, or `dp.toSp()` conversions | HIGH |
| Content clipped, truncated, or overlapping at 200% font scale | HIGH |
| Text or icon below the contrast floor in either theme | HIGH |
| Touch target below 48dp on important controls | HIGH |
| Minimum interactive size enforcement disabled | HIGH |
| Color as the only state signal | HIGH |
| Material semantics replaced without proper custom semantics | HIGH |
| Dynamic color used without verifying paired roles across wallpapers | MEDIUM; HIGH when a role pair measured on a tested wallpaper fails 4.5:1 |
| Navigation ignores width-class ergonomics | MEDIUM; HIGH when a top-level destination is unreachable at a window size class |
| Contrast setting (`UiModeManager.getContrast()`) ignored | MEDIUM |
| Headings not marked, so TalkBack cannot skim the screen | MEDIUM |
| Phone-only layout on tablet with no blocking issue | MEDIUM |
| RTL not verified on a localized app | MEDIUM |
| Minor visual deviation from Material with no usability cost | TASTE; LOW when the deviation removes an affordance (ripple, state) |

## Design rule

Evaluate adaptive quality and input ergonomics first. Material-style coherence second. Don't over-penalize apps that are intentionally branded or visually distinctive but still behave correctly on Android.
