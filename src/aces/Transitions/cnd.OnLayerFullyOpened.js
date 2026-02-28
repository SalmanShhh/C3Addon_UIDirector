export const config = {
  listName: "On layer fully opened",
  displayText: "On layer {0} fully opened",
  description:
    "Fires after a layer finishes its opening animation and is now fully visible as the active screen. Example: start a timer or begin an entrance sequence after 'Settings' finishes sliding in.",
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
