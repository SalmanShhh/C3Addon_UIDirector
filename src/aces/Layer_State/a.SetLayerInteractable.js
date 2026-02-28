export const config = {
  listName: "Set layer interactable",
  displayText: "Set layer {0} interactable: {1}",
  description:
    "Manually override a layer's interactive property. UIDirector will not override this until the next state change. Use sparingly — prefer Set Layer State for normal state management. Example: temporarily disable a layer's buttons while an animation plays.",
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
      name: "Interactable",
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
