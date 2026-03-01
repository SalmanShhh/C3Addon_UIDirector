export const config = {
  listName: "Finish animation instantly",
  displayText: "Finish animation instantly for layer {0}",
  description:
    "Skips a layer's current animation and jumps to the end. Use for skip buttons or when you need a screen ready immediately.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer whose transition should be completed immediately.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actCompleteTransition(layerName);
}
