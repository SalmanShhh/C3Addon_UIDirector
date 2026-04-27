export const config = {
  listName: "Layer is visible",
  displayText: "Layer {0} is visible",
  description:
    "True if the layer is on screen (includes disabled layers). Use to check if a HUD or panel is currently showing.",
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
  return this._layers.get(layerName)?.ref?.isSelfAndParentsVisible ?? false;
}
