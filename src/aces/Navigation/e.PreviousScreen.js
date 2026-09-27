export const config = {
  returnType: "string",
  description:
    "Returns the name of the screen directly below the active one in the stack, or empty. Use for breadcrumbs or 'Back to X' button labels.",
  highlight: false,
  isDeprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  const stack = this._focusStack;
  return stack.length >= 2 ? stack[stack.length - 2].layerName : "";
}
