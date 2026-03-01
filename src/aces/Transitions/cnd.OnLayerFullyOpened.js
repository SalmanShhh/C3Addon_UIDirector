export const config = {
  listName: "On layer fully opened",
  displayText: "On layer {0} fully opened",
  description:
    "Triggers after a layer finishes opening. Use to enable buttons or start gameplay once a screen is fully visible.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The layer to watch.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._lastFocusedLayer === layerName;
}
