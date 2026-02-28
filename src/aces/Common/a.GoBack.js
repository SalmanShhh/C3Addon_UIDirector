export const config = {
  listName: "Go back",
  displayText: "Go back",
  description:
    "Return to the previous screen, like pressing a Back button. UIDirector automatically restores the previous screen's position and interactive state. Example: player presses Escape in Settings -> GoBack() returns them to the Main Menu.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  this._actPopFocusStack();
}
