export const config = {
  listName: "On popup opened",
  displayText: "On popup {0} opened",
  description:
    "Triggers when a popup opens. Use to play a sound or dim the background.",
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
  return this._lastChangedLayer === layerName && this._lastChangedState === "visible";
}
