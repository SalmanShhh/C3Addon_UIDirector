export const config = {
  returnType: "string",
  description:
    'Retrieve a custom data value stored on a layer with Set Layer Data. Returns an empty string if the key does not exist. Example: LayerData("Item Detail", "itemId") returns the item ID that was stored before opening the screen.',
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
