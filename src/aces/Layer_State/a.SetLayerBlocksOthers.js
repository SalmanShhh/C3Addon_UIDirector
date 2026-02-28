export const config = {
  listName: "Set layer blocks other screens",
  displayText: "Set layer {0} blocks other screens: {1}",
  description:
    "Change whether a screen blocks all other screens when it becomes active. When blocking is on, only this screen can receive input - all others become non-interactive. Takes effect on the next Navigate to screen call. Example: make 'Credits' non-blocking so the HUD remains interactive while it's shown.",
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
