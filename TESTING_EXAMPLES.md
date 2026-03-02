# UIDirector - Testing Examples

A practical guide for verifying each feature of the UIDirector addon in Construct 3.

---

## Layout Setup

### Required layer structure in the C3 layout editor

```
[Game World]          ← untracked gameplay layer
[UI]                  ← group layer - must match the "UI Container Layer" property
    [Main Menu]       ← sublayer: normal screen
    [Settings]        ← sublayer: normal screen
    [Pause]           ← sublayer: normal screen
    [HUD]             ← sublayer: non-modal normal screen
    [Confirm Quit]    ← sublayer: popup
    [Tooltip]         ← sublayer: tooltip
```

### UIDirector object properties (Properties Bar)
| Property | Value for testing |
|---|---|
| UI Container Layer | `UI` |
| Default Anim Type | `fade` |
| Default Anim Duration | `300` |
| Default Anim Easing | `easeOut` |
| Persist Across Layouts | unchecked |
| Debug Mode | **checked** (shows console logs) |

---

## Test 1 - Basic Setup (Common API)

**Goal:** Register all layers at layout start using the beginner-friendly Common actions.

### Event sheet

```
Event: On start of layout
  Action: Setup screen layer    -> "Main Menu"
  Action: Setup screen layer    -> "Settings"
  Action: Setup screen layer    -> "Pause"
  Action: Setup screen layer    -> "HUD"
  Action: Setup popup layer     -> "Confirm Quit"
  Action: Setup tooltip layer   -> "Tooltip"
  Action: Show screen           -> "Main Menu"
```

**Expected:** Only `Main Menu` is visible and interactive. All others are hidden.

---

## Test 2 - Screen Navigation (Focus Stack)

**Goal:** Navigate between screens and use the back button.

### Event sheet

```
// Navigate to Settings
Event: Button "Settings" -> On clicked
  Action: Show screen -> "Settings"

// Return to Main Menu
Event: Button "Back" -> On clicked
  Action: Go back

// Verify back button visibility
Event: Every tick
  Action: Set Button "Back" visible -> Can go back
```

**Expected:**
- Clicking Settings shows `Settings`, hides `Main Menu`
- Clicking Back returns to `Main Menu`
- Back button only appears when there is history

**Expressions to verify in a Text object:**
```
"Current: " & CurrentScreen()
"Stack depth: " & FocusStackDepth()
```

---

## Test 3 - Popups

**Goal:** Open and close a popup without affecting screen navigation.

### Event sheet

```
Event: Button "Quit" -> On clicked
  Action: Open popup -> "Confirm Quit"

Event: Button "Cancel" -> On clicked
  Action: Close popup -> "Confirm Quit"

Event: Button "Confirm" -> On clicked
  Action: Close popup -> "Confirm Quit"
  Action: Go to layout -> [Main Menu layout]
```

**Expected:**
- `Confirm Quit` appears above the current screen
- `Main Menu` remains in place (not hidden)
- Focus stack is unchanged - Back still returns to the same screen

**Expression to verify:**
```
"Top popup: " & TopPopup()
```

---

## Test 4 - Tooltips

**Goal:** Show and hide a tooltip on hover.

### Event sheet

```
Event: Mouse is over "Help Icon" object
  Action: Show tooltip -> "Tooltip"

Event: Mouse is NOT over "Help Icon" object
  Action: Hide tooltip

// Alternative: hide specific tooltip
Event: Button "Close Tip" -> On clicked
  Action: HideTooltip -> "Tooltip"
```

**Expected:**
- `Tooltip` layer appears only while hovering
- Only one tooltip is active at a time (showing a second one auto-hides the first)

**Expression to verify:**
```
"Active tip: " & ActiveTooltip()
```

---

## Test 5 - Full API: TrackLayer with Role and Modal

**Goal:** Verify advanced registration options.

