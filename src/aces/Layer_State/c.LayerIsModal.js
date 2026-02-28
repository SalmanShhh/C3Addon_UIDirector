export const config = {
  listName: "Layer is modal",
  displayText: "Layer {0} is modal",
  description:
    "True if the layer is configured as modal. A modal layer, when focused, disables input on all other normal layers. Example: use to decide whether to show a dimmed overlay behind a dialog.",
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
  return this._layers.get(layerName)?.isModal ?? true;
}
