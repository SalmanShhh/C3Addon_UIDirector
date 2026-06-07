export const config = {
  listName: "Set data",
  displayText: "Set {0} data {1} = {2}",
  description:
    "Stores a custom key/value on a tracked layer. Read it back with the LayerData expression. Use to attach context like a selected item ID to a screen.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to store data on.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "key",
      name: "Key",
      desc: "The data key to store.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "value",
      name: "Value",
      desc: "The value to store under the key.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName, key, value) {
  this._actSetLayerData(layerName, key, value);
}
