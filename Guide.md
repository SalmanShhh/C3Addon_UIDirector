# UIDirector - Complete Guide

**UIDirector** is a Construct 3 plugin that takes control of your UI layers so you never have to manually set layer visibility, interactive state, or Z-order again. You register your layers once, then drive everything through actions.

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Project Setup](#2-project-setup)
3. [Plugin Properties](#3-plugin-properties)
4. [Layer Roles](#4-layer-roles)
5. [Layer States](#5-layer-states)
6. [The Focus Stack](#6-the-focus-stack)
7. [Group Layers & Nested Screens](#7-group-layers--nested-screens)
8. [Animations](#8-animations)
9. [Actions Reference](#9-actions-reference)
10. [Conditions Reference](#10-conditions-reference)
11. [Expressions Reference](#11-expressions-reference)
12. [Triggers Reference](#12-triggers-reference)
13. [Game Use Cases](#13-game-use-cases)

---

## 1. Core Concepts

UIDirector manages your UI layers through a state machine. The key ideas:

- **Container layer** - a single C3 group layer that holds all your UI sublayers. UIDirector only touches what's inside this group.
- **Tracking** - you register a sublayer by name. After that, UIDirector owns its `visible`, `interactive`, and Z-order properties.
- **Role** - every tracked layer has a role (`normal`, `popup`, or `tooltip`) that determines how it behaves.
- **State** - every tracked layer is always in one of four states: `visible`, `hidden`, `disabled`, or `focused`.
- **Focus stack** - a navigation history. Pushing a screen records where you were; popping returns you.

> **Rule:** Once a layer is tracked, never use C3's built-in "Set layer visible" or "Set layer interactive" on it directly. UIDirector will override those values. Use UIDirector actions exclusively.

---

## 2. Project Setup

### Step 1 - Install the addon

Install `salmanshh_uidirector.c3addon` via the Construct 3 addon manager.

### Step 2 - Create your layer structure

In the C3 layer editor, create a **group layer** (e.g. `UI`) and put all your UI sublayers inside it:

```
[Background]         ← untracked game layer, UIDirector ignores this
[UI]                 ← group layer - this is your container
    [Tooltip]        ← will be registered as a tooltip
    [Confirm Dialog] ← will be registered as a popup
    [Pause Menu]     ← will be registered as a normal screen
    [Inventory]      ← will be registered as a normal screen
    [HUD]            ← will be registered as a normal screen (non-modal)
    [Main Menu]      ← will be registered as a normal screen
[Game World]         ← untracked, UIDirector ignores this
```

The order in the layer editor does not matter - UIDirector reorders sublayers automatically at runtime based on role.

### Step 3 - Add the UIDirector object

Add a **UIDirector** object to your layout (like a global plugin, it is single-instance). Configure its properties (see §3).

### Step 4 - Register layers at layout start

Use the **Common** category actions for the simplest setup:

```
Event: On start of layout
  Action: Setup screen layer   -> "Main Menu"
  Action: Setup screen layer   -> "HUD"
  Action: Setup screen layer   -> "Pause Menu"
  Action: Setup screen layer   -> "Inventory"
  Action: Setup popup layer    -> "Confirm Dialog"
  Action: Setup tooltip layer  -> "Tooltip"
  Action: Show screen          -> "Main Menu"
```

That's it. UIDirector will hide all other layers and show `Main Menu`.

---

## 3. Plugin Properties

Configure these in the Properties Bar when the UIDirector object is selected.

| Property | Type | Default | Description |
|---|---|---|---|
| **UI Container Layer** | Text | `"UI"` | The name of the group layer that holds all your UI sublayers. Must match exactly (case-sensitive). |
| **Default Anim Type** | Combo | `fade` | Animation used when no per-layer override is set. Options: `fade`, `slideLeft`, `slideRight`, `slideUp`, `slideDown`, `none`. |
| **Default Anim Duration** | Integer | `200` | How long transitions take in milliseconds. |
| **Default Anim Easing** | Combo | `easeOut` | Easing curve. Options: `linear`, `easeIn`, `easeOut`, `easeInOut`. |
| **Persist Across Layouts** | Checkbox | Off | When enabled, the focus stack and layer states survive a C3 layout change. |
| **Debug Mode** | Checkbox | Off | Logs all state changes and animations to the browser console. Useful during development. |

---

## 4. Layer Roles

Every tracked layer has exactly one role, set at registration and never changed.

### Normal
A navigable screen. Participates in the navigation history. When active, it is moved to the top of the normal-layer Z-order. If **blocks other screens** is true (the default), all other normal layers are made non-interactive while this one is active.

Use for: main menu, settings, inventory, pause menu, game over screen, character select.

### Popup
An overlay that appears above all normal layers. Does **not** affect the focus stack - the player can still press Back and navigate normally while a popup is open. Multiple popups can be open simultaneously (they stack).

Use for: confirmation dialogs, error messages, achievement notifications, item tooltips that need interaction.

### Tooltip
A display-only overlay always pinned to the very top of the Z-order. Only one tooltip can be active at a time - showing a new one auto-hides the previous one.

Use for: hover hints, control reminders, item descriptions.

---

## 5. Layer States

Every tracked layer is always in one of these states:

| State | Visible | Interactive | When used |
|---|---|---|---|
| `hidden` | No | No | Default for all layers on registration. The layer doesn't render and ignores input. |
| `visible` | Yes | Yes | The layer is shown and the player can interact with it. |
| `disabled` | Yes | No | The layer renders (you can see it) but input is blocked. Good for greyed-out overlays. |
| `focused` | Yes | Yes | Set automatically when a normal layer is at the top of the focus stack. |

Check the state of any layer at any time with `LayerState("layerName")`.

---

## 6. The Focus Stack

The focus stack is UIDirector's navigation history. It works like a browser's Back button.

### How it works

When you call **Navigate to screen** (or **Show Screen**):
1. A snapshot of every tracked normal layer's interactive state is saved.
2. The target layer is moved to the top of the Z-order.
3. If the layer is set to block other screens, all other normal layers are made non-interactive.
4. The layer is put in the `focused` state.
5. A stack frame `{ layerName, savedIndex, interactiveSnapshot }` is pushed.

When you call **Return to previous screen** (or **Go Back**):
1. The top frame is popped.
2. The layer at that frame is hidden (with a closing animation).
3. The saved interactive snapshot is restored on all other normal layers.
4. The layer below in the stack is re-focused.

### Multi-level navigation example

```
Stack (bottom to top):
  [ Main Menu ] ← pushed first
  [ Settings  ] ← pushed second
  [ Controls  ] ← currently focused (top)
```

Each `Go back` pops one level: Controls -> Settings -> Main Menu.

---

## 7. Group Layers & Nested Screens

UIDirector supports two patterns for organising complex UIs with group layers (layer folders).

### Pattern 1 - Track a group layer as one screen

A tracked layer can be a C3 group layer containing sublayers. UIDirector treats the entire group as a single unit.

```
[UI]                    ← container
    [Options]           ← tracked as one screen (group layer)
        [Options - BG]
        [Options - Objects]
        [Options - Text]
```

Register the group layer itself - the sublayers are just visual structure:

```
Event: On start of layout
  Action: Setup screen layer -> "Options"
  Action: Show screen -> "Options"
```

**How it works:**
- `visible` and `interactive` on the group layer cascade automatically to all sublayers.
- `opacity` (fade animation) composites over all sublayers - the whole group fades as one.
- Slide animations (`scrollX`/`scrollY`) are applied to each sublayer individually, since scroll does not cascade from a group layer to its children. UIDirector handles this automatically.
- Collision management (`manageCollisions: true`) reaches instances on all sublayers, not just the group layer.

### Pattern 2 - Track individual sublayers inside a nested group

Sometimes you need a group layer purely for organisation, but want to track the layers inside it as independent screens.

```
[UI]                        ← container
    [Debug]                 ← tracked (flat)
    [In Game]               ← NOT tracked (organising group, unmanaged)
        [Start Screen]      ← tracked as a normal screen
        [Finish Screen]     ← tracked as a normal screen
        [Playing HUD]       ← tracked as a normal screen
    [Touch Controls]        ← tracked (flat)
```

Register the sublayers individually - UIDirector finds them by searching recursively through the container:

```
Event: On start of layout
  Action: Setup screen layer -> "Start Screen"
  Action: Setup screen layer -> "Finish Screen"
  Action: Setup screen layer -> "Playing HUD"
  Action: Setup screen layer -> "Debug"
  Action: Setup screen layer -> "Touch Controls"
  Action: Show screen -> "Start Screen"
```

**How Z-order works:**
When UIDirector needs to bring `"Start Screen"` to the front, it automatically moves the **parent group** (`"In Game"`) to the top of the container instead. A nested layer cannot be moved independently of its parent - UIDirector detects this and moves the correct ancestor.

When the focus stack is popped, the parent group returns to its original Z-position.

**When to use which pattern:**
- Use **Pattern 1** when your screen has multiple visual layers (background, content, overlays) that always show/hide together.
- Use **Pattern 2** when you have a logical grouping of screens (e.g. "all in-game UI") but want each screen to operate independently within the focus stack.

---

## 8. Animations

### Default animations

Set the **Default Anim Type**, **Duration**, and **Easing** in the plugin properties. These apply to all layers unless overridden.

### Per-layer animation override

Use **Set Layer Animation** to give a specific layer its own animation style:

```
Event: On start of layout
  Action: Set layer animation -> "Settings", Type: slideLeft, Duration: 400, Easing: easeInOut
```

This overrides the plugin defaults only for the `Settings` layer.

### Animation types

| Type | Open | Close |
|---|---|---|
| `fade` | Opacity 0 -> 1 | Opacity 1 -> 0 |
| `slideLeft` | Slides in from the left | Slides out to the left |
| `slideRight` | Slides in from the right | Slides out to the right |
| `slideUp` | Slides up into view | Slides up and out |
| `slideDown` | Slides down into view | Slides down and out |
| `none` | Instant | Instant |

### Driving custom effects with animation progress

While a layer is animating, `LayerAnimProgress("layerName")` returns a value from `0` (start) to `1` (complete). Use this to sync custom effects:

```
Event: Every tick
  Condition: Layer "Pause Menu" is animating
  Action: Set overlay opacity -> LayerAnimProgress("Pause Menu")
```

### Skipping animations

```
Action: Finish animation instantly -> "Settings"   // snap one layer to its end state
Action: Skip all animations                       // snap ALL animating layers instantly
```

---

## 9. Actions Reference

### Common (beginner-friendly)

| Action | Description |
|---|---|
| **Setup screen layer** `name` | Register a layer as a normal navigable screen. Call once at layout start. |
| **Setup popup layer** `name` | Register a layer as a popup overlay. |
| **Setup tooltip layer** `name` | Register a layer as a tooltip (display-only, always on top). |
| **Show screen** `name` | Navigate to a screen, pushing it on the focus stack. |
| **Go back** | Close the current screen and return to the previous one (like a Back button). |
| **Open popup** `name` | Show a popup overlay above the current screen. |
| **Close popup** `name` | Hide a specific popup. |
| **Show tooltip** `name` | Show a tooltip (hides any previously active tooltip). |
| **Hide tooltip** | Hide the currently active tooltip. |

### Tracking

| Action | Description |
|---|---|
| **Track layer** `name, role, blocksOthers, syncCollisions` | Full registration with all options. Role: `normal`/`popup`/`tooltip`. `blocksOthers`: when active, disable all other normal layers. `syncCollisions`: mirror `collisionsEnabled` with the interactive state. |
| **Untrack layer** `name` | Remove a layer from UIDirector's control. It is immediately hidden. |
| **Untrack all layers** | Remove all layers from tracking. |

### Layer State

| Action | Description |
|---|---|
| **Set layer state** `name, state` | Directly set a layer's state: `visible`, `hidden`, `disabled`. |
| **Set layer blocks other screens** `name, enabled` | Change whether a screen blocks all other screens when it becomes active. |
| **Set layer animation** `name, type, duration, easing` | Override the animation settings for a specific layer. |
| **Sync collisions to layer state** `name, enabled` | Toggle automatic collision syncing for a layer - objects on the layer have collisions turned off when the layer is hidden or disabled. |
| **Set layer input enabled** `name, enabled` | Manually override a layer's input on/off. UIDirector will not override this until the next state change. |
| **Set layer data** `name, key, value` | Store an arbitrary string value on a layer, retrievable with `LayerData()`. |

### Focus Stack

| Action | Description |
|---|---|
| **Navigate to screen** `name` | Open a screen and make it the active one (same as Show Screen but in the full API). |
| **Return to previous screen** | Close the current screen and restore the previous one. |
| **Return to screen** `name` | Close screens one by one until the specified screen is active. Skips intermediate screens. |

### Popups

| Action | Description |
|---|---|
| **Show popup** `name` | Show a popup-role layer. |
| **Hide popup** `name` | Hide a specific popup-role layer. |

### Tooltips

| Action | Description |
|---|---|
| **Show tooltip** `name` | Show a tooltip-role layer (auto-hides any active tooltip). |
| **Hide tooltip** `name` | Hide a specific tooltip-role layer. |
| **Hide active tooltip** | Hide whichever tooltip is currently active. |

### Transitions

| Action | Description |
|---|---|
| **Finish animation instantly** `name` | Immediately snap a layer's animation to its end state. |
| **Skip all animations** | Immediately snap all currently-animating layers to their end states. |

---

## 10. Conditions Reference

| Condition | Description |
|---|---|
| **Layer is tracked** `name` | True if the layer has been registered with UIDirector. |
| **Layer is in state** `name, state` | True if the layer is currently in the given state. |
| **Layer is visible** `name` | True if the layer's state is `visible` or `focused`. |
| **Layer accepts input** `name` | True if `layer.interactive` is currently true. |
| **Layer blocks other screens** `name` | True if the layer is configured to block all other screens when active. |
| **Layer syncs collisions** `name` | True if collision syncing is enabled for the layer. |
| **Layer is animating** `name` | True while the layer is in the middle of an open/close transition. |
| **Screen is the active screen** `name` | True if the named screen is currently the topmost active screen. |
| **No screens are open** | True when no screens are currently active (nothing has been navigated to). |
| **Any popup visible** | True when at least one popup-role layer is currently visible. |
| **Tooltip is visible** `name` | True when the specified tooltip is the active tooltip. |
| **Can go back** | True when there is a previous screen to return to. |

---

## 11. Expressions Reference

| Expression | Returns | Description |
|---|---|---|
| `LayerState("name")` | string | Current state of a layer: `"visible"`, `"hidden"`, `"disabled"`, `"focused"`, or `""`. |
| `PreviousLayerState("name")` | string | State the layer was in before its most recent transition. |
| `LayerRole("name")` | string | Role of a tracked layer: `"normal"`, `"popup"`, `"tooltip"`, or `""`. |
| `LayerData("name", "key")` | string | Custom data stored on a layer with Set Layer Data. |
| `FocusedLayer()` | string | The name of the layer currently at the top of the focus stack. `""` if none. |
| `FocusStackDepth()` | number | How many layers are on the focus stack. `0` = nothing focused. |
| `CurrentScreen()` | string | Alias for `FocusedLayer()`. Beginner-friendly name. |
| `TopPopup()` | string | Name of the most recently opened popup. `""` if no popups are visible. |
| `ActiveTooltip()` | string | Name of the currently visible tooltip. `""` if none. |
| `LastChangedLayer()` | string | Name of the layer whose state most recently changed. Use inside trigger events. |
| `LastChangedState()` | string | The new state the most recently changed layer transitioned to. Use inside trigger events. |
| `LayerAnimProgress("name")` | number | Animation progress from `0` (start) to `1` (complete). |
| `LayerAnimDirection("name")` | string | `"opening"`, `"closing"`, or `""` when not animating. |

---

## 12. Triggers Reference

Triggers fire in response to state changes. They do not filter by layer unless you add a parameter.

| Trigger | Description |
|---|---|
| **On layer state changed** `name` | Fires when the specified layer changes state. |
| **On any layer state changed** | Fires when any tracked layer changes state. Read `LastChangedLayer()` and `LastChangedState()` to identify which. |
| **On layer fully opened** `name` | Fires when the specified layer finishes opening and is now the active screen. |
| **On layer fully closed** `name` | Fires when the specified layer finishes closing and is no longer active. |
| **On layer opening** `name` | Fires when a layer's opening animation begins. |
| **On layer closing** `name` | Fires when a layer's closing animation begins. |
| **On layer transition complete** `name` | Fires when a layer finishes its open or close animation. |
| **On screen shown** `name` | Common API alias for On layer fully opened. |
| **On screen hidden** `name` | Common API alias for On layer fully closed. |
| **On popup opened** `name` | Fires when a popup-role layer becomes visible. |
| **On popup closed** `name` | Fires when a popup-role layer is hidden. |

---

## 13. Game Use Cases

---

### Use Case 1 - Main Menu Navigation

**Scenario:** A game with a Main Menu, Settings screen, and Credits screen. The player can open Settings from the Main Menu, then go back.

#### Layer structure
```
[UI]
    [Credits]
    [Settings]
    [Main Menu]
```

#### Event sheet
```
// ── Layout Start ──────────────────────────────────────────
Event: On start of layout
  Action: Setup screen layer -> "Main Menu"
  Action: Setup screen layer -> "Settings"
  Action: Setup screen layer -> "Credits"
  Action: Show screen        -> "Main Menu"

// ── Navigation ────────────────────────────────────────────
Event: Button "Settings" -> On clicked
  Action: Show screen -> "Settings"

Event: Button "Credits" -> On clicked
  Action: Show screen -> "Credits"

Event: Button "Back" (on any screen) -> On clicked
  Action: Go back

// ── Show Back button only when there's history ────────────
Event: Every tick
  Action: Set Button "Back" visible -> Can go back

// ── Sound effects on screen changes ──────────────────────
Trigger: On any layer state changed
  Condition: LastChangedState() = "focused"
    Action: Play sound -> "screen_open"
```

---

### Use Case 2 - Pause Menu with HUD

**Scenario:** A game with a HUD that stays visible during play. When the player pauses, the Pause Menu appears over the HUD. The HUD must remain visible but not interactive while paused.

#### Key design choice
- `HUD` -> normal role, **modal: false** - it remains visible while other screens are focused.
- `Pause Menu` -> normal role, **modal: true** - disabling all other normals (including HUD) while focused.

#### Event sheet
```
// ── Layout Start ──────────────────────────────────────────
Event: On start of layout
  Action: Track layer -> "HUD",        Role: Normal, Modal: false, Manage collisions: false
  Action: Track layer -> "Pause Menu", Role: Normal, Modal: true,  Manage collisions: false
  Action: Set layer state -> "HUD", state: visible
  // HUD is visible but not on the focus stack

// ── Pause / Unpause ───────────────────────────────────────
Event: Key "Escape" -> On pressed
  Condition: NOT Screen "Pause Menu" is the active screen
    Action: Show screen -> "Pause Menu"

Event: Key "Escape" -> On pressed
  Condition: Screen "Pause Menu" is the active screen
    Action: Go back
    // HUD interactive state is automatically restored

Event: Button "Resume" (in Pause Menu) -> On clicked
  Action: Go back
```

---

### Use Case 3 - Inventory with Sub-Screens

**Scenario:** An RPG with an Inventory screen, and an Item Detail screen that opens when the player clicks an item. The player can go Back from Item Detail to Inventory.

#### Layer structure
```
[UI]
    [Item Detail]
    [Inventory]
    [HUD]
    [Main Menu]
```

#### Passing data to a screen before opening it

Use **Set Layer Data** to pass context, then read it with `LayerData()` inside the trigger:

```
// ── Player clicks an item in Inventory ────────────────────
Event: ItemSlot sprite -> On clicked
  Action: Set layer data -> "Item Detail", key: "itemId",   value: ItemSlot.ItemId
  Action: Set layer data -> "Item Detail", key: "itemName", value: ItemSlot.ItemName
  Action: Show screen    -> "Item Detail"

// ── Item Detail opens ─────────────────────────────────────
Trigger: On screen shown -> "Item Detail"
  Action: Set Text "ItemName" -> LayerData("Item Detail", "itemName")
  Action: Set Text "ItemId"   -> LayerData("Item Detail", "itemId")
  // Load item sprite, stats, etc. using the itemId

// ── Back from Item Detail ─────────────────────────────────
Event: Button "Back" -> On clicked
  Action: Go back
```

---

### Use Case 4 - Confirmation Dialog

**Scenario:** The player clicks "Delete Save". A confirmation popup appears. The rest of the UI stays visible but input is blocked until the player responds.

#### Layer structure
```
[UI]
    [Confirm Dialog]   ← popup role
    [Settings]
    [Main Menu]
```

#### Event sheet
```
// ── Open the dialog ───────────────────────────────────────
Event: Button "Delete Save" -> On clicked
  Action: Open popup -> "Confirm Dialog"

// ── Disable the Delete Save button while dialog is open ───
Trigger: On popup opened -> "Confirm Dialog"
  Action: Set Button "Delete Save" enabled -> false

// ── Player confirms ───────────────────────────────────────
Event: Button "Yes, Delete" (in dialog) -> On clicked
  Action: Close popup -> "Confirm Dialog"
  Action: Delete save file

// ── Player cancels ────────────────────────────────────────
Event: Button "Cancel" (in dialog) -> On clicked
  Action: Close popup -> "Confirm Dialog"

// ── Re-enable button after dialog closes ─────────────────
Trigger: On popup closed -> "Confirm Dialog"
  Action: Set Button "Delete Save" enabled -> true
```

---

### Use Case 5 - Item Tooltip on Hover

**Scenario:** The player hovers over equipment slots. A tooltip appears showing item stats. Moving to a different slot swaps the tooltip instantly.

#### Layer structure
```
[UI]
    [Tooltip]   ← tooltip role
    [Inventory]
```

#### Event sheet
```
// ── Show tooltip on hover ─────────────────────────────────
Event: Mouse is over "Sword Slot" sprite
  Condition: ActiveTooltip() ≠ "Tooltip"
    Action: Set layer data -> "Tooltip", key: "text", value: "Iron Sword - Atk +12"
    Action: Show tooltip -> "Tooltip"
    // Showing a new tooltip always auto-hides the previous one

Event: Mouse is over "Shield Slot" sprite
  Condition: ActiveTooltip() ≠ "Tooltip"
    Action: Set layer data -> "Tooltip", key: "text", value: "Wooden Shield - Def +5"
    Action: Show tooltip -> "Tooltip"

// ── Update tooltip text when it opens ────────────────────
Trigger: On layer state changed -> "Tooltip"
  Action: Set Text "TooltipText" -> LayerData("Tooltip", "text")

// ── Hide when not hovering anything ──────────────────────
Event: NOT (Mouse is over "Sword Slot" OR Mouse is over "Shield Slot")
  Action: Hide active tooltip
```

---

### Use Case 6 - HUD with Collision Management

**Scenario:** A top-down game where the HUD layer has invisible hitbox objects used for UI interactions. When the pause menu is open, these should not participate in collision detection against game objects.

#### Setup
Enable **Manage Collisions** when tracking the HUD:

```
Event: On start of layout
  Action: Track layer -> "HUD", Role: Normal, Modal: false, Manage collisions: true
  //                                                         ↑ This mirrors collisionsEnabled
  //                                                           with the interactive state
```

Now when the Pause Menu focuses (and the HUD becomes non-interactive), `collisionsEnabled` on every instance on the HUD layer is automatically set to `false`. Gameplay collision checks against HUD objects stop. When the HUD becomes interactive again, collisions are restored.

---

### Use Case 7 - Full Screen Cutscene Overlay

**Scenario:** During a cutscene, a full-screen overlay covers the entire UI. No buttons should be clickable. After the cutscene, the overlay fades out.

#### Layer structure
```
[UI]
    [Cutscene Overlay]   ← normal role, modal: true
    [HUD]
    [Main Menu]
```

#### Event sheet
```
// ── Start cutscene ────────────────────────────────────────
Event: Trigger "StartCutscene"
  Action: Set layer animation -> "Cutscene Overlay", Type: fade, Duration: 500, Easing: linear
  Action: Navigate to screen -> "Cutscene Overlay"
  // Blocks other screens: true means all other normal layers are non-interactive

// ── End cutscene ─────────────────────────────────────────
Event: Trigger "EndCutscene"
  Action: Return to previous screen
  // Cutscene Overlay fades out, previous screen and HUD are restored

// ── Sync cutscene content with fade-in ────────────────────
Event: Every tick
  Condition: Layer "Cutscene Overlay" is animating
  Condition: LayerAnimDirection("Cutscene Overlay") = "opening"
    Action: Set opacity "CutsceneText" -> LayerAnimProgress("Cutscene Overlay")
```

---

### Use Case 8 - Game Over Screen with Animation Sync

**Scenario:** On death, a Game Over screen fades in. A "Play Again" sound fires only when the animation finishes (not when it starts).

```
// ── Player dies ───────────────────────────────────────────
Event: Player health ≤ 0
  Action: Show screen -> "Game Over"

// ── Fire sound exactly when screen is fully visible ───────
Trigger: On layer transition complete -> "Game Over"
  Action: Play sound -> "gameover_sting"
  Action: Set buttons visible -> true

// ── Hide buttons while screen is still animating in ───────
Trigger: On layer opening -> "Game Over"
  Action: Set buttons visible -> false
```

---

### Use Case 9 - Tutorial Flow with Pop-to-Root

**Scenario:** A tutorial with multiple steps. The player can be several screens deep. A "Skip Tutorial" button should jump all the way back to the Main Menu regardless of how deep the player is.

```
// ── Navigate through tutorial steps ──────────────────────
Event: Button "Next" -> On clicked
  Action: Show screen -> "Tutorial Step 2"

Event: Button "Next" (Step 2) -> On clicked
  Action: Show screen -> "Tutorial Step 3"

// ── Skip all the way back to Main Menu ────────────────────
Event: Button "Skip Tutorial" -> On clicked
  Action: Return to screen -> "Main Menu"
  // Closes all intermediate screens and returns to Main Menu directly
```

---

### Use Case 10 - Multi-Layout Game with Persistent UI State

**Scenario:** A game where the player transitions between an overworld and a dungeon layout. The inventory should remain open (and at the same depth in the focus stack) after the transition.

#### Setup
Enable **Persist Across Layouts** in the UIDirector properties.

```
// ── In the overworld layout ───────────────────────────────
Event: On start of layout
  Action: Setup screen layer -> "HUD"
  Action: Setup screen layer -> "Inventory"
  // UIDirector automatically restores the saved state from the previous layout.
  // If Inventory was focused before the transition, it will be focused again.

// ── Transition to dungeon ─────────────────────────────────
Event: Player enters dungeon door
  Action: Go to layout -> "Dungeon"
  // UIDirector saves current state to globalThis.__uimanager_state before the layout ends.
```

---

### Use Case 11 - Debug Overlay (Dev Only)

**Scenario:** During development, show a persistent debug overlay that displays the current UI state without interfering with the game.

```
// ── Register debug layer as non-modal visible screen ──────
Event: On start of layout
  // ... other layer registrations ...
  Action: Track layer -> "Debug Overlay", Role: Normal, Modal: false
  Action: Set layer state -> "Debug Overlay", state: visible

// ── Update debug text every tick ─────────────────────────
Event: Every tick
  Action: Set "DebugText" -> "Screen: " & CurrentScreen()
    & newline & "Depth:  " & FocusStackDepth()
    & newline & "Popup:  " & TopPopup()
    & newline & "Tip:    " & ActiveTooltip()
    & newline & "Last:   " & LastChangedLayer() & " -> " & LastChangedState()
```

> Disable Debug Mode in the UIDirector properties before shipping. Also untrack the Debug Overlay layer or wrap its setup in a global variable check.

---

## Tips and Common Mistakes

**Layers must be sublayers of the container group.** If a layer is at the root level (not inside the group), UIDirector will not find it. Check the layer editor panel.

**Layer names are case-sensitive.** `"Main Menu"` and `"main menu"` are different layers.

**Don't skip registration.** Every layer you want UIDirector to manage must be registered with Track Layer (or a Setup action) before you call any other action on it.

**`Set Layer State` vs `Navigate to screen`.** Use `Navigate to screen` / `Show Screen` for navigation. Use `Set Layer State` only when you want to change visibility without affecting the screen history - for example, showing a HUD layer that sits alongside screens.

**Non-modal + `Set Layer State: visible` = always-on layer.** Register a layer as non-modal and set it to `visible` (not focused). It will stay visible regardless of what else is focused. The HUD pattern above uses this approach.

**Animations block interaction.** While a layer is animating (opening or closing), its `interactive` property is `false`. If you need to gate logic on the animation completing, use the **On layer transition complete** trigger.

**`Skip all animations` is useful for instant layout reset.** Call it before a layout transition or when you need the UI to be in a known state immediately.
