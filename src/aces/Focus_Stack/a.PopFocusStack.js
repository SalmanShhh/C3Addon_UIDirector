export const config = {
  listName: "Pop focus stack",
  displayText: "Pop focus stack",
  description:
    "Remove the top layer from the focus stack and return to the previous one. Restores the layer's original Z-position and the exact interactive states of all normal layers from before it was focused. Plays the closing animation. Example: the player presses Back → pop returns them to where they were.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actPopFocusStack();
}
