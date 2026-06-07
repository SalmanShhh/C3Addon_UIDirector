export const config = {
  listName: "Any popup is visible",
  displayText: "Any popup is visible",
  description:
    "True when one or more popups are open. Use to dim the background or block input while a dialog is showing.",
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
