export const config = {
  returnType: "string",
  description:
    "Returns a layer's role: 'normal', 'popup', 'tooltip', or empty if untracked. Use for debug displays or role-specific logic.",
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
