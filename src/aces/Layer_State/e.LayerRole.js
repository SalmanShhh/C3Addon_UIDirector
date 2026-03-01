export const config = {
  returnType: "string",
  description:
    "Returns a layer's role: 'normal', 'popup', or 'tooltip'. Use for debug displays.",
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
  return this._layers.get(layerName)?.role ?? "";
}
