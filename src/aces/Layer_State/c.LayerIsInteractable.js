export const config = {
  listName: "Layer is interactable",
  displayText: "Layer {0} is interactable",
  description:
    "True if the layer's interactive property is currently enabled. Note: this checks the live C3 layer value, not UIDirector's state. Example: use this to guard input handling — only process button clicks if the layer is interactable.",
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
