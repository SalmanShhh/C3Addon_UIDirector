export const config = {
  returnType: "string",
  description:
    'The role of a tracked layer: "normal", "popup", or "tooltip". Returns an empty string if the layer is not tracked. Example: use to display the layer role in a debug overlay.',
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to query.",
      type: "string",
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._layers.get(layerName)?.role ?? "";
}
