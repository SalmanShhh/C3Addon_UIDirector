export const config = {
  listName: "Go back",
  displayText: "Go back to the previous screen",
  description:
    "Returns to the previous screen, like a Back button. Pops the focus stack with animation; does nothing if the stack is empty. Use for the Escape key or back arrows.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  this._actPopFocusStack();
}
