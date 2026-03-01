export const config = {
  returnType: "string",
  description:
    "Returns which layer most recently changed state. Use inside state-changed triggers to know which layer fired the event.",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._lastChangedLayer;
}
