# Construct Addon Wizard (CAW) Framework

This is a build framework for creating Construct 3 addons (plugins and behaviors). It handles code bundling, ACE (Actions, Conditions, Expressions) generation, localization, and packaging.

## Critical Rules

**DO NOT MODIFY FILES IN THE `build/` OR `template/` FOLDERS** - These contain the build system internals and modifying them will likely break the addon build process.

**CHECK FOR DEV SERVER BEFORE BUILDING** - If the file `.dev-server-running` exists in the project root, the dev server is already running and will automatically rebuild when files change. You don't need to run `npm run build` to verify changes - just save the file and the dev server will rebuild and show any errors in its terminal output.

## Quick Commands

```bash
npm run build     # Build the addon for production
npm run dev       # Start dev server with hot reload
```

## Project Structure

```
config.caw.js         # Main addon configuration (ID, name, type, properties)
buildconfig.js        # Build system settings (cleanup, warnings, terser validation)
devConfig.js          # Dev server settings (port)
version.js            # Addon version number

src/
├── aces.js           # Alternative: Define ACEs in a single file
├── aces/             # ACE definitions (Actions, Conditions, Expressions)
│   └── [CategoryName]/
│       ├── a.ActionName.js      # Action (prefix: a. or act.)
│       ├── c.ConditionName.js   # Condition (prefix: c. or cnd.)
│       └── e.ExpressionName.js  # Expression (prefix: e. or exp.)
├── runtime/
│   ├── instance.js   # Runtime instance class
│   ├── plugin.js     # Runtime plugin class
│   └── type.js       # Runtime type class
├── editor/
│   ├── instance.js   # Editor instance class
│   └── type.js       # Editor type class
└── domside/
    └── index.js      # DOM-side script (if hasDomside: true)

build/                # DO NOT MODIFY - Build system internals
template/             # DO NOT MODIFY - Template files
```

## Key Files to Edit

### config.caw.js - Main Addon Configuration

```javascript
import {
  ADDON_TYPE,
  PLUGIN_TYPE,
  PROPERTY_TYPE,
  ADDON_CATEGORY,
} from "./template/enums.js";

export const addonType = ADDON_TYPE.PLUGIN; // or ADDON_TYPE.BEHAVIOR
export const type = PLUGIN_TYPE.OBJECT; // OBJECT, WORLD, or DOM
export const id = "my_addon"; // Unique addon ID (lowercase, underscores)
export const name = "My Addon"; // Display name
export const author = "Your Name";
export const description = "Addon description";
export const category = ADDON_CATEGORY.GENERAL;

export const properties = [
  {
    type: PROPERTY_TYPE.INTEGER,
    id: "myProperty",
    name: "My Property",
    desc: "Property description",
    options: {
      initialValue: 0,
    },
  },
];
```

### ACE File Structure

There are **three ways** to organize ACEs:

#### Method 1: Files in Category Folders (Recommended)

```
src/aces/
└── MyCategoryName/
    ├── a.MyAction.js      # Action
    ├── c.MyCondition.js   # Condition
    └── e.MyExpression.js  # Expression
```

File prefixes:

- Actions: `a.` or `act.`
- Conditions: `c.` or `cnd.`
- Expressions: `e.` or `exp.`

#### Method 2: Subfolders for Each Type

```
src/aces/
└── MyCategoryName/
    ├── actions/
    │   └── MyAction.js
    ├── conditions/
    │   └── MyCondition.js
    └── expressions/
        └── MyExpression.js
```

#### Method 3: Single File (src/aces.js)

```javascript
import { action, condition, expression } from "../template/aceDefine.js";

action(
  "CategoryName",
  "ActionId",
  {
    /* config */
  },
  function () {
    /* code */
  }
);
condition(
  "CategoryName",
  "ConditionId",
  {
    /* config */
  },
  function () {
    /* code */
  }
);
expression(
  "CategoryName",
  "ExpressionId",
  {
    /* config */
  },
  function () {
    /* code */
  }
);
```

## ACE Configuration Examples

### Action

```javascript
export const config = {
  listName: "Do Something", // Name in action list
  displayText: "Do something with {0}", // Text shown in event sheet ({0} = param)
  description: "Action description",
  isAsync: false, // Set true for async actions
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "param1",
      name: "Parameter",
      desc: "Parameter description",
      type: "string", // string, number, combo, object, etc.
      initialValue: '"default"',
    },
  ],
};

export const expose = true; // Expose to runtime instance

export default function (param1) {
  // 'this' is the runtime instance
  console.log(param1);
}
```

### Condition

```javascript
export const config = {
  listName: "Is Something",
  displayText: "Is something {0}",
  description: "Condition description",
  isTrigger: false, // Set true for trigger conditions
  isInvertible: true,
  params: [],
};

export const expose = true;

export default function () {
  return true; // Must return boolean
}
```

### Expression

```javascript
export const config = {
  returnType: "number", // number, string, or any
  description: "Expression description",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return 42;
}
```

