export const config = {
  listName: "Navigate to screen",
  displayText: "Navigate to screen {0}",
  description:
    "Open a screen and make it the active one. The previous screen is kept in history so the player can return using 'Return to previous screen'. If set to block others, disables input on all other screens while active. Plays the opening animation. Example: navigate to a Settings screen on top of the Main Menu.",
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
