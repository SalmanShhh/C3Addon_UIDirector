export const config = {
  listName: "Untrack all layers",
  displayText: "Untrack all layers",
  description:
    "Removes all layers from UIDirector and clears all stacks. Use when changing layouts or doing a full UI reset.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actUntrackAllLayers();
}
