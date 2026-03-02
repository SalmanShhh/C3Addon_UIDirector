# Construct 3 Addon Development — Skills Reference

Practical knowledge for building C3 plugins and behaviors with the **CAW (Construct Addon Wizard)** framework. Covers the C3 SDK runtime API, CAW patterns, ACE authoring, and common gotchas drawn directly from real addon development.

---

## Table of Contents

1. [Project Structure (CAW)](#1-project-structure-caw)
2. [config.caw.js — Addon Configuration](#2-configcawjs--addon-configuration)
3. [Instance Lifecycle](#3-instance-lifecycle)
4. [The Runtime API (`this.runtime`)](#4-the-runtime-api-thisruntime)
5. [Layer API](#5-layer-api)
6. [Instance API (`this`)](#6-instance-api-this)
7. [ACE Authoring](#7-ace-authoring)
8. [Parameter Types Reference](#8-parameter-types-reference)
9. [Property Types Reference](#9-property-types-reference)
10. [Triggers and Conditions](#10-triggers-and-conditions)
11. [The C3 Global (`self.C3`)](#11-the-c3-global-selfc3)
12. [C3 Debugger Support](#12-c3-debugger-support)
13. [Editor Instance](#13-editor-instance)
14. [CAW Build & Dev Workflow](#14-caw-build--dev-workflow)
15. [Gotchas and Patterns](#15-gotchas-and-patterns)
16. [Behavior-Specific Patterns](#16-behavior-specific-patterns)
17. [Advanced Runtime Scripting API](#17-advanced-runtime-scripting-api)
18. [SPOT Pattern — Shared State Across Behavior Instances](#18-spot-pattern--shared-state-across-behavior-instances)

---

## 1. Project Structure (CAW)

```
config.caw.js       ← Addon identity, properties, plugin type flags
version.js          ← Version string only
buildconfig.js      ← Build system options (cleanup, terser, warnings)
devConfig.js        ← Dev server port

src/
├── runtime/
│   ├── instance.js ← Main runtime class (all logic lives here)
│   ├── plugin.js   ← Runtime plugin class (rarely touched)
│   └── type.js     ← Runtime type class (rarely touched)
├── editor/
│   ├── instance.js ← Editor-side instance (property change handlers)
│   └── type.js     ← Editor type class
├── aces/
│   └── CategoryName/
│       ├── a.ActionName.js      ← Action   (prefix: a. or act.)
│       ├── c.ConditionName.js   ← Condition (prefix: c. or cnd.)
│       └── e.ExpressionName.js  ← Expression (prefix: e. or exp.)
└── domside/
    └── index.js    ← DOM-side script (only if hasDomside: true)

template/           ← DO NOT MODIFY — CAW internals
build/              ← DO NOT MODIFY — Build system
```

**ACE category folders** — folder name becomes the category ID. Use underscores (`Focus_Stack`), not spaces. Override display names in `config.caw.js` via `aceCategories`.

**Three ACE organization methods** — file-per-ACE in category folders (recommended), subfolders (`actions/`, `conditions/`, `expressions/`), or a single `src/aces.js` file.

---

## 2. config.caw.js — Addon Configuration

### Addon identity

```js
export const addonType = ADDON_TYPE.PLUGIN;   // or BEHAVIOR
export const type      = PLUGIN_TYPE.OBJECT;  // OBJECT, WORLD, or DOM
export const id        = "author_addonname";  // lowercase + underscores, globally unique
export const name      = "Display Name";
export const author    = "AuthorName";
export const version   = _version;            // from version.js
```

### Plugin type flags (`info.Set`)

```js
export const info = {
  Set: {
    IsSingleGlobal:    true,   // Only one instance allowed (global plugins)
    CanBeBundled:      true,
    IsDeprecated:      false,

    // World plugins only:
    IsResizable:       false,
    IsRotatable:       false,
    HasImage:          false,
    SupportsZElevation: false,
    SupportsColor:     false,
    SupportsEffects:   false,

    // Behavior only:
    IsOnlyOneAllowed:  false,
  },
  AddCommonACEs: {
    Position:   false,  // Adds standard x/y/z ACEs
    Size:       false,
    Angle:      false,
    Appearance: false,
    ZOrder:     false,
  },
};
```

### ACE category display names

```js
export const aceCategories = {
  MyCategory:     "My Category",
  Focus_Stack:    "Focus Stack",
  Layer_State:    "Layer State",
};
```

### File dependencies

```js
export const files = {
  fileDependencies:       [],          // Local files bundled into the addon
  remoteFileDependencies: [],          // External scripts (must be https://)
  cordovaPluginReferences:[],
  cordovaResourceFiles:   [],
  extensionScript: { enabled: false }, // Native wrapper extension (.dll)
};
```

---

## 3. Instance Lifecycle

Methods called by C3 in order. All are defined on the class returned by `instance.js`.

### `constructor()`

Called very early. **`this.runtime` is NOT available yet.** Only use for pure data initialization (Maps, arrays, primitives). Never call `this.runtime`, `this._getProperty()`, or any layer API here.

```js
constructor() {
  super();
  this._myData = new Map();

  // Enable the _tick(dt) callback every frame
  this._setTicking(true);

  // Read initial properties — safe here
  const props = this._getInitProperties();
  this._props = {
    myProp: props[0],  // index matches declaration order in config.caw.js
  };
}
```

### `onCreate()`

Called after the instance is fully created. **`this.runtime` is available.** Use for everything that needs the runtime: resolving layers, restoring saved state.

```js
onCreate() {
  this._debug = this._getProperty("debugMode");

  // Access layout/layers
  const layer = this.runtime.layout.getLayer("MyLayer");
}
```

### `_tick()`

Called every frame when ticking is enabled. Enable it once in `constructor()` with `this._setTicking(true)`. This is the correct C3 SDK way to run per-frame logic — do not use `this.runtime.addEventListener("tick", ...)`.

Delta time is **not** passed as a parameter — read it from `this.runtime.dt` (seconds) inside the method.

```js
constructor() {
  super();
  this._setTicking(true);  // must be called in constructor to enable _tick
}

_tick() {
  const dt = this.runtime.dt;        // seconds since last frame
  this._myTimer += dt;
  this._tickAnimations(dt * 1000);   // convert to ms if your logic needs it
}
```

### `_release()`

Called when the instance is destroyed. Clean up event listeners. Always call `super._release()`.

```js
_release() {
  super._release();
  // cleanup...
}
```

### `_saveToJson()` / `_loadFromJson(o)`

Called by C3 for savegames and `persistAcrossLayouts`. Return a plain serializable object. Restore from `o` in `_loadFromJson`.

```js
_saveToJson() {
  return { myData: [...this._myData.entries()] };
}

_loadFromJson(o) {
  this._myData = new Map(o.myData ?? []);
}
```

---

## 4. The Runtime API (`this.runtime`)

Available from `onCreate()` onwards.

### Layout

```js
this.runtime.layout          // ILayout — the current layout
this.runtime.layout.name     // string — layout name
this.runtime.layout.width    // number — layout width in px
this.runtime.layout.height   // number
this.runtime.layout.getLayer("LayerName")         // ILayer | null
this.runtime.layout.moveLayerToIndex(ref, index)  // reorder layers (may not exist on older builds)
```

### Objects / Instances

```js
this.runtime.objects         // iterable of all IObjectType
this.runtime.objects.Sprite  // IObjectType for a specific object

// Addon SDK v2 naming: use 'instance' as the loop variable, not 'inst' or '_inst'
for (const objType of this.runtime.objects) {
  for (const instance of objType.getAllInstances()) {
    instance.x; instance.y; instance.layer; // IWorldInstance properties
    instance.timeScale = 1;                  // per-object timescale override
    instance.restoreTimeScale();             // revert to following global timescale
  }
}
```

### Timing

```js
this.runtime.dt         // Delta time in seconds (time since last frame) — read this inside _tick()
this.runtime.dt * 1000  // Delta time in milliseconds
```

### Events

```js
// Layout change events — use these when you need to react to layout transitions
this.runtime.addEventListener("beforelayout", () => {});  // layout about to change
this.runtime.addEventListener("afterlayout",  () => {});  // new layout started
```

> **Do not use `addEventListener("tick", ...)`** for per-frame logic. Use `_setTicking(true)` in `constructor()` and implement `_tick(dt)` instead — this is the correct C3 SDK approach.

---

## 5. Layer API

A layer reference (`ILayer`) returned by `runtime.layout.getLayer()`.

### Visibility and interactivity

```js
layer.visible     // boolean — get/set (shows/hides the layer)
layer.interactive // boolean — get/set (enables/disables input)
layer.opacity     // number 0–1 — get/set (layer transparency)
```

### Scroll position (used for slide animations)

```js
layer.scrollX  // number — horizontal scroll offset in px
layer.scrollY  // number — vertical scroll offset in px
```

### Identity

```js
layer.name     // string — layer name (read-only)
```

### Group layer children (for group/container layers)

```js
// Iterate direct sublayers
for (const sub of layer.subLayers()) { ... }   // preferred
for (const sub of layer.layers()) { ... }       // fallback on some builds

// Walk up parent chain
for (const parent of layer.parentLayers()) { ... }
```

### Moving layers (Z-order)

```js
// Try runtime-level first, fallback to container-level
this.runtime.layout.moveLayerToIndex(layerRef, index);
containerRef.moveLayerToIndex(layerRef, index);
```

> **Note:** `moveLayerToIndex` may not exist on older C3 builds. Always feature-detect with `typeof ... === "function"` before calling.

---

## 6. Instance API (`this`)

Methods available on the runtime instance (inherited from the SDK base class).

### Property access

```js
this._getInitProperties()  // returns array of initial property values (constructor only)
// Index corresponds to declaration order in config.caw.js properties array
```

### Triggering conditions

```js
// Fire a trigger condition
super._trigger(self.C3.Plugins["addon_id"].Cnds["ConditionMethodName"]);
```

### DOM-side communication (DOM plugins only)

```js
this._sendToDOM("message-id", data);
this._sendToDOMAsync("message-id", data);  // returns Promise
this._addDOMMessageHandler("reply-id", (data) => {});
```

---

## 7. ACE Authoring

### Action file (`a.ActionName.js`)

```js
export const config = {
  listName:    "Do something",          // shown in the action picker
  displayText: "Do {0} with {1}",       // shown in event sheet ({0} = first param)
  description: "What it does. Use for X.", // shown in tooltip — keep beginner-friendly
  isAsync:     false,
  highlight:   false,
  deprecated:  false,
  params: [
    {
      id:           "target",
      name:         "Target",
      desc:         "Param description.",
      type:         "string",          // see §8 for all types
      initialValue: '""',
    },
  ],
};

export const expose = true;  // true = method is copied onto the instance prototype

export default function (target) {
  // `this` is the runtime instance
  this._actDoSomething(target);
}
```

### Condition file (`c.ConditionName.js`)

```js
export const config = {
  listName:    "Is something true",
  displayText: "Is {0} true",
  description: "True when X. Use for Y.",
  isTrigger:   false,   // true = this is a trigger, not a polled condition
  isInvertible: true,   // false for triggers
  highlight:   false,
  deprecated:  false,
  params: [],
};

export const expose = false;

export default function () {
  return true; // must return boolean
}
```

### Trigger condition (conditions with `isTrigger: true`)

```js
export const config = {
  listName:    "On something happened",
  displayText: "On something happened",
  description: "Triggers when X. Use for Y.",
  isTrigger:   true,
  highlight:   false,
  deprecated:  false,
  params: [
    { id: "layerName", name: "Layer", desc: "The layer to watch.", type: "string", initialValue: '""' },
  ],
};

export default function (layerName) {
  return this._lastChangedLayer === layerName; // filter: only fire for the named layer
}

// To fire the trigger from instance.js:
// this._trigger("OnSomethingHappened");
```

### Expression file (`e.ExpressionName.js`)

```js
export const config = {
  returnType:  "string",  // "string", "number", or "any"
  description: "Returns X. Use for Y.",
  highlight:   false,
  deprecated:  false,
  params: [
    {
      id:   "layerName",
      name: "Layer name",
      desc: "The layer to query.",
      type: "string",
      // ⚠ DO NOT add initialValue to expression params — it is not supported
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._layers.get(layerName)?.state ?? "";
}
```

### `expose` flag

- `true` — the function is copied onto the instance prototype and can be called directly as `this.methodName()` from other ACEs
- `false` — the function exists only as the ACE handler; not accessible as a method

---

## 8. Parameter Types Reference

Used in ACE `params[].type`.

| Type | Description | Extra fields |
|---|---|---|
| `"string"` | Text input | `initialValue: '""'` |
| `"number"` | Numeric input | `initialValue: "0"` |
| `"any"` | Any expression (string or number) | `initialValue: '""'` |
| `"boolean"` | Checkbox | `initialValue: "false"` |
| `"combo"` | Dropdown | `initialValue: "key"`, `items: [{ key: "Label" }]` |
| `"object"` | Object picker | — |
| `"layer"` | Layer picker | — |
| `"layout"` | Layout picker | — |
| `"keyb"` | Keyboard key picker | — |

### Combo parameter example

```js
{
  id:           "animType",
  name:         "Animation",
  desc:         "The animation to play.",
  type:         "combo",
  initialValue: "fade",
  items: [
    { fade:       "Fade" },
    { slideLeft:  "Slide Left" },
    { slideRight: "Slide Right" },
    { none:       "None (instant)" },
  ],
}
```

> **Important:** `initialValue` for combo must match one of the item **keys** (not the display label).
> **Important:** Expression params do **not** support `initialValue` — omit it.

---

## 9. Property Types Reference

Used in `config.caw.js` `properties[]`. Each entry must have `type`, `id`, `name`, `desc`, and `options`.

| Type | Description | Key options |
|---|---|---|
| `PROPERTY_TYPE.TEXT` | Single-line text input | `initialValue: ""` |
| `PROPERTY_TYPE.LONGTEXT` | Multi-line text input | `initialValue: ""` |
| `PROPERTY_TYPE.INTEGER` | Whole number | `initialValue: 0`, `minValue`, `maxValue` |
| `PROPERTY_TYPE.FLOAT` | Decimal number | `initialValue: 0.0` |
| `PROPERTY_TYPE.PERCENT` | 0–1 stored, shown as 0–100% | `initialValue: 0.5` |
| `PROPERTY_TYPE.CHECK` | Boolean checkbox | `initialValue: false` |
| `PROPERTY_TYPE.COMBO` | Dropdown | `initialValue: "key"`, `items: [{ key: "Label" }]` |
| `PROPERTY_TYPE.COLOR` | Color picker | `initialValue: [r, g, b]` (0–1 each) |
| `PROPERTY_TYPE.OBJECT` | Object reference picker | — |
| `PROPERTY_TYPE.GROUP` | Group header (no value) | — |
| `PROPERTY_TYPE.FONT` | Font picker | — |
| `PROPERTY_TYPE.LINK` | Clickable link | `linkCallback`, `callbackType` |
| `PROPERTY_TYPE.INFO` | Read-only info text | — |

### Property declaration order is critical

`_getInitProperties()` returns properties as a plain array. Index 0 is the first declared property, index 1 is the second, and so on. Document the index mapping in a comment.

```js
// 0: myText  1: myNumber  2: myCheck
export const properties = [
  { type: PROPERTY_TYPE.TEXT,    id: "myText",   ... },
  { type: PROPERTY_TYPE.INTEGER, id: "myNumber", ... },
  { type: PROPERTY_TYPE.CHECK,   id: "myCheck",  ... },
];
```

---

## 10. Triggers and Conditions

### Firing a trigger from instance code

Use the CAW framework `_trigger()` helper (wraps `dispatch` + `super._trigger`):

```js
// In instance.js — after some event happens:
this._trigger("OnLayerStateChanged");
```

The string must exactly match the ACE method name (the function name used in the condition file's default export, or the generated method name from the file name).

### How C3 maps condition file names to method names

CAW generates a method name from the file name:
- `c.LayerIsAnimating.js` → method `LayerIsAnimating`
- `cnd.OnScreenShown.js` → method `OnScreenShown`

The method name passed to `_trigger()` or `super._trigger()` must match this exactly (case-sensitive).

### Trigger with a filter parameter

When a trigger has a param (e.g. a layer name), the condition function's return value acts as a filter — C3 only fires the event for listeners where the function returns `true`:

```js
export default function (layerName) {
  return this._lastChangedLayer === layerName;
}
```

Store the "current" value (`_lastChangedLayer`) before calling `_trigger()`.

### CAW _trigger helper (framework-specific)

```js
_trigger(method) {
  this.dispatch(method);                                         // CAW event system
  super._trigger(self.C3.Plugins[id].Cnds[method]);             // C3 native trigger
}
```

---

## 11. The C3 Global (`self.C3`)

At runtime everything lives under `self.C3`:

```js
self.C3.Plugins["addon_id"]          // plugin namespace
self.C3.Plugins["addon_id"].Cnds     // all condition functions (for triggers)
self.C3.Plugins["addon_id"].Acts     // all action functions
self.C3.Plugins["addon_id"].Exps     // all expression functions

self.C3.Behaviors["addon_id"]        // same but for behaviors
```

Use `AddonTypeMap[addonType]` (imported from `template/addonTypeMap.js`) to get the right key (`"Plugins"` or `"Behaviors"`) without hardcoding it.

---

## 12. C3 Debugger Support

Implement `_getDebuggerProperties()` on the instance class to expose live state in the C3 Debugger panel (F12 during preview).

```js
_getDebuggerProperties() {
  const sections = [];

  // Each section = one collapsible group in the panel
  sections.push({
    title: `$${this.type.name} — Summary`,   // plugins: this.type.name
    properties: [
      { name: "$Active item",  value: this._activeItem ?? "(none)" },
      { name: "$Total items",  value: this._items.size },
      { name: "$Debug mode",   value: this._debug },
    ],
  });

  // Per-item section
  for (const item of this._items.values()) {
    sections.push({
      title: `$Item: ${item.id}`,
      properties: [
        { name: "$State", value: item.state },
        { name: "$Value", value: item.value },
      ],
    });
  }

  return sections; // return the array of section objects
}
```

### Rules

- `title` — string shown as the section header
- `properties` — array of `{ name: string, value: any }`
- `value` can be a string, number, or boolean — C3 renders it automatically
- The method is called every frame by the debugger; keep it fast (no heavy computation)
- No setup needed in `config.caw.js` — C3 calls it automatically if it exists

### Translation strings — IMPORTANT

C3 treats every `title` and `name` string as a **translation key** and looks it up in the addon's translation file. If the key is missing, C3 logs an error every frame.

**Prefix all `title` and `name` strings with `$`** to mark them as literal strings that skip translation lookup:

```js
{ name: "$Active screen", value: ... }   // ✓ — literal string, no lookup, no error
{ name: "Active screen",  value: ... }   // ✗ — treated as a translation key, logs error if missing
```

**Do not add debugger strings to the translation file manually.** CAW regenerates the translation file on every build and will overwrite manual additions. The `$` prefix is the correct and only approach.

### Section title best practice

Use the addon's type name so the section title is always correct, regardless of how the user renames the object:

```js
// Plugins:
title: `$${this.type.name} — Summary`

// Behaviors:
title: `$${this.behaviorType.name} — Summary`
```

---

## 13. Editor Instance

`src/editor/instance.js` — runs in the **editor** (not at game runtime). Used for reacting to property changes in the Properties Bar.

```js
export default function (instanceClass) {
  return class extends instanceClass {
    constructor(sdkType, inst) {
      super(sdkType, inst);
    }

    // Called when the instance is created in the editor layout
    OnCreate() {}

    // Called when the instance is placed in the layout (drag from panel)
    OnPlacedInLayout() {}

    // Called when any property changes in the Properties Bar
    OnPropertyChanged(id, value) {
      if (id === "myProperty") {
        // React to the change
      }
    }

    // Called when the instance is deleted
    Release() {}
  };
}
```

---

## 14. CAW Build & Dev Workflow

### Commands

```bash
npm run dev    # Start dev server with hot reload. URL shown in terminal.
npm run build  # Production build → {id}-{version}.c3addon in project root
```

### Dev server

- When `.dev-server-running` exists in the project root, the server is already running
- The dev server rebuilds on every file save — do **not** run `npm run build` to check for errors; just save and watch the terminal
- Use the localhost URL in Construct 3 (File → New tab, paste the URL) to test live

### Build output

```
{id}-{version}.c3addon   ← final file to distribute
dist/                    ← intermediate build artifacts (auto-cleaned)
generated/               ← generated ACE files (auto-cleaned)
```

### buildconfig.js options

```js
export const cleanup = {
  keepExport:     false,  // Keep dist/export folder after build
  keepExportStep: false,  // Keep intermediate export step files
  keepGenerated:  false,  // Keep generated/ folder
};
export const terserValidation = "error";  // "error" | "warning" | "skip"
export const disableTips      = false;
export const disableWarnings  = false;
```

---

## 15. Gotchas and Patterns

### `this.runtime` is unavailable in `constructor()`

Use `onCreate()` for anything that needs the runtime, layout, or layers.

### Property index order is fixed

`_getInitProperties()` returns values by **position**, not by name. If you reorder properties in `config.caw.js`, update all index references in `constructor()`. Always document the mapping with a comment.

### Expression params do not support `initialValue`

Unlike action/condition params, expression params must **not** have `initialValue`. Including it causes a build warning or error.

### Combo `initialValue` must be the key, not the label

```js
items: [{ fade: "Fade" }, { slideLeft: "Slide Left" }]
initialValue: "fade"  // ✓ correct — the key
initialValue: "Fade"  // ✗ wrong — the display label
```

### Do not call C3 layer APIs on untrusted layer refs

Always null-check layer refs before reading `visible`, `interactive`, etc. Layer refs can be null if the named layer doesn't exist or hasn't been resolved yet.

```js
if (entry?.ref) {
  entry.ref.visible = false;
}
```

### `moveLayerToIndex` feature detection

Not all C3 builds expose this method. Always guard:

```js
if (typeof this.runtime.layout.moveLayerToIndex === "function") {
  this.runtime.layout.moveLayerToIndex(ref, index);
} else if (typeof this._containerRef.moveLayerToIndex === "function") {
  this._containerRef.moveLayerToIndex(ref, index);
}
```

### Triggers must set state before firing

Store the "current value" in an instance variable first, then call `_trigger()`. Condition filter functions read those variables when C3 evaluates listeners.

```js
this._lastChangedLayer = layerName;
this._lastChangedState = newState;
this._trigger("OnLayerStateChanged");
```

### `IsSingleGlobal: true` — one instance, global scope

When set, only one instance of the plugin can exist. There are no per-object instances. The plugin object is shared across the whole project. This is the right choice for manager-type plugins (UI systems, audio managers, save systems).

### `expose: true` copies the ACE function onto the instance prototype

This lets you call it directly from other ACEs via `this.myActionName()`. Use `expose: false` for ACEs that only need to run as event sheet actions — it keeps the prototype clean.

### Async actions

```js
export const config = { isAsync: true, ... };

export default async function () {
  await someAsyncOperation();
}
```

C3 will `await` the returned Promise before continuing to the next action in the event sheet.

### DOM-side plugins

When `hasDomside: true`, `src/domside/index.js` runs in the DOM context (separate from the C3 runtime sandbox). Use `this._sendToDOM()` / `this._addDOMMessageHandler()` to communicate between the two sides.

### Group layer iteration compatibility

Different C3 builds expose either `subLayers()` or `layers()` on group layer refs. Check for both:

```js
const iter = typeof layerRef.subLayers === "function"
  ? layerRef.subLayers()
  : typeof layerRef.layers === "function"
    ? layerRef.layers()
    : null;
```

### `this` context in ACE default exports

The `export default function` is called with `this` bound to the runtime instance. Arrow functions would lose this binding — always use `function` keyword:

```js
export default function (param) {  // ✓
  this._doSomething(param);
}

export default (param) => {        // ✗ — `this` is undefined
  this._doSomething(param);
}
```

---

## 16. Behavior-Specific Patterns

Behaviors differ from plugins in important ways. `this` in a behavior runtime instance is **the behavior**, not the C3 object it is attached to.

### `this` vs `this.instance`

```js
this           // the behavior runtime instance (ACE methods, _tick, _trigger, etc.)
this.instance  // the IWorldInstance the behavior is attached to (x, y, behaviors, width, height, etc.)
this.instance.runtime  // the IRuntime — same as C3's scripting runtime (available from onCreate() onwards)
```

### `this.instance` is NULL in the behavior `constructor()`

The attached instance is not wired up yet when the constructor runs. Accessing it will throw.

```js
constructor() {
  super();
  this._setTicking(true);
  // ✗ DO NOT: this.instance.x — throws, instance is null
  // ✗ DO NOT: this.instance.behaviors — throws
  // ✓ Safe: primitives, Maps, Arrays, _getInitProperties()
}

_tick() {
  if (!this._initialized) {
    this._initialized = true;
    // ✓ Safe to access this.instance here
    this._setup();
  }
}
```

### `this.instance.behaviors` is an object, not an array

It is keyed by the behavior's internal name string, **not** an iterable array. Attempting `for...of` throws `TypeError: not iterable`.

```js
// ✗ WRONG — throws TypeError
for (const b of this.instance.behaviors) { ... }

// ✓ CORRECT — iterate keys
for (const key of Object.keys(this.instance.behaviors)) {
  const b = this.instance.behaviors[key];
}

// ✓ CORRECT — values directly
for (const b of Object.values(this.instance.behaviors)) {
  if (b.behaviorType?.name === "Platform") { ... }
}
```

### Identifying behaviors by type name

C3 behavior type names are exact strings. Use `behaviorType.name` to identify them reliably without hardcoding the user's behavior key:

```js
// Known C3 behavior type names:
// "Platform", "Solid", "Jumpthru", "Physics", "Bullet", "Pathfinding"

function _findPlatformBehavior() {
  for (const b of Object.values(this.instance.behaviors)) {
    if (b.behaviorType?.name === "Platform") return b;
  }
  return null;
}
```

### Accessing Platform behavior properties from another behavior

```js
const plat = this._findPlatformBehavior();
if (plat) {
  const maxSpeed      = plat.maxSpeed;       // px/s
  const jumpStrength  = plat.jumpStrength;   // px/s
  const gravity       = plat.gravity;        // px/s²
  const isOnFloor     = plat.isOnFloor;
  const isJumping     = plat.isJumping;
  const isFalling     = plat.isFalling;
  plat.vectorX = 200;   // set horizontal velocity directly
  plat.vectorY = -400;  // set vertical velocity directly (negative = up)
}
```

### Combo ACE parameters are numeric indices at runtime

C3 passes combo parameters as a **0-based index number**, not the key string. The same applies whether the combo is in an action, condition, or expression.

```js
// In aces.js:
items: [{ balanced: "Balanced" }, { shortest: "Shortest" }, { safest: "Safest" }]
initialValue: "balanced"

// At runtime, the ACE function receives:  0  (not "balanced")

// ✗ WRONG — always false, value is a number
export default function (strategy) {
  if (strategy === "balanced") { ... }
}

// ✓ CORRECT — map index → key first
export default function (strategy) {
  const s = this._combo(strategy, ["balanced", "shortest", "safest"]);
  if (s === "balanced") { ... }
}
```

Add this helper to `instance.js`:

```js
_combo(value, keys) {
  return keys[value] ?? keys[0];
}
```

> **Note:** Property combos from `_getInitProperties()` also arrive as 0-based indices. Use the same mapping pattern: `const strategyMap = ["balanced", "shortest", "safest"]; const s = strategyMap[properties[6]];`

### Combo item keys must not contain hyphens

```js
// ✗ WRONG — value will NOT equal "one-way" at runtime (comparison always fails)
items: [{ "one-way": "One-way" }, { "two-way": "Two-way" }]

// ✓ CORRECT — underscore keys work correctly
items: [{ one_way: "One-way" }, { two_way: "Two-way" }]
```

### Conditions and expressions share the same ACE ID namespace

In CAW, condition and expression ACE IDs must be globally unique across both types. A condition named `IsAtPortal` blocks an expression also named `IsAtPortal` — one silently wins.

```js
// ✗ WRONG — namespace collision, one will override the other
condition("Portals", "IsAtPortal", { ... }, function() { return ...; });
expression("Portals", "IsAtPortal", { ... }, function() { return ...; });

// ✓ CORRECT — use distinct names
condition("Portals", "IsAtPortal",       { ... }, function() { return ...; });  // condition
expression("Portals", "PortalIsActive",  { ... }, function() { return ...; });  // expression
```

### Every `this.aceXxx()` call must have a matching method

If an ACE calls `this.aceDoSomething(x, y)` but `aceDoSomething` is not defined on the instance, it fails silently at runtime with no error. Always cross-check after editing `aces.js` and `instance.js` separately.

---

## 17. Advanced Runtime Scripting API

These APIs are accessible from within behavior/plugin code via `this.instance.runtime` (behaviors) or `this.runtime` (plugins). They match C3's scripting API (`IRuntime`).

### Spatial collision queries

```js
// Efficient broadphase query — returns instances overlapping a rect
// Much faster than getAllInstances() + manual distance checks
const candidates = this.instance.runtime.collisions.getCollisionCandidates(
  [objectTypeA, objectTypeB],   // array of IObjectType references
  { left: x, top: y, right: x + w, bottom: y + h }  // plain rect object or DOMRect
);

// May return duplicates — always deduplicate
const unique = new Set(candidates);
for (const inst of unique) {
  // inst is an IWorldInstance
}
```

### Detecting object capabilities at runtime

```js
// Is an instance a Tilemap? (tilemaps have getTileAt, regular sprites don't)
if (typeof inst.getTileAt === "function") {
  const tileId = inst.getTileAt(gx, gy);  // returns tile ID, -1 if empty
}

// Does an instance have a specific behavior enabled?
for (const b of Object.values(inst.behaviors)) {
  if (b.behaviorType?.name === "Solid" && b.isEnabled) {
    // this is an active solid object
  }
  if (b.behaviorType?.name === "Jumpthru" && b.isEnabled) {
    // this is an active one-way platform
  }
}
```

### Collision polygon vertices

```js
// Get the collision polygon for the current animation frame (normalized 0–1 coords)
const frame = inst.animation.currentFrame;
const count = frame.getPolyPointCount();

for (let i = 0; i < count; i++) {
  // Normalized → world space
  const wx = inst.x + (frame.getPolyPointX(i) - 0.5) * inst.width;
  const wy = inst.y + (frame.getPolyPointY(i) - 0.5) * inst.height;
}
```

> Polygon points are normalized to 0–1 relative to the sprite's bounding box. Multiply by `inst.width`/`inst.height` and offset by `inst.x`/`inst.y` (the instance origin, typically center) to get world-space coordinates. Useful for accurate obstacle rasterization instead of bounding-box fill.

### Getting an instance by UID

```js
const inst = this.instance.runtime.getInstanceByUid(uid);
if (inst === null) {
  // Instance was destroyed — remove from any tracking structures
}
```

### Layout and grid access

```js
this.instance.runtime.layout.width   // total layout pixel width
this.instance.runtime.layout.height  // total layout pixel height

// Iterating all instances of a known object type
for (const inst of this.instance.runtime.objects.MyObjectName.getAllInstances()) {
  inst.x; inst.y;
}
```

---

## 18. SPOT Pattern — Shared State Across Behavior Instances

> **This is a last-resort workaround, not a general pattern.** Before using it, ask whether a separate plugin with `IsSingleGlobal: true` would serve instead — that is the clean C3-native answer for singletons and avoids all of the complexity below.

Behaviors don't have true static class members in C3's module system. The **Shared Per-Object-Type (SPOT)** pattern uses a module-scope `Map` to simulate a singleton shared between all instances of the same behavior.

### When you actually need this

You only need SPOT when you simultaneously require **both** of the following:

1. **Per-instance behavior** — each object needs its own `_tick`, its own ACE context, its own runtime state (e.g. current path, movement phase, waypoints)
2. **Cross-instance shared data** — some expensive structure (a navigation graph, a physics world, a shared connection pool) that all instances of the same type should read from one copy rather than rebuild independently

If you only need a singleton and don't need per-instance `_tick` or per-instance ACE context, use `IsSingleGlobal: true` on a separate plugin. That gives you a proper C3-visible singleton with no workarounds, no stale-key handling, and no restart edge cases — at the cost of a second addon dependency for users.

The navigation graph in this addon is the archetypal SPOT use case: each character needs independent path and movement state, but rebuilding the entire walkability graph once per character would be wasteful. The graph is shared; the path is not.

### Basic structure

```js
// At the TOP of instance.js — module scope, outside the class
const _sharedManagers = new Map();  // keyed by layoutUID or objectTypeUID

export default function (parentClass) {
  return class extends parentClass {

    _getOrCreateManager() {
      const key = this.instance.runtime.layout.uid ?? "global";
      if (!_sharedManagers.has(key)) {
        _sharedManagers.set(key, {
          graph: null,
          nodes: [],
          initialized: false,
        });
      }
      return _sharedManagers.get(key);
    }

    _tick() {
      if (!this._initialized) {
        this._initialized = true;
        this._manager = this._getOrCreateManager();
        // First instance creates the shared data; later instances reuse it
        if (!this._manager.initialized) {
          this._manager.initialized = true;
          this._buildSharedGraph();
        }
      }
    }
  };
}
```

### Layout restart / scene reload

On layout restart, C3 destroys and recreates all instances. The module-scope `Map` persists (JS module is not reloaded). Stale keys must be detected and cleared:

```js
_getOrCreateManager() {
  const key = this.instance.runtime.layout.uid;
  const existing = _sharedManagers.get(key);
  if (existing && existing.layoutUID !== key) {
    // Stale entry from a previous run — purge it
    _sharedManagers.delete(key);
  }
  if (!_sharedManagers.has(key)) {
    _sharedManagers.set(key, { layoutUID: key, graph: null, initialized: false });
  }
  return _sharedManagers.get(key);
}
```

### When to use SPOT vs per-instance state

| Data | Where to store |
|---|---|
| Navigation graph, obstacle map, shared pathfinding data | Module-scope Map (SPOT) |
| Per-character path, current waypoint, movement state | Instance properties (`this._path`, etc.) |
| Debug settings that apply to all agents | Module-scope Map (SPOT) |
| Character-specific properties (speed overrides, target) | Instance properties |

### Prefer `IsSingleGlobal: true` when possible

For most shared-state needs (audio managers, save systems, UI controllers, game state), a separate plugin with `IsSingleGlobal: true` is the correct answer. It gives a proper C3-native singleton: one object on the layout, globally accessible ACEs, no module-scope Map, no stale-key detection, no restart edge cases.

```js
// config.caw.js of a manager plugin
export const info = {
  Set: { IsSingleGlobal: true }
};
```

Use SPOT only when you've ruled this out — typically because splitting into two addons would mean the behavior needs to reach back into the plugin for data on every tick, and the inter-addon lookup cost or coupling becomes its own problem.
