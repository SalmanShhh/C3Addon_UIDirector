export const config = {
  returnType: "string",
  description:
    'The current state of a tracked layer: "visible", "hidden", "disabled", or "focused". Returns an empty string if the layer is not tracked. Example: use in a Text object to display the current state for debugging.',
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
  return this._layers.get(layerName)?.state ?? "";
}
