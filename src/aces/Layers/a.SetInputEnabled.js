export const config = {
  listName: "Set input enabled",
  displayText: "Set {0} input enabled: {1}",
  description:
    "Toggles a layer's interactivity (isInteractive) without changing its visuals. Use to temporarily block buttons during an animation or loading.",
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
      id: "enabled",
      name: "Enabled",
      desc: "True = layer receives pointer/touch input. False = layer ignores input.",
      type: "boolean",
      initialValue: "true",
    },
  ],
};

export const expose = false;

export default function (layerName, enabled) {
  this._actSetLayerInteractable(layerName, !!enabled);
}
