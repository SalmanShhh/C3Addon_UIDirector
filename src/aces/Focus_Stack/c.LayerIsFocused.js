export const config = {
  listName: "Layer is focused",
  displayText: "Layer {0} is focused",
  description:
    "True if the named layer is currently at the top of the focus stack (i.e., it is the active screen). Example: only show the options for 'Settings' while it is focused.",
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
