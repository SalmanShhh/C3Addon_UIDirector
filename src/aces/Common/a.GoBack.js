export const config = {
  listName: "Go back",
  displayText: "Go back",
  description:
    "Returns to the previous screen, like a Back button. Use for Escape key or back arrows.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  this._actPopFocusStack();
}
