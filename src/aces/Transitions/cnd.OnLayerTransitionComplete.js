export const config = {
  listName: "On layer transition complete",
  displayText: "On layer {0} transition complete",
  description:
    "Triggers when a layer's animation finishes (open or close). Use to enable buttons only after the screen has fully animated in.",
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
  return this._lastChangedLayer === layerName;
}
