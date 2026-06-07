export const config = {
  listName: "On layer closed",
  displayText: "On layer {0} closed",
  description:
    "Triggers after a layer finishes its closing animation. A safe point to clean up or stop timers once the layer is fully gone.",
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
  return this._lastChangedLayer === layerName;
}
