export const config = {
  listName: "Show popup",
  displayText: "Show popup {0}",
  description:
    "Show a popup-role layer above all normal screens. Popups do not push onto the focus stack — they are independent overlays. Multiple popups can be visible simultaneously. Plays the opening animation. Example: show a 'Level Complete' banner while the game world is still visible behind it.",
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
