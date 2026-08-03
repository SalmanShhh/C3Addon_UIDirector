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

// Exposed on the instance so companion addons (e.g. UIForge) can call it directly
// as a guard before driving back-navigation. Keep true — UIForge reads this.
export const expose = true;

export default function () {
  return this._focusStack.length > 0;
}
