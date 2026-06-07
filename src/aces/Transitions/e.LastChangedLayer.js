export const config = {
  returnType: "string",
  description:
    "Returns the name of the layer whose state most recently changed. Use inside state-changed triggers to know which layer fired the event. Polled by companion addons to follow the active screen.",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._lastChangedLayer;
}
