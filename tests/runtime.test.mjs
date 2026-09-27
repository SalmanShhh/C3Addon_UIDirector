// Regression suite for the UIDirector runtime (src/runtime/instance.js).
//
// Runs the real instance class against a small fake of the Construct runtime: layers, world
// instances with scene-graph propagation, behaviours, and a deterministic clock. It covers the
// transition bugs fixed in v1.3.0.x so they cannot quietly come back.
//
// Run: npm test   (or: node tests/runtime.test.mjs). Exits non-zero on any failure.

import createInstanceClass from "../src/runtime/instance.js";

// ── Fake Construct environment ─────────────────────────────────────────────────────

globalThis.self = globalThis;
globalThis.C3 = { Plugins: { salmanshh_uidirector: { Cnds: new Proxy({}, { get: () => () => true }) } } };

// The plugin times UI transitions with performance.now(); drive it deterministically.
let clock = 0;
Object.defineProperty(globalThis, "performance", { value: { now: () => clock }, configurable: true, writable: true });
const FRAME = 1000 / 60;

function mkLayer(name, subs = []) {
  const l = {
    name, isVisible: true, isInteractive: true, opacity: 1, scrollX: 320, scrollY: 200, parentLayer: null, _subs: subs,
    subLayers() { return this._subs[Symbol.iterator](); },
    allSubLayers() { const o = []; (function w(ls) { ls.forEach((x) => { o.push(x); w(x._subs); }); })(this._subs); return o[Symbol.iterator](); },
    getLayer(k) { return this._subs.find((x) => x.name === k) ?? null; },
  };
  for (const s of subs) s.parentLayer = l;
  return l;
}

let uid = 1;
// A world instance. Writing a parent's x/y propagates the delta to children that opted in,
// the way Construct's scene graph does.
function mkInst(layer, x, name, behaviors, { y = 200, w = 40, h = 40 } = {}) {
  return {
    uid: uid++, layer, width: w, height: h, opacity: 1, collisionsEnabled: true, timeScale: 1,
    objectType: { name }, behaviors, _x: x, _y: y, _parent: null, _children: [], _opts: null,
    getParent() { return this._parent; },
    *parents() { let p = this._parent; while (p) { yield p; p = p._parent; } },
    getHierarchyOpts() { return this._opts; },
    addChild(c, o) { c._parent = this; c._opts = o; this._children.push(c); },
    get x() { return this._x; },
    set x(v) { const d = v - this._x; this._x = v; for (const c of this._children) if (c._opts?.transformX) c.x = c.x + d; },
    get y() { return this._y; },
    set y(v) { const d = v - this._y; this._y = v; for (const c of this._children) if (c._opts?.transformY) c.y = c.y + d; },
  };
}

function world({ props, layers, instances, onSweep }) {
  const flat = [];
  (function w(ls) { ls.forEach((l) => { flat.push(l); w(l._subs); }); })(layers);
  const runtime = {
    dt: 1 / 60, timeScale: 1,
    // Live view of `instances`, so tests can spawn objects mid-transition.
    objects: new Proxy({}, {
      ownKeys: () => instances.map((_, i) => `T${i}`),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      get: (_, k) => {
        const i = instances[Number(String(k).slice(1))];
        return i && { getAllInstances: () => { onSweep?.(); return [i]; } };
      },
    }),
    getInstanceByUid: (u) => instances.find((i) => i.uid === u) ?? null,
    getViewportSize: () => [640, 400],
    layout: { name: "L1", width: 640, height: 400, getAllLayers: () => flat, getLayer: (n) => flat.find((l) => l.name === n) ?? null, moveLayerToIndex: () => {} },
    _listeners: {},
    addEventListener(ev, cb) { (this._listeners[ev] ??= []).push(cb); },
  };
  class FakeBase {
    constructor() { this._ticking = false; }
    _getInitProperties() { return props; }
    _setTicking(v) { this._ticking = v; }
    _trigger() {}
    _release() {}
    get runtime() { return runtime; }
  }
  const inst = new (createInstanceClass(FakeBase))();
  inst.onCreate();
  return { inst, runtime };
}

