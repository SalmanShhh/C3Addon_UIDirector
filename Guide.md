# UIDirector - Complete Guide

**UIDirector** is a Construct 3 plugin that turns ordinary group layers into a fully managed UI system. You register a layer once as a **screen**, **popup**, or **tooltip**, then drive visibility, interactivity, Z-order, animations, modal blocking, and back-navigation through a handful of plain actions. You never set layer visible/interactive/Z-order by hand again.

This guide reflects the consolidated **v1.2.0.0 action surface**: related actions are merged into single combo-parameter actions (`Setup layer`, `Go to screen`, `Set layer state`, `Popup`, `Tooltip`), the names are beginner-friendly, and the integration surface other addons rely on (`LastChangedLayer`, `LastChangedState`, `CanGoBack`, `Go back`, and the per-object animation contract) is locked in.

---

## Table of Contents

1. [Scenarios Where This Addon Excels](#1-scenarios-where-this-addon-excels)
2. [Core Concepts](#2-core-concepts)
3. [Project Setup](#3-project-setup)
4. [Plugin Properties](#4-plugin-properties)
5. [Layer Roles](#5-layer-roles)
6. [Layer States](#6-layer-states)
7. [The Focus Stack](#7-the-focus-stack)
8. [Group Layers & Nested Screens](#8-group-layers--nested-screens)
9. [Animations](#9-animations)
10. [Actions Reference](#10-actions-reference)
11. [Conditions Reference](#11-conditions-reference)
12. [Expressions Reference](#12-expressions-reference)
13. [Triggers Reference](#13-triggers-reference)
14. [System Use Cases](#14-system-use-cases)
15. [Game Use Cases](#15-game-use-cases)
16. [C3 Debugger](#16-c3-debugger)
17. [Timescale Control](#17-timescale-control)
18. [Scripting (C3 Script / JavaScript)](#18-scripting-c3-script--javascript)
19. [UI Suite Integration](#19-ui-suite-integration)
20. [Tips and Common Mistakes](#20-tips-and-common-mistakes)

---

## 1. Scenarios Where This Addon Excels

**Linear menu navigation** - Main Menu → Settings → Audio. Each `Go back` returns one level and restores the previous screen exactly. No manual tracking needed.

**Persistent HUD alongside changing screens** - A HUD that stays visible regardless of what screen is open. Register it non-modal (`Setup layer (advanced)` with modal off) and `Set` it to `Visible` directly, bypassing the navigation history. It sits alongside screens without interfering with back-navigation.

**Phase-based in-game UI** - Separate Start, Playing, and Results screens. `Go to screen` manages Z-order, animations, and state transitions automatically regardless of which phase transitions to which.

**Modal confirmation dialogs** - A popup appears above the current screen and blocks all background input. When the player responds and the popup closes, background interactivity is automatically restored. No manual `Set input enabled` events required.

**Deep sub-navigation with a Skip Back** - Settings → Audio → Advanced Audio. A single `Go to screen "Settings" (Return to)` instantly collapses the entire stack back to that point, regardless of how many intermediate screens exist.

**Animation-safe logic** - Layers are never interactive while animating. The `On layer opened` trigger fires only when the animation is completely finished, so buttons are never accidentally enabled on a half-visible screen.

**Pause menus that auto-freeze and restore the game** - `Set timescale` stores a runtime timescale on a layer. When that layer opens, UIDirector applies it to the global `runtime.timeScale` automatically. When it closes, the previous value is restored. Opening a pause menu freezes the game; closing it resumes it — with no manual save/restore logic in the event sheet. See §17.

**Per-object entrance animations that stay in sync** - When a layer opens, UIDirector waits for both its own layer tween *and* any per-object animation behaviors (like FlourishCue) before firing `On layer opened`. Staggered button entrances "just work" without you tracking each one.

---

## 2. Core Concepts

### The problem UIDirector solves

Managing multiple UI screens in Construct 3 without a dedicated system means writing the same events repeatedly, for every screen and every transition:

- Toggle each layer's visibility and interactive state manually
- Re-order layers so the correct one sits on top
- Run open and close animations, and block input during them so the player cannot click through a half-visible screen
- Record which screen was shown before so you can return to it
- Restore every other layer's interactive state exactly as it was before a modal screen appeared

The more screens a project has, the more this logic multiplies and diverges. Bugs appear when one navigation path misses a `Set interactive` call, or when a new screen is added and every other screen's event sheet needs updating to account for it.

UIDirector replaces all of it with a declarative model. Register your layers once at layout start. After that, a single action like `Go to screen` or `Go back` handles visibility, interactivity, Z-order, animations, and state restoration - automatically and consistently.

---

### The ownership model

Once a layer is tracked, **UIDirector owns it.** It controls `isVisible`, `isInteractive`, and Z-order on that layer for the rest of the layout's life. Do not set these properties directly on a tracked layer - UIDirector will override them on the next state change, making manual sets unreliable.

The one exception is `Set input enabled`, a deliberate one-shot override. UIDirector reclaims control on the next state transition.

> **Rule:** Use UIDirector actions exclusively on tracked layers. Never use C3's built-in "Set layer visible" / "Set layer interactive" system actions on a layer UIDirector manages.

---

### The container (sandbox)

UIDirector operates exclusively inside a single **container group layer** - the name set in the **UI Container Layer** property. It never touches anything outside this group:

- Gameplay layers, camera layers, and backgrounds are completely unaffected.
- You can have as many other groups and layers in your layout as you need; UIDirector ignores them.
- The container is a purely organisational boundary at runtime - it has no visual effect of its own.

> **Tip:** Leave **UI Container Layer** blank to search the whole layout instead of a single container group.

**Combining the container with C3's Global Layers**

The container workflow becomes significantly more powerful when paired with Construct 3's built-in **Global Layers** feature. In C3, marking a layer as Global makes that layer - and all its sublayers - persist across layout changes. The layer object is never destroyed or recreated when the game switches layouts.

This pairs directly with UIDirector's **Persist Across Layouts** property:

- **C3 Global Layers** keeps the actual layer objects alive and in their current visual state during a layout transition. The player sees no flash, no disappearance, no reset.
- **Persist Across Layouts** keeps UIDirector's internal state - the registered layers, the focus stack, popups, and each layer's current state - intact across the same transition.

Together, they give you a UI that is seamless across level changes. The HUD stays on screen. The navigation history is unchanged. The current active screen remains active.

**Recommended container setup:**

1. Name the container with a `!` prefix - for example `!UI`. The `!` sorts it to the top of the layer panel, making it immediately identifiable.
2. In C3's layer panel, open the container's properties and enable **Global**.
3. Enable **Persist Across Layouts** in UIDirector's plugin properties.
4. Register your layers once - in the global event sheet or in the first layout's `On start of layout` behind a "first run" boolean.

With this setup, layout changes become transparent to the player. The game world changes; the UI does not.

---

### Key concepts at a glance

| Concept | What it means |
|---|---|
| **Tracking** | Call `Setup layer` once per layer at layout start. UIDirector then owns that layer. |
| **Role** | Every tracked layer is a `Screen` (navigable, on the focus stack), `Popup` (overlay above screens), or `Tooltip` (single transient hint, off the stacks). See §5. |
| **State** | Every tracked layer is always in one of four states: `hidden`, `visible`, `disabled`, or `focused`. See §6. |
| **Focus stack** | A navigation history. Going to a screen with Push pushes a frame; `Go back` pops it and restores the previous state exactly. See §7. |
| **Dim layer** | An optional scrim layer UIDirector shows automatically behind any modal screen or popup. See §9. |

---

## 3. Project Setup

### Step 1 - Install the addon

Install `salmanshh_uidirector.c3addon` via the Construct 3 addon manager (Menu → View → Addon Manager → Install new addon).

### Step 2 - Create your layer structure

In the C3 layer editor, create a **group layer** and put all your UI sublayers inside it. Name it with a `!` prefix (e.g. `!UI`) so it sorts to the top of the layer panel:

```
[!UI]                ← group layer - this is your container (Global, sorts to top)
    [Tooltip]        ← will be registered as a Tooltip
    [Confirm Dialog] ← will be registered as a Popup
    [Pause Menu]     ← will be registered as a Screen
    [Inventory]      ← will be registered as a Screen
    [HUD]            ← will be registered as a Screen (non-modal)
    [Main Menu]      ← will be registered as a Screen
[Background]         ← untracked game layer, UIDirector ignores this
[Game World]         ← untracked, UIDirector ignores this
```

The order of sublayers inside the container does not matter - UIDirector reorders them automatically at runtime.

### Step 3 - Add the UIDirector object

Add a **UIDirector** object to your project (it is a single-global plugin - one instance serves the whole game). Configure its properties (see §4).

### Step 4 - Register layers at layout start

```
Event: On start of layout
  Action: UIDirector → Setup layer "Main Menu" as Screen
  Action: UIDirector → Setup layer "HUD" as Screen
  Action: UIDirector → Setup layer "Pause Menu" as Screen
  Action: UIDirector → Setup layer "Inventory" as Screen
  Action: UIDirector → Setup layer "Confirm Dialog" as Popup
  Action: UIDirector → Setup layer "Tooltip" as Tooltip
  Action: UIDirector → Go to screen "Main Menu" (Push)
```

That's it. UIDirector hides every other layer and shows `Main Menu`.

> **`Setup layer` defaults:** Screens and Popups are modal (block other screens) by default; Tooltips are not. Need different defaults — non-modal screen, collision-synced layer? Use **Setup layer (advanced)** instead (see §10).

---

## 4. Plugin Properties

Configure these in the Properties Bar when the UIDirector object is selected. They are grouped into **Transitions**, **Modal / Dim**, and **Behavior**.

| Property | Type | Default | Description |
|---|---|---|---|
| **UI Container Layer** | Text | `"UI"` | The name of the group layer that holds all your UI sublayers (case-sensitive). Leave blank to search the whole layout. |
| **Default Animation** | Combo | `fade` | Animation used when no per-layer override is set. Options: `fade`, `slideLeft`, `slideRight`, `slideUp`, `slideDown`, `none`, `scaleDown`, `scaleUp`. |
| **Default Duration (ms)** | Integer | `200` | How long transitions take in milliseconds. |
| **Default Easing** | Combo | `easeOut` | Easing curve. Options: `linear`, `easeIn`, `easeOut`, `easeInOut`, `quadraticOut`, `quarticOut`, `exponentialOut`, `circularOut`, `backOut`, `elasticOut`, `bounceOut`. |
| **Dim Layer** | Text | `""` | Optional. The name of a layer inside the container to use as a dim/scrim overlay. UIDirector automatically shows it whenever a modal screen or popup is active, and hides it otherwise. Leave blank to disable. See §9. |
| **Dim Opacity** | Percent | `0.5` | The opacity of the dim layer when active (0 = invisible, 1 = fully opaque). |
| **Persist Across Layouts** | Checkbox | Off | When enabled, the focus stack, registered layers, popups, and all layer states survive a C3 layout change. Works best with the container layer also marked **Global** in C3. |
| **Debug Mode** | Checkbox | Off | Logs all state changes and animations to the browser console (F12). Useful during development. |

> Combo properties arrive at runtime as 0-based indices; UIDirector maps them to string keys internally.

---

## 5. Layer Roles

Every tracked layer has exactly one role, set at registration and never changed.

### Screen (role `normal`)
A navigable screen. Participates in the navigation history (focus stack). When active, it is moved to the top of the normal-layer Z-order. If **modal** is on (the default for screens), all other screens are made non-interactive while this one is active and restored exactly when it closes.

Use for: main menu, settings, inventory, pause menu, game over screen, character select, HUD (non-modal).

### Popup (role `popup`)
An overlay that appears above all screens. Does **not** affect the focus stack - the player can still press Back and navigate normally while a popup is open. Multiple popups can be open simultaneously (they stack).

Use for: confirmation dialogs, error messages, achievement notifications, toasts.

### Tooltip (role `tooltip`)
A display-only overlay always pinned to the very top of the Z-order. Only one tooltip can be active at a time - showing a new one auto-hides the previous one.

Use for: hover hints, control reminders, item descriptions.

---

### These three roles cover every UI pattern

There is no separate role for HUDs, drawers, loading screens, or overlays. They all map onto the three roles above:

| UI concept | Role to use | How |
|---|---|---|
| HUD (always visible, never navigated to) | Screen, non-modal | `Setup layer (advanced)` with modal off, then `Set "HUD" to Visible`. It stays visible regardless of focus. |
| Loading screen | Screen | Use `Go to screen … (Replace)` after loading so it drops out of navigation history. |
| Full-screen overlay / cutscene | Screen, modal | `Go to screen … (Push)`. It blocks all other screens. `Go back` closes it and restores the previous state. |
| Modal confirmation dialog | Popup | `Popup → Show` / `Popup → Hide`. It sits above screens and does not affect back-navigation. |
| Toast / notification banner | Popup | `Popup → Show timed` for auto-dismiss. |
| Hover hint | Tooltip | Only one active at a time; swapping is automatic. |

---

## 6. Layer States

Every tracked layer is always in one of these states:

| State | Visible | Interactive | When used |
|---|---|---|---|
| `hidden` | No | No | Default for all layers on registration. The layer doesn't render and ignores input. |
| `visible` | Yes | Yes | The layer is shown and the player can interact with it. |
| `disabled` | Yes | No | The layer renders (you can see it) but input is blocked. Good for greyed-out overlays. |
| `focused` | Yes | Yes | Set automatically when a screen is at the top of the focus stack. |

Check the state of any layer at any time with `LayerState("layerName")`, or with the **Layer is in state** condition.

---

## 7. The Focus Stack

The focus stack is UIDirector's navigation history. It works like a browser's Back button.

### How it works

When you call **Go to screen … (Push)**:
1. A snapshot of every tracked screen's interactive state is saved.
2. The target layer is moved to the top of the Z-order.
3. If the layer is modal, all other screens are made non-interactive.
4. The layer is put in the `focused` state.
5. A stack frame `{ layerName, savedIndex, interactiveSnapshot }` is pushed.
6. If the layer has a managed runtime timescale configured (via `Set timescale`), it is applied to `runtime.timeScale` now.

When you call **Go back**:
1. The top frame is popped.
2. The layer at that frame is hidden (with a closing animation).
3. The saved interactive snapshot is restored on all other screens.
4. The layer below in the stack is re-focused.
5. If the closing layer had applied a managed runtime timescale, `runtime.timeScale` is restored to what it was before that layer opened.

### Navigation modes (one action)

The single **Go to screen** action covers three navigation modes via its combo parameter:

| Mode | What it does |
|---|---|
| **Push (remember current)** | Standard navigation. Remembers the current screen so `Go back` returns to it. |
| **Replace (don't remember)** | Swaps the current screen without adding it to history. The player cannot go back to it. |
| **Return to (unwind to this screen)** | Pops the stack back to the named screen, closing everything above it in one step. |

### Multi-level navigation example

```
Stack (bottom to top):
  [ Main Menu ] ← pushed first
  [ Settings  ] ← pushed second
  [ Controls  ] ← currently focused (top)
```

Each `Go back` pops one level: Controls → Settings → Main Menu.
`Go to screen "Settings" (Return to)` from Controls collapses straight to Settings.
`Go to first screen` collapses straight to Main Menu (the root) no matter how deep you are.

---

## 8. Group Layers & Nested Screens

UIDirector supports three layer configurations for organising your UI.

### The baseline - flat layers

Every tracked layer sits directly inside the container as a single flat layer with no sublayers. All UIDirector features work fully in this configuration.

```
[UI]
    [Tooltip]          ← tracked: Tooltip
    [Confirm Dialog]   ← tracked: Popup
    [Pause Menu]       ← tracked: Screen
    [Settings]         ← tracked: Screen
    [HUD]              ← tracked: Screen (non-modal)
    [Main Menu]        ← tracked: Screen
```

> **Recommendation:** Start with flat layers. Only introduce group layers when you have a specific need they solve.

### Pattern 1 - Tracked group layer as one screen

A tracked layer is itself a C3 group layer. Its sublayers are internal visual structure only - UIDirector treats the entire group as a single screen.

```
[UI]
    [Options]               ← tracked as one screen (group layer)
        [Options - BG]      ← sublayer: background art
        [Options - Objects] ← sublayer: buttons, sliders
        [Options - Text]    ← sublayer: labels, headings
    [Main Menu]             ← tracked: flat screen
```

Register the group layer only - the sublayers are never tracked individually:

```
Event: On start of layout
  Action: UIDirector → Setup layer "Options" as Screen
  Action: UIDirector → Setup layer "Main Menu" as Screen
  Action: UIDirector → Go to screen "Main Menu" (Push)
```

**How UIDirector handles each feature on a group layer:**

| Feature | Behaviour |
|---|---|
| `visible` / `interactive` | Set on the group root; cascades automatically to all sublayers via C3's own layer system. |
| Fade animation (opacity) | Applied to the group root; all sublayers fade together. |
| Slide animation (scroll) | `scrollX`/`scrollY` does NOT cascade from a group root. UIDirector applies scroll to each direct sublayer individually for the same visual result. |
| Collision management | Iterates all sublayers recursively. Only instances that had collisions enabled are disabled on hide; only those same instances are re-enabled on show. |
| Z-order | The group moves as a unit. All sublayers move with it automatically. |

**When to use Pattern 1:** your screen has distinct visual layers that always show and hide together (background, content, text overlay), or you want objects on different sublayers to use different Z-sorting within one screen.

### Pattern 2 - Individually tracked layers inside an organising group

An untracked group layer acts purely as a folder. The layers inside it are each tracked individually as independent screens.

```
[UI]
    [Debug]                  ← tracked: Screen (non-modal, flat)
    [In Game]                ← NOT tracked (organising group only)
        [Start Screen]       ← tracked: Screen
        [Playing HUD]        ← tracked: Screen
        [Finish Screen]      ← tracked: Screen
    [Touch Controls]         ← tracked: Screen (non-modal, flat)
```

Register the individual layers - UIDirector finds them by searching recursively through the container:

```
Event: On start of layout
  Action: UIDirector → Setup layer "Start Screen" as Screen
  Action: UIDirector → Setup layer "Playing HUD" as Screen
  Action: UIDirector → Setup layer "Finish Screen" as Screen
  Action: UIDirector → Go to screen "Start Screen" (Push)
```

**How Z-order works:** a sublayer cannot be moved independently of its parent group. When UIDirector needs to bring `Start Screen` to the front, it moves the parent group `In Game` to the top of the container. All siblings inside `In Game` come along. UIDirector only manages the Z-order of container-direct-children.

### Pattern 3 - Hybrid

Some tracked screens are themselves group layers (Pattern 1), living inside untracked organising groups (Pattern 2). UIDirector handles this correctly. Reach for it deliberately - the added depth increases maintenance load.

### General rules

- **Keep names unique across the entire container tree.** UIDirector searches recursively by name; duplicate names at different depths return only the first match.
- **Never track a layer and also track one of its sublayers.** Only track the outermost group.
- **Flat layers are always the safest choice.** Use group layers only when they add real organisational value.

---

## 9. Animations

### Default animations

Set the **Default Animation**, **Default Duration**, and **Default Easing** in the plugin properties. These apply to all layers unless overridden.

### Per-layer animation override

Use **Set animation** to give a specific layer its own animation style:

```
Event: On start of layout
  Action: UIDirector → Set "Settings" animation slideLeft, 400 ms, easeInOut, mirror on back false
```

This overrides the plugin defaults only for the `Settings` layer.

### Animation types

| Type | Open | Close |
|---|---|---|
| `fade` | Opacity 0 → 1 | Opacity 1 → 0 |
| `slideLeft` | Slides in from the left | Slides out to the left |
| `slideRight` | Slides in from the right | Slides out to the right |
| `slideUp` | Slides up into view | Slides up and out |
| `slideDown` | Slides down into view | Slides down and out |
| `scaleDown` | Starts large (2×) and scales to 1× | Scales down toward 0.2× |
| `scaleUp` | Starts small (0.2×) and scales to 1× | Scales up toward 2× |
| `none` | Instant | Instant |

Slide animations use an off-screen buffer so layers begin and end fully outside view, including on wide layouts.

For scale animations, opacity is animated separately with a fixed short curve for readability (300 ms, `quarticOut`), while scale follows your chosen easing and duration.

### Driving custom effects with animation progress

While a layer is animating, `LayerAnimProgress("layerName")` returns `0` (start) to `1` (complete), and `LayerAnimDirection("layerName")` returns `"opening"` / `"closing"` / `""`. Use these to sync custom effects:

```
Event: Every tick
  Condition: UIDirector → Layer "Pause Menu" is animating
    Action: Set overlay opacity → UIDirector.LayerAnimProgress("Pause Menu") × 100
```

### Direction-aware close animation (mirror)

By default a layer uses the same animation direction for opening and closing, so a slide-in-from-left exits back to the left. Set **mirror on back** to `true` in **Set animation** to reverse the exit direction: a screen that slides in from the left then slides out to the right when the player goes back.

```
Event: On start of layout (after tracking)
  Action: UIDirector → Set "Settings" animation slideLeft, 350 ms, easeOut, mirror on back true
  // Opens: slides in from left.  Closes (on Go back): slides out to right.
```

Mirror only applies when **Go back** is used. Navigating forward always uses the standard opening animation. Fade and none are unaffected. Scale mirrors too: `scaleDown`↔`scaleUp`.

### Dim layer (scrim overlay)

Set the **Dim Layer** property to the name of a layer inside the container. UIDirector automatically shows it at the configured **Dim Opacity** whenever a modal screen is focused **or** any popup is open, and hides it otherwise.

**Recommended setup:**
1. Create a layer inside your container (e.g. `!UI > Dim`). Add a black full-layout rectangle.
2. Set **Dim Layer** in UIDirector properties to `"Dim"`.
3. Set **Dim Opacity** (e.g. `0.5`).
4. Place the Dim layer above screens but below popups so it covers screens, not popups.
5. UIDirector manages visibility and opacity on this layer - **do not track it.**

### Finishing animations early

```
Action: UIDirector → Finish animation on "Settings"   // snap one layer to its end state
Action: UIDirector → Finish animation on ""            // blank name = snap ALL animating layers
```

`Finish animation` also completes any per-object transition behaviors on the layer (see §19).

---

## 10. Actions Reference

Actions are grouped into five categories: **Setup**, **Navigation**, **Layers**, **Popups & Tooltips**, and **Transitions & Events**.

### Setup

| Action (listName) | Event-sheet text | Description |
|---|---|---|
| **Setup layer** | `Setup {layer} as {role}` | Register a layer as a `Screen`, `Popup`, or `Tooltip` with sensible defaults (Screen/Popup modal, Tooltip not). |
| **Setup layer (advanced)** | `Setup {layer} as {role}, modal {modal}, sync collisions {sync}` | Full-control registration: choose role, modal blocking, and collision syncing explicitly. |
| **Untrack** | `Untrack {layer}` | Stop managing a layer. Leave the name **blank** to untrack everything and clear all stacks. |

### Navigation

| Action (listName) | Event-sheet text | Description |
|---|---|---|
| **Go to screen** | `Go to screen {layer} ({mode})` | Navigate to a screen. Mode: `Push` (remember current), `Replace` (don't remember), `Return to` (unwind to this screen). |
| **Go to screen with data** | `Go to screen {layer}, set {key} = {value}` | Store a key/value on the screen, then Push to it. Read back with `LayerData()`. |
| **Go back** | `Go back to the previous screen` | Pop the focus stack with animation. No-op if empty. Drives a Back button. |
| **Go to first screen** | `Reset to the first screen` | Clear the stack and return to the root (first) screen, no matter how deep. |

### Layers

| Action (listName) | Event-sheet text | Description |
|---|---|---|
| **Set layer state** | `Set {layer} to {state}` | Direct state change with the layer's animation. State: `Visible`, `Hidden`, `Disabled`. |
| **Set input enabled** | `Set {layer} input enabled: {enabled}` | Toggle `isInteractive` without changing visuals (a one-shot override). |
| **Set animation** | `Set {layer} animation {type}, {ms} ms, {easing}, mirror on back {mirror}` | Per-layer animation override. |
| **Set modal** | `Set {layer} blocks other screens: {modal}` | Whether this screen blocks input on all other screens while active. |
| **Set timescale** | `Set {layer} timescale: objects {obj}, game-while-open {game}` | Per-object timescale now (`-1` = skip) and a global runtime timescale auto-applied on open / restored on close (`-1` = off). Pass `1` / `1` to clear. See §17. |
| **Set data** | `Set {layer} data {key} = {value}` | Store an arbitrary string on a layer, read with `LayerData()`. |
| **Sync collisions** | `Set {layer} collision sync: {enabled}` | Toggle automatic collision syncing. When on, instances that had collisions enabled are disabled while the layer is hidden/disabled and restored on show. |

### Popups & Tooltips

| Action (listName) | Event-sheet text | Description |
|---|---|---|
| **Popup** | `{mode} popup {layer} (for {ms} ms)` | One action, four modes: `Show`, `Hide`, `Show timed` (auto-dismiss after `ms`), `Hide all`. Duration is used only by `Show timed`. |
| **Tooltip** | `{mode} tooltip {layer}` | One action, three modes: `Show`, `Hide`, `Hide active` (hide whichever tooltip is up; layer name ignored). |

### Transitions & Events

| Action (listName) | Event-sheet text | Description |
|---|---|---|
| **Finish animation** | `Finish animation on {layer}` | Instantly complete a layer's running transition (and any per-object animations). Blank name = finish **all** running animations. |

---

## 11. Conditions Reference

These are **state-check** conditions (invertible, polled). Triggers are listed separately in §13.

| Condition | Parameters | Description |
|---|---|---|
| **Can go back** | — | True when there is a previous screen to return to. Use to show/hide a Back button. |
| **No screens are open** | — | True when the focus stack is empty. |
| **Screen is the active screen** | layer | True when that screen is on top of the stack. |
| **Screen is in navigation history** | layer | True when that screen appears anywhere in the stack. |
| **Layer is in state** | layer, state | True when the layer's state matches (`Visible`/`Hidden`/`Disabled`/`Focused`). |
| **Layer is visible** | layer | True when the layer **and all its parents** are visible. |
| **Layer is ready** | layer | True when the layer is visible/focused **and** not mid-animation. Gate button clicks on this. |
| **Layer accepts input** | layer | True when the layer's `isInteractive` is on. |
| **Layer is animating** | layer | True during a show/hide animation. |
| **Layer blocks other screens** | layer | True when the layer is modal. |
| **Layer is tracked** | layer | True when the layer is registered. Guard before referencing a layer. |
| **Any popup is visible** | — | True when one or more popups are open. |
| **A tooltip is visible** | — | True when a tooltip is active. |

> **Renamed in v1.2.0.0:** `Layer is fully open` is now **Layer is ready**.

---

## 12. Expressions Reference

| Expression | Returns | Description |
|---|---|---|
| `CurrentScreen()` | string | Active screen name, or `""`. |
| `FocusedLayer()` | string | Active screen name, or `""`. Alias of `CurrentScreen()`; polled by companion addons. |
| `PreviousScreen()` | string | Screen directly below the active one (where Go back leads), or `""`. |
| `FocusStackDepth()` | number | Screens currently in the stack. `0` = none. |
| `LayerState("name")` | string | `"visible"` / `"hidden"` / `"disabled"` / `"focused"` / `""`. |
| `PreviousLayerState("name")` | string | The layer's prior state. |
| `LayerRole("name")` | string | `"normal"` / `"popup"` / `"tooltip"` / `""`. |
| `LayerData("name", "key")` | string | Stored custom value, or `""`. |
| `TopPopup()` | string | Topmost open popup, or `""`. |
| `ActiveTooltip()` | string | Active tooltip, or `""`. |
| `CountTrackedLayers()` | number | Total registered layers. Use with `GetTrackedLayerByIndex` in a `Repeat` loop. |
| `GetTrackedLayerByIndex(i)` | string | Tracked layer name at zero-based index `i`, or `""`. |
| `LayerAnimProgress("name")` | number | 0–1 animation progress; `0` if idle. |
| `LayerAnimDirection("name")` | string | `"opening"` / `"closing"` / `""`. |
| `LastChangedLayer()` | string | Layer whose state most recently changed. Use inside triggers; polled by companion addons. |
| `LastChangedState()` | string | New state of that layer. Use inside triggers. |

> **Removed in v1.2.0.0:** `ScreenAtDepth(n)`. For a "Back to X" label use `PreviousScreen()`; for a depth indicator use `FocusStackDepth()`.

---

## 13. Triggers Reference

Triggers fire in response to state changes. A trigger with a layer-name parameter only fires for the matching layer.

| Trigger | Parameter | Fires when… / expressions to use inside |
|---|---|---|
| **On screen shown** | layer | A screen became the active screen. Use `FocusedLayer()`, `PreviousScreen()`. |
| **On screen hidden** | layer | A screen left the focus stack. Use `PreviousScreen()`. |
| **On popup opened** | layer | A popup became visible. Use `TopPopup()`. |
| **On popup closed** | layer | A popup hid. |
| **On layer opening** | layer | An opening animation started. Use `LayerAnimProgress()`, `LayerAnimDirection()`. |
| **On layer opened** | layer | An opening animation finished. Safe point to enable controls or start effects. |
| **On layer closing** | layer | A closing animation started. |
| **On layer closed** | layer | A closing animation finished. Safe point to clean up. |
| **On layer state changed** | layer | That specific layer's state changed. Use `LayerState()`, `PreviousLayerState()`. |
| **On any layer state changed** | — | Any layer's state changed. Use `LastChangedLayer()`, `LastChangedState()`. |

> **Renamed/removed in v1.2.0.0:** `On layer fully opened` → **On layer opened**, `On layer fully closed` → **On layer closed**. The old `On layer transition complete` is gone — use **On layer opened** / **On layer closed**. (`On screen shown` / `On screen hidden` are now first-class navigation triggers, not aliases.)

---

## 14. System Use Cases

This section isolates each core UIDirector subsystem so you can learn one at a time before combining them. Every example uses the v1.2.0.0 action surface.

### Registration System

Tracks layers and assigns a role plus behavior flags.

#### A - One-time setup with role assignment

```text
Event: On start of layout
  Action: UIDirector → Setup layer "Main Menu" as Screen
  Action: UIDirector → Setup layer "Settings" as Screen
  Action: UIDirector → Setup layer "Confirm Dialog" as Popup
  Action: UIDirector → Setup layer "Tooltip" as Tooltip
```

#### B - Full-control setup with Setup layer (advanced)

```text
Event: On start of layout
  Action: UIDirector → Setup layer "HUD" as Screen, modal false, sync collisions true
  Action: UIDirector → Setup layer "Pause Menu" as Screen, modal true, sync collisions false
```

> **Tip:** Register once, before any navigation/popup action. Calling navigation before tracking silently does nothing (or logs in Debug Mode).

#### C - Untrack one layer or everything

```text
Event: On "Reset UI" clicked
  Action: UIDirector → Untrack "Tooltip"      // remove one layer
  Action: UIDirector → Untrack ""             // blank = untrack all + clear every stack
```

### Layer State System

Controls visible/interactive state and optional collision syncing.

#### A - Keep a HUD visible outside the stack

```text
Event: On start of layout
  Action: UIDirector → Setup layer "HUD" as Screen, modal false, sync collisions false
  Action: UIDirector → Set "HUD" to Visible
```

#### B - Greyed-out (disabled) panel

```text
Event: On "Loading started"
  Action: UIDirector → Set "Inventory" to Disabled   // visible but input blocked

Event: On "Loading finished"
  Action: UIDirector → Set "Inventory" to Visible
```

#### C - One-shot input gate during a cutscene

```text
Event: On cutscene start
  Action: UIDirector → Set "HUD" input enabled: false   // visuals unchanged, input off

Event: On cutscene end
  Action: UIDirector → Set "HUD" input enabled: true
```

#### D - Collision-safe disabling

```text
Event: On start of layout
  Action: UIDirector → Setup layer "HUD" as Screen, modal false, sync collisions true

Event: On "Pause" clicked
  Action: UIDirector → Go to screen "Pause Menu" (Push)
  // HUD collisions disable only on instances that were enabled, then restore on resume.
```

### Navigation System (Focus Stack)

Maintains screen history and exact restoration on back-navigation.

#### A - Forward / back flow

```text
Event: Button "Settings" → On clicked
  Action: UIDirector → Go to screen "Settings" (Push)

Event: Button "Back" → On clicked
  Action: UIDirector → Go back
```

#### B - Collapse the stack to a target

```text
Event: Button "Home" clicked
  Action: UIDirector → Go to screen "Main Menu" (Return to)   // unwind to Main Menu
```

#### C - Replace without history (loading → menu)

```text
Event: Loading complete
  Action: UIDirector → Go to screen "Main Menu" (Replace)     // Loading drops out of history
```

#### D - Pop straight to the root

```text
Event: Button "Quit to title" clicked
  Action: UIDirector → Go to first screen
```

#### E - Show/hide a Back button automatically

`Can go back` is a condition (use it to gate an action), not a readable expression:

```text
Event: UIDirector → Can go back
  Action: Set Button "Back" visible → true
Event: UIDirector → [X] Can go back   (condition inverted)
  Action: Set Button "Back" visible → false
```

### Popup & Tooltip System

Temporary overlays that do not participate in focus history.

#### A - Modal confirmation popup

```text
Event: Button "Delete Save" clicked
  Action: UIDirector → Popup: Show "Confirm Dialog"

Event: Button "Yes" (in dialog) clicked
  Action: UIDirector → Popup: Hide "Confirm Dialog"
  Action: Delete save file
```

#### B - Auto-dismiss toast

```text
Event: Save complete
  Action: UIDirector → Popup: Show timed "Toast" for 2000 ms
  // Calling Popup: Hide "Toast" early cancels the timer.
```

#### C - Clear every popup at once

```text
Event: Before returning to menu
  Action: UIDirector → Popup: Hide all
```

#### D - Single-active tooltip behaviour

```text
Event: Mouse over Item A
  Action: UIDirector → Tooltip: Show "Item Tooltip"

Event: Mouse over Item B
  Action: UIDirector → Tooltip: Show "Item Tooltip"   // auto-hides the previous one

Event: Mouse not over any item
  Action: UIDirector → Tooltip: Hide active
```

### Transition System

Animated open/close transitions with state-safe interaction lockout.

#### A - Per-layer override

```text
Event: On start of layout
  Action: UIDirector → Set "Settings" animation slideLeft, 450 ms, elasticOut, mirror on back true
```

#### B - Gate logic until fully open

```text
Trigger: UIDirector → On layer opened "Checkout"
  Action: Set SubmitButton enabled → true
```

#### C - Emergency snap before a layout change

```text
Event: Before layout switch
  Action: UIDirector → Finish animation on ""   // blank = all
  Action: Go to layout "Game"
```

### Persistence & Save/Load System

Persists tracked layer metadata, the stack, and active overlays across layout changes.

```text
Event: On start of layout
  Condition: Global "UIInited" = 0
    Action: UIDirector → Setup layer "HUD" as Screen, modal false, sync collisions false
    Action: UIDirector → Setup layer "Inventory" as Screen
    Action: Set Global "UIInited" → 1
  // With Persist Across Layouts on + the container marked Global, state restores automatically.
```

### Timescale System

Per-instance timescale changes and managed global runtime timescale (see §17).

#### A - Freeze gameplay while the menu animates

```text
Event: On start of layout
  Action: UIDirector → Set "Pause Menu" timescale: objects 1, game-while-open 0

Event: Button "Pause" clicked
  Action: UIDirector → Go to screen "Pause Menu" (Push)
  // runtime.timeScale → 0 (game frozen); Pause Menu instances keep animating (objects = 1).
```

#### B - Clear all timescale overrides on a layer

```text
Event: On "Reset options" clicked
  Action: UIDirector → Set "Pause Menu" timescale: objects 1, game-while-open 1
  // objects 1 = normal speed now; game-while-open 1 = no global override on open.
```

---

## 15. Game Use Cases

### Use Case 1 - Main Menu Navigation

A game with Main Menu, Settings, and Credits. Open Settings or Credits from the menu, then go back.

```
[UI]
    [Credits]
    [Settings]
    [Main Menu]
```

```
// ── Layout Start ──
Event: On start of layout
  Action: UIDirector → Setup layer "Main Menu" as Screen
  Action: UIDirector → Setup layer "Settings" as Screen
  Action: UIDirector → Setup layer "Credits" as Screen
  Action: UIDirector → Go to screen "Main Menu" (Push)

// ── Navigation ──
Event: Button "Settings" → On clicked
  Action: UIDirector → Go to screen "Settings" (Push)

Event: Button "Credits" → On clicked
  Action: UIDirector → Go to screen "Credits" (Push)

Event: Button "Back" (on any screen) → On clicked
  Action: UIDirector → Go back

// ── Show Back button only when there's history ──
Event: UIDirector → Can go back
  Action: Set Button "Back" visible → true
Event: UIDirector → [X] Can go back   (condition inverted)
  Action: Set Button "Back" visible → false

// ── Sound on screen changes ──
Trigger: UIDirector → On any layer state changed
  Condition: UIDirector.LastChangedState = "focused"
    Action: Play sound "screen_open"
```

---

### Use Case 2 - Pause Menu with HUD

A HUD stays visible during play. Pausing shows the Pause Menu over the HUD; the HUD stays visible but non-interactive while paused, and the game freezes.

- `HUD` → Screen, **modal false** - stays visible while other screens are focused.
- `Pause Menu` → Screen, **modal true** - disables all other screens (including HUD) while focused.

```
// ── Layout Start ──
Event: On start of layout
  Action: UIDirector → Setup layer "HUD" as Screen, modal false, sync collisions false
  Action: UIDirector → Setup layer "Pause Menu" as Screen, modal true, sync collisions false
  Action: UIDirector → Set "HUD" to Visible

  // Freeze the game when the pause menu opens, keep the menu itself animated
  Action: UIDirector → Set "Pause Menu" timescale: objects 1, game-while-open 0

// ── Pause / Unpause ──
Event: Key "Escape" → On pressed
  Condition: NOT UIDirector → Screen "Pause Menu" is the active screen
    Action: UIDirector → Go to screen "Pause Menu" (Push)

Event: Key "Escape" → On pressed
  Condition: UIDirector → Screen "Pause Menu" is the active screen
    Action: UIDirector → Go back
    // HUD interactive state and runtime.timeScale both restored automatically

Event: Button "Resume" (in Pause Menu) → On clicked
  Action: UIDirector → Go back
```

---

### Use Case 3 - Inventory with Sub-Screens (pass data)

An Item Detail screen opens when the player clicks an item. Pass context with **Go to screen with data**, read it with `LayerData()` in the `On screen shown` trigger.

```
// ── Player clicks an item ──
Event: ItemSlot → On clicked
  Action: UIDirector → Set "Item Detail" data "itemName" = ItemSlot.ItemName
  Action: UIDirector → Go to screen "Item Detail" with data "itemId" = ItemSlot.ItemId

// ── Item Detail opens ──
Trigger: UIDirector → On screen shown "Item Detail"
  Action: Set Text "ItemName" → UIDirector.LayerData("Item Detail", "itemName")
  Action: Set Text "ItemId"   → UIDirector.LayerData("Item Detail", "itemId")

// ── Back ──
Event: Button "Back" → On clicked
  Action: UIDirector → Go back
```

---

### Use Case 4 - Confirmation Dialog

A confirmation popup blocks background input until the player responds.

```
// ── Open ──
Event: Button "Delete Save" → On clicked
  Action: UIDirector → Popup: Show "Confirm Dialog"

// ── Disable the trigger button while the dialog is open ──
Trigger: UIDirector → On popup opened "Confirm Dialog"
  Action: Set Button "Delete Save" enabled → false

// ── Confirm ──
Event: Button "Yes, Delete" (in dialog) → On clicked
  Action: UIDirector → Popup: Hide "Confirm Dialog"
  Action: Delete save file

// ── Cancel ──
Event: Button "Cancel" (in dialog) → On clicked
  Action: UIDirector → Popup: Hide "Confirm Dialog"

// ── Re-enable after it closes ──
Trigger: UIDirector → On popup closed "Confirm Dialog"
  Action: Set Button "Delete Save" enabled → true
```

---

### Use Case 5 - Item Tooltip on Hover

Hovering equipment slots shows a tooltip; moving to another slot swaps it instantly.

```
[UI]
    [Tooltip]   ← Tooltip role
    [Inventory]
```

```
Event: Mouse is over "Sword Slot"
  Condition: UIDirector.ActiveTooltip ≠ "Tooltip"
    Action: UIDirector → Set "Tooltip" data "text" = "Iron Sword - Atk +12"
    Action: UIDirector → Tooltip: Show "Tooltip"

Event: Mouse is over "Shield Slot"
  Condition: UIDirector.ActiveTooltip ≠ "Tooltip"
    Action: UIDirector → Set "Tooltip" data "text" = "Wooden Shield - Def +5"
    Action: UIDirector → Tooltip: Show "Tooltip"

// ── Update tooltip text when it changes state ──
Trigger: UIDirector → On layer state changed "Tooltip"
  Action: Set Text "TooltipText" → UIDirector.LayerData("Tooltip", "text")

// ── Hide when not hovering anything ──
Event: NOT (Mouse is over "Sword Slot" OR Mouse is over "Shield Slot")
  Action: UIDirector → Tooltip: Hide active
```

---

### Use Case 6 - HUD with Collision Management

A top-down game where HUD hitboxes must not collide with game objects while the pause menu is open. Enable collision sync at registration:

```
Event: On start of layout
  Action: UIDirector → Setup layer "HUD" as Screen, modal false, sync collisions true
```

When the Pause Menu focuses and the HUD becomes non-interactive, UIDirector disables `collisionsEnabled` only on instances that **currently have collisions on**, and restores exactly those when the HUD is interactive again. Instances you deliberately set collisions-off are never touched.

---

### Use Case 7 - Full-Screen Cutscene Overlay

A modal overlay covers the UI during a cutscene, then fades out.

```
// ── Start ──
Event: Trigger "StartCutscene"
  Action: UIDirector → Set "Cutscene Overlay" animation fade, 500 ms, linear, mirror on back false
  Action: UIDirector → Go to screen "Cutscene Overlay" (Push)   // modal: blocks everything

// ── End ──
Event: Trigger "EndCutscene"
  Action: UIDirector → Go back

// ── Sync cutscene content with the fade-in ──
Event: Every tick
  Condition: UIDirector → Layer "Cutscene Overlay" is animating
  Condition: UIDirector.LayerAnimDirection("Cutscene Overlay") = "opening"
    Action: Set opacity "CutsceneText" → UIDirector.LayerAnimProgress("Cutscene Overlay") × 100
```

---

### Use Case 8 - Game Over Screen with Animation Sync

A "Game Over" sting fires only when the fade-in finishes, not when it starts.

```
Event: Player health ≤ 0
  Action: UIDirector → Go to screen "Game Over" (Push)

// ── Fire exactly when fully visible ──
Trigger: UIDirector → On layer opened "Game Over"
  Action: Play sound "gameover_sting"
  Action: Set buttons visible → true

// ── Hide buttons while still animating in ──
Trigger: UIDirector → On layer opening "Game Over"
  Action: Set buttons visible → false
```

---

### Use Case 9 - Tutorial Flow with Skip-to-Start

The player can be several steps deep; "Skip Tutorial" jumps all the way back to the Main Menu.

```
Event: Button "Next" → On clicked
  Action: UIDirector → Go to screen "Tutorial Step 2" (Push)

Event: Button "Next" (Step 2) → On clicked
  Action: UIDirector → Go to screen "Tutorial Step 3" (Push)

// ── Skip straight back ──
Event: Button "Skip Tutorial" → On clicked
  Action: UIDirector → Go to screen "Main Menu" (Return to)
```

---

### Use Case 10 - Multi-Layout Game with Persistent UI State

The inventory stays open at the same stack depth across an overworld → dungeon transition. Enable **Persist Across Layouts**.

```
// ── In each layout ──
Event: On start of layout
  Condition: Global "UIInited" = 0
    Action: UIDirector → Setup layer "HUD" as Screen, modal false, sync collisions false
    Action: UIDirector → Setup layer "Inventory" as Screen
    Action: Set Global "UIInited" → 1
  // UIDirector restores the saved state automatically; if Inventory was focused, it stays focused.

// ── Transition ──
Event: Player enters dungeon door
  Action: Go to layout "Dungeon"
  // UIDirector serialises its state before the layout ends and restores it after.
```

---

### Use Case 11 - Debug Overlay (Dev Only)

A persistent debug overlay reading UIDirector expressions:

```
Event: On start of layout
  // ... other registrations ...
  Action: UIDirector → Setup layer "Debug Overlay" as Screen, modal false, sync collisions false
  Action: UIDirector → Set "Debug Overlay" to Visible

Event: Every tick
  Action: Set "DebugText" → "Screen: " & UIDirector.CurrentScreen
    & newline & "Depth:  " & UIDirector.FocusStackDepth
    & newline & "Popup:  " & UIDirector.TopPopup
    & newline & "Tip:    " & UIDirector.ActiveTooltip
    & newline & "Last:   " & UIDirector.LastChangedLayer & " → " & UIDirector.LastChangedState
```

> The C3 Debugger (§16) surfaces all of this already - use it before building a custom overlay.

---

### Use Case 12 - Loading Screen (Replace)

Show a loading screen, then replace it so the player cannot go back to it.

```
Event: On start of layout
  Action: UIDirector → Setup layer "Loading" as Screen
  Action: UIDirector → Setup layer "Main Menu" as Screen
  Action: UIDirector → Go to screen "Loading" (Push)

Event: Loading complete
  Action: UIDirector → Go to screen "Main Menu" (Replace)
  // Focus stack now contains only "Main Menu"; "Loading" is gone from history.
```

---

### Use Case 13 - Toast Notification (Auto-dismiss Popup)

A "Game Saved" banner appears briefly and disappears on its own.

```
Event: On save complete
  Action: UIDirector → Popup: Show timed "Toast Banner" for 2000 ms

// ── Optional reaction when it closes ──
Trigger: UIDirector → On popup closed "Toast Banner"
  Action: Play sound "whoosh"
```

The popup plays its normal open/close animations. Calling `Popup: Hide "Toast Banner"` before the timer expires cancels it and hides immediately.

---

### Use Case 14 - Direction-Aware Tab Navigation (Mirror)

Settings tabs (Audio, Video, Controls) slide in from the right; pressing Back slides the current tab out to the right.

```
Event: On start of layout
  Action: UIDirector → Setup layer "Audio" as Screen
  Action: UIDirector → Setup layer "Video" as Screen
  Action: UIDirector → Setup layer "Controls" as Screen

  Action: UIDirector → Set "Audio" animation slideLeft, 300 ms, easeOut, mirror on back true
  Action: UIDirector → Set "Video" animation slideLeft, 300 ms, easeOut, mirror on back true
  Action: UIDirector → Set "Controls" animation slideLeft, 300 ms, easeOut, mirror on back true

  Action: UIDirector → Go to screen "Audio" (Push)

Event: Tab "Video" clicked
  Action: UIDirector → Go to screen "Video" (Push)    // slides in from left

Event: Button "Back" clicked
  Action: UIDirector → Go back                          // slides out to the right
```

---

### Use Case 15 - "Back to X" Label & Depth Indicator

Show where Back leads and how deep the player is. (`ScreenAtDepth` was removed in v1.2.0.0; use `PreviousScreen()` + `FocusStackDepth()`.)

```
Event: Every tick
  Action: Set Text "BackLabel" → "‹ " & UIDirector.PreviousScreen
  Action: Set "BackLabel" visible → (UIDirector.PreviousScreen ≠ "")   // empty when nothing is below
  Action: Set Text "DepthLabel" → "Depth: " & UIDirector.FocusStackDepth
```

To show a full breadcrumb path, keep your own ordered list and push/pop it alongside your navigation, or read `CurrentScreen()` and `PreviousScreen()` for the last two levels.

---

### Use Case 16 - Dim Scrim on Modal Screens & Popups

A semi-transparent overlay appears behind any modal screen or popup, automatically.

**Setup (Properties Bar):** Dim Layer = `"Dim"`, Dim Opacity = `0.5`.

```
[UI]
    [Tooltip]
    [Confirm Dialog]   ← Popup role
    [Dim]              ← managed automatically (do NOT track)
    [Settings]         ← Screen, modal
    [Main Menu]        ← Screen, modal
```

No event-sheet code needed. Place the Dim layer above screens but below popups so it covers screens, not popups.

---

### Use Case 17 - Home Button (Go to First Screen)

A Home button returns to the root no matter how deep the player is.

```
Event: On Home Button clicked
  Action: UIDirector → Go to first screen
```

Use **Go to first screen** instead of chaining multiple `Go back` calls - it handles stacks of any depth in one action.

---

### Use Case 18 - Gate a Button Until the Screen is Ready

A Submit button stays disabled until its screen finishes animating in.

```
Trigger: UIDirector → On layer opening "Checkout"
  Action: Set SubmitButton enabled → false

Trigger: UIDirector → On layer opened "Checkout"
  Action: Set SubmitButton enabled → true
```

Or poll it: `Layer "Checkout" is ready` (true only when visible/focused **and** done animating).

---

### Use Case 19 - Emergency Clear (Hide All + Finish All)

Before a layout change, clear popups and snap animations so no stale state carries over.

```
Event: On "Return to Menu" clicked
  Action: UIDirector → Popup: Hide all
  Action: UIDirector → Finish animation on ""    // blank = all
  Action: Go to layout "Main Menu"
```

---

### Use Case 20 - Scale-Based Dialog Motion

A shop dialog pops in/out with a scale + back-ease for punchy feedback.

```text
Event: On start of layout
  Action: UIDirector → Setup layer "Shop Dialog" as Screen
  Action: UIDirector → Set "Shop Dialog" animation scaleUp, 280 ms, backOut, mirror on back true

Event: Button "Open Shop" clicked
  Action: UIDirector → Go to screen "Shop Dialog" (Push)

Event: Button "Close Shop" clicked
  Action: UIDirector → Go back
```

Scale animations include a separate fast opacity tween, so they stay readable even with elastic/back easing.

### Other game-genre patterns

**Platformer:** persistent HUD plus modal pause/settings screens with stacked back-navigation.
**Metroidvania:** map and inventory as independent screens; popups for key-item confirmations.
**Top-down shooter:** timed warning popups, auto-dismiss indicators, modal upgrade dialogs.
**Roguelike:** run summary / seed / death recap as screens; `Return to` for rapid reset flows.
**JRPG:** deep focus stacks for party / equipment / skills with mirror-on-back transitions.
**Visual novel:** tooltip glossary terms plus modal confirmation popups for route choices.
**Puzzle:** dim layer plus popup hints, `Popup: Hide all` before restarting.
**Survival crafting:** crafting / recipe detail / confirmation layered cleanly.
**City builder:** many non-modal utility panels alongside a focused settings stack.
**Auto battler / idle:** timed shop and boost popups while the board HUD stays put.
**Tactics:** ability-targeting overlays as modal screens that freeze gameplay via managed timescale.
**Rhythm:** minimal transitions in gameplay, richer scale transitions for song select / results.

---

## 16. C3 Debugger

UIDirector exposes a live panel in the **C3 Debugger** (open with F12 while previewing). No setup needed - expand the UIDirector instance to see full runtime state.

**UIDirector — Summary**

| Field | What it shows |
|---|---|
| Active screen | Name of the screen at the top of the focus stack |
| Stack depth | Screens in the navigation history |
| Open popups | Number of currently open popups |
| Active tooltip | Name of the visible tooltip, or `(none)` |
| Animating layers | Layers currently mid-transition |
| Runtime timescale | Current `runtime.timeScale` |
| Total tracked | Layers registered with UIDirector |
| Debug mode | Whether logging is active - **click to toggle live** |

**UIDirector — Focus Stack** — one row per screen, top-first (active labelled `◀ active`), showing each screen's state.

**UIDirector — Open Popups** — one row per popup; auto-dismiss popups show `⏳ auto-dismiss`.

**Layer: [name]** — one section per tracked layer: role; state (with direction + progress % while animating, e.g. `focused (opening 42%)`); previous state; modal & mirror-on-back flags (screens); sync-collisions flag; animation override; runtime-timescale values; and any custom data keys.

The panel updates every frame - watch state change live as you navigate, open popups, and trigger animations. It replaces the need for debug Text objects reading `CurrentScreen()` or `LayerState()` by hand.

---

## 17. Timescale Control

UIDirector controls timescale two ways, both through the single **Set timescale** action (`objects` = per-instance, `game-while-open` = managed global runtime timescale).

### Per-object (instance) timescale

The `objects` parameter sets `instance.timeScale` on every instance in the layer and its sublayers immediately. Pass `-1` to leave them unchanged.

| Goal | Action |
|---|---|
| Keep UI animating while the game is paused | `Set "MyLayer" timescale: objects 1, game-while-open -1` |
| Freeze a layer's animations | `Set "MyLayer" timescale: objects 0, game-while-open -1` |
| Run a countdown at double speed | `Set "MyLayer" timescale: objects 2, game-while-open -1` |
| Restore objects to follow the global timescale | `Set "MyLayer" timescale: objects 1, game-while-open -1` |

This is a one-time apply - call it again if new instances appear on the layer.

### Managed runtime (game-while-open) timescale

The `game-while-open` parameter stores a global runtime timescale on the layer. UIDirector applies it to `runtime.timeScale` when the layer **opens** and restores the previous value when it **closes**. Pass `-1` to clear/skip.

```
► On start of layout
    UIDirector → Setup layer "PauseMenu" as Screen
    UIDirector → Set "PauseMenu" timescale: objects 1, game-while-open 0
    //                                       ↑ menu animates   ↑ game freezes when open

► Player presses Pause
    UIDirector → Go to screen "PauseMenu" (Push)
    ✓ runtime.timeScale → 0 (game frozen); PauseMenu instances run at 1 (still animate)

► Player presses Resume
    UIDirector → Go back
    ✓ runtime.timeScale restored to its previous value - game resumes
```

**To clear the override:** `Set "PauseMenu" timescale: objects 1, game-while-open 1` (or `-1` to skip).

### Stacking behaviour

Managed runtime timescale stacks correctly across nested layers:

```
Start: runtime.timeScale = 1
Open ScreenA (game-while-open 0)   → runtime = 0   (saved: 1)
Open ScreenB (game-while-open 0.5) → runtime = 0.5 (saved: 0)
Close ScreenB                      → runtime = 0   (ScreenA's value restored)
Close ScreenA                      → runtime = 1   (original restored)
```

Each layer saves the timescale that was active when it opened, so restores are always accurate. The value is also restored safely on untrack and on layout teardown, preventing a permanently frozen game.

---

## 18. Scripting (C3 Script / JavaScript)

In **Addon SDK v2** the UIDirector instance **is** its own script interface - its methods are callable directly from C3 Script. The action methods the ACEs call (named `_act…`) are available on the instance and take plain string arguments for roles, states, and animation types (no combo indices).

### Accessing the instance

```js
const ui = runtime.objects.UIDirector?.getFirstInstance();
if (!ui) return;

ui._actFocusLayer("Main Menu");   // same as: Go to screen "Main Menu" (Push)
```

The object-type name (`UIDirector`) comes from your project's object name.

### Action method reference

| Method | Parameters | Equivalent action |
|---|---|---|
| `_actTrackLayer` | `name, role, isModal, manageCollisions` | Setup layer (advanced). `role` = `"normal"`/`"popup"`/`"tooltip"` |
| `_actUntrackLayer` | `name` | Untrack (one) |
| `_actUntrackAllLayers` | — | Untrack (blank) |
| `_actFocusLayer` | `name` | Go to screen (Push) |
| `_actReplaceScreen` | `name` | Go to screen (Replace) |
| `_actPopFocusToLayer` | `name` | Go to screen (Return to) |
| `_actNavigateToScreenWithData` | `name, key, value` | Go to screen with data |
| `_actPopFocusStack` | — | Go back |
| `_actNavigateBackToRoot` | — | Go to first screen |
| `_actSetLayerState` | `name, state` | Set layer state. `state` = `"visible"`/`"hidden"`/`"disabled"` |
| `_actSetLayerInteractable` | `name, enabled` | Set input enabled |
| `_actSetLayerAnimation` | `name, type, durationMs, easing, mirrorOnBack` | Set animation. `type`/`easing` are strings |
| `_actSetLayerModal` | `name, isModal` | Set modal |
| `_actSetLayerTimescale` | `name, objectsTimescale, runtimeTimescale` | Set timescale |
| `_actSetLayerData` | `name, key, value` | Set data |
| `_actSetLayerCollisions` | `name, enabled` | Sync collisions |
| `_actShowPopup` / `_actHidePopup` | `name` | Popup: Show / Hide |
| `_actShowPopupFor` | `name, durationMs` | Popup: Show timed |
| `_actCloseAllPopups` | — | Popup: Hide all |
| `_actShowTooltip` / `_actHideTooltip` | `name` | Tooltip: Show / Hide |
| `_actHideActiveTooltip` | — | Tooltip: Hide active |
| `_actCompleteTransition` | `name` | Finish animation on one |
| `_actSkipAllAnimations` | — | Finish animation on all |

### Complete script example

```js
export function initUi(runtime) {
  const ui = runtime.objects.UIDirector?.getFirstInstance();
  if (!ui) return;

  ui._actTrackLayer("Main Menu", "normal", true, false);
  ui._actTrackLayer("Settings", "normal", true, false);
  ui._actTrackLayer("Confirm Dialog", "popup", true, false);

  ui._actSetLayerAnimation("Settings", "slideLeft", 300, "easeOut", true);
  ui._actFocusLayer("Main Menu");
}
```

### Reading state & listening to events from script

Expressions and triggers are event-sheet features, not script methods. The recommended pattern is to catch a UIDirector trigger in the event sheet and forward the context into script:

```text
Trigger: UIDirector → On any layer state changed
  Action: Script → onUiLayerChanged(UIDirector.LastChangedLayer, UIDirector.LastChangedState)
```

```js
export function onUiLayerChanged(layerName, state) {
  if (state === "focused" && layerName === "Inventory") {
    console.log("Inventory became active");
  }
}
```

> The internal `_lastChangedLayer` / `_lastChangedState` fields are readable directly on the instance too (`ui._lastChangedLayer`), but the event-sheet bridge above is the stable, supported path.

---

## 19. UI Suite Integration

UIDirector is designed to be the **navigation authority** in a UI suite (e.g. UIForge for gamepad/focus routing, FlourishCue for per-object animation). It has **no hard dependency** on any of them, and no addon looks another up by plugin ID - integration is rename-proof and automatic.

### The frozen compatibility surface

Companion addons integrate only through UIDirector's already-shipping surface. These names and meanings are **locked across versions** so integrations never break:

| Need | What companions use | UIDirector feature |
|---|---|---|
| Follow the active screen | Poll `LastChangedLayer()` + `LastChangedState()` each tick | Expressions (§12) |
| Know if back is possible | `Can go back` condition | §11 |
| Drive a Back button | `Go back` action | §10 |
| Per-object open/close animation in sync | Duck-typed `_playOpen` / `_playClose` / `_isAnimating` / `_finishAnimation` on layer instances | Animation barrier (below) |

Because all of these already exist, **nothing needs to be added to UIDirector** for the suite to work.

### The animation barrier (per-object integration)

When a layer opens or closes, UIDirector waits for **both** its own layer tween **and** any per-object transition behaviors on that layer before firing `On layer opened` / `On layer closed`. It detects those behaviors purely by duck typing - any behavior exposing `_playOpen` / `_playClose` / `_isAnimating` / `_finishAnimation` participates, with no hardcoded addon ID.

This means staggered per-object entrances (e.g. FlourishCue buttons cascading in) finish *before* your "screen ready" logic runs, automatically. `Finish animation` calls `_finishAnimation()` on all detected behaviors and snaps the layer tween to the end.

### Recommended wiring

```text
Event: On start of layout
  Action: UIDirector → Setup layer "MainMenu" as Screen
  Action: UIDirector → Setup layer "Settings" as Screen
  Action: UIDirector → Setup layer "ConfirmQuit" as Popup
  Action: UIDirector → Go to screen "MainMenu" (Push)
```

- Place interactive controls on the correct UIDirector screen layer; modal blocking then gates them for free.
- Keep UIDirector as the **only** owner of layer visible/interactive state.
- Route a companion addon's "back requested" event to the **Go back** action; check **Can go back** first if you want to intercept (e.g. show a "Quit?" popup on the root screen).

```text
Event: <companion> On back requested
  Condition: UIDirector → Can go back
    Action: UIDirector → Go back

Event: <companion> On back requested
  Condition: NOT UIDirector → Can go back   // at the root - confirm quit instead
    Action: UIDirector → Popup: Show "ConfirmQuit"
```

> **Note:** Earlier drafts proposed extra JS bridge methods (`_goBack`, `_getLastChangedLayer`, `_getLastChangedState`). These are **no longer used** - the suite integrates entirely through the ACE surface and expressions above.

---

## 20. Tips and Common Mistakes

**Layers must be inside the container group** (or anywhere in the layout if the container is blank). A layer at the wrong level won't be found - check the layer panel.

**Layer names are case-sensitive.** `"Main Menu"` and `"main menu"` are different layers.

**Don't skip registration.** Every layer must be set up with `Setup layer` (or `Setup layer (advanced)`) before any other action targets it. Use **Layer is tracked** to guard if unsure.

**`Set layer state` vs `Go to screen`.** Use `Go to screen` for navigation (it manages history). Use `Set layer state` only to change visibility without touching the focus stack - e.g. a HUD that sits alongside screens.

**Non-modal + `Set … to Visible` = always-on layer.** Register a screen non-modal and set it Visible (not focused) and it stays visible regardless of what else is focused. That's the HUD pattern.

**Animations block interaction.** While a layer animates, its `isInteractive` is false. To run logic only after it's done, use **On layer opened** / **On layer closed**, or poll **Layer is ready**.

**Combos arrive as indices.** In the event sheet you pick a label; at runtime UIDirector maps it to a string key. From script, the `_act…` methods take strings directly - no index juggling.

**`Popup: Hide all` / `Finish animation on ""` are great pre-transition resets.** Call them before a layout change to leave the UI in a known state.

**Don't track the Dim layer.** UIDirector manages its visibility and opacity automatically from the Dim Layer property.
