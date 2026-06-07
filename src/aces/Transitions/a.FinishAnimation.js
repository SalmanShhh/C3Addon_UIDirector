export const config = {
  listName: "Finish animation",
  displayText: "Finish animation on {0}",
  description:
    "Instantly completes a layer's running transition (and any per-object animations). Leave the name blank to finish every running animation at once. Use to skip transitions on a fast-forward or skip button.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: 'The tracked layer whose animation to finish. Pass an empty string ("") to finish all running animations.',
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  if (!layerName || layerName === "") this._actSkipAllAnimations();
  else this._actCompleteTransition(layerName);
}
