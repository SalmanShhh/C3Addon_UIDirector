export const config = {
  listName: "On screen hidden",
  displayText: "On screen {0} hidden",
  description:
    "Fires when a screen is dismissed (popped from the focus stack). Use this to clean up or resume things after a screen closes. Example: resume game music when the 'Pause Menu' is dismissed.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The screen layer to watch.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._lastUnfocusedLayer === layerName;
}
