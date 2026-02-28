export const config = {
  listName: "Layer is tracked",
  displayText: "Layer {0} is tracked",
  description:
    "True if the named layer has been registered with UIDirector (via Track Layer or Setup Screen/Popup/Tooltip). Use this as a safety check before performing other actions on a layer.",
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
