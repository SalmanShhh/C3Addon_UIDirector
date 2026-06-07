export const config = {
  listName: "Can go back",
  displayText: "Can go back",
  description:
    "True when there is a previous screen to return to. Use to show or hide a Back button. UIForge checks this before driving back-navigation.",
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
