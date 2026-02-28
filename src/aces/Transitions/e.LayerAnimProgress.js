export const config = {
  returnType: "number",
  description:
    "The current animation progress of a layer, from 0 (start) to 1 (complete). Useful for driving custom visual effects in sync with a layer's transition. Example: set a custom overlay opacity to LayerAnimProgress(\"Settings\") while it fades in.",
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
  return this._layers.get(layerName)?.animProgress ?? 0;
}
