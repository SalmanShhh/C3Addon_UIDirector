export const config = {
  listName: "Screen is the active screen",
  displayText: "Screen {0} is the active screen",
  description:
    "True when this screen is on top of the focus stack. Use to show controls that only appear on a specific screen.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The screen to check.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._focusStack.at(-1)?.layerName === layerName;
}
