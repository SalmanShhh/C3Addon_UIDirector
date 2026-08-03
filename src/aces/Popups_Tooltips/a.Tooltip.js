export const config = {
  listName: "Tooltip",
  displayText: "{0} tooltip {1}",
  description:
    "Shows or hides a tooltip. Only one tooltip is visible at a time — showing a new one hides the previous. Hide active hides whichever tooltip is currently showing.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "mode",
      name: "Mode",
      desc: "Show = display this tooltip (hides any other). Hide = hide this tooltip. Hide active = hide whichever tooltip is currently showing.",
      type: "combo",
      initialValue: "show",
      items: [
        { show: "Show" },
        { hide: "Hide" },
        { hideactive: "Hide active" },
      ],
    },
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tooltip layer to show or hide. Ignored for Hide active.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (mode, layerName) {
  const modeKeys = ["show", "hide", "hideactive"];
  const m = this._combo(mode, modeKeys);
  if (m === "show") this._actShowTooltip(layerName);
  else if (m === "hide") this._actHideTooltip(layerName);
  else this._actHideActiveTooltip();
}
