export const config = {
  listName: "Set animation",
  displayText: "Set {0} animation {1}, {2} ms, {3}, mirror on back {4}",
  description:
    "Overrides the open/close animation for a single layer: type, duration, easing, and whether back-navigation mirrors the direction. Configure once; it plays automatically on every show and hide.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to configure.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "type",
      name: "Animation type",
      desc: "The transition animation to play when this layer opens or closes.",
      type: "combo",
      initialValue: "fade",
      items: [
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
      desc: "How long the animation takes, in milliseconds.",
      type: "number",
      initialValue: "200",
    },
    {
      id: "easing",
      name: "Easing",
      desc: "The easing curve applied to the animation.",
      type: "combo",
      initialValue: "easeOut",
      items: [
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

export default function (layerName, type, durationMs, easing, mirrorOnBack) {
  const animTypeKeys = ["fade", "slideLeft", "slideRight", "slideUp", "slideDown", "none", "scaleDown", "scaleUp"];
  const easingKeys   = ["linear", "easeIn", "easeOut", "easeInOut", "quadraticOut", "quarticOut", "exponentialOut", "circularOut", "backOut", "elasticOut", "bounceOut"];
  this._actSetLayerAnimation(layerName, this._combo(type, animTypeKeys), durationMs, this._combo(easing, easingKeys), !!mirrorOnBack);
}
