export const config = {
  listName: "Popup",
  displayText: "{0} popup {1} (for {2} ms)",
  description:
    "Shows or hides a popup overlay above the current screen. Show timed auto-dismisses after the given milliseconds; Hide all closes every open popup. Duration is only used by Show timed.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "mode",
      name: "Mode",
      desc: "Show = open the popup. Hide = close it. Show timed = open then auto-dismiss after Duration. Hide all = close every open popup.",
      type: "combo",
      initialValue: "show",
      items: [
        { show: "Show" },
        { hide: "Hide" },
        { showtimed: "Show timed" },
        { hideall: "Hide all" },
      ],
    },
    {
      id: "layerName",
      name: "Layer name",
      desc: "The popup layer to show or hide. Ignored for Hide all.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "durationMs",
      name: "Duration (ms)",
      desc: "Only for Show timed: how long the popup stays open before auto-dismissing, in milliseconds.",
      type: "number",
      initialValue: "2000",
    },
  ],
};

export const expose = false;

export default function (mode, layerName, durationMs) {
  const modeKeys = ["show", "hide", "showtimed", "hideall"];
  const m = this._combo(mode, modeKeys);
  if (m === "show") this._actShowPopup(layerName);
  else if (m === "hide") this._actHidePopup(layerName);
  else if (m === "showtimed") this._actShowPopupFor(layerName, durationMs);
  else this._actCloseAllPopups();
}
