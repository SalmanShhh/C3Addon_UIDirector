export const config = {
  returnType: "string",
  description:
    'The name of the screen the player is currently on. Returns an empty string if no screen is focused. Example: set a Text object to CurrentScreen() to display which screen is active in a debug HUD.',
  highlight: false,
  deprecated: false,
  params: [],
};

export const expose = false;

export default function () {
  return this._focusStack.at(-1)?.layerName ?? "";
}
