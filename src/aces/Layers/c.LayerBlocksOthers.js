export const config = {
  listName: "Layer blocks other screens",
  displayText: "Layer {0} blocks other screens",
  description:
    "True when this layer is modal (blocks input on all other screens while active). Use to decide whether a dimmed overlay should appear.",
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
  return this._layers.get(layerName)?.isModal ?? false;
}
