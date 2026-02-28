export const config = {
  listName: "Show tooltip",
  displayText: "Show tooltip {0}",
  description:
    "Show a tooltip or hint to the player. Tooltips are display-only — they can never be clicked. Only one tooltip can be visible at a time; showing a new one automatically hides the previous. Example: mouse hovers over a sword icon → ShowTip(\"Sword Info\").",
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
