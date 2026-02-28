export const config = {
  listName: "Close popup",
  displayText: "Close popup {0}",
  description:
    "Hide a popup window. The screen behind it regains input. Example: player clicks Cancel in a dialog -> ClosePopup(\"Confirm Quit\").",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the popup layer to close.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  this._actHidePopup(layerName);
}
