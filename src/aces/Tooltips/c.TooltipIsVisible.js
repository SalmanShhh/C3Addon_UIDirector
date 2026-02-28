export const config = {
  listName: "A tooltip is visible",
  displayText: "A tooltip is visible",
  description:
    "True when any tooltip-role layer is currently visible. Example: use to suppress other hover effects while a tooltip is already showing.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._activeTooltip !== null;
}
