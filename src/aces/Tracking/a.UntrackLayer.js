export const config = {
  listName: "Untrack layer",
  displayText: "Untrack layer {0}",
  description:
    "Remove a layer from UIDirector's tracking. UIDirector will no longer control it. Does not change the layer's current visible/interactive state. Example: untrack a layer before destroying it or handing control back to your own event sheet.",
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
