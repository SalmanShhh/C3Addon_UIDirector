export const config = {
  listName: "Setup screen layer",
  displayText: "Setup screen layer {0}",
  description:
    "Register a layer as a navigable screen. Call this at layout start for every UI screen you want to manage. Example: setup 'Main Menu', 'Settings', and 'Game Over' as screens so you can show/hide them with ShowScreen and GoBack.",
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
