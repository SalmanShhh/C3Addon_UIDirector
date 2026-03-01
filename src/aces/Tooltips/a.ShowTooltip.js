export const config = {
  listName: "Show tooltip",
  displayText: "Show tooltip {0}",
  description:
    "Shows a tooltip. Only one can show at a time — the previous one hides automatically. Use when hovering over items or buttons.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tooltip-role layer to show.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actShowTooltip(layerName);
}
