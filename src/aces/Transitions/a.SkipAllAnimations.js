export const config = {
  listName: "Skip all animations",
  displayText: "Skip all layer animations",
  description:
    "Skips every layer's animation at once and jumps to their final states. Use for accessibility options or low-performance devices.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actSkipAllAnimations();
}
