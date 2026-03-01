export const config = {
  returnType: "string",
  description:
    "Returns the name of the visible tooltip, or empty if none. Use for custom logic based on which tooltip is showing.",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._activeTooltip ?? "";
}
