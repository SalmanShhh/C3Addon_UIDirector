export const config = {
  listName: "Can go back",
  displayText: "Can go back",
  description:
    "True when there is a previous screen to go back to. Use to show or hide a Back button.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._focusStack.length > 0;
}
