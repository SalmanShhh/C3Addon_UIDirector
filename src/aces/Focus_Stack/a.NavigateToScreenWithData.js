export const config = {
  listName: "Navigate to screen with data",
  displayText: "Navigate to screen {0} with data key {1} = {2}",
  description:
    "Stores data on a screen and opens it in one step. Use to pass info like an item ID before opening a detail screen.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The screen to navigate to.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "key",
      name: "Key",
      desc: "The data key to set before navigating.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "value",
      name: "Value",
      desc: "The value to store under the key.",
      type: "any",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName, key, value) {
  this._actNavigateToScreenWithData(layerName, key, value);
}
