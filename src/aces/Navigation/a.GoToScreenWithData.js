export const config = {
  listName: "Go to screen with data",
  displayText: "Go to screen {0}, set {1} = {2}",
  description:
    "Stores a key/value on the target screen and then navigates to it (Push). Read the value back with the LayerData expression. Use to pass context like a selected item into the screen.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the screen to go to.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "key",
      name: "Key",
      desc: "The data key to store on the screen.",
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
  this._actNavigateToScreenWithData(layerName, key, value);
}