## Parameter Types

For actions/conditions:

- `string` - Text input
- `number` - Numeric input
- `combo` - Dropdown (requires `items` array)
- `object` - Object picker
- `layer` - Layer picker
- `layout` - Layout picker
- `keyb` - Keyboard key picker
- `boolean` - Checkbox
- `any` - Any expression

For expressions:

- `string`, `number`, `any`

### Combo Parameter Example

```javascript
{
  id: "myCombo",
  name: "Option",
  desc: "Select an option",
  type: "combo",
  initialValue: "option1",
  items: [
    { option1: "First Option" },
    { option2: "Second Option" },
  ],
}
```

## Runtime Instance Methods

In `src/runtime/instance.js`, you can:

```javascript
export default function (parentClass) {
  return class extends parentClass {
    constructor() {
      super();
      this._setTicking(true);  // enable _tick() every frame
      const properties = this._getInitProperties();
      // Access properties by index (matches declaration order in config.caw.js)
      // NOTE: this.runtime is NOT available here — use onCreate() for that
    }

    // Called after full creation — this.runtime is available here
    onCreate() {
      const layer = this.runtime.layout.getLayer("MyLayer");
    }

    // Called every frame (enabled by _setTicking(true) in constructor)
    // _tick() receives NO parameters — get dt from this.runtime.dt (seconds)
    _tick() {
      const dt = this.runtime.dt;
      this._myTimer += dt;
    }

    // Called when the instance is destroyed — always call super._release()
    _release() {
      super._release();
    }

    // Trigger a condition — CAW pattern (dispatch + super._trigger)
    // Define this in instance.js; call this._trigger("MethodName") from your code
    _trigger(method) {
      this.dispatch(method);
      super._trigger(self.C3.Plugins[id].Cnds[method]);
    }

    // Save/load for savegames
    _saveToJson() {
      return { myData: this.myData };
    }

    _loadFromJson(o) {
      this.myData = o.myData;
    }
  };
}
```

## Property Types

```javascript
PROPERTY_TYPE.INTEGER; // Whole number
PROPERTY_TYPE.FLOAT; // Decimal number
PROPERTY_TYPE.PERCENT; // 0-1 range shown as 0-100%
PROPERTY_TYPE.TEXT; // Single line text
PROPERTY_TYPE.LONGTEXT; // Multi-line text
PROPERTY_TYPE.CHECK; // Boolean checkbox
PROPERTY_TYPE.COMBO; // Dropdown
PROPERTY_TYPE.COLOR; // Color picker [r, g, b] (0-1 range)
PROPERTY_TYPE.OBJECT; // Object reference
PROPERTY_TYPE.GROUP; // Property group header
PROPERTY_TYPE.FONT; // Font picker
PROPERTY_TYPE.LINK; // Clickable link
PROPERTY_TYPE.INFO; // Info display
```

## Layer API

A layer reference (`ILayer`) returned by `this.runtime.layout.getLayer("name")`.

```javascript
layer.visible      // boolean — get/set: shows/hides the layer
layer.interactive  // boolean — get/set: enables/disables input
layer.opacity      // number 0–1 — get/set: layer transparency
layer.scrollX      // number — horizontal scroll offset in px
layer.scrollY      // number — vertical scroll offset in px
layer.name         // string — layer name (read-only)

// Group layer children — check both, different C3 builds use different names
for (const sub of layer.subLayers?.() ?? layer.layers?.() ?? []) { ... }
for (const parent of layer.parentLayers()) { ... }  // walk up parent chain

// Z-order — feature-detect before calling, not available on all C3 builds
this.runtime.layout.moveLayerToIndex(layerRef, index);
```

## Build Configuration (buildconfig.js)

```javascript
export const cleanup = {
  keepExport: false, // Keep dist/export after build
  keepExportStep: false, // Keep intermediate files
  keepGenerated: false, // Keep generated folder
};

export const terserValidation = "error"; // "error", "warning", or "skip"
export const disableTips = false;
export const disableWarnings = false;
```

## Workflow

1. **Configure addon** in `config.caw.js`
2. **Create ACEs** in `src/aces/` folders
3. **Implement runtime logic** in `src/runtime/instance.js`
4. **Run dev server**: `npm run dev`
5. **Test in Construct 3** using the localhost URL shown
6. **Build for release**: `npm run build`
7. **Find output** at project root: `{id}-{version}.c3addon`

## Common Patterns

### Async Action

```javascript
export const config = {
  isAsync: true,
  // ...
};

export default async function () {
  await someAsyncOperation();
}
```

### Trigger Condition

```javascript
export const config = {
  isTrigger: true,
  // ...
};

export default function () {
  return true;
}

// In instance.js, call: this._trigger("ConditionMethodName");
```

### Debugger Support

Implement `_getDebuggerProperties()` on the instance class to expose live state in the C3 Debugger panel (F12 during preview). No config changes needed — C3 calls it automatically if it exists.

