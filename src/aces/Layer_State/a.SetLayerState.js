export const config = {
  listName: "Set layer state",
  displayText: "Set layer {0} to {1}",
  description:
    "Changes a layer to visible, hidden, or disabled with an animation. Use to show or hide HUD elements or grey out a panel.",
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
      desc: "The target state: visible (shown + interactive), hidden (invisible), or disabled (visible but not interactive).",
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

export const expose = true;

export default function (layerName, state) {
  const stateKeys = ["visible", "hidden", "disabled"];
  this._actSetLayerState(layerName, this._combo(state, stateKeys));
}
