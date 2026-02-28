export const config = {
  listName: "Hide popup",
  displayText: "Hide popup {0}",
  description:
    "Hide a popup-role layer. Plays the closing animation. The screen behind it is unaffected. Example: dismiss the 'Confirm Quit' dialog when the player clicks Cancel.",
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
