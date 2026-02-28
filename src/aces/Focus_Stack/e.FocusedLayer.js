export const config = {
  returnType: "string",
  description:
    'The name of the layer currently at the top of the focus stack (the active screen). Returns an empty string if no layer is focused. Example: use to log the current screen name, or to run screen-specific logic without a chain of conditions.',
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._focusStack.at(-1)?.layerName ?? "";
}
