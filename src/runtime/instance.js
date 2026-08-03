import { id, addonType, properties as PROPERTY_DEFS } from "../../config.caw.js";
import AddonTypeMap from "../../template/addonTypeMap.js";
import { PROPERTY_TYPE } from "../../template/enums.js";
import VERSION from "../../version.js";

// _getInitProperties() returns values BY POSITION, and layout-only rows (group headers, info
// rows, links) carry no value — so they are absent from that array and every property after a
// group header sits at a lower index than its declaration position. Hardcoding indices means a
// single added group silently shifts every value: the animation duration starts reading the
// easing index (0 → instant), Debug Mode reads past the end (undefined → no logging at all).
// Derive the mapping from the same declaration list instead, and pick whichever layout matches
// the array C3 actually handed us so this survives either SDK behaviour.
const VALUELESS_PROPERTY_TYPES = new Set([PROPERTY_TYPE.GROUP, PROPERTY_TYPE.INFO, PROPERTY_TYPE.LINK]);
const ALL_PROPERTY_IDS = PROPERTY_DEFS.map((p) => p.id);
const VALUE_PROPERTY_IDS = PROPERTY_DEFS.filter((p) => !VALUELESS_PROPERTY_TYPES.has(p.type)).map((p) => p.id);

// Keep combo mappings in one place so property parsing and ACE combo decoding stay aligned.
const ANIM_TYPE_KEYS = ["fade", "slideLeft", "slideRight", "slideUp", "slideDown", "none", "scaleDown", "scaleUp"];
const EASING_KEYS = ["linear", "easeIn", "easeOut", "easeInOut", "quadraticOut", "quarticOut", "exponentialOut", "circularOut", "backOut", "elasticOut", "bounceOut"];
const ANCHOR_MODE_KEYS = ["animate", "hold"];

// Animation tuning constants.
const SLIDE_BUFFER_PX = 100;
const SCALE_OPACITY_DURATION_MS = 300;

// These easings overshoot past 1 before settling. That reads well on scale and scroll, but
// opacity clamps at 1 — a fade with elasticOut reaches full opacity in a fraction of the
// requested duration and then sits there, which looks like no animation at all. Opacity-driven
// animations therefore substitute a non-overshoot curve.
const OVERSHOOT_EASINGS = new Set(["backOut", "elasticOut"]);
const OPACITY_EASING_FALLBACK = "quarticOut";

// Tolerance for "did something other than us move this instance". The comparison is against a
// value this plugin wrote itself from the same baseline, so with no interference the difference
// is float noise, not fractions of a pixel.
const REBASE_EPSILON_PX = 0.01;

// How far an instance must have been moved by something else before the transition hands it over.
// Anything smaller is rounding, not ownership.
const RELEASE_MIN_DEVIATION_PX = 0.5;

// How long to wait for a companion addon's per-object animation to report completion before
// assuming it never will. Generous: 10 seconds at 60fps, far longer than any UI transition.
const MOTION_WATCHDOG_FRAMES = 600;

// Never animated: writing x/y even once corrupts state that cannot be recovered. Physics is the
// only real member — its body position is authoritative and a write underneath the solver injects
// phantom velocity.
const NEVER_ANIMATE_BEHAVIORS = new Set(["Physics"]);

// Behaviours that may drive their instance's own position. These are NOT excluded up front:
// having Tween or Drag & Drop attached to a UI object is common, and an idle behaviour moves
// nothing, so pre-emptively skipping them means buttons that silently refuse to animate. The list
// is consulted only when an instance is actually seen to have moved on its own, to decide how to
// hand it back — see _reconcileExternalTransforms.
// Behaviours that pin or clamp their instance's position every tick from their own rules, so a
// transition can only fight them: it displaces the object, the behaviour drags it back, and the
// object ends up stuck against whatever bound the behaviour enforces. Excluded like Physics.
// Companion addons can opt in without being listed here by setting `_ownsPosition = true` on
// their behaviour instance — see _positionOwnerBehavior.
const POSITION_OWNER_BEHAVIORS = new Set([
  "Virtual Cursor", "VirtualCursor", "salmanshh_virtual_cursor",
]);

const MOVEMENT_BEHAVIORS = new Set([
  "Bullet", "Sine", "Physics", "Platform", "8Direction", "EightDirection", "Car",
  "MoveTo", "Pathfinding", "Custom Movement", "CustomMovement", "Rotate", "Orbit",
  "Drag & Drop", "DragDrop", "Tween",
]);

