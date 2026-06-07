export const config = {
  listName: "Layer is ready",
  displayText: "Layer {0} is ready",
  description:
    "True when a layer is visible or focused AND not mid-animation. Use to only allow button clicks once a screen has fully appeared.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to check.",
      type: "string",
      initialValue: '""',
    },
  ],
};

export const expose = false;

export default function (layerName) {
  const entry = this._layers.get(layerName);
  if (!entry) return false;
  return (entry.state === "visible" || entry.state === "focused") && !entry.animating;
}
