export const config = {
  listName: "On layer opening",
  displayText: "On layer {0} opening",
  description:
    "Triggers when a layer starts its opening animation. Use to start music or prepare content while the screen slides in.",
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
