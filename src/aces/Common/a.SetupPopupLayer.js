export const config = {
  listName: "Setup popup layer",
  displayText: "Setup popup layer {0}",
  description:
    "Register a layer as a popup. Popups appear above all screens and do not affect back-navigation. Example: setup 'Confirm Quit', 'Error Dialog', or 'Level Complete' as popups.",
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
