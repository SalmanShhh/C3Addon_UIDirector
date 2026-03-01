export const config = {
  returnType: "string",
  description:
    "Returns 'opening', 'closing', or empty. Use to play different sounds based on whether a screen is coming in or going out.",
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
  return this._layers.get(layerName)?.animDir ?? "";
}
