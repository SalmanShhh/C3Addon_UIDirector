export const config = {
  listName: "Hide tooltip",
  displayText: "Hide tooltip",
  description:
    "Hides the current tooltip. Use when the mouse leaves a button or item.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  this._actHideActiveTooltip();
}
