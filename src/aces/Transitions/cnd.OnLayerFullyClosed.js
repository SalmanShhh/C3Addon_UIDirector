export const config = {
  listName: "On layer fully closed",
  displayText: "On layer {0} fully closed",
  description:
    "Fires after a layer finishes its closing animation and is no longer the active screen. Example: stop a timer or clean up resources after 'Settings' finishes closing.",
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
  return this._lastUnfocusedLayer === layerName;
}
