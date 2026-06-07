export const config = {
  listName: "Screen is in navigation history",
  displayText: "Screen {0} is in navigation history",
  description:
    "True when this screen appears anywhere in the focus stack. Use to avoid navigating to a screen that is already open.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The screen to search for in the navigation history.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._focusStack.some(f => f.layerName === layerName);
}
