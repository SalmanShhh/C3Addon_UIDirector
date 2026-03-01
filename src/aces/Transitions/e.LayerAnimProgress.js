export const config = {
  returnType: "number",
  description:
    "Returns the animation progress from 0 to 1. Use to sync custom effects like fading music with a screen's transition.",
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
