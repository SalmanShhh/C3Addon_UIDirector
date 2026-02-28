export const config = {
  listName: "On popup closed",
  displayText: "On popup {0} closed",
  description:
    "Fires when a popup is hidden. Use this to react after a dialog is dismissed. Example: check if the player confirmed or cancelled after 'Confirm Quit' closes.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The popup layer to watch.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._lastChangedLayer === layerName && this._lastChangedState === "hidden";
}
