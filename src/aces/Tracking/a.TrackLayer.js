export const config = {
  listName: "Track layer",
  displayText: "Track layer {0} as {1} | Modal: {2} | Manage collisions: {3}",
  description:
    "Register a sublayer with UIDirector so it can be controlled by other actions. Call this once per layer at layout start. Role determines how the layer behaves: Normal = navigable screen, Popup = overlay above screens, Tooltip = display-only overlay. Modal = when focused, all other normal layers are made non-interactive. Manage collisions = collision detection mirrors the layer's interactive state.",
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
