export const config = {
  listName: "Layer accepts input",
  displayText: "Layer {0} accepts input",
  description:
    "True when the layer's isInteractive is on (it accepts clicks and touches). Use to guard button logic so it only runs when the layer is interactive.",
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
  return this._layers.get(layerName)?.ref?.isInteractive ?? false;
}
