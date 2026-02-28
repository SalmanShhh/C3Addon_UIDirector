export const config = {
  listName: "Set layer manage collisions",
  displayText: "Set layer {0} manage collisions: {1}",
  description:
    "Enable or disable automatic collision management for a layer. When enabled, the collisionsEnabled flag on every instance on this layer mirrors the layer's interactive state — so hidden/disabled layers automatically stop receiving collision checks. Example: enable on 'Enemy Layer' to prevent hit detection while the pause menu is open.",
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
      id: "enabled",
      name: "Enabled",
      desc: "True = automatically manage collisionsEnabled on instances. False = leave collision states unchanged.",
      type: "boolean",
      initialValue: "false",
    },
  ],
};

export const expose = true;

export default function (layerName, enabled) {
  this._actSetLayerCollisions(layerName, enabled);
}
