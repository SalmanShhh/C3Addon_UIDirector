export const config = {
  listName: "Return to screen",
  displayText: "Return to screen {0}",
  description:
    "Close screens one by one until the specified screen is active. Pass an empty string to close all screens and clear the entire history. Example: from a deeply nested settings sub-page, use Return to screen \"Main Menu\" to jump directly back to the root without pressing Back multiple times.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: 'The layer to pop to. Pass an empty string ("") to clear the entire focus stack.',
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actPopFocusToLayer(layerName);
}
