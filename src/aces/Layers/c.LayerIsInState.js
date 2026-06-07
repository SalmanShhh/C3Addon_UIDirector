export const config = {
  listName: "Layer is in state",
  displayText: "Layer {0} is in state {1}",
  description:
    "True when a layer's current state matches the chosen one. Use to check a layer before acting on it.",
  isTrigger: false,
  isInvertible: true,
  highlight: false,
  deprecated: false,
  params: [
    {
      id: "layerName",
      name: "Layer name",
      desc: "The tracked layer to check.",
      type: "string",
      initialValue: '""',
    },
    {
      id: "state",
      name: "State",
      desc: "The state to check against.",
      type: "combo",
      initialValue: "visible",
      items: [
        { visible: "Visible" },
        { hidden: "Hidden" },
        { disabled: "Disabled" },
        { focused: "Focused" },
      ],
    },
  ],
};

export const expose = false;

export default function (layerName, state) {
  const stateKeys = ["visible", "hidden", "disabled", "focused"];
  return (this._layers.get(layerName)?.state ?? "") === this._combo(state, stateKeys);
}
