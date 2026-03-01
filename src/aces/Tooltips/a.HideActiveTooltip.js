export const config = {
  listName: "Hide active tooltip",
  displayText: "Hide active tooltip",
  description:
    "Hides whatever tooltip is showing. Safe to call when none is visible. Use on mouse-leave events.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actHideActiveTooltip();
}
