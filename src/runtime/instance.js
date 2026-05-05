import { id, addonType } from "../../config.caw.js";
import AddonTypeMap from "../../template/addonTypeMap.js";

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
        const animTypeKeys = ["fade", "slideLeft", "slideRight", "slideUp", "slideDown", "none"];
        const easingKeys   = ["linear", "easeIn", "easeOut", "easeInOut"];
        this._props = {
          uiContainerLayer:    props[0],
          defaultAnimType:     animTypeKeys[props[2]] ?? "fade",
          defaultAnimDuration: props[3],
          defaultAnimEasing:   easingKeys[props[4]]   ?? "easeOut",
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
        case "easeIn":    return t * t;
        case "easeOut":   return t * (2 - t);
        case "easeInOut": return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        default:          return t; // linear
      }
    }

    _getAnimValues(type, dir) {
      const w = this.runtime.layout.width;
      const h = this.runtime.layout.height;
      const opening = dir === "opening";
      switch (type) {
        case "fade":
          return opening ? { from: 0, to: 1 } : { from: 1, to: 0 };
        case "slideLeft":
          return opening ? { from: -w, to: 0 } : { from: 0, to: -w };
        case "slideRight":
          return opening ? { from: w,  to: 0 } : { from: 0, to: w };
        case "slideUp":
          return opening ? { from: -h, to: 0 } : { from: 0, to: -h };
        case "slideDown":
          return opening ? { from: h,  to: 0 } : { from: 0, to: h };
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
      this._resetAnimProperties(entry, effectiveType);

      entry.animating    = false;
      entry.animDir      = "";
      entry.animProgress = 1;
      this._animatingLayers.delete(entry.name);

      const cb = entry.animOnComplete;
      entry.animOnComplete = null;

      this._trigger("OnLayerTransitionComplete");
      cb?.();
      this._log(`Anim complete: ${entry.name}`);
    }

    _tickAnimations(dt) {
      for (const name of this._animatingLayers) {
        const entry         = this._getEntry(name);
        const config        = this._getAnimConfig(entry);
        const effectiveType = entry.animEffectiveType ?? config.type;

        entry.animElapsed += dt;
        const t      = Math.min(entry.animElapsed / config.duration, 1);
        const easedT = this._applyEasing(t, config.easing);
        const value  = entry.animFrom + (entry.animTo - entry.animFrom) * easedT;

        entry.animProgress = t;
        this._applyAnimValue(entry, effectiveType, value);

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
      const entry = {
        name: layerName, ref,
        role, state: "visible", prevState: "visible",
        isModal, manageCollisions,
        customData: new Map(),
        mirrorOnBack: false, dismissTimer: null,
        animType: null, animDuration: null, animEasing: null,
        animating: false, animDir: "", animProgress: 0,
        animElapsed: 0, animFrom: 0, animTo: 0,
        animOnComplete: null, pendingState: null,
        animBaseScrolls: null, animEffectiveType: null,
        runtimeTimescale: null, savedRuntimeTimescale: null,
        _savedCollisions: null,
      };
      this._layers.set(layerName, entry);
      if (manageCollisions) {
        this._setLayerCollisions(entry, entry.ref.isInteractive);
      }
      this._log(`Tracked layer ${layerName} as ${role}`);
    }

    _actUntrackLayer(layerName) {
      const entry = this._getEntry(layerName);
      if (entry?.dismissTimer !== null) {
        clearTimeout(entry.dismissTimer);
      }
      this._focusStack = this._focusStack.filter(f => f.layerName !== layerName);
      this._popupStack = this._popupStack.filter(n => n !== layerName);
      if (this._activeTooltip === layerName) this._activeTooltip = null;
      this._layers.delete(layerName);
    }

    _actUntrackAllLayers() {
      for (const entry of this._layers.values()) {
        if (entry.dismissTimer !== null) clearTimeout(entry.dismissTimer);
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
      this._lastChangedLayer = layerName;
      this._lastChangedState = state;

      const config = this._getAnimConfig(entry);

      if ((state === "visible" || state === "focused") && config.type !== "none") {
        this._trigger("OnLayerOpening");
        this._startAnim(entry, "opening", () => {
          this._applyState(entry, state);
          this._trigger("OnLayerStateChanged");
          this._trigger("OnAnyLayerStateChanged");
        });
      } else if ((state === "hidden" || state === "disabled") && config.type !== "none") {
        entry.pendingState = state;
        entry.ref.isInteractive = false;
        this._setLayerCollisions(entry, false);
        this._trigger("OnLayerClosing");
        this._startAnim(entry, "closing", () => {
          this._applyState(entry, entry.pendingState);
          entry.pendingState = null;
          this._trigger("OnLayerStateChanged");
          this._trigger("OnAnyLayerStateChanged");
        });
      } else {
        this._applyState(entry, state);
        this._trigger("OnLayerStateChanged");
        this._trigger("OnAnyLayerStateChanged");
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
      this._lastChangedLayer   = layerName;
      this._lastChangedState   = "focused";

      this._applyRuntimeTimescale(entry);
      this._trigger("OnLayerOpening");
      this._updateDimLayer();

      this._startAnim(entry, "opening", () => {
        this._applyState(entry, "focused");
        this._trigger("OnLayerFullyOpened");
        this._trigger("OnLayerStateChanged");
        this._trigger("OnAnyLayerStateChanged");
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
        entry.ref.isInteractive = false;
        this._setLayerCollisions(entry, false);
      }

      this._trigger("OnLayerClosing");
      this._updateDimLayer();

      this._startAnim(entry, "closing", () => {
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

      this._lastChangedLayer = layerName;
      this._lastChangedState = "visible";

      this._applyRuntimeTimescale(entry);
      this._trigger("OnLayerOpening");
      this._updateDimLayer();

      this._startAnim(entry, "opening", () => {
        entry.ref.isVisible     = true;
        entry.ref.isInteractive = true;
        this._setLayerCollisions(entry, true);
        entry.state = "visible";
        this._trigger("OnLayerStateChanged");
        this._trigger("OnAnyLayerStateChanged");
      });
    }

    _actHidePopup(layerName) {
      const entry = this._getEntry(layerName);
      if (!entry || entry.role !== "popup") return;

      // Cancel any scheduled auto-dismiss
      if (entry.dismissTimer !== null) {
        clearTimeout(entry.dismissTimer);
        entry.dismissTimer = null;
      }

      entry.ref.isInteractive = false;
      this._setLayerCollisions(entry, false);
      entry.pendingState = "hidden";

      this._lastChangedLayer = layerName;
      this._lastChangedState = "hidden";

      this._trigger("OnLayerClosing");
      this._updateDimLayer();

      this._startAnim(entry, "closing", () => {
        entry.ref.isVisible = false;
        entry.state       = "hidden";
        entry.prevState   = "visible";
        this._popupStack  = this._popupStack.filter(n => n !== layerName);
        this._restoreRuntimeTimescale(entry);
        this._updateDimLayer();
        this._trigger("OnLayerStateChanged");
        this._trigger("OnAnyLayerStateChanged");
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

      this._lastChangedLayer = layerName;
      this._lastChangedState = "visible";

      this._trigger("OnLayerStateChanged");
      this._trigger("OnAnyLayerStateChanged");
    }

    _actHideTooltip(layerName) {
      const entry = this._getEntry(layerName);
      if (!entry || entry.role !== "tooltip") return;

      entry.ref.isVisible = false;
      entry.prevState   = entry.state;
      entry.state       = "hidden";
      if (this._activeTooltip === layerName) this._activeTooltip = null;

      this._lastChangedLayer = layerName;
      this._lastChangedState = "hidden";

      this._trigger("OnLayerStateChanged");
      this._trigger("OnAnyLayerStateChanged");
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
      if (entry.dismissTimer !== null) clearTimeout(entry.dismissTimer);
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
      this._trigger("OnLayerStateChanged");
      this._trigger("OnAnyLayerStateChanged");
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
        this._trigger("OnLayerStateChanged");
        this._trigger("OnAnyLayerStateChanged");
      }
    }

    _actSkipAllAnimations() {
      for (const name of [...this._animatingLayers]) {
        this._completeAnim(this._getEntry(name));
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
        this._layers.set(l.name, {
          name:             l.name,
          ref,
          role:             l.role,
          state:            l.state,
          prevState:        l.prevState,
          isModal:          l.isModal          ?? true,
          manageCollisions: l.manageCollisions ?? false,
          customData:       new Map(l.customData ?? []),
          mirrorOnBack: l.mirrorOnBack ?? false, dismissTimer: null,
          animType: null, animDuration: null, animEasing: null,
          animating: false, animDir: "", animProgress: 0,
          animElapsed: 0, animFrom: 0, animTo: 0,
          animOnComplete: null, pendingState: null,
          animBaseScrolls: null, animEffectiveType: null,
        });
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
