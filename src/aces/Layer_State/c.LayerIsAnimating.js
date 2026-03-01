export const config = {
  listName: "Layer is animating",
  displayText: "Layer {0} is animating",
  description:
    "True while a layer is playing its transition animation. Use to disable buttons until the screen finishes sliding in.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to check.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._layers.get(layerName)?.animating ?? false;
}
