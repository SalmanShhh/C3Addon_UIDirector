export const config = {
  listName: "On layer fully closed",
  displayText: "On layer {0} fully closed",
  description:
    "Triggers after a layer finishes closing. Use to clean up or stop timers once a screen is fully gone.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The layer to watch.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._lastUnfocusedLayer === layerName;
}
