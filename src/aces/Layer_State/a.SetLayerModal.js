export const config = {
  listName: "Set layer modal",
  displayText: "Set layer {0} modal: {1}",
  description:
    "Change whether a normal-role layer is modal. A modal layer, when focused, disables all other normal layers so only it can receive input. Takes effect on the next Focus Layer call. Example: make 'Credits' non-modal so the HUD remains interactive while it's shown.",
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
      name: "Modal",
      desc: "True = disable all other normal layers when this one is focused. False = leave other layers' interactive states unchanged.",
      type: "boolean",
      initialValue: "true",
    },
  ],
};

export const expose = true;

export default function (layerName, isModal) {
  this._actSetLayerModal(layerName, isModal);
}
