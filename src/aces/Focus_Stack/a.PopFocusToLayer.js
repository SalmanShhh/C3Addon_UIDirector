export const config = {
  listName: "Pop focus stack to layer",
  displayText: "Pop focus stack until {0} is on top",
  description:
    "Pop layers one at a time until the specified layer is at the top of the focus stack. Pass an empty string to clear the entire stack. Example: from a deeply nested settings sub-page, call PopFocusToLayer(\"Main Menu\") to jump directly back to the root.",
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
