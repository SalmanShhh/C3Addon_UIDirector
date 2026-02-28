export const config = {
  listName: "Hide tooltip",
  displayText: "Hide tooltip {0}",
  description:
    "Hide a specific tooltip-role layer. If it is the currently active tooltip, clears the active tooltip tracking. Example: hide 'Sword Description' when the player stops hovering over the sword.",
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
