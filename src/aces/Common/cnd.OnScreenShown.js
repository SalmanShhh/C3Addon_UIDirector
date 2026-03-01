export const config = {
  listName: "On screen shown",
  displayText: "On screen {0} shown",
  description:
    "Triggers when a screen becomes active. Use to play a sound or start an intro animation.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The screen layer to watch.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._lastFocusedLayer === layerName;
}
