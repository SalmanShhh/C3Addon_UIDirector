export const config = {
  listName: "Go to screen",
  displayText: "Go to screen {0} ({1})",
  description:
    "Navigates to a screen. Push remembers the current screen so the player can go back; Replace swaps without remembering; Return to unwinds the history back to this screen.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the screen layer to go to.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "mode",
      name: "Mode",
      desc: "Push = remember the current screen (default navigation). Replace = swap the current screen without adding to history. Return to = pop back to this screen if it is in history.",
      type: "combo",
      initialValue: "Push",
      items: [
        { push: "Push (remember current)" },
        { replace: "Replace (don't remember)" },
        { returnto: "Return to (unwind to this screen)" },
      ],
    },
  ],
};

export const expose = false;

export default function (layerName, mode) {
  const modeKeys = ["push", "replace", "returnto"];
  const m = this._combo(mode, modeKeys);
  if (m === "push") this._actFocusLayer(layerName);
  else if (m === "replace") this._actReplaceScreen(layerName);
  else this._actPopFocusToLayer(layerName);
}
