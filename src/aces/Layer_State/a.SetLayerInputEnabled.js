export const config = {
  listName: "Set layer input enabled",
  displayText: "Set layer {0} input enabled: {1}",
  description:
    "Manually turns a layer's input on or off. Use to temporarily disable buttons during an animation or loading.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to modify.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "enable",
      name: "Enabled",
      desc: "True = layer receives pointer/touch input. False = layer ignores input.",
      type: "boolean",
      initialValue: "true",
    },
  ],
};

export const expose = true;

export default function (layerName, enable) {
  this._actSetLayerInteractable(layerName, enable);
}
