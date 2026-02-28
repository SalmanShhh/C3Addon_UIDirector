export const config = {
  returnType: "string",
  description:
    'The name of the most recently shown popup layer. Returns an empty string if no popups are visible. Example: use to determine which dialog the player is currently interacting with.',
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._popupStack.at(-1) ?? "";
}
