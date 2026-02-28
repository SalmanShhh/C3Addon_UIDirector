export const config = {
  listName: "On screen shown",
  displayText: "On screen {0} shown",
  description:
    "Fires when a screen becomes the active (focused) screen. Use this to react when the player navigates to a screen. Example: play a swoosh sound, start a timer, or animate in a character when 'Pause Menu' opens.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The screen layer to watch. Use the exact layer name you registered with Setup Screen.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._lastFocusedLayer === layerName;
}
