export const config = {
  listName: "Complete transition",
  displayText: "Complete transition for layer {0}",
  description:
    "Immediately finish any in-progress animation on a layer and apply its final state. Use this to skip an animation or to signal completion when you handle animations yourself in the event sheet. Example: on a skip-cutscene button press, call CompleteTransition for all layers to snap them to their final states.",
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
