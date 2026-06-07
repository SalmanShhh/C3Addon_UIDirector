export const config = {
  returnType: "string",
  description:
    "Returns a stored custom value from a layer by key, or empty. Use to read data set with Set data or Go to screen with data.",
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to query.",
      type: "string",
    },
    {
      id: "key",
      name: "Key",
      desc: "The key name to retrieve.",
      type: "string",
    },
  ],
};

export const expose = false;

export default function (layerName, key) {
  return this._layers.get(layerName)?.customData.get(key) ?? "";
}
