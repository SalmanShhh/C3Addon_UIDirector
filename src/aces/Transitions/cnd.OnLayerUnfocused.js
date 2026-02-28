export const config = {
  listName: "On layer unfocused",
  displayText: "On layer {0} unfocused",
  description:
    "Fires after a layer is popped from the focus stack and its closing animation completes. Example: stop a timer or clean up resources after 'Settings' finishes closing.",
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
