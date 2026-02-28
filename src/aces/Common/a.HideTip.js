export const config = {
  listName: "Hide tooltip",
  displayText: "Hide tooltip",
  description:
    "Hide whichever tooltip is currently visible. Example: mouse leaves a button -> HideTip() dismisses the hint.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  this._actHideActiveTooltip();
}