```
Event: On start of layout
  // HUD is non-modal - it stays interactive alongside other screens
  Action: Track layer -> "HUD", Role: Normal, Blocks others: false, Sync collisions: false
  // Pause screen blocks others - disables all other normals when active
  Action: Track layer -> "Pause", Role: Normal, Blocks others: true, Sync collisions: false
  Action: Navigate to screen -> "HUD"
  Action: Navigate to screen -> "Main Menu"

Event: Key "Escape" pressed
  Action: Navigate to screen -> "Pause"

Event: Key "Escape" pressed (inside Pause)
  Action: Return to previous screen
```

**Expected:**
- When `Pause` is focused, `HUD` and `Main Menu` become non-interactive (modal)
- When popped, `Main Menu` and `HUD` regain their interactive states exactly as before

---

## Test 6 - Triggers (On Layer State Changed)

**Goal:** Confirm trigger conditions fire at the right moments.

### Event sheet

```
// Fires for a specific layer
Trigger: On layer "Settings" state changed
  Action: Log -> "Settings changed to: " & LastChangedState()

// Fires for any tracked layer
Trigger: On any layer state changed
  Action: Log -> LastChangedLayer() & " -> " & LastChangedState()

// Focus/unfocus events
Trigger: On layer "Main Menu" fully opened
  Action: Play sound -> "screen_open"

Trigger: On layer "Main Menu" fully closed
  Action: Play sound -> "screen_close"

// Opening/closing animation events
Trigger: On layer "Settings" opening
  Action: Log -> "Settings is animating in"

Trigger: On layer "Settings" transition complete
  Action: Log -> "Settings animation finished"
```

**Expected:** Each event fires exactly once per state change, with correct values in `LastChangedLayer()` and `LastChangedState()`.

---

## Test 7 - Common Triggers (Common API)

**Goal:** Verify the simplified triggers in the Common category.

```
Trigger: On screen shown -> "Settings"
  Action: Set Text -> "Opened Settings"

Trigger: On screen hidden -> "Settings"
  Action: Set Text -> "Closed Settings"

Trigger: On popup opened -> "Confirm Quit"
  Action: Disable button -> "Quit"

Trigger: On popup closed -> "Confirm Quit"
  Action: Enable button -> "Quit"
```

---

## Test 8 - Animations

**Goal:** Test each animation type on layer transitions.

```
// Override animation per-layer
Event: On start of layout (after tracking)
  Action: Set layer animation -> "Settings", Type: slideLeft, Duration: 400, Easing: easeInOut

Event: Button "Settings" clicked
  Action: Show screen -> "Settings"
  // -> Settings should slide in from the left
```

**Test each animation type:**
| Type | Expected visual |
|---|---|
| `fade` | Layer fades in/out via opacity |
| `slideLeft` | Slides in from right, exits to left |
| `slideRight` | Slides in from left, exits to right |
| `slideUp` | Slides in from bottom, exits upward |
| `slideDown` | Slides in from top, exits downward |
| `none` | Instant show/hide with no animation |

**Drive a custom effect with animation progress:**
```
Event: Every tick
  Action: Set overlay opacity -> LayerAnimProgress("Settings")
```

**Check direction mid-animation:**
```
Event: Every tick
  Condition: LayerAnimDirection("Settings") = "opening"
    Action: Play "opening" sound (once)
```

---

## Test 9 - Layer State Queries

**Goal:** Verify all state-query expressions and conditions return correct values.

```
// In a Text debug object, every tick:
"State:     " & LayerState("Settings")
"Prev:      " & PreviousLayerState("Settings")
"Role:      " & LayerRole("Settings")
"Focused:   " & FocusedLayer()
"Depth:     " & FocusStackDepth()
"TopPopup:  " & TopPopup()
"ActiveTip: " & ActiveTooltip()

// Conditions - use to gate logic
Condition: Layer "Settings" is in state "visible"
Condition: Layer "Settings" is visible
Condition: Layer "Settings" accepts input
Condition: Layer "Confirm Quit" is animating
Condition: Layer "Confirm Quit" blocks other screens
Condition: No screens are open
Condition: Any popup visible
```

---

## Test 10 - Custom Data on Layers

**Goal:** Pass data to a screen before opening it.

