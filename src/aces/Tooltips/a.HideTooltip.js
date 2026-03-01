export const config = {
  listName: "Hide tooltip",
  displayText: "Hide tooltip {0}",
  description:
    "Hides a specific tooltip by name. Use when the mouse leaves a specific item.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tooltip-role layer to hide.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actHideTooltip(layerName);
}
