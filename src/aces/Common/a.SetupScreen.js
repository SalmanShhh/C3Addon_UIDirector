export const config = {
  listName: "Setup screen layer",
  displayText: "Setup screen layer {0}",
  description:
    "Registers a layer as a screen. Call once at the start for each UI screen like 'Main Menu' or 'Settings'.",
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
  this._actTrackLayer(layerName, "normal", true, false);
}
