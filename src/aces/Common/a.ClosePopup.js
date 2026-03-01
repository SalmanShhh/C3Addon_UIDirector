export const config = {
  listName: "Close popup",
  displayText: "Close popup {0}",
  description:
    "Closes a popup. Use for dismiss or cancel buttons on dialogs.",
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
