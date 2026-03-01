export const config = {
  listName: "Set layer blocks other screens",
  displayText: "Set layer {0} blocks other screens: {1}",
  description:
    "Sets whether a screen disables all other screens when active. Use to make fullscreen menus block input behind them.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked normal-role layer to modify.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "isModal",
      name: "Blocks others",
      desc: "True = disable all other screens when this one is active. False = leave other screens' interactive states unchanged.",
      type: "boolean",
      initialValue: "true",
    },
  ],
};

export const expose = true;

export default function (layerName, isModal) {
  this._actSetLayerModal(layerName, isModal);
}
