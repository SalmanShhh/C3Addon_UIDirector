export const config = {
  returnType: "string",
  description:
    "Returns the name of the active screen, or empty if none. Use for conditional logic based on which screen is showing.",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._focusStack.at(-1)?.layerName ?? "";
}
