export const config = {
  listName: "Focus layer",
  displayText: "Focus layer {0}",
  description:
    "Push a normal-role layer to the top of the focus stack, making it the active screen. Saves its current Z-position so it can be restored on pop, and snapshots all other layers' interactive state. If modal, disables input on all other normal layers. Plays the opening animation. Example: navigate to a Settings screen on top of the Main Menu.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The normal-role layer to push onto the focus stack.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = true;

export default function (layerName) {
  this._actFocusLayer(layerName);
}
