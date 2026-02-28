export const config = {
  listName: "Set layer input enabled",
  displayText: "Set layer {0} input enabled: {1}",
  description:
    "Manually turn a layer's input on or off. UIDirector will not override this until the next state change. Use sparingly - prefer Set Layer State for normal state management. Example: temporarily disable a layer's buttons while an animation plays.",
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
