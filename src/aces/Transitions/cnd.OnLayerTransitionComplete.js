export const config = {
  listName: "On layer transition complete",
  displayText: "On layer {0} transition complete",
  description:
    "Fires when a layer's animation (open or close) finishes and the layer is in its final state. Use this when you need to know the exact moment a transition ends. Example: enable a button only after the screen has fully finished animating in.",
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
