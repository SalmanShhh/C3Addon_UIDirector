export const config = {
  returnType: "string",
  description:
    "Returns the new state of the most recently changed layer. Use inside state-changed triggers to react differently to 'hidden' vs 'visible'.",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._lastChangedState;
}
