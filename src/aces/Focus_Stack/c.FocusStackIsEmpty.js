export const config = {
  listName: "Focus stack is empty",
  displayText: "Focus stack is empty",
  description:
    "True when no layers are on the focus stack (no screens have been focused via Focus Layer). Example: use this to show a first-launch screen, or to handle the case where the player has navigated all the way back to the root.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._focusStack.length === 0;
}
