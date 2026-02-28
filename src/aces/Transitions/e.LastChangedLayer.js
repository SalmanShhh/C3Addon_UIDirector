export const config = {
  returnType: "string",
  description:
    'The name of the most recently changed layer. Available inside On Layer State Changed and On Any Layer State Changed triggers. Example: use LastChangedLayer in the On Any Layer State Changed trigger to log state changes for all screens in one event.',
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._lastChangedLayer;
}
