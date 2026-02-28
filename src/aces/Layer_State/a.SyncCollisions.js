export const config = {
  listName: "Sync collisions to layer state",
  displayText: "Sync layer {0} collisions to state: {1}",
  description:
    "Enable or disable automatic collision syncing for a layer. When on, every object on this layer automatically has its collision detection turned off whenever the layer is hidden or disabled - so objects on invisible screens can never be hit. Example: enable on 'Enemy Layer' to prevent hit detection while the pause menu is open.",
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
