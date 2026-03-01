export const config = {
  returnType: "string",
  description:
    "Returns the screen name at a specific position in history. 1 = first, 2 = second. Use for building breadcrumb trails.",
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "depth",
      name: "Depth",
      desc: "The position in the navigation history to read. 1 = first screen (bottom of stack), FocusStackDepth() = current top screen.",
      type: "number",
    },
  ],
};

export const expose = false;

export default function (depth) {
  const idx = Math.round(depth) - 1;
  return this._focusStack[idx]?.layerName ?? "";
}
