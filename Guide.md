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

### The problem UIDirector solves

Managing multiple UI screens in Construct 3 without a dedicated system means writing the same types of events repeatedly, for every screen and every transition:

- Toggle each layer's visibility and interactive state manually
- Re-order layers so the correct one sits on top
- Run open and close animations, and block input during them so the player cannot click through a half-visible screen
- Record which screen was shown before so you can return to it
- Restore every other layer's interactive state exactly as it was before a modal screen appeared

The more screens a project has, the more this logic multiplies and diverges. Bugs appear when one navigation path misses a `Set layer interactive` call, or when a new screen is added and every other screen's event sheet needs updating to account for it.

UIDirector replaces all of it with a declarative model. Register your layers once at layout start. After that, a single action like `Navigate to screen` or `Go back` handles visibility, interactivity, Z-order, animations, and state restoration - automatically and consistently.

---

### The ownership model

Once a layer is tracked, **UIDirector owns it.** It controls `visible`, `interactive`, and Z-order on that layer for the rest of the layout's life. Do not set these properties directly on a tracked layer - UIDirector will override them on the next state change, making manual sets unreliable.

The one exception is `Set layer input enabled`, a deliberate one-shot override. UIDirector reclaims control on the next state transition.

> **Rule:** Use UIDirector actions exclusively on tracked layers. Never call `Set layer visible` or `Set layer interactive` on a layer UIDirector manages.

---

### The container (sandbox)

UIDirector operates exclusively inside a single **container group layer** - the name set in the **UI Container Layer** property. It never touches anything outside this group:

- Gameplay layers, camera layers, and backgrounds are completely unaffected.
- You can have as many other groups and layers in your layout as you need; UIDirector ignores them.
- The container is a purely organisational boundary at runtime - it has no visual effect of its own.

---

### Key concepts at a glance

| Concept | What it means |
|---|---|
| **Tracking** | Call `Setup screen layer` (or `Track layer`) once per layer at layout start. UIDirector then owns that layer. |
| **Role** | Every tracked layer is `normal` (navigable screen), `popup` (overlay above screens), or `tooltip` (display-only, always on top). See §4. |
| **State** | Every tracked layer is always in one of four states: `hidden`, `visible`, `disabled`, or `focused`. See §5. |
| **Focus stack** | A navigation history. Navigating to a screen pushes a frame; going back pops it and restores the previous state exactly. See §6. |

---

### Scenarios where UIDirector excels

**Linear menu navigation** - Main Menu -> Settings -> Audio. Each `Go back` returns one level and restores the previous screen exactly. No manual tracking needed.

**Persistent HUD alongside changing screens** - A HUD that stays visible regardless of what screen is open. Register it with `Blocks others: false` and set it to `visible` directly, bypassing the navigation history. It sits alongside screens without interfering with back-navigation.

**Phase-based in-game UI** - Separate Start, Playing, and Results screens. `Navigate to screen` manages Z-order, animations, and state transitions automatically regardless of which phase transitions to which.

**Modal confirmation dialogs** - A popup appears above the current screen and blocks all background input. When the player responds and the popup closes, background interactivity is automatically restored. No manual `Set layer interactive` events required.

**Deep sub-navigation with a Skip Back** - Settings -> Audio -> Advanced Audio. A single `Return to screen "Settings"` instantly collapses the entire stack back to that point, regardless of how many intermediate screens exist.

**Animation-safe logic** - Layers are never interactive while animating. The `On layer fully opened` trigger fires only when the animation is completely finished, so buttons are never accidentally enabled on a half-visible screen.

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

UIDirector supports three layer configurations for organising your UI. Understanding each one - and when to choose it - prevents layout design mistakes that are difficult to fix later.

---

### The baseline - flat layers

The simplest setup. Every tracked layer sits directly inside the container as a single flat layer with no sublayers. All UIDirector features work fully in this configuration.

