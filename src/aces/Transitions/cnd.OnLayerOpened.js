export const config = {
  listName: "On layer opened",
  displayText: "On layer {0} opened",
  description:
    "Triggers after a layer finishes its opening animation. A safe point to enable controls or start effects once the layer is fully visible.",
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
