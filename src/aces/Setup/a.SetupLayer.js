export const config = {
  listName: "Setup layer",
  displayText: "Setup {0} as {1}",
  description:
    "Registers a layer with UIDirector as a screen, popup, or tooltip with sensible defaults. Call once at the start for each UI layer you want to manage.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The name of the sublayer inside your UI container group layer.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "role",
      name: "Role",
      desc: "Screen = full-page navigation (pushed/popped on the focus stack). Popup = overlay above the current screen. Tooltip = single transient hint, off the stacks.",
      type: "combo",
      initialValue: "screen",
      items: [
        { screen: "Screen" },
        { popup: "Popup" },
        { tooltip: "Tooltip" },
      ],
    },
  ],
};

export const expose = false;

export default function (layerName, role) {
  const roleKeys = ["normal", "popup", "tooltip"];
  const r = this._combo(role, roleKeys);
  // Screens and popups block other screens by default; tooltips do not.
  this._actTrackLayer(layerName, r, r !== "tooltip", false);
}
