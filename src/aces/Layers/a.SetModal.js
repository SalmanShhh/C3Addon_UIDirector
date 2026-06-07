export const config = {
  listName: "Set modal",
  displayText: "Set {0} blocks other screens: {1}",
  description:
    "Sets whether a screen blocks input on all other screens while it is active. Use to make fullscreen menus modal.",
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
      id: "modal",
      name: "Blocks others",
      desc: "True = make all other screens non-interactive while this one is active (restored on close). False = leave them unchanged.",
      type: "boolean",
      initialValue: "true",
    },
  ],
};

export const expose = false;

export default function (layerName, modal) {
  this._actSetLayerModal(layerName, !!modal);
}
