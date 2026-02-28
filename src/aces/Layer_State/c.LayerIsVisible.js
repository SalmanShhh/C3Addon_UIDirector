export const config = {
  listName: "Layer is visible",
  displayText: "Layer {0} is visible",
  description:
    "True if the layer's visible property is currently enabled. Note: a Disabled-state layer is visible but not interactive — this condition returns true for it. Example: use to check if a HUD layer is currently showing.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to check.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._layers.get(layerName)?.ref?.visible ?? false;
}
