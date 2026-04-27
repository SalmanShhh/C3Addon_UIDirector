export const config = {
  listName: "Set layer animation",
  displayText: "Set layer {0} animation: {1}, {2} ms, {3}, mirror close: {4}",
  description:
    "Sets the animation type, speed, easing, and mirror direction for a layer. Use to customize how each screen slides or fades in and out.",
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
      desc: "The type of transition animation to play when this layer opens or closes.",
      type: "combo",
      initialValue: "fade",
      items: [
        { fade: "Fade" },
        { slideLeft: "Slide Left" },
        { slideRight: "Slide Right" },
        { slideUp: "Slide Up" },
        { slideDown: "Slide Down" },
        { none: "None (instant)" },
      ],
    },
    {
      id: "duration",
      name: "Duration (ms)",
      desc: "How long the animation takes in milliseconds.",
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
      ],
    },
    {
      id: "mirrorOnBack",
      name: "Mirror close direction",
      desc: "When true, the closing animation plays in the opposite direction to the opening animation. Only affects slide animations. Ignored for fade and none.",
      type: "boolean",
      initialValue: "false",
    },
  ],
};

export const expose = true;

export default function (layerName, type, duration, easing, mirrorOnBack) {
  const animTypeKeys = ["fade", "slideLeft", "slideRight", "slideUp", "slideDown", "none"];
  const easingKeys   = ["linear", "easeIn", "easeOut", "easeInOut"];
  this._actSetLayerAnimation(layerName, this._combo(type, animTypeKeys), duration, this._combo(easing, easingKeys), mirrorOnBack);
}
