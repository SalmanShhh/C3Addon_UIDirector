export const config = {
  listName: "Untrack all layers",
  displayText: "Untrack all layers",
  description:
    "Remove all layers from UIDirector's tracking and clear all stacks. Does not modify any layer's visible/interactive state. Useful when changing layouts or resetting UI state completely.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actUntrackAllLayers();
}
