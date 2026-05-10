export const config = {
  listName: "Setup: Popup Layer",
  displayText: "Setup popup layer {0}",
  description:
    "Registers a layer as a popup. Call once at the start for each popup layer like 'Confirm Quit' or 'Error Dialog'.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the sublayer inside your UI container group layer.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  this._actTrackLayer(layerName, "popup", true, false);
}
