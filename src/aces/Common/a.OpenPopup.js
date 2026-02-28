export const config = {
  listName: "Open popup",
  displayText: "Open popup {0}",
  description:
    "Show a popup window above the current screen. The screen behind it remains visible but is blocked from input. Example: player clicks Quit → OpenPopup(\"Confirm Quit\"). Multiple popups can be open at once.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the popup layer to show.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  this._actShowPopup(layerName);
}
