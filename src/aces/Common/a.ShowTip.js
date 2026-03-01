export const config = {
  listName: "Show tooltip",
  displayText: "Show tooltip {0}",
  description:
    "Shows a tooltip. Only one can be visible at a time. Use when the mouse hovers over a button or item.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the tooltip layer to show.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  this._actShowTooltip(layerName);
}
