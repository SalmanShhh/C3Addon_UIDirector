export const config = {
  listName: "Screen is the active screen",
  displayText: "Screen {0} is the active screen",
  description:
    "True if a screen is the currently active one. Use to show buttons that only appear on a specific screen.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The layer to check.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._focusStack.at(-1)?.layerName === layerName;
}
