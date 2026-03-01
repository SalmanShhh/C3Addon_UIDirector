export const config = {
  listName: "Return to previous screen",
  displayText: "Return to previous screen",
  description:
    "Closes the current screen and goes back to the previous one. Use for Back buttons in sub-menus.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actPopFocusStack();
}
