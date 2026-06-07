export const config = {
  listName: "Set timescale",
  displayText: "Set {0} timescale: objects {1}, game-while-open {2}",
  description:
    "Controls playback speed tied to a layer. Objects timescale changes the speed of every object on the layer now (1 = normal, 0 = frozen, -1 = no change). Game-while-open is stored and auto-applied to the whole game when this layer opens, then restored on close (-1 = off). Pass 1 / 1 to clear. Tip: objects 1 + game-while-open 0 keeps the menu animated while the game freezes behind it.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to configure.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "instanceTimescale",
      name: "Objects timescale",
      desc: "Per-object timescale applied to all instances on the layer now. 1 = normal, 0 = frozen, 2 = double speed. Use -1 to leave object timescales unchanged.",
      type: "number",
      initialValue: "1",
    },
    {
      id: "runtimeTimescale",
      name: "Game-while-open timescale",
      desc: "Global runtime timescale to apply automatically when this layer opens, and restore on close. Use -1 to clear or skip the runtime override.",
      type: "number",
      initialValue: "-1",
    },
  ],
};

export const expose = false;

export default function (layerName, instanceTimescale, runtimeTimescale) {
  this._actSetLayerTimescale(layerName, instanceTimescale, runtimeTimescale);
}
