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
14. [C3 Debugger](#14-c3-debugger)

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

This container-based workflow is a natural fit for how Construct 3 structures projects. All your UI lives in one place, isolated from gameplay, easy to find, and straightforward to hand off to UIDirector.

**Combining the container with C3's Global Layers**

The container workflow becomes significantly more powerful when paired with Construct 3's built-in **Global Layers** feature. In C3, marking a layer as Global in the layer properties panel makes that layer - and all its sublayers - persist across layout changes. The layer object is never destroyed or recreated when the game switches from one layout to another.

This pairs directly with UIDirector's **Persist Across Layouts** property:

- **C3 Global Layers** keeps the actual layer objects alive and in their current visual state during a layout transition. The player sees no flash, no disappearance, no reset.
- **Persist Across Layouts** keeps UIDirector's internal state - the registered layers, the focus stack, and each layer's current state - intact across the same transition.

Together, they give you a UI that is completely seamless across level changes. The HUD stays on screen. The navigation history is unchanged. The current active screen remains active. Going from Level 1 to Level 2 is invisible from the UI's perspective.

**Recommended container setup:**

1. Name the container with a `!` prefix - for example `!UI`. The `!` causes it to sort to the top of the layer panel alphabetically, making it immediately identifiable as the persistent UI container and visually separating it from gameplay layers.
2. In C3's layer panel, open the container layer's properties and enable **Global**.
3. Enable **Persist Across Layouts** in UIDirector's plugin properties.
4. Register your layers once - either in the global event sheet or in the first layout's `On start of layout` behind a "first run" boolean. Because the layers are global and UIDirector's state persists, registration only needs to happen once per game session, not once per layout.

With this setup, layout changes become transparent to the player. The game world changes; the UI does not.

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

In the C3 layer editor, create a **group layer** and put all your UI sublayers inside it. Name it with a `!` prefix (e.g. `!UI`) so it sorts to the top of the layer panel and is immediately recognisable as the UI container:

```
[!UI]                ← group layer - this is your container (Global, sorts to top)
    [Tooltip]        ← will be registered as a tooltip
    [Confirm Dialog] ← will be registered as a popup
    [Pause Menu]     ← will be registered as a normal screen
    [Inventory]      ← will be registered as a normal screen
    [HUD]            ← will be registered as a normal screen (non-blocking)
    [Main Menu]      ← will be registered as a normal screen
[Background]         ← untracked game layer, UIDirector ignores this
[Game World]         ← untracked, UIDirector ignores this
```

The order of sublayers inside the container does not matter - UIDirector reorders them automatically at runtime.

> **Recommended:** In C3's layer panel, open `!UI`'s layer properties and enable **Global**. This makes the container and all its sublayers persist across layout changes. Paired with UIDirector's **Persist Across Layouts** property, your entire UI state - screens, navigation history, popups - carries over seamlessly when the game moves to a new layout. See §1 for a full explanation of how this works.

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
| **Persist Across Layouts** | Checkbox | Off | When enabled, the focus stack, registered layers, and all layer states survive a C3 layout change. Works best when the container layer is also marked **Global** in C3's layer properties - without that, the layer objects are recreated on the new layout and UIDirector must re-resolve them. |
| **Debug Mode** | Checkbox | Off | Logs all state changes and animations to the browser console. Useful during development. |
| **Dim Layer** | Text | `""` | Optional. The name of a layer inside the container to use as a dim/scrim overlay. UIDirector automatically shows this layer whenever a modal screen or popup is active, and hides it otherwise. Leave blank to disable. See §8 for setup tips. |
| **Dim Opacity** | Percent | `0.5` | The opacity of the dim layer when it is active (0 = invisible, 1 = fully opaque). The dim layer is always invisible when not needed regardless of this setting. |

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

### These three roles cover every UI pattern

There is no separate role for HUDs, drawers, loading screens, or overlays. They all map onto the three roles above:

| UI concept | Role to use | How |
|---|---|---|
| HUD (always visible, never navigated to) | `normal`, `blocksOthers: false` | Track it, then `Set layer state: visible`. It stays visible regardless of what screen is focused. |
| Loading screen | `normal` | Use `Replace current screen` after loading so it drops out of navigation history. |
| Full-screen overlay / cutscene | `normal`, `blocksOthers: true` | Navigate to it. It blocks all other screens. Go back closes it and restores the previous state. |
| Modal confirmation dialog | `popup` | Open popup / Close popup. It sits above screens and does not affect the back navigation. |
| Toast / notification banner | `popup` | Use `Show popup for duration` for auto-dismiss. |
| Hover hint | `tooltip` | Only one active at a time; swapping is automatic. |

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

### Direction-aware close animation (mirror)

By default a layer uses the same animation direction for both opening and closing. For slide animations this means the screen exits the same side it entered from: if it slides in from the left, it slides back to the left.

Set **Mirror close direction** to `true` in **Set layer animation** to reverse the exit direction. A screen that slides in from the left will then slide out to the right when the player goes back. This feels more natural for left-to-right navigation flows.

```
Event: On start of layout (after tracking)
  Action: Set layer animation -> "Settings", slideLeft, 350ms, easeOut, mirror close: true
  // Opens: slides in from left
  // Closes (on Go Back): slides out to right
```

Mirror only applies when **Return to previous screen** is used (i.e., the player goes Back). Navigating forward always uses the standard opening animation. Fade and none animations are unaffected.

### Dim layer (scrim overlay)

Set the **Dim Layer** property to the name of a layer inside the container. UIDirector will automatically show that layer at the configured **Dim Opacity** whenever:
- A modal screen is focused (blocks other screens), **or**
- Any popup is open

The dim layer hides itself automatically when neither condition is true.

**Recommended setup:**
1. Create a layer inside your container (e.g. `!UI > Dim`). Add a filled rectangle sprite covering the full layout, coloured black with no outline.
2. Set **Dim Layer** in UIDirector properties to `"Dim"`.
3. Set **Dim Opacity** to the desired intensity (e.g. `0.5` for a 50% scrim).
4. UIDirector manages visibility and opacity on this layer - do not track it.

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
| **Set layer animation** `name, type, duration, easing, mirror` | Override the animation for a specific layer. The optional `mirror` boolean reverses the close direction when going Back (slide animations only). |
| **Sync collisions to layer state** `name, enabled` | Toggle automatic collision syncing for a layer - objects on the layer have collisions turned off when the layer is hidden or disabled. |
| **Set layer input enabled** `name, enabled` | Manually override a layer's input on/off. UIDirector will not override this until the next state change. |
| **Set layer data** `name, key, value` | Store an arbitrary string value on a layer, retrievable with `LayerData()`. |

### Focus Stack

| Action | Description |
|---|---|
| **Navigate to screen** `name` | Open a screen and make it the active one (same as Show Screen but in the full API). |
| **Navigate to screen with data** `name, key, value` | Set a data value on a screen and open it in one action. Shortcut for Set Layer Data + Navigate to screen. |
| **Replace current screen** `name` | Switch to a new screen without adding the current one to history. The player cannot go back to it. |
| **Return to previous screen** | Close the current screen and restore the previous one. |
| **Return to screen** `name` | Close screens one by one until the specified screen is active. Skips intermediate screens. |
| **Go back to first screen** | Instantly close every screen above the first one and return to it. Use for a Home button that always returns to the main menu no matter how deep the player has navigated. |

### Popups

| Action | Description |
|---|---|
| **Show popup** `name` | Show a popup-role layer. |
| **Show popup for duration** `name, ms` | Show a popup and auto-close it after the given number of milliseconds. Calling Hide popup early cancels the timer. |
| **Hide popup** `name` | Hide a specific popup-role layer. |
| **Close all popups** | Hide every open popup at once. Use when switching scenes or showing a critical error that should clear all open dialogs first. |

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
| **Layer is fully open** `name` | True when a layer is fully open and its transition animation has finished. Use to only allow button clicks once a screen has completely slid or faded in. |
| **Screen is the active screen** `name` | True if the named screen is currently the topmost active screen. |
| **Screen is in navigation history** `name` | True if the named screen appears anywhere in the focus stack, not just at the top. Useful for disabling nav buttons that would create duplicates. |
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
| `PreviousScreen()` | string | The name of the screen just below the current one in the focus stack (where Go Back leads). `""` if none. |
| `ScreenAtDepth(n)` | string | The screen at position `n` in the focus stack. Depth 1 is the first screen opened; `FocusStackDepth()` is the current top. `""` if out of range. |
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

### Use Case 12 - Loading Screen (Replace Screen)

**Scenario:** The game shows a loading screen while assets load. After loading, the Main Menu should appear and the player must not be able to press Back to return to the loading screen.

```
// ── Show loading screen first (no history) ────────────────
Event: On start of layout
  Action: Setup screen layer -> "Loading"
  Action: Setup screen layer -> "Main Menu"
  Action: Show screen -> "Loading"

// ── Loading finishes - replace so Back cannot go back ─────
Event: Loading complete
  Action: Replace current screen -> "Main Menu"
  // Focus stack now contains only "Main Menu"
  // "Loading" is gone from history
```

---

### Use Case 13 - Toast Notification (Auto-dismiss Popup)

**Scenario:** When the player saves the game, a "Game Saved" banner appears briefly, then disappears on its own. The player should not have to close it manually.

```
// ── Show the toast for 2 seconds ──────────────────────────
Event: On save complete
  Action: Show popup for duration -> "Toast Banner", 2000

// ── Optional: react when it closes automatically ──────────
Trigger: On popup closed -> "Toast Banner"
  Action: Play sound -> "whoosh"
```

The popup plays its normal opening and closing animations automatically. Calling **Hide popup** before the timer expires cancels the timer and hides it immediately.

---

### Use Case 14 - Direction-Aware Navigation (Mirror Animation)

**Scenario:** A settings menu with tabs: Audio, Video, Controls. Navigating right pushes a new tab from the right; pressing Back should slide the current tab out to the right (not back to the left).

```
Event: On start of layout
  Action: Setup screen layer -> "Audio"
  Action: Setup screen layer -> "Video"
  Action: Setup screen layer -> "Controls"

  // Set animation + mirror close in one action per tab
  Action: Set layer animation -> "Audio",    slideLeft, 300, easeOut, mirror close: true
  Action: Set layer animation -> "Video",    slideLeft, 300, easeOut, mirror close: true
  Action: Set layer animation -> "Controls", slideLeft, 300, easeOut, mirror close: true

  Action: Show screen -> "Audio"

// ── Tab navigation ────────────────────────────────────────
Event: Tab "Video" clicked
  Action: Show screen -> "Video"   // slides in from left

Event: Tab "Controls" clicked
  Action: Show screen -> "Controls"

Event: Button "Back" clicked
  Action: Go back                  // slides out to the right
```

---

### Use Case 15 - Breadcrumb Trail (ScreenAtDepth + PreviousScreen)

**Scenario:** Display a breadcrumb showing the player's current navigation path. Update it every time the active screen changes.

```
// ── Update breadcrumb whenever navigation changes ─────────
Trigger: On any layer state changed

  // Build path string from stack bottom to top
  Action: Set Text "Breadcrumb" ->
    ScreenAtDepth(1) & " > " & ScreenAtDepth(2) & " > " & CurrentScreen()

// ── Show "Back to X" label on the Back button ────────────
Event: Every tick
  Action: Set Text "BackLabel" -> "< " & PreviousScreen()
  Action: Set "BackLabel" visible -> Can go back
```

---

### Use Case 16 - Dim Scrim on Modal Screens and Popups

**Scenario:** Whenever a modal screen or popup is shown, a semi-transparent dark overlay covers the background. It disappears when the modal or popup closes.

**Setup (in UIDirector Properties Bar):**
- **Dim Layer**: `"Dim"`
- **Dim Opacity**: `0.5`

**Layer structure:**
```
[UI]
    [Tooltip]
    [Confirm Dialog]   ← popup role
    [Dim]              ← managed by UIDirector automatically (do NOT track)
    [Settings]         ← normal, blocks others: true
    [Main Menu]        ← normal, blocks others: true
```

No event sheet code needed. UIDirector manages the dim layer automatically based on whether any modal screen or popup is active. Place the Dim layer above normal screens but below popups in the layer order so it covers screens but not popups.

---

### Use Case 17 - Home Button (Go Back to First Screen)

**Scenario:** The player can navigate deep into menus (Main Menu -> Settings -> Controls -> Keybindings). A Home button anywhere in the game instantly returns them to the main menu, no matter how many screens deep they are.

**Event sheet:**
```
// ── Home button pressed ────────────────────────────────────
Event: On Home Button clicked
  Action: Go back to first screen
  // All screens above Main Menu are instantly closed.
  // Main Menu is restored as the active screen.
```

Use **Go back to first screen** instead of wiring multiple **Return to previous screen** calls. It is a single action that handles stacks of any depth.

---

### Use Case 18 - Gate Button Until Screen is Ready

**Scenario:** A screen slides in and a Submit button on it should be disabled until the animation is fully finished, so the player does not accidentally click through a half-visible screen.

**Event sheet:**
```
// ── Disable button while screen is still animating ─────────
Every tick
  Condition: Layer is fully open -> "Checkout"
  Action: Set SubmitButton -> Enabled: true

Every tick
  Condition: Layer is fully open -> "Checkout" [INVERTED]
  Action: Set SubmitButton -> Enabled: false
```

Alternatively, use the **On layer transition complete** trigger to enable the button in a one-shot event rather than checking every tick.

---

### Use Case 19 - Emergency Clear (Close All Popups)

**Scenario:** The player changes layout (e.g. switches from the game to the main menu). Before the layout change, all open popups must be cleaned up so no stale state carries over.

**Event sheet:**
```
// ── Before layout change ───────────────────────────────────
Event: On "Return to Menu" button clicked
  Action: Close all popups
  Action: Skip all animations
  Action: Go to layout "Main Menu"
```

**Close all popups** is also useful when showing a game-critical alert that must not be obscured by any existing dialog.

---

## 14. C3 Debugger

UIDirector exposes a live panel in the **C3 Debugger** (the built-in debugger you open with F12 while previewing). No setup is needed — open the debugger, expand the UIDirector instance, and you see the full runtime state.

### What the debugger shows

**UI Director — Summary**

A quick overview of the most important state at a glance.

| Field | What it shows |
|---|---|
| Active screen | Name of the screen currently at the top of the focus stack |
| Stack depth | How many screens are in the navigation history |
| Open popups | Number of currently open popups |
| Active tooltip | Name of the visible tooltip, or `(none)` |
| Animating layers | Number of layers currently mid-transition |
| Total tracked | Total number of layers registered with UIDirector |

**UI Director — Settings**

The values of every plugin property — container layer, default animation type, duration, easing, dim layer, and so on.

**UI Director — Focus Stack**

One row per screen in the navigation history, shown top-first (active screen at the top, labelled `◀ active`). Each row shows the screen's current state.

**UI Director — Open Popups**

One row per currently open popup. Popups with an active auto-dismiss timer show `⏳ auto-dismiss`.

**Layer: [name]**

One section per tracked layer, showing:
- Role (`normal`, `popup`, `tooltip`)
- State — if animating, also shows direction and progress percentage (e.g. `focused  (opening  42%)`)
- Previous state
- Modal flag and mirror-on-back flag (normal-role layers only)
- Sync collisions flag (if enabled)
- Animation override (`animType`, `animDuration`, `animEasing`) if one has been set via **Set layer animation**
- Custom data key/value pairs (if any have been set via **Set layer data**)

### How to use it

1. Preview your project.
2. Press **F12** (or use the C3 preview toolbar) to open the debugger.
3. Find the **UIDirector** instance in the object list.
4. Expand it to see all sections.
5. The panel updates every frame — watch the state change live as you navigate screens, open popups, and trigger animations.

The debugger panel replaces the need for debug Text objects that manually read expressions like `CurrentScreen()` or `LayerState()`. Everything is already surfaced in one place.

---

## Tips and Common Mistakes

**Layers must be sublayers of the container group.** If a layer is at the root level (not inside the group), UIDirector will not find it. Check the layer editor panel.

**Layer names are case-sensitive.** `"Main Menu"` and `"main menu"` are different layers.

**Don't skip registration.** Every layer you want UIDirector to manage must be registered with Track Layer (or a Setup action) before you call any other action on it.

**`Set Layer State` vs `Navigate to screen`.** Use `Navigate to screen` / `Show Screen` for navigation. Use `Set Layer State` only when you want to change visibility without affecting the screen history - for example, showing a HUD layer that sits alongside screens.

**Non-modal + `Set Layer State: visible` = always-on layer.** Register a layer as non-modal and set it to `visible` (not focused). It will stay visible regardless of what else is focused. The HUD pattern above uses this approach.

**Animations block interaction.** While a layer is animating (opening or closing), its `interactive` property is `false`. If you need to gate logic on the animation completing, use the **On layer transition complete** trigger.

**`Skip all animations` is useful for instant layout reset.** Call it before a layout transition or when you need the UI to be in a known state immediately.
