import { id, addonType } from "../../config.caw.js";
import AddonTypeMap from "../../template/addonTypeMap.js";

// Keep combo mappings in one place so property parsing and ACE combo decoding stay aligned.
const ANIM_TYPE_KEYS = ["fade", "slideLeft", "slideRight", "slideUp", "slideDown", "none", "scaleDown", "scaleUp"];
const EASING_KEYS = ["linear", "easeIn", "easeOut", "easeInOut", "quadraticOut", "quarticOut", "exponentialOut", "circularOut", "backOut", "elasticOut", "bounceOut"];

// Animation tuning constants.
const SLIDE_BUFFER_PX = 100;
const SCALE_OPACITY_DURATION_MS = 300;

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

      // Cache properties by name for easy access.
      // Index order MUST match the declaration order in config.caw.js.
      // GROUP properties occupy index slots (no value).
      // 0:uiContainerLayer
      // 1:GROUP(Transitions) 2:defaultAnimType 3:defaultAnimDuration 4:defaultAnimEasing
      // 5:GROUP(Behavior) 6:persistAcrossLayouts 7:debugMode
      // 8:GROUP(Modal/Dim) 9:dimLayer 10:dimOpacity
      const props = this._getInitProperties();
      if (props) {
        // COMBO properties arrive as 0-based numeric indices — map to strings.
        this._props = {
          uiContainerLayer:    props[0],
          defaultAnimType:     ANIM_TYPE_KEYS[props[2]] ?? "fade",
          defaultAnimDuration: props[3],
          defaultAnimEasing:   EASING_KEYS[props[4]]   ?? "easeOut",
          persistAcrossLayouts: props[6],
          debugMode:           props[7],
          dimLayer:            props[9],
          dimOpacity:          props[10],
        };
      } else {
        this._props = {};
      }

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
    }

    // ─────────────────────────────────────────────────────────
    // onCreate - called by C3 after the instance is fully set up.
    // Safe to access this.runtime, layout, and layer APIs here.
    // ─────────────────────────────────────────────────────────
    onCreate() {

      this._containerRef = this._resolveContainer();

      // Clear the cached dim layer ref on layout change so _resolveDimLayer()
      // fetches a fresh reference from the new layout (IsSingleGlobal stale-ref gotcha).
      this.runtime.addEventListener("beforelayout", () => {
        this._dimLayerRef = null;
      });

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
      const name = this._getProperty("uiContainerLayer");
      const ref = this.runtime.layout.getLayer(name);
      if (!ref) this._log(`Container layer "${name}" not found`);
      return ref ?? null;
    }

    // Always returns a fresh container reference from the current layout.
    // Use this instead of this._containerRef anywhere Z-order or sublayer iteration is needed.
    _getContainerRef() {
      return this.runtime.layout.getLayer(this._getProperty("uiContainerLayer")) ?? null;
    }

    _resolveLayer(name) {
      // Always resolve from the current layout — handles IsSingleGlobal layout changes
      // and avoids stale _containerRef references after a layout switch.
      const containerName = this._getProperty("uiContainerLayer");
      const containerRef  = this.runtime.layout.getLayer(containerName);
      if (!containerRef) {
        this._log(`Container layer "${containerName}" not found — check the UI Container Layer property`);
        return null;
      }

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
      const hasFocusedModal = topEntry?.isModal === true;

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

    _applyAnimValue(entry, type, value) {
      switch (type) {
        case "fade":
          entry.ref.opacity = value; // opacity cascades; apply to group root only
          break;
        case "slideLeft":
        case "slideRight":
          for (const l of this._getAnimTargetLayers(entry.ref)) {
            const base = entry.animBaseScrolls?.get(l)?.x ?? 0;
            l.scrollX = base + value;
          }
          break;
        case "slideUp":
        case "slideDown":
          for (const l of this._getAnimTargetLayers(entry.ref)) {
            const base = entry.animBaseScrolls?.get(l)?.y ?? 0;
            l.scrollY = base + value;
          }
          break;
        case "scaleDown":
        case "scaleUp":
          if (typeof entry.ref.scale === "number") {
            entry.ref.scale = value;
          }
          break;
      }
    }

    _resetAnimProperties(entry, type) {
      switch (type) {
        case "fade":
          entry.ref.opacity = 1;
          break;
        case "slideLeft":
        case "slideRight":
          for (const l of this._getAnimTargetLayers(entry.ref)) {
            l.scrollX = entry.animBaseScrolls?.get(l)?.x ?? 0;
          }
          break;
        case "slideUp":
        case "slideDown":
          for (const l of this._getAnimTargetLayers(entry.ref)) {
            l.scrollY = entry.animBaseScrolls?.get(l)?.y ?? 0;
          }
          break;
        case "scaleDown":
        case "scaleUp":
          if (typeof entry.ref.scale === "number") {
            entry.ref.scale = entry.animBaseScale ?? 1;
          }
          entry.ref.opacity = entry.animBaseOpacity ?? 1;
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

      entry.animBaseOpacity = entry.ref.opacity;
      if (effectiveType === "scaleDown" || effectiveType === "scaleUp") {
        entry.animBaseScale = typeof entry.ref.scale === "number" ? entry.ref.scale : 1;
      }

      // Capture current scroll of each target layer so _applyAnimValue can use deltas.
      const targetLayers = this._getAnimTargetLayers(entry.ref);
      entry.animBaseScrolls = new Map();
      for (const l of targetLayers) {
        entry.animBaseScrolls.set(l, { x: l.scrollX, y: l.scrollY });
      }

      const { from, to } = this._getAnimValues(effectiveType, dir);

      entry.animating     = true;
      entry.animDir       = dir;
      entry.animProgress  = 0;
      entry.animElapsed   = 0;
      entry.animFrom      = from;
      entry.animTo        = to;
      entry.animOnComplete = onComplete;

      // Match Aekiro's scale behavior: opacity uses a short, separate tween so elastic/back easings
      // affect only scale and not alpha readability.
      entry.animOpacityEnabled  = (effectiveType === "scaleDown" || effectiveType === "scaleUp");
      entry.animOpacityElapsed  = 0;
      entry.animOpacityDuration = SCALE_OPACITY_DURATION_MS;
      if (entry.animOpacityEnabled) {
        entry.animOpacityFrom = dir === "opening" ? 0 : (entry.ref.opacity ?? 1);
        entry.animOpacityTo   = dir === "opening" ? (entry.animBaseOpacity ?? 1) : 0;
        entry.ref.opacity = entry.animOpacityFrom;
      }

      entry.ref.isVisible     = true;
      entry.ref.isInteractive = false;
      this._setLayerCollisions(entry, false);

      this._applyAnimValue(entry, effectiveType, from);
      this._setTicking(true);
      this._animatingLayers.add(entry.name);
      this._log(`Anim start: ${entry.name} ${dir}`);
    }

    _completeAnim(entry) {
      const config = this._getAnimConfig(entry);
      const effectiveType = entry.animEffectiveType ?? config.type;
      this._applyAnimValue(entry, effectiveType, entry.animTo);
      if (entry.animOpacityEnabled) {
        entry.ref.opacity = entry.animOpacityTo;
      }
      this._resetAnimProperties(entry, effectiveType);

      entry.animating    = false;
      entry.animDir      = "";
      entry.animProgress = 1;
      entry.animOpacityEnabled = false;
      this._animatingLayers.delete(entry.name);

      const cb = entry.animOnComplete;
      entry.animOnComplete = null;

      this._trigger("OnLayerTransitionComplete");
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
        const easedT = this._applyEasing(t, config.easing);
        const value  = entry.animFrom + (entry.animTo - entry.animFrom) * easedT;

        entry.animProgress = t;
        this._applyAnimValue(entry, effectiveType, value);

        if (entry.animOpacityEnabled) {
          entry.animOpacityElapsed += dt;
          const ot = Math.min(entry.animOpacityElapsed / entry.animOpacityDuration, 1);
          const easedOpacityT = this._applyEasing(ot, "quarticOut");
          entry.ref.opacity = entry.animOpacityFrom + (entry.animOpacityTo - entry.animOpacityFrom) * easedOpacityT;
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

    _getAllInstancesOnLayer(layerRef) {
      const results = [];
      for (const objType of this.runtime.objects) {
        for (const inst of objType.getAllInstances()) {
          if (inst.layer === layerRef) results.push(inst);
        }
      }
      // Recurse into sublayers for group layers
      for (const sub of this._getDirectSublayers(layerRef)) {
        results.push(...this._getAllInstancesOnLayer(sub));
      }
      return results;
    }

    // Duck-typed discovery for per-object transition behaviors (e.g. FlourishCue).
    // No hardcoded addon IDs so companion addons can integrate via method contract.
    _collectFlourishCue(layerRef) {
      const result = [];
      for (const inst of this._getAllInstancesOnLayer(layerRef)) {
        const behaviors = inst.behaviors;
        if (!behaviors) continue;
        for (const key in behaviors) {
          const b = behaviors[key];
          if (b && typeof b._playOpen === "function" && typeof b._playClose === "function") {
            result.push(b);
            break;
          }
        }
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
        this._setTicking(false);
        return;
      }
      this._tickAnimations(this.runtime.dt * 1000);
    }

    // ─────────────────────────────────────────────────────────
    // Logging
    // ─────────────────────────────────────────────────────────

    _log(msg) {
      if (this._debug) console.log(`[UIDirector] ${msg}`);
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
    _runOpeningTransition(entry, onOpened) {
      this._trigger("OnLayerOpening");

      const motions = this._collectFlourishCue(entry.ref);
      const signal = this._makeBarrier(1 + motions.length, onOpened);

      // Ensure objects can run their own intro animation immediately.
      entry.ref.isVisible = true;

      for (const m of motions) {
        try {
          m._playOpen(() => signal());
        } catch (_) {
          signal();
        }
      }
      this._startAnim(entry, "opening", () => signal());
    }

    _runClosingTransition(entry, onClosed, isBackNav = false) {
      this._trigger("OnLayerClosing");

      const motions = this._collectFlourishCue(entry.ref);
      const signal = this._makeBarrier(1 + motions.length, onClosed);

      for (const m of motions) {
        try {
          m._playClose(() => signal());
        } catch (_) {
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

    // UI Suite bridge methods (used by UIForge when available).
    // These intentionally forward to existing UIDirector state/actions.
    _navigateBack() {
      this._actPopFocusStack();
    }

    _goBack() {
      this._navigateBack();
    }

    _getLastChangedLayer() {
      return this._lastChangedLayer ?? "";
    }

    _getLastChangedState() {
      return this._lastChangedState ?? "";
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
        animBaseScrolls: null,
        animEffectiveType: null,
        animBaseScale: 1,
        animBaseOpacity: 1,
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
        this._log(`Layer not found: ${layerName}`);
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
      this._animatingLayers.delete(layerName);
      this._focusStack = this._focusStack.filter(f => f.layerName !== layerName);
      this._popupStack = this._popupStack.filter(n => n !== layerName);
      if (this._activeTooltip === layerName) this._activeTooltip = null;
      this._layers.delete(layerName);
    }

    _actUntrackAllLayers() {
      for (const entry of this._layers.values()) {
        this._cancelDismissTimer(entry);
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
        this._log(`FocusLayer: ${layerName} not found or not a normal-role layer`);
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
        this._trigger("OnLayerFullyOpened");
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
        this._trigger("OnLayerFullyClosed");
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
