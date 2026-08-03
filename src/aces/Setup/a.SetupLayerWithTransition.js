export const config = {
  listName: "Setup layer with transition",
  displayText: "Setup {0} as {1} with {2}, {3} ms, {4}, mirror on back {5}",
  description:
    "Registers a layer and gives it its own open/close animation in one step. Any option left as Use plugin default " +
    "follows the matching Transitions property.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the sublayer inside your UI container group layer.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "role",
      name: "Role",
      desc: "Screen = full-page navigation (pushed/popped on the focus stack). Popup = overlay above the current screen. Tooltip = single transient hint, off the stacks.",
      type: "combo",
      initialValue: "screen",
      items: [
        { screen: "Screen" },
        { popup: "Popup" },
        { tooltip: "Tooltip" },
      ],
    },
    {
      id: "type",
      name: "Animation type",
      desc: "The animation this layer plays when it opens or closes.",
      type: "combo",
      initialValue: "useDefault",
      items: [
        { useDefault: "Use plugin default" },
        { fade: "Fade" },
        { slideLeft: "Slide Left" },
        { slideRight: "Slide Right" },
        { slideUp: "Slide Up" },
        { slideDown: "Slide Down" },
        { none: "None (instant)" },
        { scaleDown: "Scale Down" },
        { scaleUp: "Scale Up" },
      ],
    },
    {
      id: "durationMs",
      name: "Duration (ms)",
      desc: "How long the animation takes, in milliseconds. Use -1 for the plugin default; 0 is instant.",
      type: "number",
      initialValue: "-1",
    },
    {
      id: "easing",
      name: "Easing",
      desc: "The easing curve applied to the animation.",
      type: "combo",
      initialValue: "useDefault",
      items: [
        { useDefault: "Use plugin default" },
        { linear: "Linear" },
        { easeIn: "Ease In" },
        { easeOut: "Ease Out" },
        { easeInOut: "Ease In Out" },
        { quadraticOut: "Quadratic Out" },
        { quarticOut: "Quartic Out" },
        { exponentialOut: "Exponential Out" },
        { circularOut: "Circular Out" },
        { backOut: "Back Out" },
        { elasticOut: "Elastic Out" },
        { bounceOut: "Bounce Out" },
      ],
    },
    {
      id: "mirrorOnBack",
      name: "Mirror on back",
      desc: "When true, the closing animation plays in the opposite direction on back-navigation (slide/scale reverse). Ignored for fade and none.",
      type: "boolean",
      initialValue: "false",
    },
  ],
};

export const expose = false;

export default function (layerName, role, type, durationMs, easing, mirrorOnBack) {
  const roleKeys     = ["normal", "popup", "tooltip"];
  // Index 0 is the "use plugin default" entry in both lists; null on the entry is what makes
  // _getAnimConfig() fall back to the plugin properties for that field.
  const animTypeKeys = ["useDefault", "fade", "slideLeft", "slideRight", "slideUp", "slideDown", "none", "scaleDown", "scaleUp"];
  const easingKeys   = ["useDefault", "linear", "easeIn", "easeOut", "easeInOut", "quadraticOut", "quarticOut", "exponentialOut", "circularOut", "backOut", "elasticOut", "bounceOut"];
  const orDefault    = (v) => (v === "useDefault" || v === null || v === undefined ? null : v);

  const r = this._combo(role, roleKeys);
  // Same defaults as Setup layer: screens and popups block other screens, tooltips do not.
  this._actTrackLayer(layerName, r, r !== "tooltip", false);
  this._actSetLayerAnimation(
    layerName,
    orDefault(this._combo(type, animTypeKeys)),
    durationMs < 0 ? null : durationMs,
    orDefault(this._combo(easing, easingKeys)),
    !!mirrorOnBack
  );
}
