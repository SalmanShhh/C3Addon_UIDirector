export const config = {
  listName: "Hide active tooltip",
  displayText: "Hide active tooltip",
  description:
    "Hide whichever tooltip is currently visible, without needing to know its name. Safe to call even when no tooltip is visible. Example: on mouse-leave of any button -> HideActiveTooltip().",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actHideActiveTooltip();
}
