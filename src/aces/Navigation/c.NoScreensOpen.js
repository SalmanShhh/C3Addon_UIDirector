export const config = {
  listName: "No screens are open",
  displayText: "No screens are open",
  description:
    "True when the focus stack is empty. Use to detect when the player has backed out of all menus.",
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
