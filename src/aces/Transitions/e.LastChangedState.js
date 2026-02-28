export const config = {
  returnType: "string",
  description:
    'The state that the most recently changed layer transitioned to (e.g., "visible", "hidden", "disabled", "focused"). Use together with LastChangedLayer inside On Any Layer State Changed. Example: if LastChangedState = "hidden" → play a dismiss sound.',
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._lastChangedState;
}
