export const config = {
  listName: "Setup: Tooltip Layer",
  displayText: "Setup tooltip layer {0}",
  description:
    "Registers a layer as a tooltip. Call once at the start for each tooltip layer like 'Item Hint' or 'Button Description'.",
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
  this._actTrackLayer(layerName, "tooltip", false, false);
}
