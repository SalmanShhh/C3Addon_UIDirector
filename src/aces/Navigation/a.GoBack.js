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

// Exposed on the instance so companion addons (e.g. UIForge) can drive back-
// navigation through this public action instead of a private method. Keep true.
export const expose = true;

export default function () {
  this._actPopFocusStack();
}
