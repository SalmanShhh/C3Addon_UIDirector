<img src="./src/icon.svg" width="100" /><br>
# UIDirector
<i>Layer-based UI manager with focus stack, popup system, animations, modal control, and collision management. Track any layer as a named screen, popup, or tooltip - then open, close, and navigate between them with simple actions.</i> <br>
### Version 1.3.0.0

[<img src="https://placehold.co/200x50/4493f8/FFF?text=Download&font=montserrat" width="200"/>](https://github.com/SalmanShhh/C3Addon_UIDirector/releases/download/salmanshh_uidirector-1.3.0.0.c3addon/salmanshh_uidirector-1.3.0.0.c3addon)
<br>
<sub> [See all releases](https://github.com/SalmanShhh/C3Addon_UIDirector/releases) </sub> <br>

#### What's New in 1.3.0.0
**Added:**
- Setup layer with transition action: register a layer and set its animation type, duration, easing and mirror-on-back in one step.
- Anchored Objects plugin property: choose whether Anchor-behavior objects move with the layer or stay in place during slide/scale (defaults to "Stay in place").
- Position-ownership handover: behaviors that drive their own position (Virtual Cursor, or any addon setting _ownsPosition) are suspended for the transition and restored after; Physics is never touched.
- Watchdog for companion per-object animations (_playOpen/_playClose) that never report completion, so a transition can't hang forever.
- Savegame settle pass on afterload: instance transforms, layer opacity and collisions left mid-transition by a save are restored once instances exist.
- One-shot warnings for common setup mistakes: untracked layer, wrong role for Go to screen, "Return to" with no history, slide/scale with nothing to animate.
- version banner logged on load in Debug Mode.

**Changed:**
- Slide and scale now transform the objects on the layer (hierarchy children included, parent-first) instead of the layer itself.
- Fade scales each sublayer's own opacity instead of overwriting the group layer's.
- Property values are derived from the declaration list in config.caw.js instead of hardcoded indices, so adding or regrouping a property can't shift them.
- GoBack, CanGoBack, LastChangedLayer and LastChangedState are now exposed on the instance for companion addons (UIForge).
- Overshoot easings (Back Out, Elastic Out) fall back to Quartic Out for opacity so fades don't finish early and look frozen.
- Editor instance no longer tries to grey out Dim Opacity; its description states it only applies when Dim Layer is set.
- Shortened the Anchored Objects dropdown labels to "Move with layer" / "Stay in place".

**Fixed:**
- Slide did nothing on parallax 0,0 UI layers (it wrote layer.scrollX/scrollY, which C3 derives from the layout) and scale was a silent no-op (ILayer has no scale property).
- GROUP rows were assumed to occupy a value slot, shifting every property after a group header: duration read the easing index (0, instant) and Debug Mode read past the end.
- Combo params shipped capitalized initial values ("Screen", "Push", "Show") that matched no item key.
- Editor instance called SetPropertyEnabled/GetPropertyValue, which don't exist on the base class.
- Anchored objects fought slide/scale transitions instead of being held or moved deliberately.
- External movement mid-transition (Anchor re-homing, window resize) is now reconciled per frame instead of snapping or being overwritten.

<sub>[View full changelog](#changelog)</sub>

---
<b><u>Author:</u></b> SalmanShh <br>
<sub>Made using [CAW](https://marketplace.visualstudio.com/items?itemName=skymen.caw) </sub><br>

## Table of Contents
- [Usage](#usage)
- [Examples Files](#examples-files)
- [Properties](#properties)
- [Actions](#actions)
- [Conditions](#conditions)
- [Expressions](#expressions)
---
## Usage
To build the addon, run the following commands:

```
npm i
npm run build
```

To run the dev server, run

```
npm i
npm run dev
```

## Examples Files

---
## Properties
| Property Name | Description | Type |
| --- | --- | --- |
| UI Container Layer | Name of the group layer in your layout that contains all managed UI sublayers. Example: if your group layer is called "UI", enter "UI" here. Leave blank to search the whole layout. | text |
| Transitions | Transition-related defaults. | group |
| Default Animation | The default transition animation played when showing or hiding a layer. Can be overridden per-layer with the Set animation action. | combo |
| Default Duration (ms) | How long the default transition animation takes, in milliseconds. Example: 200 = a quick 0.2 second fade. | integer |
| Default Easing | The easing curve applied to the default animation. EaseOut feels snappy and responsive; EaseInOut feels smooth. | combo |
| Anchored Objects | How slide and scale transitions treat objects with the Anchor behavior. "Move with layer" slides/scales them along with everything else; "Stay in place" keeps them where they are and animates only the objects attached to them. | combo |
| Modal / Dim | Modal dim layer settings. | group |
| Dim Layer | Optional. The name of a layer inside your UI container to use as a dim/scrim overlay. UIDirector will show this layer at the set opacity whenever a modal screen or popup is active, and hide it when none are. Leave blank to disable. | text |
| Dim Opacity | The opacity of the dim layer when it is active (0 = invisible, 1 = fully opaque). Default is 0.5 (50% semi-transparent). Only applies when Dim Layer is set; ignored otherwise. | percent |
| Behavior | Global behavior settings. | group |
| Persist Across Layouts | If enabled, UIDirector remembers tracked layers and their states when the layout changes. Layer references are re-resolved on the new layout. | check |
| Debug Mode | If enabled, UIDirector logs all operations to the browser console (F12 -> Console). Useful during development - turn off before release. | check |


---
## Actions
| Action | Description | Params
| --- | --- | --- |
| Set animation | Overrides the open/close animation for a single layer: type, duration, easing, and whether back-navigation mirrors the direction. Configure once; it plays automatically on every show and hide. | Layer name             *(string)* <br>Animation type             *(combo)* <br>Duration (ms)             *(number)* <br>Easing             *(combo)* <br>Mirror on back             *(boolean)* <br> |
| Set data | Stores a custom key/value on a tracked layer. Read it back with the LayerData expression. Use to attach context like a selected item ID to a screen. | Layer name             *(string)* <br>Key             *(string)* <br>Value             *(string)* <br> |
| Set input enabled | Toggles a layer's interactivity (isInteractive) without changing its visuals. Use to temporarily block buttons during an animation or loading. | Layer name             *(string)* <br>Enabled             *(boolean)* <br> |
| Set layer state | Changes a layer directly to visible, hidden, or disabled, playing the layer's animation. Use to show or hide a HUD element or grey out a panel without touching the focus stack. | Layer name             *(string)* <br>State             *(combo)* <br> |
| Set modal | Sets whether a screen blocks input on all other screens while it is active. Use to make fullscreen menus modal. | Layer name             *(string)* <br>Blocks others             *(boolean)* <br> |
| Set timescale | Controls playback speed tied to a layer. Objects timescale changes the speed of every object on the layer now (1 = normal, 0 = frozen, -1 = no change). Game-while-open is stored and auto-applied to the whole game when this layer opens, then restored on close (-1 = off). Pass 1 / 1 to clear. Tip: objects 1 + game-while-open 0 keeps the menu animated while the game freezes behind it. | Layer name             *(string)* <br>Objects timescale             *(number)* <br>Game-while-open timescale             *(number)* <br> |
| Sync collisions | Enables or disables automatic collision syncing on a layer: when on, object collisions are disabled while the layer is hidden/disabled and restored when it shows. Use to stop invisible UI from blocking game clicks. | Layer name             *(string)* <br>Enabled             *(boolean)* <br> |
| Go back | Returns to the previous screen, like a Back button. Pops the focus stack with animation; does nothing if the stack is empty. Use for the Escape key or back arrows. |  |
| Go to first screen | Clears the navigation history and returns to the root (first) screen. Use for a 'Main Menu' shortcut from deep inside nested menus. |  |
| Go to screen | Navigates to a screen. Push remembers the current screen so the player can go back; Replace swaps without remembering; Return to unwinds the history back to this screen. | Layer name             *(string)* <br>Mode             *(combo)* <br> |
| Go to screen with data | Stores a key/value on the target screen and then navigates to it (Push). Read the value back with the LayerData expression. Use to pass context like a selected item into the screen. | Layer name             *(string)* <br>Key             *(string)* <br>Value             *(string)* <br> |
| Popup | Shows or hides a popup overlay above the current screen. Show timed auto-dismisses after the given milliseconds; Hide all closes every open popup. Duration is only used by Show timed. | Mode             *(combo)* <br>Layer name             *(string)* <br>Duration (ms)             *(number)* <br> |
| Tooltip | Shows or hides a tooltip. Only one tooltip is visible at a time — showing a new one hides the previous. Hide active hides whichever tooltip is currently showing. | Mode             *(combo)* <br>Layer name             *(string)* <br> |
| Setup layer | Registers a layer with UIDirector as a screen, popup, or tooltip with sensible defaults. Call once at the start for each UI layer you want to manage. | Layer name             *(string)* <br>Role             *(combo)* <br> |
| Setup layer (advanced) | Registers a layer with full control over modal blocking and collision syncing. Use when the defaults from Setup layer are not what you want. | Layer name             *(string)* <br>Role             *(combo)* <br>Modal (blocks others)             *(boolean)* <br>Sync collisions             *(boolean)* <br> |
| Setup layer with transition | Registers a layer and gives it its own open/close animation in one step. Any option left as Use plugin default follows the matching Transitions property. | Layer name             *(string)* <br>Role             *(combo)* <br>Animation type             *(combo)* <br>Duration (ms)             *(number)* <br>Easing             *(combo)* <br>Mirror on back             *(boolean)* <br> |
| Untrack | Stops UIDirector from managing a layer. Leave the name blank to untrack everything and clear all stacks. | Layer name             *(string)* <br> |
| Finish animation | Instantly completes a layer's running transition (and any per-object animations). Leave the name blank to finish every running animation at once. Use to skip transitions on a fast-forward or skip button. | Layer name             *(string)* <br> |


---
## Conditions
| Condition | Description | Params
| --- | --- | --- |
| Layer accepts input | True when the layer's isInteractive is on (it accepts clicks and touches). Use to guard button logic so it only runs when the layer is interactive. | Layer name *(string)* <br> |
| Layer blocks other screens | True when this layer is modal (blocks input on all other screens while active). Use to decide whether a dimmed overlay should appear. | Layer name *(string)* <br> |
| Layer is animating | True while a layer is playing its show/hide transition animation. Use to disable buttons until the screen finishes sliding in. | Layer name *(string)* <br> |
| Layer is in state | True when a layer's current state matches the chosen one. Use to check a layer before acting on it. | Layer name *(string)* <br>State *(combo)* <br> |
| Layer is ready | True when a layer is visible or focused AND not mid-animation. Use to only allow button clicks once a screen has fully appeared. | Layer name *(string)* <br> |
| Layer is visible | True when the layer and all its parents are visible (includes disabled layers). Use to check if a HUD or panel is currently on screen. | Layer name *(string)* <br> |
| Can go back | True when there is a previous screen to return to. Use to show or hide a Back button. UIForge checks this before driving back-navigation. |  |
| No screens are open | True when the focus stack is empty. Use to detect when the player has backed out of all menus. |  |
| Screen is the active screen | True when this screen is on top of the focus stack. Use to show controls that only appear on a specific screen. | Layer name *(string)* <br> |
| Screen is in navigation history | True when this screen appears anywhere in the focus stack. Use to avoid navigating to a screen that is already open. | Layer name *(string)* <br> |
| On screen hidden | Triggers when a screen leaves the focus stack (e.g. after Go back). Use PreviousScreen inside. Good for resuming music or cleaning up after leaving a screen. | Layer name *(string)* <br> |
| On screen shown | Triggers when a screen becomes the active screen. Use FocusedLayer / PreviousScreen inside. Good for playing a sound or starting an intro effect. | Layer name *(string)* <br> |
| Any popup is visible | True when one or more popups are open. Use to dim the background or block input while a dialog is showing. |  |
| A tooltip is visible | True when a tooltip is currently showing. Use to suppress other hover effects while a tooltip is up. |  |
| On popup closed | Triggers when a popup hides. Use to check the player's choice after a confirmation dialog. | Layer name *(string)* <br> |
| On popup opened | Triggers when a popup becomes visible. Use TopPopup inside. Good for playing a sound or dimming the background. | Layer name *(string)* <br> |
| Layer is tracked | True if UIDirector is managing this layer. Use as a safety check before calling other actions on it. | Layer name *(string)* <br> |
| On any layer state changed | Triggers whenever any layer changes state. Use with LastChangedLayer and LastChangedState for global UI tracking. Companion addons poll these to follow the active screen. |  |
| On layer closed | Triggers after a layer finishes its closing animation. A safe point to clean up or stop timers once the layer is fully gone. | Layer name *(string)* <br> |
| On layer closing | Triggers when a layer starts its closing animation. Good for fading out music or starting a parallel exit effect. | Layer name *(string)* <br> |
| On layer opened | Triggers after a layer finishes its opening animation. A safe point to enable controls or start effects once the layer is fully visible. | Layer name *(string)* <br> |
| On layer opening | Triggers when a layer starts its opening animation. Use LayerAnimProgress / LayerAnimDirection inside. Good for starting music or parallel intro effects. | Layer name *(string)* <br> |
| On layer state changed | Triggers after a specific layer finishes changing state. Use LayerState / PreviousLayerState inside. Good for logic that depends on the final state. | Layer name *(string)* <br> |


---
## Expressions
| Expression | Description | Return Type | Params
| --- | --- | --- | --- |
| LayerData | Returns a stored custom value from a layer by key, or empty. Use to read data set with Set data or Go to screen with data. | string | Layer name *(string)* <br>Key *(string)* <br> | 
| LayerRole | Returns a layer's role: 'normal', 'popup', 'tooltip', or empty if untracked. Use for debug displays or role-specific logic. | string | Layer name *(string)* <br> | 
| LayerState | Returns a layer's current state: 'visible', 'hidden', 'disabled', 'focused', or empty if untracked. Use for debug displays or conditional logic. | string | Layer name *(string)* <br> | 
| PreviousLayerState | Returns the state a layer was in before its last change, or empty. Use to restore a layer after a temporary change. | string | Layer name *(string)* <br> | 
| CurrentScreen | Returns the name of the active screen, or empty if none. Use for screen-specific logic or debug displays. | string |  | 
| FocusedLayer | Returns the name of the active (focused) screen, or empty if none. Alias of CurrentScreen. Polled alongside LastChangedLayer by companion addons. | string |  | 
| FocusStackDepth | How many screens are currently in the focus stack. 0 = none, 1 = one screen, 2+ = deeper. Use for breadcrumbs or depth indicators. | number |  | 
| PreviousScreen | Returns the name of the screen directly below the active one in the stack, or empty. Use for breadcrumbs or 'Back to X' button labels. | string |  | 
| ActiveTooltip | Returns the name of the visible tooltip, or empty if none. Use for custom logic based on which tooltip is showing. | string |  | 
| TopPopup | Returns the name of the topmost open popup, or empty if none. Use to check which dialog the player is looking at. | string |  | 
| CountTrackedLayers | Returns the total number of layers currently tracked by UIDirector. Use with GetTrackedLayerByIndex in a Repeat loop to iterate all tracked layers. | number |  | 
| GetTrackedLayerByIndex | Returns the name of a tracked layer at the given zero-based index. Use with CountTrackedLayers in a Repeat loop to iterate all tracked layers. | string | Index *(number)* <br> | 
| LastChangedLayer | Returns the name of the layer whose state most recently changed. Use inside state-changed triggers to know which layer fired the event. Polled by companion addons to follow the active screen. | string |  | 
| LastChangedState | Returns the new state of the most recently changed layer. Use inside state-changed triggers to react differently to 'hidden' vs 'visible'. Polled by companion addons. | string |  | 
| LayerAnimDirection | Returns a layer's animation direction: 'opening', 'closing', or empty. Use to play different sounds based on whether a screen is coming in or going out. | string | Layer name *(string)* <br> | 
| LayerAnimProgress | Returns a layer's animation progress from 0 to 1 (0 if idle). Use to sync custom effects like fading music with a screen's transition. | number | Layer name *(string)* <br> | 


---
## Changelog

### Version 1.3.0.0

**Added:**
- Setup layer with transition action: register a layer and set its animation type, duration, easing and mirror-on-back in one step.
- Anchored Objects plugin property: choose whether Anchor-behavior objects move with the layer or stay in place during slide/scale (defaults to "Stay in place").
- Position-ownership handover: behaviors that drive their own position (Virtual Cursor, or any addon setting _ownsPosition) are suspended for the transition and restored after; Physics is never touched.
- Watchdog for companion per-object animations (_playOpen/_playClose) that never report completion, so a transition can't hang forever.
- Savegame settle pass on afterload: instance transforms, layer opacity and collisions left mid-transition by a save are restored once instances exist.
- One-shot warnings for common setup mistakes: untracked layer, wrong role for Go to screen, "Return to" with no history, slide/scale with nothing to animate.
- version banner logged on load in Debug Mode.

**Changed:**
- Slide and scale now transform the objects on the layer (hierarchy children included, parent-first) instead of the layer itself.
- Fade scales each sublayer's own opacity instead of overwriting the group layer's.
- Property values are derived from the declaration list in config.caw.js instead of hardcoded indices, so adding or regrouping a property can't shift them.
- GoBack, CanGoBack, LastChangedLayer and LastChangedState are now exposed on the instance for companion addons (UIForge).
- Overshoot easings (Back Out, Elastic Out) fall back to Quartic Out for opacity so fades don't finish early and look frozen.
- Editor instance no longer tries to grey out Dim Opacity; its description states it only applies when Dim Layer is set.
- Shortened the Anchored Objects dropdown labels to "Move with layer" / "Stay in place".

**Fixed:**
- Slide did nothing on parallax 0,0 UI layers (it wrote layer.scrollX/scrollY, which C3 derives from the layout) and scale was a silent no-op (ILayer has no scale property).
- GROUP rows were assumed to occupy a value slot, shifting every property after a group header: duration read the easing index (0, instant) and Debug Mode read past the end.
- Combo params shipped capitalized initial values ("Screen", "Push", "Show") that matched no item key.
- Editor instance called SetPropertyEnabled/GetPropertyValue, which don't exist on the base class.
- Anchored objects fought slide/scale transitions instead of being held or moved deliberately.
- External movement mid-transition (Anchor re-homing, window resize) is now reconciled per frame instead of snapping or being overwritten.
---

### Version 1.2.0.0

**Changed:**
update compatibility layer with other UI addons.

---

### Version 1.1.2.0

**Added:**
- add support for FlourishCue Addon.

---

### Version 1.1.1.0

---

### Version 1.1.0.0

**Added:**
- more layer animations

---

### Version 1.0.0.0

---

### Version 0.0.4.1

---

### Version 0.0.4.0

---

### Version 0.0.3.0

**Added:**
- (CountTrackedLayers GetTrackedLayerByIndex) expressions for iterating tracked layers in a Repeat loop
- "_combo(value, keys)" helper on the instance for safe index-to-string mapping of combo params
- Debug mode can be toggled.

**Changed:**
- Fix Layer visibility checks.
- fix Parent layering reliability.
- reduce per-frame overhead when no animations are running (stop ticking)

**Fixed:**
- Fix ACEs that were silently failing.
---

### Version 0.0.2.0

**Added:**
Collision Toggle Fix - Only Toggle Instances That Were Already Enabled

---

### Version 0.0.1.2

**Added:**
update Icon

---

### Version 0.0.1.1

**Added:**
Add Icon

---

### Version 0.0.1.0

**Added:**
Nested screens and normal Screens support

---

### Version 0.0.0.1

**Added:**
init Project

---

### Version 0.0.0.0

**Added:**
Initial release.

---
