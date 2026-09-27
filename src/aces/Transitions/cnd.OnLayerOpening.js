export const config = {
  listName: "On layer opening",
  displayText: "On layer {0} opening",
  description:
    "Triggers when a layer starts its opening animation. Use LayerAnimProgress / LayerAnimDirection inside. Good for starting music or parallel intro effects.",
  isTrigger: true,
  highlight: false,
  isDeprecated: false,
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