```javascript
_getDebuggerProperties() {
  const sections = [];

  sections.push({
    title: `$${this.type.name} — Summary`,  // behaviors: this.behaviorType.name
    properties: [
      { name: "$Active item", value: this._activeItem ?? "(none)" },
      { name: "$Total items", value: this._items.size },
      { name: "$Debug mode",  value: this._debug },
    ],
  });

  // Optional: one section per tracked item
  for (const item of this._items.values()) {
    sections.push({
      title: `$Item: ${item.id}`,
      properties: [
        { name: "$State", value: item.state },
      ],
    });
  }

  return sections;
}
```

- `value` can be string, number, or boolean
- Called every frame — keep it fast (no heavy computation)
- **Prefix ALL `title` and `name` strings with `$`** — C3 treats them as translation keys and logs an error every frame if they're missing from the translation file. The `$` prefix marks them as literal strings that skip lookup.
- **Do not add debugger strings to the translation file manually** — CAW overwrites it on every build. The `$` prefix is the only correct approach.

### Accessing Other Instances

```javascript
export default function () {
  const runtime = this.runtime;  // use this.runtime, NOT this._runtime
  for (const objType of runtime.objects) {
    for (const inst of objType.getAllInstances()) {
      inst.x; inst.y; inst.layer;
    }
  }
}
```

## Behavior-Specific Patterns

For **behaviors** (not plugins), `this` is the behavior, not the C3 object it is attached to.

```javascript
this           // the behavior runtime instance
this.instance  // the IWorldInstance the behavior is attached to
this.instance.runtime  // IRuntime — same as plugin's this.runtime
```

**`this.instance` is NULL in `constructor()`** — do not access it there. Use `_tick()` with a one-time init guard:

```javascript
_tick() {
  if (!this._initialized) {
    this._initialized = true;
    // safe to access this.instance here
  }
}
```

**`this.instance.behaviors` is an object, not an array** — `for...of` throws. Use `Object.values()`:

```javascript
for (const b of Object.values(this.instance.behaviors)) {
  if (b.behaviorType?.name === "Platform") { /* ... */ }
}
// Known C3 type names: "Platform", "Solid", "Jumpthru", "Physics", "Bullet", "Pathfinding"
```

**For shared state across all instances of a behavior**, use a module-scope `Map` (the SPOT pattern) — or better, use a separate `IsSingleGlobal: true` plugin when possible.

## Editor Instance

`src/editor/instance.js` — runs in the **editor** (not at game runtime). Used for reacting to property changes in the Properties Bar.

```javascript
export default function (instanceClass) {
  return class extends instanceClass {
    constructor(sdkType, inst) { super(sdkType, inst); }
    OnCreate() {}                    // instance created in editor layout
    OnPlacedInLayout() {}            // dragged from object panel onto layout
    OnPropertyChanged(id, value) {   // any property changed in Properties Bar
      if (id === "myProperty") { /* react */ }
    }
    Release() {}                     // instance deleted
  };
}
```

## Gotchas

1. **Property access in ACEs**: Use `this` to access the runtime instance, not `self`
2. **Expression returns**: Must match the declared `returnType`
3. **Combo initial values**: Must match one of the item keys, not display names
4. **File naming**: Use correct prefixes (`a.`, `c.`, `e.`) or folder structure
5. **Category names**: Folder names become category IDs (use underscores, not spaces)
6. **Version**: Edit `version.js` to update addon version
7. **`this.runtime` unavailable in `constructor()`**: Only plain data init is safe there. Use `onCreate()` for anything needing the runtime, layout, or layers.
8. **Expression params do not support `initialValue`**: Unlike action/condition params, expression params must not include `initialValue` — it causes a build error.
9. **Arrow functions in ACE exports break `this`**: Always use `function` keyword for `export default` — arrow functions lose the instance binding.
   ```javascript
   export default function (param) { this._do(param); }  // ✓
   export default (param) => { this._do(param); }        // ✗ — this is undefined
   ```
10. **`expose` flag**: Set `expose: true` on an ACE to copy its function onto the instance prototype (callable as `this.methodName()` from other ACEs). Use `expose: false` for ACEs that only run as event sheet actions.
11. **Combo ACE params at runtime are 0-based indices, not strings**: C3 passes combo params as numbers. `if (strategy === "balanced")` is always false. Map to a string first:
    ```javascript
    const s = ["balanced", "shortest", "safest"][strategy];
    if (s === "balanced") { ... }
    ```
    Property combos from `_getInitProperties()` are also 0-based indices — same pattern applies.
12. **Combo item keys must not contain hyphens**: `{ "one-way": "One-way" }` causes comparison failures at runtime. Use underscores: `{ one_way: "One-way" }`.
13. **Conditions and expressions share the ACE ID namespace**: A condition and expression with the same ID will collide — one silently overrides the other. Always use distinct IDs across both types.
