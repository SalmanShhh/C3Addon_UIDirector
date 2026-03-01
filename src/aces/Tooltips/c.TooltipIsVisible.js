export const config = {
  listName: "A tooltip is visible",
  displayText: "A tooltip is visible",
  description:
    "True when a tooltip is currently showing. Use to suppress other hover effects while a tooltip is up.",
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