```
Event: List item clicked (e.g. select an item to view detail)
  Action: Set layer data -> "Item Detail", key: "itemId", value: Self.ItemId
  Action: Show screen -> "Item Detail"

// Inside the Item Detail screen - On screen shown trigger:
Trigger: On screen shown -> "Item Detail"
  Action: Set Text -> LayerData("Item Detail", "itemId")
```

---

## Test 11 - Skip / Complete Transitions

**Goal:** Instantly finish or skip all running animations.

```
// Skip a single layer's animation (snap to end state immediately)
Event: Button "Skip" clicked
  Action: Finish animation instantly -> "Settings"

// Skip ALL currently running animations at once
Event: Key "S" pressed
  Action: Skip all animations
```

**Expected:** The layer jumps to its end state (fully visible or fully hidden) without waiting for the animation to complete.

---

## Test 12 - Persist Across Layouts

**Goal:** Verify focus stack and layer states survive a layout change.

1. Enable **Persist Across Layouts** in the UIDirector properties.
2. Navigate to `Settings` screen (depth = 2).
3. Transition to a new layout that also has the same `UI` group layer structure.
4. On the new layout's `On start of layout`:

```
// Re-register layers (UIDirector re-resolves refs automatically)
Event: On start of layout
  Action: Setup screen layer -> "Main Menu"
  Action: Setup screen layer -> "Settings"
  // Do NOT call Show screen - state is already restored
```

**Expected:** `CurrentScreen()` still returns `"Settings"` and `FocusStackDepth()` is still `2`.

---

## Test 13 - Untrack Layers

**Goal:** Confirm removing a layer from tracking releases plugin control.

```
Event: Button "Untrack Settings" clicked
  Action: Untrack layer -> "Settings"
  // Settings is now invisible and non-interactive, never touched again

// Untrack everything at once (e.g. before a scene transition)
Event: On before layout change
  Action: Untrack all layers
```

**Condition to verify:**
```
Condition: Layer "Settings" is tracked -> should return false after untracking
```

---

## Test 14 - Group Layer as a Screen (Pattern 1)

**Goal:** A tracked layer is itself a group layer with internal sublayers. All sublayers should animate, toggle visibility, and manage collisions as a single unit.

### Layer structure

```
[!UI]                         ← container group layer
    [UI - Options]            ← tracked as a normal screen (group layer)
        [UI - Options - BG]       ← sublayer (background art)
        [UI - Options - Objects]  ← sublayer (buttons, sliders)
        [UI - Options - Text]     ← sublayer (labels)
    [UI - Main Menu]          ← tracked as a normal screen (flat layer)
```

### Event sheet

```
Event: On start of layout
  Action: Track layer -> "UI - Options", Role: Normal, Blocks others: true, Sync collisions: true
  Action: Track layer -> "UI - Main Menu", Role: Normal, Blocks others: true, Sync collisions: false
  Action: Navigate to screen -> "UI - Main Menu"

// Set a slide animation on the group layer
Event: On start of layout (after tracking)
  Action: Set layer animation -> "UI - Options", Type: slideLeft, Duration: 400, Easing: easeInOut

Event: Button "Options" clicked
  Action: Navigate to screen -> "UI - Options"

Event: Button "Back" clicked
  Action: Return to previous screen
```

