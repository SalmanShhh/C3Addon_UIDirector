export const config = {
  listName: "Close all popups",
  displayText: "Close all popups",
  description:
    "Closes every open popup at once. Use when switching scenes or clearing all dialogs.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = true;

export default function () {
  this._actCloseAllPopups();
}
