export const config = {
  listName: "Show screen",
  displayText: "Show screen {0}",
  description:
    "Navigate to a screen, pushing it on top of the current one. The player can return using GoBack. Example: player taps the Settings button -> ShowScreen(\"Settings\").",
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
