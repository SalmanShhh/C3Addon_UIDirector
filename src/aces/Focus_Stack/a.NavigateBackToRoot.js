export const config = {
  listName: "Go back to first screen",
  displayText: "Go back to first screen",
  description:
    "Closes all screens and returns to the very first one. Use for a Home button that jumps straight back to the main menu.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actNavigateBackToRoot();
}
