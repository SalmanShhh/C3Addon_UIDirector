export const config = {
  listName: "Set layer state",
  displayText: "Set layer {0} to {1}",
  description:
    "Transition a tracked layer to a specific state, playing the configured animation. Visible = shown and interactive. Hidden = invisible and non-interactive. Disabled = visible but non-interactive (greyed-out effect). Example: set 'HUD' to Disabled while a cutscene plays.",
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
  this._actSetLayerState(layerName, state);
}
