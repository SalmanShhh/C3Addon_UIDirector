export const config = {
  listName: "Reset layer timescale",
  displayText: "Reset layer {0} timescales",
  description:
    "Removes all speed overrides set by Set layer timescale. Objects on the layer return to normal game speed, the stored runtime timescale is cleared (won't apply on next open), and if this layer is currently affecting game speed, that is restored immediately.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to reset.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actResetLayerTimescale(layerName);
}