**Expected:**
- Focusing `UI - Options` makes all three sublayers (BG, Objects, Text) visible and slide in together
- Fade animation applies group opacity - all sublayers fade as one unit
- Slide animation scrolls each sublayer in sync (scroll doesn't cascade from groups)
- `Manage collisions: true` toggles `collisionsEnabled` on instances across all sublayers
- Returning to the previous screen hides all sublayers and restores `UI - Main Menu`

**Expressions to verify:**
```
"State: " & LayerState("UI - Options")
"Current: " & CurrentScreen()
```

---

## Test 15 - Nested Group with Independent Screens (Pattern 2)

**Goal:** Individually tracked layers sit inside an untracked organising group. Z-order operations move the parent group, not the individual sublayer.

### Layer structure

```
[!UI]                         ← container group layer
    [UI - Debug]              ← tracked (flat layer)
    [UI - In Game]            ← NOT tracked (organising group only)
        [UI - Start]          ← tracked as a normal screen
        [UI - Finish]         ← tracked as a normal screen
        [UI - Playing]        ← tracked as a normal screen
    [UI - Touch]              ← tracked (flat layer)
```

### Event sheet

```
Event: On start of layout
  Action: Track layer -> "UI - Debug", Role: Normal, Blocks others: false, Sync collisions: false
  Action: Track layer -> "UI - Start", Role: Normal, Blocks others: true, Sync collisions: false
  Action: Track layer -> "UI - Finish", Role: Normal, Blocks others: true, Sync collisions: false
  Action: Track layer -> "UI - Playing", Role: Normal, Blocks others: true, Sync collisions: false
  Action: Track layer -> "UI - Touch", Role: Normal, Blocks others: false, Sync collisions: false
  Action: Navigate to screen -> "UI - Start"

// Navigate between screens inside the nested group
Event: Button "Play" clicked
  Action: Navigate to screen -> "UI - Playing"

Event: Button "Finish" clicked
  Action: Navigate to screen -> "UI - Finish"

Event: Button "Back" clicked
  Action: Return to previous screen
```

**Expected:**
- `Track layer -> "UI - Start"` resolves correctly even though it is nested two levels deep inside the container
- Focusing `UI - Start` moves its parent group `UI - In Game` to the top of the container's Z-order (not `UI - Start` itself)
- Returning to the previous screen restores `UI - In Game` to its original Z-position
- Switching between `UI - Start`, `UI - Finish`, and `UI - Playing` keeps them all inside `UI - In Game` - only visibility toggles change
- `UI - Debug` and `UI - Touch` (non-modal flat layers) remain interactive alongside the focused screen

**Expressions to verify:**
```
"Current: " & CurrentScreen()
"Stack depth: " & FocusStackDepth()
"State Start: " & LayerState("UI - Start")
"State Playing: " & LayerState("UI - Playing")
```

---

## Test 16 - Replace Screen (No History)

**Goal:** Confirm that Replace current screen removes the previous screen from history so the player cannot go Back to it.

### Layer structure
```
[UI]
    [Main Menu]
    [Loading]
```

### Event sheet

```
Event: On start of layout
  Action: Setup screen layer -> "Loading"
  Action: Setup screen layer -> "Main Menu"
  Action: Show screen -> "Loading"

// Simulate load complete after 2 seconds
Event: Timer fires at 2 seconds
  Action: Replace current screen -> "Main Menu"
```

**Expected:**
- After Replace, `CurrentScreen()` = `"Main Menu"` and `FocusStackDepth()` = `1`
- `Can go back` = false (Loading is not in history)
- `PreviousScreen()` = `""` (nothing below Main Menu)

---

## Test 17 - Navigate to Screen with Data

**Goal:** Confirm that Navigate to screen with data passes the value before the screen opens.

### Event sheet

```
Event: Button "View Item" clicked
  Action: Navigate to screen with data -> "Item Detail", key: "itemId", value: 42

Trigger: On screen shown -> "Item Detail"
  Action: Set Text -> LayerData("Item Detail", "itemId")
  // Expect to see "42" immediately on open
```

**Expected:**
- `LayerData("Item Detail", "itemId")` returns `"42"` inside the `On screen shown` trigger - no extra `Set layer data` call needed.

---

## Test 18 - Auto-dismiss Popup

**Goal:** Show a popup that closes itself after 2 seconds without any player interaction.

### Event sheet

```
Event: Button "Save" clicked
  Action: Show popup for duration -> "Toast", 2000

Trigger: On popup closed -> "Toast"
  Action: Log -> "Toast closed"
```

**Expected:**
- `Toast` appears immediately with its opening animation
- After 2000 ms it plays its closing animation and hides automatically
- The `On popup closed` trigger fires exactly once
- Calling `Hide popup -> "Toast"` before 2 seconds cancels the timer and closes it immediately

---

## Test 19 - Mirror Close Animation

**Goal:** Confirm that a screen set to mirror its close direction exits in the opposite direction to its entry direction.

### Event sheet

```
Event: On start of layout
  Action: Setup screen layer -> "Main Menu"
  Action: Setup screen layer -> "Settings"
  Action: Set layer animation -> "Settings", slideLeft, 400, easeOut, mirror close: true
  Action: Show screen -> "Main Menu"

Event: Button "Settings" clicked
  Action: Show screen -> "Settings"
  // Settings slides in from the LEFT

Event: Button "Back" clicked
  Action: Go back
  // Settings should slide out to the RIGHT (mirrored)
```

**Expected:**
- Opening: `Settings` enters from the left (scrollX goes from -layout_width to 0)
- Closing (via Go Back): `Settings` exits to the right (scrollX goes from 0 to +layout_width)
- The mirror only applies on Go Back, not when navigating forward

---

## Test 20 - Breadcrumb with PreviousScreen and ScreenAtDepth

**Goal:** Verify `PreviousScreen()` and `ScreenAtDepth(n)` return correct values as the stack grows and shrinks.

### Event sheet

```
Event: On start of layout
  Action: Setup screen layer -> "Menu"
  Action: Setup screen layer -> "Settings"
  Action: Setup screen layer -> "Audio"
  Action: Show screen -> "Menu"

Event: Button "Settings" clicked
  Action: Show screen -> "Settings"

Event: Button "Audio" clicked
  Action: Show screen -> "Audio"

// Debug display - every tick
Event: Every tick
  Action: Set text -> CurrentScreen()
    & " | Prev: " & PreviousScreen()
    & " | Depth(1): " & ScreenAtDepth(1)
    & " | Depth(2): " & ScreenAtDepth(2)
    & " | Depth(3): " & ScreenAtDepth(3)
```

**Expected values at each step:**

| Navigation state | CurrentScreen | PreviousScreen | ScreenAtDepth(1) | ScreenAtDepth(2) | ScreenAtDepth(3) |
|---|---|---|---|---|---|
| After Show Menu | `"Menu"` | `""` | `"Menu"` | `""` | `""` |
| After Show Settings | `"Settings"` | `"Menu"` | `"Menu"` | `"Settings"` | `""` |
| After Show Audio | `"Audio"` | `"Settings"` | `"Menu"` | `"Settings"` | `"Audio"` |
| After Go Back | `"Settings"` | `"Menu"` | `"Menu"` | `"Settings"` | `""` |

---

## Test 21 - Screen Is In Navigation History

**Goal:** Confirm the condition fires correctly and can prevent duplicate entries in the stack.

### Event sheet

```
Event: On start of layout
  Action: Setup screen layer -> "Settings"
  Action: Setup screen layer -> "Main Menu"
  Action: Show screen -> "Main Menu"

// Disable the Settings button if Settings is already in the stack
Event: Every tick
  Action: Set Button "Settings" enabled -> NOT (Screen "Settings" is in navigation history)

Event: Button "Settings" clicked
  Condition: NOT (Screen "Settings" is in navigation history)
    Action: Show screen -> "Settings"
```

**Expected:**
- After navigating to Settings: `Screen "Settings" is in navigation history` = true
- After going back: condition = false, button re-enables

---

## Test 22 - Dim Layer

**Goal:** Verify the dim layer appears automatically when a modal screen or popup is active and disappears when they close.

### UIDirector properties
| Property | Value |
|---|---|
| Dim Layer | `Dim` |
| Dim Opacity | `0.5` |

### Layer structure
```
[UI]
    [Confirm Dialog]  ← popup role
    [Dim]             ← NOT tracked - managed automatically
    [Settings]        ← normal, blocks others: true
    [Main Menu]       ← normal, blocks others: true
```

### Event sheet

```
Event: On start of layout
  Action: Setup screen layer -> "Main Menu"
  Action: Setup screen layer -> "Settings"
  Action: Setup popup layer  -> "Confirm Dialog"
  Action: Show screen        -> "Main Menu"

Event: Button "Settings" clicked
  Action: Show screen -> "Settings"
  // Dim layer should appear (Settings blocks others)

Event: Button "Open Dialog" clicked
  Action: Open popup -> "Confirm Dialog"
  // Dim layer should appear (popup is active)

Event: Button "Close Dialog" clicked
  Action: Close popup -> "Confirm Dialog"
  // Dim layer should disappear if no other popup or modal active

Event: Button "Back" clicked
  Action: Go back
  // Dim layer disappears when Main Menu is the only screen (non-modal background)
```

**Expected:**
- Dim layer is visible and at 50% opacity when Settings screen is focused
- Dim layer is visible when Confirm Dialog popup is open
- Dim layer hides when all modals and popups are closed
- Dim layer is NOT tracked - `Layer "Dim" is tracked` condition returns false

---

## Test 23 - Go Back to First Screen

**Goal:** Verify that **Go back to first screen** collapses the entire focus stack back to the root screen in one action, regardless of how many screens deep the player has navigated.

### Layer structure
```
[UI]
    [Keybindings]   <- normal
    [Controls]      <- normal
    [Settings]      <- normal
    [Main Menu]     <- normal
```

### Event sheet

```
Event: On start of layout
  Action: Setup screen layer -> "Main Menu"
  Action: Setup screen layer -> "Settings"
  Action: Setup screen layer -> "Controls"
  Action: Setup screen layer -> "Keybindings"
  Action: Show screen -> "Main Menu"

// ── Navigate deep ────────────────────────────────────────
Event: Button "Settings" clicked
  Action: Navigate to screen -> "Settings"

Event: Button "Controls" clicked
  Action: Navigate to screen -> "Controls"

Event: Button "Keybindings" clicked
  Action: Navigate to screen -> "Keybindings"

// ── Home button ──────────────────────────────────────────
Event: Button "Home" clicked
  Action: Go back to first screen
```

**After "Home" is clicked:**
```
// Verify with Text = CurrentScreen()
Expected: "Main Menu"

// Verify with Text = FocusStackDepth()
Expected: 1

// Verify with Text = LayerState("Keybindings")
Expected: "hidden"

// Verify with Text = LayerState("Controls")
Expected: "hidden"

// Verify with Text = LayerState("Settings")
Expected: "hidden"
```

**Expected:** Pressing Home from four levels deep instantly closes Keybindings, Controls, and Settings without animation and leaves Main Menu as the single focused screen.

---

## Test 24 - Layer Is Fully Open

**Goal:** Verify that **Layer is fully open** returns false while a slide animation is in progress and true only after the animation finishes.

### Layer structure
```
[UI]
    [Checkout]  <- normal, animation: slideLeft, 500ms
    [Main Menu] <- normal
```

### Event sheet

```
Event: On start of layout
  Action: Setup screen layer -> "Main Menu"
  Action: Setup screen layer -> "Checkout"
  Action: Set Layer Animation -> "Checkout", slideLeft, 500ms, easeOut
  Action: Show screen -> "Main Menu"

Event: Button "Checkout" clicked
  Action: Navigate to screen -> "Checkout"

// ── Poll every tick to show current state ─────────────────
Every tick
  Action: Set Text (FullyOpenLabel) ->
    "Fully open: " & LayerState("Checkout") & " animating: " & UIDirector.LayerIsAnimating("Checkout")

// ── Gate a button until animation finishes ────────────────
Every tick
  Condition: Layer is fully open -> "Checkout"
  Action: Set ConfirmButton -> Enabled: true

Every tick
  Condition: Layer is fully open -> "Checkout" [INVERTED]
  Action: Set ConfirmButton -> Enabled: false
```

**Expected during slide-in (0 - 500ms):**
- `LayerState("Checkout")` = `"hidden"` (state is set to focused only after animation)
- `LayerIsAnimating("Checkout")` = true
- `Layer is fully open` = false -> ConfirmButton is Disabled

**Expected after animation completes:**
- `LayerState("Checkout")` = `"focused"`
- `LayerIsAnimating("Checkout")` = false
- `Layer is fully open` = true -> ConfirmButton is Enabled

---

## Test 25 - Close All Popups

**Goal:** Verify that **Close all popups** hides every open popup in one action.

### Layer structure
```
[UI]
    [Alert]   <- popup role
    [Notice]  <- popup role
    [Main Menu] <- normal
```

### Event sheet

```
Event: On start of layout
  Action: Setup screen layer -> "Main Menu"
  Action: Setup popup layer  -> "Alert"
  Action: Setup popup layer  -> "Notice"
  Action: Show screen        -> "Main Menu"

Event: Button "Show Both" clicked
  Action: Open popup -> "Alert"
  Action: Open popup -> "Notice"

Event: Button "Clear All" clicked
  Action: Close all popups
```

**After "Show Both" then "Clear All":**
```
// Verify:
Condition: Any popup visible
Expected: false

LayerState("Alert")
Expected: "hidden"

LayerState("Notice")
Expected: "hidden"
```

**Expected:** Both popups close (with their configured animation, if any). `Any popup visible` returns false immediately after both animations finish.

---

## Test 26 - C3 Debugger Panel

**Purpose:** Verify that the C3 Debugger panel shows accurate live state for all tracked layers.

**Setup:**
```
// Layout start
Action: Setup screen layer   -> "Main Menu"
Action: Setup screen layer   -> "Settings"
Action: Setup popup layer    -> "Confirm Quit"
Action: Setup tooltip layer  -> "Hint"
Action: Show screen          -> "Main Menu"
Action: Set layer animation  -> "Settings", slideLeft, 400ms, easeOut, mirror: true
Action: Set layer data       -> "Settings", "tab", "audio"
```

**Step 1 - Baseline check:**
Open the C3 Debugger, expand UIDirector.

```
// Expected — Summary section:
Active screen:    "Main Menu"
Stack depth:      1
Open popups:      0
Active tooltip:   (none)
Animating layers: 0
Total tracked:    3

// Expected — Focus Stack section:
[1] Main Menu  ◀ active   →  focused

// Expected — Layer: Settings section:
Role:          normal
State:         hidden
Anim override: slideLeft  400ms  easeOut
data.tab:      audio
Mirror on back: true
```

**Step 2 - Navigate to Settings:**
```
Action: Navigate to screen -> "Settings"
```
While the slide animation is playing, check the debugger mid-frame:
```
// Expected — Layer: Settings section while animating:
State:  hidden  (opening  ~50%)    ← percentage climbs toward 100

// Expected — Summary:
Animating layers: 1
```
After animation finishes:
```
State:         focused
Stack depth:   2
[2] Settings  ◀ active
[1] Main Menu
```

**Step 3 - Open popup:**
```
Action: Open popup -> "Confirm Quit"
```
```
// Expected — Summary:
Open popups: 1

// Expected — Open Popups section:
Confirm Quit → visible
```

**Step 4 - Show tooltip:**
```
Action: Show tooltip -> "Hint"
```
```
// Expected — Summary:
Active tooltip: Hint
```

**Step 5 - Go back:**
```
Action: Go back
```
```
// Expected — Summary after animation:
Active screen: Main Menu
Stack depth:   1
```

---

## Test 27 - Per-Instance Timescale

**Purpose:** Verify that `Set layer timescale` and `Reset layer timescale` apply to all instances on a layer (including sublayers), and that the override is independent of the global timescale.

**Setup:**
```
// Layout start — "UI - HUD" has at least one Sprite with an animation running
Action: Track layer -> "UI - HUD", Normal, Modal: false, Manage collisions: false
Action: Show screen -> "UI - HUD"
```

**Step 1 - Freeze layer instances:**
```
Action: Set layer timescale -> "UI - HUD", 0, -1
//                                          ↑   ↑
//                      instanceTimescale=0 (freeze)
//                         runtimeTimescale=-1 (don't change runtime override)
```
```
// Expected:
All Sprite animations on "UI - HUD" freeze (frame stops updating).
Global timescale is still 1 — game objects outside the layer continue animating.
```

**Step 2 - Set global timescale to 0 (game paused), then unfreeze UI:**
```
System: Set time scale -> 0         ← game pauses
Action: Set layer timescale -> "UI - HUD", 1, -1
```
```
// Expected:
Game objects freeze (global ts = 0).
"UI - HUD" instances animate at full speed despite global pause.
```

**Step 3 - Reset instances to follow global:**
```
Action: Reset layer timescale -> "UI - HUD"
```
```
// Expected:
"UI - HUD" instances now also freeze (they follow global ts = 0 again).
```

**Step 4 - Restore global and verify sublayer propagation:**
```
System: Set time scale -> 1
Action: Set layer timescale -> "UI - HUD", 2, -1   ← double speed, don't change runtime
```
```
// Expected:
If "UI - HUD" is a group layer, instances on all nested sublayers run at 2× speed.
```

---

## Test 28 - Managed Runtime Timescale (Auto-Restore)

**Purpose:** Verify that the `runtimeTimescale` parameter of `Set layer timescale` automatically applies the configured global timescale when a layer opens and restores the previous value when it closes. Also verify correct stacking behaviour when multiple layers have overrides.

**Setup:**
```
// Layout start
Action: Setup screen layer -> "Main Menu"
Action: Setup screen layer -> "PauseMenu"
Action: Setup screen layer -> "OptionsMenu"
Action: Setup popup layer  -> "ModalPopup"
Action: Show screen        -> "Main Menu"

// Configure timescales — instance=1 keeps UI animated, runtime=X freezes/slows game
Action: Set layer timescale -> "PauseMenu",   1, 0      ← instance animated, runtime=0 (freeze)
Action: Set layer timescale -> "OptionsMenu", 1, 0.25   ← instance animated, runtime=0.25 (slow-mo)
Action: Set layer timescale -> "ModalPopup",  -1, 0     ← runtime=0 only (instance unchanged)
```

**Step 1 - Open PauseMenu:**
```
Action: Navigate to screen -> "PauseMenu"
```
```
// Expected:
runtime.timeScale = 0  (game frozen)
PauseMenu instances animate (their timeScale = 1)
```

**Step 2 - Open OptionsMenu from within PauseMenu:**
```
Action: Navigate to screen -> "OptionsMenu"
```
```
// Expected:
runtime.timeScale = 0.25  (slow-motion override from OptionsMenu)
// PauseMenu's saved value is 0 (what runtime.timeScale was when PauseMenu was active)
```

**Step 3 - Close OptionsMenu:**
```
Action: Return to previous screen
```
```
// Expected:
runtime.timeScale = 0  (PauseMenu's override restored — NOT 1)
```

**Step 4 - Close PauseMenu:**
```
Action: Return to previous screen
```
```
// Expected:
runtime.timeScale = 1  (original value from before PauseMenu opened)
```

**Step 5 - Popup test:**
```
Action: Open popup -> "ModalPopup"
```
```
// Expected:
runtime.timeScale = 0
```
```
Action: Close popup -> "ModalPopup"
```
```
// Expected:
runtime.timeScale = 1  (restored)
```

**Step 6 - Clear the override:**
```
Action: Set layer timescale -> "PauseMenu", -1, -1
//                                          ↑    ↑
//                  instance unchanged (-1) | runtime override cleared (-1)
Action: Navigate to screen -> "PauseMenu"
```
```
// Expected:
runtime.timeScale unchanged (still 1) — the -1 cleared the runtime override
```

---

## Debugging Tips

- Enable **Debug Mode** in the UIDirector Properties Bar — all state changes and transitions are logged to the browser DevTools console with `[UIDirector]` prefix.
- Open the C3 Debugger (F12 during preview) and expand the UIDirector instance. Every tracked layer, the full focus stack, and all open popups are shown in real time with no extra event sheet setup needed.
- If a layer doesn't respond, check: is it a sublayer of the group layer named in **UI Container Layer**? Is the name spelling identical (case-sensitive)?
- If the debugger shows `Animating layers: 1` but the screen looks stuck, the animation duration may be very long. Use **Finish animation instantly** on that layer to skip it.
