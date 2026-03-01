export const config = {
  returnType: "string",
  description:
    "Returns the state a layer was in before its last change. Use to restore a layer after a temporary change.",
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
