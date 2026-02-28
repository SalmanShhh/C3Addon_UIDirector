export const config = {
  listName: "Layer blocks other screens",
  displayText: "Layer {0} blocks other screens",
  description:
    "True if this screen is set to block all others when it is active - meaning only it can receive input while open. Example: use to decide whether to show a dimmed overlay behind a dialog.",
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
