export const config = {
  listName: "On layer closing",
  displayText: "On layer {0} closing",
  description:
    "Triggers when a layer starts its closing animation. Good for fading out music or starting a parallel exit effect.",
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
