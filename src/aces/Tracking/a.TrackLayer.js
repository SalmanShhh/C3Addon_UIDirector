export const config = {
  listName: "Track layer",
  displayText: "Track layer {0} as {1} | Modal: {2} | Manage collisions: {3}",
  description:
    "Registers a layer so UIDirector can control it. Call once per layer at the start. Choose its role (screen, popup, or tooltip) and options like blocking input or syncing collisions.",
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
      desc: "How UIDirector treats this layer: Normal = screen in the focus stack, Popup = overlay that doesn't affect navigation, Tooltip = display-only overlay always on top.",
      type: "combo",
      initialValue: "normal",
      items: [{ normal: "Normal" }, { popup: "Popup" }, { tooltip: "Tooltip" }],
    },
    {
      id: "isModal",
      name: "Modal",
      desc: "If true, focusing this layer disables all other normal layers' interactivity while it is in focus.",
      type: "boolean",
      initialValue: "true",
    },
    {
      id: "manageCollisions",
      name: "Manage collisions",
      desc: "If true, collisionsEnabled on all instances on this layer will mirror its interactive state automatically.",
      type: "boolean",
      initialValue: "false",
    },
  ],
};

export const expose = true;

export default function (layerName, role, isModal, manageCollisions) {
  this._actTrackLayer(layerName, role, isModal, manageCollisions);
}
