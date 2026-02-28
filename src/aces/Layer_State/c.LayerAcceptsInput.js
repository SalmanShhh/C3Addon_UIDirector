export const config = {
  listName: "Layer accepts input",
  displayText: "Layer {0} accepts input",
  description:
    "True if the layer is currently accepting pointer and touch input. Note: this checks the live C3 layer value, not UIDirector's state. Example: use this to guard input handling - only process button clicks if the layer accepts input.",
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
  return this._layers.get(layerName)?.ref?.interactive ?? false;
}
