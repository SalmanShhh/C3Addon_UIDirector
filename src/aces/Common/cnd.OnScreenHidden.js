export const config = {
  listName: "On screen hidden",
  displayText: "On screen {0} hidden",
  description:
    "Triggers when a screen is closed. Use to resume music or clean up after leaving a screen.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The screen layer to watch.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._lastUnfocusedLayer === layerName;
}
