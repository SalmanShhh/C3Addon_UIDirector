export const config = {
  listName: "Hide popup",
  displayText: "Hide popup {0}",
  description:
    "Closes a specific popup with its closing animation. Use for Cancel or Close buttons on dialogs.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The popup-role layer to hide.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actHidePopup(layerName);
}