function tick(inst, frames, each) {
  for (let f = 0; f < frames; f++) { clock += FRAME; each?.(f); if (inst._ticking) inst._tick(); }
}

// Property values: container, animType, duration, easing, anchorMode, dimLayer, dimOpacity, persist, debug.
// animType: 0 fade, 1 slideLeft, 2 slideRight, 3 slideUp, 4 slideDown, 5 none, 6 scaleDown, 7 scaleUp.
// anchorMode: 0 animate ("Move with layer"), 1 hold ("Stay in place").
const P = (anim, dur, anchor = 0) => ["!UI", anim, dur, 0, anchor, "", 0.5, false, false];

const anchorBehavior = () => ({ isEnabled: true, behaviorType: { name: "Anchor" } });

// A per-object animation behaviour following the FlourishCue contract. Starting a new animation
// replaces the pending callback, exactly like FlourishCue does.
function motionBehavior({ autoOpen = true, autoClose = true, onOpen } = {}) {
  return {
    behaviorType: { name: "Cue" }, cb: null,
    _playOpen(cb) { this.cb = cb; onOpen?.(); if (autoOpen) this.finish(); },
    _playClose(cb) { this.cb = cb; if (autoClose) this.finish(); },
    finish() { const c = this.cb; this.cb = null; c?.(); },
  };
}

// ── Test runner ────────────────────────────────────────────────────────────────────

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ── Baseline ───────────────────────────────────────────────────────────────────────

test("every animation type displaces its objects and lands them on their authored transform", () => {
  for (let t = 0; t < 8; t++) {
    const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
    const btn = mkInst(L, 300, "Btn");
    const { inst } = world({ props: P(t, 300), layers: [root], instances: [btn] });
    inst._actTrackLayer("UI - Game", "normal", true, false);
    const before = { x: btn.x, y: btn.y, w: btn.width };
    inst._actFocusLayer("UI - Game");
    const moved = btn.x !== before.x || btn.y !== before.y || btn.width !== before.w || L.opacity !== 1;
    tick(inst, 40);
    assert(t === 5 ? !moved : moved, `type ${t} displaced=${moved}`);
    assert(btn.x === before.x && btn.y === before.y && Math.abs(btn.width - before.w) < 1e-9 && Math.abs(L.opacity - 1) < 1e-9,
      `type ${t} did not land home`);
  }
});

// ── Anchor, hierarchy and external movers ──────────────────────────────────────────

