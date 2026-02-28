export const config = {
  returnType: "string",
  description:
    'The current animation direction of a layer: "opening" while it is animating in, "closing" while animating out, or an empty string when not animating. Example: play a different sound effect depending on whether a screen is opening or closing.',
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to query.",
      type: "string",
    },
  ],
};

export const expose = false;

export default function (layerName) {
  return this._layers.get(layerName)?.animDir ?? "";
}
