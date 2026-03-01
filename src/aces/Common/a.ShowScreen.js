export const config = {
  listName: "Show screen",
  displayText: "Show screen {0}",
  description:
    "Navigates to a screen. The player can press Back to return. Use for menu buttons like 'Settings' or 'Inventory'.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the screen layer to show.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  this._actFocusLayer(layerName);
}