```
[UI]                   ← container
    [Tooltip]          ← tracked: tooltip
    [Confirm Dialog]   ← tracked: popup
    [Pause Menu]       ← tracked: normal screen
    [Settings]         ← tracked: normal screen
    [HUD]              ← tracked: normal screen (non-blocking)
    [Main Menu]        ← tracked: normal screen
```

Flat layers are the most predictable and easiest to reason about.

> **Recommendation:** Start with flat layers. Only introduce group layers when you have a specific need they solve.

---

### Pattern 1 - Tracked group layer as one screen

A tracked layer is itself a C3 group layer. Its sublayers are internal visual structure only - UIDirector treats the entire group as a single screen.

```
[UI]
    [Options]               ← tracked as one screen (group layer)
        [Options - BG]      ← sublayer: background art
        [Options - Objects] ← sublayer: buttons, sliders
        [Options - Text]    ← sublayer: labels, headings
    [Main Menu]             ← tracked: flat normal screen
```

Register the group layer only - the sublayers are never tracked individually:

```
Event: On start of layout
  Action: Setup screen layer -> "Options"
  Action: Setup screen layer -> "Main Menu"
  Action: Show screen -> "Main Menu"
```

**How UIDirector handles each feature on a group layer:**

| Feature | Behaviour |
|---|---|
| `visible` / `interactive` | Set on the group root; cascades automatically to all sublayers via C3's own layer system. |
| Fade animation (opacity) | Applied to the group root; all sublayers fade together as a visual composite. |
| Slide animation (scroll) | `scrollX`/`scrollY` does NOT cascade from a group root. UIDirector applies scroll to each direct sublayer individually, producing the same visual result. |
| Collision management | Iterates all sublayers recursively. Objects at any depth have their collisions toggled correctly. |
| Z-order | The group moves as a unit. All sublayers move with it automatically. |

**When to use Pattern 1:**

- Your screen has distinct visual layers that always show and hide together: a background, an interactive content layer, and a text overlay.
- You want objects on different sublayers to use different Z-sorting without turning each sublayer into a separately-managed screen.
- You have many objects on one screen and want to split them across sublayers for rendering order, without that split affecting UIDirector's state management.

**Recommendations:**

- Keep sublayer depth to 2-4 layers per tracked group. Deeper nesting works but makes the C3 layer panel hard to navigate.
- Name sublayers with a prefix matching the parent: `Options - BG`, `Options - Content`, `Options - Text`. This keeps the layer panel readable and makes the parent-child relationship clear at a glance.
- Never track the internal sublayers of a Pattern 1 group individually. They are part of the screen, not separate screens.

**What to avoid:**

- Do not try to independently enable or disable one sublayer while the screen is open. `interactive` is set on the group root and cascades to all sublayers - you cannot selectively block input on part of the screen this way.
- Avoid nesting sublayers more than 2 levels deep (sublayers of sublayers). UIDirector recurses through them correctly, but the layout panel becomes very difficult to manage.

---

### Pattern 2 - Individually tracked layers inside an organising group

An untracked group layer acts purely as a folder for organisation. The layers inside it are each tracked individually as independent screens.

```
[UI]
    [Debug]                  ← tracked: normal (non-blocking, flat)
    [In Game]                ← NOT tracked (organising group only)
        [Start Screen]       ← tracked: normal screen
        [Playing HUD]        ← tracked: normal screen
        [Finish Screen]      ← tracked: normal screen
    [Touch Controls]         ← tracked: normal (non-blocking, flat)
```

Register the individual layers - UIDirector finds them by searching recursively through the container:

```
Event: On start of layout
  Action: Setup screen layer -> "Start Screen"
  Action: Setup screen layer -> "Playing HUD"
  Action: Setup screen layer -> "Finish Screen"
  Action: Setup screen layer -> "Debug"
  Action: Setup screen layer -> "Touch Controls"
  Action: Show screen -> "Start Screen"
```

**How Z-order works:**

