export const config = {
  listName: "Set layer timescale",
  displayText: "Set layer {0} timescale: instance {1}, runtime {2}",
  description:
    "Sets the playback speed of a tracked layer. Instance timescale changes the speed of every object on the layer right now (1 = normal, 0 = frozen, -1 = no change). Runtime timescale is stored and auto-applied to the whole game when this layer opens, then restored when it closes (-1 = off). Tip: instance 1 + runtime 0 keeps the menu animated while the game freezes behind it.",
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
      name: "Instance timescale",
      desc: "Per-object timescale multiplier applied to all instances now. 1 = normal, 0 = frozen, 2 = double speed. Use -1 to leave instance timescales unchanged.",
      type: "number",
      initialValue: "1",
    },
    {
      id: "runtimeTimescale",
      name: "Runtime timescale",
      desc: "Global runtime timescale to apply automatically when this layer opens, and restore on close. Use -1 to clear or skip the runtime override.",
      type: "number",
      initialValue: "-1",
    },
  ],
};

export const expose = true;

export default function (layerName, instanceTimescale, runtimeTimescale) {
  this._actSetLayerTimescale(layerName, instanceTimescale, runtimeTimescale);
}
