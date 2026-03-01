export const config = {
  listName: "On layer state changed",
  displayText: "On layer {0} state changed",
  description:
    "Triggers after a specific layer finishes changing state. Use to run logic that depends on the final state, like showing a retry button after Game Over appears.",
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
