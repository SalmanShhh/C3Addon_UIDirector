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

## Debugging Tips

- Enable **Debug Mode** in the UIDirector Properties Bar - all state changes and transitions are logged to the browser DevTools console.
- Open the C3 debugger and watch the Text objects showing `CurrentScreen()`, `FocusStackDepth()`, and `LayerState()` update in real time.
- If a layer doesn't respond, check: is it a sublayer of the group layer named in **UI Container Layer**? Is the name spelling identical (case-sensitive)?
