export const config = {
  listName: "Untrack layer",
  displayText: "Untrack layer {0}",
  description:
    "Removes a layer from UIDirector. It keeps its current look but UIDirector stops managing it. Use before destroying a layer.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the layer to stop tracking.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actUntrackLayer(layerName);
}
