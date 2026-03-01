export const config = {
  listName: "Show popup for duration",
  displayText: "Show popup {0} for {1} milliseconds",
  description:
    "Opens a popup that auto-closes after a timer. Use for toast notifications like 'Game Saved' or 'Achievement Unlocked'.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The popup-role layer to show.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "durationMs",
      name: "Duration (ms)",
      desc: "How long to keep the popup visible before automatically hiding it, in milliseconds.",
      type: "number",
      initialValue: "2000",
    },
  ],
};

export const expose = true;

export default function (layerName, durationMs) {
  this._actShowPopupFor(layerName, durationMs);
}
