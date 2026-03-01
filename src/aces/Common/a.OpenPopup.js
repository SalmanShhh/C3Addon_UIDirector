export const config = {
  listName: "Open popup",
  displayText: "Open popup {0}",
  description:
    "Opens a popup above the current screen. Use for confirmation dialogs, rewards, or alerts.",
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
