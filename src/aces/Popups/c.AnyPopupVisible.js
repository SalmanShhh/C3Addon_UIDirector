export const config = {
  listName: "Any popup is visible",
  displayText: "Any popup is visible",
  description:
    "True when at least one popup-role layer is currently visible. Example: use to disable background interactions or show a dim overlay whenever any dialog is open.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._popupStack.length > 0;
}
