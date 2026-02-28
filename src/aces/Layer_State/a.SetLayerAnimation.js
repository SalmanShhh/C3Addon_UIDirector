export const config = {
  listName: "Set layer animation",
  displayText: "Set layer {0} animation: {1}, {2} ms, {3}",
  description:
    "Override the default animation for a specific layer. Useful when different screens need different transitions. Example: make 'Game Over' slide in from the bottom (Slide Down, 400ms, EaseIn) while other screens use the default fade.",
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
  ],
};

export const expose = true;

export default function (layerName, type, duration, easing) {
  this._actSetLayerAnimation(layerName, type, duration, easing);
}
