export const config = {
  listName: "Sync collisions",
  displayText: "Set {0} collision sync: {1}",
  description:
    "Enables or disables automatic collision syncing on a layer: when on, object collisions are disabled while the layer is hidden/disabled and restored when it shows. Use to stop invisible UI from blocking game clicks.",
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

export const expose = false;

export default function (layerName, enabled) {
  this._actSetLayerCollisions(layerName, !!enabled);
}
