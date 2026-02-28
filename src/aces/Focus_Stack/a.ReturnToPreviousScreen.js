export const config = {
  listName: "Return to previous screen",
  displayText: "Return to previous screen",
  description:
    "Close the current screen and return to the one before it. Restores the previous screen's original Z-position and interactive states exactly as they were. Plays the closing animation on the screen being dismissed. Example: the player presses Back in Settings -> returns them to Main Menu.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actPopFocusStack();
}