A sublayer cannot be moved independently of its parent group. When UIDirector needs to bring `Start Screen` to the front, it moves the parent group `In Game` to the top of the container instead. All siblings inside `In Game` come along for the move.

This has one key implication: **all layers inside the same organising group share the same Z-position relative to the rest of the container.** If you need `Start Screen` to appear above `Debug` (which is a direct container child), that works - UIDirector moves `In Game` above `Debug`. But `Start Screen` and `Playing HUD` are siblings inside the same group; their Z-order relative to each other cannot be changed by moving the group. UIDirector only manages the Z-order of container-direct-children.

When the focus stack is unwound, the parent group returns to its saved Z-position automatically.

**When to use Pattern 2:**

- You have 3 or more screens that belong to a logical phase or section: a start screen, a playing screen, and a results screen that together form the "in-game" UI.
- You want to keep the container's direct-child list short and organised in larger projects.
- Each screen in the group operates independently and is navigated to individually via `Navigate to screen`.

**Recommendations:**

- Use this pattern for phase-based UI: `In Game` containing `Start Screen`, `Playing HUD`, `Finish Screen`. The organising group keeps the layer panel clean without affecting runtime behaviour.
- Keep organising groups at one level deep inside the container. Nesting organising groups inside other organising groups is supported but makes Z-order reasoning significantly harder to predict.
- Name organising groups clearly so they cannot be confused with tracked screens. A simple convention helps: tracked screens use descriptive names (`Start Screen`, `Options Menu`); organising groups use section names (`In Game`, `Menus`, `Overlays`).
- Do not expect UIDirector to independently control the Z-order of screens within the same organising group relative to each other. Only the group's position in the container is managed.

---

### Pattern 3 - Hybrid

A combination of both patterns: some tracked screens are themselves group layers (Pattern 1), and they live inside untracked organising groups (Pattern 2).

```
[UI]
    [Main Menu]                 ← tracked: flat normal screen
    [In Game]                   ← NOT tracked (organising group)
        [HUD]                   ← tracked: flat, non-blocking
        [Options]               ← tracked: group layer screen (Pattern 1)
            [Options - BG]
            [Options - Content]
        [Pause]                 ← tracked: group layer screen (Pattern 1)
            [Pause - BG]
            [Pause - Buttons]
```

UIDirector handles this correctly. When `Options` needs to come to the front, the container-direct-child `In Game` is moved. The internal sublayers (`Options - BG`, `Options - Content`) animate together using the per-sublayer scroll approach.

**When to use Pattern 3:**

- You have distinct game phases (Pattern 2) AND each phase contains screens complex enough to need internal visual sublayer structure (Pattern 1).
- This is appropriate for mid-to-large projects where both levels of organisation are genuinely needed.

> **Caution:** Only reach for Pattern 3 when you have clear reasons for both layers of structure. The added depth increases the cognitive load of maintaining the layout and makes the layer panel harder to read. Reach for it deliberately, not as a default.

---

### Choosing the right pattern

| Situation | Recommended approach |
|---|---|
| Small project, handful of screens | Flat layers only |
| Screen needs separate BG, content, and overlay sublayers | Pattern 1 (tracked group layer) |
| 3+ screens belong to one logical section or game phase | Pattern 2 (organising group, flat tracked children) |
| Complex screens inside logical phases | Pattern 3 (hybrid) |

---

### General rules

**Keep names unique across the entire container tree.** UIDirector searches the container recursively by name. If two layers at different depths share a name, only the first one found is returned. Layer names must be unique within the entire container.

**Never track a layer and also track one of its sublayers.** Both would have conflicting state machines on the same layer objects. Only track the outermost group; its sublayers are unmanaged visual structure.

**Organising groups (Pattern 2) should be clearly distinguishable from tracked layers.** Use consistent naming conventions to make it obvious at a glance which layers UIDirector manages and which are purely organisational folders.

**Flat layers are always the safest choice.** Group layers add real organisational value but also add complexity. If a flat layer list is still manageable, stay flat.

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
