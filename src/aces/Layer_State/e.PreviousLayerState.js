export const config = {
  returnType: "string",
  description:
    'The state a tracked layer was in before its most recent transition. Useful for implementing undo logic or restoring a layer after a temporary change. Example: if PreviousLayerState("HUD") = "visible" -> re-show the HUD after a cutscene.',
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to query.",
      type: "string",
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._layers.get(layerName)?.prevState ?? "";
}
