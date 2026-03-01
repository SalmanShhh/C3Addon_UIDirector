export const config = {
  returnType: "number",
  description:
    "How many screens deep the player is. 0 = none, 1 = one screen, 2+ = deeper. Use for breadcrumbs or depth indicators.",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._focusStack.length;
}
