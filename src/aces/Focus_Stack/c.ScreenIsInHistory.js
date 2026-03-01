export const config = {
  listName: "Screen is in navigation history",
  displayText: "Screen {0} is in navigation history",
  description:
    "True if a screen is anywhere in the navigation history. Use to prevent navigating to a screen that is already open.",
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
