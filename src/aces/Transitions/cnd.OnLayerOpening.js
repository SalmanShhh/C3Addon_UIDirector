export const config = {
  listName: "On layer opening",
  displayText: "On layer {0} opening",
  description:
    "Fires at the start of a layer's opening animation — before the animation completes. Use this to prepare content or start a parallel animation while the transition plays. Example: begin fading in background music as 'Main Menu' starts to slide in.",
  isTrigger: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The layer to watch.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._lastChangedLayer === layerName;
}
