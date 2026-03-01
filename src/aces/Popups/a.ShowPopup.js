export const config = {
  listName: "Show popup",
  displayText: "Show popup {0}",
  description:
    "Opens a popup above all screens. Multiple popups can stack. Use for confirmation dialogs, reward banners, or error messages.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The popup-role layer to show.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actShowPopup(layerName);
}
