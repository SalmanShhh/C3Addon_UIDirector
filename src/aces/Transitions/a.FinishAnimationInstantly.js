export const config = {
  listName: "Finish animation instantly",
  displayText: "Finish animation instantly for layer {0}",
  description:
    "Immediately snap a layer to the end of its current animation, skipping the visual transition. Use this to skip animations or apply the final state right away. Example: on a skip-cutscene button press, call Finish animation instantly for all layers to snap them to their final states.",
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
