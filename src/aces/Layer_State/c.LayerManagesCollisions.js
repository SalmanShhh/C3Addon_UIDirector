export const config = {
  listName: "Layer manages collisions",
  displayText: "Layer {0} manages collisions",
  description:
    "True if collision management is enabled for this layer. When enabled, instance collisionsEnabled automatically mirrors the layer's interactive state.",
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
  return this._layers.get(layerName)?.manageCollisions ?? false;
}
