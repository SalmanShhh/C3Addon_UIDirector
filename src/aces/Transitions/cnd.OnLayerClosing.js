export const config = {
  listName: "On layer closing",
  displayText: "On layer {0} closing",
  description:
    "Fires at the start of a layer's closing animation - before the animation completes. Use this to begin a parallel exit sequence. Example: start fading out background music as 'Pause Menu' begins to close.",
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
