<img src="./src/icon.svg" width="100" /><br>
# UIDirector
<i>Layer-based UI manager with focus stack, popup system, animations, modal control, and collision management. Track any layer as a named screen, popup, or tooltip - then open, close, and navigate between them with simple actions.</i> <br>
### Version 0.0.0.1

[<img src="https://placehold.co/200x50/4493f8/FFF?text=Download&font=montserrat" width="200"/>](https://github.com/SalmanShhh/C3Addon_UIDirector/releases/download/salmanshh_uidirector-0.0.0.1.c3addon/salmanshh_uidirector-0.0.0.1.c3addon)
<br>
<sub> [See all releases](https://github.com/SalmanShhh/C3Addon_UIDirector/releases) </sub> <br>

#### What's New in 0.0.0.1
**Added:**
init Project


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


---
## Actions
| Action | Description | Params
| --- | --- | --- |
| Close popup | Hide a popup window. The screen behind it regains input. Example: player clicks Cancel in a dialog -> ClosePopup("Confirm Quit"). | Layer name             *(string)* <br> |
| Go back | Return to the previous screen, like pressing a Back button. UIDirector automatically restores the previous screen's position and interactive state. Example: player presses Escape in Settings -> GoBack() returns them to the Main Menu. |  |
| Hide tooltip | Hide whichever tooltip is currently visible. Example: mouse leaves a button -> HideTip() dismisses the hint. |  |
| Open popup | Show a popup window above the current screen. The screen behind it remains visible but is blocked from input. Example: player clicks Quit -> OpenPopup("Confirm Quit"). Multiple popups can be open at once. | Layer name             *(string)* <br> |
| Setup popup layer | Register a layer as a popup. Popups appear above all screens and do not affect back-navigation. Example: setup 'Confirm Quit', 'Error Dialog', or 'Level Complete' as popups. | Layer name             *(string)* <br> |
| Setup screen layer | Register a layer as a navigable screen. Call this at layout start for every UI screen you want to manage. Example: setup 'Main Menu', 'Settings', and 'Game Over' as screens so you can show/hide them with ShowScreen and GoBack. | Layer name             *(string)* <br> |
| Setup tooltip layer | Register a layer as a tooltip. Tooltips are display-only (never interactive) and always render on top of everything. Only one tooltip can be visible at a time - showing a new one hides the previous. Example: setup 'Item Description', 'Hover Hint'. | Layer name             *(string)* <br> |
| Show screen | Navigate to a screen, pushing it on top of the current one. The player can return using GoBack. Example: player taps the Settings button -> ShowScreen("Settings"). | Layer name             *(string)* <br> |
| Show tooltip | Show a tooltip or hint to the player. Tooltips are display-only - they can never be clicked. Only one tooltip can be visible at a time; showing a new one automatically hides the previous. Example: mouse hovers over a sword icon -> ShowTip("Sword Info"). | Layer name             *(string)* <br> |
| Navigate to screen | Open a screen and make it the active one. The previous screen is kept in history so the player can return using 'Return to previous screen'. If set to block others, disables input on all other screens while active. Plays the opening animation. Example: navigate to a Settings screen on top of the Main Menu. | Layer name             *(string)* <br> |
| Return to previous screen | Close the current screen and return to the one before it. Restores the previous screen's original Z-position and interactive states exactly as they were. Plays the closing animation on the screen being dismissed. Example: the player presses Back in Settings -> returns them to Main Menu. |  |
| Return to screen | Close screens one by one until the specified screen is active. Pass an empty string to close all screens and clear the entire history. Example: from a deeply nested settings sub-page, use Return to screen "Main Menu" to jump directly back to the root without pressing Back multiple times. | Layer name             *(string)* <br> |
| Set layer animation | Override the default animation for a specific layer. Useful when different screens need different transitions. Example: make 'Game Over' slide in from the bottom (Slide Down, 400ms, EaseIn) while other screens use the default fade. | Layer name             *(string)* <br>Animation type             *(combo)* <br>Duration (ms)             *(number)* <br>Easing             *(combo)* <br> |
| Set layer blocks other screens | Change whether a screen blocks all other screens when it becomes active. When blocking is on, only this screen can receive input - all others become non-interactive. Takes effect on the next Navigate to screen call. Example: make 'Credits' non-blocking so the HUD remains interactive while it's shown. | Layer name             *(string)* <br>Blocks others             *(boolean)* <br> |
| Set layer data | Store an arbitrary string value on a tracked layer under a named key. Retrieve it later with the Layer Data expression. Example: before showing 'Item Detail', set its data "itemId" = "sword_01" so the screen knows what to display. | Layer name             *(string)* <br>Key             *(string)* <br>Value             *(string)* <br> |
| Set layer input enabled | Manually turn a layer's input on or off. UIDirector will not override this until the next state change. Use sparingly - prefer Set Layer State for normal state management. Example: temporarily disable a layer's buttons while an animation plays. | Layer name             *(string)* <br>Enabled             *(boolean)* <br> |
| Set layer state | Transition a tracked layer to a specific state, playing the configured animation. Visible = shown and interactive. Hidden = invisible and non-interactive. Disabled = visible but non-interactive (greyed-out effect). Example: set 'HUD' to Disabled while a cutscene plays. | Layer name             *(string)* <br>State             *(combo)* <br> |
| Sync collisions to layer state | Enable or disable automatic collision syncing for a layer. When on, every object on this layer automatically has its collision detection turned off whenever the layer is hidden or disabled - so objects on invisible screens can never be hit. Example: enable on 'Enemy Layer' to prevent hit detection while the pause menu is open. | Layer name             *(string)* <br>Enabled             *(boolean)* <br> |
| Hide popup | Hide a popup-role layer. Plays the closing animation. The screen behind it is unaffected. Example: dismiss the 'Confirm Quit' dialog when the player clicks Cancel. | Layer name             *(string)* <br> |
| Show popup | Show a popup-role layer above all normal screens. Popups do not push onto the focus stack - they are independent overlays. Multiple popups can be visible simultaneously. Plays the opening animation. Example: show a 'Level Complete' banner while the game world is still visible behind it. | Layer name             *(string)* <br> |
| Hide active tooltip | Hide whichever tooltip is currently visible, without needing to know its name. Safe to call even when no tooltip is visible. Example: on mouse-leave of any button -> HideActiveTooltip(). |  |
| Hide tooltip | Hide a specific tooltip-role layer. If it is the currently active tooltip, clears the active tooltip tracking. Example: hide 'Sword Description' when the player stops hovering over the sword. | Layer name             *(string)* <br> |
| Show tooltip | Show a tooltip-role layer. Tooltips are always display-only (interactive is always false) and render above everything else. Only one tooltip can be visible at a time - calling ShowTooltip when one is already visible will hide the previous one first. Example: show an item description panel when the player hovers over an inventory slot. | Layer name             *(string)* <br> |
| Track layer | Register a sublayer with UIDirector so it can be controlled by other actions. Call this once per layer at layout start. Role determines how the layer behaves: Normal = navigable screen, Popup = overlay above screens, Tooltip = display-only overlay. Modal = when focused, all other normal layers are made non-interactive. Manage collisions = collision detection mirrors the layer's interactive state. | Layer name             *(string)* <br>Role             *(combo)* <br>Modal             *(boolean)* <br>Manage collisions             *(boolean)* <br> |
| Untrack all layers | Remove all layers from UIDirector's tracking and clear all stacks. Does not modify any layer's visible/interactive state. Useful when changing layouts or resetting UI state completely. |  |
| Untrack layer | Remove a layer from UIDirector's tracking. UIDirector will no longer control it. Does not change the layer's current visible/interactive state. Example: untrack a layer before destroying it or handing control back to your own event sheet. | Layer name             *(string)* <br> |
| Finish animation instantly | Immediately snap a layer to the end of its current animation, skipping the visual transition. Use this to skip animations or apply the final state right away. Example: on a skip-cutscene button press, call Finish animation instantly for all layers to snap them to their final states. | Layer name             *(string)* <br> |
| Skip all animations | Immediately complete all currently in-progress layer transition animations. All animating layers snap to their final states. Example: call this when the player enters accessibility settings or on low-performance devices to disable all transitions at once. |  |


---
## Conditions
| Condition | Description | Params
| --- | --- | --- |
| Can go back | True when there is a previous screen to return to. Use this to show or hide a Back button. Example: if CanGoBack -> set Back button visible, else set it invisible. |  |
| On popup closed | Fires when a popup is hidden. Use this to react after a dialog is dismissed. Example: check if the player confirmed or cancelled after 'Confirm Quit' closes. | Layer name *(string)* <br> |
| On popup opened | Fires when a popup becomes visible. Use this to react when a dialog appears. Example: dim the background or play a sound when 'Confirm Quit' opens. | Layer name *(string)* <br> |
| On screen hidden | Fires when a screen is dismissed (popped from the focus stack). Use this to clean up or resume things after a screen closes. Example: resume game music when the 'Pause Menu' is dismissed. | Layer name *(string)* <br> |
| On screen shown | Fires when a screen becomes the active (focused) screen. Use this to react when the player navigates to a screen. Example: play a swoosh sound, start a timer, or animate in a character when 'Pause Menu' opens. | Layer name *(string)* <br> |
| No screens are open | True when no screens are currently open or active. Example: use this to show a first-launch screen, or to handle the case where the player has navigated all the way back to the root. |  |
| Screen is the active screen | True if the named screen is currently the topmost active screen. Example: only show the save button while 'Settings' is the active screen. | Layer name *(string)* <br> |
| Layer accepts input | True if the layer is currently accepting pointer and touch input. Note: this checks the live C3 layer value, not UIDirector's state. Example: use this to guard input handling - only process button clicks if the layer accepts input. | Layer name *(string)* <br> |
| Layer blocks other screens | True if this screen is set to block all others when it is active - meaning only it can receive input while open. Example: use to decide whether to show a dimmed overlay behind a dialog. | Layer name *(string)* <br> |
| Layer is animating | True while a transition animation is in progress on the layer. Layers are never interactive while animating. Example: disable a Back button while the current screen is still sliding in. | Layer name *(string)* <br> |
| Layer is in state | True if the named layer is currently in the given state. States: visible (shown + interactive), hidden (invisible), disabled (visible but not interactive), focused (focused on stack). Example: if 'Pause Menu' is in state visible -> show the Resume button. | Layer name *(string)* <br>State *(combo)* <br> |
| Layer is visible | True if the layer's visible property is currently enabled. Note: a Disabled-state layer is visible but not interactive - this condition returns true for it. Example: use to check if a HUD layer is currently showing. | Layer name *(string)* <br> |
| Layer syncs collisions | True if collision syncing is enabled for this layer. When enabled, objects on this layer automatically have collisions turned off whenever the layer is hidden or disabled. | Layer name *(string)* <br> |
| Any popup is visible | True when at least one popup-role layer is currently visible. Example: use to disable background interactions or show a dim overlay whenever any dialog is open. |  |
| A tooltip is visible | True when any tooltip-role layer is currently visible. Example: use to suppress other hover effects while a tooltip is already showing. |  |
| Layer is tracked | True if the named layer has been registered with UIDirector (via Track Layer or Setup Screen/Popup/Tooltip). Use this as a safety check before performing other actions on a layer. | Layer name *(string)* <br> |
| On any layer state changed | Fires after any tracked layer finishes transitioning to a new state. Use LastChangedLayer and LastChangedState expressions to know which layer changed and what state it moved to. Example: update a debug HUD whenever any UI state changes. |  |
| On layer closing | Fires at the start of a layer's closing animation - before the animation completes. Use this to begin a parallel exit sequence. Example: start fading out background music as 'Pause Menu' begins to close. | Layer name *(string)* <br> |
| On layer fully closed | Fires after a layer finishes its closing animation and is no longer the active screen. Example: stop a timer or clean up resources after 'Settings' finishes closing. | Layer name *(string)* <br> |
| On layer fully opened | Fires after a layer finishes its opening animation and is now fully visible as the active screen. Example: start a timer or begin an entrance sequence after 'Settings' finishes sliding in. | Layer name *(string)* <br> |
| On layer opening | Fires at the start of a layer's opening animation - before the animation completes. Use this to prepare content or start a parallel animation while the transition plays. Example: begin fading in background music as 'Main Menu' starts to slide in. | Layer name *(string)* <br> |
| On layer state changed | Fires after a tracked layer finishes transitioning to a new state (after the animation completes). Use this to run logic that depends on the final state of a layer. Example: after 'Game Over' becomes visible, show the retry button. | Layer name *(string)* <br> |
| On layer transition complete | Fires when a layer's animation (open or close) finishes and the layer is in its final state. Use this when you need to know the exact moment a transition ends. Example: enable a button only after the screen has fully finished animating in. | Layer name *(string)* <br> |


---
## Expressions
| Expression | Description | Return Type | Params
| --- | --- | --- | --- |
| CurrentScreen | The name of the screen the player is currently on. Returns an empty string if no screen is focused. Example: set a Text object to CurrentScreen() to display which screen is active in a debug HUD. | string |  | 
| FocusedLayer | The name of the layer currently at the top of the focus stack (the active screen). Returns an empty string if no layer is focused. Example: use to log the current screen name, or to run screen-specific logic without a chain of conditions. | string |  | 
| FocusStackDepth | The number of layers currently on the focus stack. 0 means no screens are active. 1 means one screen is focused. Higher values mean the player has navigated deeper into nested screens. Example: use to show a breadcrumb trail or depth indicator. | number |  | 
| LayerData | Retrieve a custom data value stored on a layer with Set Layer Data. Returns an empty string if the key does not exist. Example: LayerData("Item Detail", "itemId") returns the item ID that was stored before opening the screen. | string | Layer name *(string)* <br>Key *(string)* <br> | 
| LayerRole | The role of a tracked layer: "normal", "popup", or "tooltip". Returns an empty string if the layer is not tracked. Example: use to display the layer role in a debug overlay. | string | Layer name *(string)* <br> | 
| LayerState | The current state of a tracked layer: "visible", "hidden", "disabled", or "focused". Returns an empty string if the layer is not tracked. Example: use in a Text object to display the current state for debugging. | string | Layer name *(string)* <br> | 
| PreviousLayerState | The state a tracked layer was in before its most recent transition. Useful for implementing undo logic or restoring a layer after a temporary change. Example: if PreviousLayerState("HUD") = "visible" -> re-show the HUD after a cutscene. | string | Layer name *(string)* <br> | 
| TopPopup | The name of the most recently shown popup layer. Returns an empty string if no popups are visible. Example: use to determine which dialog the player is currently interacting with. | string |  | 
| ActiveTooltip | The name of the currently visible tooltip layer. Returns an empty string if no tooltip is showing. Example: use to log which tooltip is active or to apply custom logic for specific tooltips. | string |  | 
| LastChangedLayer | The name of the most recently changed layer. Available inside On Layer State Changed and On Any Layer State Changed triggers. Example: use LastChangedLayer in the On Any Layer State Changed trigger to log state changes for all screens in one event. | string |  | 
| LastChangedState | The state that the most recently changed layer transitioned to (e.g., "visible", "hidden", "disabled", "focused"). Use together with LastChangedLayer inside On Any Layer State Changed. Example: if LastChangedState = "hidden" -> play a dismiss sound. | string |  | 
| LayerAnimDirection | The current animation direction of a layer: "opening" while it is animating in, "closing" while animating out, or an empty string when not animating. Example: play a different sound effect depending on whether a screen is opening or closing. | string | Layer name *(string)* <br> | 
| LayerAnimProgress | The current animation progress of a layer, from 0 (start) to 1 (complete). Useful for driving custom visual effects in sync with a layer's transition. Example: set a custom overlay opacity to LayerAnimProgress("Settings") while it fades in. | number | Layer name *(string)* <br> | 


---
## Changelog

### Version 0.0.0.1

**Added:**
init Project

---

### Version 0.0.0.0

**Added:**
Initial release.

---
