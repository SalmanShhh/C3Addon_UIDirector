export const config = {
  listName: "On popup closed",
  displayText: "On popup {0} closed",
  description:
    "Triggers when a popup hides. Use to check the player's choice after a confirmation dialog.",
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
