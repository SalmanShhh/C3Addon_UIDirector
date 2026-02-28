export const config = {
  listName: "On layer focused",
  displayText: "On layer {0} focused",
  description:
    "Fires after a layer is focused (pushed onto the focus stack) and its opening animation completes. Example: start a timer or begin an entrance animation sequence after 'Settings' finishes sliding in.",
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
