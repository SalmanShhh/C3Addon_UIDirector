export const config = {
  listName: "Show tooltip",
  displayText: "Show tooltip {0}",
  description:
    "Show a tooltip-role layer. Tooltips are always display-only (interactive is always false) and render above everything else. Only one tooltip can be visible at a time — calling ShowTooltip when one is already visible will hide the previous one first. Example: show an item description panel when the player hovers over an inventory slot.",
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
