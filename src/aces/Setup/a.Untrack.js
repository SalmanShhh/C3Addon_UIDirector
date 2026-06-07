export const config = {
  listName: "Untrack",
  displayText: "Untrack {0}",
  description:
    "Stops UIDirector from managing a layer. Leave the name blank to untrack everything and clear all stacks.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: 'The tracked layer to remove. Pass an empty string ("") to untrack all layers and reset every stack.',
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  if (!layerName || layerName === "") this._actUntrackAllLayers();
  else this._actUntrackLayer(layerName);
}
