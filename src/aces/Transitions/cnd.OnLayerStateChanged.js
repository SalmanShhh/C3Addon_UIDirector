export const config = {
  listName: "On layer state changed",
  displayText: "On layer {0} state changed",
  description:
    "Fires after a tracked layer finishes transitioning to a new state (after the animation completes). Use this to run logic that depends on the final state of a layer. Example: after 'Game Over' becomes visible, show the retry button.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The layer to watch for state changes.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._lastChangedLayer === layerName;
}
