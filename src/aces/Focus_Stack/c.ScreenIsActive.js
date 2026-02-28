export const config = {
  listName: "Screen is the active screen",
  displayText: "Screen {0} is the active screen",
  description:
    "True if the named screen is currently the topmost active screen. Example: only show the save button while 'Settings' is the active screen.",
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
