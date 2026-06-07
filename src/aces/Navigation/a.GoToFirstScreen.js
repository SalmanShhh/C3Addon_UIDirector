export const config = {
  listName: "Go to first screen",
  displayText: "Reset to the first screen",
  description:
    "Clears the navigation history and returns to the root (first) screen. Use for a 'Main Menu' shortcut from deep inside nested menus.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  this._actNavigateBackToRoot();
}
