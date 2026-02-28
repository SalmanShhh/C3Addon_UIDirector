export const config = {
  listName: "No screens are open",
  displayText: "No screens are open",
  description:
    "True when no screens are currently open or active. Example: use this to show a first-launch screen, or to handle the case where the player has navigated all the way back to the root.",
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
