export const config = {
  listName: "Layer is animating",
  displayText: "Layer {0} is animating",
  description:
    "True while a transition animation is in progress on the layer. Layers are never interactive while animating. Example: disable a Back button while the current screen is still sliding in.",
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
