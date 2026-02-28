export const config = {
  listName: "Skip all animations",
  displayText: "Skip all layer animations",
  description:
    "Immediately complete all currently in-progress layer transition animations. All animating layers snap to their final states. Example: call this when the player enters accessibility settings or on low-performance devices to disable all transitions at once.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actSkipAllAnimations();
}
