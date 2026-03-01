export const config = {
  listName: "Replace current screen",
  displayText: "Replace current screen with {0}",
  description:
    "Swaps the current screen for a new one without saving history. The player cannot go back. Use for loading screens or login-to-menu transitions.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The screen to switch to.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actReplaceScreen(layerName);
}
