export const config = {
  listName: "Sync collisions to layer state",
  displayText: "Sync layer {0} collisions to state: {1}",
  description:
    "Auto-disables collision detection on hidden layers. Use to prevent invisible UI buttons from blocking game clicks.",
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
