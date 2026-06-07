export const config = {
  returnType: "string",
  description:
    "Returns the name of the topmost open popup, or empty if none. Use to check which dialog the player is looking at.",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._popupStack.at(-1) ?? "";
}
