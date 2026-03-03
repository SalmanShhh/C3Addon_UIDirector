<img src="./src/icon.svg" width="100" /><br>
# UIDirector
<i>Layer-based UI manager with focus stack, popup system, animations, modal control, and collision management. Track any layer as a named screen, popup, or tooltip - then open, close, and navigate between them with simple actions.</i> <br>
### Version 0.0.1.1

[<img src="https://placehold.co/200x50/4493f8/FFF?text=Download&font=montserrat" width="200"/>](https://github.com/SalmanShhh/C3Addon_UIDirector/releases/download/salmanshh_uidirector-0.0.1.1.c3addon/salmanshh_uidirector-0.0.1.1.c3addon)
<br>
<sub> [See all releases](https://github.com/SalmanShhh/C3Addon_UIDirector/releases) </sub> <br>

#### What's New in 0.0.1.1
**Added:**
Add Icon


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
| UI Container Layer | Name of the group layer in your layout that contains all managed UI sublayers. Example: if your group layer is called "UI", enter "UI" here. | text |
| Default Animation | The default transition animation played when showing or hiding a layer. Can be overridden per-layer with Set Layer Animation. | combo |
| Default Anim Duration (ms) | How long the default transition animation takes, in milliseconds. Example: 200 = a quick 0.2 second fade. | integer |
| Default Easing | The easing curve applied to the default animation. EaseOut feels snappy and responsive; EaseInOut feels smooth. | combo |
| Persist Across Layouts | If enabled, UIDirector remembers tracked layers and their states when the layout changes. Layer references are re-resolved on the new layout. | check |
| Debug Mode | If enabled, UIDirector logs all operations to the browser console (F12 -> Console). Useful during development - turn off before release. | check |
| Dim Layer | Optional. The name of a layer inside your UI container to use as a dim/scrim overlay. UIDirector will show this layer at the set opacity whenever a modal screen or popup is active, and hide it when none are. Leave blank to disable. | text |
| Dim Opacity | The opacity of the dim layer when it is active (0 = invisible, 1 = fully opaque). Default is 0.5 (50% semi-transparent). | percent |


---
## Actions
| Action | Description | Params
| --- | --- | --- |
| Close popup | Closes a popup. Use for dismiss or cancel buttons on dialogs. | Layer name             *(string)* <br> |
| Go back | Returns to the previous screen, like a Back button. Use for Escape key or back arrows. |  |
| Hide tooltip | Hides the current tooltip. Use when the mouse leaves a button or item. |  |
| Open popup | Opens a popup above the current screen. Use for confirmation dialogs, rewards, or alerts. | Layer name             *(string)* <br> |
| Setup popup layer | Registers a layer as a popup. Call once at the start for each popup layer like 'Confirm Quit' or 'Error Dialog'. | Layer name             *(string)* <br> |
| Setup screen layer | Registers a layer as a screen. Call once at the start for each UI screen like 'Main Menu' or 'Settings'. | Layer name             *(string)* <br> |
| Setup tooltip layer | Registers a layer as a tooltip. Call once at the start for each tooltip layer like 'Item Hint' or 'Button Description'. | Layer name             *(string)* <br> |
| Show screen | Navigates to a screen. The player can press Back to return. Use for menu buttons like 'Settings' or 'Inventory'. | Layer name             *(string)* <br> |
| Show tooltip | Shows a tooltip. Only one can be visible at a time. Use when the mouse hovers over a button or item. | Layer name             *(string)* <br> |
| Go back to first screen | Closes all screens and returns to the very first one. Use for a Home button that jumps straight back to the main menu. |  |
| Navigate to screen | Opens a screen and saves the current one in history so the player can go back. Use for navigating into sub-menus. | Layer name             *(string)* <br> |
| Navigate to screen with data | Stores data on a screen and opens it in one step. Use to pass info like an item ID before opening a detail screen. | Layer name             *(string)* <br>Key             *(string)* <br>Value             *(any)* <br> |
| Replace current screen | Swaps the current screen for a new one without saving history. The player cannot go back. Use for loading screens or login-to-menu transitions. | Layer name             *(string)* <br> |
| Return to previous screen | Closes the current screen and goes back to the previous one. Use for Back buttons in sub-menus. |  |
| Return to screen | Goes back to a specific screen, closing everything above it. Pass empty to close all. Use for jumping to the main menu from deep sub-menus. | Layer name             *(string)* <br> |
| Reset layer timescale | Removes all speed overrides set by Set layer timescale. Objects on the layer return to normal game speed, the stored runtime timescale is cleared (won't apply on next open), and if this layer is currently affecting game speed, that is restored immediately. | Layer name             *(string)* <br> |
| Set layer animation | Sets the animation type, speed, easing, and mirror direction for a layer. Use to customize how each screen slides or fades in and out. | Layer name             *(string)* <br>Animation type             *(combo)* <br>Duration (ms)             *(number)* <br>Easing             *(combo)* <br>Mirror close direction             *(boolean)* <br> |
| Set layer blocks other screens | Sets whether a screen disables all other screens when active. Use to make fullscreen menus block input behind them. | Layer name             *(string)* <br>Blocks others             *(boolean)* <br> |
| Set layer data | Stores a value on a layer by key name. Use to pass data like an item ID to a detail screen before showing it. | Layer name             *(string)* <br>Key             *(string)* <br>Value             *(string)* <br> |
| Set layer input enabled | Manually turns a layer's input on or off. Use to temporarily disable buttons during an animation or loading. | Layer name             *(string)* <br>Enabled             *(boolean)* <br> |
| Set layer state | Changes a layer to visible, hidden, or disabled with an animation. Use to show or hide HUD elements or grey out a panel. | Layer name             *(string)* <br>State             *(combo)* <br> |
| Set layer timescale | Sets the playback speed of a tracked layer. Instance timescale changes the speed of every object on the layer right now (1 = normal, 0 = frozen, -1 = no change). Runtime timescale is stored and auto-applied to the whole game when this layer opens, then restored when it closes (-1 = off). Tip: instance 1 + runtime 0 keeps the menu animated while the game freezes behind it. | Layer name             *(string)* <br>Instance timescale             *(number)* <br>Runtime timescale             *(number)* <br> |
| Sync collisions to layer state | Auto-disables collision detection on hidden layers. Use to prevent invisible UI buttons from blocking game clicks. | Layer name             *(string)* <br>Enabled             *(boolean)* <br> |
| Close all popups | Closes every open popup at once. Use when switching scenes or clearing all dialogs. |  |
| Hide popup | Closes a specific popup with its closing animation. Use for Cancel or Close buttons on dialogs. | Layer name             *(string)* <br> |
| Show popup | Opens a popup above all screens. Multiple popups can stack. Use for confirmation dialogs, reward banners, or error messages. | Layer name             *(string)* <br> |
| Show popup for duration | Opens a popup that auto-closes after a timer. Use for toast notifications like 'Game Saved' or 'Achievement Unlocked'. | Layer name             *(string)* <br>Duration (ms)             *(number)* <br> |
| Hide active tooltip | Hides whatever tooltip is showing. Safe to call when none is visible. Use on mouse-leave events. |  |
| Hide tooltip | Hides a specific tooltip by name. Use when the mouse leaves a specific item. | Layer name             *(string)* <br> |
| Show tooltip | Shows a tooltip. Only one can show at a time — the previous one hides automatically. Use when hovering over items or buttons. | Layer name             *(string)* <br> |
| Track layer | Registers a layer so UIDirector can control it. Call once per layer at the start. Choose its role (screen, popup, or tooltip) and options like blocking input or syncing collisions. | Layer name             *(string)* <br>Role             *(combo)* <br>Modal             *(boolean)* <br>Manage collisions             *(boolean)* <br> |
| Untrack all layers | Removes all layers from UIDirector and clears all stacks. Use when changing layouts or doing a full UI reset. |  |
| Untrack layer | Removes a layer from UIDirector. It keeps its current look but UIDirector stops managing it. Use before destroying a layer. | Layer name             *(string)* <br> |
| Finish animation instantly | Skips a layer's current animation and jumps to the end. Use for skip buttons or when you need a screen ready immediately. | Layer name             *(string)* <br> |
| Skip all animations | Skips every layer's animation at once and jumps to their final states. Use for accessibility options or low-performance devices. |  |


---
## Conditions
| Condition | Description | Params
| --- | --- | --- |
| Can go back | True when there is a previous screen to go back to. Use to show or hide a Back button. |  |
| On popup closed | Triggers when a popup closes. Use to check the player's choice after a confirmation dialog. | Layer name *(string)* <br> |
| On popup opened | Triggers when a popup opens. Use to play a sound or dim the background. | Layer name *(string)* <br> |
| On screen hidden | Triggers when a screen is closed. Use to resume music or clean up after leaving a screen. | Layer name *(string)* <br> |
| On screen shown | Triggers when a screen becomes active. Use to play a sound or start an intro animation. | Layer name *(string)* <br> |
| No screens are open | True when no screens are open. Use to detect when the player has backed out of all menus. |  |
| Screen is the active screen | True if a screen is the currently active one. Use to show buttons that only appear on a specific screen. | Layer name *(string)* <br> |
| Screen is in navigation history | True if a screen is anywhere in the navigation history. Use to prevent navigating to a screen that is already open. | Layer name *(string)* <br> |
| Layer accepts input | True if the layer currently accepts clicks and touches. Use to guard button logic so it only runs when the layer is interactive. | Layer name *(string)* <br> |
| Layer blocks other screens | True if this screen blocks input on all other screens when active. Use to check if a dimmed overlay should appear. | Layer name *(string)* <br> |
| Layer is animating | True while a layer is playing its transition animation. Use to disable buttons until the screen finishes sliding in. | Layer name *(string)* <br> |
| Layer is fully open | True when a layer is fully open and done animating. Use to only allow button clicks once a screen has completely appeared. | Layer name *(string)* <br> |
| Layer is in state | True if a layer matches a given state (visible, hidden, disabled, focused). Use to check a layer's current state before acting on it. | Layer name *(string)* <br>State *(combo)* <br> |
| Layer is visible | True if the layer is on screen (includes disabled layers). Use to check if a HUD or panel is currently showing. | Layer name *(string)* <br> |
| Layer syncs collisions | True if collision syncing is turned on for this layer. Use to verify collision management is active. | Layer name *(string)* <br> |
| Any popup is visible | True when at least one popup is open. Use to dim the background or block input while a dialog is showing. |  |
| A tooltip is visible | True when a tooltip is currently showing. Use to suppress other hover effects while a tooltip is up. |  |
| Layer is tracked | True if UIDirector is managing this layer. Use as a safety check before calling other actions on it. | Layer name *(string)* <br> |
| On any layer state changed | Triggers whenever any layer changes state. Use with LastChangedLayer and LastChangedState for debug logging or global UI tracking. |  |
| On layer closing | Triggers when a layer starts its closing animation. Use to fade out music or start a parallel exit effect. | Layer name *(string)* <br> |
| On layer fully closed | Triggers after a layer finishes closing. Use to clean up or stop timers once a screen is fully gone. | Layer name *(string)* <br> |
| On layer fully opened | Triggers after a layer finishes opening. Use to enable buttons or start gameplay once a screen is fully visible. | Layer name *(string)* <br> |
| On layer opening | Triggers when a layer starts its opening animation. Use to start music or prepare content while the screen slides in. | Layer name *(string)* <br> |
| On layer state changed | Triggers after a specific layer finishes changing state. Use to run logic that depends on the final state, like showing a retry button after Game Over appears. | Layer name *(string)* <br> |
| On layer transition complete | Triggers when a layer's animation finishes (open or close). Use to enable buttons only after the screen has fully animated in. | Layer name *(string)* <br> |


---
## Expressions
| Expression | Description | Return Type | Params
| --- | --- | --- | --- |
| CurrentScreen | Returns the name of the active screen, or empty if none. Use for debug displays or screen-specific logic. | string |  | 
| FocusedLayer | Returns the name of the active screen, or empty if none. Use for conditional logic based on which screen is showing. | string |  | 
| FocusStackDepth | How many screens deep the player is. 0 = none, 1 = one screen, 2+ = deeper. Use for breadcrumbs or depth indicators. | number |  | 
| PreviousScreen | Returns the name of the screen before the current one. Use for breadcrumbs or 'Back to X' button labels. | string |  | 
| ScreenAtDepth | Returns the screen name at a specific position in history. 1 = first, 2 = second. Use for building breadcrumb trails. | string | Depth *(number)* <br> | 
| LayerData | Returns a stored value from a layer by key. Use to read data like an item ID that was set before the screen opened. | string | Layer name *(string)* <br>Key *(string)* <br> | 
| LayerRole | Returns a layer's role: 'normal', 'popup', or 'tooltip'. Use for debug displays. | string | Layer name *(string)* <br> | 
| LayerState | Returns a layer's current state: 'visible', 'hidden', 'disabled', or 'focused'. Use for debug displays or conditional logic. | string | Layer name *(string)* <br> | 
| PreviousLayerState | Returns the state a layer was in before its last change. Use to restore a layer after a temporary change. | string | Layer name *(string)* <br> | 
| TopPopup | Returns the name of the topmost open popup, or empty if none. Use to check which dialog the player is looking at. | string |  | 
| ActiveTooltip | Returns the name of the visible tooltip, or empty if none. Use for custom logic based on which tooltip is showing. | string |  | 
| LastChangedLayer | Returns which layer most recently changed state. Use inside state-changed triggers to know which layer fired the event. | string |  | 
| LastChangedState | Returns the new state of the most recently changed layer. Use inside state-changed triggers to react differently to 'hidden' vs 'visible'. | string |  | 
| LayerAnimDirection | Returns 'opening', 'closing', or empty. Use to play different sounds based on whether a screen is coming in or going out. | string | Layer name *(string)* <br> | 
| LayerAnimProgress | Returns the animation progress from 0 to 1. Use to sync custom effects like fading music with a screen's transition. | number | Layer name *(string)* <br> | 


---
## Changelog

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
