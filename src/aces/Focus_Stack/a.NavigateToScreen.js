export const config = {
  listName: "Navigate to screen",
  displayText: "Navigate to screen {0}",
  description:
    "Opens a screen and saves the current one in history so the player can go back. Use for navigating into sub-menus.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the screen to navigate to.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actFocusLayer(layerName);
}
