export const config = {
  listName: "Set layer state",
  displayText: "Set {0} to {1}",
  description:
    "Changes a layer directly to visible, hidden, or disabled, playing the layer's animation. Use to show or hide a HUD element or grey out a panel without touching the focus stack.",
  isAsync: false,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to change.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "state",
      name: "State",
      desc: "Visible (shown + interactive), Hidden (not shown), or Disabled (shown but input blocked).",
      type: "combo",
      initialValue: "visible",
      items: [
        { visible: "Visible" },
        { hidden: "Hidden" },
        { disabled: "Disabled" },
      ],
    },
  ],
};

export const expose = false;

export default function (layerName, state) {
  const stateKeys = ["visible", "hidden", "disabled"];
  this._actSetLayerState(layerName, this._combo(state, stateKeys));
}
