export const config = {
  listName: "Layer is tracked",
  displayText: "Layer {0} is tracked",
  description:
    "True if UIDirector is managing this layer. Use as a safety check before calling other actions on it.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The layer name to check.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._layers.has(layerName);
}
