export const config = {
  listName: "Set layer data",
  displayText: "Set layer {0} data [{1}] = {2}",
  description:
    "Store an arbitrary string value on a tracked layer under a named key. Retrieve it later with the Layer Data expression. Example: before showing 'Item Detail', set its data \"itemId\" = \"sword_01\" so the screen knows what to display.",
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
      desc: "The key name for this data value.",
      type: "string",
      initialValue: '"key"',
    },
    {
      id: "value",
      name: "Value",
      desc: "The string value to store.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName, key, value) {
  this._actSetLayerData(layerName, key, value);
}
