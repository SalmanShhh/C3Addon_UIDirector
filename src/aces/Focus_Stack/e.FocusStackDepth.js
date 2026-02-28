export const config = {
  returnType: "number",
  description:
    "The number of layers currently on the focus stack. 0 means no screens are active. 1 means one screen is focused. Higher values mean the player has navigated deeper into nested screens. Example: use to show a breadcrumb trail or depth indicator.",
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._focusStack.length;
}
