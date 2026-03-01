export const config = {
  listName: "Return to screen",
  displayText: "Return to screen {0}",
  description:
    "Goes back to a specific screen, closing everything above it. Pass empty to close all. Use for jumping to the main menu from deep sub-menus.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: 'The layer to pop to. Pass an empty string ("") to clear the entire focus stack.',
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actPopFocusToLayer(layerName);
}
