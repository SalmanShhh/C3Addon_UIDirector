export const config = {
  returnType: "string",
  description:
    'The name of the currently visible tooltip layer. Returns an empty string if no tooltip is showing. Example: use to log which tooltip is active or to apply custom logic for specific tooltips.',
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._activeTooltip ?? "";
}
