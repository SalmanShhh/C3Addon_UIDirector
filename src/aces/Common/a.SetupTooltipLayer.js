export const config = {
  listName: "Setup tooltip layer",
  displayText: "Setup tooltip layer {0}",
  description:
    "Register a layer as a tooltip. Tooltips are display-only (never interactive) and always render on top of everything. Only one tooltip can be visible at a time — showing a new one hides the previous. Example: setup 'Item Description', 'Hover Hint'.",
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