export default function (parentClass) {
  return class extends parentClass {
    // ─────────────────────────────────────────────────────────
    // Constructor - data structure init only.
    // Runtime/layout APIs (this.runtime) are NOT available yet.
    // ─────────────────────────────────────────────────────────
    constructor() {
      super();
      this.events = {};
      this._setTicking(true);

      // Cache properties by name, resolved positionally against the declaration list in
      // config.caw.js (see the mapping note at the top of this file).
      const raw = this._readInitProperties();

      // COMBO properties arrive as 0-based numeric indices — map to strings.
      this._props = {
        uiContainerLayer:     raw.uiContainerLayer,
        defaultAnimType:      ANIM_TYPE_KEYS[raw.defaultAnimType] ?? "fade",
        defaultAnimDuration:  raw.defaultAnimDuration,
        defaultAnimEasing:    EASING_KEYS[raw.defaultAnimEasing] ?? "easeOut",
        anchorMode:           ANCHOR_MODE_KEYS[raw.anchorMode] ?? "animate",
        dimLayer:             raw.dimLayer,
        dimOpacity:           raw.dimOpacity,
        persistAcrossLayouts: raw.persistAcrossLayouts,
        debugMode:            raw.debugMode,
      };

      // Data structures initialised here so they exist before onCreate() —
      // C3 may call ACE actions or tick before onCreate() fires.
      this._debug              = this._props.debugMode ?? false;
      this._layers             = new Map();
      this._focusStack         = [];
      this._popupStack         = [];
      this._activeTooltip      = null;
      this._animatingLayers    = new Set();
      this._lastChangedLayer   = "";
      this._lastChangedState   = "";
      this._lastFocusedLayer   = "";
      this._lastUnfocusedLayer = "";
      this._containerRef       = null;
      this._dimLayerRef        = null;
      this._lastViewport       = null;
      this._pendingSettle      = null;
    }

    // ─────────────────────────────────────────────────────────
    // onCreate - called by C3 after the instance is fully set up.
    // Safe to access this.runtime, layout, and layer APIs here.
    // ─────────────────────────────────────────────────────────
    onCreate() {
      // Unconditional, once per run, and deliberately not behind Debug Mode: it identifies which
      // build of the addon C3 actually loaded (C3 caches by id+version, so a stale install can
      // silently shadow a rebuild) and shows the properties as they were resolved. If this line
      // is absent from the console, the runtime code below never ran at all.
      console.log(
        `[UIDirector] v${VERSION} loaded — container:"${this._getProperty("uiContainerLayer")}" ` +
        `anim:${this._getProperty("defaultAnimType")}/${this._getProperty("defaultAnimDuration")}ms/` +
        `${this._getProperty("defaultAnimEasing")} anchored:${this._getProperty("anchorMode")} ` +
        `debug:${this._debug ? "on" : "off"}`
      );

      this._containerRef = this._resolveContainer();

      // Clear the cached dim layer ref on layout change so _resolveDimLayer()
      // fetches a fresh reference from the new layout (IsSingleGlobal stale-ref gotcha).
      this.runtime.addEventListener("beforelayout", () => {
        this._dimLayerRef = null;
      });

      // Fires after _loadFromJson() with every instance created, which is the only point where
      // getInstanceByUid() can resolve a savegame's instances. Guarded: C3 rejects unknown event
      // names, and an exception here would abort the rest of onCreate() — the savegame settle is
      // not worth losing container resolution or state restoration over.
      try {
        this.runtime.addEventListener("afterload", () => {
          this._settlePendingSettle(true);
        });
      } catch (e) {
        this._log(`Could not listen for "afterload" (${e?.message ?? e}) — savegame settling falls back to load time`);
      }

      if (this._getProperty("persistAcrossLayouts")) {
        const saved = globalThis.__uimanager_state;
        if (saved) this._loadFromJson(saved);
      }
    }

    // ─────────────────────────────────────────────────────────
    // CAW framework methods - PRESERVE, do not override below.
    // ─────────────────────────────────────────────────────────

    _trigger(method) {
      this.dispatch(method);
      super._trigger(self.C3[AddonTypeMap[addonType]][id].Cnds[method]);
    }

    on(tag, callback, options) {
      if (!this.events[tag]) {
        this.events[tag] = [];
      }
      this.events[tag].push({ callback, options });
    }

    off(tag, callback) {
      if (this.events[tag]) {
        this.events[tag] = this.events[tag].filter(
          (event) => event.callback !== callback
        );
      }
    }

    dispatch(tag) {
      if (this.events[tag]) {
        this.events[tag].forEach((event) => {
          if (event.options && event.options.params) {
            const fn = self.C3[AddonTypeMap[addonType]][id].Cnds[tag];
            if (fn && !fn.call(this, ...event.options.params)) {
              return;
            }
          }
          event.callback();
          if (event.options && event.options.once) {
            this.off(tag, event.callback);
          }
        });
      }
    }

    _release() {
      super._release();
    }

    // ─────────────────────────────────────────────────────────
    // Property helper
    // ─────────────────────────────────────────────────────────

    // Maps the positional array from _getInitProperties() onto property ids. Whichever
    // declaration layout matches the array length wins; a length that matches neither means
    // the mapping cannot be trusted, so it says so loudly instead of silently misreading
    // every value (which is indistinguishable from "the plugin does nothing").
    _readInitProperties() {
      const props = this._getInitProperties();
      if (!Array.isArray(props)) {
        console.warn(
          `[UIDirector] _getInitProperties() returned ${props === null ? "null" : typeof props} instead of an array — ` +
          `all plugin properties fall back to defaults (no debug logging, default animation).`
        );
        return {};
      }

      let ids = null;
      if (props.length === VALUE_PROPERTY_IDS.length) ids = VALUE_PROPERTY_IDS;
      else if (props.length === ALL_PROPERTY_IDS.length) ids = ALL_PROPERTY_IDS;

      if (!ids) {
        console.warn(
          `[UIDirector] property count mismatch: C3 passed ${props.length} values but config.caw.js declares ` +
          `${ALL_PROPERTY_IDS.length} properties (${VALUE_PROPERTY_IDS.length} with values). ` +
          `Property values cannot be mapped reliably — got [${props.join(", ")}].`
        );
        ids = VALUE_PROPERTY_IDS;
      }

      const raw = {};
      ids.forEach((pid, i) => { raw[pid] = props[i]; });
      return raw;
    }

    _getProperty(name) {
      return this._props[name];
    }

    _combo(value, keys) {
      return typeof value === "number" ? (keys[value] ?? keys[0]) : value;
    }

    // ─────────────────────────────────────────────────────────
    // Layer resolution helpers
    // ─────────────────────────────────────────────────────────

    _resolveContainer() {
      return this._getContainerRef();
    }

    // Always returns a fresh container reference from the current layout.
    // Use this instead of this._containerRef anywhere Z-order or sublayer iteration is needed.
    _getContainerRef() {
      const name = this._getProperty("uiContainerLayer");
      // Blank = search the whole layout, as the UI Container Layer property documents.
      if (name === null || name === undefined || String(name).trim() === "") {
        return this._getLayoutRootContainer();
      }
      const ref = this.runtime.layout.getLayer(name);
      if (!ref) {
        this._warnOnce(
          `container:${name}`,
          `UI container layer "${name}" does not exist on layout "${this.runtime.layout.name}". ` +
          `Set the UI Container Layer property to the name of your group layer, or clear it to search the whole layout.`
        );
        return null;
      }
      return ref;
    }

    // Container stand-in for "no container configured": the layout's own top-level layers.
    // Exposes just the shape the container helpers use (getLayer / subLayers / moveLayerToIndex).
    _getLayoutRootContainer() {
      const layout = this.runtime.layout;
      const self_ = this;
      return {
        _isLayoutRoot: true,
        name: layout.name,
        getLayer: (n) => layout.getLayer(n) ?? null,
        // No allSubLayers() on purpose — _resolveLayerInGroup then walks subLayers() recursively.
        subLayers: () => self_._getLayoutTopLevelLayers()[Symbol.iterator](),
        moveLayerToIndex: (ref, index) =>
          typeof layout.moveLayerToIndex === "function" ? layout.moveLayerToIndex(ref, index) : undefined,
      };
    }

    _getLayoutTopLevelLayers() {
      const layout = this.runtime.layout;
      // Preferred: ask the layout for every layer and keep the roots.
      if (typeof layout.getAllLayers === "function") {
        return layout.getAllLayers().filter((l) => !l.parentLayer);
      }
      if (typeof layout.layers === "function") {
        const all = [];
        for (const l of layout.layers()) if (!l.parentLayer) all.push(l);
        return all;
      }
      // Last resort: probe by index until getLayer() runs out.
      const byIndex = [];
      for (let i = 0; i < 1000; i++) {
        const l = layout.getLayer(i);
        if (!l) break;
        if (!l.parentLayer) byIndex.push(l);
      }
      if (byIndex.length === 0) {
        this._warnOnce(
          "layoutlayers",
          `Could not enumerate the layers of layout "${layout.name}" — set the UI Container Layer property to a group layer name instead of leaving it blank.`
        );
      }
      return byIndex;
    }

    _resolveLayer(name) {
      // Always resolve from the current layout — handles IsSingleGlobal layout changes
      // and avoids stale _containerRef references after a layout switch.
      const containerRef = this._getContainerRef();
      if (!containerRef) return null;

      // Option A: use getLayer() if available, but only accept non-null results.
      // getLayer() may only search direct children; fall through to recursive if it misses.
      if (typeof containerRef.getLayer === "function") {
        const ref = containerRef.getLayer(name);
        if (ref) return ref;
      }

      // Option B: recursive manual search through all descendants.
      return this._resolveLayerInGroup(name, containerRef);
    }

    _resolveLayerInGroup(name, groupRef) {
      // allSubLayers() iterates all descendants recursively — use it when available.
      if (typeof groupRef.allSubLayers === "function") {
        for (const layer of groupRef.allSubLayers()) {
          if (layer.name === name) return layer;
        }
        return null;
      }
      // Fallback: manual recursive descent via direct sublayers.
      for (const layer of this._getDirectSublayers(groupRef)) {
        if (layer.name === name) return layer;
        const found = this._resolveLayerInGroup(name, layer);
        if (found) return found;
      }
      return null;
    }

    _getEntry(name) {
      return this._layers.get(name) ?? null;
    }

    // ─────────────────────────────────────────────────────────
    // Dim layer helpers
    // ─────────────────────────────────────────────────────────

    _resolveDimLayer() {
      if (this._dimLayerRef) return this._dimLayerRef;
      const name = this._getProperty("dimLayer");
      if (!name || name === "") return null;
      const ref = this._resolveLayer(name);
      if (ref) {
        this._dimLayerRef = ref;
        ref.isVisible     = false;
        ref.isInteractive = false;
        ref.opacity     = 1;
      }
      return this._dimLayerRef ?? null;
    }

    _updateDimLayer() {
      const dimRef = this._resolveDimLayer();
      if (!dimRef) return;

      const hasPopup = this._popupStack.length > 0;
      const topFrame = this._focusStack.at(-1);
      const topEntry = topFrame ? this._getEntry(topFrame.layerName) : null;
      const hasFocusedModal = !!topEntry?.isModal;

      const shouldDim = hasPopup || hasFocusedModal;
      dimRef.isVisible  = shouldDim;
      dimRef.opacity  = shouldDim ? (this._getProperty("dimOpacity") ?? 0.5) : 1;
    }

    // ─────────────────────────────────────────────────────────
    // Group layer helpers
    // ─────────────────────────────────────────────────────────

    _getDirectSublayers(layerRef) {
      const subs = [];
      const iter = typeof layerRef.subLayers === "function"
        ? layerRef.subLayers()
        : typeof layerRef.layers === "function"
          ? layerRef.layers()
          : null;
      if (iter) for (const s of iter) subs.push(s);
      return subs;
    }

    _getAnimTargetLayers(layerRef) {
      const subs = this._getDirectSublayers(layerRef);
      return subs.length > 0 ? subs : [layerRef];
    }

    _getContainerDirectChild(layerRef) {
      // If this layer is already a direct child of the container, return it.
      if (this._getSublayerIndex(layerRef) !== -1) return layerRef;
      // Walk up parent chain - prefer parentLayer property (direct access), fall back to parentLayers() iterator.
      if (layerRef.parentLayer !== undefined) {
        let current = layerRef;
        while (current.parentLayer != null) {
          const parent = current.parentLayer;
          if (this._getSublayerIndex(parent) !== -1) return parent;
          current = parent;
        }
        return layerRef;
      }
      if (typeof layerRef.parentLayers === "function") {
        for (const parent of layerRef.parentLayers()) {
          if (this._getSublayerIndex(parent) !== -1) return parent;
        }
      }
      return layerRef; // fallback
    }

    // ─────────────────────────────────────────────────────────
    // Animation helpers
    // ─────────────────────────────────────────────────────────

    _mirrorAnimType(type) {
      switch (type) {
        case "slideLeft":  return "slideRight";
        case "slideRight": return "slideLeft";
        case "slideUp":    return "slideDown";
        case "slideDown":  return "slideUp";
        case "scaleDown":  return "scaleUp";
        case "scaleUp":    return "scaleDown";
        default:           return type;
      }
    }

    _getAnimConfig(entry) {
      return {
        type:     entry.animType     ?? this._getProperty("defaultAnimType"),
        duration: entry.animDuration ?? this._getProperty("defaultAnimDuration"),
        easing:   entry.animEasing   ?? this._getProperty("defaultAnimEasing"),
      };
    }

    _applyEasing(t, easing) {
      switch (easing) {
        case "easeIn":
          return t * t;
        case "easeOut":
        case "quadraticOut":
          return 1 - (1 - t) * (1 - t);
        case "easeInOut":
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        case "quarticOut":
          return 1 - Math.pow(1 - t, 4);
        case "exponentialOut":
          return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        case "circularOut":
          return Math.sqrt(1 - Math.pow(t - 1, 2));
        case "backOut": {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        }
        case "elasticOut": {
          if (t === 0 || t === 1) return t;
          const c4 = (2 * Math.PI) / 3;
          return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        }
        case "bounceOut": {
          const n1 = 7.5625;
          const d1 = 2.75;
          if (t < 1 / d1) return n1 * t * t;
          if (t < 2 / d1) {
            t -= 1.5 / d1;
            return n1 * t * t + 0.75;
          }
          if (t < 2.5 / d1) {
            t -= 2.25 / d1;
            return n1 * t * t + 0.9375;
          }
          t -= 2.625 / d1;
          return n1 * t * t + 0.984375;
        }
        default:          return t; // linear
      }
    }

    // Scale and scroll keep whatever easing was chosen; opacity gets a non-overshoot stand-in.
    _easingForType(type, easing) {
      if (type === "fade" && OVERSHOOT_EASINGS.has(easing)) return OPACITY_EASING_FALLBACK;
      return easing;
    }

    _getAnimValues(type, dir) {
      const w = this.runtime.layout.width;
      const h = this.runtime.layout.height;
      const sx = w + SLIDE_BUFFER_PX;
      const sy = h + SLIDE_BUFFER_PX;
      const opening = dir === "opening";
      switch (type) {
        case "fade":
          return opening ? { from: 0, to: 1 } : { from: 1, to: 0 };
        case "slideLeft":
          return opening ? { from: -sx, to: 0 } : { from: 0, to: -sx };
        case "slideRight":
          return opening ? { from: sx,  to: 0 } : { from: 0, to: sx };
        case "slideUp":
          return opening ? { from: -sy, to: 0 } : { from: 0, to: -sy };
        case "slideDown":
          return opening ? { from: sy,  to: 0 } : { from: 0, to: sy };
        case "scaleDown":
          return opening ? { from: 2, to: 1 } : { from: 1, to: 0.2 };
        case "scaleUp":
          return opening ? { from: 0.2, to: 1 } : { from: 1, to: 2 };
        default:
          return { from: 0, to: 0 };
      }
    }

    // C3 moves scene-graph children when their parent moves, and that happens inside the writes
    // below — so an instance this transition deliberately does not animate can still be dragged by
    // its animated parent. Snapshot those instances, let the writes happen, then put them back:
    // the propagation is undone within the same frame, so nothing ever renders displaced.
    // Their own behaviour is free to move them between frames; only the parent's delta is cancelled.
    _withPinnedInstances(entry, write) {
      const pinnedMap = entry.animPinned;
      if (!pinnedMap || pinnedMap.size === 0) return write();

      const canVerify = typeof this.runtime.getInstanceByUid === "function";
      const before = [];
      for (const [inst, rec] of pinnedMap) {
        if (canVerify && this.runtime.getInstanceByUid(rec.uid) !== inst) continue;
        before.push([inst, inst.x, inst.y, inst.width, inst.height]);
      }

      write();

      for (const [inst, x, y, w, h] of before) {
        inst.x = x;
        inst.y = y;
        if (typeof w === "number" && typeof inst.width  === "number") inst.width  = w;
        if (typeof h === "number" && typeof inst.height === "number") inst.height = h;
      }
    }

    _applyAnimValue(entry, type, value) {
      this._withPinnedInstances(entry, () => this._applyAnimValueInner(entry, type, value));
    }

    _applyAnimValueInner(entry, type, value) {
      switch (type) {
        case "fade":
          // Apply to the same target layers the slide path uses: a group layer's own opacity
          // does not reliably reach the content drawn on its sublayers, so fading only the
          // group root leaves everything inside it looking untouched. Scaled by each layer's
          // authored opacity so a layer built at 50% fades to 50%, not 100%. Clamped — C3 expects 0–1.
          this._applyLayerOpacityFraction(entry, value);
          break;
        case "slideLeft":
        case "slideRight":
          this._applyInstanceOffset(entry, value, 0);
          break;
        case "slideUp":
        case "slideDown":
          this._applyInstanceOffset(entry, 0, value);
          break;
        case "scaleDown":
        case "scaleUp":
          this._applyInstanceScale(entry, value);
          break;
      }
    }

    // Applies a 0–1 fraction of each target layer's authored opacity. Shared by the fade
    // tween and the short opacity tween that accompanies a scale.
    _applyLayerOpacityFraction(entry, fraction) {
      for (const l of this._getAnimTargetLayers(entry.ref)) {
        const base = entry.animBaseOpacities?.get(l) ?? 1;
        l.opacity = Math.min(1, Math.max(0, fraction * base));
      }
    }

    // ── Slide and scale move the OBJECTS on the layer, not the layer itself ──
    // A UI layer is normally parallax 0,0, where C3 derives the layer's scroll position from
    // the layout — writing layer.scrollX/scrollY moves nothing on screen. And ILayer has no
    // `scale` property at all, so scaling the layer was a no-op silently swallowed by its own
    // typeof guard. Both now transform the instances, which works on any layer setup.

    // EVERY instance is transformed, hierarchy children included, and always PARENT-FIRST
    // (candidates are depth-sorted below). C3 propagates a parent's move/resize to children per
    // their transformX/Y/Width/Height flags, which would double-apply - but because each write is
    // ABSOLUTE and a child is written after its parent, the child's own value simply overwrites
    // whatever propagation just did to it. Order is what makes this exact.
    //
    // Animating only the roots and leaving children to propagation is not enough: propagation
    // TRANSLATES a child by the parent's delta, so scaling a group about a pivot leaves the
    // children un-scaled, and a child of a parent that happens to sit on the pivot does not move
    // at all. Writing each instance's own target handles slide and scale identically.
    _captureInstanceTransforms(entry) {
      const candidates = [];
      for (const inst of this._getAllInstancesOnLayer(entry.ref)) {
        // Non-world instances (global plugins, etc.) have no position to animate.
        if (typeof inst.x !== "number" || typeof inst.y !== "number") continue;
        candidates.push(inst);
      }

      // Parents strictly before children: the apply order is what keeps propagation from
      // corrupting a child's value, and it settles whether a child's parent is animated.
      candidates.sort((a, b) => this._hierarchyDepth(a) - this._hierarchyDepth(b));

      // What can actually be seen on these objects. Every behaviour-based rule below depends on it,
      // and if behaviour detection fails they all silently do nothing — a clamped cursor then gets
      // treated as an ordinary sprite and ends up dragged against its constraint edge.
      let withBehaviorObject = 0;
      let behaviorsSeen = 0;
      const inventory = [];
      for (const inst of candidates) {
        if (inst.behaviors) withBehaviorObject++;
        const list = this._behaviorsOf(inst);
        behaviorsSeen += list.length;
        if (inventory.length < 12) {
          const names = list.map(([key, b]) => b.behaviorType?.name ?? key);
          inventory.push(`${this._describeInstance(inst)}[${names.join("|") || "none"}]`);
        }
      }
      this._log(`  behaviours visible: ${behaviorsSeen} across ${candidates.length} object(s) — ${inventory.join(", ")}`);
      if (withBehaviorObject > 0 && behaviorsSeen === 0) {
        this._warnOnce(
          "nobehaviors",
          `Could not read the behaviours of any object on "${entry.name}" even though ${withBehaviorObject} ` +
          `object(s) report having them. Anchor, Physics and cursor handling all depend on reading them, ` +
          `so those objects will be animated as if they had no behaviours at all.`
        );
      }

      const holdAnchored = this._getProperty("anchorMode") === "hold";
      const map = new Map();
      const heldByBehavior = new Set();
      const heldByAnchor = new Set();
      // Tracked apart from the "held" sets: these instances ARE animating, just under their own
      // behaviour rather than this transition, so they must not count as "nothing to animate".
      const selfAnimated = new Set();
      // Instances that must be held against parent-to-child propagation, not just left unwritten.
      const pinned = new Map();
      for (const inst of candidates) {
        // Self-animating (FlourishCue and friends) is checked first: those instances are driven
        // through _playOpen/_playClose by this very transition, and the barrier already waits for
        // them, so transforming them here would be two systems writing one object.
        const selfAnimating = this._selfAnimatingBehavior(inst);
        if (selfAnimating) {
          selfAnimated.add(`${this._describeInstance(inst)} (${selfAnimating.behaviorType?.name ?? "own open/close"})`);
          continue;
        }
        // Position owners ARE animated - they slide and scale with the layer and settle at their
        // resting position - but only when their clamp can actually be switched off for the
        // duration (see _suspendPositionOwners). An owner recognised only by NAME, with no
        // _ownsPosition flag to toggle, cannot be suspended: it would keep clamping, fight the
        // animation and end up parked against a constraint edge. Those are excluded instead, which
        // leaves them standing still rather than stuck in the wrong place.
        const owner = this._positionOwnerBehavior(inst);
        const unsuspendableOwner = owner && !this._canSuspendOwner(owner);
        const blocking = this._behaviorNameFrom(inst, NEVER_ANIMATE_BEHAVIORS) ??
          (unsuspendableOwner ? `${owner.behaviorType?.name ?? "position owner"}, cannot be suspended` : null);
        if (blocking) {
          heldByBehavior.add(`${this._describeInstance(inst)} (${blocking})`);
          // Not animating it is not enough: if an ancestor IS animated, C3 propagates that
          // ancestor's movement down and drags this instance along anyway - which for a clamped
          // cursor means being hauled off-screen and pinned against its constraint edge. Record
          // it so every frame's write can be undone for it (see _withPinnedInstances).
          if (this._hasAncestorIn(inst, map)) pinned.set(inst, { uid: inst.uid });
          continue;
        }
        // Anchored Objects = "Hold still": the transition leaves anchored instances alone so an
        // anchored panel acts as a static frame while its children animate against its live
        // position (see _originOf). On the default "Animate" setting they animate too, and
        // Anchor's re-home on a display-size change is folded into the baseline by
        // _syncExternalTransforms.
        if (holdAnchored && this._hasAnchorBehavior(inst)) {
          heldByAnchor.add(this._describeInstance(inst));
          if (this._hasAncestorIn(inst, map)) pinned.set(inst, { uid: inst.uid });
          continue;
        }
        const parent = typeof inst.getParent === "function" ? inst.getParent() : null;
        map.set(inst, this._makeTransformBase(inst, parent, map.has(parent)));
      }

      // Everything skipped is named: "why didn't that move?" has to be answerable from the log.
      this._log(
        `  ${map.size} of ${candidates.length} instance(s) animated` +
        (selfAnimated.size   > 0 ? `, animating themselves: ${[...selfAnimated].join(", ")}`        : "") +
        (heldByAnchor.size   > 0 ? `, held in place by Anchor: ${[...heldByAnchor].join(", ")}`     : "") +
        (heldByBehavior.size > 0 ? `, left to their behaviour: ${[...heldByBehavior].join(", ")}`   : "")
      );

      // A slide or scale with nothing to move looks exactly like a broken addon, and Debug Mode
      // is off by default — so this one warns unconditionally, with the reason.
      // Not a problem when the layer's objects animate themselves - that is the FlourishCue
      // division of labour, and warning about it would cry wolf on a correct setup.
      if (map.size === 0 && selfAnimated.size === 0) {
        const reason =
          candidates.length === 0
            ? `no objects were found on it or its sublayers`
            : `all ${candidates.length} object(s) on it were skipped` +
              (heldByAnchor.size   > 0 ? `; held by Anchor: ${[...heldByAnchor].join(", ")}`   : "") +
              (heldByBehavior.size > 0 ? `; held by behaviour: ${[...heldByBehavior].join(", ")}` : "");
        this._warnOnce(
          `noanim:${entry.name}`,
          `Slide/scale on "${entry.name}" has nothing to animate — ${reason}. ` +
          `The transition will run and finish but nothing will appear to move.`
        );
      }
      if (pinned.size > 0) {
        this._log(`  ${pinned.size} instance(s) pinned against their parent's movement`);
      }
      entry.animPinned = pinned;
      return map;
    }

    _describeInstance(inst) {
      return inst.objectType?.name ?? `uid ${inst.uid}`;
    }

    // A child of an instance that is NOT being animated (an anchored parent, typically) is
    // animated relative to that parent's LIVE position rather than to a position captured once.
    // Anchor can re-home the parent at any moment; deriving the origin every frame is what
    // makes the child track it in real time, with no baseline to go stale and no snap.
    // Per-axis, because a child with transformX/Y unticked is authored not to follow that axis.
    _makeTransformBase(inst, parent, parentAnimated) {
      const opts = parent && typeof inst.getHierarchyOpts === "function" ? inst.getHierarchyOpts() : null;
      const followX = !!(parent && opts?.transformX);
      const followY = !!(parent && opts?.transformY);
      return {
        uid: inst.uid,
        x: inst.x,
        y: inst.y,
        width: inst.width,
        height: inst.height,
        // A live parent origin is only correct when the parent is NOT itself being animated -
        // an anchored parent held still, typically. If the parent IS animated, its motion is
        // already in this instance's own absolute target and tracking it too would double up.
        parent: parent && !parentAnimated && (followX || followY) ? parent : null,
        parentUid: parent?.uid,
        relX: parent ? inst.x - parent.x : 0,
        relY: parent ? inst.y - parent.y : 0,
        followX,
        followY,
      };
    }

    // A behaviour that owns its instance's position outright - it writes the position every tick
    // from its own rules, so a transition can only fight it. Detected two ways: a duck-typed
    // opt-in any companion addon can set, and by name for known ones. Treated like Physics:
    // the instance is left alone entirely rather than being animated and yanked back.
    _positionOwnerBehavior(inst) {
      for (const [key, b] of this._behaviorsOf(inst)) {
        if (b.isEnabled === false) continue;
        if (b._ownsPosition === true || b._ownsInstancePosition === true) return b;
        const name = b.behaviorType?.name;
        if (POSITION_OWNER_BEHAVIORS.has(key) || (name && POSITION_OWNER_BEHAVIORS.has(name))) return b;
      }
      return null;
    }

    // Hands control to or from a position owner. Prefers the behaviour's own setter so any logic it
    // needs to run on a handover is not bypassed, and falls back to the flag for behaviours that
    // only expose the plain contract field.
    _setOwnerControl(b, owns) {
      if (typeof b._setPositionOwnership === "function") b._setPositionOwnership(owns);
      else b._ownsPosition = owns;
    }

    _canSuspendOwner(b) {
      return typeof b._setPositionOwnership === "function" || typeof b._ownsPosition === "boolean";
    }

    // Asks every position owner on this layer to stand down for the transition, and remembers
    // which ones to hand control back to.
    //
    // Leaving them alone is not sufficient. A clamping behaviour keeps its host inside a region,
    // and when that region is pinned to an object the transition is moving, the region moves too:
    // the behaviour then drags its host along and parks it against the edge. Behaviours tick
    // BEFORE the plugin, so that has already happened by the time this plugin writes anything and
    // no amount of correcting afterwards can prevent it. Suspending ownership stops the clamp for
    // the duration instead, which leaves the host exactly where it is.
    _suspendPositionOwners(layerRef) {
      const holdAnchored = this._getProperty("anchorMode") === "hold";
      const suspended = [];
      const names = new Set();

      for (const inst of this._getAllInstancesOnLayer(layerRef)) {
        for (const [key, b] of this._behaviorsOf(inst)) {
          // Cursor-style owners: they expose the contract flag, so ask them to stand down.
          if (b._ownsPosition === true) {
            this._setOwnerControl(b, false);
            suspended.push({ b, kind: "ownership" });
            names.add(b.behaviorType?.name ?? key);
            continue;
          }

          // Anchor re-asserts its instance's anchored position EVERY tick, not just on resize.
          // Left running it undoes each frame of the animation, so the anchored object never moves
          // — and worse, the parent oscillating between "anchored home" and "animated position"
          // leaks a full slide distance into its scene-graph children every frame, throwing them
          // thousands of pixels off. Disabling it for the duration is the only way to stop that at
          // source: pinning cannot help, because the behaviour writes outside our write phase.
          //
          // Not in "hold" mode, where anchored instances are deliberately left to Anchor.
          const isAnchor = key === "Anchor" || b.behaviorType?.name === "Anchor";
          if (isAnchor && !holdAnchored && b.isEnabled === true) {
            b.isEnabled = false;
            suspended.push({ b, kind: "enabled" });
            names.add("Anchor");
          }
        }
      }

      if (suspended.length > 0) {
        this._log(`  ${suspended.length} position-owning behaviour(s) suspended for the transition: ${[...names].join(", ")}`);
      }
      return suspended;
    }

    _resumePositionOwners(entry) {
      const suspended = entry.animSuspendedOwners;
      if (!suspended || suspended.length === 0) return;
      for (const entryOrB of suspended) {
        // Older entries were bare behaviour objects; tolerate both shapes.
        const b = entryOrB.b ?? entryOrB;
        const kind = entryOrB.kind ?? "ownership";
        if (kind === "enabled") b.isEnabled = true;
        else this._setOwnerControl(b, true);
      }
      entry.animSuspendedOwners = null;
    }

    _originOf(base) {
      const parent = base.parent;
      if (!parent) return [base.x, base.y];
      // The parent can be destroyed mid-transition; fall back to the captured position.
      if (typeof this.runtime.getInstanceByUid === "function" &&
          this.runtime.getInstanceByUid(base.parentUid) !== parent) {
        return [base.x, base.y];
      }
      return [
        base.followX ? parent.x + base.relX : base.x,
        base.followY ? parent.y + base.relY : base.y,
      ];
    }

    _hierarchyDepth(inst) {
      let depth = 0;
      if (typeof inst.parents === "function") {
        for (const _ of inst.parents()) depth++;
        return depth;
      }
      if (typeof inst.getParent === "function") {
        for (let p = inst.getParent(); p && depth < 1000; p = p.getParent?.()) depth++;
      }
      return depth;
    }

    _hasAnchorBehavior(inst) {
      for (const [key, b] of this._behaviorsOf(inst)) {
        if (b.isEnabled === false) continue;
        if (key === "Anchor" || b.behaviorType?.name === "Anchor") return true;
      }
      return false;
    }

    // Every behaviour lookup goes through here. `inst.behaviors` is an object keyed by behaviour
    // name, but nothing guarantees those keys are ENUMERABLE — if C3 defines them non-enumerably
    // then `for...in` (and Object.keys/values) yield nothing, every behaviour check silently
    // returns "no behaviours", and the transition treats a clamped cursor as an ordinary sprite.
    // getOwnPropertyNames covers the non-enumerable case; the prototype chain is walked too since
    // named accessors are often defined there.
    _behaviorsOf(inst) {
      const behaviors = inst.behaviors;
      if (!behaviors) return [];

      const names = new Set();
      for (const key in behaviors) names.add(key);
      for (const key of Object.getOwnPropertyNames(behaviors)) names.add(key);
      const proto = Object.getPrototypeOf(behaviors);
      if (proto && proto !== Object.prototype) {
        for (const key of Object.getOwnPropertyNames(proto)) {
          if (key !== "constructor") names.add(key);
        }
      }

      const found = [];
      const seen = new Set();
      for (const key of names) {
        let b;
        try { b = behaviors[key]; } catch { continue; }   // a throwing accessor must not kill the sweep
        if (!b || typeof b !== "object" || seen.has(b)) continue;
        seen.add(b);
        found.push([key, b]);
      }
      return found;
    }

    // Returns the matching behaviour's name (for the log) or null. Disabled behaviours don't count
    // — they aren't moving anything.
    _behaviorNameFrom(inst, set) {
      for (const [key, b] of this._behaviorsOf(inst)) {
        if (b.isEnabled === false) continue;
        if (set.has(key)) return key;
        const name = b.behaviorType?.name;
        if (name && set.has(name)) return name;
      }
      return null;
    }

    _hasAncestorIn(inst, set) {
      if (typeof inst.parents === "function") {
        for (const parent of inst.parents()) if (set.has(parent)) return true;
        return false;
      }
      if (typeof inst.getParent === "function") {
        // Guard against a malformed cycle rather than hanging the tick.
        for (let p = inst.getParent(), hops = 0; p && hops < 1000; p = p.getParent?.(), hops++) {
          if (set.has(p)) return true;
        }
      }
      return false;
    }

    // Instances can be destroyed mid-transition - skip any that are no longer the live
    // instance for their uid rather than writing to a released object.
    *_liveTransforms(entry) {
      const transforms = entry.animBaseTransforms;
      if (!transforms) return;
      const canVerify = typeof this.runtime.getInstanceByUid === "function";
      for (const [inst, base] of transforms) {
        if (canVerify && this.runtime.getInstanceByUid(base.uid) !== inst) continue;
        yield [inst, base];
      }
    }

    _applyInstanceOffset(entry, dx, dy) {
      entry.animLastTransform = { kind: "offset", dx, dy };
      for (const [inst, base] of this._liveTransforms(entry)) {
        const [ox, oy] = this._originOf(base);
        inst.x = ox + dx;
        inst.y = oy + dy;
      }
    }

    _applyInstanceScale(entry, factor) {
      const [cx, cy] = this._getLayerPivot(entry.ref);
      entry.animLastTransform = { kind: "scale", factor, cx, cy };
      for (const [inst, base] of this._liveTransforms(entry)) {
        const [ox, oy] = this._originOf(base);
        inst.x = cx + (ox - cx) * factor;
        inst.y = cy + (oy - cy) * factor;
        if (typeof base.width  === "number") inst.width  = base.width  * factor;
        if (typeof base.height === "number") inst.height = base.height * factor;
      }
    }

    // Settles instances back onto their baselines, using the LIVE origin so a child lands at its
    // offset from wherever Anchor has since moved its parent to. Called when a transition
    // completes, is interrupted, or its layer is untracked - a transition must never leave
    // objects parked where the animation had them.
    _restoreInstanceTransforms(entry) {
      this._withPinnedInstances(entry, () => {
        for (const [inst, base] of this._liveTransforms(entry)) {
          this._restoreOneInstance(inst, base);
        }
      });
    }

    _restoreOneInstance(inst, base) {
      const [ox, oy] = this._originOf(base);
      inst.x = ox;
      inst.y = oy;
      this._restoreOneInstanceSize(inst, base);
    }

    _restoreOneInstanceSize(inst, base) {
      if (typeof base.width  === "number" && typeof inst.width  === "number") inst.width  = base.width;
      if (typeof base.height === "number" && typeof inst.height === "number") inst.height = base.height;
    }

    _unwindInstanceTransforms(entry) {
      if (entry && entry.animBaseTransforms) this._restoreInstanceTransforms(entry);
      // A cursor left with ownership suspended would be frozen for good.
      this._resumePositionOwners(entry);
    }

    // Where an instance should be right now, given its origin and the transform last applied.
    _expectedTransform(base, last) {
      const [ox, oy] = this._originOf(base);
      if (last.kind === "scale") {
        return {
          x: last.cx + (ox - last.cx) * last.factor,
          y: last.cy + (oy - last.cy) * last.factor,
          width:  typeof base.width  === "number" ? base.width  * last.factor : undefined,
          height: typeof base.height === "number" ? base.height * last.factor : undefined,
        };
      }
      return { x: ox + last.dx, y: oy + last.dy, width: base.width, height: base.height };
    }

    // Reconciles animation baselines with anything else that moved these instances since the
    // last frame. An instance still exactly where this plugin put it was not touched by anyone
    // else, so its baseline stands. A deviation gets one of two treatments:
    //
    //  - On a display-size change, or on an instance carrying Anchor: the mover writes an
    //    ABSOLUTE position and discards the offset the transition was applying, so the deviated
    //    position IS the instance's new home. Adopt it as the baseline and the transition
    //    finishes into the new home instead of restoring a stale one.
    //
    //  - Any other frame: the mover is unidentifiable, and guessing wrong is destructive.
    //    Adopting is right for an absolute reposition but catastrophic for a behaviour adding a
    //    delta per frame - each frame would fold the offset into the baseline and the object
    //    would accelerate off-screen. So the instance is released and left where the mover put
    //    it. Whoever moved it last owns it: no fight, no ratchet.
    _reconcileExternalTransforms(entry, viewportChanged) {
      const last = entry.animLastTransform;
      if (!last) return { rebased: 0, released: [] };

      const release = [];
      const released = new Set();
      let rebased = 0;

      for (const [inst, base] of this._liveTransforms(entry)) {
        const expected = this._expectedTransform(base, last);
        const dx = inst.x - expected.x;
        const dy = inst.y - expected.y;
        const moved =
          Math.abs(dx) > REBASE_EPSILON_PX ||
          Math.abs(dy) > REBASE_EPSILON_PX;
        // Size is judged separately: an Anchor set to both edges resizes without moving.
        const resized =
          (typeof expected.width === "number" && typeof inst.width === "number" &&
            Math.abs(inst.width - expected.width) > REBASE_EPSILON_PX) ||
          (typeof expected.height === "number" && typeof inst.height === "number" &&
            Math.abs(inst.height - expected.height) > REBASE_EPSILON_PX);

        if (!moved && !resized) continue;

        // Sub-pixel differences are not somebody taking ownership — they are rounding: a project
        // with pixel rounding on, an addon that reads and rewrites a position, float error in a
        // long chain. Releasing on those would drop instances out of the animation for no visible
        // reason, so they are ignored and the next write corrects them.
        const deviation = Math.max(Math.abs(dx), Math.abs(dy));
        if (moved && !resized && deviation < RELEASE_MIN_DEVIATION_PX) continue;

        if (!viewportChanged && !this._hasAnchorBehavior(inst)) {
          release.push(inst);
          // Releasing stops US writing it, but its parent may still be animated — and C3 propagates
          // a parent's resize by scaling each child's OFFSET and size. With nobody re-asserting the
          // child's own value that compounds every frame, so a released child drifts and grows for
          // the rest of the transition. (A slide only translates, and a parent returning home nets
          // to zero, which is why this only ever showed up on scale.) Pin it so propagation cannot
          // touch it while its own mover stays free to move it between frames.
          entry.animPinned ??= new Map();
          entry.animPinned.set(inst, { uid: inst.uid });
          // ALWAYS put it back on its baseline before handing it over. Leaving it "where the mover
          // put it" sounds respectful but strands this transition's displacement on the instance:
          // it is dropped from the animation, never restored, and the NEXT transition captures the
          // displaced position as its new baseline. Over repeated open/close cycles that compounds
          // without limit — an object ends up thousands of pixels off-screen.
          //
          // The cost is that a one-shot absolute reposition made mid-transition is undone. That is
          // the lesser evil: anything actively driving the instance re-applies its own position on
          // its next tick anyway, which is precisely the case this branch exists for.
          this._restoreOneInstance(inst, base);
          const mover = this._behaviorNameFrom(inst, MOVEMENT_BEHAVIORS);
          released.add(
            `${this._describeInstance(inst)} (${mover ? mover + ", " : ""}put back, ` +
            `moved by ${dx.toFixed(2)},${dy.toFixed(2)}px${resized ? " and resized" : ""})`
          );
          continue;
        }

        if (moved) {
          base.x = inst.x;
          base.y = inst.y;
        }
        if (resized) {
          if (typeof inst.width  === "number") base.width  = inst.width;
          if (typeof inst.height === "number") base.height = inst.height;
        }
        rebased++;
      }

      for (const inst of release) entry.animBaseTransforms.delete(inst);
      return { rebased, released: [...released] };
    }

    _getViewportSize() {
      const rt = this.runtime;
      if (typeof rt.getViewportSize === "function") {
        const size = rt.getViewportSize();
        if (Array.isArray(size) && size.length >= 2) return [size[0], size[1]];
      }
      if (typeof rt.viewportWidth === "number" && typeof rt.viewportHeight === "number") {
        return [rt.viewportWidth, rt.viewportHeight];
      }
      return null;
    }

    // Runs every frame from _tick(), which C3 calls after behaviours have ticked
    // (pretick -> behaviours -> tick), so Anchor's correction for this frame, and any behaviour
    // movement, has already landed by the time we look.
    _syncExternalTransforms() {
      const size = this._getViewportSize();
      const previous = this._lastViewport;
      if (size) this._lastViewport = size;
      const viewportChanged =
        !!size && !!previous && (previous[0] !== size[0] || previous[1] !== size[1]);

      let rebased = 0;
      const released = new Set();
      for (const name of this._animatingLayers) {
        const entry = this._getEntry(name);
        if (!entry) continue;
        const result = this._reconcileExternalTransforms(entry, viewportChanged);
        rebased += result.rebased;
        for (const name of result.released) released.add(name);
      }

      if (viewportChanged) {
        this._log(
          `Viewport ${previous[0]}x${previous[1]} -> ${size[0]}x${size[1]}: re-derived ${rebased} animation baseline(s)`
        );
      }
      if (released.size > 0) {
        this._log(`Released from the animation, moved by something else: ${[...released].join(", ")}`);
      }
    }

    // A C3 layer's scroll position is the centre of what that layer shows, which is the
    // natural pivot for a scale. Reading it is safe even where writing it has no effect.
    _getLayerPivot(layerRef) {
      const ref = this._getAnimTargetLayers(layerRef)[0] ?? layerRef;
      return [
        typeof ref.scrollX === "number" ? ref.scrollX : this.runtime.layout.width / 2,
        typeof ref.scrollY === "number" ? ref.scrollY : this.runtime.layout.height / 2,
      ];
    }

    _resetAnimProperties(entry, type) {
      switch (type) {
        case "fade":
          for (const l of this._getAnimTargetLayers(entry.ref)) {
            l.opacity = entry.animBaseOpacities?.get(l) ?? 1;
          }
          break;
        case "slideLeft":
        case "slideRight":
        case "slideUp":
        case "slideDown":
          this._restoreInstanceTransforms(entry);
          break;
        case "scaleDown":
        case "scaleUp":
          this._restoreInstanceTransforms(entry);
          for (const l of this._getAnimTargetLayers(entry.ref)) {
            l.opacity = entry.animBaseOpacities?.get(l) ?? 1;
          }
          break;
      }
    }

    _startAnim(entry, dir, onComplete, isBackNav = false) {
      const config = this._getAnimConfig(entry);

      if (entry.animating) this._completeAnim(entry);

      // Compute effective animation type (mirrored for back-navigation if toggled)
      let effectiveType = config.type;
      if (isBackNav && entry.mirrorOnBack && dir === "closing") {
        effectiveType = this._mirrorAnimType(effectiveType);
      }
      entry.animEffectiveType = effectiveType;

      if (effectiveType === "none") {
        onComplete();
        return;
      }

      const isScale = effectiveType === "scaleDown" || effectiveType === "scaleUp";
      const isSlide = effectiveType.startsWith("slide");

      // Capture the authored opacity of each target layer so _applyAnimValue can work in
      // deltas and _resetAnimProperties can restore exactly. Skip re-capturing mid-flight:
      // a fade interrupted at opacity 0.3 must not adopt 0.3 as its baseline, or repeated
      // interruptions would ratchet the layer to invisible.
      const previousOpacities = entry.animBaseOpacities;
      entry.animBaseOpacities = new Map();
      for (const l of this._getAnimTargetLayers(entry.ref)) {
        entry.animBaseOpacities.set(l, previousOpacities?.get(l) ?? l.opacity);
      }

      // Slide and scale transform instances, so they need each instance's starting position
      // and size. Only swept for those types — a fade should not pay for an instance scan.
      entry.animBaseTransforms = isSlide || isScale ? this._captureInstanceTransforms(entry) : null;
      // Must happen before the first _applyAnimValue() below, so the clamp is already off on the
      // very first displaced frame. Only slide and scale move objects; a fade leaves positions
      // alone and needs no suspension.
      this._resumePositionOwners(entry);
      entry.animSuspendedOwners = isSlide || isScale ? this._suspendPositionOwners(entry.ref) : null;
      entry.animLastTransform = null;
      // Baseline the viewport here too, so the first tick of a transition doesn't mistake a
      // resize that happened while nothing was animating for one that happened mid-flight.
      this._lastViewport = this._getViewportSize();

      const { from, to } = this._getAnimValues(effectiveType, dir);

      entry.animating     = true;
      entry.animDir       = dir;
      entry.animProgress  = 0;
      entry.animElapsed   = 0;
      entry.animFrom      = from;
      entry.animTo        = to;
      entry.animOnComplete = onComplete;

      // Match Aekiro's scale behavior: opacity uses a short, separate tween so elastic/back easings
      // affect only scale and not alpha readability. Applied to the target layers, for the same
      // reason the fade is — a group root's opacity doesn't reach the content in its sublayers.
      entry.animOpacityEnabled  = isScale;
      entry.animOpacityElapsed  = 0;
      entry.animOpacityDuration = SCALE_OPACITY_DURATION_MS;
      if (entry.animOpacityEnabled) {
        entry.animOpacityFrom = dir === "opening" ? 0 : 1;
        entry.animOpacityTo   = dir === "opening" ? 1 : 0;
        this._applyLayerOpacityFraction(entry, entry.animOpacityFrom);
      }

      entry.ref.isVisible     = true;
      entry.ref.isInteractive = false;
      this._setLayerCollisions(entry, false);

      this._applyAnimValue(entry, effectiveType, from);
      this._setTicking(true);
      this._animatingLayers.add(entry.name);
      this._log(`Anim start: ${entry.name} ${dir} (${effectiveType}, ${config.duration}ms, ${config.easing})`);
      const opacityEasing = this._easingForType(effectiveType, config.easing);
      if (opacityEasing !== config.easing) {
        this._log(`  ${config.easing} overshoots past 1 and opacity clamps there — using ${opacityEasing} for this fade`);
      }
    }

    _completeAnim(entry) {
      const config = this._getAnimConfig(entry);
      const effectiveType = entry.animEffectiveType ?? config.type;
      this._applyAnimValue(entry, effectiveType, entry.animTo);
      if (entry.animOpacityEnabled) {
        this._applyLayerOpacityFraction(entry, entry.animOpacityTo);
      }
      this._resetAnimProperties(entry, effectiveType);

      // The layer's tween is done, but per-object animations may still be running; the barrier
      // resumes owners once those finish. Resuming here as well covers the no-motions case and
      // guarantees ownership is never left suspended if a motion never reports back.
      if (!entry.animMotionsPending) this._resumePositionOwners(entry);

      entry.animating    = false;
      entry.animDir      = "";
      entry.animProgress = 1;
      entry.animOpacityEnabled = false;
      this._animatingLayers.delete(entry.name);

      const cb = entry.animOnComplete;
      entry.animOnComplete = null;

      cb?.();
      this._log(`Anim complete: ${entry.name}`);
    }

    _tickAnimations(dt) {
      // Iterate over a snapshot so callbacks that end/replace animations cannot invalidate traversal.
      for (const name of [...this._animatingLayers]) {
        const entry         = this._getEntry(name);
        if (!entry) {
          this._animatingLayers.delete(name);
          continue;
        }
        const config        = this._getAnimConfig(entry);
        const effectiveType = entry.animEffectiveType ?? config.type;

        const duration = Math.max(0, config.duration ?? 0);
        entry.animElapsed += dt;
        const t      = duration <= 0 ? 1 : Math.min(entry.animElapsed / duration, 1);
        const easedT = this._applyEasing(t, this._easingForType(effectiveType, config.easing));
        const value  = entry.animFrom + (entry.animTo - entry.animFrom) * easedT;

        entry.animProgress = t;
        this._applyAnimValue(entry, effectiveType, value);

        if (entry.animOpacityEnabled) {
          entry.animOpacityElapsed += dt;
          const ot = Math.min(entry.animOpacityElapsed / entry.animOpacityDuration, 1);
          const easedOpacityT = this._applyEasing(ot, OPACITY_EASING_FALLBACK);
          const o = entry.animOpacityFrom + (entry.animOpacityTo - entry.animOpacityFrom) * easedOpacityT;
          this._applyLayerOpacityFraction(entry, o);
        }

        if (t >= 1) this._completeAnim(entry);
      }
    }

    // ─────────────────────────────────────────────────────────
    // State application
    // ─────────────────────────────────────────────────────────

    _applyState(entry, state) {
      switch (state) {
        case "visible":
          entry.ref.isVisible     = true;
          entry.ref.isInteractive = true;
          this._setLayerCollisions(entry, true);
          break;
        case "hidden":
          entry.ref.isVisible     = false;
          entry.ref.isInteractive = false;
          this._setLayerCollisions(entry, false);
          break;
        case "disabled":
          entry.ref.isVisible     = true;
          entry.ref.isInteractive = false;
          this._setLayerCollisions(entry, false);
          break;
        case "focused":
          entry.ref.isVisible     = true;
          entry.ref.isInteractive = true;
          this._setLayerCollisions(entry, true);
          break;
      }
      entry.state = state;
    }

    _setLayerCollisions(entry, enabled) {
      if (!entry.manageCollisions) return;

      if (!enabled) {
        // Save only the instances that currently have collisions on, then disable them.
        // This ensures we never re-enable something that was intentionally off.
        const toDisable = this._getAllInstancesOnLayer(entry.ref).filter(
          inst => typeof inst.collisionsEnabled === "boolean" && inst.collisionsEnabled
        );
        entry._savedCollisions = new Set(toDisable);
        for (const inst of toDisable) {
          inst.collisionsEnabled = false;
        }
      } else {
        // Re-enable only the instances we previously disabled.
        // Intersect with currently live instances to guard against instances destroyed in the interim.
        if (entry._savedCollisions) {
          const live = new Set(this._getAllInstancesOnLayer(entry.ref));
          for (const inst of entry._savedCollisions) {
            if (live.has(inst) && typeof inst.collisionsEnabled === "boolean") {
              inst.collisionsEnabled = true;
            }
          }
          entry._savedCollisions = null;
        }
        // If no saved state: do nothing — instances already have their intended state.
      }

      this._log(`Collisions ${enabled ? "on" : "off"}: ${entry.name}`);
    }

    // Every instance on a layer, including all sublayers when layerRef is a group layer.
    // NOTE: this.runtime.objects is a plain object keyed by object class name — it is NOT
    // iterable, so `for (const t of this.runtime.objects)` throws. Enumerate with
    // Object.values(). Families also appear in runtime.objects and report their members'
    // instances, so results are deduped to avoid handling an instance twice.
    _getAllInstancesOnLayer(layerRef) {
      // Collect the target layer plus every descendant layer up front, then sweep once.
      const layers = new Set([layerRef]);
      const addSublayers = (ref) => {
        for (const sub of this._getDirectSublayers(ref)) {
          if (layers.has(sub)) continue;
          layers.add(sub);
          addSublayers(sub);
        }
      };
      addSublayers(layerRef);

      const objClasses = Object.values(this.runtime.objects ?? {});
      if (objClasses.length === 0) {
        this._log("Warning: no object classes enumerable from runtime.objects");
      }

      const found = new Set();
      for (const objClass of objClasses) {
        if (!objClass || typeof objClass.getAllInstances !== "function") continue;
        for (const inst of objClass.getAllInstances()) {
          if (layers.has(inst.layer)) found.add(inst);
        }
      }
      return [...found];
    }

    // Duck-typed discovery for per-object transition behaviors (e.g. FlourishCue).
    // No hardcoded addon IDs so companion addons can integrate via method contract.
    //
    // An instance holding one of these animates ITSELF: _playOpen/_playClose drive its own
    // position, size and opacity every tick (FlourishCue works in parent-local coordinates, so
    // it also stays correct under a parent this transition is moving). The layer transition must
    // therefore not transform it as well — see _selfAnimatingBehavior, which shares this exact
    // predicate so the two paths can never disagree about who owns an instance.
    _selfAnimatingBehavior(inst) {
      for (const [, b] of this._behaviorsOf(inst)) {
        if (typeof b._playOpen === "function" && typeof b._playClose === "function") return b;
      }
      return null;
    }

    _collectFlourishCue(layerRef) {
      const result = [];
      for (const inst of this._getAllInstancesOnLayer(layerRef)) {
        const b = this._selfAnimatingBehavior(inst);
        if (b) result.push(b);
      }
      return result;
    }

    // ─────────────────────────────────────────────────────────
    // Timescale helpers
    // ─────────────────────────────────────────────────────────

    _actSetLayerTimescale(layerName, instanceTimescale, runtimeTimescale) {
      const entry = this._getEntry(layerName);
      if (!entry) return;
      if (instanceTimescale >= 0) {
        for (const instance of this._getAllInstancesOnLayer(entry.ref)) {
          instance.timeScale = instanceTimescale;
        }
        this._log(`Instance timescale set to ${instanceTimescale} on layer: ${layerName}`);
      }
      entry.runtimeTimescale = runtimeTimescale < 0 ? null : runtimeTimescale;
      this._log(`Runtime timescale override: ${entry.runtimeTimescale ?? "none"} on layer: ${layerName}`);
    }

    _actResetLayerTimescale(layerName) {
      const entry = this._getEntry(layerName);
      if (!entry) return;
      for (const instance of this._getAllInstancesOnLayer(entry.ref)) {
        if (typeof instance.restoreTimeScale === "function") instance.restoreTimeScale();
        else instance.timeScale = 1;
      }
      entry.runtimeTimescale = null;
      this._restoreRuntimeTimescale(entry);
      this._log(`Timescales reset on layer: ${layerName}`);
    }

    _applyRuntimeTimescale(entry) {
      if (entry.runtimeTimescale === null) return;
      entry.savedRuntimeTimescale = this.runtime.timeScale;
      this.runtime.timeScale = entry.runtimeTimescale;
      this._log(`Runtime timescale → ${entry.runtimeTimescale} (was ${entry.savedRuntimeTimescale})`);
    }

    _restoreRuntimeTimescale(entry) {
      if (entry.savedRuntimeTimescale === null) return;
      this.runtime.timeScale = entry.savedRuntimeTimescale;
      this._log(`Runtime timescale restored → ${entry.savedRuntimeTimescale}`);
      entry.savedRuntimeTimescale = null;
    }

    // ─────────────────────────────────────────────────────────
    // Sublayer ordering helpers
    // ─────────────────────────────────────────────────────────

    _getSublayerIndex(ref) {
      const containerRef = this._getContainerRef();
      if (!containerRef) return -1;
      let i = 0;
      for (const layer of this._getDirectSublayers(containerRef)) {
        if (layer === ref) return i;
        i++;
      }
      return -1;
    }

    _getContainerLayerCount() {
      const containerRef = this._getContainerRef();
      if (!containerRef) return 0;
      return this._getDirectSublayers(containerRef).length;
    }

    _getContainerTopIndex() {
      return this._getContainerLayerCount() - 1;
    }

    _getTopNormalSublayerIndex() {
      let max = 0;
      for (const entry of this._layers.values()) {
        if (entry.role === "normal" && entry.ref) {
          const ancestor = this._getContainerDirectChild(entry.ref);
          max = Math.max(max, this._getSublayerIndex(ancestor));
        }
      }
      return max;
    }

    _getTopPopupSublayerIndex() {
      if (this._popupStack.length === 0) {
        return this._getTopNormalSublayerIndex() + 1;
      }
      let max = 0;
      for (const name of this._popupStack) {
        const entry = this._getEntry(name);
        if (entry?.ref) {
          const ancestor = this._getContainerDirectChild(entry.ref);
          max = Math.max(max, this._getSublayerIndex(ancestor));
        }
      }
      return max;
    }

    _moveSublayerToIndex(ref, targetIndex) {
      if (typeof this.runtime.layout.moveLayerToIndex === "function") {
        this.runtime.layout.moveLayerToIndex(ref, targetIndex);
        return;
      }
      const containerRef = this._getContainerRef();
      if (containerRef && typeof containerRef.moveLayerToIndex === "function") {
        containerRef.moveLayerToIndex(ref, targetIndex);
        return;
      }
      this._log("WARNING: moveLayerToIndex not available - Z-order reordering disabled");
    }

    // ─────────────────────────────────────────────────────────
    // Interactive snapshot helpers
    // ─────────────────────────────────────────────────────────

    _snapshotInteractive() {
      const snap = new Map();
      for (const entry of this._layers.values()) {
        if (entry.role === "normal") {
          snap.set(entry.name, entry.ref?.isInteractive ?? false);
        }
      }
      return snap;
    }

    _restoreInteractiveSnapshot(snapshot) {
      for (const [name, wasInteractive] of snapshot) {
        const entry = this._getEntry(name);
        if (entry?.ref) entry.ref.isInteractive = wasInteractive;
      }
    }

    // ─────────────────────────────────────────────────────────
    // Tick
    // ─────────────────────────────────────────────────────────

    _tick() {
      if (!this._ready) this._ready = true;  // set on first tick so the debugger knows C3 is fully initialised
      if (this._animatingLayers.size === 0) {
        // Keep ticking while per-object animations are still outstanding, purely so the watchdog
        // below can run: a companion addon that never reports back would otherwise leave Anchor
        // and cursor clamps suspended for good, with no tick left to notice.
        if (this._tickMotionWatchdog()) return;
        this._setTicking(false);
        return;
      }
      this._syncExternalTransforms();
      this._tickAnimations(this.runtime.dt * 1000);
    }

    // ─────────────────────────────────────────────────────────
    // Waits for outstanding per-object animations to report back, and gives up after a bounded
    // number of frames so a companion addon that never calls its completion callback cannot leave
    // Anchor or a cursor clamp switched off permanently. Returns true while still waiting.
    _tickMotionWatchdog() {
      let waiting = false;
      for (const entry of this._layers.values()) {
        if (!entry.animMotionsPending || !entry.animSuspendedOwners?.length) continue;
        entry.animMotionWaitFrames = (entry.animMotionWaitFrames ?? 0) + 1;
        if (entry.animMotionWaitFrames < MOTION_WATCHDOG_FRAMES) {
          waiting = true;
          continue;
        }
        this._warnOnce(
          `motionstuck:${entry.name}`,
          `${entry.animMotionsPending} per-object transition animation(s) on "${entry.name}" never ` +
          `reported completion after ${MOTION_WATCHDOG_FRAMES} frames. Handing position control back ` +
          `so Anchor and cursor behaviours are not left suspended.`
        );
        entry.animMotionsPending = 0;
        entry.animMotionWaitFrames = 0;
        this._resumePositionOwners(entry);
      }
      return waiting;
    }

    // ─────────────────────────────────────────────────────────
    // Logging
    // ─────────────────────────────────────────────────────────

    _log(msg) {
      if (this._debug) console.log(`[UIDirector] ${msg}`);
    }

    // Configuration mistakes (missing layer, wrong container, untracked layer) make every
    // action silently do nothing, which is impossible to diagnose. These always warn,
    // regardless of Debug Mode — but only once per distinct problem, so a mistake inside
    // an every-tick event doesn't flood the console.
    _warnOnce(key, msg) {
      this._warned ??= new Set();
      if (this._warned.has(key)) return;
      this._warned.add(key);
      console.warn(`[UIDirector] ${msg}`);
    }

    // ─────────────────────────────────────────────────────────
    // C3 Debugger
    // ─────────────────────────────────────────────────────────

    _getDebuggerProperties() {
      // Guard: wait until the first tick after onCreate() so C3 is fully initialised.
      if (!this._ready) return [];

      const typeName = this.type?.name ?? "UIDirector";
      const sections = [];

      try {

      // ── Summary ──
      const activeScreen = this._focusStack.at(-1)?.layerName ?? "(none)";
      sections.push({
        title: `$${typeName} — Summary`,
        properties: [
          { name: "$Active screen",      value: activeScreen },
          { name: "$Stack depth",        value: this._focusStack.length },
          { name: "$Open popups",        value: this._popupStack.length },
          { name: "$Active tooltip",     value: this._activeTooltip ?? "(none)" },
          { name: "$Animating layers",   value: this._animatingLayers.size },
          { name: "$Runtime timescale",  value: this.runtime.timeScale },
          { name: "$Total tracked",      value: this._layers.size },
          { name: "$Debug mode",         value: this._debug, onedit: v => { this._debug = !!v; } },
        ],
      });

      // ── Focus stack ──
      if (this._focusStack.length > 0) {
        const props = [];
        for (let i = this._focusStack.length - 1; i >= 0; i--) {
          const frame = this._focusStack[i];
          const entry = this._getEntry(frame.layerName);
          const label = i === this._focusStack.length - 1
            ? `$[${i + 1}] ${frame.layerName}  ◀ active`
            : `$[${i + 1}] ${frame.layerName}`;
          props.push({ name: label, value: entry?.state ?? "?" });
        }
        sections.push({ title: `$${typeName} — Focus Stack`, properties: props });
      }

      // ── Open popups ──
      if (this._popupStack.length > 0) {
        const props = [];
        for (const name of this._popupStack) {
          const entry = this._getEntry(name);
          const timer = entry?.dismissTimer !== null ? "  ⏳ auto-dismiss" : "";
          props.push({ name: `$${name}`, value: (entry?.state ?? "?") + timer });
        }
        sections.push({ title: `$${typeName} — Open Popups`, properties: props });
      }

      // ── One section per tracked layer ──
      for (const entry of this._layers.values()) {
        const stateStr = entry.animating
          ? `${entry.state}  (${entry.animDir}  ${(entry.animProgress * 100).toFixed(0)}%)`
          : entry.state;

        const props = [
          { name: "$Role",       value: entry.role },
          { name: "$State",      value: stateStr },
          { name: "$Prev state", value: entry.prevState },
        ];

        if (entry.role === "normal") {
          props.push({ name: "$Modal",          value: entry.isModal });
          props.push({ name: "$Mirror on back", value: entry.mirrorOnBack });
        }

        if (entry.manageCollisions) {
          props.push({ name: "$Sync collisions", value: true });
        }

        if (entry.animType !== null || entry.animDuration !== null || entry.animEasing !== null) {
          props.push({
            name:  "$Anim override",
            value: `${entry.animType ?? "default"}  ${entry.animDuration ?? "default"}ms  ${entry.animEasing ?? "default"}`,
          });
        }

        if (entry.runtimeTimescale !== null) {
          props.push({ name: "$Runtime timescale (on open)", value: entry.runtimeTimescale });
        }
        if (entry.savedRuntimeTimescale !== null) {
          props.push({ name: "$Runtime timescale (saved)", value: entry.savedRuntimeTimescale });
        }

        if (entry.customData.size > 0) {
          for (const [k, v] of entry.customData) {
            props.push({ name: `$data.${k}`, value: v });
          }
        }

        sections.push({ title: `$Layer: ${entry.name}`, properties: props });
      }

      } catch (e) { console.error("[UIDirector] _getDebuggerProperties error:", e); }

      return sections;
    }

    // ─────────────────────────────────────────────────────────
    // Action implementations
    // ─────────────────────────────────────────────────────────

    _markLastChanged(layerName, state) {
      this._lastChangedLayer = layerName;
      this._lastChangedState = state;
    }

    _emitLayerStateChanged() {
      this._trigger("OnLayerStateChanged");
      this._trigger("OnAnyLayerStateChanged");
    }

    _cancelDismissTimer(entry) {
      if (entry?.dismissTimer === null || entry?.dismissTimer === undefined) {
        return false;
      }
      clearTimeout(entry.dismissTimer);
      entry.dismissTimer = null;
      return true;
    }

    _makeBarrier(count, done) {
      if (count <= 0) {
        queueMicrotask(() => done());
        return () => {};
      }
      let remaining = count;
      let fired = false;
      return () => {
        if (fired) return;
        remaining--;
        if (remaining <= 0) {
          fired = true;
          done();
        }
      };
    }

    // Centralized transition wrappers keep action methods focused on intent.
    // OnLayerOpening/OnLayerOpened and OnLayerClosing/OnLayerClosed fire here so
    // every open/close path (navigation, state change, popup) emits them consistently.
    _runOpeningTransition(entry, onOpened) {
      this._lastChangedLayer = entry.name;
      this._trigger("OnLayerOpening");

      // Breadcrumb before the first thing that touches instances: if the log stops here, the
      // failure is in the instance sweep, not in the animation.
      this._log(`Opening ${entry.name} — collecting per-object transition behaviours`);
      const motions = this._collectFlourishCue(entry.ref);
      // Per-object animations can outlast the layer's own tween (their own duration plus delay).
      // Anchor and cursor clamps must stay suspended until they are ALL finished, or a re-enabled
      // Anchor starts fighting a FlourishCue animation that is still running on the same object.
      entry.animMotionsPending = motions.length;
      entry.animMotionWaitFrames = 0;
      const signal = this._makeBarrier(1 + motions.length, () => {
        this._resumePositionOwners(entry);
        onOpened?.();
        this._lastChangedLayer = entry.name;
        this._trigger("OnLayerOpened");
      });

      // Ensure objects can run their own intro animation immediately.
      entry.ref.isVisible = true;

      for (const m of motions) {
        try {
          m._playOpen(() => { entry.animMotionsPending--; signal(); });
        } catch (_) {
          entry.animMotionsPending--;
          signal();
        }
      }
      this._startAnim(entry, "opening", () => signal());
    }

    _runClosingTransition(entry, onClosed, isBackNav = false) {
      this._lastChangedLayer = entry.name;
      this._trigger("OnLayerClosing");

      const motions = this._collectFlourishCue(entry.ref);
      entry.animMotionsPending = motions.length;
      entry.animMotionWaitFrames = 0;
      const signal = this._makeBarrier(1 + motions.length, () => {
        this._resumePositionOwners(entry);
        onClosed?.();
        this._lastChangedLayer = entry.name;
        this._trigger("OnLayerClosed");
      });

      for (const m of motions) {
        try {
          m._playClose(() => { entry.animMotionsPending--; signal(); });
        } catch (_) {
          entry.animMotionsPending--;
          signal();
        }
      }
      this._startAnim(entry, "closing", () => signal(), isBackNav);
    }

    _prepareForClosing(entry, pendingState = null) {
      entry.ref.isInteractive = false;
      this._setLayerCollisions(entry, false);
      entry.pendingState = pendingState;
    }

    _applyAndClearPendingState(entry) {
      this._applyState(entry, entry.pendingState);
      entry.pendingState = null;
    }

    _createLayerEntry({
      name,
      ref,
      role,
      state = "visible",
      prevState = "visible",
      isModal = true,
      manageCollisions = false,
      mirrorOnBack = false,
      customData = new Map(),
    }) {
      // Centralized defaults keep tracking and save-load rehydration in sync.
      return {
        name,
        ref,
        role,
        state,
        prevState,
        isModal,
        manageCollisions,
        customData,
        mirrorOnBack,
        dismissTimer: null,
        animType: null,
        animDuration: null,
        animEasing: null,
        animating: false,
        animDir: "",
        animProgress: 0,
        animElapsed: 0,
        animFrom: 0,
        animTo: 0,
        animOnComplete: null,
        pendingState: null,
        animBaseTransforms: null,
        animPinned: null,
        animSuspendedOwners: null,
        animMotionsPending: 0,
        animMotionWaitFrames: 0,
        animLastTransform: null,
        animBaseOpacities: null,
        animEffectiveType: null,
        animOpacityEnabled: false,
        animOpacityElapsed: 0,
        animOpacityDuration: SCALE_OPACITY_DURATION_MS,
        animOpacityFrom: 1,
        animOpacityTo: 1,
        runtimeTimescale: null,
        savedRuntimeTimescale: null,
        _savedCollisions: null,
      };
    }

    _actTrackLayer(layerName, role, isModal, manageCollisions) {
      const ref = this._resolveLayer(layerName);
      if (!ref) {
        const container = this._getProperty("uiContainerLayer");
        const where = container && String(container).trim() !== ""
          ? `inside container layer "${container}"`
          : `on layout "${this.runtime.layout.name}"`;
        this._warnOnce(
          `track:${layerName}`,
          `Setup layer: no layer named "${layerName}" found ${where}. ` +
          `The name must match the layer name in the Layers bar exactly. Nothing was tracked, so ` +
          `navigation actions for this layer will do nothing.`
        );
        return;
      }
      if (this._layers.has(layerName)) {
        this._log(`Already tracked: ${layerName}`);
        return;
      }
      const entry = this._createLayerEntry({
        name: layerName,
        ref,
        role,
        isModal,
        manageCollisions,
      });
      this._layers.set(layerName, entry);
      if (manageCollisions) {
        this._setLayerCollisions(entry, entry.ref.isInteractive);
      }
      this._log(`Tracked layer ${layerName} as ${role}`);
    }

    _actUntrackLayer(layerName) {
      const entry = this._getEntry(layerName);
      this._cancelDismissTimer(entry);
      // Wind back any displacement first — untracking mid-transition otherwise abandons the
      // objects wherever the animation had them, which for a slide means off-screen.
      if (entry) this._unwindInstanceTransforms(entry);
      this._animatingLayers.delete(layerName);
      this._focusStack = this._focusStack.filter(f => f.layerName !== layerName);
      this._popupStack = this._popupStack.filter(n => n !== layerName);
      if (this._activeTooltip === layerName) this._activeTooltip = null;
      this._layers.delete(layerName);
    }

    _actUntrackAllLayers() {
      for (const entry of this._layers.values()) {
        this._cancelDismissTimer(entry);
        this._unwindInstanceTransforms(entry);
      }
      this._layers.clear();
      this._focusStack = [];
      this._popupStack = [];
      this._activeTooltip = null;
      this._animatingLayers.clear();
    }

    _actSetLayerState(layerName, state) {
      const entry = this._getEntry(layerName);
      if (!entry) return;

      entry.prevState = entry.state;
      this._markLastChanged(layerName, state);

      const config = this._getAnimConfig(entry);

      if ((state === "visible" || state === "focused") && config.type !== "none") {
        this._runOpeningTransition(entry, () => {
          this._applyState(entry, state);
          this._emitLayerStateChanged();
        });
      } else if ((state === "hidden" || state === "disabled") && config.type !== "none") {
        this._prepareForClosing(entry, state);
        this._runClosingTransition(entry, () => {
          this._applyAndClearPendingState(entry);
          this._emitLayerStateChanged();
        });
      } else {
        this._applyState(entry, state);
        this._emitLayerStateChanged();
      }
    }

    _actSetLayerModal(layerName, isModal) {
      const entry = this._getEntry(layerName);
      if (!entry) return;
      entry.isModal = isModal;
      this._log(`Set layer ${layerName} modal: ${isModal}`);
    }

    _actSetLayerAnimation(layerName, type, duration, easing, mirrorOnBack = false) {
      const entry = this._getEntry(layerName);
      if (!entry) return;
      entry.animType     = type;
      entry.animDuration = duration;
      entry.animEasing   = easing;
      entry.mirrorOnBack = mirrorOnBack;
    }

    _actSetLayerCollisions(layerName, enabled) {
      const entry = this._getEntry(layerName);
      if (!entry) return;
      entry.manageCollisions = enabled;
      if (enabled) {
        this._setLayerCollisions(entry, entry.ref.isInteractive);
      }
      this._log(`Set layer ${layerName} manage collisions: ${enabled}`);
    }

    _actSetLayerInteractable(layerName, enable) {
      const entry = this._getEntry(layerName);
      if (!entry) return;
      entry.ref.isInteractive = enable;
      this._log(`Set layer ${layerName} interactable: ${enable}`);
    }

    _actSetLayerData(layerName, key, value) {
      const entry = this._getEntry(layerName);
      if (!entry) return;
      entry.customData.set(key, value);
    }

    _actFocusLayer(layerName) {
      const entry = this._getEntry(layerName);
      if (!entry || entry.role !== "normal") {
        this._warnOnce(
          `focus:${layerName}`,
          entry
            ? `Go to screen: "${layerName}" is set up as a ${entry.role === "normal" ? "screen" : entry.role}, not a screen — use the Popup or Tooltip action instead.`
            : `Go to screen: "${layerName}" is not tracked. Run "Setup layer" for it first (typically on Start of layout).`
        );
        return;
      }

      const snapshot  = this._snapshotInteractive();
      const containerAncestor = this._getContainerDirectChild(entry.ref);
      const savedIndex = this._getSublayerIndex(containerAncestor);

      this._focusStack.push({ layerName, savedIndex, interactiveSnapshot: snapshot });

      const topNormal = this._getTopNormalSublayerIndex();
      this._moveSublayerToIndex(containerAncestor, topNormal);

      if (entry.isModal) {
        for (const e of this._layers.values()) {
          if (e.role === "normal" && e.name !== layerName) {
            e.ref.isInteractive = false;
            this._setLayerCollisions(e, false);
          }
        }
      }

      entry.prevState          = entry.state;
      this._lastFocusedLayer   = layerName;
      this._markLastChanged(layerName, "focused");

      this._applyRuntimeTimescale(entry);
      this._updateDimLayer();

      this._runOpeningTransition(entry, () => {
        this._applyState(entry, "focused");
        this._trigger("OnScreenShown");
        this._emitLayerStateChanged();
      });

      this._log(`Focused layer ${layerName}. Stack depth: ${this._focusStack.length}`);
    }

    _actPopFocusStack() {
      if (this._focusStack.length === 0) {
        this._log("PopFocusStack: stack is empty");
        return;
      }

      const frame = this._focusStack.pop();
      const entry = this._getEntry(frame.layerName);

      this._lastUnfocusedLayer = frame.layerName;
      this._lastChangedLayer   = frame.layerName;

      if (entry?.ref) {
        const containerAncestor = this._getContainerDirectChild(entry.ref);
        this._moveSublayerToIndex(containerAncestor, frame.savedIndex);
        this._prepareForClosing(entry);
      }

      this._updateDimLayer();

      // Back navigation is the only path that enables "mirror on back" animation behavior.
      this._runClosingTransition(entry, () => {
        if (entry) {
          this._applyState(entry, entry.prevState);
          this._restoreRuntimeTimescale(entry);
        }
        this._restoreInteractiveSnapshot(frame.interactiveSnapshot);
        this._trigger("OnScreenHidden");
        this._trigger("OnLayerStateChanged");
        this._trigger("OnAnyLayerStateChanged");
      }, true /* isBackNav */);

      this._log(`Popped ${frame.layerName}. Stack depth: ${this._focusStack.length}`);
    }

    _actPopFocusToLayer(layerName) {
      if (layerName === "") {
        while (this._focusStack.length > 0) this._actPopFocusStack();
        return;
      }
      // "Return to" only walks BACK through history. Asking it for a screen that was never
      // navigated to is a no-op, which is indistinguishable from a broken transition — so say so.
      if (!this._focusStack.some(f => f.layerName === layerName)) {
        this._warnOnce(
          `returnto:${layerName}`,
          `Go to screen "${layerName}" with mode "Return to" did nothing: "${layerName}" is not in the ` +
          `navigation history, so there is no history to unwind. Use mode "Push" to show a screen ` +
          `for the first time — "Return to" only goes back to a screen already navigated to.`
        );
        return;
      }
      while (
        this._focusStack.length > 0 &&
        this._focusStack.at(-1).layerName !== layerName
      ) {
        this._actPopFocusStack();
      }
    }

    _actShowPopup(layerName) {
      const entry = this._getEntry(layerName);
      if (!entry || entry.role !== "popup") {
        this._log(`ShowPopup: ${layerName} not found or not a popup-role layer`);
        return;
      }
      if (this._popupStack.includes(layerName)) return;

      const targetIndex = this._getTopPopupSublayerIndex();
      this._moveSublayerToIndex(this._getContainerDirectChild(entry.ref), targetIndex);

      entry.prevState = entry.state;
      this._popupStack.push(layerName);

      this._markLastChanged(layerName, "visible");

      this._applyRuntimeTimescale(entry);
      this._updateDimLayer();

      this._runOpeningTransition(entry, () => {
        entry.ref.isVisible     = true;
        entry.ref.isInteractive = true;
        this._setLayerCollisions(entry, true);
        entry.state = "visible";
        this._trigger("OnPopupOpened");
        this._emitLayerStateChanged();
      });
    }

    _actHidePopup(layerName) {
      const entry = this._getEntry(layerName);
      if (!entry || entry.role !== "popup") return;

      // Cancel any scheduled auto-dismiss
      this._cancelDismissTimer(entry);

      this._prepareForClosing(entry, "hidden");

      this._markLastChanged(layerName, "hidden");

      this._updateDimLayer();

      this._runClosingTransition(entry, () => {
        entry.ref.isVisible = false;
        entry.state       = "hidden";
        entry.prevState   = "visible";
        this._popupStack  = this._popupStack.filter(n => n !== layerName);
        this._restoreRuntimeTimescale(entry);
        this._updateDimLayer();
        this._trigger("OnPopupClosed");
        this._emitLayerStateChanged();
      });
    }

    _actShowTooltip(layerName) {
      if (this._activeTooltip !== null && this._activeTooltip !== layerName) {
        this._actHideTooltip(this._activeTooltip);
      }

      const entry = this._getEntry(layerName);
      if (!entry || entry.role !== "tooltip") return;

      this._moveSublayerToIndex(this._getContainerDirectChild(entry.ref), this._getContainerTopIndex());

      entry.ref.isVisible     = true;
      entry.ref.isInteractive = false;
      this._setLayerCollisions(entry, false);
      entry.prevState = entry.state;
      entry.state     = "visible";
      this._activeTooltip = layerName;

      this._markLastChanged(layerName, "visible");

      this._emitLayerStateChanged();
    }

    _actHideTooltip(layerName) {
      const entry = this._getEntry(layerName);
      if (!entry || entry.role !== "tooltip") return;

      entry.ref.isVisible = false;
      entry.prevState   = entry.state;
      entry.state       = "hidden";
      if (this._activeTooltip === layerName) this._activeTooltip = null;

      this._markLastChanged(layerName, "hidden");

      this._emitLayerStateChanged();
    }

    _actHideActiveTooltip() {
      if (this._activeTooltip !== null) this._actHideTooltip(this._activeTooltip);
    }

    _actReplaceScreen(layerName) {
      // Silently replace the current top screen without adding to history.
      if (this._focusStack.length > 0) {
        const frame = this._focusStack.pop();
        const old   = this._getEntry(frame.layerName);
        if (old?.ref) {
          const ancestor = this._getContainerDirectChild(old.ref);
          this._moveSublayerToIndex(ancestor, frame.savedIndex);
          this._applyState(old, old.prevState ?? "hidden");
        }
      }
      this._actFocusLayer(layerName);
    }

    _actNavigateToScreenWithData(layerName, key, value) {
      this._actSetLayerData(layerName, key, value);
      this._actFocusLayer(layerName);
    }

    _actShowPopupFor(layerName, durationMs) {
      this._actShowPopup(layerName);
      const entry = this._getEntry(layerName);
      if (!entry) return;
      this._cancelDismissTimer(entry);
      entry.dismissTimer = setTimeout(() => {
        entry.dismissTimer = null;
        this._actHidePopup(layerName);
      }, durationMs);
    }

    _actNavigateBackToRoot() {
      if (this._focusStack.length <= 1) return;

      // Silently close all screens above the root without animation.
      while (this._focusStack.length > 1) {
        const frame = this._focusStack.pop();
        const entry = this._getEntry(frame.layerName);
        if (entry?.ref) {
          if (entry.animating) this._completeAnim(entry);
          const ancestor = this._getContainerDirectChild(entry.ref);
          this._moveSublayerToIndex(ancestor, frame.savedIndex);
          this._applyState(entry, entry.prevState ?? "hidden");
        }
        this._lastUnfocusedLayer = frame.layerName;
        this._lastChangedLayer   = frame.layerName;
      }

      // Ensure root screen is fully interactive.
      const rootFrame = this._focusStack[0];
      if (rootFrame) {
        const rootEntry = this._getEntry(rootFrame.layerName);
        if (rootEntry) this._applyState(rootEntry, "focused");
        this._lastChangedLayer = rootFrame.layerName;
      }

      this._updateDimLayer();
      this._emitLayerStateChanged();
      this._log(`Navigated back to root: ${this._focusStack[0]?.layerName}`);
    }

    _actCloseAllPopups() {
      const snapshot = [...this._popupStack];
      for (const name of snapshot) {
        this._actHidePopup(name);
      }
    }

    _actCompleteTransition(layerName) {
      const entry = this._getEntry(layerName);
      if (!entry) return;

      if (entry.animating) {
        this._completeAnim(entry);
      } else if (entry.pendingState !== null) {
        this._applyState(entry, entry.pendingState);
        entry.pendingState = null;
        this._emitLayerStateChanged();
      }

      for (const m of this._collectFlourishCue(entry.ref)) {
        if (m._isAnimating?.()) m._finishAnimation?.();
      }
    }

    _actSkipAllAnimations() {
      for (const name of [...this._animatingLayers]) {
        this._completeAnim(this._getEntry(name));
      }

      for (const entry of this._layers.values()) {
        if (!entry.ref) continue;
        for (const m of this._collectFlourishCue(entry.ref)) {
          if (m._isAnimating?.()) m._finishAnimation?.();
        }
      }
    }

    // ─────────────────────────────────────────────────────────
    // Savegame
    // ─────────────────────────────────────────────────────────

    // A savegame written mid-transition is a problem this plugin cannot fix at save time. C3
    // serialises instance positions and sizes, layer opacity and per-instance collisionsEnabled
    // itself — and it captures them while a transition still has them displaced, disabled or
    // half-faded. Nothing guarantees whether _saveToJson() runs before or after that
    // serialisation, so rather than trying to clean up first, record where everything belongs
    // and settle it on load. Restoring, not resuming: a transition is transient state, and the
    // saved layer/stack bookkeeping already describes where the UI was heading.
    _collectPendingSettle() {
      const instances = [];
      const layers = [];
      const collisions = [];

      for (const name of this._animatingLayers) {
        const entry = this._getEntry(name);
        if (!entry) continue;

        if (entry.animBaseTransforms) {
          for (const [, base] of this._liveTransforms(entry)) {
            const [x, y] = this._originOf(base);
            instances.push({ uid: base.uid, x, y, width: base.width, height: base.height });
          }
        }

        // Layer opacity is mid-fade; put back the authored value.
        if (entry.animBaseOpacities) {
          for (const [layerRef, opacity] of entry.animBaseOpacities) {
            if (layerRef?.name) layers.push({ name: layerRef.name, opacity });
          }
        }

        // _startAnim disables collisions for the duration. Only an OPENING transition would have
        // re-enabled them on completion; a closing one legitimately ends with them off.
        if (entry.animDir === "opening" && entry._savedCollisions) {
          for (const inst of entry._savedCollisions) {
            if (typeof inst?.uid === "number") collisions.push(inst.uid);
          }
        }
      }

      if (!instances.length && !layers.length && !collisions.length) return null;
      return { instances, layers, collisions };
    }

    // Instances may not exist yet while _loadFromJson() runs, which is why C3 documents
    // getInstanceByUid() as an "afterload" operation. Unresolved records are kept for that pass,
    // then dropped — a stale record must not be retried against every future load.
    _settlePendingSettle(isFinalPass) {
      const pending = this._pendingSettle;
      if (!pending) return;

      const unresolved = [];
      let settled = 0;
      for (const rec of pending.instances ?? []) {
        const inst = typeof this.runtime.getInstanceByUid === "function"
          ? this.runtime.getInstanceByUid(rec.uid)
          : null;
        if (!inst) { unresolved.push(rec); continue; }
        inst.x = rec.x;
        inst.y = rec.y;
        if (typeof rec.width  === "number" && typeof inst.width  === "number") inst.width  = rec.width;
        if (typeof rec.height === "number" && typeof inst.height === "number") inst.height = rec.height;
        settled++;
      }

      for (const rec of pending.layers ?? []) {
        const ref = this._resolveLayer(rec.name);
        if (ref) ref.opacity = rec.opacity;
      }

      for (const uid of pending.collisions ?? []) {
        const inst = typeof this.runtime.getInstanceByUid === "function"
          ? this.runtime.getInstanceByUid(uid)
          : null;
        if (inst && typeof inst.collisionsEnabled === "boolean") inst.collisionsEnabled = true;
      }

      if (settled > 0 || (pending.layers?.length ?? 0) > 0) {
        this._log(`Settled ${settled} instance(s) and ${pending.layers?.length ?? 0} layer(s) left mid-transition by a savegame`);
      }

      this._pendingSettle = isFinalPass || unresolved.length === 0
        ? null
        : { instances: unresolved, layers: [], collisions: [] };
    }

    _saveToJson() {
      const layers = [];
      for (const [name, entry] of this._layers) {
        layers.push({
          name,
          role:             entry.role,
          state:            entry.state,
          prevState:        entry.prevState,
          isModal:          entry.isModal,
          manageCollisions: entry.manageCollisions,
          mirrorOnBack:     entry.mirrorOnBack,
          customData:       [...entry.customData.entries()],
        });
      }
      const json = {
        layers,
        focusStack:    this._focusStack.map(f => f.layerName),
        popupStack:    [...this._popupStack],
        activeTooltip: this._activeTooltip,
        pendingSettle: this._collectPendingSettle(),
      };
      if (this._getProperty("persistAcrossLayouts")) {
        globalThis.__uimanager_state = json;
      }
      return json;
    }

    _loadFromJson(o) {
      this._containerRef = this._resolveContainer();
      this._layers.clear();
      this._focusStack    = [];
      this._popupStack    = o.popupStack    ?? [];
      this._activeTooltip = o.activeTooltip ?? null;

      for (const l of (o.layers ?? [])) {
        const ref = this._resolveLayer(l.name);
        this._layers.set(l.name, this._createLayerEntry({
          name: l.name,
          ref,
          role: l.role,
          state: l.state,
          prevState: l.prevState,
          isModal: l.isModal ?? true,
          manageCollisions: l.manageCollisions ?? false,
          customData: new Map(l.customData ?? []),
          mirrorOnBack: l.mirrorOnBack ?? false,
        }));
      }

      // Try immediately — on the persist-across-layouts path the instances already exist — and
      // again on "afterload" for the savegame path, where they do not yet.
      this._pendingSettle = o.pendingSettle ?? null;
      this._settlePendingSettle(false);

      for (const name of (o.focusStack ?? [])) {
        const entry = this._layers.get(name);
        if (entry?.ref) {
          this._focusStack.push({
            layerName:           name,
            savedIndex:          this._getSublayerIndex(entry.ref),
            interactiveSnapshot: new Map(),
          });
        }
      }

      globalThis.__uimanager_state = null;
    }
  };
}
