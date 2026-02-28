export const config = {
  listName: "Layer syncs collisions",
  displayText: "Layer {0} syncs collisions",
  description:
    "True if collision syncing is enabled for this layer. When enabled, objects on this layer automatically have collisions turned off whenever the layer is hidden or disabled.",
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
