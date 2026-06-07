export const config = {
  returnType: "string",
  description:
    "Returns the name of the active (focused) screen, or empty if none. Alias of CurrentScreen. Polled alongside LastChangedLayer by companion addons.",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._focusStack.at(-1)?.layerName ?? "";
}
