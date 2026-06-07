export const config = {
  listName: "Setup layer (advanced)",
  displayText: "Setup {0} as {1}, modal {2}, sync collisions {3}",
  description:
    "Registers a layer with full control over modal blocking and collision syncing. Use when the defaults from Setup layer are not what you want.",
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
      desc: "Screen = full-page navigation. Popup = overlay above the current screen. Tooltip = single transient hint, off the stacks.",
      type: "combo",
      initialValue: "Screen",
      items: [
        { screen: "Screen" },
        { popup: "Popup" },
        { tooltip: "Tooltip" },
      ],
    },
    {
      id: "modal",
      name: "Modal (blocks others)",
      desc: "True = while this layer is the active screen, all other screens become non-interactive (restored on close).",
      type: "boolean",
      initialValue: "true",
    },
    {
      id: "syncCollisions",
      name: "Sync collisions",
      desc: "True = automatically disable object collisions on this layer while it is hidden or disabled, and restore them when it shows.",
      type: "boolean",
      initialValue: "false",
    },
  ],
};

export const expose = false;

export default function (layerName, role, modal, syncCollisions) {
  const roleKeys = ["normal", "popup", "tooltip"];
  this._actTrackLayer(layerName, this._combo(role, roleKeys), !!modal, !!syncCollisions);
}