test("Anchor re-asserting every tick does not throw an anchored parent's children off-screen", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const anchor = anchorBehavior();
  const bar = mkInst(L, 0, "Bar", { Anchor: anchor });
  const trash = mkInst(L, 36, "Trash");
  bar.addChild(trash, { transformX: true, transformY: true });
  const { inst } = world({ props: P(2, 1000, 0), layers: [root], instances: [bar, trash] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actFocusLayer("UI - Game");
  tick(inst, 70, () => { if (anchor.isEnabled) bar.x = 0; });   // Anchor writes its home each tick
  assert(bar.x === 0 && trash.x === 36, `bar=${bar.x} trash=${trash.x}`);
  assert(anchor.isEnabled === true, "Anchor not handed back");
});

test("an instance released every transition does not drift over repeated open/close cycles", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const btn = mkInst(L, 36, "Btn");
  const { inst } = world({ props: P(1, 300), layers: [root], instances: [btn] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  for (let c = 0; c < 20; c++) {
    inst._actSetLayerState("UI - Game", "visible");
    tick(inst, 25, (f) => { if (f === 2) btn.x += 1; });          // nudged by something else
    inst._actSetLayerState("UI - Game", "hidden");
    tick(inst, 25);
  }
  assert(Math.abs(btn.x - 36) < 60, `drifted to ${btn.x}`);
});

// ── Code review round 1 ────────────────────────────────────────────────────────────

test("a screen that freezes the game (timescale 0) still finishes its own opening transition", () => {
  const L = mkLayer("Pause"); const root = mkLayer("!UI", [L]);
  const btn = mkInst(L, 300, "Btn");
  const { inst, runtime } = world({ props: P(1, 300), layers: [root], instances: [btn] });
  inst._actTrackLayer("Pause", "normal", true, false);
  inst._actSetLayerTimescale("Pause", -1, 0);
  let opened = false;
  inst.on("OnLayerOpened", () => { opened = true; });
  inst._actFocusLayer("Pause");
  runtime.dt = 0;                                                  // scaled dt is 0 while frozen
  tick(inst, 40);
  assert(runtime.timeScale === 0 && inst._animatingLayers.size === 0 && btn.x === 300 && opened, "transition froze");
});

test("a mid-transition savegame records suspended Anchors and loading hands them back", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const a = mkInst(L, 300, "Anch", { Anchor: anchorBehavior() });
  const { inst } = world({ props: P(1, 300, 0), layers: [root], instances: [a] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actFocusLayer("UI - Game");
  tick(inst, 3);
  const save = JSON.parse(JSON.stringify(inst._saveToJson()));
  assert(save.pendingSettle?.owners?.some((o) => o.key === "Anchor" && o.kind === "enabled"), "owner not recorded");

  const L2 = mkLayer("UI - Game"); const root2 = mkLayer("!UI", [L2]);
  const anchor2 = { isEnabled: false, behaviorType: { name: "Anchor" } };   // as C3 saved it
  const a2 = mkInst(L2, 300, "Anch", { Anchor: anchor2 }); a2.uid = a.uid;
  const { inst: inst2, runtime: rt2 } = world({ props: P(1, 300, 0), layers: [root2], instances: [a2] });
  inst2._loadFromJson(save);
  rt2._listeners.afterload?.forEach((cb) => cb());
  assert(anchor2.isEnabled === true, "Anchor still disabled after load");
});

test("closing: objects stay at the closed pose until per-object animations finish and the layer hides", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const motion = motionBehavior({ autoClose: false });
  const host = mkInst(L, 100, "Host", { Cue: motion });
  const plain = mkInst(L, 300, "Plain");
  const { inst } = world({ props: P(1, 300), layers: [root], instances: [host, plain] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actSetLayerState("UI - Game", "visible"); tick(inst, 40);
  inst._actSetLayerState("UI - Game", "hidden"); tick(inst, 40);
  assert(L.isVisible === true && plain.x !== 300, "objects popped back while the layer was visible");
  motion.finish();
  assert(L.isVisible === false && plain.x === 300, "not hidden / not reset after motions finished");
});

test("each transition captures the current layer opacity, respecting changes made in between", () => {
  const sub = mkLayer("Sub"); const L = mkLayer("UI - Game", [sub]); const root = mkLayer("!UI", [L]);
  const btn = mkInst(sub, 300, "Btn");
  const { inst } = world({ props: P(0, 200), layers: [root], instances: [btn] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actSetLayerState("UI - Game", "visible"); tick(inst, 30);
  sub.opacity = 0.5;
  inst._actSetLayerState("UI - Game", "visible"); tick(inst, 30);
  assert(Math.abs(sub.opacity - 0.5) < 1e-9, `opacity ${sub.opacity}`);
});

test("a position owner exposing only _setPositionOwnership is suspended, not just animated", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const owner = { isEnabled: true, behaviorType: { name: "VirtualCursor" }, active: true,
                  _setPositionOwnership(v) { this.active = !!v; } };
  const cur = mkInst(L, 300, "Cursor", { VirtualCursor: owner });
  const { inst } = world({ props: P(1, 300), layers: [root], instances: [cur] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actFocusLayer("UI - Game");
  assert(owner.active === false, "not suspended");
  tick(inst, 40);
  assert(owner.active === true && cur.x === 300, "not resumed / not home");
});

test("nested tracked layers keep Anchor suspended until the last transition ends", () => {
  const inner = mkLayer("Inner"); const outer = mkLayer("Outer", [inner]); const root = mkLayer("!UI", [outer]);
  const anchor = anchorBehavior();
  const a = mkInst(inner, 300, "Anch", { Anchor: anchor });
  const { inst } = world({ props: P(1, 200, 0), layers: [root], instances: [a] });
  inst._actTrackLayer("Outer", "normal", true, false);
  inst._actTrackLayer("Inner", "normal", true, false);
  inst._actSetLayerAnimation("Inner", "slideLeft", 800, "linear");
  inst._actSetLayerState("Outer", "visible");
  tick(inst, 2);
  inst._actSetLayerState("Inner", "visible");
  let early = false;
  tick(inst, 70, () => { if (inst._animatingLayers.has("Inner") && anchor.isEnabled) early = true; });
  assert(!early && anchor.isEnabled === true, "Anchor re-enabled mid inner transition");
});

test("a fade does not carry pins over from an earlier slide", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const btn = mkInst(L, 300, "Btn");
  const { inst } = world({ props: P(1, 200), layers: [root], instances: [btn] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actSetLayerState("UI - Game", "visible"); tick(inst, 3);
  const entry = inst._getEntry("UI - Game");
  entry.animPinned.set(btn, { uid: btn.uid });
  tick(inst, 30);
  inst._actSetLayerAnimation("UI - Game", "fade", 200, "linear");
  inst._actSetLayerState("UI - Game", "visible");
  assert(entry.animPinned === null, "pins survived into a fade");
});

test("untracking a layer mid-motion stops its barrier from firing triggers or changing it", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const motion = motionBehavior({ autoOpen: false });
  const host = mkInst(L, 100, "Host", { Cue: motion });
  const { inst } = world({ props: P(0, 200), layers: [root], instances: [host] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actFocusLayer("UI - Game");
  tick(inst, 20);
  inst._actUntrackLayer("UI - Game");
  let opened = false;
  inst.on("OnLayerOpened", () => { opened = true; });
  L.isInteractive = false;
  motion.finish();
  assert(!opened && L.isInteractive === false, "barrier fired for an untracked layer");
});

test("the Anchored Objects fallback matches the declared default (hold)", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const { inst } = world({ props: ["!UI", 0, 200, 0, undefined, "", 0.5, false, false], layers: [root], instances: [] });
  assert(inst._getProperty("anchorMode") === "hold", inst._getProperty("anchorMode"));
});

test("a transition start sweeps the project's objects once", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const btn = mkInst(L, 300, "Btn");
  let sweeps = 0;
  const { inst } = world({ props: P(1, 200), layers: [root], instances: [btn], onSweep: () => sweeps++ });
  inst._actTrackLayer("UI - Game", "normal", true, true);          // collision sync: 4th consumer
  sweeps = 0;
  inst._actFocusLayer("UI - Game");
  assert(sweeps === 1, `swept ${sweeps} times`);
});

// ── Code review round 2 ────────────────────────────────────────────────────────────

test("a transition starting while the motion watchdog waits does not jump in its first frame", () => {
  const A = mkLayer("A"); const B = mkLayer("B"); const root = mkLayer("!UI", [A, B]);
  const stuck = motionBehavior({ autoOpen: false });
  const host = mkInst(A, 100, "Host", { Cue: stuck });
  const anch = mkInst(A, 200, "Anch", { Anchor: anchorBehavior() });  // suspended → watchdog waits
  const btn = mkInst(B, 300, "Btn");
  const { inst } = world({ props: P(1, 300, 0), layers: [root], instances: [host, anch, btn] });
  inst._actTrackLayer("A", "normal", true, false);
  inst._actTrackLayer("B", "normal", true, false);
  inst._actSetLayerState("A", "visible");
  tick(inst, 20 + 15);                                             // tween done, then ~250 ms idle-waiting
  assert(inst._ticking && inst._animatingLayers.size === 0, "precondition: watchdog should be waiting");
  inst._actSetLayerState("B", "visible");
  tick(inst, 1);
  const progress = inst._getEntry("B").animProgress;
  assert(progress < 0.2, `first frame progressed ${progress.toFixed(2)}`);
});

test("loading a savegame mid-transition does not keep driving the replaced entry", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const btn = mkInst(L, 300, "Btn");
  const { inst } = world({ props: P(0, 300), layers: [root], instances: [btn] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actSetLayerState("UI - Game", "visible");
  tick(inst, 3);
  inst._loadFromJson(JSON.parse(JSON.stringify(inst._saveToJson())));
  assert(inst._animatingLayers.size === 0, "stale name left in _animatingLayers");
  tick(inst, 10);
  assert(L.opacity > 0.99, `layer driven to opacity ${L.opacity}`);
});

test("when the watchdog gives up on a closing transition it hides the layer before putting objects back", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const stuck = motionBehavior({ autoClose: false });
  const host = mkInst(L, 100, "Host", { Cue: stuck });
  const plain = mkInst(L, 300, "Plain");
  const anchor = anchorBehavior();
  const anch = mkInst(L, 200, "Anch", { Anchor: anchor });
  const { inst } = world({ props: P(1, 300, 0), layers: [root], instances: [host, plain, anch] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actSetLayerState("UI - Game", "visible"); tick(inst, 40);
  inst._actSetLayerState("UI - Game", "hidden");
  let poppedBackOpen = false;
  tick(inst, 700, () => {
    if (inst._animatingLayers.size === 0 && L.isVisible && plain.x === 300) poppedBackOpen = true;
  });
  assert(!poppedBackOpen, "closing layer reappeared fully open");
  assert(L.isVisible === false && inst._getEntry("UI - Game").state === "hidden", "layer never hidden");
  assert(plain.x === 300 && anchor.isEnabled === true && inst._ticking === false, "not settled after give-up");
});

test("reopening a screen mid-close does not leave a stale hidden state for Finish animation", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const motion = motionBehavior({ autoClose: false });
  const host = mkInst(L, 100, "Host", { Cue: motion });
  const { inst } = world({ props: P(1, 300), layers: [root], instances: [host] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actSetLayerState("UI - Game", "visible"); tick(inst, 40);
  inst._actSetLayerState("UI - Game", "hidden"); tick(inst, 40);   // close waiting on the motion
  inst._actSetLayerState("UI - Game", "visible"); tick(inst, 40);  // reopened; close callback dropped
  inst._actCompleteTransition("UI - Game");
  assert(L.isVisible === true && inst._getEntry("UI - Game").state === "visible", "reopened screen got hidden");
});

test("objects spawned by a per-object animation's open trigger are still animated", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const instances = [];
  let spawned = null;
  const motion = motionBehavior({ onOpen: () => { spawned = mkInst(L, 500, "Spawned"); instances.push(spawned); } });
  instances.push(mkInst(L, 100, "Host", { Cue: motion }));
  const { inst } = world({ props: P(1, 300), layers: [root], instances });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actFocusLayer("UI - Game");
  const entry = inst._getEntry("UI - Game");
  assert(spawned && entry.animBaseTransforms.has(spawned), "spawned object was not captured");
  tick(inst, 40);
  assert(spawned.x === 500, `spawned object ended at ${spawned.x}`);
});

// ── Code review round 3 ────────────────────────────────────────────────────────────

test("the motion watchdog waits in real time, so a long close is not cut short on a 240 Hz display", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const motion = motionBehavior({ autoClose: false });
  const host = mkInst(L, 100, "Host", { Cue: motion });
  const anch = mkInst(L, 200, "Anch", { Anchor: anchorBehavior() });
  const { inst } = world({ props: P(1, 300, 0), layers: [root], instances: [host, anch] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actSetLayerState("UI - Game", "visible"); tick(inst, 40);
  inst._actSetLayerState("UI - Game", "hidden");
  const at240 = (frames) => { for (let f = 0; f < frames; f++) { clock += 1000 / 240; if (inst._ticking) inst._tick(); } };
  at240(240 * 5);                                                  // 5 s: 1200 frames, well past 600
  assert(L.isVisible === true, "watchdog hid the layer while its per-object animation was still running");
  motion.finish();
  assert(L.isVisible === false, "close did not complete when the motion finished");
});

test("per-object animations are asked to run on unscaled time", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  let options = null;
  const motion = motionBehavior();
  const play = motion._playOpen;
  motion._playOpen = function (cb, opts) { options = opts; return play.call(this, cb); };
  const { inst } = world({ props: P(0, 200), layers: [root], instances: [mkInst(L, 100, "Host", { Cue: motion })] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actFocusLayer("UI - Game");
  assert(options?.unscaled === true, `options were ${JSON.stringify(options)}`);
});

test("a close started from a synchronous On layer opened keeps its pending hidden state", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const motion = motionBehavior({ autoClose: false });
  const { inst } = world({ props: P(5, 300), layers: [root], instances: [mkInst(L, 100, "Host", { Cue: motion })] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  L.isVisible = false;
  let reclosed = false;
  inst.on("OnLayerOpened", () => {
    if (reclosed) return;
    reclosed = true;
    inst._actSetLayerAnimation("UI - Game", "fade", 200, "linear");
    inst._actSetLayerState("UI - Game", "hidden");
  });
  inst._actFocusLayer("UI - Game");                                // type None: opens synchronously
  tick(inst, 30);
  motion.finish();
  assert(reclosed && L.isVisible === false && inst._getEntry("UI - Game").state === "hidden", "re-close never hid the layer");
});

test("showing a layer directly while its close waits on per-object animations disarms that close", () => {
  const L = mkLayer("UI - Game"); const root = mkLayer("!UI", [L]);
  const motion = motionBehavior({ autoClose: false });
  const plain = mkInst(L, 300, "Plain");
  const anchor = anchorBehavior();
  const { inst } = world({ props: P(1, 300, 0), layers: [root],
    instances: [mkInst(L, 100, "Host", { Cue: motion }), plain, mkInst(L, 200, "Anch", { Anchor: anchor })] });
  inst._actTrackLayer("UI - Game", "normal", true, false);
  inst._actSetLayerState("UI - Game", "visible"); tick(inst, 40);
  inst._actSetLayerState("UI - Game", "hidden"); tick(inst, 40);   // tween done, held at closed pose
  inst._actSetLayerAnimation("UI - Game", "none", 0, "linear");
  inst._actSetLayerState("UI - Game", "visible");
  assert(L.isVisible === true && plain.x === 300 && anchor.isEnabled === true, "objects not put back on direct show");
  motion.finish();                                                 // the old close's motion reports late
  assert(L.isVisible === true && inst._getEntry("UI - Game").state === "visible", "stale close hid the layer");
});

// ── Run ────────────────────────────────────────────────────────────────────────────

const quiet = console.log;
let failed = 0;
for (const { name, fn } of tests) {
  console.log = () => {};                                          // silence the plugin's own logging
  console.warn = () => {};
  let error = null;
  try { fn(); } catch (e) { error = e; }
  console.log = quiet;
  if (error) { failed++; console.log(`FAIL  ${name}\n      ${error.message}`); }
  else console.log(`pass  ${name}`);
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
